// API 客户端模块 - 与新的 API Server 通信
console.log('🚀 开始加载 api-client.js 文件...');
class ApiClient {
    constructor() {
        // 初始化时自动检测环境，选择默认地址
        this.baseUrl = this.getDefaultBaseUrl();
        this.token = null;
        this.deviceId = null;
        this.initialized = false;
        
        console.log('🔧 API客户端已创建，默认地址:', this.baseUrl);
    }

    // 自动检测环境并返回默认 API 地址
    getDefaultBaseUrl() {
        try {
            // 0. 优先检查主进程注入的环境变量（最可靠）
            if (typeof window !== 'undefined' && window.__APP_ENV__ && window.__APP_ENV__.IS_PRODUCTION) {
                console.log('📦 生产环境模式（注入环境变量），默认API服务器: https://clothing-api.0086studios.xyz');
                return 'https://clothing-api.0086studios.xyz';
            }
            
            // 1. 尝试直接访问 process.env（仅在 nodeIntegration 开启时有效）
            let nodeEnv = null;
            try {
                if (typeof process !== 'undefined' && process.env) {
                    nodeEnv = process.env.NODE_ENV;
                    if (nodeEnv === 'production') {
                        console.log('📦 生产环境模式（process.env），默认API服务器: https://clothing-api.0086studios.xyz');
                        return 'https://clothing-api.0086studios.xyz';
                    }
                }
            } catch (e) {
                console.log('ℹ️ 无法直接访问 process.env');
            }
            
            // 2. 检查 localStorage 中的开发模式设置
            const devMode = localStorage.getItem('DEV_MODE') === 'true';
            if (devMode) {
                console.log('🔧 开发模式已启用（通过 localStorage），默认API服务器: http://localhost:4001');
                return 'http://localhost:4001';
            }
            
            // 3. 检查 URL 参数
            const urlParams = new URLSearchParams(window.location.search);
            const urlDevMode = urlParams.get('dev') === 'true';
            if (urlDevMode) {
                console.log('🔧 开发模式已启用（通过 URL 参数），默认API服务器: http://localhost:4001');
                return 'http://localhost:4001';
            }
            
            // 4. 检查是否为真正的本地开发环境（仅 localhost/127.0.0.1，不包括 file://）
            const isLocalhost = window.location.hostname === 'localhost' || 
                               window.location.hostname === '127.0.0.1';
            
            if (isLocalhost) {
                console.log('🔧 检测到本地开发环境（localhost），默认API服务器: http://localhost:4001');
                return 'http://localhost:4001';
            }
            
            // 5. 其他情况（包括 file:// 协议的生产打包）默认使用生产环境
            console.log('🌐 检测到生产环境，默认API服务器: https://clothing-api.0086studios.xyz');
            return 'https://clothing-api.0086studios.xyz';
        } catch (error) {
            console.error('检测环境失败，使用默认生产环境地址:', error);
            return 'https://clothing-api.0086studios.xyz';
        }
    }

    // 初始化方法，从配置页面获取服务器地址
    async initialize() {
        if (this.initialized) {
            return;
        }
        
        try {
            console.log('🔄 开始初始化API客户端配置...');
            
            // 从全局应用状态获取配置
            if (typeof appState !== 'undefined' && appState.getConfig) {
                const config = appState.getConfig();
                console.log('📄 获取到配置:', {
                    apiServerUrl: config.apiServer?.url || '未设置',
                    serverHost: config.server?.host || '未设置',
                    serverPort: config.server?.port || '未设置'
                });
                
                // 优先使用新的 apiServer.url 配置
                if (config.apiServer && config.apiServer.url) {
                    this.baseUrl = config.apiServer.url;
                    console.log('✅ 使用配置页面设置的API服务器地址:', this.baseUrl);
                } else if (config.server && config.server.host && config.server.port) {
                    // 向下兼容：使用配置页面设置的服务器地址
                    const protocol = config.server.host.includes('localhost') || config.server.host.includes('127.0.0.1') ? 'http' : 'https';
                    this.baseUrl = `${protocol}://${config.server.host}:${config.server.port}`;
                    console.log('✅ 使用配置页面设置的服务器地址(兼容模式):', this.baseUrl);
                } else {
                    console.log('⚠️ 配置页面中未设置服务器地址，使用默认地址:', this.baseUrl);
                }
            } else {
                console.warn('⚠️ 无法获取全局应用状态，使用默认配置:', this.baseUrl);
            }
            
            this.initialized = true;
            console.log('🚀 API客户端初始化完成，目标地址:', this.baseUrl);
        } catch (error) {
            console.error('❌ API客户端初始化失败，使用默认配置:', error);
            this.initialized = true; // 即使失败也标记为已初始化，使用默认值
        }
    }

