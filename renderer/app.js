// 应用状态管理
class AppState {
    constructor() {
        this.currentPage = 'welcome-page';
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
        this.apiBaseUrl = 'http://localhost:4001'; // API服务器（修复为正确端口）
        this.apiServerUrl = 'http://localhost:4001'; // 新的 API Server
        this.currentGender = 'female';
        this.currentCategory = 'tops-bottoms';
        this.currentSubCategory = 'tops';
        this.isDressSelected = false;
        this.configCache = null;
        this.resultImageUrl = null; // 添加结果图片URL存储
        this.resizeTimer = null; // 添加窗口大小调整防抖定时器
        this.macAddress = null; // 设备MAC地址
        this.wechatQRCode = null; // 微信二维码信息
        this.wechatCheckInterval = null; // 微信关注状态检查定时器
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
        // 隐藏当前页面
        const currentPageEl = document.getElementById(this.currentPage);
        if (currentPageEl) {
            currentPageEl.classList.remove('active');
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
        }

        // 页面切换时的特殊处理
        await this.onPageChange(pageId);
    }

    async onPageChange(pageId) {
        switch(pageId) {
            case 'welcome-page':
                await this.initializeWelcomePage();
                break;
            case 'profile-page':
                this.initializeProfilePage();
                break;
            case 'config-page':
                loadConfigIntoForm();
                initializeDeviceInfo();
                break;
            case 'clothing-page':
                await this.initializeClothingPage();
                break;
            case 'results-page':
                this.startFittingProcess();
                // 添加窗口大小变化监听器
                window.addEventListener('resize', this.handleWindowResize.bind(this));
                break;
            case 'download-page':
                this.generateDownloadQR();
                this.startCountdown();
                break;
        }
    }

    // 初始化欢迎页面
    async initializeWelcomePage() {
        console.log('📱 初始化欢迎页面...');
        
        // 获取设备MAC地址
        await this.getMacAddress();
        
        // 生成微信二维码
        await this.generateWechatQRCode();
        
        // 开始检查微信关注状态
        this.startWechatStatusCheck();
    }

    // 获取设备MAC地址
    async getMacAddress() {
        try {
            // 在Electron环境中获取MAC地址
            if (typeof require !== 'undefined') {
                const os = require('os');
                const interfaces = os.networkInterfaces();
                
                // 查找第一个有效的MAC地址
                for (const name of Object.keys(interfaces)) {
                    for (const iface of interfaces[name]) {
                        if (!iface.internal && iface.mac && iface.mac !== '00:00:00:00:00:00') {
                            this.macAddress = iface.mac;
                            console.log('📱 获取到设备MAC地址:', this.macAddress);
                            return;
                        }
                    }
                }
            }
            
            // 如果无法获取真实MAC地址，生成一个模拟的
            this.macAddress = '00:11:22:33:44:55';
            console.log('📱 使用模拟MAC地址:', this.macAddress);
        } catch (error) {
            console.error('❌ 获取MAC地址失败:', error);
            this.macAddress = '00:11:22:33:44:55'; // 默认值
        }
    }

    // 生成微信二维码
    async generateWechatQRCode() {
        try {
            console.log('🔍 检查API客户端状态:', {
                hasApiClient: !!window.apiClient,
                initialized: window.apiClient ? window.apiClient.initialized : false
            });
            
            // 确保API客户端已初始化
            if (!window.apiClient) {
                console.log('⚠️ API客户端未初始化，等待初始化完成...');
                await window.apiClient.initialize();
            }
            
            if (!window.apiClient.initialized) {
                console.log('🔄 API客户端尚未初始化，执行初始化...');
                await window.apiClient.initialize();
                console.log('✅ API客户端初始化完成');
            }
            
            console.log('📱 生成微信关注二维码，使用MAC地址:', this.macAddress);
            
            // 调用API生成二维码
            const response = await window.apiClient.generateWechatQRCode(null, this.macAddress);
            
            if (response.success) {
                this.wechatQRCode = response.qrCode;
                
                // 更新页面上的二维码显示
                const qrImg = document.getElementById('wechat-qr-img');
                if (qrImg) {
                    qrImg.src = response.qrCode.dataURL;
                    console.log('✅ 微信二维码生成成功');
                }
            } else {
                throw new Error(response.error || '生成二维码失败');
            }
        } catch (error) {
            console.error('❌ 生成微信二维码失败:', error);
            this.showError('生成微信二维码失败: ' + error.message);
        }
    }

    // 开始体验按钮点击事件
    async function startExperience() {
        try {
            console.log('🚀 用户点击开始体验按钮');
            
            // 检查是否已经关注了公众号
            if (appState.macAddress && window.apiClient) {
                const response = await window.apiClient.checkWechatStatus(appState.macAddress, 'mac');
                
                if (response.success && response.isSubscribed) {
                    console.log('✅ 用户已关注公众号，直接跳转到个人信息页面');
                    await appState.setPage('profile-page');
                    return;
                }
            }
            
            // 如果未关注，提示用户先关注公众号
            appState.showError('请先微信扫码关注公众号后再开始体验');
        } catch (error) {
            console.error('检查微信关注状态失败:', error);
            appState.showError('检查微信关注状态失败: ' + error.message);
        }
    }

    // 打开配置页面
    function openConfigPage() {
        appState.setPage('config-page');
    }

    // 开始检查微信关注状态
    startWechatStatusCheck() {
        // 清除之前的定时器
        if (this.wechatCheckInterval) {
            clearInterval(this.wechatCheckInterval);
        }
        
        // 每3秒检查一次关注状态
        this.wechatCheckInterval = setInterval(async () => {
            try {
                if (this.macAddress && window.apiClient) {
                    const response = await window.apiClient.checkWechatStatus(this.macAddress, 'mac');
                    
                    if (response.success && response.isSubscribed) {
                        console.log('✅ 用户已关注公众号');
                        
                        // 清除定时器
                        if (this.wechatCheckInterval) {
                            clearInterval(this.wechatCheckInterval);
                            this.wechatCheckInterval = null;
                        }
                        
                        // 自动跳转到个人信息页面
                        await this.setPage('profile-page');
                    }
                }
            } catch (error) {
                console.error('检查微信关注状态失败:', error);
            }
        }, 3000);
    }

    // 停止检查微信关注状态
    stopWechatStatusCheck() {
        if (this.wechatCheckInterval) {
            clearInterval(this.wechatCheckInterval);
            this.wechatCheckInterval = null;
        }
    }

    initializeProfilePage() {
        // 停止微信状态检查
        this.stopWechatStatusCheck();
        
        // 摄像头已经在应用启动时初始化，直接启用UI
        if (cameraInitialized && cameraVideo && cameraVideo.srcObject) {
            console.log('摄像头已准备就绪，直接启用UI');
            enableCameraUI();
        } else {
            console.log('摄像头未准备就绪，等待初始化完成');
            // 等待摄像头初始化完成
            const checkCamera = setInterval(() => {
                if (cameraInitialized && cameraVideo && cameraVideo.srcObject) {
                    clearInterval(checkCamera);
                    enableCameraUI();
                }
            }, 100);
        }
    }

