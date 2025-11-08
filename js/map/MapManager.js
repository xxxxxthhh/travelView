/**
 * MapManager - 地图管理器核心类
 * 负责地图初始化和各个管理器的协调
 */

class MapManager {
    constructor(options) {
        this.container = options.container;
        this.data = options.data;
        this.onMarkerClick = options.onMarkerClick || (() => {});
        
        this.map = null;
        this.markerManager = null;
        this.routeManager = null;
        this.filterType = 'all';
        
        this.init();
    }

    async init() {
        try {
            await this.checkGoogleMaps();
            this.initMap();
            this.initManagers();
            this.setupControls();
            this.fitMapToMarkers();
            console.log('🎯 地图初始化完成');
        } catch (error) {
            console.error('Failed to initialize map:', error);
            this.showPlaceholder();
        }
    }

    async checkGoogleMaps() {
        return new Promise((resolve, reject) => {
            if (typeof google !== 'undefined' && google.maps) {
                resolve();
                return;
            }

            // 检查是否正在加载
            let checkCount = 0;
            const checkInterval = setInterval(() => {
                checkCount++;
                if (typeof google !== 'undefined' && google.maps) {
                    clearInterval(checkInterval);
                    resolve();
                } else if (checkCount > 50) { // 5秒超时
                    clearInterval(checkInterval);
                    reject(new Error('Google Maps API not available'));
                }
            }, 100);
        });
    }

    initMap() {
        const mapElement = document.querySelector(this.container);
        if (!mapElement) {
            throw new Error('Map container not found');
        }

        // 计算地图中心点
        const center = MapUtils.calculateCenter(this.data);
        
        // 地图配置
        const mapOptions = {
            zoom: 8,
            center: center,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            // 使用标准 Google Maps 样式，注释掉自定义样式
            // styles: MapUtils.getMapStyles(),
            mapTypeControl: true,
            mapTypeControlOptions: {
                style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
                position: google.maps.ControlPosition.TOP_RIGHT
            },
            fullscreenControl: false,
            streetViewControl: true,
            zoomControl: true,
            zoomControlOptions: {
                position: google.maps.ControlPosition.RIGHT_CENTER
            }
        };

        this.map = new google.maps.Map(mapElement, mapOptions);
        
        console.log('🗺️ Map initialized successfully', {
            center: this.map.getCenter(),
            zoom: this.map.getZoom()
        });
    }

    initManagers() {
        // 初始化标记管理器
        this.markerManager = new MarkerManager(
            this.map, 
            this.data, 
            this.onMarkerClick
        );
        
        // 初始化路线管理器
        this.routeManager = new RouteManager(
            this.map, 
            this.data
        );

        console.log('🎯 Managers initialized');
    }

    setupControls() {
        // 这里可以添加自定义地图控件
        console.log('🎛️ Map controls setup complete');
    }

    // 显示指定天数
    showDay(day) {
        console.log(`🎯 Showing day ${day}`);
        
        if (this.markerManager) {
            this.markerManager.showDay(day);
        }
        
        // 可选：显示当天路线
        if (this.routeManager) {
            // this.routeManager.focusOnDayRoute(day);
        }
    }

    // 设置筛选器
    setFilter(filterType) {
        this.filterType = filterType;
        console.log(`🔍 Filter set to: ${filterType}`);
        
        if (this.markerManager) {
            this.markerManager.setFilter(filterType);
        }
    }

    // 聚焦到特定活动
    focusOnActivity(day, activityIndex) {
        console.log(`🎯 Focusing on activity: day ${day}, index ${activityIndex}`);
        
        if (this.markerManager) {
            this.markerManager.focusOnActivity(day, activityIndex);
        }
    }

    // 聚焦到当天路线
    focusOnDayRoute(day) {
        console.log(`🛣️ Focusing on route for day ${day}`);
        
        if (this.routeManager) {
            this.routeManager.focusOnDayRoute(day);
        }
    }

    // 切换路线显示
    toggleRoutes() {
        if (this.routeManager) {
            return this.routeManager.toggleRoutes();
        }
        return false;
    }

    // 切换交通状况
    toggleTraffic() {
        if (this.routeManager) {
            return this.routeManager.toggleTraffic();
        }
        return false;
    }

