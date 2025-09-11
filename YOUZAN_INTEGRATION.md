# 有赞电商集成说明

## 分销链接需求

根据您的需求，每台设备都需要有独立的分销ID，用于追踪销售业绩。系统支持以下两种方案：

### 方案一：动态分销链接（推荐）

**优点**：
- 每台设备独立的分销ID
- 自动追踪销售业绩
- 无需API认证，简单可靠

**实现方式**：
1. 为每台设备配置分销ID
2. 在衣服数据中存储有赞商品ID
3. 系统自动生成分销链接：`https://h5.youzan.com/v2/goods/{商品ID}?distribution_id={分销ID}`

**分销链接格式**：
```
https://h5.youzan.com/v2/goods/{商品ID}?distribution_id={分销ID}
```

### 方案二：直接商品链接（备用）

**优点**：
- 简单直接，无需配置分销ID
- 适合不需要分销追踪的场景

**实现方式**：
1. 在有赞后台获取商品链接
2. 将链接存储到数据库的 `youzanUrl` 字段
3. 用户试穿完成后，通过微信推送商品链接

**商品链接格式**：
```
https://h5.youzan.com/v2/goods/{商品ID}
```

## 配置步骤

### 1. 设备分销ID配置

为每台设备设置分销ID：

```javascript
// 通过API设置设备分销ID
PUT /api/devices/distribution-id
{
  "distributionId": "device_001_distribution"
}
```

### 2. 衣服商品ID配置

在衣服数据中存储有赞商品ID：

```javascript
// 在数据库种子文件中
{
  name: '经典黑色风衣',
  youzanProductId: '123456', // 有赞商品ID
  youzanUrl: 'https://h5.youzan.com/v2/goods/123456' // 备用链接
}
```

### 3. 自动生成分销链接

系统会自动生成分销链接：

```javascript
// 生成的分销链接示例
https://h5.youzan.com/v2/goods/123456?distribution_id=device_001_distribution
```

### 方式二：API 集成（可选）

**优点**：
- 可以获取商品详情、库存、价格等信息
- 支持动态商品信息更新
- 可以获取用户购买数据

**缺点**：
- 需要申请有赞应用
- 配置相对复杂
- 需要处理 OAuth 认证流程

**实现方式**：
1. 在有赞开放平台申请应用
2. 配置 `YOUZAN_CLIENT_ID` 和 `YOUZAN_CLIENT_SECRET`
3. 通过 API 获取商品信息

## 推荐方案

对于大多数场景，**推荐使用方式一（直接商品链接）**，因为：

1. **简单易用**：无需复杂的 API 配置
2. **稳定可靠**：不依赖第三方 API 的稳定性
3. **快速上线**：可以立即使用，无需等待审核
4. **成本低**：无需申请有赞应用

## 使用示例

### 1. 添加商品链接

在衣服数据中添加 `youzanUrl` 字段：

```javascript
const clothes = {
  name: '经典黑色风衣',
  imageUrl: 'https://example.com/coat.jpg',
  prompt: 'a man wearing a classic black trench coat',
  youzanUrl: 'https://h5.youzan.com/v2/goods/123456' // 有赞商品链接
};
```

### 2. 微信推送商品链接

当用户试穿完成后，系统会自动推送商品链接：

```javascript
// 在 runninghub.js 中
const messageContent = `🎉 试穿完成！\n\n衣服：${clothesName}`;

if (youzanUrl) {
  messageContent += `\n\n🛒 购买链接：${youzanUrl}`;
}
```

### 3. 用户扫码购买

用户收到微信消息后，点击链接即可直接跳转到有赞商品页面进行购买。

## 配置说明

### 环境变量（可选）

如果使用方式二（API 集成），需要配置：

```env
# 有赞电商配置（可选，用于 API 集成）
YOUZAN_CLIENT_ID=your_youzan_client_id
YOUZAN_CLIENT_SECRET=your_youzan_client_secret
```

如果只使用方式一（直接链接），可以不配置这些参数。

### 数据库字段

在 `clothes` 表中，`youzanUrl` 字段是可选的：

```sql
CREATE TABLE clothes (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  imageUrl VARCHAR NOT NULL,
  prompt TEXT NOT NULL,
  youzanUrl VARCHAR, -- 可选，有赞商品链接
  -- 其他字段...
);
```

## 总结

- **推荐使用方式一**：直接商品链接，简单有效
- **方式二可选**：仅在需要动态获取商品信息时使用
- **无需强制配置**：有赞电商集成是可选的，不影响核心功能
- **灵活扩展**：后续可以根据需要升级到 API 集成方式
