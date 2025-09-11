const express = require('express');
const { body } = require('express-validator');
const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');
const { validateRequest } = require('../middleware/validation');

const router = express.Router();

// 设备登录验证
router.post('/device', [
  body('macAddress').notEmpty().withMessage('MAC地址不能为空'),
  body('deviceName').optional().isString().withMessage('设备名称必须是字符串')
], validateRequest, async (req, res, next) => {
  try {
    // 检查JWT密钥配置
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET环境变量未配置');
    }

    const { macAddress, deviceName } = req.body;

    // 查找或创建设备
    let device = await prisma.device.findUnique({
      where: { macAddress }
    });

    if (!device) {
      // 创建设备
      device = await prisma.device.create({
        data: {
          macAddress,
          deviceName: deviceName || `设备-${macAddress.slice(-6)}`,
          isActive: true
        }
      });
    } else if (!device.isActive) {
      return res.status(403).json({
        error: '设备已被禁用'
      });
    }

    // 生成 JWT token
    const token = jwt.sign(
      { 
        deviceId: device.id,
        macAddress: device.macAddress 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      token,
      device: {
        id: device.id,
        macAddress: device.macAddress,
        deviceName: device.deviceName,
        isActive: device.isActive
      }
    });

  } catch (error) {
    console.error('设备登录错误:', error);
    next(error);
  }
});

// 验证 token 中间件
const authenticateDevice = async (req, res, next) => {
  try {
    // 检查JWT密钥配置
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: '服务器配置错误' });
    }

    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: '缺少认证令牌' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const device = await prisma.device.findUnique({
      where: { id: decoded.deviceId }
    });

    if (!device || !device.isActive) {
      return res.status(401).json({ error: '设备无效或已被禁用' });
    }

    req.device = device;
    next();
  } catch (error) {
    console.error('Token 验证错误:', error);
    res.status(401).json({ error: '无效的认证令牌' });
  }
};

// 获取设备信息
router.get('/device', authenticateDevice, async (req, res, next) => {
  try {
    res.json({
      success: true,
      device: {
        id: req.device.id,
        macAddress: req.device.macAddress,
        deviceName: req.device.deviceName,
        isActive: req.device.isActive,
        createdAt: req.device.createdAt
      }
    });
  } catch (error) {
    console.error('获取设备信息错误:', error);
    next(error);
  }
});

module.exports = { router, authenticateDevice };