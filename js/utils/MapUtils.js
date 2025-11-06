/**
 * Map Utilities - 地图相关的工具函数和常量
 */

class MapUtils {
    // 活动类型颜色映射
    static getTypeColor(type) {
        const colorMap = {
            transport: '#3498db',      // 蓝色 - 交通
            sightseeing: '#e74c3c',    // 红色 - 景点
            food: '#f39c12',           // 橙色 - 美食
            accommodation: '#2ecc71',   // 绿色 - 住宿
            entertainment: '#9b59b6',   // 紫色 - 娱乐
            shopping: '#e67e22'        // 深橙色 - 购物
        };
        return colorMap[type] || '#95a5a6';
    }

    // 获取活动类型标签
    static getTypeLabel(type) {
        const labelMap = {
            transport: '交通',
            sightseeing: '景点',
            food: '美食',
            accommodation: '住宿',
            entertainment: '娱乐',
            shopping: '购物'
        };
        return labelMap[type] || '其他';
    }

    // 获取天数对应的颜色
    static getDayColor(day) {
        const colors = [
            '#e74c3c', '#3498db', '#f39c12', '#2ecc71', '#9b59b6',
            '#e67e22', '#1abc9c', '#34495e', '#f1c40f', '#95a5a6'
        ];
        return colors[(day - 1) % colors.length];
    }

