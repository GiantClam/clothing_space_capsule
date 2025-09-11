const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticateDevice } = require('./auth');
const axios = require('axios');
const youzanService = require('../services/youzan');

const router = express.Router();
const prisma = new PrismaClient();

// 创建试穿任务
router.post('/create', authenticateDevice, [
  body('clothesId').notEmpty().withMessage('衣服ID不能为空'),
  body('userPhotoUrl').notEmpty().withMessage('用户照片URL不能为空')
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

    const { clothesId, userPhotoUrl } = req.body;
    const { deviceId } = req.device;

    // 验证设备是否有已验证的用户
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      include: {
        users: {
          where: { isVerified: true },
          take: 1
        }
      }
    });

    if (!device || device.users.length === 0) {
      return res.status(403).json({ 
        error: '请先关注微信公众号完成验证' 
      });
    }

    const user = device.users[0];

    // 验证衣服是否存在
    const clothes = await prisma.clothes.findUnique({
      where: { id: clothesId }
    });

    if (!clothes || !clothes.isActive) {
      return res.status(404).json({ error: '衣服不存在' });
    }

    // 生成分销链接（如果有商品ID和分销ID）
    let distributionUrl = null;
    if (clothes.youzanProductId && device.distributionId) {
      const distributionLink = youzanService.generateDistributionLink(
        clothes.youzanProductId,
        device.distributionId,
        clothes.name
      );
      distributionUrl = distributionLink.url;
    }

    // 创建任务
    const task = await prisma.task.create({
      data: {
        userId: user.id,
        deviceId: deviceId,
        clothesId: clothesId,
        userPhotoUrl: userPhotoUrl,
        distributionUrl: distributionUrl,
        status: 'PENDING'
      },
      include: {
        clothes: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            prompt: true,
            youzanProductId: true
          }
        }
      }
    });

    // 提交到 RunningHub
    try {
      const runninghubTask = await submitToRunningHub({
        userPhoto: userPhotoUrl,
        clothesImage: clothes.imageUrl,
        clothesPrompt: clothes.prompt,
        taskId: task.id
      });

      // 更新任务状态
      await prisma.task.update({
        where: { id: task.id },
        data: {
          runninghubTaskId: runninghubTask.id,
          status: 'PROCESSING'
        }
      });

      res.json({
        success: true,
        data: {
          taskId: task.id,
          status: 'PROCESSING',
          runninghubTaskId: runninghubTask.id,
          estimatedTime: runninghubTask.estimatedTime || 300 // 默认5分钟
        }
      });

    } catch (runninghubError) {
      console.error('提交到 RunningHub 失败:', runninghubError);
      
      // 更新任务状态为失败
      await prisma.task.update({
        where: { id: task.id },
        data: {
          status: 'FAILED',
          errorMessage: runninghubError.message
        }
      });

      res.status(500).json({
        error: '提交任务失败',
        message: runninghubError.message
      });
    }

  } catch (error) {
    console.error('创建任务错误:', error);
    res.status(500).json({ error: '创建任务失败' });
  }
});

// 查询任务状态
router.get('/:taskId', authenticateDevice, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { deviceId } = req.device;

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        deviceId: deviceId
      },
      include: {
        clothes: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            youzanUrl: true
          }
        }
      }
    });

    if (!task) {
      return res.status(404).json({ error: '任务不存在' });
    }

    res.json({
      success: true,
      data: {
        id: task.id,
        status: task.status,
        resultUrl: task.resultUrl,
        errorMessage: task.errorMessage,
        clothes: task.clothes,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      }
    });

  } catch (error) {
    console.error('查询任务状态错误:', error);
    res.status(500).json({ error: '查询任务状态失败' });
  }
});

// 获取用户任务列表
router.get('/', authenticateDevice, async (req, res) => {
  try {
    const { deviceId } = req.device;
    const { page = 1, limit = 20, status } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = { deviceId };
    if (status) {
      where.status = status;
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          clothes: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
              youzanUrl: true
            }
          }
        }
      }),
      prisma.task.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        tasks,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('获取任务列表错误:', error);
    res.status(500).json({ error: '获取任务列表失败' });
  }
});

// 取消任务
router.post('/:taskId/cancel', authenticateDevice, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { deviceId } = req.device;

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        deviceId: deviceId,
        status: { in: ['PENDING', 'PROCESSING'] }
      }
    });

    if (!task) {
      return res.status(404).json({ error: '任务不存在或无法取消' });
    }

    // 如果任务已提交到 RunningHub，尝试取消
    if (task.runninghubTaskId) {
      try {
        await cancelRunningHubTask(task.runninghubTaskId);
      } catch (error) {
        console.error('取消 RunningHub 任务失败:', error);
        // 继续执行本地取消
      }
    }

    // 更新任务状态
    await prisma.task.update({
      where: { id: taskId },
      data: { status: 'CANCELLED' }
    });

    res.json({
      success: true,
      message: '任务已取消'
    });

  } catch (error) {
    console.error('取消任务错误:', error);
    res.status(500).json({ error: '取消任务失败' });
  }
});

// 提交到 RunningHub
async function submitToRunningHub({ userPhoto, clothesImage, clothesPrompt, taskId }) {
  try {
    const response = await axios.post(`${process.env.RUNNINGHUB_API_URL}/tasks`, {
      userPhoto,
      clothesImage,
      clothesPrompt,
      webhook: `${process.env.API_BASE_URL}/api/runninghub/webhook`,
      metadata: {
        taskId,
        timestamp: new Date().toISOString()
      }
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.RUNNINGHUB_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    throw new Error(`RunningHub API 调用失败: ${error.message}`);
  }
}

// 取消 RunningHub 任务
async function cancelRunningHubTask(runninghubTaskId) {
  try {
    await axios.post(`${process.env.RUNNINGHUB_API_URL}/tasks/${runninghubTaskId}/cancel`, {}, {
      headers: {
        'Authorization': `Bearer ${process.env.RUNNINGHUB_API_KEY}`
      }
    });
  } catch (error) {
    throw new Error(`取消 RunningHub 任务失败: ${error.message}`);
  }
}

module.exports = router;
