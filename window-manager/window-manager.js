// 窗口管理器脚本 - 使用Chrome原生窗口API实现真正的分屏
let allTabs = [];
let selectedTabIds = [];
let currentLayout = '2-horizontal';
let savedLayouts = [];
let originalWindowStates = new Map(); // 保存原始窗口状态以便恢复

// 页面加载
document.addEventListener('DOMContentLoaded', async () => {
  await loadTabs();
  await loadSavedLayouts();
  bindEvents();
});

// 绑定事件
function bindEvents() {
  // 刷新标签页
  document.getElementById('refreshTabs').addEventListener('click', loadTabs);
  
  // 布局选择
  document.querySelectorAll('input[name="layout"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      currentLayout = e.target.value;
      updateSelectedTabsLimit();
    });
  });
  
  // 应用分屏
  document.getElementById('applySplit').addEventListener('click', applySplitScreen);
  
  // 恢复窗口
  document.getElementById('restoreWindows').addEventListener('click', restoreWindows);
  
  // 保存布局
  document.getElementById('saveLayout').addEventListener('click', saveCurrentLayout);
}

// 加载所有标签页
async function loadTabs() {
  showStatus('正在加载标签页...', 'info');
  
  try {
    // 获取所有窗口的所有标签页
    const windows = await chrome.windows.getAll({ populate: true });
    allTabs = [];
    
    windows.forEach(window => {
      window.tabs.forEach(tab => {
        // 排除插件自己的页面
        if (!tab.url.startsWith('chrome-extension://')) {
          allTabs.push({
            id: tab.id,
            windowId: tab.windowId,
            title: tab.title,
            url: tab.url,
            favIconUrl: tab.favIconUrl
          });
        }
      });
    });
    
    renderTabsList();
    hideStatus();
  } catch (error) {
    showStatus('加载标签页失败: ' + error.message, 'error');
  }
}

// 渲染标签页列表
function renderTabsList() {
  const container = document.getElementById('tabsList');
  
  if (allTabs.length === 0) {
    container.innerHTML = '<div class="empty-hint">暂无可用的标签页</div>';
    return;
  }
  
  container.innerHTML = '';
  
  allTabs.forEach(tab => {
    const item = document.createElement('div');
    item.className = 'tab-item';
    if (selectedTabIds.includes(tab.id)) {
      item.classList.add('selected');
    }
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = selectedTabIds.includes(tab.id);
    checkbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        const maxTabs = getMaxTabsForLayout(currentLayout);
        if (selectedTabIds.length >= maxTabs) {
          showStatus(`当前布局最多支持${maxTabs}个标签页`, 'error', 2000);
          e.target.checked = false;
          return;
        }
        selectedTabIds.push(tab.id);
      } else {
        selectedTabIds = selectedTabIds.filter(id => id !== tab.id);
      }
      updateTabItemStyles();
    });
    
    const favicon = document.createElement('img');
    favicon.className = 'tab-favicon';
    favicon.src = tab.favIconUrl || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="%23ccc"/></svg>';
    favicon.onerror = () => {
      favicon.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="%23ccc"/></svg>';
    };
    
    const info = document.createElement('div');
    info.className = 'tab-info';
    
    const title = document.createElement('div');
    title.className = 'tab-title';
    title.textContent = tab.title || '无标题';
    
    const url = document.createElement('div');
    url.className = 'tab-url';
    url.textContent = tab.url;
    
    info.appendChild(title);
    info.appendChild(url);
    
    item.appendChild(checkbox);
    item.appendChild(favicon);
    item.appendChild(info);
    
    // 点击整行也可以选中
    item.addEventListener('click', (e) => {
      if (e.target !== checkbox) {
        checkbox.click();
      }
    });
    
    container.appendChild(item);
  });
}

// 更新标签页选中样式
function updateTabItemStyles() {
  document.querySelectorAll('.tab-item').forEach(item => {
    const checkbox = item.querySelector('input[type="checkbox"]');
    if (checkbox && checkbox.checked) {
      item.classList.add('selected');
    } else {
      item.classList.remove('selected');
    }
  });
}

// 更新选中标签页数量限制
function updateSelectedTabsLimit() {
  const maxTabs = getMaxTabsForLayout(currentLayout);
  if (selectedTabIds.length > maxTabs) {
    selectedTabIds = selectedTabIds.slice(0, maxTabs);
    renderTabsList();
    showStatus(`已自动调整为${maxTabs}个标签页以适应布局`, 'info', 2000);
  }
}

// 获取布局支持的最大标签页数
function getMaxTabsForLayout(layout) {
  const layoutMap = {
    '2-vertical': 2,
    '2-horizontal': 2,
    '3-horizontal': 3,
    '4-grid': 4
  };
  return layoutMap[layout] || 2;
}

