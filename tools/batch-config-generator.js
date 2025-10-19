// 批量配置生成器 - 自动化测试和生成所有AI网站的配置
// 使用Chrome扩展API自动访问网站并生成配置

// 主流AI网站列表
const AI_SITES = [
  {
    name: 'ChatGPT',
    url: 'https://chatgpt.com/',
    waitTime: 3000 // 等待页面加载的时间（毫秒）
  },
  {
    name: 'Gemini',
    url: 'https://gemini.google.com/',
    waitTime: 3000
  },
  {
    name: 'Claude',
    url: 'https://claude.ai/',
    waitTime: 3000
  },
  {
    name: 'DeepSeek',
    url: 'https://chat.deepseek.com/',
    waitTime: 2000
  },
  {
    name: '通义千问',
    url: 'https://tongyi.aliyun.com/qianwen/',
    waitTime: 3000
  },
  {
    name: '文心一言',
    url: 'https://yiyan.baidu.com/',
    waitTime: 3000
  },
  {
    name: 'Kimi',
    url: 'https://kimi.moonshot.cn/',
    waitTime: 2000
  },
  {
    name: '豆包',
    url: 'https://www.doubao.com/',
    waitTime: 2000
  },
  {
    name: 'Poe',
    url: 'https://poe.com/',
    waitTime: 3000
  },
  {
    name: 'Perplexity',
    url: 'https://www.perplexity.ai/',
    waitTime: 2000
  },
  {
    name: 'You.com',
    url: 'https://you.com/',
    waitTime: 2000
  },
  {
    name: 'HuggingChat',
    url: 'https://huggingface.co/chat/',
    waitTime: 3000
  }
];

// 注意：检测逻辑已移到 detector.js 文件中
// 使用 chrome.scripting.executeScript 的 files 参数注入

// 主函数：批量生成配置
async function generateAllConfigs() {
  console.log('🚀 开始批量生成AI网站配置...\n');
  
  const results = [];
  const errors = [];
  
  for (let i = 0; i < AI_SITES.length; i++) {
    const site = AI_SITES[i];
    console.log(`[${i + 1}/${AI_SITES.length}] 正在处理: ${site.name} (${site.url})`);
    
    try {
      const result = await processOneSite(site);
      results.push(result);
      
      // 显示结果
      const confidence = getConfidenceStatus(result.confidence);
      console.log(`  ✅ 完成 - 信心度: 输入框${confidence.input} 按钮${confidence.sendButton}\n`);
      
    } catch (error) {
      console.error(`  ❌ 失败: ${error.message}\n`);
      errors.push({ site: site.name, error: error.message });
    }
    
    // 避免请求过快
    await sleep(1000);
  }
  
  // 生成报告
  generateReport(results, errors);
  
  // 生成配置文件代码
  generateConfigCode(results);
  
  return { results, errors };
}

// 处理单个网站
async function processOneSite(site) {
  // 创建新标签页
  const tab = await chrome.tabs.create({ 
    url: site.url, 
    active: false 
  });
  
  try {
    // 等待页面加载
    await waitForLoad(tab.id, site.waitTime);
    
    // 注入检测脚本（使用files参数）
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['tools/detector.js']
    });
    
    const result = results[0].result;
    result.siteName = site.name; // 使用预定义的名称
    
    // 关闭标签页
    await chrome.tabs.remove(tab.id);
    
    return result;
    
  } catch (error) {
    // 出错也要关闭标签页
    try {
      await chrome.tabs.remove(tab.id);
    } catch {}
    throw error;
  }
}

// 等待页面加载
function waitForLoad(tabId, waitTime) {
  return new Promise((resolve) => {
    const listener = (tid, info) => {
      if (tid === tabId && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        // 额外等待一段时间，确保动态内容加载
        setTimeout(resolve, waitTime);
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
    
    // 超时保护
    setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    }, waitTime + 10000);
  });
}

