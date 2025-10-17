// Popup页面脚本
document.addEventListener('DOMContentLoaded', async () => {
  // 加载AI网站列表
  loadAISites();

  // 打开标签页选择器（推荐）
  document.getElementById('openTabSelector').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('tab-selector/tab-selector.html') });
  });

  // 打开选择器配置
  document.getElementById('openSelectorConfig').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('selector-config/selector-config.html') });
  });
  
  // 打开窗口管理器（旧版）
  document.getElementById('openWindowManager').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('window-manager/window-manager.html') });
  });

  // 打开主控制面板
  document.getElementById('openMainPage').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('main/main.html') });
  });

  // 启动多AI对话
  document.getElementById('openAITabs').addEventListener('click', async () => {
    const sites = await getAISites();
    showStatus('正在打开AI网站...', 'info');
    
    chrome.runtime.sendMessage({
      action: 'openAITabs',
      sites: sites
    }, (response) => {
      if (response && response.success) {
        showStatus(`成功打开 ${response.tabs.length} 个AI网站`, 'success');
      } else {
        showStatus('打开失败: ' + (response?.error || '未知错误'), 'error');
      }
    });
  });

  // 快速发送
  document.getElementById('quickSend').addEventListener('click', async () => {
    const text = document.getElementById('quickInput').value.trim();
    if (!text) {
      showStatus('请输入问题', 'error');
      return;
    }

    showStatus('正在发送到所有AI...', 'info');

    chrome.runtime.sendMessage({
      action: 'sendToAllAI',
      text: text
    }, (response) => {
      if (response && response.success) {
        const successCount = response.results.filter(r => r.success).length;
        showStatus(`已发送到 ${successCount}/${response.results.length} 个AI`, 'success');
        document.getElementById('quickInput').value = '';
      } else {
        showStatus('发送失败: ' + (response?.error || '未知错误'), 'error');
      }
    });
  });
});

// 加载AI网站列表
async function loadAISites() {
  const sites = await getAISites();
  const aiList = document.getElementById('aiList');
  
  if (sites.length === 0) {
    aiList.innerHTML = '<p class="loading">暂无配置的AI网站</p>';
    return;
  }

  aiList.innerHTML = '';
  sites.forEach(site => {
    const item = document.createElement('div');
    item.className = 'ai-item' + (site.enabled ? '' : ' disabled');
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'ai-' + site.id;
    checkbox.checked = site.enabled;
    checkbox.addEventListener('change', () => toggleAISite(site.id, checkbox.checked));
    
    const label = document.createElement('label');
    label.htmlFor = 'ai-' + site.id;
    label.textContent = site.name;
    
    item.appendChild(checkbox);
    item.appendChild(label);
    aiList.appendChild(item);
  });
}

// 获取AI网站配置
async function getAISites() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['aiSites'], (result) => {
      // 完全由用户从标签页选择，不提供默认站点
      resolve(result.aiSites || []);
    });
  });
}

// 切换AI网站启用状态
async function toggleAISite(siteId, enabled) {
  const sites = await getAISites();
  const site = sites.find(s => s.id === siteId);
  if (site) {
    site.enabled = enabled;
    chrome.storage.sync.set({ aiSites: sites });
  }
}

// 显示状态消息
function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = 'status show ' + type;
  
  setTimeout(() => {
    status.classList.remove('show');
  }, 3000);
}

