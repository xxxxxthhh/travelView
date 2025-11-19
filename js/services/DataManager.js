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
                    id: day.id,
                    day: day.day_number,
                    date: day.date,
                    title: day.title || '',
                    ...this.parseDayNotes(day.notes),
                    activities: (day.activities || [])
                        .sort((a, b) => a.order_index - b.order_index)
                        .map(act => ({
                            id: act.id,
                            time: act.time,
                            type: act.type,
                            description: act.description,
                            location: act.location,
                            icon: this.getActivityIcon(act.type),
                            ...act.metadata
                        }))
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

    /* ============================================
       Granular Persistence Methods
       ============================================ */

    /**
     * Add a new day
     * @param {string} tripId - Trip ID
     * @param {Object} dayData - Day data
     * @returns {Promise<Object>}
     */
    async addDay(tripId, dayData) {
        const supabase = this.getSupabaseClient();
        if (!supabase) throw new Error('Supabase not available');

        try {
            const { data, error } = await supabase
                .from('days')
                .insert({
                    trip_id: tripId,
                    day_number: dayData.day,
                    date: dayData.date,
                    title: dayData.title || null,
                    notes: dayData.notes || null
                })
                .select()
                .single();

            if (error) throw error;
            this.logger.info('Day added', { dayId: data.id });
            return data;
        } catch (error) {
            this.logger.error('Failed to add day', error);
            throw error;
        }
    }

    /**
     * Update an existing day
     * @param {string} dayId - Day ID (database ID) or Trip ID + Day Number (if we don't have ID)
     * @param {Object} dayData - Day data to update
     * @returns {Promise<Object>}
     */
    async updateDay(tripId, dayNumber, dayData) {
        const supabase = this.getSupabaseClient();
        if (!supabase) throw new Error('Supabase not available');

        try {
            // First find the day ID using trip_id and day_number
            const { data: day, error: findError } = await supabase
                .from('days')
                .select('id')
                .eq('trip_id', tripId)
                .eq('day_number', dayNumber)
                .single();

            if (findError) throw findError;

            const updates = {
                date: dayData.date,
                title: dayData.title || null,
                notes: dayData.notes || null
            };

            const { data, error } = await supabase
                .from('days')
                .update(updates)
                .eq('id', day.id)
                .select()
                .single();

            if (error) throw error;
            this.logger.info('Day updated', { dayId: day.id });
            return data;
        } catch (error) {
            this.logger.error('Failed to update day', error);
            throw error;
        }
    }

    /**
     * Delete a day
     * @param {string} tripId - Trip ID
     * @param {number} dayNumber - Day number to delete
     * @returns {Promise<void>}
     */
    async deleteDay(tripId, dayNumber) {
        const supabase = this.getSupabaseClient();
        if (!supabase) throw new Error('Supabase not available');

        try {
            // 1. Find the day to delete
            const { data: dayToDelete, error: findError } = await supabase
                .from('days')
                .select('id')
                .eq('trip_id', tripId)
                .eq('day_number', dayNumber)
                .single();

            if (findError) throw findError;

            // 2. Delete the day (cascade will delete activities)
            const { error: deleteError } = await supabase
                .from('days')
                .delete()
                .eq('id', dayToDelete.id);

            if (deleteError) throw deleteError;

            // 3. Reorder remaining days
            // This is a bit complex in SQL, might be easier to just update the remaining days one by one
            // or call a stored procedure if we had one. For now, let's fetch and update.
            const { data: remainingDays, error: fetchError } = await supabase
                .from('days')
                .select('id, day_number')
                .eq('trip_id', tripId)
                .gt('day_number', dayNumber)
                .order('day_number', { ascending: true });

            if (!fetchError && remainingDays && remainingDays.length > 0) {
                for (const day of remainingDays) {
                    await supabase
                        .from('days')
                        .update({ day_number: day.day_number - 1 })
                        .eq('id', day.id);
                }
            }

            this.logger.info('Day deleted and reordered', { dayNumber });
        } catch (error) {
            this.logger.error('Failed to delete day', error);
            throw error;
        }
    }

    /**
     * Add a new activity
     * @param {string} tripId - Trip ID
     * @param {number} dayNumber - Day number
     * @param {Object} activityData - Activity data
     * @returns {Promise<Object>}
     */
    async addActivity(tripId, dayNumber, activityData) {
        const supabase = this.getSupabaseClient();
        if (!supabase) throw new Error('Supabase not available');

        try {
            // Find day ID
            const { data: day, error: findError } = await supabase
                .from('days')
                .select('id')
                .eq('trip_id', tripId)
                .eq('day_number', dayNumber)
                .single();

            if (findError) throw findError;

            // Prepare activity data
            const activity = {
                day_id: day.id,
                time: activityData.time,
                type: activityData.type,
                description: activityData.description,
                location: this.prepareLocationForStorage(activityData.location),
                order_index: activityData.order_index || 0, // Should calculate this properly if not provided
                metadata: {
                    icon: activityData.icon,
                    ...activityData.metadata
                }
            };

            const { data, error } = await supabase
                .from('activities')
                .insert(activity)
                .select()
                .single();

            if (error) throw error;
            this.logger.info('Activity added', { activityId: data.id });
            return data;
        } catch (error) {
            this.logger.error('Failed to add activity', error);
            throw error;
        }
    }

    /**
     * Update an activity
     * @param {string} tripId - Trip ID
     * @param {number} dayNumber - Day number
     * @param {number} activityIndex - Activity index (0-based)
     * @param {Object} activityData - New activity data
     * @returns {Promise<Object>}
     */
    async updateActivity(tripId, dayNumber, activityIndex, activityData) {
        const supabase = this.getSupabaseClient();
        if (!supabase) throw new Error('Supabase not available');

        try {
            // Find day ID
            const { data: day, error: findError } = await supabase
                .from('days')
                .select('id')
                .eq('trip_id', tripId)
                .eq('day_number', dayNumber)
                .single();

            if (findError) throw findError;

            // Find activity by order_index
            // Note: This relies on order_index being consistent. 
            // A better approach would be to use activity ID, but the UI currently uses indices.
            const { data: activity, error: findActError } = await supabase
                .from('activities')
                .select('id')
                .eq('day_id', day.id)
                .eq('order_index', activityIndex)
                .single();

            if (findActError) throw findActError;

            const updates = {
                time: activityData.time,
                type: activityData.type,
                description: activityData.description,
                location: this.prepareLocationForStorage(activityData.location),
                metadata: {
                    icon: activityData.icon,
                    ...activityData.metadata
                }
            };

            const { data, error } = await supabase
                .from('activities')
                .update(updates)
                .eq('id', activity.id)
                .select()
                .single();

            if (error) throw error;
            this.logger.info('Activity updated', { activityId: data.id });
            return data;
        } catch (error) {
            this.logger.error('Failed to update activity', error);
            throw error;
        }
    }

    /**
     * Delete an activity
     * @param {string} tripId - Trip ID
     * @param {number} dayNumber - Day number
     * @param {number} activityIndex - Activity index to delete
     * @returns {Promise<void>}
     */
    async deleteActivity(tripId, dayNumber, activityIndex) {
        const supabase = this.getSupabaseClient();
        if (!supabase) throw new Error('Supabase not available');

        try {
            // Find day ID
            const { data: day, error: findError } = await supabase
                .from('days')
                .select('id')
                .eq('trip_id', tripId)
                .eq('day_number', dayNumber)
                .single();

            if (findError) throw findError;

            // Find activity
            const { data: activity, error: findActError } = await supabase
                .from('activities')
                .select('id')
                .eq('day_id', day.id)
                .eq('order_index', activityIndex)
                .single();

            if (findActError) throw findActError;

            // Delete activity
            const { error: deleteError } = await supabase
                .from('activities')
                .delete()
                .eq('id', activity.id);

            if (deleteError) throw deleteError;

            // Reorder remaining activities
            const { data: remainingActivities, error: fetchError } = await supabase
                .from('activities')
                .select('id, order_index')
                .eq('day_id', day.id)
                .gt('order_index', activityIndex)
                .order('order_index', { ascending: true });

            if (!fetchError && remainingActivities && remainingActivities.length > 0) {
                for (const act of remainingActivities) {
                    await supabase
                        .from('activities')
                        .update({ order_index: act.order_index - 1 })
                        .eq('id', act.id);
                }
            }

            this.logger.info('Activity deleted and reordered');
        } catch (error) {
            this.logger.error('Failed to delete activity', error);
            throw error;
        }
    }

    /**
     * DEPRECATED: Save trip data to Supabase (Full Overwrite)
     * Use granular methods instead.
     * @deprecated
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
            // Validate trip data before saving
            if (!this.validateTripDataForSave(tripData)) {
                throw new Error('Invalid trip data format');
            }

            // Delete existing days and activities (cascade will handle activities)
            const { error: deleteError } = await supabase
                .from('days')
                .delete()
                .eq('trip_id', tripId);

            if (deleteError) {
                this.logger.error('Failed to delete existing days', deleteError);
                throw deleteError;
            }

            // Insert days and activities
            if (tripData.days && tripData.days.length > 0) {
                for (const dayData of tripData.days) {
                    // Validate day data
                    if (!dayData.day || !dayData.date) {
                        this.logger.warn('Skipping invalid day data', dayData);
                        continue;
                    }

                    // Insert day
                    const { data: day, error: dayError } = await supabase
                        .from('days')
                        .insert({
                            trip_id: tripId,
                            day_number: dayData.day,
                            date: dayData.date,
                            title: dayData.title || null,
                            notes: dayData.notes || null
                        })
                        .select()
                        .single();

                    if (dayError) {
                        this.logger.error('Failed to insert day', { dayNumber: dayData.day, error: dayError });
                        throw dayError;
                    }

                    // Insert activities
                    if (dayData.activities && dayData.activities.length > 0) {
                        const activities = dayData.activities
                            .filter(act => this.validateActivityData(act))
                            .map((act, index) => ({
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

                        if (activities.length > 0) {
                            const { error: actError } = await supabase
                                .from('activities')
                                .insert(activities);

                            if (actError) {
                                this.logger.error('Failed to insert activities', { dayId: day.id, error: actError });
                                throw actError;
                            }
                        }
                    }
                }
            }

            this.logger.info('Trip data saved to Supabase', { tripId, daysCount: tripData.days?.length || 0 });
        } catch (error) {
            this.logger.error('Failed to save trip data to Supabase', error);
            throw error;
        }
    }

    /**
     * Validate trip data for saving
     * @param {Object} tripData - Trip data to validate
     * @returns {boolean}
     */
    validateTripDataForSave(tripData) {
        if (!tripData) {
            this.logger.error('Trip data is null or undefined');
            return false;
        }

        if (!tripData.days || !Array.isArray(tripData.days)) {
            this.logger.error('Trip data missing days array');
            return false;
        }

        return true;
    }

    /**
     * Validate activity data
     * @param {Object} activity - Activity data to validate
     * @returns {boolean}
     */
    validateActivityData(activity) {
        if (!activity) {
            this.logger.warn('Activity is null or undefined');
            return false;
        }

        if (!activity.description) {
            this.logger.warn('Activity missing description', activity);
            return false;
        }

        if (!activity.location || !activity.location.lat || !activity.location.lng) {
            this.logger.warn('Activity missing valid location', activity);
            return false;
        }

        // Validate coordinates
        const lat = parseFloat(activity.location.lat);
        const lng = parseFloat(activity.location.lng);

        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            this.logger.warn('Activity has invalid coordinates', activity);
            return false;
        }

        return true;
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

    /**
     * Helper: Parse day notes stored as JSON
     */
    parseDayNotes(notes) {
        if (!notes) {
            return { weather: '', notes: '', accommodation: null };
        }

        try {
            const parsed = typeof notes === 'string' ? JSON.parse(notes) : notes;
            const accommodation = parsed.accommodation ? this.prepareAccommodationForStorage(parsed.accommodation) : null;

            if (accommodation && accommodation.location) {
                const { lat, lng } = accommodation.location;
                const latNum = typeof lat === 'number' ? lat : parseFloat(lat);
                const lngNum = typeof lng === 'number' ? lng : parseFloat(lng);
                if (!isNaN(latNum) && !isNaN(lngNum)) {
                    accommodation.location = { lat: latNum, lng: lngNum };
                } else {
                    delete accommodation.location;
                }
            }

            return {
                weather: parsed.weather || '',
                notes: parsed.notes || '',
                accommodation
            };
        } catch (error) {
            this.logger.warn('Failed to parse day notes, treating as plain text', error);
            return { weather: '', notes: notes || '', accommodation: null };
        }
    }

    /**
     * Helper: Prepare accommodation object for storage
     */
    prepareAccommodationForStorage(accommodation) {
        if (!accommodation) return null;

        const result = {};

        if (accommodation.name) {
            result.name = accommodation.name;
        }

        if (accommodation.address) {
            result.address = accommodation.address;
        }

        if (accommodation.location) {
            const lat = typeof accommodation.location.lat === 'number'
                ? accommodation.location.lat
                : parseFloat(accommodation.location.lat);
            const lng = typeof accommodation.location.lng === 'number'
                ? accommodation.location.lng
                : parseFloat(accommodation.location.lng);

            if (!isNaN(lat) && !isNaN(lng)) {
                result.location = { lat, lng };
            }
        }

        return Object.keys(result).length > 0 ? result : null;
    }

    /**
     * Helper: Normalize location payload
     */
    prepareLocationForStorage(location) {
        if (!location) return null;

        const lat = typeof location.lat === 'number' ? location.lat : parseFloat(location.lat);
        const lng = typeof location.lng === 'number' ? location.lng : parseFloat(location.lng);

        if (isNaN(lat) || isNaN(lng)) {
            return null;
        }

        const payload = { lat, lng };

        if (location.name) {
            payload.name = location.name;
        }

        if (location.address) {
            payload.address = location.address;
        }

        if (location.place_id) {
            payload.place_id = location.place_id;
        }

        return payload;
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataManager;
}
