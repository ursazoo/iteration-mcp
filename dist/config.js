import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
// 默认配置
const DEFAULT_CONFIG = {
    api: {
        baseUrl: 'https://your-company-api.com',
        endpoints: {
            createIteration: '/api/iteration/create',
            getIterationDetail: '/api/iteration/detail',
            createCRApplication: '/api/iteration/cr/create',
            getParticipants: '/api/personnel/participants',
            getReviewers: '/api/personnel/reviewers'
        }
    }
};
// 配置文件路径
const CONFIG_PATH = join(homedir(), '.iteration-mcp-config.json');
/**
 * 读取配置文件
 */
export function loadConfig() {
    if (!existsSync(CONFIG_PATH)) {
        throw new Error(`配置文件不存在: ${CONFIG_PATH}\n请创建配置文件并添加钉钉相关信息`);
    }
    try {
        const configFile = readFileSync(CONFIG_PATH, 'utf8');
        const userConfig = JSON.parse(configFile);
        // 合并默认配置和用户配置
        return {
            ...DEFAULT_CONFIG,
            ...userConfig
        };
    }
    catch (error) {
        throw new Error(`配置文件解析失败: ${error}`);
    }
}
/**
 * 验证配置
 */
export function validateConfig(config) {
    if (!config.dingtalk?.appId || !config.dingtalk?.appSecret) {
        throw new Error('钉钉配置缺失: 需要 appId 和 appSecret');
    }
    if (!config.api?.baseUrl) {
        throw new Error('API 配置缺失: 需要 baseUrl');
    }
}
/**
 * 获取示例配置
 */
export function getExampleConfig() {
    return JSON.stringify({
        dingtalk: {
            appId: "your_dingtalk_app_id",
            appSecret: "your_dingtalk_app_secret"
        },
        api: {
            baseUrl: "https://your-company-api.com",
            endpoints: {
                createIteration: "/api/iteration/create",
                getIterationDetail: "/api/iteration/detail",
                createCRApplication: "/api/iteration/cr/create",
                getParticipants: "/api/personnel/participants",
                getReviewers: "/api/personnel/reviewers"
            }
        }
    }, null, 2);
}
//# sourceMappingURL=config.js.map