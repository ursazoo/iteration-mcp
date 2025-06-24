import { LocalCache, UserInfo, MCPConfig, CompleteIteration, CRApplicationData } from './types.js';
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import axios from 'axios';

// 缓存文件路径
const CACHE_PATH = join(homedir(), '.iteration-mcp-cache.json');

// 缓存有效期（24小时）
const CACHE_EXPIRE_TIME = 24 * 60 * 60 * 1000;

/**
 * 本地缓存管理器
 */
export class CacheManager {
  private config?: MCPConfig;
  
  constructor(config?: MCPConfig) {
    this.config = config;
  }

  /**
   * 生成CR申请单模板数据
   */
  async generateCRApplicationTemplate(): Promise<CRApplicationData> {
    const cache = this.getCache();
    const participants = await this.getParticipants();
    const checkUsers = await this.getCheckUsers();
    
    // 获取最近使用的人员作为默认值
    const recentParticipants = cache.recentParticipants.slice(0, 2);
    const recentCheckUsers = cache.recentCheckUsers.slice(0, 1);
    
    return {
      reqDocUrl: "",
      techDocUrl: "",
      projexUrl: "-",
      uxDocUrl: "",
      gitlabUrl: "",
      gitProjectName: "",
      gitlabBranch: "",
      participantIds: recentParticipants.join(','),
      checkUserIds: recentCheckUsers.join(','),
      spendTime: "4",
      componentList: [
        {
          componentName: "",
          address: "",
          auditId: recentCheckUsers[0] || 1,
          imgUrl: ""
        }
      ],
      functionList: [
        {
          desc: ""
        }
      ],
      sprintId: 0 // 将在创建迭代后设置
    };
  }

  /**
   * 提交后更新缓存
   */
  async updateAfterSubmission(iteration: CompleteIteration): Promise<void> {
    // 更新项目线
    if (iteration.basicInfo.projectLine) {
      this.updateProjectLine(iteration.basicInfo.projectLine);
    }
    
    // 从CR申请单中提取人员ID（适配两种数据格式）
    let participantIds: number[] = [];
    let checkUserIds: number[] = [];
    
    // 检查是否有API格式的数据
    if ((iteration.crApplication as any).participantIds) {
      participantIds = (iteration.crApplication as any).participantIds
        .split(',')
        .map((id: string) => parseInt(id.trim()))
        .filter((id: number) => !isNaN(id));
    } else if ((iteration.crApplication as any).projectInfo?.participants) {
      // 使用收集格式的数据
      participantIds = (iteration.crApplication as any).projectInfo.participants
        .map((id: string) => parseInt(id))
        .filter((id: number) => !isNaN(id));
    }
    
    // 检查是否有API格式的数据
    if ((iteration.crApplication as any).checkUserIds) {
      checkUserIds = (iteration.crApplication as any).checkUserIds
        .split(',')
        .map((id: string) => parseInt(id.trim()))
        .filter((id: number) => !isNaN(id));
    } else if ((iteration.crApplication as any).projectInfo?.checkUsers) {
      // 使用收集格式的数据
      checkUserIds = (iteration.crApplication as any).projectInfo.checkUsers
        .map((id: string) => parseInt(id))
        .filter((id: number) => !isNaN(id));
    }
    
    this.updateRecentPersonnel(participantIds, checkUserIds);
  }

  /**
   * 获取缓存数据
   */
  getCache(): LocalCache {
    const defaults = this.getDefaultCache();
    if (!existsSync(CACHE_PATH)) {
      return defaults;
    }

    try {
      const content = readFileSync(CACHE_PATH, 'utf8');
      // 如果文件内容为空，也返回默认缓存
      if (!content.trim()) {
        return defaults;
      }
      const loadedCache = JSON.parse(content);
      
      // 合并加载的缓存和默认缓存，确保所有字段都存在
      const mergedCache: LocalCache = {
        ...defaults,
        ...loadedCache,
      };
      
      // 检查缓存是否过期
      if (Date.now() - mergedCache.lastUpdated > CACHE_EXPIRE_TIME) {
        console.log('缓存已过期，将在后台更新...');
        this.refreshPersonnelData(); // 异步更新
      }
      
      return mergedCache;
    } catch (error) {
      console.error('读取或解析缓存失败，将使用默认缓存:', error);
      // 如果解析失败，删除损坏的缓存文件，避免下次再次失败
      try {
        unlinkSync(CACHE_PATH);
        console.log('已删除损坏的缓存文件:', CACHE_PATH);
      } catch (unlinkError) {
        console.error('删除损坏的缓存文件失败:', unlinkError);
      }
      return defaults;
    }
  }

  /**
   * 保存缓存数据
   */
  saveCache(cache: LocalCache): void {
    try {
      cache.lastUpdated = Date.now();
      writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
    } catch (error) {
      console.error('保存缓存失败:', error);
    }
  }

  /**
   * 获取参与人员列表（带缓存）
   */
  async getParticipants(): Promise<UserInfo[]> {
    const cache = this.getCache();
    
    // 如果缓存为空或过期，从API获取
    if (cache.participants.length === 0 || this.isCacheExpired(cache)) {
      await this.refreshPersonnelData();
      return this.getCache().participants;
    }
    
    return cache.participants;
  }

  /**
   * 获取审核人员列表（带缓存）
   */
  async getCheckUsers(): Promise<UserInfo[]> {
    const cache = this.getCache();
    
    // 如果缓存为空或过期，从API获取
    if (cache.checkUsers.length === 0 || this.isCacheExpired(cache)) {
      await this.refreshPersonnelData();
      return this.getCache().checkUsers;
    }
    
    return cache.checkUsers;
  }