    // 计算地图中心点
    static calculateCenter(data) {
        if (!data || !data.days || data.days.length === 0) {
            // 默认关西地区中心
            return { lat: 34.6560, lng: 135.5060 };
        }

        let totalLat = 0;
        let totalLng = 0;
        let count = 0;

        data.days.forEach(day => {
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

    // 获取地图样式
    static getMapStyles() {
        return [
            {
                featureType: 'water',
                elementType: 'geometry',
                stylers: [{ color: '#a2daf2' }]
            },
            {
                featureType: 'landscape',
                elementType: 'geometry',
                stylers: [{ color: '#f5f5f2' }]
            },
            {
                featureType: 'landscape.natural',
                elementType: 'geometry',
                stylers: [{ color: '#d0e3b4' }]
            },
            {
                featureType: 'landscape.man_made',
                elementType: 'geometry',
                stylers: [{ color: '#f7f1df' }]
            },
            {
                featureType: 'road.highway',
                elementType: 'geometry',
                stylers: [{ color: '#ffa726' }, { weight: 1.2 }]
            },
            {
                featureType: 'road.highway',
                elementType: 'labels',
                stylers: [{ visibility: 'on' }]
            },
            {
                featureType: 'road.arterial',
                elementType: 'geometry',
                stylers: [{ color: '#fb8c00' }, { weight: 1.0 }]
            },
            {
                featureType: 'road.local',
                elementType: 'geometry',
                stylers: [{ color: '#fffde7' }, { weight: 0.5 }]
            },
            {
                featureType: 'road.local',
                elementType: 'labels.text.fill',
                stylers: [{ color: '#616161' }]
            },
            {
                featureType: 'poi',
                elementType: 'geometry',
                stylers: [{ color: '#eeeeee' }]
            },
            {
                featureType: 'poi.park',
                elementType: 'geometry',
                stylers: [{ color: '#c8e6c9' }]
            },
            {
                featureType: 'poi.attraction',
                elementType: 'geometry',
                stylers: [{ color: '#fce4ec' }]
            },
            {
                featureType: 'poi.business',
                elementType: 'geometry',
                stylers: [{ color: '#e3f2fd' }]
            },
            {
                featureType: 'transit',
                elementType: 'geometry',
                stylers: [{ color: '#e1f5fe' }]
            },
            {
                featureType: 'transit.line',
                elementType: 'geometry',
                stylers: [{ color: '#64b5f6' }, { weight: 0.6 }]
            },
            {
                featureType: 'transit.station',
                elementType: 'labels.icon',
                stylers: [{ visibility: 'on' }]
            },
            {
                featureType: 'administrative.province',
                elementType: 'geometry.stroke',
                stylers: [{ color: '#4b6878' }, { weight: 0.7 }]
            },
            {
                featureType: 'administrative.locality',
                elementType: 'labels.text.fill',
                stylers: [{ color: '#2c2c2c' }]
            },
            {
                featureType: 'administrative.neighborhood',
                elementType: 'labels.text.fill',
                stylers: [{ color: '#757575' }]
            },
            {
                elementType: 'labels.text.stroke',
                stylers: [{ color: '#ffffff' }, { weight: 3 }]
            },
            {
                elementType: 'labels.text.fill',
                stylers: [{ color: '#2c2c2c' }]
            }
        ];
    }

    // 计算两点间距离（公里）
    static calculateDistance(point1, point2) {
        const R = 6371; // 地球半径（公里）
        const dLat = this.toRad(point2.lat - point1.lat);
        const dLon = this.toRad(point2.lng - point1.lng);
        const lat1 = this.toRad(point1.lat);
        const lat2 = this.toRad(point2.lat);

        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const d = R * c;

        return Math.round(d * 100) / 100; // 保留两位小数
    }

    // 角度转弧度
    static toRad(value) {
        return value * Math.PI / 180;
    }

    // 获取标记图标配置
    static getMarkerIcon(type, isActive = false) {
        const baseConfig = {
            transport: { symbol: '🚗', color: '#3498db' },
            sightseeing: { symbol: '⛩️', color: '#e74c3c' },
            food: { symbol: '🍽️', color: '#f39c12' },
            accommodation: { symbol: '🏨', color: '#2ecc71' },
            entertainment: { symbol: '🎭', color: '#9b59b6' },
            shopping: { symbol: '🛍️', color: '#e67e22' },
            default: { symbol: '📍', color: '#95a5a6' }
        };

        const config = baseConfig[type] || baseConfig.default;
        const size = isActive ? 40 : 32;
        const fontSize = isActive ? '20px' : '16px';

        return {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="${size/2}" cy="${size/2}" r="${size/2-2}" 
                            fill="${config.color}" stroke="white" stroke-width="3" 
                            opacity="${isActive ? '1' : '0.9'}"/>
                    <text x="${size/2}" y="${size/2+6}" font-size="${fontSize}" 
                          text-anchor="middle" fill="white" font-weight="bold">
                        ${config.symbol}
                    </text>
                </svg>
            `)}`,
            scaledSize: new google.maps.Size(size, size),
            anchor: new google.maps.Point(size/2, size/2)
        };
    }

    // 获取交通颜色（基于时间）
    static getTrafficColor(trafficTime, normalTime) {
        if (!trafficTime || !normalTime) return '#2ecc71'; // 绿色 - 无数据
        
        const ratio = trafficTime / normalTime;
        if (ratio <= 1.2) return '#2ecc71';      // 绿色 - 畅通
        if (ratio <= 1.5) return '#f39c12';     // 橙色 - 缓慢  
        return '#e74c3c';                        // 红色 - 拥堵
    }

    // 格式化时间
    static formatTime(minutes) {
        if (minutes < 60) {
            return `${Math.round(minutes)}分钟`;
        }
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
    }

    // 格式化距离
    static formatDistance(km) {
        if (km < 1) {
            return `${Math.round(km * 1000)}米`;
        }
        return `${km.toFixed(1)}公里`;
    }

    // 创建信息窗口内容
    static createInfoWindowContent(data) {
        const { activity, day, accommodation, type } = data;
        
        if (type === 'accommodation' && accommodation) {
            return `
                <div class="info-window">
                    <div class="info-header">
                        <div class="info-icon">🏨</div>
                        <div class="info-title">${accommodation.name}</div>
                    </div>
                    <div class="info-content">
                        <div class="info-day">第${day}天住宿</div>
                        ${accommodation.address ? `<div class="info-address">📍 ${accommodation.address}</div>` : ''}
                        ${accommodation.phone ? `<div class="info-phone">📞 ${accommodation.phone}</div>` : ''}
                        ${accommodation.notes ? `<div class="info-notes">${accommodation.notes}</div>` : ''}
                    </div>
                </div>
            `;
        }

        if (activity) {
            return `
                <div class="info-window">
                    <div class="info-header">
                        <div class="info-icon">${activity.icon || '📍'}</div>
                        <div class="info-title">${activity.description}</div>
                    </div>
                    <div class="info-content">
                        <div class="info-day">第${day}天 - ${activity.time}</div>
                        <div class="info-type">${this.getTypeLabel(activity.type)}</div>
                        ${activity.notes ? `<div class="info-notes">${activity.notes}</div>` : ''}
                        ${activity.duration ? `<div class="info-duration">⏱️ ${activity.duration}</div>` : ''}
                        ${activity.cost ? `<div class="info-cost">💰 ${activity.cost}</div>` : ''}
                    </div>
                </div>
            `;
        }

        return '<div class="info-window">无详细信息</div>';
    }
}

// 导出工具类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MapUtils;
} else {
    window.MapUtils = MapUtils;
}