// 生成报告
function generateReport(results, errors) {
  console.log('\n' + '='.repeat(70));
  console.log('📊 批量生成报告');
  console.log('='.repeat(70));
  
  console.log(`\n总计: ${results.length + errors.length} 个网站`);
  console.log(`✅ 成功: ${results.length} 个`);
  console.log(`❌ 失败: ${errors.length} 个`);
  
  // 统计信心度
  const highConfidence = results.filter(r => 
    r.confidence.input >= 80 && r.confidence.sendButton >= 80
  ).length;
  const mediumConfidence = results.filter(r => 
    (r.confidence.input >= 50 && r.confidence.input < 80) ||
    (r.confidence.sendButton >= 50 && r.confidence.sendButton < 80)
  ).length;
  const lowConfidence = results.length - highConfidence - mediumConfidence;
  
  console.log(`\n信心度分布:`);
  console.log(`  🟢 高 (≥80分): ${highConfidence} 个 (${(highConfidence/results.length*100).toFixed(1)}%)`);
  console.log(`  🟡 中 (50-79分): ${mediumConfidence} 个 (${(mediumConfidence/results.length*100).toFixed(1)}%)`);
  console.log(`  🔴 低 (<50分): ${lowConfidence} 个 (${(lowConfidence/results.length*100).toFixed(1)}%)`);
  
  // 详细结果
  console.log(`\n详细结果:`);
  results.forEach(r => {
    const inputConf = getConfidenceLevel(r.confidence.input);
    const buttonConf = getConfidenceLevel(r.confidence.sendButton);
    console.log(`  ${r.siteName}`);
    console.log(`    输入框: ${inputConf} - ${r.inputSelector || '未找到'}`);
    console.log(`    按钮: ${buttonConf} - ${r.sendButtonSelector || '未找到'}`);
  });
  
  // 失败列表
  if (errors.length > 0) {
    console.log(`\n失败列表:`);
    errors.forEach(e => {
      console.log(`  ❌ ${e.site}: ${e.error}`);
    });
  }
}

// 生成配置文件代码
function generateConfigCode(results) {
  console.log('\n' + '='.repeat(70));
  console.log('📝 生成的 default-configs.js 代码');
  console.log('='.repeat(70));
  console.log('\nconst DEFAULT_CONFIGS = {');
  
  results.forEach((r, index) => {
    if (r.inputSelector && r.sendButtonSelector) {
      const siteName = r.siteName.split(' - ')[0].split(' | ')[0];
      console.log(`  // ${siteName}`);
      console.log(`  '${r.siteId}': {`);
      console.log(`    name: '${siteName}',`);
      console.log(`    inputSelector: '${r.inputSelector}',`);
      console.log(`    sendButtonSelector: '${r.sendButtonSelector}',`);
      console.log(`    version: '${r.version}',`);
      console.log(`    notes: '自动生成 - 输入框信心度:${r.confidence.input} 按钮信心度:${r.confidence.sendButton}'`);
      console.log(`  }${index < results.length - 1 ? ',' : ''}\n`);
    }
  });
  
  console.log('};');
  console.log('\n' + '='.repeat(70));
  
  // 保存到剪贴板的提示
  console.log('\n💡 提示: 复制上面的代码并替换 default-configs.js 中的内容');
}

// 辅助函数
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getConfidenceStatus(confidence) {
  return {
    input: confidence.input >= 80 ? '🟢' : confidence.input >= 50 ? '🟡' : '🔴',
    sendButton: confidence.sendButton >= 80 ? '🟢' : confidence.sendButton >= 50 ? '🟡' : '🔴'
  };
}

function getConfidenceLevel(score) {
  if (score >= 80) return `${score} 🟢`;
  if (score >= 50) return `${score} 🟡`;
  return `${score} 🔴`;
}

// 导出
if (typeof chrome !== 'undefined' && chrome.runtime) {
  // 在扩展环境中运行
  console.log('✅ 批量配置生成器已加载');
  console.log('运行 generateAllConfigs() 开始批量生成配置');
  
  // 暴露到全局
  window.generateAllConfigs = generateAllConfigs;
} else {
  console.error('❌ 此脚本需要在Chrome扩展环境中运行');
}

