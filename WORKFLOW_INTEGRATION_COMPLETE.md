# 流程调整完成 - 测试指南

## 🎯 调整总结

根据您的要求，我已经完成了Electron客户端和API-server的全面调整，将试衣功能从客户端完全迁移到服务端。

## 📋 主要改动

### API-Server 改动 (已完成)
1. ✅ **照片上传接口改进** - `POST /api/tasks/upload-photo`
   - 现在接收文件形式的照片而非URL
   - 自动上传到RunningHub并创建任务记录
   - 返回任务ID供后续使用

2. ✅ **衣服信息接口完善** - `GET /api/clothes/categories`
   - 提供完整的衣服分类和信息
   - 支持按分类获取衣服列表

3. ✅ **试穿接口增强** - `POST /api/tasks/start-tryon`
   - 支持上衣ID（必填）和下衣ID（可选）
   - 根据衣服组合自动选择工作流
   - 自动上传衣服图片到RunningHub

4. ✅ **任务状态轮询** - 每5秒自動轮询
   - 监控所有进行中的任务
   - 自动获取结果并更新状态

5. ✅ **任务状态查询** - `GET /api/tasks/:taskId`
   - 支持客户端轮询任务状态
   - 返回完整的任务信息和结果

### 客户端改动 (已完成)
1. ✅ **拍照上传逻辑调整**
   - 上传照片到API-server并自动创建任务
   - 保存任务ID供后续使用
   - 保持向后兼容

2. ✅ **衣服展示优化**
   - 优先从API-server获取衣服数据
   - 失败时回退到本地数据

3. ✅ **试穿流程重构**
   - 优先使用API-server任务管理
   - 支持上衣+下衣组合选择
   - 保持现有衣服分类互斥逻辑

4. ✅ **客户端轮询**
   - 每5秒查询任务状态
   - 任务完成时显示结果

## 🚀 测试流程

### 1. 启动服务

#### 启动API-Server
```bash
cd api-server
# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，设置必要的配置

# 安装依赖（如果还没有）
npm install

# 启动数据库
npm run db:start

# 运行数据库迁移
npm run db:migrate

# 初始化种子数据
npm run db:seed

# 启动API服务器
npm start
```

#### 启动Electron应用
```bash
# 在项目根目录
npm install
npm start
```

### 2. 完整测试流程

#### 第一步：设备认证（如果启用）
- 应用启动时会尝试进行设备认证
- 如果API-server可用，会获取JWT令牌

#### 第二步：拍照上传
1. 点击"拍照"按钮
2. 拍摄全身照
3. 点击"生成效果"
4. **新流程**：
   - 照片直接上传到API-server
   - API-server上传到RunningHub
   - 创建任务记录并返回任务ID
   - 跳转到衣服选择页面

#### 第三步：选择衣服
1. 选择性别（男装/女装）
2. 选择分类：
   - **上衣+下衣模式**：可以选择上衣和下衣
   - **裙子模式**：选择连衣裙
3. **新逻辑**：衣服数据从API-server获取，显示ID、URL、名称等信息

#### 第四步：开始试穿
1. 点击"开始试穿"
2. **新流程**：
   - 发送任务ID和选中的衣服ID到API-server
   - API-server上传衣服图片到RunningHub
   - 根据选择自动调用对应工作流：
     - 仅上衣/裙子：工作流 `your_single_item_workflow_id`
     - 上衣+下衣：工作流 `your_top_bottom_workflow_id`
   - 返回RunningHub任务ID

#### 第五步：状态监控
1. **服务端轮询**：API-server每5秒查询RunningHub任务状态
2. **客户端轮询**：客户端每5秒查询API-server任务状态
3. 显示进度：排队中 → 处理中 → 完成
4. 任务完成后显示合成图片

## ⚙️ 配置要求

### 必需配置
```env
# API-server/.env
RUNNINGHUB_API_KEY="你的RunningHub API密钥"
RUNNINGHUB_BASE_URL="https://www.runninghub.cn"
DATABASE_URL="postgresql://用户名:密码@localhost:5432/数据库名"
JWT_SECRET="JWT密钥"
PORT=4002
```

### 工作流ID
- **单件工作流**：`your_single_item_workflow_id` （裙子或单上衣）
- **组合工作流**：`your_top_bottom_workflow_id` （上衣+下衣）

## 🔧 故障排除

### 1. API-server连接失败
- 检查API-server是否启动在端口4002
- 检查.env配置是否正确
- 查看API-server日志

### 2. RunningHub上传失败
- 检查RUNNINGHUB_API_KEY是否有效
- 检查网络连接
- 查看API-server日志中的详细错误

### 3. 任务一直处于PENDING状态
- 检查RunningHub工作流ID是否正确
- 检查RunningHub账户余额和权限
- 查看API-server轮询日志

### 4. 客户端回退到本地模式
- 这是正常的向后兼容行为
- 表示API-server不可用，使用原有的直接调用模式

## 📝 API接口文档

### 照片上传创建任务
```
POST /api/tasks/upload-photo
Content-Type: multipart/form-data
Authorization: Bearer <jwt_token>

FormData:
- photo: File (图片文件)

Response:
{
  "success": true,
  "data": {
    "taskId": "任务ID"
  }
}
```

### 启动试穿任务
```
POST /api/tasks/start-tryon
Content-Type: application/json
Authorization: Bearer <jwt_token>

Body:
{
  "taskId": "任务ID",
  "topClothesId": "上衣ID", // 必填
  "bottomClothesId": "下衣ID" // 可选
}

Response:
{
  "success": true,
  "data": {
    "taskId": "任务ID",
    "status": "PROCESSING",
    "runninghubTaskId": "RunningHub任务ID",
    "estimatedTime": 300
  }
}
```

### 查询任务状态
```
GET /api/tasks/:taskId
Authorization: Bearer <jwt_token>

Response:
{
  "success": true,
  "data": {
    "id": "任务ID",
    "status": "COMPLETED",
    "resultUrl": "结果图片URL",
    "clothes": [
      {
        "id": "衣服ID",
        "name": "衣服名称",
        "imageUrl": "衣服图片URL",
        "type": "top"
      }
    ]
  }
}
```

## ✅ 验证清单

- [ ] API-server成功启动
- [ ] 数据库连接正常
- [ ] RunningHub API密钥配置正确
- [ ] 客户端可以连接到API-server
- [ ] 拍照上传功能正常
- [ ] 衣服数据正确加载
- [ ] 试穿任务可以成功启动
- [ ] 任务状态轮询正常工作
- [ ] 结果图片正确显示

流程调整已全部完成！🎉