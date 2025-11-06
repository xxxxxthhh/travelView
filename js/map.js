/**
 * 地图管理器 - 负责Google Maps的初始化和交互
 */

class MapManager {
    constructor(options) {
        this.container = options.container;
        this.data = options.data;
        this.onMarkerClick = options.onMarkerClick || (() => {});
        
        this.map = null;
        this.markers = [];
        this.routes = [];
        this.directionsService = null;
        this.directionsRenderers = [];
        this.infoWindow = null;
        this.filterType = 'all';
        this.showRoutes = true;
        this.showTraffic = false;
        this.showDetailedMarkers = false; // Start with clean city view
        
        this.init();
    }

    async init() {
        try {
            await this.checkGoogleMaps();
            this.initMap();
            this.addMarkers();
            console.log('🎯 地图初始化完成');
            this.setupControls();
            this.fitMapToMarkers();
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
        const center = this.calculateCenter();
        
        // 地图配置
        const mapOptions = {
            zoom: 8,
            center: center,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            styles: this.getMapStyles(),
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
        
        // 初始化Directions服务
        this.directionsService = new google.maps.DirectionsService();
        
        // 创建信息窗口
        this.infoWindow = new google.maps.InfoWindow();
        
        console.log('🗺️ Map initialized successfully', {
            center: this.map.getCenter(),
            zoom: this.map.getZoom()
        });
    }

    calculateCenter() {
        if (!this.data.days || this.data.days.length === 0) {
            // 默认中心点：关西地区
            return { lat: 34.6560, lng: 135.5060 };
        }

        let totalLat = 0;
        let totalLng = 0;
        let count = 0;

        this.data.days.forEach(day => {
            if (day.activities) {
                day.activities.forEach(activity => {
                    if (activity.location) {
                        totalLat += activity.location.lat;
                        totalLng += activity.location.lng;
                        count++;
                    }
                });
            }
            
            if (day.accommodation && day.accommodation.location) {
                totalLat += day.accommodation.location.lat;
                totalLng += day.accommodation.location.lng;
                count++;
            }
        });

        if (count === 0) {
            return { lat: 34.6560, lng: 135.5060 };
        }

        return {
            lat: totalLat / count,
            lng: totalLng / count
        };
    }

    addMarkers() {
        if (!this.data.days) return;

        // Add main city markers only for cleaner view
        this.addMainCityMarkers();
        
        // Optionally add detailed markers (can be toggled)
        if (this.showDetailedMarkers) {
            this.data.days.forEach(dayData => {
                this.addDayMarkers(dayData);
            });
        }
    }

    addMainCityMarkers() {
        console.log('🎯 Adding markers based on FINAL itinerary plan...');
        const mainLocations = [
            // D1: 关西机场→和歌山
            {
                name: "关西机场KIX",
                location: { lat: 34.4347, lng: 135.2441 },
                type: "transport",
                description: "D1: 14:56到达, D7/D10: 还车&出发",
                days: [1, 7, 10]
            },
            {
                name: "和歌山市区",
                location: { lat: 34.2261, lng: 135.1675 },
                type: "accommodation",
                description: "D1: 住宿+和歌山城夜景",
                days: [1]
            },
            // D2: 小玉电车→白滨
            {
                name: "贵志站(小玉站长)",
                location: { lat: 34.2133, lng: 135.3167 },
                type: "sightseeing", 
                description: "D2: 小玉电车+二代玉站长",
                days: [2]
            },
            {
                name: "白滨温泉区",
                location: { lat: 33.6917, lng: 135.3361 },
                type: "accommodation",
                description: "D2-D3: 白良滨海滩+崎の湯温泉+圆月岛",
                days: [2]
            },
            // D3: 串本→熊野→纪伊胜浦
            {
                name: "串本桥杭岩",
                location: { lat: 33.4708, lng: 135.7881 },
                type: "sightseeing",
                description: "D3: 本州最南端+日出摄影",
                days: [3]
            },
            {
                name: "熊野本宫大社",
                location: { lat: 33.8917, lng: 135.7744 },
                type: "sightseeing",
                description: "D3: 熊野古道徒步终点+大斋原",
                days: [3]
            },
            {
                name: "纪伊胜浦",
                location: { lat: 33.6333, lng: 135.9833 },
                type: "accommodation",
                description: "D3-D4: 金枪鱼之乡+浦岛洞穴温泉",
                days: [3, 4]
            },
            // D4: 那智瀑布→京都
            {
                name: "那智瀑布",
                location: { lat: 33.6686, lng: 135.8897 },
                type: "sightseeing",
                description: "D4: 日本三大名瀑+青岸渡寺",
                days: [4]
            },
            {
                name: "Minn 二条城京町家",
                location: { lat: 35.0115, lng: 135.7478 },
                type: "accommodation",
                description: "D4-D7: 古都文化体验基地",
                days: [4, 5, 6, 7]
            },
            // D5: 大原三千院→贵船
            {
                name: "大原三千院",
                location: { lat: 35.1200, lng: 135.7667 },
                type: "sightseeing",
                description: "D5: 天台宗名刹+苔庭",
                days: [5]
            },
            {
                name: "贵船神社",
                location: { lat: 35.1331, lng: 135.7644 },
                type: "sightseeing",
                description: "D5: 川床料理+水占卜+恋爱成就",
                days: [5]
            },
            // D6: 岚山一日游
            {
                name: "岚山竹林",
                location: { lat: 35.0169, lng: 135.6762 },
                type: "sightseeing",
                description: "D6: 嵯峨野小火车+竹林小径+天龙寺",
                days: [6]
            },
            // D7: 清水寺→伏见稻荷→还车→大阪
            {
                name: "清水寺",
                location: { lat: 34.9949, lng: 135.7850 },
                type: "sightseeing",
                description: "D7: 06:00晨拜+清水舞台",
                days: [7]
            },
            {
                name: "伏见稻荷大社",
                location: { lat: 34.9671, lng: 135.7727 },
                type: "sightseeing",
                description: "D7: 千本鸟居+登山体验",
                days: [7]
            },
            {
                name: "Apartment Hotel 11 Namba-Minami Ebisucho-Eki Mae",
                location: { lat: 34.6560, lng: 135.5060 },
                type: "accommodation",
                description: "D7-D10: 都市体验基地",
                days: [7, 8, 9, 10]
            },
            // D8: 环球影城
            {
                name: "大阪环球影城",
                location: { lat: 34.6653, lng: 135.4322 },
                type: "entertainment",
                description: "D8: 哈利波特+超级任天堂世界",
                days: [8]
            },
            // D9: 2025世博会
            {
                name: "2025世博会梦洲",
                location: { lat: 34.6500, lng: 135.4167 },
                type: "entertainment",
                description: "D9: 未来科技+国际展览",
                days: [9]
            },
            // D10: 大阪城→机场
            {
                name: "大阪城",
                location: { lat: 34.6873, lng: 135.5262 },
                type: "sightseeing",
                description: "D10: 最后巡礼+天守阁",
                days: [10]
            },
            {
                name: "黑门市场",
                location: { lat: 34.6638, lng: 135.5048 },
                type: "food",
                description: "D10: 最后美食体验+纪念品采购",
                days: [10]
            }
        ];

        mainLocations.forEach(location => {
            console.log(`📍 Creating marker for ${location.name}`, location.location);
            
            const marker = new google.maps.Marker({
                position: location.location,
                map: this.map,
                title: location.name,
                icon: {
                    ...this.getMarkerIcon(location.type),
                    scale: 14 // Appropriate size for main locations
                },
                animation: google.maps.Animation.DROP
            });

            // 设置筛选所需的属性
            marker.activityType = location.type;
            marker.locationType = location.type;

            // Add click event for location info
            marker.addListener('click', () => {
                this.showLocationInfo(marker, location);
            });

            this.markers.push(marker);
            console.log(`✅ Added marker for ${location.name}, type: ${location.type}`);
        });
        
        console.log(`🎯 Total markers created: ${this.markers.length}`);
    }

    showLocationInfo(marker, location) {
        const typeEmojis = {
            transport: '✈️',
            sightseeing: '⛩️',
            accommodation: '🏨',
            entertainment: '🎢',
            food: '🍽️'
        };

        const content = `
            <div style="padding: 15px; max-width: 300px;">
                <h3 style="margin: 0 0 12px 0; color: #333; font-size: 1.3em;">
                    ${typeEmojis[location.type] || '📍'} ${location.name}
                </h3>
                <div style="margin-bottom: 10px;">
                    <strong>活动:</strong> ${location.description}
                </div>
                <div style="margin-bottom: 10px;">
                    <strong>行程天数:</strong> 第${location.days.join('、')}天
                </div>
                <div style="margin-top: 12px; padding: 10px; background: #f8f9fa; border-radius: 8px; font-size: 0.9em; color: #666;">
                    点击左侧时间轴查看详细活动安排
                </div>
            </div>
        `;

        this.infoWindow.setContent(content);
        this.infoWindow.open(this.map, marker);
    }

    // 添加指定的路线段 - 供用户调用
    async addCustomRoute(startPoint, endPoint, options = {}) {
        const segment = {
            start: startPoint,
            end: endPoint,
            color: options.color || '#667eea',
            label: options.label || '自定义路线'
        };

        console.log(`🛣️ 开始绘制路线: ${segment.label}`);
        await this.drawRealRoute(segment);
    }

    // 批量添加多条路线
    async addMultipleRoutes(routeSegments) {
        for (const segment of routeSegments) {
            await this.addCustomRoute(segment.start, segment.end, segment);
            // 稍微延迟，避免API请求过于频繁
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    // 清除所有路线
    clearAllRoutes() {
        console.log('🧹 清除所有路线');
        
        // 清除DirectionsRenderer
        this.directionsRenderers.forEach(item => {
            item.renderer.setMap(null);
        });
        this.directionsRenderers = [];
        
        // 清除fallback路线和可点击路线
        this.routes.forEach(route => {
            route.setMap(null);
        });
        this.routes = [];

        // 清除路线信息窗口
        if (this.routeInfoWindow) {
            this.routeInfoWindow.close();
        }

        // 清除备选路线缓存
        this.alternativeRoutes = {};
    }

    addDayMarkers(dayData) {
        const dayNumber = dayData.day;
        
        // 添加活动标记
        if (dayData.activities) {
            dayData.activities.forEach((activity, index) => {
                if (activity.location) {
                    const marker = this.createActivityMarker(activity, dayNumber, index);
                    this.markers.push(marker);
                }
            });
        }
        
        // 添加住宿标记
        if (dayData.accommodation && dayData.accommodation.location) {
            const marker = this.createAccommodationMarker(dayData.accommodation, dayNumber);
            this.markers.push(marker);
        }
    }

    createActivityMarker(activity, day, activityIndex) {
        const marker = new google.maps.Marker({
            position: activity.location,
            map: this.map,
            title: activity.description,
            icon: this.getMarkerIcon(activity.type),
            animation: google.maps.Animation.DROP
        });

        // 添加点击事件
        marker.addListener('click', () => {
            this.showInfoWindow(marker, activity, day, activityIndex);
            this.onMarkerClick(day, activityIndex);
        });

        // 存储标记信息
        marker.activityType = activity.type;
        marker.day = day;
        marker.activityIndex = activityIndex;

        return marker;
    }

    createAccommodationMarker(accommodation, day) {
        const marker = new google.maps.Marker({
            position: accommodation.location,
            map: this.map,
            title: accommodation.name,
            icon: this.getMarkerIcon('accommodation'),
            animation: google.maps.Animation.DROP
        });

        marker.addListener('click', () => {
            this.showAccommodationInfo(marker, accommodation, day);
        });

        marker.activityType = 'accommodation';
        marker.day = day;

        return marker;
    }

    getMarkerIcon(type) {
        const icons = {
            transport: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#4ecdc4',
                fillOpacity: 1,
                strokeColor: 'white',
                strokeWeight: 3,
                scale: 12
            },
            sightseeing: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#ff6b6b',
                fillOpacity: 1,
                strokeColor: 'white',
                strokeWeight: 3,
                scale: 12
            },
            food: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#f9ca24',
                fillOpacity: 1,
                strokeColor: 'white',
                strokeWeight: 3,
                scale: 12
            },
            accommodation: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#45b7d1',
                fillOpacity: 1,
                strokeColor: 'white',
                strokeWeight: 3,
                scale: 12
            }
        };

        return icons[type] || icons.sightseeing;
    }

