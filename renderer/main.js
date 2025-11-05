/**
 * 应用主入口文件 - 模块化重构版本
 */

// 应用初始化
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 应用启动...');
    
    try {
        // 0. 加载配置（最先执行）
        if (typeof window.loadConfig === 'function') {
            window.loadConfig();
        }
        
        // 1. 确保所有核心模块已加载
        if (!window.APP_CONSTANTS) {
            throw new Error('常量配置未加载');
        }
        if (!window.eventBus) {
            throw new Error('事件总线未加载');
        }
        if (!window.pageManager) {
            throw new Error('页面管理器未加载');
        }
        if (!window.appState) {
            throw new Error('状态管理器未加载');
        }
        
        // 2. 确保API客户端已加载
        if (!window.apiClient) {
            console.log('⚠️ 创建API客户端实例...');
            if (typeof window.ApiClient === 'function') {
                window.apiClient = new window.ApiClient();
            } else {
                throw new Error('API客户端类未定义');
            }
        }
        
        // 3. 初始化API客户端
        if (!window.apiClient.initialized) {
            console.log('🔄 初始化API客户端...');
            await window.apiClient.initialize();
        }
        
        // 4. 初始化通知和加载组件
        if (!window.notification) {
            window.notification = new window.Notification();
        }
        if (!window.loading) {
            window.loading = new window.Loading();
        }
        
        // 5. 导航到欢迎页
        await window.pageManager.navigateTo(window.APP_CONSTANTS.PAGES.WELCOME);
        
        console.log('✅ 应用初始化完成');
    } catch (error) {
        console.error('❌ 应用初始化失败:', error);
        showInitError(error.message);
    }
});

// 页面卸载前清理资源
window.addEventListener('beforeunload', () => {
    console.log('🧹 清理资源...');
    
    // 清理状态管理器
    if (window.appState) {
        window.appState.cleanup();
    }
    
    // 清理摄像头
    if (window.cameraUtils) {
        window.cameraUtils.deinitialize();
    }
    
    // 清理事件总线
    if (window.eventBus) {
        window.eventBus.clear();
    }
});

// 显示初始化错误
function showInitError(message) {
    const errorHtml = `
        <div style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #fff;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            font-family: Arial, sans-serif;
        ">
            <h2 style="color: #dc3545;">❌ 应用初始化失败</h2>
            <p style="color: #6c757d; margin: 20px 0;">${message}</p>
            <button onclick="location.reload()" style="
                background: #007bff;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                margin-top: 20px;
            ">重新加载</button>
        </div>
    `;
    document.body.innerHTML = errorHtml;
}

// 全局错误处理
window.addEventListener('error', (event) => {
    console.error('❌ 全局错误:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ 未处理的Promise拒绝:', event.reason);
});

// ==================== 全局会话管理函数 ====================

/**
 * 统一的结束会话函数
 * 功能：清理所有应用状态、返回欢迎页、重新生成二维码
 */
