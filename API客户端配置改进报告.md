# API客户端配置改进报告

## 修改目标
将[api-client.js](file://d:\private\clothing_space_capsule\renderer\api-client.js)中硬编码的服务器地址改为使用Electron客户端配置页面设置的服务器地址。

## 主要修改

### 1. 修改API客户端初始化逻辑

**文件**: `renderer/api-client.js`

#### 修改前
```javascript
constructor() {
    this.baseUrl = 'http://localhost:4001'; // 硬编码地址
    // ...
}
```

#### 修改后
```javascript
constructor() {
    this.baseUrl = 'http://localhost:4001'; // 默认值
    this.initialized = false;
    // ...
}

async initialize() {
    if (this.initialized) return;
    
    // 从全局应用状态获取配置
    if (typeof appState !== 'undefined' && appState.getConfig) {
        const config = appState.getConfig();
        if (config.server && config.server.host && config.server.port) {
            const protocol = config.server.host.includes('localhost') || 
                           config.server.host.includes('127.0.0.1') ? 'http' : 'https';
            this.baseUrl = `${protocol}://${config.server.host}:${config.server.port}`;
        }
    }
    
    this.initialized = true;
}
```

### 2. 确保每次请求前都初始化

**修改点**: 在`request()`方法开头添加`await this.initialize()`

```javascript
async request(endpoint, options = {}) {
    // 确保在发起请求前已初始化
    await this.initialize();
    
    const url = `${this.baseUrl}${endpoint}`;
    // ... 其余代码
}
```

### 3. 修改上传方法

在`uploadPhoto()`和`uploadPhotoAndCreateTask()`方法中也添加了初始化调用：

```javascript
async uploadPhoto(photoFile) {
    // 确保初始化
    await this.initialize();
    
    // ... 其余代码
}
```

### 4. 更新应用初始化流程

**文件**: `renderer/app.js`

修改`initializeApiClient()`函数，确保先调用API客户端的初始化：

```javascript
async function initializeApiClient() {
    // ... 检查代码 ...
    
    // 初始化API客户端（从配置页面加载服务器地址）
    await window.apiClient.initialize();
    
    // ... 其余代码 ...
}
```

### 5. 修正默认配置

将默认服务器端口从3000改为4001，与API服务器实际端口一致：

```javascript
server: {
    host: 'localhost',
    port: 4001  // 修改为与API服务器一致的端口
}
```

## 配置页面集成

### 配置字段
在配置页面中，用户可以设置：
- **Host**: 服务器主机地址（如 localhost, 192.168.1.100）
- **Port**: 服务器端口（如 4001）

### 配置存储
配置通过localStorage存储，使用`appState.getConfig()`和`appState.setConfig()`方法管理。

### 配置应用
API客户端会：
1. 在首次请求时读取配置
2. 根据Host是否为localhost/127.0.0.1自动选择http/https协议
3. 构造完整的API服务器地址

## 向后兼容性

### 默认行为
- 如果配置页面未设置服务器地址，使用默认值`http://localhost:4001`
- 如果获取配置失败，回退到默认配置
- 保持与现有代码的兼容性

### 错误处理
- 初始化失败时记录错误日志但不中断应用
- 网络请求失败时提供详细的错误信息
- 支持健康检查来验证服务器连接

## 测试工具

创建了`test_api_client_config.html`测试文件，用于：
- 验证配置读取逻辑
- 测试不同服务器地址的连接
- 模拟配置更新场景
- 检查API客户端初始化流程

## 使用方法

### 配置服务器地址
1. 打开Electron应用
2. 点击"打开配置"按钮
3. 在"服务器"部分设置Host和Port
4. 点击"保存配置"

### 验证配置
- 查看开发者控制台日志
- 观察API请求的目标地址
- 使用测试工具验证连接

## 优势

1. **灵活性**: 用户可以根据部署环境调整API服务器地址
2. **可维护性**: 消除硬编码，便于维护和更新
3. **部署友好**: 支持开发、测试、生产等不同环境
4. **用户友好**: 通过UI界面配置，无需修改代码
5. **向后兼容**: 保持默认行为不变，不影响现有功能

## 注意事项

- 确保API服务器在指定地址和端口运行
- 配置更改后建议重启应用以确保生效
- 使用测试工具验证新配置的连接性