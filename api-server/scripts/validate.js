const { validateEnvironment, getConfigInfo } = require('../src/utils/config');

console.log('🔍 验证 API Server 配置...\n');

try {
  // 加载环境变量
  require('dotenv').config();
  
  // 验证环境变量
  validateEnvironment();
  
  const config = getConfigInfo();
  
  console.log('✅ 配置验证通过');
  console.log('📋 配置信息:');
  console.log(`  环境: ${config.nodeEnv}`);
  console.log(`  端口: ${config.port}`);
  console.log(`  数据库: ${config.database}`);
  console.log(`  JWT: ${config.jwt}`);
  console.log(`  腾讯云COS: ${config.cos}`);
  console.log(`  RunningHub: ${config.runninghub}`);
  console.log(`  微信: ${config.wechat}`);
  
  // 检查Prisma连接
  const prisma = require('../src/utils/prisma');
  console.log('\n🔗 测试数据库连接...');
  
  prisma.$queryRaw`SELECT 1`
    .then(() => {
      console.log('✅ 数据库连接正常');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ 数据库连接失败:', error.message);
      process.exit(1);
    });
  
} catch (error) {
  console.error('❌ 配置验证失败:', error.message);
  console.log('\n💡 请检查 .env 文件是否包含以下必要环境变量:');
  console.log('   - JWT_SECRET');
  console.log('   - DATABASE_URL'); 
  console.log('   - COS_SECRET_ID');
  console.log('   - COS_SECRET_KEY');
  console.log('   - COS_BUCKET');
  console.log('   - COS_REGION');
  process.exit(1);
}