window.endSession = async function() {
    try {
        console.log('🔚 结束试衣会话...');
        
        // 1. 停止所有页面的定时器
        // 停止欢迎页的定时器
        if (window.pageManager && window.pageManager.pages) {
            const welcomePage = window.pageManager.pages.get(window.APP_CONSTANTS.PAGES.WELCOME);
            if (welcomePage) {
                if (typeof welcomePage.stopWechatStatusCheck === 'function') {
                    welcomePage.stopWechatStatusCheck();
                }
                if (typeof welcomePage.stopQRCodeRefresh === 'function') {
                    welcomePage.stopQRCodeRefresh();
                }
            }
            
            // 停止下载页的倒计时
            const downloadPage = window.pageManager.pages.get(window.APP_CONSTANTS.PAGES.DOWNLOAD);
            if (downloadPage && typeof downloadPage.stopCountdown === 'function') {
                downloadPage.stopCountdown();
            }
            
            // 停止衣服选择页的试衣状态检查
            const clothingPage = window.pageManager.pages.get(window.APP_CONSTANTS.PAGES.CLOTHING);
            if (clothingPage && typeof clothingPage.stopTryOnStatusCheck === 'function') {
                clothingPage.stopTryOnStatusCheck();
            }
        }
        
        // 2. 清理应用状态（完整清理）
        if (window.appState) {
            window.appState.currentTaskId = null;
            window.appState.tryOnTaskId = null;
            window.appState.tryOnResult = null;
            window.appState.tryOnResultUrl = null;
            window.appState.capturedPhotoData = null;
            window.appState.fashionPreference = null;
            window.appState.recommendedOutfit = null;
            window.appState.currentTask = null;
            window.appState.resultImageUrl = null;
            
            // 清理用户登录信息（重要！让用户重新扫码）
            window.appState.qrSceneStr = null;
            if (window.appState.userProfile) {
                window.appState.userProfile.openid = null;
            }
            
            // 清理服装选择状态
            window.appState.selectedTopBottom = null;
            window.appState.selectedDress = null;
            window.appState.selectedClothing = null;
            
            console.log('🧹 已清理所有应用状态');
        }
        
        // 3. 返回欢迎页
        await window.pageManager.navigateTo(window.APP_CONSTANTS.PAGES.WELCOME);
        
        // 4. 重新生成二维码（在 WelcomePage.onEnter 中会自动执行）
        console.log('✅ 会话已结束，等待用户重新扫码');
        
    } catch (error) {
        console.error('❌ 结束会话失败:', error);
        window.notification?.error('操作失败，请重试');
    }
};

/**
 * returnToWelcome 别名（兼容旧代码）
 */
window.returnToWelcome = async function() {
    await window.endSession();
};

/**
 * endTryOn 别名（兼容旧代码）
 */
window.endTryOn = async function() {
    await window.endSession();
};

// ==================== 配置页面相关全局函数 ====================

/**
 * 关闭配置对话框
 */
window.closeConfig = function() {
    console.log('✖️ 关闭配置对话框');
    const configModal = document.getElementById('config-modal');
    if (configModal) {
        configModal.style.display = 'none';
    }
    
    // 如果当前在欢迎页，重新启动微信关注状态检查
    if (window.pageManager && window.pageManager.currentPage === window.APP_CONSTANTS.PAGES.WELCOME) {
        const welcomePage = window.pageManager.pages.get(window.APP_CONSTANTS.PAGES.WELCOME);
        if (welcomePage && typeof welcomePage.startWechatStatusCheck === 'function') {
            welcomePage.startWechatStatusCheck();
        }
    }
};

/**
 * 打开配置对话框（并初始化数据）
 */
