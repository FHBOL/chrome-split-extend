// 在DeepSeek的Console运行此脚本，诊断配置和DOM结构

console.log('=== DeepSeek 配置诊断 ===\n');

// 1. 检查存储的配置
chrome.storage.local.get(['aiSelectorConfigs'], (result) => {
  console.log('📋 1. 存储的配置:');
  const configs = result.aiSelectorConfigs || {};
  const deepseekConfig = configs['chat_deepseek_com'] || configs['deepseek'] || configs['DeepSeek'];
  
  if (deepseekConfig) {
    console.log('✅ 找到DeepSeek配置:');
    console.log('  输入框选择器:', deepseekConfig.inputSelector);
    console.log('  发送按钮选择器:', deepseekConfig.sendButtonSelector);
  } else {
    console.log('❌ 未找到DeepSeek配置！');
    console.log('配置键列表:', Object.keys(configs));
  }
  
  // 2. 测试选择器是否有效
  console.log('\n🔍 2. 测试选择器:');
  if (deepseekConfig) {
    const input = document.querySelector(deepseekConfig.inputSelector);
    const button = document.querySelector(deepseekConfig.sendButtonSelector);
    
    console.log('输入框:', input ? '✅ 找到' : '❌ 未找到', input);
    console.log('发送按钮:', button ? '✅ 找到' : '❌ 未找到', button);
    
    if (button) {
      console.log('  按钮标签:', button.tagName);
      console.log('  按钮class:', button.className);
      console.log('  按钮样式:', window.getComputedStyle(button).cursor);
      console.log('  按钮onclick:', !!button.onclick);
    }
  }
  
  // 3. 扫描页面查找实际的输入框和按钮
  console.log('\n🔎 3. 扫描页面元素:');
  
  // 查找输入框
  const textareas = document.querySelectorAll('textarea');
  const contentEditables = document.querySelectorAll('[contenteditable="true"]');
  console.log('找到 textarea:', textareas.length, '个');
  console.log('找到 contenteditable:', contentEditables.length, '个');
  
  if (textareas.length > 0) {
    console.log('第一个textarea:', textareas[0]);
    console.log('  ID:', textareas[0].id);
    console.log('  Class:', textareas[0].className);
    console.log('  Placeholder:', textareas[0].placeholder);
  }
  
  // 查找按钮
  const buttons = document.querySelectorAll('button');
  const clickableDivs = Array.from(document.querySelectorAll('div')).filter(div => 
    window.getComputedStyle(div).cursor === 'pointer'
  );
  
  console.log('找到 button元素:', buttons.length, '个');
  console.log('找到可点击的div:', clickableDivs.length, '个');
  
  // 查找可能的发送按钮
  console.log('\n🎯 4. 可能的发送按钮:');
  const possibleSendButtons = Array.from(buttons).filter(btn => {
    const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
    const title = btn.getAttribute('title')?.toLowerCase() || '';
    const text = btn.textContent?.toLowerCase() || '';
    return ariaLabel.includes('send') || ariaLabel.includes('发送') ||
           title.includes('send') || title.includes('发送') ||
           text.includes('send') || text.includes('发送');
  });
  
  console.log('找到', possibleSendButtons.length, '个可能的发送按钮');
  possibleSendButtons.forEach((btn, i) => {
    console.log(`  按钮${i + 1}:`, btn);
    console.log('    aria-label:', btn.getAttribute('aria-label'));
    console.log('    class:', btn.className);
  });
  
  // 如果没找到button，查找可点击div
  if (possibleSendButtons.length === 0) {
    console.log('\n🔍 查找可点击的DIV:');
    clickableDivs.slice(0, 5).forEach((div, i) => {
      console.log(`  DIV${i + 1}:`, div);
      console.log('    class:', div.className);
      console.log('    onclick:', !!div.onclick);
    });
  }
  
  // 5. 监听postMessage
  console.log('\n📡 5. 监听postMessage (等待父页面发送消息)...');
  window.addEventListener('message', (event) => {
    if (event.data.source === 'ai-aggregator') {
      console.log('收到消息:', event.data);
    }
  });
});

// 6. 手动测试选择器
console.log('\n💡 手动测试命令:');
console.log('// 测试输入框选择器');
console.log('document.querySelector("你的输入框选择器")');
console.log('');
console.log('// 测试发送按钮选择器');  
console.log('document.querySelector("你的发送按钮选择器")');
console.log('');
console.log('// 手动触发点击');
console.log('const btn = document.querySelector("你的按钮选择器");');
console.log('btn.click();');