    showInfoWindow(marker, activity, day, activityIndex) {
        const content = `
            <div style="padding: 10px; max-width: 250px;">
                <h3 style="margin: 0 0 10px 0; color: #333; font-size: 1.1em;">
                    ${activity.icon || ''} ${activity.description}
                </h3>
                <div style="margin-bottom: 8px;">
                    <strong>时间:</strong> ${activity.time || '未指定'}
                </div>
                <div style="margin-bottom: 8px;">
                    <strong>类型:</strong> ${this.getTypeLabel(activity.type)}
                </div>
                <div style="margin-bottom: 8px;">
                    <strong>日期:</strong> 第${day}天
                </div>
                ${activity.notes ? `<div style="margin-top: 10px; font-style: italic; color: #666;">${activity.notes}</div>` : ''}
            </div>
        `;

        this.infoWindow.setContent(content);
        this.infoWindow.open(this.map, marker);
    }

    showAccommodationInfo(marker, accommodation, day) {
        const content = `
            <div style="padding: 10px; max-width: 250px;">
                <h3 style="margin: 0 0 10px 0; color: #333; font-size: 1.1em;">
                    🏨 ${accommodation.name}
                </h3>
                <div style="margin-bottom: 8px;">
                    <strong>日期:</strong> 第${day}天
                </div>
                ${accommodation.address ? `<div style="margin-bottom: 8px;"><strong>地址:</strong> ${accommodation.address}</div>` : ''}
                ${accommodation.rating ? `<div style="margin-bottom: 8px;"><strong>评分:</strong> ${'⭐'.repeat(accommodation.rating)}</div>` : ''}
            </div>
        `;

        this.infoWindow.setContent(content);
        this.infoWindow.open(this.map, marker);
    }


