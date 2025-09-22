#!/usr/bin/env node

const express = require('express');
const cors = require('cors');

const app = express();

// 基本中间件
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 简化的认证中间件（开发模式）
const simpleAuth = async (req, res, next) => {
  req.device = { id: 'test-device-123' };
  next();
};

// 设备认证路由
app.post('/api/auth/device', (req, res) => {
  console.log('🔐 收到设备认证请求:', req.body);
  
  const { macAddress, deviceName } = req.body;
  
  // 模拟成功的设备认证响应
  res.json({
    success: true,
    token: 'test-jwt-token-' + Date.now(),
    device: {
      id: 'test-device-123',
      macAddress: macAddress || 'test-mac',
      deviceName: deviceName || 'Test Device',
      isActive: true
    }
  });
});

// 获取设备信息路由
app.get('/api/auth/device', simpleAuth, (req, res) => {
  console.log('📱 收到获取设备信息请求');
  
  res.json({
    success: true,
    device: {
      id: 'test-device-123',
      macAddress: 'test-mac',
      deviceName: 'Test Device',
      isActive: true,
      createdAt: new Date().toISOString()
    }
  });
});

// 简化的上传照片路由
app.post('/api/tasks/upload-photo', simpleAuth, (req, res) => {
  console.log('📸 收到照片上传请求');
  
  res.json({
    success: true,
    data: {
      taskId: 'test-task-' + Date.now()
    }
  });
});

// 模拟服装分类数据（支持层级结构）
const mockCategories = [
  {
    id: 'female',
    name: '女装',
    level: 1,
    isActive: true,
    children: [
      {
        id: 'female-tops',
        name: '外套',
        parentId: 'female',
        level: 2,
        isActive: true
      },
      {
        id: 'female-bottoms',
        name: '裤子',
        parentId: 'female',
        level: 2,
        isActive: true
      },
      {
        id: 'female-dresses',
        name: '连衣裙',
        parentId: 'female',
        level: 2,
        isActive: true
      }
    ]
  },
  {
    id: 'male',
    name: '男装',
    level: 1,
    isActive: true,
    children: [
      {
        id: 'male-tops',
        name: '外套',
        parentId: 'male',
        level: 2,
        isActive: true
      },
      {
        id: 'male-bottoms',
        name: '裤子',
        parentId: 'male',
        level: 2,
        isActive: true
      }
    ]
  }
];

// COS_FOLDER 定义
const COS_FOLDER = 'clothinges/';

// 模拟服装数据（更新分类ID以匹配新的结构）
const mockClothes = [
  {
    id: 'top-1',
    categoryId: 'female-tops',
    name: '白色衬衫',
    imageUrl: `https://clothing.0086studios.xyz/${COS_FOLDER}female/tops/shirt1.jpg`,
    prompt: 'white shirt',
    description: '经典白色衬衫',
    price: 199.00,
    isActive: true
  },
  {
    id: 'top-2',
    categoryId: 'female-tops',
    name: '黑色T恤',
    imageUrl: `https://clothing.0086studios.xyz/${COS_FOLDER}female/tops/tshirt1.jpg`,
    prompt: 'black t-shirt',
    description: '基础黑色T恤',
    price: 99.00,
    isActive: true
  },
  {
    id: 'bottom-1', 
    categoryId: 'female-bottoms',
    name: '牛仔裤',
    imageUrl: `https://clothing.0086studios.xyz/${COS_FOLDER}female/bottoms/jeans1.jpg`,
    prompt: 'blue jeans',
    description: '经典蓝色牛仔裤',
    price: 299.00,
    isActive: true
  },
  {
    id: 'dress-1',
    categoryId: 'female-dresses',
    name: '夏季连衣裙',
    imageUrl: `https://clothing.0086studios.xyz/${COS_FOLDER}female/dresses/dress1.jpg`,
    prompt: 'summer dress',
    description: '清新夏季连衣裙',
    price: 399.00,
    isActive: true
  },
  {
    id: 'male-top-1',
    categoryId: 'male-tops',
    name: '男士西装',
    imageUrl: `https://clothing.0086studios.xyz/${COS_FOLDER}male/tops/suit1.jpg`,
    prompt: 'men suit',
    description: '正装西装',
    price: 899.00,
    isActive: true
  },
  {
    id: 'male-bottom-1',
    categoryId: 'male-bottoms',
    name: '男士西裤',
    imageUrl: `https://clothing.0086studios.xyz/${COS_FOLDER}male/bottoms/pants1.jpg`,
    prompt: 'men pants',
    description: '正装西裤',
    price: 399.00,
    isActive: true
  }
];