    async initializeClothingPage() {
        console.log('👕 初始化服装页面...');
        
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
        
        // 在调用loadClothingItems之前显示加载提示
        const grid = document.getElementById('clothing-grid');
        if (grid) {
            grid.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">⚙️ 正在加载服装数据...</div>';
        }
        
        // 加载服装数据
        await this.loadClothingItems();
        this.updateCategoryNotice();
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

    updateCategoryNotice() {
        const notice = document.getElementById('category-notice');
        if (this.isDressSelected) {
            notice.style.display = 'block';
        } else {
            notice.style.display = 'none';
        }
    }

    updateCategoryTabsState() {
        const topsBottomsTab = document.querySelector('.tab[data-category="tops-bottoms"]');
        const dressesTab = document.querySelector('.tab[data-category="dresses"]');
        
        // 不再禁用任一tab，始终可切换；仅展示上应用文案
        topsBottomsTab.classList.remove('disabled');
        dressesTab.classList.remove('disabled');
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

    async loadClothingItems() {
        const activeCategory = this.currentCategory;
        const activeGender = this.currentGender;
        
        const grid = document.getElementById('clothing-grid');
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
        const grid = document.getElementById('clothing-grid');
        if (grid) {
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
        }
    }

    showNoDataMessage() {
        // 显示无数据提示
        const grid = document.getElementById('clothing-grid');
        if (grid) {
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
        }
    }

    // 本地数据方法已移除 - 客户端只从API服务器加载数据

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
        // 使用图片CDN域名构建完整的URL
        return `https://clothing.0086studios.xyz/${COS_FOLDER}${cleanPath}`;
    }

    selectClothing(item) {
        // 选择来源：根据当前分类判断
        const isDress = this.currentCategory === 'dresses';
        const isTopBottom = this.currentCategory === 'tops-bottoms';
        
        if (isDress) {
            // 选择裙子时，清除所有上衣/下衣选择
            this.selectedDress = { item };
            this.selectedTopBottom = null;
            this.lastSelectionType = 'dress';
            this.isDressSelected = true;
        } else if (isTopBottom) {
            // 选择上衣/下衣时，清除裙子选择
            this.selectedDress = null;
            this.isDressSelected = false;
            
            // 初始化selectedTopBottom对象
            if (!this.selectedTopBottom) {
                this.selectedTopBottom = { tops: null, bottoms: null };
            }
            
            // 根据子分类设置对应的选择
            if (this.currentSubCategory === 'tops') {
                this.selectedTopBottom.tops = item;
            } else if (this.currentSubCategory === 'bottoms') {
                this.selectedTopBottom.bottoms = item;
            }
            
            this.lastSelectionType = 'topBottom';
        }

        // 更新 UI 选中样式（根据当前可见列表）
        document.querySelectorAll('.clothing-item').forEach(el => el.classList.remove('selected'));
        const itemEl = document.querySelector(`.clothing-item[data-id="${item.id}"]`);
        if (itemEl) itemEl.classList.add('selected');

        // 更新提示与摘要
        this.updateCategoryTabsState();
        this.updateCategoryNotice();
        this.updateSelectionSummary();
    }

    updateSelectionSummary() {
        const selectedClothingEl = document.getElementById('selected-clothing');
        const proceedBtn = document.getElementById('proceed-btn');
        
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
        
        if (hasSelection) {
            selectedClothingEl.innerHTML = `
                <div class="selected-items-container">
                    <div class="selected-items-title">已选择的服装：</div>
                    <div class="selected-items-list">
                        ${summaryHTML}
                    </div>
                </div>
            `;
            proceedBtn.disabled = false;
        } else {
            selectedClothingEl.innerHTML = '<span>尚未选择服装</span>';
            proceedBtn.disabled = true;
        }
    }

    async startFittingProcess() {
        // 检查是否有照片和服装选择
        if ((!this.userProfile.fullBodyShotNameInRH && !this.currentTaskId) || (!this.selectedDress && !this.selectedTopBottom)) {
            this.showError('请确保已上传照片并选择服装');
            return;
        }

        this.showLoading('正在生成试衣效果...', '这可能需要几分钟时间，请耐心等待');

        try {
            // 强制使用 API-server 进行试穿任务管理
            if (!window.apiClient || !window.apiClient.token) {
                throw new Error('API客户端未初始化或未认证，请先完成设备认证');
            }
            
            if (!this.currentTaskId) {
                throw new Error('未找到任务ID，请重新上传照片');
            }
            
            console.log('🌐 使用 API-server 进行试穿任务管理（强制模式）');
            await this.startApiServerTask();

        } catch (error) {
            console.error('试衣流程错误:', error);
            this.hideLoading();
            this.showError('试衣生成失败: ' + error.message);
        }
    }

    // 使用新的 API Server 任务管理
    async startApiServerTask() {
        try {
            // 获取选中的衣服 ID列表
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

            // 检查是否有任务ID
            if (!this.currentTaskId) {
                throw new Error('未找到任务ID，请重新上传照片');
            }

            console.log('🚀 通过API-server启动试穿任务:', {
                taskId: this.currentTaskId,
                topClothesId: topClothesId,
                bottomClothesId: bottomClothesId
            });

            // 启动试穿任务 - 通过API-server
            const taskResponse = await window.apiClient.startTryonTask(
                this.currentTaskId,
                topClothesId,
                bottomClothesId
            );

            if (!taskResponse.success) {
                throw new Error(taskResponse.error || '启动试穿任务失败');
            }

            this.currentTask = {
                taskId: this.currentTaskId,
                status: taskResponse.data.status,
                runninghubTaskId: taskResponse.data.runninghubTaskId
            };

            console.log('✅ API Server 试穿任务启动成功:', this.currentTask);

            // 开始轮询任务状态
            this.pollApiServerTaskStatus();

        } catch (error) {
            console.error('API Server 任务创建失败:', error);
            this.hideLoading();
            this.showError('试衣任务创建失败: ' + error.message);
        }
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

        const poll = async () => {
            attempts++;
            console.log(`🔄 第 ${attempts} 次轮询任务状态...`);
            
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
                                
                                if (taskData.resultUrl) {
                                    this.hideLoading();
                                    this.showResult(taskData.resultUrl);
                                    return; // 任务完成，结束轮询
                                }
                                break;
                            case 'FAILED':
                                console.error('❌ 任务执行失败');
                                throw new Error(taskData.errorMessage || '任务执行失败');
                            default:
                                console.log(`⚠️ 未知任务状态: ${taskData.status}`);
                                progressText.textContent = `任务状态: ${taskData.status}`;
                        }
                    }

                    console.log(`📈 轮询进度: ${attempts}/${maxAttempts}`);
                } else {
                    console.error('❌ 状态查询失败:', statusResponse.error);
                }