window.openConfig = function() {
    console.log('⚙️ 打开配置对话框');
    
    const configModal = document.getElementById('config-modal');
    if (configModal) {
        configModal.style.display = 'flex';
        
        // 重置弹窗位置到居中
        const modalContent = configModal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.style.top = '50%';
            modalContent.style.left = '50%';
            modalContent.style.transform = 'translate(-50%, -50%)';
        }
        
        // 从 localStorage 加载配置值并填充表单
        
        // 1. 填充登录方式
        const loginTypeSelect = document.getElementById('cfg-login-type');
        if (loginTypeSelect) {
            const savedLoginType = localStorage.getItem('loginType') || 'wechat';
            loginTypeSelect.value = savedLoginType;
            console.log('✅ 加载登录方式:', savedLoginType);
        }
        
        // 2. 填充API服务器地址
        const apiServerInput = document.getElementById('cfg-api-server-url');
        if (apiServerInput) {
            const savedApiUrl = localStorage.getItem('apiServerUrl');
            if (savedApiUrl) {
                apiServerInput.value = savedApiUrl;
            } else if (window.apiClient && window.apiClient.baseURL) {
                apiServerInput.value = window.apiClient.baseURL;
            }
        }
        
        // 2. 填充MAC地址
        const macInput = document.getElementById('cfg-device-mac');
        if (macInput && window.appState && window.appState.macAddress) {
            macInput.value = window.appState.macAddress;
        }
        
        // 3. 填充摄像头设备（需要先刷新列表）
        const cameraSelect = document.getElementById('cfg-camera-device');
        if (cameraSelect) {
            // 先刷新摄像头列表
            if (typeof window.refreshCameraList === 'function') {
                window.refreshCameraList().then(() => {
                    // 刷新后选中保存的摄像头
                    const savedCameraId = localStorage.getItem('preferredCameraId');
                    if (savedCameraId && cameraSelect.querySelector(`option[value="${savedCameraId}"]`)) {
                        cameraSelect.value = savedCameraId;
                    }
                });
            }
        }
        
        // 4. 填充是否使用原生分辨率
        const useNativeResolutionCheckbox = document.getElementById('cfg-use-native-resolution');
        if (useNativeResolutionCheckbox) {
            const useNativeResolution = localStorage.getItem('useNativeResolution');
            // 默认为true（适配Canon等专业摄像机）
            useNativeResolutionCheckbox.checked = useNativeResolution !== 'false';
            console.log('✅ 加载原生分辨率配置:', useNativeResolutionCheckbox.checked);
        }
        
        // 5. 填充是否启动时全屏
        const startFullscreenCheckbox = document.getElementById('cfg-start-fullscreen');
        if (startFullscreenCheckbox) {
            const startFullscreen = localStorage.getItem('startFullscreen');
            // 默认为true（启动时全屏）
            startFullscreenCheckbox.checked = startFullscreen !== 'false';
            console.log('✅ 加载全屏配置:', startFullscreenCheckbox.checked);
        }
        
        // 初始化拖拽功能
        initConfigDrag();
    }
    
    // 停止欢迎页的微信检查
    if (window.pageManager && window.pageManager.currentPage === window.APP_CONSTANTS.PAGES.WELCOME) {
        const welcomePage = window.pageManager.pages.get(window.APP_CONSTANTS.PAGES.WELCOME);
        if (welcomePage && typeof welcomePage.stopWechatStatusCheck === 'function') {
            welcomePage.stopWechatStatusCheck();
        }
    }
};

/**
 * 测试API服务器连接
 */
window.testApiServerConnection = async function() {
    console.log('🔌 测试API服务器连接...');
    const resultDiv = document.getElementById('api-server-test-result');
    
    if (!resultDiv) {
        console.error('❌ 找不到测试结果容器');
        return;
    }
    
    resultDiv.style.display = 'block';
    resultDiv.style.backgroundColor = '#f0f0f0';
    resultDiv.style.color = '#666';
    resultDiv.textContent = '正在测试连接...';
    
    try {
        if (!window.apiClient) {
            throw new Error('API客户端未初始化');
        }
        
        // 调用API客户端的测试方法
        const response = await window.apiClient.testConnection();
        
        if (response.success) {
            resultDiv.style.backgroundColor = '#d4edda';
            resultDiv.style.color = '#155724';
            resultDiv.textContent = '✅ 连接成功！服务器响应正常';
        } else {
            throw new Error(response.error || '连接失败');
        }
    } catch (error) {
        console.error('❌ 测试连接失败:', error);
        resultDiv.style.backgroundColor = '#f8d7da';
        resultDiv.style.color = '#721c24';
        resultDiv.textContent = '❌ 连接失败: ' + error.message;
    }
};

/**
 * 刷新MAC地址
 */
window.refreshMacAddress = async function() {
    console.log('🔄 刷新MAC地址...');
    const macInput = document.getElementById('cfg-device-mac');
    
    if (!macInput) {
        console.error('❌ 找不到MAC地址输入框');
        return;
    }
    
    try {
        // 尝试通过IPC获取
        if (typeof window !== 'undefined' && window.require) {
            try {
                const { ipcRenderer } = window.require('electron');
                if (ipcRenderer) {
                    const macAddress = await ipcRenderer.invoke('get-mac-address');
                    if (macAddress && macAddress !== '无法获取MAC地址') {
                        window.appState.macAddress = macAddress;
                        macInput.value = macAddress;
                        console.log('✅ 刷新MAC地址成功:', macAddress);
                        return;
                    }
                }
            } catch (error) {
                console.warn('⚠️ IPC获取MAC地址失败:', error.message);
            }
        }
        
        // 使用当前缓存的MAC地址
        if (window.appState.macAddress) {
            macInput.value = window.appState.macAddress;
            console.log('✅ 使用缓存MAC地址:', window.appState.macAddress);
        } else {
            console.warn('⚠️ 未找到MAC地址');
            macInput.value = '未找到MAC地址';
        }
    } catch (error) {
        console.error('❌ 刷新MAC地址失败:', error);
        macInput.value = '获取失败';
    }
};

