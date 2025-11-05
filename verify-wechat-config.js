const axios = require('axios');
require('dotenv').config({ path: './api-server/.env.local' });
require('dotenv').config({ path: './api-server/.env' });

console.log('检查微信配置...');
console.log('WECHAT_APP_ID:', process.env.WECHAT_APP_ID ? '已配置' : '未配置');
console.log('WECHAT_APP_SECRET:', process.env.WECHAT_APP_SECRET ? '已配置' : '未配置');
console.log('WECHAT_TOKEN:', process.env.WECHAT_TOKEN ? '已配置' : '未配置');

if (!process.env.WECHAT_APP_ID || !process.env.WECHAT_APP_SECRET) {
  console.error('❌ 微信配置不完整！');
  process.exit(1);
}

console.log('尝试获取access_token...');

async function testWechatConfig() {
  try {
    const tokenResponse = await axios.get(
      `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${process.env.WECHAT_APP_ID}&secret=${process.env.WECHAT_APP_SECRET}`
    );
    
    console.log('响应状态码:', tokenResponse.status);
    console.log('响应数据:', JSON.stringify(tokenResponse.data, null, 2));
    
    if (tokenResponse.data.access_token) {
      console.log('✅ 微信配置正确，成功获取access_token');
    } else if (tokenResponse.data.errcode) {
      console.error('❌ 微信配置错误:', tokenResponse.data.errmsg);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message);
    process.exit(1);
  }
}

testWechatConfig();