# iframe登录问题解决方案

## 问题说明

用户反馈了两种iframe加载问题：

### 1. Perplexity - 完全不显示
**现象**：iframe区域显示为空白或错误页面
**原因**：网站通过JavaScript检测iframe并拒绝加载

### 2. 智谱清言 - 要求重新登录
**现象**：网站可以显示，但登录态丢失，要求重新登录
**原因**：浏览器的Cookie SameSite安全策略阻止了Cookie在第三方上下文（iframe）中传递

## 实施的解决方案

### 1. 增强Header移除规则

在 `rules.json` 中添加了更多的安全头移除规则：

```json
{
  "id": 1, "header": "X-Frame-Options"           // 移除iframe限制
},
{
  "id": 2, "header": "Content-Security-Policy"   // 移除CSP限制
},
{
  "id": 3, "header": "Cross-Origin-Opener-Policy"
},
{
  "id": 4, "header": "Cross-Origin-Embedder-Policy"
},
{
  "id": 5, "header": "Cross-Origin-Resource-Policy"
}
```

这些规则可以解决大部分网站的iframe加载限制。

### 2. 增强iframe权限

在 `split-view.js` 中为iframe添加了更多权限：

```javascript
iframe.sandbox = 'allow-same-origin allow-scripts allow-forms allow-popups 
                  allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation 
                  allow-storage-access-by-user-activation allow-modals';

iframe.allow = 'camera; microphone; geolocation; storage-access';
```

**关键权限说明**：
- `allow-storage-access-by-user-activation`: 允许在用户交互后访问存储（Cookie）
- `storage-access` in allow: 允许使用Storage Access API

### 3. 智能登录状态检测

添加了iframe加载后的状态检测：

```javascript
iframe.addEventListener('load', () => {
  setTimeout(() => {
    checkIframeLoginStatus(iframe, iframeContainer, site);
  }, 2000);
});
```

虽然由于跨域限制无法直接检测内容，但提供了基础框架，未来可以扩展。

### 4. 登录警告提示

当检测到可能的登录问题时，在iframe底部显示橙色警告条：

```
⚠️ 如果需要登录，建议使用右上角 ↗ 按钮在新标签页处理登录
```

**样式特点**：
- 橙色渐变背景（rgba(255, 152, 0, 0.95)）
- 半透明毛玻璃效果
- 从底部滑入动画
- 响应式布局，不遮挡主要内容

## 使用指南

### 场景1：网站需要登录（如智谱清言）

1. 在分屏视图中看到该网站显示未登录
2. 点击面板右上角的 **↗️** 按钮
3. 在新标签页中登录后可正常使用

### 场景2：网站完全无法加载（如Perplexity）

1. iframe区域显示空白或错误
2. 点击 **↗️** 在新标签页打开
3. 这些网站可能永远无法在iframe中工作

### 场景3：会被限制的网站

- 部分网站在iframe中正常工作（如ChatGPT、Gemini）
- 部分网站需要在新标签页中登录后再使用（如智谱、Perplexity）
- 可以按需切换加载方式

## 技术限制说明

### Cookie SameSite 问题无法完全解决

⚠️ **重要**：Chrome扩展的 `declarativeNetRequest` API **无法修改Cookie的SameSite属性**

这意味着：
- 如果网站的Cookie设置为 `SameSite=Strict` 或 `SameSite=Lax`
- 浏览器会自动阻止这些Cookie在iframe（第三方上下文）中传递
- **这是浏览器的核心安全功能，无法绕过**

**唯一的例外**：
- 网站自己设置 `SameSite=None; Secure`
- 或者网站实现了 Storage Access API
- 但这需要网站自己配置，我们无法控制

### JavaScript检测iframe

某些网站使用JavaScript检测是否在iframe中：

```javascript
if (window.self !== window.top) {
  // 拒绝在iframe中运行
  document.body.innerHTML = '请在主窗口中使用';
}
```

这种情况下，即使我们移除了所有HTTP头限制，网站仍然会拒绝加载。

## 代码改进

### 修改的文件

1. **rules.json**
   - 添加了3条新的Header移除规则
   - 移除 Cross-Origin-* 相关的安全头

2. **split-view/split-view.js**
   - 添加 `checkIframeLoginStatus()` 函数
   - 添加 `showLoginWarning()` 函数
   - 优化面板操作按钮

3. **split-view/split-view.css**
   - 添加 `.login-warning` 样式
   - 添加橙色警告条动画效果
   - 优化按钮样式

### 新增功能

- ✅ 登录状态检测框架
- ✅ 可视化警告提示
- ✅ 更多iframe权限

## 未来改进方向

### 短期
- [ ] 记录每个网站的兼容性状态
- [ ] 自动检测需要独立窗口的网站
- [ ] 提供用户配置：为每个网站选择加载方式

### 中期
- [ ] 实现混合模式UI：iframe和独立窗口混合显示
- [ ] 添加网站兼容性数据库
- [ ] 社区贡献的网站列表

### 长期
- [ ] 研究Service Worker拦截Cookie的可能性
- [ ] 尝试其他绕过方案（如代理）
- [ ] 提供Web版（服务器端代理）

## 用户反馈

欢迎用户报告遇到的网站兼容性问题：
1. 哪个网站无法加载？
2. 显示什么错误？
3. 独立窗口是否可以正常工作？

我们会持续改进兼容性。

---
更新时间: 2025-10-18
版本: 1.1.0

