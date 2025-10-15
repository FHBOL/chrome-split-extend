// 后台服务脚本
console.log('多AI对话聚合器 - 后台服务已启动');

// 存储当前打开的AI标签页ID
let aiTabs = {};

// 监听来自popup和main页面的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('收到消息:', request);

  if (request.action === 'openAITabs') {
    // 打开所有启用的AI标签页
    openAITabs(request.sites).then(tabs => {
      sendResponse({ success: true, tabs: tabs });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true; // 保持消息通道打开以进行异步响应
  }

  if (request.action === 'sendToAllAI') {
    // 向所有AI标签页发送消息
    sendToAllAITabs(request.text).then(results => {
      sendResponse({ success: true, results: results });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }

  if (request.action === 'getAITabs') {
    // 获取当前打开的AI标签页
    sendResponse({ tabs: aiTabs });
    return true;
  }

  if (request.action === 'registerAITab') {
    // 注册AI标签页
    aiTabs[request.siteId] = sender.tab.id;
    console.log('注册AI标签页:', request.siteId, sender.tab.id);
    sendResponse({ success: true });
    return true;
  }
});

// 打开所有启用的AI标签页
async function openAITabs(sites) {
  const enabledSites = sites.filter(site => site.enabled);
  const tabs = [];

  for (const site of enabledSites) {
    try {
      const tab = await chrome.tabs.create({
        url: site.url,
        active: false
      });
      tabs.push({ siteId: site.id, tabId: tab.id, siteName: site.name });
      aiTabs[site.id] = tab.id;
      
      // 对于自定义网站，动态注入content script
      if (site.isCustom) {
        setTimeout(async () => {
          try {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['content-scripts/injector.js']
            });
            console.log(`已向${site.name}注入content script`);
          } catch (error) {
            console.error(`向${site.name}注入脚本失败:`, error);
          }
        }, 2000); // 等待页面加载
      }
    } catch (error) {
      console.error(`打开${site.name}失败:`, error);
    }
  }

  // 激活第一个标签页
  if (tabs.length > 0) {
    await chrome.tabs.update(tabs[0].tabId, { active: true });
  }

  return tabs;
}

// 向所有AI标签页发送输入文本
async function sendToAllAITabs(text) {
  const results = [];
  
  for (const [siteId, tabId] of Object.entries(aiTabs)) {
    try {
      // 检查标签页是否仍然存在
      const tab = await chrome.tabs.get(tabId).catch(() => null);
      if (!tab) {
        delete aiTabs[siteId];
        continue;
      }

      // 发送消息到content script
      const response = await chrome.tabs.sendMessage(tabId, {
        action: 'fillAndSend',
        text: text
      });
      
      results.push({
        siteId: siteId,
        tabId: tabId,
        success: response?.success || false
      });
    } catch (error) {
      console.error(`发送到标签页${tabId}失败:`, error);
      results.push({
        siteId: siteId,
        tabId: tabId,
        success: false,
        error: error.message
      });
    }
  }

  return results;
}

// 监听标签页关闭事件
chrome.tabs.onRemoved.addListener((tabId) => {
  // 从aiTabs中移除已关闭的标签页
  for (const [siteId, id] of Object.entries(aiTabs)) {
    if (id === tabId) {
      delete aiTabs[siteId];
      console.log('AI标签页已关闭:', siteId);
      break;
    }
  }
});

// 监听插件安装事件
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('插件首次安装');
    // 初始化存储
    const defaultSites = [
      {
        id: 'chatgpt',
        name: 'ChatGPT',
        url: 'https://chatgpt.com/',
        inputSelector: '#prompt-textarea',
        sendButtonSelector: 'button[data-testid="send-button"]',
        enabled: true,
        isCustom: false
      },
      {
        id: 'gemini',
        name: 'Gemini',
        url: 'https://gemini.google.com/',
        inputSelector: '.ql-editor',
        sendButtonSelector: 'button[aria-label*="Send"]',
        enabled: true,
        isCustom: false
      },
      {
        id: 'claude',
        name: 'Claude',
        url: 'https://claude.ai/',
        inputSelector: 'div[contenteditable="true"]',
        sendButtonSelector: 'button[aria-label="Send Message"]',
        enabled: true,
        isCustom: false
      }
    ];
    
    chrome.storage.sync.get(['aiSites'], (result) => {
      if (!result.aiSites) {
        chrome.storage.sync.set({ aiSites: defaultSites });
      }
    });
  }
});

