# Electron客户端Dev模式下自动打开调试控制台

## 修改总结

已成功修改Electron客户端，使其在开发模式下默认自动打开调试控制台（DevTools）。

## 主要修改

### 1. 增强开发模式检测 ✅

**文件**: `main.js`

**修改内容**:
- 扩展了开发模式的检测条件
- 添加了详细的调试日志
- 支持多种开发模式标识

**修改前**:
```javascript
const enableDevTools = process.env.NODE_ENV === 'development' || process.argv.includes('--devtools');
if (enableDevTools) {
  mainWindow.webContents.openDevTools({ mode: 'detach' });
}
```

**修改后**:
```javascript
const isDevelopment = process.env.NODE_ENV === 'development' || 
                     process.argv.includes('--devtools') ||
                     process.argv.includes('--dev') ||
                     process.argv.includes('dev') ||
                     !app.isPackaged; // Electron未打包时视为开发模式

console.log('🔧 开发模式检查:', {
  NODE_ENV: process.env.NODE_ENV,
  hasDevtoolsArg: process.argv.includes('--devtools'),
  hasDevArg: process.argv.includes('--dev'),
  isPackaged: app.isPackaged,
  isDevelopment: isDevelopment,
  args: process.argv
});

if (isDevelopment) {
  console.log('🛠️ 开发模式：自动打开DevTools');
  mainWindow.webContents.openDevTools({ mode: 'detach' });
}
```

### 2. 优化启动脚本 ✅

**文件**: `package.json`

**修改内容**:
```json
{
  "scripts": {
    "dev": "concurrently \"npm run server\" \"electron . --dev\""
  }
}
```

**说明**: 在 `npm run dev` 命令中添加了 `--dev` 参数，明确标识为开发模式。

### 3. 增强启动器 ✅

**文件**: `start-electron.js`

**修改内容**:
```javascript
const electron = spawn('electron', ['.', '--dev', '--devtools'], {
    stdio: 'inherit',
    shell: true
});
```

**说明**: 在通过 `npm start` 启动时，同时传递 `--dev` 和 `--devtools` 参数。

## 开发模式检测条件

现在支持以下任一条件触发开发模式：

1. **环境变量**: `NODE_ENV=development`
2. **启动参数**: `--devtools`
3. **启动参数**: `--dev` 
4. **启动参数**: `dev`
5. **未打包状态**: `!app.isPackaged` （Electron应用未经过electron-packager打包）

## 使用方法

### 方法1: 使用npm脚本（推荐）

```bash
# 启动开发模式（会自动打开DevTools）
npm run dev

# 或使用完整的启动命令（也会自动打开DevTools）
npm start
```

### 方法2: 直接启动Electron

```bash
# 使用--dev参数
electron . --dev

# 使用--devtools参数
electron . --devtools

# 或者两个都用
electron . --dev --devtools
```

### 方法3: 环境变量方式

```bash
# 设置环境变量后启动
NODE_ENV=development electron .
```

## 调试信息

当应用启动时，控制台会显示详细的开发模式检查信息：

```
🔧 开发模式检查: {
  NODE_ENV: 'production',
  hasDevtoolsArg: true,
  hasDevArg: true,
  isPackaged: false,
  isDevelopment: true,
  args: ['/path/to/electron', '/path/to/app', '--dev', '--devtools']
}
🛠️ 开发模式：自动打开DevTools
```

## DevTools特性

当DevTools自动打开时：

- **分离模式**: DevTools会在独立窗口中打开（`mode: 'detach'`）
- **快捷键支持**: 仍然支持 F12 或 Ctrl+Shift+I 切换DevTools
- **完整功能**: 包括Console、Network、Elements、Sources等所有调试功能

## 生产模式

在生产模式下（打包后的应用），DevTools不会自动打开，但用户仍可以通过快捷键手动打开：

- **F12**: 切换DevTools
- **Ctrl+Shift+I**: 切换DevTools

## 兼容性

这些修改向后兼容，不会影响：

- 现有的快捷键功能
- 生产环境的行为
- 其他启动方式

## 调试建议

1. **开发阶段**: 使用 `npm run dev` 获得最佳开发体验
2. **问题排查**: 查看控制台的开发模式检查日志
3. **性能测试**: 在生产模式下测试应用性能
4. **用户体验**: 确保最终用户不会意外看到DevTools

## 注意事项

- DevTools的自动打开只在开发模式下生效
- 打包后的应用会自动禁用此功能
- 如果不希望在某次开发中打开DevTools，可以修改环境变量或去掉启动参数

这些修改确保开发者在开发过程中能够便捷地进行调试，提高开发效率。