    async drawRealRoute(segment) {
        return new Promise((resolve, reject) => {
            // 保留实时交通数据 - 用于显示准确的时间信息
            const useTrafficData = true;
            
            const request = {
                origin: segment.start,
                destination: segment.end,
                travelMode: google.maps.TravelMode.DRIVING,
                avoidHighways: true,  // 优先使用国道，避免高速公路
                avoidTolls: true,     // 避免收费道路
                region: 'JP'          // 指定日本地区
            };
            
            // 添加实时交通数据以获取准确时间
            if (useTrafficData) {
                request.drivingOptions = {
                    departureTime: new Date(),
                    trafficModel: google.maps.TrafficModel.BEST_GUESS
                };
            }

            this.directionsService.route(request, (result, status) => {
                if (status === 'OK') {
                    console.log(`✅ 路线绘制成功: ${segment.label}`);
                    
                    // 创建DirectionsRenderer来显示路线
                    const directionsRenderer = new google.maps.DirectionsRenderer({
                        map: this.map,
                        directions: result,
                        suppressMarkers: true, // 不显示默认的起点终点标记
                        preserveViewport: true, // 不自动调整视图
                        polylineOptions: {
                            strokeColor: segment.color,
                            strokeWeight: 4,
                            strokeOpacity: 0.8,
                            zIndex: 100
                        }
                    });

                    // 为路线添加点击事件
                    this.addRouteClickHandler(directionsRenderer, segment, result);

                    // 存储renderer以便后续控制
                    this.directionsRenderers.push({
                        renderer: directionsRenderer,
                        segment: segment,
                        result: result,
                        isPrimary: true
                    });

                    // 添加路线信息到控制台
                    this.addRouteInfo(result, segment);
                    
                    resolve(result);
                } else {
                    console.warn(`⚠️ 国道路线不可用，尝试常规路线: ${segment.label}, Status: ${status}`);
                    // 如果避开高速公路失败，尝试常规路线
                    this.drawFallbackRoute(segment, resolve);
                }
            });
        });
    }

