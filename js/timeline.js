/**
 * 时间轴组件 - 负责显示和管理左侧的行程时间轴
 */

class Timeline {
    constructor(options) {
        this.container = document.querySelector(options.container);
        this.data = options.data;
        this.onDayClick = options.onDayClick || (() => {});
        this.onFilterChange = options.onFilterChange || (() => {});
        
        this.activeDay = 1;
        this.filterType = 'all';
        
        this.init();
    }

    init() {
        if (!this.container) {
            console.error('Timeline container not found');
            return;
        }

        this.render();
        this.bindEvents();
    }

    render() {
        const timelineHeader = this.renderHeader();
        const timelineContent = this.renderDays();
        
        this.container.innerHTML = `
            ${timelineHeader}
            <div class="timeline-content">
                ${timelineContent}
            </div>
        `;
    }

    renderHeader() {
        // Get trip info from data
        const tripInfo = this.data.tripInfo || {};
        const title = tripInfo.title || '行程安排';
        const destination = tripInfo.destination || '';
        const dates = tripInfo.dates || '';
        const daysCount = this.data.days ? this.data.days.length : 0;

        // Debug logging
        console.log('📋 Timeline rendering header:', {
            title,
            destination,
            dates,
            daysCount,
            tripInfo
        });

        // Build subtitle with trip info
        let subtitle = '';
        if (destination || dates || daysCount > 0) {
            const parts = [];
            if (destination) parts.push(`📍 ${destination}`);
            if (dates) parts.push(`📅 ${dates}`);
            if (daysCount > 0) parts.push(`⏱️ ${daysCount}天`);
            subtitle = `<div class="timeline-subtitle">${parts.join(' | ')}</div>`;
        }

        return `
            <div class="timeline-header">
                <h3 class="timeline-title">${title}</h3>
                ${subtitle}
                <div class="filter-buttons">
                    <button class="filter-btn ${this.filterType === 'all' ? 'active' : ''}" data-filter="all">全部</button>
                    <button class="filter-btn ${this.filterType === 'sightseeing' ? 'active' : ''}" data-filter="sightseeing">景点</button>
                    <button class="filter-btn ${this.filterType === 'accommodation' ? 'active' : ''}" data-filter="accommodation">住宿</button>
                    <button class="filter-btn ${this.filterType === 'transport' ? 'active' : ''}" data-filter="transport">交通</button>
                    <button class="filter-btn ${this.filterType === 'entertainment' ? 'active' : ''}" data-filter="entertainment">娱乐</button>
                </div>
            </div>
        `;
    }

    renderDays() {
        if (!this.data.days) return '';
        
        return this.data.days.map(day => this.renderDay(day)).join('');
    }

    renderDay(dayData) {
        const isActive = dayData.day === this.activeDay;
        const activities = this.filterActivities(dayData.activities || []);
        
        return `
            <div class="day-item ${isActive ? 'active' : ''}" data-day="${dayData.day}">
                <div class="day-header">
                    <div class="day-number">${dayData.day}</div>
                    <div class="day-info">
                        <div class="day-date">${this.formatDate(dayData.date)}</div>
                        <div class="day-title">${dayData.title || ''}</div>
                    </div>
                    ${dayData.weather ? `<div class="day-weather">${dayData.weather}</div>` : ''}
                </div>
                <div class="day-activities">
                    ${activities.map((activity, index) => this.renderActivity(activity, index)).join('')}
                </div>
                ${dayData.accommodation ? this.renderAccommodation(dayData.accommodation) : ''}
            </div>
        `;
    }

    renderActivity(activity, index) {
        const typeClass = activity.type || 'other';
        const shouldShow = this.filterType === 'all' || this.filterType === activity.type;
        
        if (!shouldShow) return '';
        
        return `
            <div class="activity" data-activity-index="${index}">
                ${activity.time ? `<div class="activity-time">${activity.time}</div>` : ''}
                <div class="activity-icon">${activity.icon || this.getDefaultIcon(activity.type)}</div>
                <div class="activity-description">${activity.description}</div>
                <div class="activity-type ${typeClass}">${this.getTypeLabel(activity.type)}</div>
                ${activity.distance ? `<div class="route-distance">${activity.distance}</div>` : ''}
            </div>
        `;
    }

    renderAccommodation(accommodation) {
        return `
            <div class="hotel-info">
                🏨 住宿：${accommodation.name || '未指定'}
                ${accommodation.address ? `<br><small>${accommodation.address}</small>` : ''}
            </div>
        `;
    }

    filterActivities(activities) {
        if (this.filterType === 'all') return activities;
        return activities.filter(activity => activity.type === this.filterType);
    }

