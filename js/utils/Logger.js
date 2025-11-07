/**
 * Logger - 统一的日志工具类
 * 提供结构化的日志输出，支持不同日志级别和生产环境配置
 */

class Logger {
    constructor(options = {}) {
        this.enabled = options.enabled !== undefined ? options.enabled : true;
        this.level = options.level || 'info'; // debug, info, warn, error
        this.prefix = options.prefix || '';

        // 日志级别优先级
        this.levels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3
        };

        // 在生产环境禁用 debug 日志
        if (this.isProduction()) {
            this.level = 'warn';
        }
    }

    isProduction() {
        return window.location.hostname !== 'localhost'
            && window.location.hostname !== '127.0.0.1'
            && !window.location.hostname.includes('local');
    }

    shouldLog(level) {
        if (!this.enabled) return false;
        return this.levels[level] >= this.levels[this.level];
    }

    formatMessage(message, data) {
        const timestamp = new Date().toLocaleTimeString();
        const prefix = this.prefix ? `[${this.prefix}]` : '';
        return {
            timestamp,
            prefix,
            message,
            data
        };
    }

    /**
     * Debug级别日志 - 详细的调试信息
     * @param {string} message - 日志消息
     * @param {*} data - 附加数据
     */
    debug(message, data) {
        if (!this.shouldLog('debug')) return;
        const formatted = this.formatMessage(message, data);
        console.log(
            `🔍 [DEBUG] ${formatted.timestamp} ${formatted.prefix} ${message}`,
            data !== undefined ? data : ''
        );
    }

    /**
     * Info级别日志 - 一般信息
     * @param {string} message - 日志消息
     * @param {*} data - 附加数据
     */
    info(message, data) {
        if (!this.shouldLog('info')) return;
        const formatted = this.formatMessage(message, data);
        console.log(
            `ℹ️ [INFO] ${formatted.timestamp} ${formatted.prefix} ${message}`,
            data !== undefined ? data : ''
        );
    }

    /**
     * Warn级别日志 - 警告信息
     * @param {string} message - 日志消息
     * @param {*} data - 附加数据
     */
    warn(message, data) {
        if (!this.shouldLog('warn')) return;
        const formatted = this.formatMessage(message, data);
        console.warn(
            `⚠️ [WARN] ${formatted.timestamp} ${formatted.prefix} ${message}`,
            data !== undefined ? data : ''
        );
    }

    /**
     * Error级别日志 - 错误信息
     * @param {string} message - 日志消息
     * @param {Error|*} error - 错误对象或附加数据
     */
    error(message, error) {
        if (!this.shouldLog('error')) return;
        const formatted = this.formatMessage(message, error);
        console.error(
            `❌ [ERROR] ${formatted.timestamp} ${formatted.prefix} ${message}`,
            error !== undefined ? error : ''
        );

        // 在生产环境可以发送错误到监控服务
        if (this.isProduction() && error instanceof Error) {
            this.reportError(message, error);
        }
    }

    /**
     * 发送错误报告到监控服务（预留接口）
     * @param {string} message - 错误消息
     * @param {Error} error - 错误对象
     */
    reportError(message, error) {
        // TODO: 集成 Sentry 或其他错误监控服务
        // Example:
        // if (window.Sentry) {
        //     Sentry.captureException(error, {
        //         tags: { source: this.prefix },
        //         extra: { message }
        //     });
        // }
    }

    /**
     * 性能标记 - 开始计时
     * @param {string} label - 标记名称
     */
    timeStart(label) {
        if (!this.shouldLog('debug')) return;
        console.time(`⏱️ ${label}`);
    }

    /**
     * 性能标记 - 结束计时
     * @param {string} label - 标记名称
     */
    timeEnd(label) {
        if (!this.shouldLog('debug')) return;
        console.timeEnd(`⏱️ ${label}`);
    }

    /**
     * 分组日志 - 开始
     * @param {string} label - 分组名称
     * @param {boolean} collapsed - 是否折叠
     */
    group(label, collapsed = false) {
        if (!this.shouldLog('debug')) return;
        if (collapsed) {
            console.groupCollapsed(label);
        } else {
            console.group(label);
        }
    }

    /**
     * 分组日志 - 结束
     */
    groupEnd() {
        if (!this.shouldLog('debug')) return;
        console.groupEnd();
    }

    /**
     * 表格展示数据
     * @param {Array|Object} data - 数据
     */
    table(data) {
        if (!this.shouldLog('debug')) return;
        console.table(data);
    }
}

// 创建默认日志器实例
const logger = new Logger({ prefix: 'TravelApp' });

// 创建特定模块的日志器
const createLogger = (prefix, options = {}) => {
    return new Logger({ ...options, prefix });
};

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Logger, logger, createLogger };
}
