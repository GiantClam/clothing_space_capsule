#!/usr/bin/env node
/**
 * 数据库修复工具
 * 自动修复常见的数据库问题
 */

const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

const prisma = new PrismaClient();

async function fixDatabase() {
  console.log('🔧 开始数据库修复...\n');

  try {
    // 1. 检查是否需要迁移
    console.log('1. 检查数据库迁移状态...');
    try {
      const migrations = await prisma.$queryRaw`
        SELECT * FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 1
      `;
      console.log('✅ 迁移记录存在');
    } catch (error) {
      console.log('⚠️  迁移表不存在，尝试初始化数据库...');
      execSync('npx prisma migrate dev --name init', { stdio: 'inherit' });
    }

    // 2. 检查并修复表结构
    console.log('2. 检查表结构完整性...');
    
    // 检查是否有缺失的表
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    `;

    const expectedTables = ['devices', 'users', 'categories', 'clothes', 'tasks', 'wechat_messages'];
    const existingTables = tables.map(t => t.table_name);
    const missingTables = expectedTables.filter(table => !existingTables.includes(table));

    if (missingTables.length > 0) {
      console.log('❌ 缺失的表:', missingTables.join(', '));
      console.log('💡 运行数据库迁移...');
      execSync('npx prisma migrate dev', { stdio: 'inherit' });
    }

    // 3. 检查并创建必要的索引
    console.log('3. 检查索引...');
    const indexes = await prisma.$queryRaw`
      SELECT indexname FROM pg_indexes WHERE schemaname = 'public'
    `;

    const requiredIndexes = [
      'devices_mac_address_key',
      'users_open_id_key',
      'categories_name_parentId_key',
      'clothes_name_categoryId_key'
    ];

    const existingIndexNames = indexes.map(i => i.indexname);
    const missingIndexes = requiredIndexes.filter(idx => !existingIndexNames.includes(idx));

    if (missingIndexes.length > 0) {
      console.log('⚠️  缺失的索引:', missingIndexes.join(', '));
      console.log('💡 这些索引应该由 Prisma 自动创建，尝试重置数据库...');
      
      const answer = require('readline-sync').question('是否重置数据库？(y/N): ');
      if (answer.toLowerCase() === 'y') {
        execSync('npx prisma migrate reset --force', { stdio: 'inherit' });
      }
    }

    // 4. 检查种子数据
    console.log('4. 检查种子数据...');
    const categoryCount = await prisma.category.count();
    const clothesCount = await prisma.clothes.count();

    if (categoryCount === 0 || clothesCount === 0) {
      console.log('💡 缺少种子数据，导入中...');
      execSync('npx prisma db seed', { stdio: 'inherit' });
    }

    // 5. 验证修复结果
    console.log('5. 验证修复结果...');
    const finalCategoryCount = await prisma.category.count();
    const finalClothesCount = await prisma.clothes.count();

    console.log(`✅ 分类数据: ${finalCategoryCount} 条记录`);
    console.log(`✅ 衣服数据: ${finalClothesCount} 条记录`);
    console.log('✅ 数据库修复完成！');

  } catch (error) {
    console.error('❌ 数据库修复失败:', error.message);
    
    if (error.message.includes('Connection')) {
      console.log('💡 请检查:');
      console.log('   - 数据库服务是否运行');
      console.log('   - DATABASE_URL 配置是否正确');
      console.log('   - 数据库用户是否有权限');
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行修复
fixDatabase().catch(console.error);

module.exports = { fixDatabase };