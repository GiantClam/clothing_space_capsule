const axios = require('axios');

const API_BASE = 'http://localhost:4002/api';

// 测试配置
const testConfig = {
  deviceToken: 'cmff8xcjm000013zgr4ww8073', // 创建的测试设备token
  photoUrl: 'https://example.com/test-photo.jpg', // 测试照片URL
  topClothesId: 'cmff67wua0003buulk90vcmrt', // 深蓝色西装外套ID
  bottomClothesId: 'cmff67wub0005buulizeg9g48' // 黑色休闲裤ID
};

async function testNewTaskFlow() {
  console.log('🧪 测试新的任务流程...\n');

  try {
    // 1. 测试上传照片创建任务
    console.log('1. 📸 上传照片创建任务...');
    const uploadResponse = await axios.post(`${API_BASE}/tasks/upload-photo`, {
      photoUrl: testConfig.photoUrl
    }, {
      headers: {
        'Authorization': `Bearer ${testConfig.deviceToken}`
      }
    });

    if (uploadResponse.data.success) {
      console.log('✅ 上传照片成功');
      console.log('   任务ID:', uploadResponse.data.data.taskId);
      const taskId = uploadResponse.data.data.taskId;

      // 2. 测试启动试穿任务
      console.log('\n2. 👕 启动试穿任务...');
      const tryonResponse = await axios.post(`${API_BASE}/tasks/start-tryon`, {
        taskId: taskId,
        topClothesId: testConfig.topClothesId,
        bottomClothesId: testConfig.bottomClothesId
      }, {
        headers: {
          'Authorization': `Bearer ${testConfig.deviceToken}`
        }
      });

      if (tryonResponse.data.success) {
        console.log('✅ 启动试穿任务成功');
        console.log('   RunningHub任务ID:', tryonResponse.data.data.runninghubTaskId);
        console.log('   状态:', tryonResponse.data.data.status);

        // 3. 测试查询任务状态
        console.log('\n3. 🔍 查询任务状态...');
        const statusResponse = await axios.get(`${API_BASE}/tasks/${taskId}`, {
          headers: {
            'Authorization': `Bearer ${testConfig.deviceToken}`
          }
        });

        if (statusResponse.data.success) {
          console.log('✅ 查询任务状态成功');
          console.log('   当前状态:', statusResponse.data.data.status);
          console.log('   衣服数量:', statusResponse.data.data.clothes.length);
        } else {
          console.log('❌ 查询任务状态失败:', statusResponse.data.error);
        }
      } else {
        console.log('❌ 启动试穿任务失败:', tryonResponse.data.error);
      }
    } else {
      console.log('❌ 上传照片失败:', uploadResponse.data.error);
    }

  } catch (error) {
    console.log('❌ 测试过程中出现错误:');
    console.log('   错误详情:', error);
    if (error.response) {
      console.log('   状态码:', error.response.status);
      console.log('   响应数据:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.log('   请求错误:', error.request);
    } else {
      console.log('   错误信息:', error.message);
    }
    console.log('   错误堆栈:', error.stack);
  }

  console.log('\n🧪 测试完成');
}

// 运行测试
testNewTaskFlow();