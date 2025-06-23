/**
 * MCP迭代管理工具 - 配置管理模块
 *
 * 本模块负责：
 * 1. 管理所有codeReview相关的API接口端点配置
 * 2. 提供钉钉应用配置
 * 3. 提供项目相关配置
 *
 * @author MCP迭代管理工具
 * @version 1.0.0
 */
import { MCPConfig } from './types.js';
/**
 * 获取MCP配置
 *
 * @returns {MCPConfig} 完整的MCP配置对象
 *
 * 现在直接返回内部配置，不再依赖外部配置文件
 */
export declare function loadConfig(): MCPConfig;
/**
 * 验证配置文件完整性
 *
 * @param {MCPConfig} config - 需要验证的配置对象
 * @throws {Error} 当必要配置项缺失时抛出错误
 *
 * 验证项目：
 * 1. 钉钉配置：appId 和 appSecret 必须存在
 * 2. API配置：baseUrl 必须存在
 * 3. 接口端点：确保关键接口配置正确
 */
export declare function validateConfig(config: MCPConfig): void;
/**
 * 更新钉钉配置
 *
 * @param appId 钉钉应用ID
 * @param appSecret 钉钉应用密钥
 */
export declare function updateDingtalkConfig(appId: string, appSecret: string): void;
/**
 * 获取当前配置的API基础地址
 */
export declare function getApiBaseUrl(): string;
//# sourceMappingURL=config.d.ts.map