/**
 * AuthUI Component
 * Manages authentication user interface (login/register modals)
 */

class AuthUI {
  constructor(authManager) {
    this.authManager = authManager;
    this.logger = new Logger({ prefix: '[AuthUI]', enabled: true });

    // State
    this.currentModal = null; // 'login' or 'register'

    this.logger.info('AuthUI initialized');
  }

  /**
   * Initialize the authentication UI
   */
  init() {
    this.createAuthUI();
    this.attachEventListeners();
    this.updateUIState();

    this.logger.info('AuthUI setup complete');
  }

  /**
   * Create the authentication UI elements
   */
  createAuthUI() {
    // Create auth container in header
    const header = document.querySelector('.header');
    if (!header) {
      this.logger.error('Header element not found');
      return;
    }

    // Create auth status display
    const authContainer = document.createElement('div');
    authContainer.className = 'auth-container';
    authContainer.innerHTML = `
      <div class="auth-status" id="auth-status">
        <button class="btn-primary" data-action="show-login">登录</button>
        <button class="btn-secondary" data-action="show-register">注册</button>
      </div>
    `;
    header.appendChild(authContainer);

    // Create login modal
    this.createModal('login', '登录', this.getLoginFormHTML());

    // Create register modal
    this.createModal('register', '注册', this.getRegisterFormHTML());

    this.logger.info('Auth UI elements created');
  }

