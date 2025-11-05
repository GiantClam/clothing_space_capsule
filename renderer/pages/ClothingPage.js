/**
 * ClothingPage - 服装选择页面
 * 
 * 功能：
 * - 显示服装选择界面
 * - 支持性别切换（男装/女装）
 * - 支持服装类别切换（上衣+下衣/连衣裙）
 * - 服装选择和预览
 * - 启动试衣流程
 * 
 * 生命周期：
 * - onEnter: 加载服装数据，初始化UI状态
 * - onLeave: 清理定时器和临时数据
 */

class ClothingPage {
    constructor() {
        this.pageId = window.APP_CONSTANTS.PAGES.CLOTHING;
        this.initialized = false;
        
        // 当前状态
        this.currentGender = 'female'; // 'male' | 'female'
        
        this.selectedClothing = {
            tops: null,
            bottoms: null
        };
        
        // 服装数据
        this.clothingData = {
            male: {
                tops: [],
                bottoms: []
            },
            female: {
                tops: [],
                bottoms: []
            }
        };
        
        // 试衣状态检查定时器
        this.tryOnStatusCheckTimer = null;
        
        // 分页配置
        this.pagination = {
            page: 1,
            limit: 20,  // 每页加载20个
            total: 0,
            hasMore: true
        };
        this.isLoadingMore = false; // 是否正在加载更多
        this.currentCategory = null; // 当前打开的弹窗类别
        this.modalClickHandler = null; // 保存弹窗点击事件处理函数
    }

    /**
     * 分类名称标准化映射
     */
    CATEGORY_MAPPING = {
        // 性别映射
        gender: {
            '男': 'male',
            '男装': 'male',
            '女': 'female',
            '女装': 'female'
        },
        
        // 服装分类映射（统一命名）
        category: {
            // 上衣类
            '外套': 'tops',
            '上衣': 'tops',
            '衬衫': 'tops',
            'T恤': 'tops',
            '连衣裙': 'tops',
            
            // 下装类
            '裤子': 'bottoms',
            '下衣': 'bottoms',
            '牛仔裤': 'bottoms',
            '长裤': 'bottoms',
            '短裤': 'bottoms',
            
            // 裙装类
            '裙子': 'tops',
            '半身裙': 'tops'
        },
        
        // 通过parent ID识别性别和分类
        parentCategory: {
            // 男装
            'cmfy12rkjhdasoiyew98r': { gender: 'male', category: 'bottoms' },   // 男装下衣
            'cmfyz28sn0002clxwe55fd2x5': { gender: 'male', category: 'tops' },   // 男装上衣
            
            // 女装
            'cmfy12rkjhdasoiyew99r': { gender: 'female', category: 'bottoms' },  // 女装下衣
            'cmfy12rkjhdasoiyew100r': { gender: 'female', category: 'tops' }     // 女装上衣
        }
    };

    /**
     * 标准化服装数据（确保性别和分类正确）
     * @param {Object} item - 原始服装数据项
     * @returns {Object} 标准化后的服装数据项
     */
    normalizeClothingData(item) {
        const genderName = item.category?.parent?.name;
        const categoryName = item.category?.name;
        const parentId = item.category?.parent?.id;
        
        // 首先尝试通过parent ID识别性别和分类
        let gender = null;
        let category = null;
        
        if (parentId && this.CATEGORY_MAPPING.parentCategory[parentId]) {
            const parentInfo = this.CATEGORY_MAPPING.parentCategory[parentId];
            gender = parentInfo.gender;
            category = parentInfo.category;
            
            console.log(`🆔 通过parent ID识别: ${parentId} → ${gender}.${category}`);
        } else {
            // 回退到原来的名称映射方式
            // 映射性别
            gender = this.CATEGORY_MAPPING.gender[genderName] || 'female';
            
            // 映射分类
            category = this.CATEGORY_MAPPING.category[categoryName] || 'tops';
            
            console.log(`🔤 通过名称识别: ${genderName}.${categoryName} → ${gender}.${category}`);
        }
        
        return { ...item, gender, category };
    }

