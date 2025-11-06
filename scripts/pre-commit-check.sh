#!/bin/bash

# 提交前安全检查脚本
# 使用方法: bash scripts/pre-commit-check.sh

echo "🔍 开始提交前安全检查..."
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# 1. 检查是否有真实的 API key
echo "1️⃣  检查 API key..."
if grep -r "AIza[0-9A-Za-z_-]\{35\}" --exclude-dir=.git --exclude-dir=node_modules --exclude="*.example" --exclude="*.md" . 2>/dev/null; then
    echo -e "${RED}❌ 发现疑似真实的 Google Maps API Key！${NC}"
    echo "   请在提交前移除真实密钥"
    ERRORS=$((ERRORS+1))
else
    echo -e "${GREEN}✅ 未发现真实 API key${NC}"
fi

# 2. 检查 config.js 文件
echo ""
echo "2️⃣  检查 config.js..."
if [ -f "js/config.js" ]; then
    if grep -q "YOUR_GOOGLE_MAPS_API_KEY_HERE" "js/config.js"; then
        echo -e "${GREEN}✅ config.js 只包含占位符${NC}"
    elif grep -q "AIza" "js/config.js"; then
        echo -e "${RED}❌ config.js 包含真实的 API key！${NC}"
        echo "   建议操作："
        echo "   1. 移除真实密钥"
        echo "   2. 或将 config.js 添加到 .gitignore"
        ERRORS=$((ERRORS+1))
    else
        echo -e "${YELLOW}⚠️  config.js 格式可能不正确${NC}"
        WARNINGS=$((WARNINGS+1))
    fi
else
    echo -e "${YELLOW}⚠️  config.js 不存在（这是正常的，如果你在使用 config.js.example）${NC}"
fi

# 3. 检查 .gitignore
echo ""
echo "3️⃣  检查 .gitignore..."
if [ -f ".gitignore" ]; then
    echo -e "${GREEN}✅ .gitignore 存在${NC}"

    # 检查关键条目
    if grep -q "\.env" ".gitignore"; then
        echo -e "${GREEN}   ✓ 包含 .env${NC}"
    else
        echo -e "${YELLOW}   ⚠️  .gitignore 中缺少 .env${NC}"
        WARNINGS=$((WARNINGS+1))
    fi
else
    echo -e "${RED}❌ .gitignore 不存在！${NC}"
    ERRORS=$((ERRORS+1))
fi

# 4. 检查必需文件
echo ""
echo "4️⃣  检查必需文件..."
required_files=(
    "README.md"
    "README.zh-CN.md"
    "DEPLOY.md"
    "SETUP.md"
    "js/config.js.example"
    ".github/workflows/deploy.yml"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}   ✓ $file${NC}"
    else
        echo -e "${RED}   ✗ $file (缺失)${NC}"
        ERRORS=$((ERRORS+1))
    fi
done

# 5. 检查文档中的占位符
echo ""
echo "5️⃣  检查文档占位符..."
if grep -r "YOUR_USERNAME" --include="*.md" . 2>/dev/null; then
    echo -e "${YELLOW}⚠️  发现 YOUR_USERNAME 占位符${NC}"
    echo "   请在以下文件中替换为你的 GitHub 用户名："
    grep -r "YOUR_USERNAME" --include="*.md" -l . 2>/dev/null | sed 's/^/   - /'
    WARNINGS=$((WARNINGS+1))
else
    echo -e "${GREEN}✅ 未发现占位符${NC}"
fi

# 6. 检查 Git 状态
echo ""
echo "6️⃣  检查 Git 状态..."
if command -v git &> /dev/null; then
    if git rev-parse --git-dir > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Git 仓库已初始化${NC}"

        # 检查是否有未提交的敏感文件
        if git ls-files | grep -q "js/config.js"; then
            if [ -f "js/config.js" ] && grep -q "AIza" "js/config.js"; then
                echo -e "${RED}   ❌ config.js 已被 Git 追踪且包含真实密钥！${NC}"
                echo "   立即执行："
                echo "   git rm --cached js/config.js"
                echo "   echo 'js/config.js' >> .gitignore"
                ERRORS=$((ERRORS+1))
            fi
        fi
    else
        echo -e "${YELLOW}⚠️  Git 仓库未初始化${NC}"
        WARNINGS=$((WARNINGS+1))
    fi
else
    echo -e "${YELLOW}⚠️  Git 未安装${NC}"
fi

# 总结
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}🎉 检查完成！所有检查都通过了！${NC}"
    echo ""
    echo "你可以安全地提交代码："
    echo "  git add ."
    echo "  git commit -m 'Initial commit: Travel View app'"
    echo "  git push origin main"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  检查完成，有 $WARNINGS 个警告${NC}"
    echo ""
    echo "建议修复警告后再提交，但可以继续"
    exit 0
else
    echo -e "${RED}❌ 检查失败！发现 $ERRORS 个错误和 $WARNINGS 个警告${NC}"
    echo ""
    echo "请修复以上错误后再提交代码"
    exit 1
fi
