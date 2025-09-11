// 结构化日志中间件
const logger = (req, res, next) => {
  const start = Date.now();
  
  // 记录请求信息
  console.log({
    type: 'request',
    method: req.method,
    url: req.originalUrl,
    timestamp: new Date().toISOString(),
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent')
  });
  
  // 监听响应完成
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      type: 'response',
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    };
    
    if (res.statusCode >= 400) {
      console.warn(logData);
    } else {
      console.log(logData);
    }
  });
  
  next();
};

// API 请求日志（更详细）
const apiLogger = (req, res, next) => {
  if (req.originalUrl.startsWith('/api/')) {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log({
        type: 'api_request',
        method: req.method,
        endpoint: req.originalUrl,
        status: res.statusCode,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
    });
  }
  
  next();
};

module.exports = {
  logger,
  apiLogger
};