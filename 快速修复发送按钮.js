// 在分屏页面的控制台运行此脚本，快速修复发送按钮配置

console.log('=== 快速修复发送按钮配置 ===\n');

async function quickFix() {
  // 读取当前配置
  const result = await chrome.storage.local.get(['aiSelectorConfigs']);
  const configs = result.aiSelectorConfigs || {};
  
  console.log('当前配置:', configs);
  console.log('\n开始修复...\n');
  
  // 修复Gemini配置
  if (configs['gemini_google_com']) {
    const old = { ...configs['gemini_google_com'] };
    configs['gemini_google_com'] = {
      inputSelector: '.ql-editor',  // 稳定的Quill编辑器选择器
      sendButtonSelector: 'button[aria-label*="Send"]'  // 使用aria-label
    };
    console.log('✅ 已修复Gemini配置:');
    console.log('   旧配置:', old);
    console.log('   新配置:', configs['gemini_google_com']);
  }
  
  // 修复Qwen配置
  if (configs['chat_qwen_ai']) {
    const old = { ...configs['chat_qwen_ai'] };
    // 需要先在千问页面查找正确的选择器
    console.log('\n⚠️ 千问配置需要手动检查:');
    console.log('   当前配置:', old);
    console.log('   建议在千问iframe中运行诊断脚本');
  }
  
  // 修复ChatGPT配置（如果有问题）
  if (configs['chatgpt_com']) {
    const old = { ...configs['chatgpt_com'] };
    configs['chatgpt_com'] = {
      inputSelector: '#prompt-textarea',
      sendButtonSelector: 'button[data-testid="send-button"]'
    };
    console.log('\n✅ 已修复ChatGPT配置:');
    console.log('   旧配置:', old);
    console.log('   新配置:', configs['chatgpt_com']);
  }
  
  // 保存配置
  await chrome.storage.local.set({ aiSelectorConfigs: configs });
  console.log('\n✅ 配置已保存！');
  console.log('\n📋 下一步：');
  console.log('1. 刷新分屏页面');
  console.log('2. 在千问iframe中运行诊断脚本找到正确的发送按钮');
}

// 千问诊断脚本（在千问iframe中运行）
function diagnoseQwen() {
  console.log('=== 千问发送按钮诊断 ===\n');
  
  // 查找所有可能的发送按钮
  const buttons = document.querySelectorAll('button');
  console.log(`找到 ${buttons.length} 个按钮\n`);
  
  const candidates = [];
  
  buttons.forEach((btn, i) => {
    // 检查按钮特征
    const text = (btn.textContent || '').trim();
    const ariaLabel = btn.getAttribute('aria-label') || '';
    const title = btn.getAttribute('title') || '';
    const className = btn.className;
    const id = btn.id;
    const type = btn.type;
    
    // 判断是否可能是发送按钮
    const keywords = ['发送', 'send', '提交', 'submit', '入'];
    const isCandidate = 
      keywords.some(kw => 
        text.includes(kw) || 
        ariaLabel.includes(kw) || 
        title.includes(kw) ||
        className.includes(kw)
      ) || 
      type === 'submit';
    
    if (isCandidate && btn.offsetWidth > 0) {
      candidates.push({
        index: i,
        button: btn,
        text,
        ariaLabel,
        title,
        className,
        id,
        type,
        disabled: btn.disabled,
        // 生成选择器建议
        selector: id ? `#${id}` : 
                  ariaLabel ? `button[aria-label="${ariaLabel}"]` :
                  type === 'submit' ? 'button[type="submit"]' :
                  className ? `button.${className.split(' ')[0]}` : ''
      });
    }
  });
  
  console.log(`找到 ${candidates.length} 个可能的发送按钮:\n`);
  
  candidates.forEach((c, i) => {
    console.log(`${i + 1}. 按钮信息:`);
    console.log(`   文本: "${c.text}"`);
    console.log(`   aria-label: "${c.ariaLabel}"`);
    console.log(`   title: "${c.title}"`);
    console.log(`   type: ${c.type}`);
    console.log(`   ID: ${c.id}`);
    console.log(`   Class: ${c.className}`);
    console.log(`   禁用: ${c.disabled}`);
    console.log(`   🎯 建议选择器: ${c.selector}`);
    console.log('');
  });
  
  // 尝试找输入框旁边的按钮
  console.log('--- 尝试智能定位 ---\n');
  const inputs = document.querySelectorAll('textarea, [contenteditable="true"]');
  if (inputs.length > 0) {
    const input = inputs[inputs.length - 1]; // 通常是最后一个
    console.log('找到输入框:', input);
    
    // 查找输入框附近的按钮
    let parent = input.parentElement;
    let level = 0;
    while (parent && level < 5) {
      const nearbyButtons = parent.querySelectorAll('button[type="submit"], button');
      if (nearbyButtons.length > 0) {
        console.log(`在输入框父级${level}层找到 ${nearbyButtons.length} 个按钮`);
        nearbyButtons.forEach((btn, i) => {
          if (btn.offsetWidth > 0 && !btn.disabled) {
            console.log(`  ${i + 1}. ${btn.textContent.trim() || '无文本'} - 可能是发送按钮`);
          }
        });
        break;
      }
      parent = parent.parentElement;
      level++;
    }
  }
  
  console.log('\n💡 推荐操作:');
  console.log('1. 在上面的列表中找到正确的发送按钮');
  console.log('2. 复制建议的选择器');
  console.log('3. 运行: updateQwenConfig("复制的选择器")');
}

// 更新千问配置
async function updateQwenConfig(sendButtonSelector) {
  const result = await chrome.storage.local.get(['aiSelectorConfigs']);
  const configs = result.aiSelectorConfigs || {};
  
  // 查找所有可能的输入框选择器
  const inputs = document.querySelectorAll('textarea, [contenteditable="true"]');
  let inputSelector = '';
  
  for (const input of inputs) {
    if (input.offsetWidth > 0 && !input.disabled) {
      if (input.id) {
        inputSelector = `#${input.id}`;
      } else if (input.tagName === 'TEXTAREA') {
        if (input.placeholder) {
          inputSelector = `textarea[placeholder*="${input.placeholder.substring(0, 10)}"]`;
        } else {
          inputSelector = 'textarea';
        }
      } else {
        inputSelector = '[contenteditable="true"]';
      }
      break;
    }
  }
  
  configs['chat_qwen_ai'] = {
    inputSelector: inputSelector || 'textarea',
    sendButtonSelector: sendButtonSelector
  };
  
  await chrome.storage.local.set({ aiSelectorConfigs: configs });
  
  console.log('✅ 千问配置已更新:');
  console.log(configs['chat_qwen_ai']);
  console.log('\n请刷新分屏页面测试！');
}

// 使用说明
console.log(`
📖 使用说明：

方案1: 快速修复Gemini和ChatGPT
  await quickFix()

方案2: 诊断千问（在千问iframe中运行）
  diagnoseQwen()
  
方案3: 手动更新千问配置（在千问iframe中运行）
  await updateQwenConfig('button[type="submit"]')  // 替换为正确的选择器

---

现在运行: await quickFix()
`);

