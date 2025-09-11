FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制package.json和package-lock.json
COPY api-server/package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制应用代码
COPY api-server/ ./

# 复制公共文件和上传目录
COPY public/ ./public/
COPY uploads/ ./uploads/

# 创建非root用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S api -u 1001

# 更改文件所有权
RUN chown -R api:nodejs /app
USER api

# 暴露端口
EXPOSE 4001

# 启动应用
CMD ["node", "src/app.js"]