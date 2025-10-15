// AI网站配置 - 不再硬编码，改为从标签页动态获取
// 此文件保留仅用于向后兼容，实际使用中应从 chrome.storage 或标签页获取

const DEFAULT_AI_SITES = [];

// 导出配置（用于模块化）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DEFAULT_AI_SITES };
}

