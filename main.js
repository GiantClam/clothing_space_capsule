const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');

// 加载环境变量
function loadEnvironmentVariables() {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, value] = trimmedLine.split('=');
        if (key && value) {
          const keyTrimmed = key.trim();
          const valueTrimmed = value.trim();
          // 如果环境变量已经设置（比如通过 cross-env），则不要覆盖
          if (!process.env[keyTrimmed]) {
            process.env[keyTrimmed] = valueTrimmed;
          }
        }
      }
    });
    console.log('✅ 环境变量加载成功:', {
      API_BASE_URL: process.env.API_BASE_URL,
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT
    });
  } else {
    console.warn('⚠️ .env.local 文件不存在，使用默认环境变量');
  }
}

// 加载环境变量
loadEnvironmentVariables();

let mainWindow;

// 初始化文件日志（无安装版本也会在当前目录生成日志）
let fileLoggerInitialized = false;
let logStream = null;
function initFileLogger() {
  if (fileLoggerInitialized) return;
  try {
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const logFile = path.join(logsDir, `${dateStr}.log`);
    logStream = fs.createWriteStream(logFile, { flags: 'a' });

    const write = (level, args) => {
      try {
        const time = new Date().toISOString();
        const line = `[${time}] [${level}] ` + args.map(a => {
          try { return typeof a === 'string' ? a : JSON.stringify(a); } catch { return String(a); }
        }).join(' ') + '\n';
        logStream.write(line);
      } catch {}
    };

    const original = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error
    };

    console.log = (...args) => { original.log.apply(console, args); write('LOG', args); };
    console.info = (...args) => { original.info.apply(console, args); write('INFO', args); };
    console.warn = (...args) => { original.warn.apply(console, args); write('WARN', args); };
    console.error = (...args) => { original.error.apply(console, args); write('ERROR', args); };

    // 捕获渲染进程的控制台输出
    app.on('browser-window-created', (event, window) => {
      try {
        window.webContents.on('console-message', (event, level, message, line, sourceId) => {
          const levelMap = { 0: 'LOG', 1: 'WARN', 2: 'ERROR', 3: 'INFO' };
          write(`RENDERER-${levelMap[level] || 'LOG'}`, [message, `source:${sourceId}`, `line:${line}`]);
        });
      } catch {}
    });

    fileLoggerInitialized = true;
    console.log('🗂️ 文件日志已启用:', logFile);
  } catch (e) {
    console.warn('⚠️ 初始化文件日志失败:', e && e.message);
  }
}

