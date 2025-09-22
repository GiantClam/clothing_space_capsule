# .env.local 配置优先级说明

## 📋 配置文件优先级

API 服务器现在按以下优先级加载环境变量：

1. **`.env.local`** (最高优先级)
   - 本地开发配置
   - 不会提交到 Git 仓库
   - 用于存储敏感信息如 API Key

2. **`.env`** (备用配置) 
   - 默认配置文件
   - 可以提交到 Git 仓库
   - 通常包含占位符配置

3. **系统环境变量** (最低优先级)
   - 操作系统级别的环境变量

## 🔧 使用方法

### 检查当前配置
```bash
cd api-server
npm run env:check
```

### 验证 RunningHub 配置
```bash
cd api-server
npm run runninghub:validate
```

### 配置 RunningHub API (交互式)
```bash
cd api-server
npm run runninghub:setup
```

## 📝 示例配置

### .env.local 文件内容示例
```env
# RunningHub API 配置 (真实配置)
RUNNINGHUB_API_KEY="your_actual_runninghub_api_key_here"
RUNNINGHUB_BASE_URL="https://www.runninghub.cn"
SINGLE_ITEM_WORKFLOW_ID="your_single_item_workflow_id_here"
TOP_BOTTOM_WORKFLOW_ID="your_top_bottom_workflow_id_here"

# 其他敏感配置
DATABASE_URL="postgresql://user:pass@localhost:5432/db"
JWT_SECRET="your_secret_key"
```

### .env 文件内容示例
```env
# RunningHub API 配置 (占位符)
RUNNINGHUB_API_KEY="your_actual_runninghub_api_key_here"
RUNNINGHUB_BASE_URL="https://www.runninghub.cn"
SINGLE_ITEM_WORKFLOW_ID="your_single_item_workflow_id_here"
TOP_BOTTOM_WORKFLOW_ID="your_top_bottom_workflow_id_here"
```

## ✅ 优势

1. **安全性**: 敏感信息在 `.env.local` 中，不会意外提交到 Git
2. **灵活性**: 可以在本地覆盖任何配置而不影响版本控制
3. **团队协作**: 每个开发者可以有自己的本地配置
4. **部署便利**: 生产环境可以使用系统环境变量或专用配置

## 🚨 注意事项

- `.env.local` 文件已加入 `.gitignore`，确保不会提交到版本控制
- 如果某个配置在 `.env.local` 中存在，会覆盖 `.env` 中的同名配置
- 建议在 `.env.local` 中只配置需要覆盖的变量，其他使用默认值

## 🔍 故障排除

如果配置不生效，请按以下步骤检查：

1. 确认 `.env.local` 文件存在于 `api-server` 目录下
2. 运行 `npm run env:check` 查看配置来源
3. 检查环境变量名称是否正确拼写
4. 确认配置值没有多余的空格或引号问题