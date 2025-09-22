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
    // 先检查是否存在同名分类
    const existingCategory = await prisma.category.findFirst({
      where: { name: category.name }
    });
    
    let created;
    if (existingCategory) {
      // 更新现有分类
      created = await prisma.category.update({
        where: { id: existingCategory.id },
        data: category
      });
    } else {
      // 创建新分类
      created = await prisma.category.create({
        data: category
      });
    }
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
    // 先检查是否存在同名同父级的分类
    const existingSubCategory = await prisma.category.findFirst({
      where: { 
        name: subCategory.name,
        parentId: subCategory.parentId
      }
    });
    
    let created;
    if (existingSubCategory) {
      // 更新现有子分类
      created = await prisma.category.update({
        where: { id: existingSubCategory.id },
        data: subCategory
      });
    } else {
      // 创建新子分类
      created = await prisma.category.create({
        data: subCategory
      });
    }
    createdSubCategories.push(created);
  }

  // 创建示例衣服数据
  const clothes = [
    // 男装外套
    {
      name: '经典黑色风衣',
      categoryId: createdSubCategories[0].id, // 男装外套
      imageUrl: '/male/coats/coat1.jpg',
      detailDesc: 'a man wearing a classic black trench coat, elegant and stylish, high quality fashion photography',
      description: '经典黑色风衣，适合商务和休闲场合',
      price: 299.00,
      purchaseUrl: 'https://h5.youzan.com/v2/goods/123456' // 备用链接
    },
    {
      name: '深蓝色西装外套',
      categoryId: createdSubCategories[0].id,
      imageUrl: '/male/coats/coat2.jpg',
      detailDesc: 'a man wearing a navy blue blazer, professional and sophisticated, studio lighting',
      description: '深蓝色西装外套，商务正装首选',
      price: 399.00,
      purchaseUrl: 'https://h5.youzan.com/v2/goods/123457'
    },
    
    // 男装裤子
    {
      name: '黑色休闲裤',
      categoryId: createdSubCategories[1].id, // 男装裤子
      imageUrl: '/male/pants/pants1.jpg',
      detailDesc: 'a man wearing black casual pants, comfortable and versatile, modern style',
      description: '黑色休闲裤，百搭实用',
      price: 199.00,
      purchaseUrl: 'https://youzan.com/product/123458'
    },
    
    // 女装外套
    {
      name: '米色羊毛大衣',
      categoryId: createdSubCategories[4].id, // 女装外套
      imageUrl: '/female/coats/coat1.jpg',
      detailDesc: 'a woman wearing a beige wool coat, elegant and warm, winter fashion',
      description: '米色羊毛大衣，保暖又时尚',
      price: 599.00,
      purchaseUrl: 'https://youzan.com/product/123459'
    },
    
    // 女装裙子
    {
      name: '黑色A字裙',
      categoryId: createdSubCategories[5].id, // 女装裙子
      imageUrl: '/female/skirts/skirt1.jpg',
      detailDesc: 'a woman wearing a black A-line skirt, classic and feminine, office wear',
      description: '黑色A字裙，职场女性必备',
      price: 159.00,
      purchaseUrl: 'https://youzan.com/product/123460'
    },
    
    // 女装连衣裙
    {
      name: '碎花连衣裙',
      categoryId: createdSubCategories[7].id, // 女装连衣裙
      imageUrl: '/female/dresses/dress1.jpg',
      detailDesc: 'a woman wearing a floral print dress, romantic and feminine, summer style',
      description: '碎花连衣裙，清新浪漫',
      price: 259.00,
      purchaseUrl: 'https://youzan.com/product/123461'
    }
  ];

  for (const cloth of clothes) {
    // 先检查是否存在同名同分类的衣服
    const existingCloth = await prisma.clothes.findFirst({
      where: { 
        name: cloth.name,
        categoryId: cloth.categoryId
      }
    });
    
    if (existingCloth) {
      // 更新现有衣服
      await prisma.clothes.update({
        where: { id: existingCloth.id },
        data: cloth
      });
    } else {
      // 创建新衣服
      await prisma.clothes.create({
        data: cloth
      });
    }
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
