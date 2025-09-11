const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { expressjwt: jwt } = require('express-jwt');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const axios = require('axios');
const COS = require('cos-nodejs-sdk-v5');
const QRCode = require('qrcode');
const crypto = require('crypto');
const xml2js = require('xml2js');

const app = express();

// 中间件配置
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100 // 每个IP最多100次请求
});
app.use(limiter);

// JWT认证（可选）
const jwtSecret = process.env.JWT_SECRET;
if (jwtSecret) {
  app.use(jwt({
    secret: jwtSecret,
    algorithms: ['HS256'],
    credentialsRequired: false
  }).unless({
    path: [
      '/api/health',
      '/api/login',
      '/api/register',
      '/api/public'
    ]
  }));
}

// 腾讯云COS配置
const cos = new COS({
  SecretId: process.env.COS_SECRET_ID,
  SecretKey: process.env.COS_SECRET_KEY
});

// 健康检查端点
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 示例API端点
app.get('/api/public/data', (req, res) => {
  res.json({ message: '公共数据接口', data: [] });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: '无效的令牌' });
  }
  
  res.status(500).json({ 
    error: '服务器内部错误',
    message: process.env.NODE_ENV === 'development' ? err.message : '请联系管理员'
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// CloudBase云函数入口
exports.handler = (event, context) => {
  // 将API网关事件转换为Express请求
  const request = {
    method: event.httpMethod,
    path: event.path,
    headers: event.headers,
    query: event.queryStringParameters || {},
    body: event.body ? JSON.parse(event.body) : {}
  };

  // 模拟Express响应对象
  const response = {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader: function(key, value) {
      this.headers[key] = value;
    },
    json: function(data) {
      this.body = JSON.stringify(data);
      this.setHeader('Content-Type', 'application/json');
    },
    status: function(code) {
      this.statusCode = code;
      return this;
    }
  };

  // 执行Express应用
  return new Promise((resolve) => {
    const req = Object.create(request);
    const res = Object.create(response);
    
    res.end = () => {
      resolve({
        statusCode: res.statusCode,
        headers: res.headers,
        body: res.body
      });
    };

    // 模拟Express处理
    app(req, res, () => {
      res.status(404).json({ error: 'Not Found' });
      res.end();
    });
  });
};

// 本地开发时直接启动服务器
if (require.main === module) {
  const port = process.env.PORT || 4001;
  app.listen(port, () => {
    console.log(`API服务器运行在端口 ${port}`);
    console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
  });
}

module.exports = app;