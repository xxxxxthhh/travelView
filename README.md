# Travel View - Interactive Travel Itinerary Visualization

[中文文档](./README.zh-CN.md) | English

An interactive travel itinerary visualization application built with Google Maps API. Features a timeline-based interface to explore and visualize travel routes. Includes a complete 10-day Kansai (Japan) trip as example data.

![Project Preview](https://img.shields.io/badge/Status-Active-success) ![License](https://img.shields.io/badge/License-MIT-blue) ![Vanilla JS](https://img.shields.io/badge/Vanilla-JS-yellow)

## ✨ Features

- 🗺️ **Interactive Map** - Integrated with Google Maps, multiple map styles supported
- 📅 **Timeline Navigation** - Day-by-day itinerary with quick date switching
- 🎯 **Smart Markers** - Color-coded markers for different activity types
- 📱 **Responsive Design** - Optimized for desktop, tablet, and mobile devices
- 🎨 **Modern UI** - Gradient colors, card design, and smooth animations
- 🔍 **Activity Filtering** - Filter by activity type (sightseeing, food, transport, accommodation)
- 📊 **Statistics** - Real-time activity stats and distance calculations
- 🛣️ **Progressive Route Rendering** - Routes accumulate as you navigate through days

## 🚀 Quick Start

### Prerequisites

- A Google Maps JavaScript API key (see [Setup Guide](./SETUP.md))
- A local web server (Python, Node.js, or PHP)

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/xxxxxthhh/travelView.git
cd travelView
```

2. **Configure Google Maps API**

```bash
# Copy the config template
cp js/config.js.example js/config.js

# Edit config.js and add your API key
# API_KEY: 'YOUR_GOOGLE_MAPS_API_KEY_HERE'
```

See [SETUP.md](./SETUP.md) for detailed API configuration instructions.

3. **Start local server**

```bash
# Python 3
python -m http.server 8000

# Or Node.js
npx serve .

# Or PHP
php -S localhost:8000
```

4. **Open in browser**

Visit `http://localhost:8000/index.html`

### Demo Mode

If you don't have a Google Maps API key yet, the app runs in demo mode with full timeline functionality. The map area shows a placeholder with setup instructions.

## 🏗️ Tech Stack

- **Frontend**: HTML5, CSS3 (Grid/Flexbox), Vanilla JavaScript (ES6+)
- **Map**: Google Maps JavaScript API
- **Design**: Responsive, mobile-first approach
- **Data**: JSON-based storage
- **Deployment**: GitHub Actions + GitHub Pages

## 📁 Project Structure

```text
travelView/
├── index.html              # Main entry point
├── css/
│   ├── main.css           # Core styles with CSS variables
│   └── responsive.css     # Responsive adaptations
├── js/
│   ├── app.js            # Main TravelApp controller
│   ├── timeline.js       # Timeline component
│   ├── config.js         # API configuration
│   ├── map/              # Modular map architecture
│   │   ├── MapManager.js     # Map orchestration
│   │   ├── MarkerManager.js  # Marker management
│   │   └── RouteManager.js   # Route drawing
│   └── utils/
│       └── MapUtils.js   # Map utilities
├── data/
│   └── kansai-trip.json  # 10-day Kansai trip data
└── .github/
    └── workflows/
        └── deploy.yml    # Automated deployment
```

## 🎯 Core Features

### Timeline Interaction

- ✅ Click any day to switch itinerary
- ✅ Keyboard navigation (arrow keys)
- ✅ Activity type filtering
- ✅ Auto-scroll to active date

### Map Functionality

- ✅ Custom marker icons (sightseeing, transport, food, accommodation)
- ✅ Route drawing with animations
- ✅ Click markers to view details
- ✅ Map controls (reset, route toggle, traffic layer)
- ✅ Progressive route rendering (routes accumulate day by day)

### Data Display

- ✅ Daily activity statistics
- ✅ Distance calculations
- ✅ Time estimates
- ✅ Weather information

## 📊 Data Format

Travel data is stored in JSON format (`data/kansai-trip.json`):

```json
{
  "tripInfo": {
    "title": "Kansai Journey",
    "dates": "2024-08-22 to 2024-08-31",
    "duration": "10 days 9 nights",
    "cities": ["Osaka", "Wakayama", "Shirahama", "Kyoto", "Nara"]
  },
  "days": [
    {
      "day": 1,
      "date": "2024-08-22",
      "title": "Arrival Day",
      "weather": "☀️",
      "activities": [
        {
          "time": "14:56",
          "type": "transport",
          "description": "Arrive at Kansai Airport",
          "location": { "lat": 34.4347, "lng": 135.2441 },
          "icon": "✈️"
        }
      ],
      "accommodation": {
        "name": "Wakayama City Hotel",
        "location": { "lat": 34.2261, "lng": 135.1675 }
      }
    }
  ]
}
```

### Activity Types

- `transport` - Transportation 🚗
- `sightseeing` - Sightseeing ⛩️
- `food` - Dining 🍽️
- `accommodation` - Lodging 🏨
- `shopping` - Shopping 🛍️
- `entertainment` - Entertainment 🎭

## 🚢 Deployment

Deploy to GitHub Pages with automated workflow:

```bash
# 1. Push to GitHub
git add .
git commit -m "Initial commit"
git push origin main

# 2. Configure GitHub Secrets
# Settings → Secrets → New secret
# Name: GOOGLE_MAPS_API_KEY
# Value: Your Google Maps API Key

# 3. Enable GitHub Pages
# Settings → Pages → Source: GitHub Actions
```

See [DEPLOY.md](./DEPLOY.md) for complete deployment guide.

## 🛠️ Customization

### Add Your Own Trip Data

1. Create a new JSON file in `data/` directory
2. Follow the data format structure
3. Update the data source path in `js/app.js`

### Customize Styles

All style variables are defined in `css/main.css`:

```css
:root {
    --primary-color: #667eea;
    --secondary-color: #764ba2;
    --accent-color: #ff6b6b;
    /* Modify these variables to customize theme */
}
```

### Extend Functionality

Potential enhancements:

- 📸 **Photo Integration** - Add photo gallery for each activity
- 💰 **Expense Tracking** - Record and display travel costs
- 🔗 **Share Feature** - Generate shareable links or images
- 📴 **Offline Support** - Cached map for offline use
- 🌐 **Multi-language** - i18n support

## 🌐 Browser Compatibility

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+
- ✅ iOS Safari 12+
- ✅ Android Chrome 60+

## 🏛️ Architecture Highlights

### Progressive Route Rendering System

The app features a sophisticated route rendering system:

- Routes accumulate as you navigate: clicking day 5 shows routes from days 1-5
- Smart deduplication prevents redrawing existing routes
- Backward navigation clears and rebuilds routes efficiently
- Day 10 automatically connects back to starting point forming a complete loop

See [CLAUDE.md](./CLAUDE.md) for detailed architecture documentation.

## 📝 Example Data

The project includes a complete 10-day Kansai trip:

- 📍 5 major cities
- 🎯 60+ activity points with GPS coordinates
- 🏨 9 nights of accommodation data
- 🛣️ 58 route segments with progressive rendering

## 📄 License

MIT License - Feel free to use and modify

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📚 Documentation

- [SETUP.md](./SETUP.md) - Google Maps API configuration guide
- [DEPLOY.md](./DEPLOY.md) - Deployment instructions
- [CLAUDE.md](./CLAUDE.md) - Code architecture and development guide
- [中文文档](./README.zh-CN.md) - Chinese documentation

## 💬 Support

If you have any questions or issues, please [open an issue](https://github.com/xxxxxthhh/travelView/issues).

---

**Created by**: Based on real Kansai travel experience
**Updated**: August 2024

**⭐ If you find this project helpful, please consider giving it a star!**