// 应用分屏 - 核心功能
async function applySplitScreen() {
  if (selectedTabIds.length === 0) {
    showStatus('请至少选择一个标签页', 'error', 2000);
    return;
  }
  
  const maxTabs = getMaxTabsForLayout(currentLayout);
  if (selectedTabIds.length > maxTabs) {
    showStatus(`当前布局最多支持${maxTabs}个标签页，请取消一些选择`, 'error', 3000);
    return;
  }
  
  showStatus('正在应用分屏布局...', 'info');
  
  try {
    // 获取当前屏幕信息
    const currentWindow = await chrome.windows.getCurrent();
    const screen = {
      width: currentWindow.width,
      height: currentWindow.height,
      left: currentWindow.left,
      top: currentWindow.top
    };
    
    // 获取系统显示器信息
    const displays = await chrome.system.display.getInfo();
    const primaryDisplay = displays.find(d => d.isPrimary) || displays[0];
    
    const workArea = primaryDisplay.workArea;
    const totalWidth = workArea.width;
    const totalHeight = workArea.height;
    const offsetX = workArea.left;
    const offsetY = workArea.top;
    
    // 保存原始窗口状态
    for (const tabId of selectedTabIds) {
      const tab = await chrome.tabs.get(tabId);
      const window = await chrome.windows.get(tab.windowId);
      if (!originalWindowStates.has(tab.windowId)) {
        originalWindowStates.set(tab.windowId, {
          left: window.left,
          top: window.top,
          width: window.width,
          height: window.height,
          state: window.state
        });
      }
    }
    
    // 根据布局计算窗口位置和大小
    const positions = calculateWindowPositions(currentLayout, selectedTabIds.length, {
      width: totalWidth,
      height: totalHeight,
      left: offsetX,
      top: offsetY
    });
    
    // 将每个标签页移动到独立窗口并调整位置
    for (let i = 0; i < selectedTabIds.length; i++) {
      const tabId = selectedTabIds[i];
      const position = positions[i];
      
      // 将标签页移动到新窗口
      const newWindow = await chrome.windows.create({
        tabId: tabId,
        focused: i === 0, // 只聚焦第一个窗口
        state: 'normal'
      });
      
      // 调整窗口位置和大小
      await chrome.windows.update(newWindow.id, {
        left: Math.round(position.left),
        top: Math.round(position.top),
        width: Math.round(position.width),
        height: Math.round(position.height),
        state: 'normal'
      });
      
      // 如果有统一输入内容，注入到标签页
      const unifiedInput = document.getElementById('unifiedInput').value.trim();
      if (unifiedInput) {
        await sendToTab(tabId, unifiedInput);
      }
    }
    
    showStatus(`✨ 分屏成功！已将${selectedTabIds.length}个标签页按${getLayoutName(currentLayout)}排列`, 'success', 3000);
    
    // 保存到历史记录
    await saveToHistory();
    
  } catch (error) {
    console.error('分屏失败:', error);
    showStatus('分屏失败: ' + error.message, 'error', 3000);
  }
}

// 计算窗口位置
function calculateWindowPositions(layout, count, screen) {
  const positions = [];
  const { width, height, left, top } = screen;
  const gap = 4; // 窗口间隙
  
  switch (layout) {
    case '2-vertical': // 上下分屏
      positions.push({
        left: left,
        top: top,
        width: width,
        height: (height - gap) / 2
      });
      positions.push({
        left: left,
        top: top + (height + gap) / 2,
        width: width,
        height: (height - gap) / 2
      });
      break;
      
    case '2-horizontal': // 左右分屏
      positions.push({
        left: left,
        top: top,
        width: (width - gap) / 2,
        height: height
      });
      positions.push({
        left: left + (width + gap) / 2,
        top: top,
        width: (width - gap) / 2,
        height: height
      });
      break;
      
    case '3-horizontal': // 三列横向
      const w3 = (width - gap * 2) / 3;
      for (let i = 0; i < 3; i++) {
        positions.push({
          left: left + i * (w3 + gap),
          top: top,
          width: w3,
          height: height
        });
      }
      break;
      
    case '4-grid': // 四宫格
      const w2 = (width - gap) / 2;
      const h2 = (height - gap) / 2;
      positions.push({ left: left, top: top, width: w2, height: h2 });
      positions.push({ left: left + w2 + gap, top: top, width: w2, height: h2 });
      positions.push({ left: left, top: top + h2 + gap, width: w2, height: h2 });
      positions.push({ left: left + w2 + gap, top: top + h2 + gap, width: w2, height: h2 });
      break;
  }
  
  return positions.slice(0, count);
}

// 发送内容到标签页
async function sendToTab(tabId, text) {
  try {
    await chrome.tabs.sendMessage(tabId, {
      action: 'fillAndSend',
      text: text
    });
  } catch (error) {
    console.log('发送到标签页失败:', error);
  }
}

// 恢复窗口到原始状态
async function restoreWindows() {
  if (originalWindowStates.size === 0) {
    showStatus('没有需要恢复的窗口', 'error', 2000);
    return;
  }
  
  showStatus('正在恢复窗口...', 'info');
  
  try {
    for (const [windowId, state] of originalWindowStates.entries()) {
      try {
        await chrome.windows.update(windowId, {
          left: state.left,
          top: state.top,
          width: state.width,
          height: state.height,
          state: state.state
        });
      } catch (error) {
        console.log('恢复窗口失败:', windowId, error);
      }
    }
    
    originalWindowStates.clear();
    showStatus('✓ 窗口已恢复', 'success', 2000);
  } catch (error) {
    showStatus('恢复窗口失败: ' + error.message, 'error', 2000);
  }
}

