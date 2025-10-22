// 分屏视图脚本
const SPLIT_SITES_KEY = 'currentSplitSites';
const LAYOUT_KEY = 'currentSplitLayout';

let aiSites = [];
let currentLayout = '4-grid';
let availableTabsCache = [];
let isFetchingTabs = false;

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
  await refreshAvailableTabs();
});

// 加载配置
async function loadConfig() {
  return new Promise((resolve) => {
    console.log('split-view: 开始加载配置...');
    chrome.storage.local.get(['selectedSitesForSplit'], (localResult) => {
      const selectedSites = Array.isArray(localResult.selectedSitesForSplit) ? localResult.selectedSitesForSplit : null;
      if (selectedSites && selectedSites.length > 0) {
        console.log('split-view: 采用tab-selector传递的新站点:', selectedSites);
        aiSites = selectedSites;
        chrome.storage.sync.set({ [SPLIT_SITES_KEY]: aiSites }, () => {
          chrome.storage.local.remove(['selectedSitesForSplit']);
          chrome.storage.local.set({
            currentSplitSites: aiSites,
            currentSplitTimestamp: Date.now()
          });
          chrome.storage.sync.get([LAYOUT_KEY], (layoutResult) => {
            if (typeof layoutResult[LAYOUT_KEY] === 'string') {
              currentLayout = layoutResult[LAYOUT_KEY];
            }
            resolve();
          });
        });
        return;
      }

      chrome.storage.sync.get([SPLIT_SITES_KEY, LAYOUT_KEY], (result) => {
        aiSites = Array.isArray(result[SPLIT_SITES_KEY]) ? result[SPLIT_SITES_KEY] : [];
        currentLayout = typeof result[LAYOUT_KEY] === 'string' ? result[LAYOUT_KEY] : currentLayout;
        chrome.storage.local.set({
          currentSplitSites: aiSites,
          currentSplitTimestamp: Date.now()
        });
        resolve();
      });
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
  
  // 显示所有选中的网站，不限制数量
  aiSites.forEach((site, index) => {
    const panel = createIframePanel(site, index);
    container.appendChild(panel);
  });
  
  // 动态调整布局以适应网站数量
  adjustLayoutForSiteCount(aiSites.length);
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

// 动态调整布局以适应网站数量
function adjustLayoutForSiteCount(count) {
  const container = document.getElementById('splitContainer');
  const layoutSelector = document.getElementById('layoutSelector');
  
  // 根据数量自动推荐布局
  let recommendedLayout = currentLayout;
  
  if (count <= 2) {
    recommendedLayout = '2-horizontal';
  } else if (count === 3) {
    recommendedLayout = '3-horizontal';
  } else if (count === 4) {
    recommendedLayout = '4-grid';
  } else {
    // 超过4个网站，使用自动布局（支持任意数量的网站）
    recommendedLayout = 'auto-grid';
    // 为了保持每个iframe有合理的宽度，最多显示4列，超过的网站会换行到下一行
    const cols = Math.min(Math.ceil(Math.sqrt(count)), 4);
    const rows = Math.ceil(count / cols);
    container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    container.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    
    console.log(`自动布局: ${count}个网站 -> ${cols}列 x ${rows}行`);
  }
  
  // 如果是预设布局，应用CSS类
  if (['2-horizontal', '2-vertical', '3-horizontal', '3-grid', '4-grid'].includes(recommendedLayout)) {
    container.className = `split-container layout-${recommendedLayout}`;
    container.style.gridTemplateColumns = '';
    container.style.gridTemplateRows = '';
  } else if (recommendedLayout === 'auto-grid') {
    container.className = 'split-container';
  }
  
  // 更新当前布局变量
  currentLayout = recommendedLayout;
  
  // 更新布局选择器
  if (layoutSelector) {
    layoutSelector.value = recommendedLayout;
  }
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
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'panel-btn';
  closeBtn.textContent = '✕';
  closeBtn.title = '关闭此面板';
  closeBtn.onclick = () => removeSite(site.id);

  actions.appendChild(refreshBtn);
  actions.appendChild(openBtn);
  actions.appendChild(closeBtn);
  
  header.appendChild(title);
  header.appendChild(actions);
  
  // iframe容器
  const iframeContainer = document.createElement('div');
  iframeContainer.className = 'iframe-container';
  
  // 创建iframe - 现在可以成功加载！
  const iframe = document.createElement('iframe');
  iframe.src = site.url;
  // 添加 allow-storage-access-by-user-activation 以允许在iframe中访问cookies
  iframe.sandbox = 'allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation allow-storage-access-by-user-activation allow-modals';
  iframe.allow = 'camera; microphone; geolocation; storage-access';
  
  // 添加加载事件监听
  iframe.addEventListener('load', () => {
    console.log(`${site.name} 加载成功`);
    // 延迟检查是否有登录问题提示
    setTimeout(() => {
      checkIframeLoginStatus(iframe, iframeContainer, site);
    }, 2000);
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
    <div class="placeholder-hint">从标签页选择添加更多网站</div>
  `;
  
  const addBtn = document.createElement('button');
  addBtn.className = 'placeholder-btn';
  addBtn.textContent = '去选择网站';
  addBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('tab-selector/tab-selector.html') });
  });
  
  placeholder.appendChild(addBtn);
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
  `;

  const openBtn = document.createElement('button');
  openBtn.className = 'placeholder-btn';
  openBtn.textContent = '在新标签页打开';
  openBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: site.url });
  });
  placeholder.appendChild(openBtn);
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
  
  // 输入框组合输入追踪 + 快捷键
  const unifiedInput = document.getElementById('unifiedInput');
  let isImeComposing = false;
  unifiedInput.addEventListener('compositionstart', () => { isImeComposing = true; });
  unifiedInput.addEventListener('compositionend', () => { isImeComposing = false; });
  unifiedInput.addEventListener('keydown', (e) => {
    // 组合输入期的Enter不发送（避免中文输入法候选期误发）
    if (e.isComposing || isImeComposing || e.keyCode === 229) {
      return;
    }
    // Enter发送，Ctrl+Enter或Shift+Enter换行（默认行为）
    if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      sendToAllAI();
    }
  });
  
  // 布局选择器
  document.getElementById('layoutSelector').addEventListener('change', (e) => {
    changeLayout(e.target.value);
  });
  document.getElementById('addSiteBtn').addEventListener('click', openAddSitePanel);
  document.getElementById('closeAddSite').addEventListener('click', closeAddSitePanel);
  document.getElementById('addSiteBackdrop').addEventListener('click', closeAddSitePanel);
  document.getElementById('refreshAvailableTabs').addEventListener('click', refreshAvailableTabs);
  document.getElementById('openTabSelectorFromAdd').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('tab-selector/tab-selector.html') });
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
  
  // 方法1: 尝试通过postMessage发送到iframe（同时发送，最佳用户体验）
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
  
  if (layout === 'auto-grid') {
    // 自动布局 - 根据网站数量自动计算
    adjustLayoutForSiteCount(aiSites.length);
  } else {
    // 预设布局 - 应用CSS类
    container.style.gridTemplateColumns = '';
    container.style.gridTemplateRows = '';
    container.className = `split-container layout-${layout}`;
  }
  
  showNotification(`已切换到 ${getLayoutName(layout)} 布局`, 2000);
  saveCurrentLayout();
}

