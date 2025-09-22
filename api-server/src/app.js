const express = require('express');
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const errorHandler = require('./middleware/errorHandler');
const { logger, apiLogger } = require('./middleware/logger');
const { validateEnvironment, getConfigInfo } = require('./utils/config');

// 优先加载 .env.local 文件，然后加载 .env 文件
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const prisma = require('./utils/prisma');

// 导入路由
const { router: authRoutes } = require('./routes/auth');
const wechatRoutes = require('./routes/wechat');
const clothesRoutes = require('./routes/clothes');
const { router: uploadRoutes } = require('./routes/upload');
const { router: taskRoutes } = require('./routes/tasks');
const runninghubRoutes = require('./routes/runninghub');
const deviceRoutes = require('./routes/devices');

// 集群模式启动
if (cluster.isMaster) {
  console.log(`🚀 主进程 ${process.pid} 正在运行`);
  
  // 根据CPU核心数启动工作进程
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  
  // 工作进程退出时重新启动
  cluster.on('exit', (worker, code, signal) => {
    console.log(`工作进程 ${worker.process.pid} 已退出，正在重新启动...`);
    cluster.fork();
  });
} else {
  // 工作进程
  const app = express();
  
  // 中间件配置
  app.use(helmet());
  app.use(cors({
    origin: function (origin, callback) {
      console.log('CORS请求origin:', origin);
      
      // 在开发环境中允许所有请求
      if (process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      
      // 允许的域名列表
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:8080', 
        'http://localhost:4001',
        'https://yourdomain.com'
      ];
      
      // 允许无 origin 的请求（如 Electron 应用、Postman、移动应用等）
      if (!origin) {
        return callback(null, true);
      }
      
      // 允许 file:// 协议（Electron 应用）
      if (origin.startsWith('file://')) {
        return callback(null, true);
      }
      
      // 检查是否在允许列表中
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      return callback(null, true); // 在开发阶段允许所有请求
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'User-Agent', 'Cache-Control'],
    exposedHeaders: ['Content-Length', 'Content-Type', 'Accept-Ranges']
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
      config: getConfigInfo(),
      pid: process.pid,
      workerId: cluster.worker ? cluster.worker.id : 'master'
    });
  });

  // 静态文件服务 - 用于本地调试模式的文件访问
  app.use('/uploads', express.static('uploads', {
    maxAge: '1d',
    setHeaders: (res, path, stat) => {
      // 添加全面的CORS头以支持Electron应用
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Origin, User-Agent');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      
      if (path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.png') || path.endsWith('.webp')) {
        res.setHeader('Cache-Control', 'public, max-age=86400'); // 1天缓存
        res.setHeader('Content-Type', path.endsWith('.png') ? 'image/png' : 'image/jpeg');
      }
    }
  }));

  // 静态文件服务 - 用于服装图片的访问
  app.use('/public', express.static('../public', {
    maxAge: '1d',
    setHeaders: (res, path, stat) => {
      // 添加全面的CORS头以支持Electron应用
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Origin, User-Agent');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      
      if (path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.png') || path.endsWith('.webp')) {
        res.setHeader('Cache-Control', 'public, max-age=86400'); // 1天缓存
        res.setHeader('Content-Type', path.endsWith('.png') ? 'image/png' : 'image/jpeg');
      }
    }
  }));

  // 根目录静态文件服务 - 支持直接访问 female/coats/xxx.jpg 等路径
  app.use(express.static('../public', {
    maxAge: '1d',
    setHeaders: (res, path, stat) => {
      // 添加全面的CORS头以支持Electron应用
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Origin, User-Agent');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      
      if (path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.png') || path.endsWith('.webp')) {
        res.setHeader('Cache-Control', 'public, max-age=86400'); // 1天缓存
        res.setHeader('Content-Type', path.endsWith('.png') ? 'image/png' : 'image/jpeg');
      }
    }
  }));

  // 处理静态资源的OPTIONS请求
  app.options('*', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24小时缓存
    res.status(200).end();
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
    console.log(`工作进程 ${process.pid} 正在关闭服务器...`);
    await prisma.$disconnect();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log(`工作进程 ${process.pid} 正在关闭服务器...`);
    await prisma.$disconnect();
    process.exit(0);
  });

  // 验证环境变量
  try {
    validateEnvironment();
    
    const PORT = process.env.PORT || 4001;

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 API 服务器工作进程 ${process.pid} 运行在端口 ${PORT}`);
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
}