# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

Since this is a pure frontend application using vanilla JavaScript, there are no build tools or package managers. Development is done by serving static files:

```bash
# Serve locally (choose one):
python -m http.server 8000
npx serve .
php -S localhost:8000

# Access the application:
# http://localhost:8000/index.html (demo version without Maps API)
```

## Architecture Overview

This is a **travel visualization web application** built with vanilla JavaScript that displays an interactive travel itinerary on Google Maps with a timeline interface.

### Core Architecture

The application uses a **three-tier component architecture**:

1. **TravelApp** (`js/app.js`) - Main application controller
   - Orchestrates all components and manages application state
   - Handles day navigation and progressive route rendering
   - Contains hardcoded route segments in `getRouteSegments()` method
   - Manages `renderedRoutes` Set to track which routes have been drawn
   - Provides debugging console functions: `showRoutesToDay()`, `nextDay()`, `prevDay()`, `getRouteStatus()`

2. **Timeline** (`js/timeline.js`) - Timeline sidebar component
   - Displays day-by-day itinerary with activity filtering
   - Emits events on day click and filter change

3. **MapManager** (`js/map/MapManager.js`) - Map orchestration layer
   - Delegates to specialized sub-managers:
     - **MarkerManager** (`js/map/MarkerManager.js`) - Manages map markers for activities
     - **RouteManager** (`js/map/RouteManager.js`) - Handles route drawing and animation
   - Provides unified interface for map operations
   - **Note**: Both `js/map.js` (legacy) and `js/map/MapManager.js` (modular) exist - the modular version in `js/map/` directory is the current architecture

### Key Architectural Patterns

**Progressive Route Rendering:**
- Routes are drawn incrementally as user navigates through days
- `TravelApp.addProgressiveRoutes(day)` builds cumulative routes from day 1 to current day
- Routes are deduped using unique IDs to prevent redrawing
- Supports backward navigation by clearing and rebuilding routes
- On day 10, automatically connects back to starting point (Kansai Airport) to form complete loop

**Dual-mode Operation:**
- **Full mode**: With Google Maps API for interactive mapping
- **Demo mode**: Timeline-only functionality when API is unavailable (automatic fallback)

**Configuration Management:**
- `js/config.js` handles Google Maps API configuration with environment detection
- Automatic fallback to demo mode if API key is missing/invalid
- `maps-loader.js`, `maps-loader-new.js`, `maps-loader-backup.js` are different implementations for loading Google Maps API

**Component Communication:**
- Callback-based event system
- `TravelApp` coordinates between `Timeline` and `MapManager`
- Bidirectional updates: timeline clicks update map, marker clicks update timeline

**Data-driven Design:**
- Single source of truth: `data/kansai-trip.json` contains 10-day Kansai trip with GPS coordinates
- Route definitions hardcoded in `TravelApp.getRouteSegments()` (58 route segments across 10 days)
- Each route segment specifies: day, start/end coordinates, color, label

## Google Maps API Setup

1. Get API key from Google Cloud Console (detailed steps in SETUP.md)
2. Configure in `js/config.js` by setting `MAPS_CONFIG.API_KEY`
3. Security: Always restrict API keys to specific domains in production

## Data Schema

`data/kansai-trip.json` structure:

```json
{
  "tripInfo": { "title": "...", "dates": "...", "cities": [...] },
  "days": [
    {
      "day": 1,
      "date": "2024-08-22",
      "activities": [
        {
          "time": "14:56",
          "type": "transport|sightseeing|food|accommodation",
          "description": "...",
          "location": { "lat": 34.4347, "lng": 135.2441 },
          "icon": "✈️"
        }
      ],
      "accommodation": {
        "name": "Hotel Name",
        "location": { "lat": 34.2307, "lng": 135.1733 }
      }
    }
  ]
}
```

Activity types: `transport`, `sightseeing`, `food`, `accommodation`

## File Organization

```text
travelView/
├── index.html              # Main HTML entry point (demo mode)
├── css/
│   ├── main.css           # Core styles with CSS custom properties
│   └── responsive.css     # Mobile/tablet responsive adaptations
├── js/
│   ├── app.js            # TravelApp - main controller (1100+ lines)
│   ├── timeline.js       # Timeline component with filtering
│   ├── config.js         # API configuration and environment detection
│   ├── maps-loader.js    # Google Maps API loading utilities (multiple versions exist)
│   ├── map.js            # LEGACY: Original monolithic MapManager
│   ├── map/              # CURRENT: Modular map architecture
│   │   ├── MapManager.js     # Map orchestration layer
│   │   ├── MarkerManager.js  # Marker management
│   │   ├── RouteManager.js   # Route drawing and animation
│   │   └── RouteManager_*.js # Backup/alternative implementations
│   └── utils/
│       └── MapUtils.js   # Map utility functions (center calculation, styles)
└── data/
    └── kansai-trip.json # 10-day Kansai trip data with GPS coordinates
```

**Important**: The codebase contains both legacy (`js/map.js`) and modular (`js/map/MapManager.js`) implementations. The modular version is the current architecture.

## Important Implementation Details

### Route Management System

The most complex part of the application is the progressive route rendering system:

**Route Data Location:**

- Routes are **hardcoded** in `TravelApp.getRouteSegments()` method (lines 472-661 in js/app.js)
- Returns array of 58 route segment objects with structure: `{ day, start, end, color, label }`
- This is separate from activity data in `kansai-trip.json`

**Route Rendering Logic:**

- Routes accumulate as user navigates: clicking day 5 shows routes from days 1-5
- Uses `renderedRoutes` Set (line 13) to track which routes have been drawn by unique ID
- Route ID format: `${day}-${start.lat}-${end.lat}` or custom like `"return-route"`
- Backward navigation (e.g., day 5 → day 3) clears all routes and rebuilds from scratch
- Day 10 automatically adds return route to Kansai Airport completing the loop

**Key Methods:**

- `showDay(day)` - Main navigation entry point
- `addProgressiveRoutes(upToDay)` - Core route rendering logic with deduplication
- `clearRoutesAfterDay(keepUpToDay)` - Handles backward navigation
- `addReturnRoute()` - Adds final segment to complete loop

### API Key Configuration

`js/config.js` provides environment detection:

- Production mode requires valid Google Maps API key in `MAPS_CONFIG.API_KEY` (line 10)
- Demo mode automatically activates when `window.DEMO_MODE = true` or no valid API key
- The config currently contains an actual API key that should be replaced/removed for security

### Data Contents

`data/kansai-trip.json` contains:

- 10 days of activities with GPS coordinates
- Activity types: transport, sightseeing, food, accommodation
- Weather and accommodation information per day
- **Note**: This data is separate from route segments which are in app.js

### Debugging Console Functions

`TravelApp` exposes these global functions for testing (lines 1030-1119):

- `showRoutesToDay(n)` - Jump to day n with progressive routes
- `nextDay()` / `prevDay()` - Navigate forward/backward
- `showCompleteRoute()` - Jump to day 10 with complete loop
- `clearRoutes()` - Clear all routes and reset state
- `getRouteStatus()` - View current rendering state

### Development Workflow

**No Build Process:** Pure vanilla JavaScript/CSS - edit files directly and refresh browser.

**Making Route Changes:** To add/modify routes, edit `getRouteSegments()` method in `js/app.js`

**API Key Security:** The repository contains a real API key in config.js - this should be removed before committing

**Error Handling:** Application gracefully degrades to demo mode if Maps API fails
