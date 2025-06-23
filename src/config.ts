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
 * 完整的MCP配置
 * 包含所有必要的配置信息，不再依赖外部配置文件
 */
const MCP_CONFIG: MCPConfig = {
  // 钉钉应用配置
  dingtalk: {
    appId: "your_dingtalk_app_id",     // 请替换为实际的钉钉应用ID
    appSecret: "your_dingtalk_app_secret"  // 请替换为实际的钉钉应用密钥
  },
  
  // API接口配置
  api: {
    baseUrl: "", // baseUrl将从外部配置文件加载
    endpoints: {
      // ==================== 通用接口 ====================
      login: "/api/public/login", // 用户登录接口
      getUserList: "/api/common/getUserList", // 获取用户列表（参与人员和审核人员）
      getHobbyList: "/api/common/getHobbyList", // 获取兴趣列表
      getProjectList: "/api/common/getProjectList", // 获取项目组列表
      getTodayNewsList: "/api/common/getTodayNewsList", // 今日资讯
      getOSSToken: "/api/alioss/accessid", // 获取阿里云OSS访问令牌

      // ==================== 迭代管理接口 ====================
      createIteration: "/api/codeReview/createSprint", // 新增迭代
      updateIteration: "/api/codeReview/updateSprint", // 修改迭代
      deleteIteration: "/api/codeReview/deleteSprint", // 删除迭代
      getIterationDetail: "/api/codeReview/getSprintDetail", // 获取迭代详情
      getIterationList: "/api/codeReview/getSprintList", // 获取迭代列表

      // ==================== CR申请单接口 ====================
      createCRApplication: "/api/codeReview/createCrRequest", // 新增CR申请单
      getCRApplicationList: "/api/codeReview/getCrRequestList", // 获取CR申请单列表
      updateCRApplication: "/api/codeReview/updateCrRequest", // 修改CR申请单
      deleteCRApplication: "/api/codeReview/deleteCrRequest", // 删除CR申请单
      getCRApplicationDetail: "/api/codeReview/getCrRequestDetail", // 获取CR申请单详情
      checkCRApplicationStatus: "/api/codeReview/checkCrRequestStatus", // CR申请单修改复审状态

      // ==================== CR问题管理接口 ====================
      createCRProblem: "/api/codeReview/createCrProblem", // 新增CR问题
      updateCRProblem: "/api/codeReview/updateCrProblem", // 修改CR问题
      deleteCRProblem: "/api/codeReview/deleteCrProblem", // 删除CR问题
      getCRProblemDetail: "/api/codeReview/getCrProblemDetail", // 获取CR问题详情
      getCRProblemList: "/api/codeReview/getCrProblemList", // 获取CR问题列表
      setCRProblemStatus: "/api/codeReview/setCrProblemStatus", // CR问题解决/重新打开
    },
  },
  
  // 项目路径配置（可选）
  projectPath: process.cwd()
};

/**
 * 获取MCP配置
 * 
 * @returns {MCPConfig} 完整的MCP配置对象
 * 
 * 现在直接返回内部配置，不再依赖外部配置文件
 */
export function loadConfig(): MCPConfig {
  console.log(`🔧 使用内置配置，API地址: ${MCP_CONFIG.api.baseUrl}`);
  console.log(`🔧 项目路径: ${MCP_CONFIG.projectPath}`);
  
  // 验证配置有效性
  validateConfig(MCP_CONFIG);
  
  return MCP_CONFIG;
}

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
export function validateConfig(config: MCPConfig): void {
  // 验证钉钉配置
  if (!config.dingtalk?.appId || !config.dingtalk?.appSecret) {
    console.warn('⚠️ 钉钉配置使用默认值，请在 src/config.ts 中替换为实际的 appId 和 appSecret');
  }
  
  // 验证API基础配置
  if (!config.api?.baseUrl) {
    throw new Error('API 配置缺失: 需要 baseUrl');
  }
  
  // 验证关键接口端点
  const requiredEndpoints = ['login', 'createIteration', 'createCRApplication', 'getUserList'];
  const missingEndpoints = requiredEndpoints.filter(
    endpoint => !config.api?.endpoints?.[endpoint as keyof typeof config.api.endpoints]
  );
  
  if (missingEndpoints.length > 0) {
    throw new Error(`关键接口端点缺失: ${missingEndpoints.join(', ')}`);
  }
  
  // 检查可选接口端点（给出警告但不阻止启动）
  const optionalEndpoints = ['getOSSToken'];
  const missingOptionalEndpoints = optionalEndpoints.filter(
    endpoint => !config.api?.endpoints?.[endpoint as keyof typeof config.api.endpoints]
  );
  
  if (missingOptionalEndpoints.length > 0) {
    console.warn(`⚠️ 可选接口端点缺失（功能受限）: ${missingOptionalEndpoints.join(', ')}`);
  }
}

/**
 * 更新钉钉配置
 * 
 * @param appId 钉钉应用ID
 * @param appSecret 钉钉应用密钥
 */
export function updateDingtalkConfig(appId: string, appSecret: string): void {
  MCP_CONFIG.dingtalk.appId = appId;
  MCP_CONFIG.dingtalk.appSecret = appSecret;
  console.log('✅ 钉钉配置已更新');
}

/**
 * 获取当前配置的API基础地址
 */
export function getApiBaseUrl(): string {
  return MCP_CONFIG.api.baseUrl;
}