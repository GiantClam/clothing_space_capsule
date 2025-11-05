/**
 * 摄像头工具函数
 */

let cameraStream = null;
let currentDeviceId = null; // 当前使用的摄像头设备ID

/**
 * 初始化摄像头
 * @param {string} videoElementId - 视频元素ID
 * @param {string} deviceId - 指定的摄像头设备ID（可选）
 * @param {boolean} useNativeResolution - 是否使用设备原生分辨率（适用于Canon等专业摄像机，默认true）
 * @returns {Promise<MediaStream>}
 */
async function initializeCamera(videoElementId = 'camera-video', deviceId = null, useNativeResolution = null) {
    try {
        console.log('📸 初始化摄像头...');
        
        // 先释放已有的摄像头流
        if (cameraStream) {
            deinitializeCamera();
        }

        const video = document.getElementById(videoElementId);
        if (!video) {
            throw new Error(`找不到视频元素: ${videoElementId}`);
        }

        // 如果没有指定deviceId，尝试从 localStorage 加载
        if (!deviceId) {
            deviceId = localStorage.getItem('preferredCameraId');
            if (deviceId) {
                console.log('💾 使用保存的摄像头设备:', deviceId);
            }
        }
        
        // 如果没有指定useNativeResolution，从 localStorage 加载
        if (useNativeResolution === null) {
            const savedUseNativeResolution = localStorage.getItem('useNativeResolution');
            // 默认为true（适配Canon等专业摄像机）
            useNativeResolution = savedUseNativeResolution !== 'false';
        }

        // 请求摄像头权限
        let constraints;
        
        if (useNativeResolution && deviceId) {
            // 专业摄像机模式：只指定deviceId，使用原生分辨率，避免重启
            constraints = {
                video: {
                    deviceId: { exact: deviceId }
                    // 不设置任何分辨率约束，让设备使用默认配置
                },
                audio: false
            };
            console.log('🎬 专业摄像机模式：使用设备原生分辨率');
        } else {
            // 普通模式：设置分辨率约束
            constraints = {
                video: deviceId ? {
                    deviceId: { exact: deviceId },
                    width: { min: 640, ideal: 2560, max: 3840 },
                    height: { min: 480, ideal: 1440, max: 2160 }
                } : {
                    width: { min: 640, ideal: 2560, max: 3840 },
                    height: { min: 480, ideal: 1440, max: 2160 },
                    facingMode: 'user'
                },
                audio: false
            };
            console.log('📱 普通模式：设置分辨率约束');
        }
        
        console.log('📋 摄像头约束配置:', JSON.stringify(constraints, null, 2));

        cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = cameraStream;
        
        // 保存当前使用的设备ID
        const videoTrack = cameraStream.getVideoTracks()[0];
        if (videoTrack) {
            currentDeviceId = videoTrack.getSettings().deviceId;
            const settings = videoTrack.getSettings();
            console.log('✅ 当前摄像头设备ID:', currentDeviceId);
            console.log('📊 摄像头实际设置:', {
                deviceId: settings.deviceId,
                width: settings.width,
                height: settings.height,
                aspectRatio: settings.aspectRatio,
                frameRate: settings.frameRate,
                facingMode: settings.facingMode
            });
        }

        // 等待视频准备就绪
        await new Promise((resolve, reject) => {
            video.onloadedmetadata = () => {
                video.play()
                    .then(() => {
                        // 输出视频实际分辨率
                        console.log(`📐 摄像头实际分辨率: ${video.videoWidth}x${video.videoHeight}`);
                        console.log(`📐 Video元素尺寸: ${video.clientWidth}x${video.clientHeight}`);
                        
                        // 调整video元素尺寸以适配旋转
                        adjustVideoSizeForRotation(video);
                        
                        resolve();
                    })
                    .catch(reject);
            };
        });

        console.log('✅ 摄像头初始化成功');
        return cameraStream;
    } catch (error) {
        console.error('❌ 摄像头初始化失败:', error);
        
        // 如果指定设备失败，尝试使用默认设备
        if (deviceId && error.name === 'OverconstrainedError') {
            console.warn('⚠️ 指定摄像头不可用，尝试使用默认设备...');
            return await initializeCamera(videoElementId, null);
        }
        
        // 显示友好的错误提示
        const errorMessage = getCameraErrorMessage(error);
        if (window.notification) {
            window.notification.error(errorMessage);
        }
        
        throw error;
    }
}

/**
 * 调整video元素尺寸以适配旋转
 * 由于video会旋转-90度，需要调整尺寸确保旋转后完整显示
 */
