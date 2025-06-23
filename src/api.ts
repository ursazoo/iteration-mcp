import { MCPConfig, CompleteIteration, IterationBasicInfo, CRApplication, CRApplicationData, UserInfo, AliossAccessIdParams, AliossAccessData } from './types.js';
import axios from 'axios';

/**
 * API调用管理器
 */
export class APIManager {
  private config: MCPConfig;
  private authToken: string;

  constructor(config: MCPConfig, authToken: string) {
    this.config = config;
    this.authToken = authToken;
    
    // 设置axios响应拦截器
    this.setupInterceptors();
  }

  /**
   * 设置请求和响应拦截器
   */
  private setupInterceptors(): void {
    // 响应拦截器 - 统一错误处理（只处理HTTP错误，不处理业务逻辑错误）
    axios.interceptors.response.use(
      (response) => {
        // 记录成功响应
        console.log(`✅ API响应成功 [${response.config.method?.toUpperCase()} ${response.config.url}]:`, {
          status: response.status,
          data: response.data
        });
        return response;
      },
      async (error) => {
        console.error(`❌ API请求错误 [${error.config?.method?.toUpperCase()} ${error.config?.url}]:`, {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message
        });
        
        // 只处理HTTP错误和token过期，不处理业务逻辑错误
        if (error.response) {
          const res = error.response.data;
          
          // token过期处理
          if (res?.errorCode === 40001) {
            console.error('🔒 Token已过期，需要重新登录');
            throw new Error('认证已过期，请重新登录');
          }
        }
        
        // 对于HTTP错误（4xx, 5xx），直接抛出
        return Promise.reject(error);
      }
    );
  }

  /**
   * 完整的迭代提交流程（两阶段）
   */
  async submitCompleteIteration(iteration: CompleteIteration): Promise<{
    iterationId: string;
    crApplicationId: string;
  }> {
    try {
      console.log('开始提交迭代信息...');
      
      // 阶段1：创建迭代基础信息
      const iterationResult = await this.createIteration(iteration.basicInfo);
      const iterationId = iterationResult.iterationId;
      
      console.log(`✅ 迭代创建成功，ID: ${iterationId}`);
      
      // 可选：验证迭代创建结果
      await this.verifyIterationCreated(iterationId);
      
      // 数据转换：将CRApplication转换为CRApplicationData
      const crApplicationData = this.convertToCRApplicationData(iteration.crApplication);
      
      // 阶段2：创建CR申请单
      const crResult = await this.createCRApplication(iterationId, crApplicationData);
      
      console.log(`✅ CR申请单创建成功，ID: ${crResult.crApplicationId}`);
      
      return {
        iterationId,
        crApplicationId: crResult.crApplicationId
      };
      
    } catch (error) {
      console.error('❌ 提交失败:', error);
      throw error;
    }
  }

  /**
   * 将CRApplication数据转换为API期望的CRApplicationData格式
   */
  private convertToCRApplicationData(crApplication: any): CRApplicationData {
    const projectInfo = crApplication.projectInfo || {};
    const componentModules = crApplication.componentModules || [];
    const functionModules = crApplication.functionModules || [];
    
    // 转换组件模块为API格式
    const componentList = componentModules.map((module: any) => ({
      name: module.name || '', // 使用name而不是componentName
      address: module.relativePath || '',
      auditId: parseInt(module.reviewer) || 0,
      imgUrl: '' // 暂时为空，待上传图片
    }));
    
    // 转换功能模块为API格式
    const functionList = functionModules.map((module: any) => ({
      name: module.name || '', // 功能名称
      desc: module.description || '', // 功能描述
      auditId: parseInt(module.reviewer) || 0 // 审核人员ID
    }));
    
    return {
      reqDocUrl: projectInfo.productDoc || '-',
      techDocUrl: projectInfo.technicalDoc || '-',
      projexUrl: projectInfo.projectDashboard || '-',
      uxDocUrl: projectInfo.designDoc || '-',
      gitlabUrl: projectInfo.gitProjectUrl || '',
      gitProjectName: projectInfo.projectName || '',
      gitlabBranch: projectInfo.developmentBranch || 'main',
      participantIds: Array.isArray(projectInfo.participants) ? projectInfo.participants.join(',') : '',
      checkUserIds: Array.isArray(projectInfo.reviewers) ? projectInfo.reviewers.join(',') : '',
      spendTime: (projectInfo.workHours || 0).toString(),
      componentList,
      functionList,
      sprintId: 0 // 将在createCRApplication中设置
    };
  }

