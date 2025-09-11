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
        this.apiBaseUrl = 'http://localhost:3000'; // 本地服务器（保持兼容）
        this.apiServerUrl = 'http://localhost:4001'; // 新的 API Server
        this.currentGender = 'female';
        this.currentCategory = 'tops-bottoms';
        this.currentSubCategory = 'tops';
        this.isDressSelected = false;
        this.configCache = null;
    }

    async setPage(pageId) {
        // 隐藏当前页面
        const currentPageEl = document.getElementById(this.currentPage);
        if (currentPageEl) {
            currentPageEl.classList.remove('active');
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
                break;
            case 'download-page':
                this.generateDownloadQR();
                this.startCountdown();
                break;
        }
    }

    initializeProfilePage() {
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
                    image: item.imageUrl,
                    description: item.description,
                    prompt: item.prompt,
                    youzanUrl: item.youzanUrl
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

    getSelectedClothingInfo() {
        if (this.selectedDress) {
            return {
                type: 'dress',
                item: this.selectedDress.item
            };
        } else if (this.selectedTopBottom) {
            return {
                type: 'topBottom',
                tops: this.selectedTopBottom.tops,
                bottoms: this.selectedTopBottom.bottoms
            };
        }
        return null;
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
                    <img src="${this.selectedDress.item.image}" alt="${this.selectedDress.item.name}" />
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
                        <img src="${this.selectedTopBottom.tops.image}" alt="${this.selectedTopBottom.tops.name}" />
                        <span>${this.selectedTopBottom.tops.name}</span>
                        <span class="item-type">上衣</span>
                    </div>
                `;
            }
            if (this.selectedTopBottom.bottoms) {
                hasSelection = true;
                summaryHTML += `
                    <div class="selected-item-display">
                        <img src="${this.selectedTopBottom.bottoms.image}" alt="${this.selectedTopBottom.bottoms.name}" />
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
            // 优先使用 API Server 任务管理
            if (window.apiClient && window.apiClient.token && this.currentTaskId) {
                await this.startApiServerTask();
            } else {
                // 回退到原有的 RunningHub 直接调用流程
                await this.startLegacyRunningHubTask();
            }

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

            // 启动试穿任务
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

    // 原有的 RunningHub 直接调用流程
    async startLegacyRunningHubTask() {
        // 根据选择情况上传服装图片到RunningHub
        let clothingUploadResults = {};
        
        if (this.lastSelectionType === 'dress') {
            // 选择了裙子，只上传裙子图片
            console.log('选择裙子，上传裙子图片:', this.selectedDress.item.image);
            const dressUploadResponse = await this.uploadImageToRunningHub(this.selectedDress.item.image);
            console.log('裙子图片上传结果:', dressUploadResponse);
            
            if (!dressUploadResponse.success) {
                throw new Error('上传裙子图片失败: ' + dressUploadResponse.error);
            }
            
            // 使用完整的文件名（包含api/前缀）
            const dressFileName = dressUploadResponse.fileUrl;
            clothingUploadResults.dress = dressFileName;
            
        } else if (this.lastSelectionType === 'topBottom') {
            // 选择了上衣/下衣，根据实际选择上传
            const topBottom = this.selectedTopBottom;
            
            if (topBottom.tops) {
                // 上传上衣
                console.log('选择上衣，上传上衣图片:', topBottom.tops.image);
                const topUploadResponse = await this.uploadImageToRunningHub(topBottom.tops.image);
                console.log('上衣图片上传结果:', topUploadResponse);
                
                if (!topUploadResponse.success) {
                    throw new Error('上传上衣图片失败: ' + topUploadResponse.error);
                }
                
                // 使用完整的文件名（包含api/前缀）
                const topFileName = topUploadResponse.fileUrl;
                clothingUploadResults.top = topFileName;
            }
            
            if (topBottom.bottoms) {
                // 上传下衣
                console.log('选择下衣，上传下衣图片:', topBottom.bottoms.image);
                const bottomUploadResponse = await this.uploadImageToRunningHub(topBottom.bottoms.image);
                console.log('下衣图片上传结果:', bottomUploadResponse);
                
                if (!bottomUploadResponse.success) {
                    throw new Error('上传下衣图片失败: ' + bottomUploadResponse.error);
                }
                
                // 使用完整的文件名（包含api/前缀）
                const bottomFileName = bottomUploadResponse.fileUrl;
                clothingUploadResults.bottom = bottomFileName;
            }
        }

        // 启动RunningHub工作流任务
        const taskResponse = await this.startRunningHubTask(
            this.userProfile.fullBodyShotNameInRH,
            clothingUploadResults
        );
        
        if (!taskResponse.success) {
            throw new Error('启动任务失败: ' + taskResponse.error);
        }

        this.currentTask = {
            taskId: taskResponse.taskId,
            status: taskResponse.taskStatus
        };

        // 开始轮询任务状态
        this.pollRunningHubTaskStatus();
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

    // 启动RunningHub工作流任务
    async startRunningHubTask(fullBodyShotNameInRH, clothingUploadResults) {
        try {
            const config = this.getConfig();
            if (!config.runninghub.apiKey) {
                throw new Error('请先配置RunningHub API Key');
            }
            
            // 根据用户选择的服装类型确定使用的工作流ID
            let workflowId;
            if (clothingUploadResults.dress || (clothingUploadResults.top && !clothingUploadResults.bottom)) {
                // 裙子或单上衣：使用单件工作流
                workflowId = config.runninghub.singleItemWorkflowId;
                if (!workflowId) {
                    throw new Error('请先配置单件服装工作流ID (singleItemWorkflowId)');
                }
            } else if (clothingUploadResults.top && clothingUploadResults.bottom) {
                // 上衣+下衣：使用上衣下衣工作流
                workflowId = config.runninghub.topBottomWorkflowId;
                if (!workflowId) {
                    throw new Error('请先配置上衣下衣工作流ID (topBottomWorkflowId)');
                }
            } else {
                throw new Error('未检测到有效的服装选择');
            }
            
            // 验证配置
            console.log('🔍 配置验证:', {
                apiKey: config.runninghub.apiKey ? `${config.runninghub.apiKey.substring(0, 8)}...` : '未设置',
                workflowId: workflowId,
                baseUrl: config.runninghub.baseUrl,
                clothingType: clothingUploadResults.dress ? '裙子' : (clothingUploadResults.top && clothingUploadResults.bottom ? '上衣+下衣' : '单上衣')
            });

            // 构造nodeInfoList
            const nodeInfoList = [
                {
                    nodeId: "254", // 用户照片输入节点
                    fieldName: "image",
                    fieldValue: fullBodyShotNameInRH
                }
            ];

            // 根据上传的服装类型添加对应的节点
            if (clothingUploadResults.dress) {
                // 裙子：nodeId为253
                nodeInfoList.push({
                    nodeId: "253",
                    fieldName: "image",
                    fieldValue: clothingUploadResults.dress
                });
            } else {
                // 上衣/下衣
                if (clothingUploadResults.top) {
                    // 上衣：nodeId为253
                    nodeInfoList.push({
                        nodeId: "253",
                        fieldName: "image",
                        fieldValue: clothingUploadResults.top
                    });
                }
                if (clothingUploadResults.bottom) {
                    // 下衣：nodeId为300
                    nodeInfoList.push({
                        nodeId: "300",
                        fieldName: "image",
                        fieldValue: clothingUploadResults.bottom
                    });
                }
            }

            // 构造任务参数 - 尝试不同的格式
            const taskData = {
                apiKey: config.runninghub.apiKey,
                workflowId: workflowId,
                nodeInfoList: nodeInfoList
            };
            
            // 也尝试另一种可能的格式
            const alternativeTaskData = {
                api_key: config.runninghub.apiKey,
                workflow_id: workflowId,
                node_info_list: nodeInfoList
            };
            
            console.log('🔍 尝试格式1 (驼峰命名):', JSON.stringify(taskData, null, 2));
            console.log('🔍 尝试格式2 (下划线命名):', JSON.stringify(alternativeTaskData, null, 2));

            console.log('启动RunningHub任务，参数:', taskData);
            console.log('nodeInfoList 详细内容:', JSON.stringify(nodeInfoList, null, 2));

            // 调用RunningHub启动任务接口
            // 尝试多个可能的API端点
            const possibleUrls = [
                'https://www.runninghub.cn/task/openapi/create',
                'https://www.runninghub.cn/api/task/create',
                'https://www.runninghub.cn/openapi/task/create',
                'https://api.runninghub.cn/task/create'
            ];
            const apiUrl = possibleUrls[0]; // 先尝试第一个
            console.log('📤 启动任务请求数据:', {
                url: apiUrl,
                method: 'POST',
                headers: {
                    'Host': 'www.runninghub.cn',
                    'Content-Type': 'application/json'
                },
                body: taskData
            });

            // 尝试不同的API请求格式
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(taskData)
            });

            console.log('📊 HTTP响应状态:', response.status, response.statusText);
            console.log('📊 响应头:', Object.fromEntries(response.headers.entries()));
            
            const result = await response.json();
            console.log('📥 RunningHub任务创建响应:', JSON.stringify(result, null, 2));
            
            // 检查HTTP状态码
            if (!response.ok) {
                console.error('❌ HTTP请求失败:', {
                    status: response.status,
                    statusText: response.statusText,
                    response: result
                });
                return {
                    success: false,
                    error: `HTTP ${response.status}: ${response.statusText} - ${result.msg || '请求失败'}`
                };
            }
            
            // 检查多种可能的成功响应格式
            if ((result.code === 0 || result.success === true || result.success === 'success') && result.data) {
                console.log('✅ 启动任务成功，任务ID:', result.data.taskId);
                
                // 检查是否有节点错误
                if (result.data.promptTips) {
                    try {
                        const promptTips = JSON.parse(result.data.promptTips);
                        console.log('📋 任务提示信息:', promptTips);
                        
                        if (promptTips.node_errors && Object.keys(promptTips.node_errors).length > 0) {
                            console.error('❌ 工作流节点错误:', promptTips.node_errors);
                            
                            // 提取错误信息
                            const errors = [];
                            for (const [nodeId, nodeError] of Object.entries(promptTips.node_errors)) {
                                if (nodeError.errors && nodeError.errors.length > 0) {
                                    for (const error of nodeError.errors) {
                                        errors.push(`节点${nodeId}: ${error.details || error.message}`);
                                    }
                                }
                            }
                            
                            if (errors.length > 0) {
                                return {
                                    success: false,
                                    error: '工作流执行错误: ' + errors.join('; ')
                                };
                            }
                        }
                    } catch (e) {
                        console.warn('⚠️ 解析promptTips失败:', e);
                    }
                }
                
                return {
                    success: true,
                    taskId: result.data.taskId,
                    taskStatus: result.data.taskStatus
                };
            } else {
                console.error('❌ 启动任务失败:', {
                    code: result.code,
                    success: result.success,
                    message: result.msg,
                    fullResponse: result
                });
                return {
                    success: false,
                    error: result.msg || '启动任务失败'
                };
            }
        } catch (error) {
            console.error('启动任务错误:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 轮询RunningHub任务状态
    async pollRunningHubTaskStatus() {
        const maxAttempts = 60; // 最多检查5分钟（每5秒一次）
        let attempts = 0;

        console.log('🔄 开始轮询任务状态，任务ID:', this.currentTask.taskId);

        const poll = async () => {
            attempts++;
            console.log(`🔄 第 ${attempts} 次轮询任务状态...`);
            
            try {
                const statusResponse = await this.queryRunningHubTaskStatus(this.currentTask.taskId);
                
                if (statusResponse.success) {
                    const status = statusResponse.taskStatus;
                    this.currentTask.status = status;
                    console.log(`📊 任务状态更新: ${status}`);

                    // 更新进度文本
                    const progressText = document.getElementById('progress-text');
                    if (progressText) {
                        switch(status) {
                            case 'QUEUED':
                            case 'PENDING':
                                progressText.textContent = '任务排队中...';
                                console.log('⏳ 任务排队中，等待执行...');
                                break;
                            case 'RUNNING':
                            case 'PROCESSING':
                                progressText.textContent = '正在生成试衣效果...';
                                console.log('🚀 任务正在执行中...');
                                break;
                            case 'COMPLETED':
                            case 'SUCCESS':
                                progressText.textContent = '生成完成，获取结果中...';
                                console.log('✅ 任务执行完成，开始获取结果...');
                                // 先尝试获取结果，如果结果为空则继续轮询
                                const resultResponse = await this.getRunningHubTaskResult();
                                if (resultResponse && resultResponse.continuePolling) {
                                    // 结果为空，继续轮询
                                    console.log('🔄 结果为空，继续轮询...');
                                    if (attempts < maxAttempts) {
                                        setTimeout(poll, 3000); // 3秒后再次检查
                                    } else {
                                        throw new Error('任务超时，结果获取失败');
                                    }
                                } else {
                                    // 结果获取成功，结束轮询
                                    return;
                                }
                                break;
                            case 'FAILED':
                            case 'ERROR':
                                console.error('❌ 任务执行失败');
                                throw new Error('任务执行失败');
                            default:
                                console.log(`⚠️ 未知任务状态: ${status}`);
                                progressText.textContent = `任务状态: ${status}`;
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

    // 查询RunningHub任务状态
    async queryRunningHubTaskStatus(taskId) {
        try {
            const config = this.getConfig();
            if (!config.runninghub.apiKey) {
                throw new Error('请先配置RunningHub API Key');
            }

            const requestBody = {
                apiKey: config.runninghub.apiKey,
                taskId: taskId
            };

            console.log('📤 查询任务状态请求数据:', {
                url: 'https://www.runninghub.cn/task/openapi/status',
                method: 'POST',
                headers: {
                    'Host': 'www.runninghub.cn',
                    'Content-Type': 'application/json'
                },
                body: requestBody
            });

            const response = await fetch('https://www.runninghub.cn/task/openapi/status', {
                method: 'POST',
                headers: {
                    'Host': 'www.runninghub.cn',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            const result = await response.json();
            console.log('📥 任务状态查询响应:', JSON.stringify(result, null, 2));
            
            // 检查多种可能的成功响应格式
            if ((result.code === 0 || result.success === true || result.success === 'success') && result.data) {
                // 处理不同的data格式
                let taskStatus;
                if (typeof result.data === 'string') {
                    // 如果data是字符串，直接使用
                    taskStatus = result.data;
                } else if (result.data.taskStatus) {
                    // 如果data是对象，使用taskStatus字段
                    taskStatus = result.data.taskStatus;
                } else {
                    // 其他情况，使用data本身
                    taskStatus = result.data;
                }
                
                console.log('✅ 任务状态查询成功:', {
                    taskId: taskId,
                    status: taskStatus,
                    fullResponse: result.data
                });
                return {
                    success: true,
                    taskStatus: taskStatus
                };
            } else {
                console.error('❌ 任务状态查询失败:', {
                    code: result.code,
                    success: result.success,
                    message: result.msg,
                    fullResponse: result
                });
                return {
                    success: false,
                    error: result.msg || '查询状态失败'
                };
            }
        } catch (error) {
            console.error('❌ 查询任务状态错误:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 获取RunningHub任务结果
    async getRunningHubTaskResult() {
        try {
            const config = this.getConfig();
            if (!config.runninghub.apiKey) {
                throw new Error('请先配置RunningHub API Key');
            }

            const requestBody = {
                apiKey: config.runninghub.apiKey,
                taskId: this.currentTask.taskId
            };

            console.log('📤 获取任务结果请求数据:', {
                url: 'https://www.runninghub.cn/task/openapi/outputs',
                method: 'POST',
                headers: {
                    'Host': 'www.runninghub.cn',
                    'Content-Type': 'application/json'
                },
                body: requestBody
            });

            const response = await fetch('https://www.runninghub.cn/task/openapi/outputs', {
                method: 'POST',
                headers: {
                    'Host': 'www.runninghub.cn',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            const result = await response.json();
            console.log('📥 任务结果查询响应:', JSON.stringify(result, null, 2));
            
            // 检查多种可能的成功响应格式
            if ((result.code === 0 || result.success === true || result.success === 'success')) {
                if (result.data && result.data.length > 0) {
                    console.log('✅ 任务结果获取成功:', {
                        taskId: this.currentTask.taskId,
                        resultCount: result.data.length,
                        firstResult: result.data[0],
                        fullResponse: result.data
                    });
                    
                    const imageUrl = result.data[0].fileUrl;
                    console.log('🖼️ 生成的图片URL:', imageUrl);
                    
                    this.hideLoading();
                    this.showResult(imageUrl);
                    return { continuePolling: false }; // 结果获取成功，不需要继续轮询
                } else {
                    console.warn('⚠️ 任务执行成功但结果为空:', {
                        taskId: this.currentTask.taskId,
                        data: result.data,
                        fullResponse: result
                    });
                    
                    // 结果为空，可能任务刚完成，结果还没准备好
                    console.log('🔄 结果为空，需要继续轮询状态等待结果准备...');
                    return { continuePolling: true }; // 结果为空，需要继续轮询
                }
            } else {
                console.error('❌ 任务结果获取失败:', {
                    code: result.code,
                    success: result.success,
                    message: result.msg,
                    data: result.data,
                    fullResponse: result
                });
                throw new Error(result.msg || '获取结果失败');
            }

        } catch (error) {
            console.error('❌ 获取任务结果错误:', error);
            this.hideLoading();
            this.showError('获取试衣结果失败: ' + error.message);
        }
    }



    showResult(imageUrl) {
        // 隐藏加载指示器
        document.getElementById('loading-indicator').style.display = 'none';
        
        // 显示结果图片
        const resultImg = document.getElementById('result-image');
        resultImg.src = imageUrl;
        resultImg.style.display = 'block';
        resultImg.onload = () => {
            resultImg.classList.add('fade-in');
        };

        // 显示操作按钮和风格信息
        document.getElementById('result-actions').style.display = 'flex';
        document.getElementById('style-info').style.display = 'flex';

        // 保存结果图片URL
        this.resultImageUrl = imageUrl;
    }

    async generateDownloadQR() {
        if (!this.resultImageUrl) {
            this.showError('没有可用的试衣结果');
            return;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/generate-download-qr`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    imageUrl: this.resultImageUrl,
                    clothingInfo: this.getSelectedClothingInfo(),
                    openid: this.userProfile.openid
                })
            });

            const data = await response.json();
            
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
const appState = new AppState();

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
    // 模拟获取 openid（实际应用中通过微信 API 获取）
    appState.userProfile.openid = 'user_' + Date.now();
    appState.setPage('profile-page');
}

function openConfigPage() {
    appState.setPage('config-page');
}

function takePicture() {
    document.getElementById('photo-input').click();
}

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

    // 上传文件到服务器
    appState.showLoading('上传照片中...');
    
    try {
        const formData = new FormData();
        formData.append('photo', file);

        const response = await fetch(`${appState.apiBaseUrl}/upload-photo`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        
        if (result.success) {
            appState.userProfile.photoFileName = result.fileName;
            appState.hideLoading();
        } else {
            throw new Error(result.error || '上传失败');
        }

    } catch (error) {
        console.error('上传照片错误:', error);
        appState.hideLoading();
        appState.showError('照片上传失败: ' + error.message);
    }
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

function saveImage() {
    appState.setPage('download-page');
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
        document.getElementById('cfg-wechat-appId').value = cfg.wechat.appId || '';
        document.getElementById('cfg-wechat-appSecret').value = cfg.wechat.appSecret || '';
        document.getElementById('cfg-wechat-token').value = cfg.wechat.token || '';
        document.getElementById('cfg-wechat-encodingAESKey').value = cfg.wechat.encodingAESKey || '';
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

// 测试API连接
async function testApiConnection() {
    const resultDiv = document.getElementById('api-test-result');
    const host = document.getElementById('cfg-server-host').value.trim() || 'localhost';
    const port = document.getElementById('cfg-server-port').value || '4001';
    
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<div style="color: #007bff;">🔄 正在测试连接...</div>';
    
    try {
        const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
        const baseUrl = `${protocol}://${host}:${port}`;
        
        console.log('🧪 测试API连接:', baseUrl);
        
        // 测试健康检查
        const healthResponse = await fetch(`${baseUrl}/health`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!healthResponse.ok) {
            throw new Error(`HTTP ${healthResponse.status}: ${healthResponse.statusText}`);
        }
        
        const healthData = await healthResponse.json();
        console.log('✅ 健康检查成功:', healthData);
        
        // 测试设备认证
        const testMac = 'test-config-' + Date.now();
        const authResponse = await fetch(`${baseUrl}/api/auth/device`, {
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
        console.log('✅ 设备认证成功:', authData);
        
        if (authData.success) {
            // 测试服装分类接口
            const categoriesResponse = await fetch(`${baseUrl}/api/clothes/categories`, {
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authData.token}`
                }
            });
            
            if (categoriesResponse.ok) {
                const categoriesData = await categoriesResponse.json();
                console.log('✅ 服装分类获取成功:', categoriesData);
                
                resultDiv.innerHTML = `
                    <div style="color: #28a745; border: 1px solid #28a745; background: #d4edda; padding: 8px; border-radius: 4px;">
                        ✅ API连接测试成功<br>
                        <small>服务器: ${baseUrl}<br>
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
        console.error('❌ API连接测试失败:', error);
        resultDiv.innerHTML = `
            <div style="color: #dc3545; border: 1px solid #dc3545; background: #f8d7da; padding: 8px; border-radius: 4px;">
                ❌ API连接测试失败<br>
                <small>${error.message}</small><br>
                <small style="color: #6c757d;">请检查服务器地址和端口设置</small>
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
function capturePhoto() {
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

        // 获取照片数据
        const photoData = cameraCanvas.toDataURL('image/jpeg', 0.8);
        
        // 保存到应用状态
        appState.userProfile.photo = photoData;
        appState.userProfile.photoFileName = `photo_${Date.now()}.jpg`;
        
        console.log('照片拍摄成功');
        return photoData;
    } catch (error) {
        console.error('拍照失败:', error);
        return null;
    }
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
function takePhoto() {
    try {
        const photoData = capturePhoto();
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
        appState.showLoading('正在上传照片...');
        
        // 将base64转换为Blob
        const response = await fetch(photoData);
        const blob = await response.blob();
        
        // 1. 上传到本地服务器（保持原有逻辑）
        const formData = new FormData();
        formData.append('photo', blob, 'photo.jpg');
        
        const uploadResponse = await fetch(`${appState.apiBaseUrl}/upload-photo`, {
            method: 'POST',
            body: formData
        });
        
        const result = await uploadResponse.json();
        
        if (!result.success) {
            throw new Error(result.error || '本地服务器上传失败');
        }
        
        appState.userProfile.photoFileName = result.fileName;
        appState.userProfile.photoUrl = photoData; // 保存原始的data URL
        
        // 2. 上传到新的 API Server 并创建任务（如果可用）
        if (window.apiClient && window.apiClient.token) {
            try {
                console.log('开始上传照片到 API Server 并创建任务...');
                const apiUploadResponse = await window.apiClient.uploadPhotoAndCreateTask(blob);
                console.log('API Server 上传结果:', apiUploadResponse);
                
                if (apiUploadResponse.success) {
                    // 保存任务ID供后续使用
                    appState.currentTaskId = apiUploadResponse.data.taskId;
                    console.log('任务创建成功，任务ID:', appState.currentTaskId);
                } else {
                    console.warn('API Server 任务创建失败:', apiUploadResponse.error);
                }
            } catch (apiError) {
                console.warn('API Server 上传失败，继续使用本地服务器:', apiError);
            }
        }
        
        // 3. 上传到RunningHub（保持原有逻辑作为备用）
        console.log('开始上传照片到RunningHub...');
        const rhUploadResponse = await appState.uploadImageToRunningHub(photoData);
        console.log('RunningHub上传结果:', rhUploadResponse);
        
        if (rhUploadResponse.success) {
            // 直接使用完整的文件名（包含api/前缀）
            const fileName = rhUploadResponse.fileUrl;
            appState.userProfile.fullBodyShotNameInRH = fileName;
            console.log('RunningHub文件名（完整）:', fileName);
        } else {
            console.warn('RunningHub上传失败，但继续流程:', rhUploadResponse.error);
        }
        
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

console.log('衣等舱应用已初始化');

