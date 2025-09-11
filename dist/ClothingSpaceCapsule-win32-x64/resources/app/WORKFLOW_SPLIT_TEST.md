# 工作流拆分功能测试文档

## 功能概述

根据用户选择的服装类型，系统现在会使用不同的工作流ID：

1. **单件服装工作流** (`singleItemWorkflowId`)：用于裙子或单上衣
2. **上衣+下衣工作流** (`topBottomWorkflowId`)：用于上衣和下衣的组合

## 测试场景

### 场景1：选择裙子
- **预期行为**：使用 `singleItemWorkflowId`
- **测试步骤**：
  1. 进入服装选择页面
  2. 选择"裙子"分类
  3. 选择任意一件裙子
  4. 拍摄照片并提交
  5. 检查控制台日志，确认使用了正确的工作流ID

### 场景2：只选择上衣
- **预期行为**：使用 `singleItemWorkflowId`
- **测试步骤**：
  1. 进入服装选择页面
  2. 选择"上衣&下衣"分类
  3. 在"上衣"子分类中选择一件上衣
  4. 不选择下衣
  5. 拍摄照片并提交
  6. 检查控制台日志，确认使用了正确的工作流ID

### 场景3：选择上衣+下衣
- **预期行为**：使用 `topBottomWorkflowId`
- **测试步骤**：
  1. 进入服装选择页面
  2. 选择"上衣&下衣"分类
  3. 在"上衣"子分类中选择一件上衣
  4. 在"下衣"子分类中选择一件下衣
  5. 拍摄照片并提交
  6. 检查控制台日志，确认使用了正确的工作流ID

## 配置验证

### 配置文件检查
- `config.js` 和 `config.example.js` 应包含两个工作流ID配置
- `config.runtime.json` 应包含实际的工作流ID值

### 代码逻辑检查
- `startRunningHubTask` 方法应根据服装类型选择正确的工作流ID
- 已删除 `nodeId=301` 的相关代码
- 错误处理应包含工作流ID配置检查

## 预期日志输出

### 单件服装（裙子或单上衣）
```
🔍 配置验证: {
  apiKey: "e61ae6a8...",
  workflowId: "single_item_workflow_id",
  baseUrl: "https://www.runninghub.cn",
  clothingType: "裙子" // 或 "单上衣"
}
```

### 上衣+下衣
```
🔍 配置验证: {
  apiKey: "e61ae6a8...",
  workflowId: "top_bottom_workflow_id",
  baseUrl: "https://www.runninghub.cn",
  clothingType: "上衣+下衣"
}
```

## 错误处理测试

### 测试1：未配置单件工作流ID
- 只选择上衣，不选择下衣
- 预期：显示错误"请先配置单件服装工作流ID (singleItemWorkflowId)"

### 测试2：未配置上衣下衣工作流ID
- 选择上衣和下衣
- 预期：显示错误"请先配置上衣下衣工作流ID (topBottomWorkflowId)"

### 测试3：未选择任何服装
- 不选择任何服装直接提交
- 预期：显示错误"未检测到有效的服装选择"

## 技术实现细节

### 工作流选择逻辑
```javascript
if (clothingUploadResults.dress || (clothingUploadResults.top && !clothingUploadResults.bottom)) {
    // 裙子或单上衣：使用单件工作流
    workflowId = config.runninghub.singleItemWorkflowId;
} else if (clothingUploadResults.top && clothingUploadResults.bottom) {
    // 上衣+下衣：使用上衣下衣工作流
    workflowId = config.runninghub.topBottomWorkflowId;
}
```

### 删除的代码
- 移除了 `nodeId=301` 的额外配置
- 简化了nodeInfoList的构建逻辑

## 注意事项

1. 确保两个工作流ID都正确配置
2. 工作流ID应该对应实际存在的RunningHub工作流
3. 不同工作流可能对图片数量有不同的要求
4. 测试时注意观察控制台日志，确认使用了正确的工作流ID
