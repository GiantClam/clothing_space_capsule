# CloudStudio 部署指南

## 项目结构
- `api-server/` - Node.js API 服务器
- `main.js` - Electron 主进程（本地运行）
- `renderer/` - Electron 渲染进程

## 部署步骤

### 1. CloudStudio 工作空间创建
1. 登录 [CloudStudio](https://cloudstudio.net)
2. 点击「新建工作空间」
3. 选择「导入Git仓库」
4. 输入: `https://github.com/GiantClam/clothing_space_capsule.git`
5. 选择「Node.js」环境模板
6. 点击「创建」

### 2. 环境配置
1. 在工作空间设置中添加环境变量：
   ```bash
   PORT=4001
   NODE_ENV=production
   # 数据库配置
   DATABASE_URL=您的数据库连接字符串
   # 其他业务配置
   ```

### 3. 启动应用
```bash
# 安装依赖
cd api-server && npm install

# 启动API服务器
npm start
```

## 端口配置
- **4001**: API服务器端口（公开访问）
- 确保在CloudStudio端口设置中开启「公开访问」

## 注意事项
1. Electron应用需要在本地运行，CloudStudio仅部署API服务器
2. 大文件通过Git LFS管理，确保LFS配置正确
3. 生产环境建议配置数据库连接和Redis缓存

## 故障排除
- 端口冲突：检查4001端口是否被占用
- 依赖安装失败：尝试清除node_modules重新安装
- 环境变量缺失：确保所有必需环境变量已配置