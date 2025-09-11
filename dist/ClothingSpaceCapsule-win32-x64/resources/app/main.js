const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, 'assets/icon.png'), // 可选：应用图标
    autoHideMenuBar: true, // 隐藏菜单栏
    fullscreen: false // 可根据需要设置全屏
  });

  // 加载主页面
  mainWindow.loadFile('renderer/index.html');

  // 开发模式开关：环境变量或启动参数任一为真则打开 DevTools
  const enableDevTools = process.env.NODE_ENV === 'development' || process.argv.includes('--devtools');
  if (enableDevTools) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // 绑定快捷键：F12 / Ctrl+Shift+I 切换 DevTools
  mainWindow.webContents.on('before-input-event', (event, input) => {
    const isF12 = input.type === 'keyDown' && input.key === 'F12';
    const isCtrlShiftI = input.type === 'keyDown' && input.control && input.shift && (input.key === 'I' || input.code === 'KeyI');
    if (isF12 || isCtrlShiftI) {
      if (mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      } else {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
      }
      event.preventDefault();
    }
  });

  // 窗口关闭事件
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC处理程序
ipcMain.handle('get-mac-address', () => {
  try {
    const networkInterfaces = os.networkInterfaces();
    let macAddress = '';
    
    for (const name of Object.keys(networkInterfaces)) {
      for (const net of networkInterfaces[name]) {
        // 跳过内部（非物理）接口和IPv6地址
        if (net.family === 'IPv4' && !net.internal) {
          macAddress = net.mac;
          break;
        }
      }
      if (macAddress) break;
    }
    
    return macAddress || '无法获取MAC地址';
  } catch (error) {
    console.error('获取MAC地址失败:', error);
    return '获取失败: ' + error.message;
  }
});

// 应用就绪时创建窗口
app.whenReady().then(createWindow);

// 当所有窗口关闭时退出应用
app.on('window-all-closed', () => {
  // 在 macOS 上，应用和菜单栏通常会保持活跃状态，
  // 直到用户使用 Cmd + Q 明确退出
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // 在 macOS 上，当点击 dock 图标并且没有其他窗口打开时，
  // 通常在应用程序中重新创建一个窗口。
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 处理应用退出
app.on('before-quit', () => {
  // 在这里可以添加清理代码
  console.log('应用正在退出...');
});

// 错误处理
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的 Promise 拒绝:', reason);
});
