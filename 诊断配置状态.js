// 在浏览器控制台运行此脚本，诊断配置状态

async function diagnoseConfigs() {
  console.log('=== 配置诊断 ===\n');
  
  // 1. 读取storage中的原始配置
  const result = await chrome.storage.local.get(['aiSelectorConfigs']);
  const rawConfigs = result.aiSelectorConfigs || {};
  
  console.log('📦 Storage中的原始配置:');
  console.log(JSON.stringify(rawConfigs, null, 2));
  console.log('\n配置键列表:', Object.keys(rawConfigs));
  
  // 2. 检查每个配置的详细信息
  console.log('\n📋 配置详情:');
  for (const [key, config] of Object.entries(rawConfigs)) {
    console.log(`\n${key}:`);
    console.log('  输入框:', config.inputSelector);
    console.log('  发送按钮:', config.sendButtonSelector);
  }
  
  // 3. 检查Gemini配置
  console.log('\n🔍 Gemini配置检查:');
  const geminiKeys = [
    'Gemini',
    'gemini',
    'gemini_google_com',
    'Google Gemini'
  ];
  
  for (const key of geminiKeys) {
    if (rawConfigs[key]) {
      console.log(`✅ 找到键: "${key}"`);
      console.log('   配置:', rawConfigs[key]);
    }
  }
  
  // 4. 检查当前分屏中的网站
  const splitResult = await chrome.storage.local.get(['currentSplitSites']);
  const splitSites = splitResult.currentSplitSites || [];
  
  console.log('\n🖥️ 当前分屏中的网站:');
  splitSites.forEach((site, i) => {
    console.log(`${i + 1}. ${site.name} (${site.hostname})`);
    console.log(`   ID: ${site.id}`);
    console.log(`   URL: ${site.url}`);
  });
  
  // 5. 检查分屏站点与配置的匹配情况
  console.log('\n🔗 匹配检查:');
  for (const site of splitSites) {
    const siteId = site.id || site.hostname.replace(/[^a-zA-Z0-9]/g, '_');
    const hasConfig = !!rawConfigs[siteId];
    console.log(`${site.name}:`);
    console.log(`   期望的配置键: ${siteId}`);
    console.log(`   是否有配置: ${hasConfig ? '✅' : '❌'}`);
    if (hasConfig) {
      console.log(`   配置内容:`, rawConfigs[siteId]);
    }
  }
  
  // 6. 建议修复方案
  console.log('\n💡 修复建议:');
  
  // 检查是否有旧格式的键
  const oldFormatKeys = Object.keys(rawConfigs).filter(key => !key.includes('_'));
  if (oldFormatKeys.length > 0) {
    console.log('⚠️ 检测到旧格式的配置键:', oldFormatKeys);
    console.log('   建议运行: await normalizeConfigs()');
  }
  
  // 检查Gemini的具体问题
  const geminiConfig = rawConfigs['gemini_google_com'] || 
                       rawConfigs['Gemini'] || 
                       rawConfigs['gemini'];
  
  if (geminiConfig) {
    console.log('\n🌟 Gemini配置分析:');
    console.log('   当前配置:', geminiConfig);
    
    // 检查选择器是否有问题
    if (geminiConfig.inputSelector && geminiConfig.inputSelector.includes('ng-tns-c')) {
      console.log('   ⚠️ 输入框选择器包含动态类名，可能会失效');
    }
    if (geminiConfig.sendButtonSelector && geminiConfig.sendButtonSelector.includes('mat-mdc-button-touch-target')) {
      console.log('   ⚠️ 发送按钮选择器太通用，可能匹配错误的按钮');
    }
    
    console.log('\n   建议的稳定配置:');
    console.log('   inputSelector: ".ql-editor"');
    console.log('   sendButtonSelector: "button[aria-label*=\\"Send\\"]"');
  } else {
    console.log('\n❌ 未找到Gemini配置！');
    console.log('   可能的原因:');
    console.log('   1. 配置被意外删除');
    console.log('   2. 配置键名不匹配');
    console.log('   3. 从未配置过Gemini');
  }
}

// 规范化配置键名
async function normalizeConfigs() {
  const result = await chrome.storage.local.get(['aiSelectorConfigs']);
  const rawConfigs = result.aiSelectorConfigs || {};
  
  console.log('开始规范化配置...');
  console.log('原始配置键:', Object.keys(rawConfigs));
  
  const normalizedConfigs = {};
  const hostMap = {
    'Gemini': 'gemini_google_com',
    'gemini': 'gemini_google_com',
    'ChatGPT': 'chatgpt_com',
    'chatgpt': 'chatgpt_com',
    'Qwen': 'chat_qwen_ai',
    'qwen': 'chat_qwen_ai',
    'Claude': 'claude_ai',
    'claude': 'claude_ai'
  };
  
  for (const [key, config] of Object.entries(rawConfigs)) {
    if (key.includes('_')) {
      // 已经是规范格式
      normalizedConfigs[key] = config;
    } else {
      // 转换为规范格式
      const newKey = hostMap[key] || key;
      normalizedConfigs[newKey] = config;
      console.log(`转换: "${key}" → "${newKey}"`);
    }
  }
  
  await chrome.storage.local.set({ aiSelectorConfigs: normalizedConfigs });
  console.log('✅ 配置已规范化');
  console.log('新配置键:', Object.keys(normalizedConfigs));
  
  return normalizedConfigs;
}

// 手动修复Gemini配置
async function fixGeminiConfig() {
  const result = await chrome.storage.local.get(['aiSelectorConfigs']);
  const configs = result.aiSelectorConfigs || {};
  
  // 设置正确的Gemini配置
  configs['gemini_google_com'] = {
    inputSelector: '.ql-editor',
    sendButtonSelector: 'button[aria-label*="Send"]'
  };
  
  // 删除旧的Gemini配置（如果有）
  delete configs['Gemini'];
  delete configs['gemini'];
  
  await chrome.storage.local.set({ aiSelectorConfigs: configs });
  
  console.log('✅ Gemini配置已修复:');
  console.log(configs['gemini_google_com']);
  console.log('\n请刷新分屏页面测试！');
}

// 显示所有可用命令
console.log(`
=== 配置诊断工具 ===

可用命令:
1. await diagnoseConfigs()     - 完整诊断
2. await normalizeConfigs()    - 规范化配置键名
3. await fixGeminiConfig()     - 快速修复Gemini配置

现在运行: await diagnoseConfigs()
`);

// 自动运行诊断
diagnoseConfigs();

