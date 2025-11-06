# Google Maps API 配置指南

## 📋 获取API密钥步骤

### 1. 访问Google Cloud Console
1. 打开 [Google Cloud Console](https://console.cloud.google.com/)
2. 登录你的Google账号

### 2. 创建或选择项目
1. 点击顶部项目选择器
2. 选择现有项目或点击"新建项目"
3. 如果创建新项目，输入项目名称（如："Travel Visualization"）

### 3. 启用Maps JavaScript API
1. 在左侧菜单中选择"API和服务" > "库"
2. 搜索"Maps JavaScript API"
3. 点击"Maps JavaScript API"
4. 点击"启用"按钮

### 4. 创建API密钥
1. 在左侧菜单中选择"API和服务" > "凭据"
2. 点击"+ 创建凭据" > "API密钥"
3. 复制生成的API密钥
4. **重要：点击"限制密钥"进行安全配置**

### 5. 配置API密钥限制（推荐）
1. 在API限制中选择"限制密钥"
2. 选择"Maps JavaScript API"
3. 在应用程序限制中：
   - 选择"HTTP引荐来源网址（网站）"
   - 添加你的域名，例如：
     - `http://localhost:8000/*` （本地开发）
     - `https://yourdomain.com/*` （生产环境）

## 🔧 配置API密钥

### 方法1：直接修改配置文件（简单）
编辑 `js/config.js` 文件：

```javascript
const MAPS_CONFIG = {
    // 替换为你的API密钥
    API_KEY: 'AIza...你的密钥...',
    // 其他配置保持不变
};
```

### 方法2：使用环境变量（推荐）
1. 复制 `.env.example` 为 `.env.local`：
   ```bash
   cp .env.example .env.local
   ```

2. 编辑 `.env.local` 文件：
   ```env
   GOOGLE_MAPS_API_KEY=AIza...你的密钥...
   ```

## 🔒 安全最佳实践

### 1. API密钥保护
- ✅ 始终限制API密钥的使用域名
- ✅ 不要在公开代码库中提交真实API密钥
- ✅ 定期轮换API密钥
- ✅ 监控API使用情况

### 2. 域名限制示例
```
生产环境：
https://yourdomain.com/*
https://www.yourdomain.com/*

开发环境：
http://localhost:8000/*
http://127.0.0.1:8000/*
```

### 3. 费用控制
在Google Cloud Console中设置：
- 每日API调用限额
- 费用预算提醒
- API配额监控

## 🚀 部署配置

### 本地开发
```bash
# 使用任何HTTP服务器
python -m http.server 8000
# 或
npx serve .
# 或
php -S localhost:8000
```

### 生产部署
1. 确保使用HTTPS
2. 配置正确的域名限制
3. 考虑使用服务端代理保护API密钥

## 🐛 常见问题

### Q: 显示"此API项目未获得使用此API的授权"
A: 确保已在Google Cloud Console中启用Maps JavaScript API

### Q: 显示"请求的密钥无效"
A: 检查API密钥是否正确复制，确保没有多余的空格

### Q: 地图显示灰色
A: 检查域名限制设置，确保当前访问域名在允许列表中

### Q: 超出配额限制
A: 检查Google Cloud Console中的配额设置和计费状态

## 💰 费用说明

- Google Maps JavaScript API 提供每月$200的免费额度
- 对于个人旅行展示应用，通常免费额度足够使用
- 可在Google Cloud Console中设置预算提醒

## 📱 测试配置

### 快速测试
1. 打开浏览器开发者工具
2. 查看Console中的日志信息：
   - ✅ `🔑 Google Maps API密钥配置正确`
   - ✅ `🗺️ Google Maps加载成功`
   - ❌ `🔑 API密钥未配置: 请在config.js中设置GOOGLE_MAPS_API_KEY`

### 验证地图功能
- 能看到地图而不是占位符
- 可以看到行程标记点
- 点击标记显示信息窗口
- 时间轴与地图联动正常

## 🔄 从演示模式切换到完整版

1. 获取并配置API密钥
2. 在 `js/config.js` 中设置 `API_KEY`
3. 删除或注释 `index.html` 中的 `window.DEMO_MODE = true;`
4. 刷新页面验证功能

---

需要帮助？请查看 [Google Maps Platform 文档](https://developers.google.com/maps/documentation/javascript/overview)
