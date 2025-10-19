// 🎯 DeepSeek 完整诊断 - 在 DeepSeek 网页的 Console 运行
console.log('=== DeepSeek 完整诊断 ===\n');

// 1. 测试当前配置
console.log('📋 测试当前配置:\n');
const currentConfig = {
  inputSelector: '._27c9245',
  sendButtonSelector: '.ds-icon-button[role="button"]:not([aria-disabled="true"])'
};

console.log('当前配置:');
console.log('  输入框:', currentConfig.inputSelector);
console.log('  发送按钮:', currentConfig.sendButtonSelector);

const testInput = document.querySelector(currentConfig.inputSelector);
const testButton = document.querySelector(currentConfig.sendButtonSelector);

console.log('\n测试结果:');
console.log('  输入框:', testInput ? '✅ 找到' : '❌ 未找到');
console.log('  发送按钮:', testButton ? '✅ 找到' : '❌ 未找到');

if (testInput) {
  console.log('\n输入框详情:');
  console.log('  标签:', testInput.tagName);
  console.log('  完整 class:', testInput.className);
  console.log('  ID:', testInput.id || '(无)');
  console.log('  placeholder:', testInput.placeholder || testInput.getAttribute('placeholder') || '(无)');
}

if (testButton) {
  console.log('\n按钮详情:');
  console.log('  标签:', testButton.tagName);
  console.log('  完整 class:', testButton.className);
  console.log('  aria-disabled:', testButton.getAttribute('aria-disabled'));
  console.log('  disabled:', testButton.disabled);
}

// 2. 重新搜索所有可能的输入框
console.log('\n' + '='.repeat(70));
console.log('🔍 重新搜索所有输入框:\n');

const allInputs = document.querySelectorAll('textarea, [contenteditable="true"], [role="textbox"], input[type="text"]');
console.log(`找到 ${allInputs.length} 个输入框元素\n`);

const inputCandidates = [];
allInputs.forEach((el, i) => {
  const style = window.getComputedStyle(el);
  const isVisible = !!(el.offsetWidth || el.offsetHeight) && 
                    style.display !== 'none' && 
                    style.visibility !== 'hidden';
  
  if (isVisible) {
    const rect = el.getBoundingClientRect();
    inputCandidates.push({
      index: i,
      element: el,
      tag: el.tagName,
      id: el.id || '(无)',
      classes: el.className,
      placeholder: el.placeholder || el.getAttribute('placeholder') || '(无)',
      size: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
      position: `top:${Math.round(rect.top)}`
    });
  }
});

console.log(`🎯 找到 ${inputCandidates.length} 个可见输入框:\n`);
inputCandidates.forEach((c, i) => {
  console.log(`[${i + 1}]`);
  console.log(`  标签: ${c.tag}`);
  console.log(`  ID: ${c.id}`);
  console.log(`  Class: ${c.classes}`);
  console.log(`  Placeholder: ${c.placeholder}`);
  console.log(`  大小: ${c.size}`);
  console.log(`  位置: ${c.position}`);
  console.log('');
});

// 3. 生成更稳定的选择器推荐
console.log('='.repeat(70));
console.log('💡 推荐的输入框选择器（按优先级）:\n');

if (inputCandidates.length > 0) {
  const input = inputCandidates[0].element;
  const selectors = [];
  
  // 方案1: ID
  if (input.id) {
    selectors.push({ selector: `#${input.id}`, desc: 'ID选择器（最稳定）' });
  }
  
  // 方案2: placeholder
  const placeholder = input.placeholder || input.getAttribute('placeholder');
  if (placeholder) {
    selectors.push({ 
      selector: `${input.tagName.toLowerCase()}[placeholder*="${placeholder.substring(0, 10)}"]`,
      desc: 'Placeholder 部分匹配（较稳定）'
    });
  }
  
  // 方案3: 标签 + role
  const role = input.getAttribute('role');
  if (role) {
    selectors.push({ 
      selector: `${input.tagName.toLowerCase()}[role="${role}"]`,
      desc: 'Role 属性（语义化）'
    });
  }
  
  // 方案4: 简单标签（最通用）
  selectors.push({ 
    selector: input.tagName.toLowerCase(),
    desc: '标签选择器（最通用但可能不唯一）'
  });
  
  // 方案5: 稳定的 class（过滤掉动态 class）
  const classes = Array.from(input.classList).filter(c => 
    c.length > 3 && 
    !c.match(/^_[0-9a-f]+$/) && // 过滤像 _27c9245 这样的动态 hash
    !c.match(/^(is-|has-|active|focus)/)
  );
  if (classes.length > 0) {
    selectors.push({ 
      selector: `.${classes[0]}`,
      desc: '稳定 Class（如果有的话）'
    });
  }
  
  selectors.forEach((s, i) => {
    console.log(`方案 ${i + 1}: ${s.selector}`);
    console.log(`  说明: ${s.desc}`);
    
    // 测试选择器
    try {
      const matches = document.querySelectorAll(s.selector);
      console.log(`  测试: 匹配 ${matches.length} 个元素 ${matches.length === 1 ? '✅ 唯一' : matches.length > 1 ? '⚠️ 不唯一' : '❌ 未找到'}`);
    } catch (e) {
      console.log(`  测试: ❌ 选择器无效`);
    }
    console.log('');
  });
}

