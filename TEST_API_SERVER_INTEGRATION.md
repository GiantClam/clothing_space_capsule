# API-Server 集成测试说明

## 修改内容总结

我已经成功修改了Electron客户端代码，确保它**强制使用API-server**进行试穿任务管理，不再直接调用RunningHub API。

### 主要修改：

#### 1. 强制API-server模式
- 修改了 `startFittingProcess()` 方法，移除了RunningHub回退逻辑
- 现在如果API-server不可用，会直接抛出错误而不是回退到直接调用RunningHub

#### 2. 禁用直接调用RunningHub的方法
以下方法已被标记为"已弃用"并抛出错误：
- `startLegacyRunningHubTask()` - 原有的RunningHub直接调用流程
- `startRunningHubTask()` - 启动RunningHub工作流任务  
- `pollRunningHubTaskStatus()` - 轮询RunningHub任务状态
- `queryRunningHubTaskStatus()` - 查询RunningHub任务状态
- `getRunningHubTaskResult()` - 获取RunningHub任务结果
- `uploadImageToRunningHub()` - 上传图片到RunningHub

#### 3. 修改照片上传流程
- `uploadPhotoToServer()` 方法中移除了对RunningHub的直接上传
- 现在只通过API-server上传照片并创建任务

## 测试步骤

### 前置条件
1. ✅ API-server 正在运行 (http://localhost:4001)
2. ✅ Electron 客户端已启动
3. ✅ 设备认证成功

### 测试流程
1. **拍摄/上传照片**
   - 拍摄照片后会自动裁剪为720x1024
   - 照片会上传到API-server并创建任务
   - 应该能看到任务ID被保存

2. **选择服装并开始试穿**
   - 选择服装后点击"开始试衣"
   - 客户端应该调用 `window.apiClient.startTryonTask()` 
   - **不应该**看到直接调用 `https://www.runninghub.cn/task/openapi/create` 的日志

3. **任务状态轮询**
   - 客户端应该调用 `window.apiClient.getTaskStatus()`
   - **不应该**看到直接调用 `https://www.runninghub.cn/task/openapi/status` 的日志

## 预期结果

### 成功情况（正确行为）
客户端日志应该显示：
```
🌐 使用 API-server 进行试穿任务管理（强制模式）
🚀 通过API-server启动试穿任务: {taskId: "xxx", topClothesId: "xxx"}  
✅ API Server 试穿任务启动成功
🔄 开始轮询 API Server 任务状态
```

### 失败情况（如果出现则表示修改未生效）
如果看到以下日志，说明客户端仍在直接调用RunningHub：
```
📤 启动任务请求数据: {url: 'https://www.runninghub.cn/task/openapi/create', ...}
📤 查询任务状态请求数据: {url: 'https://www.runninghub.cn/task/openapi/status', ...}
```

## 错误处理

如果API-server不可用，客户端现在会显示明确的错误信息：
- "API客户端未初始化或未认证，请先完成设备认证"
- "未找到任务ID，请重新上传照片"
- "试衣生成失败: [具体错误信息]"

## 验证方法

1. **检查控制台日志**：确认没有直接调用RunningHub URL的请求
2. **检查网络请求**：在DevTools的Network tab中，应该只看到对localhost:4001的请求
3. **功能测试**：完整的试穿流程应该正常工作，且全程通过API-server

## 架构优势

现在的架构更加清晰：
```
Electron客户端 → API-server → RunningHub
```

- **统一管理**：所有RunningHub交互都通过API-server统一管理
- **更好的错误处理**：API-server可以提供更友好的错误信息
- **缓存和优化**：API-server可以实现结果缓存和请求优化
- **安全性**：RunningHub API密钥只存储在服务端
- **可维护性**：客户端代码更简洁，业务逻辑集中在API-server

## 测试结果

✅ 代码修改完成
✅ 语法错误已修复
✅ 应用程序正常启动
🔄 需要用户进行功能测试验证

请按照上述测试步骤验证修改是否生效。如果发现客户端仍在直接调用RunningHub，请立即报告。