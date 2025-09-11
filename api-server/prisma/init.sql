-- 创建数据库（如果不存在）
-- CREATE DATABASE clothing_capsule_db;

-- 创建用户（如果不存在）
-- CREATE USER clothing_user WITH PASSWORD 'clothing_password';

-- 授权
-- GRANT ALL PRIVILEGES ON DATABASE clothing_capsule_db TO clothing_user;

-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 创建索引优化查询性能
-- 这些索引会在 Prisma 迁移后自动创建，这里只是示例
-- CREATE INDEX IF NOT EXISTS idx_devices_mac_address ON devices(mac_address);
-- CREATE INDEX IF NOT EXISTS idx_users_open_id ON users(open_id);
-- CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
-- CREATE INDEX IF NOT EXISTS idx_tasks_device_id ON tasks(device_id);
-- CREATE INDEX IF NOT EXISTS idx_clothes_category_id ON clothes(category_id);
