const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('开始初始化数据库...');

  // 创建衣服分类
  const categories = [
    // 一级分类
    { name: '男装', level: 1, sortOrder: 1 },
    { name: '女装', level: 1, sortOrder: 2 },
    { name: '配饰', level: 1, sortOrder: 3 },
  ];

  const createdCategories = [];
  for (const category of categories) {
    const created = await prisma.category.upsert({
      where: { name: category.name },
      update: category,
      create: category,
    });
    createdCategories.push(created);
  }

  // 创建二级分类
  const subCategories = [
    // 男装子分类
    { name: '外套', level: 2, parentId: createdCategories[0].id, sortOrder: 1 },
    { name: '裤子', level: 2, parentId: createdCategories[0].id, sortOrder: 2 },
    { name: '衬衫', level: 2, parentId: createdCategories[0].id, sortOrder: 3 },
    { name: 'T恤', level: 2, parentId: createdCategories[0].id, sortOrder: 4 },
    
    // 女装子分类
    { name: '外套', level: 2, parentId: createdCategories[1].id, sortOrder: 1 },
    { name: '裙子', level: 2, parentId: createdCategories[1].id, sortOrder: 2 },
    { name: '裤子', level: 2, parentId: createdCategories[1].id, sortOrder: 3 },
    { name: '连衣裙', level: 2, parentId: createdCategories[1].id, sortOrder: 4 },
    
    // 配饰子分类
    { name: '帽子', level: 2, parentId: createdCategories[2].id, sortOrder: 1 },
    { name: '包包', level: 2, parentId: createdCategories[2].id, sortOrder: 2 },
    { name: '鞋子', level: 2, parentId: createdCategories[2].id, sortOrder: 3 },
  ];

  const createdSubCategories = [];
  for (const subCategory of subCategories) {
    const created = await prisma.category.upsert({
      where: { 
        name_parentId: {
          name: subCategory.name,
          parentId: subCategory.parentId
        }
      },
      update: subCategory,
      create: subCategory,
    });
    createdSubCategories.push(created);
  }

  // 创建示例衣服数据
  const clothes = [
    // 男装外套
    {
      name: '经典黑色风衣',
      categoryId: createdSubCategories[0].id, // 男装外套
      imageUrl: 'https://example.com/male-coat-1.jpg',
      prompt: 'a man wearing a classic black trench coat, elegant and stylish, high quality fashion photography',
      description: '经典黑色风衣，适合商务和休闲场合',
      price: 299.00,
      youzanProductId: '123456', // 有赞商品ID
      youzanUrl: 'https://h5.youzan.com/v2/goods/123456' // 备用链接
    },
    {
      name: '深蓝色西装外套',
      categoryId: createdSubCategories[0].id,
      imageUrl: 'https://example.com/male-coat-2.jpg',
      prompt: 'a man wearing a navy blue blazer, professional and sophisticated, studio lighting',
      description: '深蓝色西装外套，商务正装首选',
      price: 399.00,
      youzanUrl: 'https://h5.youzan.com/v2/goods/123457'
    },
    
    // 男装裤子
    {
      name: '黑色休闲裤',
      categoryId: createdSubCategories[1].id, // 男装裤子
      imageUrl: 'https://example.com/male-pants-1.jpg',
      prompt: 'a man wearing black casual pants, comfortable and versatile, modern style',
      description: '黑色休闲裤，百搭实用',
      price: 199.00,
      youzanUrl: 'https://youzan.com/product/123458'
    },
    
    // 女装外套
    {
      name: '米色羊毛大衣',
      categoryId: createdSubCategories[4].id, // 女装外套
      imageUrl: 'https://example.com/female-coat-1.jpg',
      prompt: 'a woman wearing a beige wool coat, elegant and warm, winter fashion',
      description: '米色羊毛大衣，保暖又时尚',
      price: 599.00,
      youzanUrl: 'https://youzan.com/product/123459'
    },
    
    // 女装裙子
    {
      name: '黑色A字裙',
      categoryId: createdSubCategories[5].id, // 女装裙子
      imageUrl: 'https://example.com/female-skirt-1.jpg',
      prompt: 'a woman wearing a black A-line skirt, classic and feminine, office wear',
      description: '黑色A字裙，职场女性必备',
      price: 159.00,
      youzanUrl: 'https://youzan.com/product/123460'
    },
    
    // 女装连衣裙
    {
      name: '碎花连衣裙',
      categoryId: createdSubCategories[7].id, // 女装连衣裙
      imageUrl: 'https://example.com/female-dress-1.jpg',
      prompt: 'a woman wearing a floral print dress, romantic and feminine, summer style',
      description: '碎花连衣裙，清新浪漫',
      price: 259.00,
      youzanUrl: 'https://youzan.com/product/123461'
    }
  ];

  for (const cloth of clothes) {
    await prisma.clothes.upsert({
      where: { 
        name_categoryId: {
          name: cloth.name,
          categoryId: cloth.categoryId
        }
      },
      update: cloth,
      create: cloth,
    });
  }

  console.log('数据库初始化完成！');
  console.log(`创建了 ${createdCategories.length} 个一级分类`);
  console.log(`创建了 ${createdSubCategories.length} 个二级分类`);
  console.log(`创建了 ${clothes.length} 件衣服`);
}

main()
  .catch((e) => {
    console.error('数据库初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
