# 修复 DeepSeek 发送按钮选择器生成

## 问题描述

DeepSeek 的发送按钮 HTML 结构：
```html
<div class="ds-icon-button ds-icon-button--disabled" role="button" aria-disabled="true">
  <div class="ds-icon-button__hover-bg"></div>
  <div class="ds-icon"><svg>...</svg></div>
</div>
```

**问题**：
- 旧的生成器生成的选择器：`.ds-icon-button`
- 这个选择器**太通用**，会匹配到所有状态的按钮（包括禁用状态）
- 导致插件尝试点击禁用的按钮，发送失败

## 解决方案

### 修改内容

在 `tools/detector.js` 中优化了 `generateSelector()` 函数：

1. **识别按钮的禁用状态**
   - 检测 class 中是否包含 `disabled` 关键字
   - 检测 `aria-disabled` 属性

2. **生成更精确的选择器**
   - 对于 DeepSeek：`.ds-icon-button[role="button"]:not(.ds-icon-button--disabled)`
   - 对于其他网站：根据具体情况生成相应的排除规则

### 优化后的选择器策略

**按钮选择器生成优先级**：

1. **ID选择器**（最稳定）
   ```css
   #send-button
   ```

2. **data-testid**（测试友好）
   ```css
   [data-testid="send-button"]
   ```

3. **class + role + 排除禁用** ⭐ 新增
   ```css
   .ds-icon-button[role="button"]:not(.ds-icon-button--disabled)
   ```

4. **aria-label**（语义化）
   ```css
   button[aria-label*="Send"]
   ```

5. **type="submit"**（表单按钮）
   ```css
   button[type="submit"]:not([disabled])
   ```

## 使用方法

### 1. 重新生成 DeepSeek 配置

1. 打开 `tools/batch-generator-extension.html`
2. 在 Console 中运行：
   ```javascript
   generateAllConfigs()
   ```

3. 或者只测试 DeepSeek：
   ```javascript
   // 打开 DeepSeek
   chrome.tabs.create({ url: 'https://chat.deepseek.com/' }, async (tab) => {
     setTimeout(async () => {
       const results = await chrome.scripting.executeScript({
         target: { tabId: tab.id },
         files: ['tools/detector.js']
       });
       console.log('DeepSeek 配置:', results[0].result);
     }, 3000);
   });
   ```

### 2. 预期输出

```javascript
{
  siteName: 'DeepSeek',
  siteId: 'chat_deepseek_com',
  inputSelector: 'textarea',  // 或其他输入框选择器
  sendButtonSelector: '.ds-icon-button[role="button"]:not(.ds-icon-button--disabled)',
  confidence: {
    input: 80,
    sendButton: 65
  }
}
```

### 3. 应用到 default-configs.js

将生成的配置复制到 `default-configs.js`：

```javascript
'chat_deepseek_com': {
  name: 'DeepSeek',
  inputSelector: 'textarea',
  sendButtonSelector: '.ds-icon-button[role="button"]:not(.ds-icon-button--disabled)',
  version: '2025-10-19',
  notes: '自动生成 - 排除禁用状态的按钮'
}
```

## 技术细节

### 为什么需要 `:not()` 伪类？

DeepSeek 的按钮在不同状态下的 class：

| 状态 | Class | 能否点击 |
|------|-------|---------|
| 禁用 | `ds-icon-button ds-icon-button--disabled` | ❌ 否 |
| 启用 | `ds-icon-button` | ✅ 是 |

如果只用 `.ds-icon-button`，会匹配到两种状态的按钮。

使用 `:not(.ds-icon-button--disabled)` 可以：
- ✅ 只匹配启用状态的按钮
- ✅ 确保点击时按钮是可用的
- ✅ 避免在输入框为空时尝试发送

### 适用的其他网站

这个优化也适用于其他有类似禁用状态的网站：
- 任何使用 `*--disabled` 或 `.disabled` class 的按钮
- 任何使用 `aria-disabled="true"` 的按钮
- 任何使用 `disabled` 属性的按钮

## 测试验证

在 DeepSeek 网站的 Console 中测试：

```javascript
// 1. 输入框为空时（按钮应该是禁用的）
const disabledBtn = document.querySelector('.ds-icon-button[role="button"]:not(.ds-icon-button--disabled)');
console.log('禁用状态下找到按钮:', disabledBtn); // 应该是 null

// 2. 在输入框中输入内容后
// 手动在输入框输入一些文字
const enabledBtn = document.querySelector('.ds-icon-button[role="button"]:not(.ds-icon-button--disabled)');
console.log('启用状态下找到按钮:', enabledBtn); // 应该找到按钮
console.log('按钮是否禁用:', enabledBtn?.getAttribute('aria-disabled')); // 应该是 null 或 'false'
```

## 兼容性说明

- ✅ 向后兼容：不影响其他网站的配置生成
- ✅ 通用性强：自动识别不同的禁用状态模式
- ✅ 稳定性高：优先使用语义化属性（role）

## 总结

**修改前**：
```
.ds-icon-button  ❌ 可能匹配禁用按钮
```

**修改后**：
```
.ds-icon-button[role="button"]:not(.ds-icon-button--disabled)  ✅ 只匹配启用按钮
```

这个修改确保了：
1. 生成的选择器更精确
2. 只在按钮可用时才尝试点击
3. 避免因点击禁用按钮导致的发送失败

