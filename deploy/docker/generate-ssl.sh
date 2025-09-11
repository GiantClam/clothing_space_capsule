#!/bin/bash
# SSL证书生成脚本 - 用于开发和测试环境

set -e

echo "🔐 生成自签名SSL证书..."

# 创建SSL目录
mkdir -p nginx/ssl
cd nginx/ssl

# 生成根证书私钥
openssl genrsa -out rootCA.key 4096

# 生成根证书
openssl req -x509 -new -nodes -key rootCA.key -sha256 -days 1024 -out rootCA.crt \
  -subj "/C=CN/ST=Guangdong/L=Shenzhen/O=ClothingSpaceCapsule/CN=ClothingSpaceCapsule Root CA"

# 生成服务器私钥
openssl genrsa -out server.key 4096

# 生成证书签名请求 (CSR)
openssl req -new -key server.key -out server.csr \
  -subj "/C=CN/ST=Guangdong/L=Shenzhen/O=ClothingSpaceCapsule/CN=your-domain.com" \
  -addext "subjectAltName = DNS:your-domain.com, DNS:www.your-domain.com, DNS:localhost, IP:127.0.0.1"

# 生成服务器证书
openssl x509 -req -in server.csr -CA rootCA.crt -CAkey rootCA.key -CAcreateserial \
  -out server.crt -days 365 -sha256 \
  -extfile <(printf "subjectAltName=DNS:your-domain.com,DNS:www.your-domain.com,DNS:localhost,IP:127.0.0.1")

# 设置权限
chmod 600 *.key
chmod 644 *.crt

echo "✅ SSL证书生成完成！"
echo ""
echo "📋 证书文件:"
echo "  - rootCA.crt    : 根证书（需要导入到客户端信任）"
echo "  - server.crt    : 服务器证书"
echo "  - server.key    : 服务器私钥"
echo ""
echo "🔧 使用说明:"
echo "1. 将根证书 rootCA.crt 导入到客户端信任存储"
echo "2. 在 nginx/nginx.conf 中配置证书路径"
echo "3. 生产环境请使用 Let's Encrypt 或购买商业证书"