function saveCurrentState() {
  chrome.storage.local.set({
    currentSplitSites: aiSites,
    currentSplitTimestamp: Date.now()
  });
  chrome.storage.sync.set({ [SPLIT_SITES_KEY]: aiSites });
}

function saveCurrentLayout() {
  chrome.storage.sync.set({ [LAYOUT_KEY]: currentLayout });
}

// 获取布局名称
function getLayoutName(layout) {
  const names = {
    '2-horizontal': '2列横向',
    '2-vertical': '2列纵向',
    '3-horizontal': '3列横向',
    '3-grid': '3宫格',
    '4-grid': '4宫格',
    'auto-grid': '自动布局'
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
    chrome.storage.sync.get([SPLIT_SITES_KEY], (result) => {
      resolve(result[SPLIT_SITES_KEY] || []);
    });
  });
}

// 切换站点启用状态
async function toggleSite(siteId, enabled) {
  const sites = await getAllSites();
  const site = sites.find(s => s.id === siteId);
  if (site) {
    site.enabled = enabled;
    const updatedSites = sites;
    aiSites = updatedSites;
    await chrome.storage.sync.set({ [SPLIT_SITES_KEY]: updatedSites });
    saveCurrentState();
    initializeSplitView();
    showNotification(`${site.name} 已${enabled ? '启用' : '禁用'}`, 2000);
  }
}

