// 统一错误处理中间件
const errorHandler = (err, req, res, next) => {
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // 验证错误
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: '输入验证失败',
      details: err.details || err.message
    });
  }

  // JWT 认证错误
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: '无效的认证令牌'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: '认证令牌已过期'
    });
  }

  // 数据库错误
  if (err.code === 'P2002') {
    return res.status(409).json({
      error: '资源已存在'
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      error: '资源不存在'
    });
  }

  // 默认错误响应
  const statusCode = err.statusCode || 500;
  const errorResponse = {
    error: process.env.NODE_ENV === 'production' 
      ? '服务器内部错误' 
      : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  };

  res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;