    // 设置认证令牌
    setToken(token) {
        this.token = token;
    }

    // 设置设备ID
    setDeviceId(deviceId) {
        this.deviceId = deviceId;
    }

    // 通用请求方法
    async request(endpoint, options = {}) {
        // 确保在发起请求前已初始化
        await this.initialize();
        
        const url = `${this.baseUrl}${endpoint}`;
        
        // 创建超时控制器
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时
        
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options,
            signal: controller.signal
        };

        // 添加认证头
        if (this.token) {
            config.headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        // 添加登录方式头（从 localStorage 读取）
        const loginType = localStorage.getItem('loginType') || 'wechat';
        config.headers['X-Login-Type'] = loginType;

        try {
            console.log(`📤 API请求: ${config.method || 'GET'} ${url}`);
            const response = await fetch(url, config);
            clearTimeout(timeoutId); // 请求成功后清除超时
            const data = await response.json();

            if (!response.ok) {
                console.error(`❌ API请求失败 [${endpoint}]:`, {
                    status: response.status,
                    statusText: response.statusText,
                    error: data.error
                });
                throw new Error(data.error || `HTTP ${response.status}`);
            }

            console.log(`✅ API请求成功 [${endpoint}]:`, data.success ? '成功' : '失败');
            return data;
        } catch (error) {
            clearTimeout(timeoutId); // 确保清除超时
            console.error(`❌ API 请求失败 [${endpoint}]:`, error.message);
            
            // 检查是否是超时错误
            if (error.name === 'AbortError' || error.message.includes('timeout')) {
                console.error('⏱️ 请求超时，请检查网络连接或服务器状态');
                throw new Error('请求超时，请检查网络连接或服务器状态');
            }
            
            // 检查是否是网络错误
            if (error.message.includes('Failed to fetch') || 
                error.message.includes('ERR_TIMED_OUT') ||
                error.message.includes('ERR_NETWORK_CHANGED') ||
                error.message.includes('ERR_INTERNET_DISCONNECTED')) {
                console.error('🌐 网络连接失败，请检查：');
                console.error('  1. 网络连接是否正常');
                console.error('  2. API服务器是否可访问:', this.baseUrl);
                console.error('  3. 防火墙是否阻止了连接');
                throw new Error('网络连接失败，请检查网络连接和API服务器状态');
            }
            
            throw error;
        }
    }

    // 设备认证
    async authenticateDevice(macAddress, deviceName) {
        try {
            const response = await this.request('/api/auth/device', {
                method: 'POST',
                body: JSON.stringify({
                    macAddress,
                    deviceName
                })
            });

            if (response.success) {
                this.setToken(response.token);
                this.setDeviceId(response.device.id);
                return response;
            }

            throw new Error(response.error || '设备认证失败');
        } catch (error) {
            console.error('设备认证失败:', error);
            
            // 检查是否是网络错误
            if (error.message.includes('Failed to fetch') || 
                error.message.includes('ERR_NETWORK_CHANGED') ||
                error.message.includes('ERR_INTERNET_DISCONNECTED')) {
                console.warn('🌐 网络连接失败，启用离线模式');
                this.setOfflineMode(true);
                return {
                    success: false,
                    offline: true,
                    error: '网络连接失败，已启用离线模式'
                };
            }
            
            throw error;
        }
    }

