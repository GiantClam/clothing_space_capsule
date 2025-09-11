const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkData() {
  try {
    console.log('📊 检查数据库数据...\n');
    
    // 检查衣服数据
    console.log('👕 衣服数据:');
    const clothes = await prisma.clothes.findMany({
      take: 5,
      include: {
        category: true
      }
    });
    
    console.log(`找到 ${clothes.length} 件衣服:`);
    clothes.forEach(cloth => {
      console.log(`  - ${cloth.name} (ID: ${cloth.id}, 分类: ${cloth.category.name})`);
    });
    
    console.log('\n📂 二级分类数据:');
    const categories = await prisma.category.findMany({
      where: { level: 2 },
      take: 10,
      include: {
        parent: true
      }
    });
    
    console.log(`找到 ${categories.length} 个二级分类:`);
    categories.forEach(cat => {
      console.log(`  - ${cat.name} (ID: ${cat.id}, 父分类: ${cat.parent?.name || '无'})`);
    });
    
    console.log('\n📋 设备数据:');
    const devices = await prisma.device.findMany({
      take: 3,
      include: {
        users: {
          where: { isVerified: true }
        }
      }
    });
    
    console.log(`找到 ${devices.length} 个设备:`);
    devices.forEach(device => {
      console.log(`  - ${device.deviceName || '未命名设备'} (ID: ${device.id}, 已验证用户: ${device.users.length})`);
    });
    
  } catch (error) {
    console.error('❌ 检查数据错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();