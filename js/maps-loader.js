/**
 * Google Maps API 动态加载器
 * 根据配置安全地加载Google Maps API
 */

class GoogleMapsLoader {
    constructor() {
        this.isLoaded = false;
        this.isLoading = false;
        this.callbacks = [];
    }

    /**
     * 加载Google Maps API
     * @param {Object} config - 配置对象
     * @returns {Promise} - 加载完成的Promise
     */
    async load(config = window.MAPS_CONFIG) {
        return new Promise((resolve, reject) => {
            // 如果已经加载，直接resolve
            if (this.isLoaded && typeof google !== 'undefined' && google.maps) {
                resolve(google.maps);
                return;
            }

            // 添加到回调队列
            this.callbacks.push({ resolve, reject });

            // 如果正在加载，不重复加载
            if (this.isLoading) {
                return;
            }

            // 检查配置
            if (!config || !config.ENABLE_MAPS || !config.API_KEY) {
                const error = new Error('Google Maps API未配置或已禁用');
                this.rejectAll(error);
                return;
            }

            this.isLoading = true;

            try {
                // 创建script标签
                const script = document.createElement('script');
                script.type = 'text/javascript';
                script.async = true;
                script.defer = true;

                // 构建API URL - 从配置读取libraries
                const libraries = config.LIBRARIES && config.LIBRARIES.length > 0
                    ? config.LIBRARIES.join(',')
                    : 'geometry,places'; // 默认包含geometry和places

                const params = new URLSearchParams({
                    key: config.API_KEY,
                    libraries: libraries,
                    callback: 'initGoogleMaps',
                    loading: 'async'
                });

                script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;

                // 设置全局回调函数
                window.initGoogleMaps = () => {
                    this.isLoaded = true;
                    this.isLoading = false;
                    console.log(`✅ Google Maps API 加载成功 (libraries: ${libraries})`);
                    this.resolveAll(google.maps);

                    // 清理全局回调
                    delete window.initGoogleMaps;
                };

                // 错误处理
                script.onerror = (error) => {
                    this.isLoading = false;
                    console.error('❌ Google Maps API 加载失败:', error);
                    const mapError = new Error('无法加载 Google Maps API，请检查网络连接和API密钥');
                    this.rejectAll(mapError);
                };

                // 超时处理
                setTimeout(() => {
                    if (this.isLoading && !this.isLoaded) {
                        this.isLoading = false;
                        const timeoutError = new Error('Google Maps API 加载超时');
                        this.rejectAll(timeoutError);
                    }
                }, 10000); // 10秒超时

                // 添加到页面
                document.head.appendChild(script);

            } catch (error) {
                this.isLoading = false;
                console.error('❌ 创建 Google Maps 脚本标签失败:', error);
                this.rejectAll(error);
            }
        });
    }

    /**
     * 检查API是否可用
     * @returns {boolean}
     */
    isAvailable() {
        return this.isLoaded && typeof google !== 'undefined' && google.maps;
    }

    /**
     * 成功回调所有等待的Promise
     * @param {Object} maps - Google Maps对象
     */
    resolveAll(maps) {
        this.callbacks.forEach(callback => {
            try {
                callback.resolve(maps);
            } catch (error) {
                console.error('回调执行失败:', error);
            }
        });
        this.callbacks = [];
    }

    /**
     * 拒绝所有等待的Promise
     * @param {Error} error - 错误对象
     */
    rejectAll(error) {
        this.callbacks.forEach(callback => {
            try {
                callback.reject(error);
            } catch (callbackError) {
                console.error('错误回调执行失败:', callbackError);
            }
        });
        this.callbacks = [];
    }

    /**
     * 验证API Key格式
     * @param {string} apiKey - API密钥
     * @returns {boolean}
     */
    static validateApiKey(apiKey) {
        if (!apiKey || typeof apiKey !== 'string') {
            return false;
        }
        
        // Google Maps API Key通常是39个字符
        // 格式：AIza[A-Za-z0-9_-]{35}
        const apiKeyPattern = /^AIza[A-Za-z0-9_-]{35}$/;
        return apiKeyPattern.test(apiKey);
    }

    /**
     * 获取API Key状态信息
     * @param {Object} config - 配置对象
     * @returns {Object} 状态信息
     */
    static getApiKeyStatus(config) {
        if (!config) {
            return { valid: false, message: '配置未找到' };
        }

        if (!config.ENABLE_MAPS) {
            return { valid: false, message: '地图功能已禁用' };
        }

        if (!config.API_KEY) {
            return { valid: false, message: 'API Key未设置' };
        }

        if (!this.validateApiKey(config.API_KEY)) {
            return { valid: false, message: 'API Key格式无效' };
        }

        return { valid: true, message: 'API Key格式正确' };
    }
}

// 创建全局实例
window.googleMapsLoader = new GoogleMapsLoader();

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GoogleMapsLoader;
}
