const { GitUtils } = require('./dist/git-utils.js');
const path = require('path');

async function testGitConfig() {
  console.log('🧪 测试Git配置文件读取功能...\n');
  
  const workspaceRoot = process.cwd();
  const gitUtils = new GitUtils(workspaceRoot);
  
  try {
    // 测试是否在git仓库中
    const isGitRepo = gitUtils.isGitRepository();
    console.log(`📁 是否为Git仓库: ${isGitRepo ? '✅ 是' : '❌ 否'}`);
    
    // 获取完整的git信息
    const gitInfo = await gitUtils.getGitInfo();
    
    console.log('\n📋 Git信息:');
    console.log('='.repeat(50));
    console.log(`🔗 项目URL: ${gitInfo.projectUrl || '未配置'}`);
    console.log(`📦 项目名称: ${gitInfo.projectName || '未配置'}`);
    console.log(`🌿 当前分支: ${gitInfo.currentBranch || '未知'}`);
    console.log(`⏱️  预估工时: ${gitInfo.estimatedWorkDays || '未知'} 天`);
    
    // 检查配置文件是否存在
    const jsonConfigExists = require('fs').existsSync(path.join(workspaceRoot, 'git_info.config.json'));
    const jsConfigExists = require('fs').existsSync(path.join(workspaceRoot, 'git_info.config.js'));
    
    console.log('\n📄 配置文件状态:');
    console.log('='.repeat(50));
    console.log(`📝 git_info.config.json: ${jsonConfigExists ? '✅ 存在' : '❌ 不存在'}`);
    console.log(`📝 git_info.config.js: ${jsConfigExists ? '✅ 存在' : '❌ 不存在'}`);
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testGitConfig(); 