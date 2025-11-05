/**
 * 欢迎页面模块
 */
class WelcomePage {
    constructor() {
        this.pageId = window.APP_CONSTANTS.PAGES.WELCOME;
        this.initialized = false;
        this.wechatStatusCheckInterval = null;
        this.qrCodeRefreshInterval = null; // 二维码刷新定时器
        this.QR_REFRESH_INTERVAL = 3 * 60 * 1000; // 3分钟刷新一次
        
        // 连续点击相关
        this.secretClickCount = 0;
        this.secretClickTimer = null;
        this.SECRET_CLICK_REQUIRED = 5; // 需要连续点击5次
        this.SECRET_CLICK_TIMEOUT = 2000; // 2秒内有效
    }

    /**
     * 页面进入时触发
     */
    async onEnter(data = {}) {
        console.log('📄 进入欢迎页');
        
        try {
            // 只在首次初始化时执行
            if (!this.initialized) {
                await this.initialize();
                this.initialized = true;
            }
            
            // 生成微信二维码
            await this.generateWechatQRCode();
            
            // 启动微信关注状态检查
            this.startWechatStatusCheck();
            
            // 启动二维码自动刷新
            this.startQRCodeRefresh();
        } catch (error) {
            console.error('❌ 欢迎页初始化失败:', error);
        }
    }

    /**
     * 页面离开时触发
     */
    async onLeave() {
        console.log('📤 离开欢迎页');
        
        // 停止微信关注状态检查
        this.stopWechatStatusCheck();
        
        // 停止二维码自动刷新
        this.stopQRCodeRefresh();
    }

    /**
     * 初始化欢迎页面
     */
    async initialize() {
        console.log('🔄 初始化欢迎页面...');
        
        // 确保API客户端已初始化
        if (!window.apiClient) {
            console.log('⚠️ API客户端不存在');
            return;
        }

        if (!window.apiClient.initialized) {
            await window.apiClient.initialize();
        }

        // 获取设备MAC地址
        await this.getMacAddress();

        // 设备认证
        if (!window.apiClient.token) {
            await this.authenticateDevice();
        }
        
        // 绑定右上角秘密点击区域
        this.bindSecretClickArea();
    }

    /**
     * 获取设备MAC地址
     */
    async getMacAddress() {
        try {
            // 尝试通过IPC获取
            if (typeof window !== 'undefined' && window.require) {
                try {
                    const { ipcRenderer } = window.require('electron');
                    if (ipcRenderer) {
                        const macAddress = await ipcRenderer.invoke('get-mac-address');
                        if (macAddress && macAddress !== '无法获取MAC地址') {
                            window.appState.macAddress = macAddress;
                            localStorage.setItem('device-mac-address', macAddress);
                            console.log('✅ 获取MAC地址:', macAddress);
                            return;
                        }
                    }
                } catch (error) {
                    console.warn('⚠️ IPC获取MAC地址失败:', error.message);
                }
            }

            // 尝试从API客户端获取
            if (window.apiClient && typeof window.apiClient.getMacAddress === 'function') {
                const response = await window.apiClient.getMacAddress();
                if (response.success && response.macAddress) {
                    window.appState.macAddress = response.macAddress;
                    console.log('✅ API获取MAC地址:', response.macAddress);
                    return;
                }
            }

            // 从localStorage读取
            const savedMac = localStorage.getItem('device-mac-address');
            if (savedMac) {
                window.appState.macAddress = savedMac;
                console.log('✅ 缓存MAC地址:', savedMac);
                return;
            }

            // 开发模式生成随机MAC
            if (window.appState.isDevelopment) {
                const randomMac = 'DE:VE:LO:PM:AC:' + Math.random().toString(16).substr(2, 6).toUpperCase();
                window.appState.macAddress = randomMac;
                localStorage.setItem('device-mac-address', randomMac);
                console.log('🔧 开发模式MAC地址:', randomMac);
            }
        } catch (error) {
            console.error('❌ 获取MAC地址失败:', error);
        }
    }

    /**
     * 设备认证
     */
    async authenticateDevice() {
        try {
            const deviceId = window.appState.macAddress ? 
                window.appState.macAddress.replace(/:/g, '') : null;
            
            if (!deviceId) {
                console.warn('⚠️ 无法获取设备ID');
                return;
            }

            const response = await window.apiClient.authenticateDevice(deviceId, '衣等舱客户端');
            if (response.success) {
                console.log('✅ 设备认证成功');
                window.appState.deviceId = deviceId;
            } else {
                throw new Error(response.error || '设备认证失败');
            }
        } catch (error) {
            console.error('❌ 设备认证失败:', error);
        }
    }