    // 为路线添加点击事件处理器
    addRouteClickHandler(directionsRenderer, segment, result) {
        const polyline = directionsRenderer.getDirections().routes[0].overview_polyline;
        
        // 监听路线点击事件
        google.maps.event.addListener(directionsRenderer, 'click', (event) => {
            this.showRouteOptions(event.latLng, segment, result);
        });

        // 由于DirectionsRenderer不直接支持click事件，我们需要创建一个透明的可点击路线
        const clickablePath = new google.maps.Polyline({
            path: google.maps.geometry.encoding.decodePath(result.routes[0].overview_polyline),
            strokeColor: 'transparent',
            strokeWeight: 15, // 更宽的点击区域
            map: this.map,
            zIndex: 200
        });

        clickablePath.addListener('click', (event) => {
            this.showRouteOptions(event.latLng, segment, result);
        });

        // 将可点击路线也存储起来
        this.routes.push(clickablePath);
    }

    // 显示路线选项和时间信息
    async showRouteOptions(clickPosition, segment, primaryResult) {
        const leg = primaryResult.routes[0].legs[0];
        
        // 获取备选路线（允许高速公路）
        const alternativeResult = await this.getAlternativeRoute(segment);
        
        let content = `
            <div style="padding: 15px; max-width: 350px; font-family: 'Microsoft YaHei', '微软雅黑', 'Segoe UI', sans-serif;">
                <h3 style="margin: 0 0 15px 0; color: #1a1a1a; font-size: 1.2em; font-weight: bold; display: flex; align-items: center;">
                    🛣️ ${segment.label}
                </h3>
                
                <div style="background: #ffffff; padding: 12px; border-radius: 8px; margin-bottom: 15px; border: 2px solid #e8f5e8;">
                    <div style="font-weight: bold; color: #155724; margin-bottom: 8px; font-size: 1.1em;">
                        📍 当前路线 (国道优先)
                    </div>
                    <div style="margin-bottom: 5px; color: #2c2c2c;">
                        📏 距离: <strong style="color: #1a1a1a;">${leg.distance.text}</strong>
                    </div>
                    <div style="margin-bottom: 5px; color: #2c2c2c;">
                        ⏱️ 预估时间: <strong style="color: #1a1a1a;">${leg.duration.text}</strong>
                    </div>
                    ${leg.duration_in_traffic ? `
                        <div style="margin-bottom: 5px; color: #2c2c2c;">
                            🚦 实时时间: <strong style="color: ${this.getTrafficColor(leg.duration_in_traffic.value, leg.duration.value)}">${leg.duration_in_traffic.text}</strong>
                        </div>
                    ` : ''}
                </div>
        `;

        // 如果有备选路线，显示比较信息
        if (alternativeResult) {
            const altLeg = alternativeResult.routes[0].legs[0];
            const timeDiff = leg.duration.value - altLeg.duration.value;
            const distanceDiff = leg.distance.value - altLeg.distance.value;
            
            content += `
                <div style="background: #fffbf0; padding: 12px; border-radius: 8px; margin-bottom: 15px; border: 2px solid #ffd700;">
                    <div style="font-weight: bold; color: #b8860b; margin-bottom: 8px; font-size: 1.1em;">
                        🏎️ 备选路线 (含高速公路)
                    </div>
                    <div style="margin-bottom: 5px; color: #2c2c2c;">
                        📏 距离: <strong style="color: #1a1a1a;">${altLeg.distance.text}</strong> 
                        <span style="color: ${distanceDiff > 0 ? '#156d2a' : '#cc1f1f'}; font-size: 0.9em; font-weight: bold;">
                            (${distanceDiff > 0 ? '-' : '+'}${Math.abs(distanceDiff/1000).toFixed(1)}km)
                        </span>
                    </div>
                    <div style="margin-bottom: 5px; color: #2c2c2c;">
                        ⏱️ 预估时间: <strong style="color: #1a1a1a;">${altLeg.duration.text}</strong>
                        <span style="color: ${timeDiff > 0 ? '#156d2a' : '#cc1f1f'}; font-size: 0.9em; font-weight: bold;">
                            (${timeDiff > 0 ? '-' : '+'}${Math.abs(timeDiff/60).toFixed(0)}分钟)
                        </span>
                    </div>
                    ${altLeg.duration_in_traffic ? `
                        <div style="margin-bottom: 10px; color: #2c2c2c;">
                            🚦 实时时间: <strong style="color: ${this.getTrafficColor(altLeg.duration_in_traffic.value, altLeg.duration.value)}">${altLeg.duration_in_traffic.text}</strong>
                        </div>
                    ` : ''}
                    <button onclick="window.travelApp.mapManager.switchToAlternativeRoute('${segment.label}')" 
                            style="background: #1a73e8; color: white; border: none; padding: 10px 18px; border-radius: 6px; cursor: pointer; font-size: 1em; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                        切换到此路线
                    </button>
                </div>
            `;
        }

        content += `
                <div style="text-align: center; margin-top: 15px;">
                    <div style="font-size: 0.9em; color: #4a4a4a; background: #f5f5f5; padding: 8px; border-radius: 5px;">
                        💡 点击路线可查看详细信息和备选方案
                    </div>
                </div>
            </div>
        `;

        // 显示信息窗口
        if (!this.routeInfoWindow) {
            this.routeInfoWindow = new google.maps.InfoWindow();
        }
        
        this.routeInfoWindow.setContent(content);
        this.routeInfoWindow.setPosition(clickPosition);
        this.routeInfoWindow.open(this.map);

        // 存储备选路线结果以便切换
        this.alternativeRoutes = this.alternativeRoutes || {};
        this.alternativeRoutes[segment.label] = alternativeResult;
    }

