# 修复Gemini选择器问题

## 问题诊断

从截图看，你配置的Gemini选择器是：
```
输入框: div.text-input-field_textarea-wrapper.ng-tns-c378188857-5
发送按钮: span.mat-mdc-button-touch-target
```

### 问题1: 动态生成的类名
`ng-tns-c378188857-5` 这种类名是Angular动态生成的，**每次页面刷新都会变**：
- 今天可能是 `c378188857`
- 明天可能是 `c123456789`
- 这就是为什么之前能工作，现在不工作的原因

### 问题2: 发送按钮选择器不够精确
`span.mat-mdc-button-touch-target` 可能匹配到多个按钮，不一定是发送按钮。

## 解决方案

### Gemini稳定的选择器

#### 输入框（推荐顺序）:
1. **`.ql-editor`** ⭐ 最稳定
2. `[contenteditable="true"][role="textbox"]`
3. `rich-textarea .ql-editor`

#### 发送按钮（推荐顺序）:
1. **`button[aria-label*="Send"]`** ⭐ 最稳定
2. `button[mattooltip*="Send"]`
3. `button.send-button`

## 修复步骤

### 方法1: 重新配置（推荐）

1. **打开选择器配置向导**
2. **选择Gemini** 卡片
3. **点击"打开并标记"**
4. **在Gemini页面:**
   - 先手动输入一些文字（让发送按钮出现）
   - 选择输入框：点击那个大的输入区域
   - 选择发送按钮：点击右下角的发送按钮（紫色箭头）
5. **保存配置**

### 方法2: 手动修复配置（快速）

在浏览器控制台运行：
```javascript
// 读取当前配置
chrome.storage.local.get(['aiSelectorConfigs'], (result) => {
  const configs = result.aiSelectorConfigs || {};
  
  // 修复Gemini配置
  configs['gemini_google_com'] = {
    inputSelector: '.ql-editor',
    sendButtonSelector: 'button[aria-label*="Send"]'
  };
  
  // 保存
  chrome.storage.local.set({ aiSelectorConfigs: configs }, () => {
    console.log('✅ Gemini配置已修复');
    console.log('新配置:', configs['gemini_google_com']);
  });
});
```

### 方法3: 使用测试脚本诊断

1. **右键点击Gemini的iframe** → 检查（打开iframe的控制台）
2. **粘贴 `test-gemini.js` 的内容并运行**
3. **查看输出，找到正确的选择器**
4. **手动更新配置**

## 为什么千问可以工作？

千问的选择器比较稳定：
```
输入框: div.text-input-field_textarea-wrapper.ng-tns-c378188857-5
```

虽然也包含动态类名，但是如果你最近配置的，现在还没刷新页面，所以还能工作。

**但是！** 千问也会有同样的问题，下次刷新页面后可能就不工作了。

## 建议：配置所有AI使用稳定选择器

### ChatGPT（稳定）
```
输入框: #prompt-textarea
发送按钮: button[data-testid="send-button"]
```

### Gemini（修复后）
```
输入框: .ql-editor
发送按钮: button[aria-label*="Send"]
```

### Qwen（需要重新配置）
```
输入框: #chat-input 或 textarea[placeholder*="请输入"]
发送按钮: button[type="submit"] 或包含"发送"的按钮
```

## 如何选择稳定的选择器？

### ✅ 好的选择器特征：
- 使用ID (`#prompt-textarea`)
- 使用语义化属性 (`[aria-label="Send"]`, `[role="textbox"]`)
- 使用产品特定的类 (`.ql-editor` - Quill编辑器的固定类名)
- 使用data属性 (`[data-testid="send-button"]`)

### ❌ 避免的选择器特征：
- 动态生成的类名 (`.ng-tns-c378188857`, `.css-1a2b3c4`)
- 纯样式类名 (`.flex`, `.mt-4`, `.text-blue-500`)
- 层级过深的选择器
- 包含随机字符的类名

## 长期解决方案

我可以在iframe-injector.js中添加Gemini的特殊处理，优先使用`.ql-editor`：

```javascript
// 针对Gemini的特殊处理
if (hostname.includes('gemini.google.com')) {
  // 优先使用稳定的Quill编辑器选择器
  const qlEditor = document.querySelector('.ql-editor');
  if (qlEditor) return qlEditor;
}
```

但这又是硬编码了。。。更好的方案是：

1. **配置时提供多个备选选择器**
2. **运行时按顺序尝试，找到第一个可用的**

示例配置结构：
```javascript
{
  inputSelector: '.ql-editor',
  inputSelectorFallback: ['[contenteditable="true"]', 'textarea'],
  sendButtonSelector: 'button[aria-label*="Send"]',
  sendButtonSelectorFallback: ['button.send-button', 'button[type="submit"]']
}
```

## 立即行动

**现在立即修复Gemini:**

1. 打开Gemini iframe的控制台
2. 运行方法2中的代码
3. 刷新分屏页面
4. 重新测试

或者：

1. 重新使用"选择器配置向导"配置Gemini
2. 确保选中的输入框是大的文本输入区域
3. 确保选中的按钮是实际的发送按钮

---

需要我实现"多备选选择器"功能吗？这样可以彻底解决动态类名的问题。

