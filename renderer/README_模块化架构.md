# 衣等舱客户端 - 模块化架构文档

## 📁 目录结构

```
renderer/
├── core/                      # 核心模块
│   ├── AppState.js           # 全局状态管理
│   ├── PageManager.js        # 页面管理器
│   └── EventBus.js           # 事件总线
├── pages/                     # 页面模块
│   ├── WelcomePage.js        # 欢迎页/扫码关注页 ✅
│   ├── ProfilePage.js        # 拍照页 ✅
│   ├── PhotoConfirmPage.js   # 照片确认页 ✅
│   ├── PreferencePage.js     # 时尚偏好选择页 ✅
│   ├── ClothingPage.js       # 服装选择页 ✅
│   └── ResultsPage.js        # 试衣结果页 ✅
├── components/                # 公共组件
│   ├── Notification.js       # 通知组件
│   ├── Loading.js            # 加载组件
│   ├── Button.js             # 按钮组件（待创建）
│   └── Modal.js              # 模态框组件（待创建）
├── utils/                     # 工具函数
│   ├── camera.js             # 摄像头工具
│   ├── image.js              # 图片处理（待创建）
│   └── validators.js         # 验证工具（待创建）
├── config/                    # 配置文件
│   └── constants.js          # 常量定义
├── api-client.js             # API客户端
├── main.js                   # 应用主入口
└── index.html                # HTML入口
```

## 🔧 使用方法

### 1. 在HTML中引入模块

在 `index.html` 的 `<head>` 部分添加以下脚本引用（**按顺序**）:

```html
<!-- 1. 配置和常量 -->
<script src="config/constants.js"></script>

<!-- 2. 核心模块 -->
<script src="core/EventBus.js"></script>
<script src="core/AppState.js"></script>
<script src="core/PageManager.js"></script>

<!-- 3. 工具函数 -->
<script src="utils/camera.js"></script>

<!-- 4. 公共组件 -->
<script src="components/Notification.js"></script>
<script src="components/Loading.js"></script>

<!-- 5. API客户端 -->
<script src="api-client.js"></script>

<!-- 6. 页面模块 -->
<script src="pages/WelcomePage.js"></script>
<!-- 其他页面... -->

<!-- 7. 主入口（必须最后加载） -->
<script src="main.js"></script>
```

### 2. 创建新页面

每个页面都应该遵循以下模式：

```javascript
class MyPage {
    constructor() {
        this.pageId = 'my-page-id';
        this.initialized = false;
    }

    /**
     * 页面进入时触发
     */
    async onEnter(data = {}) {
        console.log('📄 进入页面');
        
        // 首次初始化
        if (!this.initialized) {
            await this.initialize();
            this.initialized = true;
        }
        
        // 页面逻辑
    }

    /**
     * 页面离开时触发
     */
    async onLeave() {
        console.log('📤 离开页面');
        
        // 清理资源
    }

    /**
     * 初始化页面
     */
    async initialize() {
        // 初始化逻辑
    }
}

// 注册页面
if (typeof window !== 'undefined') {
    window.MyPage = MyPage;
    const myPage = new MyPage();
    if (window.pageManager) {
        window.pageManager.registerPage('my-page-id', myPage);
    }
}
```

### 3. 页面导航

```javascript
// 切换到指定页面
await window.pageManager.navigateTo('page-id', { data: 'value' });

// 返回上一页
await window.pageManager.goBack();
```

### 4. 状态管理

```javascript
// 访问全局状态
window.appState.userProfile.openid
window.appState.selectedClothing
window.appState.currentTask

// 修改状态
window.appState.userProfile.openid = 'xxx';
```

### 5. 事件通信

```javascript
// 订阅事件
window.eventBus.on(window.APP_CONSTANTS.EVENTS.PHOTO_CAPTURED, (data) => {
    console.log('照片已拍摄:', data);
});

// 触发事件
window.eventBus.emit(window.APP_CONSTANTS.EVENTS.PHOTO_CAPTURED, {
    imageUrl: 'xxx'
});

// 取消订阅
window.eventBus.off(window.APP_CONSTANTS.EVENTS.PHOTO_CAPTURED, callback);
```

