/**
 * RouteManager - 负责地图路线的绘制和管理
 */

class RouteManager {
    constructor(map, data) {
        this.map = map;
        this.data = data;
        
        this.directionsService = null;
        this.directionsRenderers = [];
        this.routes = [];
        this.showRoutes = true;
        this.trafficLayer = null;
        this.showTraffic = false;
        
        // 高级交互功能
        this.routeInfoWindow = null;
        this.alternativeRoutes = {};
        
        this.init();
    }

    init() {
        this.directionsService = new google.maps.DirectionsService();
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
                    
                    const renderer = new google.maps.DirectionsRenderer({
                        directions: result,
                        routeIndex: 0,
                        polylineOptions: {
                            strokeColor: segment.color,
                            strokeWeight: 4,
                            strokeOpacity: 0.8,
                            zIndex: 1  // 降低z-index，确保在UI下方
                        },
                        suppressMarkers: true,
                        preserveViewport: true
                    });

                    renderer.setMap(this.map);
                    this.directionsRenderers.push({
                        renderer: renderer,
                        segment: segment,
                        result: result,
                        isPrimary: true
                    });

                    // 添加路线信息
                    this.addRouteInfo(result, segment);
                    
                    // 添加路线点击处理
                    this.addRouteClickHandler(renderer, segment, result);
                    
                    resolve();
                } else {
                    console.warn(`⚠️ 国道路线不可用，尝试常规路线: ${segment.label}, Status: ${status}`);
                    this.drawFallbackRoute(segment, resolve);
                }
            });
        });
    }

    addRouteClickHandler(directionsRenderer, segment, result) {
        // 创建透明的可点击路线以增强点击区域
        const clickablePath = new google.maps.Polyline({
            path: google.maps.geometry.encoding.decodePath(result.routes[0].overview_polyline),
            strokeColor: 'transparent',
            strokeWeight: 15, // 更宽的点击区域
            map: this.map,
            zIndex: 2  // 稍高一点用于点击检测，但仍在UI下方
        });

        clickablePath.addListener('click', (event) => {
            this.showRouteOptions(event.latLng, segment, result);
        });

        // 存储可点击路线
        this.routes.push(clickablePath);
    }

    // 显示路线选项和交互信息 - 只显示主路线，备选路线需要点击按钮才显示
    async showRouteOptions(clickPosition, segment, primaryResult) {
        const leg = primaryResult.routes[0].legs[0];
        
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
                
                <div style="text-align: center; margin-bottom: 15px;">
                    <button onclick="window.travelApp.mapManager.routeManager.showAlternativeRoute('${segment.label}', this)" 
                            style="background: #ff6b6b; color: white; border: none; padding: 10px 18px; border-radius: 6px; cursor: pointer; font-size: 1em; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                        🔍 查看备选路线
                    </button>
                </div>
                
                <div id="alternative-route-${segment.label}" style="display: none;"></div>
                
                <div style="text-align: center; margin-top: 15px;">
                    <div style="font-size: 0.9em; color: #4a4a4a; background: #f5f5f5; padding: 8px; border-radius: 5px;">
                        💡 点击"查看备选路线"按钮获取高速公路路线
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
    }

    // 显示备选路线 - 点击时触发
    async showAlternativeRoute(segmentLabel, buttonElement) {
        // 更改按钮状态
        buttonElement.innerHTML = '⏳ 正在获取备选路线...';
        buttonElement.disabled = true;
        
        // 查找对应的segment
        const segment = this.findSegmentByLabel(segmentLabel);
        if (!segment) {
            console.error('无法找到路线段:', segmentLabel);
            return;
        }
        
        try {
            // 获取备选路线
            const alternativeResult = await this.getAlternativeRoute(segment);
            
            if (alternativeResult) {
                // 获取原始路线信息（需要重新计算）
                const primaryResult = await this.getPrimaryRoute(segment);
                const leg = primaryResult.routes[0].legs[0];
                const altLeg = alternativeResult.routes[0].legs[0];
                const timeDiff = leg.duration.value - altLeg.duration.value;
                const distanceDiff = leg.distance.value - altLeg.distance.value;
                
                // 生成备选路线HTML
                const alternativeContent = `
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
                        <button onclick="window.travelApp.mapManager.routeManager.switchToAlternativeRoute('${segment.label}')" 
                                style="background: #1a73e8; color: white; border: none; padding: 10px 18px; border-radius: 6px; cursor: pointer; font-size: 1em; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                            切换到此路线
                        </button>
                    </div>
                `;
                
                // 显示备选路线内容
                const alternativeDiv = document.getElementById(`alternative-route-${segmentLabel}`);
                if (alternativeDiv) {
                    alternativeDiv.innerHTML = alternativeContent;
                    alternativeDiv.style.display = 'block';
                }
                
                // 存储备选路线结果
                this.alternativeRoutes = this.alternativeRoutes || {};
                this.alternativeRoutes[segment.label] = alternativeResult;
                
                // 隐藏按钮
                buttonElement.style.display = 'none';
            } else {
                buttonElement.innerHTML = '❌ 无法获取备选路线';
                buttonElement.disabled = true;
            }
        } catch (error) {
            console.error('获取备选路线失败:', error);
            buttonElement.innerHTML = '❌ 获取失败';
            buttonElement.disabled = true;
        }
    }
    
    // 查找路线段
    findSegmentByLabel(label) {
        if (!this.data || !this.data.routes) return null;
        
        for (const route of this.data.routes) {
            if (route.label === label) {
                return route;
            }
        }
        return null;
    }
    
    // 获取主路线（国道优先）
    async getPrimaryRoute(segment) {
        return new Promise((resolve, reject) => {
            const request = {
                origin: segment.start,
                destination: segment.end,
                travelMode: google.maps.TravelMode.DRIVING,
                avoidHighways: true,
                avoidTolls: true,
                region: 'JP',
                drivingOptions: {
                    departureTime: new Date(),
                    trafficModel: google.maps.TrafficModel.BEST_GUESS
                }
            };

            this.directionsService.route(request, (result, status) => {
                if (status === google.maps.DirectionsStatus.OK) {
                    resolve(result);
                } else {
                    reject(status);
                }
            });
        });
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
                if (status === google.maps.DirectionsStatus.OK) {
                    console.log(`✅ 备选路线获取成功: ${segment.label}`);
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
        if (!alternativeResult) {
            console.error('备选路线未找到:', segmentLabel);
            return;
        }

        // 查找并移除原有路线
        const originalRenderer = this.directionsRenderers.find(
            item => item.segment.label === segmentLabel && item.isPrimary
        );

        if (originalRenderer) {
            originalRenderer.renderer.setMap(null);
            // 标记为非主要路线
            originalRenderer.isPrimary = false;
        }

        // 创建备选路线渲染器
        const alternativeRenderer = new google.maps.DirectionsRenderer({
            directions: alternativeResult,
            routeIndex: 0,
            polylineOptions: {
                strokeColor: '#ff6b6b', // 使用不同颜色表示备选路线
                strokeWeight: 4,
                strokeOpacity: 0.8,
                zIndex: 1
            },
            suppressMarkers: true,
            preserveViewport: true
        });

        alternativeRenderer.setMap(this.map);
        
        // 添加到渲染器列表
        this.directionsRenderers.push({
            renderer: alternativeRenderer,
            segment: originalRenderer.segment,
            result: alternativeResult,
            isPrimary: false,
            isAlternative: true
        });

        // 关闭信息窗口
        if (this.routeInfoWindow) {
            this.routeInfoWindow.close();
        }

        console.log(`🔄 已切换到备选路线: ${segmentLabel}`);
    }

    // 其他方法保持不变...
    drawFallbackRoute(segment, resolve) {
        const request = {
            origin: segment.start,
            destination: segment.end,
            travelMode: google.maps.TravelMode.DRIVING,
            region: 'JP'
        };

        this.directionsService.route(request, (result, status) => {
            if (status === 'OK') {
                console.log(`✅ 常规路线绘制成功: ${segment.label}`);
                
                const renderer = new google.maps.DirectionsRenderer({
                    directions: result,
                    routeIndex: 0,
                    polylineOptions: {
                        strokeColor: segment.color,
                        strokeWeight: 4,
                        strokeOpacity: 0.8,
                        zIndex: 1
                    },
                    suppressMarkers: true,
                    preserveViewport: true
                });

                renderer.setMap(this.map);
                this.directionsRenderers.push({
                    renderer: renderer,
                    segment: segment,
                    result: result,
                    isPrimary: true
                });

                this.addRouteInfo(result, segment);
                this.addRouteClickHandler(renderer, segment, result);
                
                resolve();
            } else {
                console.error(`❌ 所有路线绘制失败: ${segment.label}, Status: ${status}`);
                
                console.log(`🔄 Drawing fallback line: ${segment.label}`);
                try {
                    this.drawFallbackLine(segment);
                } catch (error) {
                    console.error(`❌ Fallback line failed: ${segment.label}`, error);
                }
                resolve();
            }
        });
    }

    drawFallbackLine(segment) {
        const path = [
            { lat: segment.start.lat, lng: segment.start.lng },
            { lat: segment.end.lat, lng: segment.end.lng }
        ];

        const line = new google.maps.Polyline({
            path: path,
            geodesic: true,
            strokeColor: segment.color,
            strokeOpacity: 0.6,
            strokeWeight: 3,
            zIndex: 1
        });

        line.setMap(this.map);
        this.routes.push(line);
    }

    addRouteInfo(result, segment) {
        // 为路线添加额外信息处理
    }

    getTrafficColor(trafficDuration, normalDuration) {
        const ratio = trafficDuration / normalDuration;
        if (ratio > 1.5) return '#cc1f1f'; // 严重拥堵
        if (ratio > 1.2) return '#ff6b00'; // 中度拥堵  
        if (ratio > 1.1) return '#ffa500'; // 轻微拥堵
        return '#156d2a'; // 畅通
    }

    clearAllRoutes() {
        // 清除所有方向渲染器
        this.directionsRenderers.forEach(item => {
            if (item.renderer) {
                item.renderer.setMap(null);
            }
        });
        this.directionsRenderers = [];

        // 清除所有路线
        this.routes.forEach(route => {
            route.setMap(null);
        });
        this.routes = [];

        // 清除信息窗口
        if (this.routeInfoWindow) {
            this.routeInfoWindow.close();
        }

        // 清除备选路线缓存
        this.alternativeRoutes = {};
    }

    toggleRoutes() {
        this.showRoutes = !this.showRoutes;
        const display = this.showRoutes ? this.map : null;
        
        this.directionsRenderers.forEach(item => {
            if (item.renderer) {
                item.renderer.setMap(display);
            }
        });

        this.routes.forEach(route => {
            route.setMap(display);
        });
    }

    drawAllRoutes() {
        if (!this.data || !this.data.routes) {
            console.error('❌ 路线数据不可用');
            return Promise.resolve();
        }

        const routePromises = this.data.routes.map(route => 
            this.drawRealRoute(route).catch(error => {
                console.error(`❌ 路线绘制失败: ${route.label}`, error);
            })
        );

        return Promise.all(routePromises);
    }

    addCustomRoute(routeData) {
        return this.drawRealRoute(routeData);
    }
}
