import { MCPConfig, CompleteIteration } from './types.js';
/**
 * API调用管理器
 */
export declare class APIManager {
    private config;
    private authToken;
    constructor(config: MCPConfig, authToken: string);
    /**
     * 完整的迭代提交流程（两阶段）
     */
    submitCompleteIteration(iteration: CompleteIteration): Promise<{
        iterationId: string;
        crApplicationId: string;
    }>;
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
     * Mock模式：模拟API调用（用于测试）
     */
    submitCompleteIterationMock(iteration: CompleteIteration): Promise<{
        iterationId: string;
        crApplicationId: string;
    }>;
}
//# sourceMappingURL=api.d.ts.map