                if (attempts < maxAttempts) {
                    console.log(`⏰ 5秒后进行第 ${attempts + 1} 次轮询...`);
                    setTimeout(poll, 5000); // 5秒后再次检查
                } else {
                    console.error('⏰ 轮询超时，已达到最大尝试次数');
                    throw new Error('任务超时，请稍后重试');
                }

            } catch (error) {
                console.error('❌ 轮询任务状态错误:', error);
                this.hideLoading();
                this.showError('获取任务状态失败: ' + error.message);
            }
        };

        poll();
    }

    // 上传图片到RunningHub
    async uploadImageToRunningHub(imagePath) {
        try {
            const config = this.getConfig();
            if (!config.runninghub.apiKey) {
                throw new Error('请先配置RunningHub API Key');
            }
            if (typeof config.runninghub.apiKey !== 'string' || config.runninghub.apiKey.trim().length < 8) {
                throw new Error('RunningHub API Key 无效或未填写');
            }

            // 1) 解析为绝对路径并读取为二进制
            const fs = require('fs');
            const path = require('path');

            const resolveAbsolutePath = (p) => {
                if (!p) return null;
                // 已是绝对路径
                if (path.isAbsolute(p)) return p;
                // data URL 直接转 Blob
                if (typeof p === 'string' && p.startsWith('data:')) return p;
                // 远程URL 直接返回
                if (/^https?:\/\//i.test(p)) return p;
                // 走相对路径：以 renderer 为基准
                // 常见两类："../public/..." 和 "uploads/..."
                const fromRenderer = path.resolve(__dirname, p);
                if (fs.existsSync(fromRenderer)) return fromRenderer;
                // 尝试以项目根为基准
                const fromRoot = path.resolve(__dirname, '..', p.replace(/^\.\//, ''));
                if (fs.existsSync(fromRoot)) return fromRoot;
                // 特殊：后端保存的上传文件名通常在 uploads 目录
                const uploadsGuess = path.resolve(__dirname, '..', 'uploads', path.basename(p));
                if (fs.existsSync(uploadsGuess)) return uploadsGuess;
                // 特殊：public 目录
                const publicGuess = path.resolve(__dirname, '..', p.replace(/^\.\.\//, ''));
                if (fs.existsSync(publicGuess)) return publicGuess;
                return p; // 返回原值，后续分支处理 http/data
            };

            const absOrUrl = resolveAbsolutePath(imagePath);

            let fileBlob;
            let fileName = 'image.jpg';
            let mimeType = 'image/jpeg';

            const inferMime = (name) => {
                const ext = path.extname(name).toLowerCase();
                switch (ext) {
                    case '.jpg':
                    case '.jpeg':
                        return 'image/jpeg';
                    case '.png':
                        return 'image/png';
                    case '.webp':
                        return 'image/webp';
                    default:
                        return 'application/octet-stream';
                }
            };

            if (typeof absOrUrl === 'string' && absOrUrl.startsWith('data:')) {
                // data URL -> Blob
                const res = await fetch(absOrUrl);
                fileBlob = await res.blob();
                mimeType = fileBlob.type || mimeType;
                fileName = `image_${Date.now()}.${mimeType.includes('png') ? 'png' : (mimeType.includes('webp') ? 'webp' : 'jpg')}`;
            } else if (/^https?:\/\//i.test(absOrUrl)) {
                // 远程URL先下载成 Blob
                const res = await fetch(absOrUrl);
                if (!res.ok) throw new Error('下载远程图片失败');
                fileBlob = await res.blob();
                mimeType = fileBlob.type || mimeType;
                fileName = path.basename(new URL(absOrUrl).pathname) || fileName;
            } else {
                // 本地绝对路径 -> Buffer -> Blob
                const buf = fs.readFileSync(absOrUrl);
                fileName = path.basename(absOrUrl) || fileName;
                mimeType = inferMime(fileName);
                fileBlob = new Blob([buf], { type: mimeType });
            }

            // 2) 构造 FormData 并上传 - 按照示例代码格式
            const formData = new FormData();
            formData.append('apiKey', config.runninghub.apiKey);
            formData.append('file', fileBlob, fileName);
            formData.append('fileType', 'image');

            const baseUrl = (config.runninghub.baseUrl || 'https://www.runninghub.cn').replace(/\/$/, '');
            
            console.log('📤 上传图片请求数据:', {
                url: `${baseUrl}/task/openapi/upload`,
                method: 'POST',
                formData: {
                    apiKey: config.runninghub.apiKey,
                    file: `${fileName} (${fileBlob.size} bytes, ${mimeType})`,
                    fileType: 'image'
                }
            });
            
            // 按照示例代码构造请求选项
            const doRequest = async (useBearer = false) => {
                const headers = new Headers();
                headers.append('Host', new URL(baseUrl).host);
                
                if (useBearer) {
                    headers.append('Authorization', `Bearer ${config.runninghub.apiKey}`);
                }

                const requestOptions = {
                    method: 'POST',
                    headers: headers,
                    body: formData,
                    redirect: 'follow'
                };

                console.log('📤 请求选项:', {
                    method: requestOptions.method,
                    headers: Object.fromEntries(requestOptions.headers.entries()),
                    body: 'FormData (multipart/form-data)'
                });

                const resp = await fetch(`${baseUrl}/task/openapi/upload`, requestOptions);
                return resp;
            };

            // 首次尝试：不包含 Authorization 头（按照示例代码）
            let uploadResponse = await doRequest(false);

            // 如果 401，自动用 Bearer 前缀重试一次
            if (uploadResponse.status === 401) {
                console.log('第一次上传失败，尝试使用 Bearer token...');
                uploadResponse = await doRequest(true);
            }

            if (!uploadResponse.ok) {
                throw new Error(`上传接口请求失败(${uploadResponse.status})`);
            }

            const result = await uploadResponse.json();
            console.log('📥 RunningHub上传响应:', JSON.stringify(result, null, 2));
            
            if (result.code === 0 && result.data) {
                // 根据RunningHub API文档，返回的是fileName字段
                const fileName = result.data.fileName;
                console.log('上传成功，文件名:', fileName);
                return {
                    success: true,
                    fileUrl: fileName  // 使用fileName作为fileUrl，因为后续需要传给工作流
                };
            } else {
                console.error('上传失败，响应数据:', result);
                const errorMsg = result.msg || result.message || '上传失败';
                return {
                    success: false,
                    error: errorMsg
                };
            }
        } catch (error) {
            console.error('上传图片错误:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 【已弃用】启动RunningHub工作流任务
    // 现在由 API-server 统一管理所有 RunningHub 交互
    async startRunningHubTask(fullBodyShotNameInRH, clothingUploadResults) {
        throw new Error('直接调用 RunningHub 任务创建已被禁用，请使用 API-server 模式');
    }

    // 【已弃用】轮询RunningHub任务状态
    // 现在由 API-server 统一管理所有 RunningHub 交互
    async pollRunningHubTaskStatus() {
        throw new Error('直接调用 RunningHub 状态轮询已被禁用，请使用 API-server 模式');
    }

    // 查询RunningHub任务状态
    // 【已弃用】查询RunningHub任务状态
    // 现在由 API-server 统一管理所有 RunningHub 交互
    async queryRunningHubTaskStatus(taskId) {
        throw new Error('直接调用 RunningHub 状态查询已被禁用，请使用 API-server 模式');
    }

    // 【已弃用】上传图片到RunningHub
    // 现在由 API-server 统一管理所有 RunningHub 交互
    async uploadImageToRunningHub(imagePath) {
        throw new Error('直接调用 RunningHub 图片上传已被禁用，请使用 API-server 模式');
    }

    // 【已弃用】获取RunningHub任务结果
    // 现在由 API-server 统一管理所有 RunningHub 交互
    async getRunningHubTaskResult() {
        throw new Error('直接调用 RunningHub 结果获取已被禁用，请使用 API-server 模式');
    }



    showResult(imageUrl) {
        // 隐藏加载指示器
        document.getElementById('loading-indicator').style.display = 'none';
        
        // 显示结果图片
        const resultImg = document.getElementById('result-image');
        resultImg.style.display = 'block';
        
        // 预加载图片以确保流畅显示
        const img = new Image();
        img.onload = () => {
            // 图片加载完成后设置到结果图片元素
            resultImg.src = imageUrl;
            
            // 添加淡入效果
            resultImg.classList.remove('fade-in');
            void resultImg.offsetWidth;
            resultImg.classList.add('fade-in');
            
            // 调整容器大小以适应图片
            this.adjustImageContainer();
            
            // 如果在全屏模式下，重新调整
            const resultsPage = document.getElementById('results-page');
            if (resultsPage && resultsPage.classList.contains('fullscreen')) {
                setTimeout(() => this.adjustImageContainer(), 100);
            }
        };
        
        img.onerror = () => {
            console.error('图片加载失败:', imageUrl);
            resultImg.style.display = 'none';
            this.showError('试衣结果图片加载失败，请重试');
        };
        
        // 开始预加载
        img.src = imageUrl;
        
        // 显示操作按钮和风格信息
        document.getElementById('result-actions').style.display = 'flex';
        document.getElementById('style-info').style.display = 'flex';
        
        // 保存结果图片URL
        this.resultImageUrl = imageUrl;
        
        // 确保容器能够正确显示图片
        const container = document.querySelector('.result-image-container');
        if (container) {
            container.style.alignItems = 'center';
            container.style.justifyContent = 'center';
        }
    }

    // 调整图片容器大小以适应图片
    adjustImageContainer() {
        const resultImg = document.getElementById('result-image');
        const container = document.querySelector('.result-image-container');
        
        if (resultImg && container) {
            // 获取图片的自然尺寸
            const naturalWidth = resultImg.naturalWidth;
            const naturalHeight = resultImg.naturalHeight;
            
            // 如果图片尚未加载完成，延迟调整
            if (naturalWidth === 0 || naturalHeight === 0) {
                setTimeout(() => this.adjustImageContainer(), 100);
                return;
            }
            
            // 获取容器的尺寸
            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight;
            
            // 计算图片的显示尺寸
            const aspectRatio = naturalWidth / naturalHeight;
            let displayWidth, displayHeight;
            
            // 根据容器尺寸和图片比例计算最佳显示尺寸
            if (naturalWidth > naturalHeight) {
                // 横向图片
                displayWidth = Math.min(naturalWidth, containerWidth * 0.95);
                displayHeight = displayWidth / aspectRatio;
            } else {
                // 纵向图片
                displayHeight = Math.min(naturalHeight, containerHeight * 0.95);
                displayWidth = displayHeight * aspectRatio;
            }
            
            // 确保图片不会超出容器
            if (displayHeight > containerHeight * 0.95) {
                displayHeight = containerHeight * 0.95;
                displayWidth = displayHeight * aspectRatio;
            }
            
            if (displayWidth > containerWidth * 0.95) {
                displayWidth = containerWidth * 0.95;
                displayHeight = displayWidth / aspectRatio;
            }
            
            // 应用尺寸调整
            resultImg.style.width = displayWidth + 'px';
            resultImg.style.height = displayHeight + 'px';
            resultImg.style.maxWidth = '100%';
            resultImg.style.maxHeight = '100%';
            resultImg.style.objectFit = 'contain';
        }
    }

    async generateDownloadQR() {
        if (!this.resultImageUrl) {
            this.showError('没有可用的试衣结果');
            return;
        }

        try {
            // 确保 API 客户端已初始化
            await window.apiClient.initialize();
            
            const data = await window.apiClient.generateDownloadQR(
                this.resultImageUrl,
                this.getSelectedClothingInfo(),
                this.userProfile.openid
            );
            
            if (data.success) {
                // 隐藏加载文本
                document.getElementById('qr-loading').style.display = 'none';
                
                // 显示二维码
                const canvas = document.getElementById('qr-canvas');
                const img = new Image();
                img.onload = () => {
                    const ctx = canvas.getContext('2d');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    canvas.style.display = 'block';
                };
                img.src = data.qrCode;
            } else {
                throw new Error(data.error || '生成二维码失败');
            }

        } catch (error) {
            console.error('生成二维码错误:', error);
            document.getElementById('qr-loading').textContent = '二维码生成失败';
        }
    }

    startCountdown() {
        let seconds = 60;
        const countdownEl = document.getElementById('countdown');
        
        const updateCountdown = () => {
            countdownEl.textContent = seconds;
            
            if (seconds <= 0) {
                this.backToCamera();
                return;
            }
            
            seconds--;
            setTimeout(updateCountdown, 1000);
        };
        
        updateCountdown();
    }

    backToHome() {
        // 重置应用状态
        this.userProfile = {
            openid: null,
            photo: null,
            photoFileName: null,
            gender: 'female'
        };
        this.selectedClothing = null;
        this.selectedTopBottom = null;
        this.selectedDress = null;
        this.selectedStyle = null;
        this.currentTask = null;
        this.resultImageUrl = null;

        // 重置表单
        document.getElementById('photo-input').value = '';
        document.getElementById('avatar-preview').innerHTML = '<span>请拍摄全身照</span>';
        document.getElementById('generate-btn').disabled = true;

        // 返回首页
        this.setPage('welcome-page');
    }

    backToCamera() {
        // 重置服装选择状态，但保留用户照片
        this.selectedClothing = null;
        this.selectedTopBottom = null;
        this.selectedDress = null;
        this.selectedStyle = null;
        this.currentTask = null;
        this.resultImageUrl = null;

        // 返回照相页面
        this.setPage('profile-page');
    }

    showLoading(message = '处理中...', details = '') {
        const loading = document.getElementById('global-loading');
        document.getElementById('loading-message').textContent = message;
        loading.style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('global-loading').style.display = 'none';
    }

    showError(message) {
        document.getElementById('error-message').textContent = message;
        document.getElementById('error-modal').style.display = 'flex';
    }

    // 获取配置信息
    getConfig() {
        if (this.configCache) {
            return this.configCache;
        }
        
        // 从localStorage获取配置
        try {
            const configStr = localStorage.getItem('appConfig');
            if (configStr) {
                this.configCache = JSON.parse(configStr);
                return this.configCache;
            }
        } catch (error) {
            console.error('解析配置失败:', error);
        }
        
        // 返回默认配置
        return {
            apiServer: {
                url: 'http://localhost:4001'
            },
            runninghub: {
                apiKey: '',
                baseUrl: 'https://www.runninghub.cn',
                singleItemWorkflowId: '',
                topBottomWorkflowId: ''
            },
            wechat: {
                appId: '',
                appSecret: '',
                token: '',
                encodingAESKey: ''
            },
            server: {
                host: 'localhost',
                port: 4001  // 修改为与API服务器一致的端口
            }
        };
    }

    // 设置配置信息
    setConfig(config) {
        this.configCache = config;
        localStorage.setItem('appConfig', JSON.stringify(config));
    }
}

// 创建全局应用状态实例

// UI 交互函数

// 摄像头相关全局状态
let cameraInitialized = false;
let cameraVideo = null;
let cameraCanvas = null;
let cameraStream = null;
let currentCameraDeviceId = null;
let availableCameras = [];
let cameraRotationDeg = -90; // 摄像头画面旋转角度（度）

// 统一应用摄像头视频为竖屏显示（旋转90°）的样式
function applyCameraVideoPortraitStyles() {
    try {
        const container = document.querySelector('.camera-container');
        if (container) {
            container.style.position = container.style.position || 'relative';
            // 展示完整画面，不裁剪
            container.style.overflow = 'visible';
            // 固定容器为竖屏比例（9:16），视频以 contain 方式适配，左右留黑边
            container.style.aspectRatio = '9 / 16';
            container.style.backgroundColor = '#000';
        }

        if (cameraVideo) {
            // 以中心为原点，旋转+缩放，计算缩放以完整展示
            cameraVideo.style.position = 'absolute';
            cameraVideo.style.top = '50%';
            cameraVideo.style.left = '50%';
            cameraVideo.style.transformOrigin = 'center center';
            cameraVideo.style.objectFit = 'fill';
            // 初始设置，等元数据后按固有尺寸+scale布局
            computeAndApplyCameraScale();
            // 监听窗口尺寸变更，重新计算缩放
            if (!window.__cameraScaleResizeBound) {
                window.addEventListener('resize', computeAndApplyCameraScale);
                window.__cameraScaleResizeBound = true;
            }
        }
    } catch (e) {
        console.warn('应用摄像头竖屏样式失败:', e);
    }
}

function computeAndApplyCameraScale() {
    try {
        const container = document.querySelector('.camera-container');
        if (!container || !cameraVideo) return;
        const vw = cameraVideo.videoWidth || cameraVideo.clientWidth || 640;
        const vh = cameraVideo.videoHeight || cameraVideo.clientHeight || 480;
        if (!vw || !vh) return;

        const rot = ((cameraRotationDeg % 360) + 360) % 360;
        const rotatedW = (rot === 90 || rot === 270) ? vh : vw;
        const rotatedH = (rot === 90 || rot === 270) ? vw : vh;

        const cw = container.clientWidth;
        const ch = container.clientHeight;
        if (!cw || !ch) return;

        const scale = Math.min(cw / rotatedW, ch / rotatedH);

        // 使用固有尺寸为参考，配合缩放保证完整显示
        cameraVideo.style.width = vw + 'px';
        cameraVideo.style.height = vh + 'px';
        cameraVideo.style.transform = `translate(-50%, -50%) rotate(${cameraRotationDeg}deg) scale(${scale})`;
    } catch (e) {
        console.warn('计算摄像头缩放失败:', e);
    }
}

function startExperience() {
    console.log('开始体验');
    // 切换到个人信息页面
    appState.setPage('profile-page');
}

function openConfigPage() {
    appState.setPage('config-page');
}

function takePicture() {
    document.getElementById('photo-input').click();
}

console.log('衣等舱应用已初始化');

function uploadFromFile() {
    document.getElementById('photo-input').click();
}

async function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
        appState.showError('请选择图片文件');
        return;
    }

    // 显示预览
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById('avatar-preview');
        preview.innerHTML = `<img src="${e.target.result}" alt="用户照片">`;
        appState.userProfile.photo = e.target.result;
        
        // 启用生成按钮
        document.getElementById('generate-btn').disabled = false;
    };
    reader.readAsDataURL(file);

    // 已弃用：此上传逻辑已被新的 takePhoto() 方法中的 API 客户端上传替代
    // 直接跳转到服装选择页面，因为照片上传现在在拍照时完成
    console.log('⚠️ 使用了已弃用的上传方法，直接跳转到服装选择页面');
    appState.setPage('clothing-page');
}

function generateTryOn() {
    if (!appState.userProfile.photoFileName) {
        appState.showError('请先上传照片');
        return;
    }
    appState.setPage('clothing-page');
}

function goBack() {
    const currentPage = appState.currentPage;
    
    switch(currentPage) {
        case 'clothing-page':
            appState.setPage('profile-page');
            break;
        case 'results-page':
            appState.setPage('clothing-page');
            break;
        case 'style-page':
            appState.setPage('results-page');
            break;
        case 'download-page':
            appState.setPage('results-page');
            break;
        default:
            appState.setPage('welcome-page');
    }
}

function proceedToFitting() {
    if (!appState.selectedDress && !appState.selectedTopBottom) {
        appState.showError('请先选择服装');
        return;
    }
    appState.setPage('results-page');
}

function retryFitting() {
    appState.setPage('clothing-page');
}

// 保存图片并推送结果到微信
async function saveImage() {
    try {
        // 首先跳转到下载页面
        appState.setPage('download-page');
        
        // 推送试装结果到微信
        await pushTryonResultToWechat();
    } catch (error) {
        console.error('保存图片或推送微信失败:', error);
        appState.showError('保存图片失败: ' + error.message);
    }
}

// 推送试装结果到微信
async function pushTryonResultToWechat() {
    try {
        // 确保API客户端已初始化
        if (!window.apiClient) {
            console.error('API客户端未初始化');
            return;
        }
        
        // 获取设备MAC地址
        let macAddress = appState.macAddress;
        if (!macAddress) {
            // 如果应用状态中没有MAC地址，尝试从系统获取
            try {
                const { ipcRenderer } = require('electron');
                macAddress = await ipcRenderer.invoke('get-mac-address');
            } catch (error) {
                console.error('获取MAC地址失败:', error);
                macAddress = '00:11:22:33:44:55'; // 默认值
            }
        }
        
        // 获取当前选择的服装信息
        const clothingInfo = appState.getSelectedClothingInfo();
        
        // 获取结果图片URL
        const imageUrl = appState.resultImageUrl;
        
        if (!imageUrl) {
            throw new Error('没有可用的试衣结果图片');
        }
        
        // 获取服装购买链接
        let purchaseUrl = '';
        if (appState.selectedDress) {
            purchaseUrl = appState.selectedDress.item.purchaseUrl || '';
        } else if (appState.selectedTopBottom) {
            const topItem = appState.selectedTopBottom.tops;
            const bottomItem = appState.selectedTopBottom.bottoms;
            // 优先使用上衣的购买链接
            purchaseUrl = (topItem && topItem.purchaseUrl) || (bottomItem && bottomItem.purchaseUrl) || '';
        }
        
        if (!purchaseUrl) {
            throw new Error('没有找到服装购买链接');
        }
        
        // 调用API推送试装结果
        const response = await window.apiClient.request('/api/wechat/push-tryon-result', {
            method: 'POST',
            body: JSON.stringify({
                macAddress: macAddress,
                imageUrl: imageUrl,
                purchaseUrl: purchaseUrl,
                clothesName: clothingInfo.name || '试装结果'
            })
        });
        
        if (response.success) {
            console.log('✅ 试装结果已推送至微信');
        } else {
            throw new Error(response.error || '推送微信失败');
        }
    } catch (error) {
        console.error('❌ 推送试装结果到微信失败:', error);
        // 不中断用户流程，仅记录错误
    }
}

function confirmStyle() {
    // 这里可以应用选择的风格
    appState.setPage('results-page');
}

function closeErrorModal() {
    document.getElementById('error-modal').style.display = 'none';
}

// API 客户端初始化
async function initializeApiClient() {
    try {
        console.log('🚀 初始化 API 客户端...');
        
        // 检查 api-client.js 文件是否被正确加载
        console.log('🔍 检查API客户端加载状态:', {
            windowApiClient: typeof window.apiClient,
            windowApiClientClass: typeof window.ApiClient,
            apiClientExists: !!window.apiClient,
            apiClientClassExists: !!window.ApiClient
        });
        
        // 首先检查 window.apiClient 是否存在
        if (!window.apiClient) {
            console.error('❌ window.apiClient 未定义');
            console.error('🔍 可能的原因:');
            console.error('  1. api-client.js 文件未正确加载');
            console.error('  2. 脚本加载顺序错误');
            console.error('  3. 文件路径错误');
            console.error('  4. JavaScript语法错误阻止了脚本执行');
            
            // 尝试手动创建API客户端实例
            if (window.ApiClient) {
                console.log('⚠️ 发现ApiClient类，尝试手动创建实例...');
                window.apiClient = new window.ApiClient();
                console.log('✅ 手动创建API客户端实例成功');
            } else {
                console.error('❌ ApiClient类也未定义，请检查 api-client.js 文件是否正确加载');
                
                // 显示用户友好的错误信息
                appState.showError('API客户端加载失败，请刷新页面重试。如问题持续存在，请联系技术支持。');
                return;
            }
        }
        
        console.log('✅ window.apiClient 已加载');
        
        // 初始化API客户端（从配置页面加载服务器地址）
        await window.apiClient.initialize();
        
        // 测试API服务器连接
        try {
            console.log('🔍 测试API服务器连接...');
            const healthResponse = await window.apiClient.healthCheck();
            console.log('✅ API Server 健康检查成功:', healthResponse);
        } catch (healthError) {
            console.warn('⚠️ API Server 健康检查失败:', healthError.message);
            console.log('将继续尝试设备认证，可能服务器正在启动中...');
        }
        
        // 获取设备 MAC 地址
        let macAddress;
        try {
            const { ipcRenderer } = require('electron');
            macAddress = await ipcRenderer.invoke('get-mac-address');
            console.log('📱 设备 MAC 地址:', macAddress);
        } catch (macError) {
            console.error('❌ 获取MAC地址失败:', macError.message);
            // 使用备用MAC地址
            macAddress = 'fallback-mac-' + Date.now();
            console.log('⚠️ 使用备用MAC地址:', macAddress);
        }
        
        // 进行设备认证
        try {
            console.log('🔐 开始设备认证...');
            const authResponse = await window.apiClient.authenticateDevice(
                macAddress,
                `设备-${macAddress.slice(-6)}`
            );
            
            if (authResponse.success) {
                console.log('✅ 设备认证成功:', {
                    deviceId: authResponse.device.id,
                    hasToken: !!window.apiClient.token
                });
                
                // 测试认证后的API调用
                try {
                    console.log('🧪 测试认证后的API调用...');
                    const categoriesResponse = await window.apiClient.getClothingCategories();
                    console.log('✅ 服装分类获取成功:', categoriesResponse.success ? '成功' : '失败');
                    
                    const clothingResponse = await window.apiClient.getClothingList();
                    console.log('✅ 服装列表获取成功:', clothingResponse.success ? '成功' : '失败');
                } catch (testError) {
                    console.warn('⚠️ 认证后API测试失败:', testError.message);
                }
                
                // 检查微信关注状态
                try {
                    const wechatStatus = await window.apiClient.checkWechatStatus(authResponse.device.id);
                    console.log('📱 微信关注状态:', wechatStatus);
                    
                    if (wechatStatus.success && wechatStatus.isVerified) {
                        console.log('✅ 用户已关注微信公众号');
                        // 可以在这里添加已关注用户的特殊处理
                    } else {
                        console.log('⚠️ 用户未关注微信公众号，需要扫码关注');
                        // 生成微信二维码
                        await generateWechatQRCode(authResponse.device.id);
                    }
                } catch (wechatError) {
                    console.warn('⚠️ 微信状态检查失败:', wechatError.message);
                }
                
            } else {
                console.error('❌ 设备认证失败:', authResponse.error);
            }
            
        } catch (authError) {
            console.error('❌ 设备认证过程出错:', authError.message);
        }
        
    } catch (error) {
        console.error('❌ API 客户端初始化失败:', error.message);
        console.error('详细错误信息:', error);
    }
}

// 生成微信二维码
async function generateWechatQRCode(deviceId) {
    try {
        const qrResponse = await window.apiClient.generateWechatQRCode(deviceId);
        
        if (qrResponse.success) {
            const qrImg = document.getElementById('wechat-qr-img');
            if (qrImg) {
                qrImg.src = qrResponse.qrCode.dataURL;
                console.log('✅ 微信二维码生成成功');
            }
        }
    } catch (error) {
        console.error('❌ 生成微信二维码失败:', error);
    }
}

// 事件监听器

document.addEventListener('DOMContentLoaded', async () => {
    console.log('📝 DOM内容加载完成，开始初始化...');
    
    // 等待一小段时间确保所有脚本都加载完成
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 从配置加载摄像头设备ID
    try {
        const cfg = appState.getConfig();
        if (cfg && cfg.device && cfg.device.cameraDeviceId) {
            currentCameraDeviceId = cfg.device.cameraDeviceId;
            console.log('📦 从配置加载摄像头ID:', currentCameraDeviceId);
        }
    } catch (e) {
        console.warn('读取配置中的摄像头ID失败:', e);
    }

    // 初始化 API 客户端和设备认证
    await initializeApiClient();
    
    // 应用启动时立即初始化摄像头（后台准备）
    initializeCameraInBackground();
    
    // 初始化设备信息（用于配置页面）
    initializeDeviceInfo();

    // 绑定配置页摄像头选择变更事件，自动切换并重新初始化摄像头
    const cameraSelect = document.getElementById('cfg-camera-device');
    if (cameraSelect) {
        cameraSelect.addEventListener('change', () => {
            switchCamera();
        });
    }

    // 监听系统摄像头设备变更（插拔）
    if (navigator.mediaDevices && typeof navigator.mediaDevices.addEventListener === 'function') {
        navigator.mediaDevices.addEventListener('devicechange', async () => {
            console.log('📟 检测到媒体设备变更，刷新摄像头列表');
            await loadCameraDevices();
            try {
                const select = document.getElementById('cfg-camera-device');
                if (select && select.value) {
                    currentCameraDeviceId = select.value;
                    await reinitializeCamera();
                }
            } catch (e) {
                console.warn('设备变更后重启摄像头失败:', e);
            }
        });
    }

    // 性别选择（保留用于服装页面）
    document.querySelectorAll('input[name="gender"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            appState.userProfile.gender = e.target.value;
            // 同步更新服装选择页面的性别
            appState.currentGender = e.target.value;
            
            // 如果当前在服装页面，更新性别tab状态和重新加载服装
            if (appState.currentPage === 'clothing-page') {
                // 更新性别tab的active状态
                document.querySelectorAll('.gender-tab').forEach(tab => {
                    tab.classList.remove('active');
                    if (tab.dataset.gender === e.target.value) {
                        tab.classList.add('active');
                    }
                });
                
                // 重置选择状态并重新加载服装
                appState.selectedClothing = null;
                appState.selectedTopBottom = null;
                appState.selectedDress = null;
                appState.isDressSelected = false;
                appState.updateSelectionSummary();
                appState.updateCategoryNotice();
                appState.loadClothingItems();
            }
        });
    });

    // 服装分类切换
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            // 移除其他选中状态
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            // 设置当前选中
            e.target.classList.add('active');
            // 加载对应分类的服装
            appState.loadClothingItems();
            // 重置选择状态
            appState.selectedClothing = null;
            appState.selectedTopBottom = null;
            appState.selectedDress = null;
            document.getElementById('selected-clothing').innerHTML = '<span>尚未选择服装</span>';
            document.getElementById('proceed-btn').disabled = true;
        });
    });

    // 风格选择
    document.querySelectorAll('.style-category').forEach(category => {
        category.addEventListener('click', (e) => {
            document.querySelectorAll('.style-category').forEach(c => c.classList.remove('active'));
            e.currentTarget.classList.add('active');
        });
    });

    // 键盘事件
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeErrorModal();
        }
    });
});



