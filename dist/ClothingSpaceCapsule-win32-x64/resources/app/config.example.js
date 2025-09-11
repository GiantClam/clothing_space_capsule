// 配置文件示例
// 复制此文件为 config.js 并填入实际的 API 密钥和配置信息

module.exports = {
    // RunningHub API 配置
    runninghub: {
        apiKey: 'your_runninghub_api_key_here',
        baseUrl: 'https://www.runninghub.cn',
        // 裙子或单上衣工作流ID
        singleItemWorkflowId: 'your_single_item_workflow_id_here',
        // 上衣+下衣工作流ID
        topBottomWorkflowId: 'your_top_bottom_workflow_id_here'
    },

    // 服务器配置
    server: {
        port: 3000,
        host: 'localhost'
    },

    // 微信公众号配置（可选）
    wechat: {
        appId: 'your_wechat_app_id',
        appSecret: 'your_wechat_app_secret',
        token: 'your_wechat_token',
        encodingAESKey: 'your_encoding_aes_key'
    },

    // 应用配置
    app: {
        name: '衣等舱',
        version: '1.0.0',
        debug: true,
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

