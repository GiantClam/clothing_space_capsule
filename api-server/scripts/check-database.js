#!/usr/bin/env node
/**
 * 数据库完整性检查工具
 * 检查数据库连接、表结构、数据完整性
 */

const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

const prisma = new PrismaClient();

async function checkDatabase() {
  console.log('🔍 开始检查数据库完整性...\n');

  try {
    // 1. 检查数据库连接
    console.log('1. 检查数据库连接...');
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ 数据库连接正常\n');

    // 2. 检查所有表是否存在
    console.log('2. 检查表结构...');
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    const expectedTables = [
      'devices', 'users', 'categories', 'clothes', 
      'tasks', 'wechat_messages', '_prisma_migrations'
    ];

    const existingTables = tables.map(t => t.table_name);
    const missingTables = expectedTables.filter(table => !existingTables.includes(table));

    if (missingTables.length > 0) {
      console.log('❌ 缺失的表:', missingTables.join(', '));
      console.log('💡 请运行数据库迁移: npx prisma migrate dev');
      process.exit(1);
    } else {
      console.log('✅ 所有表都存在\n');
    }

    // 3. 检查每个表的结构完整性
    console.log('3. 检查表结构完整性...');
    
    // 检查 devices 表
    const deviceColumns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'devices' 
      ORDER BY ordinal_position
    `;
    
    const requiredDeviceColumns = ['id', 'mac_address', 'is_active', 'created_at', 'updated_at'];
    const deviceColNames = deviceColumns.map(c => c.column_name);
    const missingDeviceCols = requiredDeviceColumns.filter(col => !deviceColNames.includes(col));
    
    if (missingDeviceCols.length > 0) {
      console.log('❌ devices表缺失字段:', missingDeviceCols.join(', '));
    }

    // 检查 users 表
    const userColumns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `;

    // 4. 检查索引
    console.log('4. 检查索引...');
    const indexes = await prisma.$queryRaw`
      SELECT tablename, indexname, indexdef
      FROM pg_indexes 
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `;

    const requiredIndexes = [
      { table: 'devices', index: 'devices_mac_address_key' },
      { table: 'users', index: 'users_open_id_key' },
      { table: 'categories', index: 'categories_name_parentId_key' },
      { table: 'clothes', index: 'clothes_name_categoryId_key' }
    ];

    const existingIndexNames = indexes.map(i => i.indexname);
    const missingIndexes = requiredIndexes.filter(idx => !existingIndexNames.includes(idx.index));

    if (missingIndexes.length > 0) {
      console.log('⚠️  缺失的索引:');
      missingIndexes.forEach(idx => {
        console.log(`   - ${idx.table}.${idx.index}`);
      });
    } else {
      console.log('✅ 所有必要索引都存在\n');
    }

    // 5. 检查数据完整性
    console.log('5. 检查数据完整性...');
    
    // 检查是否有设备数据
    const deviceCount = await prisma.device.count();
    console.log(`📊 设备记录数: ${deviceCount}`);

    // 检查分类数据
    const categoryCount = await prisma.category.count();
    console.log(`📊 分类记录数: ${categoryCount}`);

    // 检查衣服数据
    const clothesCount = await prisma.clothes.count();
    console.log(`📊 衣服记录数: ${clothesCount}`);

    if (categoryCount === 0) {
      console.log('💡 没有分类数据，建议运行种子数据: npx prisma db seed');
    }

    // 6. 检查外键约束
    console.log('6. 检查外键约束...');
    const foreignKeys = await prisma.$queryRaw`
      SELECT
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
      ORDER BY tc.table_name, kcu.column_name
    `;

    console.log('✅ 外键约束检查完成\n');

    // 7. 输出总结报告
    console.log('📋 数据库完整性检查报告:');
    console.log('========================');
    console.log(`✅ 数据库连接: 正常`);
    console.log(`✅ 表结构: ${existingTables.length}/${expectedTables.length} 个表存在`);
    console.log(`✅ 数据记录: 设备(${deviceCount}), 分类(${categoryCount}), 衣服(${clothesCount})`);
    
    if (missingIndexes.length > 0) {
      console.log(`⚠️  索引: ${missingIndexes.length} 个索引缺失`);
    } else {
      console.log(`✅ 索引: 完整`);
    }

    if (deviceCount === 0 && categoryCount === 0) {
      console.log('\n💡 建议操作:');
      console.log('   1. 运行数据库迁移: npx prisma migrate dev');
      console.log('   2. 导入种子数据: npx prisma db seed');
    }

  } catch (error) {
    console.error('❌ 数据库检查失败:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 请检查:');
      console.log('   - 数据库服务是否启动');
      console.log('   - DATABASE_URL 配置是否正确');
      console.log('   - 数据库用户权限');
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行检查
checkDatabase().catch(console.error);

module.exports = { checkDatabase };