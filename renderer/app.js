// 应用状态管理
class AppState {
    constructor() {
        this.currentPage = 'welcome-page';
        this.welcomePageInitialized = false; // 欢迎页初始化标志
        this.userProfile = {
            openid: null,
            photo: null,
            photoFileName: null,
            fullBodyShotNameInRH: null, // RunningHub中的全身照文件名（去除api/前缀）
            gender: 'female'
        };
        this.selectedClothing = null; // 当前生效的选择（与 lastSelectionType 同步）
        this.selectedTopBottom = null; // { tops: item, bottoms: item }
        this.selectedDress = null; // { item }
        this.lastSelectionType = null; // 'topBottom' | 'dress'
        this.selectedStyle = null;
        this.currentTask = null;
        this.currentTaskId = null; // API Server中的任务ID
        this.apiBaseUrl = 'https://clothing-api.0086studios.xyz'; // 生产环境云端API服务器
        this.apiServerUrl = 'https://clothing-api.0086studios.xyz'; // 生产环境云端API服务器
        this.currentGender = 'female';
        this.currentCategory = 'tops-bottoms';
        this.currentSubCategory = 'tops';
        this.isDressSelected = false;
        this.configCache = null;
        this.resultImageUrl = null; // 添加结果图片URL存储
        this.resizeTimer = null; // 添加窗口大小调整防抖定时器
        this.macAddress = null; // 设备MAC地址
        // 任务状态轮询定时器
        this.taskPollTimer = null;
        // 微信关注状态检查定时器
        this.wechatStatusCheckTimer = null;
        
        // 开发模式标志
        this.isDevelopment = this.checkDevelopmentMode();
        // 开发模式跳过登录标志
        this.devModeSkippedLogin = false;
        
        // 添加默认服装数据
        this.defaultClothing = {
            tops: [
                { id: 'top1', name: '白色衬衫', image: 'public/coats/1.jpg' },
                { id: 'top2', name: '粉色T恤', image: 'public/coats/2.jpg' },
                { id: 'top3', name: '蓝色针织衫', image: 'public/coats/3.jpg' },
                { id: 'top4', name: '格子衬衫', image: 'public/coats/4.jpg' },
                { id: 'top5', name: '黑色外套', image: 'public/coats/5.jpg' },
                { id: 'top6', name: '牛仔外套', image: 'public/coats/6.jpg' }
            ],
            bottoms: [
                { id: 'bottom1', name: '牛仔裤', image: 'public/pants/9.jpg' },
                { id: 'bottom2', name: '时尚长裤', image: 'public/pants/10.jpg' },
                { id: 'bottom3', name: '休闲裤', image: 'public/pants/11.jpg' },
                { id: 'bottom4', name: '运动裤', image: 'public/pants/12.jpg' },
                { id: 'bottom5', name: '短裤', image: 'public/pants/13.jpg' },
                { id: 'bottom6', name: '裙子', image: 'public/pants/14.jpg' }
            ]
        };
    }

