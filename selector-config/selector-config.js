// 配置向导脚本
let currentStep = 1;
let selectedSite = null;
let currentConfig = {
  inputSelector: '',
  sendButtonSelector: ''
};
let allConfigs = {};

// 页面加载
document.addEventListener('DOMContentLoaded', async () => {
  await loadExistingConfigs();
  await renderAIList();
  bindEvents();
  updateConfiguredList();
});

// 加载已有配置
async function loadExistingConfigs() {
  const result = await chrome.storage.local.get(['aiSelectorConfigs']);
  allConfigs = result.aiSelectorConfigs || {};

  // 规范化配置键名：支持多种旧格式统一到hostname-based ID
  // 1. 旧的名称键 (ChatGPT, Gemini等)
  // 2. 短域名键 (chatgpt, gemini等)
  // 3. 完整域名键 (chatgpt_com, gemini_google_com等)
  const normalizedConfigs = {};
  
  for (const [key, config] of Object.entries(allConfigs)) {
    // 已经是规范的hostname_based格式（包含下划线）
    if (key.includes('_')) {
      normalizedConfigs[key] = config;
    } else {
      // 旧格式：尝试映射到新格式
      const keyLower = key.toLowerCase();
      const hostMap = {
        'chatgpt': 'chatgpt_com',
        'gemini': 'gemini_google_com', 
        'claude': 'claude_ai',
        'qwen': 'chat_qwen_ai',
        'deepseek': 'chat_deepseek_com',
        'kimi': 'kimi_moonshot_cn'
      };
      const newKey = hostMap[keyLower] || key;
      normalizedConfigs[newKey] = config;
    }
  }
  
  // 如果键名有变化，更新存储
  if (JSON.stringify(Object.keys(allConfigs).sort()) !== JSON.stringify(Object.keys(normalizedConfigs).sort())) {
    allConfigs = normalizedConfigs;
    await saveConfigs();
    console.log('配置键名已规范化:', Object.keys(allConfigs));
  } else {
    allConfigs = normalizedConfigs;
  }
}

// 保存配置
async function saveConfigs() {
  await chrome.storage.local.set({ aiSelectorConfigs: allConfigs });
}