    getDefaultIcon(type) {
        const icons = {
            transport: '🚗',
            sightseeing: '⛩️',
            food: '🍽️',
            accommodation: '🏨',
            shopping: '🛍️',
            entertainment: '🎭'
        };
        return icons[type] || '📍';
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

    formatDate(dateString) {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const weekday = weekdays[date.getDay()];
        
        return `${month}.${day} ${weekday}`;
    }

    bindEvents() {
        // 日期点击事件
        this.container.addEventListener('click', (e) => {
            const dayItem = e.target.closest('.day-item');
            if (dayItem) {
                const day = parseInt(dayItem.dataset.day);
                this.setActiveDay(day);
                this.onDayClick(day);
            }

            // 筛选按钮点击事件
            const filterBtn = e.target.closest('.filter-btn');
            if (filterBtn) {
                const filterType = filterBtn.dataset.filter;
                this.setFilter(filterType);
                this.onFilterChange(filterType);
            }

            // 活动点击事件
            const activity = e.target.closest('.activity');
            if (activity && dayItem) {
                const day = parseInt(dayItem.dataset.day);
                const activityIndex = parseInt(activity.dataset.activityIndex);
                this.highlightActivity(day, activityIndex);
                
                // 触发地图聚焦
                if (typeof window.travelApp !== 'undefined' && window.travelApp.mapManager) {
                    window.travelApp.mapManager.focusOnActivity(day, activityIndex);
                }
            }
        });

        // 键盘导航
        this.container.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.navigateDay(-1);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.navigateDay(1);
            }
        });

        // 让容器可以接收键盘事件
        this.container.setAttribute('tabindex', '0');
    }

    setActiveDay(day) {
        if (day === this.activeDay) return;
        
        this.activeDay = day;
        
        // 更新UI
        this.container.querySelectorAll('.day-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeItem = this.container.querySelector(`[data-day="${day}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
            this.scrollToDay(activeItem);
        }
    }

    setFilter(filterType) {
        if (filterType === this.filterType) return;
        
        this.filterType = filterType;
        
        // 更新筛选按钮状态
        this.container.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = this.container.querySelector(`[data-filter="${filterType}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        // 重新渲染时间轴内容
        this.renderAndUpdateContent();
    }

    renderAndUpdateContent() {
        const content = this.container.querySelector('.timeline-content');
        if (content) {
            content.innerHTML = this.renderDays();
        }
    }

    highlightActivity(day, activityIndex) {
        // 移除之前的高亮
        this.container.querySelectorAll('.activity.highlighted').forEach(el => {
            el.classList.remove('highlighted');
        });
        
        // 添加新的高亮
        const dayItem = this.container.querySelector(`[data-day="${day}"]`);
        if (dayItem) {
            const activity = dayItem.querySelector(`[data-activity-index="${activityIndex}"]`);
            if (activity) {
                activity.classList.add('highlighted');
                
                // 滚动到活动位置
                setTimeout(() => {
                    activity.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                }, 100);
            }
        }
    }

    navigateDay(direction) {
        const newDay = this.activeDay + direction;
        const totalDays = this.data.days ? this.data.days.length : 0;
        
        if (newDay >= 1 && newDay <= totalDays) {
            this.setActiveDay(newDay);
            this.onDayClick(newDay);
        }
    }

    scrollToDay(dayElement) {
        if (!dayElement) return;
        
        // 平滑滚动到指定日期
        dayElement.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
        });
    }

    // 公共方法：外部调用更新数据
    updateData(newData) {
        this.data = newData;
        this.render();
        this.bindEvents();
    }

    // 公共方法：获取当前活跃的天数
    getActiveDay() {
        return this.activeDay;
    }

    // 公共方法：获取当前筛选类型
    getFilterType() {
        return this.filterType;
    }

    // 添加动画效果
    addAnimations() {
        // 为时间轴项目添加渐入动画
        const dayItems = this.container.querySelectorAll('.day-item');
        dayItems.forEach((item, index) => {
            item.style.animationDelay = `${index * 0.1}s`;
            item.classList.add('slide-in-left');
        });
    }

    // 销毁组件
    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
            this.container.removeEventListener('click', this.boundClickHandler);
            this.container.removeEventListener('keydown', this.boundKeyHandler);
        }
    }
}

// 添加高亮活动的CSS样式
const style = document.createElement('style');
style.textContent = `
    .activity.highlighted {
        background: rgba(102, 126, 234, 0.1);
        border-radius: 8px;
        transform: translateX(5px);
        box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
    }
    
    .day-info {
        flex: 1;
    }
    
    .day-title {
        font-size: 0.9em;
        color: var(--gray-600);
        margin-top: 2px;
    }
`;
document.head.appendChild(style);

// 导出组件
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Timeline;
} else {
    window.Timeline = Timeline;
}