    // 设置离线模式
    setOfflineMode(isOffline) {
        this.isOffline = isOffline;
        localStorage.setItem('api_offline_mode', isOffline.toString());
        console.log(`🌐 离线模式${isOffline ? '已启用' : '已禁用'}`);
    }

    // 检查是否处于离线模式
    isOfflineMode() {
        if (this.isOffline !== undefined) {
            return this.isOffline;
        }
        const stored = localStorage.getItem('api_offline_mode');
        this.isOffline = stored === 'true';
        return this.isOffline;
    }

    // 开发模式快速设置
    async quickSetup(macAddress, deviceName = null, nickname = null) {
        try {
            console.log('📡 调用 /api/dev/quick-setup 接口...');
            
            const requestBody = {
                macAddress
            };
            
            if (deviceName) {
                requestBody.deviceName = deviceName;
            }
            
            if (nickname) {
                requestBody.nickname = nickname;
            }
            
            const response = await this.request('/api/dev/quick-setup', {
                method: 'POST',
                body: JSON.stringify(requestBody)
            });

            if (response.success) {
                // 保存返回的 token
                if (response.token) {
                    this.setToken(response.token);
                    console.log('✅ Token 已自动保存');
                }
                
                console.log('✅ 快速设置成功');
                console.log('  - sceneStr:', response.sceneStr);
                console.log('  - openid:', response.wechatUser?.openid);
                console.log('  - deviceId:', response.device?.id);
                
                return response;
            }

            throw new Error(response.error || '快速设置失败');
        } catch (error) {
            console.error('❌ 快速设置失败:', error);
            throw error;
        }
    }

    // 获取设备信息
    async getDeviceInfo() {
        return await this.request('/api/auth/device');
    }

    // 微信相关接口
    // 生成关注二维码 - 修改为使用新的接口规范
    async generateWechatQRCode(macAddress) {
        return await this.request('/api/wechat/qrcode', {
            method: 'POST',
            body: JSON.stringify({ macAddress })
        });
    }

    // 【新增】生成统一二维码（支持微信/第三方）
    async generateQRCode(deviceId, loginType = null) {
        const requestBody = { deviceId };
        
        // 如果指定了登录类型，添加到请求体
        if (loginType) {
            requestBody.loginType = loginType;
        } else {
            // 从 localStorage 读取默认登录类型
            const savedLoginType = localStorage.getItem('loginType') || 'wechat';
            requestBody.loginType = savedLoginType;
        }
        
        console.log('📤 生成二维码请求:', requestBody);
        
        return await this.request('/api/auth/qrcode', {
            method: 'POST',
            body: JSON.stringify(requestBody)
        });
    }

    // 【新增】轮询登录状态（第三方登录）
    async pollLoginStatus(deviceId) {
        console.log('🔄 轮询登录状态:', deviceId);
        return await this.request(`/api/auth/poll-login/${deviceId}`);
    }

    // 查询二维码状态 - 新增接口
    async getWechatQRCodeStatus(sceneStr) {
        return await this.request(`/api/wechat/qrcode/${sceneStr}/status`);
    }

    // 设置二维码失效 - 新增接口
    async invalidateWechatQRCode(sceneStr) {
        return await this.request(`/api/wechat/qrcode/${sceneStr}/invalidate`, {
            method: 'POST'
        });
    }

    // 检查用户关注状态 - 修改为使用新的接口规范
    async checkWechatStatus(sceneStr) {
        return await this.request(`/api/wechat/status/${sceneStr}`);
    }

