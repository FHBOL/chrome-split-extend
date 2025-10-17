# 快速修复 DeepSeek 不工作问题

## 🎯 诊断步骤

### 步骤1：检查配置是否保存

在**DeepSeek页面**的Console运行：

```javascript
chrome.storage.local.get(['aiSelectorConfigs'], (r) => {
  const configs = r.aiSelectorConfigs || {};
  console.log('所有配置键:', Object.keys(configs));
  
  // 检查DeepSeek配置
  const deepseekConfig = configs['chat_deepseek_com'] || configs['deepseek'] || configs['DeepSeek'];
  if (deepseekConfig) {
    console.log('✅ 找到DeepSeek配置:', deepseekConfig);
  } else {
    console.log('❌ 未找到DeepSeek配置');
  }
});
```

### 步骤2：查找正确的选择器

在DeepSeek页面运行：

```javascript
// 查找输入框
const textarea = document.querySelector('textarea');
console.log('找到textarea:', textarea);
if (textarea) {
  console.log('  ID:', textarea.id);
  console.log('  Class:', textarea.className);
  console.log('  Placeholder:', textarea.placeholder);
  
  // 生成推荐选择器
  if (textarea.id) {
    console.log('✅ 推荐输入框选择器: #' + textarea.id);
  } else {
    console.log('✅ 推荐输入框选择器: textarea');
  }
}

// 查找发送按钮
console.log('\n查找发送按钮...');
const buttons = document.querySelectorAll('button');
const divButtons = Array.from(document.querySelectorAll('div')).filter(d => 
  window.getComputedStyle(d).cursor === 'pointer'
);

console.log('Button元素:', buttons.length, '个');
console.log('可点击DIV:', divButtons.length, '个');

// 尝试找发送按钮
buttons.forEach((btn, i) => {
  const aria = btn.getAttribute('aria-label');
  if (aria && (aria.includes('send') || aria.includes('Send') || aria.includes('发送'))) {
    console.log(`✅ 可能的发送按钮${i}:`, btn);
    console.log('  aria-label:', aria);
    console.log('  class:', btn.className);
  }
});
```

### 步骤3：手动设置正确的配置

根据上面找到的选择器，运行：

```javascript
chrome.storage.local.get(['aiSelectorConfigs'], async (r) => {
  const configs = r.aiSelectorConfigs || {};
  
  // 🔥 修改这里的选择器为你实际找到的
  configs['chat_deepseek_com'] = {
    inputSelector: 'textarea',  // ← 改成你的输入框选择器
    sendButtonSelector: 'button[type="submit"]'  // ← 改成你的按钮选择器
  };
  
  await chrome.storage.local.set({ aiSelectorConfigs: configs });
  console.log('✅ DeepSeek配置已更新');
});
```

## 🔍 常见问题

### 问题1：配置键不对

**症状**：配置保存了但找不到

**原因**：配置键可能是 `DeepSeek` 而不是 `chat_deepseek_com`

**解决**：
```javascript
// 统一所有可能的键
chrome.storage.local.get(['aiSelectorConfigs'], async (r) => {
  const configs = r.aiSelectorConfigs || {};
  
  // 找到DeepSeek配置
  const deepseekConfig = configs['DeepSeek'] || configs['deepseek'] || configs['chat_deepseek_com'];
  
  if (deepseekConfig) {
    // 统一到正确的键
    configs['chat_deepseek_com'] = deepseekConfig;
    
    // 删除旧键
    delete configs['DeepSeek'];
    delete configs['deepseek'];
    
    await chrome.storage.local.set({ aiSelectorConfigs: configs });
    console.log('✅ 配置键已统一为: chat_deepseek_com');
  }
});
```

### 问题2：选择器不对

**症状**：配置存在但querySelector找不到元素

**解决**：重新配置，或手动设置正确的选择器（见步骤3）

### 问题3：iframe-injector没有注入

**症状**：没有任何console日志

**原因**：可能是manifest.json的content_scripts没有匹配到

**检查**：
```javascript
// 在DeepSeek页面检查
console.log('iframe-injector是否已注入:', typeof StrategyExecutor !== 'undefined');
```

如果返回`false`，说明脚本没注入。

**解决**：重新加载扩展

## 🚀 快速修复命令

如果你确定DeepSeek的输入框是 `<textarea>` 且发送按钮是某个button或div，直接运行：

```javascript
// 一键修复DeepSeek配置
chrome.storage.local.get(['aiSelectorConfigs'], async (r) => {
  const configs = r.aiSelectorConfigs || {};
  
  // 🔥 DeepSeek 推荐配置
  configs['chat_deepseek_com'] = {
    inputSelector: 'textarea',  // 简单通用
    sendButtonSelector: 'button[aria-label*="Send"], button[type="submit"], div[style*="cursor: pointer"]'  // 多选择器
  };
  
  await chrome.storage.local.set({ aiSelectorConfigs: configs });
  console.log('✅ DeepSeek配置已设置');
  console.log('请在分屏页面测试统一发送功能');
});
```

## 📝 测试

1. 运行上面的修复命令
2. **刷新分屏页面**（重要！）
3. 在统一输入框输入文字
4. 点击"发送到所有AI"
5. **观察DeepSeek的Console**，应该看到：
   ```
   收到填充和发送消息
   📝 开始执行填充策略...
   👆 准备点击发送按钮...
   ✅ 已触发所有点击事件
   ```

如果还是不行，把Console的完整日志发给我！

