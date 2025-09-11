# 分销链接管理 API 文档

## 概述

系统支持有赞电商的分销链接功能，每台设备可以配置独立的分销ID，用于追踪销售业绩。

## API 接口

### 1. 设置设备分销ID

**接口**：`PUT /api/devices/distribution-id`

**描述**：为当前设备设置分销ID

**请求头**：
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**：
```json
{
  "distributionId": "device_001_distribution"
}
```

**响应**：
```json
{
  "success": true,
  "message": "分销ID更新成功",
  "device": {
    "id": "device_id",
    "macAddress": "00:11:22:33:44:55",
    "deviceName": "设备-4455",
    "distributionId": "device_001_distribution",
    "isActive": true
  }
}
```

### 2. 获取设备分销ID

**接口**：`GET /api/devices/distribution-id`

**描述**：获取当前设备的分销ID

**请求头**：
```
Authorization: Bearer <token>
```

**响应**：
```json
{
  "success": true,
  "device": {
    "id": "device_id",
    "macAddress": "00:11:22:33:44:55",
    "deviceName": "设备-4455",
    "distributionId": "device_001_distribution"
  }
}
```

### 3. 获取设备列表（管理员）

**接口**：`GET /api/devices/list`

**描述**：获取所有设备列表，包含分销ID信息

**查询参数**：
- `page`: 页码（默认：1）
- `limit`: 每页数量（默认：20）

**响应**：
```json
{
  "success": true,
  "data": {
    "devices": [
      {
        "id": "device_id",
        "macAddress": "00:11:22:33:44:55",
        "deviceName": "设备-4455",
        "distributionId": "device_001_distribution",
        "isActive": true,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "_count": {
          "users": 5,
          "tasks": 12
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "pages": 1
    }
  }
}
```

### 4. 更新设备状态

**接口**：`PUT /api/devices/:deviceId/status`

**描述**：更新设备状态（启用/禁用）

**请求体**：
```json
{
  "isActive": true
}
```

**响应**：
```json
{
  "success": true,
  "message": "设备状态更新成功",
  "device": {
    "id": "device_id",
    "macAddress": "00:11:22:33:44:55",
    "deviceName": "设备-4455",
    "distributionId": "device_001_distribution",
    "isActive": true
  }
}
```

## 分销链接生成逻辑

### 自动生成流程

1. **用户创建试穿任务**
2. **系统检查设备分销ID和衣服商品ID**
3. **自动生成分销链接**
4. **存储到任务记录中**
5. **微信推送时使用分销链接**

### 链接格式

```
https://h5.youzan.com/v2/goods/{商品ID}?distribution_id={分销ID}
```

### 示例

```javascript
// 设备分销ID: "device_001_distribution"
// 商品ID: "123456"
// 生成的分销链接: "https://h5.youzan.com/v2/goods/123456?distribution_id=device_001_distribution"
```

## 数据库字段说明

### devices 表
- `distribution_id`: 设备的分销ID（可选）

### clothes 表
- `youzan_product_id`: 有赞商品ID（可选）
- `youzan_url`: 备用商品链接（可选）

### tasks 表
- `distribution_url`: 生成的分销链接（自动生成）

## 使用示例

### 1. 配置设备分销ID

```javascript
// 客户端代码示例
const response = await fetch('/api/devices/distribution-id', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    distributionId: 'device_001_distribution'
  })
});

const result = await response.json();
console.log('分销ID设置成功:', result.device.distributionId);
```

### 2. 创建试穿任务

```javascript
// 创建任务时自动生成分销链接
const taskResponse = await fetch('/api/tasks/create', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    clothesId: 'clothes_id',
    userPhotoUrl: 'https://example.com/photo.jpg'
  })
});

const task = await taskResponse.json();
// 任务创建成功后，系统会自动生成分销链接
```

### 3. 微信推送分销链接

当试穿任务完成时，系统会自动通过微信推送包含分销链接的消息：

```
🎉 试穿完成！

衣服：经典黑色风衣

🛒 购买链接：https://h5.youzan.com/v2/goods/123456?distribution_id=device_001_distribution
```

## 注意事项

1. **分销ID唯一性**：确保每台设备的分销ID是唯一的
2. **商品ID配置**：需要在衣服数据中正确配置有赞商品ID
3. **链接有效性**：分销链接的有效性取决于有赞平台的配置
4. **销售追踪**：通过分销链接的销售会在有赞后台显示对应的分销业绩

## 错误处理

### 常见错误

1. **分销ID未配置**
   ```json
   {
     "error": "设备分销ID未配置"
   }
   ```

2. **商品ID未配置**
   ```json
   {
     "error": "衣服商品ID未配置"
   }
   ```

3. **设备不存在**
   ```json
   {
     "error": "设备不存在"
   }
   ```

### 降级处理

如果分销链接生成失败，系统会：
1. 优先使用已生成的分销链接
2. 其次使用衣服数据中的备用链接
3. 最后不推送购买链接
