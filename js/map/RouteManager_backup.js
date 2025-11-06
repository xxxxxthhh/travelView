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

    // 显示路线选项和交互信息 - 高级功能
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
                    <button onclick="window.travelApp.mapManager.routeManager.switchToAlternativeRoute('${segment.label}')" 
                            style="background: #1a73e8; color: white; border: none; padding: 10px 18px; border-radius: 6px; cursor: pointer; font-size: 1em; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                        切换到此路线
                    </button>
                </div>
            `;
        }

        content += `
                <div style="text-align: center; margin-top: 15px;">
                    <div style="font-size: 0.9em; color: #4a4a4a; background: #f5f5f5; padding: 8px; border-radius: 5px;">
                        � 点击路线可查看详细信息和备选方案
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
                zIndex: 1  // 降低z-index
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

    calculateMidpoint(start, end) {
        return {
            lat: (start.lat + end.lat) / 2,
            lng: (start.lng + end.lng) / 2
        };
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
                        zIndex: 1  // 降低z-index
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
                console.log(`🔄 Drawing fallback line: ${segment.label}`);
                
                try {
                    this.drawFallbackLine(segment);
                    resolve();
                } catch (error) {
                    console.error(`❌ Fallback line failed: ${segment.label}`, error);
                    resolve();
                }
            }
        });
    }

    drawFallbackLine(segment) {
        const path = [segment.start, segment.end];
        
        const polyline = new google.maps.Polyline({
            path: path,
            geodesic: true,
            strokeColor: segment.color,
            strokeOpacity: 0.6,
            strokeWeight: 4,
            zIndex: 1,  // 降低z-index
            map: this.map
        });

        this.routes.push(polyline);

        // 添加点击事件
        polyline.addListener('click', (event) => {
            const infoWindow = new google.maps.InfoWindow({
                position: event.latLng,
                content: `
                    <div class="fallback-route-info">
                        <div class="route-title">${segment.label}</div>
                        <div class="route-note">直线距离参考</div>
                        <div class="route-distance">
                            📏 ${MapUtils.formatDistance(
                                MapUtils.calculateDistance(segment.start, segment.end)
                            )}
                        </div>
                    </div>
                `
            });
            
            infoWindow.open(this.map);
        });
    }

    addRouteInfo(directionsResult, segment, isFallback = false, routeIndex = 0) {
        const route = directionsResult.routes[routeIndex];
        const leg = route.legs[0];
        
        console.log(`📊 ${segment.label}:`, {
            distance: leg.distance?.text || 'N/A',
            duration: leg.duration?.text || 'N/A',
            trafficDuration: leg.duration_in_traffic?.text || 'N/A'
        });
    }

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

        return this.showRoutes;
    }

    toggleTraffic() {
        this.showTraffic = !this.showTraffic;
        
        if (!this.trafficLayer) {
            this.trafficLayer = new google.maps.TrafficLayer();
        }
        
        this.trafficLayer.setMap(this.showTraffic ? this.map : null);
        console.log(`🚦 交通状况: ${this.showTraffic ? '显示' : '隐藏'}`);
        
        return this.showTraffic;
    }

    focusOnDayRoute(day) {
        console.log(`🎯 Focusing on route for day ${day}`);
        
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
            
            // 调整地图视野以适应所有位置，添加padding
            this.map.fitBounds(bounds, {
                top: 50,    // 顶部留白
                right: 50,  // 右侧留白
                bottom: 50, // 底部留白
                left: 50    // 左侧留白
            });
        }
        
        console.log(`🎯 地图调整视野展示第${day}天完整路线，包含${locationsWithCoords.length}个位置`);
        
        // 如果有多个位置，可以选择性地绘制路线
        if (locationsWithCoords.length >= 2) {
            const locations = locationsWithCoords.map(item => item.location);
            this.drawDayRoute(locations, day);
        }
    }

    async drawDayRoute(locations, day) {
        if (locations.length < 2) return;

        const color = MapUtils.getDayColor(day);
        
        // 如果只有两个点，直接绘制
        if (locations.length === 2) {
            const segment = {
                start: locations[0],
                end: locations[1],
                color: color,
                label: `第${day}天路线`
            };
            
            await this.drawRealRoute(segment);
            return;
        }

        // 多个点的情况，创建路径
        const waypoints = locations.slice(1, -1).map(location => ({
            location: location,
            stopover: true
        }));

        const request = {
            origin: locations[0],
            destination: locations[locations.length - 1],
            waypoints: waypoints,
            travelMode: google.maps.TravelMode.DRIVING,
            optimizeWaypoints: true
        };

        this.directionsService.route(request, (result, status) => {
            if (status === 'OK') {
                const renderer = new google.maps.DirectionsRenderer({
                    directions: result,
                    polylineOptions: {
                        strokeColor: color,
                        strokeWeight: 5,
                        strokeOpacity: 0.7,
                        zIndex: 1  // 降低z-index
                    },
                    suppressMarkers: true,
                    preserveViewport: true
                });

                renderer.setMap(this.map);
                this.directionsRenderers.push({
                    renderer: renderer,
                    segment: { label: `第${day}天路线`, color: color },
                    result: result
                });
            } else {
                console.warn(`Day ${day} route failed:`, status);
            }
        });
    }

    clearAllRoutes() {
        console.log('🧹 Clearing all routes');
        
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

    fitMapToRoute() {
        if (this.directionsRenderers.length === 0 && this.routes.length === 0) {
            return;
        }

        const bounds = new google.maps.LatLngBounds();

        // 包含Directions路线
        this.directionsRenderers.forEach(item => {
            const route = item.result.routes[0];
            route.overview_path.forEach(point => {
                bounds.extend(point);
            });
        });

        // 包含fallback路线
        this.routes.forEach(route => {
            const path = route.getPath();
            path.forEach(point => {
                bounds.extend(point);
            });
        });

        this.map.fitBounds(bounds);
    }

    // 添加自定义路线 - 兼容原有接口
    async addCustomRoute(start, end, options = {}) {
        const segment = {
            start: start,
            end: end,
            color: options.color || '#3498db',
            label: options.label || '自定义路线'
        };
        
        return await this.drawRealRoute(segment);
    }

    destroy() {
        this.clearAllRoutes();
        
        if (this.trafficLayer) {
            this.trafficLayer.setMap(null);
        }
        
        // 清理路线信息窗口
        if (this.routeInfoWindow) {
            this.routeInfoWindow.close();
        }
        
        // 清理备选路线缓存
        this.alternativeRoutes = {};
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RouteManager;
} else {
    window.RouteManager = RouteManager;
}