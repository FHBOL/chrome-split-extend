// 🎯 直接在 DeepSeek 网页的 Console 中运行此脚本
// 会自动检测并生成正确的配置

console.log('=== DeepSeek 配置生成器 ===\n');

// 辅助函数
function isVisible(el) {
  if (!el) return false;
  const style = window.getComputedStyle(el);
  return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length) 
    && style.display !== 'none' && style.visibility !== 'hidden';
}

function generateSelector(el, isButton = false) {
  // 1. ID选择器（最稳定）
  if (el.id) return `#${el.id}`;
  
  // 2. data-testid（测试友好）
  const testId = el.getAttribute('data-testid');
  if (testId) return `[data-testid="${testId}"]`;
  
  // 3. 对于按钮，优先使用更精确的选择器
  if (isButton) {
    // 检查是否有禁用相关的class（需要排除）
    const allClasses = Array.from(el.classList);
    const baseClasses = allClasses.filter(c => !c.match(/^(is-|has-|active|focus|disabled|loading)/));
    const hasDisabledClass = allClasses.some(c => c.includes('disabled'));
    
    // 如果有role属性，优先使用 class + role 组合
    const role = el.getAttribute('role');
    if (role === 'button' && baseClasses.length > 0) {
      const baseClass = baseClasses[0];
      // 如果存在禁用class，生成排除禁用状态的选择器
      if (hasDisabledClass) {
        const disabledClass = allClasses.find(c => c.includes('disabled'));
        return `.${baseClass}[role="button"]:not(.${disabledClass})`;
      } else {
        // 没有禁用class，添加通用的禁用排除
        return `.${baseClass}[role="button"]:not([aria-disabled="true"])`;
      }
    }
  }
  
  // 4. Class选择器
  const classes = Array.from(el.classList).filter(c => !c.match(/^(is-|has-|active|focus|disabled)/));
  if (classes.length > 0) return '.' + classes[0];
  
  return el.tagName.toLowerCase();
}

// 1. 查找输入框
console.log('🔍 查找输入框...');
const inputSelectors = [
  'textarea',
  '[contenteditable="true"]',
  '[role="textbox"]'
];

let inputElement = null;
let inputSelector = null;

for (const sel of inputSelectors) {
  const el = document.querySelector(sel);
  if (el && isVisible(el)) {
    inputElement = el;
    inputSelector = generateSelector(el);
    break;
  }
}

if (inputElement) {
  console.log('✅ 找到输入框:');
  console.log('  标签:', inputElement.tagName);
  console.log('  Class:', inputElement.className);
  console.log('  选择器:', inputSelector);
} else {
  console.log('❌ 未找到输入框');
}

// 2. 查找发送按钮
console.log('\n🔍 查找发送按钮...');
console.log('请在输入框中输入一些文字，然后观察哪个按钮会激活\n');

// 查找所有按钮
const allButtons = document.querySelectorAll('button, [role="button"]');
console.log(`找到 ${allButtons.length} 个按钮元素\n`);

// 过滤出可能的发送按钮
const candidates = [];
allButtons.forEach((btn, i) => {
  if (!isVisible(btn)) return;
  
  const allClasses = Array.from(btn.classList);
  const text = btn.textContent?.trim() || '';
  const ariaLabel = btn.getAttribute('aria-label') || '';
  const role = btn.getAttribute('role');
  const isDisabled = btn.disabled || 
                     btn.getAttribute('aria-disabled') === 'true' ||
                     allClasses.some(c => c.includes('disabled'));
  
  // 检查是否有SVG图标
  const hasSVG = btn.querySelector('svg') !== null;
  
  // 发送按钮的特征
  const isSendButton = 
    text.match(/send|submit|发送|提交/i) ||
    ariaLabel.match(/send|submit|发送|提交/i) ||
    (hasSVG && role === 'button');
  
  if (isSendButton) {
    const selector = generateSelector(btn, true);
    candidates.push({
      index: i,
      element: btn,
      selector: selector,
      text: text || '[无文本]',
      ariaLabel: ariaLabel || '[无]',
      classes: allClasses.join(' '),
      isDisabled: isDisabled,
      hasSVG: hasSVG
    });
  }
});

console.log(`🎯 找到 ${candidates.length} 个候选发送按钮:\n`);

candidates.forEach((c, i) => {
  console.log(`[${i + 1}] 按钮信息:`);
  console.log(`  选择器: ${c.selector}`);
  console.log(`  文本: "${c.text}"`);
  console.log(`  aria-label: "${c.ariaLabel}"`);
  console.log(`  Class: ${c.classes}`);
  console.log(`  禁用状态: ${c.isDisabled ? '是' : '否'}`);
  console.log(`  有图标: ${c.hasSVG ? '是' : '否'}`);
  console.log('');
});

// 3. 生成配置
if (inputSelector && candidates.length > 0) {
  const bestCandidate = candidates[0]; // 取第一个候选
  
  console.log('\n' + '='.repeat(70));
  console.log('📝 生成的配置（复制到 default-configs.js）');
  console.log('='.repeat(70));
  console.log('\n');
  console.log(`'chat_deepseek_com': {`);
  console.log(`  name: 'DeepSeek',`);
  console.log(`  inputSelector: '${inputSelector}',`);
  console.log(`  sendButtonSelector: '${bestCandidate.selector}',`);
  console.log(`  version: '${new Date().toISOString().split('T')[0]}',`);
  console.log(`  notes: '自动生成 - 排除禁用状态的按钮'`);
  console.log(`},`);
  console.log('\n' + '='.repeat(70));
  
  // 4. 验证选择器
  console.log('\n🧪 验证选择器:\n');
  
  // 测试输入框
  const testInput = document.querySelector(inputSelector);
  console.log('输入框测试:', testInput ? '✅ 找到' : '❌ 未找到');
  
  // 测试发送按钮（当前可能是禁用状态）
  const testButton = document.querySelector(bestCandidate.selector);
  console.log('发送按钮测试:', testButton ? '✅ 找到' : '❌ 未找到');
  
  if (testButton) {
    console.log('按钮状态:', testButton.getAttribute('aria-disabled') === 'true' ? '禁用' : '启用');
    console.log('\n💡 提示: 在输入框输入文字后，按钮应该会变为启用状态');
    console.log('   到时候再运行一次验证，确保选择器能找到启用的按钮');
  }
  
  // 5. 高亮显示元素
  if (testInput) {
    testInput.style.outline = '3px solid blue';
    console.log('\n🔵 输入框已用蓝色边框标记');
  }
  if (testButton) {
    testButton.style.outline = '3px solid red';
    console.log('🔴 发送按钮已用红色边框标记');
  }
  
} else {
  console.log('\n❌ 配置生成失败');
  if (!inputSelector) console.log('  - 未找到输入框');
  if (candidates.length === 0) console.log('  - 未找到发送按钮');
}

console.log('\n✅ 检测完成！');