    // 获取备选路线
    async getAlternativeRoute(segment) {
        return new Promise((resolve) => {
            const alternativeRequest = {
                origin: segment.start,
                destination: segment.end,
                travelMode: google.maps.TravelMode.DRIVING,
                avoidHighways: false,  // 允许使用高速公路
                avoidTolls: false,     // 允许收费道路
                region: 'JP',
                drivingOptions: {
                    departureTime: new Date(),
                    trafficModel: google.maps.TrafficModel.BEST_GUESS
                }
            };

            this.directionsService.route(alternativeRequest, (result, status) => {
                if (status === 'OK') {
                    resolve(result);
                } else {
                    console.warn(`⚠️ 无法获取备选路线: ${segment.label}`);
                    resolve(null);
                }
            });
        });
    }

    // 切换到备选路线
    switchToAlternativeRoute(segmentLabel) {
        const alternativeResult = this.alternativeRoutes[segmentLabel];
        if (!alternativeResult) return;

        // 找到原路线
        const originalIndex = this.directionsRenderers.findIndex(
            item => item.segment.label === segmentLabel && item.isPrimary
        );
        
        if (originalIndex === -1) return;

        const originalItem = this.directionsRenderers[originalIndex];
        
        // 隐藏原路线
        originalItem.renderer.setMap(null);
        
        // 创建新的备选路线renderer
        const alternativeRenderer = new google.maps.DirectionsRenderer({
            map: this.map,
            directions: alternativeResult,
            suppressMarkers: true,
            preserveViewport: true,
            polylineOptions: {
                strokeColor: originalItem.segment.color,
                strokeWeight: 4,
                strokeOpacity: 0.8,
                strokeDashArray: '10,5', // 虚线表示高速路线
                zIndex: 100
            }
        });

        // 添加点击事件
        this.addRouteClickHandler(alternativeRenderer, originalItem.segment, alternativeResult);

        // 替换路线
        this.directionsRenderers[originalIndex] = {
            renderer: alternativeRenderer,
            segment: originalItem.segment,
            result: alternativeResult,
            isPrimary: false,
            isAlternative: true
        };

        // 关闭信息窗口
        if (this.routeInfoWindow) {
            this.routeInfoWindow.close();
        }

        console.log(`🔄 已切换到备选路线: ${segmentLabel}`);
    }