// 4. 重新检查发送按钮
console.log('='.repeat(70));
console.log('🔍 重新搜索发送按钮:\n');

// 先让用户在输入框输入内容
console.log('⚠️ 请在输入框中输入一些文字，然后按回车重新运行此脚本\n');

const allButtons = document.querySelectorAll('button, [role="button"]');
console.log(`找到 ${allButtons.length} 个按钮\n`);

const buttonCandidates = [];
allButtons.forEach((btn, i) => {
  const style = window.getComputedStyle(btn);
  const isVisible = !!(btn.offsetWidth || btn.offsetHeight) && 
                    style.display !== 'none' && 
                    style.visibility !== 'hidden';
  
  if (!isVisible) return;
  
  const isDisabled = btn.disabled || 
                     btn.getAttribute('aria-disabled') === 'true' ||
                     btn.classList.contains('disabled') ||
                     Array.from(btn.classList).some(c => c.includes('disabled'));
  
  const hasSVG = btn.querySelector('svg') !== null;
  const role = btn.getAttribute('role');
  
  // 只关注有图标的按钮（发送按钮通常有箭头图标）
  if (hasSVG && role === 'button') {
    buttonCandidates.push({
      index: i,
      element: btn,
      classes: btn.className,
      isDisabled: isDisabled,
      ariaDisabled: btn.getAttribute('aria-disabled')
    });
  }
});

console.log(`🎯 找到 ${buttonCandidates.length} 个候选按钮（带图标且 role=button）:\n`);
buttonCandidates.forEach((c, i) => {
  console.log(`[${i + 1}]`);
  console.log(`  Class: ${c.classes}`);
  console.log(`  禁用状态: ${c.isDisabled ? '是' : '否'}`);
  console.log(`  aria-disabled: ${c.ariaDisabled || '(无)'}`);
  console.log('');
});

// 5. 生成最终推荐配置
console.log('='.repeat(70));
console.log('🎯 推荐的最终配置:\n');

if (inputCandidates.length > 0 && buttonCandidates.length > 0) {
  const input = inputCandidates[0].element;
  const button = buttonCandidates[0].element;
  
  // 输入框选择器 - 优先使用通用的
  let bestInputSelector = 'textarea';
  if (input.tagName === 'TEXTAREA') {
    bestInputSelector = 'textarea';
  } else if (input.getAttribute('contenteditable') === 'true') {
    bestInputSelector = '[contenteditable="true"]';
  } else if (input.getAttribute('role') === 'textbox') {
    bestInputSelector = '[role="textbox"]';
  }
  
  // 按钮选择器 - 使用稳定的 class + 排除禁用
  const btnClasses = Array.from(button.classList);
  const baseClass = btnClasses.find(c => !c.includes('disabled') && !c.match(/^_[0-9a-f]+$/));
  const disabledClass = btnClasses.find(c => c.includes('disabled'));
  
  let bestButtonSelector;
  if (baseClass && disabledClass) {
    bestButtonSelector = `.${baseClass}[role="button"]:not(.${disabledClass})`;
  } else if (baseClass) {
    bestButtonSelector = `.${baseClass}[role="button"]:not([aria-disabled="true"])`;
  } else {
    bestButtonSelector = 'button[role="button"]:not([aria-disabled="true"]):has(svg)';
  }
  
  console.log(`'chat_deepseek_com': {`);
  console.log(`  name: 'DeepSeek',`);
  console.log(`  inputSelector: '${bestInputSelector}',`);
  console.log(`  sendButtonSelector: '${bestButtonSelector}',`);
  console.log(`  version: '${new Date().toISOString().split('T')[0]}',`);
  console.log(`  notes: '优化配置 - 使用稳定选择器'`);
  console.log(`},`);
  
  // 高亮显示
  input.style.outline = '3px solid blue';
  button.style.outline = '3px solid red';
  
  console.log('\n🔵 输入框已用蓝色边框标记');
  console.log('🔴 发送按钮已用红色边框标记');
  
  // 最后验证
  console.log('\n='.repeat(70));
  console.log('🧪 最终验证:\n');
  
  const finalInput = document.querySelector(bestInputSelector);
  const finalButton = document.querySelector(bestButtonSelector);
  
  console.log('输入框:', finalInput ? '✅ 找到' : '❌ 未找到');
  console.log('发送按钮:', finalButton ? '✅ 找到' : '❌ 未找到');
  
  if (finalButton) {
    console.log('按钮状态:', finalButton.getAttribute('aria-disabled') === 'true' ? '⚠️ 禁用（正常，输入内容后会启用）' : '✅ 启用');
  }
}

console.log('\n✅ 诊断完成！');

