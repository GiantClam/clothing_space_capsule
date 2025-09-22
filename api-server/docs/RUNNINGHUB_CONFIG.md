# RunningHub API 配置指南

## 概述

本项目现在要求使用真实的 RunningHub API，不再支持模拟模式。请按照以下步骤配置 RunningHub API。

## 📋 必需的环境变量

在 `api-server/.env.local` 文件中配置以下环境变量（优先级最高）：

```env
# RunningHub API 配置
RUNNINGHUB_API_KEY="your_actual_runninghub_api_key_here"
RUNNINGHUB_BASE_URL="https://www.runninghub.cn"
SINGLE_ITEM_WORKFLOW_ID="your_single_item_workflow_id_here"
TOP_BOTTOM_WORKFLOW_ID="your_top_bottom_workflow_id_here"
```

> **注意**：系统会优先加载 `.env.local` 文件，如果不存在则使用 `.env` 文件作为备用。

### 环境变量说明

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `RUNNINGHUB_API_KEY` | RunningHub API 密钥 | `rh_xxxxxxxxxxxxxx` |
| `RUNNINGHUB_BASE_URL` | RunningHub API 基础URL | `https://www.runninghub.cn` |
| `SINGLE_ITEM_WORKFLOW_ID` | 单品试穿工作流ID（裙子或单上衣） | `your_single_item_workflow_id` |
| `TOP_BOTTOM_WORKFLOW_ID` | 上下装试穿工作流ID（上衣+下衣） | `your_top_bottom_workflow_id` |

## 🔧 配置步骤

### 1. 获取 RunningHub API Key

1. 访问 [RunningHub 官网](https://www.runninghub.cn)
2. 注册账号并登录
3. 在控制台中获取 API Key
4. 确保 API Key 有以下权限：
   - 文件上传权限
   - 工作流执行权限
   - 任务状态查询权限

### 2. 获取工作流ID

1. 在 RunningHub 控制台中创建或找到现有的工作流
2. 复制工作流ID
3. 分别设置：
   - **单品工作流**：用于只有一件衣服的试穿（如裙子、单上衣）
   - **上下装工作流**：用于上衣+下衣的组合试穿

### 3. 更新环境配置

编辑 `api-server/.env.local` 文件（优先级最高）：

```bash
cd api-server
# 编辑 .env.local 文件，替换占位符为真实值
# 如果 .env.local 不存在，可以复制 .env.example 或 .env 文件
```

> **配置优先级**：
> 1. `.env.local` （最高优先级，不提交到 Git）
> 2. `.env` （备用配置）
> 3. 系统环境变量

### 4. 验证配置

运行配置验证脚本：

```bash
cd api-server
npm run env:check
```

该命令会显示配置文件的加载优先级和当前配置来源。

然后运行 RunningHub 验证：

```bash
cd api-server
npm run runninghub:validate
```

如果配置正确，会看到类似输出：

```
🔍 验证 RunningHub API 配置...

📋 检查环境变量配置:
✅ RUNNINGHUB_API_KEY: rh_xxxxxx...
✅ RUNNINGHUB_BASE_URL: https://www.runninghub.cn
✅ SINGLE_ITEM_WORKFLOW_ID: your_single_item_workflow_id
✅ TOP_BOTTOM_WORKFLOW_ID: your_top_bottom_workflow_id

🔗 测试 RunningHub API 连通性...
   ✅ 上传端点可达
   ✅ 工作流端点可达

✅ RunningHub API 配置验证通过!
```

## 🚨 常见错误及解决方案

### 错误：请配置真实的RunningHub API Key

**原因**：API Key 未设置或仍使用占位符值

**解决方案**：
1. 检查 `.env` 文件中的 `RUNNINGHUB_API_KEY` 是否为真实值
2. 确保不包含 `your_` 或 `_here` 等占位符文字

### 错误：请在环境变量中配置真实的工作流ID

**原因**：工作流ID 未设置或仍使用占位符值

**解决方案**：
1. 在 RunningHub 控制台获取真实的工作流ID
2. 更新 `.env` 文件中的 `SINGLE_ITEM_WORKFLOW_ID` 和 `TOP_BOTTOM_WORKFLOW_ID`

### 错误：无法连接到 RunningHub 服务器

**原因**：网络连接问题或服务器地址错误

**解决方案**：
1. 检查网络连接
2. 验证 `RUNNINGHUB_BASE_URL` 是否正确
3. 确认 RunningHub 服务状态

### 错误：RunningHub API 调用失败

**原因**：API Key 无效或权限不足

**解决方案**：
1. 验证 API Key 是否有效
2. 检查 API Key 权限设置
3. 联系 RunningHub 技术支持

## 📊 API 功能说明

配置完成后，系统将使用以下 RunningHub API：

### 1. 文件上传 API
- **端点**：`/task/openapi/upload`
- **用途**：上传用户照片和衣服图片

### 2. 工作流启动 API
- **端点**：`/task/openapi/create`
- **用途**：启动 AI 试穿工作流

### 3. 任务状态查询 API
- **端点**：`/task/openapi/status`
- **用途**：查询试穿任务进度

### 4. 结果获取 API
- **端点**：`/task/openapi/outputs`
- **用途**：获取试穿结果图片

## 🔄 工作流程

1. **照片上传**：用户拍摄的照片上传到 RunningHub
2. **衣服图片上传**：选中的衣服图片上传到 RunningHub
3. **工作流启动**：根据衣服类型选择对应工作流
4. **状态轮询**：每5秒查询一次任务状态
5. **结果获取**：任务完成后获取试穿结果图片

## 📞 技术支持

如果在配置过程中遇到问题：

1. 首先运行验证脚本检查配置
2. 查看 API 服务器日志获取详细错误信息
3. 参考 RunningHub 官方文档
4. 联系技术支持团队

---

**重要提醒**：请确保 API Key 的安全性，不要将其提交到版本控制系统中。