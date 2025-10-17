// 在Gemini的iframe控制台运行此脚本，测试选择器

console.log('=== Gemini选择器测试 ===');

// 1. 测试当前配置的选择器
async function testCurrentConfig() {
  const result = await chrome.storage.local.get(['aiSelectorConfigs']);
  const configs = result.aiSelectorConfigs || {};
  const geminiConfig = configs['gemini_google_com'];
  
  console.log('当前Gemini配置:', geminiConfig);
  
  if (!geminiConfig) {
    console.error('❌ 未找到Gemini配置');
    return;
  }
  
  // 测试输入框选择器
  console.log('\n测试输入框选择器:', geminiConfig.inputSelector);
  const input = document.querySelector(geminiConfig.inputSelector);
  if (input) {
    console.log('✅ 找到输入框:', input);
  } else {
    console.error('❌ 未找到输入框');
    console.log('尝试查找所有可能的输入框...');
    findAllInputs();
  }
  
  // 测试发送按钮选择器
  console.log('\n测试发送按钮选择器:', geminiConfig.sendButtonSelector);
  const btn = document.querySelector(geminiConfig.sendButtonSelector);
  if (btn) {
    console.log('✅ 找到发送按钮:', btn);
  } else {
    console.error('❌ 未找到发送按钮');
    console.log('尝试查找所有可能的发送按钮...');
    findAllButtons();
  }
}

// 2. 查找所有可能的输入框
function findAllInputs() {
  console.log('\n=== 所有可能的输入框 ===');
  
  // 查找Quill编辑器
  const quillEditors = document.querySelectorAll('.ql-editor, [class*="ql-editor"]');
  console.log(`找到 ${quillEditors.length} 个Quill编辑器:`);
  quillEditors.forEach((el, i) => {
    if (el.offsetWidth > 0) {
      console.log(`  ${i + 1}. 选择器建议: .ql-editor`);
      console.log(`     Class: ${el.className}`);
      console.log(`     可见: ${el.offsetWidth > 0}`);
    }
  });
  
  // 查找contenteditable
  const editables = document.querySelectorAll('[contenteditable="true"]');
  console.log(`\n找到 ${editables.length} 个contenteditable元素:`);
  editables.forEach((el, i) => {
    if (el.offsetWidth > 0) {
      const selector = el.className ? `.${el.className.split(' ')[0]}` : el.tagName.toLowerCase();
      console.log(`  ${i + 1}. 建议选择器: ${selector}`);
      console.log(`     Tag: ${el.tagName}, Class: ${el.className}`);
    }
  });
  
  // 查找textarea
  const textareas = document.querySelectorAll('textarea');
  console.log(`\n找到 ${textareas.length} 个textarea:`);
  textareas.forEach((el, i) => {
    if (el.offsetWidth > 0) {
      console.log(`  ${i + 1}. Placeholder: ${el.placeholder}`);
      console.log(`     Class: ${el.className}`);
    }
  });
  
  // 推荐最佳选择器
  console.log('\n💡 推荐的Gemini输入框选择器:');
  console.log('   1. .ql-editor (最稳定)');
  console.log('   2. [contenteditable="true"][role="textbox"]');
  console.log('   3. rich-textarea .ql-editor');
}

// 3. 查找所有可能的发送按钮
function findAllButtons() {
  console.log('\n=== 所有可能的发送按钮 ===');
  
  const buttons = document.querySelectorAll('button');
  console.log(`找到 ${buttons.length} 个button`);
  
  const keywords = ['send', 'submit', '发送', 'paper-plane', 'arrow'];
  const candidates = [];
  
  buttons.forEach((btn, i) => {
    const text = (btn.textContent || '').toLowerCase().trim();
    const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
    const className = btn.className.toLowerCase();
    const id = btn.id.toLowerCase();
    const innerHTML = btn.innerHTML.toLowerCase();
    
    const isLikelySendButton = keywords.some(kw => 
      text.includes(kw) || 
      ariaLabel.includes(kw) || 
      className.includes(kw) || 
      id.includes(kw) ||
      innerHTML.includes(kw)
    );
    
    if (isLikelySendButton && btn.offsetWidth > 0) {
      candidates.push({
        index: i,
        button: btn,
        text,
        ariaLabel,
        className: btn.className,
        id: btn.id,
        disabled: btn.disabled
      });
    }
  });
  
  console.log(`找到 ${candidates.length} 个可能的发送按钮:`);
  candidates.forEach((c, i) => {
    console.log(`\n  ${i + 1}. 按钮信息:`);
    console.log(`     Text: "${c.text}"`);
    console.log(`     aria-label: "${c.ariaLabel}"`);
    console.log(`     ID: ${c.id}`);
    console.log(`     Class: ${c.className}`);
    console.log(`     Disabled: ${c.disabled}`);
    
    // 生成选择器建议
    let selector = '';
    if (c.id) {
      selector = `#${c.id}`;
    } else if (c.ariaLabel) {
      selector = `button[aria-label*="${c.ariaLabel.substring(0, 20)}"]`;
    } else if (c.className) {
      const firstClass = c.className.split(' ')[0];
      selector = `button.${firstClass}`;
    }
    console.log(`     建议选择器: ${selector}`);
  });
  
  // 推荐最佳选择器
  console.log('\n💡 推荐的Gemini发送按钮选择器:');
  console.log('   1. button[aria-label*="Send"] (最稳定)');
  console.log('   2. button.send-button');
  console.log('   3. 使用上面找到的具体选择器');
}

// 4. 模拟填充测试
async function testFill(text = '测试消息') {
  console.log('\n=== 模拟填充测试 ===');
  
  // 方法1: 使用.ql-editor
  const qlEditor = document.querySelector('.ql-editor');
  if (qlEditor) {
    console.log('找到.ql-editor，尝试填充...');
    qlEditor.textContent = text;
    qlEditor.dispatchEvent(new Event('input', { bubbles: true }));
    console.log('✅ 已填充到.ql-editor');
    
    // 等待发送按钮激活
    setTimeout(() => {
      const sendBtn = document.querySelector('button[aria-label*="Send"]');
      if (sendBtn) {
        console.log('找到发送按钮，disabled:', sendBtn.disabled);
        if (!sendBtn.disabled) {
          console.log('⚠️ 准备点击发送按钮（3秒后）...');
          setTimeout(() => {
            sendBtn.click();
            console.log('✅ 已点击发送按钮');
          }, 3000);
        }
      }
    }, 500);
  } else {
    console.error('❌ 未找到.ql-editor');
  }
}

// 运行测试
testCurrentConfig();

console.log('\n📝 可用命令:');
console.log('  findAllInputs()  - 查找所有输入框');
console.log('  findAllButtons() - 查找所有按钮');
console.log('  testFill("你好") - 模拟填充测试');

