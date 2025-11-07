/**
 * AuthManager - 用户认证管理
 * 处理注册、登录、登出和会话管理
 */

class AuthManager {
    constructor() {
        this.supabase = window.supabaseClient;
        this.currentUser = null;
        this.authStateCallbacks = [];

        this.init();
    }

    async init() {
        // 检查当前会话
        const { data: { session } } = await this.supabase.auth.getSession();

        if (session) {
            this.currentUser = session.user;
            this.notifyAuthStateChange('SIGNED_IN', session);
        }

        // 监听认证状态变化
        this.supabase.auth.onAuthStateChange((event, session) => {
            console.log('🔐 Auth state changed:', event);

            if (event === 'SIGNED_IN') {
                this.currentUser = session.user;
                this.notifyAuthStateChange('SIGNED_IN', session);
            } else if (event === 'SIGNED_OUT') {
                this.currentUser = null;
                this.notifyAuthStateChange('SIGNED_OUT', null);
            } else if (event === 'USER_UPDATED') {
                this.currentUser = session.user;
                this.notifyAuthStateChange('USER_UPDATED', session);
            }
        });
    }

    /**
     * 注册新用户
     * @param {string} email - 邮箱
     * @param {string} password - 密码
     * @returns {Promise<{user, session, error}>}
     */
    async signUp(email, password) {
        try {
            const { data, error } = await this.supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: window.location.origin
                }
            });

            if (error) throw error;

            console.log('✅ User registered:', data.user?.email);
            return { user: data.user, session: data.session, error: null };
        } catch (error) {
            console.error('❌ Sign up failed:', error);
            return { user: null, session: null, error };
        }
    }

    /**
     * 用户登录
     * @param {string} email - 邮箱
     * @param {string} password - 密码
     * @returns {Promise<{user, session, error}>}
     */
    async signIn(email, password) {
        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            console.log('✅ User signed in:', data.user.email);
            return { user: data.user, session: data.session, error: null };
        } catch (error) {
            console.error('❌ Sign in failed:', error);
            return { user: null, session: null, error };
        }
    }

    /**
     * 用户登出
     */
    async signOut() {
        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;

            console.log('✅ User signed out');
            return { error: null };
        } catch (error) {
            console.error('❌ Sign out failed:', error);
            return { error };
        }
    }

    /**
     * 获取当前用户
     * @returns {User|null}
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * 检查是否已登录
     * @returns {boolean}
     */
    isAuthenticated() {
        return this.currentUser !== null;
    }

    /**
     * 获取当前用户ID
     * @returns {string|null}
     */
    getUserId() {
        return this.currentUser?.id || null;
    }

    /**
     * 获取当前用户邮箱
     * @returns {string|null}
     */
    getUserEmail() {
        return this.currentUser?.email || null;
    }

    /**
     * 注册认证状态变化回调
     * @param {Function} callback - 回调函数 (event, session) => {}
     */
    onAuthStateChange(callback) {
        this.authStateCallbacks.push(callback);
    }

    /**
     * 通知所有认证状态变化的订阅者
     * @private
     */
    notifyAuthStateChange(event, session) {
        this.authStateCallbacks.forEach(callback => {
            try {
                callback(event, session);
            } catch (error) {
                console.error('Auth state callback error:', error);
            }
        });
    }

    /**
     * 发送密码重置邮件
     * @param {string} email - 邮箱
     */
    async resetPassword(email) {
        try {
            const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`
            });

            if (error) throw error;

            console.log('✅ Password reset email sent');
            return { error: null };
        } catch (error) {
            console.error('❌ Password reset failed:', error);
            return { error };
        }
    }

    /**
     * 更新密码
     * @param {string} newPassword - 新密码
     */
    async updatePassword(newPassword) {
        try {
            const { error } = await this.supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            console.log('✅ Password updated');
            return { error: null };
        } catch (error) {
            console.error('❌ Password update failed:', error);
            return { error };
        }
    }
}

// 创建全局实例（在 DOM 加载后初始化）
let authManager;

document.addEventListener('DOMContentLoaded', () => {
    if (window.supabaseClient) {
        authManager = new AuthManager();
        window.authManager = authManager;
        console.log('✅ AuthManager initialized');
    } else {
        console.error('❌ Supabase client not found. Please check supabase.js configuration.');
    }
});