// 移除站点
async function removeSite(siteId) {
  const sites = await getAllSites();
  const index = sites.findIndex(s => s.id === siteId);
  if (index === -1) {
    console.warn('removeSite: 未找到站点', siteId);
    return;
  }

  const removedSite = sites[index];
  const updatedSites = sites.filter(s => s.id !== siteId);

  await chrome.storage.sync.set({ [SPLIT_SITES_KEY]: updatedSites });
  aiSites = updatedSites;
  saveCurrentState();
  initializeSplitView();
  adjustLayoutForSiteCount(aiSites.length);
  renderAvailableTabs();
  showNotification(`${removedSite.name} 已从分屏中移除`, 2000);
}

// 打开添加网站面板
function openAddSitePanel() {
  document.getElementById('addSitePanel').classList.remove('hidden');
  document.getElementById('addSiteBackdrop').classList.remove('hidden');
  renderAvailableTabs();
}

// 关闭添加网站面板
function closeAddSitePanel() {
  document.getElementById('addSitePanel').classList.add('hidden');
  document.getElementById('addSiteBackdrop').classList.add('hidden');
}

// 刷新可添加的标签页
async function refreshAvailableTabs() {
  if (isFetchingTabs) {
    console.log('refreshAvailableTabs: 正在刷新，忽略重复请求');
    return;
  }
  isFetchingTabs = true;
  try {
    console.log('refreshAvailableTabs: 开始获取标签页');
    const tabs = await chrome.tabs.query({});
    availableTabsCache = tabs.filter(tab =>
      tab.url &&
      (tab.url.startsWith('http://') || tab.url.startsWith('https://')) &&
      !tab.url.includes('chrome://') &&
      !tab.url.includes('chrome-extension://')
    );
    console.log('refreshAvailableTabs: 获取到有效标签页数量', availableTabsCache.length);
    renderAvailableTabs();
  } catch (error) {
    console.error('refreshAvailableTabs: 获取标签页失败', error);
    showNotification('刷新标签页失败: ' + error.message, 3000);
  } finally {
    isFetchingTabs = false;
  }
}

