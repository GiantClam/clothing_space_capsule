/**
 * 照片确认页面模块
 */
class PhotoConfirmPage {
    constructor() {
        this.pageId = window.APP_CONSTANTS.PAGES.PHOTO_CONFIRM;
        this.initialized = false;
    }

    /**
     * 页面进入时触发
     */
    async onEnter(data = {}) {
        console.log('📄 进入照片确认页');
        
        // 显示拍摄的照片
        this.displayCapturedPhoto();
    }

    /**
     * 页面离开时触发
     */
    async onLeave() {
        console.log('📤 离开照片确认页');
    }

    /**
     * 显示拍摄的照片
     */
    displayCapturedPhoto() {
        const capturedPhoto = document.getElementById('captured-photo');
        if (capturedPhoto && window.appState.capturedPhotoData) {
            capturedPhoto.src = window.appState.capturedPhotoData;
            console.log('✅ 已设置照片数据');
        } else {
            console.warn('⚠️ 照片数据未找到');
        }
    }

    /**
     * 重新拍摄
     */
    async retakePhoto() {
        try {
            // 清除照片数据
            window.appState.capturedPhotoData = null;
            
            // 返回拍照页
            await window.pageManager.navigateTo(window.APP_CONSTANTS.PAGES.PROFILE);
        } catch (error) {
            console.error('❌ 返回拍照页失败:', error);
            window.notification.error('操作失败，请重试');
        }
    }

    /**
     * 确认照片
     */
    async confirmPhoto() {
        try {
            if (!window.appState.capturedPhotoData) {
                throw new Error('没有照片数据');
            }

            window.loading.show('正在上传照片...', '请稍候');

            // 将base64转换为Blob
            const response = await fetch(window.appState.capturedPhotoData);
            const blob = await response.blob();

            console.log('上传照片信息: 文件大小:', blob.size, 'bytes');

            // 确保API客户端已初始化
            if (!window.apiClient || !window.apiClient.initialized) {
                throw new Error('API客户端未初始化');
            }

            // 检查设备是否已认证
            if (!window.apiClient.token) {
                console.log('⚠️ 设备未认证，尝试进行设备认证...');
                await this.authenticateDevice();
            }

            // 上传照片到云端
            const loginType = localStorage.getItem('loginType') || 'wechat';
            console.log('🔑 使用登录方式:', loginType);
            
            const uploadResponse = await window.apiClient.uploadPhoto(
                blob, 
                window.appState.qrSceneStr,
                loginType
            );

            console.log('照片上传结果:', uploadResponse);

            if (!uploadResponse.success) {
                throw new Error(uploadResponse.error || '照片上传失败');
            }

            // 保存任务ID
            window.appState.currentTaskId = uploadResponse.data.taskId;
            console.log('✅ 照片上传成功，任务ID:', window.appState.currentTaskId);

            // 触发照片上传事件
            window.eventBus.emit(window.APP_CONSTANTS.EVENTS.PHOTO_UPLOADED, {
                taskId: uploadResponse.data.taskId
            });

            window.loading.hide();

            // 跳转到时尚偏好选择页面
            await window.pageManager.navigateTo(window.APP_CONSTANTS.PAGES.PREFERENCE);
        } catch (error) {
            console.error('❌ 确认照片失败:', error);
            window.loading.hide();
            window.notification.error('处理照片失败: ' + error.message);
        }
    }

    /**
     * 设备认证
     */
    async authenticateDevice() {
        try {
            let macAddress = window.appState.macAddress;
            if (!macAddress) {
                throw new Error('无法获取设备MAC地址');
            }

            const deviceId = macAddress.replace(/:/g, '');
            const authResponse = await window.apiClient.authenticateDevice(
                deviceId, 
                '衣等舱客户端'
            );

            if (authResponse.success) {
                console.log('✅ 设备认证成功');
            } else {
                throw new Error(authResponse.error || '设备认证失败');
            }
        } catch (error) {
            console.error('❌ 设备认证失败:', error);
            throw error;
        }
    }
}

// 注册页面
if (typeof window !== 'undefined') {
    window.PhotoConfirmPage = PhotoConfirmPage;
    const photoConfirmPage = new PhotoConfirmPage();
    if (window.pageManager) {
        window.pageManager.registerPage(
            window.APP_CONSTANTS.PAGES.PHOTO_CONFIRM, 
            photoConfirmPage
        );
    }
    
    // 导出全局方法供HTML调用
    window.retakePhoto = async function() {
        if (photoConfirmPage) {
            await photoConfirmPage.retakePhoto();
        }
    };
    
    window.confirmPhoto = async function() {
        if (photoConfirmPage) {
            await photoConfirmPage.confirmPhoto();
        }
    };
}