function adjustVideoSizeForRotation(video) {
    const container = video.parentElement;
    if (!container) return;
    
    const containerWidth = container.clientWidth;  // 1080
    const containerHeight = container.clientHeight; // 1920
    
    // 摄像头原始比例 1280:720 = 16:9 (横屏)
    // 旋转-90度后变成 720:1280 = 9:16 (竖屏)
    const videoAspectRatio = video.videoHeight / video.videoWidth; // 720/1280 = 0.5625
    
    // 容器比例
    const containerAspectRatio = containerHeight / containerWidth; // 1920/1080 = 1.778
    
    console.log(`📐 容器尺寸: ${containerWidth}x${containerHeight}`);
    console.log(`📐 视频比例: ${videoAspectRatio.toFixed(3)}, 容器比例: ${containerAspectRatio.toFixed(3)}`);
    
    // 旋转后，视频的宽高需要互换来适配容器
    // 由于rotate(-90deg)，原本的height会变成显示的width
    let displayWidth, displayHeight;
    
    if (videoAspectRatio < containerAspectRatio) {
        // 视频更宽，以容器高度为准
        displayHeight = containerHeight;
        displayWidth = displayHeight / videoAspectRatio;
    } else {
        // 视频更高，以容器宽度为准
        displayWidth = containerWidth;
        displayHeight = displayWidth * videoAspectRatio;
    }
    
    // 由于旋转-90度，设置的width和height需要互换
    video.style.width = `${displayHeight}px`;
    video.style.height = `${displayWidth}px`;
    
    console.log(`✅ 调整后Video尺寸: width=${displayHeight}px, height=${displayWidth}px`);
    console.log(`✅ 旋转后实际显示: ${displayWidth}x${displayHeight}`);
}

/**
 * 释放摄像头资源
 */
function deinitializeCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => {
            track.stop();
        });
        cameraStream = null;
        currentDeviceId = null;
        
        // 清除视频元素的 srcObject
        const video = document.getElementById('camera-video');
        if (video) {
            video.srcObject = null;
        }
        
        console.log('🧹 摄像头资源已释放');
    }
}

/**
 * 切换摄像头
 * @param {string} deviceId - 要切换到的摄像头设备ID
 * @returns {Promise<MediaStream>}
 */
async function switchCamera(deviceId) {
    console.log('🔄 切换摄像头:', deviceId);
    
    if (!deviceId) {
        throw new Error('请指定要切换的摄像头设备ID');
    }
    
    // 释放当前摄像头
    deinitializeCamera();
    
    // 初始化新摄像头
    return await initializeCamera('camera-video', deviceId);
}

/**
 * 拍照
 * @param {string} videoElementId - 视频元素ID
 * @param {string} canvasElementId - 画布元素ID
 * @returns {Promise<string>} Base64图片数据
 */
async function capturePhoto(videoElementId = 'camera-video', canvasElementId = 'camera-canvas') {
    try {
        const video = document.getElementById(videoElementId);
        const canvas = document.getElementById(canvasElementId);
        
        if (!video || !canvas) {
            throw new Error('找不到视频或画布元素');
        }

        const context = canvas.getContext('2d');
        
        // 使用视频的实际分辨率
        const width = video.videoWidth;
        const height = video.videoHeight;
        
        console.log(`📸 拍照分辨率: ${width}x${height}`);
        
        // 预览时旋转了-90度，拍照时需要旋转+90度才能正向显示
        // 设置画布尺寸为旋转后的尺寸（宽高互换）
        canvas.width = height;  // 旋转后宽度变成原来的高度
        canvas.height = width;  // 旋转后高度变成原来的宽度
        
        // 保存当前状态
        context.save();
        
        // 将原点移动到画布中心
        context.translate(canvas.width / 2, canvas.height / 2);
        
        // 旋转+90度（顺时针），与预览的-90度相反，得到正向照片
        context.rotate(Math.PI / 2);
        
        // 镜像翻转（与预览一致）
        context.scale(-1, 1);
        
        // 绘制图像（以中心为原点）
        context.drawImage(video, -width / 2, -height / 2, width, height);
        
        // 恢复状态
        context.restore();
        
        // 转换为Base64
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.95);
        
        console.log('✅ 拍照成功（已旋转+90度并镜像，照片为正向竖屏）');
        return imageDataUrl;
    } catch (error) {
        console.error('❌ 拍照失败:', error);
        throw error;
    }
}

/**
 * 获取摄像头错误消息
 * @param {Error} error - 错误对象
 * @returns {string} 错误消息
 */
function getCameraErrorMessage(error) {
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        return '请允许访问摄像头权限';
    }
    if (error.name === 'NotFoundError' || error.name === 'OverconstrainedError') {
        return '未找到可用的摄像头设备';
    }
    if (error.name === 'NotReadableError') {
        return '摄像头设备被占用，请关闭其他使用摄像头的应用';
    }
    return '摄像头初始化失败';
}

/**
 * 检查摄像头是否可用
 * @returns {Promise<boolean>}
 */
async function isCameraAvailable() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices.some(device => device.kind === 'videoinput');
    } catch (error) {
        console.error('检查摄像头失败:', error);
        return false;
    }
}

// 导出到全局
if (typeof window !== 'undefined') {
    window.cameraUtils = {
        initialize: initializeCamera,
        deinitialize: deinitializeCamera,
        switchCamera: switchCamera,
        capture: capturePhoto,
        isAvailable: isCameraAvailable,
        getErrorMessage: getCameraErrorMessage,
        get currentDeviceId() {
            return currentDeviceId;
        }
    };
    
    // 兼容旧代码
    window.initializeCamera = initializeCamera;
    window.deinitializeCamera = deinitializeCamera;
}
