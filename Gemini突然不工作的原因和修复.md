# Gemini突然不工作的原因和修复

## 问题现象

你说："Gemini的配置我没有改动呀，是你把千问修复好后，他那边就不行了"

## 可能的原因

### 原因1：配置键名不匹配（最可能）

#### 问题流程：
1. **最初配置Gemini时**：
   - 配置被保存为键名 `'Gemini'` 或 `'gemini'`
   - 配置内容：`{ inputSelector: '...', sendButtonSelector: '...' }`

2. **我添加了键名规范化逻辑**：
   - 尝试将 `'Gemini'` → `'gemini_google_com'`
   - 但可能只在某些情况下执行

3. **渲染卡片时**：
   ```javascript
   const hostname = 'gemini.google.com';
   const siteId = hostname.replace(/[^a-zA-Z0-9]/g, '_');
   // siteId = 'gemini_google_com'
   
   const isConfigured = !!allConfigs[siteId];
   // 如果allConfigs的键是'Gemini'，则找不到！
   ```

4. **结果**：
   - 配置存在（键名为`'Gemini'`）
   - 但查找时用`'gemini_google_com'`
   - 匹配失败，显示"待配置"
   - 统一发送时找不到配置，回退到通用选择器

### 原因2：配置被意外覆盖

修复千问时，如果触发了配置的重新保存，可能：
- 规范化逻辑执行不完整
- 某些配置丢失或键名改变

### 原因3：选择器本身的问题

即使配置存在，如果选择器包含动态类名（如`ng-tns-c378188857`），页面刷新后会失效。

## 诊断步骤

### 步骤1：检查配置状态

在浏览器控制台运行：
```javascript
// 复制 诊断配置状态.js 的内容，然后运行
await diagnoseConfigs()
```

查看输出，重点关注：
1. **Gemini的配置键是什么？** (`Gemini`, `gemini`, `gemini_google_com`?)
2. **分屏网站的ID是什么？** (应该是`gemini_google_com`)
3. **两者是否匹配？**

### 步骤2：检查匹配情况

输出中会有"🔗 匹配检查"部分：
```
Gemini:
   期望的配置键: gemini_google_com
   是否有配置: ❌  ← 如果是这样，说明键名不匹配
```

## 快速修复方案

### 方案1：使用诊断脚本自动修复（推荐）

```javascript
// 1. 在浏览器控制台运行诊断
await diagnoseConfigs()

// 2. 如果提示"检测到旧格式的配置键"，运行
await normalizeConfigs()

// 3. 或者直接修复Gemini
await fixGeminiConfig()

// 4. 刷新分屏页面测试
```

### 方案2：手动修复

#### 2.1 查看当前配置
```javascript
chrome.storage.local.get(['aiSelectorConfigs'], (r) => {
  console.log('当前配置:', r.aiSelectorConfigs);
});
```

#### 2.2 找到Gemini配置
可能的键名：`'Gemini'`, `'gemini'`, `'gemini_google_com'`

#### 2.3 统一键名
```javascript
chrome.storage.local.get(['aiSelectorConfigs'], async (result) => {
  const configs = result.aiSelectorConfigs || {};
  
  // 找到Gemini配置（可能在不同的键下）
  const geminiConfig = configs['Gemini'] || 
                       configs['gemini'] || 
                       configs['gemini_google_com'];
  
  if (geminiConfig) {
    // 统一到标准键名
    configs['gemini_google_com'] = geminiConfig;
    
    // 删除旧键名
    delete configs['Gemini'];
    delete configs['gemini'];
    
    // 保存
    await chrome.storage.local.set({ aiSelectorConfigs: configs });
    console.log('✅ 已统一Gemini配置键名');
  } else {
    console.log('❌ 未找到Gemini配置');
  }
});
```

### 方案3：重新配置Gemini

如果配置确实丢失了：
1. 打开"选择器配置向导"
2. 选择Gemini → "打开并标记"
3. 点击输入框
4. 点击发送按钮
5. 保存

现在生成的选择器会更智能（因为我改进了选择器生成逻辑）。

## 预防措施

### 1. 统一配置键名规则

所有配置键名应该遵循：
```
{hostname}.replace(/[^a-zA-Z0-9]/g, '_')
```

例如：
- `gemini.google.com` → `gemini_google_com`
- `chat.qwen.ai` → `chat_qwen_ai`
- `chatgpt.com` → `chatgpt_com`

### 2. 改进配置保存逻辑

确保每次保存配置时都使用标准的键名：

```javascript
// 在 selector-config.js 的 handleSelectorSelected 函数中
selectedSite = {
  id: hostname.replace(/[^a-zA-Z0-9]/g, '_'),  // 标准化ID
  name: siteName,
  url: tab.url,
  hostname: hostname
};
```

### 3. 改进配置加载逻辑

加载时自动规范化所有键名，并保存回去。

## 根本解决方案

我需要修改代码，确保：

### 1. 配置保存时使用标准键名

在 `selector-config.js` 中，当用户选择网站时：
```javascript
// 第88行附近
selectedSite = {
  id: siteId,  // 这里已经是标准化的 hostname.replace(...)
  name: siteName,
  url: tab.url,
  hostname: hostname,
  tabId: tab.id
};
```

### 2. 配置加载时强制规范化

在 `loadExistingConfigs` 函数中：
```javascript
// 不仅规范化，还要确保持久化
const normalizedConfigs = {};
for (const [key, config] of Object.entries(allConfigs)) {
  const standardKey = key.includes('_') ? key : 
    hostMap[key.toLowerCase()] || key;
  normalizedConfigs[standardKey] = config;
}

// 强制保存规范化后的配置
if (Object.keys(normalizedConfigs).some(k => !allConfigs[k])) {
  allConfigs = normalizedConfigs;
  await saveConfigs();
}
```

## 立即行动

1. **运行诊断脚本**：
   ```javascript
   // 复制 诊断配置状态.js 内容并运行
   await diagnoseConfigs()
   ```

2. **查看输出，确认问题**

3. **运行修复**：
   ```javascript
   await normalizeConfigs()  // 或
   await fixGeminiConfig()
   ```

4. **刷新分屏页面测试**

5. **如果还不行，告诉我诊断脚本的输出**

## 我的反思

这次问题让我意识到：

1. **配置键名的统一性非常重要**
   - 保存时用什么键，读取时就要用什么键
   - 不能依赖"自动规范化"，因为时机不可控

2. **规范化逻辑应该更激进**
   - 不仅在内存中规范化
   - 还要立即持久化到storage
   - 确保下次加载时直接是规范格式

3. **应该有配置版本管理**
   - 记录配置的版本号
   - 发现旧版本时自动升级

4. **应该有更好的日志**
   - 记录每次配置变更
   - 方便诊断问题

## 总结

Gemini突然不工作，**不是因为配置内容变了**，而是因为：
- 配置的**键名**可能不匹配
- 查找时用`gemini_google_com`，但存储时可能是`Gemini`
- 我的规范化逻辑可能执行不完整

**解决方案**：统一键名，运行修复脚本。

---

最后更新：2025-10-17
关键词：配置键名、规范化、匹配失败、Gemini突然不工作

