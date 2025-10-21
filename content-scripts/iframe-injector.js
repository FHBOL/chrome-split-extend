// iframe内部注入脚本 - 监听来自父页面的消息
console.log('AI聚合器 - iframe注入脚本已加载');

// 当前网站的配置
let siteConfig = null;
const hostname = window.location.hostname;
console.log('当前hostname:', hostname);

// 防重复发送机制 - 防止"The chat is in progress!"错误
let lastSendTime = 0;
const MIN_SEND_INTERVAL = 800; // 最小发送间隔800ms（减少用户体感）
// Qwen 专用：发送互斥锁，避免重复触发导致 "The chat is in progress!"
let qwenSendingInFlight = false;

// 加载配置
async function loadSiteConfig() {
  try {
    const siteId = hostname.replace(/[^a-zA-Z0-9]/g, '_');
    const result = await chrome.storage.local.get(['aiSelectorConfigs']);
    const allConfigs = result.aiSelectorConfigs || {};
    
    // 优先使用用户配置
    siteConfig = allConfigs[siteId];
    if (siteConfig && typeof siteConfig.preferEnter === 'undefined') {
      siteConfig.preferEnter = true; // 默认开启回车偏好
    }
    
    if (siteConfig) {
      console.log('✅ 已加载用户配置:', siteConfig);
    } else {
      // 尝试使用预设配置
      if (typeof DEFAULT_CONFIGS !== 'undefined' && DEFAULT_CONFIGS[siteId]) {
        siteConfig = DEFAULT_CONFIGS[siteId];
        console.log('✅ 已加载预设配置:', siteConfig);
      } else {
        console.log('💡 未找到配置，将使用通用选择器和Enter键发送');
      }
    }
  } catch (error) {
    console.error('加载配置失败:', error);
  }
}

// 页面加载时就加载配置
loadSiteConfig();

// 监听来自父页面的postMessage
window.addEventListener('message', (event) => {
  // 验证消息来源
  if (event.data && event.data.source === 'ai-aggregator') {
    console.log('收到来自父页面的消息:', event.data);
    
    if (event.data.action === 'fillAndSend') {
      fillAndSendMessage(event.data.text);
    }
  }
});

