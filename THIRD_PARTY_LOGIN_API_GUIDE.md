# 第三方二维码登录接口文档 v2.0

> **最后更新**: 2025-10-28  
> **版本**: v2.0 - 生产环境完整版  
> **状态**: ✅ 已验证并可直接使用

## 📋 文档说明

本文档提供**设备端**集成第三方二维码登录系统的**完整接口规范**，设备端开发者只需按本文档实现，即可完成接入。

**包含内容**：
- ✅ 所有接口的完整URL、参数、响应格式
- ✅ 标准调用流程和时序图
- ✅ 可直接复制的完整代码示例
- ✅ 常见错误处理方案

---

## 🔑 核心概念

### 1. token 即 sceneStr

**最重要的设计原则**：

```javascript
// 第三方返回的 token 直接当作 sceneStr 使用
const userToken = "11a66dda157cb22f3ed47ad3f6829a58";  // 从轮询接口获取
const sceneStr = userToken;  // ⭐ 它们是同一个值

// 后续所有接口都使用这个 token
uploadPhoto({ sceneStr: userToken });
startTryon({ sceneStr: userToken });
```

### 2. 设备认证无校验

- ✅ 任何设备调用都会成功
- ✅ 被禁用的设备会自动激活
- ✅ 一定会返回有效的 token

### 3. 登录方式标识 (loginType)

**重要**：为支持多种登录方式，关键接口需要携带 `loginType` 字段：

```javascript
// 生成二维码时指定登录类型
generateQRCode({ deviceId, loginType: "third_party" });

// 上传照片时携带登录类型
uploadPhoto({ sceneStr, loginType: "third_party" });

// 启动试穿时指定登录类型
startTryon({ sceneStr, loginType: "third_party" });
```

**可选值**：
- `"wechat"` - 微信公众号登录
- `"third_party"` - 第三方二维码登录（默认）

**设计目的**：
- ✅ 明确标识登录来源
- ✅ 支持未来扩展新的登录方式
- ✅ 便于服务端做不同逻辑处理

### 4. 积分自动扣除

- ✅ 启动试穿时自动调用第三方积分接口
- ❌ 积分不足会阻止试穿（返回 402）
- ❌ 积分接口异常也会阻止试穿（返回 500）

---

## 🚀 完整业务流程

### 简化流程

```
1. 设备认证 → 获取 deviceToken + deviceId
2. 生成QR码 → 显示给用户
3. 轮询登录 → 获取 token(即 sceneStr)
4. 上传照片 → 使用 token 创建任务
5. 启动试穿 → 自动扣积分 + 开始处理
6. 查询结果 → 显示试穿结果
```

---

## 📡 接口详细说明

### 接口基础信息

**API Base URL**: `https://clothing-api.0086studios.xyz`

**认证方式**: 
- 设备认证、轮询登录：无需认证
- 其他接口：`Authorization: Bearer {deviceToken}`

---

### 1【必选】设备认证

```
POST https://clothing-api.0086studios.xyz/api/auth/device
Content-Type: application/json
```

**请求Body**:
```json
{
  "macAddress": "AA:BB:CC:DD:EE:FF",
  "deviceName": "试衣间-01"
}
```