    // 检查是否为开发模式
    checkDevelopmentMode() {
        try {
            // 0. 优先检查主进程注入的环境变量（最可靠）
            if (typeof window !== 'undefined' && window.__APP_ENV__) {
                if (window.__APP_ENV__.IS_PRODUCTION) {
                    console.log('📦 生产环境模式（注入环境变量）');
                    return false;
                }
                if (window.__APP_ENV__.IS_DEVELOPMENT) {
                    console.log('🔧 开发模式（注入环境变量）');
                    return true;
                }
            }
            
            // 1. 尝试直接访问 process.env
            let nodeEnv = null;
            try {
                if (typeof process !== 'undefined' && process.env) {
                    nodeEnv = process.env.NODE_ENV;
                    if (nodeEnv === 'production') {
                        console.log('📦 生产环境模式（process.env）');
                        return false;
                    }
                }
            } catch (e) {
                console.log('ℹ️ 无法直接访问 process.env');
            }
            
            // 2. 检查 localStorage 中的开发模式设置
            const devMode = localStorage.getItem('DEV_MODE');
            if (devMode === 'true') {
                console.log('🔧 开发模式已启用（通过 localStorage）');
                return true;
            }
            
            // 3. 检查 URL 参数
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('dev') === 'true') {
                console.log('🔧 开发模式已启用（通过 URL 参数）');
                return true;
            }
            
            // 4. 检查是否为真正的本地开发环境（仅 localhost/127.0.0.1，不包括 file://）
            const isLocalhost = window.location.hostname === 'localhost' || 
                               window.location.hostname === '127.0.0.1';
            
            if (isLocalhost) {
                console.log('🔧 开发模式已启用（本地环境）');
                return true;
            }
            
            // 5. 其他情况（包括 file:// 协议的生产打包）默认为非开发模式
            console.log('🌐 生产环境模式');
            return false;
        } catch (error) {
            console.error('检查开发模式失败:', error);
            return false;
        }
    }

    // 拍照功能
    async capturePhoto() {
        try {
            // 获取当前视频流并拍照
            const video = document.getElementById('camera-video');
            const canvas = document.getElementById('camera-canvas');
            const context = canvas.getContext('2d');
            
            // 设置canvas尺寸与视频相同
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            // 绘制当前视频帧到canvas
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // 将canvas转换为图片数据URL
            const imageDataUrl = canvas.toDataURL('image/jpeg');
            
            // 显示拍照确认页面
            const capturedPhoto = document.getElementById('captured-photo');
            if (capturedPhoto) {
                capturedPhoto.src = imageDataUrl;
            }
            
            // 保存照片数据到状态
            this.capturedPhotoData = imageDataUrl;
            
            // 切换到拍照确认页面
            await this.setPage('photo-confirm-page');
        } catch (error) {
            console.error('拍照失败:', error);
            this.showError('拍照失败，请重试');
        }
    }
    
    // 重新拍摄
    async retakePhoto() {
        // 重置按钮状态
        if (typeof resetCaptureButton === 'function') {
            resetCaptureButton();
        }
        
        // 返回拍照页面
        await this.setPage('profile-page');
    }
    
    // 确认照片
    async confirmPhoto() {
        try {
            // 上传人物照片到服务器
            if (this.capturedPhotoData) {
                this.showLoading('正在上传照片...');
                
                // 将base64转换为Blob
                const response = await fetch(this.capturedPhotoData);
                const blob = await response.blob();
                
                console.log('上传照片信息: 尺寸 720x1024, 文件大小: ' + blob.size + ' bytes');
                
                // 确保API客户端存在
                if (!window.apiClient) {
                    console.log('❌ window.apiClient 不存在，创建新的API客户端实例...');
                    if (typeof window.ApiClient === 'function') {
                        window.apiClient = new window.ApiClient();
                        console.log('✅ 新的API客户端实例创建成功');
                    } else {
                        console.error('❌ 无法创建新的API客户端实例');
                        throw new Error('无法创建API客户端实例');
                    }
                }
                
                // 确保API客户端已初始化
                if (!window.apiClient.initialized) {
                    console.log('🔄 API客户端尚未初始化，执行初始化...');
                    await window.apiClient.initialize();
                    console.log('✅ API客户端初始化完成');
                }
                
                // 检查设备是否已认证
                if (!window.apiClient.token) {
                    console.log('⚠️ 设备未认证，尝试进行设备认证...');
                    let macAddress = this.macAddress;
                    if (!macAddress) {
                        await this.getMacAddress();
                        macAddress = this.macAddress;
                    }
                    
                    if (macAddress) {
                        const deviceId = macAddress.replace(/:/g, '');
                        const authResponse = await window.apiClient.authenticateDevice(deviceId, '衣等舱客户端');
                        if (authResponse.success) {
                            console.log('✅ 设备认证成功');
                        }
                    }
                }
                
                // 上传照片到云端
                const uploadResponse = await window.apiClient.uploadPhoto(blob, this.qrSceneStr);
                console.log('照片上传结果:', uploadResponse);
                
                if (!uploadResponse.success) {
                    throw new Error(uploadResponse.error || '照片上传失败');
                }
                
                // 保存任务ID
                this.currentTaskId = uploadResponse.data.taskId;
                console.log('✅ 照片上传成功，任务ID:', this.currentTaskId);
                
                this.hideLoading();
            }
            
            // 反初始化摄像头，释放资源
            if (typeof deinitializeCamera === 'function') {
                deinitializeCamera();
            }
            
            // 跳转到时尚偏好选择页面
            await this.setPage('preference-page');
        } catch (error) {
            console.error('确认照片失败:', error);
            this.hideLoading();
            this.showError('处理照片失败: ' + error.message);
        }
    }
    
    // 数据URL转换为Blob
    dataURLToBlob(dataURL) {
        const parts = dataURL.split(';base64,');
        const contentType = parts[0].split(':')[1];
        const raw = atob(parts[1]);
        const rawLength = raw.length;
        const uInt8Array = new Uint8Array(rawLength);
        
        for (let i = 0; i < rawLength; ++i) {
            uInt8Array[i] = raw.charCodeAt(i);
        }
        
        return new Blob([uInt8Array], { type: contentType });
    }
    
    // 上传照片到服务器
    async uploadPhotoToServer(photoBlob) {
        try {
            if (!window.apiClient) {
                throw new Error('API客户端未初始化');
            }
            
            // 调用API客户端上传照片
            const response = await window.apiClient.uploadPhoto(photoBlob, this.qrSceneStr);
            
            if (response.success) {
                // 保存照片信息
                this.userProfile.photo = response.photoUrl;
                this.userProfile.photoFileName = response.fileName;
                console.log('照片上传成功:', response);
            } else {
                throw new Error(response.error || '照片上传失败');
            }
        } catch (error) {
            console.error('照片上传失败:', error);
            throw error;
        }
    }
    
    // 选择自定义风格
    async selectCustomStyle() {
        // 跳转到服装选择页面
        await this.setPage('clothing-page');
    }
    
    // 选择推荐风格
    async selectRecommendedStyle() {
        // 弹出提示框
        this.showInfo('敬请期待');
    }
    
    // 打开服装选择弹窗
    async openClothingModal(category) {
        try {
            // 保存当前类别
            this.currentModalCategory = category;
            
            // 设置弹窗标题
            const modalTitle = document.getElementById('modal-title');
            if (modalTitle) {
                modalTitle.textContent = category === 'tops' ? '选择上衣' : '选择下衣';
            }
            
            // 清空现有内容
            const clothingGrid = document.getElementById('clothing-grid-modal');
            if (clothingGrid) {
                clothingGrid.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">正在加载...</div>';
            }
            
            // 显示弹窗
            const modal = document.getElementById('clothing-modal');
            if (modal) {
                modal.style.display = 'flex';
            }
            
            // 加载服装数据
            await this.loadClothingForModal(category);
        } catch (error) {
            console.error('打开服装选择弹窗失败:', error);
            this.showError('加载服装数据失败');
        }
    }
    
    // 关闭服装选择弹窗
    closeClothingModal() {
        const modal = document.getElementById('clothing-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    // 为弹窗加载服装数据
    async loadClothingForModal(category) {
        try {
            if (!window.apiClient) {
                throw new Error('API客户端未初始化');
            }
            
            // 获取分类数据
            const categories = await window.apiClient.getClothingCategories();
            const genderCategory = categories.data.find(cat => 
                cat.name === (this.currentGender === 'male' ? '男装' : '女装')
            );
            
            if (!genderCategory) {
                throw new Error('未找到性别分类');
            }
            
            // 查找对应的子分类
            let subCategoryName = '';
            if (category === 'tops') {
                subCategoryName = this.currentGender === 'male' ? '外套' : '外套';
            } else {
                subCategoryName = this.currentGender === 'male' ? '裤子' : '裤子';
            }
            
            const subCategory = genderCategory.children.find(child => 
                child.name === subCategoryName
            );
            
            if (!subCategory) {
                throw new Error(`未找到${subCategoryName}分类`);
            }
            
            // 获取服装列表
            const clothesResponse = await window.apiClient.getClothingByCategory(subCategory.id);
            
            if (!clothesResponse.success || !clothesResponse.data.clothes) {
                throw new Error('获取服装数据失败');
            }
            
            // 渲染服装列表
            const clothingGrid = document.getElementById('clothing-grid-modal');
            if (clothingGrid) {
                if (clothesResponse.data.clothes.length === 0) {
                    clothingGrid.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">暂无数据</div>';
                    return;
                }
                
                // 清空现有内容
                clothingGrid.innerHTML = '';
                
                // 添加服装项
                clothesResponse.data.clothes.forEach(item => {
                    const itemEl = document.createElement('div');
                    itemEl.className = 'clothing-item-modal';
                    itemEl.dataset.id = item.id;
                    itemEl.innerHTML = `
                        <img src="${this.getImageUrl(item.imageUrl)}" alt="${item.name}">
                        <div class="label">${item.name}</div>
                    `;
                    
                    // 检查是否已选中
                    if (this.isItemInSelection(item, category)) {
                        itemEl.classList.add('selected');
                    }
                    
                    // 添加点击事件
                    itemEl.onclick = () => this.selectClothingInModal(item, category, itemEl);
                    
                    clothingGrid.appendChild(itemEl);
                });
            }
        } catch (error) {
            console.error('加载服装数据失败:', error);
            const clothingGrid = document.getElementById('clothing-grid-modal');
            if (clothingGrid) {
                clothingGrid.innerHTML = `<div style="text-align: center; padding: 20px; color: #b00;">加载失败：${error.message}</div>`;
            }
        }
    }
    
    // 检查服装项是否在当前选择中
    isItemInSelection(item, category) {
        if (category === 'tops' && this.selectedTopBottom && this.selectedTopBottom.tops) {
            return this.selectedTopBottom.tops.id === item.id;
        }
        
        if (category === 'bottoms' && this.selectedTopBottom && this.selectedTopBottom.bottoms) {
            return this.selectedTopBottom.bottoms.id === item.id;
        }
        
        return false;
    }
    
    // 在弹窗中选择服装
    async selectClothingInModal(item, category, element) {
        try {
            // 更新选择状态
            if (category === 'tops') {
                if (!this.selectedTopBottom) {
                    this.selectedTopBottom = { tops: item, bottoms: null };
                } else {
                    this.selectedTopBottom.tops = item;
                }
            } else if (category === 'bottoms') {
                if (!this.selectedTopBottom) {
                    this.selectedTopBottom = { tops: null, bottoms: item };
                } else {
                    this.selectedTopBottom.bottoms = item;
                }
            }
            
            // 更新预览区域
            this.updateClothingPreview(category, item);
            
            // 关闭弹窗
            this.closeClothingModal();
            
            console.log('选择的服装:', this.selectedTopBottom);
        } catch (error) {
            console.error('选择服装失败:', error);
            this.showError('选择服装失败');
        }
    }
    
    // 更新服装预览区域
    updateClothingPreview(category, item) {
        const previewElement = document.getElementById(
            category === 'tops' ? 'tops-preview' : 'bottoms-preview'
        );
        
        if (previewElement) {
            previewElement.innerHTML = `
                <img src="${this.getImageUrl(item.imageUrl)}" alt="${item.name}" style="width: 100%; height: 100%; object-fit: cover;">
            `;
        }
    }
    
    // 添加结果图片保持页面的函数实现
    async retakeFitting() {
        try {
            // 返回到服装选择页面
            await this.setPage('clothing-page');
        } catch (error) {
            console.error('重新选择试衣失败:', error);
            this.showError('操作失败，请重试');
        }
    }

    async saveImage() {
        try {
            // 跳转到扫码下载图片页面
            await this.setPage('scan-to-get-page');
            
            // 生成二维码
            await this.generateWechatQRCode();
        } catch (error) {
            console.error('保存图片失败:', error);
            this.showError('操作失败，请重试');
        }
    }

    // 添加扫码下载图片页面的函数实现
    async continueFitting() {
        try {
            // 返回到服装选择页面
            await this.setPage('clothing-page');
        } catch (error) {
            console.error('继续试衣失败:', error);
            this.showError('操作失败，请重试');
        }
    }

    async goBackToPreference() {
        try {
            // 返回到时尚偏好选择页面
            await this.setPage('preference-page');
        } catch (error) {
            console.error('返回时尚偏好选择页面失败:', error);
            this.showError('操作失败，请重试');
        }
    }

    async goBackToClothing() {
        try {
            // 返回到服装选择页面
            await this.setPage('clothing-page');
        } catch (error) {
            console.error('返回服装选择页面失败:', error);
            this.showError('操作失败，请重试');
        }
    }

    // 结束会话
    async endSession() {
        try {
            // 重置选择状态
            this.selectedTopBottom = null;
            this.selectedDress = null;
            this.selectedClothing = null;
            this.currentTask = null;
            this.currentTaskId = null;
            this.resultImageUrl = null;
            
            // 更新预览区域
            this.resetClothingPreviews();
            
            // 返回首页
            await this.setPage('welcome-page');
        } catch (error) {
            console.error('结束会话失败:', error);
            this.showError('结束会话失败');
        }
    }
    
    // 重置服装预览区域
    resetClothingPreviews() {
        const topsPreview = document.getElementById('tops-preview');
        const bottomsPreview = document.getElementById('bottoms-preview');
        
        if (topsPreview) {
            topsPreview.innerHTML = '<div class="preview-placeholder">点击选择上衣</div>';
        }
        
        if (bottomsPreview) {
            bottomsPreview.innerHTML = '<div class="preview-placeholder">点击选择下衣</div>';
        }
    }
    
    // 返回到拍照确认页面
    async goBackToPhotoConfirm() {
        await this.setPage('photo-confirm-page');
    }

    // 返回到首页
    async goBackToHome() {
        await this.setPage('welcome-page');
    }
    
    // 显示信息提示
    showInfo(message) {
        // 创建提示元素
        const notification = document.createElement('div');
        notification.className = 'info-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // 3秒后自动消失
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    // 显示错误提示
    showError(message) {
        // 创建错误提示元素
        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // 5秒后自动消失
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }

    // 获取配置
    getConfig() {
        // 尝试从localStorage获取配置
        try {
            const config = localStorage.getItem('appConfig');
            return config ? JSON.parse(config) : {};
        } catch (error) {
            console.warn('获取配置失败，使用默认配置:', error);
            return {};
        }
    }

    // 设置配置
    setConfig(config) {
        try {
            localStorage.setItem('appConfig', JSON.stringify(config));
            this.configCache = config;
        } catch (error) {
            console.error('保存配置失败:', error);
        }
    }

    // 处理窗口大小变化
    handleWindowResize() {
        // 防抖处理，避免频繁调整
        if (this.resizeTimer) {
            clearTimeout(this.resizeTimer);
        }
        
        this.resizeTimer = setTimeout(() => {
            if (this.currentPage === 'results-page' && this.resultImageUrl) {
                this.adjustImageContainer();
            }
        }, 300);
    }

    async setPage(pageId) {
        console.log(`📄 切换页面: ${this.currentPage} -> ${pageId}`);
        
        // 先移除所有页面的 active，避免多个页面同时显示
        try {
            const activePages = document.querySelectorAll('.page.active');
            console.log(`🔍 找到 ${activePages.length} 个活动页面:`, Array.from(activePages).map(el => el.id));
            activePages.forEach((el) => el.classList.remove('active'));
        } catch (e) {
            console.error('❌ 移除active类失败:', e);
        }

        // 兜底再次移除当前记录页面的 active
        const currentPageEl = document.getElementById(this.currentPage);
        if (currentPageEl) {
            currentPageEl.classList.remove('active');
            console.log(`✅ 移除了当前页面的active类: ${this.currentPage}`);
        }

        // 如果离开拍照页面，则解绑并关闭摄像头流，避免长期占用
        try {
            if (this.currentPage === 'profile-page' && pageId !== 'profile-page') {
                const v = document.getElementById('camera-video');
                if (v) {
                    try { v.pause && v.pause(); } catch {}
                    try { v.srcObject = null; } catch {}
                }
                await deinitializeCamera();
            }
        } catch (e) {
            console.warn('⚠️ 离开拍照页面时关闭摄像头失败:', e && e.message);
        }

        // 如果离开结果页面，清理事件监听器
        if (this.currentPage === 'results-page') {
            window.removeEventListener('resize', this.handleWindowResize.bind(this));
            if (this.resizeTimer) {
                clearTimeout(this.resizeTimer);
                this.resizeTimer = null;
            }
        }

        // 显示新页面
        const newPageEl = document.getElementById(pageId);
        if (newPageEl) {
            newPageEl.classList.add('active');
            this.currentPage = pageId;
            console.log(`✅ 页面切换成功，新页面: ${pageId}`);
            console.log(`🔍 新页面的display样式:`, window.getComputedStyle(newPageEl).display);
        } else {
            console.error(`❌ 找不到页面元素: ${pageId}`);
        }
        
        // 更新分页器状态
        this.updatePaginator(pageId);
        
        console.log(`📄 页面切换流程完成: ${pageId}`);
    }
    
    // 更新分页器状态
    updatePaginator(pageId) {
        // 定义页面到分页器索引的映射
        const pageIndexMap = {
            'welcome-page': 0,
            'profile-page': 1,  // 拍照页面不显示分页器，但保留索引
            'clothing-page': 2,
            'results-page': 3,
            'scan-to-get-page': 3  // 扫码获取图片页面使用第4个点
        };
        
        // 获取当前页面的分页器索引
        const currentIndex = pageIndexMap[pageId];
        if (currentIndex === undefined) return;
        
        // 更新所有页面的分页器
        const pagesWithPaginator = ['welcome-page', 'clothing-page', 'results-page', 'scan-to-get-page'];
        
        pagesWithPaginator.forEach(pageId => {
            const pageEl = document.getElementById(pageId);
            if (pageEl) {
                const paginator = pageEl.querySelector('.paginator');
                if (paginator) {
                    const dots = paginator.querySelectorAll('.page-dot');
                    dots.forEach((dot, index) => {
                        if (index === currentIndex) {
                            dot.classList.add('active');
                        } else {
                            dot.classList.remove('active');
                        }
                    });
                }
            }
        });
    }

    // 生成微信二维码 - 修改为使用新的接口规范
    async generateWechatQRCode() {
        try {
            // 只有在欢迎页面展示二维码时才生成二维码
            if (this.currentPage !== 'welcome-page') {
                console.log('ℹ️ 当前不在欢迎页面，跳过二维码生成');
                return;
            }
            
            console.log('🔍 检查API客户端状态:', {
                hasApiClient: !!window.apiClient,
                initialized: window.apiClient ? window.apiClient.initialized : false
            });
            
            // 确保API客户端已初始化
            if (!window.apiClient) {
                console.log('⚠️ API客户端未初始化，尝试创建实例...');
                if (typeof window.ApiClient === 'function') {
                    window.apiClient = new window.ApiClient();
                } else {
                    console.warn('❌ 无法创建 API 客户端实例（缺少构造函数），跳过二维码生成');
                    return;
                }
            }
            
            if (!window.apiClient.initialized) {
                console.log('🔄 API客户端尚未初始化，执行初始化...');
                if (typeof window.apiClient.initialize === 'function') {
                await window.apiClient.initialize();
                console.log('✅ API客户端初始化完成');
                } else {
                    console.warn('❌ API客户端缺少 initialize 方法，跳过二维码生成');
                    return;
                }
            }
            
            // 处理MAC地址：去掉冒号作为设备唯一标识
            const deviceId = this.macAddress ? this.macAddress.replace(/:/g, '') : this.macAddress;
            console.log('📱 生成微信关注二维码，使用处理后的MAC地址:', deviceId);
            
            // 调用API生成二维码
            const response = await window.apiClient.generateWechatQRCode(deviceId);
            
            if (response.success) {
                this.wechatQRCode = response.qrCode;
                // 保存场景值
                this.qrSceneStr = response.qrCode.sceneStr;
                
                // 更新页面上的二维码显示
                const qrImg = document.getElementById('wechat-qr-image');
                if (qrImg) {
                    qrImg.src = response.qrCode.dataURL;
                    console.log('✅ 微信二维码生成成功');
                }
                
                // 启动微信关注状态检查定时器
                this.startWechatStatusCheck();
            } else {
                throw new Error(response.error || '生成二维码失败');
            }
        } catch (error) {
            console.error('❌ 生成微信二维码失败:', error);
            
            // 如果是离线模式或网络错误，显示占位符二维码
            if (window.apiClient && window.apiClient.isOfflineMode()) {
                console.log('🌐 离线模式：显示占位符二维码');
                this.showOfflineQRCode();
            } else if (error.message.includes('Failed to fetch') || 
                       error.message.includes('ERR_NETWORK_CHANGED') ||
                       error.message.includes('ERR_INTERNET_DISCONNECTED')) {
                console.log('🌐 网络错误：显示占位符二维码');
                this.showOfflineQRCode();
            }
            
            // 二维码生成失败时不再弹出错误提示框，只在控制台记录错误
            // this.showError('生成微信二维码失败: ' + error.message);
        }
    }

    // 手动刷新微信二维码
    async refreshWechatQRCode() {
        console.log('🔄 手动刷新微信二维码...');
        
        // 只有在欢迎页面才允许手动刷新二维码
        if (this.currentPage !== 'welcome-page') {
            console.log('ℹ️ 当前不在欢迎页面，不允许手动刷新二维码');
            return;
        }
        
        // 防止频繁刷新（防抖机制）
        const now = Date.now();
        if (this.lastQRRefreshTime && (now - this.lastQRRefreshTime) < 5000) {
            console.log('⚠️ 刷新过于频繁，忽略本次请求');
            return;
        }
        this.lastQRRefreshTime = now;
        
        // 禁用刷新按钮防止重复点击
        const refreshBtn = document.getElementById('refresh-qr-btn');
        if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.textContent = '刷新中...';
        }
        
        try {
            await this.generateWechatQRCode();
            console.log('✅ 微信二维码手动刷新完成');
        } catch (error) {
            console.error('❌ 微信二维码手动刷新失败:', error);
            // 手动刷新失败时不再弹出错误提示框，只在控制台记录错误
            // this.showError('二维码刷新失败: ' + error.message);
        } finally {
            // 恢复刷新按钮状态
            if (refreshBtn) {
                refreshBtn.disabled = false;
                refreshBtn.textContent = '刷新二维码';
            }
        }
    }

    // 停止微信二维码定时刷新
    stopWechatQRRefreshTimer() {
        if (this.wechatQRRefreshTimer) {
            clearInterval(this.wechatQRRefreshTimer);
            this.wechatQRRefreshTimer = null;
            console.log('⏹️ 停止微信二维码定时刷新');
        }
    }

    // 初始化欢迎页面
    async initializeWelcomePage() {
        try {
            console.log('🔄 初始化欢迎页面...');
            
            // 确保API客户端存在并初始化
            if (!window.apiClient) {
                console.log('⚠️ API客户端不存在，创建新实例...');
                if (typeof window.ApiClient === 'function') {
                    window.apiClient = new window.ApiClient();
                } else {
                    throw new Error('ApiClient构造函数不可用');
                }
            }
            
            // 初始化API客户端
            if (!window.apiClient.initialized) {
                console.log('🔄 初始化API客户端...');
                await window.apiClient.initialize();
                console.log('✅ API客户端初始化完成');
            }
            
            // 获取并保存设备MAC地址
            await this.getMacAddress();
            
            // 设备认证（如果尚未认证）
            if (!window.apiClient.token) {
                console.log('🔐 执行设备认证...');
                const deviceId = this.macAddress ? this.macAddress.replace(/:/g, '') : null;
                if (deviceId) {
                    const authResponse = await window.apiClient.authenticateDevice(deviceId, '衣等舱客户端');
                    if (authResponse.success) {
                        console.log('✅ 设备认证成功');
                    } else {
                        throw new Error(authResponse.error || '设备认证失败');
                    }
                } else {
                    console.warn('⚠️ 无法获取设备ID，跳过设备认证');
                }
            }
            
            // 生成微信二维码（如果在欢迎页面）
            if (this.currentPage === 'welcome-page') {
                await this.generateWechatQRCode();
            }
            
            console.log('✅ 欢迎页面初始化完成');
        } catch (error) {
            console.error('❌ 欢迎页面初始化失败:', error);
            // 不阻断流程，继续执行
        }
    }

    // 启动微信关注状态检查定时器
    startWechatStatusCheck() {
        // 如果已经有定时器在运行，先停止它
        this.stopWechatStatusCheck();
        
        // 只有在有场景值的情况下才启动检查
        if (this.qrSceneStr) {
            console.log('🔄 启动微信关注状态检查定时器，场景值:', this.qrSceneStr);
            
            // 每5秒检查一次微信关注状态
            this.wechatStatusCheckTimer = setInterval(async () => {
                try {
                    // 确保API客户端存在并初始化
                    if (!window.apiClient) {
                        console.warn('⚠️ API客户端不存在，无法检查微信关注状态');
                        return;
                    }
                    
                    if (!window.apiClient.initialized) {
                        console.log('🔄 API客户端尚未初始化，执行初始化...');
                        await window.apiClient.initialize();
                    }
                    
                    // 检查微信关注状态
                    const statusResponse = await window.apiClient.checkWechatStatus(this.qrSceneStr);
                    
                    if (statusResponse.success) {
                        console.log('📊 微信关注状态检查结果:', statusResponse.data);
                        
                        // 如果用户已关注且有openid
                        if (statusResponse.data.subscribed && statusResponse.data.openid) {
                            console.log('✅ 用户已关注公众号，openid:', statusResponse.data.openid);
                            
                            // 保存用户信息
                            this.userProfile.openid = statusResponse.data.openid;
                            
                            // 停止定时器
                            this.stopWechatStatusCheck();
                            
                            // 跳转到拍照页面
                            await this.setPage('profile-page');
                        } else {
                            console.log('ℹ️ 用户尚未关注公众号，继续等待...');
                        }
                    } else {
                        console.warn('⚠️ 检查微信关注状态失败:', statusResponse.error);
                    }
                } catch (error) {
                    console.error('❌ 检查微信关注状态时发生错误:', error);
                }
            }, 5000); // 每5秒检查一次
        } else {
            console.warn('⚠️ 无场景值，无法启动微信关注状态检查');
        }
    }

    // 停止微信关注状态检查定时器
    stopWechatStatusCheck() {
        if (this.wechatStatusCheckTimer) {
            clearInterval(this.wechatStatusCheckTimer);
            this.wechatStatusCheckTimer = null;
            console.log('⏹️ 停止微信关注状态检查定时器');
        }
    }

    // 获取设备MAC地址
    async getMacAddress() {
        try {
            // 尝试通过Electron IPC从主进程获取真实的MAC地址
            if (typeof window !== 'undefined' && window.require) {
                try {
                    const { ipcRenderer } = window.require('electron');
                    if (ipcRenderer) {
                        const macAddress = await ipcRenderer.invoke('get-mac-address');
                        if (macAddress && macAddress !== '无法获取MAC地址' && macAddress !== '获取失败: undefined') {
                            this.macAddress = macAddress;
                            // 保存到localStorage以备后续使用
                            localStorage.setItem('device-mac-address', macAddress);
                            console.log('✅ 通过IPC获取真实MAC地址:', this.macAddress);
                            return;
                        }
                    }
                } catch (ipcError) {
                    console.warn('⚠️ 通过IPC获取MAC地址失败:', ipcError.message);
                }
            }
            
            // 尝试通过API客户端获取MAC地址
            if (window.apiClient && typeof window.apiClient.getMacAddress === 'function') {
                const macResponse = await window.apiClient.getMacAddress();
                if (macResponse.success && macResponse.macAddress) {
                    this.macAddress = macResponse.macAddress;
                    console.log('✅ 通过API客户端获取MAC地址:', this.macAddress);
                    return;
                }
            }
            
            // 如果API客户端不可用或获取失败，尝试其他方式
            console.log('⚠️ 无法通过API客户端获取MAC地址，尝试其他方式...');
            
            // 方式1: 从localStorage读取（开发测试用）
            const savedMac = localStorage.getItem('device-mac-address');
            if (savedMac) {
                this.macAddress = savedMac;
                console.log('✅ 从localStorage读取MAC地址:', this.macAddress);
                return;
            }
            
            // 方式2: 生成一个随机的设备ID（仅用于开发测试）
            if (this.isDevelopment) {
                const randomMac = 'DE:VE:LO:PM:AC:' + Math.random().toString(16).substr(2, 6).toUpperCase();
                this.macAddress = randomMac;
                localStorage.setItem('device-mac-address', randomMac);
                console.log('🔧 开发模式：生成随机MAC地址:', this.macAddress);
                return;
            }
            
            console.warn('⚠️ 无法获取设备MAC地址');
        } catch (error) {
            console.error('❌ 获取MAC地址失败:', error);
        }
    }

    // 显示离线模式二维码
    showOfflineQRCode() {
        try {
            // 在页面上显示占位符二维码
            const qrImg = document.getElementById('wechat-qr-image');
            if (qrImg) {
                // 创建一个占位符二维码图像
                qrImg.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzMzMyIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSI+5byg5bCP5LiK5YWI55qE5Lq6PC90ZXh0Pjwvc3ZnPg==';
                console.log('✅ 显示离线模式占位符二维码');
            }
            
            // 显示离线模式提示
            const qrStatus = document.getElementById('qr-status');
            if (qrStatus) {
                qrStatus.textContent = '离线模式 - 请连接网络后重试';
                qrStatus.style.color = '#ff9800';
            }
        } catch (error) {
            console.error('❌ 显示离线二维码失败:', error);
        }
    }

    // 显示相机错误通知
    showCameraErrorNotification(error) {
        let message = '摄像头初始化失败';
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            message = '请允许访问摄像头权限';
        } else if (error.name === 'NotFoundError' || error.name === 'OverconstrainedError') {
            message = '未找到可用的摄像头设备';
        } else if (error.name === 'NotReadableError') {
            message = '摄像头设备被占用，请关闭其他使用摄像头的应用';
        } else if (error.message && error.message.includes('constraints')) {
            message = '摄像头不支持当前分辨率设置';
        }
        
        this.showError(message);
    }

    // 初始化服装选择页面
    async initializeClothingPage() {
        // 重置选择状态
        this.selectedClothing = null;
        this.selectedTopBottom = null;
        this.selectedDress = null;
        this.lastSelectionType = null;
        this.currentCategory = 'tops-bottoms';
        this.currentSubCategory = 'tops';
        this.isDressSelected = false;
        
        // 清空现有内容
        try {
            const topsGrid = document.getElementById('tops-grid');
            const bottomsGrid = document.getElementById('bottoms-grid');
            if (topsGrid) topsGrid.innerHTML = '';
            if (bottomsGrid) bottomsGrid.innerHTML = '';
        } catch (error) {}
        
        // 检查并等待API客户端初始化完成
        if (!window.apiClient) {
            console.log('⚠️ API客户端未初始化，等待初始化完成...');
            
            // 等待API客户端初始化，最多等待10秒
            let attempts = 0;
            const maxAttempts = 100; // 10秒，每100ms检查一次
            
            while (!window.apiClient && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            if (!window.apiClient) {
                console.error('❌ API客户端初始化超时');
                appState.showError('API客户端初始化失败，请刷新页面重试。');
                return;
            }
        }
        
        // 确保API客户端已初始化
        if (!window.apiClient.initialized) {
            console.log('🔄 API客户端尚未初始化，执行初始化...');
            try {
                await window.apiClient.initialize();
                console.log('✅ API客户端初始化完成');
            } catch (error) {
                console.error('❌ API客户端初始化失败:', error);
            }
        }
        
        // 检查设备认证状态
        if (!window.apiClient.token) {
            console.log('⚠️ 设备未认证，尝试进行认证...');
            try {
                // 在这里我们可以调用认证逻辑，但由于需要MAC地址，我们先跳过
                console.log('设备认证需要在应用启动时完成，请检查初始化流程');
            } catch (error) {
                console.error('设备认证失败:', error);
            }
        }
        
        // 根据用户档案设置当前性别
        this.currentGender = this.userProfile.gender;
        
        // 设置性别tab的初始状态
        this.setupGenderTabs();
        this.updateGenderTabState();
        
        this.setupCategoryTabs();
        
        // 在调用加载前显示加载提示
        try {
            const topsGrid = document.getElementById('tops-grid');
            const bottomsGrid = document.getElementById('bottoms-grid');
            if (topsGrid) topsGrid.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">⚙️ 正在加载上衣...</div>';
            if (bottomsGrid) bottomsGrid.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">⚙️ 正在加载下衣...</div>';
        } catch (error) {}
        
        // 加载服装数据（同时加载上衣与下衣）
        await this.loadClothingItems();
        this.updateCategoryNotice();
        
        // 初始化默认服装预览
        this.initializeDefaultClothingPreviews();
    }
    
    // 初始化默认服装预览
    initializeDefaultClothingPreviews() {
        // 初始化默认的上衣预览
        this.initializeClothingPreview('tops');
        
        // 初始化默认的下衣预览
        this.initializeClothingPreview('bottoms');
    }
    
    // 初始化特定类别的服装预览
    initializeClothingPreview(category) {
        // 确保defaultClothing对象存在
        if (!this.defaultClothing) {
            this.defaultClothing = {
                tops: [
                    { id: 'top1', name: '白色衬衫', image: 'public/coats/1.jpg' },
                    { id: 'top2', name: '粉色T恤', image: 'public/coats/2.jpg' },
                    { id: 'top3', name: '蓝色针织衫', image: 'public/coats/3.jpg' }
                ],
                bottoms: [
                    { id: 'bottom1', name: '牛仔裤', image: 'public/pants/9.jpg' },
                    { id: 'bottom2', name: '时尚长裤', image: 'public/pants/10.jpg' },
                    { id: 'bottom3', name: '休闲裤', image: 'public/pants/11.jpg' }
                ]
            };
        }
        
        // 获取默认服装数据
        const defaultItems = this.defaultClothing[category] || [];
        
        // 获取预览容器
        const previewContainer = document.querySelector(`.clothing-section.${category} .clothing-preview-container`);
        
        if (previewContainer && defaultItems.length > 0) {
            // 获取现有的预览项（排除选择覆盖层）
            const previewItems = Array.from(previewContainer.children).filter(el => el.classList.contains('clothing-item-preview'));
            
            // 更新现有的预览项
            previewItems.forEach((previewItem, index) => {
                if (index < defaultItems.length) {
                    const item = defaultItems[index];
                    const imagePlaceholder = previewItem.querySelector('.clothing-item-image-placeholder');
                    const nameElement = previewItem.querySelector('.clothing-item-name');
                    
                    // 更新图片，使用getImageUrl方法转换URL
                    if (imagePlaceholder) {
                        const imageUrl = this.getImageUrl(item.image);
                        imagePlaceholder.innerHTML = `<img src="${imageUrl}" alt="${item.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 15px;">`;
                    }
                    
                    // 更新名称
                    if (nameElement) {
                        nameElement.textContent = item.name;
                    }
                    
                    // 点击事件已在HTML中设置
                }
            });
        }
    }

    setupGenderTabs() {
        const genderTabs = document.querySelectorAll('.gender-tab');
        genderTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // 移除所有active状态
                genderTabs.forEach(t => t.classList.remove('active'));
                // 设置当前tab为active
                tab.classList.add('active');
                this.currentGender = tab.dataset.gender;
                
                // 重置选择状态
                this.selectedClothing = null;
                this.selectedTopBottom = null;
                this.selectedDress = null;
                this.isDressSelected = false;
                this.currentCategory = 'tops-bottoms';
                this.currentSubCategory = 'tops';
                this.updateSelectionSummary();
                this.updateCategoryNotice();
                this.updateCategoryTabsState();
                this.updateSubCategoryTabs();
                
                // 重新加载服装数据
                this.loadClothingItems();
            });
        });
    }

    setupCategoryTabs() {
        const categoryTabs = document.querySelectorAll('.tab');
        categoryTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                if (tab.classList.contains('disabled')) {
                    return; // 如果被禁用，不响应点击
                }
                
                // 移除所有active状态
                categoryTabs.forEach(t => t.classList.remove('active'));
                // 设置当前tab为active
                tab.classList.add('active');
                this.currentCategory = tab.dataset.category;
                
                // 显示/隐藏子分类tab
                this.updateSubCategoryTabs();
                
                // 重新加载服装数据
                this.loadClothingItems();
            });
        });
        
        // 设置子分类tab事件
        this.setupSubCategoryTabs();
    }

    setupSubCategoryTabs() {
        const subCategoryTabs = document.querySelectorAll('.sub-tab');
        subCategoryTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // 移除所有active状态
                subCategoryTabs.forEach(t => t.classList.remove('active'));
                // 设置当前tab为active
                tab.classList.add('active');
                this.currentSubCategory = tab.dataset.subcategory;
                
                // 重新加载服装数据
                this.loadClothingItems();
            });
        });
    }

    updateSubCategoryTabs() {
        const subCategoryTabs = document.getElementById('sub-category-tabs');
        if (subCategoryTabs) {
        if (this.currentCategory === 'tops-bottoms') {
            subCategoryTabs.style.display = 'block';
            // 设置默认子分类
            if (!this.currentSubCategory) {
                this.currentSubCategory = 'tops';
            }
        } else {
            subCategoryTabs.style.display = 'none';
            this.currentSubCategory = null;
            }
        }
    }

    updateCategoryNotice() {
        const notice = document.getElementById('category-notice');
        if (notice) {
        if (this.isDressSelected) {
            notice.style.display = 'block';
        } else {
            notice.style.display = 'none';
            }
        }
    }

    // 添加性别切换功能
    switchGender(gender) {
        // 更新当前性别
        this.currentGender = gender;
        
        // 更新tab样式
        const genderTabs = document.querySelectorAll('.gender-tab');
        genderTabs.forEach(tab => {
            if (tab.dataset.gender === gender) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        
        // 重置选择状态
        this.selectedClothing = null;
        this.selectedTopBottom = null;
        this.selectedDress = null;
        this.isDressSelected = false;
        this.currentCategory = 'tops-bottoms';
        this.currentSubCategory = 'tops';
        this.updateSelectionSummary();
        this.updateCategoryNotice();
        this.updateCategoryTabsState();
        this.updateSubCategoryTabs();
        
        // 重新加载服装数据
        this.loadClothingItems();
        
        // 更新默认服装预览
        this.initializeDefaultClothingPreviews();
        
        console.log(`切换到${gender === 'male' ? '男装' : '女装'}`);
    }

    updateCategoryTabsState() {
        const topsBottomsTab = document.querySelector('.tab[data-category="tops-bottoms"]');
        const dressesTab = document.querySelector('.tab[data-category="dresses"]');
        
        // 不再禁用任一tab，始终可切换；仅展示上应用文案
        if (topsBottomsTab) {
        topsBottomsTab.classList.remove('disabled');
        }
        if (dressesTab) {
        dressesTab.classList.remove('disabled');
        }
    }

    updateGenderTabState() {
        // 更新性别tab的active状态
        document.querySelectorAll('.gender-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.gender === this.currentGender) {
                tab.classList.add('active');
            }
        });
    }

    // 获取当前应该使用的网格元素
    getCurrentGrid() {
        const activeCategory = this.currentCategory;
        
        // 根据当前分类选择正确的网格元素
        let gridId = 'tops-grid';
        if (activeCategory === 'dresses') {
            gridId = 'tops-grid'; // 裙子也使用上衣网格
        } else if (activeCategory === 'tops-bottoms') {
            gridId = this.currentSubCategory === 'tops' ? 'tops-grid' : 'bottoms-grid';
        }
        
        const grid = document.getElementById(gridId);
        if (!grid) {
            console.error('❌ 找不到网格元素:', gridId);
            throw new Error(`找不到网格元素: ${gridId}`);
        }
        return grid;
    }

    async loadClothingItems() {
        const activeCategory = this.currentCategory;
        const activeGender = this.currentGender;
        
        // 如果是上衣+下衣类别，则同时加载两个网格
        if (activeCategory === 'tops-bottoms') {
            return await this.loadTopAndBottoms(activeGender);
        }
        
        const grid = this.getCurrentGrid();
        grid.innerHTML = '';

        try {
            console.log('👕 开始从API服务器加载服装数据:', {
                category: activeCategory,
                gender: activeGender,
                subCategory: this.currentSubCategory,
                hasApiClient: !!window.apiClient,
                hasToken: window.apiClient?.token ? '有token' : '无token'
            });
            
            // 检查API客户端状态
            if (!window.apiClient) {
                throw new Error('API客户端未初始化，请检查 api-client.js 是否正确加载');
            }
            
            if (!window.apiClient.token) {
                throw new Error('设备认证失败，无法获取服装数据。请检查API服务器连接状态');
            }
            
            // 从 API Server 获取数据
            let itemsToShow = [];
            
            try {
                console.log('🔍 尝试从API服务器获取分类数据...');
                const categories = await window.apiClient.getClothingCategories();
                console.log('📂 获取到分类数据:', categories);
                
                const genderCategory = categories.data.find(cat => 
                    cat.name === (activeGender === 'male' ? '男装' : '女装')
                );
                console.log('👤 查找性别分类:', {
                    looking: activeGender === 'male' ? '男装' : '女装',
                    found: !!genderCategory,
                    available: categories.data.map(cat => cat.name)
                });
                
                if (!genderCategory) {
                    throw new Error(`未找到对应的性别分类: ${activeGender === 'male' ? '男装' : '女装'}`);
                }
                
                let subCategoryId = null;
                
                if (activeCategory === 'tops-bottoms' && this.currentSubCategory) {
                    // 查找对应的子分类
                    const subCategoryName = this.currentSubCategory === 'tops' ? '外套' : '裤子';
                    const subCategory = genderCategory.children.find(child => 
                        child.name === subCategoryName
                    );
                    subCategoryId = subCategory ? subCategory.id : null;
                    console.log('🔍 查找子分类:', {
                        looking: subCategoryName,
                        found: !!subCategory,
                        available: genderCategory.children.map(child => child.name),
                        subCategoryId
                    });
                } else if (activeCategory === 'dresses') {
                    // 查找裙子子分类
                    const subCategory = genderCategory.children.find(child => 
                        child.name === '连衣裙' || child.name === '裙子'
                    );
                    subCategoryId = subCategory ? subCategory.id : null;
                    console.log('👗 查找裙子分类:', {
                        looking: ['连衣裙', '裙子'],
                        found: !!subCategory,
                        available: genderCategory.children.map(child => child.name),
                        subCategoryId
                    });
                }
                
                if (!subCategoryId) {
                    throw new Error(`未找到对应的子分类ID`);
                }
                
                console.log('👔 获取分类服装数据:', subCategoryId);
                const clothesResponse = await window.apiClient.getClothingByCategory(subCategoryId);
                console.log('📦 获取到服装数据:', clothesResponse);
                
                if (!clothesResponse.success || !clothesResponse.data.clothes) {
                    throw new Error('API服务器返回的服装数据格式错误');
                }
                
                itemsToShow = clothesResponse.data.clothes.map(item => ({
                    id: item.id,
                    name: item.name,
                    image: this.getImageUrl(item.imageUrl), // 使用辅助方法转换图片URL
                    description: item.description,
                    prompt: item.prompt,
                    purchaseUrl: item.purchaseUrl
                }));
                console.log('✅ 映射后的服装数据:', itemsToShow.length, '件');
                
            } catch (apiError) {
                console.error('❌ API服务器数据获取失败:', apiError);
                throw new Error(`API服务器数据获取失败: ${apiError.message}`);
            }
            
            // 显示服装数据
            if (itemsToShow.length === 0) {
                this.showNoDataMessage();
            } else {
                itemsToShow.forEach(item => {
                    const itemEl = document.createElement('div');
                    itemEl.className = 'clothing-item';
                    itemEl.dataset.id = item.id;
                    itemEl.innerHTML = `
                        <img src="${item.image}" alt="${item.name}">
                        <div class="label">${item.name}</div>
                    `;
                    itemEl.onclick = () => this.selectClothing(item);
                    
                    // 检查是否已选中
                    if (this.isItemSelected(item)) {
                        itemEl.classList.add('selected');
                    }
                    
                    grid.appendChild(itemEl);
                });
                console.log('✅ 服装数据渲染完成');
            }
            
        } catch (error) {
            console.error('❌ 加载服装数据失败:', error);
            this.showApiErrorMessage(error.message);
        }
    }

    // 同时加载上衣和下衣两个网格，根据当前性别
    async loadTopAndBottoms(activeGender) {
        try {
            // 检查API客户端状态
            if (!window.apiClient) {
                throw new Error('API客户端未初始化，请检查 api-client.js 是否正确加载');
            }
            if (!window.apiClient.token) {
                throw new Error('设备认证失败，无法获取服装数据。请检查API服务器连接状态');
            }
            const topsGrid = document.getElementById('tops-grid');
            const bottomsGrid = document.getElementById('bottoms-grid');
            if (topsGrid) topsGrid.innerHTML = '';
            if (bottomsGrid) bottomsGrid.innerHTML = '';

            // 获取分类树
            const categories = await window.apiClient.getClothingCategories();
            const genderCategory = categories.data.find(cat => cat.name === (activeGender === 'male' ? '男装' : '女装'));
            if (!genderCategory) throw new Error('未找到性别分类');
            
            // 根据性别查找不同的分类
            let topsIds = [], bottomsId = null;
            if (activeGender === 'female') {
                // 女性：上衣包括外套和裙子，下衣包括裤子
                const jacketCat = genderCategory.children.find(child => child.name === '外套');
                const dressCat = genderCategory.children.find(child => child.name === '裙子');
                const pantsCat = genderCategory.children.find(child => child.name === '裤子');
                
                console.log('🔍 女性分类查找结果:', {
                    jacketCat: jacketCat ? { id: jacketCat.id, name: jacketCat.name } : null,
                    dressCat: dressCat ? { id: dressCat.id, name: dressCat.name } : null,
                    pantsCat: pantsCat ? { id: pantsCat.id, name: pantsCat.name } : null,
                    allChildren: genderCategory.children.map(child => ({ id: child.id, name: child.name }))
                });
                
                if (jacketCat) topsIds.push(jacketCat.id);
                if (dressCat) topsIds.push(dressCat.id);
                bottomsId = pantsCat ? pantsCat.id : null;
            } else {
                // 男性：上衣是外套，下衣是裤子
                const jacketCat = genderCategory.children.find(child => child.name === '外套');
                const pantsCat = genderCategory.children.find(child => child.name === '裤子');
                
                if (jacketCat) topsIds.push(jacketCat.id);
                bottomsId = pantsCat ? pantsCat.id : null;
            }

            // 并行获取上衣列表（可能包含多个分类）和下衣列表
            const topsPromises = topsIds.map(id => window.apiClient.getClothingByCategory(id));
            const bottomsPromise = bottomsId ? window.apiClient.getClothingByCategory(bottomsId) : Promise.resolve({ success: true, data: { clothes: [] } });
            
            const [topsResponses, bottomsResp] = await Promise.all([
                Promise.all(topsPromises),
                bottomsPromise
            ]);

            // 合并所有上衣分类的服装
            const allTopsItems = [];
            console.log('🔍 开始合并上衣数据，响应数量:', topsResponses.length);
            topsResponses.forEach((response, index) => {
                console.log(`📦 处理第${index + 1}个响应:`, {
                    success: response.success,
                    hasData: !!response.data,
                    clothesCount: response.data?.clothes?.length || 0,
                    categoryId: topsIds[index]
                });
                if (response.success && response.data?.clothes) {
                    console.log(`✅ 添加${response.data.clothes.length}件服装到上衣列表`);
                    allTopsItems.push(...response.data.clothes);
                } else {
                    console.log(`❌ 跳过无效响应:`, response);
                }
            });
            console.log('📊 合并后的上衣总数:', allTopsItems.length);
            
            const topsItems = allTopsItems.map(item => ({
                id: item.id,
                name: item.name,
                image: this.getImageUrl(item.imageUrl),
                description: item.description,
                prompt: item.prompt,
                purchaseUrl: item.purchaseUrl
            }));
            const bottomsItems = (bottomsResp.success && bottomsResp.data?.clothes ? bottomsResp.data.clothes : []).map(item => ({
                id: item.id,
                name: item.name,
                image: this.getImageUrl(item.imageUrl),
                description: item.description,
                prompt: item.prompt,
                purchaseUrl: item.purchaseUrl
            }));

            // 渲染两个网格
            const renderGrid = (items, gridEl, subcategory) => {
                if (!gridEl) return;
                if (items.length === 0) {
                    gridEl.innerHTML = '<div style="text-align:center; padding: 20px; color:#666;">暂无数据</div>';
                    return;
                }
                items.forEach(item => {
                    const el = document.createElement('div');
                    el.className = 'clothing-item';
                    el.dataset.id = item.id;
                    el.innerHTML = `
                        <img src="${item.image}" alt="${item.name}">
                        <div class="label">${item.name}</div>
                    `;
                    el.onclick = () => { this.currentSubCategory = subcategory; this.selectClothing(item); };
                    if (this.isItemSelected(item)) el.classList.add('selected');
                    gridEl.appendChild(el);
                });
            };

            renderGrid(topsItems, topsGrid, 'tops');
            renderGrid(bottomsItems, bottomsGrid, 'bottoms');

            console.log('✅ 上衣与下衣数据渲染完成', { tops: topsItems.length, bottoms: bottomsItems.length });
        } catch (error) {
            console.error('❌ 同时加载上衣/下衣失败:', error);
            // 失败时单独在两个grid输出错误信息（如果存在）
            const topsGrid = document.getElementById('tops-grid');
            const bottomsGrid = document.getElementById('bottoms-grid');
            const errorHtml = `<div style="text-align:center; padding: 20px; color:#b00;">加载失败：${error.message}</div>`;
            if (topsGrid) topsGrid.innerHTML = errorHtml;
            if (bottomsGrid) bottomsGrid.innerHTML = errorHtml;
        }
    }

    isItemSelected(item) {
        if (this.selectedDress && this.selectedDress.item.id === item.id) {
            return true;
        }
        if (this.selectedTopBottom) {
            if (this.selectedTopBottom.tops && this.selectedTopBottom.tops.id === item.id) {
                return true;
            }
            if (this.selectedTopBottom.bottoms && this.selectedTopBottom.bottoms.id === item.id) {
                return true;
            }
        }
        return false;
    }

    // 获取选中的服装信息
    getSelectedClothingInfo() {
        if (this.selectedDress) {
            return {
                name: this.selectedDress.item.name,
                category: '连衣裙',
                imageUrl: this.selectedDress.item.imageUrl,
                purchaseUrl: this.selectedDress.item.purchaseUrl
            };
        } else if (this.selectedTopBottom) {
            const tops = this.selectedTopBottom.tops;
            const bottoms = this.selectedTopBottom.bottoms;
            
            if (tops && bottoms) {
                return {
                    name: `${tops.name} + ${bottoms.name}`,
                    category: '上衣+下衣',
                    imageUrl: tops.imageUrl, // 使用上衣图片
                    purchaseUrl: tops.purchaseUrl || bottoms.purchaseUrl
                };
            } else if (tops) {
                return {
                    name: tops.name,
                    category: '上衣',
                    imageUrl: tops.imageUrl,
                    purchaseUrl: tops.purchaseUrl
                };
            } else if (bottoms) {
                return {
                    name: bottoms.name,
                    category: '下衣',
                    imageUrl: bottoms.imageUrl,
                    purchaseUrl: bottoms.purchaseUrl
                };
            }
        }
        
        return {
            name: '未选择服装',
            category: '',
            imageUrl: '',
            purchaseUrl: ''
        };
    }

    showApiErrorMessage(errorMessage = 'API服务器连接失败') {
        // 在服装网格中显示错误提示
        try {
            const grid = this.getCurrentGrid();
            const errorHtml = `
                <div class="api-error-message" style="
                    grid-column: 1 / -1;
                    background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
                    border: 1px solid #dc3545;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 10px;
                    text-align: center;
                    color: #721c24;
                    box-shadow: 0 2px 8px rgba(220,53,69,0.2);
                ">
                    <div style="font-size: 1.2em; font-weight: bold; margin-bottom: 10px;">
                        🚫 无法连接到服务器
                    </div>
                    <div style="margin-bottom: 15px; line-height: 1.5;">
                        ${errorMessage}<br>
                        请检查网络连接和API服务器状态后重试。
                    </div>
                    <div style="font-size: 0.9em; color: #6c757d;">
                        解决方案：1. 检查配置页面中的服务器地址 | 2. 确保API服务器正在运行 | 3. 重启应用
                    </div>
                </div>
            `;
            grid.innerHTML = errorHtml;
        } catch (error) {
            console.warn('⚠️ 无法显示错误消息:', error.message);
        }
    }

    showNoDataMessage() {
        // 显示无数据提示
        try {
            const grid = this.getCurrentGrid();
            const noDataHtml = `
                <div class="no-data-message" style="
                    grid-column: 1 / -1;
                    background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
                    border: 1px solid #ffc107;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 10px;
                    text-align: center;
                    color: #856404;
                    box-shadow: 0 2px 8px rgba(255,193,7,0.2);
                ">
                    <div style="font-size: 1.2em; font-weight: bold; margin-bottom: 10px;">
                        📦 暂无服装数据
                    </div>
                    <div style="margin-bottom: 15px; line-height: 1.5;">
                        当前分类下暂无可用的服装数据。<br>
                        请尝试切换其他分类或联系管理员添加服装数据。
                    </div>
                </div>
            `;
            grid.innerHTML = noDataHtml;
        } catch (error) {
            console.warn('⚠️ 无法显示无数据消息:', error.message);
        }
    }

    // 辅助方法：将相对路径转换为完整的HTTP URL
    getImageUrl(relativePath) {
        if (!relativePath) {
            return '';
        }
        
        // 如果已经是完整的URL（以http或https开头），直接返回
        if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
            return relativePath;
        }
        
        // 如果以斜杠开头，去掉斜杠
        const cleanPath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
        
        // 根据项目记忆中的规范，为相对路径添加COS_FOLDER前缀
        // COS_FOLDER的实际值是 'clothinges/'
        const COS_FOLDER = 'clothinges/';
        // 使用CDN域名（clothing.0086studios.xyz）构建完整的URL
        // 注意：API服务器域名是 clothing-api.0086studios.xyz，不要混淆
        return `https://clothing.0086studios.xyz/${COS_FOLDER}${cleanPath}`;
    }

    selectClothing(item) {
        // 选择来源：根据当前分类判断
        const isDress = this.currentCategory === 'dresses';
        const isTopBottom = this.currentCategory === 'tops-bottoms';
        
        if (isDress) {
            // 点击同一条目切换选中/取消
            if (this.selectedDress && this.selectedDress.item.id === item.id) {
                this.selectedDress = null;
                this.isDressSelected = false;
                this.lastSelectionType = null;
            } else {
            // 选择裙子时，清除所有上衣/下衣选择
            this.selectedDress = { item };
            this.selectedTopBottom = null;
            this.lastSelectionType = 'dress';
            this.isDressSelected = true;
            }
        } else if (isTopBottom) {
            // 选择上衣/下衣时，清除裙子选择
            this.selectedDress = null;
            this.isDressSelected = false;
            
            // 初始化selectedTopBottom对象
            if (!this.selectedTopBottom) {
                this.selectedTopBottom = { tops: null, bottoms: null };
            }
            
            // 根据子分类设置对应的选择，若再次点击同一条目则取消选中
            if (this.currentSubCategory === 'tops') {
                if (this.selectedTopBottom.tops && this.selectedTopBottom.tops.id === item.id) {
                    this.selectedTopBottom.tops = null;
                    this.lastSelectionType = null;
                } else {
                this.selectedTopBottom.tops = item;
                    this.lastSelectionType = 'topBottom';
                }
            } else if (this.currentSubCategory === 'bottoms') {
                if (this.selectedTopBottom.bottoms && this.selectedTopBottom.bottoms.id === item.id) {
                    this.selectedTopBottom.bottoms = null;
                    this.lastSelectionType = null;
                } else {
                this.selectedTopBottom.bottoms = item;
            this.lastSelectionType = 'topBottom';
                }
            }
        }

        // 更新 UI 选中样式（根据当前可见列表）
        document.querySelectorAll('.clothing-item').forEach(el => el.classList.remove('selected'));
        // 根据当前状态，给仍然选中的条目加上selected样式
        if (this.selectedDress) {
            const el = document.querySelector(`.clothing-item[data-id="${this.selectedDress.item.id}"]`);
            if (el) el.classList.add('selected');
        }
        if (this.selectedTopBottom) {
            if (this.selectedTopBottom.tops) {
                const elTop = document.querySelector(`.clothing-item[data-id="${this.selectedTopBottom.tops.id}"]`);
                if (elTop) elTop.classList.add('selected');
            }
            if (this.selectedTopBottom.bottoms) {
                const elBottom = document.querySelector(`.clothing-item[data-id="${this.selectedTopBottom.bottoms.id}"]`);
                if (elBottom) elBottom.classList.add('selected');
            }
        }

        // 更新提示与摘要
        this.updateCategoryTabsState();
        this.updateCategoryNotice();
        this.updateSelectionSummary();
    }

    updateSelectionSummary() {
        const selectedClothingEl = document.getElementById('selected-clothing');
        const proceedBtn = document.getElementById('proceed-btn');
        // 容器或按钮在某些早期时机可能尚未渲染，做空值保护
        if (!selectedClothingEl && !proceedBtn) {
            return;
        }
        
        let hasSelection = false;
        let summaryHTML = '';
        
        if (this.selectedDress) {
            // 显示裙子选择
            hasSelection = true;
            summaryHTML += `
                <div class="selected-item-display">
                    <img src="${this.getImageUrl(this.selectedDress.item.image)}" alt="${this.selectedDress.item.name}" />
                    <span>${this.selectedDress.item.name}</span>
                    <span class="item-type">裙子</span>
                </div>
            `;
        } else if (this.selectedTopBottom) {
            // 显示上衣/下衣选择
            if (this.selectedTopBottom.tops) {
                hasSelection = true;
                summaryHTML += `
                    <div class="selected-item-display">
                        <img src="${this.getImageUrl(this.selectedTopBottom.tops.image)}" alt="${this.selectedTopBottom.tops.name}" />
                        <span>${this.selectedTopBottom.tops.name}</span>
                        <span class="item-type">上衣</span>
                    </div>
                `;
            }
            if (this.selectedTopBottom.bottoms) {
                hasSelection = true;
                summaryHTML += `
                    <div class="selected-item-display">
                        <img src="${this.getImageUrl(this.selectedTopBottom.bottoms.image)}" alt="${this.selectedTopBottom.bottoms.name}" />
                        <span>${this.selectedTopBottom.bottoms.name}</span>
                        <span class="item-type">下衣</span>
                    </div>
                `;
            }
        }
        
        if (selectedClothingEl) {
        if (hasSelection) {
            selectedClothingEl.innerHTML = `
                <div class="selected-items-container">
                    <div class="selected-items-title">已选择的服装：</div>
                    <div class="selected-items-list">
                        ${summaryHTML}
                    </div>
                </div>
            `;
        } else {
            selectedClothingEl.innerHTML = '<span>尚未选择服装</span>';
            }
        }
        if (proceedBtn) {
            proceedBtn.disabled = !hasSelection;
        }
    }

    async startFittingProcess() {
        return new Promise(async (resolve, reject) => {
        // 检查是否有照片和服装选择
        if (!this.selectedDress && !this.selectedTopBottom) {
            this.showError('请确保已上传照片并选择服装');
                reject(new Error('未选择服装'));
            return;
        }

        this.showLoading('正在生成试衣效果...', '这可能需要几分钟时间，请耐心等待');

        try {
            // 确保API客户端已初始化
            if (!window.apiClient || !window.apiClient.token) {
                throw new Error('API客户端未初始化或未认证，请先完成设备认证');
            }
            
            console.log('🌐 使用 API-server 进行试穿任务管理');
            
            // 获取选中的衣服 ID
            let topClothesId = null;
            let bottomClothesId = null;
            
            if (this.selectedDress) {
                // 选择了裙子，作为上衣处理
                topClothesId = this.selectedDress.item.id;
            } else if (this.selectedTopBottom) {
                if (this.selectedTopBottom.tops) {
                    topClothesId = this.selectedTopBottom.tops.id;
                }
                if (this.selectedTopBottom.bottoms) {
                    bottomClothesId = this.selectedTopBottom.bottoms.id;
                }
            }

            if (!topClothesId) {
                throw new Error('未选择有效的上衣或裙子');
            }

            // 检查是否有任务ID（在上传照片时已创建任务）
            if (!this.currentTaskId) {
                throw new Error('未找到任务ID，请重新上传照片');
            }

            console.log('🚀 启动试穿任务:', {
                taskId: this.currentTaskId,
                sceneStr: this.qrSceneStr,
                topClothesId: topClothesId,
                bottomClothesId: bottomClothesId
            });

            // 启动试穿任务 - 通过API-server，传递sceneStr参数
            const taskResponse = await window.apiClient.startTryonTask(
                this.currentTaskId,
                topClothesId,
                bottomClothesId,
                this.qrSceneStr
            );

            if (!taskResponse.success) {
                throw new Error(taskResponse.error || '启动试穿任务失败');
            }

            this.currentTask = {
                taskId: this.currentTaskId,
                status: taskResponse.data.status
            };

            console.log('✅ API Server 试穿任务启动成功:', this.currentTask);

                // 设置任务完成回调
                this.onTaskComplete = (success, resultUrl) => {
                    if (success) {
                        console.log('✅ 试衣任务完成，resolve Promise');
                        resolve(resultUrl);
                    } else {
                        console.log('❌ 试衣任务失败，reject Promise');
                        reject(new Error('试衣任务失败'));
                    }
                };

                // 开始轮询任务状态（启动前清理旧定时器）
                this.stopTaskPolling();
            this.pollApiServerTaskStatus();

        } catch (error) {
            console.error('试衣流程错误:', error);
            this.hideLoading();
            this.showError('试衣生成失败: ' + error.message);
                reject(error);
        }
        });
    }

    // 使用新的 API Server 任务管理
    async startApiServerTask() {
        // 此方法已合并到startFittingProcess中
        return await this.startFittingProcess();
    }

    // 【已弃用】原有的 RunningHub 直接调用流程
    // 现在强制使用 API-server，不再支持直接调用 RunningHub
    async startLegacyRunningHubTask() {
        throw new Error('直接调用 RunningHub 的模式已被禁用，请使用 API-server 模式');
    }

    // 轮询 API Server 任务状态
    async pollApiServerTaskStatus() {
        const maxAttempts = 60; // 最多检查5分钟（每5秒一次）
        let attempts = 0;

        console.log('🔄 开始轮询 API Server 任务状态，任务ID:', this.currentTask.taskId);

        // 使用 setInterval 而不是递归
        this.taskPollTimer = setInterval(async () => {
            attempts++;
            console.log(`🔄 第 ${attempts} 次轮询任务状态...`, {
                currentPage: this.currentPage,
                taskId: this.currentTask?.taskId,
                attempts: attempts,
                maxAttempts: maxAttempts
            });
            
            // 如果已经离开结果流程，停止轮询
            if (this.currentPage === 'welcome-page' || this.currentPage === 'scan-to-get-page') {
                console.log('🚫 已离开结果流程，停止任务轮询', {
                    currentPage: this.currentPage,
                    attempts: attempts
                });
                this.stopTaskPolling();
                return;
            }
            
            // 检查是否超过最大尝试次数
            if (attempts >= maxAttempts) {
                console.error('⏰ 轮询超时，已达到最大尝试次数');
                this.stopTaskPolling();
                this.hideLoading();
                this.showError('任务超时，请稍后重试');
                return;
            }
            
            try {
                const statusResponse = await window.apiClient.getTaskStatus(this.currentTask.taskId);
                
                if (statusResponse.success) {
                    const taskData = statusResponse.data;
                    this.currentTask.status = taskData.status;
                    console.log(`📊 任务状态更新: ${taskData.status}`);

                    // 更新进度文本
                    const progressText = document.getElementById('progress-text');
                    if (progressText) {
                        switch(taskData.status) {
                            case 'QUEUED':
                            case 'PENDING':
                                progressText.textContent = '任务排队中...';
                                console.log('⏳ 任务排队中，等待执行...');
                                break;
                            case 'PROCESSING':
                                progressText.textContent = '正在生成试衣效果...';
                                console.log('🚀 任务正在执行中...');
                                break;
                            case 'COMPLETED':
                                progressText.textContent = '生成完成！';
                                console.log('✅ 任务执行完成');
                                
                                // 检查是否有结果URL，尝试多种可能的字段名
                                const resultUrl = taskData.resultUrl || taskData.imageUrl || taskData.image || taskData.result;
                                console.log('🔍 检查结果URL:', { 
                                    resultUrl, 
                                    hasResultUrl: !!taskData.resultUrl,
                                });
                                
                                if (resultUrl) {
                                    // 停止轮询
                                    this.stopTaskPolling();
                                    
                                    // 隐藏加载提示
                                    this.hideLoading();
                                    
                                    // 显示结果页面
                                    await this.setPage('results-page');
                                    
                                    // 显示结果图片
                                    await this.showResult(resultUrl);
                                    
                                    // 调用任务完成回调
                                    if (this.onTaskComplete) {
                                        this.onTaskComplete(true, resultUrl);
                                    }
                                }
                                break;
                            case 'FAILED':
                                progressText.textContent = '生成失败';
                                console.error('❌ 任务执行失败:', taskData.error);
                                
                                // 停止轮询
                                this.stopTaskPolling();
                                
                                // 隐藏加载提示
                                this.hideLoading();
                                
                                // 显示错误信息
                                this.showError('试衣生成失败: ' + (taskData.error || '未知错误'));
                                
                                // 调用任务完成回调
                                if (this.onTaskComplete) {
                                    this.onTaskComplete(false);
                                }
                                break;
                            default:
                                progressText.textContent = `未知状态: ${taskData.status}`;
                                console.warn('⚠️ 未知任务状态:', taskData.status);
                        }
                    }
                } else {
                    throw new Error(statusResponse.error || '获取任务状态失败');
                }
            } catch (error) {
                console.error('❌ 轮询任务状态失败:', error);
                
                // 停止轮询
                this.stopTaskPolling();
                
                // 隐藏加载提示
                this.hideLoading();
                
                // 显示错误信息
                this.showError('获取任务状态失败: ' + error.message);
                
                // 调用任务完成回调
                if (this.onTaskComplete) {
                    this.onTaskComplete(false);
                }
            }
        }, 5000); // 每5秒轮询一次
    }

    // 停止任务轮询
    stopTaskPolling() {
        if (this.taskPollTimer) {
            clearInterval(this.taskPollTimer);
            this.taskPollTimer = null;
            console.log('⏹️ 停止任务轮询');
        }
    }

    // 显示结果图片
    async showResult(imageUrl) {
        try {
            console.log('🖼️ 显示结果图片:', imageUrl);
            
            // 保存结果图片URL
            this.resultImageUrl = imageUrl;
            
            // 获取结果图片元素
            const resultImage = document.getElementById('result-image');
            if (!resultImage) {
                throw new Error('找不到结果图片元素');
            }
            
            // 设置图片源
            resultImage.src = imageUrl;
            
            // 监听图片加载完成事件
            resultImage.onload = () => {
                console.log('✅ 结果图片加载完成');
                // 调整图片容器大小
                this.adjustImageContainer();
                // 开始倒计时
                this.startCountdown();
            };
            
            // 监听图片加载失败事件
            resultImage.onerror = (error) => {
                console.error('❌ 结果图片加载失败:', error);
                this.showError('图片加载失败');
            };
        } catch (error) {
            console.error('显示结果图片失败:', error);
            this.showError('显示结果图片失败: ' + error.message);
        }
    }

    // 调整图片容器大小
    adjustImageContainer() {
        try {
            const container = document.querySelector('.result-image-container');
            const image = document.getElementById('result-image');
            
            if (container && image && image.naturalWidth && image.naturalHeight) {
                // 计算图片的宽高比
                const aspectRatio = image.naturalWidth / image.naturalHeight;
                
                // 获取容器的父元素宽度
                const parentWidth = container.parentElement.clientWidth;
                
                // 设置容器的最大宽度和高度
                const maxWidth = Math.min(parentWidth * 0.9, 600); // 最大600px或父元素的90%
                const maxHeight = window.innerHeight * 0.7; // 最大为视窗高度的70%
                
                // 根据宽高比计算合适的尺寸
                let width = maxWidth;
                let height = maxWidth / aspectRatio;
                
                // 如果计算后的高度超过最大高度，则以高度为准
                if (height > maxHeight) {
                    height = maxHeight;
                    width = maxHeight * aspectRatio;
                }
                
                // 应用尺寸
                container.style.width = `${width}px`;
                container.style.height = `${height}px`;
                
                console.log('📏 调整图片容器大小:', { width, height, aspectRatio });
            }
        } catch (error) {
            console.warn('调整图片容器大小失败:', error.message);
        }
    }

    // 开始倒计时
    startCountdown() {
        try {
            const countdownElement = document.getElementById('countdown');
            const homeButton = document.getElementById('back-to-home-btn');
            
            if (countdownElement && homeButton) {
                let countdown = 30; // 30秒倒计时
                
                // 更新倒计时显示
                const updateCountdown = () => {
                    countdownElement.textContent = countdown;
                };
                
                // 初始化显示
                updateCountdown();
                
                // 每秒更新倒计时
                const countdownInterval = setInterval(() => {
                    countdown--;
                    updateCountdown();
                    
                    // 倒计时结束
                    if (countdown <= 0) {
                        clearInterval(countdownInterval);
                        // 自动返回首页
                        this.endSession();
                    }
                }, 1000);
                
                // 保存倒计时定时器ID，以便在需要时清理
                this.countdownTimer = countdownInterval;
                
                console.log('⏱️ 开始30秒倒计时');
            }
        } catch (error) {
            console.warn('开始倒计时失败:', error.message);
        }
    }

    // 清理倒计时
    clearCountdown() {
        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
            this.countdownTimer = null;
            console.log('⏹️ 清理倒计时');
        }
    }
}

