/**
 * MarkerManager - 负责地图标记的创建和管理
 */

class MarkerManager {
    constructor(map, data, onMarkerClick) {
        this.map = map;
        this.data = data;
        this.onMarkerClick = onMarkerClick || (() => {});
        
        this.markers = [];
        this.infoWindow = null;
        this.filterType = 'all';
        this.showDetailedMarkers = false;
        
        this.init();
    }

    init() {
        this.infoWindow = new google.maps.InfoWindow();
        this.addMarkers();
    }

    addMarkers() {
        this.clearMarkers();
        
        if (this.showDetailedMarkers) {
            this.addDayMarkers();
        } else {
            this.addMainCityMarkers();
        }
    }

    addMainCityMarkers() {
        console.log('🏙️ Adding main city markers');
        
        const cityStats = new Map();
        
        // 统计每个城市的活动数量
        this.data.days.forEach(day => {
            if (day.activities) {
                day.activities.forEach(activity => {
                    if (activity.location) {
                        const key = `${activity.location.lat.toFixed(3)},${activity.location.lng.toFixed(3)}`;
                        const existing = cityStats.get(key);
                        if (existing) {
                            existing.count++;
                            existing.activities.push({ ...activity, day: day.day });
                        } else {
                            cityStats.set(key, {
                                location: activity.location,
                                count: 1,
                                activities: [{ ...activity, day: day.day }],
                                mainActivity: activity
                            });
                        }
                    }
                });
            }
        });

        // 为每个主要城市创建标记
        cityStats.forEach((cityData, key) => {
            if (cityData.count >= 2) { // 只显示有2个以上活动的城市
                const marker = this.createCityMarker(cityData);
                this.markers.push(marker);
            }
        });

        // 添加住宿标记
        this.data.days.forEach(day => {
            if (day.accommodation && day.accommodation.location) {
                const marker = this.createAccommodationMarker(day.accommodation, day.day);
                this.markers.push(marker);
            }
        });

        console.log(`✅ Added ${this.markers.length} city markers`);
    }

    createCityMarker(cityData) {
        const { location, count, activities, mainActivity } = cityData;
        
        const marker = new google.maps.Marker({
            position: location,
            map: this.map,
            title: `${mainActivity.description} (${count}个活动)`,
            icon: MapUtils.getMarkerIcon('sightseeing'),
            zIndex: 1000
        });

        marker.addListener('click', () => {
            this.showCityInfo(marker, cityData);
            this.onMarkerClick(activities[0].day, 0);
        });

        return marker;
    }

    showCityInfo(marker, cityData) {
        const { count, activities, mainActivity } = cityData;
        
        const activitiesList = activities
            .map(activity => `
                <div class="activity-item">
                    <span class="activity-time">第${activity.day}天 ${activity.time}</span>
                    <span class="activity-desc">${activity.description}</span>
                </div>
            `).join('');

        const content = `
            <div class="info-window city-info">
                <div class="info-header">
                    <div class="info-icon">${mainActivity.icon || '🏙️'}</div>
                    <div class="info-title">${mainActivity.description}地区</div>
                </div>
                <div class="info-content">
                    <div class="activity-count">共${count}个活动</div>
                    <div class="activities-list">
                        ${activitiesList}
                    </div>
                </div>
            </div>
        `;

        this.infoWindow.setContent(content);
        this.infoWindow.open(this.map, marker);
    }

    addDayMarkers() {
        console.log('📅 Adding detailed day markers');
        
        this.data.days.forEach(day => {
            if (day.activities) {
                day.activities.forEach((activity, index) => {
                    if (activity.location && this.shouldShowActivity(activity)) {
                        const marker = this.createActivityMarker(activity, day.day, index);
                        this.markers.push(marker);
                    }
                });
            }

            if (day.accommodation && day.accommodation.location) {
                const marker = this.createAccommodationMarker(day.accommodation, day.day);
                this.markers.push(marker);
            }
        });

        console.log(`✅ Added ${this.markers.length} detailed markers`);
    }

    createActivityMarker(activity, day, activityIndex) {
        const marker = new google.maps.Marker({
            position: activity.location,
            map: this.map,
            title: activity.description,
            icon: MapUtils.getMarkerIcon(activity.type),
            zIndex: 100 + day
        });

        // 添加标记属性以便后续识别和操作
        marker.day = day;
        marker.activityIndex = activityIndex;
        marker.activityType = activity.type;

        marker.addListener('click', () => {
            this.showActivityInfo(marker, activity, day, activityIndex);
            this.onMarkerClick(day, activityIndex);
        });

        return marker;
    }

    createAccommodationMarker(accommodation, day) {
        const marker = new google.maps.Marker({
            position: accommodation.location,
            map: this.map,
            title: accommodation.name || '住宿',
            icon: MapUtils.getMarkerIcon('accommodation'),
            zIndex: 200 + day
        });

        // 添加标记属性
        marker.day = day;
        marker.activityType = 'accommodation';

        marker.addListener('click', () => {
            this.showAccommodationInfo(marker, accommodation, day);
        });

        return marker;
    }

