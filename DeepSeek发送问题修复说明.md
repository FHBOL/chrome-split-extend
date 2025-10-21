# DeepSeek 发送问题修复说明

## 问题描述

DeepSeek网站无法发送消息，即使配置了输入框也不工作。

## 根本原因

1. **预设配置没有被加载**：
   - `default-configs.js` 中有DeepSeek的配置
   - 但 `iframe-injector.js` 只从 `chrome.storage.local` 读取用户配置
   - 没有回退到预设配置

2. **配置策略问题**：
   - DeepSeek支持回车发送
   - 之前的预设配置只有输入框，没有发送按钮
   - 根据新策略，这应该使用Enter键发送
   - 但因为预设配置没有被加载，所以不工作

## 修复方案

### 1. 让iframe-injector支持预设配置

**修改前** (`iframe-injector.js`):
```javascript
async function loadSiteConfig() {
  const result = await chrome.storage.local.get(['aiSelectorConfigs']);
  const allConfigs = result.aiSelectorConfigs || {};
  siteConfig = allConfigs[siteId];
  
  if (siteConfig) {
    console.log('已加载网站配置:', siteConfig);
  } else {
    console.log('未找到配置，使用通用选择器');
  }
}
```

**修改后**:
```javascript
async function loadSiteConfig() {
  const result = await chrome.storage.local.get(['aiSelectorConfigs']);
  const allConfigs = result.aiSelectorConfigs || {};
  
  // 优先使用用户配置
  siteConfig = allConfigs[siteId];
  
  if (siteConfig) {
    console.log('✅ 已加载用户配置:', siteConfig);
  } else {
    // 尝试使用预设配置
    if (typeof DEFAULT_CONFIGS !== 'undefined' && DEFAULT_CONFIGS[siteId]) {
      siteConfig = DEFAULT_CONFIGS[siteId];
      console.log('✅ 已加载预设配置:', siteConfig);
    } else {
      console.log('💡 未找到配置，将使用通用选择器和Enter键发送');
    }
  }
}
```

### 2. DeepSeek预设配置

**最终配置** (`default-configs.js`):
```javascript
'chat_deepseek_com': {
  name: 'DeepSeek',
  inputSelector: 'textarea',
  // 不配置sendButtonSelector，使用Enter键发送（DeepSeek支持回车发送）
  version: '2025-10-20',
  notes: '使用Enter键发送，通用且稳定'
}
```

## 工作流程

### 配置加载优先级

```
1. 用户自定义配置（chrome.storage.local）
   ↓ 如果没有
2. 预设配置（DEFAULT_CONFIGS）
   ↓ 如果没有
3. 通用选择器查找
```

### DeepSeek发送流程

```
1. 加载预设配置
   └─ inputSelector: 'textarea' ✓
   └─ sendButtonSelector: 未配置

2. 判断发送策略
   └─ hasInputConfig: true
   └─ hasSendButtonConfig: false
   └─ 策略：使用Enter键发送 ⌨️

3. 填充输入框
   └─ 找到 textarea
   └─ 填充内容

4. 发送消息
   └─ triggerEnterKey(inputElement, text)
   └─ 触发 keydown + keyup 事件
   └─ ✅ DeepSeek接收到Enter键，发送消息
```

## 控制台日志（正常情况）

在DeepSeek iframe中应该看到：

```
AI聚合器 - iframe注入脚本已加载
当前hostname: chat.deepseek.com
✅ 已加载预设配置: {name: 'DeepSeek', inputSelector: 'textarea', ...}

收到来自父页面的消息: {action: 'fillAndSend', text: '你好', ...}
🚀 开始填充消息: 你好
📍 当前hostname: chat.deepseek.com
⚙️ 当前配置: {name: 'DeepSeek', inputSelector: 'textarea'}

✅ 找到输入框: textarea
   - 标签: TEXTAREA
   - ID: 
   - Class: ...

💡 检测到只配置了输入框，使用Enter键发送（最通用、推荐）
⌨️ 触发Enter键发送...
✅ 已触发Enter键事件序列
```

## 测试步骤

### 1. 重新加载扩展

```
chrome://extensions/ → 找到扩展 → 点击刷新 🔄
```

### 2. 打开DeepSeek分屏

1. 打开插件 → Tab选择器
2. 选择DeepSeek网站
3. 创建分屏视图

### 3. 测试发送

1. 在统一输入框输入"你好"
2. 点击发送
3. 观察DeepSeek iframe

### 4. 检查控制台

在DeepSeek的iframe中按F12，应该看到：
- ✅ 已加载预设配置
- 💡 检测到只配置了输入框
- ⌨️ 触发Enter键发送

## 优势

### 为什么使用Enter键而不是点击按钮？

1. **更通用**：
   - DeepSeek支持回车发送
   - 不需要担心按钮禁用状态
   - 不需要复杂的选择器

2. **更稳定**：
   - Enter键不会因为UI改版而失效
   - 按钮class可能会变化
   - 按钮禁用状态需要特殊处理

3. **更简单**：
   - 配置更简单（只需输入框）
   - 代码更简单（不需要点击逻辑）
   - 维护更简单（减少50%的选择器）

## 其他支持Enter键发送的网站

根据这个经验，以下网站也可以只配置输入框：

- ✅ DeepSeek - 已优化
- ✅ Grok - 用户配置
- 🔄 Kimi - 待优化
- 🔄 豆包 - 待优化
- 🔄 Poe - 待优化

可以逐步优化这些网站的预设配置，减少不必要的发送按钮配置。

## 故障排查

### 如果还是不工作

1. **检查配置是否加载**：
   ```javascript
   // 在DeepSeek iframe的Console运行
   console.log('配置:', typeof siteConfig !== 'undefined' ? siteConfig : '未加载');
   ```

2. **检查DEFAULT_CONFIGS是否可用**：
   ```javascript
   console.log('预设配置:', typeof DEFAULT_CONFIGS !== 'undefined' ? DEFAULT_CONFIGS['chat_deepseek_com'] : '未加载');
   ```

3. **手动测试Enter键**：
   ```javascript
   const textarea = document.querySelector('textarea');
   textarea.value = '测试';
   textarea.dispatchEvent(new Event('input', {bubbles: true}));
   
   const enterEvent = new KeyboardEvent('keydown', {
     key: 'Enter',
     keyCode: 13,
     bubbles: true
   });
   textarea.dispatchEvent(enterEvent);
   ```

### 清除旧配置

如果之前有错误的用户配置，可以清除：

```javascript
chrome.storage.local.get(['aiSelectorConfigs'], (result) => {
  const configs = result.aiSelectorConfigs || {};
  
  // 删除DeepSeek的用户配置，使用预设配置
  delete configs['chat_deepseek_com'];
  
  chrome.storage.local.set({ aiSelectorConfigs: configs }, () => {
    console.log('✅ 已清除DeepSeek用户配置，将使用预设配置');
    location.reload();
  });
});
```

## 总结

修复的关键点：

1. ✅ **iframe-injector支持预设配置** - 回退机制
2. ✅ **DeepSeek使用Enter键发送** - 简单稳定
3. ✅ **配置加载优先级** - 用户 > 预设 > 通用

现在DeepSeek应该可以正常工作了！

---
**更新时间**: 2025-10-20  
**版本**: v2.2.0

