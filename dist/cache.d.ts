import { LocalCache, PersonInfo, MCPConfig, CompleteIteration, IterationTemplate } from './types.js';
/**
 * 本地缓存管理器
 */
export declare class CacheManager {
    private config?;
    constructor(config?: MCPConfig);
    /**
     * 生成迭代模板数据
     */
    generateIterationTemplate(): Promise<IterationTemplate>;
    /**
     * 提交后更新缓存
     */
    updateAfterSubmission(iteration: CompleteIteration): Promise<void>;
    /**
     * 获取缓存数据
     */
    getCache(): LocalCache;
    /**
     * 保存缓存数据
     */
    saveCache(cache: LocalCache): void;
    /**
     * 获取参与人员列表（带缓存）
     */
    getParticipants(): Promise<PersonInfo[]>;
    /**
     * 获取审核人员列表（带缓存）
     */
    getReviewers(): Promise<PersonInfo[]>;
    /**
     * 更新最近使用的人员
     */
    updateRecentPersonnel(participantIds: string[], reviewerIds: string[]): void;
    /**
     * 更新项目线信息
     */
    updateProjectLine(projectLine: string): void;
    /**
     * 刷新人员数据（从API获取）
     */
    private refreshPersonnelData;
    /**
     * 从API获取参与人员（当前使用mock数据）
     */
    private fetchParticipantsFromAPI;
    /**
     * 从API获取审核人员（当前使用mock数据）
     */
    private fetchReviewersFromAPI;
    /**
     * 检查缓存是否过期
     */
    private isCacheExpired;
    /**
     * 获取默认缓存数据
     */
    private getDefaultCache;
}
//# sourceMappingURL=cache.d.ts.map