async function loadConfigIntoForm() {
    const cfg = appState.getConfig();
    if (!cfg) {
        console.log('❌ 配置加载失败：cfg为空');
        return;
    }
    
    console.log('🔍 加载配置到表单:', cfg);
    
    try {
        // API服务器配置
        document.getElementById('cfg-api-server-url').value = cfg.apiServer?.url || 'http://localhost:4001';
        
        // RunningHub配置
        document.getElementById('cfg-runninghub-apiKey').value = cfg.runninghub.apiKey || '';
        document.getElementById('cfg-runninghub-baseUrl').value = cfg.runninghub.baseUrl || '';
        // 兼容性处理：如果存在旧的workflowId，将其映射到singleItemWorkflowId
        const singleItemValue = cfg.runninghub.singleItemWorkflowId || cfg.runninghub.workflowId || '';
        const topBottomValue = cfg.runninghub.topBottomWorkflowId || '';
        
        console.log('🔍 工作流ID值:', {
            singleItemWorkflowId: singleItemValue,
            topBottomWorkflowId: topBottomValue,
            originalWorkflowId: cfg.runninghub.workflowId
        });
        
        document.getElementById('cfg-runninghub-singleItemWorkflowId').value = singleItemValue;
        document.getElementById('cfg-runninghub-topBottomWorkflowId').value = topBottomValue;
        
        // 微信配置
        document.getElementById('cfg-wechat-appId').value = cfg.wechat.appId || '';
        document.getElementById('cfg-wechat-appSecret').value = cfg.wechat.appSecret || '';
        document.getElementById('cfg-wechat-token').value = cfg.wechat.token || '';
        document.getElementById('cfg-wechat-encodingAESKey').value = cfg.wechat.encodingAESKey || '';
        
        // 服务器配置
        document.getElementById('cfg-server-host').value = cfg.server.host || '';
        document.getElementById('cfg-server-port').value = cfg.server.port || '';
        
        console.log('✅ 配置加载到表单完成');
    } catch (error) {
        console.error('❌ 配置加载到表单失败:', error);
    }
}

