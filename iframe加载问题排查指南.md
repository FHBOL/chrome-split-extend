# iframe加载问题排查指南

## 问题分类

根据用户反馈，遇到了两种不同的问题：

### 1. Perplexity - 完全不显示（拒绝加载）
**现象**：iframe区域显示空白或错误提示，网站完全无法加载

**原因**：
- 网站设置了非常严格的`X-Frame-Options: DENY`或`CSP: frame-ancestors 'none'`
- 即使我们的`declarativeNetRequest`规则移除了这些头，某些网站还会在JS层面检测是否在iframe中
- 使用`if (window.self !== window.top)`检测并拒绝在iframe中运行

**可能的解决方案**：
1. 检查网站是否有JS检测iframe
2. 考虑使用window-manager方式（独立窗口而非iframe）
3. 某些网站可能永远无法在iframe中工作

### 2. 智谱清言 - 显示但要求重新登录
**现象**：网站可以加载显示，但显示未登录状态，要求重新登录

**原因**：
- Cookie的`SameSite`属性限制
- 当网站在第三方上下文（iframe）中加载时，浏览器阻止了某些Cookie的传递
- 这是浏览器的安全策略，保护用户隐私

**Chrome的Cookie策略**：
- `SameSite=Strict`: 完全禁止第三方上下文发送Cookie
- `SameSite=Lax`: 部分场景允许（但iframe不允许）
- `SameSite=None; Secure`: 允许第三方上下文，但必须是HTTPS

## 当前的修复尝试

### 已添加的Header移除规则

在`rules.json`中添加了以下规则：

```json
{
  "id": 1, "header": "X-Frame-Options"
},
{
  "id": 2, "header": "Content-Security-Policy"
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

### 已添加的iframe权限

在`split-view.js`中：

```javascript
iframe.sandbox = 'allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation allow-storage-access-by-user-activation allow-modals';
iframe.allow = 'camera; microphone; geolocation; storage-access';
```

## Cookie问题的局限性

⚠️ **重要提示**：

Chrome扩展的`declarativeNetRequest` API **无法修改Cookie的SameSite属性**！

这意味着：
- 如果网站的Cookie设置了`SameSite=Strict`或`SameSite=Lax`
- 我们无法通过扩展API强制修改它
- 浏览器会自动阻止这些Cookie在iframe中传递
- **这是浏览器的核心安全功能，无法绕过**

## 针对不同问题的解决方案

### 方案1：使用Storage Access API（需要用户交互）

让iframe中的网站请求存储访问权限：

```javascript
// 在iframe内部的网站需要调用
document.requestStorageAccess().then(
  () => console.log('存储访问已授予'),
  () => console.log('存储访问被拒绝')
);
```

**问题**：
- 需要修改目标网站的代码（我们无法做到）
- 或者通过content script注入（但很多网站有CSP限制）

### 方案2：混合模式（智能降级）

```javascript
// 检测iframe加载是否成功
iframe.addEventListener('load', () => {
  // 尝试检测是否需要登录
  setTimeout(() => {
    // 如果检测到登录问题，显示提示
    showFallbackOptions(site);
  }, 2000);
});

function showFallbackOptions(site) {
  // 显示选项：
  // 1. 在iframe中手动登录
  // 2. 使用独立窗口打开
  // 3. 在新标签页打开
}
```

## 实际测试建议

### 测试Perplexity是否真的被拒绝

1. 打开浏览器开发者工具
2. 查看Console中是否有错误信息
3. 查看Network面板，检查响应头
4. 查看iframe是否有内容但被隐藏

### 测试智谱的Cookie情况

1. 在独立标签页打开智谱，确认已登录
2. 打开开发者工具 → Application → Cookies
3. 检查Cookie的`SameSite`属性
4. 如果是`Strict`或`Lax`，则无法在iframe中使用

## 推荐的用户体验改进

### 1. 添加加载状态检测

```javascript
iframe.addEventListener('load', () => {
  // 检测是否成功加载
  checkIframeStatus(iframe, site);
});

function checkIframeStatus(iframe, site) {
  try {
    // 尝试访问iframe内容（同源才能访问）
    const iframeDoc = iframe.contentDocument;
    if (!iframeDoc) {
      showErrorMessage(site, 'iframe被阻止');
    }
  } catch (e) {
    // 跨域无法访问，但这是正常的
    console.log('跨域iframe，无法检测内容');
  }
}
```

### 2. 提供备用方案按钮

在每个iframe面板上添加：
- 🔄 刷新iframe
- ↗️ 在新标签页打开
- ❓ 报告问题

### 3. 智能提示

检测到某些网站有问题时，显示友好提示：

```
⚠️ 智谱清言可能需要重新登录

原因：浏览器安全策略阻止了Cookie在iframe中传递

解决方案：
1. 尝试在下方iframe中直接登录
2. 点击"在新标签页打开"按钮
3. 或使用"窗口管理器"功能
```

## 需要实现的改进

### 短期（必须）
- [ ] 添加加载状态检测
- [ ] 为每个面板添加"在独立窗口打开"按钮
- [ ] 显示友好的错误提示

### 中期（推荐）
- [ ] 实现智能降级：自动检测无法加载的网站并提供备选方案
- [ ] 添加网站兼容性数据库（记录哪些网站有问题）
- [ ] 提供"混合模式"：部分网站用iframe，部分用独立窗口

### 长期（理想）
- [ ] 研究是否可以通过Service Worker拦截和修改Cookie
- [ ] 提供浏览器插件配置页面，让用户选择每个网站的加载方式
- [ ] 社区贡献的网站兼容性列表

## 总结

**对于Perplexity（不显示）**：
- 可能是网站的JS层面检测
- 建议使用独立窗口模式

**对于智谱（要求重新登录）**：
- 这是Chrome的Cookie安全策略
- 无法通过扩展完全解决
- 建议：
  1. 让用户在iframe中重新登录
  2. 或使用独立窗口模式

**最佳实践**：
为用户提供选择，某些网站用iframe，某些网站用独立窗口，实现混合模式。

