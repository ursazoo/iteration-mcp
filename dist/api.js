import axios from 'axios';
/**
 * API调用管理器
 */
export class APIManager {
    config;
    authToken;
    constructor(config, authToken) {
        this.config = config;
        this.authToken = authToken;
    }
    /**
     * 完整的迭代提交流程（两阶段）
     */
    async submitCompleteIteration(iteration) {
        try {
            console.log('开始提交迭代信息...');
            // 阶段1：创建迭代基础信息
            const iterationResult = await this.createIteration(iteration.basicInfo);
            const iterationId = iterationResult.iterationId;
            console.log(`✅ 迭代创建成功，ID: ${iterationId}`);
            // 可选：验证迭代创建结果
            await this.verifyIterationCreated(iterationId);
            // 阶段2：创建CR申请单
            const crResult = await this.createCRApplication(iterationId, iteration.crApplication);
            console.log(`✅ CR申请单创建成功，ID: ${crResult.crApplicationId}`);
            return {
                iterationId,
                crApplicationId: crResult.crApplicationId
            };
        }
        catch (error) {
            console.error('❌ 提交失败:', error);
            throw error;
        }
    }
    /**
     * 阶段1：创建迭代基础信息
     */
    async createIteration(basicInfo) {
        const url = `${this.config.api.baseUrl}${this.config.api.endpoints.createIteration}`;
        try {
            const response = await axios.post(url, basicInfo, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                }
            });
            if (response.data.success) {
                return {
                    iterationId: response.data.iterationId,
                    success: true
                };
            }
            else {
                throw new Error(`创建迭代失败: ${response.data.message}`);
            }
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`API调用失败: ${error.response?.data?.message || error.message}`);
            }
            throw error;
        }
    }
    /**
     * 验证迭代是否创建成功
     */
    async verifyIterationCreated(iterationId) {
        const url = `${this.config.api.baseUrl}${this.config.api.endpoints.getIterationDetail}`;
        try {
            const response = await axios.get(url, {
                params: { id: iterationId },
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            if (!response.data.success) {
                throw new Error('迭代验证失败');
            }
            console.log('✅ 迭代信息验证成功');
        }
        catch (error) {
            console.warn('⚠️ 迭代验证失败，但继续执行:', error);
            // 验证失败不中断流程，只是警告
        }
    }
    /**
     * 阶段2：创建CR申请单
     */
    async createCRApplication(iterationId, crApplication) {
        const url = `${this.config.api.baseUrl}${this.config.api.endpoints.createCRApplication}`;
        const payload = {
            iterationId,
            ...crApplication
        };
        try {
            const response = await axios.post(url, payload, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                }
            });
            if (response.data.success) {
                return {
                    crApplicationId: response.data.crApplicationId,
                    success: true
                };
            }
            else {
                throw new Error(`创建CR申请单失败: ${response.data.message}`);
            }
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`API调用失败: ${error.response?.data?.message || error.message}`);
            }
            throw error;
        }
    }
    /**
     * Mock模式：模拟API调用（用于测试）
     */
    async submitCompleteIterationMock(iteration) {
        console.log('🔄 Mock模式：模拟提交迭代信息...');
        // 模拟网络延迟
        await new Promise(resolve => setTimeout(resolve, 1000));
        const iterationId = `iter_${Date.now()}`;
        console.log(`✅ Mock: 迭代创建成功，ID: ${iterationId}`);
        // 模拟第二阶段延迟
        await new Promise(resolve => setTimeout(resolve, 500));
        const crApplicationId = `cr_${Date.now()}`;
        console.log(`✅ Mock: CR申请单创建成功，ID: ${crApplicationId}`);
        return {
            iterationId,
            crApplicationId
        };
    }
}
//# sourceMappingURL=api.js.map