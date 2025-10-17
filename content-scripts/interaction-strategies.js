/**
 * 通用交互策略配置
 * 
 * 设计原则：
 * 1. 零硬编码 - 所有策略都可配置
 * 2. 组合优于继承 - 策略可组合使用
 * 3. 开放封闭 - 新策略无需修改现有代码
 * 4. 失败优雅 - 一个策略失败不影响其他
 */

// ============= 输入填充策略 =============

const INPUT_FILL_STRATEGIES = [
  {
    name: '原生Setter策略',
    condition: (element) => {
      return element.tagName === 'TEXTAREA' || element.tagName === 'INPUT';
    },
    execute: (element, text) => {
      try {
        // 使用原生setter绕过框架拦截
        const prototype = element.tagName === 'TEXTAREA' 
          ? window.HTMLTextAreaElement.prototype 
          : window.HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
        if (setter) {
          setter.call(element, text);
          return true;
        }
      } catch (e) {
        console.warn('原生setter失败:', e);
      }
      // 降级到普通赋值
      element.value = text;
      return true;
    }
  },
  
  {
    name: 'ContentEditable文本节点策略',
    condition: (element) => {
      return element.isContentEditable || element.getAttribute('contenteditable') === 'true';
    },
    execute: (element, text) => {
      element.textContent = '';
      const textNode = document.createTextNode(text);
      element.appendChild(textNode);
      return !!element.textContent;
    }
  },
  
  {
    name: 'ContentEditable-innerHTML策略',
    condition: (element) => {
      return element.isContentEditable || element.getAttribute('contenteditable') === 'true';
    },
    execute: (element, text) => {
      element.innerHTML = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return !!element.innerHTML;
    }
  },
  
  {
    name: 'ExecCommand策略',
    condition: (element) => {
      return element.isContentEditable || element.getAttribute('contenteditable') === 'true';
    },
    execute: (element, text) => {
      try {
        element.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, text);
        return true;
      } catch (e) {
        return false;
      }
    }
  },
  
  {
    name: 'Quill编辑器策略',
    condition: (element) => {
      return element.classList.contains('ql-editor') || 
             element.closest('.ql-container');
    },
    execute: (element, text) => {
      try {
        const container = element.closest('.ql-container') || element.parentElement;
        if (container && container.__quill) {
          container.__quill.setText(text);
          return true;
        }
      } catch (e) {
        return false;
      }
      // 降级到textContent
      element.textContent = text;
      return true;
    }
  },
  
  {
    name: '通用降级策略',
    condition: () => true, // 总是适用
    execute: (element, text) => {
      // 尝试多种方式
      if ('value' in element) {
        element.value = text;
      } else if (element.isContentEditable) {
        element.textContent = text;
      } else {
        element.innerHTML = text;
      }
      return true;
    }
  }
];

// ============= 事件触发策略 =============

const EVENT_TRIGGER_STRATEGIES = [
  {
    name: '输入事件组',
    events: ['input', 'change', 'keyup', 'keydown'],
    options: { bubbles: true, cancelable: true }
  },
  {
    name: 'InputEvent（带数据）',
    events: ['input'],
    createEvent: (eventName, data) => {
      return new InputEvent(eventName, {
        bubbles: true,
        cancelable: true,
        data: data.text,
        inputType: 'insertText'
      });
    }
  },
  {
    name: 'Quill专属事件',
    events: ['text-change'],
    condition: (element) => element.classList.contains('ql-editor'),
    options: { bubbles: true }
  }
];

// ============= 点击触发策略 =============

const CLICK_TRIGGER_STRATEGIES = [
  {
    name: '聚焦策略',
    execute: (element) => {
      if (typeof element.focus === 'function') {
        element.focus();
      }
    }
  },
  {
    name: '鼠标事件序列',
    execute: (element) => {
      const events = ['mouseover', 'mouseenter', 'mousedown', 'mouseup', 'click'];
      const options = {
        bubbles: true,
        cancelable: true,
        view: window,
        detail: 1
      };
      events.forEach(eventName => {
        element.dispatchEvent(new MouseEvent(eventName, options));
      });
    }
  },
  {
    name: '指针事件序列',
    execute: (element) => {
      const events = ['pointerover', 'pointerenter', 'pointerdown', 'pointerup', 'click'];
      const options = {
        bubbles: true,
        cancelable: true,
        view: window,
        pointerId: 1,
        pointerType: 'mouse'
      };
      events.forEach(eventName => {
        element.dispatchEvent(new PointerEvent(eventName, options));
      });
    }
  },
  {
    name: '触摸事件序列',
    execute: (element) => {
      const events = ['touchstart', 'touchend'];
      const options = {
        bubbles: true,
        cancelable: true,
        view: window
      };
      events.forEach(eventName => {
        element.dispatchEvent(new TouchEvent(eventName, options));
      });
    }
  },
  {
    name: '原生Click',
    execute: (element) => {
      element.click();
    }
  }
];

// ============= 元素查找策略 =============

