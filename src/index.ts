#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { loadConfig, validateConfig } from './config.js';
import { DingTalkAuth } from './dingtalk.js';
import { CacheManager } from './cache.js';
import { APIManager } from './api.js';
import { GitUtils, GitInfo } from './git-utils.js';
import { CompleteIteration } from './types.js';

class IterationMCPServer {
  private server: Server;
  private config: any;
  private dingTalkAuth: DingTalkAuth | null = null;
  private cacheManager: CacheManager;
  private apiManager: APIManager | null = null;
  private gitUtils: GitUtils;

  constructor() {
    this.server = new Server(
      {
        name: 'iteration-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.cacheManager = new CacheManager();
    this.gitUtils = new GitUtils(process.cwd());
    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
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
          {
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
                }
              },
              required: ['step']
            }
          },
          {
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
          }
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case 'check_login_status':
            return await this.handleCheckLoginStatus();
          
          case 'login_dingtalk':
            return await this.handleDingTalkLogin();
          
          case 'create_iteration':
            return await this.handleCreateIteration(request.params.arguments);
          
          case 'submit_complete_iteration':
            return await this.handleSubmitCompleteIteration(request.params.arguments);
          
          default:
            throw new Error(`Unknown tool: ${request.params.name}`);
        }
      } catch (error) {
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

  private async handleCheckLoginStatus() {
    try {
      // 检查是否有有效的登录token
      const isLoggedIn = this.dingTalkAuth?.isLoggedIn() || false;
      
      return {
        content: [
          {
            type: 'text',
            text: isLoggedIn ? '✅ 已登录钉钉' : '❌ 未登录钉钉'
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `检查登录状态失败: ${error}`
          }
        ]
      };
    }
  }

  private async handleDingTalkLogin() {
    try {
      if (!this.config) {
        this.config = loadConfig();
        validateConfig(this.config);
      }

      if (!this.dingTalkAuth) {
        this.dingTalkAuth = new DingTalkAuth(this.config.dingtalk);
      }

      const loginResult = await this.dingTalkAuth.login();
      
      if (loginResult.success) {
        // 初始化API管理器
        this.apiManager = new APIManager(this.config, loginResult.accessToken!);
        
        return {
          content: [
            {
              type: 'text',
              text: `✅ 钉钉登录成功！\n用户: ${loginResult.userInfo?.name}\n部门: ${loginResult.userInfo?.department}`
            }
          ]
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `❌ 钉钉登录失败: ${loginResult.message}`
            }
          ]
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `钉钉登录失败: ${error}`
          }
        ]
      };
    }
  }

  private async handleCreateIteration(args: any) {
    const { step, data } = args;
    
    try {
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

  private async handleIterationStart() {
    // 获取缓存数据
    const cache = this.cacheManager.getCache();
    const participants = await this.cacheManager.getParticipants();
    const reviewers = await this.cacheManager.getReviewers();
    
    return {
      content: [
        {
          type: 'text',
          text: `🚀 开始创建迭代信息\n\n` +
                `📋 **第一步：基础信息**\n` +
                `请提供以下信息：\n\n` +
                `1. **项目线** (${cache.projectLines.length > 0 ? `可选：${cache.projectLines.join(', ')}` : '请输入'})\n` +
                `2. **迭代名称** (例如：v1.2.0 用户体验优化迭代)\n` +
                `3. **上线时间** (格式：YYYY-MM-DD)\n` +
                `4. **备注** (可选)\n\n` +
                `💡 请按以下格式调用：\n` +
                `\`\`\`\n` +
                `create_iteration\n` +
                `step: "basic_info"\n` +
                `data: "{\n` +
                `  \\"projectLine\\": \\"前端框架\\",\n` +
                `  \\"iterationName\\": \\"v1.2.0 用户体验优化迭代\\",\n` +
                `  \\"onlineTime\\": \\"2024-02-15\\",\n` +
                `  \\"remarks\\": \\"专注于提升用户界面交互体验\\"\n` +
                `}"\n` +
                `\`\`\`\n\n` +
                `📊 **可用人员信息：**\n` +
                `参与人员：${participants.map(p => `${p.name}(${p.id})`).join(', ')}\n` +
                `审核人员：${reviewers.map(r => `${r.name}(${r.id})`).join(', ')}`
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
      
      // 更新缓存中的项目线
      this.cacheManager.updateProjectLine(basicInfo.projectLine);
      
      // 自动获取git信息并预填充项目信息
      const gitInfo: GitInfo = await this.gitUtils.getGitInfo();
      const cache = this.cacheManager.getCache();
      
      return {
        content: [
          {
            type: 'text',
            text: `✅ 基础信息已收集\n\n` +
                  `📋 **第二步：项目信息**\n` +
                  `以下信息已自动获取，请确认或修改：\n\n` +
                  `🔧 **Git信息（自动获取）：**\n` +
                  `- Git项目地址: ${gitInfo.projectUrl || '未获取到'}\n` +
                  `- Git项目名称: ${gitInfo.projectName || '未获取到'}\n` +
                  `- 当前分支: ${gitInfo.currentBranch || '未获取到'}\n` +
                  `- 预估工时: ${gitInfo.estimatedWorkDays || '未计算'} 天\n\n` +
                  `👥 **人员信息（从缓存获取）：**\n` +
                  `- 参与人员: ${cache.participants.map(p => `${p.name}(${p.id})`).join(', ')}\n` +
                  `- 复审人员: ${cache.reviewers.map(r => `${r.name}(${r.id})`).join(', ')}\n\n` +
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
      
      // 从会话中收集之前的信息（这里简化处理，实际应该从临时存储中获取）
      const template = await this.cacheManager.generateIterationTemplate();
      
      const completeIteration = {
        basicInfo: template.basicInfo, // 这里应该是之前收集的真实数据
        crApplication: {
          projectInfo: template.crApplication.projectInfo, // 这里应该是之前收集的真实数据
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
                  `✅ 现在可以使用 **submit_complete_iteration** 工具提交完整迭代信息。\n\n` +
                  `💡 提交命令：\n` +
                  `\`\`\`\n` +
                  `submit_complete_iteration\n` +
                  `iteration_data: "[上面的JSON数据]"\n` +
                  `\`\`\``
          }
        ]
      };
    } catch (error) {
      throw new Error(`模块信息格式错误: ${error}`);
    }
  }

  private async handleSubmitCompleteIteration(args: any) {
    try {
      const { iteration_data } = args;
      
      if (!this.apiManager) {
        throw new Error('请先登录钉钉');
      }
      
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
      
      // 提交完整迭代（两阶段）
      const result = await this.apiManager.submitCompleteIteration(iterationData);
      
      // 更新缓存
      await this.cacheManager.updateAfterSubmission(iterationData);
      
      return {
        content: [
          {
            type: 'text',
            text: `🎉 迭代提交成功！\n\n` +
                  `✅ 迭代ID: ${result.iterationId}\n` +
                  `✅ CR申请单ID: ${result.crApplicationId}\n\n` +
                  `提交流程：\n` +
                  `1. ✅ 创建迭代基础信息\n` +
                  `2. ✅ 验证迭代创建结果\n` +
                  `3. ✅ 创建CR申请单\n\n` +
                  `所有步骤均已完成！`
          }
        ]
      };
      
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ 提交失败: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Iteration MCP Server running on stdio');
  }
}

const server = new IterationMCPServer();
server.run().catch(console.error);