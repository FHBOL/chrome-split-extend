// 分屏视图脚本
let aiSites = [];
let currentLayout = '4-grid';

// 页面加载完成
document.addEventListener('DOMContentLoaded', async () => {
  // 加载配置
  await loadConfig();
  
  // 初始化分屏
  initializeSplitView();
  
  // 绑定事件
  bindEvents();
  
  // 隐藏加载遮罩
  hideLoading();
  
  showNotification('分屏视图已加载，准备就绪！', 2000);
});

// 加载配置
async function loadConfig() {
  return new Promise((resolve) => {
    console.log('split-view: 开始加载配置...');
    // 优先从tab-selector传递的数据加载
    chrome.storage.local.get(['selectedSitesForSplit', 'splitViewTimestamp'], (localResult) => {
      console.log('split-view: local storage数据:', localResult);
      const now = Date.now();
      const timeDiff = localResult.splitViewTimestamp ? (now - localResult.splitViewTimestamp) : null;
      console.log('split-view: 时间差:', timeDiff, 'ms');
      
      // 如果是最近（5秒内）从tab-selector过来的，使用传递的数据
      if (localResult.selectedSitesForSplit && 
          localResult.splitViewTimestamp && 
          (now - localResult.splitViewTimestamp < 5000)) {
        aiSites = localResult.selectedSitesForSplit;
        console.log('split-view: 使用tab-selector传递的数据:', aiSites);
        // 将当前分屏站点写入local，便于其他页面（如选择器配置）读取
        chrome.storage.local.set({
          currentSplitSites: aiSites,
          currentSplitTimestamp: Date.now()
        });
        // 清除临时数据
        chrome.storage.local.remove(['selectedSitesForSplit', 'splitViewTimestamp']);
        resolve();
      } else {
        console.log('split-view: tab-selector数据过期或不存在，从sync storage加载');
        // 否则从sync storage加载
        chrome.storage.sync.get(['aiSites'], (result) => {
          aiSites = (result.aiSites || []).filter(site => site.enabled);
          console.log('split-view: 从sync storage加载的数据:', aiSites);
          // 同步当前分屏站点到local
          chrome.storage.local.set({
            currentSplitSites: aiSites,
            currentSplitTimestamp: Date.now()
          });
          resolve();
        });
      }
    });
  });
}

// 获取默认站点 - 不再使用硬编码，返回空数组
function getDefaultSites() {
  return [];
}

// 初始化分屏视图
function initializeSplitView() {
  const container = document.getElementById('splitContainer');
  container.innerHTML = '';
  
  // 如果没有网站，显示引导提示
  if (aiSites.length === 0) {
    showEmptyGuide();
    return;
  }
  
  // 限制显示数量（根据布局）
  const maxSites = getMaxSitesForLayout(currentLayout);
  const sitesToShow = aiSites.slice(0, maxSites);
  
  sitesToShow.forEach((site, index) => {
    const panel = createIframePanel(site, index);
    container.appendChild(panel);
  });
  
  // 如果站点数少于布局格子数，填充空面板
  for (let i = sitesToShow.length; i < maxSites; i++) {
    const emptyPanel = createEmptyPanel(i);
    container.appendChild(emptyPanel);
  }
}

