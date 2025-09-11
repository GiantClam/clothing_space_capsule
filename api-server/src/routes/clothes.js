const express = require('express');
const prisma = require('../utils/prisma');
const { authenticateDevice } = require('./auth');

const router = express.Router();

// 获取衣服分类
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: [
        { level: 'asc' },
        { sortOrder: 'asc' },
        { name: 'asc' }
      ],
      include: {
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' }
        }
      }
    });

    // 只返回一级分类，二级分类在 children 中
    const topLevelCategories = categories.filter(cat => cat.level === 1);

    res.json({
      success: true,
      categories: topLevelCategories
    });

  } catch (error) {
    console.error('获取分类错误:', error);
    next(error);
  }
});

// 获取衣服列表
router.get('/list', async (req, res, next) => {
  try {
    const { 
      categoryId, 
      page = 1, 
      limit = 20,
      search 
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // 构建查询条件
    const where = {
      isActive: true
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } }
      ];
    }

    const [clothes, total] = await Promise.all([
      prisma.clothes.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              level: true,
              parent: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      }),
      prisma.clothes.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        clothes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('获取衣服列表错误:', error);
    next(error);
  }
});

// 获取单个衣服详情
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const clothes = await prisma.clothes.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            level: true,
            parent: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    if (!clothes || !clothes.isActive) {
      return res.status(404).json({ error: '衣服不存在' });
    }

    res.json({
      success: true,
      data: clothes
    });

  } catch (error) {
    console.error('获取衣服详情错误:', error);
    next(error);
  }
});

// 根据分类获取衣服（支持多级分类）
router.get('/category/:categoryId', async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // 查找分类及其所有子分类
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        children: {
          where: { isActive: true }
        }
      }
    });

    if (!category) {
      return res.status(404).json({ error: '分类不存在' });
    }

    // 获取所有子分类ID
    const categoryIds = [categoryId];
    if (category.children) {
      categoryIds.push(...category.children.map(child => child.id));
    }

    const [clothes, total] = await Promise.all([
      prisma.clothes.findMany({
        where: {
          categoryId: { in: categoryIds },
          isActive: true
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              level: true,
              parent: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      }),
      prisma.clothes.count({
        where: {
          categoryId: { in: categoryIds },
          isActive: true
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        clothes,
        category: {
          id: category.id,
          name: category.name,
          level: category.level
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('根据分类获取衣服错误:', error);
    next(error);
  }
});

module.exports = router;
