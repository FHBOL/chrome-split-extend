// 智能配置生成器 - 自动检测网站的输入框和发送按钮选择器
// 使用方法：在目标AI网站的控制台中运行此脚本

(function() {
  console.log('🚀 AI聚合器 - 智能配置生成器启动...');
  
  const result = {
    hostname: window.location.hostname,
    siteId: window.location.hostname.replace(/[^a-zA-Z0-9]/g, '_'),
    siteName: document.title,
    url: window.location.origin,
    version: new Date().toISOString().split('T')[0],
    inputSelector: null,
    sendButtonSelector: null,
    confidence: {
      input: 0,
      sendButton: 0
    }
  };

  // ============ 输入框检测 ============
  console.log('\n📝 开始检测输入框...');
  
  const inputCandidates = [];
  
  // 策略1: 查找所有可见的textarea
  const textareas = Array.from(document.querySelectorAll('textarea'))
    .filter(el => isVisible(el) && !el.disabled && !el.readOnly);
  
  textareas.forEach(ta => {
    const selector = generateSelector(ta);
    const score = calculateInputScore(ta);
    inputCandidates.push({
      element: ta,
      selector: selector,
      score: score,
      type: 'textarea',
      info: {
        id: ta.id,
        placeholder: ta.placeholder,
        name: ta.name,
        classes: Array.from(ta.classList).join(' ')
      }
    });
  });
  
  // 策略2: 查找contentEditable元素
  const editables = Array.from(document.querySelectorAll('[contenteditable="true"]'))
    .filter(el => isVisible(el));
  
  editables.forEach(el => {
    const selector = generateSelector(el);
    const score = calculateInputScore(el);
    inputCandidates.push({
      element: el,
      selector: selector,
      score: score,
      type: 'contenteditable',
      info: {
        id: el.id,
        role: el.getAttribute('role'),
        classes: Array.from(el.classList).join(' ')
      }
    });
  });
  
  // 策略3: 查找带有特定role的元素
  const textboxes = Array.from(document.querySelectorAll('[role="textbox"]'))
    .filter(el => isVisible(el));
  
  textboxes.forEach(el => {
    if (!inputCandidates.find(c => c.element === el)) {
      const selector = generateSelector(el);
      const score = calculateInputScore(el);
      inputCandidates.push({
        element: el,
        selector: selector,
        score: score,
        type: 'role-textbox',
        info: {
          id: el.id,
          contentEditable: el.contentEditable,
          classes: Array.from(el.classList).join(' ')
        }
      });
    }
  });
  
  // 排序并选择最佳输入框
  inputCandidates.sort((a, b) => b.score - a.score);
  
  console.log(`找到 ${inputCandidates.length} 个输入框候选：`);
  inputCandidates.slice(0, 5).forEach((c, i) => {
    console.log(`  ${i + 1}. [得分: ${c.score}] ${c.selector}`);
    console.log(`     类型: ${c.type}, 信息:`, c.info);
  });
  
  if (inputCandidates.length > 0) {
    result.inputSelector = inputCandidates[0].selector;
    result.confidence.input = inputCandidates[0].score;
    console.log(`\n✅ 推荐输入框选择器: ${result.inputSelector}`);
  } else {
    console.warn('\n⚠️ 未找到输入框！');
  }

  // ============ 发送按钮检测 ============
  console.log('\n🔘 开始检测发送按钮...');
  
  const buttonCandidates = [];
  
  // 策略1: 查找所有可见的button
  const buttons = Array.from(document.querySelectorAll('button'))
    .filter(el => isVisible(el) && !el.disabled);
  
  buttons.forEach(btn => {
    const selector = generateSelector(btn);
    const score = calculateButtonScore(btn);
    if (score > 0) {
      buttonCandidates.push({
        element: btn,
        selector: selector,
        score: score,
        type: 'button',
        info: {
          id: btn.id,
          type: btn.type,
          text: btn.textContent?.trim().substring(0, 20),
          ariaLabel: btn.getAttribute('aria-label'),
          classes: Array.from(btn.classList).join(' ')
        }
      });
    }
  });
  
  // 策略2: 查找input[type="submit"]
  const submits = Array.from(document.querySelectorAll('input[type="submit"]'))
    .filter(el => isVisible(el) && !el.disabled);
  
  submits.forEach(btn => {
    const selector = generateSelector(btn);
    const score = calculateButtonScore(btn);
    buttonCandidates.push({
      element: btn,
      selector: selector,
      score: score,
      type: 'input-submit',
      info: {
        id: btn.id,
        value: btn.value,
        classes: Array.from(btn.classList).join(' ')
      }
    });
  });
  
  // 策略3: 查找带有role="button"的元素
  const roleButtons = Array.from(document.querySelectorAll('[role="button"]'))
    .filter(el => isVisible(el));
  
  roleButtons.forEach(btn => {
    if (!buttonCandidates.find(c => c.element === btn)) {
      const selector = generateSelector(btn);
      const score = calculateButtonScore(btn);
      if (score > 0) {
        buttonCandidates.push({
          element: btn,
          selector: selector,
          score: score,
          type: 'role-button',
          info: {
            id: btn.id,
            text: btn.textContent?.trim().substring(0, 20),
            ariaLabel: btn.getAttribute('aria-label'),
            classes: Array.from(btn.classList).join(' ')
          }
        });
      }
    }
  });
  
  // 排序并选择最佳发送按钮
  buttonCandidates.sort((a, b) => b.score - a.score);
  
  console.log(`找到 ${buttonCandidates.length} 个按钮候选：`);
  buttonCandidates.slice(0, 5).forEach((c, i) => {
    console.log(`  ${i + 1}. [得分: ${c.score}] ${c.selector}`);
    console.log(`     类型: ${c.type}, 信息:`, c.info);
  });
  
  if (buttonCandidates.length > 0) {
    result.sendButtonSelector = buttonCandidates[0].selector;
    result.confidence.sendButton = buttonCandidates[0].score;
    console.log(`\n✅ 推荐发送按钮选择器: ${result.sendButtonSelector}`);
  } else {
    console.warn('\n⚠️ 未找到发送按钮！');
  }

  // ============ 生成配置代码 ============
  console.log('\n' + '='.repeat(60));
  console.log('📋 生成的配置代码：');
  console.log('='.repeat(60));
  
  const configCode = `
// ${result.siteName}
'${result.siteId}': {
  name: '${result.siteName.split(' - ')[0].split(' | ')[0]}',
  inputSelector: '${result.inputSelector || 'textarea'}',
  sendButtonSelector: '${result.sendButtonSelector || 'button[type="submit"]'}',
  version: '${result.version}',
  notes: '自动生成的配置'
},`;
  
  console.log(configCode);
  console.log('='.repeat(60));
  
  // 信心度评估
  console.log('\n📊 配置信心度评估：');
  console.log(`  输入框: ${getConfidenceLevel(result.confidence.input)}`);
  console.log(`  发送按钮: ${getConfidenceLevel(result.confidence.sendButton)}`);
  
  if (result.confidence.input < 50 || result.confidence.sendButton < 50) {
    console.warn('\n⚠️ 注意：信心度较低，建议手动验证配置！');
  } else {
    console.log('\n✅ 配置信心度良好，可以直接使用！');
  }
  
  // 提供测试功能
  console.log('\n🧪 测试配置：');
  console.log('运行以下命令测试配置是否有效：');
  console.log(`testConfig('${result.inputSelector}', '${result.sendButtonSelector}')`);
  
  // 将测试函数暴露到全局
  window.testConfig = function(inputSel, buttonSel) {
    const input = document.querySelector(inputSel);
    const button = document.querySelector(buttonSel);
    
    console.log('测试结果：');
    console.log('  输入框:', input ? '✅ 找到' : '❌ 未找到', input);
    console.log('  发送按钮:', button ? '✅ 找到' : '❌ 未找到', button);
    
    if (input && button) {
      console.log('\n✅ 配置有效！可以使用。');
      return true;
    } else {
      console.error('\n❌ 配置无效！请手动调整选择器。');
      return false;
    }
  };
  
  // 返回结果
  return result;

  // ============ 辅助函数 ============
  
  // 检查元素是否可见
  function isVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    return !!(
      el.offsetWidth ||
      el.offsetHeight ||
      el.getClientRects().length
    ) && style.display !== 'none' && style.visibility !== 'hidden';
  }
  
  // 生成唯一的CSS选择器
  function generateSelector(el) {
    // 优先使用ID
    if (el.id) {
      return `#${el.id}`;
    }
    
    // 使用data-testid
    const testId = el.getAttribute('data-testid');
    if (testId) {
      return `[data-testid="${testId}"]`;
    }
    
    // 使用唯一的class组合
    const classes = Array.from(el.classList).filter(c => !c.match(/^(is-|has-|active|focus)/));
    if (classes.length > 0 && classes.length <= 3) {
      const classSelector = '.' + classes.join('.');
      if (document.querySelectorAll(classSelector).length === 1) {
        return classSelector;
      }
    }
    
    // 使用属性选择器
    const uniqueAttrs = ['name', 'placeholder', 'aria-label', 'role', 'type'];
    for (const attr of uniqueAttrs) {
      const value = el.getAttribute(attr);
      if (value) {
        const selector = `${el.tagName.toLowerCase()}[${attr}="${value}"]`;
        if (document.querySelectorAll(selector).length === 1) {
          return selector;
        }
        // 使用部分匹配
        if (value.length > 5) {
          const partialSelector = `${el.tagName.toLowerCase()}[${attr}*="${value.substring(0, 10)}"]`;
          if (document.querySelectorAll(partialSelector).length === 1) {
            return partialSelector;
          }
        }
      }
    }
    
    // 使用第一个有意义的class
    if (classes.length > 0) {
      return '.' + classes[0];
    }
    
    // 最后使用标签名（不推荐，但总比没有好）
    return el.tagName.toLowerCase();
  }
  
  // 计算输入框得分
  function calculateInputScore(el) {
    let score = 0;
    
    // 基础分
    if (el.tagName === 'TEXTAREA') score += 30;
    if (el.contentEditable === 'true') score += 20;
    if (el.getAttribute('role') === 'textbox') score += 15;
    
    // ID加分
    if (el.id) {
      score += 20;
      if (el.id.match(/input|message|prompt|chat|text/i)) score += 15;
    }
    
    // placeholder加分
    const placeholder = el.placeholder || el.getAttribute('placeholder');
    if (placeholder) {
      score += 10;
      if (placeholder.match(/输入|message|prompt|ask|chat|type|send/i)) score += 15;
    }
    
    // aria-label加分
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.match(/input|message|prompt|chat/i)) {
      score += 15;
    }
    
    // class加分
    const classStr = el.className;
    if (typeof classStr === 'string') {
      if (classStr.match(/input|textarea|message|prompt|chat|editor/i)) score += 10;
      if (classStr.match(/ql-editor|ProseMirror|CodeMirror/i)) score += 20; // 富文本编辑器
    }
    
    // 尺寸加分（较大的输入框更可能是主输入框）
    const rect = el.getBoundingClientRect();
    if (rect.height > 50) score += 10;
    if (rect.width > 300) score += 10;
    
    // 位置加分（页面下方的更可能是输入框）
    const viewportHeight = window.innerHeight;
    const elementTop = rect.top;
    if (elementTop > viewportHeight * 0.5) score += 15;
    
    return score;
  }
  
  // 计算按钮得分
  function calculateButtonScore(el) {
    let score = 0;
    
    // 基础分
    if (el.tagName === 'BUTTON') score += 20;
    if (el.type === 'submit') score += 25;
    
    // ID加分
    if (el.id) {
      score += 15;
      if (el.id.match(/send|submit|post|enter/i)) score += 20;
    }
    
    // aria-label加分（最重要）
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) {
      score += 15;
      if (ariaLabel.match(/send|submit|发送|提交/i)) score += 30;
    }
    
    // 文本内容加分
    const text = el.textContent?.trim().toLowerCase() || '';
    if (text.match(/send|submit|发送|提交|enter|go/i)) score += 25;
    
    // class加分
    const classStr = el.className;
    if (typeof classStr === 'string') {
      if (classStr.match(/send|submit|post|enter/i)) score += 15;
    }
    
    // data-testid加分
    const testId = el.getAttribute('data-testid');
    if (testId && testId.match(/send|submit/i)) score += 25;
    
    // 图标检测（SVG）
    const svg = el.querySelector('svg');
    if (svg) {
      const svgClass = svg.getAttribute('class') || '';
      const dataIcon = svg.getAttribute('data-icon') || '';
      if (svgClass.match(/send|paper-plane|arrow|submit/i) || 
          dataIcon.match(/send|paper-plane|arrow|submit/i)) {
        score += 20;
      }
    }
    
    // 位置加分（靠近输入框的按钮）
    // 这需要结合输入框位置判断，这里简化处理
    const rect = el.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    if (rect.top > viewportHeight * 0.5) score += 10;
    
    // 尺寸惩罚（太大或太小的按钮不太可能是发送按钮）
    if (rect.width < 20 || rect.width > 200) score -= 10;
    if (rect.height < 20 || rect.height > 80) score -= 10;
    
    return Math.max(0, score);
  }
  
  // 获取信心度等级描述
  function getConfidenceLevel(score) {
    if (score >= 80) return `${score} - 🟢 高（推荐使用）`;
    if (score >= 50) return `${score} - 🟡 中（建议验证）`;
    return `${score} - 🔴 低（需要手动调整）`;
  }
  
})();

