/**
 * PreferencePage - 时尚偏好选择页面
 * 
 * 功能：
 * - 显示偏好选择界面（个性换装/推荐穿搭）
 * - 处理用户偏好选择
 * - 跳转到对应的服装选择页面
 * 
 * 生命周期：
 * - onEnter: 页面进入时重置选择状态
 * - onLeave: 页面离开时清理资源
 */

class PreferencePage {
    constructor() {
        this.pageId = window.APP_CONSTANTS.PAGES.PREFERENCE;
        this.initialized = false;
    }

    /**
     * 初始化页面
     */
    async initialize() {
        console.log('🎨 初始化时尚偏好选择页面');
        
        // 监听事件（如果需要）
        window.eventBus.on(window.APP_CONSTANTS.EVENTS.PREFERENCE_SELECTED, (data) => {
            console.log('✅ 偏好已选择:', data);
        });
        
        this.initialized = true;
    }

    /**
     * 页面进入时调用
     */
    async onEnter(data = {}) {
        console.log('📍 进入时尚偏好选择页面', data);
        
        if (!this.initialized) {
            await this.initialize();
        }

        // 重置偏好选择状态
        this.resetPreference();
    }

    /**
     * 页面离开时调用
     */
    async onLeave() {
        console.log('📍 离开时尚偏好选择页面');
        // 清理资源（如果需要）
    }

    /**
     * 重置偏好选择状态
     */
    resetPreference() {
        // 清除之前的选择状态
        window.appState.fashionPreference = null;
        console.log('🔄 已重置偏好选择状态');
    }

    /**
     * 选择个性换装
     */
    async selectCustomStyle() {
        try {
            console.log('🎨 用户选择：个性换装');
            
            // 保存用户偏好
            window.appState.fashionPreference = 'custom';
            
            // 触发偏好选择事件
            window.eventBus.emit(window.APP_CONSTANTS.EVENTS.PREFERENCE_SELECTED, {
                preference: 'custom',
                timestamp: Date.now()
            });

            // 跳转到服装选择页面
            await window.pageManager.navigateTo(
                window.APP_CONSTANTS.PAGES.CLOTHING,
                { mode: 'custom' }
            );
            
        } catch (error) {
            console.error('❌ 选择个性换装失败:', error);
            window.notification.error('操作失败，请重试');
        }
    }

    /**
     * 选择推荐穿搭
     */
    async selectRecommendedStyle() {
        try {
            console.log('💡 用户选择：推荐穿搭');
            
            // 保存用户偏好
            window.appState.fashionPreference = 'recommended';
            
            // 触发偏好选择事件
            window.eventBus.emit(window.APP_CONSTANTS.EVENTS.PREFERENCE_SELECTED, {
                preference: 'recommended',
                timestamp: Date.now()
            });

            // 显示加载提示
            window.loading.show('正在获取推荐穿搭...', '请稍候');

            // 调用API获取推荐穿搭
            const response = await window.apiClient.getRecommendedOutfit(
                window.appState.currentTaskId
            );

            window.loading.hide();

            if (response.success) {
                // 保存推荐的服装数据
                window.appState.recommendedOutfit = response.data;
                
                // 跳转到服装选择页面（显示推荐结果）
                await window.pageManager.navigateTo(
                    window.APP_CONSTANTS.PAGES.CLOTHING,
                    { 
                        mode: 'recommended',
                        outfit: response.data
                    }
                );
            } else {
                throw new Error(response.error || '获取推荐失败');
            }
            
        } catch (error) {
            console.error('❌ 选择推荐穿搭失败:', error);
            window.loading.hide();
            window.notification.error('获取推荐失败，请重试');
        }
    }

    /**
     * 返回上一页
     */
    async goBack() {
        try {
            console.log('⬅️ 返回上一页');
            await window.pageManager.navigateTo(window.APP_CONSTANTS.PAGES.PHOTO_CONFIRM);
        } catch (error) {
            console.error('❌ 返回失败:', error);
        }
    }
}

// 创建页面实例并注册
const preferencePage = new PreferencePage();
window.pageManager.registerPage(window.APP_CONSTANTS.PAGES.PREFERENCE, preferencePage);

// 导出全局方法供HTML调用
window.selectCustomStyle = () => preferencePage.selectCustomStyle();
window.selectRecommendedStyle = () => preferencePage.selectRecommendedStyle();
window.goBackToPhotoConfirm = () => preferencePage.goBack();

console.log('✅ PreferencePage 已加载');
