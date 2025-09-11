// 简化的Electron渲染器应用 - 只使用API服务器接口
class ClothingSpaceCapsule {
    constructor() {
        this.currentTask = null;
        this.userProfile = null;
        this.selectedDress = null;
        this.selectedTopBottom = null;
        this.lastSelectionType = null;
        
        this.init();
    }

    async init() {
        // 初始化API客户端
        await this.initApiClient();
        this.bindEvents();
    }

    async initApiClient() {
        try {
            // 加载API客户端模块
            const { ApiClient } = await import('./api-client.js');
            window.apiClient = new ApiClient();
            
            // 初始化API客户端
            const initResult = await window.apiClient.init();
            if (!initResult.success) {
                console.error('API客户端初始化失败:', initResult.error);
                this.showError('API服务初始化失败: ' + initResult.error);
                return false;
            }
            
            console.log('✅ API客户端初始化成功');
            return true;
        } catch (error) {
            console.error('API客户端加载失败:', error);
            this.showError('API服务加载失败: ' + error.message);
            return false;
        }
    }

    bindEvents() {
        // 绑定UI事件
        document.getElementById('start-tryon-btn').addEventListener('click', () => {
            this.startTryonProcess();
        });
        
        // 其他事件绑定...
    }

    async startTryonProcess() {
        this.showLoading('正在生成试衣效果...', '这可能需要几分钟时间，请耐心等待');

        try {
            // 使用 API Server 任务管理
            if (!window.apiClient || !window.apiClient.token) {
                throw new Error('API客户端未初始化，请先完成设备认证');
            }
            
            if (!this.userProfile.photoUrl) {
                throw new Error('用户照片未上传，请先上传全身照');
            }
            
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
            // 获取选中的衣服ID
            let clothesId = null;
            if (this.selectedDress) {
                clothesId = this.selectedDress.item.id;
            } else if (this.selectedTopBottom && this.selectedTopBottom.tops) {
                clothesId = this.selectedTopBottom.tops.id;
            }

            if (!clothesId) {
                throw new Error('未选择有效的服装');
            }

            // 第一步：上传照片并创建初始任务
            const uploadResponse = await window.apiClient.uploadPhotoAndCreateTask(
                this.userProfile.photoUrl
            );

            if (!uploadResponse.success) {
                throw new Error(uploadResponse.error || '上传照片创建任务失败');
            }

            // 第二步：启动试穿任务
            const taskResponse = await window.apiClient.startTryonTask(
                uploadResponse.data.taskId,
                clothesId
            );

            if (!taskResponse.success) {
                throw new Error(taskResponse.error || '启动试穿任务失败');
            }

            this.currentTask = {
                taskId: uploadResponse.data.taskId,
                status: taskResponse.data.status,
                runninghubTaskId: taskResponse.data.runninghubTaskId
            };

            // 开始轮询任务状态
            this.pollApiServerTaskStatus();

        } catch (error) {
            console.error('API Server 任务创建失败:', error);
            this.hideLoading();
            this.showError('试衣任务创建失败: ' + error.message);
        }
    }

    async pollApiServerTaskStatus() {
        const maxAttempts = 60; // 最多检查5分钟（每5秒一次）
        let attempts = 0;

        console.log('🔄 开始轮询API服务器任务状态，任务ID:', this.currentTask.taskId);

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

    // UI辅助方法
    showLoading(title, message) {
        console.log('显示加载中:', title, message);
        // 实现加载UI显示逻辑
    }

    hideLoading() {
        console.log('隐藏加载中');
        // 实现加载UI隐藏逻辑
    }

    showError(message) {
        console.error('显示错误:', message);
        // 实现错误提示逻辑
    }

    showResult(resultUrl) {
        console.log('显示结果:', resultUrl);
        // 实现结果展示逻辑
    }
}

// 启动应用
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ClothingSpaceCapsule();
});