### 6. 通知提示

```javascript
// 显示信息
window.notification.info('这是一条提示');

// 显示成功
window.notification.success('操作成功');

// 显示警告
window.notification.warning('请注意');

// 显示错误
window.notification.error('操作失败');
```

### 7. 加载状态

```javascript
// 显示加载
window.loading.show('正在加载...', '请稍候');

// 隐藏加载
window.loading.hide();

// 更新消息
window.loading.updateMessage('新消息', '新副标题');
```

## 🎯 优势

### 1. 模块化
- 每个页面独立管理，互不影响
- 易于维护和扩展
- 代码复用性高

### 2. 解耦
- 页面间通过事件总线通信
- 状态统一管理
- 降低代码耦合度

### 3. 可测试性
- 每个模块可独立测试
- 便于单元测试和集成测试

### 4. 开发效率
- 多人协作更容易
- 修改一个页面不影响其他页面
- 新增功能只需创建新模块

## 📝 迁移指南

### 从旧版app.js迁移

1. **识别页面逻辑**
   - 在旧的app.js中找到每个页面的相关代码
   - 包括初始化、事件处理、页面切换等

2. **创建页面模块**
   - 为每个页面创建独立的JS文件
   - 实现 `onEnter`、`onLeave` 和 `initialize` 方法

3. **提取公共逻辑**
   - 将可复用的代码提取到 `utils/` 或 `components/`
   - 避免代码重复

4. **更新HTML**
   - 在index.html中引入新的模块文件
   - 移除或重命名旧的app.js

5. **测试**
   - 逐页测试功能是否正常
   - 确保页面切换流程正确

## 🔍 常用常量

```javascript
// 页面ID
window.APP_CONSTANTS.PAGES.WELCOME
window.APP_CONSTANTS.PAGES.PROFILE
window.APP_CONSTANTS.PAGES.CLOTHING
window.APP_CONSTANTS.PAGES.RESULTS

// 事件名称
window.APP_CONSTANTS.EVENTS.PAGE_CHANGE
window.APP_CONSTANTS.EVENTS.USER_LOGIN
window.APP_CONSTANTS.EVENTS.PHOTO_CAPTURED
window.APP_CONSTANTS.EVENTS.TASK_COMPLETED

// 其他配置
window.APP_CONSTANTS.API_CONFIG
window.APP_CONSTANTS.IMAGE_CONFIG
window.APP_CONSTANTS.POLLING_CONFIG
```

## 🚀 下一步

✅ **已完成的页面迁移**：
1. ✅ WelcomePage - 欢迎页/扫码关注页
2. ✅ ProfilePage - 拍照页
3. ✅ PhotoConfirmPage - 照片确认页
4. ✅ PreferencePage - 时尚偏好选择页
5. ✅ ClothingPage - 服装选择页
6. ✅ ResultsPage - 试衣结果页

**待完善**：
1. 完善公共组件（Button、Modal等）
2. 添加更多工具函数（图片处理、验证等）
3. 编写单元测试
4. 优化性能和用户体验
5. 逐步移除旧版app.js的代码

## 📚 页面模块详细说明

### 1. WelcomePage（欢迎页）
**功能**：
- 生成微信关注二维码
- 启动微信关注状态检查定时器（每5秒）
- 关注成功后自动跳转到拍照页

**全局方法**：
- 无（所有交互都是自动的）

**生命周期**：
- `onEnter`: 生成二维码，启动定时器
- `onLeave`: 停止定时器

---

### 2. ProfilePage（拍照页）
**功能**：
- 初始化摄像头
- 拍摄用户全身照
- 倒计时拍照功能

**全局方法**：
- `capturePhotoWithCountdown()` - HTML调用的拍照方法

**生命周期**：
- `onEnter`: 初始化摄像头，启用UI
- `onLeave`: 关闭摄像头，释放资源

**状态**：
- 拍摄的照片保存到 `appState.capturedPhotoData`

---

### 3. PhotoConfirmPage（照片确认页）
**功能**：
- 显示拍摄的照片
- 提供重新拍摄功能
- 上传照片到服务器
- 进行设备认证

