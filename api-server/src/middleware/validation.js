const { validationResult } = require('express-validator');

// 统一验证中间件
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: '输入验证失败',
      details: errors.array()
    });
  }
  
  next();
};

// 文件上传验证
const validateFileUpload = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      error: '请选择要上传的文件'
    });
  }
  
  next();
};

module.exports = {
  validateRequest,
  validateFileUpload
};