    /**
     * 生成二维码（统一入口，支持微信/第三方）
     */
    async generateWechatQRCode() {
        try {
            const deviceId = window.appState.macAddress ? 
                window.appState.macAddress.replace(/:/g, '') : null;
            
            if (!deviceId) {
                console.warn('⚠️ 无MAC地址，无法生成二维码');
                return;
            }

            // 获取当前登录方式
            const loginType = localStorage.getItem('loginType') || 'wechat';
            console.log('🔑 当前登录方式:', loginType);

            // 使用统一的二维码生成接口
            const response = await window.apiClient.generateQRCode(deviceId, loginType);
            
            if (response.success) {
                window.appState.wechatQRCode = response.qrCode;
                // 注意：第三方登录暂时不返回 sceneStr，需要轮询获取 token
                if (response.qrCode.sceneStr) {
                    window.appState.qrSceneStr = response.qrCode.sceneStr;
                }

                // 更新页面二维码
                const qrImg = document.getElementById('wechat-qr-image');
                if (qrImg) {
                    qrImg.src = response.qrCode.dataURL;
                    console.log('✅ 二维码生成成功');
                }
            } else {
                throw new Error(response.error || '生成二维码失败');
            }
        } catch (error) {
            console.error('❌ 生成二维码失败:', error);
            this.showOfflineQRCode();
        }
    }

    /**
     * 显示离线二维码
     */
    showOfflineQRCode() {
        const qrImg = document.getElementById('wechat-qr-image');
        if (qrImg) {
            qrImg.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzMzMyIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSI+5byg5bCP5LiK5YWI55qE5Lq6PC90ZXh0Pjwvc3ZnPg==';
        }
    }

    /**
     * 启动登录状态检查（支持微信/第三方）
     */
    startWechatStatusCheck() {
        // 获取当前登录方式
        const loginType = localStorage.getItem('loginType') || 'wechat';
        console.log('🔑 当前登录方式:', loginType);

        this.stopWechatStatusCheck();
        console.log('🔄 启动登录状态检查');
        
        if (loginType === 'third_party') {
            // 第三方登录：轮询 /api/auth/poll-login
            this.startThirdPartyLoginPolling();
        } else {
            // 微信登录：检查关注状态
            this.startWechatSubscriptionCheck();
        }
    }

    /**
     * 启动第三方登录轮询
     */
    startThirdPartyLoginPolling() {
        const deviceId = window.appState.macAddress ? 
            window.appState.macAddress.replace(/:/g, '') : null;
        
        if (!deviceId) {
            console.warn('⚠️ 无设备ID，无法轮询登录状态');
            return;
        }

        this.wechatStatusCheckInterval = setInterval(async () => {
            try {
                const response = await window.apiClient.pollLoginStatus(deviceId);
                console.log('📋 第三方登录轮询响应:', response);

                if (response.success && response.isLoggedIn && response.user) {
                    console.log('✅ 用户已登录, token:', response.user.token);
                    
                    // 保存 token 作为 sceneStr
                    window.appState.qrSceneStr = response.user.token;
                    window.appState.userProfile.openid = response.user.account || response.user.token;
                    
                    this.stopWechatStatusCheck();
                    
                    // 跳转到拍照页
                    await window.pageManager.navigateTo(window.APP_CONSTANTS.PAGES.PROFILE);
                } else {
                    console.log('⏳ 等待用户扫码登录...');
                }
            } catch (error) {
                console.error('❌ 轮询登录状态失败:', error);
            }
        }, 3000); // 每3秒轮询一次
    }

