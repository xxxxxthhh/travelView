/**
 * TripManagerUI Component
 * Manages trip CRUD operations and UI
 */

class TripManagerUI {
  constructor(authManager, dataManager) {
    this.authManager = authManager;
    this.dataManager = dataManager;
    this.logger = new Logger({ prefix: '[TripManagerUI]', enabled: true });

    // State
    this.currentTrip = null;
    this.trips = [];
    this.isVisible = false;

    this.logger.info('TripManagerUI initialized');
  }

  /**
   * Initialize the trip manager UI
   */
  init() {
    this.createTripManagerUI();
    this.attachEventListeners();
    this.logger.info('TripManagerUI setup complete');
  }

  /**
   * Create the trip manager UI elements
   */
  createTripManagerUI() {
    // Create trip manager button in header
    const header = document.querySelector('.header');
    if (!header) {
      this.logger.error('Header element not found');
      return;
    }

    // Create trip manager toggle button
    const tripButton = document.createElement('button');
    tripButton.className = 'trip-manager-toggle';
    tripButton.dataset.action = 'toggle-trip-manager';
    tripButton.innerHTML = '📋 我的行程';
    header.appendChild(tripButton);

    // Create trip manager panel
    this.createTripManagerPanel();

    // Create trip editor modal
    this.createTripEditorModal();

    this.logger.info('Trip manager UI elements created');
  }

