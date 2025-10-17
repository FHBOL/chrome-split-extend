/**
 * 通用降级策略
 * 
 * 当找不到配置的发送按钮时，自动尝试各种通用方法
 * 设计原则：零硬编码、自动适配、优雅降级
 */

const SEND_FALLBACK_STRATEGIES = [
  {
    name: 'Enter键',
    description: '适用于支持Enter发送的网站（大部分聊天应用）',
    priority: 10,
    execute: (inputElement) => {
      console.log('  🎯 尝试: Enter键发送');
      inputElement.focus();
      
      // 触发完整键盘事件序列
      ['keydown', 'keypress', 'keyup'].forEach(eventType => {
        const event = new KeyboardEvent(eventType, {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true,
          cancelable: true,
          composed: true
        });
        inputElement.dispatchEvent(event);
      });
      
      return true;
    }
  },
  
  {
    name: 'Ctrl+Enter组合键',
    description: '一些网站使用Ctrl+Enter发送',
    priority: 8,
    execute: (inputElement) => {
      console.log('  🎯 尝试: Ctrl+Enter发送');
      inputElement.focus();
      
      ['keydown', 'keyup'].forEach(eventType => {
        const event = new KeyboardEvent(eventType, {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          ctrlKey: true,
          bubbles: true,
          cancelable: true,
          composed: true
        });
        inputElement.dispatchEvent(event);
      });
      
      return true;
    }
  },
  
  {
    name: '查找附近的可点击元素',
    description: '查找输入框附近的按钮或可点击div',
    priority: 9,
    execute: (inputElement) => {
      console.log('  🎯 尝试: 查找输入框附近的元素');
      
      // 获取输入框的位置
      const inputRect = inputElement.getBoundingClientRect();
      
      // 查找附近的所有可点击元素
      const nearbyClickable = Array.from(document.querySelectorAll('button, div, a, span')).filter(el => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        
        // 条件：可点击 + 在输入框附近（右侧或下方100px内）
        const isClickable = style.cursor === 'pointer' || el.tagName === 'BUTTON';
        const isNearby = (
          (rect.left >= inputRect.right && rect.left < inputRect.right + 100) ||  // 右侧
          (rect.top >= inputRect.bottom && rect.top < inputRect.bottom + 100)     // 下方
        ) && Math.abs(rect.top - inputRect.top) < 100;  // 纵向接近
        
        return isClickable && isNearby && el.offsetHeight > 0;
      });
      
      if (nearbyClickable.length > 0) {
        console.log(`    找到${nearbyClickable.length}个附近的可点击元素`);
        // 点击第一个
        nearbyClickable[0].click();
        return true;
      }
      
      return false;
    }
  },
  
  {
    name: '查找form的submit',
    description: '如果输入框在form中，触发form提交',
    priority: 7,
    execute: (inputElement) => {
      console.log('  🎯 尝试: Form提交');
      
      const form = inputElement.closest('form');
      if (form) {
        console.log('    找到form，触发submit');
        
        // 方法1: 触发submit事件
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        
        // 方法2: 调用submit()
        if (typeof form.submit === 'function') {
          try {
            form.submit();
          } catch (e) {
            // 某些网站会阻止
          }
        }
        
        return true;
      }
      
      return false;
    }
  },
  
  {
    name: '延迟重试',
    description: '等待按钮动态加载',
    priority: 5,
    execute: (inputElement, findButtonFn) => {
      console.log('  🎯 尝试: 延迟重试（1秒后）');
      
      return new Promise((resolve) => {
        setTimeout(() => {
          if (findButtonFn) {
            const button = findButtonFn();
            if (button && button.offsetHeight > 0) {
              console.log('    延迟找到按钮');
              button.click();
              resolve(true);
              return;
            }
          }
          resolve(false);
        }, 1000);
      });
    }
  },
  
  {
    name: '查找SVG图标按钮',
    description: '很多网站的发送按钮是SVG图标',
    priority: 6,
    execute: () => {
      console.log('  🎯 尝试: 查找SVG图标按钮');
      
      const svgs = document.querySelectorAll('svg');
      for (const svg of svgs) {
        const parent = svg.parentElement;
        const style = window.getComputedStyle(parent);
        
        // 条件：小尺寸 + 可点击 + 可见
        if (style.cursor === 'pointer' && 
            parent.offsetWidth < 60 && 
            parent.offsetWidth > 0) {
          console.log('    找到SVG图标按钮');
          parent.click();
          return true;
        }
      }
      
      return false;
    }
  }
];

/**
 * 执行降级策略链
 */
async function executeFallbackStrategies(inputElement, findButtonFunction) {
  console.log('🔄 执行降级策略链...');
  
  // 按优先级排序
  const sortedStrategies = SEND_FALLBACK_STRATEGIES.sort((a, b) => b.priority - a.priority);
  
  for (const strategy of sortedStrategies) {
    console.log(`\n${strategy.name} (优先级: ${strategy.priority})`);
    console.log(`  ${strategy.description}`);
    
    try {
      const result = await strategy.execute(inputElement, findButtonFunction);
      if (result) {
        console.log(`  ✅ ${strategy.name} 执行成功`);
      }
      // 注意：不中断，继续执行其他策略
    } catch (e) {
      console.warn(`  ❌ ${strategy.name} 执行失败:`, e);
    }
    
    // 短暂延迟，避免冲突
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log('\n✅ 降级策略链执行完成');
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SEND_FALLBACK_STRATEGIES,
    executeFallbackStrategies
  };
}