    // 生成下载二维码
    async generateDownloadQR(data) {
        return await this.request('/api/wechat/download-qr', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // 推送试装结果到用户
    async pushTryonResult(data) {
        return await this.request('/api/wechat/push-tryon-result', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // 衣服相关接口
    async getClothingCategories() {
        return await this.request('/api/clothes/categories');
    }

    async getClothingList(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = queryString ? `/api/clothes/list?${queryString}` : '/api/clothes/list';
        return await this.request(endpoint);
    }

    async getClothingDetail(clothesId) {
        return await this.request(`/api/clothes/${clothesId}`);
    }

    async getClothingByCategory(categoryId, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = queryString ? `/api/clothes/category/${categoryId}?${queryString}` : `/api/clothes/category/${categoryId}`;
        return await this.request(endpoint);
    }

    // 上传接口 - sceneStr作为表单数据参数
    async uploadPhoto(photoFile, sceneStr = null, loginType = null) {
        // 确保初始化
        await this.initialize();
        
        console.log('📸 uploadPhoto - 当前baseUrl:', this.baseUrl);
        console.log('📸 uploadPhoto - sceneStr:', sceneStr);
        
        const formData = new FormData();
        formData.append('photo', photoFile);
        
        // sceneStr作为表单数据传递
        if (sceneStr) {
            formData.append('sceneStr', sceneStr);
        }
        
        // 添加登录类型
        if (loginType) {
            formData.append('loginType', loginType);
        } else {
            // 从 localStorage 读取
            const savedLoginType = localStorage.getItem('loginType') || 'wechat';
            formData.append('loginType', savedLoginType);
        }
        
        const endpoint = '/api/tasks/upload-photo';
        const fullUrl = `${this.baseUrl}${endpoint}`;
        console.log('📤 完整上传URL:', fullUrl);
        
        // 获取登录类型用于日志
        const usedLoginType = loginType || localStorage.getItem('loginType') || 'wechat';
        console.log('🔑 使用的登录类型:', usedLoginType);
        
        const response = await fetch(fullUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`
            },
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `HTTP ${response.status}`);
        }

        return data;
    }

    async getPhotos() {
        return await this.request('/api/upload/photos');
    }

    async deletePhoto(fileName) {
        return await this.request(`/api/upload/photo/${fileName}`, {
            method: 'DELETE'
        });
    }

    // 任务相关接口
    // 创建试装任务 - 已弃用，因为上传照片时已创建任务
    /*
    async createTryonTask(topClothesId, bottomClothesId = null, userPhotoUrl) {
        const requestBody = {
            userPhotoUrl
        };
        
        if (topClothesId) {
            requestBody.topClothesId = topClothesId;
        }
        
        if (bottomClothesId) {
            requestBody.bottomClothesId = bottomClothesId;
        }
        
        return await this.request('/api/tasks', {
            method: 'POST',
            body: JSON.stringify(requestBody)
        });
    }
    */

    // 启动试装任务 - 更新为新的接口规范，支持sceneStr和loginType参数
    async startTryonTask(taskId, topClothesId, bottomClothesId = null, sceneStr = null, loginType = null) {
        const requestBody = {
            taskId,
            topClothesId
        };
        
        if (bottomClothesId) {
            requestBody.bottomClothesId = bottomClothesId;
        }
        
        // 如果提供了sceneStr，添加到请求体中
        if (sceneStr) {
            requestBody.sceneStr = sceneStr;
        }
        
        // 添加登录类型
        if (loginType) {
            requestBody.loginType = loginType;
        } else {
            // 从 localStorage 读取
            const savedLoginType = localStorage.getItem('loginType') || 'wechat';
            requestBody.loginType = savedLoginType;
        }
        
        console.log('🚀 启动试装请求:', requestBody);
        
        try {
            return await this.request('/api/tasks/start-tryon', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
        } catch (error) {
            // 处理积分相关错误
            if (error.message.includes('402') || error.message.includes('积分不足')) {
                console.error('❌ 积分不足或扣除失败');
                throw new Error('积分不足，请充值后再试');
            }
            if (error.message.includes('500') || error.message.includes('积分接口')) {
                console.error('❌ 积分接口异常');
                throw new Error('积分系统异常，请稍后重试');
            }
            throw error;
        }
    }

    // 查询任务状态
    async getTaskStatus(taskId) {
        return await this.request(`/api/tasks/${taskId}`);
    }

    // 获取设备任务列表
    async getDeviceTasks(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = queryString ? `/api/tasks/device?${queryString}` : '/api/tasks/device';
        return await this.request(endpoint);
    }

    async getTasks(params = {}) {
        // 为了向后兼容，保持原有的getTasks方法，但推荐使用getDeviceTasks
        return await this.getDeviceTasks(params);
    }

    // 取消任务（API文档中未提及，但保留以避免破坏现有代码）
    async cancelTask(taskId) {
        return await this.request(`/api/tasks/${taskId}/cancel`, {
            method: 'POST'
        });
    }

    // 健康检查
    async healthCheck() {
        return await this.request('/health');
    }

    // 获取设备状态
    async getDeviceStatus() {
        return await this.request('/api/auth/device');
    }

    /*
    // 获取设备会话信息 - 已弃用
    async getDeviceSessions(deviceId, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = queryString ? `/api/devices/${deviceId}/sessions?${queryString}` : `/api/devices/${deviceId}/sessions`;
        return await this.request(endpoint);
    }

    // 结束设备会话 - 已弃用
    async endDeviceSession(deviceId, sessionId) {
        return await this.request(`/api/devices/${deviceId}/sessions/${sessionId}/end`, {
            method: 'POST'
        });
    }
    */

    // 激活推送二维码
    async activatePushQrCode(data) {
        return await this.request('/api/wechat/qrcode-for-push', {
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    // 检查推送状态
    async checkPushStatus(sceneStr) {
        return await this.request(`/api/wechat/check-push-status?sceneStr=${encodeURIComponent(sceneStr)}`, {
            method: 'GET'
        });
    }

    // 获取设备MAC地址
    async getMacAddress() {
        try {
            // 尝试通过系统API获取MAC地址
            // 注意：在浏览器环境中，出于安全考虑，通常无法直接获取真实的MAC地址
            // 这里我们返回一个模拟的MAC地址用于开发和测试
            
            // 检查localStorage中是否已保存MAC地址
            const savedMac = localStorage.getItem('device-mac-address');
            if (savedMac) {
                return {
                    success: true,
                    macAddress: savedMac
                };
            }
            
            // 生成一个随机的MAC地址（仅用于开发测试）
            const randomMac = '00:11:22:33:44:' + Math.floor(Math.random() * 90 + 10).toString();
            localStorage.setItem('device-mac-address', randomMac);
            
            return {
                success: true,
                macAddress: randomMac
            };
        } catch (error) {
            console.error('获取MAC地址失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// 创建全局 API 客户端实例
console.log('🚀 实例化 ApiClient 类...');
const apiClient = new ApiClient();

// 导出供其他模块使用
// 在 Electron 环境中，无论如何都优先设置 window 全局变量
if (typeof window !== 'undefined') {
    console.log('🌐 检测到浏览器环境，设置 window 全局变量');
    
    // 强制设置wWindow全局变量
    window.ApiClient = ApiClient;
    window.apiClient = apiClient;
    
    // 立即验证设置是否成功
    const verification = {
        hasWindow: typeof window !== 'undefined',
        ApiClientType: typeof window.ApiClient,
        apiClientType: typeof window.apiClient,
        ApiClientIsFunction: typeof window.ApiClient === 'function',
        apiClientIsObject: typeof window.apiClient === 'object',
        baseUrl: window.apiClient ? window.apiClient.baseUrl : 'N/A'
    };
    
    console.log('✅ API客户端验证结果:', verification);
    
    if (verification.ApiClientIsFunction && verification.apiClientIsObject) {
        console.log('🎉 API客户端全局变量设置成功！');
    } else {
        console.error('❌ API客户端全局变量设置失败！');
        console.error('当前 window 对象状态:', Object.keys(window).filter(key => key.includes('api') || key.includes('Api')));
    }
    
} else if (typeof module !== 'undefined' && module.exports) {
    console.log('📦 Node.js 环境，使用 module.exports');
    module.exports = { ApiClient, apiClient };
} else {
    console.error('❌ 未知环境，无法设置全局变量');
}

console.log('🏁 api-client.js 文件加载完成');