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
 * @version 1.0.1
 * @since 2024-12-23
 */
/**
 * MCP迭代管理服务器主类
 *
 * 负责处理所有MCP工具请求，包括：
 * - 用户认证管理
 * - 迭代信息收集流程
 * - API接口调用
 * - 缓存数据管理
 */
declare class IterationMCPServer {
    /** MCP服务器实例 */
    private server;
    /** 工具配置对象，包含API端点、钉钉配置等 */
    private config;
    /** 钉钉认证管理器，处理登录和token管理 */
    private dingTalkAuth;
    /** 本地缓存管理器，缓存用户列表、项目线等数据 */
    private cacheManager;
    /** API调用管理器，处理所有HTTP请求 */
    private apiManager;
    /**
     * 临时会话存储，用于多步骤迭代创建流程
     * 包含用户在不同步骤中输入的数据：
     * - basicInfo: 基础信息（项目线、迭代名称、上线时间等）
     * - projectInfo: 项目信息（文档链接、Git信息、人员配置等）
     * - modules: 模块信息（组件模块和功能模块）
     */
    private sessionData;
    /**
     * 构造函数 - 初始化MCP服务器和核心组件
     *
     * 执行流程：
     * 1. 创建MCP服务器实例
     * 2. 加载配置文件
     * 3. 初始化缓存管理器
     * 4. 设置请求处理器
     */
    constructor();
    /**
     * 设置MCP请求处理器
     *
     * 注册两种类型的处理器：
     * 1. ListToolsRequestSchema: 返回所有可用工具的列表和描述
     * 2. CallToolRequestSchema: 处理具体的工具调用请求
     */
    private setupHandlers;
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
    private handleCheckLoginStatus;
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
    private handleDingTalkLogin;
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
    private handleCreateIteration;
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
    private handleIterationStart;
    private handleBasicInfo;
    private handleProjectInfo;
    private handleModules;
    private handleSubmitCompleteIteration;
    private handleGetUserList;
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
    run(): Promise<void>;
}
/**
 * 导出服务器类供测试和其他模块使用
 */
export { IterationMCPServer };
//# sourceMappingURL=index.d.ts.map