  /**
   * Create a modal dialog
   */
  createModal(id, title, contentHTML) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = `${id}-modal`;
    modal.innerHTML = `
      <div class="modal-overlay" data-action="close-modal"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h2>${title}</h2>
          <button class="modal-close" data-action="close-modal">×</button>
        </div>
        <div class="modal-body">
          ${contentHTML}
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  /**
   * Get login form HTML
   */
  getLoginFormHTML() {
    return `
      <form id="login-form" class="auth-form">
        <div class="form-group">
          <label for="login-email">邮箱</label>
          <input type="email" id="login-email" name="email" required
                 placeholder="your@email.com" autocomplete="email">
        </div>
        <div class="form-group">
          <label for="login-password">密码</label>
          <input type="password" id="login-password" name="password" required
                 placeholder="••••••••" autocomplete="current-password">
        </div>
        <div class="form-error" id="login-error" style="display: none;"></div>
        <div class="form-actions">
          <button type="submit" class="btn-primary btn-full">登录</button>
        </div>
        <div class="form-footer">
          还没有账号？<a href="#" data-action="switch-to-register">立即注册</a>
        </div>
      </form>
    `;
  }

  /**
   * Get register form HTML
   */
  getRegisterFormHTML() {
    return `
      <form id="register-form" class="auth-form">
        <div class="form-group">
          <label for="register-email">邮箱</label>
          <input type="email" id="register-email" name="email" required
                 placeholder="your@email.com" autocomplete="email">
        </div>
        <div class="form-group">
          <label for="register-password">密码</label>
          <input type="password" id="register-password" name="password" required
                 placeholder="至少6个字符" autocomplete="new-password" minlength="6">
        </div>
        <div class="form-group">
          <label for="register-password-confirm">确认密码</label>
          <input type="password" id="register-password-confirm" name="password-confirm" required
                 placeholder="再次输入密码" autocomplete="new-password" minlength="6">
        </div>
        <div class="form-error" id="register-error" style="display: none;"></div>
        <div class="form-actions">
          <button type="submit" class="btn-primary btn-full">注册</button>
        </div>
        <div class="form-footer">
          已有账号？<a href="#" data-action="switch-to-login">立即登录</a>
        </div>
      </form>
    `;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Use event delegation on document body
    document.body.addEventListener('click', this.handleClick.bind(this));
    document.body.addEventListener('submit', this.handleSubmit.bind(this));
  }

  /**
   * Handle click events
   */
  handleClick(e) {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (!action) return;

    switch (action) {
      case 'show-login':
        e.preventDefault();
        this.showModal('login');
        break;
      case 'show-register':
        e.preventDefault();
        this.showModal('register');
        break;
      case 'close-modal':
        e.preventDefault();
        this.closeModal();
        break;
      case 'switch-to-register':
        e.preventDefault();
        this.closeModal();
        this.showModal('register');
        break;
      case 'switch-to-login':
        e.preventDefault();
        this.closeModal();
        this.showModal('login');
        break;
      case 'logout':
        e.preventDefault();
        this.handleLogout();
        break;
    }
  }

  /**
   * Handle form submissions
   */
  handleSubmit(e) {
    if (e.target.id === 'login-form') {
      e.preventDefault();
      this.handleLogin(e.target);
    } else if (e.target.id === 'register-form') {
      e.preventDefault();
      this.handleRegister(e.target);
    }
  }

  /**
   * Show modal
   */
  showModal(modalType) {
    this.currentModal = modalType;
    const modal = document.getElementById(`${modalType}-modal`);
    if (modal) {
      modal.classList.add('active');
      this.logger.info(`Showing ${modalType} modal`);
    }
  }

  /**
   * Close modal
   */
  closeModal() {
    // Close specific modal if tracked
    if (this.currentModal) {
      const modal = document.getElementById(`${this.currentModal}-modal`);
      if (modal) {
        modal.classList.remove('active');
      }
      this.currentModal = null;
    }
    
    // Force close any active modals just in case
    document.querySelectorAll('.modal.active').forEach(modal => {
      modal.classList.remove('active');
    });
    
    this.clearErrors();
  }

  /**
   * Handle login form submission
   */
  async handleLogin(form) {
    const formData = new FormData(form);
    const email = formData.get('email');
    const password = formData.get('password');

    this.logger.info('Attempting login', { email });

    try {
      this.showLoading('login', true);
      const { user, error } = await this.authManager.signIn(email, password);

      if (error) {
        this.showError('login', error.message);
        this.logger.error('Login failed', error);
        return;
      }

      this.logger.info('Login successful', { user });
      this.closeModal();
      this.updateUIState();

      // Show success message
      this.showSuccessMessage('登录成功！');

      // Trigger app to reload user's trips
      if (window.travelApp && window.travelApp.onAuthStateChanged) {
        window.travelApp.onAuthStateChanged(user);
      }
    } catch (error) {
      this.showError('login', '登录失败，请稍后再试');
      this.logger.error('Login error', error);
    } finally {
      this.showLoading('login', false);
    }
  }

  /**
   * Handle register form submission
   */
  async handleRegister(form) {
    const formData = new FormData(form);
    const email = formData.get('email');
    const password = formData.get('password');
    const passwordConfirm = formData.get('password-confirm');

    // Validate password match
    if (password !== passwordConfirm) {
      this.showError('register', '两次输入的密码不一致');
      return;
    }

    this.logger.info('Attempting registration', { email });

    try {
      this.showLoading('register', true);
      const { user, error } = await this.authManager.signUp(email, password);

      if (error) {
        this.showError('register', error.message);
        this.logger.error('Registration failed', error);
        return;
      }

      this.logger.info('Registration successful', { user });
      this.closeModal();

      // Show success message
      this.showSuccessMessage('注册成功！请检查邮箱确认链接');

      // Auto switch to login after a delay
      setTimeout(() => {
        this.showModal('login');
      }, 3000);
    } catch (error) {
      this.showError('register', '注册失败，请稍后再试');
      this.logger.error('Registration error', error);
    } finally {
      this.showLoading('register', false);
    }
  }

  /**
   * Handle logout
   */
  async handleLogout() {
    this.logger.info('Attempting logout');

    try {
      const { error } = await this.authManager.signOut();

      if (error) {
        this.logger.error('Logout failed', error);
        return;
      }

      this.logger.info('Logout successful');
      this.updateUIState();

      // Show success message
      this.showSuccessMessage('已退出登录');

      // Trigger app to clear user's trips
      if (window.travelApp && window.travelApp.onAuthStateChanged) {
        window.travelApp.onAuthStateChanged(null);
      }
    } catch (error) {
      this.logger.error('Logout error', error);
    }
  }

  /**
   * Update UI based on authentication state
   */
  updateUIState() {
    const authStatus = document.getElementById('auth-status');
    if (!authStatus) return;

    const currentUser = this.authManager.getCurrentUser();

    if (currentUser) {
      // User is logged in
      const email = currentUser.email;
      authStatus.innerHTML = `
        <span class="user-email">${email}</span>
        <button class="btn-secondary" data-action="logout">退出</button>
      `;
      this.logger.info('UI updated: logged in', { email });
    } else {
      // User is not logged in
      authStatus.innerHTML = `
        <button class="btn-primary" data-action="show-login">登录</button>
        <button class="btn-secondary" data-action="show-register">注册</button>
      `;
      this.logger.info('UI updated: logged out');
    }
  }

  /**
   * Show loading state
   */
  showLoading(formType, isLoading) {
    const form = document.getElementById(`${formType}-form`);
    if (!form) return;

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = isLoading;
      submitBtn.textContent = isLoading ? '处理中...' : (formType === 'login' ? '登录' : '注册');
    }
  }

  /**
   * Show error message
   */
  showError(formType, message) {
    const errorEl = document.getElementById(`${formType}-error`);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }
  }

  /**
   * Clear error messages
   */
  clearErrors() {
    const errorEls = document.querySelectorAll('.form-error');
    errorEls.forEach(el => {
      el.textContent = '';
      el.style.display = 'none';
    });
  }

  /**
   * Show success message
   */
  showSuccessMessage(message) {
    // Create a temporary success message
    const successEl = document.createElement('div');
    successEl.className = 'success-message';
    successEl.innerHTML = `
      <div class="success-content">
        <span class="success-icon">✓</span>
        <span class="success-text">${message}</span>
      </div>
    `;
    document.body.appendChild(successEl);

    // Auto remove after 3 seconds
    setTimeout(() => {
      successEl.classList.add('fade-out');
      setTimeout(() => successEl.remove(), 300);
    }, 3000);
  }
}

// Make AuthUI available globally
window.AuthUI = AuthUI;