/**
 * 刷新摄像头列表
 */
window.refreshCameraList = async function() {
    console.log('📷 刷新摄像头列表...');
    const cameraSelect = document.getElementById('cfg-camera-device');
    
    if (!cameraSelect) {
        console.error('❌ 找不到摄像头选择下拉框');
        return;
    }
    
    try {
        // 获取摄像头设备列表
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        // 清空现有选项
        cameraSelect.innerHTML = '';
        
        if (videoDevices.length === 0) {
            cameraSelect.innerHTML = '<option value="">未找到摄像头设备</option>';
            console.warn('⚠️ 未找到摄像头设备');
            return;
        }
        
        // 添加摄像头选项
        videoDevices.forEach((device, index) => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.text = device.label || `摄像头 ${index + 1}`;
            cameraSelect.appendChild(option);
        });
        
        // 选中当前使用的摄像头
        if (window.cameraUtils && window.cameraUtils.currentDeviceId) {
            cameraSelect.value = window.cameraUtils.currentDeviceId;
        }
        
        console.log(`✅ 找到 ${videoDevices.length} 个摄像头设备`);
    } catch (error) {
        console.error('❌ 刷新摄像头列表失败:', error);
        cameraSelect.innerHTML = '<option value="">获取摄像头失败</option>';
        window.notification?.error('获取摄像头列表失败: ' + error.message);
    }
};

/**
 * 切换摄像头
 */
window.switchCamera = async function() {
    console.log('🔄 切换摄像头...');
    const cameraSelect = document.getElementById('cfg-camera-device');
    
    if (!cameraSelect) {
        console.error('❌ 找不到摄像头选择下拉框');
        return;
    }
    
    const selectedDeviceId = cameraSelect.value;
    
    if (!selectedDeviceId) {
        console.warn('⚠️ 未选择摄像头');
        window.notification?.warning('请先选择一个摄像头');
        return;
    }
    
    try {
        // 如果摄像头工具类存在，调用其切换方法
        if (window.cameraUtils && typeof window.cameraUtils.switchCamera === 'function') {
            await window.cameraUtils.switchCamera(selectedDeviceId);
            console.log('✅ 摄像头切换成功');
            window.notification?.success('摄像头已切换');
        } else {
            console.warn('⚠️ 摄像头工具类不可用');
            window.notification?.warning('摄像头功能暂不可用');
        }
    } catch (error) {
        console.error('❌ 切换摄像头失败:', error);
        window.notification?.error('切换摄像头失败: ' + error.message);
    }
};

/**
 * 保存配置
 */