  /**
   * 阶段1：创建迭代
   */
  private async createIteration(basicInfo: IterationBasicInfo): Promise<{
    iterationId: string;
    success: boolean;
  }> {
    const url = `${this.config.api.baseUrl}${this.config.api.endpoints.createIteration}`;
    
    // 首先获取项目列表，匹配正确的projectId
    let projectId: number;
    try {
      const projectList = await this.getProjectList();
      
      // 检查用户输入是否为纯数字（projectId）
      const inputAsNumber = parseInt(basicInfo.projectLine);
      if (!isNaN(inputAsNumber) && inputAsNumber > 0) {
        // 输入的是数字，直接作为projectId使用
        const projectById = projectList.find(project => project.id === inputAsNumber);
        if (projectById) {
          projectId = inputAsNumber;
          console.log(`✅ 通过ID找到匹配的项目: ${projectById.name} (ID: ${projectId})`);
        } else {
          // 项目ID不存在，抛出错误
          const availableProjects = projectList.map(p => `${p.name}(${p.id})`).join(', ');
          throw new Error(`项目ID "${inputAsNumber}" 不存在。可用项目列表: ${availableProjects}`);
        }
      } else {
        // 输入的是项目名称，进行名称匹配
        const matchedProject = projectList.find(project => 
          project.name === basicInfo.projectLine || 
          project.name.includes(basicInfo.projectLine) ||
          basicInfo.projectLine.includes(project.name)
        );
        
        if (matchedProject) {
          projectId = matchedProject.id;
          console.log(`✅ 通过名称找到匹配的项目: ${matchedProject.name} (ID: ${projectId})`);
        } else {
          // 项目名称不存在，抛出错误
          const availableProjects = projectList.map(p => `${p.name}(${p.id})`).join(', ');
          throw new Error(`未找到匹配的项目线 "${basicInfo.projectLine}"。可用项目列表: ${availableProjects}`);
        }
      }
    } catch (error) {
      // 如果是项目匹配错误，直接重新抛出
      if (error instanceof Error && (error.message.includes('不存在') || error.message.includes('未找到'))) {
        throw error;
      }
      // 如果是获取项目列表的网络错误，给出友好提示
      console.warn('⚠️ 获取项目列表失败:', error);
      throw new Error(`无法获取项目列表，请检查网络连接或稍后重试。原始错误: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // 准备API所需的数据格式
    const payload = {
      projectId: projectId, // 使用动态获取的项目ID
      name: basicInfo.iterationName, // 迭代名称
      projectLine: basicInfo.projectLine, // 保留项目线字段（虽然服务端可能忽略）
      releaseTime: basicInfo.onlineTime + ' 00:00:00', // 使用releaseTime而非onlineDate
      remark: basicInfo.remarks || '' // 使用remark而非description
    };
    
    console.log('📤 发送创建迭代请求:', JSON.stringify(payload, null, 2));
    
    try {
      const response = await axios.post(url, payload, {
        headers: this.getHeaders()
      });
      
      // 实际返回格式为 { success: boolean, data: { id: number }, errorMsg?: string }
      if (response.data.success) {
        return {
          iterationId: response.data.data.id.toString(),
          success: true
        };
      } else {
        throw new Error(`创建迭代失败: ${response.data.errorMsg}`);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`API调用失败: ${error.response?.data?.errorMsg || error.message}`);
      }
      throw error;
    }
  }

  /**
   * 验证迭代是否创建成功
   */
  private async verifyIterationCreated(iterationId: string): Promise<void> {
    const url = `${this.config.api.baseUrl}${this.config.api.endpoints.getIterationDetail}`;
    
    try {
      const response = await axios.post(url, {
        sprintId: parseInt(iterationId)
      }, {
        headers: this.getHeaders()
      });
      
      if (!response.data.success) {
        throw new Error('迭代验证失败');
      }
      
      console.log('✅ 迭代信息验证成功');
    } catch (error) {
      console.warn('⚠️ 迭代验证失败，但继续执行:', error);
      // 验证失败不中断流程，只是警告
    }
  }

  /**
   * 阶段2：创建CR申请单
   */
  private async createCRApplication(iterationId: string, crApplication: CRApplicationData): Promise<{
    crApplicationId: string;
    success: boolean;
  }> {
    const url = `${this.config.api.baseUrl}${this.config.api.endpoints.createCRApplication}`;
    
    // 确保sprintId字段正确设置
    const payload = {
      ...crApplication,
      sprintId: parseInt(iterationId)
    };
    
    try {
      const response = await axios.post(url, payload, {
        headers: this.getHeaders()
      });
      
      // 实际返回格式可能是 { success: boolean, data: {} } 或 { success: boolean, data: { crRequestId: number } }
      if (response.data.success) {
        // 如果有crRequestId就使用，否则使用sprintId作为标识
        const crRequestId = response.data.data?.crRequestId || response.data.data?.id || `cr_${iterationId}`;
        return {
          crApplicationId: crRequestId.toString(),
          success: true
        };
      } else {
        throw new Error(`创建CR申请单失败: ${response.data.errorMsg}`);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`API调用失败: ${error.response?.data?.errorMsg || error.message}`);
      }
      throw error;
    }
  }

  /**
   * 获取标准请求头
   */
  private getHeaders(includeAuth: boolean = true): any {
    const headers: any = {
      'Content-Type': 'application/json'
    };
    
    if (includeAuth && this.authToken) {
      headers['authorization'] = `Bearer ${this.authToken}`;
    }
    
    return headers;
  }

  /**
   * 用户登录（不需要认证）
   */
  async login(credentials: { username: string; password: string }): Promise<any> {
    const url = `${this.config.api.baseUrl}${this.config.api.endpoints.login}`;
    
    try {
      const response = await axios.post(url, credentials, {
        headers: this.getHeaders(false) // 登录接口不需要token
      });
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`登录失败: ${error.response?.data?.errorMsg || error.message}`);
      }
      throw error;
    }
  }

  /**
   * 获取阿里云OSS访问令牌
   */
  async getOSSToken(params: AliossAccessIdParams = {}): Promise<{
    success: boolean;
    errorMsg?: string;
    errorCode?: number;
    data?: AliossAccessData;
  }> {
    const url = `${this.config.api.baseUrl}${this.config.api.endpoints.getOSSToken}`;
    
    try {
      const response = await axios.post(url, params, {
        headers: this.getHeaders()
      });
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`获取OSS令牌失败: ${error.response?.data?.errorMsg || error.message}`);
      }
      throw error;
    }
  }

  /**
   * 获取用户列表（参与人员和审核人员）
   */
  async getUserList(): Promise<UserInfo[]> {
    const url = `${this.config.api.baseUrl}${this.config.api.endpoints.getUserList}`;
    
    try {
      const response = await axios.post(url, {}, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      // 详细输出响应信息用于调试
      console.log('📊 getUserList API响应:', JSON.stringify({
        status: response.status,
        statusText: response.statusText,
        data: response.data
      }, null, 2));
      
      if (response.data.success || Array.isArray(response.data)) {
        // 兼容不同的响应格式
        const userData = response.data.data?.list || response.data.data || response.data;
        return userData;
      } else {
        const errorMsg = response.data.message || response.data.errorMsg || response.data.msg || '未知错误';
        throw new Error(`获取用户列表失败: ${errorMsg} (完整响应: ${JSON.stringify(response.data)})`);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMsg = error.response?.data?.message || error.response?.data?.errorMsg || error.response?.data?.msg || error.message;
        const responseData = error.response?.data ? JSON.stringify(error.response.data) : '无响应数据';
        throw new Error(`API调用失败: ${errorMsg} (HTTP ${error.response?.status}) (响应: ${responseData})`);
      }
      throw error;
    }
  }

  /**
   * 获取项目组列表
   */
  async getProjectList(): Promise<Array<{id: number, name: string}>> {
    const url = `${this.config.api.baseUrl}${this.config.api.endpoints.getProjectList}`;
    
    try {
      const response = await axios.post(url, {}, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      // 详细输出响应信息用于调试
      console.log('📊 getProjectList API响应:', JSON.stringify({
        status: response.status,
        statusText: response.statusText,
        data: response.data
      }, null, 2));
      
      if (response.data.success || Array.isArray(response.data)) {
        // 兼容不同的响应格式
        const projectData = response.data.data?.list || response.data.data || response.data;
        return projectData;
      } else {
        const errorMsg = response.data.message || response.data.errorMsg || response.data.msg || '未知错误';
        throw new Error(`获取项目组列表失败: ${errorMsg} (完整响应: ${JSON.stringify(response.data)})`);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMsg = error.response?.data?.message || error.response?.data?.errorMsg || error.response?.data?.msg || error.message;
        const responseData = error.response?.data ? JSON.stringify(error.response.data) : '无响应数据';
        throw new Error(`API调用失败: ${errorMsg} (HTTP ${error.response?.status}) (响应: ${responseData})`);
      }
      throw error;
    }
  }

  /**
   * 获取迭代列表
   */
  async getIterationList(params: any = {}): Promise<any> {
    const url = `${this.config.api.baseUrl}${this.config.api.endpoints.getIterationList}`;
    
    try {
      const response = await axios.post(url, params, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`获取迭代列表失败: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  /**
   * 获取CR申请单列表
   */
  async getCRApplicationList(params: any = {}): Promise<any> {
    const url = `${this.config.api.baseUrl}${this.config.api.endpoints.getCRApplicationList}`;
    
    try {
      const response = await axios.post(url, params, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`获取CR申请单列表失败: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  /**
   * 获取CR问题列表
   */
  async getCRProblemList(params: any = {}): Promise<any> {
    const url = `${this.config.api.baseUrl}${this.config.api.endpoints.getCRProblemList}`;
    
    try {
      const response = await axios.post(url, params, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`获取CR问题列表失败: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  /**
   * 修改CR申请单状态
   */
  async checkCRApplicationStatus(params: any): Promise<any> {
    const url = `${this.config.api.baseUrl}${this.config.api.endpoints.checkCRApplicationStatus}`;
    
    try {
      const response = await axios.post(url, params, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`修改CR申请单状态失败: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Mock模式：模拟API调用（用于测试）
   */
  async submitCompleteIterationMock(iteration: CompleteIteration): Promise<{
    iterationId: string;
    crApplicationId: string;
  }> {
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