// 预设配置文件 - 主流AI网站选择器配置
// 此文件包含常见AI聊天网站的默认选择器配置，用户可通过配置向导自定义覆盖

const DEFAULT_CONFIGS = {
  // DeepSeek - 探索未至之境
  'chat_deepseek_com': {
    name: 'DeepSeek',
    inputSelector: 'textarea',
    // 不配置sendButtonSelector，使用Enter键发送（DeepSeek支持回车发送）
    version: '2025-10-20',
    notes: '使用Enter键发送，通用且稳定'
  },

  // ChatGPT
  'chatgpt_com': {
    name: 'ChatGPT',
    inputSelector: '#prompt-textarea',
    sendButtonSelector: 'button[data-testid="send-button"]',
    version: '2025-01-19',
    notes: '适用于ChatGPT官方网站'
  },

  // Gemini
  'gemini_google_com': {
    name: 'Gemini',
    inputSelector: '.ql-editor',
    sendButtonSelector: 'button[aria-label*="Send"]',
    version: '2025-01-19',
    notes: '适用于Google Gemini，使用Quill编辑器'
  },

  // Claude
  'claude_ai': {
    name: 'Claude',
    inputSelector: 'div[contenteditable="true"]',
    sendButtonSelector: 'button[aria-label*="Send"]',
    version: '2025-01-19',
    notes: '适用于Anthropic Claude'
  },

  // 通义千问
  'tongyi_aliyun_com': {
    name: '通义千问',
    inputSelector: 'textarea[placeholder*="输入"]',
    sendButtonSelector: 'button[type="submit"]',
    version: '2025-01-19',
    notes: '适用于阿里云通义千问'
  },

  // 文心一言
  'yiyan_baidu_com': {
    name: '文心一言',
    inputSelector: 'textarea',
    sendButtonSelector: 'button[type="submit"]',
    version: '2025-01-19',
    notes: '适用于百度文心一言'
  },

  // Kimi
  'kimi_moonshot_cn': {
    name: 'Kimi',
    inputSelector: 'textarea',
    sendButtonSelector: 'button[type="submit"]',
    version: '2025-01-19',
    notes: '适用于Moonshot Kimi'
  },

  // 豆包
  'doubao_com': {
    name: '豆包',
    inputSelector: 'textarea[placeholder*="输入"]',
    sendButtonSelector: 'button[aria-label*="发送"]',
    version: '2025-01-19',
    notes: '适用于字节豆包'
  },

  // Poe
  'poe_com': {
    name: 'Poe',
    inputSelector: 'textarea[class*="ChatMessageInput"]',
    sendButtonSelector: 'button[class*="ChatMessageSendButton"]',
    version: '2025-01-19',
    notes: '适用于Poe.com'
  },

  // Perplexity
  'perplexity_ai': {
    name: 'Perplexity',
    inputSelector: 'textarea[placeholder*="Ask"]',
    sendButtonSelector: 'button[aria-label*="Submit"]',
    version: '2025-01-19',
    notes: '适用于Perplexity AI'
  },

  // You.com
  'you_com': {
    name: 'You.com',
    inputSelector: 'textarea[name="query"]',
    sendButtonSelector: 'button[type="submit"]',
    version: '2025-01-19',
    notes: '适用于You.com AI搜索'
  },

  // HuggingChat
  'huggingface_co': {
    name: 'HuggingChat',
    inputSelector: 'textarea[name="message"]',
    sendButtonSelector: 'button[type="submit"]',
    version: '2025-01-19',
    notes: '适用于HuggingFace Chat'
  }
};

// 导出配置（兼容不同的模块系统）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DEFAULT_CONFIGS;
}

