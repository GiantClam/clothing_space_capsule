/**
 * 应用常量配置
 */

// 页面名称常量
const PAGES = {
    WELCOME: 'welcome-page',
    PROFILE: 'profile-page',
    PHOTO_CONFIRM: 'photo-confirm-page',
    PREFERENCE: 'preference-page',
    CLOTHING: 'clothing-page',
    FITTING_PROGRESS: 'fitting-progress-page',
    RESULTS: 'results-page',
    SCAN_TO_GET: 'scan-to-get-page',
    DOWNLOAD: 'download-page'
};

// 事件名称常量
const EVENTS = {
    PAGE_CHANGE: 'page:change',
    USER_LOGIN: 'user:login',
    USER_LOGOUT: 'user:logout',
    PHOTO_CAPTURED: 'photo:captured',
    PHOTO_UPLOADED: 'photo:uploaded',
    CLOTHING_SELECTED: 'clothing:selected',
    PREFERENCE_SELECTED: 'preference:selected',
    TRY_ON_STARTED: 'tryon:started',
    TRY_ON_COMPLETED: 'tryon:completed',
    TRY_ON_FAILED: 'tryon:failed',
    RESULT_DISPLAYED: 'result:displayed',
    TASK_CREATED: 'task:created',
    TASK_COMPLETED: 'task:completed',
    TASK_FAILED: 'task:failed',
    WECHAT_SUBSCRIBED: 'wechat:subscribed',
    NOTIFICATION_SHOW: 'notification:show',
    LOADING_SHOW: 'loading:show',
    LOADING_HIDE: 'loading:hide'
};

// API配置
const API_CONFIG = {
    PRODUCTION_URL: 'https://clothing-api.0086studios.xyz',
    DEVELOPMENT_URL: 'http://localhost:4001',
    TIMEOUT: 30000, // 30秒超时
    RETRY_TIMES: 3
};

// 图片配置
const IMAGE_CONFIG = {
    CDN_URL: 'https://clothing.0086studios.xyz',
    COS_FOLDER: 'clothinges/',
    MAX_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/jpg']
};

// 性别配置
const GENDER = {
    FEMALE: 'female',
    MALE: 'male'
};

// 服装类别配置
const CLOTHING_CATEGORY = {
    TOPS_BOTTOMS: 'tops-bottoms',
    DRESSES: 'dresses'
};

// 服装子类别配置
const CLOTHING_SUBCATEGORY = {
    TOPS: 'tops',
    BOTTOMS: 'bottoms'
};

// 任务状态配置
const TASK_STATUS = {
    PENDING: 'PENDING',
    QUEUED: 'QUEUED',
    PROCESSING: 'PROCESSING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED'
};

// 通知类型配置
const NOTIFICATION_TYPE = {
    INFO: 'info',
    SUCCESS: 'success',
    WARNING: 'warning',
    ERROR: 'error'
};

// 轮询配置
const POLLING_CONFIG = {
    WECHAT_STATUS_INTERVAL: 5000, // 5秒
    TASK_STATUS_INTERVAL: 5000, // 5秒
    MAX_ATTEMPTS: 60 // 最多轮询60次
};

// 倒计时配置
const COUNTDOWN_CONFIG = {
    RESULTS_PAGE: 30, // 结果页30秒倒计时
    DOWNLOAD_PAGE: 60 // 下载页60秒倒计时
};

// 导出配置
if (typeof window !== 'undefined') {
    window.APP_CONSTANTS = {
        PAGES,
        EVENTS,
        API_CONFIG,
        IMAGE_CONFIG,
        GENDER,
        CLOTHING_CATEGORY,
        CLOTHING_SUBCATEGORY,
        TASK_STATUS,
        NOTIFICATION_TYPE,
        POLLING_CONFIG,
        COUNTDOWN_CONFIG
    };
}