    // 根据交通状况返回颜色
    getTrafficColor(trafficTime, normalTime) {
        const ratio = trafficTime / normalTime;
        if (ratio < 1.1) return '#0f7b0f'; // 深绿色 - 畅通
        if (ratio < 1.3) return '#cc8500'; // 深橙色 - 缓慢
        return '#c62d42'; // 深红色 - 拥堵
    }

    drawFallbackRoute(segment, resolve) {
        const fallbackRequest = {
            origin: segment.start,
            destination: segment.end,
            travelMode: google.maps.TravelMode.DRIVING,
            avoidHighways: false,  // 允许使用高速公路
            avoidTolls: false,     // 允许收费道路
            region: 'JP',
            drivingOptions: {
                departureTime: new Date(),
                trafficModel: google.maps.TrafficModel.BEST_GUESS
            }
        };

        this.directionsService.route(fallbackRequest, (result, status) => {
            if (status === 'OK') {
                console.log(`✅ 常规路线绘制成功: ${segment.label}`);
                
                const directionsRenderer = new google.maps.DirectionsRenderer({
                    map: this.map,
                    directions: result,
                    suppressMarkers: true,
                    preserveViewport: true,
                    polylineOptions: {
                        strokeColor: segment.color,
                        strokeWeight: 3,
                        strokeOpacity: 0.6,
                        strokeDashArray: '10,5', // 虚线表示使用了高速公路
                        zIndex: 90
                    }
                });

                // 为fallback路线也添加点击事件
                this.addRouteClickHandler(directionsRenderer, segment, result);

                this.directionsRenderers.push({
                    renderer: directionsRenderer,
                    segment: segment,
                    result: result,
                    isFallback: true
                });

                this.addRouteInfo(result, segment, true);
                resolve(result);
            } else {
                console.error(`❌ 所有路线绘制失败: ${segment.label}, Status: ${status}`);
                // 最后的回退选项：简单直线
                this.drawFallbackLine(segment);
                resolve(null);
            }
        });
    }

    drawFallbackLine(segment) {
        console.log(`🔄 使用直线连接: ${segment.label}`);
        
        const fallbackLine = new google.maps.Polyline({
            path: [segment.start, segment.end],
            geodesic: true,
            strokeColor: segment.color,
            strokeOpacity: 0.6,
            strokeWeight: 3,
            map: this.map
        });

        this.routes.push(fallbackLine);
    }

    addRouteInfo(directionsResult, segment, isFallback = false) {
        const route = directionsResult.routes[0];
        const leg = route.legs[0];
        
        const routeType = isFallback ? '(含高速公路)' : '(国道优先)';
        console.log(`📊 ${segment.label} ${routeType}:`);
        console.log(`   距离: ${leg.distance.text}`);
        console.log(`   时间: ${leg.duration.text}`);
        if (leg.duration_in_traffic) {
            console.log(`   实时交通时间: ${leg.duration_in_traffic.text}`);
        }
        
        // 检查路线中的道路类型
        const steps = leg.steps;
        const hasHighways = steps.some(step => 
            step.instructions.toLowerCase().includes('高速') || 
            step.instructions.toLowerCase().includes('expressway')
        );
        
        if (hasHighways && !isFallback) {
            console.log(`   ⚠️ 注意: 此路线可能包含部分高速公路`);
        }
    }

    // 切换路线显示/隐藏
    toggleRoutes() {
        this.showRoutes = !this.showRoutes;
        console.log(`🛤️ 路线显示: ${this.showRoutes ? '开启' : '关闭'}`);
        
        // 控制DirectionsRenderer的显示
        this.directionsRenderers.forEach(item => {
            item.renderer.setMap(this.showRoutes ? this.map : null);
        });
        
        // 控制fallback线条的显示
        this.routes.forEach(route => {
            route.setMap(this.showRoutes ? this.map : null);
        });
    }

