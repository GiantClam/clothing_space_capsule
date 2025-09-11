const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticateDevice } = require('./auth');

const router = express.Router();
const prisma = new PrismaClient();

// 更新设备分销ID
router.put('/distribution-id', authenticateDevice, [
  body('distributionId').notEmpty().withMessage('分销ID不能为空')
], async (req, res) => {
  try {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: '输入验证失败',
        details: errors.array()
      });
    }

    const { distributionId } = req.body;
    const { deviceId } = req.device;

    // 更新设备分销ID
    const updatedDevice = await prisma.device.update({
      where: { id: deviceId },
      data: { distributionId },
      select: {
        id: true,
        macAddress: true,
        deviceName: true,
        distributionId: true,
        isActive: true
      }
    });

    res.json({
      success: true,
      message: '分销ID更新成功',
      device: updatedDevice
    });

  } catch (error) {
    console.error('更新分销ID错误:', error);
    res.status(500).json({ error: '更新分销ID失败' });
  }
});

// 获取设备分销ID
router.get('/distribution-id', authenticateDevice, async (req, res) => {
  try {
    const { deviceId } = req.device;

    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      select: {
        id: true,
        macAddress: true,
        deviceName: true,
        distributionId: true
      }
    });

    res.json({
      success: true,
      device: {
        id: device.id,
        macAddress: device.macAddress,
        deviceName: device.deviceName,
        distributionId: device.distributionId
      }
    });

  } catch (error) {
    console.error('获取分销ID错误:', error);
    res.status(500).json({ error: '获取分销ID失败' });
  }
});

// 获取所有设备列表（管理员功能）
router.get('/list', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [devices, total] = await Promise.all([
      prisma.device.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          macAddress: true,
          deviceName: true,
          distributionId: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: {
              users: true,
              tasks: true
            }
          }
        }
      }),
      prisma.device.count()
    ]);

    res.json({
      success: true,
      data: {
        devices,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('获取设备列表错误:', error);
    res.status(500).json({ error: '获取设备列表失败' });
  }
});

// 更新设备状态
router.put('/:deviceId/status', [
  body('isActive').isBoolean().withMessage('设备状态必须是布尔值')
], async (req, res) => {
  try {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: '输入验证失败',
        details: errors.array()
      });
    }

    const { deviceId } = req.params;
    const { isActive } = req.body;

    const updatedDevice = await prisma.device.update({
      where: { id: deviceId },
      data: { isActive },
      select: {
        id: true,
        macAddress: true,
        deviceName: true,
        distributionId: true,
        isActive: true
      }
    });

    res.json({
      success: true,
      message: '设备状态更新成功',
      device: updatedDevice
    });

  } catch (error) {
    console.error('更新设备状态错误:', error);
    res.status(500).json({ error: '更新设备状态失败' });
  }
});

module.exports = router;
