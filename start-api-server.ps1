# API服务器后台启动脚本
Write-Host "🚀 启动API服务器 (端口 4002)..."

# 检查是否已安装node
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js未安装，请先安装Node.js"
    exit 1
}

# 检查端口是否被占用
$portCheck = netstat -ano | findstr :4002
if ($portCheck) {
    Write-Host "⚠️  端口4002已被占用，尝试停止现有进程..."
    $pidToKill = ($portCheck -split '\s+')[-1]
    taskkill /F /PID $pidToKill 2>$null
    Start-Sleep -Seconds 2
}

# 启动API服务器
cd api-server
Start-Process -NoNewWindow -FilePath "node" -ArgumentList "src/app.js" -PassThru

Write-Host "✅ API服务器已启动在 http://localhost:4002"
Write-Host "📊 健康检查: http://localhost:4002/health"
Write-Host "⏹️  停止服务器: 按 Ctrl+C 或运行 taskkill /f /im node.exe"