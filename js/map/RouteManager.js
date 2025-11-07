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
        this.routeStates = {}; // 跟踪每条路线的当前状态：primary、alternative
        
        this.init();
    }

    init() {
        this.directionsService = new google.maps.DirectionsService();

        // 事件委托 - 处理InfoWindow中的路由切换按钮（安全修复：移除内联事件处理器）
        document.body.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            const label = e.target.dataset.label;

            if (!action || !label) return;

            // 处理不同的路由操作
            if (action === 'showAlternativeRoute') {
                this.showAlternativeRoute(label, e.target);
            } else if (action === 'switchToAlternativeRoute') {
                this.switchToAlternativeRoute(label);
            } else if (action === 'switchToPrimaryRoute') {
                this.switchToPrimaryRoute(label);
            }
        });
    }

    async drawRealRoute(segment) {
        console.log(`🎨 开始绘制路线:`, segment);
        
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

            console.log(`🎨 发送路线请求:`, request);

            this.directionsService.route(request, (result, status) => {
                if (status === 'OK') {
                    console.log(`✅ 路线绘制成功: ${segment.label}`);
                    console.log(`🎨 DirectionsService 返回结果:`, result);
                    
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

                    console.log(`🎨 创建 DirectionsRenderer:`, renderer);
                    renderer.setMap(this.map);
                    console.log(`🎨 设置地图到 renderer，当前地图:`, this.map);
                    
                    this.directionsRenderers.push({
                        renderer: renderer,
                        segment: segment,
                        result: result,
                        isPrimary: true
                    });

                    console.log(`🎨 已添加到 directionsRenderers，当前数量:`, this.directionsRenderers.length);

                    // 初始化路线状态
                    this.routeStates[segment.label] = 'primary';

                    // 添加路线信息
                    this.addRouteInfo(result, segment);
                    
                    // 添加路线点击处理
                    this.addRouteClickHandler(renderer, segment, result);
                    
                    console.log(`🎨 路线绘制完成，调用 resolve() 返回成功标志`);
                    resolve(true); // 返回 true 表示成功
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

    // 显示路线选项和交互信息 - 根据当前状态显示原始或备选路线信息
    async showRouteOptions(clickPosition, segment, currentResult) {
        const segmentLabel = segment.label;
        const currentState = this.routeStates[segmentLabel] || 'primary';
        
        // 预先获取备选路线但不显示
        this.preloadAlternativeRoute(segment);
        
        // 获取当前显示路线的信息
        const currentLeg = currentResult.routes[0].legs[0];
        
        // 获取另一条路线的信息（如果可用）
        let otherRouteInfo = null;
        if (currentState === 'alternative') {
            // 当前显示备选路线，获取原始路线信息
            const originalRenderer = this.directionsRenderers.find(
                item => item.segment.label === segmentLabel && item.isHidden
            );
            if (originalRenderer) {
                const originalLeg = originalRenderer.result.routes[0].legs[0];
                otherRouteInfo = {
                    type: 'primary',
                    title: '📍 原始路线 (国道优先)',
                    leg: originalLeg,
                    buttonText: '🔄 切换回原始路线',
                    buttonAction: `switchToPrimaryRoute`,
                    buttonColor: '#28a745'
                };
            }
        } else {
            // 当前显示原始路线，获取备选路线信息
            const alternativeResult = this.alternativeRoutes[segmentLabel];
            if (alternativeResult) {
                const alternativeLeg = alternativeResult.routes[0].legs[0];
                otherRouteInfo = {
                    type: 'alternative',
                    title: '🏎️ 备选路线 (含高速公路)',
                    leg: alternativeLeg,
                    buttonText: '🔄 切换到备选路线',
                    buttonAction: `switchToAlternativeRoute`,
                    buttonColor: '#ff6b6b'
                };
            }
        }

        // 生成当前路线信息HTML
        const currentRouteTitle = currentState === 'alternative' ? 
            '🏎️ 当前路线 (含高速公路)' : '📍 当前路线 (国道优先)';
        
        let content = `
            <div style="padding: 15px; max-width: 380px; font-family: 'Microsoft YaHei', '微软雅黑', 'Segoe UI', sans-serif;">
                <h3 style="margin: 0 0 15px 0; color: #1a1a1a; font-size: 1.2em; font-weight: bold; display: flex; align-items: center;">
                    🛣️ ${segmentLabel}
                </h3>
                
                <div style="background: #ffffff; padding: 12px; border-radius: 8px; margin-bottom: 15px; border: 2px solid ${currentState === 'alternative' ? '#ffeaa7' : '#e8f5e8'};">
                    <div style="font-weight: bold; color: ${currentState === 'alternative' ? '#d63031' : '#155724'}; margin-bottom: 8px; font-size: 1.1em;">
                        ${currentRouteTitle}
                    </div>
                    <div style="margin-bottom: 5px; color: #2c2c2c;">
                        📏 距离: <strong style="color: #1a1a1a;">${currentLeg.distance.text}</strong>
                    </div>
                    <div style="margin-bottom: 5px; color: #2c2c2c;">
                        ⏱️ 预估时间: <strong style="color: #1a1a1a;">${currentLeg.duration.text}</strong>
                    </div>
                    ${currentLeg.duration_in_traffic ? `
                        <div style="margin-bottom: 5px; color: #2c2c2c;">
                            � 实时时间: <strong style="color: ${this.getTrafficColor(currentLeg.duration_in_traffic.value, currentLeg.duration.value)}">${currentLeg.duration_in_traffic.text}</strong>
                        </div>
                    ` : ''}
                </div>`;

        // 如果有另一条路线信息，显示比较
        if (otherRouteInfo) {
            const timeDiff = currentLeg.duration.value - otherRouteInfo.leg.duration.value;
            const distanceDiff = currentLeg.distance.value - otherRouteInfo.leg.distance.value;
            
            content += `
                <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #dee2e6;">
                    <div style="font-weight: bold; color: #495057; margin-bottom: 8px; font-size: 1.1em;">
                        ${otherRouteInfo.title}
                    </div>
                    <div style="margin-bottom: 5px; color: #2c2c2c;">
                        📏 距离: <strong style="color: #1a1a1a;">${otherRouteInfo.leg.distance.text}</strong>
                        ${distanceDiff !== 0 ? `<span style="color: ${distanceDiff > 0 ? '#28a745' : '#dc3545'}; font-size: 0.9em;">
                            (${distanceDiff > 0 ? '-' : '+'}${Math.abs((distanceDiff/1000).toFixed(1))}km)
                        </span>` : ''}
                    </div>
                    <div style="margin-bottom: 5px; color: #2c2c2c;">
                        ⏱️ 预估时间: <strong style="color: #1a1a1a;">${otherRouteInfo.leg.duration.text}</strong>
                        ${timeDiff !== 0 ? `<span style="color: ${timeDiff > 0 ? '#28a745' : '#dc3545'}; font-size: 0.9em;">
                            (${timeDiff > 0 ? '-' : '+'}${Math.abs(Math.round(timeDiff/60))}分钟)
                        </span>` : ''}
                    </div>
                    ${otherRouteInfo.leg.duration_in_traffic ? `
                        <div style="margin-bottom: 5px; color: #2c2c2c;">
                            🚦 实时时间: <strong style="color: ${this.getTrafficColor(otherRouteInfo.leg.duration_in_traffic.value, otherRouteInfo.leg.duration.value)}">${otherRouteInfo.leg.duration_in_traffic.text}</strong>
                        </div>
                    ` : ''}
                </div>
                
                <div style="text-align: center; margin-bottom: 15px;">
                    <button data-action="${otherRouteInfo.buttonAction}" data-label="${segmentLabel}"
                            style="background: ${otherRouteInfo.buttonColor}; color: white; border: none; padding: 10px 18px; border-radius: 6px; cursor: pointer; font-size: 1em; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                        ${otherRouteInfo.buttonText}
                    </button>
                </div>`;
        } else if (currentState === 'primary') {
            // 如果是原始路线但没有备选路线，显示获取备选路线的按钮
            content += `
                <div style="text-align: center; margin-bottom: 15px;">
                    <button data-action="showAlternativeRoute" data-label="${segmentLabel}"
                            style="background: #ff6b6b; color: white; border: none; padding: 10px 18px; border-radius: 6px; cursor: pointer; font-size: 1em; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                        🔍 查看备选路线
                    </button>
                </div>
                
                <div id="alternative-route-${segmentLabel}" style="display: none;"></div>`;
        }

        content += `
                <div style="text-align: center; margin-top: 15px;">
                    <div style="font-size: 0.9em; color: #4a4a4a; background: #f5f5f5; padding: 8px; border-radius: 5px;">
                        💡 ${currentState === 'primary' ? '点击"查看备选路线"获取高速公路路线' : '当前显示的是高速公路路线'}
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

    // 预加载备选路线（但不渲染）
    async preloadAlternativeRoute(segment) {
        const cacheKey = segment.label;
        
        // 如果已经缓存了，就不用重新获取
        if (this.alternativeRoutes[cacheKey]) {
            console.log(`✅ 备选路线已缓存: ${segment.label}`);
            return;
        }
        
        try {
            console.log(`🔄 预加载备选路线: ${segment.label}`);
            const alternativeResult = await this.getAlternativeRoute(segment);
            
            if (alternativeResult) {
                this.alternativeRoutes[cacheKey] = alternativeResult;
                console.log(`✅ 备选路线预加载完成: ${segment.label}`);
            }
        } catch (error) {
            console.warn(`⚠️ 备选路线预加载失败: ${segment.label}`, error);
        }
    }

    // 显示备选路线 - 点击时触发（使用已缓存的数据）
    async showAlternativeRoute(segmentLabel, buttonElement) {
        // 更改按钮状态
        buttonElement.innerHTML = '⏳ 正在获取备选路线...';
        buttonElement.disabled = true;
        
        try {
            // 先检查是否已有缓存的备选路线
            let alternativeResult = this.alternativeRoutes[segmentLabel];
            
            // 如果没有缓存，尝试从当前渲染的路线中找到对应的路线段信息
            if (!alternativeResult) {
                console.log('未找到缓存的备选路线，尝试即时获取...');
                
                // 从已渲染的路线中查找对应的路线段
                const renderedRoute = this.directionsRenderers.find(item => 
                    item.segment && item.segment.label === segmentLabel
                );
                
                if (renderedRoute) {
                    alternativeResult = await this.getAlternativeRoute(renderedRoute.segment);
                    if (alternativeResult) {
                        this.alternativeRoutes[segmentLabel] = alternativeResult;
                    }
                } else {
                    throw new Error('无法找到对应的路线段');
                }
            }
            
            if (alternativeResult) {
                // 获取主路线信息 - 从已渲染的路线中获取
                const renderedRoute = this.directionsRenderers.find(item => 
                    item.segment && item.segment.label === segmentLabel && item.isPrimary
                );
                
                if (!renderedRoute) {
                    throw new Error('无法找到主路线信息');
                }
                
                const leg = renderedRoute.result.routes[0].legs[0];
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
                        <button data-action="switchToAlternativeRoute" data-label="${segmentLabel}"
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
                
                // 隐藏按钮
                buttonElement.style.display = 'none';
                
                console.log(`✅ 备选路线显示完成: ${segmentLabel}`);
            } else {
                buttonElement.innerHTML = '❌ 无法获取备选路线';
                buttonElement.disabled = true;
            }
        } catch (error) {
            console.error('获取备选路线失败:', error);
            buttonElement.innerHTML = '❌ 获取失败: ' + error.message;
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

        // 查找并隐藏原有路线
        const originalRenderer = this.directionsRenderers.find(
            item => item.segment.label === segmentLabel && item.isPrimary
        );

        if (originalRenderer) {
            originalRenderer.renderer.setMap(null);
            // 标记为非主要路线，但保留在数组中以便切换回来
            originalRenderer.isPrimary = false;
            originalRenderer.isHidden = true;
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
        const alternativeRendererData = {
            renderer: alternativeRenderer,
            segment: originalRenderer.segment,
            result: alternativeResult,
            isPrimary: false,
            isAlternative: true
        };
        
        this.directionsRenderers.push(alternativeRendererData);

        // 更新路线状态
        this.routeStates[segmentLabel] = 'alternative';

        // 添加路线点击处理
        this.addRouteClickHandler(alternativeRenderer, originalRenderer.segment, alternativeResult);

        // 关闭信息窗口
        if (this.routeInfoWindow) {
            this.routeInfoWindow.close();
        }

        console.log(`🔄 已切换到备选路线: ${segmentLabel}`);
    }

    // 切换回原始路线
    switchToPrimaryRoute(segmentLabel) {
        // 查找并隐藏备选路线
        const alternativeRenderer = this.directionsRenderers.find(
            item => item.segment.label === segmentLabel && item.isAlternative
        );

        if (alternativeRenderer) {
            alternativeRenderer.renderer.setMap(null);
            // 从数组中移除备选路线渲染器
            const index = this.directionsRenderers.indexOf(alternativeRenderer);
            if (index > -1) {
                this.directionsRenderers.splice(index, 1);
            }
        }

        // 查找并显示原始路线
        const originalRenderer = this.directionsRenderers.find(
            item => item.segment.label === segmentLabel && item.isHidden
        );

        if (originalRenderer) {
            originalRenderer.renderer.setMap(this.map);
            originalRenderer.isPrimary = true;
            originalRenderer.isHidden = false;
        }

        // 更新路线状态
        this.routeStates[segmentLabel] = 'primary';

        // 关闭信息窗口
        if (this.routeInfoWindow) {
            this.routeInfoWindow.close();
        }

        console.log(`🔄 已切换回原始路线: ${segmentLabel}`);
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
                
                resolve(true); // 返回 true 表示成功
            } else {
                console.error(`❌ 所有路线绘制失败: ${segment.label}, Status: ${status}`);
                
                console.log(`🔄 Drawing fallback line: ${segment.label}`);
                try {
                    this.drawFallbackLine(segment);
                    resolve(true); // fallback line 成功
                } catch (error) {
                    console.error(`❌ Fallback line failed: ${segment.label}`, error);
                    resolve(false); // 所有方法都失败
                }
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
        
        // 清除路线状态
        this.routeStates = {};
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
        console.log(`🛣️ RouteManager.addCustomRoute 被调用:`, routeData);
        const result = this.drawRealRoute(routeData);
        console.log(`🛣️ drawRealRoute 返回的 Promise:`, result);
        return result;
    }

    // 聚焦到指定天数的路线
    focusOnDayRoute(day) {
        console.log(`🎯 Focusing on route for day ${day}`);
        // 这里可以添加聚焦到特定天数路线的逻辑
        // 暂时先添加空实现避免错误
    }
}
