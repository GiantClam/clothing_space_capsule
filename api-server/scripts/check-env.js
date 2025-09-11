#!/usr/bin/env node
/**
 * 环境变量检查脚本
 * 用于CloudStudio部署前验证环境变量配置
 */

const { validateEnvironment, getConfigInfo } = require('../src/utils/config.js');

console.log('🔍 检查环境变量配置...\n');

try {
  // 尝试验证环境变量
  validateEnvironment();
  console.log('✅ 所有必需环境变量已配置');
  
  // 显示配置信息
  const configInfo = getConfigInfo();
  console.log('\n📊 当前配置状态:');
  console.log(`🌍 环境: ${configInfo.nodeEnv}`);
  console.log(`🚪 端口: ${configInfo.port}`);
  console.log(`🗄️  数据库: ${configInfo.database}`);
  console.log(`🔐 JWT: ${configInfo.jwt}`);
  console.log(`☁️  COS: ${configInfo.cos}`);
  console.log(`📱 微信: ${configInfo.wechat}`);
  console.log(`🤖 RunningHub: ${configInfo.runninghub}`);
  
  console.log('\n🎉 环境变量配置检查通过！');
  process.exit(0);
} catch (error) {
  console.log('❌ 环境变量配置检查失败:');
  console.log(`   ${error.message}`);
  
  console.log('\n💡 配置建议:');
  console.log('   1. 复制环境变量模板: cp ../.cloudstudio/env.template .env');
  console.log('   2. 编辑 .env 文件填写实际配置值');
  console.log('   3. 确保文件权限: chmod 600 .env');
  console.log('   4. 重新运行检查: npm run check-env');
  
  process.exit(1);
}