// 填充输入框并发送消息
function fillAndSendMessage(text) {
  console.log('🚀 开始填充消息:', text);
  console.log('📍 当前hostname:', hostname);
  console.log('⚙️ 当前配置:', siteConfig);
  
  // 检查是否在最小间隔内 - 防止"The chat is in progress!"错误
  const now = Date.now();
  const minInterval = hostname.includes('qwen') ? 2000 : MIN_SEND_INTERVAL;
  if (now - lastSendTime < minInterval) {
    console.warn('⚠️ 发送过于频繁，已跳过。距上次发送仅', now - lastSendTime, 'ms（最小间隔', minInterval, 'ms）');
    return;
  }
  // Qwen: 如果上一次发送还在进行中，直接跳过
  if (hostname.includes('qwen') && qwenSendingInFlight) {
    console.warn('⚠️ Qwen: 上一次发送仍在进行中，跳过本次触发');
    return;
  }
  lastSendTime = now;
  
  // 查找输入框
  const inputElement = findInputElement();
  if (!inputElement) {
    console.error('❌ 未找到输入框');
    return;
  }
  
  console.log('✅ 找到输入框:', inputElement);
  console.log('   - 标签:', inputElement.tagName);
  console.log('   - ID:', inputElement.id);
  console.log('   - Class:', inputElement.className);
  
  // 填充文本
  fillInput(inputElement, text);
  
  // 针对Grok等网站的特殊处理：多次检查和重新填充
  if (hostname.includes('grok.com') || hostname.includes('x.com')) {
    // 多次检查并重新填充，确保文字不被清空
    const checkAndRefill = (attempt = 1) => {
      setTimeout(() => {
        const currentValue = inputElement.value || inputElement.textContent || '';
        if (!currentValue.trim() || currentValue !== text) {
          console.log(`🔄 Grok第${attempt}次检测到文字被清空，重新填充...`);
          performFill(inputElement, text);
          
          // 最多尝试3次
          if (attempt < 3) {
            checkAndRefill(attempt + 1);
          }
        }
      }, attempt * 150); // 150ms, 300ms, 450ms
    };
    
    checkAndRefill();
  }
  
  // 智能等待：Qwen最多等待2秒，其它站点600ms；直到输入稳定且按钮可用（避免无chat_id场景）
  const timeoutMs = hostname.includes('qwen') ? 2000 : 600;
  waitUntilReadyForSend(inputElement, text, timeoutMs).then((ready) => {
    console.log('⏱️ 就绪等待结果:', ready, '，超时(ms):', timeoutMs);
    // Qwen: 早返回，统一走“仅回车 + 互斥锁”路径，避免按钮点击引发并发/新建会话
    if (hostname.includes('qwen')) {
      if (qwenSendingInFlight) {
        console.warn('⚠️ Qwen: 发送中互斥锁已占用，取消重复发送');
        return;
      }
      qwenSendingInFlight = true;
      try {
        triggerEnterKey(inputElement, text);
      } finally {
        setTimeout(() => { qwenSendingInFlight = false; }, 2500);
      }
      return;
    }
    // 检查配置情况
    const hasInputConfig = siteConfig && siteConfig.inputSelector;
    const hasSendButtonConfig = siteConfig && siteConfig.sendButtonSelector;
    const preferEnter = !siteConfig || siteConfig.preferEnter !== false; // 默认true
    
    // 优先：若开启回车偏好，则始终优先回车
    if (preferEnter && hasInputConfig) {
      console.log('💡 检测到只配置了输入框，使用Enter键发送（最通用、推荐）');
      triggerEnterKey(inputElement, text);
      return;
    }
    
    // 场景2: 配置了发送按钮（可能也配置了输入框）
    if (hasSendButtonConfig) {
      console.log('📌 使用配置的发送按钮选择器（用户自定义优先级最高）');
      const sendButton = findSendButton();
      
      if (sendButton && !sendButton.disabled) {
        clickSendButton(sendButton, inputElement, text);
      } else {
        console.warn('⚠️ 配置的发送按钮不可用，自动降级使用Enter键');
        triggerEnterKey(inputElement, text);
      }
      return;
    }
    
    // 场景3: 没有任何配置，尝试使用通用选择器查找发送按钮
    console.log('🔍 未配置发送方式，尝试查找发送按钮（附近优先）...');
    const sendButton = findSendButton(inputElement);
    
    if (sendButton && !sendButton.disabled) {
      console.log('✅ 找到发送按钮:', sendButton);
      console.log('   - 标签:', sendButton.tagName);
      console.log('   - ID:', sendButton.id);
      console.log('   - Class:', sendButton.className);
      
      clickSendButton(sendButton, inputElement, text);
    } else {
      // 场景4: 未找到发送按钮，使用Enter键作为默认方式
      console.log('💡 未找到发送按钮，使用Enter键发送（最通用、推荐）');
      triggerEnterKey(inputElement, text);
    }
  });
}

// 点击发送按钮（统一的点击逻辑）
function clickSendButton(sendButton, inputElement, text) {
  console.log('👆 准备点击发送按钮...');
  
  // Grok特殊处理：使用Enter键而不是点击发送按钮
  if (hostname.includes('grok.com') || hostname.includes('x.com')) {
    console.log('🎯 Grok特殊处理：使用Enter键而不是点击按钮');
    triggerEnterKey(inputElement, text);
    return;
  }
  //（Qwen 分支已移除，统一由 fillAndSendMessage 早返回触发回车）
  
  // 简化的点击策略 - 避免触发过多事件导致"The chat is in progress!"错误
  try {
    // 1. 聚焦元素
    if (typeof sendButton.focus === 'function') {
      sendButton.focus();
    }
    
    // 2. 只触发必要的3个鼠标事件（模拟真实用户点击）
    const mouseEventOptions = { 
      bubbles: true, 
      cancelable: true,
      view: window,
      detail: 1
    };
    
    sendButton.dispatchEvent(new MouseEvent('mousedown', mouseEventOptions));
    sendButton.dispatchEvent(new MouseEvent('mouseup', mouseEventOptions));
    sendButton.dispatchEvent(new MouseEvent('click', mouseEventOptions));
    
    // 3. 原生click方法（兜底）
    sendButton.click();
    
    console.log('✅ 已触发简化点击事件');
  } catch (e) {
    console.error('点击按钮时出错:', e);
    // 最后的兜底：只调用原生click
    try {
      sendButton.click();
    } catch (e2) {
      console.error('原生click也失败:', e2);
    }
  }
}

