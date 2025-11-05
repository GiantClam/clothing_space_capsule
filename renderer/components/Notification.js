/**
 * 通知组件 - 用于显示各种提示信息
 */
class Notification {
    constructor() {
        this.notifications = [];
        this.init();
    }

    /**
     * 初始化通知系统
     */
    init() {
        // 监听通知事件
        if (window.eventBus) {
            window.eventBus.on(window.APP_CONSTANTS.EVENTS.NOTIFICATION_SHOW, (data) => {
                this.show(data.message, data.type, data.duration);
            });
        }
    }

    /**
     * 显示通知
     * @param {string} message - 通知消息
     * @param {string} type - 通知类型 (info/success/warning/error)
     * @param {number} duration - 显示时长(毫秒)
     */
    show(message, type = 'info', duration = 3000) {
        const notification = this.createNotification(message, type);
        document.body.appendChild(notification);
        
        // 添加到通知列表
        this.notifications.push(notification);
        
        // 显示动画
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // 自动隐藏
        setTimeout(() => {
            this.hide(notification);
        }, duration);
        
        return notification;
    }

    /**
     * 创建通知元素
     * @param {string} message - 通知消息
     * @param {string} type - 通知类型
     */
    createNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const icon = this.getIcon(type);
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${icon}</span>
                <span class="notification-message">${message}</span>
            </div>
        `;
        
        return notification;
    }

    /**
     * 获取图标
     * @param {string} type - 通知类型
     */
    getIcon(type) {
        const icons = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌'
        };
        return icons[type] || icons.info;
    }

    /**
     * 隐藏通知
     * @param {HTMLElement} notification - 通知元素
     */
    hide(notification) {
        notification.classList.remove('show');
        notification.classList.add('hide');
        
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
            
            // 从通知列表中移除
            const index = this.notifications.indexOf(notification);
            if (index > -1) {
                this.notifications.splice(index, 1);
            }
        }, 300);
    }

    /**
     * 显示信息通知
     */
    info(message, duration) {
        return this.show(message, 'info', duration);
    }

    /**
     * 显示成功通知
     */
    success(message, duration) {
        return this.show(message, 'success', duration);
    }

    /**
     * 显示警告通知
     */
    warning(message, duration) {
        return this.show(message, 'warning', duration);
    }

    /**
     * 显示错误通知
     */
    error(message, duration = 5000) {
        return this.show(message, 'error', duration);
    }

    /**
     * 清除所有通知
     */
    clearAll() {
        this.notifications.forEach(notification => {
            this.hide(notification);
        });
    }
}

// 导出单例
if (typeof window !== 'undefined') {
    window.Notification = Notification;
    window.notification = new Notification();
}