// 创建全局应用状态实例
const appState = new AppState();

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 DOM内容加载完成，开始初始化应用...');
    
    try {
        // 确保API客户端存在并初始化
        if (!window.apiClient) {
            console.log('⚠️ API客户端不存在，创建新实例...');
            if (typeof window.ApiClient === 'function') {
                window.apiClient = new window.ApiClient();
            } else {
                console.error('❌ 无法创建API客户端实例（缺少构造函数）');
                // 显示错误提示
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
                        <p style="color: #6c757d; margin: 20px 0;">无法加载必要的API客户端模块</p>
                        <p style="color: #6c757d; margin: 10px 0; font-size: 0.9em;">
                            解决方案：<br>
                            1. 检查网络连接<br>
                            2. 确保 api-client.js 文件存在且可访问<br>
                            3. 重启应用
                        </p>
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
                return;
            }
        }
        
        // 初始化API客户端
        if (!window.apiClient.initialized) {
            console.log('🔄 初始化API客户端...');
            await window.apiClient.initialize();
            console.log('✅ API客户端初始化完成');
        }
        
        // 初始化应用状态
        await appState.initializeWelcomePage();
        
        // 显示欢迎页面
        await appState.setPage('welcome-page');
        
        console.log('✅ 应用初始化完成');
    } catch (error) {
        console.error('❌ 应用初始化失败:', error);
        // 显示错误提示
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
                <p style="color: #6c757d; margin: 20px 0;">${error.message}</p>
                <p style="color: #6c757d; margin: 10px 0; font-size: 0.9em;">
                    解决方案：<br>
                    1. 检查网络连接<br>
                    2. 确保服务器正常运行<br>
                    3. 重启应用
                </p>
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
});

// 监听窗口大小变化
window.addEventListener('resize', () => {
    // 调整结果图片容器大小
    if (appState.currentPage === 'results-page' && appState.resultImageUrl) {
        appState.adjustImageContainer();
    }
});

// 页面卸载前清理资源
window.addEventListener('beforeunload', () => {
    // 清理任务轮询定时器
    appState.stopTaskPolling();
    
    // 清理微信关注状态检查定时器
    appState.stopWechatStatusCheck();
    
    // 清理倒计时
    appState.clearCountdown();
    
    // 清理窗口大小调整防抖定时器
    if (appState.resizeTimer) {
        clearTimeout(appState.resizeTimer);
        appState.resizeTimer = null;
    }
    
    // 反初始化摄像头
    if (typeof deinitializeCamera === 'function') {
        deinitializeCamera();
    }
    
    console.log('🧹 页面卸载前清理资源完成');
});