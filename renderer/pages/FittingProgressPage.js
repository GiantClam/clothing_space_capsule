/**
 * FittingProgressPage - 等待试穿效果页面
 * 
 * 功能：
 * - 显示试穿任务进行中的等待界面
 * - 播放背景视频
 * - 显示进度条（2.5分钟从0%到99%）
 * - 监听任务状态，完成后进度条直接100%
 * 
 * 生命周期：
 * - onEnter: 播放视频，启动进度条
 * - onLeave: 清理资源，停止进度条
 */

class FittingProgressPage {
    constructor() {
        this.pageId = window.APP_CONSTANTS.PAGES.FITTING_PROGRESS;
        this.initialized = false;
        
        // 进度条相关
        this.progressTimer = null;
        this.totalDuration = 300000; // 5分钟 = 300秒 = 300000毫秒
        this.updateInterval = 100; // 每100毫秒更新一次
        this.currentProgress = 0; // 当前进度 0-100
        this.startTime = null;
        this.isCompleted = false; // 任务是否已完成
    }

    /**
     * 初始化页面
     */
    async initialize() {
        console.log('⏳ 初始化等待试穿效果页面');
        
        // 监听任务完成事件
        if (window.eventBus) {
            window.eventBus.on('tryon:progress:complete', () => {
                console.log('🎯 接收到任务完成事件');
                this.onTaskCompleted();
            });
        }
        
        this.initialized = true;
    }

    /**
     * 页面进入时调用
     */
    async onEnter(data = {}) {
        console.log('📍 进入等待试穿效果页面', data);
        
        if (!this.initialized) {
            await this.initialize();
        }
        
        // 重置状态
        this.isCompleted = false;
        this.currentProgress = 0;
        
        // 确保视频播放
        const videoElements = document.querySelectorAll('#fitting-progress-page video');
        videoElements.forEach(video => {
            video.play().catch(err => {
                console.warn('⚠️ 视频自动播放失败:', err);
            });
        });
        
        // 启动进度条
        this.startProgress();
    }

    /**
     * 页面离开时调用
     */
    async onLeave() {
        console.log('📍 离开等待试穿效果页面');
        
        // 停止进度条
        this.stopProgress();
        
        // 暂停视频
        const videoElements = document.querySelectorAll('#fitting-progress-page video');
        videoElements.forEach(video => {
            video.pause();
        });
    }

    /**
     * 启动进度条
     */
    startProgress() {
        // 先清除之前的定时器
        this.stopProgress();
        
        console.log('🚀 启动进度条（2.5分钟）');
        
        // 记录开始时间
        this.startTime = Date.now();
        this.currentProgress = 0;
        
        // 初始化进度条显示
        this.updateProgressBar(0);
        
        // 每100毫秒更新一次
        this.progressTimer = setInterval(() => {
            if (this.isCompleted) {
                return; // 如果已完成，不再更新
            }
            
            const elapsed = Date.now() - this.startTime;
            const progress = Math.min((elapsed / this.totalDuration) * 100, 99); // 最多99%，等待任务完成才100%
            
            this.currentProgress = progress;
            this.updateProgressBar(progress);
            
            // 如果达到99%，停止自动增长
            if (progress >= 99) {
                console.log('⏳ 进度条已达刅99%，等待任务完成...');
                this.stopProgress();
            }
        }, this.updateInterval);
    }

    /**
     * 停止进度条
     */
    stopProgress() {
        if (this.progressTimer) {
            clearInterval(this.progressTimer);
            this.progressTimer = null;
            console.log('⏹️ 停止进度条');
        }
    }

    /**
     * 更新进度条显示
     * @param {number} progress - 进度百分比 0-100
     */
    updateProgressBar(progress) {
        const progressBar = document.querySelector('.fitting-top-bar::after');
        const topBar = document.querySelector('.fitting-top-bar');
        
        if (topBar) {
            // 计算进度条宽度（最大901px）
            const maxWidth = 901;
            const width = Math.round((progress / 100) * maxWidth);
            
            // 通过CSS变量更新进度条宽度
            topBar.style.setProperty('--progress-width', `${width}px`);
            
            // 输出日志（每10%输出一次）
            const progressInt = Math.floor(progress);
            if (progressInt % 10 === 0 && progressInt !== this.lastLoggedProgress) {
                console.log(`📈 进度: ${progressInt}%`);
                this.lastLoggedProgress = progressInt;
            }
        }
    }

    /**
     * 任务完成回调
     */
    onTaskCompleted() {
        if (this.isCompleted) {
            return; // 防止重复调用
        }
        
        console.log('✅ 任务完成，进度条跳转到100%');
        
        this.isCompleted = true;
        this.stopProgress();
        
        // 直接设置为100%
        this.currentProgress = 100;
        this.updateProgressBar(100);
    }
}

// 创建页面实例并注册
const fittingProgressPage = new FittingProgressPage();
window.fittingProgressPage = fittingProgressPage; // 暴露给全局
window.pageManager.registerPage(
    window.APP_CONSTANTS.PAGES.FITTING_PROGRESS, 
    fittingProgressPage
);

console.log('✅ FittingProgressPage 已加载');
