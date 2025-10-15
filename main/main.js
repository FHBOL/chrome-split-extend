// 主界面脚本
let aiSites = [];
let aiTabs = {};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async () => {
  // 加载配置
  await loadConfig();
  
  // 渲染UI
  renderAISitesList();
  renderAIPreviewCards();
  
  // 绑定事件
  bindEvents();
  
  // 更新状态
  updateStatus();
  
  addLog('主控制面板已加载', 'success');
});

// 加载配置
async function loadConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['aiSites'], (result) => {
      aiSites = result.aiSites || [];
      resolve();
    });
  });
}

// 保存配置
async function saveConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ aiSites: aiSites }, () => {
      addLog('配置已保存', 'success');
      resolve();
    });
  });
}

// 绑定事件
function bindEvents() {
  // 侧边栏折叠
  document.getElementById('toggleSidebar').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('collapsed');
  });

  // 启动所有AI
  document.getElementById('openAllAI').addEventListener('click', openAllAI);

  // 关闭所有AI
  document.getElementById('closeAllAI').addEventListener('click', closeAllAI);

  // 重置配置
  document.getElementById('resetConfig').addEventListener('click', resetConfig);

  // 添加自定义AI
  document.getElementById('addAIForm').addEventListener('submit', addCustomAI);

  // 发送到所有AI
  document.getElementById('sendToAll').addEventListener('click', sendToAllAI);

  // 清空输入
  document.getElementById('clearInput').addEventListener('click', () => {
    document.getElementById('unifiedInput').value = '';
    updateCharCount();
  });

  // 复制输入
  document.getElementById('copyInput').addEventListener('click', () => {
    const text = document.getElementById('unifiedInput').value;
    navigator.clipboard.writeText(text);
    addLog('已复制到剪贴板', 'success');
  });

  // 字符计数
  document.getElementById('unifiedInput').addEventListener('input', updateCharCount);

  // 刷新状态
  document.getElementById('refreshStatus').addEventListener('click', updateStatus);

  // 清空日志
  document.getElementById('clearLog').addEventListener('click', clearLog);
  
  // 打开分屏视图
  document.getElementById('openSplitView').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('split-view/split-view.html') });
    addLog('已打开分屏视图', 'success');
  });
}

// 渲染AI网站列表
function renderAISitesList() {
  const container = document.getElementById('aiSitesList');
  container.innerHTML = '';

  aiSites.forEach((site, index) => {
    const item = document.createElement('div');
    item.className = 'ai-site-item';

    const info = document.createElement('div');
    info.className = 'ai-site-info';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = site.enabled;
    checkbox.addEventListener('change', () => {
      site.enabled = checkbox.checked;
      saveConfig();
      renderAIPreviewCards();
    });

    const nameSpan = document.createElement('span');
    nameSpan.className = 'ai-site-name';
    nameSpan.textContent = site.name;

    if (site.isCustom) {
      const customBadge = document.createElement('span');
      customBadge.className = 'ai-site-custom';
      customBadge.textContent = '自定义';
      nameSpan.appendChild(customBadge);
    }

    info.appendChild(checkbox);
    info.appendChild(nameSpan);

    const actions = document.createElement('div');
    actions.className = 'ai-site-actions';

    if (site.isCustom) {
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-icon-small';
      deleteBtn.textContent = '🗑️';
      deleteBtn.title = '删除';
      deleteBtn.addEventListener('click', () => deleteAISite(index));
      actions.appendChild(deleteBtn);
    }

    item.appendChild(info);
    item.appendChild(actions);
    container.appendChild(item);
  });
}

// 渲染AI预览卡片
function renderAIPreviewCards() {
  const container = document.getElementById('aiPreviewCards');
  container.innerHTML = '';

  const enabledSites = aiSites.filter(site => site.enabled);

  if (enabledSites.length === 0) {
    container.innerHTML = '<p class="log-empty">请至少启用一个AI网站</p>';
    return;
  }

  enabledSites.forEach(site => {
    const card = document.createElement('div');
    card.className = 'ai-card';

    const header = document.createElement('div');
    header.className = 'ai-card-header';

    const name = document.createElement('div');
    name.className = 'ai-card-name';
    name.textContent = site.name;

    const status = document.createElement('div');
    status.className = 'ai-card-status';
    status.textContent = aiTabs[site.id] ? '✓ 已打开' : '未打开';

    header.appendChild(name);
    header.appendChild(status);

    const url = document.createElement('div');
    url.className = 'ai-card-url';
    url.textContent = site.url;

    const action = document.createElement('button');
    action.className = 'ai-card-action';
    action.textContent = aiTabs[site.id] ? '📱 切换到此标签' : '🚀 打开';
    action.addEventListener('click', () => {
      if (aiTabs[site.id]) {
        chrome.tabs.update(aiTabs[site.id], { active: true });
      } else {
        openSingleAI(site);
      }
    });

    card.appendChild(header);
    card.appendChild(url);
    card.appendChild(action);
    container.appendChild(card);
  });
}

// 打开所有AI
async function openAllAI() {
  addLog('正在打开所有AI网站...', 'info');

  chrome.runtime.sendMessage({
    action: 'openAITabs',
    sites: aiSites
  }, (response) => {
    if (response && response.success) {
      addLog(`成功打开 ${response.tabs.length} 个AI网站`, 'success');
      response.tabs.forEach(tab => {
        aiTabs[tab.siteId] = tab.tabId;
      });
      renderAIPreviewCards();
      updateStatus();
    } else {
      addLog('打开失败: ' + (response?.error || '未知错误'), 'error');
    }
  });
}

