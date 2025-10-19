# 工具脚本目录

本目录包含用于开发和维护的工具脚本。

## 可用工具

### 1. batch-config-generator.js + batch-generator-page.html - 批量配置生成器 ⭐️

**功能**：全自动批量生成所有主流AI网站的配置，无需手动操作！

**使用方法**：

1. 右键点击 `batch-generator-page.html`，选择"在浏览器中打开"
2. 点击"🚀 开始批量生成"按钮
3. 脚本会自动：
   - 依次访问12个主流AI网站
   - 在后台标签页中自动检测配置
   - 完成后自动关闭标签页
   - 显示实时进度和日志
4. 全部完成后，点击"📋 复制配置代码"
5. 将代码粘贴到 `default-configs.js` 文件中

**特点**：
- ✅ **完全自动化** - 一键生成所有网站配置
- ✅ **实时进度** - 可视化进度条和状态显示
- ✅ **详细日志** - 每个网站的检测过程都有日志
- ✅ **统计报告** - 成功率、信心度分布一目了然
- ✅ **代码直接可用** - 一键复制，无需手动编辑

**支持的网站**（12个）：
- ChatGPT, Gemini, Claude, DeepSeek
- 通义千问, 文心一言, Kimi, 豆包
- Poe, Perplexity, You.com, HuggingChat

**预期耗时**：约 1-2 分钟（取决于网络速度）

**输出示例**：

```
📊 生成结果
总计: 12 个
成功: 11 个
高信心度: 9 个 (81.8%)
中等信心度: 2 个 (18.2%)

生成的配置代码：
const DEFAULT_CONFIGS = {
  // ChatGPT
  'chatgpt_com': {
    name: 'ChatGPT',
    inputSelector: '#prompt-textarea',
    sendButtonSelector: 'button[data-testid="send-button"]',
    version: '2025-01-19',
    notes: '自动生成'
  },
  // ... 其他网站
};
```

**注意事项**：
- 某些网站可能需要登录才能显示输入框
- 如果检测失败，可以手动使用单个网站生成器
- 建议在网络稳定的环境下运行

---

### 2. config-generator.js - 单个网站配置生成器

**功能**：自动检测AI网站的输入框和发送按钮，生成准确的选择器配置。

**使用方法**：

1. 打开目标AI网站（如 DeepSeek、ChatGPT 等）
2. 打开浏览器开发者工具（F12）
3. 切换到 Console（控制台）标签页
4. 复制 `config-generator.js` 的全部内容
5. 粘贴到控制台并按回车运行

**输出示例**：

```
🚀 AI聚合器 - 智能配置生成器启动...

📝 开始检测输入框...
找到 3 个输入框候选：
  1. [得分: 95] #prompt-textarea
     类型: textarea, 信息: {id: 'prompt-textarea', placeholder: '输入消息...'}
  2. [得分: 65] textarea[placeholder*="输入"]
     类型: textarea, 信息: {...}

✅ 推荐输入框选择器: #prompt-textarea

🔘 开始检测发送按钮...
找到 5 个按钮候选：
  1. [得分: 90] button[data-testid="send-button"]
     类型: button, 信息: {type: 'submit', ariaLabel: 'Send message'}
  2. [得分: 70] button[aria-label*="Send"]
     类型: button, 信息: {...}

✅ 推荐发送按钮选择器: button[data-testid="send-button"]

============================================================
📋 生成的配置代码：
============================================================

// ChatGPT
'chatgpt_com': {
  name: 'ChatGPT',
  inputSelector: '#prompt-textarea',
  sendButtonSelector: 'button[data-testid="send-button"]',
  version: '2025-01-19',
  notes: '自动生成的配置'
},
============================================================

📊 配置信心度评估：
  输入框: 95 - 🟢 高（推荐使用）
  发送按钮: 90 - 🟢 高（推荐使用）

✅ 配置信心度良好，可以直接使用！

🧪 测试配置：
运行以下命令测试配置是否有效：
testConfig('#prompt-textarea', 'button[data-testid="send-button"]')
```

**测试配置**：

运行脚本后，可以使用 `testConfig()` 函数验证配置：

```javascript
testConfig('#prompt-textarea', 'button[data-testid="send-button"]')
```

输出：
```
测试结果：
  输入框: ✅ 找到 <textarea id="prompt-textarea">
  发送按钮: ✅ 找到 <button data-testid="send-button">

✅ 配置有效！可以使用。
```

**评分机制**：

#### 输入框评分标准
- 基础分：textarea (30分)、contentEditable (20分)、role="textbox" (15分)
- ID加分：有ID (+20分)，ID包含关键词 (+15分)
- placeholder加分：有placeholder (+10分)，包含关键词 (+15分)
- 尺寸加分：高度>50px (+10分)，宽度>300px (+10分)
- 位置加分：位于页面下半部分 (+15分)

#### 发送按钮评分标准
- 基础分：button标签 (+20分)、type="submit" (+25分)
- aria-label加分：有aria-label (+15分)，包含"send/发送" (+30分)
- 文本内容：包含"send/发送" (+25分)
- 图标检测：包含发送相关SVG图标 (+20分)
- ID/class加分：包含"send/submit"关键词 (+15-20分)

#### 信心度等级
- 🟢 80分以上：高信心度，推荐直接使用
- 🟡 50-79分：中等信心度，建议手动验证
- 🔴 50分以下：低信心度，需要手动调整

**工作流程**：

```
1. 访问AI网站 → 2. 运行脚本 → 3. 复制生成的配置代码
                                       ↓
4. 粘贴到 default-configs.js ← 5. 测试验证配置
```

**注意事项**：

1. 某些网站需要登录后才能看到输入框和发送按钮
2. 动态加载的元素可能需要等待页面完全加载
3. 如果信心度较低，建议手动验证和调整选择器
4. 生成的选择器尽可能唯一和稳定，但可能需要根据实际情况微调

**示例：为新网站生成配置**

```bash
# 1. 打开新AI网站
https://new-ai-site.com/chat

# 2. 在控制台运行 config-generator.js

# 3. 复制输出的配置代码，添加到 default-configs.js：
const DEFAULT_CONFIGS = {
  // ... 其他配置 ...
  
  // 新网站配置（从工具生成）
  'new_ai_site_com': {
    name: 'New AI Site',
    inputSelector: '#chat-input',
    sendButtonSelector: 'button[aria-label="Send"]',
    version: '2025-01-19',
    notes: '自动生成的配置'
  }
};
```

## 贡献

如果你开发了新的工具脚本，欢迎添加到此目录并更新本文档。

---

**维护者**: 项目团队  
**最后更新**: 2025-01-19

