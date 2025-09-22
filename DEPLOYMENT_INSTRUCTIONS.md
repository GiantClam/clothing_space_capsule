# 部署说明

## 📋 部署选项

本项目支持多种部署方式：

1. **腾讯云CVM直接部署**（推荐）
2. **宝塔面板部署**
3. **Docker部署**
4. **本地开发环境部署**

## 🚀 腾讯云CVM部署

### 自动化部署（推荐）

使用我们提供的自动化部署脚本：

```bash
# 克隆项目（如果尚未克隆）
git clone https://github.com/GiantClam/clothing_space_capsule.git
cd clothing_space_capsule

# 给部署脚本添加执行权限
chmod +x deploy-to-tencent-cloud.js

# 运行部署脚本
node deploy-to-tencent-cloud.js
```

### 手动部署

详细的手动部署步骤请参考：
- [腾讯云CVM部署完整指南](TENCENT_CLOUD_CVM_DEPLOYMENT.md)

### 部署后配置

部署完成后，您需要：

1. **配置环境变量**：
   ```bash
   cd api-server
   nano .env
   ```
   
   确保配置了以下关键变量：
   - `DATABASE_URL` - 数据库连接字符串
   - `JWT_SECRET` - JWT密钥
   - `RUNNINGHUB_API_KEY` - RunningHub API密钥
   - `WECHAT_APP_ID` - 微信公众号AppID（可选）

2. **重启应用**：
   ```bash
   npm run pm2:restart
   ```

## 🧰 宝塔面板部署

详细部署步骤请参考：
- [宝塔面板部署指南](api-server/deploy/BAOTA_DEPLOYMENT.md)
- [宝塔部署详细文档](api-server/docs/BAOTA_DEPLOYMENT_GUIDE.md)

## 🐳 Docker部署

使用Docker Compose部署：

```bash
cd api-server
docker-compose -f docker-compose.prod.yml up -d
```

## 🛠️ 本地开发环境部署

```bash
# 安装依赖
npm install

# 启动数据库
npm run db:start

# 运行数据库迁移
npm run db:migrate

# 运行种子数据
npm run db:seed

# 启动开发服务器
npm run dev
```

## 🔧 常用管理命令

### PM2管理

```bash
# 查看应用状态
npm run pm2:status

# 查看日志
npm run pm2:logs

# 重启应用
npm run pm2:restart

# 停止应用
npm run pm2:stop
```

### 数据库管理

```bash
# 启动数据库
npm run db:start

# 停止数据库
npm run db:stop

# 查看数据库状态
npm run db:status

# 查看数据库日志
npm run db:logs
```

### 环境检查

```bash
# 检查环境配置
npm run env:check

# 验证RunningHub配置
npm run runninghub:validate
```

## 📊 监控和维护

### 查看应用日志

```bash
# PM2日志
pm2 logs clothing-space-capsule-api

# 应用日志文件
tail -f api-server/logs/app-*.log
```

### 性能监控

```bash
# PM2监控
pm2 monit

# 系统资源监控
htop
```

## 🔒 安全建议

1. 使用HTTPS加密传输
2. 定期更新依赖包
3. 限制数据库访问权限
4. 使用强密码和密钥
5. 定期备份数据库
6. 配置防火墙规则

## 🆘 故障排除

### 应用无法启动

1. 检查PM2日志：
   ```bash
   pm2 logs clothing-space-capsule-api
   ```

2. 检查环境变量配置

3. 验证数据库连接

### 数据库连接失败

1. 检查 `DATABASE_URL` 配置

2. 确保数据库服务正在运行：
   ```bash
   npm run db:status
   ```

3. 检查防火墙设置

### 微信公众号功能异常

1. 检查微信公众号配置是否正确

2. 验证服务器是否能被微信服务器访问

3. 检查SSL证书配置

## 📞 技术支持

如果在部署过程中遇到问题：

1. 检查日志文件获取详细错误信息
2. 确认所有环境变量已正确配置
3. 验证数据库连接和权限
4. 联系技术支持团队