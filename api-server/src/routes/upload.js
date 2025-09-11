const express = require('express');
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');
const { authenticateDevice } = require('./auth');
const COS = require('cos-nodejs-sdk-v5');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const prisma = new PrismaClient();

// 检查是否配置了COS，如果没有则使用本地调试模式
const hasCOSConfig = process.env.COS_SECRET_ID && process.env.COS_SECRET_KEY && process.env.COS_BUCKET && process.env.COS_REGION;

// 初始化腾讯云 COS（仅在配置了COS时使用）
let cos = null;
if (hasCOSConfig) {
  cos = new COS({
    SecretId: process.env.COS_SECRET_ID,
    SecretKey: process.env.COS_SECRET_KEY,
  });
  console.log('✅ 腾讯云COS已配置，使用云端存储');
} else {
  console.log('⚠️  腾讯云COS未配置，使用本地文件存储（调试模式）');
}

// 配置 multer 用于文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `photo-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('只支持 jpeg, jpg, png, webp 格式的图片'));
    }
  }
});

// 上传用户照片
router.post('/photo', authenticateDevice, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择要上传的图片' });
    }

    const deviceId = req.device.id;
    const filePath = req.file.path;
    const fileName = req.file.filename;

    // 上传到腾讯云 COS
    const cosKey = `photos/${deviceId}/${fileName}`;
    const cosUrl = await uploadToCOS(filePath, cosKey);

    // 删除本地临时文件
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      data: {
        fileName,
        url: cosUrl,
        size: req.file.size,
        uploadedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('上传照片错误:', error);
    
    // 清理临时文件
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ 
      error: '上传照片失败',
      message: error.message 
    });
  }
});

// 批量上传照片
router.post('/photos', authenticateDevice, upload.array('photos', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: '请选择要上传的图片' });
    }

    const deviceId = req.device.id;
    const results = [];

    for (const file of req.files) {
      try {
        const cosKey = `photos/${deviceId}/${file.filename}`;
        const cosUrl = await uploadToCOS(file.path, cosKey);
        
        results.push({
          fileName: file.filename,
          url: cosUrl,
          size: file.size,
          uploadedAt: new Date().toISOString()
        });

        // 删除本地临时文件
        fs.unlinkSync(file.path);
      } catch (error) {
        console.error(`上传文件 ${file.filename} 失败:`, error);
        // 清理临时文件
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }
    }

    res.json({
      success: true,
      data: {
        uploaded: results,
        total: req.files.length,
        success: results.length
      }
    });

  } catch (error) {
    console.error('批量上传照片错误:', error);
    
    // 清理所有临时文件
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }

    res.status(500).json({ 
      error: '批量上传照片失败',
      message: error.message 
    });
  }
});

// 上传到腾讯云 COS
async function uploadToCOS(localFilePath, cosKey) {
  return new Promise((resolve, reject) => {
    if (!hasCOSConfig) {
      // 本地调试模式：将文件移动到本地uploads目录
      const localUploadPath = path.join('uploads', cosKey);
      const localUploadDir = path.dirname(localUploadPath);
      
      if (!fs.existsSync(localUploadDir)) {
        fs.mkdirSync(localUploadDir, { recursive: true });
      }
      
      fs.rename(localFilePath, localUploadPath, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(`/uploads/${cosKey}`);
        }
      });
      return;
    }

    cos.putObject({
      Bucket: process.env.COS_BUCKET,
      Region: process.env.COS_REGION,
      Key: cosKey,
      Body: fs.createReadStream(localFilePath),
    }, (err, data) => {
      if (err) {
        reject(err);
      } else {
        // 返回完整的访问 URL
        const url = `https://${data.Location}`;
        resolve(url);
      }
    });
  });
}

// 删除照片
router.delete('/photo/:fileName', authenticateDevice, async (req, res) => {
  try {
    const { fileName } = req.params;
    const deviceId = req.device.id;
    const cosKey = `photos/${deviceId}/${fileName}`;

    if (!hasCOSConfig) {
      // 本地调试模式：删除本地文件
      const localFilePath = path.join('uploads', cosKey);
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
      }
    } else {
      // 从 COS 删除文件
      await new Promise((resolve, reject) => {
        cos.deleteObject({
          Bucket: process.env.COS_BUCKET,
          Region: process.env.COS_REGION,
          Key: cosKey,
        }, (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
      });
    }

    res.json({
      success: true,
      message: '照片删除成功'
    });

  } catch (error) {
    console.error('删除照片错误:', error);
    res.status(500).json({ 
      error: '删除照片失败',
      message: error.message 
    });
  }
});

// 获取用户照片列表
router.get('/photos', authenticateDevice, async (req, res) => {
  try {
    const deviceId = req.device.id;
    const cosKeyPrefix = `photos/${deviceId}/`;

    let photos = [];

    if (!hasCOSConfig) {
      // 本地调试模式：读取本地文件
      const localDir = path.join('uploads', cosKeyPrefix);
      if (fs.existsSync(localDir)) {
        const files = fs.readdirSync(localDir);
        photos = files.map(fileName => {
          const filePath = path.join(localDir, fileName);
          const stats = fs.statSync(filePath);
          return {
            fileName: fileName,
            url: `/uploads/${cosKeyPrefix}${fileName}`,
            size: stats.size,
            lastModified: stats.mtime.toISOString()
          };
        });
      }
    } else {
      // 列出 COS 中的文件
      const files = await new Promise((resolve, reject) => {
        cos.getBucket({
          Bucket: process.env.COS_BUCKET,
          Region: process.env.COS_REGION,
          Prefix: cosKeyPrefix,
          MaxKeys: 100
        }, (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data.Contents || []);
          }
        });
      });

      photos = files.map(file => ({
        fileName: file.Key.split('/').pop(),
        url: `https://${process.env.COS_BUCKET}.cos.${process.env.COS_REGION}.myqcloud.com/${file.Key}`,
        size: file.Size,
        lastModified: file.LastModified
      }));
    }

    res.json({
      success: true,
      data: photos
    });

  } catch (error) {
    console.error('获取照片列表错误:', error);
    res.status(500).json({ 
      error: '获取照片列表失败',
      message: error.message 
    });
  }
});

module.exports = router;