    // 切换详细程度
    toggleDetailLevel() {
        if (this.markerManager) {
            const isDetailed = this.markerManager.toggleDetailLevel();
            console.log(`🔍 Detail level: ${isDetailed ? 'detailed' : 'city'}`);
            return isDetailed;
        }
        return false;
    }

    // 适应地图到标记
    fitMapToMarkers() {
        if (this.markerManager) {
            this.markerManager.fitMapToMarkers();
        }
    }

    // 适应地图到路线
    fitMapToRoute() {
        if (this.routeManager) {
            this.routeManager.fitMapToRoute();
        }
    }

    // 清除所有路线
    clearAllRoutes() {
        if (this.routeManager) {
            this.routeManager.clearAllRoutes();
        }
    }

    // 清除所有标记
    clearAllMarkers() {
        if (this.markerManager) {
            this.markerManager.clearMarkers();
        }
    }

    // 添加自定义路线
    async addCustomRoute(start, end, options = {}) {
        console.log(`🗺️ MapManager.addCustomRoute 被调用:`, {
            start, end, options
        });
        
        if (this.routeManager) {
            // 将参数转换为 RouteManager 期望的格式
            const routeData = {
                start: start,
                end: end,
                color: options.color || '#667eea',
                label: options.label || 'Custom Route',
                day: options.day || 1
            };
            
            console.log(`🗺️ 调用 RouteManager.addCustomRoute:`, routeData);
            const result = await this.routeManager.addCustomRoute(routeData);
            console.log(`🗺️ RouteManager.addCustomRoute 返回结果:`, result);
            return result;
        } else {
            console.error(`🗺️ RouteManager 不存在，无法添加路线`);
            return null;
        }
    }

    // 重置视图
    resetView() {
        console.log('🔄 Resetting map view');
        
        const center = MapUtils.calculateCenter(this.data);
        this.map.setCenter(center);
        this.map.setZoom(8);
        
        if (this.markerManager) {
            this.markerManager.resetView();
        }
        
        // 关闭所有信息窗口
        if (this.markerManager && this.markerManager.infoWindow) {
            this.markerManager.infoWindow.close();
        }
        
        if (this.routeManager && this.routeManager.routeInfoWindow) {
            this.routeManager.routeInfoWindow.close();
        }
    }

    // 调整地图大小
    resize() {
        if (this.map) {
            google.maps.event.trigger(this.map, 'resize');
        }
    }

    // 显示占位符
    showPlaceholder() {
        const mapElement = document.querySelector(this.container);
        if (mapElement) {
            mapElement.innerHTML = `
                <div class="map-placeholder">
                    <div class="placeholder-content">
                        <div class="placeholder-icon">🗺️</div>
                        <div class="placeholder-title">地图加载失败</div>
                        <div class="placeholder-description">
                            无法加载Google Maps<br>
                            请检查网络连接和API配置
                        </div>
                    </div>
                </div>
            `;
        }
    }

    // 清理资源
    destroy() {
        console.log('🧹 Destroying MapManager');
        
        if (this.markerManager) {
            this.markerManager.destroy();
        }
        
        if (this.routeManager) {
            this.routeManager.destroy();
        }
        
        this.map = null;
    }

    // 获取当前标记（用于兼容性）
    get markers() {
        return this.markerManager ? this.markerManager.getAllMarkers() : [];
    }

    // 获取当前路线（用于兼容性）
    get routes() {
        return this.routeManager ? this.routeManager.routes : [];
    }

    // 切换地图样式
    toggleMapStyle() {
        if (!this.map) return;
        
        const currentStyles = this.map.get('styles');
        if (currentStyles && currentStyles.length > 0) {
            // 当前使用自定义样式，切换到标准样式
            this.map.setOptions({ styles: [] });
            console.log('🎨 切换到标准 Google Maps 样式');
            return 'standard';
        } else {
            // 当前使用标准样式，切换到自定义样式
            this.map.setOptions({ styles: MapUtils.getMapStyles() });
            console.log('🎨 切换到自定义地图样式');
            return 'custom';
        }
    }

    // 兼容性方法 - 切换详细级别
    toggleDetailLevel() {
        if (this.markerManager) {
            return this.markerManager.toggleDetailLevel();
        }
        return false;
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MapManager;
} else {
    window.MapManager = MapManager;
}