    fitMapToMarkers() {
        // Create bounds to fit all marker locations
        const bounds = new google.maps.LatLngBounds();
        
        // Include all marker positions
        this.markers.forEach(marker => {
            bounds.extend(marker.getPosition());
        });

        // Fit the map to show all markers
        if (this.markers.length > 0) {
            this.map.fitBounds(bounds);
            
            // Add some padding and limit zoom for better view
            setTimeout(() => {
                const zoom = this.map.getZoom();
                if (zoom > 9) {
                    this.map.setZoom(9);
                }
            }, 100);
        }
    }

    fitMapToRoute() {
        // Create bounds to fit all locations
        const bounds = new google.maps.LatLngBounds();
        
        // Include all activity locations
        this.data.days.forEach(day => {
            if (day.activities) {
                day.activities.forEach(activity => {
                    if (activity.location) {
                        bounds.extend(activity.location);
                    }
                });
            }
            if (day.accommodation && day.accommodation.location) {
                bounds.extend(day.accommodation.location);
            }
        });

        // Fit the map to show all points
        this.map.fitBounds(bounds);
        
        // Add some padding and limit zoom
        setTimeout(() => {
            const zoom = this.map.getZoom();
            if (zoom > 10) {
                this.map.setZoom(10);
            }
        }, 100);
    }

    getDayColor(day) {
        const colors = [
            '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7',
            '#fd79a8', '#00b894', '#0984e3', '#fdcb6e', '#6c5ce7'
        ];
        return colors[(day - 1) % colors.length];
    }

    getTypeLabel(type) {
        const labels = {
            transport: '交通',
            sightseeing: '景点',
            food: '美食',
            accommodation: '住宿',
            shopping: '购物',
            entertainment: '娱乐'
        };
        return labels[type] || '其他';
    }

    showDay(day) {
        if (!this.data.days) return;

        const dayData = this.data.days.find(d => d.day === day);
        if (!dayData) return;

        // 收集该天的所有位置
        const bounds = new google.maps.LatLngBounds();
        let hasLocations = false;

        // 高亮该天的标记
        this.markers.forEach(marker => {
            if (marker.day === day) {
                marker.setAnimation(google.maps.Animation.BOUNCE);
                setTimeout(() => marker.setAnimation(null), 2000);
                
                bounds.extend(marker.getPosition());
                hasLocations = true;
            }
        });

        // 调整地图视图
        if (hasLocations) {
            this.map.fitBounds(bounds);
            
            // 确保不会过度缩放
            const listener = google.maps.event.addListener(this.map, 'bounds_changed', () => {
                if (this.map.getZoom() > 15) {
                    this.map.setZoom(15);
                }
                google.maps.event.removeListener(listener);
            });
        }
    }

    setFilter(filterType) {
        this.filterType = filterType;
        console.log(`🔍 设置筛选器: ${filterType}`);
        
        let visibleCount = 0;
        this.markers.forEach(marker => {
            const shouldShow = filterType === 'all' || marker.activityType === filterType;
            marker.setVisible(shouldShow);
            if (shouldShow) visibleCount++;
            
            if (filterType !== 'all') {
                console.log(`标记类型: ${marker.activityType}, 筛选类型: ${filterType}, 显示: ${shouldShow}`);
            }
        });
        
        console.log(`🎯 显示标记数量: ${visibleCount}/${this.markers.length}`);
    }

    focusOnActivity(day, activityIndex) {
        const marker = this.markers.find(m => 
            m.day === day && m.activityIndex === activityIndex
        );
        
        if (marker) {
            this.map.setCenter(marker.getPosition());
            this.map.setZoom(16);
            
            // 显示信息窗口
            google.maps.event.trigger(marker, 'click');
        }
    }