// 触发Enter键事件（通用函数）
function triggerEnterKey(element, text) {
  console.log('⌨️ 触发Enter键发送...');
  
  // Grok特殊处理：发送前再次确保输入框有内容
  if (text && (hostname.includes('grok.com') || hostname.includes('x.com'))) {
    element.value = text;
    element.textContent = text;
    element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
  }
  
  // 确保元素聚焦并提交可能的中文输入法合成
  element.focus();
  try {
    element.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
  } catch (e) {}
  element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
  
  // 触发完整的键盘事件序列
  const keydownEvent = new KeyboardEvent('keydown', {
    key: 'Enter',
    code: 'Enter',
    keyCode: 13,
    which: 13,
    bubbles: true,
    cancelable: true,
    composed: true
  });
  
  const keypressEvent = new KeyboardEvent('keypress', {
    key: 'Enter',
    code: 'Enter',
    keyCode: 13,
    which: 13,
    bubbles: true,
    cancelable: true,
    composed: true
  });
  
  const keyupEvent = new KeyboardEvent('keyup', {
    key: 'Enter',
    code: 'Enter',
    keyCode: 13,
    which: 13,
    bubbles: true,
    cancelable: true,
    composed: true
  });
  
  element.dispatchEvent(keydownEvent);
  element.dispatchEvent(keypressEvent);
  element.dispatchEvent(keyupEvent);
  
  console.log('✅ 已触发Enter键事件序列');
}

// 查找输入框
function findInputElement() {
  // 优先使用配置中的选择器
  if (siteConfig && siteConfig.inputSelector) {
    try {
      console.log('使用配置的输入框选择器:', siteConfig.inputSelector);
      const element = document.querySelector(siteConfig.inputSelector);
      if (element && isVisible(element)) {
        console.log('✅ 通过配置选择器找到输入框');
        return element;
      } else {
        console.warn('⚠️ 配置的选择器未找到可见元素');
      }
    } catch (e) {
      console.error('❌ 配置的选择器无效:', e);
    }
  }
  
  console.log('🔄 尝试使用通用选择器...');
  
  // 完全通用的选择器策略 - 零硬编码
  // 按照稳定性和常见度排序，适用于任何网站
  const selectors = [
    // 1. ID选择器（最稳定）
    '#prompt-textarea',
    '#chat-input',
    '#message-input',
    '#input',
    '#textarea',
    
    // 2. Quill编辑器（常见富文本编辑器）
    '.ql-editor',
    '[class*="ql-editor"]',
    
    // 3. ProseMirror编辑器
    '.ProseMirror',
    '[class*="ProseMirror"]',
    
    // 4. 语义化属性（W3C标准，最可靠）
    '[contenteditable="true"][role="textbox"]',
    '[role="textbox"][contenteditable]',
    'textarea[role="textbox"]',
    
    // 5. data属性（开发者明确标记）
    'textarea[data-id]',
    '[data-testid*="input"]',
    '[data-testid*="textarea"]',
    
    // 6. aria-label（无障碍属性）
    'textarea[aria-label]',
    '[contenteditable="true"][aria-label]',
    
    // 7. placeholder属性（常见输入提示）
    'textarea[placeholder]',
    
    // 8. 通用textarea（排除隐藏）
    'textarea:not([style*="display: none"]):not([style*="display:none"])',
    'textarea:not([hidden])',
    
    // 9. contentEditable（富文本编辑）
    'div[contenteditable="true"]',
    '[contenteditable="true"]',
    
    // 10. 最后的兜底
    'textarea',
    'input[type="text"]'
  ];
  
  for (const selector of selectors) {
    try {
      const element = document.querySelector(selector);
      if (element && isVisible(element)) {
        return element;
      }
    } catch (e) {
      continue;
    }
  }
  
  // 最后尝试找所有可见的textarea
  const textareas = document.querySelectorAll('textarea');
  for (const textarea of textareas) {
    if (isVisible(textarea) && !textarea.disabled && !textarea.readOnly) {
      return textarea;
    }
  }
  
  return null;
}

