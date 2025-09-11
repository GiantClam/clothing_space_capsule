const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticateDevice } = require('./auth');
const axios = require('axios');
const multer = require('multer');
const youzanService = require('../services/youzan');

const router = express.Router();
const prisma = new PrismaClient();

// 上传照片并创建任务
router.post('/upload-photo', authenticateDevice, async (req, res) => {
  try {
    const multer = require('multer');
    
    // 配置 multer 为内存存储
    const storage = multer.memoryStorage();
    const upload = multer({ 
      storage: storage,
      limits: {
        fileSize: 10 * 1024 * 1024 // 10MB 限制
      },
      fileFilter: (req, file, cb) => {
        // 检查文件类型
        if (file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new Error('只允许上传图片文件'), false);
        }
      }
    }).single('photo');
    
    // 使用 multer 中间件处理文件上传
    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          error: '文件上传失败',
          message: err.message
        });
      }
      
      if (!req.file) {
        return res.status(400).json({
          error: '未提供照片文件'
        });
      }
      
      const deviceId = req.device.id;
      
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
      
      // 直接上传到RunningHub（使用文件buffer）
      let filename = null;
      try {
        const uploadResult = await uploadToRunningHub(req.file.buffer, 'user_photo', req.file.originalname, req.file.mimetype);
        filename = uploadResult.filename;
      } catch (uploadError) {
        console.error('上传照片到RunningHub失败:', uploadError);
        return res.status(500).json({
          error: '照片上传失败',
          message: uploadError.message
        });
      }
      
      // 创建任务记录
      const task = await prisma.task.create({
        data: {
          userId: user.id,
          deviceId: deviceId,
          userPhotoFilename: filename,
          status: 'PENDING'
        }
      });
      
      res.json({
        success: true,
        data: {
          taskId: task.id
        }
      });
    });
    
  } catch (error) {
    console.error('上传照片创建任务错误:', error);
    res.status(500).json({ error: '创建任务失败' });
  }
});