    showActivityInfo(marker, activity, day, activityIndex) {
        const content = MapUtils.createInfoWindowContent({
            activity,
            day,
            type: 'activity'
        });

        this.infoWindow.setContent(content);
        this.infoWindow.open(this.map, marker);
    }

    showAccommodationInfo(marker, accommodation, day) {
        const content = MapUtils.createInfoWindowContent({
            accommodation,
            day,
            type: 'accommodation'
        });

        this.infoWindow.setContent(content);
        this.infoWindow.open(this.map, marker);
    }

    shouldShowActivity(activity) {
        if (this.filterType === 'all') return true;
        return activity.type === this.filterType;
    }

    showDay(day) {
        console.log(`🎯 Showing markers for day ${day}`);
        
        if (!this.data.days) return;

        const dayData = this.data.days.find(d => d.day === day);
        if (!dayData) return;

        // 清除之前的标记
        this.markers.forEach(marker => {
            marker.setMap(null);
        });

        const dayMarkers = [];
        const bounds = new google.maps.LatLngBounds();
        let hasLocations = false;

        if (dayData.activities) {
            dayData.activities.forEach((activity, index) => {
                if (activity.location && this.shouldShowActivity(activity)) {
                    const marker = this.createActivityMarker(activity, day, index);
                    dayMarkers.push(marker);
                    
                    // 为该天的标记添加动画效果
                    marker.setAnimation(google.maps.Animation.BOUNCE);
                    setTimeout(() => marker.setAnimation(null), 2000);
                    
                    bounds.extend(marker.getPosition());
                    hasLocations = true;
                }
            });
        }

        if (dayData.accommodation && dayData.accommodation.location) {
            const marker = this.createAccommodationMarker(dayData.accommodation, day);
            dayMarkers.push(marker);
            
            // 为住宿标记也添加动画
            marker.setAnimation(google.maps.Animation.BOUNCE);
            setTimeout(() => marker.setAnimation(null), 2000);
            
            bounds.extend(marker.getPosition());
            hasLocations = true;
        }

        this.markers = dayMarkers;

        // 调整地图视图以显示该天的所有标记
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

        console.log(`✅ Showing ${this.markers.length} markers for day ${day}`);
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

    toggleDetailLevel() {
        this.showDetailedMarkers = !this.showDetailedMarkers;
        console.log(`🔍 Detail level: ${this.showDetailedMarkers ? 'detailed' : 'city'}`);
        this.addMarkers();
        return this.showDetailedMarkers;
    }

    focusOnActivity(day, activityIndex) {
        // 找到对应的标记 - 使用marker属性直接匹配
        const targetMarker = this.markers.find(marker => 
            marker.day === day && marker.activityIndex === activityIndex
        );
        
        if (targetMarker) {
            // 居中并缩放到活动位置
            this.map.setCenter(targetMarker.getPosition());
            this.map.setZoom(16);
            
            // 触发点击事件显示信息窗口
            google.maps.event.trigger(targetMarker, 'click');
            
            console.log(`🎯 Focused on activity at day ${day}, index ${activityIndex}`);
        } else {
            // 如果找不到标记，尝试根据数据创建
            const dayData = this.data.days.find(d => d.day === day);
            if (dayData && dayData.activities && dayData.activities[activityIndex]) {
                const activity = dayData.activities[activityIndex];
                if (activity.location) {
                    this.map.setCenter(activity.location);
                    this.map.setZoom(16);
                    console.log(`🎯 Focused on activity location: ${activity.description}`);
                }
            }
        }
    }

    fitMapToMarkers() {
        if (this.markers.length === 0) return;

        const bounds = new google.maps.LatLngBounds();
        
        this.markers.forEach(marker => {
            if (marker.getMap()) {
                bounds.extend(marker.getPosition());
            }
        });

        this.map.fitBounds(bounds);
        
        // 限制最大缩放级别
        setTimeout(() => {
            const zoom = this.map.getZoom();
            if (zoom > 15) {
                this.map.setZoom(15);
            }
        }, 100);
    }

    clearMarkers() {
        this.markers.forEach(marker => {
            marker.setMap(null);
        });
        this.markers = [];
    }

    getAllMarkers() {
        return this.markers;
    }

    resetView() {
        console.log('🔄 Resetting marker view');
        
        // 重新显示所有标记
        this.showDetailedMarkers = false;
        this.filterType = 'all';
        this.addMarkers();
        
        // 适应地图到所有标记
        this.fitMapToMarkers();
    }

    destroy() {
        this.clearMarkers();
        if (this.infoWindow) {
            this.infoWindow.close();
        }
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MarkerManager;
} else {
    window.MarkerManager = MarkerManager;
}