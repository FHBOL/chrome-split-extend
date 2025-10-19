// 配置检测器 - 可被chrome.scripting.executeScript注入的独立脚本
(function() {
  const result = {
    hostname: window.location.hostname,
    siteId: window.location.hostname.replace(/[^a-zA-Z0-9]/g, '_'),
    siteName: document.title,
    url: window.location.origin,
    version: new Date().toISOString().split('T')[0],
    inputSelector: null,
    sendButtonSelector: null,
    confidence: { input: 0, sendButton: 0 }
  };

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
          const selector = `.${baseClass}[role="button"]:not(.${disabledClass})`;
          return selector;
        } else {
          // 没有禁用class，添加通用的禁用排除
          const selector = `.${baseClass}[role="button"]:not([aria-disabled="true"])`;
          return selector;
        }
      }
      
      // aria-label（语义化且稳定）
      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel && ariaLabel.match(/send|submit|发送|提交/i)) {
        return `button[aria-label*="${ariaLabel.split(' ')[0]}"]`;
      }
      
      // type="submit"（表单按钮）
      if (el.type === 'submit') {
        return 'button[type="submit"]:not([disabled])';
      }
    }
    
    // 4. Class选择器（过滤动态class）
    const classes = Array.from(el.classList).filter(c => !c.match(/^(is-|has-|active|focus|disabled)/));
    if (classes.length > 0 && classes.length <= 3) {
      const classSelector = '.' + classes.join('.');
      if (document.querySelectorAll(classSelector).length === 1) {
        return classSelector;
      }
    }
    
    // 5. 属性选择器
    const uniqueAttrs = ['name', 'placeholder', 'aria-label', 'role', 'type'];
    for (const attr of uniqueAttrs) {
      const value = el.getAttribute(attr);
      if (value) {
        const selector = `${el.tagName.toLowerCase()}[${attr}="${value}"]`;
        if (document.querySelectorAll(selector).length === 1) return selector;
      }
    }
    
    // 6. 兜底：使用第一个class
    if (classes.length > 0) return '.' + classes[0];
    return el.tagName.toLowerCase();
  }

  function calculateInputScore(el) {
    let score = 0;
    if (el.tagName === 'TEXTAREA') score += 30;
    if (el.contentEditable === 'true') score += 20;
    if (el.getAttribute('role') === 'textbox') score += 15;
    
    if (el.id && el.id.match(/input|message|prompt|chat|text/i)) score += 35;
    
    const placeholder = el.placeholder || el.getAttribute('placeholder');
    if (placeholder && placeholder.match(/输入|message|prompt|ask|chat/i)) score += 25;
    
    const rect = el.getBoundingClientRect();
    if (rect.height > 50) score += 10;
    if (rect.width > 300) score += 10;
    if (rect.top > window.innerHeight * 0.5) score += 15;
    
    return score;
  }

  function calculateButtonScore(el) {
    let score = 0;
    if (el.tagName === 'BUTTON') score += 20;
    if (el.type === 'submit') score += 25;
    
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.match(/send|submit|发送|提交/i)) score += 45;
    
    const text = el.textContent?.trim().toLowerCase() || '';
    if (text.match(/send|submit|发送|提交/i)) score += 25;
    
    return Math.max(0, score);
  }

  // 检测输入框
  const inputCandidates = [];
  document.querySelectorAll('textarea, [contenteditable="true"], [role="textbox"]').forEach(el => {
    if (isVisible(el)) {
      inputCandidates.push({
        selector: generateSelector(el),
        score: calculateInputScore(el)
      });
    }
  });
  
  inputCandidates.sort((a, b) => b.score - a.score);
  if (inputCandidates.length > 0) {
    result.inputSelector = inputCandidates[0].selector;
    result.confidence.input = inputCandidates[0].score;
  }

  // 检测发送按钮
  const buttonCandidates = [];
  document.querySelectorAll('button, input[type="submit"], [role="button"]').forEach(el => {
    if (isVisible(el)) {
      const score = calculateButtonScore(el);
      if (score > 0) {
        buttonCandidates.push({
          selector: generateSelector(el, true), // 传入 isButton=true
          score: score
        });
      }
    }
  });
  
  buttonCandidates.sort((a, b) => b.score - a.score);
  if (buttonCandidates.length > 0) {
    result.sendButtonSelector = buttonCandidates[0].selector;
    result.confidence.sendButton = buttonCandidates[0].score;
  }

  return result;
})();