// 保存当前布局
async function saveCurrentLayout() {
  if (selectedTabIds.length === 0) {
    showStatus('请先选择标签页并应用分屏', 'error', 2000);
    return;
  }
  
  const name = prompt('请输入布局名称:', `布局-${new Date().toLocaleString('zh-CN')}`);
  if (!name) return;
  
  const layout = {
    id: Date.now(),
    name: name,
    layout: currentLayout,
    tabUrls: [],
    createdAt: new Date().toISOString()
  };
  
  // 保存标签页URL而不是ID（因为ID会变）
  for (const tabId of selectedTabIds) {
    try {
      const tab = await chrome.tabs.get(tabId);
      layout.tabUrls.push({
        url: tab.url,
        title: tab.title
      });
    } catch (error) {
      console.log('获取标签页失败:', tabId);
    }
  }
  
  savedLayouts.push(layout);
  await chrome.storage.local.set({ savedLayouts: savedLayouts });
  
  renderSavedLayouts();
  showStatus(`✓ 布局"${name}"已保存`, 'success', 2000);
}

// 加载已保存的布局
async function loadSavedLayouts() {
  const result = await chrome.storage.local.get(['savedLayouts']);
  savedLayouts = result.savedLayouts || [];
  renderSavedLayouts();
}

// 渲染已保存的布局
function renderSavedLayouts() {
  const container = document.getElementById('savedLayouts');
  
  if (savedLayouts.length === 0) {
    container.innerHTML = '<p class="empty-hint">暂无保存的布局</p>';
    return;
  }
  
  container.innerHTML = '';
  
  savedLayouts.forEach(layout => {
    const card = document.createElement('div');
    card.className = 'layout-card';
    
    card.innerHTML = `
      <div class="layout-card-header">
        <div class="layout-card-name">${layout.name}</div>
        <div class="layout-card-actions">
          <button class="icon-btn delete-btn" data-id="${layout.id}" title="删除">🗑️</button>
        </div>
      </div>
      <div class="layout-card-info">布局: ${getLayoutName(layout.layout)}</div>
      <div class="layout-card-info">标签页: ${layout.tabUrls.length}个</div>
      <div class="layout-card-info">创建: ${new Date(layout.createdAt).toLocaleString('zh-CN')}</div>
      <button class="layout-card-btn apply-btn" data-id="${layout.id}">🚀 应用此布局</button>
    `;
    
    // 应用布局
    card.querySelector('.apply-btn').addEventListener('click', async () => {
      await applyLayout(layout);
    });
    
    // 删除布局
    card.querySelector('.delete-btn').addEventListener('click', async () => {
      if (confirm(`确定删除布局"${layout.name}"？`)) {
        savedLayouts = savedLayouts.filter(l => l.id !== layout.id);
        await chrome.storage.local.set({ savedLayouts: savedLayouts });
        renderSavedLayouts();
        showStatus('✓ 布局已删除', 'success', 2000);
      }
    });
    
    container.appendChild(card);
  });
}

// 应用保存的布局
async function applyLayout(layout) {
  showStatus('正在应用布局...', 'info');
  
  try {
    // 打开所有保存的URL
    const tabs = [];
    for (const tabInfo of layout.tabUrls) {
      const tab = await chrome.tabs.create({
        url: tabInfo.url,
        active: false
      });
      tabs.push(tab);
    }
    
    // 等待标签页加载
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 应用分屏布局
    selectedTabIds = tabs.map(t => t.id);
    currentLayout = layout.layout;
    
    // 更新UI
    document.querySelector(`input[value="${layout.layout}"]`).checked = true;
    await loadTabs();
    
    // 执行分屏
    await applySplitScreen();
    
  } catch (error) {
    showStatus('应用布局失败: ' + error.message, 'error', 3000);
  }
}

// 保存到历史记录
async function saveToHistory() {
  const history = {
    timestamp: new Date().toISOString(),
    layout: currentLayout,
    tabCount: selectedTabIds.length
  };
  
  const result = await chrome.storage.local.get(['layoutHistory']);
  const layoutHistory = result.layoutHistory || [];
  layoutHistory.unshift(history);
  
  // 只保留最近20条
  if (layoutHistory.length > 20) {
    layoutHistory.pop();
  }
  
  await chrome.storage.local.set({ layoutHistory: layoutHistory });
}

// 获取布局名称
function getLayoutName(layout) {
  const names = {
    '2-vertical': '上下分屏',
    '2-horizontal': '左右分屏',
    '3-horizontal': '三列横向',
    '4-grid': '四宫格'
  };
  return names[layout] || layout;
}

// 显示状态
function showStatus(message, type, duration = 0) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${type}`;
  status.classList.remove('hidden');
  
  if (duration > 0) {
    setTimeout(() => hideStatus(), duration);
  }
}

// 隐藏状态
function hideStatus() {
  document.getElementById('status').classList.add('hidden');
}