async function saveConfig() {
    try {
        const singleItemValue = document.getElementById('cfg-runninghub-singleItemWorkflowId').value.trim();
        const topBottomValue = document.getElementById('cfg-runninghub-topBottomWorkflowId').value.trim();
        
        console.log('🔍 保存配置，工作流ID值:', {
            singleItemWorkflowId: singleItemValue,
            topBottomWorkflowId: topBottomValue
        });
        
        // 合并已有配置，避免丢失 device.cameraDeviceId 等字段
        const existing = appState.getConfig() || {};
        const body = {
            ...existing,
            apiServer: {
                ...(existing.apiServer || {}),
                url: document.getElementById('cfg-api-server-url').value.trim()
            },
            runninghub: {
                ...(existing.runninghub || {}),
                apiKey: document.getElementById('cfg-runninghub-apiKey').value.trim(),
                baseUrl: document.getElementById('cfg-runninghub-baseUrl').value.trim(),
                singleItemWorkflowId: singleItemValue,
                topBottomWorkflowId: topBottomValue
            },
            wechat: {
                ...(existing.wechat || {}),
                appId: document.getElementById('cfg-wechat-appId').value.trim(),
                appSecret: document.getElementById('cfg-wechat-appSecret').value.trim(),
                token: document.getElementById('cfg-wechat-token').value.trim(),
                encodingAESKey: document.getElementById('cfg-wechat-encodingAESKey').value.trim()
            },
            server: {
                ...(existing.server || {}),
                host: document.getElementById('cfg-server-host').value.trim(),
                port: Number(document.getElementById('cfg-server-port').value)
            }
        };
        
        appState.setConfig(body);
        
        // 反馈并返回上一页
        appState.showError('配置已保存');
        setTimeout(() => {
            goBack();
        }, 300);
    } catch (e) {
        console.error('保存配置失败:', e);
        appState.showError('保存配置失败: ' + e.message);
    }
}

