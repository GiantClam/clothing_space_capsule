const { PrismaClient } = require('@prisma/client');

// 创建全局 Prisma 实例，添加更多配置选项以解决序列化错误
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  // 添加这些选项以解决Prisma引擎的序列化错误
  errorFormat: 'pretty',
  __internal: {
    engine: {
      enableTracing: false
    }
  }
});

// 优雅关闭处理
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = prisma;