    /**
     * 初始化页面
     */
    async initialize() {
        console.log('👔 初始化服装选择页面');
        
        // 监听服装选择事件
        window.eventBus.on(window.APP_CONSTANTS.EVENTS.CLOTHING_SELECTED, (data) => {
            console.log('✅ 服装已选择:', data);
        });
        
        this.initialized = true;
    }

    /**
     * 页面进入时调用
     */
    async onEnter(data = {}) {
        console.log('📍 进入服装选择页面', data);
        
        if (!this.initialized) {
            await this.initialize();
        }

        // 如果是推荐模式，直接显示推荐结果
        if (data.mode === 'recommended' && data.outfit) {
            await this.showRecommendedOutfit(data.outfit);
        } else {
            // 个性换装模式，加载服装列表
            await this.loadClothingData();
        }
        
        // 初始化UI状态
        this.updateGenderUI();
        this.renderPreviewClothing();
    }

    /**
     * 页面离开时调用
     */
    async onLeave() {
        console.log('📍 离开服装选择页面');
        
        // 停止试衣状态检查
        this.stopTryOnStatusCheck();
    }

    /**
     * 转换图片URL（相对路径 → 完整URL）
     * @param {string} relativePath - 相对路径（如 /female/skirts/12.png）
     * @returns {string} 完整的图片URL
     */
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
        
        // 添加COS_FOLDER前缀
        const COS_FOLDER = 'clothinges/';
        
