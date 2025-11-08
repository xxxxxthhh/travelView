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

    /* ============================================
       Supabase Integration Methods
       ============================================ */

    /**
     * Get Supabase client
     */
    getSupabaseClient() {
        return window.supabaseClient || null;
    }

    /**
     * Load user's trips from Supabase
     * @param {string} userId - User ID
     * @returns {Promise<Array>}
     */
    async loadUserTrips(userId) {
        const supabase = this.getSupabaseClient();
        if (!supabase) {
            this.logger.error('Supabase client not available');
            return [];
        }

        try {
            const { data, error } = await supabase
                .from('trips')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            this.logger.info('User trips loaded', { count: data.length });
            return data || [];
        } catch (error) {
            this.logger.error('Failed to load user trips', error);
            throw error;
        }
    }

    /**
     * Create new trip
     * @param {Object} tripData - Trip data
     * @returns {Promise<Object>}
     */
    async createTrip(tripData) {
        const supabase = this.getSupabaseClient();
        if (!supabase) {
            this.logger.error('Supabase client not available');
            throw new Error('Supabase not available');
        }

        try {
            const { data, error } = await supabase
                .from('trips')
                .insert([tripData])
                .select()
                .single();

            if (error) throw error;

            this.logger.info('Trip created', { tripId: data.id });
            return data;
        } catch (error) {
            this.logger.error('Failed to create trip', error);
            throw error;
        }
    }

    /**
     * Update trip
     * @param {string} tripId - Trip ID
     * @param {Object} tripData - Updated trip data
     * @returns {Promise<Object>}
     */
    async updateTrip(tripId, tripData) {
        const supabase = this.getSupabaseClient();
        if (!supabase) {
            this.logger.error('Supabase client not available');
            throw new Error('Supabase not available');
        }

        try {
            const { data, error } = await supabase
                .from('trips')
                .update(tripData)
                .eq('id', tripId)
                .select()
                .single();

            if (error) throw error;

            this.logger.info('Trip updated', { tripId: data.id });
            return data;
        } catch (error) {
            this.logger.error('Failed to update trip', error);
            throw error;
        }
    }

    /**
     * Delete trip
     * @param {string} tripId - Trip ID
     * @returns {Promise<void>}
     */
    async deleteTrip(tripId) {
        const supabase = this.getSupabaseClient();
        if (!supabase) {
            this.logger.error('Supabase client not available');
            throw new Error('Supabase not available');
        }

        try {
            const { error } = await supabase
                .from('trips')
                .delete()
                .eq('id', tripId);

            if (error) throw error;

            this.logger.info('Trip deleted', { tripId });
        } catch (error) {
            this.logger.error('Failed to delete trip', error);
            throw error;
        }
    }

    /**
     * Load trip data from Supabase (days and activities)
     * @param {string} tripId - Trip ID
     * @returns {Promise<Object|null>}
     */
    async loadTripDataFromDB(tripId) {
        const supabase = this.getSupabaseClient();
        if (!supabase) {
            this.logger.error('Supabase client not available');
            return null;
        }

        try {
            // Load trip info
            const { data: trip, error: tripError } = await supabase
                .from('trips')
                .select('*')
                .eq('id', tripId)
                .single();

            if (tripError) throw tripError;

            // Load days with activities
            const { data: days, error: daysError } = await supabase
                .from('days')
                .select(`
                    *,
                    activities (
                        *
                    )
                `)
                .eq('trip_id', tripId)
                .order('day_number', { ascending: true });

            if (daysError) throw daysError;

            // Format data to match kansai-trip.json structure
            const tripData = {
                tripInfo: {
                    title: trip.title,
                    destination: trip.destination || '',
                    dates: this.formatDateRange(trip.start_date, trip.end_date),
                    duration: this.calculateDuration(trip.start_date, trip.end_date)
                },
                days: (days || []).map(day => ({
                    day: day.day_number,
                    date: day.date,
                    activities: (day.activities || [])
                        .sort((a, b) => a.order_index - b.order_index)
                        .map(act => ({
                            time: act.time,
                            type: act.type,
                            description: act.description,
                            location: act.location,
                            icon: this.getActivityIcon(act.type),
                            ...act.metadata
                        })),
                    accommodation: day.accommodation || null
                }))
            };

            this.logger.info('Trip data loaded from Supabase', { tripId, days: (days || []).length });
            return tripData;
        } catch (error) {
            this.logger.error('Failed to load trip data from Supabase', error);
            return null;
        }
    }

    /**
     * Load route data from Supabase
     * @param {string} tripId - Trip ID
     * @returns {Promise<Object|null>}
     */
    async loadRouteDataFromDB(tripId) {
        const supabase = this.getSupabaseClient();
        if (!supabase) {
            this.logger.error('Supabase client not available');
            return null;
        }

        try {
            const { data: routes, error } = await supabase
                .from('routes')
                .select('*')
                .eq('trip_id', tripId)
                .order('day', { ascending: true });

            if (error) throw error;

            // Format data to match routes.json structure
            const routeData = {
                routes: (routes || []).map(route => ({
                    day: route.day,
                    start: route.start_location,
                    end: route.end_location,
                    color: route.color || '#667eea',
                    label: route.label || ''
                })),
                returnRoute: null // Can be implemented later
            };

            this.logger.info('Route data loaded from Supabase', { tripId, routes: (routes || []).length });
            return routeData;
        } catch (error) {
            this.logger.error('Failed to load route data from Supabase', error);
            return null;
        }
    }

    /**
     * Save trip data to Supabase
     * @param {string} tripId - Trip ID
     * @param {Object} tripData - Trip data in kansai-trip.json format
     * @returns {Promise<void>}
     */
    async saveTripData(tripId, tripData) {
        const supabase = this.getSupabaseClient();
        if (!supabase) {
            this.logger.error('Supabase client not available');
            throw new Error('Supabase not available');
        }

        try {
            // Delete existing days and activities (cascade will handle activities)
            await supabase
                .from('days')
                .delete()
                .eq('trip_id', tripId);

            // Insert days and activities
            for (const dayData of tripData.days) {
                // Insert day
                const { data: day, error: dayError } = await supabase
                    .from('days')
                    .insert({
                        trip_id: tripId,
                        day_number: dayData.day,
                        date: dayData.date,
                        accommodation: dayData.accommodation || null
                    })
                    .select()
                    .single();

                if (dayError) throw dayError;

                // Insert activities
                if (dayData.activities && dayData.activities.length > 0) {
                    const activities = dayData.activities.map((act, index) => ({
                        day_id: day.id,
                        time: act.time,
                        type: act.type,
                        description: act.description,
                        location: act.location,
                        order_index: index,
                        metadata: {
                            icon: act.icon,
                            ...act
                        }
                    }));

                    const { error: actError } = await supabase
                        .from('activities')
                        .insert(activities);

                    if (actError) throw actError;
                }
            }

            this.logger.info('Trip data saved to Supabase', { tripId });
        } catch (error) {
            this.logger.error('Failed to save trip data to Supabase', error);
            throw error;
        }
    }

    /**
     * Save route data to Supabase
     * @param {string} tripId - Trip ID
     * @param {Object} routeData - Route data in routes.json format
     * @returns {Promise<void>}
     */
    async saveRouteData(tripId, routeData) {
        const supabase = this.getSupabaseClient();
        if (!supabase) {
            this.logger.error('Supabase client not available');
            throw new Error('Supabase not available');
        }

        try {
            // Delete existing routes
            await supabase
                .from('routes')
                .delete()
                .eq('trip_id', tripId);

            // Insert routes
            if (routeData.routes && routeData.routes.length > 0) {
                const routes = routeData.routes.map(route => ({
                    trip_id: tripId,
                    day: route.day,
                    start_location: route.start,
                    end_location: route.end,
                    color: route.color || '#667eea',
                    label: route.label || ''
                }));

                const { error } = await supabase
                    .from('routes')
                    .insert(routes);

                if (error) throw error;
            }

            this.logger.info('Route data saved to Supabase', { tripId });
        } catch (error) {
            this.logger.error('Failed to save route data to Supabase', error);
            throw error;
        }
    }

    /**
     * Helper: Format date range
     */
    formatDateRange(startDate, endDate) {
        if (!startDate && !endDate) return '';
        const start = startDate ? new Date(startDate).toLocaleDateString('zh-CN') : '';
        const end = endDate ? new Date(endDate).toLocaleDateString('zh-CN') : '';
        return end ? `${start} - ${end}` : start;
    }

    /**
     * Helper: Calculate duration
     */
    calculateDuration(startDate, endDate) {
        if (!startDate || !endDate) return '';
        const start = new Date(startDate);
        const end = new Date(endDate);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        return `${days}天${days - 1}晚`;
    }

    /**
     * Helper: Get activity icon
     */
    getActivityIcon(type) {
        const icons = {
            transport: '🚗',
            sightseeing: '⛩️',
            food: '🍽️',
            accommodation: '🏨',
            entertainment: '🎉'
        };
        return icons[type] || '📍';
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataManager;
}
