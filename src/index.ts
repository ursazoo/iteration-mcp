#!/usr/bin/env node

/**
 * MCP迭代管理工具 - 主服务器入口文件
 * 
 * 本工具是一个基于Model Context Protocol (MCP)的迭代管理服务器，主要功能包括：
 * 1. 钉钉扫码登录认证
 * 2. 交互式迭代信息收集（5步流程）
 * 3. 用户列表管理和项目组选择
 * 4. 两阶段API提交（创建迭代 + 创建CR申请单）
 * 5. 本地缓存管理
 * 
 * 工具链接的API系统：http://gw.fshows.com
 * 
 * @author MCP迭代管理工具团队
 * @version 1.0.5
 * @since 2024-12-23
 */

// ==================== 命令行参数解析 ====================

/**
 * 解析命令行参数
 * 支持格式：
 * - --workdir /path/to/directory
 * - --workdir=/path/to/directory
 */
function parseCommandLineArgs(): { workdir?: string } {
  const args = process.argv.slice(2);
  const result: { workdir?: string } = {};
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--workdir' && i + 1 < args.length) {
      result.workdir = args[i + 1];
      console.log(`🎯 检测到命令行参数 --workdir: ${result.workdir}`);
      i++; // 跳过下一个参数
    } else if (args[i].startsWith('--workdir=')) {
      result.workdir = args[i].substring('--workdir='.length);
      console.log(`🎯 检测到命令行参数 --workdir=: ${result.workdir}`);
    }
  }
  
  return result;
}

// 解析命令行参数（在导入模块之前，确保早期执行）
const cmdArgs = parseCommandLineArgs();

// ==================== 核心依赖导入 ====================
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListRootsRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';

// ==================== 业务模块导入 ====================
import { loadConfig, validateConfig } from './config.js';    // 配置管理
import { DingTalkAuth } from './dingtalk.js';               // 钉钉认证模块
import { CacheManager } from './cache.js';                  // 本地缓存管理
import { APIManager } from './api.js';                      // API调用管理
import { ConfigManager } from './config-manager.js';        // 外部配置和Token管理
import { CompleteIteration, UserInfo } from './types.js';             // 类型定义
import { GitInfo } from './git-utils.js';                   // Git信息工具

/**
 * MCP迭代管理服务器主类
 * 
 * 负责处理所有MCP工具请求，包括：
 * - 用户认证管理
 * - 迭代信息收集流程
 * - API接口调用
 * - 缓存数据管理
 */
class IterationMCPServer {
  // ==================== 核心组件 ====================
  /** MCP服务器实例 */
  private server: Server;
  
  /** 工具配置对象，包含API端点、钉钉配置等 */
  private config: any;
  
  /** 钉钉认证管理器，处理登录和token管理 */
  private dingTalkAuth: DingTalkAuth | null = null;
  
  /** 配置管理器，处理外部配置和认证token */
  private configManager: ConfigManager;
  
  /** 会话Token，来自钉钉登录，最高优先级 */
  private sessionToken: string | null = null;
  
  /** 本地缓存管理器，缓存用户列表、项目线等数据 */
  private cacheManager: CacheManager;
  
  /** API调用管理器，处理所有HTTP请求 */
  private apiManager: APIManager | null = null;
  
  /** workspace根目录列表，来自MCP客户端 */
  private workspaceRoots: string[] = [];
  
  // ==================== 会话状态管理 ====================
  /**
   * 临时会话存储，用于多步骤迭代创建流程
   * 包含用户在不同步骤中输入的数据：
   * - basicInfo: 基础信息（项目线、迭代名称、上线时间等）
   * - projectInfo: 项目信息（文档链接、Git信息、人员配置等）
   * - modules: 模块信息（组件模块和功能模块）
   */
  private sessionData: {
    basicInfo?: any;
    projectInfo?: any;
    modules?: any;
  } = {};

  /**
   * 构造函数 - 初始化MCP服务器和核心组件
   * 
   * 执行流程：
   * 1. 创建MCP服务器实例
   * 2. 加载配置文件
   * 3. 初始化缓存管理器
   * 4. 设置请求处理器
   * 5. 处理命令行参数指定的工作目录
   */
  constructor() {
    // ==================== 创建MCP服务器 ====================
    this.server = new Server(
      {
        name: 'iteration-mcp-v2',        // 工具名称
        version: '1.0.5'                // 工具版本
      },
      {
        capabilities: {
          tools: {},                     // 声明支持工具调用
          roots: {}                      // 声明支持roots获取
        }
      }
    );

    // ==================== 加载配置 ====================
    try {
      console.log('🔍 开始加载MCP配置...');
      this.config = loadConfig();       // 从config.ts加载配置
      console.log('✅ MCP配置加载成功');
    } catch (error) {
      console.error('❌ MCP配置加载失败:', error);
    }
    
    // ==================== 初始化组件 ====================
    this.configManager = new ConfigManager();
    // 初始化缓存管理器（用于存储用户列表、项目线等数据）
    this.cacheManager = new CacheManager();
    
    // 设置MCP请求处理器
    this.setupHandlers();
    
    // ==================== 处理工作目录配置 ====================
    // 优先级：命令行参数 > MCP workspace roots > 环境变量 > process.cwd()
    if (cmdArgs.workdir) {
      console.log(`🎯 使用命令行指定的工作目录: ${cmdArgs.workdir}`);
      this.config.projectPath = cmdArgs.workdir;
      this.setWorkspaceRoots([`file://${cmdArgs.workdir}`]);
    } else {
      console.log('🔍 未指定命令行工作目录，使用自动检测机制');
      // 初始化workspace根目录（现有逻辑）
      this.initializeWorkspaceRoots();
    }
  }

