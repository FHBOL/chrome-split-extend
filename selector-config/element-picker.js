// 元素选择器工具 - 注入到AI网站页面
(function() {
  let isPickingInput = false;
  let isPickingSend = false;
  let highlightedElement = null;
  let siteId = '';
  let siteName = '';

  // 创建控制面板
  function createControlPanel() {
    const panel = document.createElement('div');
    panel.id = 'ai-selector-panel';
    panel.innerHTML = `
      <div class="panel-header">
        <h3>🎯 配置 ${siteName}</h3>
        <button id="close-panel">✕</button>
      </div>
      <div class="panel-content">
        <div class="panel-step">
          <div class="step-label">步骤 1：选择输入框</div>
          <button id="pick-input" class="panel-btn">📝 开始选择输入框</button>
          <div class="selected-info" id="input-info">未选择</div>
        </div>
        <div class="panel-step">
          <div class="step-label">步骤 2：选择发送按钮</div>
          <button id="pick-send" class="panel-btn">🚀 开始选择发送按钮</button>
          <div class="selected-info" id="send-info">未选择</div>
        </div>
        <div class="panel-step">
          <button id="save-config" class="panel-btn panel-btn-primary" disabled>
            💾 保存配置
          </button>
        </div>
        <div class="panel-hint">
          💡 提示：点击按钮后，鼠标会变成十字准星，移动到目标元素上点击即可选择
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    // 绑定事件
    document.getElementById('close-panel').addEventListener('click', cleanup);
    document.getElementById('pick-input').addEventListener('click', startPickingInput);
    document.getElementById('pick-send').addEventListener('click', startPickingSend);
    document.getElementById('save-config').addEventListener('click', saveConfig);
  }

  // 开始选择输入框
  function startPickingInput() {
    isPickingInput = true;
    isPickingSend = false;
    document.body.style.cursor = 'crosshair';
    showHint('请点击输入框');
  }

  // 开始选择发送按钮
  function startPickingSend() {
    isPickingInput = false;
    isPickingSend = true;
    document.body.style.cursor = 'crosshair';
    showHint('请点击发送按钮');
  }

  // 鼠标移动事件
  function handleMouseMove(e) {
    if (!isPickingInput && !isPickingSend) return;

    // 移除之前的高亮
    if (highlightedElement) {
      highlightedElement.style.outline = '';
    }

    // 高亮当前元素
    const element = e.target;
    if (element.id !== 'ai-selector-panel' && !element.closest('#ai-selector-panel')) {
      element.style.outline = '3px solid #667eea';
      highlightedElement = element;
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
    // 优先使用ID
    if (element.id) {
      return `#${element.id}`;
    }

    // 使用特殊属性
    const specialAttrs = ['data-testid', 'aria-label', 'name', 'placeholder', 'role'];
    for (const attr of specialAttrs) {
      const value = element.getAttribute(attr);
      if (value) {
        return `${element.tagName.toLowerCase()}[${attr}="${value}"]`;
      }
    }

    // 使用class
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(' ').filter(c => c && !c.match(/^(is-|has-)/));
      if (classes.length > 0 && classes.length <= 3) {
        return `${element.tagName.toLowerCase()}.${classes.slice(0, 2).join('.')}`;
      }
    }

    // 使用nth-child
    const parent = element.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children);
      const index = siblings.indexOf(element) + 1;
      const parentSelector = parent.tagName.toLowerCase();
      return `${parentSelector} > ${element.tagName.toLowerCase()}:nth-child(${index})`;
    }

    // 最后使用标签名
    return element.tagName.toLowerCase();
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
  function showHint(message, type = 'info', duration = 3000) {
    let hint = document.getElementById('selector-hint');
    if (!hint) {
      hint = document.createElement('div');
      hint.id = 'selector-hint';
      document.body.appendChild(hint);
    }

    hint.innerHTML = message; // 支持HTML
    hint.className = `selector-hint ${type}`;
    hint.style.display = 'block';

    if (type === 'success' || type === 'warning') {
      setTimeout(() => {
        hint.style.display = 'none';
      }, duration);
    }
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

      // 查找发送按钮
      const sendButton = document.querySelector(config.sendButtonSelector);
      if (!sendButton) {
        alert('未找到发送按钮，选择器可能不正确');
        return;
      }

      // 点击发送
      setTimeout(() => {
        sendButton.click();
        alert('✅ 测试成功！消息已发送');
      }, 500);

    } catch (error) {
      alert('❌ 测试失败: ' + error.message);
    }
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
    createControlPanel();
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mousedown', handleMouseDown, true);
    document.addEventListener('mouseup', handleMouseUp, true);
    document.addEventListener('click', handleClick, true);
    showHint('👋 欢迎！请按照步骤选择输入框和发送按钮');
  }
})();