// 渲染AI列表 - 从已打开的标签页中获取
async function renderAIList() {
  const container = document.getElementById('aiList');
  container.innerHTML = '<p class="loading">正在获取已打开的标签页...</p>';

  try {
    // 优先读取当前分屏中的网站（由tab-selector或split-view写入）
    const { currentSplitSites } = await chrome.storage.local.get(['currentSplitSites']);
    let uniqueTabs = [];

    if (Array.isArray(currentSplitSites) && currentSplitSites.length > 0) {
      // 仅显示当前分屏中的网站
      uniqueTabs = currentSplitSites.map(site => ({
        id: Math.random(),
        url: site.url,
        title: site.name
      }));
    } else {
      // 回退：读取当前窗口标签页并按hostname去重
      const tabs = await chrome.tabs.query({ currentWindow: true });
      const validTabs = tabs.filter(tab => 
        tab.url && 
        (tab.url.startsWith('http://') || tab.url.startsWith('https://')) &&
        !tab.url.includes('chrome://') &&
        !tab.url.includes('chrome-extension://')
      );

      const seenHosts = new Set();
      for (const tab of validTabs) {
        try {
          const host = new URL(tab.url).hostname;
          if (seenHosts.has(host)) continue;
          seenHosts.add(host);
          uniqueTabs.push(tab);
        } catch (e) {}
      }
    }

    if (uniqueTabs.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📭</div>
          <h3>没有找到可配置的网站</h3>
          <p>请先在浏览器中打开你想配置的AI网站，然后刷新此页面</p>
          <button class="btn btn-primary" id="refreshTabs">🔄 刷新标签页列表</button>
        </div>
      `;
      document.getElementById('refreshTabs')?.addEventListener('click', renderAIList);
      return;
    }

    container.innerHTML = '';

    // 为每个唯一网站创建卡片
    uniqueTabs.forEach(tab => {
      const url = new URL(tab.url);
      const hostname = url.hostname;
      const siteName = tab.title || hostname;
      
      // 生成唯一ID（基于hostname）
      const siteId = hostname.replace(/[^a-zA-Z0-9]/g, '_');
      
      // 检查是否已配置（支持旧键名迁移后的匹配）
      const isConfigured = !!allConfigs[siteId];
      
      const card = document.createElement('div');
      card.className = 'ai-card' + (isConfigured ? ' configured' : '');
      card.dataset.aiId = siteId;
      card.dataset.tabId = tab.id;
      card.innerHTML = `
        <div class="ai-icon">${getIconForSite(hostname)}</div>
        <div class="ai-info">
          <div class="ai-name">${siteName}</div>
          <div class="ai-url">${url.origin}</div>
        </div>
        <div class="ai-status ${isConfigured ? 'configured' : 'not-configured'}">
          ${isConfigured ? '✓ 已配置' : '待配置'}
        </div>
      `;

      card.addEventListener('click', () => {
        document.querySelectorAll('.ai-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedSite = {
          id: siteId,
          name: siteName,
          url: tab.url,
          hostname: hostname,
          tabId: tab.id
        };
      });

      container.appendChild(card);
    });

  } catch (error) {
    console.error('获取标签页失败:', error);
    container.innerHTML = `
      <div class="error-state">
        <div class="error-icon">❌</div>
        <h3>获取标签页失败</h3>
        <p>${error.message}</p>
      </div>
    `;
  }
}

// 根据网站域名返回合适的图标
function getIconForSite(hostname) {
  const iconMap = {
    'chatgpt.com': '💬',
    'openai.com': '💬',
    'gemini.google.com': '🌟',
    'bard.google.com': '🌟',
    'claude.ai': '🧠',
    'anthropic.com': '🧠',
    'chat.deepseek.com': '🔍',
    'deepseek.com': '🔍',
    'kimi.moonshot.cn': '🌙',
    'chat.qwen.ai': '🎯',
    'qwen.ai': '🎯',
    'poe.com': '🤖',
    'perplexity.ai': '🔮',
    'you.com': '🔎'
  };

  // 精确匹配
  if (iconMap[hostname]) {
    return iconMap[hostname];
  }

  // 部分匹配
  for (const [domain, icon] of Object.entries(iconMap)) {
    if (hostname.includes(domain) || domain.includes(hostname)) {
      return icon;
    }
  }

  // 默认图标
  return '🌐';
}

// 绑定事件
function bindEvents() {
  // 刷新标签页列表
  document.getElementById('refreshTabsBtn').addEventListener('click', async () => {
    await renderAIList();
  });

  // 步骤1 -> 步骤2
  document.getElementById('nextToStep2').addEventListener('click', () => {
    if (!selectedSite) {
      alert('请先选择一个AI网站');
      return;
    }
    goToStep(2);
    updateCurrentSiteInfo();
  });

  // 返回步骤1
  document.getElementById('backToStep1').addEventListener('click', () => {
    goToStep(1);
  });

  // 打开并标记
  document.getElementById('openAndMark').addEventListener('click', openAndMark);

  // 步骤2 -> 步骤3
  document.getElementById('nextToStep3').addEventListener('click', () => {
    goToStep(3);
  });

  // 测试发送
  document.getElementById('testSend').addEventListener('click', testSend);

  // 配置另一个
  document.getElementById('configAnother').addEventListener('click', () => {
    selectedSite = null;
    currentConfig = { inputSelector: '', sendButtonSelector: '' };
    goToStep(1);
    renderAIList();
  });

  // 完成配置
  document.getElementById('finishConfig').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('split-view/split-view.html') });
  });

  // 监听来自标记页面的消息
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'selectorSelected') {
      handleSelectorSelected(request.type, request.selector);
    }
  });
}

// 切换步骤
function goToStep(step) {
  // 更新步骤指示器
  document.querySelectorAll('.step').forEach((s, i) => {
    s.classList.remove('active', 'completed');
    if (i + 1 < step) {
      s.classList.add('completed');
    } else if (i + 1 === step) {
      s.classList.add('active');
    }
  });

  // 切换内容
  document.querySelectorAll('.step-content').forEach((content, i) => {
    content.classList.toggle('hidden', i + 1 !== step);
  });

  currentStep = step;
}

// 更新当前网站信息
function updateCurrentSiteInfo() {
  document.getElementById('currentSiteName').textContent = selectedSite.name;
  document.getElementById('currentSiteUrl').textContent = selectedSite.url;

  // 如果已有配置，显示
  if (allConfigs[selectedSite.id]) {
    currentConfig = { ...allConfigs[selectedSite.id] };
    updatePreview();
  } else {
    currentConfig = { inputSelector: '', sendButtonSelector: '' };
    document.getElementById('previewInput').textContent = '未选择';
    document.getElementById('previewSend').textContent = '未选择';
  }
}

// 打开AI网站并开始标记
async function openAndMark() {
  // 打开AI网站
  const tab = await chrome.tabs.create({
    url: selectedSite.url,
    active: true
  });

  // 等待页面加载后注入标记工具
  setTimeout(async () => {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['selector-config/element-picker.js']
      });

      await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ['selector-config/element-picker.css']
      });

      // 发送配置信息
      await chrome.tabs.sendMessage(tab.id, {
        action: 'startPicking',
        siteId: selectedSite.id,
        siteName: selectedSite.name
      });
    } catch (error) {
      console.error('注入标记工具失败:', error);
      alert('注入标记工具失败，请刷新AI网站页面后重试');
    }
  }, 2000);
}

// 处理选择器选择
function handleSelectorSelected(type, selector) {
  if (type === 'input') {
    currentConfig.inputSelector = selector;
    document.getElementById('previewInput').textContent = selector;
  } else if (type === 'send') {
    currentConfig.sendButtonSelector = selector;
    document.getElementById('previewSend').textContent = selector;
  }

  updatePreview();
}

// 更新预览
function updatePreview() {
  const status = document.getElementById('configStatus');
  const nextBtn = document.getElementById('nextToStep3');

  if (currentConfig.inputSelector && currentConfig.sendButtonSelector) {
    status.className = 'config-status success';
    status.textContent = '✅ 配置完成！可以进入下一步测试';
    nextBtn.disabled = false;

    // 保存配置
    allConfigs[selectedSite.id] = { ...currentConfig };
    saveConfigs();
    updateConfiguredList();
  } else {
    status.className = 'config-status waiting';
    status.textContent = '⏳ 请在AI网站上完成选择器标记';
    nextBtn.disabled = true;
  }
}

// 测试发送
async function testSend() {
  const text = document.getElementById('testInput').value.trim();
  if (!text) {
    showTestResult('请输入测试消息', 'error');
    return;
  }

  showTestResult('正在测试...', 'success');

  // 找到AI网站的标签页
  const tabs = await chrome.tabs.query({});
  const aiTab = tabs.find(tab => tab.url && tab.url.includes(new URL(selectedSite.url).hostname));

  if (!aiTab) {
    showTestResult('未找到AI网站标签页，请确保AI网站仍在打开状态', 'error');
    return;
  }

  // 发送测试消息
  try {
    await chrome.tabs.sendMessage(aiTab.id, {
      action: 'testFillAndSend',
      text: text,
      config: currentConfig
    });

    showTestResult('✅ 测试成功！请检查AI网站是否收到消息', 'success');
  } catch (error) {
    showTestResult('❌ 测试失败: ' + error.message, 'error');
  }
}

// 显示测试结果
function showTestResult(message, type) {
  const result = document.getElementById('testResult');
  result.textContent = message;
  result.className = `test-result show ${type}`;
}

// 更新已配置列表
function updateConfiguredList() {
  const container = document.getElementById('configuredAIs');
  const configs = Object.entries(allConfigs);

  if (configs.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">暂无已配置的AI</p>';
    return;
  }

  container.innerHTML = '';

  configs.forEach(([id, config]) => {
    // 根据ID推断显示名称
    const aiNames = {
      'chatgpt_com': 'ChatGPT',
      'gemini_google_com': 'Gemini',
      'claude_ai': 'Claude',
      'chat_qwen_ai': 'Qwen',
      'chat_deepseek_com': 'DeepSeek',
      'kimi_moonshot_cn': 'Kimi'
    };

    const displayName = aiNames[id] || id.replace(/_/g, '.');

    const item = document.createElement('div');
    item.className = 'configured-item';
    item.innerHTML = `
      <div class="configured-item-info">
        <div class="configured-item-name">${displayName}</div>
        <div class="configured-item-selectors">
          输入框: <code>${config.inputSelector}</code> | 
          发送按钮: <code>${config.sendButtonSelector}</code>
        </div>
      </div>
      <div class="configured-item-actions">
        <button class="btn-icon" title="重新配置" data-id="${id}">✏️</button>
        <button class="btn-icon" title="删除" data-id="${id}" data-action="delete">🗑️</button>
      </div>
    `;

    // 重新配置
    item.querySelector('[title="重新配置"]').addEventListener('click', () => {
      // TODO: 实现重新配置
      alert('请在步骤1中重新选择该AI网站进行配置');
    });

    // 删除
    item.querySelector('[data-action="delete"]').addEventListener('click', () => {
      if (confirm(`确定删除 ${aiNames[id]} 的配置吗？`)) {
        delete allConfigs[id];
        saveConfigs();
        updateConfiguredList();
        renderAIList();
      }
    });

    container.appendChild(item);
  });
}