**成功响应 (200)**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "device": {
    "id": "clp4x1234567890",
    "macAddress": "AA:BB:CC:DD:EE:FF",
    "deviceName": "试衣间-01",
    "isActive": true
  }
}
```

**必须保存**: `token`(设备token) 和 `device.id`(设备ID)

---

### 2【必选】生成二维码

```
POST https://clothing-api.0086studios.xyz/api/auth/qrcode
Content-Type: application/json
```

**请求Body**:
```json
{
  "deviceId": "clp4x1234567890",
  "loginType": "third_party"  // ⭐ 新增：登录类型标识
}
```

**成功响应 (200)**:
```json
{
  "success": true,
  "qrCode": {
    "dataURL": "data:image/png;base64,iVBORw0KGgoAAAANSUhEU...",
    "deviceId": "clp4x1234567890",
    "expiresIn": 300,
    "loginType": "third_party"  // ⭐ 返回登录类型
  }
}
```

**字段说明**:

| 字段 | 类型 | 必选 | 说明 |
|------|------|------|------|
| `deviceId` | string | ✅ | 设备ID（从认证接口获取） |
| `loginType` | string | ✅ | 登录类型："third_party" 或 "wechat" |

**使用方式**: `<img src="{qrCode.dataURL}">`

---

### 3【必选】轮询登录状态

```
GET https://clothing-api.0086studios.xyz/api/auth/poll-login/{deviceId}
```

**未登录响应 (200)**:
```json
{
  "success": true,
  "isLoggedIn": false
}
```

**登录成功响应 (200)**:
```json
{
  "success": true,
  "isLoggedIn": true,
  "user": {
    "account": "u92719091",
    "token": "11a66dda157cb22f3ed47ad3f6829a58",
    "sceneStr": "11a66dda157cb22f3ed47ad3f6829a58",
    "nickname": "用户92719091"
  }
}
```

**必须保存**: `user.token` (就是 sceneStr)

**轮询策略**: 每3秒一次，最多5分钟

---

### 4【必选】上传照片

```
POST https://clothing-api.0086studios.xyz/api/tasks/upload-photo
Authorization: Bearer {deviceToken}
Content-Type: multipart/form-data
```

**FormData参数**:
```javascript
FormData {
  photo: <File>,
  sceneStr: "11a66dda157cb22f3ed47ad3f6829a58",  // ⭐ 使用轮询得到的token
  loginType: "third_party"                      // ⭐ 新增：登录类型标识
}
```

**字段说明**:

| 字段 | 类型 | 必选 | 说明 |
|------|------|------|------|
| `photo` | File | ✅ | 用户照片文件 |
| `sceneStr` | string | ✅ | 第三方token（从轮询接口获取） |
| `loginType` | string | ✅ | 登录类型："third_party" |

**成功响应 (200)**:
```json
{
  "success": true,
  "data": {
    "taskId": "task_456",
    "sceneStr": "11a66dda157cb22f3ed47ad3f6829a58"
  }
}
```

---

### 5【必选】启动试穿（含积分扣除）

```
POST https://clothing-api.0086studios.xyz/api/tasks/start-tryon
Authorization: Bearer {deviceToken}
Content-Type: application/json
```

**请求Body**:
```json
{
  "taskId": "task_456",
  "sceneStr": "11a66dda157cb22f3ed47ad3f6829a58",
  "topClothesId": "clothes_001",
  "bottomClothesId": "clothes_002",
  "loginType": "third_party"  // ⭐ 新增：登录类型标识
}
```

**字段说明**:

| 字段 | 类型 | 必选 | 说明 |
|------|------|------|------|
| `taskId` | string | ✅ | 任务ID（从上传照片接口获取） |
| `sceneStr` | string | ✅ | 第三方token |
| `topClothesId` | string | ✅ | 上衣ID |
| `bottomClothesId` | string | ❌ | 下衣ID（可选） |
| `loginType` | string | ✅ | 登录类型："third_party" |

**成功响应 (200)**:
```json
{
  "success": true,
  "data": {
    "taskId": "task_456",
    "status": "PROCESSING"
  }
}
```

**积分不足 (402)**:
```json
{
  "error": "积分不足或扣除失败",
  "code": "INSUFFICIENT_POINTS"
}
```

**积分接口异常 (500)**:
```json
{
  "error": "积分扣除接口调用失败",
  "code": "POINT_API_ERROR"
}
```

---

### 6【可选】查询任务状态

```
GET https://clothing-api.0086studios.xyz/api/tasks/{taskId}
Authorization: Bearer {deviceToken}
```

**成功响应 (200)**:
```json
{
  "success": true,
  "data": {
    "id": "task_456",
    "status": "COMPLETED",
    "resultUrl": "https://..."
  }
}
```

---

## 💻 完整代码示例

```javascript
class ClothingDeviceSDK {
  constructor() {
    this.baseURL = 'https://clothing-api.0086studios.xyz';
    this.deviceToken = null;
    this.deviceId = null;
    this.userToken = null;  // 这个就是 sceneStr
  }

  // 步骤1: 设备认证
  async authenticate(macAddress, deviceName) {
    const response = await fetch(`${this.baseURL}/api/auth/device`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ macAddress, deviceName })
    });
    
    const data = await response.json();
    this.deviceToken = data.token;
    this.deviceId = data.device.id;
    
    return { deviceToken: this.deviceToken, deviceId: this.deviceId };
  }

  // 步骤2: 生成二维码
  async generateQRCode(loginType = 'third_party') {
    const response = await fetch(`${this.baseURL}/api/auth/qrcode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        deviceId: this.deviceId,
        loginType: loginType  // ⭐ 指定登录类型
      })
    });
    
    const data = await response.json();
    return data.qrCode;
  }

  // 步骤3: 轮询登录
  async startPolling(onSuccess, onError) {
    let count = 0;
    const maxPolls = 100;
    
    const interval = setInterval(async () => {
      if (++count > maxPolls) {
        clearInterval(interval);
        onError(new Error('二维码已过期'));
        return;
      }

      try {
        const response = await fetch(
          `${this.baseURL}/api/auth/poll-login/${this.deviceId}`
        );
        const data = await response.json();

        if (data.isLoggedIn) {
          clearInterval(interval);
          this.userToken = data.user.token;  // ⭐ 保存token
          onSuccess({ token: this.userToken, user: data.user });
        }
      } catch (error) {
        console.warn('轮询出错，继续重试');
      }
    }, 3000);
  }

  // 步骤4: 上传照片
  async uploadPhoto(photoFile, loginType = 'third_party') {
    const formData = new FormData();
    formData.append('photo', photoFile);
    formData.append('sceneStr', this.userToken);  // ⭐ 使用token作为sceneStr
    formData.append('loginType', loginType);      // ⭐ 指定登录类型
    
    const response = await fetch(`${this.baseURL}/api/tasks/upload-photo`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.deviceToken}` },
      body: formData
    });
    
    const data = await response.json();
    return data.data.taskId;
  }

  // 步骤5: 启动试穿
  async startTryon(taskId, topClothesId, bottomClothesId, loginType = 'third_party') {
    const response = await fetch(`${this.baseURL}/api/tasks/start-tryon`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.deviceToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        taskId,
        sceneStr: this.userToken,  // ⭐ 使用token作为sceneStr
        topClothesId,
        bottomClothesId,
        loginType: loginType        // ⭐ 指定登录类型
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      if (error.code === 'INSUFFICIENT_POINTS') {
        throw new Error('积分不足');
      }
      throw new Error(error.error);
    }
    
    return await response.json();
  }

  // 步骤6: 查询任务
  async getTaskStatus(taskId) {
    const response = await fetch(`${this.baseURL}/api/tasks/${taskId}`, {
      headers: { 'Authorization': `Bearer ${this.deviceToken}` }
    });
    
    const data = await response.json();
    return data.data;
  }
}