// 选择衣服并启动试穿任务
router.post('/start-tryon', authenticateDevice, [
  body('taskId').notEmpty().withMessage('任务ID不能为空'),
  body('topClothesId').notEmpty().withMessage('上衣ID不能为空'),
  body('bottomClothesId').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: '输入验证失败',
        details: errors.array()
      });
    }

    const { taskId, topClothesId, bottomClothesId } = req.body;
    const { deviceId } = req.device;

    // 验证任务是否存在且属于当前设备
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        deviceId: deviceId,
        status: 'PENDING'
      },
      include: {
        user: true
      }
    });

    if (!task) {
      return res.status(404).json({ error: '任务不存在或无法处理' });
    }

    // 验证上衣是否存在
    const topClothes = await prisma.clothes.findUnique({
      where: { id: topClothesId }
    });

    if (!topClothes || !topClothes.isActive) {
      return res.status(404).json({ error: '上衣不存在' });
    }

    // 验证下衣（如果提供）
    let bottomClothes = null;
    if (bottomClothesId) {
      bottomClothes = await prisma.clothes.findUnique({
        where: { id: bottomClothesId }
      });

      if (!bottomClothes || !bottomClothes.isActive) {
        return res.status(404).json({ error: '下衣不存在' });
      }
    }

    // 上传衣服图片到RunningHub
    let topFilename = null;
    let bottomFilename = null;

    try {
      // 上传上衣图片
      topFilename = (await uploadToRunningHub(topClothes.imageUrl, 'clothes', `top_${topClothes.id}.jpg`)).filename;
      
      if (bottomClothes) {
        // 上传下衣图片
        bottomFilename = (await uploadToRunningHub(bottomClothes.imageUrl, 'clothes', `bottom_${bottomClothes.id}.jpg`)).filename;
      }
    } catch (uploadError) {
      console.error('上传衣服图片到RunningHub失败:', uploadError);
      return res.status(500).json({
        error: '衣服图片上传失败',
        message: uploadError.message
      });
    }

    // 更新任务信息
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        topClothesId: topClothesId,
        bottomClothesId: bottomClothesId,
        topClothesFilename: topFilename,
        bottomClothesFilename: bottomFilename,
        status: 'PROCESSING'
      }
    });

    // 启动RunningHub工作流
    try {
      const workflowId = bottomClothes ? '1965625784712970242' : '1957012453269889026';
      const runninghubTaskResult = await startRunningHubWorkflow({
        taskId: taskId,
        userPhotoFilename: task.userPhotoFilename,
        topClothesFilename: topFilename,
        bottomClothesFilename: bottomFilename,
        workflowId: workflowId
      });

      if (!runninghubTaskResult.success) {
        throw new Error(runninghubTaskResult.error || '启动工作流失败');
      }

      // 更新RunningHub任务ID
      await prisma.task.update({
        where: { id: taskId },
        data: {
          runninghubTaskId: runninghubTaskResult.id,
          workflowId: workflowId
        }
      });

      res.json({
        success: true,
        data: {
          taskId: taskId,
          status: 'PROCESSING',
          runninghubTaskId: runninghubTaskResult.id,
          estimatedTime: runninghubTaskResult.estimatedTime || 300
        }
      });

    } catch (workflowError) {
      console.error('启动RunningHub工作流失败:', workflowError);
      
      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: 'FAILED',
          errorMessage: workflowError.message
        }
      });

      res.status(500).json({
        error: '启动试穿任务失败',
        message: workflowError.message
      });
    }

  } catch (error) {
    console.error('启动试穿任务错误:', error);
    res.status(500).json({ error: '启动试穿任务失败' });
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
        topClothes: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            youzanUrl: true
          }
        },
        bottomClothes: {
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

    // 构建衣服信息数组
    const clothes = [];
    if (task.topClothes) {
      clothes.push({ ...task.topClothes, type: 'top' });
    }
    if (task.bottomClothes) {
      clothes.push({ ...task.bottomClothes, type: 'bottom' });
    }

    res.json({
      success: true,
      data: {
        id: task.id,
        status: task.status,
        resultUrl: task.resultUrl,
        errorMessage: task.errorMessage,
        clothes: clothes,
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

// 上传文件到 RunningHub
async function uploadToRunningHub(fileInput, fileType = 'user_photo', originalName = 'image.jpg', mimeType = 'image/jpeg') {
  try {
    const FormData = require('form-data');
    const fs = require('fs');
    const path = require('path');
    
    if (!process.env.RUNNINGHUB_API_KEY) {
      throw new Error('请先配置RunningHub API Key');
    }
    
    let fileBuffer;
    let fileName = originalName || 'image.jpg';
    
    const inferMime = (name) => {
      const ext = path.extname(name).toLowerCase();
      switch (ext) {
        case '.jpg':
        case '.jpeg':
          return 'image/jpeg';
        case '.png':
          return 'image/png';
        case '.webp':
          return 'image/webp';
        default:
          return 'application/octet-stream';
      }
    };
    
    if (Buffer.isBuffer(fileInput)) {
      // 直接传入的Buffer
      fileBuffer = fileInput;
      if (!mimeType) {
        mimeType = inferMime(fileName);
      }
    } else if (typeof fileInput === 'string' && fileInput.startsWith('data:')) {
      // data URL -> Buffer
      const base64Data = fileInput.replace(/^data:image\/\w+;base64,/, '');
      fileBuffer = Buffer.from(base64Data, 'base64');
      mimeType = fileInput.match(/^data:(image\/\w+);base64,/)?.[1] || mimeType;
      fileName = `image_${Date.now()}.${mimeType.includes('png') ? 'png' : (mimeType.includes('webp') ? 'webp' : 'jpg')}`;
    } else if (/^https?:\/\//i.test(fileInput)) {
      // 远程URL先下载
      const response = await axios.get(fileInput, { responseType: 'arraybuffer' });
      fileBuffer = Buffer.from(response.data);
      fileName = path.basename(new URL(fileInput).pathname) || fileName;
      mimeType = response.headers['content-type'] || inferMime(fileName);
    } else {
      // 本地文件路径
      const resolvedPath = path.isAbsolute(fileInput) ? fileInput : path.resolve(process.cwd(), fileInput);
      if (fs.existsSync(resolvedPath)) {
        fileBuffer = fs.readFileSync(resolvedPath);
        fileName = path.basename(resolvedPath);
        mimeType = inferMime(fileName);
      } else {
        throw new Error(`文件不存在: ${resolvedPath}`);
      }
    }
    
    // 构造 FormData
    const formData = new FormData();
    formData.append('apiKey', process.env.RUNNINGHUB_API_KEY);
    formData.append('file', fileBuffer, {
      filename: fileName,
      contentType: mimeType
    });
    formData.append('fileType', 'image');
    
    const baseUrl = (process.env.RUNNINGHUB_BASE_URL || 'https://www.runninghub.cn').replace(/\/$/, '');
    
    console.log('📤 上传图片到RunningHub:', {
      url: `${baseUrl}/task/openapi/upload`,
      fileName: fileName,
      fileSize: fileBuffer.length,
      mimeType: mimeType
    });
    
    // 发送请求
    const uploadResponse = await axios.post(`${baseUrl}/task/openapi/upload`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Host': new URL(baseUrl).hostname
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    
    console.log('📥 RunningHub上传响应:', uploadResponse.data);
    
    if (uploadResponse.data.code === 0 && uploadResponse.data.data) {
      const filename = uploadResponse.data.data.fileName;
      console.log('✅ 上传成功，文件名:', filename);
      return {
        success: true,
        filename: filename
      };
    } else {
      const errorMsg = uploadResponse.data.msg || uploadResponse.data.message || '上传失败';
      console.error('❌ 上传失败:', errorMsg);
      throw new Error(errorMsg);
    }
    
  } catch (error) {
    console.error('❌ RunningHub 文件上传失败:', error.message);
    throw new Error(`RunningHub 文件上传失败: ${error.message}`);
  }
}

// 启动 RunningHub 工作流
async function startRunningHubWorkflow({ taskId, userPhotoFilename, topClothesFilename, bottomClothesFilename, workflowId }) {
  try {
    if (!process.env.RUNNINGHUB_API_KEY) {
      throw new Error('请先配置RunningHub API Key');
    }
    
    // 构造nodeInfoList
    const nodeInfoList = [
      {
        nodeId: "254", // 用户照片输入节点
        fieldName: "image",
        fieldValue: userPhotoFilename
      }
    ];
    
    // 根据上传的服装类型添加对应的节点
    if (topClothesFilename) {
      // 上衣：nodeId为253
      nodeInfoList.push({
        nodeId: "253",
        fieldName: "image",
        fieldValue: topClothesFilename
      });
    }
    
    if (bottomClothesFilename) {
      // 下衣：nodeId为300
      nodeInfoList.push({
        nodeId: "300",
        fieldName: "image",
        fieldValue: bottomClothesFilename
      });
    }
    
    const requestData = {
      apiKey: process.env.RUNNINGHUB_API_KEY,
      workflowId: workflowId,
      nodeInfoList: nodeInfoList
    };
    
    const baseUrl = (process.env.RUNNINGHUB_BASE_URL || 'https://www.runninghub.cn').replace(/\/$/, '');
    
    console.log('🚀 启动RunningHub工作流:', {
      url: `${baseUrl}/task/openapi/create`,
      workflowId: workflowId,
      nodeInfoList: nodeInfoList
    });
    
    const response = await axios.post(`${baseUrl}/task/openapi/create`, requestData, {
      headers: {
        'Content-Type': 'application/json',
        'Host': new URL(baseUrl).hostname
      }
    });
    
    console.log('📥 RunningHub工作流响应:', response.data);
    
    if (response.data.code === 0 && response.data.data) {
      const runninghubTaskId = response.data.data.taskId;
      const taskStatus = response.data.data.taskStatus;
      
      console.log('✅ 工作流启动成功:', {
        runninghubTaskId: runninghubTaskId,
        taskStatus: taskStatus
      });
      
      return {
        success: true,
        id: runninghubTaskId,
        status: taskStatus,
        estimatedTime: 300 // 预估5分钟
      };
    } else {
      const errorMsg = response.data.msg || response.data.message || '启动工作流失败';
      console.error('❌ 工作流启动失败:', errorMsg);
      throw new Error(errorMsg);
    }
    
  } catch (error) {
    console.error('❌ RunningHub 工作流启动失败:', error.message);
    throw new Error(`RunningHub 工作流启动失败: ${error.message}`);
  }
}

// 查询 RunningHub 任务状态
async function getRunningHubTaskStatus(runninghubTaskId) {
  try {
    if (!process.env.RUNNINGHUB_API_KEY) {
      throw new Error('请先配置RunningHub API Key');
    }
    
    const baseUrl = (process.env.RUNNINGHUB_BASE_URL || 'https://www.runninghub.cn').replace(/\/$/, '');
    
    const requestData = {
      apiKey: process.env.RUNNINGHUB_API_KEY,
      taskId: runninghubTaskId
    };
    
    console.log('🔍 查询RunningHub任务状态:', {
      url: `${baseUrl}/task/openapi/status`,
      taskId: runninghubTaskId
    });
    
    const response = await axios.post(`${baseUrl}/task/openapi/status`, requestData, {
      headers: {
        'Content-Type': 'application/json',
        'Host': new URL(baseUrl).hostname
      }
    });
    
    console.log('📥 RunningHub状态查询响应:', response.data);
    
    if (response.data.code === 0 && response.data.data) {
      const taskStatus = response.data.data.taskStatus;
      console.log('📊 任务状态:', taskStatus);
      
      return {
        success: true,
        status: taskStatus,
        data: response.data.data
      };
    } else {
      const errorMsg = response.data.msg || response.data.message || '查询任务状态失败';
      console.error('❌ 状态查询失败:', errorMsg);
      throw new Error(errorMsg);
    }
    
  } catch (error) {
    console.error('❌ 查询 RunningHub 任务状态失败:', error.message);
    throw new Error(`查询 RunningHub 任务状态失败: ${error.message}`);
  }
}

// 获取 RunningHub 任务结果
async function getRunningHubTaskResult(runninghubTaskId) {
  try {
    if (!process.env.RUNNINGHUB_API_KEY) {
      throw new Error('请先配置RunningHub API Key');
    }
    
    const baseUrl = (process.env.RUNNINGHUB_BASE_URL || 'https://www.runninghub.cn').replace(/\/$/, '');
    
    const requestData = {
      apiKey: process.env.RUNNINGHUB_API_KEY,
      taskId: runninghubTaskId
    };
    
    console.log('🎯 获取RunningHub任务结果:', {
      url: `${baseUrl}/task/openapi/outputs`,
      taskId: runninghubTaskId
    });
    
    const response = await axios.post(`${baseUrl}/task/openapi/outputs`, requestData, {
      headers: {
        'Content-Type': 'application/json',
        'Host': new URL(baseUrl).hostname
      }
    });
    
    console.log('📥 RunningHub结果响应:', response.data);
    
    if (response.data.code === 0 && response.data.data && response.data.data.length > 0) {
      const resultUrl = response.data.data[0].fileUrl;
      console.log('✅ 获取结果成功:', resultUrl);
      
      return {
        success: true,
        resultUrl: resultUrl,
        data: response.data.data
      };
    } else {
      const errorMsg = response.data.msg || response.data.message || '获取任务结果失败';
      console.error('❌ 结果获取失败:', errorMsg);
      throw new Error(errorMsg);
    }
    
  } catch (error) {
    console.error('❌ 获取 RunningHub 任务结果失败:', error.message);
    throw new Error(`获取 RunningHub 任务结果失败: ${error.message}`);
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

// 任务状态轮询函数（每5秒执行一次）
async function pollTaskStatus() {
  try {
    const processingTasks = await prisma.task.findMany({
      where: {
        status: 'PROCESSING',
        runninghubTaskId: { not: null }
      },
      include: {
        topClothes: true,
        bottomClothes: true
      }
    });

    for (const task of processingTasks) {
      try {
        const statusResult = await getRunningHubTaskStatus(task.runninghubTaskId);
        
        if (statusResult.success) {
          const taskStatus = statusResult.status;
          
          if (taskStatus === 'SUCCESS') {
            // 获取任务结果
            const result = await getRunningHubTaskResult(task.runninghubTaskId);
            
            if (result.success) {
              // 更新任务状态和结果
              await prisma.task.update({
                where: { id: task.id },
                data: {
                  status: 'COMPLETED',
                  resultUrl: result.resultUrl,
                  updatedAt: new Date()
                }
              });
              
              console.log(`✅ 任务 ${task.id} 已完成，结果URL: ${result.resultUrl}`);
            }
            
          } else if (taskStatus === 'FAILED') {
            // 更新任务状态为失败
            await prisma.task.update({
              where: { id: task.id },
              data: {
                status: 'FAILED',
                errorMessage: statusResult.data?.errorMessage || '任务处理失败',
                updatedAt: new Date()
              }
            });
            
            console.log(`❌ 任务 ${task.id} 失败: ${statusResult.data?.errorMessage || '任务处理失败'}`);
          }
          // 其他状态（RUNNING、QUEUED、PENDING）保持不变
          
        }
        
      } catch (error) {
        console.error(`❌ 轮询任务 ${task.id} 状态失败:`, error.message);
      }
    }
  } catch (error) {
    console.error('❌ 任务状态轮询错误:', error);
  }
}

// 启动轮询定时器（每5秒执行一次）
setInterval(pollTaskStatus, 5000);

module.exports = router;