    // 聚焦到指定天数路线的起点并调整视野以展示整条路线
    focusOnDayRoute(day) {
        if (!this.data || !this.data.days) return;
        
        const dayData = this.data.days.find(d => d.day === day);
        if (!dayData || !dayData.activities || dayData.activities.length === 0) return;
        
        // 收集当天所有有位置信息的活动
        const locationsWithCoords = dayData.activities.filter(activity => 
            activity.location && activity.location.lat && activity.location.lng
        );
        
        // 如果有住宿信息，也包含进来
        if (dayData.accommodation && dayData.accommodation.location && 
            dayData.accommodation.location.lat && dayData.accommodation.location.lng) {
            locationsWithCoords.push({
                location: dayData.accommodation.location,
                description: `住宿：${dayData.accommodation.name}`
            });
        }
        
        if (locationsWithCoords.length === 0) return;
        
        if (locationsWithCoords.length === 1) {
            // 只有一个位置，聚焦到该位置
            const singleLocation = locationsWithCoords[0];
            const point = new google.maps.LatLng(
                singleLocation.location.lat, 
                singleLocation.location.lng
            );
            this.map.panTo(point);
            this.map.setZoom(14);
        } else {
            // 多个位置，创建边界框来包含所有位置
            const bounds = new google.maps.LatLngBounds();
            
            locationsWithCoords.forEach(location => {
                bounds.extend(new google.maps.LatLng(
                    location.location.lat, 
                    location.location.lng
                ));
            });
            
            // 调整地图视野以适应所有位置
            this.map.fitBounds(bounds, {
                top: 50,    // 顶部留白
                right: 50,  // 右侧留白
                bottom: 50, // 底部留白
                left: 50    // 左侧留白
            });
        }
        
        // 找到第一个活动的标记并高亮显示
        const firstActivity = dayData.activities.find(activity => 
            activity.location && activity.location.lat && activity.location.lng
        );
        
        if (firstActivity) {
            const startMarker = this.markers.find(m => 
                m.day === day && m.activityIndex === 0
            );
            
            if (startMarker) {
                // 延迟显示信息窗口，让地图移动动画完成
                setTimeout(() => {
                    if (this.infoWindow) {
                        this.infoWindow.close();
                    }
                    google.maps.event.trigger(startMarker, 'click');
                }, 800); // 稍微增加延迟，让fitBounds动画完成
            }
        }
        
        console.log(`🎯 地图调整视野展示第${day}天完整路线，包含${locationsWithCoords.length}个位置`);
    }


    toggleTraffic() {
        this.showTraffic = !this.showTraffic;
        
        if (!this.trafficLayer) {
            this.trafficLayer = new google.maps.TrafficLayer();
        }
        
        this.trafficLayer.setMap(this.showTraffic ? this.map : null);
    }

    toggleDetailLevel() {
        this.showDetailedMarkers = !this.showDetailedMarkers;
        
        // Clear existing markers
        this.markers.forEach(marker => marker.setMap(null));
        this.markers = [];
        
        // Re-add markers with new detail level
        this.addMarkers();
        
        return this.showDetailedMarkers;
    }

    resetView() {
        this.fitMapToMarkers();
        
        // 关闭信息窗口
        if (this.infoWindow) {
            this.infoWindow.close();
        }
    }

    resize() {
        if (this.map) {
            google.maps.event.trigger(this.map, 'resize');
        }
    }

    setupControls() {
        // 地图样式控制可以在这里添加
        // 例如：切换不同的地图主题
    }

    getMapStyles() {
        // 自定义地图样式
        return [
            {
                featureType: 'water',
                elementType: 'geometry',
                stylers: [{ color: '#e9e9e9' }, { lightness: 17 }]
            },
            {
                featureType: 'landscape',
                elementType: 'geometry',
                stylers: [{ color: '#f5f5f5' }, { lightness: 20 }]
            },
            {
                featureType: 'road.highway',
                elementType: 'geometry.fill',
                stylers: [{ color: '#ffffff' }, { lightness: 17 }]
            },
            {
                featureType: 'road.highway',
                elementType: 'geometry.stroke',
                stylers: [{ color: '#ffffff' }, { lightness: 29 }, { weight: 0.2 }]
            },
            {
                featureType: 'road.arterial',
                elementType: 'geometry',
                stylers: [{ color: '#ffffff' }, { lightness: 18 }]
            },
            {
                featureType: 'road.local',
                elementType: 'geometry',
                stylers: [{ color: '#ffffff' }, { lightness: 16 }]
            },
            {
                featureType: 'poi',
                elementType: 'geometry',
                stylers: [{ color: '#f5f5f5' }, { lightness: 21 }]
            }
        ];
    }

    showPlaceholder() {
        const container = document.querySelector(this.container);
        if (container) {
            container.innerHTML = `
                <div class="map-placeholder">
                    <div class="placeholder-content">
                        <div class="placeholder-icon">🗺️</div>
                        <div class="placeholder-title">地图加载失败</div>
                        <div class="placeholder-description">
                            请检查网络连接或Google Maps API配置
                        </div>
                    </div>
                </div>
            `;
        }
    }

    destroy() {
        // 清理标记
        this.markers.forEach(marker => marker.setMap(null));
        this.markers = [];
        
        // 清理DirectionsRenderer
        this.directionsRenderers.forEach(item => {
            item.renderer.setMap(null);
        });
        this.directionsRenderers = [];
        
        // 清理fallback路线和可点击路线
        this.routes.forEach(route => route.setMap(null));
        this.routes = [];
        
        // 清理信息窗口
        if (this.infoWindow) {
            this.infoWindow.close();
        }
        
        // 清理路线信息窗口
        if (this.routeInfoWindow) {
            this.routeInfoWindow.close();
        }
        
        // 清理备选路线缓存
        this.alternativeRoutes = {};
        
        this.map = null;
    }
}

// 导出组件
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MapManager;
} else {
    window.MapManager = MapManager;
}
