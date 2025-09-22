const fs = require('fs');
const path = require('path');

// 确保日志目录存在
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 写入日志到文件
function writeLogToFile(logData) {
  const date = new Date().toISOString().split('T')[0];
  const logFile = path.join(logDir, `app-${date}.log`);
  
  const logEntry = {
    ...logData,
    timestamp: new Date().toISOString()
  };
  
  fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
}

// 结构化日志中间件
const logger = (req, res, next) => {
  const start = Date.now();
  
  // 记录请求信息
  const requestData = {
    type: 'request',
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent')
  };
  
  console.log(requestData);
  writeLogToFile(requestData);
  
  // 监听响应完成
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      type: 'response',
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`
    };
    
    if (res.statusCode >= 400) {
      console.warn(logData);
    } else {
      console.log(logData);
    }
    
    writeLogToFile(logData);
  });
  
  next();
};

// API 请求日志（更详细）
const apiLogger = (req, res, next) => {
  if (req.originalUrl.startsWith('/api/')) {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      const logData = {
        type: 'api_request',
        method: req.method,
        endpoint: req.originalUrl,
        status: res.statusCode,
        duration: `${duration}ms`
      };
      
      console.log(logData);
      writeLogToFile(logData);
    });
  }
  
  next();
};

module.exports = {
  logger,
  apiLogger
};