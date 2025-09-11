// 配置验证工具
const requiredEnvVars = [
  'JWT_SECRET',
  'DATABASE_URL'
];

const productionRequiredEnv = [
  'COS_SECRET_ID',
  'COS_SECRET_KEY',
  'COS_BUCKET',
  'COS_REGION'
];

const optionalEnvVars = {
  'PORT': 4002,
  'NODE_ENV': 'development',
  'JWT_EXPIRES_IN': '7d',
  'RUNNINGHUB_API_URL': 'https://www.runninghub.cn',
  'RUNNINGHUB_API_KEY': '',
  'WECHAT_APP_ID': '',
  'WECHAT_APP_SECRET': '',
  'WECHAT_TOKEN': '',
  'API_BASE_URL': 'http://localhost:4002',
  'COS_SECRET_ID': 'placeholder_secret_id',
  'COS_SECRET_KEY': 'placeholder_secret_key',
  'COS_BUCKET': 'clothing-capsule-images',
  'COS_REGION': 'ap-beijing'
};

// 验证环境变量
function validateEnvironment() {
  const missing = [];
  
  // 检查必需的环境变量
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }
  
  // 生产环境的额外检查
  if (process.env.NODE_ENV === 'production') {
    for (const envVar of productionRequiredEnv) {
      if (!process.env[envVar]) {
        missing.push(envVar + ' (生产环境必需)');
      }
    }
  }
  
  if (missing.length > 0) {
    throw new Error(`缺少必要的环境变量: ${missing.join(', ')}`);
  }
  
  // 设置可选环境变量的默认值
  for (const [key, defaultValue] of Object.entries(optionalEnvVars)) {
    if (!process.env[key]) {
      process.env[key] = defaultValue;
    }
  }
  
  // 验证特定配置
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.RUNNINGHUB_API_KEY) {
      console.warn('警告: 生产环境未配置 RUNNINGHUB_API_KEY');
    }
  } else {
    // 开发环境提示
    console.log('⚠️  腾讯云COS未配置，使用本地文件存储（调试模式）');
  }
}

// 获取配置信息（用于健康检查等）
function getConfigInfo() {
  return {
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
    database: process.env.DATABASE_URL ? '已配置' : '未配置',
    jwt: process.env.JWT_SECRET ? '已配置' : '未配置',
    cos: process.env.COS_SECRET_ID ? '已配置' : '未配置',
    runninghub: process.env.RUNNINGHUB_API_KEY ? '已配置' : '未配置',
    wechat: process.env.WECHAT_APP_ID ? '已配置' : '未配置'
  };
}

module.exports = {
  validateEnvironment,
  getConfigInfo,
  requiredEnvVars,
  productionRequiredEnv,
  optionalEnvVars
};