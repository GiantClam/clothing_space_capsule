# RunningHub API 集成指南

## 概述

衣等舱应用已成功集成RunningHub API，支持直接调用RunningHub的AI试衣工作流，无需本地服务器。

## 功能特性

- ✅ 直接上传图片到RunningHub
- ✅ 启动ComfyUI工作流任务
- ✅ 实时查询任务状态
- ✅ 自动获取生成结果
- ✅ 本地配置管理

## API 接口说明

### 1. 上传图片接口

**接口地址**: `https://www.runninghub.cn/resource/openapi/upload`

**请求方式**: `POST`

**请求头**:
```
Authorization: {your_api_key}
```

**请求体**: `FormData`
- `file`: 图片文件

**响应示例**:
```json
{
    "code": 0,
    "msg": "success",
    "data": [
        {
            "fileUrl": "https://rh-images.xiaoyaoyou.com/...",
            "fileType": "jpg"
        }
    ]
}
```

### 2. 启动工作流任务

**接口地址**: `https://www.runninghub.cn/task/openapi/create`

**请求方式**: `POST`

**请求头**:
```
Host: www.runninghub.cn
Content-Type: application/json
```

**请求体**:
```json
{
    "apiKey": "your_api_key",
    "workflowId": "your_workflow_id",
    "nodeInfoList": [
        {
            "nodeId": "1",
            "fieldName": "image",
            "fieldValue": "user_photo_url"
        },
        {
            "nodeId": "2",
            "fieldName": "image",
            "fieldValue": "clothing_photo_url"
        }
    ]
}
```

**响应示例**:
```json
{
    "code": 0,
    "msg": "success",
    "data": {
        "taskId": "1910246754753896450",
        "taskStatus": "QUEUED"
    }
}
```

### 3. 查询任务状态

**接口地址**: `https://www.runninghub.cn/task/openapi/status`

**请求方式**: `POST`

**请求体**:
```json
{
    "apiKey": "your_api_key",
    "taskId": "task_id"
}
```

**响应示例**:
```json
{
    "code": 0,
    "msg": "success",
    "data": {
        "taskStatus": "RUNNING"
    }
}
```

### 4. 获取任务结果

**接口地址**: `https://www.runninghub.cn/task/openapi/outputs`

**请求方式**: `POST`

**请求体**:
```json
{
    "apiKey": "your_api_key",
    "taskId": "task_id"
}
```

**响应示例**:
```json
{
    "code": 0,
    "msg": "success",
    "data": [
        {
            "fileUrl": "https://rh-images.xiaoyaoyou.com/...",
            "fileType": "png"
        }
    ]
}
```

## 配置说明

### 必需配置项

在应用配置页面中需要设置以下参数：

1. **API Key**: RunningHub的API密钥
2. **Base URL**: RunningHub的基础URL（默认：https://www.runninghub.cn）
3. **Workflow ID**: 试衣工作流的ID

### 配置步骤

1. 打开应用配置页面
2. 填写RunningHub相关配置
3. 点击保存配置
4. 配置将自动保存到本地存储

## 工作流程

### 1. 图片上传阶段
- 用户拍摄照片 → 上传到RunningHub
- 选择服装图片 → 上传到RunningHub
- 获取两个图片的URL

### 2. 任务启动阶段
- 构造工作流参数
- 调用启动任务接口
- 获取任务ID和初始状态

### 3. 状态监控阶段
- 每5秒查询一次任务状态
- 显示当前进度（排队中/运行中/完成/失败）
- 最多监控5分钟

### 4. 结果获取阶段
- 任务完成后获取结果图片URL
- 显示试衣效果
- 提供保存和重新选择选项

## 错误处理

### 常见错误及解决方案

1. **API Key无效**
   - 检查配置页面中的API Key是否正确
   - 确认API Key是否有效且未过期

2. **Workflow ID错误**
   - 确认工作流ID是否正确
   - 检查工作流是否已发布且可访问

3. **图片上传失败**
   - 检查网络连接
   - 确认图片格式是否支持（jpg, png, webp）
   - 检查图片大小是否超限

4. **任务执行失败**
   - 查看任务状态返回的错误信息
   - 检查工作流配置是否正确
   - 确认输入参数是否符合要求

## 技术实现

### 核心方法

- `uploadImageToRunningHub()`: 图片上传
- `startRunningHubTask()`: 启动任务
- `pollRunningHubTaskStatus()`: 状态轮询
- `queryRunningHubTaskStatus()`: 查询状态
- `getRunningHubTaskResult()`: 获取结果

### 配置管理

- `getConfig()`: 获取配置
- `setConfig()`: 设置配置
- 配置自动保存到localStorage

## 注意事项

1. **API调用频率**: 避免过于频繁的API调用，建议状态查询间隔不少于5秒
2. **错误重试**: 网络错误时建议实现指数退避重试机制
3. **配置安全**: API Key等敏感信息仅保存在本地，不会上传到外部服务器
4. **图片格式**: 支持jpg、png、webp等常见图片格式
5. **超时处理**: 任务监控有5分钟超时限制，超时后需要用户重新操作

## 更新日志

- **v1.0.0**: 初始版本，支持基本的RunningHub API集成
- 支持图片上传、任务启动、状态查询、结果获取等完整流程
- 本地配置管理，无需外部服务器
- 完整的错误处理和用户提示
