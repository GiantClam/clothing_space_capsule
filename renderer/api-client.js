// API 客户端模块 - 与新的 API Server 通信
class ApiClient {
    constructor() {
        this.baseUrl = 'http://localhost:3001'; // API Server 地址
        this.token = null;
        this.deviceId = null;
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
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error(`API 请求失败 [${endpoint}]:`, error);
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
    async createTask(clothesId, userPhotoUrl) {
        return await this.request('/api/tasks/create', {
            method: 'POST',
            body: JSON.stringify({
                clothesId,
                userPhotoUrl
            })
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
const apiClient = new ApiClient();

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ApiClient, apiClient };
} else {
    window.ApiClient = ApiClient;
    window.apiClient = apiClient;
}
