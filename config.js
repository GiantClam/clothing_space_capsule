// 配置文件
// 请根据实际情况修改以下配置

module.exports = {
    // API 服务器配置
    apiServer: {
        url: process.env.API_SERVER_URL || 'https://clothing-api.0086studios.xyz'
    },

    // RunningHub API 配置
    runninghub: {
        apiKey: process.env.RUNNINGHUB_API_KEY || 'your_runninghub_api_key_here',
        baseUrl: 'https://www.runninghub.cn',
        // 裙子或单上衣工作流ID
        singleItemWorkflowId: process.env.SINGLE_ITEM_WORKFLOW_ID || 'your_single_item_workflow_id_here',
        // 上衣+下衣工作流ID
        topBottomWorkflowId: process.env.TOP_BOTTOM_WORKFLOW_ID || 'your_top_bottom_workflow_id_here'
    },

    // 服务器配置
    server: {
        port: process.env.PORT || 3000,
        host: 'localhost'
    },

    // 微信公众号配置（可选）
    wechat: {
        appId: process.env.WECHAT_APP_ID || 'your_wechat_app_id',
        appSecret: process.env.WECHAT_APP_SECRET || 'your_wechat_app_secret',
        token: process.env.WECHAT_TOKEN || 'your_wechat_token',
        encodingAESKey: process.env.WECHAT_ENCODING_AES_KEY || 'your_encoding_aes_key'
    },

    // 应用配置
    app: {
        name: '衣等舱',
        version: '1.0.0',
        debug: process.env.NODE_ENV !== 'production',
        uploadDir: './uploads',
        publicDir: './public'
    },

    // 试衣流程配置
    fitting: {
        maxRetries: 3,
        timeoutMinutes: 5,
        supportedImageTypes: ['jpg', 'jpeg', 'png', 'webp'],
        maxImageSize: 10 * 1024 * 1024 // 10MB
    }
};