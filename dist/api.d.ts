import { MCPConfig, CompleteIteration, UserInfo, AliossAccessIdParams, AliossAccessData } from './types.js';
/**
 * API调用管理器
 */
export declare class APIManager {
    private config;
    private authToken;
    constructor(config: MCPConfig, authToken: string);
    /**
     * 设置请求和响应拦截器
     */
    private setupInterceptors;
    /**
     * 完整的迭代提交流程（两阶段）
     */
    submitCompleteIteration(iteration: CompleteIteration): Promise<{
        iterationId: string;
        crApplicationId: string;
    }>;
    /**
     * 将CRApplication数据转换为API期望的CRApplicationData格式
     */
    private convertToCRApplicationData;
    /**
     * 阶段1：创建迭代基础信息
     */
    private createIteration;
    /**
     * 验证迭代是否创建成功
     */
    private verifyIterationCreated;
    /**
     * 阶段2：创建CR申请单
     */
    private createCRApplication;
    /**
     * 获取标准请求头
     */
    private getHeaders;
    /**
     * 用户登录（不需要认证）
     */
    login(credentials: {
        username: string;
        password: string;
    }): Promise<any>;
    /**
     * 获取阿里云OSS访问令牌
     */
    getOSSToken(params?: AliossAccessIdParams): Promise<{
        success: boolean;
        errorMsg?: string;
        errorCode?: number;
        data?: AliossAccessData;
    }>;
    /**
     * 获取用户列表（参与人员和审核人员）
     */
    getUserList(): Promise<UserInfo[]>;
    /**
     * 获取项目组列表
     */
    getProjectList(): Promise<Array<{
        id: number;
        name: string;
    }>>;
    /**
     * 获取迭代列表
     */
    getIterationList(params?: any): Promise<any>;
    /**
     * 获取CR申请单列表
     */
    getCRApplicationList(params?: any): Promise<any>;
    /**
     * 获取CR问题列表
     */
    getCRProblemList(params?: any): Promise<any>;
    /**
     * 修改CR申请单状态
     */
    checkCRApplicationStatus(params: any): Promise<any>;
    /**
     * Mock模式：模拟API调用（用于测试）
     */
    submitCompleteIterationMock(iteration: CompleteIteration): Promise<{
        iterationId: string;
        crApplicationId: string;
    }>;
}
//# sourceMappingURL=api.d.ts.map