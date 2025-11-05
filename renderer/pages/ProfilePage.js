/**
 * 拍照页面模块
 */
class ProfilePage {
    constructor() {
        this.pageId = window.APP_CONSTANTS.PAGES.PROFILE;
        this.initialized = false;
        this.countdownTimer = null;
        this.countdownSeconds = 5; // 倒计时5秒
    }

    /**
     * 页面进入时触发
     */
    async onEnter(data = {}) {
        console.log('📄 进入拍照页');
        
        try {
            // 初始化摄像头
            await this.initializeCamera();
            
            // 启用拍照UI
            this.enableCameraUI();
        } catch (error) {
            console.error('❌ 摄像头初始化失败:', error);
            window.notification.error('摄像头初始化失败，请检查权限');
        }
    }

    /**
     * 页面离开时触发
     */
    async onLeave() {
        console.log('📤 离开拍照页');
        
        // 清除倒计时
        this.clearCountdown();
        
        // 释放摄像头资源
        if (window.cameraUtils) {
            window.cameraUtils.deinitialize();
        }
    }

    /**
     * 初始化摄像头
     */
    async initializeCamera() {
        try {
            // 先释放现有的摄像头流
            if (window.cameraUtils) {
                window.cameraUtils.deinitialize();
            }

            // 如果是开发模式跳过登录，稍微延迟一下
            if (window.appState.devModeSkippedLogin) {
                console.log('⏱️ 开发模式：等待500ms让摄像头设备就绪...');
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            await window.cameraUtils.initialize();
            // 成功日志已由 initializeCamera 函数内部输出，此处不再重复
        } catch (error) {
            console.error('❌ 摄像头初始化失败:', error);
            throw error;
        }
    }

    /**
     * 启用拍照UI
     */
    enableCameraUI() {
        const captureBtn = document.getElementById('capture-btn');
        if (captureBtn) {
            captureBtn.disabled = false;
            captureBtn.textContent = '拍照';
        }
    }

    /**
     * 开始倒计时拍照
     */
    async startCountdownCapture() {
        try {
            const captureBtn = document.getElementById('capture-btn');
            if (!captureBtn) return;
            
            // 禁用按钮
            captureBtn.disabled = true;
            captureBtn.classList.add('countdown');
            
            let countdown = this.countdownSeconds;
            
            // 更新按钮文本为倒计时
            const updateButtonText = () => {
                captureBtn.textContent = `拍照倒计时${countdown}秒`;
            };
            
            updateButtonText();
            
            // 开始倒计时
            this.countdownTimer = setInterval(() => {
                countdown--;
                
                if (countdown > 0) {
                    updateButtonText();
                    console.log(`⏱️ 倒计时: ${countdown}秒`);
                } else {
                    // 倒计时结束，拍照
                    this.clearCountdown();
                    this.capturePhoto();
                }
            }, 1000);
            
        } catch (error) {
            console.error('❌ 倒计时失败:', error);
            this.clearCountdown();
            window.notification.error('倒计时失败，请重试');
        }
    }

    /**
     * 清除倒计时
     */
    clearCountdown() {
        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
            this.countdownTimer = null;
            
            const captureBtn = document.getElementById('capture-btn');
            if (captureBtn) {
                captureBtn.disabled = false;
                captureBtn.classList.remove('countdown');
                captureBtn.textContent = '拍照';
            }
        }
    }

    /**
     * 拍照
     */
    async capturePhoto() {
        try {
            console.log('📸 开始拍照...');
            
            const imageDataUrl = await window.cameraUtils.capture();
            
            // 保存照片数据
            window.appState.capturedPhotoData = imageDataUrl;
            
            // 触发拍照事件
            window.eventBus.emit(window.APP_CONSTANTS.EVENTS.PHOTO_CAPTURED, {
                imageUrl: imageDataUrl
            });
            
            console.log('✅ 拍照成功，跳转到照片确认页');
            
            // 跳转到照片确认页
            await window.pageManager.navigateTo(
                window.APP_CONSTANTS.PAGES.PHOTO_CONFIRM
            );
        } catch (error) {
            console.error('❌ 拍照失败:', error);
            this.clearCountdown();
            window.notification.error('拍照失败，请重试');
        }
    }
}

// 注册页面
if (typeof window !== 'undefined') {
    window.ProfilePage = ProfilePage;
    const profilePage = new ProfilePage();
    if (window.pageManager) {
        window.pageManager.registerPage(window.APP_CONSTANTS.PAGES.PROFILE, profilePage);
    }
    
    // 导出全局方法供HTML调用
    window.capturePhotoWithCountdown = async function() {
        if (profilePage) {
            await profilePage.startCountdownCapture();
        }
    };
}

console.log('✅ ProfilePage 已加载');