// 打开单个AI
async function openSingleAI(site) {
  addLog(`正在打开 ${site.name}...`, 'info');

  chrome.tabs.create({ url: site.url, active: true }, (tab) => {
    aiTabs[site.id] = tab.id;
    addLog(`${site.name} 已打开`, 'success');
    renderAIPreviewCards();
    updateStatus();
  });
}

// 关闭所有AI
async function closeAllAI() {
  if (Object.keys(aiTabs).length === 0) {
    addLog('没有已打开的AI标签页', 'error');
    return;
  }

  addLog('正在关闭所有AI标签页...', 'info');

  for (const tabId of Object.values(aiTabs)) {
    try {
      await chrome.tabs.remove(tabId);
    } catch (error) {
      console.error('关闭标签页失败:', error);
    }
  }

  aiTabs = {};
  renderAIPreviewCards();
  updateStatus();
  addLog('所有AI标签页已关闭', 'success');
}

// 发送到所有AI
async function sendToAllAI() {
  const text = document.getElementById('unifiedInput').value.trim();
  
  if (!text) {
    addLog('请输入问题', 'error');
    return;
  }

  if (Object.keys(aiTabs).length === 0) {
    addLog('请先启动AI标签页', 'error');
    return;
  }

  addLog(`正在发送到所有AI: "${text.substring(0, 50)}..."`, 'info');

  chrome.runtime.sendMessage({
    action: 'sendToAllAI',
    text: text
  }, (response) => {
    if (response && response.success) {
      const successCount = response.results.filter(r => r.success).length;
      const totalCount = response.results.length;
      addLog(`发送完成: ${successCount}/${totalCount} 成功`, successCount === totalCount ? 'success' : 'error');
      
      // 显示详细结果
      response.results.forEach(result => {
        const site = aiSites.find(s => s.id === result.siteId);
        if (site) {
          const status = result.success ? '✓' : '✗';
          addLog(`${status} ${site.name}`, result.success ? 'success' : 'error');
        }
      });
    } else {
      addLog('发送失败: ' + (response?.error || '未知错误'), 'error');
    }
  });
}

// 添加自定义AI
function addCustomAI(e) {
  e.preventDefault();

  const name = document.getElementById('aiName').value.trim();
  const url = document.getElementById('aiUrl').value.trim();
  const inputSelector = document.getElementById('aiInputSelector').value.trim();
  const sendSelector = document.getElementById('aiSendSelector').value.trim();

  if (!name || !url || !inputSelector || !sendSelector) {
    addLog('请填写所有字段', 'error');
    return;
  }

  const customAI = {
    id: 'custom_' + Date.now(),
    name: name,
    url: url,
    inputSelector: inputSelector,
    sendButtonSelector: sendSelector,
    enabled: true,
    isCustom: true
  };

  aiSites.push(customAI);
  saveConfig();
  renderAISitesList();
  renderAIPreviewCards();

  // 清空表单
  document.getElementById('addAIForm').reset();
  
  addLog(`已添加自定义AI: ${name}`, 'success');
}

// 删除AI网站
function deleteAISite(index) {
  const site = aiSites[index];
  if (confirm(`确定要删除 ${site.name} 吗？`)) {
    aiSites.splice(index, 1);
    saveConfig();
    renderAISitesList();
    renderAIPreviewCards();
    addLog(`已删除: ${site.name}`, 'success');
  }
}

// 重置配置
function resetConfig() {
  if (confirm('确定要清空所有配置吗？你将需要重新从标签页选择网站。')) {
    aiSites = [];
    saveConfig();
    renderAISitesList();
    renderAIPreviewCards();
    addLog('配置已清空', 'success');
  }
}

// 更新状态
async function updateStatus() {
  chrome.runtime.sendMessage({ action: 'getAITabs' }, (response) => {
    if (response && response.tabs) {
      aiTabs = response.tabs;
      const count = Object.keys(aiTabs).length;
      const statusBadge = document.getElementById('aiTabsStatus');
      
      if (count > 0) {
        statusBadge.textContent = `${count} 个AI运行中`;
        statusBadge.classList.add('active');
      } else {
        statusBadge.textContent = '未启动';
        statusBadge.classList.remove('active');
      }
      
      renderAIPreviewCards();
    }
  });
}

// 更新字符计数
function updateCharCount() {
  const text = document.getElementById('unifiedInput').value;
  document.getElementById('charCount').textContent = text.length;
}

// 添加日志
function addLog(message, type = 'info') {
  const logContainer = document.getElementById('messageLog');
  
  // 移除空消息提示
  const emptyMsg = logContainer.querySelector('.log-empty');
  if (emptyMsg) {
    emptyMsg.remove();
  }

  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;

  const time = document.createElement('span');
  time.className = 'log-time';
  time.textContent = new Date().toLocaleTimeString('zh-CN');

  const msg = document.createElement('span');
  msg.className = 'log-message';
  msg.textContent = message;

  entry.appendChild(time);
  entry.appendChild(msg);
  logContainer.appendChild(entry);

  // 滚动到底部
  logContainer.scrollTop = logContainer.scrollHeight;

  // 限制日志条数
  const entries = logContainer.querySelectorAll('.log-entry');
  if (entries.length > 100) {
    entries[0].remove();
  }
}

// 清空日志
function clearLog() {
  const logContainer = document.getElementById('messageLog');
  logContainer.innerHTML = '<p class="log-empty">暂无日志</p>';
}

// 定期更新状态
setInterval(updateStatus, 5000);