**全局方法**：
- `retakePhoto()` - 重新拍摄
- `confirmPhoto()` - 确认并上传照片

**生命周期**：
- `onEnter`: 显示照片预览
- `onLeave`: 清理预览数据

**API调用**：
- `uploadPhoto()` - 上传照片
- `authenticateDevice()` - 设备认证

**状态变化**：
- 上传成功后保存 `appState.currentTaskId`

---

### 4. PreferencePage（时尚偏好选择页）
**功能**：
- 提供两种模式选择：个性换装 / 推荐穿搭
- 个性换装：跳转到服装选择页面，用户自由搭配
- 推荐穿搭：调用AI推荐接口，自动选择服装

**全局方法**：
- `selectCustomStyle()` - 选择个性换装
- `selectRecommendedStyle()` - 选择推荐穿搭

**生命周期**：
- `onEnter`: 重置偏好状态
- `onLeave`: 清理资源

**API调用**：
- `getRecommendedOutfit()` - 获取AI推荐穿搭

**状态变化**：
- `appState.fashionPreference` - 保存用户选择的偏好
- `appState.recommendedOutfit` - 保存推荐的服装数据

---

### 5. ClothingPage（服装选择页）
**功能**：
- 性别切换（男装/女装）
- 服装类别切换（上衣+下衣 / 连衣裙）
- 服装选择和预览
- 启动试衣流程
- 轮询试衣状态（每5秒）

**全局方法**：
- `switchGender(gender)` - 切换性别
- `switchClothingCategory(category)` - 切换服装类别
- `startTryOn()` - 开始试衣

**生命周期**：
- `onEnter`: 加载服装数据，初始化UI
- `onLeave`: 停止试衣状态检查定时器

**API调用**：
- `getClothingList()` - 获取服装列表
- `startTryOn()` - 启动试衣任务
- `checkTryOnStatus()` - 检查试衣状态

**状态管理**：
- `currentGender` - 当前选择的性别
- `currentCategory` - 当前服装类别
- `selectedTop/Bottom/Dress` - 选择的服装
- `appState.tryOnTaskId` - 试衣任务ID

**特性**：
- 支持推荐模式：直接显示AI推荐的服装
- 支持自定义模式：用户自由选择服装
- 实时渲染服装列表
- 定时器检查试衣完成状态

---

### 6. ResultsPage（试衣结果页）
**功能**：
- 显示试衣结果图片
- 自动倒计时（15秒后返回欢迎页）
- 重新试衣功能
- 保存图片功能
- 分享结果功能

**全局方法**：
- `retryTryOn()` - 重新试衣
- `saveResultImage()` - 保存图片
- `shareResult()` - 分享结果
- `returnToWelcome()` - 返回欢迎页
- `cancelCountdown()` - 取消倒计时
- `viewResultDetails()` - 查看详细信息

**生命周期**：
- `onEnter`: 显示结果，启动倒计时
- `onLeave`: 停止倒计时，清理数据

**定时器管理**：
- 15秒倒计时自动返回欢迎页
- 可手动取消倒计时
- 实时更新倒计时显示和进度条

**特性**：
- 支持Electron环境的文件保存对话框
- 支持Web环境的图片下载
- 支持Web Share API分享
- 自动清理应用状态

**状态清理**：
返回欢迎页时会清理以下状态：
- `currentTaskId`
- `tryOnTaskId`
- `tryOnResult`
- `capturedPhotoData`
- `fashionPreference`
- `recommendedOutfit`

## ❓ 常见问题

### Q: 如何在页面间传递数据？
A: 使用 `navigateTo` 的第二个参数，或者通过全局状态 `appState`，或者使用事件总线。

### Q: 页面切换时如何清理资源？
A: 在页面的 `onLeave` 方法中清理资源（如定时器、事件监听等）。

### Q: 如何调试页面切换问题？
A: 检查浏览器控制台的日志，每次页面切换都会有详细的日志输出。

### Q: 旧代码还能用吗？
A: 新架构设计时考虑了向后兼容，但建议尽快迁移到新架构。
