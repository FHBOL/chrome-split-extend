// 在DeepSeek页面Console运行，精确定位发送按钮

console.log('=== 深度查找DeepSeek发送按钮 ===\n');

// 1. 查找textarea旁边的元素
const textarea = document.querySelector('textarea');
if (textarea) {
  console.log('📍 从textarea开始查找附近的按钮...\n');
  
  // 查找父级容器
  let parent = textarea.parentElement;
  let level = 0;
  while (parent && level < 5) {
    console.log(`层级${level}:`, parent.tagName, parent.className);
    
    // 在这一层查找所有button和可点击div
    const buttons = parent.querySelectorAll('button');
    const clickableDivs = Array.from(parent.querySelectorAll('div')).filter(d => 
      window.getComputedStyle(d).cursor === 'pointer' && d.offsetHeight > 0
    );
    
    console.log(`  找到${buttons.length}个button, ${clickableDivs.length}个可点击div`);
    
    // 检查button
    buttons.forEach((btn, i) => {
      if (btn.offsetHeight > 0) {
        console.log(`  Button${i}:`, {
          text: btn.textContent?.trim() || '(无文本)',
          class: btn.className,
          aria: btn.getAttribute('aria-label'),
          disabled: btn.disabled
        });
      }
    });
    
    // 检查可能是发送图标的div
    clickableDivs.forEach((div, i) => {
      // 只看小的div（可能是图标）
      if (div.offsetHeight < 50 && div.offsetWidth < 50) {
        console.log(`  可点击Div${i}:`, {
          size: `${div.offsetWidth}x${div.offsetHeight}`,
          class: div.className,
          innerHTML: div.innerHTML.substring(0, 100)
        });
      }
    });
    
    parent = parent.parentElement;
    level++;
  }
}

// 2. 查找包含SVG图标的按钮/div
console.log('\n🔍 查找包含SVG的可点击元素...\n');
const svgParents = Array.from(document.querySelectorAll('svg')).map(svg => svg.parentElement);
const uniqueSvgParents = [...new Set(svgParents)].filter(el => 
  el && window.getComputedStyle(el).cursor === 'pointer'
);

console.log(`找到${uniqueSvgParents.length}个包含SVG的可点击元素`);
uniqueSvgParents.slice(0, 5).forEach((el, i) => {
  console.log(`SVG父元素${i}:`, {
    tag: el.tagName,
    class: el.className,
    size: `${el.offsetWidth}x${el.offsetHeight}`,
    role: el.getAttribute('role'),
    aria: el.getAttribute('aria-label')
  });
});

// 3. 在textarea右侧查找
console.log('\n➡️ 查找textarea右侧的元素...\n');
if (textarea) {
  const textareaRect = textarea.getBoundingClientRect();
  const rightElements = Array.from(document.querySelectorAll('button, div')).filter(el => {
    const rect = el.getBoundingClientRect();
    // 在textarea右侧50px内，且纵向位置接近
    return rect.left > textareaRect.right && 
           rect.left < textareaRect.right + 100 &&
           Math.abs(rect.top - textareaRect.top) < 50 &&
           el.offsetHeight > 0;
  });
  
  console.log(`找到${rightElements.length}个在textarea右侧的元素`);
  rightElements.forEach((el, i) => {
    console.log(`右侧元素${i}:`, {
      tag: el.tagName,
      class: el.className,
      cursor: window.getComputedStyle(el).cursor,
      size: `${el.offsetWidth}x${el.offsetHeight}`,
      hasClick: !!el.onclick,
      element: el
    });
  });
}

// 4. 通过UI特征查找
console.log('\n🎨 通过样式特征查找...\n');
const allClickable = document.querySelectorAll('[style*="cursor: pointer"], [style*="cursor:pointer"]');
console.log(`有cursor:pointer内联样式的元素: ${allClickable.length}个`);

// 5. 输出最可能的候选
console.log('\n✨ 推荐测试以下选择器:\n');
console.log('1. textarea旁边的第一个button:');
console.log('   textarea ~ button');
console.log('   textarea + * button');
console.log('\n2. 包含SVG的div:');
console.log('   div:has(svg)[style*="cursor"]');
console.log('\n3. 通用可点击div:');
console.log('   div[style*="cursor: pointer"]');
console.log('\n4. 手动检查右侧元素（见上面输出的element）');

console.log('\n💡 测试方法:');
console.log('const btn = document.querySelector("你的选择器");');
console.log('console.log("找到:", btn);');
console.log('btn.click();  // 看是否能触发发送');

