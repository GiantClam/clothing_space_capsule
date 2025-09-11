# 腾讯云CloudBase部署指南

## 前置要求

1. **腾讯云账号** - 注册[腾讯云账号](https://cloud.tencent.com/)
2. **CloudBase CLI** - 安装命令行工具
3. **Node.js 16+** - 运行环境

## 安装CloudBase CLI

```bash
# 全局安装CloudBase CLI
npm install -g @cloudbase/cli

# 登录腾讯云
tcb login
```

## 环境准备

### 1. 创建CloudBase环境

```bash
# 创建新环境
tcb env create

# 或使用现有环境
tcb env list
```

### 2. 配置环境变量

在CloudBase控制台或使用CLI配置以下环境变量：

| 变量名 | 说明 | 必需 |
|--------|------|------|
| `JWT_SECRET` | JWT加密密钥 | ✅ |
| `COS_SECRET_ID` | 腾讯云COS SecretId | ✅ |
| `COS_SECRET_KEY` | 腾讯云COS SecretKey | ✅ |
| `COS_BUCKET` | COS存储桶名称 | ✅ |
| `WECHAT_APP_ID` | 微信小程序AppID | ❌ |
| `WECHAT_APP_SECRET` | 微信小程序AppSecret | ❌ |
| `RUNNINGHUB_API_KEY` | RunningHub API密钥 | ❌ |
| `YOUZAN_CLIENT_ID` | 有赞云ClientID | ❌ |
| `YOUZAN_CLIENT_SECRET` | 有赞云ClientSecret | ❌ |

## 一键部署

```bash
# 赋予执行权限
chmod +x cloudbase/deploy.sh

# 运行部署脚本
./cloudbase/deploy.sh
```

## 手动部署步骤

### 1. 部署云函数

```bash
# 部署API服务器
tcb functions deploy api-server \
  --env your-env-id \
  --path ./cloudbase/functions/api-server
```

### 2. 配置环境变量

```bash
# 设置环境变量
tcb env set --env your-env-id --config cloudbase/env.json

# 或逐个设置
tcb functions config set api-server \
  --env your-env-id \
  --config '{
    "timeout": 60,
    "envVariables": {
      "NODE_ENV": "production"
    }
  }'
```

### 3. 部署静态资源（可选）

```bash
# 部署前端静态文件
tcb hosting deploy ./dist --env your-env-id
```

## 测试部署

### 1. 查看部署状态

```bash
# 查看云函数列表
tcb functions list --env your-env-id

# 查看函数详情
tcb functions detail api-server --env your-env-id
```

### 2. 测试API接口

```bash
# 获取API访问地址
API_URL=$(tcb functions detail api-server --env your-env-id | grep "https://" | head -1)

# 测试健康检查
curl "$API_URL/api/health"
```

### 3. 查看日志

```bash
# 查看实时日志
tcb functions log api-server --env your-env-id

# 查看历史日志
tcb functions log api-server --env your-env-id --start-time '2024-01-01 00:00:00'
```

## 开发调试

### 1. 本地测试

```bash
# 安装依赖
cd cloudbase/functions/api-server
npm install

# 设置环境变量
export NODE_ENV=development
export PORT=4001

# 本地运行
node index.js
```

### 2. 云函数调试

```bash
# 本地调用云函数
tcb functions invoke api-server \
  --env your-env-id \
  --data '{"httpMethod": "GET", "path": "/api/health"}'
```

## 常用命令

```bash
# 查看帮助
tcb --help

# 环境管理
tcb env list
tcb env create
tcb env delete your-env-id

# 函数管理
tcb functions list --env your-env-id
tcb functions deploy --env your-env-id --path ./path/to/function
tcb functions delete function-name --env your-env-id

# 存储管理
tcb storage upload ./local-file.txt cloud-file.txt --env your-env-id
tcb storage download cloud-file.txt ./local-file.txt --env your-env-id

# 数据库管理
tcb databases list --env your-env-id
tcb databases create my-db --env your-env-id
```

## 故障排除

### 常见问题

1. **部署失败**：
   - 检查环境变量配置
   - 确认CLI已登录
   - 查看详细日志：`tcb functions log api-server --env your-env-id`

2. **函数超时**：
   - 增加超时时间：`tcb functions config set api-server --env your-env-id --config '{"timeout": 60}'`

3. **内存不足**：
   - 增加内存配置：`tcb functions config set api-server --env your-env-id --config '{"memory": 512}'`

### 获取帮助

- [CloudBase官方文档](https://cloud.tencent.com/document/product/876)
- [CLI命令参考](https://docs.cloudbase.net/cli-v1/intro)
- [社区支持](https://cloud.tencent.com/developer/tag/10543)

## 安全建议

1. **保护敏感信息**：
   - 使用环境变量存储密钥
   - 不要将敏感信息提交到代码仓库

2. **权限控制**：
   - 配置合适的数据库权限
   - 使用CloudBase的安全规则

3. **监控告警**：
   - 设置函数执行监控
   - 配置错误告警通知