window.saveConfig = async function() {
    console.log('💾 保存配置...');
    
    try {
        const config = {};
        
        // 1. 获取登录方式
        const loginTypeSelect = document.getElementById('cfg-login-type');
        if (loginTypeSelect && loginTypeSelect.value) {
            config.loginType = loginTypeSelect.value;
            console.log('✅ 登录方式:', config.loginType);
        }
        
        // 2. 获取API服务器地址
        const apiServerInput = document.getElementById('cfg-api-server-url');
        if (apiServerInput && apiServerInput.value) {
            const newApiUrl = apiServerInput.value.trim();
            if (newApiUrl) {
                config.apiServerUrl = newApiUrl;
                // 立即应用到API客户端
                if (window.apiClient) {
                    window.apiClient.baseURL = newApiUrl;
                    console.log('✅ API服务器地址已更新:', newApiUrl);
                }
            }
        }
        
        // 3. 获取MAC地址（只读，不保存）
        const macInput = document.getElementById('cfg-device-mac');
        if (macInput && macInput.value) {
            // MAC地址已经在appState中，不需要重复保存
            console.log('ℹ️ MAC地址:', macInput.value);
        }
        
        // 4. 获取摄像头设备
        const cameraSelect = document.getElementById('cfg-camera-device');
        if (cameraSelect && cameraSelect.value) {
            config.preferredCameraId = cameraSelect.value;
            const selectedOption = cameraSelect.options[cameraSelect.selectedIndex];
            config.preferredCameraLabel = selectedOption?.text || '';
            console.log('✅ 摄像头设备:', config.preferredCameraLabel);
        }
        
        // 5. 获取是否使用原生分辨率
        const useNativeResolutionCheckbox = document.getElementById('cfg-use-native-resolution');
        if (useNativeResolutionCheckbox) {
            config.useNativeResolution = useNativeResolutionCheckbox.checked ? 'true' : 'false';
            console.log('✅ 使用原生分辨率:', config.useNativeResolution);
        }
        
        // 6. 获取是否启动时全屏
        const startFullscreenCheckbox = document.getElementById('cfg-start-fullscreen');
        if (startFullscreenCheckbox) {
            config.startFullscreen = startFullscreenCheckbox.checked ? 'true' : 'false';
            console.log('✅ 启动时全屏:', config.startFullscreen);
        }
        
        // 7. 保存所有配置到localStorage
        Object.keys(config).forEach(key => {
            localStorage.setItem(key, config[key]);
            console.log(`💾 已保存: ${key} = ${config[key]}`);
        });
        
        // 8. 将全屏配置保存到主进程配置文件（以便下次启动生效）
        if (config.startFullscreen !== undefined && window.require) {
            try {
                const { ipcRenderer } = window.require('electron');
                const shouldFullscreen = config.startFullscreen === 'true';
                await ipcRenderer.invoke('save-app-config', { 
                    startFullscreen: shouldFullscreen 
                });
                console.log('✅ 全屏配置已保存到主进程配置文件');
            } catch (error) {
                console.warn('⚠️ 保存全屏配置到主进程失败:', error.message);
            }
        }
        
        // 9. 应用配置到当前环境
        await applyConfig(config);
        
        console.log('✅ 配置保存成功:', config);
        
        // 10. 如枟修改了全屏配置，提示用户重启
        const previousFullscreen = localStorage.getItem('previousStartFullscreen');
        if (config.startFullscreen !== undefined && config.startFullscreen !== previousFullscreen) {
            localStorage.setItem('previousStartFullscreen', config.startFullscreen);
            window.notification?.info('全屏配置已更改，请重启应用后生效');
        } else {
            window.notification?.success('配置已保存');
        }
        
        // 关闭配置页面
        setTimeout(() => {
            window.closeConfig();
        }, 500);
        
    } catch (error) {
        console.error('❌ 保存配置失败:', error);
        window.notification?.error('保存配置失败: ' + error.message);
    }
};

/**
 * 应用配置到当前环境
 */
async function applyConfig(config) {
    console.log('⚙️ 应用配置...', config);
    
    // 1. 应用API服务器地址
    if (config.apiServerUrl && window.apiClient) {
        window.apiClient.baseURL = config.apiServerUrl;
        console.log('✅ API服务器地址已应用:', config.apiServerUrl);
    }
    
    // 2. 应用摄像头设备（如果当前在拍照页面）
    if (config.preferredCameraId && window.cameraUtils) {
        try {
            if (typeof window.cameraUtils.switchCamera === 'function') {
                await window.cameraUtils.switchCamera(config.preferredCameraId);
                console.log('✅ 摄像头设备已应用:', config.preferredCameraLabel);
            }
        } catch (error) {
            console.warn('⚠️ 应用摄像头设备失败:', error.message);
        }
    }
    
    console.log('✅ 配置应用完成');
}

/**
 * 从 localStorage 加载配置
 */
