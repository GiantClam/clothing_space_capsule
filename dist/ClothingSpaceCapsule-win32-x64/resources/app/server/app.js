const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const baseConfig = require('../config');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// 运行时配置文件路径
const runtimeConfigPath = path.join(__dirname, '../config.runtime.json');

function loadRuntimeConfig() {
    try {
        if (fs.existsSync(runtimeConfigPath)) {
            const raw = fs.readFileSync(runtimeConfigPath, 'utf-8');
            return JSON.parse(raw);
        }
    } catch (e) {
        console.error('读取运行时配置失败:', e);
    }
    return {};
}

function getEffectiveConfig() {
    const runtime = loadRuntimeConfig();
    // 只暴露与编辑必要字段（避免把所有内容都暴露到前端）
    const safe = {
        runninghub: {
            apiKey: runtime.runninghub?.apiKey || baseConfig.runninghub.apiKey,
            baseUrl: runtime.runninghub?.baseUrl || baseConfig.runninghub.baseUrl,
            singleItemWorkflowId: runtime.runninghub?.singleItemWorkflowId || baseConfig.runninghub.singleItemWorkflowId,
            topBottomWorkflowId: runtime.runninghub?.topBottomWorkflowId || baseConfig.runninghub.topBottomWorkflowId
        },
        wechat: {
            appId: runtime.wechat?.appId || baseConfig.wechat.appId,
            appSecret: runtime.wechat?.appSecret || baseConfig.wechat.appSecret,
            token: runtime.wechat?.token || baseConfig.wechat.token,
            encodingAESKey: runtime.wechat?.encodingAESKey || baseConfig.wechat.encodingAESKey
        },
        server: {
            port: runtime.server?.port || baseConfig.server.port,
            host: runtime.server?.host || baseConfig.server.host
        }
    };
    return safe;
}

// 配置文件上传
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 限制10MB
    },
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('只允许上传图片文件'));
        }
    }
});

// 模拟任务存储
let tasks = new Map();
let taskCounter = 1;

// 路由

// 1. 上传照片
app.post('/upload-photo', upload.single('photo'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: '没有上传文件'
            });
        }

        const fileName = req.file.filename;
        const filePath = req.file.path;

        res.json({
            success: true,
            fileName: fileName,
            filePath: filePath,
            message: '照片上传成功'
        });
    } catch (error) {
        console.error('上传照片错误:', error);
        res.status(500).json({
            success: false,
            error: '上传失败: ' + error.message
        });
    }
});

// 2. 创建试衣任务
app.post('/create-fitting-task', (req, res) => {
    try {
        const { userPhotoPath, selectedClothing, openid } = req.body;

        if (!userPhotoPath || !selectedClothing || !openid) {
            return res.status(400).json({
                success: false,
                error: '缺少必要参数'
            });
        }

        const taskId = `task_${taskCounter++}`;
        const task = {
            taskId: taskId,
            userPhotoPath: userPhotoPath,
            selectedClothing: selectedClothing,
            openid: openid,
            status: 'QUEUED',
            createdAt: new Date(),
            result: null
        };

        tasks.set(taskId, task);

        // 模拟任务处理
        setTimeout(() => {
            task.status = 'RUNNING';
            setTimeout(() => {
                task.status = 'COMPLETED';
                task.result = {
                    imageUrl: `https://via.placeholder.com/400x600/667eea/ffffff?text=试衣效果-${selectedClothing.name}`,
                    style: '时尚风格',
                    confidence: 0.95
                };
            }, 3000);
        }, 2000);

        res.json({
            success: true,
            taskId: taskId,
            taskStatus: task.status,
            message: '任务创建成功'
        });
    } catch (error) {
        console.error('创建任务错误:', error);
        res.status(500).json({
            success: false,
            error: '创建任务失败: ' + error.message
        });
    }
});

// 3. 查询任务状态
app.post('/query-task-status', (req, res) => {
    try {
        const { taskId } = req.body;

        if (!taskId) {
            return res.status(400).json({
                code: -1,
                error: '缺少任务ID'
            });
        }

        const task = tasks.get(taskId);
        if (!task) {
            return res.status(404).json({
                code: -1,
                error: '任务不存在'
            });
        }

        res.json({
            code: 0,
            data: {
                taskId: task.taskId,
                taskStatus: task.status,
                result: task.result
            }
        });
    } catch (error) {
        console.error('查询任务状态错误:', error);
        res.status(500).json({
            code: -1,
            error: '查询失败: ' + error.message
        });
    }
});