// 渲染可添加标签页列表
function renderAvailableTabs() {
  const list = document.getElementById('availableTabsList');
  if (!list) {
    return;
  }

  list.innerHTML = '';

  const loading = document.createElement('div');
  loading.style.cssText = 'text-align: center; padding: 12px; color: #888; font-size: 13px;';
  loading.textContent = '正在加载可用标签页...';

  if (isFetchingTabs) {
    list.appendChild(loading);
    return;
  }

  if (availableTabsCache.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'text-align: center; padding: 24px; color: #666;';
    empty.textContent = '没有可用的标签页，请先打开你想要添加的网站。';
    list.appendChild(empty);
    return;
  }

  availableTabsCache.forEach(tab => {
    const url = new URL(tab.url);
    const siteId = url.hostname.replace(/[^a-zA-Z0-9]/g, '_');
    const alreadyAdded = aiSites.some(site => site.id === siteId || site.url === tab.url);

    const item = document.createElement('div');
    item.className = 'available-tab-item';

    const iconWrapper = document.createElement('div');
    iconWrapper.className = 'available-tab-icon';
    const iconImg = document.createElement('img');
    iconImg.src = tab.favIconUrl || `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=64`;
    iconImg.alt = '';
    iconImg.style.width = '100%';
    iconImg.style.height = '100%';
    iconImg.onerror = () => {
      iconWrapper.textContent = '🌐';
      iconImg.remove();
    };
    iconWrapper.appendChild(iconImg);

    const info = document.createElement('div');
    info.className = 'available-tab-info';
    const title = document.createElement('div');
    title.className = 'available-tab-title';
    title.textContent = tab.title || url.hostname;
    const subtitle = document.createElement('div');
    subtitle.className = 'available-tab-url';
    subtitle.textContent = url.origin;
    info.appendChild(title);
    info.appendChild(subtitle);

    const addBtn = document.createElement('button');
    addBtn.className = 'add-tab-btn';
    addBtn.textContent = alreadyAdded ? '已添加' : '添加';
    addBtn.disabled = alreadyAdded;
    addBtn.addEventListener('click', () => addTabToSplit(tab));

    item.appendChild(iconWrapper);
    item.appendChild(info);
    item.appendChild(addBtn);
    list.appendChild(item);
  });
}

// 添加标签页到分屏
async function addTabToSplit(tab) {
  try {
    const url = new URL(tab.url);
    const siteId = url.hostname.replace(/[^a-zA-Z0-9]/g, '_');

    const sites = await getAllSites();
    const candidate = {
      id: siteId,
      name: tab.title || url.hostname,
      url: tab.url,
      hostname: url.hostname,
      enabled: true
    };

    const existingIndex = sites.findIndex(site => site.id === siteId);
    let updatedSites;
    if (existingIndex >= 0) {
      updatedSites = sites.map((site, index) => index === existingIndex ? { ...candidate } : site);
    } else {
      updatedSites = [...sites, candidate];
    }

    await chrome.storage.sync.set({ [SPLIT_SITES_KEY]: updatedSites });
    aiSites = updatedSites;
    saveCurrentState();
    initializeSplitView();
    adjustLayoutForSiteCount(aiSites.length);
    renderAvailableTabs();
    showNotification('已添加至分屏: ' + (tab.title || url.hostname), 2000);
  } catch (error) {
    console.error('addTabToSplit: 添加失败', error);
    showNotification('添加失败: ' + error.message, 3000);
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

// 检查iframe登录状态
function checkIframeLoginStatus(iframe, container, site) {
  try {
    // 由于跨域限制，我们无法直接访问iframe内容
    // 但我们可以检查iframe是否成功加载
    if (!iframe.contentWindow) {
      console.warn(`${site.name}: iframe contentWindow不可访问`);
      showLoginWarning(container, site);
    }
  } catch (e) {
    // 跨域错误是正常的，说明iframe已加载
    console.log(`${site.name}: 跨域iframe（正常）`);
  }
}

// 显示登录提示
function showLoginWarning(container, site) {
  // 检查是否已经有警告提示
  if (container.querySelector('.login-warning')) {
    return;
  }
  
  const warning = document.createElement('div');
  warning.className = 'login-warning';
  
  const content = document.createElement('div');
  content.className = 'warning-content';
  
  const icon = document.createElement('span');
  icon.className = 'warning-icon';
  icon.textContent = '⚠️';
  content.appendChild(icon);
  
  const text = document.createElement('span');
  text.className = 'warning-text';
  text.textContent = '如果需要登录，建议使用右上角 ↗ 按钮在新标签页处理登录';
  content.appendChild(text);
  
  const button = document.createElement('button');
  button.className = 'warning-btn';
  button.textContent = '↗ 新标签页';
  button.addEventListener('click', () => {
    chrome.tabs.create({ url: site.url });
  });
  content.appendChild(button);
  
  warning.appendChild(content);
  container.appendChild(warning);
}

// 使函数全局可用
window.openSettings = openSettings;
window.chrome = chrome;

