/**
 * DataManager - 数据加载和管理服务
 * 负责从JSON文件加载旅行数据和路由数据
 */

class DataManager {
    constructor(options = {}) {
        this.logger = options.logger || createLogger('DataManager');
        this.tripData = null;
        this.routeData = null;
    }

    /**
     * 加载所有数据
     * @returns {Promise<{tripData, routeData}>}
     */
    async loadAll() {
        this.logger.info("Loading all data...");
        this.logger.timeStart("Total Data Loading");

        await Promise.all([
            this.loadTripData(),
            this.loadRouteData()
        ]);

        this.logger.timeEnd("Total Data Loading");
        this.logger.info("All data loaded successfully");

        return {
            tripData: this.tripData,
            routeData: this.routeData
        };
    }

    /**
     * 加载旅行数据
     * @returns {Promise<Object>}
     */
    async loadTripData() {
        try {
            this.logger.debug("Loading trip data from JSON file...");
            const response = await fetch("./data/kansai-trip.json");

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            this.tripData = await response.json();
            this.logger.info("Trip data loaded successfully", {
                days: this.tripData?.days?.length,
                title: this.tripData?.tripInfo?.title
            });

            // 验证数据完整性
            this.validateTripData(this.tripData);

            return this.tripData;
        } catch (error) {
            this.logger.warn("Failed to load trip data, using fallback", error);
            this.tripData = this.getFallbackTripData();
            return this.tripData;
        }
    }

    /**
     * 加载路由数据
     * @returns {Promise<Object>}
     */
    async loadRouteData() {
        try {
            this.logger.debug("Loading route data from JSON file...");
            const response = await fetch("./data/routes.json");

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            this.routeData = await response.json();
            this.logger.info("Route data loaded successfully", {
                routes: this.routeData?.routes?.length,
                hasReturnRoute: !!this.routeData?.returnRoute
            });

            // 验证路由数据
            this.validateRouteData(this.routeData);

            return this.routeData;
        } catch (error) {
            this.logger.warn("Failed to load route data", error);
            this.routeData = null;
            return null;
        }
    }

    /**
     * 验证旅行数据完整性
     * @param {Object} data - 旅行数据
     */
    validateTripData(data) {
        if (!data || !data.days || !Array.isArray(data.days)) {
            this.logger.warn("Invalid trip data structure");
            return false;
        }

        if (data.days.length === 0) {
            this.logger.warn("Trip data has no days");
            return false;
        }

        // 验证每一天的数据结构
        data.days.forEach((day, index) => {
            if (!day.activities || !Array.isArray(day.activities)) {
                this.logger.warn(`Day ${index + 1} has no activities`);
            }
        });

        return true;
    }

    /**
     * 验证路由数据完整性
     * @param {Object} data - 路由数据
     */
    validateRouteData(data) {
        if (!data || !data.routes || !Array.isArray(data.routes)) {
            this.logger.warn("Invalid route data structure");
            return false;
        }

        if (data.routes.length === 0) {
            this.logger.warn("Route data has no routes");
            return false;
        }

        // 验证每条路由的数据结构
        data.routes.forEach((route, index) => {
            if (!route.start || !route.end) {
                this.logger.warn(`Route ${index} missing start or end`);
            }
            if (!route.start.lat || !route.start.lng || !route.end.lat || !route.end.lng) {
                this.logger.warn(`Route ${index} has invalid coordinates`);
            }
        });

        return true;
    }

    /**
     * 获取后备旅行数据（当加载失败时使用）
     * @returns {Object}
     */
    getFallbackTripData() {
        this.logger.debug("Using fallback trip data");
        return {
            tripInfo: {
                title: "关西之旅",
                dates: "2025年8月22日 - 8月31日",
                duration: "10天9晚",
                cities: ["和歌山", "白滨", "熊野", "京都", "大阪"]
            },
            days: []
        };
    }

    /**
     * 获取旅行数据
     * @returns {Object|null}
     */
    getTripData() {
        return this.tripData;
    }

    /**
     * 获取路由数据
     * @returns {Object|null}
     */
    getRouteData() {
        return this.routeData;
    }

    /**
     * 获取指定天的数据
     * @param {number} day - 天数 (1-based)
     * @returns {Object|null}
     */
    getDayData(day) {
        if (!this.tripData || !this.tripData.days) {
            return null;
        }

        const dayIndex = day - 1;
        if (dayIndex < 0 || dayIndex >= this.tripData.days.length) {
            this.logger.warn(`Invalid day number: ${day}`);
            return null;
        }

        return this.tripData.days[dayIndex];
    }

    /**
     * 获取指定天的路由段
     * @param {number} day - 天数 (1-based)
     * @returns {Array}
     */
    getRoutesForDay(day) {
        if (!this.routeData || !this.routeData.routes) {
            return [];
        }

        return this.routeData.routes.filter(route => route.day === day);
    }

    /**
     * 获取所有路由段
     * @returns {Array}
     */
    getAllRoutes() {
        if (!this.routeData || !this.routeData.routes) {
            return [];
        }

        return this.routeData.routes;
    }

    /**
     * 获取返程路由
     * @returns {Object|null}
     */
    getReturnRoute() {
        if (!this.routeData || !this.routeData.returnRoute) {
            return null;
        }

        return this.routeData.returnRoute;
    }

    /**
     * 获取统计信息
     * @returns {Object}
     */
    getStatistics() {
        const stats = {
            totalDays: this.tripData?.days?.length || 0,
            totalRoutes: this.routeData?.routes?.length || 0,
            cities: this.tripData?.tripInfo?.cities || [],
            hasReturnRoute: !!this.routeData?.returnRoute
        };

        // 计算每种类型的活动数量
        if (this.tripData && this.tripData.days) {
            const activityTypes = {};
            this.tripData.days.forEach(day => {
                if (day.activities) {
                    day.activities.forEach(activity => {
                        const type = activity.type || 'other';
                        activityTypes[type] = (activityTypes[type] || 0) + 1;
                    });
                }
            });
            stats.activityTypes = activityTypes;
        }

        return stats;
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataManager;
}
