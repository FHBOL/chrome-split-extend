// iframe内部注入脚本 - 监听来自父页面的消息
console.log('AI聚合器 - iframe注入脚本已加载');

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

console.log('检测到网站:', currentSite);

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
  console.log('开始填充消息:', text);
  
  // 查找输入框
  const inputElement = findInputElement();
  if (!inputElement) {
    console.error('未找到输入框');
    return;
  }
  
  console.log('找到输入框:', inputElement);
  
  // 填充文本
  fillInput(inputElement, text);
  
  // 等待后点击发送按钮
  setTimeout(() => {
    const sendButton = findSendButton();
    if (sendButton && !sendButton.disabled) {
      console.log('找到发送按钮，准备点击');
      sendButton.click();
      console.log('已点击发送按钮');
    } else {
      console.log('未找到发送按钮，尝试按Enter键');
      // 尝试按Enter键
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true
      });
      inputElement.dispatchEvent(enterEvent);
    }
  }, 500);
}

// 查找输入框
function findInputElement() {
  const selectors = [
    // ChatGPT
    '#prompt-textarea',
    'textarea[data-id="root"]',
    'textarea[placeholder*="Message"]',
    // Gemini
    '.ql-editor',
    'div.ql-editor[contenteditable="true"]',
    'textarea[placeholder*="询问"]',
    // Claude
    'div[contenteditable="true"][role="textbox"]',
    'div.ProseMirror',
    // 通用
    'textarea:not([style*="display: none"])',
    'div[contenteditable="true"]',
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
  const selectors = [
    'button[data-testid="send-button"]',
    'button[aria-label*="Send"]',
    'button[aria-label*="发送"]',
    'button[type="submit"]',
    'button:has(svg[data-icon="paper-plane"])',
    'button:has(svg[class*="send"])'
  ];
  
  for (const selector of selectors) {
    try {
      const button = document.querySelector(selector);
      if (button && isVisible(button) && !button.disabled) {
        return button;
      }
    } catch (e) {
      continue;
    }
  }
  
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