function createWindow() {
  // 确保文件日志就绪
  initFileLogger();
  
  // 开发模式检查：明确设置为 production 才是生产模式，否则都是开发模式
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  console.log('🏗️ 环境检测:', {
    NODE_ENV: process.env.NODE_ENV,
    isDevelopment: isDevelopment,
    isPackaged: app.isPackaged
  });
  
  // 读取全屏配置（需要从用户数据目录读取，因为localStorage在主进程不可用）
  // 使用配置文件方式
  const userDataPath = app.getPath('userData');
  const configPath = path.join(userDataPath, 'app-config.json');
  let startFullscreen = true; // 默认全屏
  
  try {
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configData);
      if (config.startFullscreen !== undefined) {
        startFullscreen = config.startFullscreen;
        console.log('📖 从配置文件读取全屏设置:', startFullscreen);
      }
    } else {
      console.log('📝 配置文件不存在，使用默认全屏设置: true');
    }
  } catch (error) {
    console.warn('⚠️ 读取配置文件失败，使用默认全屏设置:', error.message);
  }
  
  // 固定窗口尺寸：1080×1920 (9:16 比例)
  mainWindow = new BrowserWindow({
    width: 1080,
    height: 1920,
    minWidth: 1080,
    minHeight: 1920,
    maxWidth: 1080,
    maxHeight: 1920,
    useContentSize: true, // 使用内容区域尺寸，不受DPI缩放影响
    resizable: false,
    center: true,
    frame: !startFullscreen, // 全屏时隐藏边框，非全屏时显示标题栏和菜单栏
    fullscreen: startFullscreen, // 根据配置决定是否全屏
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: false,
      allowRunningInsecureContent: true,
      experimentalFeatures: true,
      zoomFactor: 1.0 // 禁用页面缩放
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    autoHideMenuBar: !startFullscreen, // 全屏时自动隐藏菜单栏，非全屏时显示
    title: '服装空间胶囊'
  });
  
  console.log('🪟 窗口创建完成，全屏状态:', startFullscreen, '边框:', !startFullscreen);

  // 加载主页面
  mainWindow.loadFile('renderer/index.html');
  
  // 在页面加载完成后注入环境变量
  mainWindow.webContents.on('did-finish-load', () => {
    const nodeEnv = process.env.NODE_ENV || 'development';
    const isProduction = nodeEnv === 'production';
    const isDevelopment = !isProduction;
    
    console.log('📦 注入环境变量到渲染进程:', {
      NODE_ENV: nodeEnv,
      IS_PRODUCTION: isProduction,
      IS_DEVELOPMENT: isDevelopment
    });
    
    // 通过执行 JS 代码注入全局环境变量
    mainWindow.webContents.executeJavaScript(`
      window.__APP_ENV__ = {
        NODE_ENV: '${nodeEnv}',
        IS_PRODUCTION: ${isProduction},
        IS_DEVELOPMENT: ${isDevelopment}
      };
      console.log('✅ 环境变量已注入:', window.__APP_ENV__);
    `).catch(err => {
      console.error('❌ 注入环境变量失败:', err);
    });
    
    // 强制设置窗口内容尺寸为 1080x1920
    mainWindow.setContentSize(1080, 1920);
    console.log('📊 强制设置窗口内容尺寸: 1080x1920');
    
    // 禁用缩放
    mainWindow.webContents.setZoomFactor(1.0);
    console.log('🔍 禁用页面缩放: 100%');
  });

  // 使用之前定义的isDevelopment变量
  
  console.log('🔧 开发模式检查:', {
    NODE_ENV: process.env.NODE_ENV,
    NODE_ENV_type: typeof process.env.NODE_ENV,
    NODE_ENV_value: process.env.NODE_ENV === 'production' ? 'production' : (process.env.NODE_ENV === 'development' ? 'development' : 'not set'),
    hasDevtoolsArg: process.argv.includes('--devtools'),
    hasDevArg: process.argv.includes('--dev'),
    isPackaged: app.isPackaged,
    isDevelopment: isDevelopment,
    args: process.argv
  });
  
  // 免安装版本（打包为便携版）默认也打开 DevTools，便于排查
  try {
    console.log('🛠️ 默认打开DevTools（开发或便携运行）');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } catch (e) {
    console.warn('⚠️ 打开 DevTools 失败:', e && e.message);
  }

  // 绑定快捷键：F12 / Ctrl+Shift+I 切换 DevTools
  mainWindow.webContents.on('before-input-event', (event, input) => {
    const isF12 = input.type === 'keyDown' && input.key === 'F12';
    const isCtrlShiftI = input.type === 'keyDown' && input.control && input.shift && (input.key === 'I' || input.code === 'KeyI');
    if (isF12 || isCtrlShiftI) {
      if (mainwindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      } else {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
      }
      event.preventDefault();
    }
  });

  // 窗口关闭事件
  mainWindow.on('closed', () => {
    console.log('🚪 主窗口已关闭');
    mainWindow = null;
  });
  
  // 窗口准备关闭事件
  mainWindow.on('close', (event) => {
    console.log('🚨 窗口准备关闭，开始清理资源...');
    
    // 阻止默认关闭行为，先清理资源
    event.preventDefault();
    
    // 清理资源后才真正关闭
    cleanupAndExit();
    
    // 结束整个应用
    setTimeout(() => {
      app.quit();
    }, 1000); // 给1秒后退出
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

// 设置全屏状态
ipcMain.on('set-fullscreen', (event, fullscreen) => {
  if (mainWindow) {
    mainWindow.setFullScreen(fullscreen);
    console.log(`📱 设置全屏: ${fullscreen}`);
  }
});

// 保存应用配置到文件
ipcMain.handle('save-app-config', async (event, config) => {
  try {
    const userDataPath = app.getPath('userData');
    const configPath = path.join(userDataPath, 'app-config.json');
    
    // 读取现有配置
    let existingConfig = {};
    if (fs.existsSync(configPath)) {
      try {
        const configData = fs.readFileSync(configPath, 'utf8');
        existingConfig = JSON.parse(configData);
      } catch (e) {
        console.warn('⚠️ 读取现有配置失败:', e.message);
      }
    }
    
    // 合并配置
    const newConfig = { ...existingConfig, ...config };
    
    // 写入配置文件
    fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2), 'utf8');
    console.log('✅ 配置已保存到:', configPath);
    console.log('📝 配置内容:', newConfig);
    
    return { success: true, path: configPath };
  } catch (error) {
    console.error('❌ 保存配置失败:', error);
    return { success: false, error: error.message };
  }
});

// 获取环境变量
ipcMain.handle('get-env-var', (event, varName) => {
  return process.env[varName] || null;
});

// 获取所有相关环境变量
ipcMain.handle('get-app-config', () => {
  return {
    API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:4001',
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || '4001'
  };
});