// 4. 获取任务结果
app.post('/get-task-result', (req, res) => {
    try {
        const { taskId } = req.body;

        if (!taskId) {
            return res.status(400).json({
                success: false,
                error: '缺少任务ID'
            });
        }

        const task = tasks.get(taskId);
        if (!task) {
            return res.status(404).json({
                success: false,
                error: '任务不存在'
            });
        }

        if (task.status !== 'COMPLETED') {
            return res.status(400).json({
                success: false,
                error: '任务尚未完成'
            });
        }

        res.json({
            success: true,
            imageUrl: task.result.imageUrl,
            style: task.result.style,
            confidence: task.result.confidence
        });
    } catch (error) {
        console.error('获取任务结果错误:', error);
        res.status(500).json({
            success: false,
            error: '获取结果失败: ' + error.message
        });
    }
});

// 5. 生成下载二维码
app.post('/generate-download-qr', async (req, res) => {
    try {
        const { imageUrl, clothingInfo, openid } = req.body;

        if (!imageUrl || !clothingInfo || !openid) {
            return res.status(400).json({
                success: false,
                error: '缺少必要参数'
            });
        }

        // 生成二维码数据
        const qrData = {
            imageUrl: imageUrl,
            clothingInfo: clothingInfo,
            openid: openid,
            timestamp: Date.now()
        };

        // 生成二维码
        const qrCode = await QRCode.toDataURL(JSON.stringify(qrData), {
            width: 200,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });

        res.json({
            success: true,
            qrCode: qrCode,
            message: '二维码生成成功'
        });
    } catch (error) {
        console.error('生成二维码错误:', error);
        res.status(500).json({
            success: false,
            error: '生成二维码失败: ' + error.message
        });
    }
});

// 6. 健康检查
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// 7. 获取所有任务（调试用）
app.get('/tasks', (req, res) => {
    const taskList = Array.from(tasks.values());
    res.json({
        success: true,
        tasks: taskList,
        count: taskList.length
    });
});

// 8. 关闭服务（开发模式用）
app.post('/shutdown', (req, res) => {
    res.json({ success: true, message: '服务器即将关闭' });
    // 给响应留出发送时间
    setTimeout(() => {
        process.exit(0);
    }, 50);
});

// 8. 配置读取
app.get('/config', (req, res) => {
    try {
        const cfg = getEffectiveConfig();
        res.json({ success: true, config: cfg });
    } catch (e) {
        res.status(500).json({ success: false, error: '读取配置失败: ' + e.message });
    }
});

// 9. 配置更新（持久化到 config.runtime.json）
app.post('/config', (req, res) => {
    try {
        const incoming = req.body || {};
        const current = loadRuntimeConfig();
        const merged = {
            runninghub: { ...(current.runninghub || {}), ...(incoming.runninghub || {}) },
            wechat: { ...(current.wechat || {}), ...(incoming.wechat || {}) },
            server: { ...(current.server || {}), ...(incoming.server || {}) }
        };
        fs.writeFileSync(runtimeConfigPath, JSON.stringify(merged, null, 2), 'utf-8');
        res.json({ success: true, message: '配置已更新', config: getEffectiveConfig() });
    } catch (e) {
        console.error('更新配置失败:', e);
        res.status(500).json({ success: false, error: '更新配置失败: ' + e.message });
    }
});

// 错误处理中间件
app.use((error, req, res, next) => {
    console.error('服务器错误:', error);
    res.status(500).json({
        success: false,
        error: '服务器内部错误: ' + error.message
    });
});

// 404处理
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: '接口不存在'
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`🚀 衣等舱服务器已启动`);
    console.log(`📍 服务地址: http://localhost:${PORT}`);
    console.log(`⏰ 启动时间: ${new Date().toLocaleString()}`);
    console.log(`📁 上传目录: ${path.join(__dirname, '../uploads')}`);
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n🛑 正在关闭服务器...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 正在关闭服务器...');
    process.exit(0);
});
