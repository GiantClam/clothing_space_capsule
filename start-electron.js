const { spawn } = require('child_process');
const http = require('http');

console.log('⏳ 等待API服务器启动...');

// 检查服务器是否启动的函数
function checkServer() {
    return new Promise((resolve, reject) => {
        const req = http.request('http://localhost:4001/health', (res) => {
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
    console.log('🚀 API服务器已启动，正在启动Electron客户端...');
    
    // 使用npx electron而不是直接调用electron
    const electron = spawn('npx', ['electron', '.', '--dev', '--devtools'], {
        stdio: 'inherit',
        shell: true
    });
    
    electron.on('error', (error) => {
        console.error('❌ 启动Electron失败:', error);
        // 清理后台服务器
        cleanupServers().then(() => {
            process.exit(1);
        });
    });
    
    electron.on('exit', async (code) => {
        console.log(`🚪 Electron已退出，退出码: ${code}`);
        console.log('🧹 开始清理后台服务器...');
        
        // 清理后台服务器
        await cleanupServers();
        
        console.log('✅ 清理完成，退出进程');
        process.exit(code);
    });
    
    // 处理进程退出信号
    process.on('SIGINT', async () => {
        console.log('🚨 接收到SIGINT信号，开始关闭Electron和后台服务...');
        
        // 终止Electron进程
        if (!electron.killed) {
            electron.kill('SIGTERM');
        }
        
        // 清理后台服务器
        await cleanupServers();
        
        process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
        console.log('🚨 接收到SIGTERM信号，开始关闭Electron和后台服务...');
        
        // 终止Electron进程
        if (!electron.killed) {
            electron.kill('SIGTERM');
        }
        
        // 清理后台服务器
        await cleanupServers();
        
        process.exit(0);
    });
}

// 清理后台服务器的函数
async function cleanupServers() {
    const cleanupPromises = [];
    
    // 清理API服务器 (4001端口)
    const cleanupApiServer = () => {
        return new Promise((resolve) => {
            try {
                const http = require('http');
                const req = http.request({
                    hostname: 'localhost',
                    port: 4001,
                    path: '/shutdown',
                    method: 'POST',
                    timeout: 2000
                }, (res) => {
                    console.log('✅ API服务器关闭信号已发送');
                    resolve();
                });
                
                req.on('error', (error) => {
                    console.log('⚠️ API服务器可能已关闭或不可访问:', error.message);
                    resolve();
                });
                
                req.on('timeout', () => {
                    console.log('⚠️ API服务器关闭请求超时');
                    req.destroy();
                    resolve();
                });
                
                req.end();
            } catch (error) {
                console.log('⚠️ API服务器清理失败:', error.message);
                resolve();
            }
        });
    };
    
    cleanupPromises.push(cleanupApiServer());
    
    try {
        await Promise.all(cleanupPromises);
        console.log('🎯 后台服务器清理完成');
    } catch (error) {
        console.log('⚠️ 部分后台服务器清理失败:', error.message);
    }
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
            console.log(`⏳ 等待API服务器启动... (${attempts}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    console.error('❌ API服务器启动超时，请检查服务器状态');
    process.exit(1);
}

// 启动
main().catch(error => {
    console.error('❌ 启动失败:', error);
    process.exit(1);
});