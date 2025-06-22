import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface GitInfo {
  projectUrl?: string;
  projectName?: string;
  currentBranch?: string;
  estimatedWorkDays?: number;
  productDoc?: string;
  technicalDoc?: string;
  projectDashboard?: string;
  designDoc?: string;
  participants?: string[];
  reviewers?: string[];
  remarks?: string;
}

/**
 * Git信息获取工具
 */
export class GitUtils {
  private workspaceRoot: string;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * 获取完整的git信息
   */
  async getGitInfo(): Promise<GitInfo> {
    const gitInfo: GitInfo = {};

    // 1. 从配置文件读取项目信息
    const configInfo = this.readGitConfigFile();
    if (configInfo) {
      gitInfo.projectUrl = configInfo.git_project_url;
      gitInfo.projectName = configInfo.git_project_name;
    }

    // 2. 获取当前分支
    gitInfo.currentBranch = this.getCurrentBranch();

    // 3. 计算预估工时
    gitInfo.estimatedWorkDays = this.calculateWorkDays();

    return gitInfo;
  }

  /**
   * 读取git配置文件
   */
  private readGitConfigFile(): { git_project_url?: string; git_project_name?: string } | null {
    // 首先尝试读取JSON格式配置文件
    const jsonConfigPath = path.join(this.workspaceRoot, 'git_info.config.json');
    if (fs.existsSync(jsonConfigPath)) {
      try {
        const configContent = fs.readFileSync(jsonConfigPath, 'utf-8');
        const config = JSON.parse(configContent);
        return {
          git_project_url: config.git_project_url,
          git_project_name: config.git_project_name
        };
      } catch (error) {
        console.warn('⚠️ 读取JSON配置文件失败:', error);
      }
    }

    // 兼容原有的JS格式配置文件
    const jsConfigPath = path.join(this.workspaceRoot, 'git_info.config.js');
    if (fs.existsSync(jsConfigPath)) {
      try {
        // 读取配置文件内容
        const configContent = fs.readFileSync(jsConfigPath, 'utf-8');
        
        // 简单的解析方式，提取git_project_url和git_project_name
        const urlMatch = configContent.match(/git_project_url:\s*['"`]([^'"`]+)['"`]/);
        const nameMatch = configContent.match(/git_project_name:\s*['"`]([^'"`]+)['"`]/);
        
        return {
          git_project_url: urlMatch ? urlMatch[1] : undefined,
          git_project_name: nameMatch ? nameMatch[1] : undefined
        };
      } catch (error) {
        console.warn('⚠️ 读取JS配置文件失败:', error);
      }
    }

    // 如果没有配置文件，尝试从git remote获取
    return this.getGitRemoteInfo();
  }

  /**
   * 从git remote获取项目信息
   */
  private getGitRemoteInfo(): { git_project_url?: string; git_project_name?: string } | null {
    try {
      const remoteUrl = execSync('git remote get-url origin', { 
        cwd: this.workspaceRoot,
        encoding: 'utf-8' 
      }).trim();

      // 从remote URL提取项目名称
      const nameMatch = remoteUrl.match(/\/([^\/]+?)(?:\.git)?$/);
      const projectName = nameMatch ? nameMatch[1] : undefined;

      return {
        git_project_url: remoteUrl,
        git_project_name: projectName
      };
    } catch (error) {
      console.warn('⚠️ 无法获取git remote信息:', error);
      return null;
    }
  }

  /**
   * 获取当前分支
   */
  private getCurrentBranch(): string | undefined {
    try {
      const branch = execSync('git branch --show-current', { 
        cwd: this.workspaceRoot,
        encoding: 'utf-8' 
      }).trim();
      return branch || undefined;
    } catch (error) {
      console.warn('⚠️ 无法获取当前分支:', error);
      return undefined;
    }
  }

  /**
   * 计算预估工时（天数）
   */
  private calculateWorkDays(): number | undefined {
    try {
      // 获取第一次提交的日期
      const firstCommitDate = execSync('git log --reverse --format=%ai | head -1', { 
        cwd: this.workspaceRoot,
        encoding: 'utf-8' 
      }).trim();

      if (!firstCommitDate) {
        return undefined;
      }

      // 计算从第一次提交到现在的天数
      const firstDate = new Date(firstCommitDate);
      const currentDate = new Date();
      const diffTime = Math.abs(currentDate.getTime() - firstDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // 转换为工作日（假设一周5个工作日）
      const workDays = Math.ceil(diffDays * 5 / 7);

      return workDays;
    } catch (error) {
      console.warn('⚠️ 无法计算工时:', error);
      return undefined;
    }
  }

  /**
   * 检查是否在git仓库中
   */
  isGitRepository(): boolean {
    try {
      execSync('git rev-parse --git-dir', { 
        cwd: this.workspaceRoot,
        stdio: 'ignore'
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 创建示例配置文件
   */
  createExampleConfigFile(): void {
    const configPath = path.join(this.workspaceRoot, 'git_info.config.js');
    
    const exampleContent = `// Git项目信息配置
module.exports = {
  git_project_url: "https://github.com/your-org/your-project",
  git_project_name: "your-project-name"
};
`;

    try {
      fs.writeFileSync(configPath, exampleContent, 'utf-8');
      console.log(`✅ 已创建示例配置文件: ${configPath}`);
    } catch (error) {
      console.error('❌ 创建配置文件失败:', error);
    }
  }
} 