  /**
   * 设置workspace根目录
   * @param roots 从MCP客户端获取的workspace根目录列表
   */
  private setWorkspaceRoots(roots: string[]) {
    this.workspaceRoots = roots;
    console.log(`🔧 MCP客户端提供的workspace根目录:`, roots);
    
    // 更新config中的projectPath为第一个root
    if (roots.length > 0 && this.config) {
      // 从file:// URI转换为本地路径
      const firstRoot = roots[0].replace(/^file:\/\//, '');
      this.config.projectPath = firstRoot;
      console.log(`✅ 已设置项目路径为: ${firstRoot}`);
    }
  }

  /**
   * 获取当前有效的工作目录
   * 优先级：workspace roots > 自动检测
   */
  private getEffectiveWorkingDirectory(): string {
    if (this.workspaceRoots.length > 0) {
      // 从file:// URI转换为本地路径
      const workspaceRoot = this.workspaceRoots[0].replace(/^file:\/\//, '');
      console.log(`✅ 使用MCP workspace根目录: ${workspaceRoot}`);
      return workspaceRoot;
    }
    
    // 回退到自动检测
    return this.detectWorkingDirectory();
  }

  /**
   * 初始化workspace根目录
   * 在MCP协议中，客户端应该主动调用roots/list，但如果没有调用，我们主动设置当前目录
   */
  private initializeWorkspaceRoots() {
    // 如果还没有workspace roots，尝试从环境变量或当前目录设置
    if (this.workspaceRoots.length === 0) {
      // 首先尝试从环境变量获取
      const envWorkdir = process.env.PWD || process.env.INIT_CWD;
      if (envWorkdir && envWorkdir !== '/') {
        const fileUri = `file://${envWorkdir}`;
        this.setWorkspaceRoots([fileUri]);
        console.log(`🔍 从环境变量初始化workspace根目录: ${envWorkdir}`);
      } else {
        // 最后回退到process.cwd()，但要检查是否合理
        const currentDir = process.cwd();
        if (currentDir !== '/') {
          const fileUri = `file://${currentDir}`;
          this.setWorkspaceRoots([fileUri]);
          console.log(`🔍 从进程目录初始化workspace根目录: ${currentDir}`);
        } else {
          console.warn('⚠️ 无法确定有效的workspace根目录，请确保在正确的项目目录中运行');
        }
      }
    }
  }

  /**
   * 设置MCP请求处理器
   * 
   * 注册两种类型的处理器：
   * 1. ListToolsRequestSchema: 返回所有可用工具的列表和描述
   * 2. CallToolRequestSchema: 处理具体的工具调用请求
   */
  private setupHandlers() {
    // ==================== Roots处理器 ====================
    /**
     * 处理根目录列表请求，返回当前workspace的根目录
     * 并自动设置为工作目录
     */
    this.server.setRequestHandler(ListRootsRequestSchema, async () => {
      console.log('🔍 MCP客户端请求workspace根目录列表');
      
      // 如果已经有根目录，返回它们
      if (this.workspaceRoots.length > 0) {
        return {
          roots: this.workspaceRoots.map(root => ({
            uri: root,
            name: root.split('/').pop() || root
          }))
        };
      }
      
      // 否则尝试获取当前工作目录作为fallback
      const currentDir = process.cwd();
      const fileUri = `file://${currentDir}`;
      
      // 设置这个作为workspace root
      this.setWorkspaceRoots([fileUri]);
      
      return {
        roots: [{
          uri: fileUri,
          name: currentDir.split('/').pop() || 'workspace'
        }]
      };
    });

    // ==================== 工具列表处理器 ====================
    /**
     * 处理工具列表请求，返回所有可用的MCP工具
     * 每个工具包含名称、描述和输入参数定义
     */
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // ==================== 认证相关工具 ====================
          {
            name: 'check_login_status',
            description: '检查钉钉登录状态',
            inputSchema: {
              type: 'object',
              properties: {
                random_string: {
                  type: 'string',
                  description: 'Dummy parameter for no-parameter tools'
                }
              },
              required: ['random_string']
            }
          },
          {
            name: 'login_dingtalk',
            description: '钉钉扫码登录',
            inputSchema: {
              type: 'object',
              properties: {
                random_string: {
                  type: 'string',
                  description: 'Dummy parameter for no-parameter tools'
                }
              },
              required: ['random_string']
            }
          },
          
          // ==================== 迭代管理工具 ====================
          {
            // 交互式迭代创建工具 - 支持4步流程
            name: 'create_iteration',
            description: '交互式创建迭代信息（收集完整信息）',
            inputSchema: {
              type: 'object',
              properties: {
                step: {
                  type: 'string',
                  enum: ['start', 'basic_info', 'project_info', 'modules'],
                  description: '当前步骤：start=开始, basic_info=基础信息, project_info=项目信息, modules=模块信息'
                },
                data: {
                  type: 'string',
                  description: '当前步骤的数据（JSON格式）'
                },
                workdir: {
                  type: 'string',
                  description: '可选：手动指定工作目录路径，默认自动检测当前目录'
                }
              },
              required: ['step']
            }
          },
          {
            // 两阶段提交工具 - 创建迭代 + 创建CR申请单
            name: 'submit_complete_iteration',
            description: '提交完整的迭代信息（包含基础信息和CR申请单）',
            inputSchema: {
              type: 'object',
              properties: {
                iteration_data: {
                  type: 'string',
                  description: 'JSON格式的完整迭代数据'
                }
              },
              required: ['iteration_data']
            }
          },
          
          // ==================== 数据查询工具 ====================
          {
            // 用户列表查询工具 - 获取所有可用的参与人员和审核人员
            name: 'get_user_list',
            description: '获取用户列表（参与人员和审核人员）',
            inputSchema: {
              type: 'object',
              properties: {
                random_string: {
                  type: 'string',
                  description: 'Dummy parameter for no-parameter tools'
                }
              },
              required: ['random_string']
            }
          }
        ],
      };
    });

    // ==================== 工具调用处理器 ====================
    /**
     * 处理具体的工具调用请求
     * 根据工具名称路由到对应的处理方法
     */
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        // 根据工具名称路由到相应的处理方法
        switch (request.params.name) {
          // 认证相关工具
          case 'check_login_status':
            return await this.handleCheckLoginStatus();
          
          case 'login_dingtalk':
            return await this.handleDingTalkLogin();
          
          // 迭代管理工具
          case 'create_iteration':
            return await this.handleCreateIteration(request.params.arguments);
          
          case 'submit_complete_iteration':
            return await this.handleSubmitCompleteIteration(request.params.arguments);
          
          // 数据查询工具
          case 'get_user_list':
            return await this.handleGetUserList(request.params.arguments);
          
          default:
            throw new Error(`Unknown tool: ${request.params.name}`);
        }
      } catch (error) {
        // 统一的错误处理
        return {
          content: [
            {
              type: 'text',
              text: `错误: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    });
  }

  // ==================== 认证相关处理方法 ====================
  
  /**
   * 处理登录状态检查请求
   * 
   * 功能：
   * 1. 检查钉钉登录状态
   * 2. 显示服务器版本和配置信息
   * 3. 显示当前工作目录
   * 
   * @returns MCP响应对象，包含登录状态和系统信息
   */
  private async handleCheckLoginStatus() {
    // 检查会话中是否存在个人Token
    if (this.sessionToken) {
      return {
        content: [{ type: 'text', text: '✅ 您已登录，使用的是个人会话Token。' }]
      };
    }

    // 检查是否能找到共享配置文件Token
    try {
      // 尝试获取token，但不创建APIManager实例
      await this.configManager.getToken();
      return {
        content: [{ type: 'text', text: '⚠️ 您当前未登录，将使用共享的配置文件Token。如需使用个人身份操作，请调用 `login_dingtalk`。' }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `❌ 您当前未登录，也未找到任何可用的共享Token。请调用 \`login_dingtalk\` 或配置共享Token。` }]
      };
    }
  }

  /**
   * 处理钉钉登录请求
   * 
   * 执行流程：
   * 1. 验证配置完整性
   * 2. 初始化钉钉认证管理器
   * 3. 执行登录流程（扫码认证）
   * 4. 获取访问token
   * 5. 初始化API管理器
   * 
   * @returns MCP响应对象，包含登录结果和用户信息
   */
  private async handleDingTalkLogin() {
    try {
      console.log('🚀 启动钉钉扫码登录流程...');
      this.dingTalkAuth = new DingTalkAuth(this.config.dingtalk);
      const loginResult = await this.dingTalkAuth.login();
      
      if (loginResult.success && loginResult.accessToken) {
        // 登录成功，将个人Token设置到会话中
        this.sessionToken = loginResult.accessToken;
        console.log('🔑 会话Token已设置 (来自钉钉登录)，将优先使用此Token。');
        
        // 清理旧的APIManager实例，以便下次使用新的个人Token
        this.apiManager = null;
        
        return {
          content: [
            {
              type: 'text',
              text: `✅ **登录成功！**\n\n` +
                    `欢迎您，${loginResult.userInfo?.name || '用户'}。\n` +
                    `在当前会话中，所有操作都将以您的个人身份进行。\n\n` +
                    `💡 您现在可以开始创建迭代了: \`create_iteration step="start"\``
            }
          ]
        };
      } else {
        throw new Error(loginResult.message || '获取Token失败');
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ 钉钉登录失败: ${error}`
          }
        ]
      };
    }
  }

  // ==================== 迭代管理处理方法 ====================
  
  /**
   * 处理迭代创建请求（多步骤流程控制器）
   * 
   * 支持的步骤：
   * 1. start: 开始流程，显示项目组选择和用户列表
   * 2. basic_info: 收集基础信息（项目线、迭代名称、上线时间）
   * 3. project_info: 收集项目信息（文档链接、Git信息、人员配置）
   * 4. modules: 收集模块信息（组件模块和功能模块）
   * 
   * @param args 包含step（步骤）、data（数据）、workdir（工作目录）的参数对象
   * @returns MCP响应对象，包含当前步骤的处理结果
   */
  private async handleCreateIteration(args: any) {
    const { step, data, workdir } = args;
    
    // 获取有效工作目录，优先级：手动传递 > MCP workspace roots > 自动检测
    const effectiveWorkdir = workdir || this.getEffectiveWorkingDirectory();
    
    // 设置到config中供Git信息获取使用
    if (this.config) {
      this.config.projectPath = effectiveWorkdir;
    }
    
    try {
      // 根据步骤路由到相应的处理方法
      switch (step) {
        case 'start':
          return await this.handleIterationStart();
        
        case 'basic_info':
          return await this.handleBasicInfo(data);
        
        case 'project_info':
          return await this.handleProjectInfo(data);
        
        case 'modules':
          return await this.handleModules(data);
        
        default:
          throw new Error(`未知步骤: ${step}`);
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ 步骤执行失败: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }

  /**
   * 自动检测工作目录
   * 优先级：
   * 1. 命令行参数 --workdir （最高优先级，已在构造函数中处理）
   * 2. 手动传递的workdir参数
   * 3. 环境变量（PWD、INIT_CWD等）
   * 4. 进程当前目录process.cwd()（最低优先级）
   * 
   * @param manualWorkdir 手动传递的工作目录
   * @returns 检测到的工作目录路径
   */
  private detectWorkingDirectory(manualWorkdir?: string): string {
    console.log('🔍 开始自动检测工作目录...');
    console.log(`🔧 调试信息: PWD=${process.env.PWD}, INIT_CWD=${process.env.INIT_CWD}, process.cwd()=${process.cwd()}`);
    
    // 优先级1：手动传递的workdir参数
    if (manualWorkdir) {
      console.log(`✅ 使用手动传递的工作目录: ${manualWorkdir}`);
      return manualWorkdir;
    }
    
    // 优先级2：环境变量检测
    const envWorkdir = process.env.PWD || process.env.INIT_CWD;
    if (envWorkdir && envWorkdir !== '/') {
      console.log(`✅ 使用环境变量检测的工作目录: ${envWorkdir}`);
      return envWorkdir;
    }
    
    // 优先级3：进程当前目录
    const currentDir = process.cwd();
    if (currentDir !== '/') {
      console.log(`✅ 使用进程当前目录作为工作目录: ${currentDir}`);
      return currentDir;
    }
    
    // 优先级4：如果都是根目录，尝试智能搜索项目目录
    const potentialDirs = this.findPotentialProjectDirectories();
    if (potentialDirs.length > 0) {
      console.log(`✅ 找到可能的项目目录，使用: ${potentialDirs[0]}`);
      return potentialDirs[0];
    }
    
    // 优先级5：最后的fallback - 提示用户手动指定
    console.warn(`⚠️ 无法自动检测工作目录，请手动指定workdir参数`);
    return process.cwd(); // 返回当前目录作为最后的选择
  }

  /**
   * 尝试寻找可能的项目目录
   * 在常见的项目路径中搜索Git仓库
   */
  private findPotentialProjectDirectories(): string[] {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    
    const possiblePaths = [
      // 用户主目录下的常见项目路径
      path.join(os.homedir(), 'project'),
      path.join(os.homedir(), 'projects'),
      path.join(os.homedir(), 'workspace'),
      path.join(os.homedir(), 'dev'),
      path.join(os.homedir(), 'code'),
      // 其他可能的路径
      '/usr/src',
      '/opt',
    ];
    
    const validDirs: string[] = [];
    
    for (const basePath of possiblePaths) {
      try {
        if (fs.existsSync(basePath)) {
          // 扫描子目录，寻找包含.git的目录
          const subdirs = fs.readdirSync(basePath, { withFileTypes: true })
            .filter((dirent: any) => dirent.isDirectory())
            .map((dirent: any) => path.join(basePath, dirent.name));
          
          for (const subdir of subdirs) {
            const gitPath = path.join(subdir, '.git');
            if (fs.existsSync(gitPath)) {
              validDirs.push(subdir);
            }
          }
        }
      } catch (error) {
        // 忽略权限错误等
        console.log(`跳过路径 ${basePath}: ${error}`);
      }
    }
    
    return validDirs;
  }

  /**
   * 处理迭代创建流程的第一步：开始流程
   * 
   * 执行内容：
   * 1. 清空之前的会话数据
   * 2. 获取本地缓存的用户数据
   * 3. 调用API获取项目组列表（如果已登录）
   * 4. 展示项目组选项和用户列表
   * 5. 提供基础信息收集的指导
   * 
   * @returns MCP响应对象，包含项目组列表、用户信息和下一步指导
   */
  private async handleIterationStart() {
    // 清空会话数据，开始新的迭代创建流程
    this.sessionData = {};
    
    // 获取缓存中的用户数据
    let participants: UserInfo[] = [];
    let reviewers: UserInfo[] = [];
    
    // 尝试获取项目组和用户列表
    let projectListText = '';
    try {
      // 主动获取API管理器，这将自动处理Token和配置加载
      const apiManager = await this.getAPIManager();
      console.log('apiManager', apiManager);
      
      // 获取项目组列表
      const projectList = await apiManager.getProjectList();
      if (projectList && projectList.length > 0) {
        projectListText = `📋 **可选项目组：**\n`;
        projectList.forEach((project, index) => {
          projectListText += `${index + 1}. ${project.name} (ID: ${project.id})\n`;
        });
        projectListText += `\n请在 projectLine 字段中填写完整的项目组名称或ID。\n\n`;
      } else {
        projectListText = `⚠️ 未获取到项目组列表，请手动输入项目线名称。\n\n`;
      }
      
      // 获取用户列表
      participants = await apiManager.getUserList();
      reviewers = participants; // 假设审核人和参与人是同一组

    } catch (error) {
      console.error('获取初始化数据失败:', error);
      console.error('错误详情:', {
        name: error instanceof Error ? error.constructor.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      const errorMessage = `⚠️ API管理器未初始化，请先登录。建议手动输入项目线名称。\n`;
      projectListText = errorMessage;
      
      // 如果API获取失败，回退到缓存数据
      // const cache = this.cacheManager.getCache();
      participants = await this.cacheManager.getParticipants();
      reviewers = await this.cacheManager.getReviewers();
    }
    
    return {
      content: [
        {
          type: 'text',
          text: `🚀 开始创建迭代信息\n\n` +
                `📋 **第一步：基础信息**\n` +
                `请提供以下信息：\n\n` +
                projectListText +
                `1. **项目线** (支持两种输入方式):\n` +
                `   - 输入项目ID (如: 1, 2, 3)\n` +
                `   - 输入项目名称 (如: 医美, 行业)\n` +
                `2. **迭代名称** (例如：v1.2.0 用户体验优化迭代)\n` +
                `3. **上线时间** (格式：YYYY-MM-DD)\n` +
                `4. **备注** (可选)\n\n` +
                `💡 请按以下格式调用：\n` +
                `\`\`\`\n` +
                `create_iteration\n` +
                `step: "basic_info"\n` +
                `data: "{\n` +
                `  \\"projectLine\\": \\"2\\",\n` +
                `  \\"iterationName\\": \\"v1.2.0 用户体验优化迭代\\",\n` +
                `  \\"onlineTime\\": \\"2024-02-15\\",\n` +
                `  \\"remarks\\": \\"专注于提升用户界面交互体验\\"\n` +
                `}"\n` +
                `\`\`\`\n\n` +
                `📝 **项目线输入示例**：\n` +
                `- 输入项目ID: \`"projectLine": "2"\`\n` +
                `- 输入项目名称: \`"projectLine": "行业"\`\n\n` +
                `📊 **可用人员信息：**\n` +
                `参与人员：${participants.length > 0 ? participants.map(p => `${p.realName}(${p.id})`).join(', ') : '未获取到'}\n` +
                `审核人员：${reviewers.length > 0 ? reviewers.map(r => `${r.realName}(${r.id})`).join(', ') : '未获取到'}`
        }
      ]
    };
  }

  private async handleBasicInfo(data: string) {
    try {
      const basicInfo = JSON.parse(data);
      
      // 验证必填字段
      if (!basicInfo.projectLine || !basicInfo.iterationName || !basicInfo.onlineTime) {
        throw new Error('项目线、迭代名称和上线时间为必填项');
      }
      
      // 保存用户输入的基础信息到会话存储
      this.sessionData.basicInfo = basicInfo;
      
      // 更新缓存中的项目线
      this.cacheManager.updateProjectLine(basicInfo.projectLine);
      
      // 直接使用git命令获取真实信息
      let gitInfo: GitInfo = {};
      let debugInfo = '';
      
      try {
        const { execSync } = await import('child_process');
        
        // 使用自动检测的工作目录（已在handleCreateIteration中设置）
        const workspaceRoot = this.config?.projectPath || process.cwd();
        debugInfo += `🔧 使用工作目录: ${workspaceRoot}\n`;
        debugInfo += `🔧 调试 - config.projectPath: ${this.config?.projectPath}\n`;
        debugInfo += `🔧 调试 - process.cwd(): ${process.cwd()}\n`;
        debugInfo += `🔧 调试 - __dirname: ${__dirname}\n`;
        debugInfo += `🔧 调试 - PWD环境变量: ${process.env.PWD}\n`;
        debugInfo += `🔧 调试 - INIT_CWD环境变量: ${process.env.INIT_CWD}\n`;
        
        // 检查目录是否存在
        const fs = await import('fs');
        if (!fs.existsSync(workspaceRoot)) {
          debugInfo += `❌ 工作目录不存在: ${workspaceRoot}\n`;
          throw new Error(`工作目录不存在: ${workspaceRoot}`);
        }
        const execOptions = { encoding: 'utf-8' as const, cwd: workspaceRoot };
        
        // 检查工作目录是否是git仓库
        try {
          execSync('git rev-parse --git-dir', execOptions);
          debugInfo += `✅ 确认是Git仓库\n`;
        } catch (e) {
          debugInfo += `❌ 不是Git仓库: ${e}\n`;
          throw new Error('不是Git仓库');
        }
        
        // 获取当前分支
        try {
          const branch = execSync('git branch --show-current', execOptions).trim();
          gitInfo.currentBranch = branch;
          debugInfo += `✅ 当前分支: ${branch}\n`;
        } catch (e) {
          debugInfo += `⚠️ 无法获取当前分支: ${e}\n`;
        }
        
        // 获取项目名称（从当前目录）
        try {
          const pwd = execSync('pwd', execOptions).trim();
          const projectName = pwd.split('/').pop()?.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
          gitInfo.projectName = projectName;
          debugInfo += `✅ 项目名称: ${projectName}\n`;
        } catch (e) {
          debugInfo += `⚠️ 无法获取项目名称: ${e}\n`;
        }
        
        // 从配置文件获取项目URL
        try {
          const fs = await import('fs');
          const path = await import('path');
          const configPath = path.join(workspaceRoot, 'git_info.config.json');
          const configContent = fs.readFileSync(configPath, 'utf-8');
          const config = JSON.parse(configContent);
          gitInfo.projectUrl = config.git_project_url;
          debugInfo += `✅ 项目地址: ${config.git_project_url}\n`;
        } catch (e) {
          debugInfo += `⚠️ 无法读取项目配置: ${e}\n`;
        }
        
        // 计算预估工时 - 使用分支创建时间或最近活动
        try {
          const currentBranch = execSync('git branch --show-current', execOptions).trim();
          debugInfo += `🔍 计算分支 ${currentBranch} 的工时\n`;
          
          let workDays = 7; // 默认1周
          
          if (currentBranch && currentBranch !== 'main' && currentBranch !== 'master') {
            // 非主分支：使用分支真正的创建时间（从主分支分离的时间点）
            try {
              // 方法1：使用merge-base获取分支分离点的时间
              const mergeBase = execSync('git merge-base main HEAD 2>/dev/null || git merge-base master HEAD', execOptions).trim();
              if (mergeBase) {
                const branchCreateTime = execSync(`git show --format=%ai -s ${mergeBase}`, execOptions).trim();
                const createDate = new Date(branchCreateTime);
                const now = new Date();
                const diffDays = Math.ceil((now.getTime() - createDate.getTime()) / (1000 * 60 * 60 * 24));
                workDays = Math.min(Math.max(diffDays, 1), 30); // 限制在1-30天之间
                debugInfo += `🌿 分支创建时间: ${branchCreateTime}, 计算天数: ${diffDays}\n`;
              } else {
                throw new Error('无法找到merge-base');
              }
            } catch (mergeBaseError) {
              debugInfo += `⚠️ 无法获取分支创建时间，尝试第一次提交时间\n`;
              // 回退方案1：使用分支第一次提交时间
              try {
                const branchFirstCommit = execSync(`git log --reverse --format=%ai ${currentBranch} | head -1`, execOptions).trim();
                if (branchFirstCommit) {
                  const firstDate = new Date(branchFirstCommit);
                  const now = new Date();
                  const diffDays = Math.ceil((now.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
                  workDays = Math.min(Math.max(diffDays, 1), 30);
                  debugInfo += `📅 分支第一次提交: ${branchFirstCommit}, 计算天数: ${diffDays}\n`;
                } else {
                  throw new Error('无法获取第一次提交');
                }
              } catch (firstCommitError) {
                debugInfo += `⚠️ 回退到最近提交活动估算\n`;
                // 回退方案2：根据最近30天的提交数量估算
                const recentCommits = execSync('git log --since="30 days ago" --oneline | wc -l', execOptions).trim();
                const commitCount = parseInt(recentCommits) || 0;
                workDays = Math.max(Math.ceil(commitCount / 3), 3);
              }
            }
          } else {
            // 主分支：根据最近活动估算
            const recentCommits = execSync('git log --since="30 days ago" --oneline | wc -l', execOptions).trim();
            const commitCount = parseInt(recentCommits) || 0;
            workDays = commitCount > 0 ? Math.max(Math.ceil(commitCount / 3), 3) : 7;
            debugInfo += `📊 最近30天提交数: ${commitCount}, 估算工时: ${workDays}天\n`;
          }
          
          gitInfo.estimatedWorkDays = workDays;
          debugInfo += `✅ 预估工时: ${workDays} 天\n`;
        } catch (e) {
          debugInfo += `⚠️ 无法计算工时: ${e}\n`;
          gitInfo.estimatedWorkDays = 7; // 默认1周
        }
        
        debugInfo += `✅ Git信息获取完成\n`;
      } catch (error) {
        debugInfo += `❌ Git信息获取失败: ${error}\n`;
        gitInfo = {}; // 使用空对象作为fallback
      }
      
      const cache = this.cacheManager.getCache();
      
      return {
        content: [
          {
            type: 'text',
            text: `✅ 基础信息已收集\n\n` +
                  `🔧 **调试信息：**\n${debugInfo}\n` +
                  `📋 **第二步：项目信息**\n` +
                  `以下信息已自动获取，请确认或修改：\n\n` +
                  `🔧 **Git信息（自动获取）：**\n` +
                  `- Git项目地址: ${gitInfo.projectUrl || '未获取到'}\n` +
                  `- Git项目名称: ${gitInfo.projectName || '未获取到'}\n` +
                  `- 当前分支: ${gitInfo.currentBranch || '未获取到'}\n` +
                  `- 预估工时: ${gitInfo.estimatedWorkDays || '未计算'} 天\n\n` +
                  `👥 **人员信息（从缓存获取）：**\n` +
                  `- 参与人员: ${cache.participants.map(p => `${p.realName}(${p.id})`).join(', ')}\n` +
                  `- 复审人员: ${cache.reviewers.map(r => `${r.realName}(${r.id})`).join(', ')}\n\n` +
                  `💡 请按以下格式调用，确认或修改信息：\n` +
                  `\`\`\`\n` +
                  `create_iteration\n` +
                  `step: "project_info"\n` +
                  `data: "{\n` +
                  `  \\"productDoc\\": \\"请输入产品文档链接\\",\n` +
                  `  \\"technicalDoc\\": \\"请输入技术文档链接\\",\n` +
                  `  \\"projectDashboard\\": \\"请输入项目大盘链接\\",\n` +
                  `  \\"designDoc\\": \\"请输入设计文档链接\\",\n` +
                  `  \\"gitProjectUrl\\": \\"${gitInfo.projectUrl || ''}\\",\n` +
                  `  \\"gitProjectName\\": \\"${gitInfo.projectName || ''}\\",\n` +
                  `  \\"developmentBranch\\": \\"${gitInfo.currentBranch || ''}\\",\n` +
                  `  \\"participants\\": [\\"${cache.participants.map(p => p.id).join('\\", \\"')}\\"],\n` +
                  `  \\"reviewers\\": [\\"${cache.reviewers.map(r => r.id).join('\\", \\"')}\\"],\n` +
                  `  \\"workHours\\": ${gitInfo.estimatedWorkDays || 0},\n` +
                  `  \\"remarks\\": \\"请输入备注信息\\"\n` +
                  `}"\n` +
                  `\`\`\``
          }
        ]
      };
    } catch (error) {
      throw new Error(`基础信息格式错误: ${error}`);
    }
  }

  private async handleProjectInfo(data: string) {
    try {
      const projectInfo = JSON.parse(data);
      
      // 验证必填字段
      const required = ['gitProjectUrl', 'gitProjectName', 'developmentBranch'];
      for (const field of required) {
        if (!projectInfo[field]) {
          throw new Error(`${field} 为必填项`);
        }
      }
      
      // 保存用户输入的项目信息到会话存储
      this.sessionData.projectInfo = projectInfo;
      
      // 更新缓存中的参与人员和复审人员
      const participantIds = projectInfo.participants || [];
      const reviewerIds = projectInfo.reviewers || [];
      if (participantIds.length > 0 || reviewerIds.length > 0) {
        this.cacheManager.updateRecentPersonnel(participantIds, reviewerIds);
      }
      
      return {
        content: [
          {
            type: 'text',
            text: `✅ 项目信息已收集\n\n` +
                  `📋 **第三步：模块信息**\n` +
                  `请提供组件模块和功能模块信息：\n\n` +
                  `💡 请按以下格式调用：\n` +
                  `\`\`\`\n` +
                  `create_iteration\n` +
                  `step: "modules"\n` +
                  `data: "{\n` +
                  `  \\"componentModules\\": [\n` +
                  `    {\n` +
                  `      \\"name\\": \\"用户登录组件\\",\n` +
                  `      \\"relativePath\\": \\"src/components/Login.tsx\\",\n` +
                  `      \\"reviewer\\": \\"${projectInfo.reviewers?.[0] || 'r001'}\\",\n` +
                  `      \\"image\\": { \\"type\\": \\"upload_later\\" }\n` +
                  `    }\n` +
                  `  ],\n` +
                  `  \\"functionModules\\": [\n` +
                  `    {\n` +
                  `      \\"name\\": \\"用户认证功能\\",\n` +
                  `      \\"reviewer\\": \\"${projectInfo.reviewers?.[0] || 'r001'}\\",\n` +
                  `      \\"description\\": \\"实现JWT认证和权限控制\\"\n` +
                  `    }\n` +
                  `  ]\n` +
                  `}"\n` +
                  `\`\`\``
          }
        ]
      };
    } catch (error) {
      throw new Error(`项目信息格式错误: ${error}`);
    }
  }

  private async handleModules(data: string) {
    try {
      const modules = JSON.parse(data);
      
      // 验证模块信息
      if (!modules.componentModules || !modules.functionModules) {
        throw new Error('componentModules 和 functionModules 为必填项');
      }
      
      // 保存用户输入的模块信息到会话存储
      this.sessionData.modules = modules;
      
      // 验证是否有完整的会话数据
      if (!this.sessionData.basicInfo || !this.sessionData.projectInfo) {
        throw new Error('缺少之前步骤的数据，请重新开始流程');
      }
      
      // 使用会话中收集的真实用户数据组装完整迭代信息
      const completeIteration = {
        basicInfo: this.sessionData.basicInfo,
        crApplication: {
          projectInfo: {
            projectName: this.sessionData.projectInfo.gitProjectName,
            projectManager: this.sessionData.projectInfo.participants?.[0] || '',
            technicalLeader: this.sessionData.projectInfo.participants?.[1] || '',
            participants: this.sessionData.projectInfo.participants || [],
            startDate: new Date().toISOString().split('T')[0],
            endDate: this.sessionData.basicInfo.onlineTime,
            description: this.sessionData.projectInfo.remarks || '',
            productDoc: this.sessionData.projectInfo.productDoc || '',
            technicalDoc: this.sessionData.projectInfo.technicalDoc || '',
            projectDashboard: this.sessionData.projectInfo.projectDashboard || '',
            designDoc: this.sessionData.projectInfo.designDoc || '',
            gitProjectUrl: this.sessionData.projectInfo.gitProjectUrl,
            developmentBranch: this.sessionData.projectInfo.developmentBranch,
            workHours: this.sessionData.projectInfo.workHours || 0
          },
          componentModules: modules.componentModules,
          functionModules: modules.functionModules
        }
      };
      
      return {
        content: [
          {
            type: 'text',
            text: `🎉 迭代信息收集完成！\n\n` +
                  `📝 **完整数据预览：**\n` +
                  `\`\`\`json\n${JSON.stringify(completeIteration, null, 2)}\n\`\`\`\n\n` +
                  `⚠️ **请仔细确认上述数据是否正确！**\n\n` +
                  `✅ 如果数据正确，请**手动执行**以下命令提交：\n\n` +
                  `\`\`\`\n` +
                  `submit_complete_iteration\n` +
                  `iteration_data: "[请复制上面的完整JSON数据]"\n` +
                  `\`\`\`\n\n` +
                  `🛑 **重要提醒**：\n` +
                  `- 请勿让系统自动提交\n` +
                  `- 必须由用户手动确认并执行提交命令\n` +
                  `- 提交前请仔细检查所有数据是否正确\n\n` +
                  `❌ 如果数据有误，请重新开始流程：create_iteration step="start"`
          }
        ]
      };
    } catch (error) {
      throw new Error(`模块信息格式错误: ${error}`);
    }
  }

  /**
   * 获取或创建一个经过认证的APIManager实例
   * 这是所有需要认证的API调用的统一入口
   */
  private async getAPIManager(): Promise<APIManager> {
    // 如果已有APIManager实例，且其token与当前会话token一致，则直接返回
    if (this.apiManager && this.sessionToken) {
      return this.apiManager;
    }

    console.log('🔧 正在初始化/刷新API管理器...');
    
    try {
      // 优先使用会话Token
      const token = this.sessionToken || await this.configManager.getToken();
      console.log(`✅ Token获取成功，长度: ${token.length}`);
      
      const baseUrl = await this.configManager.getBaseUrl();
      console.log(`🌐 BaseUrl获取结果: "${baseUrl}"`);
      
      // 验证最终的API配置是否完整
      if (!baseUrl || baseUrl.trim() === '') {
        throw new Error('API配置不完整：baseUrl不能为空。请检查您的 mcp-config.json 文件中的 api.baseUrl 配置。');
      }
      
      // 完全使用ConfigManager的配置，确保baseUrl正确
      const finalConfig = {
        ...this.config,
        api: {
          ...this.config.api,
          baseUrl: baseUrl  // 强制使用ConfigManager获取的baseUrl
        }
      };
      
      this.apiManager = new APIManager(finalConfig, token);
      console.log(`✅ API管理器已准备就绪 (API Base: ${baseUrl})`);
      
      return this.apiManager;
    } catch (error) {
      console.error('❌ API管理器初始化失败:', error);
      console.error('详细错误信息:', {
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  private async handleSubmitCompleteIteration(args: any) {
    try {
      const { iteration_data } = args;
      
      // 通过新的方法获取API管理器，它会自动处理Token
      const apiManager = await this.getAPIManager();
      
      // 解析JSON数据
      let iterationData: CompleteIteration;
      try {
        iterationData = JSON.parse(iteration_data);
      } catch (error) {
        throw new Error('JSON数据格式错误，请检查数据格式');
      }
      
      // 验证数据结构
      if (!iterationData.basicInfo || !iterationData.crApplication) {
        throw new Error('数据结构不完整，需要包含 basicInfo 和 crApplication');
      }
      
      console.log('🚀 开始两阶段提交流程...');
      console.log('📋 基础信息:', JSON.stringify(iterationData.basicInfo, null, 2));
      console.log('📋 CR申请单信息:', JSON.stringify(iterationData.crApplication, null, 2));
      
      console.log('🔥 步骤1: 开始API提交...');
      // 提交完整迭代（两阶段）
      const result = await apiManager.submitCompleteIteration(iterationData);
      console.log('🔥 步骤1: API提交成功，结果:', result);
      
      console.log('🔥 步骤2: 开始更新缓存...');
      // 更新缓存（暂时注释掉进行测试）
      try {
        await this.cacheManager.updateAfterSubmission(iterationData);
        console.log('🔥 步骤2: 缓存更新成功');
      } catch (cacheError) {
        console.warn('⚠️ 缓存更新失败，但继续执行:', cacheError);
        // 不抛出错误，让主流程继续
      }
      
      console.log('🔥 步骤3: 清空会话数据...');
      // 清空会话数据
      this.sessionData = {};
      console.log('🔥 步骤3: 会话数据清空成功');
      
      return {
        content: [
          {
            type: 'text',
            text: `🎉 迭代信息提交成功！\n\n` +
                  `📋 **提交结果：**\n` +
                  `- 迭代ID: ${result.iterationId}\n` +
                  `- CR申请单ID: ${result.crApplicationId}\n` +
                  `- 状态: 成功\n\n` +
                  `✅ 数据已保存到本地缓存，下次创建迭代时会自动填充常用信息。`
          }
        ]
      };
    } catch (error) {
      console.error('🚨 提交迭代信息时发生错误:', error);
      
      // 检查是否是项目匹配错误
      if (error instanceof Error && 
          (error.message.includes('不存在') || 
           error.message.includes('未找到') || 
           error.message.includes('可用项目列表'))) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ **项目线配置错误**\n\n` +
                    `🚨 ${error.message}\n\n` +
                    `💡 **解决方案：**\n` +
                    `1. 请重新开始流程：\`create_iteration step="start"\`\n` +
                    `2. 在基础信息中输入正确的项目线名称或项目ID\n` +
                    `3. 参考上面提示的可用项目列表选择正确的项目\n\n` +
                    `📝 **输入示例：**\n` +
                    `- 使用项目ID: \`"projectLine": "2"\`\n` +
                    `- 使用项目名称: \`"projectLine": "行业"\``
            }
          ]
        };
      }
      
      // 其他类型的错误
      let errorInfo = '';
      if (error instanceof Error) {
        errorInfo = `错误消息: ${error.message}\n`;
        if (process.env.NODE_ENV === 'development') {
          errorInfo += `错误堆栈: ${error.stack}\n`;
        }
      } else {
        errorInfo = `未知错误: ${String(error)}\n`;
      }
      
      // 如果是axios错误，添加更多信息
      if ((error as any).isAxiosError) {
        const axiosError = error as any;
        errorInfo += `HTTP状态码: ${axiosError.response?.status}\n`;
        errorInfo += `响应数据: ${JSON.stringify(axiosError.response?.data, null, 2)}\n`;
        if (process.env.NODE_ENV === 'development') {
          errorInfo += `请求URL: ${axiosError.config?.url}\n`;
          errorInfo += `请求方法: ${axiosError.config?.method}\n`;
          errorInfo += `请求头: ${JSON.stringify(axiosError.config?.headers, null, 2)}\n`;
        }
      }
      
      return {
        content: [
          {
            type: 'text',
            text: `❌ 提交失败\n\n` +
                  `🚨 **错误信息:**\n` +
                  `\`\`\`\n${errorInfo}\`\`\`\n\n` +
                  `💡 **建议解决方案：**\n` +
                  `1. 检查网络连接是否正常\n` +
                  `2. 确认Token是否有效\n` +
                  `3. 重新开始流程：\`create_iteration step="start"\``
          }
        ]
      };
    }
  }

  private async handleGetUserList(args: any) {
    try {
      console.log('👥 开始获取用户列表...');
        
      // 通过新的方法获取API管理器，它会自动处理Token
      const apiManager = await this.getAPIManager();

      console.log('🔍 调用getUserList接口...');
      
      // 调用getUserList接口并捕获所有异常
      let result: any;
      let errorInfo = '';
      
      try {
        result = await apiManager.getUserList();
        console.log('✅ getUserList接口调用成功');
      } catch (error) {
        console.error('❌ getUserList接口调用失败:', error);
        
        // 详细的异常信息
        if (error instanceof Error) {
          errorInfo = `错误消息: ${error.message}\n`;
          errorInfo += `错误堆栈: ${error.stack}\n`;
        } else {
          errorInfo = `未知错误: ${String(error)}\n`;
        }
        
        // 如果是axios错误，添加更多信息
        if ((error as any).isAxiosError) {
          const axiosError = error as any;
          errorInfo += `HTTP状态码: ${axiosError.response?.status}\n`;
          errorInfo += `响应数据: ${JSON.stringify(axiosError.response?.data, null, 2)}\n`;
          errorInfo += `请求URL: ${axiosError.config?.url}\n`;
          errorInfo += `请求方法: ${axiosError.config?.method}\n`;
          errorInfo += `请求头: ${JSON.stringify(axiosError.config?.headers, null, 2)}\n`;
        }
        
        return {
          content: [
            {
              type: 'text',
              text: `❌ 获取用户列表失败\n\n` +
                    `🔧 **接口信息:**\n` +
                    `- URL: ${this.config.api.baseUrl}${this.config.api.endpoints.getUserList}\n` +
                    `- 方法: POST\n` +
                    `- 认证: Bearer Token\n\n` +
                    `🚨 **异常详情:**\n` +
                    `\`\`\`\n${errorInfo}\`\`\``
            }
          ]
        };
      }
      
      // 成功的情况
      return {
        content: [
          {
            type: 'text',
            text: `✅ 用户列表获取成功！\n\n` +
                  `🔧 **接口信息:**\n` +
                  `- URL: ${this.config.api.baseUrl}${this.config.api.endpoints.getUserList}\n` +
                  `- 方法: POST\n` +
                  `- 认证: Bearer Token\n\n` +
                  `📋 **用户列表:**\n` +
                  `\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\`\n\n` +
                  `📊 **统计信息:**\n` +
                  `- 用户总数: ${Array.isArray(result) ? result.length : '数据格式异常'}\n` +
                  `- 可用作参与人员和审核人员`
          }
        ]
      };
      
    } catch (error) {
      console.error('🚨 handleGetUserList发生严重错误:', error);
      
      return {
        content: [
          {
            type: 'text',
            text: `🚨 获取用户列表时发生严重错误:\n\n` +
                  `${error instanceof Error ? error.message : String(error)}\n\n` +
                  `请检查MCP工具配置和网络连接。`
          }
        ]
      };
    }
  }

  // ==================== 服务器启动方法 ====================
  
  /**
   * 启动MCP服务器
   * 
   * 执行流程：
   * 1. 创建标准输入输出传输层
   * 2. 连接MCP服务器到传输层
   * 3. 输出启动成功信息
   * 
   * @throws 启动失败时抛出异常
   */
  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Iteration MCP Server running on stdio');
  }
}

// ==================== 服务器实例化和启动 ====================

/**
 * 创建并启动MCP服务器实例
 * 这是程序的入口点
 */
const server = new IterationMCPServer();
server.run().catch((err) => {
  console.error('❌ MCP服务器启动失败:', err);
});

// ==================== 模块导出 ====================

/**
 * 导出服务器类供测试和其他模块使用
 */
export { IterationMCPServer };