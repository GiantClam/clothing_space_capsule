// 全屏切换功能
function toggleFullscreen() {
    const resultsPage = document.getElementById('results-page');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    
    if (!resultsPage || !fullscreenBtn) return;
    
    if (resultsPage.classList.contains('fullscreen')) {
        // 退出全屏
        resultsPage.classList.remove('fullscreen');
        fullscreenBtn.textContent = '⛶'; // 全屏图标
        fullscreenBtn.title = '全屏显示';
    } else {
        // 进入全屏
        resultsPage.classList.add('fullscreen');
        fullscreenBtn.textContent = '❌'; // 退出全屏图标
        fullscreenBtn.title = '退出全屏';
    }
    
    // 触发窗口大小调整事件以重新调整图片
    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
    }, 100);
}

// 导出函数供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { toggleFullscreen };
}