  /**
   * Create trip manager panel
   */
  createTripManagerPanel() {
    const panel = document.createElement('div');
    panel.className = 'trip-manager-panel';
    panel.id = 'trip-manager-panel';
    panel.innerHTML = `
      <div class="trip-manager-header">
        <h3>我的行程</h3>
        <button class="trip-manager-close" data-action="close-trip-manager">×</button>
      </div>
      <div class="trip-manager-body">
        <div class="trip-actions">
          <button class="btn-primary" data-action="create-trip">
            <span>+</span> 创建新行程
          </button>
        </div>
        <div class="trip-list" id="trip-list">
          <div class="trip-list-empty">
            <div class="empty-icon">🗺️</div>
            <p>还没有行程</p>
            <p class="empty-hint">点击"创建新行程"开始规划</p>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(panel);
  }

  /**
   * Create trip editor modal
   */
  createTripEditorModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'trip-editor-modal';
    modal.innerHTML = `
      <div class="modal-overlay" data-action="close-trip-editor"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h2 id="trip-editor-title">创建行程</h2>
          <button class="modal-close" data-action="close-trip-editor">×</button>
        </div>
        <div class="modal-body">
          <form id="trip-editor-form" class="trip-form">
            <input type="hidden" id="trip-id" name="trip-id">

            <div class="form-group">
              <label for="trip-title">行程标题 *</label>
              <input type="text" id="trip-title" name="title" required
                     placeholder="例如：关西之旅">
            </div>

            <div class="form-group">
              <label for="trip-destination">目的地</label>
              <input type="text" id="trip-destination" name="destination"
                     placeholder="例如：日本大阪">
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="trip-start-date">开始日期</label>
                <input type="date" id="trip-start-date" name="start-date">
              </div>

              <div class="form-group">
                <label for="trip-end-date">结束日期</label>
                <input type="date" id="trip-end-date" name="end-date">
              </div>
            </div>

            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" id="trip-is-public" name="is-public">
                <span>公开行程（其他人可以查看）</span>
              </label>
            </div>

            <div class="form-error" id="trip-editor-error" style="display: none;"></div>

            <div class="form-actions">
              <button type="button" class="btn-secondary" data-action="close-trip-editor">取消</button>
              <button type="submit" class="btn-primary">保存</button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
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
      case 'toggle-trip-manager':
        e.preventDefault();
        this.togglePanel();
        break;
      case 'close-trip-manager':
        e.preventDefault();
        this.closePanel();
        break;
      case 'create-trip':
        e.preventDefault();
        this.showTripEditor();
        break;
      case 'edit-trip':
        e.preventDefault();
        const editTripId = e.target.closest('[data-trip-id]')?.dataset.tripId;
        if (editTripId) this.editTrip(editTripId);
        break;
      case 'delete-trip':
        e.preventDefault();
        const deleteTripId = e.target.closest('[data-trip-id]')?.dataset.tripId;
        if (deleteTripId) this.deleteTrip(deleteTripId);
        break;
      case 'select-trip':
        e.preventDefault();
        const selectTripId = e.target.closest('[data-trip-id]')?.dataset.tripId;
        if (selectTripId) this.selectTrip(selectTripId);
        break;
      case 'close-trip-editor':
        e.preventDefault();
        this.closeTripEditor();
        break;
    }
  }

  /**
   * Handle form submissions
   */
  handleSubmit(e) {
    if (e.target.id === 'trip-editor-form') {
      e.preventDefault();
      this.saveTripEditor(e.target);
    }
  }

  /**
   * Toggle trip manager panel
   */
  async togglePanel() {
    if (!this.authManager.isAuthenticated()) {
      this.showMessage('请先登录', 'warning');
      return;
    }

    this.isVisible = !this.isVisible;
    const panel = document.getElementById('trip-manager-panel');

    if (this.isVisible) {
      panel.classList.add('active');
      await this.loadTrips();
    } else {
      panel.classList.remove('active');
    }
  }

  /**
   * Close trip manager panel
   */
  closePanel() {
    this.isVisible = false;
    const panel = document.getElementById('trip-manager-panel');
    panel.classList.remove('active');
  }

  /**
   * Load trips from database
   */
  async loadTrips() {
    this.logger.info('Loading trips...');

    try {
      const user = this.authManager.getCurrentUser();
      if (!user) {
        this.logger.warn('No user logged in');
        return;
      }

      // Get trips from Supabase
      const trips = await this.dataManager.loadUserTrips(user.id);
      this.trips = trips;

      this.renderTripList();
      this.logger.info('Trips loaded', { count: trips.length });
    } catch (error) {
      this.logger.error('Failed to load trips', error);
      this.showMessage('加载行程失败', 'error');
    }
  }

  /**
   * Render trip list
   */
  renderTripList() {
    const listContainer = document.getElementById('trip-list');
    if (!listContainer) return;

    if (this.trips.length === 0) {
      listContainer.innerHTML = `
        <div class="trip-list-empty">
          <div class="empty-icon">🗺️</div>
          <p>还没有行程</p>
          <p class="empty-hint">点击"创建新行程"开始规划</p>
        </div>
      `;
      return;
    }

    const tripsHTML = this.trips.map(trip => this.getTripCardHTML(trip)).join('');
    listContainer.innerHTML = tripsHTML;
  }

  /**
   * Get trip card HTML
   */
  getTripCardHTML(trip) {
    const isActive = this.currentTrip?.id === trip.id;
    const dateRange = this.formatDateRange(trip.start_date, trip.end_date);

    return `
      <div class="trip-card ${isActive ? 'active' : ''}" data-trip-id="${trip.id}">
        <div class="trip-card-content" data-action="select-trip">
          <div class="trip-card-header">
            <h4>${this.escapeHtml(trip.title)}</h4>
            ${trip.is_public ? '<span class="trip-badge">公开</span>' : ''}
            ${isActive ? '<span class="trip-badge active">当前</span>' : ''}
          </div>
          ${trip.destination ? `<p class="trip-destination">📍 ${this.escapeHtml(trip.destination)}</p>` : ''}
          ${dateRange ? `<p class="trip-dates">📅 ${dateRange}</p>` : ''}
          <p class="trip-meta">创建于 ${this.formatDate(trip.created_at)}</p>
        </div>
        <div class="trip-card-actions">
          <button class="trip-action-btn" data-action="edit-trip" title="编辑">
            ✏️
          </button>
          <button class="trip-action-btn danger" data-action="delete-trip" title="删除">
            🗑️
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Show trip editor modal
   */
  showTripEditor(trip = null) {
    const modal = document.getElementById('trip-editor-modal');
    const form = document.getElementById('trip-editor-form');
    const title = document.getElementById('trip-editor-title');

    if (trip) {
      // Edit mode
      title.textContent = '编辑行程';
      document.getElementById('trip-id').value = trip.id;
      document.getElementById('trip-title').value = trip.title || '';
      document.getElementById('trip-destination').value = trip.destination || '';
      document.getElementById('trip-start-date').value = trip.start_date || '';
      document.getElementById('trip-end-date').value = trip.end_date || '';
      document.getElementById('trip-is-public').checked = trip.is_public || false;
    } else {
      // Create mode
      title.textContent = '创建行程';
      form.reset();
      document.getElementById('trip-id').value = '';
    }

    modal.classList.add('active');
    this.clearTripEditorError();
  }

  /**
   * Close trip editor modal
   */
  closeTripEditor() {
    const modal = document.getElementById('trip-editor-modal');
    modal.classList.remove('active');
    this.clearTripEditorError();
  }

  /**
   * Save trip editor
   */
  async saveTripEditor(form) {
    const formData = new FormData(form);
    const tripId = formData.get('trip-id');
    const tripData = {
      title: formData.get('title'),
      destination: formData.get('destination') || null,
      start_date: formData.get('start-date') || null,
      end_date: formData.get('end-date') || null,
      is_public: formData.get('is-public') === 'on'
    };

    this.logger.info(tripId ? 'Updating trip' : 'Creating trip', tripData);

    try {
      this.showTripEditorLoading(true);

      if (tripId) {
        // Update existing trip
        await this.dataManager.updateTrip(tripId, tripData);
        this.showMessage('行程已更新', 'success');
      } else {
        // Create new trip
        const user = this.authManager.getCurrentUser();
        const newTrip = await this.dataManager.createTrip({ ...tripData, user_id: user.id });
        this.showMessage('行程已创建', 'success');

        // Auto-select new trip
        this.currentTrip = newTrip;
      }

      this.closeTripEditor();
      await this.loadTrips();

      // Notify app of trip change
      if (window.travelApp && window.travelApp.onTripChanged) {
        window.travelApp.onTripChanged(this.currentTrip);
      }
    } catch (error) {
      this.logger.error('Failed to save trip', error);
      this.showTripEditorError(error.message || '保存失败，请稍后再试');
    } finally {
      this.showTripEditorLoading(false);
    }
  }

  /**
   * Edit trip
   */
  async editTrip(tripId) {
    const trip = this.trips.find(t => t.id === tripId);
    if (trip) {
      this.showTripEditor(trip);
    }
  }

  /**
   * Delete trip
   */
  async deleteTrip(tripId) {
    if (!confirm('确定要删除这个行程吗？此操作无法撤销。')) {
      return;
    }

    this.logger.info('Deleting trip', { tripId });

    try {
      await this.dataManager.deleteTrip(tripId);
      this.showMessage('行程已删除', 'success');

      // If deleted trip was current, clear current
      if (this.currentTrip?.id === tripId) {
        this.currentTrip = null;
        if (window.travelApp && window.travelApp.onTripChanged) {
          window.travelApp.onTripChanged(null);
        }
      }

      await this.loadTrips();
    } catch (error) {
      this.logger.error('Failed to delete trip', error);
      this.showMessage('删除失败，请稍后再试', 'error');
    }
  }

  /**
   * Select trip
   */
  async selectTrip(tripId) {
    const trip = this.trips.find(t => t.id === tripId);
    if (!trip) return;

    this.currentTrip = trip;
    this.renderTripList(); // Re-render to show active state

    this.logger.info('Trip selected', { tripId });

    // Load trip data and notify app
    if (window.travelApp && window.travelApp.onTripChanged) {
      await window.travelApp.onTripChanged(trip);
    }

    // Close panel after selection
    this.closePanel();
  }

  /**
   * Show loading state in trip editor
   */
  showTripEditorLoading(isLoading) {
    const form = document.getElementById('trip-editor-form');
    if (!form) return;

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = isLoading;
      submitBtn.textContent = isLoading ? '保存中...' : '保存';
    }
  }

  /**
   * Show error in trip editor
   */
  showTripEditorError(message) {
    const errorEl = document.getElementById('trip-editor-error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }
  }

  /**
   * Clear trip editor error
   */
  clearTripEditorError() {
    const errorEl = document.getElementById('trip-editor-error');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.style.display = 'none';
    }
  }

  /**
   * Show message
   */
  showMessage(message, type = 'info') {
    const className = type === 'success' ? 'success-message' :
                     type === 'error' ? 'error-message' :
                     'warning-message';

    const messageEl = document.createElement('div');
    messageEl.className = className;
    messageEl.innerHTML = `
      <div class="message-content">
        <span class="message-text">${message}</span>
      </div>
    `;
    document.body.appendChild(messageEl);

    setTimeout(() => {
      messageEl.classList.add('fade-out');
      setTimeout(() => messageEl.remove(), 300);
    }, 3000);
  }

  /**
   * Format date range
   */
  formatDateRange(startDate, endDate) {
    if (!startDate && !endDate) return '';
    if (!endDate) return this.formatDate(startDate);
    return `${this.formatDate(startDate)} - ${this.formatDate(endDate)}`;
  }

  /**
   * Format date
   */
  formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  /**
   * Escape HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Make TripManagerUI available globally
window.TripManagerUI = TripManagerUI;
