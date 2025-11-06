# 部署指南

本文档介绍如何将 Travel View 项目部署到 GitHub Pages。

## 🚀 快速部署步骤

### 1. 准备 GitHub 仓库

```bash
# 初始化 Git 仓库（如果还未初始化）
git init

# 添加远程仓库
git remote add origin https://github.com/xxxxxthhh/travelView.git

# 提交代码
git add .
git commit -m "Initial commit: Travel View application"
git push -u origin main
```

### 2. 配置 Google Maps API Key

#### 2.1 获取 API Key

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建项目或选择现有项目
3. 启用 **Maps JavaScript API**
4. 创建 API 密钥
5. **重要**: 添加域名限制（参考 SETUP.md）

#### 2.2 配置 GitHub Secrets

1. 进入你的 GitHub 仓库
2. 点击 **Settings** → **Secrets and variables** → **Actions**
3. 点击 **New repository secret**
4. 添加以下 Secret：
   - **Name**: `GOOGLE_MAPS_API_KEY`
   - **Value**: 粘贴你的 Google Maps API Key
5. 点击 **Add secret**

![GitHub Secrets 配置示意](https://docs.github.com/assets/images/help/settings/actions-secrets.png)

### 3. 启用 GitHub Pages

1. 进入仓库的 **Settings** → **Pages**
2. 在 **Source** 下选择：
   - **Source**: GitHub Actions
3. 保存设置

### 4. 触发部署

部署会在以下情况自动触发：

- ✅ 推送代码到 `main` 分支
- ✅ 手动触发 workflow

```bash
# 推送代码触发部署
git push origin main

# 或在 GitHub 网页上手动触发：
# Actions → Deploy to GitHub Pages → Run workflow
```

### 5. 访问你的网站

部署完成后，你的网站将在以下地址可用：

```
https://xxxxxthhh.github.io/travelView/
```

## 📋 部署架构说明

### GitHub Actions Workflow

工作流程文件: `.github/workflows/deploy.yml`

**工作流程：**

1. **Checkout**: 检出代码仓库
2. **Inject API Key**: 动态生成 `config.js`，注入 GitHub Secret 中的 API Key
3. **Setup Pages**: 配置 GitHub Pages
4. **Upload Artifact**: 上传网站文件
5. **Deploy**: 部署到 GitHub Pages

### 配置文件结构

```
travelView/
├── js/
│   ├── config.js           # 模板文件（不含真实 API key）
│   └── config.js.example   # 本地开发配置示例
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Actions 自动部署配置
└── .gitignore              # 忽略敏感文件
```

## 🔒 安全性说明

### API Key 管理

- ✅ **生产环境**: API Key 存储在 GitHub Secrets 中，不出现在代码中
- ✅ **本地开发**: 使用本地 `config.js`（已在 .gitignore 中）
- ✅ **版本控制**: 只提交模板文件 `config.js.example`
- ⚠️ **域名限制**: 务必在 Google Cloud Console 中设置域名限制

### API Key 域名限制配置

为你的 API Key 添加以下域名限制：

```
https://xxxxxthhh.github.io/*
http://localhost:8000/*    # 本地开发
http://127.0.0.1:8000/*    # 本地开发
```

## 🛠️ 本地开发

### 配置本地环境

```bash
# 1. 复制配置模板
cp js/config.js.example js/config.js

# 2. 编辑 config.js，填入你的本地开发 API Key
# 注意：config.js 已在 .gitignore 中，不会被提交

# 3. 启动本地服务器
python -m http.server 8000

# 4. 访问应用
# http://localhost:8000/index.html
```

### 本地开发流程

```bash
# 开发过程
git add .
git commit -m "Add new feature"
git push origin main

# 推送后自动触发部署到 GitHub Pages
```

## 🔄 更新部署

### 更新代码

```bash
# 修改代码后提交
git add .
git commit -m "Update: description of changes"
git push origin main

# GitHub Actions 会自动重新部署
```

### 更新 API Key

1. 进入 **Settings** → **Secrets and variables** → **Actions**
2. 找到 `GOOGLE_MAPS_API_KEY`
3. 点击 **Update** 更新密钥
4. 手动触发 workflow 或推送新代码

### 查看部署状态

1. 进入仓库的 **Actions** 标签
2. 查看最新的 workflow 运行状态
3. 点击查看详细日志

## 🐛 故障排除

### 部署失败

**检查清单：**

1. ✅ GitHub Secrets 中是否正确配置 `GOOGLE_MAPS_API_KEY`
2. ✅ GitHub Pages 是否启用（Source 设为 GitHub Actions）
3. ✅ Workflow 权限是否正确（需要 pages: write 权限）
4. ✅ 查看 Actions 日志中的错误信息

### 地图无法加载

**检查清单：**

1. ✅ API Key 是否有效
2. ✅ API Key 是否设置了正确的域名限制
3. ✅ Maps JavaScript API 是否已启用
4. ✅ 浏览器控制台是否有错误信息

### 本地开发问题

```bash
# 确保 config.js 存在
test -f js/config.js && echo "配置文件存在" || echo "请创建 config.js"

# 确保使用 HTTP 服务器而非 file:// 协议
# ❌ 错误: file:///Users/xxx/travelView/index.html
# ✅ 正确: http://localhost:8000/index.html
```

## 📚 相关文档

- [SETUP.md](./SETUP.md) - Google Maps API 详细配置指南
- [README.md](./README.md) - 项目介绍和功能说明
- [CLAUDE.md](./CLAUDE.md) - 代码架构和开发指南
- [GitHub Pages 官方文档](https://docs.github.com/en/pages)
- [GitHub Actions 官方文档](https://docs.github.com/en/actions)

## 💡 进阶配置

### 自定义域名

如果你有自己的域名：

1. 在仓库根目录创建 `CNAME` 文件：
   ```
   yourdomain.com
   ```

2. 在域名服务商处添加 DNS 记录：
   ```
   A     @     185.199.108.153
   A     @     185.199.109.153
   A     @     185.199.110.153
   A     @     185.199.111.153
   ```

3. 更新 API Key 的域名限制包含你的自定义域名

### 添加 CI/CD 检查

可以扩展 workflow 添加：

- 📝 代码格式检查（ESLint, Prettier）
- 🧪 自动化测试
- 📊 性能分析
- 🔍 安全扫描

### 多环境部署

可以创建不同的 workflow 部署到不同环境：

- `deploy-staging.yml` → 部署到测试环境
- `deploy-production.yml` → 部署到生产环境
- 使用不同的 GitHub Secrets 管理不同环境的 API Key

## 🎉 完成！

恭喜！你的 Travel View 应用现在已经部署到 GitHub Pages 了！

每次推送代码到 `main` 分支，网站都会自动更新。
