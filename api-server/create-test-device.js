const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestDevice() {
  try {
    console.log('📱 创建测试设备...');
    
    // 创建测试设备
    const device = await prisma.device.create({
      data: {
        macAddress: 'test-mac-address-001',
        deviceName: '测试设备',
        distributionId: 'test-distribution-id',
        isActive: true
      }
    });
    
    console.log('✅ 设备创建成功:', device.id);
    
    // 创建测试用户
    const user = await prisma.user.create({
      data: {
        openId: 'test-open-id-001',
        deviceId: device.id,
        isVerified: true,
        nickname: '测试用户',
        avatar: 'https://example.com/avatar.jpg'
      }
    });
    
    console.log('✅ 用户创建成功:', user.id);
    console.log('🔑 设备Token (用于测试):', device.id);
    
    return {
      deviceId: device.id,
      userId: user.id
    };
    
  } catch (error) {
    console.error('❌ 创建测试设备错误:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 运行创建函数
createTestDevice()
  .then(result => {
    console.log('\n🎉 测试设备创建完成！');
    console.log('请使用以下设备Token进行测试:', result.deviceId);
  })
  .catch(error => {
    console.error('创建测试设备失败:', error);
  });