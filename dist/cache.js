import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
// 缓存文件路径
const CACHE_PATH = join(homedir(), '.iteration-mcp-cache.json');
// 缓存有效期（24小时）
const CACHE_EXPIRE_TIME = 24 * 60 * 60 * 1000;
/**
 * 本地缓存管理器
 */
export class CacheManager {
    config;
    constructor(config) {
        this.config = config;
    }
    /**
     * 生成迭代模板数据
     */
    async generateIterationTemplate() {
        const cache = this.getCache();
        const participants = await this.getParticipants();
        const reviewers = await this.getReviewers();
        // 获取最近使用的人员作为默认值
        const recentParticipants = cache.recentParticipants.slice(0, 3);
        const recentReviewers = cache.recentReviewers.slice(0, 2);
        return {
            basicInfo: {
                projectLine: cache.defaultProjectLine || '',
                iterationName: '',
                onlineTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 默认一周后
                remarks: ''
            },
            crApplication: {
                projectInfo: {
                    projectName: '',
                    projectManager: recentParticipants[0] || '',
                    technicalLeader: recentParticipants[1] || '',
                    participants: recentParticipants,
                    startDate: new Date().toISOString().split('T')[0],
                    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 默认两周后
                    description: '',
                    techStack: '',
                    riskAssessment: ''
                },
                componentModules: [
                    {
                        name: '',
                        relativePath: '',
                        url: '',
                        reviewer: recentReviewers[0] || '',
                        image: {
                            type: 'upload_later'
                        }
                    }
                ],
                functionModules: [
                    {
                        name: '',
                        relativePath: '',
                        reviewer: recentReviewers[0] || '',
                        description: ''
                    }
                ]
            }
        };
    }
    /**
     * 提交后更新缓存
     */
    async updateAfterSubmission(iteration) {
        // 更新项目线
        if (iteration.basicInfo.projectLine) {
            this.updateProjectLine(iteration.basicInfo.projectLine);
        }
        // 更新最近使用的人员
        const participantIds = [
            iteration.crApplication.projectInfo.projectManager,
            iteration.crApplication.projectInfo.technicalLeader,
            ...(iteration.crApplication.projectInfo.participants || [])
        ].filter(Boolean);
        const reviewerIds = [
            ...iteration.crApplication.componentModules.map(m => m.reviewer),
            ...iteration.crApplication.functionModules.map(m => m.reviewer)
        ].filter(Boolean);
        this.updateRecentPersonnel(participantIds, reviewerIds);
    }
    /**
     * 获取缓存数据
     */
    getCache() {
        if (!existsSync(CACHE_PATH)) {
            return this.getDefaultCache();
        }
        try {
            const content = readFileSync(CACHE_PATH, 'utf8');
            const cache = JSON.parse(content);
            // 检查缓存是否过期
            if (Date.now() - cache.lastUpdated > CACHE_EXPIRE_TIME) {
                console.log('缓存已过期，将在后台更新...');
                this.refreshPersonnelData(); // 异步更新
            }
            return cache;
        }
        catch (error) {
            console.error('读取缓存失败:', error);
            return this.getDefaultCache();
        }
    }
    /**
     * 保存缓存数据
     */
    saveCache(cache) {
        try {
            cache.lastUpdated = Date.now();
            writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
        }
        catch (error) {
            console.error('保存缓存失败:', error);
        }
    }
    /**
     * 获取参与人员列表（带缓存）
     */
    async getParticipants() {
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
    async getReviewers() {
        const cache = this.getCache();
        // 如果缓存为空或过期，从API获取
        if (cache.reviewers.length === 0 || this.isCacheExpired(cache)) {
            await this.refreshPersonnelData();
            return this.getCache().reviewers;
        }
        return cache.reviewers;
    }
    /**
     * 更新最近使用的人员
     */
    updateRecentPersonnel(participantIds, reviewerIds) {
        const cache = this.getCache();
        // 更新最近使用的参与人员（保持最新的5个）
        cache.recentParticipants = [
            ...participantIds,
            ...cache.recentParticipants.filter(id => !participantIds.includes(id))
        ].slice(0, 5);
        // 更新最近使用的审核人员（保持最新的5个）
        cache.recentReviewers = [
            ...reviewerIds,
            ...cache.recentReviewers.filter(id => !reviewerIds.includes(id))
        ].slice(0, 5);
        this.saveCache(cache);
    }
    /**
     * 更新项目线信息
     */
    updateProjectLine(projectLine) {
        const cache = this.getCache();
        if (!cache.projectLines.includes(projectLine)) {
            cache.projectLines.push(projectLine);
        }
        cache.defaultProjectLine = projectLine;
        this.saveCache(cache);
    }
    /**
     * 刷新人员数据（从API获取）
     */
    async refreshPersonnelData() {
        try {
            console.log('正在更新人员信息...');
            // TODO: 替换为真实API调用
            const participants = await this.fetchParticipantsFromAPI();
            const reviewers = await this.fetchReviewersFromAPI();
            const cache = this.getCache();
            cache.participants = participants;
            cache.reviewers = reviewers;
            this.saveCache(cache);
            console.log('人员信息更新完成');
        }
        catch (error) {
            console.error('更新人员信息失败:', error);
        }
    }
    /**
     * 从API获取参与人员（当前使用mock数据）
     */
    async fetchParticipantsFromAPI() {
        // TODO: 替换为真实API调用
        // const response = await axios.get(`${this.config.api.baseUrl}${this.config.api.endpoints.getParticipants}`);
        // return response.data;
        // Mock数据
        return [
            { id: 'p001', name: '张三', role: '前端开发', department: '技术部' },
            { id: 'p002', name: '李四', role: '后端开发', department: '技术部' },
            { id: 'p003', name: '王五', role: 'UI设计师', department: '设计部' },
            { id: 'p004', name: '赵六', role: '产品经理', department: '产品部' },
        ];
    }
    /**
     * 从API获取审核人员（当前使用mock数据）
     */
    async fetchReviewersFromAPI() {
        // TODO: 替换为真实API调用
        // const response = await axios.get(`${this.config.api.baseUrl}${this.config.api.endpoints.getReviewers}`);
        // return response.data;
        // Mock数据
        return [
            { id: 'r001', name: '架构师A', role: '技术架构师', department: '技术部' },
            { id: 'r002', name: '技术专家B', role: '高级工程师', department: '技术部' },
            { id: 'r003', name: '项目经理C', role: '项目经理', department: '项目部' },
        ];
    }
    /**
     * 检查缓存是否过期
     */
    isCacheExpired(cache) {
        return Date.now() - cache.lastUpdated > CACHE_EXPIRE_TIME;
    }
    /**
     * 获取默认缓存数据
     */
    getDefaultCache() {
        return {
            projectLines: [],
            participants: [],
            reviewers: [],
            recentParticipants: [],
            recentReviewers: [],
            lastUpdated: 0
        };
    }
}
//# sourceMappingURL=cache.js.map