# 腾讯云COS衣服数据同步指南

## 功能概述

这个脚本会自动从腾讯云COS读取`clothing-1252414414/clothinges`文件夹下的所有图片文件，并根据目录结构自动创建分类和衣服数据，更新到API服务器的数据库中。

## 目录结构要求

在腾讯云COS中，图片文件应按以下结构组织：

```
clothing-1252414414/
└── clothinges/
    ├── female/
    │   ├── coats/
    │   │   ├── coat1.jpg
    │   │   ├── coat2.jpg
    │   │   └── dress_coat.png
    │   ├── dresses/
    │   │   ├── summer_dress.jpg
    │   │   └── evening_dress.jpg
    │   └── pants/
    │       ├── jeans.jpg
    │       └── casual_pants.jpg
    └── male/
        ├── coats/
        │   ├── blazer.jpg
        │   └── winter_coat.jpg
        └── pants/
            ├── suit_pants.jpg
            └── casual_pants.jpg
```

## 支持的分类映射

脚本会自动将英文目录名映射为中文分类名：

### 性别分类（一级分类）
- `female` → 女装
- `male` → 男装

### 服装分类（二级分类）
- `coats` → 外套
- `dresses` → 连衣裙
- `skirts` → 裙子
- `pants` → 裤子
- `tops` → 上衣
- `shirts` → 衬衫
- `tshirts` → T恤
- `sweaters` → 毛衣
- `jackets` → 夹克
- `blazers` → 西装
- `accessories` → 配饰
- `bags` → 包包
- `shoes` → 鞋子
- `hats` → 帽子
- `jewelry` → 首饰

## 环境配置

### 1. 配置腾讯云COS环境变量

在API服务器的`.env`文件中配置：

```env
# 腾讯云COS配置
COS_SECRET_ID=your_cos_secret_id
COS_SECRET_KEY=your_cos_secret_key
COS_REGION=ap-guangzhou
COS_BUCKET=clothing-1252414414
```

### 2. 确保数据库连接

确保数据库已启动并且`DATABASE_URL`配置正确。

## 使用方法

### 方式一：使用npm脚本（推荐）

```bash
cd api-server
npm run clothes:update-from-cos
```

### 方式二：直接运行脚本

```bash
cd api-server
node scripts/update-clothes-from-cos.js
```

## 脚本功能详解

### 1. 自动扫描COS文件
- 扫描`clothing-1252414414/clothinges/`目录下的所有图片文件
- 支持的图片格式：`.jpg`, `.jpeg`, `.png`, `.webp`

### 2. 智能分类创建
- 根据目录结构自动创建分类层次
- 自动映射英文目录名为中文分类名
- 避免重复创建已存在的分类

### 3. 衣服数据管理
- 自动提取文件名作为衣服名称
- 生成标准的图片URL：`https://clothing.0086.xyz/female/coats/coat1.jpg`
- 自动生成AI提示词（prompt）
- 智能更新已存在的衣服记录

### 4. 错误处理
- 完善的错误日志记录
- 单个文件失败不影响整体处理
- 详细的处理统计报告

## 生成的数据格式

### 分类数据示例
```json
{
  "id": "category_id",
  "name": "女装",
  "level": 1,
  "parentId": null,
  "children": [
    {
      "id": "sub_category_id",
      "name": "外套",
      "level": 2,
      "parentId": "category_id"
    }
  ]
}
```

### 衣服数据示例
```json
{
  "id": "clothes_id",
  "name": "coat1",
  "imageUrl": "https://clothing.0086.xyz/female/coats/coat1.jpg",
  "prompt": "a female wearing coat1, fashion photography, high quality",
  "description": "coat1 - 来自female外套系列",
  "categoryId": "sub_category_id"
}
```

## 注意事项

1. **权限要求**：确保COS SecretId和SecretKey具有读取存储桶的权限
2. **网络连接**：脚本需要网络连接来访问腾讯云COS
3. **数据库状态**：确保数据库连接正常，表结构已创建
4. **重复运行**：脚本支持重复运行，会智能更新已存在的记录
5. **图片域名**：脚本会将图片URL设置为`https://clothing.0086.xyz/`，请确保域名已正确配置CDN

## 故障排查

### 常见错误及解决方案

1. **COS配置错误**
   ```
   ❌ 请设置腾讯云COS环境变量：COS_SECRET_ID 和 COS_SECRET_KEY
   ```
   解决：检查`.env`文件中的COS配置

2. **数据库连接失败**
   ```
   ❌ 数据库连接失败
   ```
   解决：检查`DATABASE_URL`配置，确保数据库已启动

3. **COS访问权限不足**
   ```
   ❌ 获取COS文件列表失败
   ```
   解决：检查COS密钥权限，确保有读取存储桶权限

4. **文件路径格式错误**
   ```
   ⚠️ 文件路径格式不正确
   ```
   解决：检查COS中的文件是否按要求的目录结构组织

## 执行日志示例

```
🚀 开始同步腾讯云COS衣服数据...
🌐 图片域名: clothing.0086.xyz  
🪣 存储桶: clothing-1252414414
📁 目录: clothinges/

🔍 正在扫描腾讯云COS存储桶: clothing-1252414414
📁 扫描目录: clothinges/
✅ 找到 15 个图片文件

📸 处理文件: clothinges/female/coats/coat1.jpg
  👤 性别: 女装
  👗 分类: 外套  
  📷 图片URL: https://clothing.0086.xyz/female/coats/coat1.jpg
📂 创建一级分类: 女装
📂 创建二级分类: 女装 -> 外套
➕ 创建衣服: coat1

📊 同步完成统计:
✅ 成功处理: 15 个文件
❌ 处理失败: 0 个文件
📁 总文件数: 15 个

🗄️ 数据库统计:
📂 分类总数: 4
👕 衣服总数: 15

🎉 数据同步完成！
```

## 更新记录

- **v1.0.0** - 初始版本，支持基本的COS文件同步功能
- 支持自动分类创建和映射
- 支持智能衣服数据管理
- 完善的错误处理和日志记录