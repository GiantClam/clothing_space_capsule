/**
 * 加载组件 - 用于显示加载状态
 */
class Loading {
    constructor() {
        this.loadingElement = null;
        this.init();
    }

    /**
     * 初始化加载组件
     */
    init() {
        // 创建加载元素
        this.loadingElement = this.createLoadingElement();
        document.body.appendChild(this.loadingElement);
        
        // 监听加载事件
        if (window.eventBus) {
            window.eventBus.on(window.APP_CONSTANTS.EVENTS.LOADING_SHOW, (data) => {
                this.show(data.message, data.subtitle);
            });
            
            window.eventBus.on(window.APP_CONSTANTS.EVENTS.LOADING_HIDE, () => {
                this.hide();
            });
        }
    }

    /**
     * 创建加载元素
     */
    createLoadingElement() {
        const loading = document.createElement('div');
        loading.id = 'loading-overlay';
        loading.className = 'loading-overlay';
        loading.style.display = 'none';
        
        loading.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner">
                    <div class="spinner-ring"></div>
                    <div class="spinner-ring"></div>
                    <div class="spinner-ring"></div>
                </div>
                <div class="loading-message" id="loading-message">加载中...</div>
                <div class="loading-subtitle" id="loading-subtitle"></div>
            </div>
        `;
        
        return loading;
    }

    /**
     * 显示加载状态
     * @param {string} message - 主要消息
     * @param {string} subtitle - 副标题
     */
    show(message = '加载中...', subtitle = '') {
        if (!this.loadingElement) {
            this.init();
        }
        
        const messageEl = this.loadingElement.querySelector('#loading-message');
        const subtitleEl = this.loadingElement.querySelector('#loading-subtitle');
        
        if (messageEl) {
            messageEl.textContent = message;
        }
        
        if (subtitleEl) {
            subtitleEl.textContent = subtitle;
            subtitleEl.style.display = subtitle ? 'block' : 'none';
        }
        
        this.loadingElement.style.display = 'flex';
        
        // 添加显示动画
        setTimeout(() => {
            this.loadingElement.classList.add('show');
        }, 10);
        
        console.log('🔄 显示加载:', message);
    }

    /**
     * 隐藏加载状态
     */
    hide() {
        if (!this.loadingElement) return;
        
        this.loadingElement.classList.remove('show');
        
        setTimeout(() => {
            this.loadingElement.style.display = 'none';
        }, 300);
        
        console.log('✅ 隐藏加载');
    }

    /**
     * 更新加载消息
     * @param {string} message - 新消息
     * @param {string} subtitle - 新副标题
     */
    updateMessage(message, subtitle = '') {
        if (!this.loadingElement) return;
        
        const messageEl = this.loadingElement.querySelector('#loading-message');
        const subtitleEl = this.loadingElement.querySelector('#loading-subtitle');
        
        if (messageEl) {
            messageEl.textContent = message;
        }
        
        if (subtitleEl) {
            subtitleEl.textContent = subtitle;
            subtitleEl.style.display = subtitle ? 'block' : 'none';
        }
    }

    /**
     * 检查是否正在加载
     */
    isLoading() {
        return this.loadingElement && this.loadingElement.style.display !== 'none';
    }
}

// 导出单例
if (typeof window !== 'undefined') {
    window.Loading = Loading;
    window.loading = new Loading();
}