// 获取服装分类路由
app.get('/api/clothes/categories', (req, res) => {
  console.log('👕 收到获取服装分类请求');
  
  res.json({
    success: true,
    data: mockCategories
  });
});

// 获取服装列表路由
app.get('/api/clothes/list', (req, res) => {
  console.log('👔 收到获取服装列表请求:', req.query);
  
  let filteredClothes = [...mockClothes];
  
  // 根据分类筛选
  if (req.query.categoryId) {
    filteredClothes = filteredClothes.filter(item => item.categoryId === req.query.categoryId);
  }
  
  res.json({
    success: true,
    data: filteredClothes,
    total: filteredClothes.length
  });
});

// 根据分类获取服装路由
app.get('/api/clothes/category/:categoryId', (req, res) => {
  console.log('🎯 收到根据分类获取服装请求:', req.params.categoryId);
  
  const filteredClothes = mockClothes.filter(item => item.categoryId === req.params.categoryId);
  
  res.json({
    success: true,
    data: {
      clothes: filteredClothes,
      category: mockCategories.find(cat => cat.id === req.params.categoryId || 
        cat.children?.find(child => child.id === req.params.categoryId))
    },
    total: filteredClothes.length
  });
});

// 获取单个服装详情路由
app.get('/api/clothes/:clothesId', (req, res) => {
  console.log('👗 收到获取服装详情请求:', req.params.clothesId);
  
  const clothes = mockClothes.find(item => item.id === req.params.clothesId);
  
  if (!clothes) {
    return res.status(404).json({
      success: false,
      error: '服装不存在'
    });
  }
  
  res.json({
    success: true,
    data: clothes
  });
});

// 微信相关路由
// 生成微信二维码
app.post('/api/wechat/qrcode', simpleAuth, (req, res) => {
  console.log('📱 收到生成微信二维码请求:', req.body);
  
  res.json({
    success: true,
    qrCode: {
      dataURL: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      url: 'https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=test-ticket'
    }
  });
});

// 检查微信状态
app.get('/api/wechat/status/:deviceId', (req, res) => {
  console.log('📲 收到检查微信状态请求:', req.params.deviceId);
  
  res.json({
    success: true,
    isVerified: false, // 模拟未关注状态
    user: null
  });
});

// 任务状态和管理路由
// 开始试穿任务
app.post('/api/tasks/start-tryon', simpleAuth, (req, res) => {
  console.log('🎆 收到开始试穿任务请求:', req.body);
  
  const { taskId, topClothesId, bottomClothesId } = req.body;
  
  res.json({
    success: true,
    data: {
      taskId: taskId,
      status: 'PROCESSING',
      runninghubTaskId: 'rh-task-' + Date.now()
    }
  });
});

// 获取任务状态
app.get('/api/tasks/:taskId', simpleAuth, (req, res) => {
  console.log('🔍 收到获取任务状态请求:', req.params.taskId);
  
  // 模拟任务完成状态
  res.json({
    success: true,
    data: {
      id: req.params.taskId,
      status: 'COMPLETED',
      resultUrl: 'https://example.com/test-result.jpg',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  });
});

// 获取任务列表
app.get('/api/tasks', simpleAuth, (req, res) => {
  console.log('📋 收到获取任务列表请求:', req.query);
  
  res.json({
    success: true,
    data: [],
    total: 0
  });
});

// 取消任务
app.post('/api/tasks/:taskId/cancel', simpleAuth, (req, res) => {
  console.log('❌ 收到取消任务请求:', req.params.taskId);
  
  res.json({
    success: true,
    data: {
      id: req.params.taskId,
      status: 'CANCELLED'
    }
  });
});

// 关闭服务器端点
app.post('/shutdown', (req, res) => {
  console.log('🚨 收到关闭API服务器的请求');
  
  res.json({
    success: true,
    message: 'API服务器正在关闭...'
  });
  
  // 延迟关闭，确保响应可以返回
  setTimeout(() => {
    console.log('🚪 API服务器正在关闭...');
    process.exit(0);
  }, 500);
});

const PORT = process.env.PORT || 4001;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 简化API服务器运行在端口 ${PORT}`);
  console.log(`📊 健康检查: http://0.0.0.0:${PORT}/health`);
  console.log(`🔧 这是一个临时的简化版本，用于测试客户端连接`);
});