// 保存照片到uploads文件夹（测试功能）
ipcMain.handle('save-photo-to-uploads', async (event, buffer, fileName) => {
  try {
    // 优先选择当前工作目录下的 uploads（适配免安装直接运行）
    let uploadsDir = path.join(process.cwd(), 'uploads');
    try {
      // 测试当前目录可写
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log('✅ 在当前目录创建uploads目录:', uploadsDir);
      }
      fs.accessSync(uploadsDir, fs.constants.W_OK);
    } catch (e) {
      console.warn('⚠️ 当前目录不可写，回退到应用目录:', e.message);
      uploadsDir = path.join(__dirname, 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log('✅ 在应用目录创建uploads目录:', uploadsDir);
      }
    }
    
    // 确保uploads目录存在
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('✅ 创建uploads目录:', uploadsDir);
    }
    
    const filePath = path.join(uploadsDir, fileName);
    
    // 保存文件
    fs.writeFileSync(filePath, buffer);
    
    console.log('✅ 照片已保存到uploads文件夹:', filePath);
    
    return {
      success: true,
      filePath: filePath,
      fileName: fileName
    };
  } catch (error) {
    console.error('❌ 保存照片到uploads文件夹失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// 应用就绪时创建窗口
app.whenReady().then(() => {
  console.log('🚀 应用启动，当前环境变量:', {
    NODE_ENV: process.env.NODE_ENV,
    args: process.argv,
    isPackaged: app.isPackaged
  });
  createWindow();
});

// 权限处理：自动允许媒体（摄像头/麦克风）访问，符合 Electron 社区对本地应用的实践
app.whenReady().then(() => {
  try {
    const ses = session.defaultSession;
    if (ses && ses.setPermissionRequestHandler) {
      ses.setPermissionRequestHandler((webContents, permission, callback) => {
        if (permission === 'media' || permission === 'audioCapture' || permission === 'videoCapture') {
          return callback(true);
        }
        // 其余权限保持默认允许（如需更严格可按需收敛）
        callback(true);
      });
      console.log('🔐 媒体权限处理已启用（默认允许本应用访问摄像头）');
    }
  } catch (e) {
    console.warn('⚠️ 设置媒体权限处理失败:', e && e.message);
  }
});

// 当所有窗口关闭时退出应用
app.on('window-all-closed', () => {
  console.log('🚪 所有窗口已关闭，准备退出应用...');
  
  // 强制清理所有资源
  cleanupAndExit();
  
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
app.on('before-quit', (event) => {
  console.log('🚨 应用正在退出，开始清理资源...');
  
  // 确保所有资源被清理
  cleanupAndExit();
});

// 处理应用即将退出
app.on('will-quit', (event) => {
  console.log('⚠️ 应用即将退出，执行最终清理...');
  
  // 强制退出所有进程
  cleanupAndExit();
});

// 清理函数
function cleanupAndExit() {
  try {
    console.log('🧹 开始清理资源...');
    
    // 关闭所有窗口
    const allWindows = BrowserWindow.getAllWindows();
    allWindows.forEach(window => {
      if (!window.isDestroyed()) {
        window.destroy();
      }
    });
    
    // 尝试通知后台服务器关闭
    const http = require('http');
    
    // 通知主服务器关闭
    const shutdownMainServer = () => {
      return new Promise((resolve) => {
        const req = http.request({
          hostname: 'localhost',
          port: 3000,
          path: '/shutdown',
          method: 'POST',
          timeout: 1000
        }, () => {
          console.log('✅ 主服务器关闭信号已发送');
          resolve();
        });
        
        req.on('error', () => {
          console.log('⚠️ 主服务器可能已关闭');
          resolve();
        });
        
        req.on('timeout', () => {
          console.log('⚠️ 主服务器关闭请求超时');
          req.destroy();
          resolve();
        });
        
        req.end();
      });
    };
    
    // 异步执行清理，但不阻塞退出
    Promise.all([shutdownMainServer()])
      .then(() => {
        console.log('🎯 清理完成');
      })
      .catch(() => {
        console.log('⚠️ 部分清理操作失败，但继续退出');
      });
      
  } catch (error) {
    console.error('❌ 清理过程中出错:', error);
  }
}

// 错误处理
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  console.log('🚨 由于未捕获异常，开始安全退出...');
  cleanupAndExit();
  setTimeout(() => {
    process.exit(1);
  }, 2000); // 给2秒后强制退出
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的 Promise 拒绝:', reason);
  console.log('🚨 由于Promise拒绝，开始安全退出...');
  cleanupAndExit();
});

// 处理系统信号
process.on('SIGINT', () => {
  console.log('接收到 SIGINT 信号，开始安全退出...');
  cleanupAndExit();
  setTimeout(() => {
    process.exit(0);
  }, 3000); // 给3秒后强制退出
});

process.on('SIGTERM', () => {
  console.log('接收到 SIGTERM 信号，开始安全退出...');
  cleanupAndExit();
  setTimeout(() => {
    process.exit(0);
  }, 3000); // 给3秒后强制退出
});