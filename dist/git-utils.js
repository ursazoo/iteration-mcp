import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
/**
 * Git信息获取工具
 */
export class GitUtils {
    workspaceRoot;
    constructor(workspaceRoot) {
        this.workspaceRoot = workspaceRoot;
    }
    /**
     * 获取完整的git信息
     */
    async getGitInfo() {
        console.log(`🔍 GitUtils.getGitInfo() 开始执行，工作目录: ${this.workspaceRoot}`);
        const gitInfo = {};
        try {
            // 1. 检查是否在git仓库中
            if (!this.isGitRepository()) {
                console.warn('⚠️ 当前目录不是Git仓库');
                return gitInfo;
            }
            console.log('✅ 确认在Git仓库中');
            // 2. 获取当前分支
            console.log('🔍 获取当前分支...');
            gitInfo.currentBranch = this.getCurrentBranch();
            if (gitInfo.currentBranch) {
                console.log(`✅ 当前分支: ${gitInfo.currentBranch}`);
            }
            // 3. 从配置文件读取项目信息（如果存在）
            console.log('🔍 尝试读取配置文件...');
            const configInfo = this.readGitConfigFile();
            if (configInfo) {
                gitInfo.projectUrl = configInfo.git_project_url;
                gitInfo.projectName = configInfo.git_project_name;
                console.log(`✅ 从配置文件获取到项目信息: ${configInfo.git_project_name}`);
            }
            else {
                // 4. 如果没有配置文件，尝试从git remote获取（如果有的话）
                console.log('🔍 尝试从git remote获取项目信息...');
                const remoteInfo = this.getGitRemoteInfo();
                if (remoteInfo) {
                    gitInfo.projectUrl = remoteInfo.git_project_url;
                    gitInfo.projectName = remoteInfo.git_project_name;
                    console.log(`✅ 从git remote获取到项目信息: ${remoteInfo.git_project_name}`);
                }
                else {
                    // 如果都没有，使用目录名作为项目名
                    const projectName = this.getProjectNameFromDirectory();
                    gitInfo.projectName = projectName;
                    console.log(`✅ 使用目录名作为项目名: ${projectName}`);
                }
            }
            // 5. 计算预估工时
            console.log('🔍 计算预估工时...');
            gitInfo.estimatedWorkDays = this.calculateWorkDays();
            if (gitInfo.estimatedWorkDays) {
                console.log(`✅ 预估工时: ${gitInfo.estimatedWorkDays} 天`);
            }
            console.log('✅ GitUtils.getGitInfo() 执行完成');
            return gitInfo;
        }
        catch (error) {
            console.error('❌ GitUtils.getGitInfo() 执行失败:', error);
            throw error;
        }
    }
    /**
     * 读取git配置文件
     */
    readGitConfigFile() {
        console.log('🔍 开始读取Git配置文件...');
        // 首先尝试读取JSON格式配置文件
        const jsonConfigPath = path.join(this.workspaceRoot, 'git_info.config.json');
        console.log(`🔍 检查JSON配置文件: ${jsonConfigPath}`);
        if (fs.existsSync(jsonConfigPath)) {
            console.log('✅ 找到JSON配置文件');
            try {
                const configContent = fs.readFileSync(jsonConfigPath, 'utf-8');
                console.log(`📄 配置文件内容: ${configContent}`);
                const config = JSON.parse(configContent);
                console.log('✅ JSON解析成功');
                const result = {
                    git_project_url: config.git_project_url,
                    git_project_name: config.git_project_name
                };
                console.log(`✅ 解析结果:`, result);
                return result;
            }
            catch (error) {
                console.warn('⚠️ 读取JSON配置文件失败:', error);
            }
        }
        else {
            console.log('⚠️ JSON配置文件不存在');
        }
        // 如果没有配置文件，尝试从git remote获取
        console.log('🔍 尝试从git remote获取项目信息...');
        return this.getGitRemoteInfo();
    }
    /**
     * 从git remote获取项目信息
     */
    getGitRemoteInfo() {
        try {
            const remoteUrl = execSync('git remote get-url origin', {
                cwd: this.workspaceRoot || process.cwd(),
                encoding: 'utf-8'
            }).trim();
            // 从remote URL提取项目名称
            const nameMatch = remoteUrl.match(/\/([^\/]+?)(?:\.git)?$/);
            const projectName = nameMatch ? nameMatch[1] : undefined;
            return {
                git_project_url: remoteUrl,
                git_project_name: projectName
            };
        }
        catch (error) {
            console.warn('⚠️ 无法获取git remote信息:', error);
            return null;
        }
    }
    /**
     * 获取当前分支
     */
    getCurrentBranch() {
        try {
            // 确保使用正确的工作目录
            const branch = execSync('git branch --show-current', {
                cwd: this.workspaceRoot || process.cwd(),
                encoding: 'utf-8'
            }).trim();
            return branch || undefined;
        }
        catch (error) {
            console.warn('⚠️ 无法获取当前分支:', error);
            return undefined;
        }
    }
    /**
     * 计算预估工时（天数）- 基于分支创建时间或最近活动
     */
    calculateWorkDays() {
        try {
            const currentBranch = execSync('git branch --show-current', {
                cwd: this.workspaceRoot || process.cwd(),
                encoding: 'utf-8'
            }).trim();
            console.log(`🔍 计算分支 ${currentBranch} 的工时`);
            let workDays = 7; // 默认1周
            if (currentBranch && currentBranch !== 'main' && currentBranch !== 'master') {
                // 非主分支：使用分支真正的创建时间（从主分支分离的时间点）
                try {
                    // 方法1：使用merge-base获取分支分离点的时间
                    const mergeBase = execSync('git merge-base main HEAD 2>/dev/null || git merge-base master HEAD', {
                        cwd: this.workspaceRoot || process.cwd(),
                        encoding: 'utf-8'
                    }).trim();
                    if (mergeBase) {
                        const branchCreateTime = execSync(`git show --format=%ai -s ${mergeBase}`, {
                            cwd: this.workspaceRoot || process.cwd(),
                            encoding: 'utf-8'
                        }).trim();
                        const createDate = new Date(branchCreateTime);
                        const currentDate = new Date();
                        const diffDays = Math.ceil((currentDate.getTime() - createDate.getTime()) / (1000 * 60 * 60 * 24));
                        workDays = Math.min(Math.max(diffDays, 1), 30); // 限制在1-30天之间
                        console.log(`🌿 分支创建时间: ${branchCreateTime}, 计算天数: ${diffDays}`);
                    }
                    else {
                        throw new Error('无法找到merge-base');
                    }
                }
                catch (mergeBaseError) {
                    console.warn('⚠️ 无法获取分支创建时间，尝试第一次提交时间');
                    // 回退方案1：使用分支第一次提交时间
                    try {
                        const branchFirstCommit = execSync(`git log --reverse --format=%ai ${currentBranch} | head -1`, {
                            cwd: this.workspaceRoot || process.cwd(),
                            encoding: 'utf-8'
                        }).trim();
                        if (branchFirstCommit) {
                            const firstDate = new Date(branchFirstCommit);
                            const currentDate = new Date();
                            const diffDays = Math.ceil((currentDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
                            workDays = Math.min(Math.max(diffDays, 1), 30);
                            console.log(`📅 分支第一次提交: ${branchFirstCommit}, 计算天数: ${diffDays}`);
                        }
                        else {
                            throw new Error('无法获取第一次提交');
                        }
                    }
                    catch (firstCommitError) {
                        console.warn('⚠️ 回退到最近提交活动估算');
                        // 回退方案2：根据最近30天的提交数量估算
                        const recentCommits = execSync('git log --since="30 days ago" --oneline | wc -l', {
                            cwd: this.workspaceRoot || process.cwd(),
                            encoding: 'utf-8'
                        }).trim();
                        const commitCount = parseInt(recentCommits) || 0;
                        workDays = Math.max(Math.ceil(commitCount / 3), 3);
                    }
                }
            }
            else {
                // 主分支：根据最近活动估算
                const recentCommits = execSync('git log --since="30 days ago" --oneline | wc -l', {
                    cwd: this.workspaceRoot || process.cwd(),
                    encoding: 'utf-8'
                }).trim();
                const commitCount = parseInt(recentCommits) || 0;
                workDays = commitCount > 0 ? Math.max(Math.ceil(commitCount / 3), 3) : 7;
                console.log(`📊 最近30天提交数: ${commitCount}, 估算工时: ${workDays}天`);
            }
            return workDays;
        }
        catch (error) {
            console.warn('⚠️ 无法计算工时:', error);
            return 7; // 默认1周
        }
    }
    /**
     * 检查是否在git仓库中
     */
    isGitRepository() {
        try {
            execSync('git rev-parse --git-dir', {
                cwd: this.workspaceRoot || process.cwd(),
                stdio: 'ignore'
            });
            return true;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * 从目录名获取项目名称
     */
    getProjectNameFromDirectory() {
        const directoryName = path.basename(this.workspaceRoot);
        return directoryName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
}
//# sourceMappingURL=git-utils.js.map