// ==================== 使用示例 ====================

const sdk = new ClothingDeviceSDK();

// 完整流程
async function runCompleteFlow() {
  try {
    // 1. 认证
    await sdk.authenticate('AA:BB:CC:DD:EE:FF', '试衣间-01');
    
    // 2. 生成二维码
    const qrCode = await sdk.generateQRCode();
    document.getElementById('qrcode').src = qrCode.dataURL;
    
    // 3. 轮询登录
    await sdk.startPolling(
      ({ token, user }) => {
        console.log('登录成功, token:', token);
        // 继续下一步...
      },
      (error) => alert(error.message)
    );
    
    // 4. 上传照片
    const taskId = await sdk.uploadPhoto(photoFile);
    
    // 5. 启动试穿
    await sdk.startTryon(taskId, 'clothes_001', 'clothes_002');
    
    // 6. 查询结果
    const interval = setInterval(async () => {
      const task = await sdk.getTaskStatus(taskId);
      if (task.status === 'COMPLETED') {
        clearInterval(interval);
        showResult(task.resultUrl);
      }
    }, 5000);
    
  } catch (error) {
    console.error('流程出错:', error);
    alert(error.message);
  }
}
```

---

## ⚠️ 重要注意事项

### 1. token 即 sceneStr

```javascript
// ✅ 正确
const sceneStr = loginResult.user.token;

// ❌ 错误：不要尝试转换
const sceneStr = convertToken(loginResult.user.token);
```

### 2. loginType 字段是必选的

**为什么需要 loginType？**
- ✅ 支持多种登录方式（微信/第三方）
- ✅ 服务端可以根据类型做不同处理
- ✅ 便于未来扩展新的认证方式

**在哪些接口中需要**：
```javascript
// 1. 生成二维码时
generateQRCode({ deviceId, loginType: "third_party" });

// 2. 上传照片时
formData.append('loginType', 'third_party');

// 3. 启动试穿时
startTryon({ taskId, sceneStr, loginType: "third_party" });
```

**当前支持的值**：
- `"third_party"` - 第三方二维码登录（推荐）
- `"wechat"` - 微信公众号登录

### 3. 轮询策略

- 间隔: 3秒
- 超时: 5分钟
- 失败处理: 继续轮询，不中断

### 3. 轮询策略

- 间隔: 3秒
- 超时: 5分钟
- 失败处理: 继续轮询，不中断

### 4. 积分扣除

- 启动试穿时自动扣除
- 失败会阻止试穿
- 需要处理402和500错误

---

## 🔧 错误码速查

| 状态码 | 错误码 | 说明 | 处理方式 |
|--------|--------|------|----------|
| 402 | INSUFFICIENT_POINTS | 积分不足 | 提示充值 |
| 500 | POINT_API_ERROR | 积分接口异常 | 提示稍后重试 |
| 401 | MISSING_TOKEN | 缺少认证 | 重新认证 |
| 404 | - | 资源不存在 | 检查ID |

---

## ✅ 集成检查清单

接入前确认：
- [ ] 已获取正确的API Base URL
- [ ] 理解 token = sceneStr 的概念
- [ ] 理解 loginType 字段的作用
- [ ] 了解轮询登录的实现方式
- [ ] 知道如何处理积分不足错误

开发中确认：
- [ ] 设备认证获取到 deviceToken
- [ ] 二维码正确显示
- [ ] 轮询登录正确保存 token
- [ ] 生成二维码时携带 loginType
- [ ] 上传照片使用正确的 sceneStr 和 loginType
- [ ] 启动试穿携带 loginType 字段
- [ ] 启动试穿处理积分错误

测试验证：
- [ ] 完整流程可以走通
- [ ] 积分不足时正确提示
- [ ] 二维码过期时正确刷新
- [ ] 任务状态正确查询

---

**如有问题，请联系技术支持或查看部署文档 [THIRD_PARTY_LOGIN_DEPLOYMENT.md](./THIRD_PARTY_LOGIN_DEPLOYMENT.md)**