    /**
     * 启动微信关注状态检查
     */
    startWechatSubscriptionCheck() {
        if (!window.appState.qrSceneStr) {
            console.warn('⚠️ 无场景值，无法检查关注状态');
            return;
        }
        
        this.wechatStatusCheckInterval = setInterval(async () => {
            try {
                const response = await window.apiClient.checkWechatStatus(
                    window.appState.qrSceneStr
                );

                console.log('📋 微信关注状态响应:', response);

                // API 返回的数据结构：{ success, isSubscribed, user: { openid, ... }, qrCode: { status, ... } }
                // 判断条件：success=true 且 (isSubscribed=true 或 qrCode.status='USED')
                const isSubscribed = response.isSubscribed || false;
                const qrCodeUsed = response.qrCode?.status === 'USED';
                const openid = response.user?.openid || null;

                if (response.success && (isSubscribed || qrCodeUsed)) {
                    console.log('✅ 用户已关注，openid:', openid);
                    
                    if (openid) {
                        window.appState.userProfile.openid = openid;
                    }
                    
                    this.stopWechatStatusCheck();
                    
                    // 跳转到拍照页
                    await window.pageManager.navigateTo(window.APP_CONSTANTS.PAGES.PROFILE);
                } else {
                    console.log('⏳ 等待用户关注... (isSubscribed:', isSubscribed, ', qrCode.status:', response.qrCode?.status, ')');
                }
            } catch (error) {
                console.error('❌ 检查关注状态失败:', error);
            }
        }, window.APP_CONSTANTS.POLLING_CONFIG.WECHAT_STATUS_INTERVAL);
    }

    /**
     * 停止微信关注状态检查
     */
    stopWechatStatusCheck() {
        if (this.wechatStatusCheckInterval) {
            clearInterval(this.wechatStatusCheckInterval);
            this.wechatStatusCheckInterval = null;
            console.log('⏹️ 停止微信关注状态检查');
        }
    }

    /**
     * 启动二维码自动刷新
     */
    startQRCodeRefresh() {
        // 先停止之前的定时器
        this.stopQRCodeRefresh();
        
        console.log(`🔄 启动二维码自动刷新，间隔: ${this.QR_REFRESH_INTERVAL / 1000}秒`);
        
        this.qrCodeRefreshInterval = setInterval(async () => {
            console.log('🔄 自动刷新二维码...');
            await this.generateWechatQRCode();
        }, this.QR_REFRESH_INTERVAL);
    }

    /**
     * 停止二维码自动刷新
     */
    stopQRCodeRefresh() {
        if (this.qrCodeRefreshInterval) {
            clearInterval(this.qrCodeRefreshInterval);
            this.qrCodeRefreshInterval = null;
            console.log('⏹️ 停止二维码自动刷新');
        }
    }

    /**
     * 绑定右上角秘密点击区域
     */
    bindSecretClickArea() {
        const secretArea = document.getElementById('welcome-secret-area');
        if (!secretArea) {
            console.warn('⚠️ 找不到秘密点击区域');
            return;
        }
        
        secretArea.addEventListener('click', () => {
            this.handleSecretClick();
        });
        
        console.log('✅ 已绑定右上角秘密点击区域');
    }

    /**
     * 处理秘密点击
     */
    handleSecretClick() {
        // 增加点击计数
        this.secretClickCount++;
        console.log(`🔘 秘密区域点击次数: ${this.secretClickCount}/${this.SECRET_CLICK_REQUIRED}`);
        
        // 清除之前的定时器
        if (this.secretClickTimer) {
            clearTimeout(this.secretClickTimer);
        }
        
        // 如果达到要求次数，打开配置页面
        if (this.secretClickCount >= this.SECRET_CLICK_REQUIRED) {
            console.log('✅ 达到点击次数要求，打开配置页面');
            this.openConfigPage();
            this.secretClickCount = 0; // 重置计数
            return;
        }
        
        // 设置超时重置计数器
        this.secretClickTimer = setTimeout(() => {
            console.log('⏱️ 点击超时，重置计数器');
            this.secretClickCount = 0;
        }, this.SECRET_CLICK_TIMEOUT);
    }

    /**
     * 打开配置页面
     */
    openConfigPage() {
        console.log('⚙️ 打开配置页面');
        
        // 使用全局的openConfig函数
        if (typeof window.openConfig === 'function') {
            window.openConfig();
        } else {
            // 备用方案
            console.warn('⚠️ window.openConfig不存在，使用备用方案');
            this.stopWechatStatusCheck();
            const configModal = document.getElementById('config-modal');
            if (configModal) {
                configModal.style.display = 'flex';
            } else {
                console.error('❌ 找不到配置对话框');
            }
        }
    }
}

// 导出并注册页面
if (typeof window !== 'undefined') {
    window.WelcomePage = WelcomePage;
    const welcomePage = new WelcomePage();
    if (window.pageManager) {
        window.pageManager.registerPage(window.APP_CONSTANTS.PAGES.WELCOME, welcomePage);
    }
}
