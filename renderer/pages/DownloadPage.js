/**
 * DownloadPage - 扫码下载图片页面
 * 
 * 功能：
 * - 显示二维码供用户扫码下载试衣结果
 * - 60秒倒计时，倒计时结束后返回欢迎页
 * - 继续试衣功能
 * - 结束试衣功能
 * 
 * 生命周期：
 * - onEnter: 生成二维码，启动倒计时
 * - onLeave: 清理定时器
 */

class DownloadPage {
    constructor() {
        this.pageId = window.APP_CONSTANTS.PAGES.DOWNLOAD;
        this.initialized = false;
        
        // 倒计时相关
        this.countdownTimer = null;
        this.countdownSeconds = 60; // 60秒倒计时
        this.currentCountdown = this.countdownSeconds;
        
        // 二维码数据
        this.qrCodeData = null;
    }

    /**
     * 初始化页面
     */
    async initialize() {
        console.log('📱 初始化扫码下载页面');
        this.initialized = true;
    }

    /**
     * 页面进入时调用
     */
    async onEnter(data = {}) {
        console.log('📍 进入扫码下载页面', data);
        
        if (!this.initialized) {
            await this.initialize();
        }

        // 保存二维码数据
        this.qrCodeData = data.qrCodeUrl || data.qrCode;
        
        // 如果没有二维码数据，调用API生成
        if (!this.qrCodeData) {
            console.log('🔄 没有二维码数据，调用API生成...');
            await this.generateQRCode();
        } else {
            // 显示二维码
            this.displayQRCode();
        }
        
        // 启动倒计时
        this.startCountdown();
    }

    /**
     * 页面离开时调用
     */
    async onLeave() {
        console.log('📍 离开扫码下载页面');
        
        // 停止倒计时
        this.stopCountdown();
        
        // 清理二维码数据
        this.qrCodeData = null;
    }

    /**
     * 显示二维码
     */
    displayQRCode() {
        const qrCodeContainer = document.getElementById('download-qr-code');
        
        if (!qrCodeContainer) {
            console.error('❌ 找不到二维码容器');
            return;
        }
        
        if (this.qrCodeData) {
            console.log('📱 显示二维码:', this.qrCodeData);
            qrCodeContainer.src = this.qrCodeData;
            qrCodeContainer.style.display = 'block';
        } else {
            console.warn('⚠️ 没有二维码数据，尝试生成...');
            this.generateQRCode();
        }
    }

    /**
     * 生成二维码（激活推送二维码）
     */
    async generateQRCode() {
        console.log('🔄 激活推送二维码...');
        
        try {
            // 检查API客户端状态
            if (!window.apiClient) {
                throw new Error('API客户端未初始化');
            }
            
            if (!window.apiClient.token) {
                throw new Error('设备未认证');
            }
            
            // 检查必要参数
            const taskId = window.appState.currentTaskId;
            const originalSceneStr = window.appState.qrSceneStr;
            
            if (!taskId) {
                throw new Error('任务ID不存在');
            }
            
            console.log('🔄 调用激活推送二维码接口...', {
                taskId,
                originalSceneStr
            });
            
            window.loading.show('正在生成二维码...', '请稍候');
            
            // 使用API客户端调用激活推送二维码接口
            const response = await window.apiClient.activatePushQrCode({
                taskId: taskId,
                originalSceneStr: originalSceneStr // 可选参数
            });
            
            window.loading.hide();
            
            console.log('📱 API响应:', response);
            
            if (response.success) {
                // 根据新接口响应格式处理数据
                this.qrCodeData = response.activation.qrCode.dataURL;
                this.countdownSeconds = response.activation.qrCode.expiresIn || 60; // 默认1分钟
                this.activationSceneStr = response.activation.activationSceneStr;
                this.originalSceneStr = response.activation.originalSceneStr;
                this.taskInfo = response.activation.taskInfo;
                this.userInfo = response.activation.userInfo;
                
                console.log('✅ 推送二维码激活成功', {
                    taskId: taskId,
                    activationSceneStr: this.activationSceneStr,
                    expiresIn: this.countdownSeconds
                });
                
                // 显示二维码
                this.displayQRCode();
            } else {
                throw new Error(response.error || '激活失败');
            }
            
        } catch (error) {
            console.error('❌ 激活推送二维码失败:', error);
            window.loading.hide();
            window.notification.error('生成二维码失败: ' + error.message);
        }
    }

