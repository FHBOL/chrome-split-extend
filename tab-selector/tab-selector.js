// 标签页选择器
let allTabs = [];
let selectedTabs = [];
const MAX_SELECTION = 4;

document.addEventListener('DOMContentLoaded', async () => {
  await loadTabs();
  bindEvents();
});

// 加载标签页
async function loadTabs() {
  try {
    const tabsGrid = document.getElementById('tabsGrid');
    const emptyState = document.getElementById('emptyState');
    
    tabsGrid.innerHTML = '<p class="loading">正在获取标签页...</p>';
    emptyState.style.display = 'none';
    
    // 获取所有标签页
    const tabs = await chrome.tabs.query({});
    
    // 过滤有效的网站
    allTabs = tabs.filter(tab => 
      tab.url && 
      (tab.url.startsWith('http://') || tab.url.startsWith('https://')) &&
      !tab.url.includes('chrome://') &&
      !tab.url.includes('chrome-extension://')
    );
    
    if (allTabs.length === 0) {
      tabsGrid.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }
    
    renderTabs();
  } catch (error) {
    console.error('加载标签页失败:', error);
    document.getElementById('tabsGrid').innerHTML = `
      <p class="loading" style="color: #f56c6c;">加载失败: ${error.message}</p>
    `;
  }
}

// 渲染标签页列表
function renderTabs() {
  const tabsGrid = document.getElementById('tabsGrid');
  tabsGrid.innerHTML = '';
  
  allTabs.forEach(tab => {
    const card = createTabCard(tab);
    tabsGrid.appendChild(card);
  });
  
  updateCounter();
}

// 创建标签页卡片
function createTabCard(tab) {
  const card = document.createElement('div');
  card.className = 'tab-card';
  card.dataset.tabId = tab.id;
  
  const isSelected = selectedTabs.some(t => t.id === tab.id);
  if (isSelected) {
    card.classList.add('selected');
  }
  
  const url = new URL(tab.url);
  const favicon = tab.favIconUrl || `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=64`;
  
  card.innerHTML = `
    <div class="tab-icon">
      <img src="${favicon}" alt="" onerror="this.style.display='none'; this.parentElement.textContent='🌐';" style="width: 100%; height: 100%; border-radius: 8px;">
    </div>
    <div class="tab-info">
      <div class="tab-title">${tab.title || url.hostname}</div>
      <div class="tab-url">${url.origin}</div>
    </div>
    <div class="check-mark">✓</div>
  `;
  
  card.addEventListener('click', () => toggleTab(tab, card));
  
  return card;
}

// 切换标签页选择状态
function toggleTab(tab, card) {
  const index = selectedTabs.findIndex(t => t.id === tab.id);
  
  if (index >= 0) {
    // 已选择，取消选择
    selectedTabs.splice(index, 1);
    card.classList.remove('selected');
  } else {
    // 未选择，检查是否超过限制
    if (selectedTabs.length >= MAX_SELECTION) {
      showNotification(`最多只能选择 ${MAX_SELECTION} 个网站`, 'warning');
      return;
    }
    selectedTabs.push(tab);
    card.classList.add('selected');
  }
  
  updateCounter();
}

// 更新计数器
function updateCounter() {
  document.getElementById('selectedCount').textContent = selectedTabs.length;
  document.getElementById('actionCount').textContent = selectedTabs.length;
  
  const startBtn = document.getElementById('startSplitView');
  startBtn.disabled = selectedTabs.length === 0;
}

// 绑定事件
function bindEvents() {
  // 刷新按钮
  document.getElementById('refreshBtn').addEventListener('click', loadTabs);
  
  // 全选按钮
  document.getElementById('selectAllBtn').addEventListener('click', () => {
    const toSelect = allTabs.slice(0, MAX_SELECTION);
    selectedTabs = [...toSelect];
    
    document.querySelectorAll('.tab-card').forEach(card => {
      const tabId = parseInt(card.dataset.tabId);
      if (selectedTabs.some(t => t.id === tabId)) {
        card.classList.add('selected');
      }
    });
    
    updateCounter();
  });
  
  // 清除按钮
  document.getElementById('clearAllBtn').addEventListener('click', () => {
    selectedTabs = [];
    document.querySelectorAll('.tab-card').forEach(card => {
      card.classList.remove('selected');
    });
    updateCounter();
  });
  
  // 开始分屏按钮
  document.getElementById('startSplitView').addEventListener('click', startSplitView);
}

// 开始分屏
async function startSplitView() {
  if (selectedTabs.length === 0) {
    showNotification('请至少选择一个网站', 'warning');
    return;
  }
  
  try {
    // 将选中的标签页信息存储到localStorage（用于split-view页面读取）
    const sites = selectedTabs.map(tab => {
      const url = new URL(tab.url);
      return {
        id: url.hostname.replace(/[^a-zA-Z0-9]/g, '_'),
        name: tab.title || url.hostname,
        url: tab.url,
        hostname: url.hostname,
        enabled: true
      };
    });
    
    // 保存到storage（临时传递 + 当前分屏记录）
    console.log('tab-selector: 准备保存的网站数据:', sites);
    await chrome.storage.local.set({ 
      selectedSitesForSplit: sites,
      splitViewTimestamp: Date.now(),
      currentSplitSites: sites,
      currentSplitTimestamp: Date.now()
    });
    console.log('tab-selector: 数据已保存到storage.local');
    
    // 打开分屏视图
    chrome.tabs.create({ 
      url: chrome.runtime.getURL('split-view/split-view.html')
    });
    
    // 关闭当前标签页
    setTimeout(() => {
      window.close();
    }, 500);
    
  } catch (error) {
    console.error('启动分屏失败:', error);
    showNotification('启动分屏失败: ' + error.message, 'error');
  }
}

// 显示通知
function showNotification(message, type = 'info') {
  // 简单的通知实现
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 16px 24px;
    background: ${type === 'warning' ? '#ffc107' : type === 'error' ? '#f56c6c' : '#409eff'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 10000;
    font-size: 14px;
    animation: slideIn 0.3s ease;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// 添加动画样式
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

