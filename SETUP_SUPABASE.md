# Supabase 设置指南

本文档帮助你完成 Supabase 的配置，使 TravelView 支持多用户功能。

## 📋 前置条件

- ✅ 已注册 Supabase 免费账号
- ✅ 本地已有 TravelView 代码

---

## 🚀 设置步骤

### Step 1: 创建 Supabase 项目（5分钟）

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 点击 **"New Project"** 按钮
3. 填写项目信息：
   - **Name**: `travelview`（或你喜欢的名字）
   - **Database Password**: 设置一个强密码（**务必记住！**）
   - **Region**: 选择离你近的区域（推荐：Singapore 或 Tokyo）
4. 点击 **"Create new project"**
5. 等待项目创建完成（约 2 分钟）

### Step 2: 获取 API 凭证（2分钟）

1. 在项目 Dashboard 左侧，点击 ⚙️ **Settings**
2. 选择 **API**
3. 找到以下信息并复制：

```
Project URL: https://xxxxx.supabase.co
anon public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...（很长的一串）
```

⚠️ **重要**：`anon public key` 是公开密钥，可以在前端使用，不是秘密。

### Step 3: 配置项目（3分钟）

1. 在项目根目录，复制配置文件：
   ```bash
   cp js/config/supabase.js.example js/config/supabase.js
   ```

2. 编辑 `js/config/supabase.js`，填入你的凭证：
   ```javascript
   const SUPABASE_CONFIG = {
       url: 'https://你的项目ID.supabase.co',  // 粘贴你的 Project URL
       anonKey: 'eyJhbGc...'  // 粘贴你的 anon public key
   };
   ```

3. 保存文件

### Step 4: 创建数据库表（5分钟）

1. 在 Supabase Dashboard，点击左侧 🗄️ **SQL Editor**
2. 点击 **"+ New query"** 按钮
3. 打开项目中的 `supabase/schema.sql` 文件
4. **复制全部内容**，粘贴到 SQL Editor
5. 点击右下角 **"Run"** 按钮执行
6. 等待执行完成，看到 ✅ Success 提示

**验证**：点击左侧 🗂️ **Database**，应该能看到以下表：
- `trips` - 行程表
- `days` - 天数表
- `activities` - 活动表
- `routes` - 路由表

### Step 5: 加载 Supabase SDK（1分钟）

在 `index.html` 中，找到 JavaScript 模块加载部分，在最前面添加：

```html
<!-- Supabase SDK -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

<!-- 你的配置 -->
<script src="js/config/supabase.js"></script>
```

完整顺序应该是：
```html
<!-- Supabase SDK -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

<!-- 配置 -->
<script src="js/config/supabase.js"></script>
<script src="js/config.js.example"></script>
<script src="js/maps-loader.js"></script>

<!-- Utilities -->
<script src="js/utils/Logger.js"></script>
<!-- ... 其他脚本 -->
```

### Step 6: 测试（5分钟）

1. 启动本地服务器：
   ```bash
   python -m http.server 8000
   # 或
   npx serve .
   ```

2. 打开浏览器控制台（F12）

3. 测试 Supabase 连接：
   ```javascript
   // 在浏览器控制台输入
   console.log('Supabase client:', window.supabaseClient);

   // 应该看到 Supabase 客户端对象，而不是 undefined
   ```

4. 如果看到错误，检查：
   - ✅ supabase.js 文件是否正确配置
   - ✅ URL 和 Key 是否正确粘贴（注意不要有多余空格）
   - ✅ SQL 是否成功执行

---

## ✅ 完成！

现在你的 Supabase 已配置完成，接下来：

1. **我会继续帮你**：
   - 实现用户认证界面
   - 实现行程管理功能
   - 修改现有代码适配多用户

2. **你需要做的**：
   - 本地测试功能
   - 提供反馈和 bug 报告

---

## 🐛 常见问题

### Q1: "Failed to fetch" 错误
**原因**：网络问题或 URL 配置错误
**解决**：
1. 检查 Supabase 项目是否启动（Dashboard 显示绿色）
2. 检查 URL 是否正确（包括 https://）
3. 尝试在浏览器直接访问 URL，应该返回 JSON

### Q2: SQL 执行失败
**原因**：可能是表已存在或语法错误
**解决**：
1. 删除已存在的表：
   ```sql
   DROP TABLE IF EXISTS routes CASCADE;
   DROP TABLE IF EXISTS activities CASCADE;
   DROP TABLE IF EXISTS days CASCADE;
   DROP TABLE IF EXISTS trips CASCADE;
   ```
2. 重新执行 schema.sql

### Q3: 认证功能不工作
**原因**：Row Level Security 配置问题
**解决**：
1. 在 SQL Editor 执行：
   ```sql
   SELECT tablename, policyname FROM pg_policies
   WHERE schemaname = 'public';
   ```
2. 应该看到多个策略，如果没有，重新执行 schema.sql 的策略部分

---

## 📞 需要帮助？

如果遇到问题：
1. 检查浏览器控制台的错误信息
2. 截图发给我
3. 告诉我你执行到哪一步

让我们一起解决！🚀