    /**
     * 启动倒计时
     */
    startCountdown() {
        // 先停止之前的倒计时
        this.stopCountdown();
        
        // 重置倒计时
        this.currentCountdown = this.countdownSeconds;
        
        console.log(`⏰ 启动倒计时: ${this.countdownSeconds}秒`);
        
        // 更新倒计时显示
        this.updateCountdownDisplay();
        
        // 每秒更新一次
        this.countdownTimer = setInterval(() => {
            this.currentCountdown--;
            
            if (this.currentCountdown <= 0) {
                // 倒计时结束，自动返回欢迎页
                console.log('⏰ 倒计时结束，返回欢迎页');
                this.stopCountdown();
                this.returnToWelcome();
            } else {
                // 更新显示
                this.updateCountdownDisplay();
            }
        }, 1000);
    }

    /**
     * 停止倒计时
     */
    stopCountdown() {
        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
            this.countdownTimer = null;
            console.log('⏰ 停止倒计时');
        }
    }

    /**
     * 更新倒计时显示
     */
    updateCountdownDisplay() {
        const countdownElement = document.getElementById('download-countdown');
        if (countdownElement) {
            countdownElement.textContent = this.currentCountdown;
        }
        
        // 可以添加进度条动画
        const progressBar = document.getElementById('download-progress-bar');
        if (progressBar) {
            const progress = (this.currentCountdown / this.countdownSeconds) * 100;
            progressBar.style.width = `${progress}%`;
        }
    }

    /**
     * 继续试衣
     */
    async continueTryOn() {
        try {
            console.log('🔄 继续试衣 - 返回照片确认页面');
            
            // 停止倒计时
            this.stopCountdown();
            
            // 清理当前试衣任务的数据，但保留照片数据
            window.appState.currentTaskId = null;
            window.appState.tryOnTaskId = null;
            window.appState.tryOnResult = null;
            window.appState.tryOnResultUrl = null;
            window.appState.fashionPreference = null;
            window.appState.recommendedOutfit = null;
            // 保留 capturedPhotoData，让用户可以确认照片或重新拍摄
            
            // 跳转到照片确认页面，让用户重新确认照片或重拍
            await window.pageManager.navigateTo(window.APP_CONSTANTS.PAGES.PHOTO_CONFIRM);
            
        } catch (error) {
            console.error('❌ 继续试衣失败:', error);
            window.notification.error('操作失败，请重试');
        }
    }

    /**
     * 结束试衣（调用全局 endSession 函数）
     */
    async endTryOn() {
        // 直接调用全局的 endSession 函数，确保行为一致
        if (typeof window.endSession === 'function') {
            await window.endSession();
        } else {
            console.error('❌ 全局 endSession 函数不存在');
            window.notification.error('操作失败，请重试');
        }
    }

    /**
     * 返回欢迎页（调用全局 endSession 函数）
     */
    async returnToWelcome() {
        // 直接调用全局的 endSession 函数，确保行为一致
        if (typeof window.endSession === 'function') {
            await window.endSession();
        } else {
            console.error('❌ 全局 endSession 函数不存在');
            window.notification.error('操作失败，请重试');
        }
    }
}

// 创建页面实例并注册
const downloadPage = new DownloadPage();
window.downloadPage = downloadPage; // 暴露给全局
window.pageManager.registerPage(window.APP_CONSTANTS.PAGES.DOWNLOAD, downloadPage);

// 导出全局方法供HTML调用
window.continueTryOn = () => downloadPage.continueTryOn();
window.endTryOn = () => downloadPage.endTryOn();

console.log('✅ DownloadPage 已加载');
