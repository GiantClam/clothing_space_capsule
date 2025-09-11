// API 客户端模块 - 与新的 API Server 通信
console.log('🚀 开始加载 api-client.js 文件...');
class ApiClient {
    constructor() {
        // 初始化时使用默认地址，后续通过initialize方法加载配置
        this.baseUrl = 'http://localhost:4001'; // 默认值
        this.token = null;
        this.deviceId = null;
        this.initialized = false;
        
        console.log('🔧 API客户端已创建，等待初始化...');
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
                    serverHost: config.server?.host || '未设置',
                    serverPort: config.server?.port || '未设置'
                });
                
                if (config.server && config.server.host && config.server.port) {
                    // 使用配置页面设置的服务器地址
                    const protocol = config.server.host.includes('localhost') || config.server.host.includes('127.0.0.1') ? 'http' : 'https';
                    this.baseUrl = `${protocol}://${config.server.host}:${config.server.port}`;
                    console.log('✅ 使用配置页面设置的服务器地址:', this.baseUrl);
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
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        // 添加认证头
        if (this.token) {
            config.headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            console.log(`📤 API请求: ${config.method || 'GET'} ${url}`);
            const response = await fetch(url, config);
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
            console.error(`❌ API 请求失败 [${endpoint}]:`, error.message);
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
            throw error;
        }
    }

    // 获取设备信息
    async getDeviceInfo() {
        return await this.request('/api/auth/device');
    }

    // 微信相关接口
    async generateWechatQRCode(deviceId) {
        return await this.request('/api/wechat/qrcode', {
            method: 'POST',
            body: JSON.stringify({ deviceId })
        });
    }

    async checkWechatStatus(deviceId) {
        return await this.request(`/api/wechat/status/${deviceId}`);
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

    // 上传接口
    async uploadPhoto(photoFile) {
        // 确保初始化
        await this.initialize();
        
        const formData = new FormData();
        formData.append('photo', photoFile);

        const response = await fetch(`${this.baseUrl}/api/upload/photo`, {
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
    async uploadPhotoAndCreateTask(photoFile) {
        // 确保初始化
        await this.initialize();
        
        const formData = new FormData();
        formData.append('photo', photoFile);

        const response = await fetch(`${this.baseUrl}/api/tasks/upload-photo`, {
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

    async startTryonTask(taskId, topClothesId, bottomClothesId = null) {
        const requestBody = {
            taskId,
            topClothesId
        };
        
        if (bottomClothesId) {
            requestBody.bottomClothesId = bottomClothesId;
        }
        
        return await this.request('/api/tasks/start-tryon', {
            method: 'POST',
            body: JSON.stringify(requestBody)
        });
    }

    async getTaskStatus(taskId) {
        return await this.request(`/api/tasks/${taskId}`);
    }

    async getTasks(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = queryString ? `/api/tasks?${queryString}` : '/api/tasks';
        return await this.request(endpoint);
    }

    async cancelTask(taskId) {
        return await this.request(`/api/tasks/${taskId}/cancel`, {
            method: 'POST'
        });
    }

    // 健康检查
    async healthCheck() {
        return await this.request('/health');
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