// 查找发送按钮
function findSendButton(inputElement) {
  // 优先使用配置中的选择器
  if (siteConfig && siteConfig.sendButtonSelector) {
    try {
      console.log('使用配置的发送按钮选择器:', siteConfig.sendButtonSelector);
      const button = document.querySelector(siteConfig.sendButtonSelector);
      if (button && isVisible(button)) {
        console.log('✅ 通过配置选择器找到发送按钮');
        return button;
      } else {
        console.warn('⚠️ 配置的选择器未找到可见按钮');
      }
    } catch (e) {
      console.error('❌ 配置的选择器无效:', e);
    }
  }
  
  // 1) 优先：在输入框附近寻找最近的可点击按钮（避免误点“新建会话”等全局按钮）
  const baseInput = inputElement || findInputElement();
  if (baseInput) {
    const nearest = findNearestSendButton(baseInput);
    if (nearest) {
      console.log('✅ 在输入框附近选中最近的可用按钮');
      return nearest;
    }
  }
  
  console.log('🔄 尝试使用通用发送按钮选择器（全局）...');
  
  // 2) 次优：全局通用选择器（保持原有顺序）
  const selectors = [
    'button[data-testid*="send"]',
    'button[data-testid*="submit"]',
    'button[aria-label*="Send"]',
    'button[aria-label*="send"]',
    'button[aria-label*="发送"]',
    'button[aria-label*="提交"]',
    'button[aria-label*="Submit"]',
    'button[type="submit"]',
    'input[type="submit"]',
    'button[title*="Send"]',
    'button[title*="发送"]',
    'button:has(svg[data-icon*="send"])',
    'button:has(svg[data-icon*="paper-plane"])',
    'button:has(svg[data-icon*="arrow"])',
    'button[class*="send"]',
    'button[class*="submit"]',
    'button:has-text("Send")',
    'button:has-text("发送")',
    'button:has-text("提交")',
    'button[type="submit"]',
    'button'
  ];
  
  for (const selector of selectors) {
    try {
      const button = document.querySelector(selector);
      if (button && isVisible(button) && !button.disabled) {
        console.log('✅ 通过通用选择器找到发送按钮:', selector);
        return button;
      }
    } catch (e) {
      continue;
    }
  }
  
  console.warn('❌ 未找到任何发送按钮');
  return null;
}

// 填充输入框
function fillInput(element, text) {
  console.log('填充输入框，元素类型:', element.tagName, '是否contentEditable:', element.isContentEditable);
  
  // 先聚焦和点击元素，激活它
  element.focus();
  element.click();
  
  // 针对Grok的特殊处理：使用更激进的填充策略
  if (hostname.includes('grok.com') || hostname.includes('x.com')) {
    console.log('🎯 使用Grok特殊填充策略');
    
    // 方法1: 直接设置值并立即触发事件
    element.value = text;
    element.textContent = text;
    
    // 方法2: 使用原生setter
    try {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        element.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,
        'value'
      ).set;
      nativeInputValueSetter.call(element, text);
    } catch (e) {
      console.log('原生setter失败:', e);
    }
    
    // 方法3: 触发所有可能的事件
    const events = ['input', 'change', 'keyup', 'keydown', 'blur', 'focus'];
    events.forEach(eventType => {
      element.dispatchEvent(new Event(eventType, { bubbles: true, cancelable: true }));
    });
    
    // 方法4: 延迟再次填充
    setTimeout(() => {
      element.value = text;
      element.textContent = text;
      element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    }, 50);
    
    console.log('Grok填充完成，当前值:', element.value || element.textContent);
    return;
  }
  
  performFill(element, text);
}

