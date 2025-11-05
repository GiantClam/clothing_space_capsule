const { spawn } = require('child_process');

console.log('🚀 直接启动Electron客户端（使用云端API服务器）...');

// 启动Electron的函数
function startElectron() {
    // 使用npx electron而不是直接调用electron
    const electron = spawn('npx', ['electron', '.', '--dev', '--devtools'], {
        stdio: 'inherit',
        shell: true
    });
    
    electron.on('error', (error) => {
        console.error('❌ 启动Electron失败:', error);
        process.exit(1);
    });
    
    electron.on('exit', async (code) => {
        console.log(`🚪 Electron已退出，退出码: ${code}`);
        process.exit(code);
    });
    
    // 处理进程退出信号
    process.on('SIGINT', async () => {
        console.log('🚨 接收到SIGINT信号，关闭Electron...');
        
        // 终止Electron进程
        if (!electron.killed) {
            electron.kill('SIGTERM');
        }
        
        process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
        console.log('🚨 接收到SIGTERM信号，关闭Electron...');
        
        // 终止Electron进程
        if (!electron.killed) {
            electron.kill('SIGTERM');
        }
        
        process.exit(0);
    });
}

// 主函数
async function main() {
    try {
        startElectron();
    } catch (error) {
        console.error('❌ 启动失败:', error);
        process.exit(1);
    }
}

// 启动
main().catch(error => {
    console.error('❌ 启动失败:', error);
    process.exit(1);
});