// 元素选择器工具 - 注入到AI网站页面
(function() {
  let isPickingInput = false;
  let isPickingSend = false;
  let highlightedElement = null;
  let siteId = '';
  let siteName = '';
  let preferEnter = true;

  // 创建控制面板
  function createControlPanel() {
    const panel = document.createElement('div');
    panel.id = 'ai-selector-panel';
    panel.innerHTML = `
      <div class="panel-header">
        <h3>🎯 配置 ${siteName}</h3>
        <button id="minimize-panel" title="最小化">−</button>
        <button id="close-panel">✕</button>
      </div>
      <div class="panel-content">
        <div class="panel-step">
          <div class="step-label">步骤 1：选择输入框</div>
          <button id="pick-input" class="panel-btn">📝 开始选择输入框</button>
          <div class="helper-text">
            <small>💡 常见类型：<code>textarea</code>（Qwen、豆包）、<code>contenteditable div</code>（ChatGPT、Gemini）、<code>.ql-editor</code>（Quill编辑器）</small>
          </div>
          <div class="selected-info" id="input-info">未选择</div>
        </div>
        <div class="panel-step">
          <div class="step-label">步骤 2：选择发送按钮</div>
          <button id="pick-send" class="panel-btn">🚀 开始选择发送按钮</button>
          <div class="helper-text">
            <small>⚠️ 注意：点击按钮本身，不要点内部图标。常见类型：<code>&lt;button&gt;</code>（标准按钮）、<code>&lt;div&gt;</code>（DeepSeek等）。特征：<code>cursor:pointer</code>、<code>role="button"</code></small>
          </div>
          <div class="selected-info" id="send-info">未选择</div>
        </div>
        <div class="panel-step">
          <div class="step-label">发送方式</div>
          <label class="prefer-enter-row">
            <input id="prefer-enter-toggle" type="checkbox" checked /> 使用回车键作为发送方式（推荐）
          </label>
          <div class="helper-text">
            <small>不开启时将使用上面选择的发送按钮；若按钮不可用会自动降级回车</small>
          </div>
        </div>
        <div class="panel-step">
          <button id="save-config" class="panel-btn panel-btn-primary" disabled>
            💾 保存配置
          </button>
        </div>
        <div class="panel-hint">
          💡 可拖动标题栏移动，点击"−"最小化。鼠标悬停时会显示元素类型提示。
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    // 绑定事件
    document.getElementById('close-panel').addEventListener('click', cleanup);
    document.getElementById('minimize-panel').addEventListener('click', toggleMinimize);
    document.getElementById('pick-input').addEventListener('click', startPickingInput);
    document.getElementById('pick-send').addEventListener('click', startPickingSend);
    document.getElementById('save-config').addEventListener('click', saveConfig);
    const preferToggle = document.getElementById('prefer-enter-toggle');
    if (preferToggle) {
      preferToggle.checked = !!preferEnter;
      preferToggle.addEventListener('change', (e) => {
        preferEnter = !!e.target.checked;
        try {
          chrome.runtime.sendMessage({
            action: 'preferEnterChanged',
            siteId,
            value: preferEnter
          });
        } catch (err) {}
      });
    }
    
    // 启用拖拽
    makeDraggable(panel);
  }

  // 最小化/展开面板
  function toggleMinimize() {
    const panel = document.getElementById('ai-selector-panel');
    panel.classList.toggle('minimized');
  }

  // 让面板可拖拽
  function makeDraggable(panel) {
    const header = panel.querySelector('.panel-header');
    let isDragging = false;
    let currentX, currentY, initialX, initialY;

    header.addEventListener('mousedown', (e) => {
      // 点击最小化或关闭按钮时不拖拽
      if (e.target.id === 'minimize-panel' || e.target.id === 'close-panel') return;
      
      isDragging = true;
      initialX = e.clientX - panel.offsetLeft;
      initialY = e.clientY - panel.offsetTop;
      
      // 如果是最小化状态，双击展开
      if (panel.classList.contains('minimized')) {
        const now = Date.now();
        const lastClick = panel._lastClickTime || 0;
        if (now - lastClick < 300) {
          panel.classList.remove('minimized');
          isDragging = false;
          return;
        }
        panel._lastClickTime = now;
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;
      
      // 限制在视口内
      currentX = Math.max(0, Math.min(currentX, window.innerWidth - panel.offsetWidth));
      currentY = Math.max(0, Math.min(currentY, window.innerHeight - panel.offsetHeight));
      
      panel.style.left = currentX + 'px';
      panel.style.top = currentY + 'px';
      panel.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  // 开始选择输入框
  function startPickingInput() {
    isPickingInput = true;
    isPickingSend = false;
    document.body.style.cursor = 'crosshair';
    showHint('📝 请移动鼠标选择输入框，鼠标旁会显示元素类型提示', 'info', 3000);
  }

  // 开始选择发送按钮
  function startPickingSend() {
    isPickingInput = false;
    isPickingSend = true;
    document.body.style.cursor = 'crosshair';
    showHint('🚀 请移动鼠标选择发送按钮，注意不要选内部图标', 'info', 3000);
  }

  // 鼠标移动事件
  function handleMouseMove(e) {
    if (!isPickingInput && !isPickingSend) return;

    // 更新浮动提示位置（跟随鼠标）
    updateFloatingHintPosition(e);

    // 移除之前的高亮
    if (highlightedElement) {
      highlightedElement.style.outline = '';
    }

    // 高亮当前元素
    const element = e.target;
    if (element.id !== 'ai-selector-panel' && !element.closest('#ai-selector-panel') && 
        element.id !== 'selector-hint' && !element.closest('#selector-hint') &&
        element.id !== 'floating-element-hint') {
      element.style.outline = '3px solid #667eea';
      highlightedElement = element;
      
      // 显示当前元素的实时提示
      showElementHint(element);
    }
  }

  // 显示当前悬停元素的信息提示（跟随鼠标的小提示框）
  function showElementHint(element) {
    const tagName = element.tagName.toLowerCase();
    const type = element.getAttribute('type');
    const isContentEditable = element.contentEditable === 'true';
    const role = element.getAttribute('role');
    const ariaLabel = element.getAttribute('aria-label');
    
    let elementType = '';
    let emoji = '';
    
    if (isPickingInput) {
      // 判断输入框适配性
      if (tagName === 'textarea') {
        emoji = '✅';
        elementType = 'TEXTAREA';
      } else if (tagName === 'input' && type === 'text') {
        emoji = '✅';
        elementType = 'INPUT[text]';
      } else if (isContentEditable) {
        emoji = '✅';
        elementType = 'ContentEditable';
      } else if (element.classList.contains('ql-editor')) {
        emoji = '✅';
        elementType = 'Quill编辑器';
      } else if (tagName === 'div' && element.querySelector('[contenteditable="true"]')) {
        emoji = '⚠️';
        elementType = '容器DIV';
      } else {
        emoji = '❌';
        elementType = tagName.toUpperCase();
      }
    } else if (isPickingSend) {
      // 通用的可点击元素判断 - 不依赖具体标签
      const hasClickHandler = element.onclick || element.getAttribute('onclick');
      const hasCursor = window.getComputedStyle(element).cursor === 'pointer';
      const hasRole = role === 'button';
      const hasClickableAttr = element.hasAttribute('data-clickable') || 
                               element.hasAttribute('data-action');
      
      // 判断是否具有"可点击"特征
      const isClickable = hasClickHandler || hasCursor || hasRole || hasClickableAttr;
      
      if (tagName === 'button') {
        // 标准button元素
        if (type === 'submit' || ariaLabel?.includes('发送') || ariaLabel?.includes('Send')) {
          emoji = '✅';
          elementType = 'BUTTON';
        } else {
          emoji = '⚠️';
          elementType = 'BUTTON';
        }
      } else if (isClickable) {
        // 任何具有可点击特征的元素都被认为是合适的
        emoji = '✅';
        elementType = `${tagName.toUpperCase()}(可点击)`;
      } else if (tagName === 'span' || tagName === 'svg' || tagName === 'i') {
        // 图标元素
        emoji = '⚠️';
        elementType = `${tagName.toUpperCase()}(图标?)`;
      } else {
        // 其他未知元素
        emoji = '❓';
        elementType = tagName.toUpperCase();
      }
    }
    
    // 创建或更新跟随鼠标的小提示
    let floatingHint = document.getElementById('floating-element-hint');
    if (!floatingHint) {
      floatingHint = document.createElement('div');
      floatingHint.id = 'floating-element-hint';
      floatingHint.style.cssText = `
        position: fixed;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 500;
        z-index: 10000000;
        pointer-events: none;
        white-space: nowrap;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      `;
      document.body.appendChild(floatingHint);
    }
    
    floatingHint.textContent = `${emoji} ${elementType}`;
    floatingHint.style.display = 'block';
  }
  
  // 更新浮动提示位置（跟随鼠标）
  function updateFloatingHintPosition(e) {
    const floatingHint = document.getElementById('floating-element-hint');
    if (floatingHint && floatingHint.style.display === 'block') {
      floatingHint.style.left = (e.clientX + 15) + 'px';
      floatingHint.style.top = (e.clientY + 15) + 'px';
    }
  }

  // 鼠标点击事件
  function handleClick(e) {
    if (!isPickingInput && !isPickingSend) return;

    // 立即阻止所有默认行为和事件传播
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation(); // 阻止同一元素上的其他监听器

    const element = e.target;
    if (element.closest('#ai-selector-panel')) return;

    // 生成选择器
    const selector = generateSelector(element);

    if (isPickingInput) {
      document.getElementById('input-info').innerHTML = `
        <strong>已选择:</strong><br>
        <code>${selector}</code><br>
        <small>类型: ${element.tagName}</small>
      `;
      
      // 发送消息到配置页面
      chrome.runtime.sendMessage({
        action: 'selectorSelected',
        type: 'input',
        selector: selector
      });

      isPickingInput = false;
      showHint('✅ 输入框已选择！请手动输入几个字以显示发送按钮', 'success');
      
    } else if (isPickingSend) {
      // 额外阻止：如果是按钮，阻止其点击
      if (element.tagName === 'BUTTON' || element.getAttribute('role') === 'button') {
        console.log('阻止发送按钮的实际点击事件');
      }
      
      document.getElementById('send-info').innerHTML = `
        <strong>已选择:</strong><br>
        <code>${selector}</code><br>
        <small>类型: ${element.tagName}</small>
      `;

      // 发送消息到配置页面
      chrome.runtime.sendMessage({
        action: 'selectorSelected',
        type: 'send',
        selector: selector
      });

      isPickingSend = false;
      showHint('✅ 发送按钮已选择！返回配置页面保存', 'success');
    }

    // 重置样式
    element.style.outline = '';
    document.body.style.cursor = '';
    highlightedElement = null;

    // 检查是否都选择了
    checkComplete();
  }

  // 生成CSS选择器
  function generateSelector(element) {
    console.log('生成选择器，元素:', element);
    
    // 生成多个候选选择器，选择最优的
    const candidates = generateSelectorCandidates(element);
    const bestSelector = selectBestSelector(candidates);
    
    console.log('最佳选择器:', bestSelector);
    return bestSelector;
  }
  
  // 生成多个候选选择器
  function generateSelectorCandidates(element) {
    const candidates = [];
    
    // 1. 优先使用ID（最稳定）
    if (element.id) {
      console.log('候选: ID选择器:', element.id);
      candidates.push({
        selector: `#${element.id}`,
        priority: 100,
        type: 'ID'
      });
    }

    // 2. 使用语义化属性（按稳定性排序）
    const specialAttrs = [
      { name: 'data-testid', priority: 90 },
      { name: 'aria-label', priority: 85 },
      { name: 'type', priority: 80 },
      { name: 'name', priority: 70 },
      { name: 'placeholder', priority: 60 },
      { name: 'role', priority: 50 }
    ];
    
    for (const attr of specialAttrs) {
      const value = element.getAttribute(attr.name);
      if (value) {
        let selector;
        // 对于aria-label，使用部分匹配（更灵活）
        if (attr.name === 'aria-label' && value.length > 10) {
          const shortValue = value.substring(0, 20);
          selector = `${element.tagName.toLowerCase()}[${attr.name}*="${shortValue}"]`;
        } else {
          selector = `${element.tagName.toLowerCase()}[${attr.name}="${value}"]`;
        }
        
        candidates.push({
          selector: selector,
          priority: attr.priority,
          type: attr.name
        });
      }
    }

    // 3. 对于按钮，使用type属性
    if (element.tagName === 'BUTTON' && element.type === 'submit') {
      candidates.push({
        selector: 'button[type="submit"]',
        priority: 75,
        type: 'submit-button'
      });
    }

    // 4. 过滤class，排除通用的框架类名
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(' ').filter(c => {
        if (!c) return false;
        // 排除通用的Material Design类名
        if (c.startsWith('mat-') || c.startsWith('mdc-')) return false;
        // 排除Angular动态生成的类名
        if (c.match(/^ng-/)) return false;
        // 排除样式工具类
        if (c.match(/^(is-|has-|flex|grid|col-|row-|m-|p-|text-|bg-)/)) return false;
        // 排除包含随机字符的类名
        if (c.match(/[0-9]{5,}/)) return false;
        return true;
      });
      
      if (classes.length > 0) {
        // 优先使用有语义的类名
        const meaningfulClass = classes.find(c => 
          c.includes('send') || c.includes('submit') || c.includes('button') ||
          c.includes('input') || c.includes('chat') || c.includes('message')
        );
        
        if (meaningfulClass) {
          candidates.push({
            selector: `${element.tagName.toLowerCase()}.${meaningfulClass}`,
            priority: 60,
            type: 'meaningful-class'
          });
        }
        
        // 使用第一个非通用类名
        if (classes.length <= 3 && classes[0]) {
          candidates.push({
            selector: `${element.tagName.toLowerCase()}.${classes[0]}`,
            priority: 40,
            type: 'class'
          });
        }
      }
    }

    // 5. 尝试使用父元素+nth-child
    const parent = element.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(child => 
        child.tagName === element.tagName
      );
      
      if (siblings.length <= 5) {
        const index = siblings.indexOf(element) + 1;
        let parentSelector = parent.tagName.toLowerCase();
        
        if (parent.id) {
          parentSelector = `#${parent.id}`;
        } else if (parent.className) {
          const parentClasses = parent.className.split(' ').filter(c => 
            c && !c.match(/^(mat-|mdc-|ng-|is-|has-)/)
          );
          if (parentClasses.length > 0) {
            parentSelector += `.${parentClasses[0]}`;
          }
        }
        
        candidates.push({
          selector: `${parentSelector} > ${element.tagName.toLowerCase()}:nth-child(${index})`,
          priority: 30,
          type: 'nth-child'
        });
      }
    }

    // 6. 最后的兜底：使用标签名
    candidates.push({
      selector: element.tagName.toLowerCase(),
      priority: 1,
      type: 'fallback'
    });
    
    return candidates;
  }
  
  // 选择最佳选择器
  function selectBestSelector(candidates) {
    if (candidates.length === 0) {
      console.warn('没有找到任何候选选择器');
      return 'unknown';
    }
    
    // 验证每个候选选择器的唯一性
    const validatedCandidates = candidates.map(candidate => {
      try {
        const matches = document.querySelectorAll(candidate.selector);
        candidate.matchCount = matches.length;
        candidate.isUnique = matches.length === 1;
        
        console.log(`验证选择器: ${candidate.selector}`);
        console.log(`  类型: ${candidate.type}, 优先级: ${candidate.priority}`);
        console.log(`  匹配数量: ${matches.length} ${matches.length === 1 ? '✅' : '⚠️'}`);
        
        return candidate;
      } catch (e) {
        console.error(`选择器无效: ${candidate.selector}`, e);
        candidate.matchCount = Infinity;
        candidate.isUnique = false;
        return candidate;
      }
    });
    
    // 排序：优先选择唯一且优先级高的
    validatedCandidates.sort((a, b) => {
      // 唯一性最重要
      if (a.isUnique && !b.isUnique) return -1;
      if (!a.isUnique && b.isUnique) return 1;
      
      // 如果都唯一或都不唯一，比较优先级
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      
      // 如果优先级相同，选择匹配数量少的
      return a.matchCount - b.matchCount;
    });
    
    const best = validatedCandidates[0];
    
    // 警告：选择器不唯一
    if (!best.isUnique) {
      console.warn(`⚠️ 最佳选择器仍然匹配到 ${best.matchCount} 个元素！`);
      console.warn(`   选择器: ${best.selector}`);
      console.warn(`   可能导致误触发其他元素`);
      
      // 显示提示给用户
      showHint(`⚠️ 此选择器匹配到 ${best.matchCount} 个元素，可能不够精确。建议重新选择或手动调整。`, 'warning', 5000);
    } else {
      console.log(`✅ 找到唯一选择器: ${best.selector} (${best.type})`);
    }
    
    return best.selector;
  }

  // 检查是否完成
  function checkComplete() {
    const inputInfo = document.getElementById('input-info').textContent;
    const sendInfo = document.getElementById('send-info').textContent;

    if (inputInfo !== '未选择' && sendInfo !== '未选择') {
      document.getElementById('save-config').disabled = false;
      showHint('🎉 配置完成！请点击"保存配置"按钮', 'success');
    }
  }

  // 保存配置
  function saveConfig() {
    showHint('✅ 配置已保存！您可以关闭此页面返回配置向导', 'success');
    setTimeout(() => {
      // 可以选择关闭面板或整个标签页
      cleanup();
    }, 2000);
  }

  // 显示提示
  function showHint(message, type = 'info', duration = 2000) {
    let hint = document.getElementById('selector-hint');
    if (!hint) {
      hint = document.createElement('div');
      hint.id = 'selector-hint';
      document.body.appendChild(hint);
    }

    hint.innerHTML = message; // 支持HTML
    hint.className = type;
    hint.style.display = 'block';

    // 清除之前的定时器
    if (hint._timer) clearTimeout(hint._timer);

    // 所有提示都自动消失，不挡住元素选择
    hint._timer = setTimeout(() => {
      hint.style.display = 'none';
    }, duration);
  }

  // 清理
  function cleanup() {
    document.body.style.cursor = '';
    if (highlightedElement) {
      highlightedElement.style.outline = '';
    }

    const panel = document.getElementById('ai-selector-panel');
    if (panel) panel.remove();

    const hint = document.getElementById('selector-hint');
    if (hint) hint.remove();

    const floatingHint = document.getElementById('floating-element-hint');
    if (floatingHint) floatingHint.remove();

    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('click', handleClick, true);
  }

  // 监听来自配置页面的消息
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'startPicking') {
      siteId = request.siteId;
      siteName = request.siteName;
      init();
    } else if (request.action === 'testFillAndSend') {
      testFillAndSend(request.text, request.config);
    }
  });

  // 注：自动填充已移除，引导用户手动输入更可靠

  // 测试填充和发送
  function testFillAndSend(text, config) {
    try {
      // 查找输入框
      const inputElement = document.querySelector(config.inputSelector);
      if (!inputElement) {
        alert('未找到输入框，选择器可能不正确');
        return;
      }

      // 填充文本
      if (inputElement.tagName === 'TEXTAREA' || inputElement.tagName === 'INPUT') {
        inputElement.value = text;
        inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      } else if (inputElement.isContentEditable || inputElement.getAttribute('contenteditable') === 'true') {
        inputElement.textContent = text;
        inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      }

      // 判断是否使用回车偏好
      const preferEnter = config && config.preferEnter !== false; // 默认true
      if (preferEnter || !config.sendButtonSelector) {
        // 触发Enter键发送
        triggerEnterKey(inputElement);
        alert('✅ 已尝试回车发送，请查看页面是否成功');
        return;
      }

      // 查找发送按钮
      const sendButton = document.querySelector(config.sendButtonSelector);
      if (!sendButton) {
        // 无按钮则降级回车
        triggerEnterKey(inputElement);
        alert('⚠️ 未找到按钮，已尝试回车发送');
        return;
      }

      // 点击发送
      setTimeout(() => {
        try { sendButton.focus && sendButton.focus(); } catch (e) {}
        sendButton.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        sendButton.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
        sendButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        sendButton.click();
        alert('✅ 测试成功！消息已发送');
      }, 300);

    } catch (error) {
      alert('❌ 测试失败: ' + error.message);
    }
  }

  // 触发Enter键
  function triggerEnterKey(element) {
    try { element.focus(); } catch (e) {}
    try { element.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true })); } catch (e) {}
    element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    const kd = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true });
    const kp = new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true });
    const ku = new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true });
    element.dispatchEvent(kd);
    element.dispatchEvent(kp);
    element.dispatchEvent(ku);
  }

  // 阻止mousedown和mouseup事件（防止误触发按钮）
  function handleMouseDown(e) {
    if (!isPickingInput && !isPickingSend) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }

  function handleMouseUp(e) {
    if (!isPickingInput && !isPickingSend) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }

  // 初始化
  function init() {
    // 先读取已存在的配置以初始化开关
    try {
      chrome.storage.local.get(['aiSelectorConfigs'], (result) => {
        try {
          const configs = result && result.aiSelectorConfigs ? result.aiSelectorConfigs : {};
          const cfg = configs[siteId];
          preferEnter = cfg && typeof cfg.preferEnter !== 'undefined' ? !!cfg.preferEnter : true;
        } catch (e) {
          preferEnter = true;
        }
        createControlPanel();
        // 同步一次状态到配置页，确保被持久化
        try {
          chrome.runtime.sendMessage({ action: 'preferEnterChanged', siteId, value: preferEnter });
        } catch (err) {}
      });
    } catch (e) {
      createControlPanel();
    }
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mousedown', handleMouseDown, true);
    document.addEventListener('mouseup', handleMouseUp, true);
    document.addEventListener('click', handleClick, true);
    showHint('👋 欢迎！请按照步骤选择输入框和发送按钮');
  }
})();

