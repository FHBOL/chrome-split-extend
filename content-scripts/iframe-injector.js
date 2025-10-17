// iframe内部注入脚本 - 监听来自父页面的消息
console.log('AI聚合器 - iframe注入脚本已加载');

// 当前网站的配置
let siteConfig = null;
const hostname = window.location.hostname;
console.log('当前hostname:', hostname);

// 加载配置
async function loadSiteConfig() {
  try {
    const siteId = hostname.replace(/[^a-zA-Z0-9]/g, '_');
    const result = await chrome.storage.local.get(['aiSelectorConfigs']);
    const allConfigs = result.aiSelectorConfigs || {};
    
    siteConfig = allConfigs[siteId];
    
    if (siteConfig) {
      console.log('已加载网站配置:', siteConfig);
    } else {
      console.log('未找到配置，使用通用选择器');
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
  
  // 等待后点击发送按钮或触发Enter键
  setTimeout(() => {
    console.log('🔍 开始查找发送按钮...');
    const sendButton = findSendButton();
    
    if (sendButton) {
      console.log('✅ 找到发送按钮:', sendButton);
      console.log('   - 标签:', sendButton.tagName);
      console.log('   - ID:', sendButton.id);
      console.log('   - Class:', sendButton.className);
      console.log('   - 禁用状态:', sendButton.disabled);
      
      if (!sendButton.disabled) {
        console.log('👆 准备点击发送按钮...');
        
        // 通用点击策略：模拟真实用户的完整交互流程
        // 适用于任何可点击元素（button、div、span、a等）
        try {
          // 1. 聚焦元素
          if (typeof sendButton.focus === 'function') {
            sendButton.focus();
          }
          
          // 2. 完整的鼠标事件序列（模拟真实用户点击）
          const mouseEventOptions = { 
            bubbles: true, 
            cancelable: true,
            view: window,
            detail: 1
          };
          
          sendButton.dispatchEvent(new MouseEvent('mouseover', mouseEventOptions));
          sendButton.dispatchEvent(new MouseEvent('mouseenter', mouseEventOptions));
          sendButton.dispatchEvent(new MouseEvent('mousedown', mouseEventOptions));
          sendButton.dispatchEvent(new MouseEvent('mouseup', mouseEventOptions));
          sendButton.dispatchEvent(new MouseEvent('click', mouseEventOptions));
          
          // 3. 现代指针事件（适用于触摸屏和鼠标）
          const pointerEventOptions = {
            bubbles: true,
            cancelable: true,
            view: window,
            pointerId: 1,
            pointerType: 'mouse'
          };
          
          sendButton.dispatchEvent(new PointerEvent('pointerover', pointerEventOptions));
          sendButton.dispatchEvent(new PointerEvent('pointerenter', pointerEventOptions));
          sendButton.dispatchEvent(new PointerEvent('pointerdown', pointerEventOptions));
          sendButton.dispatchEvent(new PointerEvent('pointerup', pointerEventOptions));
          sendButton.dispatchEvent(new PointerEvent('click', pointerEventOptions));
          
          // 4. 原生click方法（兜底）
          sendButton.click();
          
          console.log('✅ 已触发所有点击事件');
        } catch (e) {
          console.error('点击按钮时出错:', e);
          // 最后的兜底：只调用原生click
          try {
            sendButton.click();
          } catch (e2) {
            console.error('原生click也失败:', e2);
          }
        }
      } else {
        console.warn('⚠️ 发送按钮被禁用');
      }
    } else {
      console.warn('⚠️ 未找到发送按钮');
      
      // 使用通用降级策略链
      if (typeof executeFallbackStrategies === 'function') {
        executeFallbackStrategies(inputElement, findSendButton);
      } else {
        // 降级：使用简单的Enter键
        console.log('⚠️ 降级策略未加载，使用简单Enter键');
        triggerEnterKey(inputElement);
      }
    }
  }, 500);
}

// 触发Enter键事件（通用函数）
function triggerEnterKey(element) {
  console.log('⌨️ 触发Enter键发送...');
  
  // 确保元素聚焦
  element.focus();
  
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
function findSendButton() {
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
  
  console.log('🔄 尝试使用通用发送按钮选择器...');
  
  // 完全通用的选择器策略 - 零硬编码
  // 按照稳定性和准确度排序
  const selectors = [
    // 1. data-testid（测试ID，最稳定）
    'button[data-testid*="send"]',
    'button[data-testid*="submit"]',
    
    // 2. aria-label（无障碍属性，W3C标准）
    'button[aria-label*="Send"]',
    'button[aria-label*="send"]',
    'button[aria-label*="发送"]',
    'button[aria-label*="提交"]',
    'button[aria-label*="Submit"]',
    
    // 3. type属性
    'button[type="submit"]',
    'input[type="submit"]',
    
    // 4. title属性
    'button[title*="Send"]',
    'button[title*="发送"]',
    
    // 5. 包含特定图标的按钮
    'button:has(svg[data-icon*="send"])',
    'button:has(svg[data-icon*="paper-plane"])',
    'button:has(svg[data-icon*="arrow"])',
    
    // 6. 包含特定class的按钮
    'button[class*="send"]',
    'button[class*="submit"]',
    
    // 7. 包含特定文本的按钮
    'button:has-text("Send")',
    'button:has-text("发送")',
    'button:has-text("提交")',
    
    // 8. 最后的兜底 - 查找离输入框最近的按钮
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
  
  // 最后的兜底策略：查找输入框附近的submit按钮
  console.log('🔍 尝试查找输入框附近的按钮...');
  const inputElement = findInputElement();
  if (inputElement) {
    let parent = inputElement.parentElement;
    let level = 0;
    while (parent && level < 5) {
      const submitBtn = parent.querySelector('button[type="submit"]:not([disabled])');
      if (submitBtn && isVisible(submitBtn)) {
        console.log('✅ 在输入框附近找到submit按钮');
        return submitBtn;
      }
      parent = parent.parentElement;
      level++;
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

