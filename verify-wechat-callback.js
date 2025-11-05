/**
 * 验证微信回调接口是否正常工作
 */

const http = require('http');

// 测试微信回调接口
function testWechatCallback() {
  const options = {
    hostname: 'localhost',
    port: 4001,
    path: '/api/wechat/callback?signature=test_signature&timestamp=123456789&nonce=987654321&echostr=test_echostr',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('=== 微信回调接口测试结果 ===');
      console.log('状态码:', res.statusCode);
      console.log('响应数据:', data);
      
      if (res.statusCode === 200) {
        console.log('✅ 微信回调接口正常工作');
      } else {
        console.log('❌ 微信回调接口异常');
      }
    });
  });

  req.on('error', (error) => {
    console.error('请求错误:', error.message);
  });

  req.end();
}

// 运行测试
testWechatCallback();