/**
 * ResultsPage - 试衣结果展示页面
 * 
 * 功能：
 * - 显示试衣结果图片
 * - 重新试衣功能
 * - 保存图片功能
 * 
 * 生命周期：
 * - onEnter: 显示结果
 * - onLeave: 清理资源
 */

class ResultsPage {
    constructor() {
        this.pageId = window.APP_CONSTANTS.PAGES.RESULTS;
        this.initialized = false;
        
        // 结果数据
        this.resultData = null;
    }

    /**
     * 初始化页面
     */
    async initialize() {
        console.log('🎉 初始化结果展示页面');
        
        // 监听结果相关事件
        window.eventBus.on(window.APP_CONSTANTS.EVENTS.RESULT_DISPLAYED, (data) => {
            console.log('✅ 结果已显示:', data);
        });
        
        this.initialized = true;
    }

    /**
     * 页面进入时调用
     */
    async onEnter(data = {}) {
        console.log('📍 进入结果展示页面', data);
        
        if (!this.initialized) {
            await this.initialize();
        }

        // 保存结果数据（支持多种格式）
        this.resultData = data.taskData || data.result || window.appState.tryOnResult || {};
        
        // 获取结果URL（支持多种字段名）
        const resultUrl = data.resultUrl || 
                         this.resultData.resultUrl || 
                         this.resultData.result_url || 
                         this.resultData.imageUrl ||
                         window.appState.tryOnResultUrl;
        
        console.log('🖼️ 结果URL:', resultUrl);
        console.log('📊 结果数据:', this.resultData);
        
        if (resultUrl) {
            this.resultData.imageUrl = resultUrl;
        }
        
        // 显示结果
        this.displayResult();
        
        // 触发结果显示事件
        window.eventBus.emit(window.APP_CONSTANTS.EVENTS.RESULT_DISPLAYED, {
            timestamp: Date.now(),
            hasResult: !!this.resultData,
            resultUrl: resultUrl
        });
    }

    /**
     * 页面离开时调用
     */
    async onLeave() {
        console.log('📍 离开结果展示页面');
        
        // 清理结果数据
        this.resultData = null;
    }

    /**
     * 显示结果
     */
    displayResult() {
        console.log('📝 开始显示结果:', this.resultData);
        
        if (!this.resultData || !this.resultData.imageUrl) {
            console.warn('⚠️ 没有结果数据或图片URL');
            window.notification.warning('没有结果数据');
            return;
        }
        
        console.log('📸 显示试衣结果图片:', this.resultData.imageUrl);
        
        // 更新结果图片
        const resultImage = document.getElementById('result-image');
        if (resultImage) {
            // 显示图片
            resultImage.src = this.resultData.imageUrl;
            resultImage.alt = '试衣结果';
            resultImage.style.display = 'block';
            
            console.log('✅ 结果图片已设置');
            
            // 监听图片加载
            resultImage.onload = () => {
                console.log('✅ 结果图片加载成功');
            };
            
            resultImage.onerror = (error) => {
                console.error('❌ 结果图片加载失败:', error);
                console.error('❌ 图片URL:', this.resultData.imageUrl);
                window.notification.error('图片加载失败');
            };
        } else {
            console.error('❌ 找不到结果图片元素 #result-image');
        }
        
        // 如果有其他结果信息，也可以显示
        if (this.resultData.metadata) {
            this.displayMetadata(this.resultData.metadata);
        }
    }

    /**
     * 显示结果元数据
     */
    displayMetadata(metadata) {
        // 可以显示一些额外信息，如：
        // - 处理时间
        // - 服装信息
        // - 推荐搭配等
        console.log('📋 结果元数据:', metadata);
    }



    /**
     * 重新试衣
     */
    async retryTryOn() {
        try {
            console.log('🔄 重新选择试衣 - 跳转到照片确认页面');
            
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
            console.error('❌ 重新试衣失败:', error);
            window.notification.error('操作失败，请重试');
        }
    }

    /**
     * 保存图片
     */
    async saveImage() {
        try {
            console.log('💾 保存图片，跳转到下载页面');
            
            if (!this.resultData || !this.resultData.imageUrl) {
                window.notification.warning('没有可保存的图片');
                return;
            }
            
            // 跳转到下载页面
            await window.pageManager.navigateTo(
                window.APP_CONSTANTS.PAGES.DOWNLOAD,
                { 
                    resultUrl: this.resultData.imageUrl,
                    qrCodeUrl: this.resultData.qrCodeUrl  // 如果后端返回了二维码
                }
            );
            
        } catch (error) {
            console.error('❌ 跳转到下载页面失败:', error);
            window.notification.error('操作失败，请重试');
        }
    }

    /**
     * 下载图片（Web环境）
     */
    async downloadImage() {
        const link = document.createElement('a');
        link.href = this.resultData.imageUrl;
        link.download = `tryon-result-${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * 分享结果
     */
    async shareResult() {
        try {
            console.log('📤 分享结果');
            
            if (!this.resultData || !this.resultData.imageUrl) {
                window.notification.warning('没有可分享的内容');
                return;
            }
            
            // 如果支持 Web Share API
            if (navigator.share) {
                try {
                    // 先将图片转为 Blob
                    const response = await fetch(this.resultData.imageUrl);
                    const blob = await response.blob();
                    const file = new File([blob], 'tryon-result.jpg', { type: 'image/jpeg' });
                    
                    await navigator.share({
                        title: '我的试衣结果',
                        text: '看看我的试衣效果！',
                        files: [file]
                    });
                    
                    console.log('✅ 分享成功');
                } catch (error) {
                    if (error.name !== 'AbortError') {
                        throw error;
                    }
                }
            } else {
                // 不支持分享，显示二维码或其他分享方式
                window.notification.info('您的浏览器不支持分享功能');
            }
            
        } catch (error) {
            console.error('❌ 分享失败:', error);
            window.notification.error('分享失败，请重试');
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



    /**
     * 查看详细信息
     */
    viewDetails() {
        console.log('🔍 查看详细信息');
        
        if (this.resultData && this.resultData.metadata) {
            // 显示详细信息对话框或面板
            this.showDetailsDialog(this.resultData.metadata);
        } else {
            window.notification.info('没有更多详细信息');
        }
    }

    /**
     * 显示详细信息对话框
     */
    showDetailsDialog(metadata) {
        // 可以创建一个模态框显示详细信息
        // 这里只是示例，具体实现可以根据需求调整
        const details = [
            `处理时间: ${metadata.processingTime || '未知'}`,
            `图片尺寸: ${metadata.imageSize || '未知'}`,
            `服装信息: ${metadata.clothingInfo || '未知'}`
        ].join('\n');
        
        console.log('📋 详细信息:\n', details);
        // 实际项目中应该显示一个美观的对话框
    }
}

// 创建页面实例并注册
const resultsPage = new ResultsPage();
window.resultsPage = resultsPage;  // 暴露给全局
window.pageManager.registerPage(window.APP_CONSTANTS.PAGES.RESULTS, resultsPage);

// 导出全局方法供HTML调用
window.retryTryOn = () => resultsPage.retryTryOn();
window.saveResultImage = () => resultsPage.saveImage();
window.shareResult = () => resultsPage.shareResult();
window.returnToWelcome = () => resultsPage.returnToWelcome();
window.viewResultDetails = () => resultsPage.viewDetails();

console.log('✅ ResultsPage 已加载');