// 显示空状态引导
function showEmptyGuide() {
  const container = document.getElementById('splitContainer');
  container.innerHTML = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 40px;
      text-align: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    ">
      <div style="font-size: 80px; margin-bottom: 24px;">📭</div>
      <h2 style="font-size: 32px; margin-bottom: 16px; font-weight: 600;">没有选择任何网站</h2>
      <p style="font-size: 18px; margin-bottom: 32px; opacity: 0.9; max-width: 600px; line-height: 1.6;">
        请先使用"从标签页选择并分屏"功能选择你想要分屏显示的网站
      </p>
      <button id="goToTabSelector" style="
        padding: 16px 48px;
        font-size: 18px;
        font-weight: 600;
        background: white;
        color: #667eea;
        border: none;
        border-radius: 12px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        transition: all 0.3s ease;
      " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(0,0,0,0.3)';" 
         onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.2)';">
        🌐 去选择网站
      </button>
    </div>
  `;
  
  document.getElementById('goToTabSelector').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('tab-selector/tab-selector.html') });
  });
}

// 根据布局获取最大站点数
function getMaxSitesForLayout(layout) {
  const layoutMap = {
    '2-horizontal': 2,
    '2-vertical': 2,
    '3-horizontal': 3,
    '3-grid': 3,
    '4-grid': 4
  };
  return layoutMap[layout] || 4;
}

// 创建iframe面板
function createIframePanel(site, index) {
  const panel = document.createElement('div');
  panel.className = 'iframe-panel';
  panel.dataset.siteId = site.id;
  
  // 面板头部
  const header = document.createElement('div');
  header.className = 'panel-header';
  
  const title = document.createElement('div');
  title.className = 'panel-title';
  title.innerHTML = `
    <span>${site.name}</span>
    <span class="panel-url">${getDomain(site.url)}</span>
  `;
  
  const actions = document.createElement('div');
  actions.className = 'panel-actions';
  
  const refreshBtn = document.createElement('button');
  refreshBtn.className = 'panel-btn';
  refreshBtn.textContent = '🔄';
  refreshBtn.title = '刷新';
  refreshBtn.onclick = () => refreshPanel(site.id);
  
  const openBtn = document.createElement('button');
  openBtn.className = 'panel-btn';
  openBtn.textContent = '↗';
  openBtn.title = '在新标签页打开';
  openBtn.onclick = () => chrome.tabs.create({ url: site.url });
  
  actions.appendChild(refreshBtn);
  actions.appendChild(openBtn);
  
  header.appendChild(title);
  header.appendChild(actions);
  
  // iframe容器
  const iframeContainer = document.createElement('div');
  iframeContainer.className = 'iframe-container';
  
  // 创建iframe - 现在可以成功加载！
  const iframe = document.createElement('iframe');
  iframe.src = site.url;
  iframe.sandbox = 'allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation';
  iframe.allow = 'camera; microphone; geolocation';
  
  // 添加加载事件监听
  iframe.addEventListener('load', () => {
    console.log(`${site.name} 加载成功`);
  });
  
  iframe.addEventListener('error', (e) => {
    console.error(`${site.name} 加载失败:`, e);
    showPlaceholder(iframeContainer, site);
  });
  
  iframeContainer.appendChild(iframe);
  
  panel.appendChild(header);
  panel.appendChild(iframeContainer);
  
  return panel;
}

// 创建空面板
function createEmptyPanel(index) {
  const panel = document.createElement('div');
  panel.className = 'iframe-panel';
  
  const placeholder = document.createElement('div');
  placeholder.className = 'iframe-placeholder';
  placeholder.innerHTML = `
    <div class="placeholder-icon">➕</div>
    <div class="placeholder-text">空闲位置</div>
    <div class="placeholder-hint">在设置中启用更多AI网站</div>
    <button class="placeholder-btn" onclick="openSettings()">打开设置</button>
  `;
  
  panel.appendChild(placeholder);
  return panel;
}

// 显示占位符（当iframe无法加载时）
function showPlaceholder(container, site) {
  container.innerHTML = '';
  const placeholder = document.createElement('div');
  placeholder.className = 'iframe-placeholder';
  placeholder.innerHTML = `
    <div class="placeholder-icon">🔒</div>
    <div class="placeholder-text">${site.name} 无法在iframe中加载</div>
    <div class="placeholder-hint">该网站限制了iframe嵌入</div>
    <button class="placeholder-btn" onclick="chrome.tabs.create({ url: '${site.url}' })">
      在新标签页打开
    </button>
  `;
  container.appendChild(placeholder);
}

// 获取域名
function getDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (e) {
    return url;
  }
}

// 刷新面板
function refreshPanel(siteId) {
  const panel = document.querySelector(`.iframe-panel[data-site-id="${siteId}"]`);
  if (panel) {
    const iframe = panel.querySelector('iframe');
    if (iframe) {
      iframe.src = iframe.src;
    }
  }
}

// 绑定事件
function bindEvents() {
  // 发送按钮
  document.getElementById('sendButton').addEventListener('click', sendToAllAI);
  
  // 输入框快捷键
  document.getElementById('unifiedInput').addEventListener('keydown', (e) => {
    // Enter发送，Ctrl+Enter换行
    if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      sendToAllAI();
    }
    // Ctrl+Enter或Shift+Enter换行（默认行为）
  });
  
  // 布局选择器
  document.getElementById('layoutSelector').addEventListener('change', (e) => {
    changeLayout(e.target.value);
  });
  
  // 设置按钮
  document.getElementById('settingsBtn').addEventListener('click', openSettings);
  document.getElementById('closeSettings').addEventListener('click', closeSettings);
  
  // 刷新按钮
  document.getElementById('refreshBtn').addEventListener('click', refreshAllPanels);
  
  // 配置选择器按钮
  document.getElementById('configBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('selector-config/selector-config.html') });
  });

  // 全屏按钮
  document.getElementById('fullscreenBtn').addEventListener('click', toggleFullscreen);
  
  // 打开主控制面板
  document.getElementById('openMainPanel').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('main/main.html') });
  });
}

// 发送到所有AI
async function sendToAllAI() {
  const text = document.getElementById('unifiedInput').value.trim();
  
  if (!text) {
    showNotification('请输入问题', 2000);
    return;
  }
  
  showNotification('正在发送到所有AI...', 1000);
  
  let successCount = 0;
  const iframes = document.querySelectorAll('.iframe-container iframe');
  
  // 方法1: 尝试通过postMessage发送到iframe
  console.log('📤 准备向', iframes.length, '个iframe发送消息');
  iframes.forEach((iframe, index) => {
    try {
      const iframeSrc = iframe.src;
      console.log(`📤 向iframe ${index} (${iframeSrc}) 发送消息:`, text);
      
      // 检查iframe是否加载完成
      if (!iframe.contentWindow) {
        console.error(`❌ iframe ${index} 的contentWindow不可访问`);
        return;
      }
      
      // 向iframe发送消息
      iframe.contentWindow.postMessage({
        action: 'fillAndSend',
        text: text,
        source: 'ai-aggregator'
      }, '*');
      
      console.log(`✅ 已向iframe ${index} 发送postMessage`);
      successCount++;
    } catch (error) {
      console.error(`❌ 向iframe ${index} 发送失败:`, error);
    }
  });
  
  // 方法2: 同时通过background发送到content script
  chrome.runtime.sendMessage({
    action: 'sendToAllAI',
    text: text
  }, (response) => {
    if (response && response.success) {
      const count = response.results.filter(r => r.success).length;
      showNotification(`已发送到 ${Math.max(successCount, count)} 个AI`, 3000);
    } else {
      if (successCount > 0) {
        showNotification(`已通过postMessage发送到 ${successCount} 个iframe`, 3000);
      } else {
        showNotification('发送失败，请检查是否已登录', 3000);
      }
    }
  });
  
  // 发送成功后清空输入框
  setTimeout(() => {
    document.getElementById('unifiedInput').value = '';
  }, 500);
}

// 切换布局
function changeLayout(layout) {
  currentLayout = layout;
  const container = document.getElementById('splitContainer');
  container.className = `split-container layout-${layout}`;
  
  // 重新初始化面板
  initializeSplitView();
  
  showNotification(`已切换到 ${getLayoutName(layout)} 布局`, 2000);
}

// 获取布局名称
function getLayoutName(layout) {
  const names = {
    '2-horizontal': '2列横向',
    '2-vertical': '2列纵向',
    '3-horizontal': '3列横向',
    '3-grid': '3宫格',
    '4-grid': '4宫格'
  };
  return names[layout] || layout;
}

// 刷新所有面板
function refreshAllPanels() {
  const iframes = document.querySelectorAll('.iframe-container iframe');
  iframes.forEach(iframe => {
    iframe.src = iframe.src;
  });
  showNotification('已刷新所有面板', 2000);
}

// 切换全屏
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}

// 打开设置
function openSettings() {
  document.getElementById('settingsPanel').classList.remove('hidden');
  loadAISitesSettings();
}

// 关闭设置
function closeSettings() {
  document.getElementById('settingsPanel').classList.add('hidden');
}

// 加载AI站点设置
async function loadAISitesSettings() {
  const sites = await getAllSites();
  const container = document.getElementById('aiSitesList');
  container.innerHTML = '';
  
  sites.forEach(site => {
    const item = document.createElement('div');
    item.className = 'ai-site-item';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = site.enabled;
    checkbox.onchange = () => toggleSite(site.id, checkbox.checked);
    
    const label = document.createElement('label');
    label.textContent = site.name;
    
    item.appendChild(checkbox);
    item.appendChild(label);
    container.appendChild(item);
  });
}

// 获取所有站点
async function getAllSites() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['aiSites'], (result) => {
      resolve(result.aiSites || getDefaultSites());
    });
  });
}

// 切换站点启用状态
async function toggleSite(siteId, enabled) {
  const sites = await getAllSites();
  const site = sites.find(s => s.id === siteId);
  if (site) {
    site.enabled = enabled;
    chrome.storage.sync.set({ aiSites: sites }, async () => {
      await loadConfig();
      initializeSplitView();
      showNotification(`${site.name} 已${enabled ? '启用' : '禁用'}`, 2000);
    });
  }
}

// 显示通知
function showNotification(message, duration = 3000) {
  const notification = document.getElementById('notification');
  notification.querySelector('.notification-text').textContent = message;
  notification.classList.remove('hidden');
  
  setTimeout(() => {
    notification.classList.add('hidden');
  }, duration);
}

// 隐藏加载遮罩
function hideLoading() {
  document.getElementById('loadingOverlay').classList.add('hidden');
}

// 使函数全局可用
window.openSettings = openSettings;
window.chrome = chrome;

