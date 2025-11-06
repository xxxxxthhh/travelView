# 关西旅行可视化应用

[English](./README.md) | 中文文档

一个基于Google Maps的交互式旅游行程展示应用，记录和可视化个人旅游历史。以关西10日游为示例数据。

![项目状态](https://img.shields.io/badge/%E7%8A%B6%E6%80%81-%E6%B4%BB%E8%B7%83-success) ![许可证](https://img.shields.io/badge/%E8%AE%B8%E5%8F%AF%E8%AF%81-MIT-blue) ![Vanilla JS](https://img.shields.io/badge/Vanilla-JS-yellow)

## 项目特色

- 🗺️ **交互式地图展示** - 集成Google Maps，支持多种地图样式
- 📅 **时间轴导航** - 左侧时间轴显示完整行程安排，支持日期间快速切换
- 🎯 **智能标记系统** - 不同类型活动使用不同颜色和图标标记
- 📱 **响应式设计** - 完美适配桌面端、平板和手机设备
- 🎨 **现代化UI** - 采用渐变色彩、卡片设计和平滑动画效果
- 🔍 **活动筛选** - 支持按活动类型筛选显示（景点、美食、交通、住宿）
- 📊 **统计信息** - 实时显示每日活动统计和距离计算

## 技术栈

- **前端**: HTML5, CSS3 (Grid/Flexbox), 原生JavaScript (ES6+)
- **地图**: Google Maps JavaScript API
- **设计**: 响应式设计，支持移动端和深色主题
- **数据**: JSON格式存储，支持本地数据和API扩展

## 项目结构

```
travelView/
├── kansai_trip_map.html    # 主页面
├── css/
│   ├── main.css           # 主样式文件
│   └── responsive.css     # 响应式样式
├── js/
│   ├── app.js            # 主应用逻辑
│   ├── timeline.js       # 时间轴组件
│   └── map.js            # 地图管理器
└── data/
    └── kansai-trip.json  # 关西行程数据
```

## 快速开始

### 1. 配置Google Maps API

**重要：地图功能需要Google Maps API密钥才能正常工作**

#### 获取API密钥：
1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 启用"Maps JavaScript API"
4. 创建API密钥
5. 配置域名限制（推荐）

#### 配置API密钥：
编辑 `js/config.js` 文件：

```javascript
const MAPS_CONFIG = {
    // 替换为你的API密钥
    API_KEY: 'AIza...你的真实密钥...',
    LIBRARIES: ['geometry'],
    ENABLE_MAPS: true
};
```

详细配置说明请查看 [SETUP.md](./SETUP.md)

### 2. 本地运行

```bash
# 由于CORS限制，需要通过HTTP服务器运行
# 使用Python 3
python -m http.server 8000

# 或使用Node.js
npx serve .

# 或使用PHP
php -S localhost:8000
```

访问 `http://localhost:8000/kansai_trip_map.html`（完整版）
或 `http://localhost:8000/index.html`（演示版）

### 3. 演示模式

如果暂时无法配置Google Maps API，可以使用演示模式：
- 打开 `index.html` - 时间轴功能完全可用
- 地图区域会显示占位符和配置提示

## 核心功能

### 时间轴交互
- ✅ 点击任意日期切换到对应行程
- ✅ 键盘导航支持（上下箭头键）
- ✅ 活动类型筛选
- ✅ 自动滚动到活跃日期

### 地图功能
- ✅ 自定义标记图标（景点、交通、美食、住宿）
- ✅ 路线绘制和动画效果
- ✅ 点击标记显示详细信息
- ✅ 地图控制按钮（重置、路线切换、交通显示）
- ✅ 响应式地图布局

### 数据展示
- ✅ 每日活动统计
- ✅ 距离计算
- ✅ 时间预估
- ✅ 天气信息显示

## 数据格式

### 行程数据结构

```json
{
  "tripInfo": {
    "title": "关西之旅",
    "dates": "2024-08-22 至 2024-08-31",
    "duration": "10天9晚",
    "cities": ["大阪", "和歌山", "白滨", "京都", "奈良"]
  },
  "days": [
    {
      "day": 1,
      "date": "2024-08-22",
      "title": "抵达日",
      "weather": "☀️",
      "activities": [
        {
          "time": "14:56",
          "type": "transport",
          "description": "抵达关西机场",
          "location": { "lat": 34.4347, "lng": 135.2441 },
          "icon": "✈️",
          "notes": "顺利抵达，准备开始关西之旅"
        }
      ],
      "accommodation": {
        "name": "和歌山城市酒店",
        "location": { "lat": 34.2261, "lng": 135.1675 }
      }
    }
  ]
}
```

### 活动类型

- `transport` - 交通出行 🚗
- `sightseeing` - 景点游览 ⛩️
- `food` - 美食体验 🍽️
- `accommodation` - 住宿休息 🏨
- `shopping` - 购物娱乐 🛍️
- `entertainment` - 娱乐活动 🎭

## 自定义开发

### 添加新的旅行数据

1. 在 `data/` 目录下创建新的JSON文件
2. 按照数据格式填写行程信息
3. 修改 `js/app.js` 中的数据源路径

### 扩展功能

- **照片集成**: 为每个活动添加照片展示
- **费用统计**: 记录和显示旅行花费
- **分享功能**: 生成分享链接或图片
- **离线支持**: 支持离线地图缓存
- **多语言**: 添加英文等其他语言支持

### 自定义样式

所有样式变量定义在 `css/main.css` 的 `:root` 中：

```css
:root {
    --primary-color: #667eea;
    --secondary-color: #764ba2;
    --accent-color: #ff6b6b;
    /* 修改这些变量来自定义主题色彩 */
}
```

## 浏览器兼容性

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+
- ✅ iOS Safari 12+
- ✅ Android Chrome 60+

## 开发说明

### 为什么选择原生JavaScript？

1. **性能优势** - 无框架包体积，加载速度快
2. **简单维护** - 代码结构清晰，容易理解和修改
3. **兼容性好** - 不依赖框架版本，适配性强
4. **学习成本低** - 无需掌握复杂的框架概念

### 架构设计

采用模块化的类设计：
- `TravelApp` - 主应用控制器
- `Timeline` - 时间轴组件
- `MapManager` - 地图管理器

每个组件职责单一，便于维护和扩展。

## 示例数据

当前包含完整的关西10日游数据：
- 📍 5个主要城市
- 🎯 60+ 个具体活动点
- 🏨 9晚住宿信息
- 📱 完整的GPS坐标数据

## 许可证

MIT License - 可自由使用和修改

## 贡献

欢迎提交Issue和Pull Request来改进这个项目！

---

**作者**: 基于真实关西旅行经历创建  
**更新**: 2024年8月