        // 使用CDN域名构建完整的URL
        return `https://clothing.0086studios.xyz/${COS_FOLDER}${cleanPath}`;
    }

    /**
     * 加载服装数据（预览用，加载少量数据）
     */
    async loadClothingData() {
        try {
            window.loading.show('正在加载服装数据...', '请稍候');
            
            // 预览区域只加载少量数据
            const response = await window.apiClient.getClothingList({
                limit: 6  // 预览区域每个分类只显示3个，总共6个足够
            });
            
            if (response.success && response.data) {
                // 检查API返回的数据结构
                console.log('👔 API返回的服装数据:', response.data);
                
                // 处理不同的数据格式
                if (response.data.clothes && Array.isArray(response.data.clothes)) {
                    // API返回格式: {clothes: [...], pagination: {...}}
                    console.log('🔄 转换服装数据结构...');
                    this.clothingData = this.transformClothingData(response.data.clothes);
                } else if (Array.isArray(response.data)) {
                    // API返回格式: [...]
                    console.log('🔄 转换服装数据结构...');
                    this.clothingData = this.transformClothingData(response.data);
                } else if (response.data.male || response.data.female) {
                    // 如果已经是按性别分组的格式，直接使用
                    this.clothingData = response.data;
                } else {
                    console.warn('⚠️ 未知的服装数据格式，使用默认空数据');
                }
                
                console.log('👔 转换后的服装数据:', this.clothingData);
                this.renderPreviewClothing();
            } else {
                throw new Error(response.error || '加载服装数据失败');
            }
            
            window.loading.hide();
            
        } catch (error) {
            console.error('❌ 加载服装数据失败:', error);
            window.loading.hide();
            window.notification.error('加载服装失败，请重试');
        }
    }
    
    /**
     * 转换服装数据格式（从API数组转为按性别分组）
     */
    transformClothingData(clothingArray) {
        const result = {
            male: {
                tops: [],
                bottoms: []
            },
            female: {
                tops: [],
                bottoms: []
            }
        };
        
        clothingArray.forEach(item => {
            // 使用标准化函数处理服装数据
            const normalizedItem = this.normalizeClothingData(item);
            
            const gender = normalizedItem.gender;
            const category = normalizedItem.category;
            
            // 构造标准化的服装对象
            const clothingItem = {
                id: item.id,
                name: item.name,
                image: item.imageUrl,
                description: item.description,
                price: item.price,
                category: item.category?.name,
                gender: item.category?.parent?.name,
                purchaseUrl: item.purchaseUrl
            };
            
            // 添加到对应的分类中
            if (result[gender] && result[gender][category]) {
                result[gender][category].push(clothingItem);
            }
            
            console.log(`📦 ${gender} - ${category}:`, clothingItem.name);
        });
        
        return result;
    }

    /**
     * 显示推荐穿搭
     */
    async showRecommendedOutfit(outfit) {
        console.log('💡 显示推荐穿搭:', outfit);
        
        // 自动选择推荐的服装
        if (outfit.dress) {
            this.currentCategory = 'dress';
            this.selectedDress = outfit.dress;
        } else {
            this.currentCategory = 'separate';
            this.selectedTop = outfit.top;
            this.selectedBottom = outfit.bottom;
        }
        
        // 更新UI显示
        this.updateCategoryUI();
        this.renderClothingList();
    }

    /**
     * 渲染服装列表
     */
    renderClothingList() {
        // 这个方法不再需要，由renderPreviewClothing和renderModalClothing替代
        console.log('⚠️ renderClothingList 已废弃');
    }

    /**
     * 渲染预览区域的服装（默认显示最新的三件）
     */
    renderPreviewClothing() {
        const genderData = this.clothingData[this.currentGender];
        
        if (!genderData) {
            console.warn('⚠️ 服装数据尚未加载，跳过预览渲染');
            return;
        }
        
        // 渲染上衣预览
        this.renderCategoryPreview('tops', genderData.tops);
        
        // 渲染下衣预览
        this.renderCategoryPreview('bottoms', genderData.bottoms);
    }
    
    /**
     * 渲染单个分类的预览
     */
    /**
     * 渲染单个分类的预览（只显示3个）
     */
    renderCategoryPreview(category, clothingList) {
        const containerId = category === 'tops' ? 'tops-preview-container' : 'bottoms-preview-container';
        const container = document.getElementById(containerId);
        
        if (!container) {
            console.error(`❌ 找不到容器: ${containerId}`);
            return;
        }
        
        // 只显示最新3个项
        const itemsToShow = clothingList.slice(0, 3);
        
        console.log(`🎨 渲染${category}分类预览:`, {
            total: clothingList.length,
            showing: itemsToShow.length
        });
        
        // 清空容器
        container.innerHTML = '';
        
        // 渲染服装项
        itemsToShow.forEach((item, index) => {
            const itemEl = document.createElement('div');
            itemEl.className = `clothing-item-preview ${this.selectedClothing[category]?.id === item.id ? 'selected' : ''}`;
            itemEl.setAttribute('data-category', category);
            itemEl.setAttribute('data-index', index);
            
            const imageUrl = this.getImageUrl(item.image);
            itemEl.innerHTML = `
                <div class="clothing-item-image-placeholder" style="
                    background-image: url(${imageUrl});
                    background-size: cover;
                    background-position: center;
                    width: 100%;
                    height: 100%;
                "></div>
            `;
            
            container.appendChild(itemEl);
        });
        
        console.log(`✅ 已渲染${itemsToShow.length}个${category}衣服预览项`);
    }
    
    /**
     * 打开服装选择弹窗（点击clothing-section时调用）
     */
    async openClothingModal(category) {
        console.log(`👇 打开${category}弹窗`);
        
        // 重置分页状态
        this.pagination = {
            page: 1,
            limit: 20,
            total: 0,
            hasMore: true
        };
        this.currentCategory = category;
        this.isLoadingMore = false;
        
        // 设置弹窗标题
        const modalTitle = document.getElementById('modal-section-title');
        if (modalTitle) {
            modalTitle.textContent = category === 'tops' ? '上 衣' : '下 衣';
        }
        
        // 设置弹窗图标（根据类别动态切换）
        const modalIconCircle = document.querySelector('.modal-section-icon-circle');
        if (modalIconCircle) {
            modalIconCircle.classList.remove('tops-icon', 'bottoms-icon');
            modalIconCircle.classList.add(category === 'tops' ? 'tops-icon' : 'bottoms-icon');
        }
        
        // 显示加载提示
        const container = document.getElementById('modal-clothing-grid');
        if (container) {
            container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #666;">加载中...</div>';
        }
        
        // 显示弹窗
        const modal = document.getElementById('clothing-modal');
        if (modal) {
            modal.classList.add('show');
            this.setupModalClickOutside(modal);
            
            // 设置滚动加载
            this.setupScrollLoading(container);
        } else {
            console.error('❌ 找不到弹窗元素 #clothing-modal');
            return;
        }
        
        // 加载第一页数据
        await this.loadMoreClothing();
    }
    
    /**
     * 设置点击弹窗外区域关闭功能
     */
    setupModalClickOutside(modal) {
        // 移除之前的事件监听（避免重复添加）
        if (this.modalClickHandler) {
            modal.removeEventListener('click', this.modalClickHandler);
        }
        
        // 创建新的事件处理函数
        this.modalClickHandler = (e) => {
            // 如果点击的是 modal-clothing-section 或其子元素，不关闭弹窗
            const clothingSection = modal.querySelector('.modal-clothing-section');
            if (clothingSection && (e.target === clothingSection || clothingSection.contains(e.target))) {
                console.log('👆 点击了服装区域内部，不关闭弹窗');
                return;
            }
            
            // 点击了弹窗外区域，关闭弹窗
            console.log('👆 点击了弹窗外区域，关闭弹窗');
            this.closeClothingModal();
        };
        
        // 添加事件监听
        modal.addEventListener('click', this.modalClickHandler);
        console.log('✅ 已设置点击弹窗外区域关闭功能');
    }
    
    /**
     * 渲染弹窗中的服装列表
     */
    renderModalClothing(category, clothingList) {
        const container = document.getElementById('modal-clothing-grid');
        if (!container) {
            console.error('❌ 找不到弹窗容器');
            return;
        }
        
        // 清空容器
        container.innerHTML = '';
        
        if (clothingList.length === 0) {
            container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #666;">暂无数据</div>';
            return;
        }
        
        // 渲染所有服装项
        clothingList.forEach((item, index) => {
            const itemEl = document.createElement('div');
            itemEl.className = `modal-clothing-item ${this.selectedClothing[category]?.id === item.id ? 'selected' : ''}`;
            itemEl.setAttribute('data-category', category);
            itemEl.setAttribute('data-index', index);
            
            itemEl.onclick = () => this.selectClothingFromModal(category, index);
            
            const imageUrl = this.getImageUrl(item.image);
            itemEl.innerHTML = `
                <img src="${imageUrl}" alt="${item.name}" style="width: 100%; height: 100%; object-fit: cover;">
            `;
            
            container.appendChild(itemEl);
        });
        
        console.log(`✅ 弹窗已渲染${clothingList.length}个${category}衣服项`);
    }
    
    /**
     * 从弹窗中选择服装
     */
    selectClothingFromModal(category, index) {
        const genderData = this.clothingData[this.currentGender];
        if (!genderData) return;
        
        const clothingList = genderData[category];
        if (!clothingList || !clothingList[index]) return;
        
        // 选中服装
        this.selectedClothing[category] = clothingList[index];
        console.log(`✅ 选择${category === 'tops' ? '上衣' : '下衣'}:`, clothingList[index].name);
        
        // 关闭弹窗
        this.closeClothingModal();
        
        // 刷新预览
        this.renderPreviewClothing();
    }
    
    /**
     * 关闭服装选择弹窗
     */
    closeClothingModal() {
        const modal = document.getElementById('clothing-modal');
        if (modal) {
            modal.classList.remove('show');
            
            // 移除点击事件监听
            if (this.modalClickHandler) {
                modal.removeEventListener('click', this.modalClickHandler);
                this.modalClickHandler = null;
            }
            
            // 移除滚动事件监听
            const container = document.getElementById('modal-clothing-grid');
            if (container && this.scrollHandler) {
                container.removeEventListener('scroll', this.scrollHandler);
                this.scrollHandler = null;
            }
            
            console.log('✅ 弹窗已关闭');
        }
    }

    /**
     * 切换性别
     */
    switchGender(gender) {
        if (this.currentGender === gender) return;
        
        console.log(`🔄 切换性别: ${this.currentGender} -> ${gender}`);
        this.currentGender = gender;
        
        // 切换性别时重置选择
        this.resetSelection();
        
        // 更新UI
        this.updateGenderUI();
        this.renderPreviewClothing();
    }

    /**
     * 重置选择
     */
    resetSelection() {
        this.selectedClothing = {
            tops: null,
            bottoms: null
        };
    }

    /**
     * 更新性别UI状态
     */
    updateGenderUI() {
        // 更新性别按钮激活状态
        document.querySelectorAll('.gender-tab').forEach(btn => {
            const gender = btn.getAttribute('data-gender');
            if (gender === this.currentGender) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // 更新tab容器的class（控制滑块位置）
        const genderTabs = document.querySelector('.gender-tabs');
        if (genderTabs) {
            if (this.currentGender === 'male') {
                genderTabs.classList.add('male-active');
            } else {
                genderTabs.classList.remove('male-active');
            }
        }
        
        // 更新弹窗中的性别按钮
        document.querySelectorAll('.modal-gender-tab').forEach(btn => {
            const gender = btn.getAttribute('data-gender');
            if (gender === this.currentGender) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // 更新弹窗tab容器的class（控制滑块位置）
        const modalGenderTabs = document.querySelector('.modal-gender-tabs');
        if (modalGenderTabs) {
            if (this.currentGender === 'male') {
                modalGenderTabs.classList.add('male-active');
            } else {
                modalGenderTabs.classList.remove('male-active');
            }
        }
    }

    /**
     * 开始试衣
     */
    async startTryOn() {
        console.log('👗 点击开始试衣按钮');
        
        try {
            // 验证是否已选择服装
            console.log('🔍 当前选择的服装:', {
                tops: this.selectedClothing.tops,
                bottoms: this.selectedClothing.bottoms
            });
            
            if (!this.validateSelection()) {
                console.warn('⚠️ 验证失败：未选择完整服装');
                
                // 检查window.notification是否存在
                if (window.notification) {
                    window.notification.warning('请先选择上衣和下衣');
                } else {
                    console.error('❌ window.notification 不存在');
                    alert('请先选择上衣和下衣');
                }
                return;
            }
            
            console.log('🎨 开始试衣流程，选择的服装:', {
                tops: this.selectedClothing.tops,
                bottoms: this.selectedClothing.bottoms
            });
            
            // 获取服装ID
            const topClothesId = this.selectedClothing.tops?.id;
            const bottomClothesId = this.selectedClothing.bottoms?.id;
            
            console.log('🔑 服装ID:', { topClothesId, bottomClothesId });
            
            // 检查是否有任务ID
            console.log('📋 检查appState:', {
                exists: !!window.appState,
                currentTaskId: window.appState?.currentTaskId,
                qrSceneStr: window.appState?.qrSceneStr
            });
            
            if (!window.appState) {
                throw new Error('window.appState 不存在');
            }
            
            if (!window.appState.currentTaskId) {
                throw new Error('未找到任务ID，请重新上传照片');
            }
            
            console.log('🚀 启动试穿任务:', {
                taskId: window.appState.currentTaskId,
                topClothesId: topClothesId,
                bottomClothesId: bottomClothesId,
                sceneStr: window.appState.qrSceneStr
            });
            
            // 检查apiClient是否存在
            if (!window.apiClient) {
                throw new Error('window.apiClient 不存在');
            }
            
            console.log('🌐 调用API启动试穿任务...');
            
            // 获取登录方式
            const loginType = localStorage.getItem('loginType') || 'wechat';
            console.log('🔑 使用登录方式:', loginType);
            
            // ⚠️ 先调用API，成功后再跳转页面（避免积分不足时已经跳转）
            const taskResponse = await window.apiClient.startTryonTask(
                window.appState.currentTaskId,
                topClothesId,
                bottomClothesId,
                window.appState.qrSceneStr,
                loginType
            );
            
            console.log('📦 API响应:', taskResponse);
            
            if (!taskResponse.success) {
                throw new Error(taskResponse.error || '启动试穿任务失败');
            }
            
            console.log('✅ API Server 试穿任务启动成功:', taskResponse.data);
            
            // 保存任务信息
            window.appState.currentTask = {
                taskId: window.appState.currentTaskId,
                status: taskResponse.data.status
            };
            
            // 检查pageManager是否存在
            if (!window.pageManager) {
                throw new Error('window.pageManager 不存在');
            }
            
            console.log('📍 尝试跳转到等待页面...');
            
            // API调用成功，跳转到等待页面
            await window.pageManager.navigateTo(window.APP_CONSTANTS.PAGES.FITTING_PROGRESS);
            
            console.log('✅ 已跳转到等待页面');
            console.log('⏰ 开始轮询任务状态...');
            
            // 开始轮询任务状态
            this.startTryOnStatusCheck();
            
        } catch (error) {
            console.error('❌ 开始试衣失败:', error);
            console.error('❌ 错误堆栈:', error.stack);
            
            // 处理积分相关错误
            if (error.message && error.message.includes('积分不足')) {
                console.log('❌ 积分不足，提示用户充值');
                if (window.notification) {
                    window.notification.error('积分不足，请充值后再试！');
                } else {
                    alert('积分不足，请充值后再试！');
                }
                // 返回衣服选择页
                if (window.pageManager) {
                    await window.pageManager.navigateTo(window.APP_CONSTANTS.PAGES.CLOTHING);
                }
                return;
            }
            
            if (error.message && error.message.includes('积分系统异常')) {
                console.log('❌ 积分接口异常，提示用户稍后重试');
                if (window.notification) {
                    window.notification.error('积分系统异常，请稍后重试');
                } else {
                    alert('积分系统异常，请稍后重试');
                }
                // 返回衣服选择页
                if (window.pageManager) {
                    await window.pageManager.navigateTo(window.APP_CONSTANTS.PAGES.CLOTHING);
                }
                return;
            }
            
            // 如果是任务状态不正确的错误，清理状态
            if (error.message && error.message.includes('任务状态不正确')) {
                console.log('🧹 检测到任务状态错误，清理旧任务状态');
                this.cleanupTaskState();
                
                if (window.notification) {
                    window.notification.error('任务状态异常，请重新上传照片');
                } else {
                    alert('任务状态异常，请重新上传照片');
                }
                
                // 返回照片确认页面，让用户重新上传照片
                if (window.pageManager) {
                    await window.pageManager.navigateTo(window.APP_CONSTANTS.PAGES.PHOTO_CONFIRM);
                }
            } else {
                // 其他错误，返回衣服选择页面
                if (window.notification) {
                    window.notification.error('试衣失败: ' + error.message);
                } else {
                    alert('试衣失败: ' + error.message);
                }
                
                if (window.pageManager) {
                    await window.pageManager.navigateTo(window.APP_CONSTANTS.PAGES.CLOTHING);
                }
            }
        }
    }

    /**
     * 验证服装选择
     */
    validateSelection() {
        // 必须选择上衣和下衣
        return this.selectedClothing.tops !== null;
    }

    /**
     * 开始试衣状态检查
     */
    startTryOnStatusCheck() {
        // 先清除之前的定时器
        this.stopTryOnStatusCheck();
        
        const maxAttempts = 60; // 最多检查5分钟（每5秒一次）
        let attempts = 0;
        
        console.log('⏰ 开始轮询试穿任务状态，任务ID:', window.appState.currentTaskId);
        
        // 每5秒检查一次
        this.tryOnStatusCheckTimer = setInterval(async () => {
            attempts++;
            console.log(`🔄 第 ${attempts} 次轮询任务状态...`);
            
            // 检查是否超时
            if (attempts >= maxAttempts) {
                console.error('❌ 任务轮询超时');
                this.stopTryOnStatusCheck();
                
                // 清理任务状态，允许重新创建任务
                console.log('🧹 清理超时任务状态，taskId:', window.appState.currentTaskId);
                this.cleanupTaskState();
                
                window.notification.error('试衣任务超时，请重新上传照片');
                
                // 返回照片确认页面，让用户重新上传照片
                await window.pageManager.navigateTo(window.APP_CONSTANTS.PAGES.PHOTO_CONFIRM);
                return;
            }
            
            try {
                const response = await window.apiClient.getTaskStatus(window.appState.currentTaskId);
                
                if (response.success) {
                    const status = response.data.status;
                    console.log(`📊 任务状态: ${status}`, response.data);
                    
                    // 支持大小写两种格式
                    const statusUpper = status.toUpperCase();
                    
                    if (statusUpper === 'COMPLETED' || statusUpper === 'SUCCESS') {
                        // 试衣完成
                        console.log('✅ 试衣任务完成，结果:', response.data);
                        this.stopTryOnStatusCheck();
                        
                        // 通知进度条跳到100%
                        if (window.fittingProgressPage) {
                            console.log('🎯 通知进度条跳到100%');
                            window.fittingProgressPage.onTaskCompleted();
                        }
                        
                        // 等待一小段时间让用户看到100%的进度
                        await new Promise(resolve => setTimeout(resolve, 800));
                        
                        // 保存结果URL
                        const resultUrl = response.data.resultUrl || response.data.result_url || response.data.imageUrl;
                        window.appState.tryOnResultUrl = resultUrl;
                        
                        console.log('🖼️ 试衣结果URL:', resultUrl);
                        
                        if (!resultUrl) {
                            console.warn('⚠️ 任务完成但未找到结果URL');
                            window.notification.warning('任务完成，但未找到结果图片');
                        }
                        
                        // 跳转到结果页面
                        console.log('👉 跳转到结果页面...');
                        await window.pageManager.navigateTo(
                            window.APP_CONSTANTS.PAGES.RESULTS,
                            { 
                                resultUrl: resultUrl,
                                taskData: response.data 
                            }
                        );
                        
                    } else if (statusUpper === 'FAILED' || statusUpper === 'ERROR') {
                        // 试衣失败
                        console.error('❌ 试衣任务失败:', response.data.error || response.data.message);
                        this.stopTryOnStatusCheck();
                        
                        // 清理失败的任务状态
                        console.log('🧹 清理失败任务状态，taskId:', window.appState.currentTaskId);
                        this.cleanupTaskState();
                        
                        window.notification.error('试衣失败: ' + (response.data.error || response.data.message || '未知错误') + '，请重新上传照片');
                        
                        // 返回照片确认页面
                        await window.pageManager.navigateTo(window.APP_CONSTANTS.PAGES.PHOTO_CONFIRM);
                    } else {
                        // 其他状态（PENDING, QUEUED, PROCESSING）继续轮询
                        console.log(`⏳ 任务进行中: ${status}`);
                    }
                }
                
            } catch (error) {
                console.error('❌ 检查试衣状态失败:', error);
                // 继续轮询，除非超时
            }
        }, 5000);
    }

    /**
     * 停止试衣状态检查
     */
    stopTryOnStatusCheck() {
        if (this.tryOnStatusCheckTimer) {
            clearInterval(this.tryOnStatusCheckTimer);
            this.tryOnStatusCheckTimer = null;
            console.log('⏰ 停止试衣状态检查');
        }
    }

    /**
     * 清理任务状态
     */
    cleanupTaskState() {
        console.log('🧹 清理任务状态');
        
        // 清理任务ID
        window.appState.currentTaskId = null;
        window.appState.tryOnTaskId = null;
        window.appState.tryOnResult = null;
        window.appState.tryOnResultUrl = null;
        
        // 清理当前任务信息
        if (window.appState.currentTask) {
            window.appState.currentTask = null;
        }
        
        console.log('✅ 任务状态已清理');
    }

    /**
     * 返回上一页
     */
    async goBack() {
        try {
            console.log('⬅️ 返回上一页');
            await window.pageManager.navigateTo(window.APP_CONSTANTS.PAGES.PREFERENCE);
        } catch (error) {
            console.error('❌ 返回失败:', error);
        }
    }
    
    /**
     * 设置滚动加载
     */
    setupScrollLoading(container) {
        if (!container) return;
        
        // 移除旧的监听器
        if (this.scrollHandler) {
            container.removeEventListener('scroll', this.scrollHandler);
        }
        
        // 添加滚动监听
        this.scrollHandler = async () => {
            if (this.isLoadingMore || !this.pagination.hasMore) return;
            
            const scrollTop = container.scrollTop;
            const scrollHeight = container.scrollHeight;
            const clientHeight = container.clientHeight;
            
            // 距离底部200px时触发加载
            if (scrollHeight - scrollTop - clientHeight < 200) {
                console.log('📥 触发滚动加载');
                await this.loadMoreClothing();
            }
        };
        
        container.addEventListener('scroll', this.scrollHandler);
        console.log('✅ 已设置滚动加载监听');
    }
    
    /**
     * 加载更多服装（分页）
     */
    async loadMoreClothing() {
        if (this.isLoadingMore || !this.pagination.hasMore) {
            console.log('⏸️ 跳过加载:', { isLoadingMore: this.isLoadingMore, hasMore: this.pagination.hasMore });
            return;
        }
        
        this.isLoadingMore = true;
        const container = document.getElementById('modal-clothing-grid');
        
        try {
            console.log(`📥 加载第${this.pagination.page}页数据...`);
            
            // 根据当前性别和分类获取分类 ID
            const categoryId = this.getCategoryId(this.currentGender, this.currentCategory);
            
            const response = await window.apiClient.getClothingList({
                page: this.pagination.page,
                limit: this.pagination.limit,
                categoryId: categoryId  // 根据分类过滤
            });
            
            if (response.success && response.data) {
                const clothes = response.data.clothes || [];
                const pagination = response.data.pagination;
                
                console.log(`✅ 获取到${clothes.length}个服装`, pagination);
                
                // 渲染新数据
                if (this.pagination.page === 1) {
                    // 第一页，清空容器
                    container.innerHTML = '';
                }
                
                // 添加新的服装项
                clothes.forEach((item, index) => {
                    const itemEl = document.createElement('div');
                    itemEl.className = `modal-clothing-item ${this.selectedClothing[this.currentCategory]?.id === item.id ? 'selected' : ''}`;
                    itemEl.setAttribute('data-id', item.id);
                    
                    itemEl.onclick = () => this.selectClothingFromModal(item);
                    
                    const imageUrl = this.getImageUrl(item.imageUrl);
                    itemEl.innerHTML = `
                        <img src="${imageUrl}" alt="${item.name}" style="width: 100%; height: 100%; object-fit: cover;">
                    `;
                    
                    container.appendChild(itemEl);
                });
                
                // 更新分页信息
                this.pagination.page = pagination.page + 1;
                this.pagination.total = pagination.total;
                this.pagination.hasMore = pagination.page < pagination.pages;
                
                console.log(`📊 分页信息:`, this.pagination);
                
                // 如果没有更多数据，显示提示
                if (!this.pagination.hasMore && container.children.length > 0) {
                    const endTip = document.createElement('div');
                    endTip.style.cssText = 'grid-column: 1/-1; text-align: center; padding: 20px; color: #999; font-size: 14px;';
                    endTip.textContent = '已加载全部数据';
                    container.appendChild(endTip);
                }
                
            } else {
                throw new Error(response.error || '加载失败');
            }
            
        } catch (error) {
            console.error('❌ 加载更多服装失败:', error);
            if (container && this.pagination.page === 1) {
                container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #f44;">加载失败，请重试</div>';
            }
        } finally {
            this.isLoadingMore = false;
        }
    }
    
    /**
     * 根据性别和分类获取分类 ID
     */
    getCategoryId(gender, category) {
        // 这里需要根据实际后端数据调整
        const categoryMap = {
            'female-tops': 'cmfy12rkjhdasoiyew100r',    // 女装上衣
            'female-bottoms': 'cmfy12rkjhdasoiyew99r',  // 女装下衣
            'male-tops': 'cmfyz28sn0002clxwe55fd2x5',  // 男装上衣
            'male-bottoms': 'cmfy12rkjhdasoiyew98r'     // 男装下衣
        };
        
        const key = `${gender}-${category}`;
        return categoryMap[key] || null;
    }
    
    /**
     * 从弹窗中选择服装（新版，直接接收item对象）
     */
    selectClothingFromModal(item) {
        if (!item || !this.currentCategory) return;
        
        // 选中服装
        this.selectedClothing[this.currentCategory] = {
            id: item.id,
            name: item.name,
            image: item.imageUrl,
            description: item.description,
            price: item.price,
            purchaseUrl: item.purchaseUrl
        };
        
        console.log(`✅ 选择${this.currentCategory === 'tops' ? '上衣' : '下衣'}:`, item.name);
        
        // 关闭弹窗
        this.closeClothingModal();
        
        // 刷新预览
        this.renderPreviewClothing();
    }
}

// 创建页面实例并注册
const clothingPage = new ClothingPage();
window.clothingPage = clothingPage; // 暴露给全局以便HTML调用
window.pageManager.registerPage(window.APP_CONSTANTS.PAGES.CLOTHING, clothingPage);

// 导出全局方法供HTML调用
window.switchGender = (gender) => clothingPage.switchGender(gender);
window.startTryOn = () => clothingPage.startTryOn();

console.log('✅ ClothingPage 已加载');
