const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();

// 中间件配置
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:3000', 'http://localhost:8080'],
  credentials: true
}));
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
    message: 'API Server 运行正常'
  });
});

// 测试路由
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API Server 测试成功',
    timestamp: new Date().toISOString()
  });
});

// 设备认证测试路由
app.post('/api/auth/device', (req, res) => {
  const { macAddress, deviceName } = req.body;
  
  if (!macAddress) {
    return res.status(400).json({
      error: 'MAC地址不能为空'
    });
  }

  // 模拟设备认证
  const mockToken = 'mock_jwt_token_' + Date.now();
  
  res.json({
    success: true,
    token: mockToken,
    device: {
      id: 'mock_device_id',
      macAddress: macAddress,
      deviceName: deviceName || `设备-${macAddress.slice(-6)}`,
      isActive: true
    }
  });
});

// 微信状态检查测试路由
app.get('/api/wechat/status/:deviceId', (req, res) => {
  const { deviceId } = req.params;
  
  res.json({
    success: true,
    isVerified: false, // 模拟未关注状态
    user: null
  });
});

// 衣服分类测试路由
app.get('/api/clothes/categories', (req, res) => {
  res.json({
    success: true,
    categories: [
      {
        id: 'male',
        name: '男装',
        level: 1,
        children: [
          { id: 'male_coats', name: '外套', level: 2 },
          { id: 'male_pants', name: '裤子', level: 2 }
        ]
      },
      {
        id: 'female',
        name: '女装',
        level: 1,
        children: [
          { id: 'female_coats', name: '外套', level: 2 },
          { id: 'female_skirts', name: '裙子', level: 2 }
        ]
      }
    ]
  });
});

// 衣服列表测试路由
app.get('/api/clothes/list', (req, res) => {
  res.json({
    success: true,
    data: {
      clothes: [
        {
          id: 'test_clothes_1',
          name: '测试衣服1',
          imageUrl: 'https://example.com/test1.jpg',
          description: '测试衣服描述',
          prompt: 'test prompt',
          youzanProductId: '123456'
        }
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        pages: 1
      }
    }
  });
});

// 404 处理
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: '接口不存在',
    path: req.originalUrl 
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? '服务器内部错误' 
      : err.message 
  });
});

const PORT = process.env.PORT || 4001;

app.listen(PORT, () => {
  console.log(`🚀 API 服务器运行在端口 ${PORT}`);
  console.log(`📊 健康检查: http://localhost:${PORT}/health`);
  console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ 简化版本，无需数据库连接`);
});

module.exports = app;
