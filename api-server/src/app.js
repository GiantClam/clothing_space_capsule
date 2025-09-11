const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const errorHandler = require('./middleware/errorHandler');
const { logger, apiLogger } = require('./middleware/logger');
const { validateEnvironment, getConfigInfo } = require('./utils/config');
require('dotenv').config();

const prisma = require('./utils/prisma');

// 导入路由
const { router: authRoutes } = require('./routes/auth');
const wechatRoutes = require('./routes/wechat');
const clothesRoutes = require('./routes/clothes');
const uploadRoutes = require('./routes/upload');
const taskRoutes = require('./routes/tasks');
const runninghubRoutes = require('./routes/runninghub');
const deviceRoutes = require('./routes/devices');

const app = express();

// 中间件配置
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:3000', 'http://localhost:8080'],
  credentials: true
}));
app.use(logger);
app.use(apiLogger);
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100, // 限制每个 IP 15 分钟内最多 100 个请求
  message: '请求过于频繁，请稍后再试'
});
app.use('/api/', limiter);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    config: getConfigInfo()
  });
});

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/wechat', wechatRoutes);
app.use('/api/clothes', clothesRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/runninghub', runninghubRoutes);
app.use('/api/devices', deviceRoutes);

// 根路径重定向
app.get('/', (req, res) => {
  res.redirect('/health');
});

// 404 处理
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: '接口不存在',
    path: req.originalUrl 
  });
});

// 使用统一错误处理中间件
app.use(errorHandler);

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('正在关闭服务器...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('正在关闭服务器...');
  await prisma.$disconnect();
  process.exit(0);
});

// 验证环境变量
try {
  validateEnvironment();
  
  const PORT = process.env.PORT || 4001;

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 API 服务器运行在端口 ${PORT}`);
    console.log(`📊 健康检查: http://0.0.0.0:${PORT}/health`);
    console.log(`🌍 环境: ${process.env.NODE_ENV}`);
    console.log(`🔐 JWT: ${process.env.JWT_SECRET ? '已配置' : '未配置'}`);
    console.log(`🗄️  数据库: ${process.env.DATABASE_URL ? '已配置' : '未配置'}`);
    console.log(`☁️  COS: ${process.env.COS_SECRET_ID ? '已配置' : '未配置'}`);
  });
} catch (error) {
  console.error('❌ 启动失败:', error.message);
  process.exit(1);
}

module.exports = app;