async function testApiServerConnection() {
    const resultDiv = document.getElementById('api-server-test-result');
    const apiServerUrl = document.getElementById('cfg-api-server-url').value.trim() || 'https://api.0086.xyz';
    
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<div style="color: #007bff;">🔄 正在测试API服务器连接...</div>';
    
    try {
        const testUrl = `${apiServerUrl}/health`;
        console.log('🔗 测试API服务器连接:', testUrl);
        
        // 测试健康检查
        const healthResponse = await fetch(testUrl, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
        });
        
        if (!healthResponse.ok) {
            throw new Error(`HTTP ${healthResponse.status}: ${healthResponse.statusText}`);
        }
        
        const healthData = await healthResponse.json();
        console.log('✅ API服务器健康检查成功:', healthData);
        
        // 测试设备认证
        const testMac = 'test-config-' + Date.now();
        const authResponse = await fetch(`${apiServerUrl}/api/auth/device`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                macAddress: testMac,
                deviceName: '配置测试设备'
            })
        });
        
        if (!authResponse.ok) {
            throw new Error(`认证失败: HTTP ${authResponse.status}`);
        }
        
        const authData = await authResponse.json();
        console.log('✅ API服务器设备认证成功:', authData);
        
        if (authData.success) {
            // 测试服装分类接口
            const categoriesResponse = await fetch(`${apiServerUrl}/api/clothes/categories`, {
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authData.token}`
                }
            });
            
            if (categoriesResponse.ok) {
                const categoriesData = await categoriesResponse.json();
                console.log('✅ API服务器服装分类获取成功:', categoriesData);
                
                resultDiv.innerHTML = `
                    <div style="color: #28a745; border: 1px solid #28a745; background: #d4edda; padding: 8px; border-radius: 4px;">
                        ✅ API服务器连接测试成功<br>
                        <small>服务器: ${apiServerUrl}<br>
                        健康状态: ${healthData.status || 'OK'}<br>
                        服装分类: ${categoriesData.data?.length || 0} 个</small>
                    </div>
                `;
            } else {
                throw new Error('服装分类接口测试失败');
            }
        } else {
            throw new Error('设备认证返回失败状态');
        }
        
    } catch (error) {
        console.error('❌ API服务器连接测试失败:', error);
        resultDiv.innerHTML = `
            <div style="color: #dc3545; border: 1px solid #dc3545; background: #f8d7da; padding: 8px; border-radius: 4px;">
                ❌ API服务器连接测试失败<br>
                <small>${error.message}</small><br>
                <small style="color: #6c757d;">请检查API服务器地址设置</small>
            </div>
        `;
    }
}

// 设备信息功能
async function initializeDeviceInfo() {
    console.log('🔍 初始化设备信息...');
    await loadMacAddress();
    await loadCameraDevices();
}

// 获取MAC地址
async function loadMacAddress() {
    try {
        // 通过IPC调用主进程获取MAC地址
        const { ipcRenderer } = require('electron');
        const macAddress = await ipcRenderer.invoke('get-mac-address');
        
        document.getElementById('cfg-device-mac').value = macAddress;
        console.log('✅ MAC地址加载成功:', macAddress);
        
    } catch (error) {
        console.error('❌ 获取MAC地址失败:', error);
        document.getElementById('cfg-device-mac').value = '获取失败: ' + error.message;
    }
}

// 刷新MAC地址
async function refreshMacAddress() {
    console.log('🔄 刷新MAC地址...');
    await loadMacAddress();
}

// 获取摄像头设备列表
async function loadCameraDevices() {
    try {
        console.log('🔍 获取摄像头设备列表...');
        
        // 检查是否支持mediaDevices API
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
            throw new Error('浏览器不支持设备枚举API');
        }
        
        // 获取所有媒体设备
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        console.log('📹 找到摄像头设备:', videoDevices);
        
        // 更新摄像头选择下拉框
        const select = document.getElementById('cfg-camera-device');
        select.innerHTML = '';
        
        if (videoDevices.length === 0) {
            select.innerHTML = '<option value="">未找到摄像头设备</option>';
            availableCameras = [];
        } else {
            videoDevices.forEach((device, index) => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.textContent = device.label || `摄像头 ${index + 1}`;
                select.appendChild(option);
            });
            
            // 设置当前使用的摄像头
            if (typeof currentCameraDeviceId !== 'undefined' && currentCameraDeviceId) {
                select.value = currentCameraDeviceId;
            } else if (videoDevices.length > 0) {
                select.value = videoDevices[0].deviceId;
            }
            
            availableCameras = videoDevices;
        }
        
        console.log('✅ 摄像头设备列表加载完成');
        
    } catch (error) {
        console.error('❌ 获取摄像头设备列表失败:', error);
        const select = document.getElementById('cfg-camera-device');
        select.innerHTML = '<option value="">获取设备列表失败: ' + error.message + '</option>';
        availableCameras = [];
    }
}

// 刷新摄像头设备列表
async function refreshCameraList() {
    console.log('🔄 刷新摄像头设备列表...');
    await loadCameraDevices();
}

// 切换摄像头
async function switchCamera() {
    try {
        const select = document.getElementById('cfg-camera-device');
        const selectedDeviceId = select.value;
        
        if (!selectedDeviceId) {
            appState.showError('请先选择一个摄像头设备');
            return;
        }
        
        console.log('🔄 切换摄像头到设备:', selectedDeviceId);
        
        // 停止当前摄像头流
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            cameraStream = null;
        }
        
        // 更新当前摄像头设备ID并持久化到配置
        currentCameraDeviceId = selectedDeviceId;
        try {
            const existing = appState.getConfig() || {};
            const merged = {
                ...existing,
                device: {
                    ...(existing.device || {}),
                    cameraDeviceId: currentCameraDeviceId
                }
            };
            appState.setConfig(merged);
            console.log('💾 已保存摄像头ID到配置:', currentCameraDeviceId);
        } catch (e) {
            console.warn('保存摄像头ID到配置失败:', e);
        }
        
        // 重新初始化摄像头
        await reinitializeCamera();
        
        appState.showError('摄像头切换成功');
        
    } catch (error) {
        console.error('❌ 切换摄像头失败:', error);
        appState.showError('切换摄像头失败: ' + error.message);
    }
}

// 重新初始化摄像头
async function reinitializeCamera() {
    try {
        console.log('🔄 重新初始化摄像头...');
        
        // 请求指定摄像头的权限
        const constraints = {
            video: {
                deviceId: { exact: currentCameraDeviceId },
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        };
        
        cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // 更新视频元素
        cameraVideo = document.getElementById('camera-video');
        if (cameraVideo) {
            cameraVideo.srcObject = cameraStream;
            cameraVideo.muted = true;
            
            cameraVideo.onloadedmetadata = () => {
                console.log('✅ 摄像头重新初始化成功');
                cameraInitialized = true;
                enableCameraUI();
                applyCameraVideoPortraitStyles();
                computeAndApplyCameraScale();
            };
        }
        
    } catch (error) {
        console.error('❌ 重新初始化摄像头失败:', error);
        throw error;
    }
}

// 应用启动时初始化并打开摄像头
async function initializeCameraInBackground() {
    try {
        console.log('🚀 开始初始化摄像头...');
        
        // 请求摄像头权限
        const constraints = {
            video: {
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        };
        
        // 如果指定了摄像头设备ID，使用指定的设备
        if (currentCameraDeviceId) {
            constraints.video.deviceId = { exact: currentCameraDeviceId };
        } else {
            constraints.video.facingMode = 'user'; // 默认前置摄像头
        }
        
        cameraStream = await navigator.mediaDevices.getUserMedia(constraints);

        // 直接设置到摄像头元素上（如果存在）
        cameraVideo = document.getElementById('camera-video');
        if (cameraVideo) {
            cameraVideo.srcObject = cameraStream;
            cameraVideo.muted = true;
            
            cameraVideo.onloadedmetadata = () => {
                console.log('✅ 摄像头初始化成功，画面已显示');
                cameraInitialized = true;
                enableCameraUI();
                applyCameraVideoPortraitStyles();
                computeAndApplyCameraScale();
            };
        } else {
            console.log('摄像头元素未找到，等待页面加载');
            cameraInitialized = true;
        }

    } catch (error) {
        console.error('❌ 摄像头初始化失败:', error);
        cameraInitialized = false;
    }
}

// 快速初始化摄像头（用户进入个人信息页面时调用）
async function initializeCamera() {
    try {
        cameraVideo = document.getElementById('camera-video');
        cameraCanvas = document.getElementById('camera-canvas');
        
        if (!cameraVideo || !cameraCanvas) {
            console.log('摄像头元素未找到，可能不在个人信息页面');
            return;
        }

        // 如果后台已经初始化过，直接使用
        if (cameraInitialized) {
            console.log('使用已准备的摄像头权限，快速启动');
            await startCameraStream();
        } else {
            console.log('摄像头权限未准备，重新请求');
            await startCameraStream();
        }

    } catch (error) {
        console.error('摄像头初始化失败:', error);
        showCameraError();
    }
}

// 启动摄像头流
async function startCameraStream() {
    try {
        // 请求摄像头权限
        const constraints = {
            video: {
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        };
        
        // 如果指定了摄像头设备ID，使用指定的设备
        if (currentCameraDeviceId) {
            constraints.video.deviceId = { exact: currentCameraDeviceId };
        } else {
            constraints.video.facingMode = 'user'; // 默认前置摄像头
        }
        
        cameraStream = await navigator.mediaDevices.getUserMedia(constraints);

        // 设置视频源
        cameraVideo.srcObject = cameraStream;
        
        // 视频加载完成后启用按钮
        cameraVideo.onloadedmetadata = () => {
            console.log('摄像头启动成功');
            enableCameraUI();
            applyCameraVideoPortraitStyles();
            computeAndApplyCameraScale();
        };

        // 错误处理
        cameraVideo.onerror = (error) => {
            console.error('摄像头视频错误:', error);
            showCameraError();
        };

    } catch (error) {
        console.error('启动摄像头流失败:', error);
        showCameraError();
    }
}

// 启用摄像头UI
function enableCameraUI() {
    const generateBtn = document.getElementById('generate-btn');
    if (generateBtn) {
        generateBtn.disabled = false;
        console.log('✅ 摄像头UI已启用');
    }
}

function showCameraError() {
    const cameraContainer = document.querySelector('.camera-container');
    if (cameraContainer) {
        cameraContainer.innerHTML = `
            <div class="camera-error">
                <h3>摄像头无法启动</h3>
                <p>请检查摄像头权限或刷新页面重试</p>
                <button onclick="location.reload()">刷新页面</button>
            </div>
        `;
    }
}

// 拍照功能
async function capturePhoto() {
    if (!cameraVideo || !cameraCanvas) {
        console.error('摄像头未初始化');
        return;
    }

    try {
        // 原始视频尺寸（横屏）
        const videoWidth = cameraVideo.videoWidth;
        const videoHeight = cameraVideo.videoHeight;

        const rot = ((cameraRotationDeg % 360) + 360) % 360; // 归一化到 [0,360)
        const isQuarterTurn = rot === 90 || rot === 270; // 仅±90°时交换宽高

        // 画布尺寸：当旋转±90°时，交换宽高得到竖屏；其它角度按原尺寸
        cameraCanvas.width = isQuarterTurn ? videoHeight : videoWidth;
        cameraCanvas.height = isQuarterTurn ? videoWidth : videoHeight;

        const ctx = cameraCanvas.getContext('2d');
        ctx.save();

        // 将坐标系移动到画布中心，按旋转角度旋转（与预览一致，使用 cameraRotationDeg）
        ctx.translate(cameraCanvas.width / 2, cameraCanvas.height / 2);
        ctx.rotate((cameraRotationDeg * Math.PI) / 180);

        // 把原始视频帧绘制到以中心为原点的坐标系中，确保完整画面
        ctx.drawImage(
            cameraVideo,
            -videoWidth / 2,
            -videoHeight / 2,
            videoWidth,
            videoHeight
        );

        ctx.restore();

        // 获取完整照片数据
        const fullPhotoData = cameraCanvas.toDataURL('image/jpeg', 0.8);
        
        // 创建裁剪后的照片（720x1024）
        const croppedPhotoData = await cropPhotoTo720x1024(fullPhotoData);
        
        // 保存到应用状态
        appState.userProfile.photo = croppedPhotoData; // 使用裁剪后的照片
        appState.userProfile.photoFileName = `photo_${Date.now()}.jpg`;
        
        console.log('照片拍摄和裁剪成功，尺寸：720x1024');
        return croppedPhotoData;
    } catch (error) {
        console.error('拍照失败:', error);
        return null;
    }
}

// 裁剪照片为720x1024尺寸
function cropPhotoTo720x1024(photoDataUrl) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = function() {
            // 创建裁剪画布
            const cropCanvas = document.createElement('canvas');
            const cropCtx = cropCanvas.getContext('2d');
            
            // 设置目标尺寸
            const targetWidth = 720;
            const targetHeight = 1024;
            cropCanvas.width = targetWidth;
            cropCanvas.height = targetHeight;
            
            // 获取原始图片尺寸
            const srcWidth = img.width;
            const srcHeight = img.height;
            
            console.log(`原始图片尺寸: ${srcWidth}x${srcHeight}`);
            console.log(`目标尺寸: ${targetWidth}x${targetHeight}`);
            
            // 计算裁剪区域（中心裁剪）
            let sourceX, sourceY, sourceWidth, sourceHeight;
            
            // 计算缩放比例，保持长宽比为 720:1024 = 45:64
            const targetRatio = targetWidth / targetHeight; // 0.703125
            const sourceRatio = srcWidth / srcHeight;
            
            if (sourceRatio > targetRatio) {
                // 原图较宽，以高度为准，裁去两侧
                sourceHeight = srcHeight;
                sourceWidth = srcHeight * targetRatio;
                sourceX = (srcWidth - sourceWidth) / 2;
                sourceY = 0;
            } else {
                // 原图较高，以宽度为准，裁去上下
                sourceWidth = srcWidth;
                sourceHeight = srcWidth / targetRatio;
                sourceX = 0;
                sourceY = (srcHeight - sourceHeight) / 2;
            }
            
            console.log(`裁剪区域: x=${sourceX}, y=${sourceY}, w=${sourceWidth}, h=${sourceHeight}`);
            
            // 清空画布
            cropCtx.clearRect(0, 0, targetWidth, targetHeight);
            
            // 绘制裁剪后的图片
            cropCtx.drawImage(
                img,
                sourceX, sourceY, sourceWidth, sourceHeight, // 源区域
                0, 0, targetWidth, targetHeight // 目标区域
            );
            
            // 转换为 base64
            const croppedDataUrl = cropCanvas.toDataURL('image/jpeg', 0.8);
            console.log('照片裁剪完成，新尺寸: 720x1024');
            
            resolve(croppedDataUrl);
        };
        
        img.onerror = function() {
            console.error('图片加载失败，返回原始数据');
            resolve(photoDataUrl); // 如果失败，返回原始数据
        };
        
        img.src = photoDataUrl;
    });
}

// 修改generateTryOn函数，使用摄像头拍照
function generateTryOn() {
    // 检查摄像头是否就绪
    try {
        if (!cameraVideo || !cameraCanvas) {
            // 懒加载获取一次，避免首次为 null
            cameraVideo = document.getElementById('camera-video');
            cameraCanvas = document.getElementById('camera-canvas');
        }

        if (!cameraInitialized || !cameraVideo || !cameraVideo.srcObject) {
            appState.showError('摄像头未就绪，请允许摄像头权限或稍后重试');
            return;
        }

        // 开始5秒倒计时
        startCountdown();
    } catch (e) {
        console.error('generateTryOn 执行错误:', e);
        appState.showError('拍照失败，请检查摄像头权限');
    }
}

// 开始倒计时
function startCountdown() {
    const generateBtn = document.getElementById('generate-btn');
    if (!generateBtn) return;

    // 禁用按钮并添加倒计时样式
    generateBtn.disabled = true;
    generateBtn.style.pointerEvents = 'none';
    generateBtn.classList.add('countdown');
    
    let countdown = 5;
    
    // 更新按钮文本
    const updateButtonText = () => {
        generateBtn.textContent = `拍摄倒计时 ${countdown} 秒`;
    };
    
    // 初始显示
    updateButtonText();
    
    // 倒计时动画效果
    const countdownInterval = setInterval(() => {
        countdown--;
        
        if (countdown > 0) {
            updateButtonText();
            
            // 添加脉冲动画效果
            generateBtn.style.transform = 'translateX(-50%) scale(1.1)';
            setTimeout(() => {
                generateBtn.style.transform = 'translateX(-50%) scale(1)';
            }, 150);
        } else {
            // 倒计时结束，开始拍照
            clearInterval(countdownInterval);
            generateBtn.classList.remove('countdown');
            generateBtn.textContent = '正在拍摄...';
            
            // 延迟一点时间让用户看到"正在拍摄"的提示
            setTimeout(() => {
                takePhoto();
            }, 300);
        }
    }, 1000);
}

// 执行拍照
async function takePhoto() {
    try {
        const photoData = await capturePhoto();
        if (!photoData) {
            appState.showError('拍照失败，请重试');
            resetGenerateButton();
            return;
        }

        uploadPhotoToServer(photoData);
    } catch (e) {
        console.error('拍照执行错误:', e);
        appState.showError('拍照失败，请检查摄像头权限');
        resetGenerateButton();
    }
}

// 重置按钮状态
function resetGenerateButton() {
    const generateBtn = document.getElementById('generate-btn');
    if (generateBtn) {
        generateBtn.disabled = false;
        generateBtn.style.pointerEvents = 'auto';
        generateBtn.textContent = 'GENERATE TRY-ON';
        generateBtn.style.transform = 'translateX(-50%)';
        generateBtn.classList.remove('countdown');
    }
}

// 上传照片到服务器和RunningHub
async function uploadPhotoToServer(photoData) {
    try {
        appState.showLoading('正在上传照片（720x1024尺寸）...');
        
        // 将base64转换为Blob
        const response = await fetch(photoData);
        const blob = await response.blob();
        
        console.log(`上传照片信息: 尺寸 720x1024, 文件大小: ${blob.size} bytes`);
        
        // 强制使用 API Server 模式进行上传并创建任务
        console.log('🔍 检查API客户端状态:', {
            hasApiClient: !!window.apiClient,
            hasToken: !!(window.apiClient && window.apiClient.token),
            baseUrl: window.apiClient ? window.apiClient.baseUrl : 'N/A',
            initialized: window.apiClient ? window.apiClient.initialized : false
        });
        
        if (!window.apiClient) {
            console.error('❌ window.apiClient 不存在，尝试重新初始化...');
            await initializeApiClient();
        }
        
        // 强制设置正确的API服务器地址（修复端口配置问题）
        if (window.apiClient && window.apiClient.baseUrl !== 'http://localhost:4001') {
            console.log('🔧 修复API客户端地址配置:', window.apiClient.baseUrl, '-> http://localhost:4001');
            window.apiClient.baseUrl = 'http://localhost:4001';
        }
        
        if (!window.apiClient || !window.apiClient.token) {
            throw new Error('API客户端未初始化或未认证，请先完成设备认证');
        }
        
        console.log('开始上传裁剪后的照片到 API Server 并创建任务...');
        const apiUploadResponse = await window.apiClient.uploadPhotoAndCreateTask(blob);
        console.log('API Server 上传结果:', apiUploadResponse);
        
        if (!apiUploadResponse.success) {
            throw new Error(apiUploadResponse.error || 'API Server 上传失败');
        }
        
        // 保存任务ID和照片信息
        appState.currentTaskId = apiUploadResponse.data.taskId;
        appState.userProfile.photoUrl = photoData; // 保存原始的data URL
        console.log('✅ 任务创建成功，任务ID:', appState.currentTaskId);
        
        appState.hideLoading();
        
        // 重置按钮状态
        resetGenerateButton();
        
        // 跳转到服装选择页面
        await appState.setPage('clothing-page');
        
    } catch (error) {
        console.error('上传照片错误:', error);
        appState.hideLoading();
        appState.showError('照片上传失败: ' + error.message);
        
        // 出错时也要重置按钮状态
        resetGenerateButton();
    }
}

function backToCamera() {
    appState.backToCamera();
}

// 创建全局应用状态实例
const appState = new AppState();

console.log('衣等舱应用已初始化');

