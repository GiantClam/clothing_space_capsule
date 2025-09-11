# CloudStudio 部署指南

## 1. 工作空间创建
- 在CloudStudio控制台选择「导入JSON配置」
- 上传本目录下的`workspace.json`
- 建议选择「华东地区（上海）」区域

## 2. 环境变量配置
需在「环境变量」面板设置：
```env
DATABASE_URL=postgresql://user:password@host:5432/db
JWT_SECRET=your_jwt_secret
API_PORT=4001
```

## 3. 商用建议
1. 计费优化：
   - 生产环境选择「性能型」实例（4核8G起）
   - 启用「自动休眠」节省费用

2. 高可用配置：
   ```json
   "replicas": 2,
   "autoScaling": {
     "min": 2,
     "max": 5
   }
   ```

3. 监控报警：
   - 配置CPU > 70%自动扩容
   - 设置错误日志关键字报警