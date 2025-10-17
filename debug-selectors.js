// 调试脚本 - 在浏览器控制台运行，测试选择器是否正确

// 1. 测试输入框选择器
function testInputSelector(selector) {
  console.log('测试输入框选择器:', selector);
  const element = document.querySelector(selector);
  if (element) {
    console.log('✅ 找到元素:', element);
    console.log('- 标签:', element.tagName);
    console.log('- 类型:', element.type);
    console.log('- ID:', element.id);
    console.log('- Class:', element.className);
    console.log('- 是否可见:', !!(element.offsetWidth || element.offsetHeight));
    console.log('- 是否可编辑:', element.isContentEditable || element.contentEditable === 'true' || !element.readOnly);
    return element;
  } else {
    console.log('❌ 未找到元素');
    return null;
  }
}

// 2. 测试发送按钮选择器
function testButtonSelector(selector) {
  console.log('测试发送按钮选择器:', selector);
  const element = document.querySelector(selector);
  if (element) {
    console.log('✅ 找到元素:', element);
    console.log('- 标签:', element.tagName);
    console.log('- 文本:', element.textContent);
    console.log('- ID:', element.id);
    console.log('- Class:', element.className);
    console.log('- aria-label:', element.getAttribute('aria-label'));
    console.log('- 是否可见:', !!(element.offsetWidth || element.offsetHeight));
    console.log('- 是否禁用:', element.disabled);
    return element;
  } else {
    console.log('❌ 未找到元素');
    return null;
  }
}

// 3. 查找所有可能的输入框
function findAllInputs() {
  console.log('=== 查找所有可能的输入框 ===');
  
  const textareas = document.querySelectorAll('textarea');
  console.log(`找到 ${textareas.length} 个 textarea:`);
  textareas.forEach((el, i) => {
    if (el.offsetWidth || el.offsetHeight) {
      console.log(`  ${i + 1}. ID=${el.id}, Class=${el.className}, Placeholder=${el.placeholder}`);
    }
  });
  
  const contentEditables = document.querySelectorAll('[contenteditable="true"]');
  console.log(`找到 ${contentEditables.length} 个 contentEditable 元素:`);
  contentEditables.forEach((el, i) => {
    if (el.offsetWidth || el.offsetHeight) {
      console.log(`  ${i + 1}. Tag=${el.tagName}, ID=${el.id}, Class=${el.className}`);
    }
  });
}

// 4. 查找所有可能的发送按钮
function findAllButtons() {
  console.log('=== 查找所有可能的发送按钮 ===');
  
  const buttons = document.querySelectorAll('button');
  console.log(`找到 ${buttons.length} 个 button:`);
  
  const keywords = ['发送', '送出', 'send', 'submit', '提交'];
  buttons.forEach((btn, i) => {
    const text = btn.textContent.toLowerCase().trim();
    const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
    const id = btn.id;
    const className = btn.className;
    
    const isLikelySendButton = keywords.some(kw => 
      text.includes(kw) || ariaLabel.includes(kw) || id.includes(kw) || className.includes(kw)
    );
    
    if (isLikelySendButton && (btn.offsetWidth || btn.offsetHeight)) {
      console.log(`  ${i + 1}. [可能是发送按钮]`);
      console.log(`     ID=${id}, Class=${className}`);
      console.log(`     Text="${text}", aria-label="${ariaLabel}"`);
      console.log(`     Disabled=${btn.disabled}`);
    }
  });
}

// 5. 测试填充和发送（千问）
async function testQwenFillAndSend() {
  console.log('=== 测试千问的填充和发送 ===');
  
  // 读取配置
  const result = await chrome.storage.local.get(['aiSelectorConfigs']);
  const configs = result.aiSelectorConfigs || {};
  const qwenConfig = configs['chat_qwen_ai'];
  
  if (!qwenConfig) {
    console.error('❌ 未找到千问配置');
    return;
  }
  
  console.log('千问配置:', qwenConfig);
  
  // 查找输入框
  const input = document.querySelector(qwenConfig.inputSelector);
  if (!input) {
    console.error('❌ 未找到输入框:', qwenConfig.inputSelector);
    return;
  }
  console.log('✅ 找到输入框:', input);
  
  // 填充文本
  const testText = '测试消息-' + Date.now();
  input.value = testText;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  console.log('✅ 已填充文本:', testText);
  
  // 查找发送按钮
  const sendBtn = document.querySelector(qwenConfig.sendButtonSelector);
  if (!sendBtn) {
    console.error('❌ 未找到发送按钮:', qwenConfig.sendButtonSelector);
    return;
  }
  console.log('✅ 找到发送按钮:', sendBtn);
  console.log('   按钮禁用状态:', sendBtn.disabled);
  
  if (!sendBtn.disabled) {
    console.log('⚠️ 准备点击发送按钮（3秒后）...');
    setTimeout(() => {
      sendBtn.click();
      console.log('✅ 已点击发送按钮');
    }, 3000);
  } else {
    console.error('❌ 发送按钮被禁用');
  }
}

// 使用说明
console.log(`
=== 选择器调试工具 ===

使用方法：
1. testInputSelector('#chat-input')  - 测试输入框选择器
2. testButtonSelector('#open-omni-button')  - 测试发送按钮选择器
3. findAllInputs()  - 查找所有输入框
4. findAllButtons()  - 查找所有可能的发送按钮
5. testQwenFillAndSend()  - 完整测试千问的填充和发送

示例：
testInputSelector('#chat-input');
findAllButtons();
`);


