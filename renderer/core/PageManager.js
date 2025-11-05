/**
 * 页面管理器 - 统一管理页面切换和生命周期
 */
class PageManager {
    constructor() {
        this.currentPage = null;
        this.pages = new Map(); // 存储页面实例
        this.history = []; // 页面历史记录
    }

    /**
     * 注册页面
     * @param {string} pageId - 页面ID
     * @param {Object} pageInstance - 页面实例
     */
    registerPage(pageId, pageInstance) {
        if (this.pages.has(pageId)) {
            console.warn(`⚠️ 页面已存在: ${pageId}，将被覆盖`);
        }
        
        this.pages.set(pageId, pageInstance);
        console.log(`✅ 注册页面: ${pageId}`);
    }

    /**
     * 获取页面实例
     * @param {string} pageId - 页面ID
     */
    getPage(pageId) {
        return this.pages.get(pageId);
    }

    /**
     * 切换页面
     * @param {string} pageId - 目标页面ID
     * @param {Object} data - 传递给页面的数据
     */
    async navigateTo(pageId, data = {}) {
        console.log(`📄 切换页面: ${this.currentPage} -> ${pageId}`);
        
        const targetPage = this.pages.get(pageId);
        if (!targetPage) {
            console.error(`❌ 页面不存在: ${pageId}`);
            return false;
        }

        try {
            // 1. 触发当前页面的离开事件
            if (this.currentPage) {
                const currentPageInstance = this.pages.get(this.currentPage);
                if (currentPageInstance && typeof currentPageInstance.onLeave === 'function') {
                    await currentPageInstance.onLeave();
                }
            }

            // 2. 隐藏所有页面
            this.hideAllPages();

            // 3. 显示目标页面
            this.showPage(pageId);

            // 4. 触发目标页面的进入事件
            if (typeof targetPage.onEnter === 'function') {
                await targetPage.onEnter(data);
            }

            // 5. 更新当前页面
            const previousPage = this.currentPage;
            this.currentPage = pageId;

            // 6. 更新历史记录
            if (previousPage !== pageId) {
                this.history.push(previousPage);
            }

            // 7. 触发页面切换事件
            if (window.eventBus) {
                window.eventBus.emit(window.APP_CONSTANTS.EVENTS.PAGE_CHANGE, {
                    from: previousPage,
                    to: pageId,
                    data
                });
            }

            console.log(`✅ 页面切换成功: ${pageId}`);
            return true;
        } catch (error) {
            console.error(`❌ 页面切换失败:`, error);
            if (window.notification) {
                window.notification.error('页面切换失败');
            }
            return false;
        }
    }

    /**
     * 返回上一页
     */
    async goBack() {
        if (this.history.length === 0) {
            console.warn('⚠️ 没有历史记录可以返回');
            return false;
        }

        const previousPage = this.history.pop();
        return await this.navigateTo(previousPage);
    }

    /**
     * 隐藏所有页面
     */
    hideAllPages() {
        try {
            const activePages = document.querySelectorAll('.page.active');
            activePages.forEach(page => page.classList.remove('active'));
        } catch (error) {
            console.error('❌ 隐藏页面失败:', error);
        }
    }

    /**
     * 显示页面
     * @param {string} pageId - 页面ID
     */
    showPage(pageId) {
        const pageElement = document.getElementById(pageId);
        if (pageElement) {
            pageElement.classList.add('active');
        } else {
            console.error(`❌ 找不到页面元素: ${pageId}`);
        }
    }

    /**
     * 清空历史记录
     */
    clearHistory() {
        this.history = [];
    }

    /**
     * 重置页面管理器
     */
    reset() {
        this.currentPage = null;
        this.clearHistory();
        this.hideAllPages();
    }
}

// 导出单例
if (typeof window !== 'undefined') {
    window.PageManager = PageManager;
    window.pageManager = new PageManager();
}
