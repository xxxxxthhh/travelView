/**
 * Google Maps API配置模板
 *
 * 本地开发说明：
 * 1. 复制 config.js.example 为 config.js
 * 2. 在 config.js 中填入你的真实 Google Maps API Key
 * 3. config.js 已在 .gitignore 中，不会被提交
 *
 * GitHub Pages 部署：
 * 此文件会被 GitHub Actions 自动生成，使用 GitHub Secrets 中的 API Key
 */

// 生产环境配置
const MAPS_CONFIG = {
    // ⚠️ 请勿在此文件中填写真实的 API Key
    // 本地开发: 使用 config.js.example 创建本地 config.js
    // 生产部署: 由 GitHub Actions 自动注入
    API_KEY: 'YOUR_GOOGLE_MAPS_API_KEY_HERE',  // 👈 本地开发请使用 config.js.example
    
    // API库
    LIBRARIES: ['geometry'],
    
    // 地图默认配置
    DEFAULT_CENTER: { lat: 34.6560, lng: 135.5060 }, // 关西地区
    DEFAULT_ZOOM: 8,
    
    // 是否启用地图功能
    ENABLE_MAPS: true
};

// 开发环境下的演示模式
const DEMO_CONFIG = {
    API_KEY: null,
    ENABLE_MAPS: false,
    DEMO_MODE: true
};

// 根据环境选择配置
const CONFIG = (function() {
    // 检查是否在本地开发环境
    const isLocalhost = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' || 
                       window.location.protocol === 'file:';
    
    // 检查是否设置了演示模式
    const isDemoMode = window.DEMO_MODE === true;
    
    // 检查API密钥是否已配置
    const hasValidApiKey = MAPS_CONFIG.API_KEY && 
                          MAPS_CONFIG.API_KEY !== 'YOUR_GOOGLE_MAPS_API_KEY_HERE';
    
    if (isDemoMode || !hasValidApiKey) {
        console.log('🎭 运行在演示模式下 - 地图功能已禁用');
        return DEMO_CONFIG;
    }
    
    return MAPS_CONFIG;
})();

// 导出配置
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, MAPS_CONFIG, DEMO_CONFIG };
} else {
    window.MAPS_CONFIG = CONFIG;
}
