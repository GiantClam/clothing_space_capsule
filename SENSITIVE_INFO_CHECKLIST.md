# 敏感信息检查清单

此清单用于确保在提交到GitHub之前，所有敏感信息都已正确处理。

## ✅ 已处理的敏感信息

### 1. 环境变量文件
- [x] `.env` 文件中的占位符值已确认
- [x] `.env.local` 文件已添加到 `.gitignore`
- [x] `.env.production` 文件已添加到 `.gitignore`
- [x] `config.runtime.json` 文件已添加到 `.gitignore`

### 2. API密钥和令牌
- [x] RunningHub API Key `e61ae6a841684863985bc964caa56d44` 已从文档中移除
- [x] 微信公众号 AppID、AppSecret、Token 占位符已确认
- [x] JWT Secret 占位符已确认
- [x] 数据库连接字符串占位符已确认

### 3. 工作流ID
- [x] 单品工作流ID `1957012453269889026` 已替换为占位符
- [x] 上下装工作流ID `1965625784712970242` 已替换为占位符

### 4. 数据库凭证
- [x] PostgreSQL 用户名和密码占位符已确认
- [x] 数据库文件 `prisma/dev.db` 已添加到 `.gitignore`

### 5. 测试和开发脚本
- [x] `check*.js` 文件已添加到 `.gitignore`
- [x] `restore*.js` 文件已添加到 `.gitignore`
- [x] `test*.js` 文件已添加到 `.gitignore`
- [x] `update*.js` 文件已添加到 `.gitignore`
- [x] `scripts/` 目录已添加到 `.gitignore`

### 6. 配置文件
- [x] `config.js` 使用环境变量引用而非硬编码
- [x] `config.runtime.json` 已添加到 `.gitignore`

## 📁 已排除的目录和文件

### 目录
- [x] `node_modules/` - 依赖目录
- [x] `api-server/node_modules/` - API服务器依赖目录
- [x] `logs/` - 日志目录
- [x] `uploads/` - 上传文件目录
- [x] `scripts/` - 脚本目录

### 文件
- [x] `*.log` - 日志文件
- [x] `package-lock.json` - 包锁定文件
- [x] `yarn.lock` - Yarn锁定文件
- [x] `.env` - 环境变量文件
- [x] `.env.local` - 本地环境变量文件
- [x] `.env.production` - 生产环境变量文件
- [x] `.env.development` - 开发环境变量文件
- [x] `config.runtime.json` - 运行时配置文件
- [x] `prisma/dev.db` - 开发数据库文件
- [x] `*.sqlite` - SQLite数据库文件
- [x] `*.db` - 数据库文件
- [x] `*.pem` - 证书文件
- [x] `*.key` - 密钥文件
- [x] `*.crt` - 证书文件
- [x] `*.cert` - 证书文件

## 📋 提交前最终检查

### Git状态检查
```bash
# 检查将要提交的文件
git status

# 确保没有敏感文件被包含
git status --porcelain | grep -E "(env|config\.runtime|\.env|\.key|\.pem|\.crt|\.cert)"

# 检查历史提交（如果已经提交过）
git log --oneline -10
```

### 敏感信息扫描
```bash
# 搜索可能的API密钥模式
grep -r "[0-9a-fA-F]\{32,\}" . --exclude-dir=.git

# 搜索可能的密码模式
grep -r "password\s*=\s*['\"][^'\"]\+['\"]" . --exclude-dir=.git

# 搜索可能的令牌模式
grep -r "token\s*=\s*['\"][^'\"]\+['\"]" . --exclude-dir=.git
```

## 🚨 紧急处理措施

如果意外提交了敏感信息：

1. **立即撤销提交**（如果尚未推送到远程）：
   ```bash
   git reset --soft HEAD~1
   ```

2. **从历史中移除文件**（如果已推送到远程）：
   ```bash
   git filter-branch --force --index-filter \
   'git rm --cached --ignore-unmatch <敏感文件路径>' \
   --prune-empty --tag-name-filter cat -- --all
   ```

3. **更改泄露的凭证**：
   - 立即更改任何泄露的API密钥
   - 更新密码和令牌
   - 撤销并重新生成凭证

## 📞 联系支持

如果发现任何遗漏的敏感信息，请立即联系项目维护团队。

---

**最后检查时间**： 2025-09-22
**检查人员**： 项目维护团队