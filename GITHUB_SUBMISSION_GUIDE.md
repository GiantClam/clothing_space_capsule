# GitHub提交指南

本文档说明如何安全地将项目提交到GitHub，确保不泄露敏感信息。

## 敏感信息处理

### 已排除的敏感文件
以下文件和目录已通过`.gitignore`文件排除，不会提交到GitHub：

1. **环境配置文件**：
   - `.env`
   - `.env.local`
   - `.env.production`
   - `.env.development`
   - `config.runtime.json`

2. **依赖目录**：
   - `node_modules/`
   - `api-server/node_modules/`

3. **日志文件**：
   - `logs/`
   - `*.log`

4. **测试和开发脚本**：
   - `check*.js`
   - `restore*.js`
   - `test*.js`
   - `update*.js`
   - `scripts/`目录

5. **其他敏感文件**：
   - `package-lock.json`
   - `yarn.lock`
   - IDE配置文件
   - 上传文件目录

### 环境变量示例文件
为了帮助其他开发者快速开始，我们提供了环境变量示例文件：
- `env.example` - 开发环境示例
- `api-server/env.example` - API服务器开发环境示例
- `api-server/.env.production.example` - API服务器生产环境示例
- `api-server/deploy/.env.baota.example` - 宝塔部署环境示例

## 提交前检查清单

在提交到GitHub之前，请检查以下事项：

1. **确认敏感信息已排除**：
   - [ ] 检查`.gitignore`文件是否包含所有敏感文件
   - [ ] 确认没有在代码中硬编码敏感信息
   - [ ] 验证配置文件中没有真实的API密钥或密码

2. **检查环境变量引用**：
   - [ ] 确保所有敏感配置都通过`process.env`引用
   - [ ] 验证示例配置文件中只包含占位符值

3. **文档完整性**：
   - [ ] README文件已更新
   - [ ] 部署文档已完善
   - [ ] 配置说明已提供

## 安全提交步骤

1. **初始化Git仓库**（如果尚未初始化）：
   ```bash
   git init
   ```

2. **添加所有文件**：
   ```bash
   git add .
   ```

3. **检查将要提交的文件**：
   ```bash
   git status
   ```

4. **确保没有敏感文件被包含**：
   ```bash
   git status --porcelain | grep -E "(env|config\.runtime|\.env)"
   ```

5. **提交代码**：
   ```bash
   git commit -m "Initial commit"
   ```

6. **推送到GitHub**：
   ```bash
   git remote add origin <your-github-repo-url>
   git branch -M main
   git push -u origin main
   ```

## 敏感信息更新处理

如果需要更新敏感信息处理规则：

1. 更新`.gitignore`文件
2. 如果已经意外提交了敏感文件，需要从Git历史中移除：
   ```bash
   git filter-branch --force --index-filter \
   'git rm --cached --ignore-unmatch <敏感文件路径>' \
   --prune-empty --tag-name-filter cat -- --all
   ```

## 最佳实践

1. **永远不要在代码中硬编码敏感信息**
2. **使用环境变量管理所有敏感配置**
3. **定期审查`.gitignore`文件**
4. **在团队中共享环境变量示例文件**
5. **使用配置管理工具处理不同环境的配置**

## 联系支持

如有任何关于安全提交的问题，请联系项目维护团队。