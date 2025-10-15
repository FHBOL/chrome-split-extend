// Content Script - 注入到AI网站的脚本
console.log('多AI对话聚合器 - Content Script已加载');

// 检测当前是哪个AI网站
let currentSite = null;
const hostname = window.location.hostname;

if (hostname.includes('openai.com') || hostname.includes('chatgpt.com')) {
  currentSite = 'chatgpt';
} else if (hostname.includes('gemini.google.com')) {
  currentSite = 'gemini';
} else if (hostname.includes('claude.ai')) {
  currentSite = 'claude';
}

// 向background注册当前标签页
if (currentSite) {
  chrome.runtime.sendMessage({
    action: 'registerAITab',
    siteId: currentSite
  }).catch(err => console.log('注册标签页失败:', err));
}

// 监听来自background的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content Script收到消息:', request);

  if (request.action === 'fillAndSend') {
    const result = fillAndSendMessage(request.text);
    sendResponse({ success: result.success, message: result.message });
    return true;
  }
});

// 填充输入框并发送消息
function fillAndSendMessage(text) {
  try {
    // 获取当前站点的配置
    chrome.storage.sync.get(['aiSites'], (result) => {
      const sites = result.aiSites || getDefaultSites();
      const siteConfig = sites.find(s => s.id === currentSite);
      
      if (!siteConfig) {
        console.error('未找到当前网站的配置，当前站点:', currentSite);
        return;
      }

      console.log('开始填充和发送消息:', text.substring(0, 50) + '...');

      // 查找输入框
      const inputElement = findInputElement(siteConfig.inputSelector);
      if (!inputElement) {
        console.error('未找到输入框，已尝试的选择器:', siteConfig.inputSelector);
        return;
      }

      console.log('找到输入框，类型:', inputElement.tagName, '选择器:', siteConfig.inputSelector);

      // 填充文本
      fillInput(inputElement, text);

      // 等待一下再点击发送按钮
      setTimeout(() => {
        const sendButton = findSendButton(siteConfig.sendButtonSelector);
        if (sendButton && !sendButton.disabled) {
          console.log('找到发送按钮，准备点击');
          sendButton.click();
          console.log('已发送消息到', siteConfig.name);
        } else {
          console.error('未找到发送按钮或按钮被禁用:', siteConfig.sendButtonSelector);
          // 尝试按Enter键发送
          console.log('尝试使用Enter键发送...');
          const enterEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true
          });
          inputElement.dispatchEvent(enterEvent);
        }
      }, 500);
    });

    return { success: true, message: '正在处理...' };
  } catch (error) {
    console.error('填充和发送失败:', error);
    return { success: false, message: error.message };
  }
}

// 查找发送按钮
function findSendButton(selector) {
  // 首先尝试配置的选择器
  let button = document.querySelector(selector);
  if (button && isVisible(button)) return button;

  // 尝试多种常见的发送按钮选择器
  const selectors = [
    selector,
    'button[data-testid="send-button"]',
    'button[aria-label*="Send"]',
    'button[aria-label*="发送"]',
    'button[type="submit"]',
    'button:has(svg)'
  ];

  for (const sel of selectors) {
    try {
      button = document.querySelector(sel);
      if (button && isVisible(button) && !button.disabled) {
        return button;
      }
    } catch (e) {
      continue;
    }
  }

  return null;
}

// 获取默认站点配置 - 不再使用硬编码
function getDefaultSites() {
  return [];
}

// 查找输入框元素（支持多种选择器）
function findInputElement(selector) {
  // 首先尝试直接查找
  let element = document.querySelector(selector);
  if (element && isVisible(element)) return element;

  // 尝试多种常见的选择器（针对不同AI网站）
  const selectors = [
    selector,
    // ChatGPT
    '#prompt-textarea',
    'textarea[data-id="root"]',
    // Gemini
    '.ql-editor',
    'div.ql-editor[contenteditable="true"]',
    // Claude
    'div[contenteditable="true"][role="textbox"]',
    'div.ProseMirror',
    // 通用
    'textarea[placeholder*="Message"]',
    'textarea[placeholder*="message"]',
    'textarea[placeholder*="问"]',
    'div[contenteditable="true"]',
    'textarea:not([style*="display: none"])',
    'input[type="text"]:not([style*="display: none"])'
  ];

  for (const sel of selectors) {
    try {
      element = document.querySelector(sel);
      if (element && isVisible(element)) {
        console.log('找到输入框:', sel);
        return element;
      }
    } catch (e) {
      // 忽略无效选择器
      continue;
    }
  }

  // 最后尝试查找所有可能的输入元素
  const allTextareas = document.querySelectorAll('textarea');
  for (const textarea of allTextareas) {
    if (isVisible(textarea) && !textarea.disabled && !textarea.readOnly) {
      console.log('通过遍历找到输入框');
      return textarea;
    }
  }

  return null;
}

// 检查元素是否可见
function isVisible(element) {
  return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
}

// 填充输入框（支持不同类型的输入框）
function fillInput(element, text) {
  if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
    // 普通输入框
    element.value = text;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  } else if (element.isContentEditable || element.getAttribute('contenteditable') === 'true') {
    // contenteditable元素
    element.textContent = text;
    element.innerHTML = text.replace(/\n/g, '<br>');
    
    // 触发input事件
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    
    // 设置光标到末尾
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  // 触发焦点事件
  element.focus();
}

