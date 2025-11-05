# 第三方登录功能检查清单

> **用途**: 快速验证第三方登录功能是否正确实现  
> **检查日期**: _________

---

## ✅ 代码修改检查

### 1. API 客户端 (api-client.js)

- [ ] `generateQRCode()` 方法已添加
- [ ] `pollLoginStatus()` 方法已添加
- [ ] `uploadPhoto()` 添加了 `loginType` 参数
- [ ] `startTryonTask()` 添加了 `loginType` 参数
- [ ] `startTryonTask()` 包含积分错误处理
- [ ] `request()` 方法添加了 `X-Login-Type` 请求头

### 2. 欢迎页 (WelcomePage.js)

- [ ] `generateWechatQRCode()` 支持两种登录方式
- [ ] `startWechatStatusCheck()` 根据类型选择检查方式
- [ ] `startThirdPartyLoginPolling()` 方法已添加
- [ ] `startWechatSubscriptionCheck()` 方法已添加

### 3. 照片确认页 (PhotoConfirmPage.js)

- [ ] `confirmPhoto()` 传递 `loginType` 参数

### 4. 衣服选择页 (ClothingPage.js)

- [ ] `startTryOn()` 传递 `loginType` 参数
- [ ] 添加了积分不足错误处理
- [ ] 添加了积分接口异常错误处理

### 5. 应用状态 (AppState.js)

- [ ] `getLoginType()` 方法已添加
- [ ] `setLoginType()` 方法已添加

### 6. 配置页面 (index.html)

- [ ] 登录方式选择框已添加
- [ ] 两个选项都存在（微信/第三方）

### 7. 配置管理 (main.js)

- [ ] `openConfig()` 加载登录方式配置
- [ ] `saveConfig()` 保存登录方式配置
- [ ] `loadConfig()` 读取登录方式配置

---

## 🧪 功能测试检查

### 配置功能

- [ ] 打开配置页面（右上角连续点击5次）
- [ ] 登录方式下拉框显示正常
- [ ] 切换登录方式并保存
- [ ] 重新打开配置页，选择保持不变
- [ ] 检查 localStorage 中的 `loginType` 值

### 微信登录流程

- [ ] 配置为"微信公众号登录"
- [ ] 生成二维码成功
- [ ] 每5秒检查关注状态（不是3秒）
- [ ] 扫码关注后自动跳转

### 第三方登录流程

- [ ] 配置为"第三方二维码登录"
- [ ] 生成二维码成功
- [ ] 每3秒轮询登录状态
- [ ] 扫码登录后获取 token
- [ ] token 保存为 sceneStr
- [ ] 自动跳转到拍照页

### 上传照片

- [ ] 微信登录: 携带正确的 sceneStr 和 loginType
- [ ] 第三方登录: 携带 token 和 loginType
- [ ] FormData 中包含 loginType 字段
- [ ] 上传成功返回 taskId

### 启动试穿

- [ ] 微信登录: 请求体包含 loginType: 'wechat'
- [ ] 第三方登录: 请求体包含 loginType: 'third_party'
- [ ] 积分不足时显示正确提示
- [ ] 积分接口异常时显示正确提示
- [ ] 正常情况下启动成功

---

## 🔍 API 请求检查

打开浏览器开发者工具，检查以下内容：

### 请求头检查

- [ ] 所有 API 请求都包含 `X-Login-Type` 头
- [ ] Header 值为 'wechat' 或 'third_party'

### 生成二维码请求

```json
POST /api/auth/qrcode
{
  "deviceId": "...",
  "loginType": "third_party"  // 或 "wechat"
}
```

### 上传照片请求

```
POST /api/tasks/upload-photo
FormData:
  - photo: File
  - sceneStr: "..."
  - loginType: "third_party"  // 或 "wechat"
```

### 启动试穿请求

```json
POST /api/tasks/start-tryon
{
  "taskId": "...",
  "topClothesId": "...",
  "sceneStr": "...",
  "loginType": "third_party"  // 或 "wechat"
}
```

---

## 📊 日志检查

在浏览器控制台查找以下日志：

### 配置相关

- [ ] `✅ 已加载登录方式: wechat` 或 `third_party`
- [ ] `✅ 登录方式已设置: ...`

### 二维码生成

- [ ] `🔑 当前登录方式: ...`
- [ ] `✅ 二维码生成成功`

### 登录检查

- [ ] 微信: `🔄 启动微信关注状态检查`
- [ ] 第三方: `🔄 启动登录状态检查` + `第 X 次轮询...`

### 上传照片

- [ ] `🔑 使用登录方式: ...`
- [ ] `✅ 照片上传成功`

### 启动试穿

- [ ] `🔑 使用登录方式: ...`
- [ ] `🚀 启动试穿请求: { ..., loginType: "..." }`

### 积分错误（第三方登录）

- [ ] 积分不足: `❌ 积分不足或扣除失败`
- [ ] 接口异常: `❌ 积分接口异常`

---

## 🎯 测试页面检查

### test-login-type-config.html

- [ ] 页面正常打开
- [ ] 显示当前配置
- [ ] 设置登录方式成功
- [ ] 测试保存配置成功
- [ ] 测试加载配置成功
- [ ] 测试API请求头成功

### test-third-party-login.html

- [ ] 页面正常打开
- [ ] 设备认证成功
- [ ] 生成二维码成功
- [ ] 二维码图片正常显示
- [ ] 开始轮询成功
- [ ] 停止轮询成功
- [ ] 步骤状态更新正常
- [ ] 日志输出正常

---

## ⚠️ 常见问题检查

### 问题 1: 登录方式没有保存

**检查**:
- [ ] `saveConfig()` 是否调用
- [ ] localStorage 中是否有 `loginType` 键
- [ ] 配置页面是否正常关闭

**解决**: 检查控制台错误，确认 localStorage 可用

---

### 问题 2: 轮询没有启动

**检查**:
- [ ] `loginType` 是否正确设置
- [ ] `deviceId` 是否存在
- [ ] 控制台是否有错误

**解决**: 检查 `startWechatStatusCheck()` 逻辑

---

### 问题 3: API 请求没有携带 loginType

**检查**:
- [ ] 请求头是否包含 `X-Login-Type`
- [ ] 请求体/FormData 是否包含 `loginType`
- [ ] localStorage 中的值是否正确

**解决**: 检查 `request()` 方法和具体接口实现

---

### 问题 4: 积分错误没有正确处理

**检查**:
- [ ] `startTryonTask()` 的 catch 块
- [ ] 错误消息是否匹配
- [ ] notification 是否正常显示

**解决**: 检查错误处理逻辑和消息匹配条件

---

## 📝 最终确认

完成所有检查后，请确认：

- [ ] 所有代码修改已完成
- [ ] 所有功能测试通过
- [ ] 所有 API 请求正确
- [ ] 所有日志正常输出
- [ ] 测试页面运行正常
- [ ] 常见问题已排查

---

**检查人**: ___________  
**检查日期**: ___________  
**备注**: ___________

---

**如有问题，请参考 [THIRD_PARTY_LOGIN_IMPLEMENTATION.md](./THIRD_PARTY_LOGIN_IMPLEMENTATION.md)**
