# 本地调试指南

## 🎯 本地调试模式

当腾讯云COS配置不存在时，系统会自动切换到本地调试模式，使用本地文件存储代替云端存储。

## 🔧 配置说明

### 环境变量配置

复制 `.env.example` 为 `.env` 并配置：

```env
# 基础配置
NODE_ENV=development
PORT=4001

# JWT配置（必填）
JWT_SECRET=your-local-jwt-secret-key

# 数据库配置（可选，如果不配置数据库，部分功能可能受限）
DATABASE_URL=postgresql://username:password@localhost:5432/clothing_space_capsule

# 腾讯云COS配置（可选，不配置则使用本地存储）
# COS_SECRET_ID=your-cos-secret-id
# COS_SECRET_KEY=your-cos-secret-key
# COS_BUCKET=your-cos-bucket
# COS_REGION=ap-guangzhou

# 其他服务配置（可选）
WECHAT_APP_ID=your-wechat-app-id
WECHAT_APP_SECRET=your-wechat-app-secret
RUNNINGHUB_API_KEY=your-runninghub-api-key
```

## 🚀 启动本地服务

### 方法1: 使用 npm 脚本

```bash
# 进入api-server目录
cd api-server

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 方法2: 使用 Docker

```bash
# 使用开发环境Docker部署
./deploy/docker/deploy.sh dev
```

## 📁 文件存储

### 本地存储路径
- 上传文件保存在 `uploads/` 目录
- 文件访问URL: `http://localhost:4001/uploads/photos/{deviceId}/{filename}`

### 目录结构
```
uploads/
├── photos/
│   └── {deviceId}/
│       ├── photo-1234567890.jpg
│       └── photo-1234567891.png
```

## 🌐 API 接口

### 上传文件
```bash
POST /api/upload/photo
Content-Type: multipart/form-data

# 响应示例（本地模式）
{
  "success": true,
  "data": {
    "fileName": "photo-1234567890.jpg",
    "url": "/uploads/photos/device123/photo-1234567890.jpg",
    "size": 1024000,
    "uploadedAt": "2025-01-11T08:00:00.000Z"
  }
}
```

### 获取文件列表
```bash
GET /api/upload/photos

# 响应示例（本地模式）
{
  "success": true,
  "data": [
    {
      "fileName": "photo-1234567890.jpg",
      "url": "/uploads/photos/device123/photo-1234567890.jpg",
      "size": 1024000,
      "lastModified": "2025-01-11T08:00:00.000Z"
    }
  ]
}
```

## 🔍 调试技巧

### 1. 查看环境配置
```bash
# 检查环境变量配置
npm run check-env

# 或者直接访问
curl http://localhost:4001/health
```

### 2. 文件上传测试
```bash
# 使用curl测试文件上传
curl -X POST http://localhost:4001/api/upload/photo \
  -H "Authorization: Bearer your-jwt-token" \
  -F "photo=@/path/to/your/image.jpg"
```

### 3. 查看上传的文件
```bash
# 查看uploads目录
ls -la uploads/

# 查看具体设备的上传文件
ls -la uploads/photos/device123/
```

## ⚠️ 注意事项

### 1. 文件权限
确保应用有写入 `uploads/` 目录的权限：
```bash
chmod -R 755 uploads/
```

### 2. 存储限制
- 本地存储没有大小限制，但会占用本地磁盘空间
- 生产环境建议使用腾讯云COS

### 3. 跨域访问
如果前端运行在不同端口，确保CORS配置正确：
```javascript
// 前端配置
const API_BASE = 'http://localhost:4001';
```

### 4. 数据库连接
如果未配置数据库连接：
- 用户认证功能可能受限
- 文件元数据不会持久化存储
- 重启服务后上传记录会丢失

## 🐛 常见问题

### Q: 上传文件失败
**A:** 检查 `uploads/` 目录权限：
```bash
chmod 755 uploads/
```

### Q: 无法访问上传的文件
**A:** 确保静态文件服务已启用，检查app.js中的配置。

### Q: 如何切换回COS存储？
**A:** 在 `.env` 文件中配置COS相关环境变量并重启服务。

### Q: 文件上传成功但返回404
**A:** 检查静态文件服务中间件是否在路由之前加载。

## 📊 监控和日志

### 查看服务日志
```bash
# 开发模式
npm run dev  # 查看控制台输出

# Docker模式
docker-compose logs api-server
```

### 调试输出
系统会在启动时显示当前存储模式：
```
✅ 腾讯云COS已配置，使用云端存储
```
或
```
⚠️  腾讯云COS未配置，使用本地文件存储（调试模式）
```

## 🔄 切换到生产环境

当准备好部署到生产环境时：

1. 配置COS环境变量
2. 重新启动服务
3. 系统会自动切换到云端存储

```bash
# 生产环境部署
./deploy/docker/deploy.sh prod
```

---

**最后更新**: 2025年1月11日  
**版本**: v1.0.0