// 执行实际的填充操作
function performFill(element, text) {
  
  if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
    // 普通输入框 - 使用原生setter
    try {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        element.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,
        'value'
      ).set;
      nativeInputValueSetter.call(element, text);
    } catch (e) {
      // 如果原生setter失败，使用普通赋值
      element.value = text;
    }
    
    // 触发多种事件确保网站检测到输入
    element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    element.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, data: text }));
    element.dispatchEvent(new Event('keyup', { bubbles: true, cancelable: true }));
    
  } else if (element.isContentEditable || element.getAttribute('contenteditable') === 'true') {
    // ContentEditable元素（Gemini、Claude等）
    
    // 方法1: 清空并插入文本节点
    element.textContent = '';
    const textNode = document.createTextNode(text);
    element.appendChild(textNode);
    
    // 方法2: 使用innerHTML作为后备
    if (!element.textContent) {
      element.innerHTML = text;
    }
    
    // 方法3: 尝试使用execCommand（虽然已废弃但很多网站还在用）
    try {
      element.focus();
      document.execCommand('selectAll', false, null);
      document.execCommand('insertText', false, text);
    } catch (e) {
      console.log('execCommand失败:', e);
    }
    
    // 设置光标到末尾
    try {
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(element);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    } catch (e) {
      console.log('设置光标失败:', e);
    }
    
    // 触发各种事件
    element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    element.dispatchEvent(new InputEvent('input', { 
      bubbles: true, 
      cancelable: true, 
      data: text,
      inputType: 'insertText'
    }));
    element.dispatchEvent(new Event('keyup', { bubbles: true, cancelable: true }));
    element.dispatchEvent(new Event('keydown', { bubbles: true, cancelable: true }));
    
    // 特别针对Gemini的Quill编辑器
    if (element.classList.contains('ql-editor')) {
      console.log('检测到Quill编辑器，触发特殊事件');
      element.dispatchEvent(new Event('text-change', { bubbles: true }));
      
      // 尝试直接操作Quill实例
      try {
        const quillContainer = element.closest('.ql-container');
        if (quillContainer && quillContainer.__quill) {
          console.log('找到Quill实例，直接设置内容');
          quillContainer.__quill.setText(text);
        }
      } catch (e) {
        console.log('操作Quill实例失败:', e);
      }
    }
  }
  
  console.log('填充完成，当前值:', element.textContent || element.value);
}

// 检查元素是否可见
function isVisible(element) {
  return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
}

// 等待输入内容稳定且可用的发送按钮出现（最多timeoutMs毫秒）
function waitUntilReadyForSend(inputElement, expectedText, timeoutMs) {
  return new Promise((resolve) => {
    const start = Date.now();
    const checkIntervalMs = 80;
    const check = () => {
      const elapsed = Date.now() - start;
      const currentText = (inputElement.value || inputElement.textContent || '').trim();
      const textReady = !expectedText || currentText === String(expectedText).trim();
      const btn = findSendButton(inputElement);
      const buttonReady = btn && isVisible(btn) && !btn.disabled;
      if (textReady && buttonReady) {
        resolve(true);
        return;
      }
      if (elapsed >= timeoutMs) {
        resolve(false);
        return;
      }
      setTimeout(check, checkIntervalMs);
    };
    check();
  });
}

// 在输入框附近查找最近且可点击的发送按钮
function findNearestSendButton(inputElement) {
  try {
    // 自底向上在有限层级内搜索，优先submit类型
    let parent = inputElement;
    let level = 0;
    const maxLevels = 6;
    let candidates = [];
    const badKeywords = ['新建', '登录', '登陆', '注册', '清空', '删除', '更多', '返回', '下载', 'App', '客户端', '导入', '设置', 'Login', 'Sign', 'New', 'Clear', 'Delete'];
    while (parent && level < maxLevels) {
      try {
        const localButtons = parent.querySelectorAll(
          'button[type="submit"], input[type="submit"], button:not([disabled])'
        );
        for (const b of localButtons) {
          if (!isVisible(b) || b.disabled) continue;
          const label = ((b.textContent || b.getAttribute('aria-label') || '').trim());
          if (label && badKeywords.some(k => label.includes(k))) continue;
          candidates.push(b);
        }
      } catch (e) {}
      parent = parent.parentElement;
      level++;
    }
    if (candidates.length === 0) return null;
    
    // 选择与输入框几何距离最近的按钮
    const inputRect = inputElement.getBoundingClientRect();
    let best = null;
    let bestDist = Infinity;
    for (const btn of candidates) {
      const r = btn.getBoundingClientRect();
      const dx = Math.max(0, Math.max(inputRect.left - r.right, r.left - inputRect.right));
      const dy = Math.max(0, Math.max(inputRect.top - r.bottom, r.top - inputRect.bottom));
      const dist = Math.hypot(dx, dy);
      if (dist < bestDist) {
        best = btn;
        bestDist = dist;
      }
    }
    return best;
  } catch (e) {
    return null;
  }
}

