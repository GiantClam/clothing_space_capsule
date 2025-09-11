const { spawn } = require('child_process');
const http = require('http');

console.log('⏳ 等待服务器启动...');

// 检查服务器是否启动的函数
function checkServer() {
    return new Promise((resolve, reject) => {
        const req = http.request('http://localhost:3000/health', (res) => {
            if (res.statusCode === 200) {
                resolve();
            } else {
                reject(new Error(`服务器响应状态码: ${res.statusCode}`));
            }
        });
        
        req.on('error', reject);
        req.setTimeout(5000, () => reject(new Error('连接超时')));
        req.end();
    });
}

// 启动Electron的函数
function startElectron() {
    console.log('🚀 服务器已启动，正在启动Electron客户端...');
    
    const electron = spawn('electron', ['.', '--dev', '--devtools'], {
        stdio: 'inherit',
        shell: true
    });
    
    electron.on('error', (error) => {
        console.error('❌ 启动Electron失败:', error);
        process.exit(1);
    });
    
    electron.on('exit', async (code) => {
        console.log(`Electron已退出，退出码: ${code}`);
        try {
            // 请求后端优雅关闭
            await fetch('http://localhost:3000/shutdown', { method: 'POST' });
        } catch (e) {
            // 忽略网络错误
        }
        process.exit(code);
    });
}

// 主函数
async function main() {
    let attempts = 0;
    const maxAttempts = 30; // 最多等待30秒
    
    while (attempts < maxAttempts) {
        try {
            await checkServer();
            startElectron();
            return;
        } catch (error) {
            attempts++;
            console.log(`⏳ 等待服务器启动... (${attempts}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    console.error('❌ 服务器启动超时，请检查服务器状态');
    process.exit(1);
}

// 启动
main().catch(error => {
    console.error('❌ 启动失败:', error);
    process.exit(1);
});