  /**
   * 根据ID获取用户信息
   */
  async getUserInfo(id: number, type: 'participant' | 'checkUser' = 'participant'): Promise<UserInfo | null> {
    const users = type === 'participant' ? await this.getParticipants() : await this.getCheckUsers();
    return users.find(user => user.id === id) || null;
  }

  /**
   * 根据姓名获取用户ID
   */
  async getUserIdByName(name: string, type: 'participant' | 'checkUser' = 'participant'): Promise<number | null> {
    const users = type === 'participant' ? await this.getParticipants() : await this.getCheckUsers();
    const user = users.find(user => user.realName === name);
    return user ? user.id : null;
  }

  /**
   * 更新最近使用的人员
   */
  updateRecentPersonnel(participantIds: number[], checkUserIds: number[]): void {
    const cache = this.getCache();
    
    // 更新最近使用的参与人员（保持最新的5个）
    cache.recentParticipants = [
      ...participantIds,
      ...cache.recentParticipants.filter(id => !participantIds.includes(id))
    ].slice(0, 5);
    
    // 更新最近使用的审核人员（保持最新的5个）
    cache.recentCheckUsers = [
      ...checkUserIds,
      ...cache.recentCheckUsers.filter(id => !checkUserIds.includes(id))
    ].slice(0, 5);
    
    this.saveCache(cache);
  }

  /**
   * 更新项目线信息
   */
  updateProjectLine(projectLine: string): void {
    const cache = this.getCache();
    
    if (!cache.projectLines.includes(projectLine)) {
      cache.projectLines.push(projectLine);
    }
    
    cache.defaultProjectLine = projectLine;
    this.saveCache(cache);
  }

  /**
   * 上传图片到OSS（暂未配置OSS，返回占位符）
   */
  async uploadImageToOSS(imageBuffer: Buffer, filename: string): Promise<string> {
    try {
      if (!this.config?.oss) {
        console.warn('OSS配置未设置，无法上传图片。如需上传功能，请在配置中添加OSS配置。');
        // 返回占位符URL
        return `https://placeholder.example.com/images/${filename}`;
      }

      // TODO: 实现真实的OSS上传逻辑
      // 需要安装 ali-oss 依赖：npm install ali-oss
      console.log('上传图片到OSS:', filename);
      return `https://${this.config.oss.bucket}.${this.config.oss.region}.aliyuncs.com/${filename}`;
    } catch (error) {
      console.error('上传图片失败:', error);
      throw error;
    }
  }

  /**
   * 处理从对话中获取的图片URL并上传到OSS（暂未配置OSS）
   */
  async processImageFromChat(imageUrl: string, componentName: string): Promise<string> {
    try {
      if (!this.config?.oss) {
        console.warn('OSS未配置，无法处理图片上传');
        return imageUrl; // 直接返回原始URL
      }
      
      // 下载图片
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const imageBuffer = Buffer.from(response.data);
      
      // 生成文件名
      const timestamp = Date.now();
      const filename = `components/${componentName}-${timestamp}.jpg`;
      
      // 上传到OSS
      return await this.uploadImageToOSS(imageBuffer, filename);
    } catch (error) {
      console.error('处理图片失败:', error);
      // 失败时返回原始URL作为备选
      return imageUrl;
    }
  }

  /**
   * 刷新人员数据（从API获取）
   */
  private async refreshPersonnelData(): Promise<void> {
    try {
      console.log('正在更新人员信息...');
      
      const users = await this.fetchUsersFromAPI();
      
      const cache = this.getCache();
      // 所有用户都可以是参与者和审核者
      cache.participants = users;
      cache.checkUsers = users;
      
      this.saveCache(cache);
      console.log('人员信息更新完成');
    } catch (error) {
      console.error('更新人员信息失败:', error);
    }
  }

  /**
   * 从API获取用户列表
   */
  private async fetchUsersFromAPI(): Promise<UserInfo[]> {
    try {
      if (this.config?.api) {
        // 注意：这里需要认证token，但在缓存管理器中我们没有token
        // 建议在实际使用中通过APIManager来获取用户列表，而不是直接在缓存中调用
        console.warn('缓存管理器中直接调用API需要认证token，建议使用APIManager');
        
        const response = await axios.post(`${this.config.api.baseUrl}${this.config.api.endpoints.getUserList}`, {}, {
          headers: {
            'Content-Type': 'application/json'
            // 'Authorization': `Bearer ${token}` // 需要token认证
          }
        });
        
        // 解析响应数据
        if (response.data.success && response.data.data?.list) {
          return response.data.data.list as UserInfo[];
        }
      }
    } catch (error) {
      console.error('从API获取用户列表失败:', error);
    }
    
    // 返回Mock数据（基于真实API响应格式）
    return [
      { id: 1, realName: '郭晓婷' },
      { id: 2, realName: '张城' },
      { id: 3, realName: '谢永聪' },
      { id: 4, realName: '白杨' },
      { id: 5, realName: '余晓聪' },
      { id: 37, realName: '曹秦锋' }
    ];
  }

  /**
   * 检查缓存是否过期
   */
  private isCacheExpired(cache: LocalCache): boolean {
    return Date.now() - cache.lastUpdated > CACHE_EXPIRE_TIME;
  }

  /**
   * 获取默认缓存数据
   */
  private getDefaultCache(): LocalCache {
    return {
      projectLines: [],
      participants: [],
      checkUsers: [],
      recentParticipants: [],
      recentCheckUsers: [],
      lastUpdated: 0,
    };
  }
} 