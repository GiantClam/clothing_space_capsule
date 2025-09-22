#!/usr/bin/env node

/**
 * 应用完整退出清理脚本
 * 确保所有相关进程都被正确关闭
 */

const http = require('http');
const { spawn } = require('child_process');

console.log('🧹 开始执行应用完整清理...');

// 发送关闭信号到服务器
async function shutdownServer(port, name) {
    return new Promise((resolve) => {
        const req = http.request({
            hostname: 'localhost',
            port: port,
            path: '/shutdown',
            method: 'POST',
            timeout: 2000
        }, (res) => {
            console.log(`✅ ${name} (端口 ${port}) 关闭信号已发送`);
            resolve(true);
        });
        
        req.on('error', (error) => {
            console.log(`⚠️ ${name} (端口 ${port}) 可能已关闭:`, error.message);
            resolve(false);
        });
        
        req.on('timeout', () => {
            console.log(`⏰ ${name} (端口 ${port}) 关闭请求超时`);
            req.destroy();
            resolve(false);
        });
        
        req.end();
    });
}

// 杀死Node.js进程
function killNodeProcesses() {
    return new Promise((resolve) => {
        const isWindows = process.platform === 'win32';
        
        if (isWindows) {
            // Windows 系统
            const killCmd = spawn('taskkill', ['/f', '/im', 'node.exe'], {
                stdio: 'pipe'
            });
            
            killCmd.on('close', (code) => {
                if (code === 0) {
                    console.log('✅ 所有 Node.js 进程已终止');
                } else {
                    console.log('⚠️ 部分 Node.js 进程可能已终止或不存在');
                }
                resolve();
            });
            
            killCmd.on('error', (error) => {
                console.log('⚠️ 终止 Node.js 进程时出错:', error.message);
                resolve();
            });
        } else {
            // Unix/Linux/macOS 系统
            const killCmd = spawn('pkill', ['-f', 'node'], {
                stdio: 'pipe'
            });
            
            killCmd.on('close', (code) => {
                console.log('✅ Node.js 进程清理完成');
                resolve();
            });
            
            killCmd.on('error', (error) => {
                console.log('⚠️ 终止 Node.js 进程时出错:', error.message);
                resolve();
            });
        }
    });
}

// 杀死Electron进程
function killElectronProcesses() {
    return new Promise((resolve) => {
        const isWindows = process.platform === 'win32';
        
        if (isWindows) {
            // Windows 系统 - 终止electron.exe进程
            const killCmd = spawn('taskkill', ['/f', '/im', 'electron.exe'], {
                stdio: 'pipe'
            });
            
            killCmd.on('close', (code) => {
                if (code === 0) {
                    console.log('✅ 所有 Electron 进程已终止');
                } else {
                    console.log('⚠️ 部分 Electron 进程可能已终止或不存在');
                }
                resolve();
            });
            
            killCmd.on('error', (error) => {
                console.log('⚠️ 终止 Electron 进程时出错:', error.message);
                resolve();
            });
        } else {
            // Unix/Linux/macOS 系统
            const killCmd = spawn('pkill', ['-f', 'electron'], {
                stdio: 'pipe'
            });
            
            killCmd.on('close', (code) => {
                console.log('✅ Electron 进程清理完成');
                resolve();
            });
            
            killCmd.on('error', (error) => {
                console.log('⚠️ 终止 Electron 进程时出错:', error.message);
                resolve();
            });
        }
    });
}

// 主清理函数
async function cleanup() {
    console.log('🚀 开始应用完整清理流程...');
    
    try {
        // 1. 尝试优雅关闭服务器
        console.log('\n📤 发送关闭信号到服务器...');
        const serverResults = await Promise.all([
            shutdownServer(3000, '主服务器'),
            shutdownServer(4001, 'API服务器')
        ]);
        
        // 等待服务器有时间响应
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 2. 强制终止Electron进程
        console.log('\n⚡ 终止 Electron 进程...');
        await killElectronProcesses();
        
        // 3. 强制终止所有Node.js进程
        console.log('\n⚡ 终止所有 Node.js 进程...');
        await killNodeProcesses();
        
        console.log('\n🎉 应用完整清理完成！');
        console.log('💡 提示：如果仍有残留进程，请手动检查任务管理器');
        
    } catch (error) {
        console.error('❌ 清理过程中出现错误:', error);
    }
    
    // 退出清理脚本自身
    process.exit(0);
}

// 处理脚本自身的退出信号
process.on('SIGINT', () => {
    console.log('\n⚠️ 清理脚本被中断');
    process.exit(1);
});

process.on('SIGTERM', () => {
    console.log('\n⚠️ 清理脚本被终止');
    process.exit(1);
});

// 执行清理
cleanup().catch(error => {
    console.error('💥 清理脚本执行失败:', error);
    process.exit(1);
});