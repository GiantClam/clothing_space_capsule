#!/bin/bash
# 服务器初始化脚本 - 用于腾讯云服务器初始化配置

set -e  # 遇到错误立即退出

echo "🖥️  开始服务器初始化配置..."

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then
    echo "❌ 请使用root用户运行此脚本"
    exit 1
fi

# 更新系统
echo "🔄 更新系统包..."
apt update && apt upgrade -y

# 安装必要软件
echo "📦 安装必要软件..."
apt install -y \
    curl \
    wget \
    git \
    vim \
    htop \
    net-tools \
    ufw \
    fail2ban \
    logrotate

# 安装Docker
echo "🐳 安装Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl enable docker
    systemctl start docker
fi

# 安装Docker Compose
echo "📦 安装Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# 配置防火墙
echo "🔥 配置防火墙..."
ufw allow ssh
ufw allow 80
ufw allow 443
ufw allow 4001
ufw --force enable

# 创建部署用户
echo "👤 创建部署用户..."
if ! id "deploy" &>/dev/null; then
    useradd -m -s /bin/bash deploy
    usermod -aG docker deploy
    echo "✅ 创建用户deploy完成"
    
    # 设置密码
    echo "请为deploy用户设置密码："
    passwd deploy
fi

# 配置SSH安全
echo "🔒 配置SSH安全..."
sed -i 's/^#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#PermitRootLogin prohibit-password/PermitRootLogin no/' /etc/ssh/sshd_config
echo "AllowUsers deploy" >> /etc/ssh/sshd_config
systemctl restart sshd

# 配置fail2ban
echo "🛡️  配置fail2ban..."
cat > /etc/fail2ban/jail.local << EOF
[sshd]
enabled = true
maxretry = 3
bantime = 3600
findtime = 600
EOF

systemctl enable fail2ban
systemctl start fail2ban

# 配置时区
echo "⏰ 配置时区..."
timedatectl set-timezone Asia/Shanghai

# 配置swap空间
echo "💾 配置swap空间..."
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# 优化系统参数
echo "⚡ 优化系统参数..."
cat > /etc/sysctl.d/99-optimization.conf << EOF
# 网络优化
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 65535
net.ipv4.tcp_max_syn_backlog = 65535

# 内存优化
vm.swappiness = 10
vm.vfs_cache_pressure = 50

# 安全优化
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_synack_retries = 2
EOF

sysctl -p /etc/sysctl.d/99-optimization.conf

# 创建项目目录
echo "📁 创建项目目录..."
mkdir -p /opt/clothing-space-capsule
chown -R deploy:deploy /opt/clothing-space-capsule

# 配置日志轮转
echo "📋 配置日志轮转..."
cat > /etc/logrotate.d/docker-app << EOF
/opt/clothing-space-capsule/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
EOF

echo "✅ 服务器初始化完成！"
echo ""
echo "📋 下一步操作："
echo "1. 使用deploy用户登录: su - deploy"
echo "2. 克隆项目代码到/opt/clothing-space-capsule"
echo "3. 配置环境变量: cp api-server/.env.example api-server/.env"
echo "4. 运行部署脚本: ./deploy/docker/deploy.sh"
echo ""
echo "🔒 安全提醒："
echo "- 确保已配置SSH密钥认证"
echo "- 定期更新系统和软件"
echo "- 监控系统日志和资源使用"