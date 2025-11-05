/**
 * 全局状态管理器
 */
class AppState {
    constructor() {
        // 用户信息
        this.userProfile = {
            openid: null,
            photo: null,
            photoFileName: null,
            fullBodyShotNameInRH: null,
            gender: 'female'
        };

        // 服装选择
        this.selectedClothing = null;
        this.selectedTopBottom = null;
        this.selectedDress = null;
        this.lastSelectionType = null;

        // 任务信息
        this.currentTask = null;
        this.currentTaskId = null;
        this.resultImageUrl = null;

        // 二维码信息
        this.wechatQRCode = null;
        this.qrSceneStr = null;

        // 照片数据
        this.capturedPhotoData = null;

        // 设备信息
        this.macAddress = null;
        this.deviceId = null;

        // 环境信息
        this.isDevelopment = this.checkDevelopmentMode();
        this.devModeSkippedLogin = false;

        // 定时器
        this.timers = {
            wechatStatus: null,
            taskPolling: null,
            countdown: null
        };

        // 初始化
        this.init();
    }

    /**
     * 初始化状态管理器
     */
    init() {
        console.log('🔧 初始化AppState');
        
        // 监听页面切换事件
        if (window.eventBus) {
            window.eventBus.on(window.APP_CONSTANTS.EVENTS.PAGE_CHANGE, (data) => {
                this.onPageChange(data.from, data.to);
            });
        }
    }

    /**
     * 检查是否为开发模式
     */
    checkDevelopmentMode() {
        try {
            // 检查主进程注入的环境变量
            if (typeof window !== 'undefined' && window.__APP_ENV__) {
                if (window.__APP_ENV__.IS_PRODUCTION) {
                    console.log('📦 生产环境模式');
                    return false;
                }
                if (window.__APP_ENV__.IS_DEVELOPMENT) {
                    console.log('🔧 开发模式');
                    return true;
                }
            }

            // 检查localStorage
            const devMode = localStorage.getItem('DEV_MODE');
            if (devMode === 'true') {
                console.log('🔧 开发模式（localStorage）');
                return true;
            }

            // 检查URL参数
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('dev') === 'true') {
                console.log('🔧 开发模式（URL参数）');
                return true;
            }

            // 检查是否为localhost
            const isLocalhost = window.location.hostname === 'localhost' || 
                               window.location.hostname === '127.0.0.1';
            
            if (isLocalhost) {
                console.log('🔧 开发模式（本地环境）');
                return true;
            }

            console.log('🌐 生产环境模式');
            return false;
        } catch (error) {
            console.error('检查开发模式失败:', error);
            return false;
        }
    }

    /**
     * 页面切换事件处理
     */
    onPageChange(fromPage, toPage) {
        console.log(`🔄 页面切换: ${fromPage} -> ${toPage}`);
        
        // 离开首页时停止微信关注状态检查
        if (fromPage === window.APP_CONSTANTS.PAGES.WELCOME && 
            toPage !== window.APP_CONSTANTS.PAGES.WELCOME) {
            this.stopTimer('wechatStatus');
        }
    }

    /**
     * 启动定时器
     * @param {string} timerName - 定时器名称
     * @param {function} callback - 回调函数
     * @param {number} interval - 间隔时间
     */
    startTimer(timerName, callback, interval) {
        // 先停止已存在的定时器
        this.stopTimer(timerName);
        
        this.timers[timerName] = setInterval(callback, interval);
        console.log(`⏰ 启动定时器: ${timerName}`);
    }

    /**
     * 停止定时器
     * @param {string} timerName - 定时器名称
     */
    stopTimer(timerName) {
        if (this.timers[timerName]) {
            clearInterval(this.timers[timerName]);
            this.timers[timerName] = null;
            console.log(`⏹️ 停止定时器: ${timerName}`);
        }
    }

    /**
     * 停止所有定时器
     */
    stopAllTimers() {
        Object.keys(this.timers).forEach(timerName => {
            this.stopTimer(timerName);
        });
    }

    /**
     * 重置用户状态（用于新会话）
     */
    resetUserState() {
        this.userProfile = {
            openid: null,
            photo: null,
            photoFileName: null,
            fullBodyShotNameInRH: null,
            gender: 'female'
        };
        
        this.selectedClothing = null;
        this.selectedTopBottom = null;
        this.selectedDress = null;
        this.lastSelectionType = null;
        
        this.currentTask = null;
        this.currentTaskId = null;
        this.resultImageUrl = null;
        
        this.capturedPhotoData = null;
        
        console.log('🔄 用户状态已重置');
    }

    /**
     * 获取配置
     */
    getConfig() {
        try {
            const config = localStorage.getItem('appConfig');
            return config ? JSON.parse(config) : {};
        } catch (error) {
            console.warn('获取配置失败:', error);
            return {};
        }
    }

    /**
     * 设置配置
     */
    setConfig(config) {
        try {
            localStorage.setItem('appConfig', JSON.stringify(config));
        } catch (error) {
            console.error('保存配置失败:', error);
        }
    }

    /**
     * 获取登录方式
     */
    getLoginType() {
        try {
            const loginType = localStorage.getItem('loginType');
            return loginType || 'wechat'; // 默认为微信登录
        } catch (error) {
            console.warn('获取登录方式失败:', error);
            return 'wechat';
        }
    }

    /**
     * 设置登录方式
     */
    setLoginType(loginType) {
        try {
            localStorage.setItem('loginType', loginType);
            console.log('✅ 登录方式已设置:', loginType);
        } catch (error) {
            console.error('保存登录方式失败:', error);
        }
    }

    /**
     * 清理资源
     */
    cleanup() {
        this.stopAllTimers();
        console.log('🧹 资源清理完成');
    }
}

// 导出单例
if (typeof window !== 'undefined') {
    window.AppState = AppState;
    window.appState = new AppState();
}