const ELEMENT_FIND_STRATEGIES = {
  // 输入框特征
  inputFeatures: [
    { name: 'tagName', check: (el) => ['TEXTAREA', 'INPUT'].includes(el.tagName) },
    { name: 'contentEditable', check: (el) => el.isContentEditable || el.getAttribute('contenteditable') === 'true' },
    { name: 'role', check: (el) => el.getAttribute('role') === 'textbox' },
    { name: 'ariaLabel', check: (el) => {
      const label = el.getAttribute('aria-label')?.toLowerCase();
      return label && (label.includes('input') || label.includes('message') || label.includes('输入'));
    }},
    { name: 'placeholder', check: (el) => !!el.getAttribute('placeholder') },
    { name: 'quillEditor', check: (el) => el.classList.contains('ql-editor') }
  ],
  
  // 按钮特征
  buttonFeatures: [
    { name: 'tagName', check: (el) => el.tagName === 'BUTTON' },
    { name: 'role', check: (el) => el.getAttribute('role') === 'button' },
    { name: 'clickHandler', check: (el) => !!el.onclick || !!el.getAttribute('onclick') },
    { name: 'cursorPointer', check: (el) => window.getComputedStyle(el).cursor === 'pointer' },
    { name: 'ariaLabel', check: (el) => {
      const label = el.getAttribute('aria-label')?.toLowerCase();
      return label && (label.includes('send') || label.includes('submit') || label.includes('发送') || label.includes('提交'));
    }},
    { name: 'type', check: (el) => el.getAttribute('type') === 'submit' },
    { name: 'dataAction', check: (el) => !!el.getAttribute('data-action') || !!el.getAttribute('data-testid') }
  ]
};

// ============= 策略执行引擎 =============

class StrategyExecutor {
  /**
   * 执行填充策略
   */
  static fillInput(element, text) {
    console.log('📝 开始执行填充策略...');
    
    // 先聚焦激活
    element.focus();
    element.click();
    
    // 执行所有适用的策略
    const results = [];
    for (const strategy of INPUT_FILL_STRATEGIES) {
      if (!strategy.condition || strategy.condition(element)) {
        console.log(`  尝试策略: ${strategy.name}`);
        try {
          const success = strategy.execute(element, text);
          results.push({ strategy: strategy.name, success });
          if (success) {
            console.log(`  ✅ ${strategy.name} 成功`);
          }
        } catch (e) {
          console.warn(`  ❌ ${strategy.name} 失败:`, e);
          results.push({ strategy: strategy.name, success: false, error: e });
        }
      }
    }
    
    // 触发输入事件
    this.triggerInputEvents(element, text);
    
    console.log('填充策略执行完成，当前值:', element.textContent || element.value);
    return results;
  }
  
  /**
   * 触发输入事件
   */
  static triggerInputEvents(element, text) {
    console.log('📢 触发输入事件...');
    
    for (const strategy of EVENT_TRIGGER_STRATEGIES) {
      if (strategy.condition && !strategy.condition(element)) {
        continue;
      }
      
      for (const eventName of strategy.events) {
        try {
          let event;
          if (strategy.createEvent) {
            event = strategy.createEvent(eventName, { text });
          } else {
            event = new Event(eventName, strategy.options);
          }
          element.dispatchEvent(event);
        } catch (e) {
          console.warn(`  事件 ${eventName} 触发失败:`, e);
        }
      }
    }
  }
  
  /**
   * 执行点击策略
   */
  static clickButton(element) {
    console.log('👆 开始执行点击策略...');
    
    const results = [];
    for (const strategy of CLICK_TRIGGER_STRATEGIES) {
      console.log(`  执行策略: ${strategy.name}`);
      try {
        strategy.execute(element);
        results.push({ strategy: strategy.name, success: true });
        console.log(`  ✅ ${strategy.name} 完成`);
      } catch (e) {
        console.warn(`  ❌ ${strategy.name} 失败:`, e);
        results.push({ strategy: strategy.name, success: false, error: e });
      }
    }
    
    console.log('点击策略执行完成');
    return results;
  }
  
  /**
   * 评估元素是否匹配特征
   */
  static evaluateElement(element, features) {
    const matches = [];
    for (const feature of features) {
      try {
        if (feature.check(element)) {
          matches.push(feature.name);
        }
      } catch (e) {
        // 忽略检查失败
      }
    }
    return matches;
  }
  
  /**
   * 检查是否是输入框
   */
  static isInputElement(element) {
    const matches = this.evaluateElement(element, ELEMENT_FIND_STRATEGIES.inputFeatures);
    return matches.length > 0 ? matches : null;
  }
  
  /**
   * 检查是否是按钮
   */
  static isButtonElement(element) {
    const matches = this.evaluateElement(element, ELEMENT_FIND_STRATEGIES.buttonFeatures);
    return matches.length > 0 ? matches : null;
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    INPUT_FILL_STRATEGIES,
    EVENT_TRIGGER_STRATEGIES,
    CLICK_TRIGGER_STRATEGIES,
    ELEMENT_FIND_STRATEGIES,
    StrategyExecutor
  };
}

