# 配置页面工作流ID分离功能测试文档

## 功能概述

配置页面现在支持两个独立的工作流ID配置：

1. **单件服装工作流ID** (`singleItemWorkflowId`)：用于裙子或单上衣
2. **上衣+下衣工作流ID** (`topBottomWorkflowId`)：用于上衣和下衣的组合

原来的 `workflowId` 字段现在映射到 `singleItemWorkflowId`，保持向后兼容性。

## 测试场景

### 场景1：查看配置页面界面
- **预期行为**：配置页面应显示两个独立的工作流ID输入框
- **测试步骤**：
  1. 启动应用
  2. 进入配置页面
  3. 验证RunningHub部分包含以下字段：
     - API Key
     - Base URL
     - 单件服装工作流ID (裙子/单上衣)
     - 上衣+下衣工作流ID

### 场景2：配置加载测试
- **预期行为**：能够正确加载现有的配置数据
- **测试步骤**：
  1. 如果存在旧的 `workflowId` 配置，应自动映射到"单件服装工作流ID"字段
  2. 新的 `topBottomWorkflowId` 字段应显示为空或已配置的值
  3. 其他配置字段应正常显示

### 场景3：配置保存测试
- **预期行为**：能够正确保存新的工作流ID配置
- **测试步骤**：
  1. 在"单件服装工作流ID"字段输入测试值
  2. 在"上衣+下衣工作流ID"字段输入测试值
  3. 点击"保存配置"
  4. 验证配置已保存到 `config.runtime.json`
  5. 重新进入配置页面，验证值已正确保存

### 场景4：向后兼容性测试
- **预期行为**：旧的配置格式应能正常工作
- **测试步骤**：
  1. 使用只包含 `workflowId` 的旧配置
  2. 验证"单件服装工作流ID"字段显示旧值
  3. 验证"上衣+下衣工作流ID"字段为空
  4. 保存配置后，验证新格式正确生成

## 界面验证

### 字段标签和占位符
- **单件服装工作流ID**：
  - 标签：`单件服装工作流ID (裙子/单上衣)`
  - 占位符：`用于裙子或单上衣的工作流ID`

- **上衣+下衣工作流ID**：
  - 标签：`上衣+下衣工作流ID`
  - 占位符：`用于上衣和下衣组合的工作流ID`

### 字段ID
- 单件服装工作流ID：`cfg-runninghub-singleItemWorkflowId`
- 上衣+下衣工作流ID：`cfg-runninghub-topBottomWorkflowId`

## 配置数据结构

### 新的配置格式
```json
{
  "runninghub": {
    "apiKey": "your_api_key",
    "baseUrl": "https://www.runninghub.cn",
    "singleItemWorkflowId": "single_item_workflow_id",
    "topBottomWorkflowId": "top_bottom_workflow_id"
  }
}
```

### 兼容性处理
- 如果存在旧的 `workflowId`，会自动映射到 `singleItemWorkflowId`
- 如果不存在 `singleItemWorkflowId`，会使用 `workflowId` 作为默认值

## 功能集成测试

### 测试1：单件服装工作流
1. 配置"单件服装工作流ID"
2. 选择裙子或单上衣进行试衣
3. 验证使用了正确的工作流ID

### 测试2：上衣+下衣工作流
1. 配置"上衣+下衣工作流ID"
2. 选择上衣和下衣进行试衣
3. 验证使用了正确的工作流ID

## 错误处理测试

### 测试1：未配置单件工作流ID
- 清空"单件服装工作流ID"字段
- 选择裙子或单上衣进行试衣
- 预期：显示错误"请先配置单件服装工作流ID (singleItemWorkflowId)"

### 测试2：未配置上衣下衣工作流ID
- 清空"上衣+下衣工作流ID"字段
- 选择上衣和下衣进行试衣
- 预期：显示错误"请先配置上衣下衣工作流ID (topBottomWorkflowId)"

## 技术实现细节

### 前端配置处理
```javascript
// 加载配置时的兼容性处理
document.getElementById('cfg-runninghub-singleItemWorkflowId').value = 
    cfg.runninghub.singleItemWorkflowId || cfg.runninghub.workflowId || '';

// 保存配置时的新格式
runninghub: {
    singleItemWorkflowId: document.getElementById('cfg-runninghub-singleItemWorkflowId').value.trim(),
    topBottomWorkflowId: document.getElementById('cfg-runninghub-topBottomWorkflowId').value.trim()
}
```

### 后端配置处理
- 服务器端已更新 `getEffectiveConfig()` 方法
- 配置保存逻辑支持新的字段结构
- 保持向后兼容性

## 注意事项

1. 确保两个工作流ID都正确配置
2. 工作流ID应该对应实际存在的RunningHub工作流
3. 测试时注意观察控制台日志，确认使用了正确的工作流ID
4. 配置保存后需要重新启动应用或刷新配置缓存
