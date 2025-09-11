# CloudStudio 环境变量配置指南

## 必需环境变量

### 1. 数据库配置
```bash
DATABASE_URL=postgresql://username:password@cloudstudio-db:5432/clothing_space_capsule
```
- 使用CloudStudio提供的数据库服务
- 格式: `postgresql://用户名:密码@主机:端口/数据库名`

### 2. JWT安全配置
```bash
JWT_SECRET=your-super-strong-random-secret-here
JWT_EXPIRES_IN=7d
```
- `JWT_SECRET`: 用于签名JWT令牌的密钥，建议使用32位以上随机字符串
- `JWT_EXPIRES_IN`: token有效期，如 '7d', '24h'

### 3. 腾讯云COS配置
```bash
COS_SECRET_ID=your-cos-secret-id
COS_SECRET_KEY=your-cos-secret-key
COS_BUCKET=your-bucket-name
COS_REGION=ap-guangzhou
```
- 需要腾讯云账号和COS服务
- 可在[腾讯云控制台](https://console.cloud.tencent.com/cos)获取

## 可选环境变量

### 4. 微信小程序配置
```bash
WECHAT_APP_ID=your-app-id
WECHAT_APP_SECRET=your-app-secret
WECHAT_TOKEN=your-token
```
- 需要微信公众平台账号
- 用于微信登录和消息推送功能

### 5. RunningHub AI服务
```bash
RUNNINGHUB_API_KEY=your-api-key
RUNNINGHUB_API_URL=https://api.runninghub.ai
RUNNINGHUB_WEBHOOK_SECRET=your-webhook-secret
```
- AI图像生成服务配置
- 需要RunningHub账号

### 6. 有赞云配置
```bash
YOUZAN_CLIENT_ID=your-client-id
YOUZAN_CLIENT_SECRET=your-client-secret
```
- 电商平台集成配置

## 配置步骤

### 方法一：使用环境变量模板
1. 复制模板文件：
   ```bash
   cp .cloudstudio/env.template .env
   ```

2. 编辑 `.env` 文件，填写实际配置值

3. 确保文件权限：
   ```bash
   chmod 600 .env  # 限制文件权限
   ```

### 方法二：CloudStudio在线配置
1. 进入CloudStudio控制台
2. 找到"环境变量"配置页面
3. 逐个添加所需的环境变量
4. 确保变量名称与上述列表一致

### 方法三：使用命令行
```bash
# 设置单个环境变量
export DATABASE_URL="postgresql://user:pass@host:5432/db"

# 或者使用.env文件
source .env
```

## 验证配置

运行以下命令验证环境变量配置：
```bash
# 检查必需变量
cd api-server
npm run check-env

# 或者手动检查
node -e "console.log('环境变量检查:', process.env.NODE_ENV, process.env.DATABASE_URL ? '数据库已配置' : '数据库未配置')"
```

## 安全建议

1. **不要提交 `.env` 文件到版本控制**
   - 确保 `.env` 在 `.gitignore` 中
   - 使用环境变量模板进行配置分享

2. **使用强密码**
   - JWT_SECRET 至少32位随机字符
   - 数据库密码使用复杂密码

3. **定期轮换密钥**
   - 建议每3-6个月更换一次密钥
   - 特别是生产环境的密钥

4. **权限控制**
   - `.env` 文件权限设置为 600
   - 只有必要人员可以访问生产环境变量

## 故障排除

### 常见问题

1. **环境变量未生效**
   - 重启应用服务
   - 检查变量名称拼写
   - 确认文件编码为UTF-8

2. **数据库连接失败**
   - 检查DATABASE_URL格式
   - 确认数据库服务正常运行

3. **权限错误**
   - 检查文件权限：`ls -la .env`
   - 确保有读取权限

### 获取帮助

如果遇到配置问题，请检查：
- [ ] 所有必需变量都已配置
- [ ] 变量值格式正确
- [ ] 服务依赖项正常运行
- [ ] 文件权限设置正确