window.loadConfig = function() {
    console.log('📂 加载配置...');
    
    const config = {};
    
    // 1. 加载登录方式
    const loginType = localStorage.getItem('loginType');
    if (loginType) {
        config.loginType = loginType;
        console.log('✅ 已加载登录方式:', loginType);
    } else {
        // 默认为微信公众号登录
        config.loginType = 'wechat';
        localStorage.setItem('loginType', 'wechat');
        console.log('✅ 使用默认登录方式: wechat');
    }
    
    // 2. 加载API服务器地址
    const apiServerUrl = localStorage.getItem('apiServerUrl');
    if (apiServerUrl) {
        config.apiServerUrl = apiServerUrl;
        if (window.apiClient) {
            window.apiClient.baseURL = apiServerUrl;
            console.log('✅ 已加载API服务器地址:', apiServerUrl);
        }
    }
    
    // 3. 加载摄像头设备ID
    const preferredCameraId = localStorage.getItem('preferredCameraId');
    if (preferredCameraId) {
        config.preferredCameraId = preferredCameraId;
        console.log('✅ 已加载摄像头设备ID:', preferredCameraId);
    }
    
    // 4. 加载摄像头设备名称
    const preferredCameraLabel = localStorage.getItem('preferredCameraLabel');
    if (preferredCameraLabel) {
        config.preferredCameraLabel = preferredCameraLabel;
        console.log('✅ 已加载摄像头设备名称:', preferredCameraLabel);
    }
    
    // 5. 加载是否使用原生分辨率（默认为true）
    const useNativeResolution = localStorage.getItem('useNativeResolution');
    if (useNativeResolution !== null) {
        config.useNativeResolution = useNativeResolution === 'true';
        console.log('✅ 已加载原生分辨率配置:', config.useNativeResolution);
    } else {
        // 默认启用原生分辨率（适配Canon等专业摄像机）
        config.useNativeResolution = true;
        localStorage.setItem('useNativeResolution', 'true');
        console.log('✅ 使用默认原生分辨率配置: true');
    }
    
    // 6. 加载是否启动时全屏（默认为true）
    const startFullscreen = localStorage.getItem('startFullscreen');
    if (startFullscreen !== null) {
        config.startFullscreen = startFullscreen === 'true';
        console.log('✅ 已加载全屏配置:', config.startFullscreen);
    } else {
        // 默认启动时全屏
        config.startFullscreen = true;
        localStorage.setItem('startFullscreen', 'true');
        console.log('✅ 使用默认全屏配置: true');
    }
    
    console.log('✅ 配置加载完成:', config);
    return config;
};

/**
 * 初始化配置弹窗拖拽功能
 */
function initConfigDrag() {
    const configModal = document.getElementById('config-modal');
    const modalContent = configModal?.querySelector('.modal-content');
    const modalHeader = configModal?.querySelector('.modal-header');
    
    if (!configModal || !modalContent || !modalHeader) {
        console.warn('⚠️ 找不到配置弹窗元素，无法初始化拖拽');
        return;
    }
    
    // 移除之前的监听器（如果存在）
    if (modalHeader._dragInitialized) {
        return;
    }
    
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;
    
    // 鼠标按下时开始拖拽
    const handleMouseDown = (e) => {
        // 如果点击的是关闭按钮，不启动拖拽
        if (e.target.closest('.modal-close')) {
            return;
        }
        
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        
        // 获取当前位置
        const rect = modalContent.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;
        
        // 移除transform，改用top/left定位
        modalContent.style.transform = 'none';
        modalContent.style.left = initialLeft + 'px';
        modalContent.style.top = initialTop + 'px';
        
        // 添加拖拽样式
        modalHeader.style.cursor = 'grabbing';
        modalContent.style.userSelect = 'none';
        
        e.preventDefault();
    };
    
    // 鼠标移动时更新位置
    const handleMouseMove = (e) => {
        if (!isDragging) return;
        
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        const newLeft = initialLeft + deltaX;
        const newTop = initialTop + deltaY;
        
        modalContent.style.left = newLeft + 'px';
        modalContent.style.top = newTop + 'px';
        
        e.preventDefault();
    };
    
    // 鼠标释放时结束拖拽
    const handleMouseUp = (e) => {
        if (!isDragging) return;
        
        isDragging = false;
        modalHeader.style.cursor = 'move';
        modalContent.style.userSelect = '';
        
        e.preventDefault();
    };
    
    // 绑定事件
    modalHeader.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // 标记已初始化
    modalHeader._dragInitialized = true;
    
    console.log('✅ 配置弹窗拖拽功能已初始化');
}
