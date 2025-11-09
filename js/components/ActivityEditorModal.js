/**
 * ActivityEditorModal Component
 * Modal for adding/editing activities with place search
 */

class ActivityEditorModal {
  constructor(routeEditorUI) {
    this.routeEditorUI = routeEditorUI;
    this.logger = new Logger({ prefix: '[ActivityEditorModal]', enabled: true });

    // State
    this.isOpen = false;
    this.mode = 'add'; // 'add' or 'edit'
    this.currentDay = null;
    this.currentActivityIndex = null;
    this.placeSearch = null;

    this.logger.info('ActivityEditorModal initialized');
  }

  /**
   * Initialize the modal
   */
  init() {
    this.createModal();
    this.attachEventListeners();
    this.logger.info('ActivityEditorModal setup complete');
  }

  /**
   * Create modal HTML
   */
  createModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'activity-editor-modal';
    modal.innerHTML = `
      <div class="modal-overlay" data-action="close-activity-editor"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h2 id="activity-editor-title">添加活动</h2>
          <button class="modal-close" data-action="close-activity-editor">×</button>
        </div>
        <div class="modal-body">
          <form id="activity-editor-form" class="auth-form">
            <div class="form-group">
              <label for="activity-time">时间 *</label>
              <input type="time" id="activity-time" name="time" required>
            </div>

            <div class="form-group">
              <label for="activity-type">类型 *</label>
              <select id="activity-type" name="type" required>
                <option value="">-- 请选择 --</option>
                <option value="transport">🚗 交通</option>
                <option value="sightseeing">⛩️ 景点游览</option>
                <option value="food">🍽️ 美食</option>
                <option value="accommodation">🏨 住宿</option>
                <option value="entertainment">🎉 娱乐</option>
              </select>
            </div>

            <div class="form-group">
              <label for="activity-description">描述 *</label>
              <input type="text" id="activity-description" name="description"
                     placeholder="例如：东京塔观景" required>
            </div>

            <div class="form-group">
              <label>📍 地点 *</label>
              <div class="place-search-container">
                <input type="text" id="place-search-input"
                       placeholder="🔍 搜索地点..."
                       autocomplete="off">
                <div class="place-search-help">
                  输入地点名称，选择建议项自动获取坐标
                </div>
              </div>
            </div>

            <div class="selected-place" id="selected-place" style="display: none;">
              <div class="selected-place-header">
                <span class="selected-place-icon">📍</span>
                <span class="selected-place-name" id="selected-place-name"></span>
              </div>
              <div class="selected-place-coords">
                <span id="selected-place-coords"></span>
              </div>
            </div>

            <div class="form-group manual-coords" id="manual-coords-toggle">
              <button type="button" class="btn-link" data-action="toggle-manual-coords">
                ⚙️ 手动输入坐标
              </button>
            </div>

            <div class="manual-coords-section" id="manual-coords-section" style="display: none;">
              <div class="form-row">
                <div class="form-group">
                  <label for="activity-lat">纬度 (Latitude)</label>
                  <input type="number" id="activity-lat" name="lat"
                         step="0.000001" min="-90" max="90"
                         placeholder="35.6586">
                </div>
                <div class="form-group">
                  <label for="activity-lng">经度 (Longitude)</label>
                  <input type="number" id="activity-lng" name="lng"
                         step="0.000001" min="-180" max="180"
                         placeholder="139.7454">
                </div>
              </div>
              <div class="form-group">
                <label for="activity-place-name">地点名称</label>
                <input type="text" id="activity-place-name" name="placeName"
                       placeholder="例如：东京塔">
              </div>
            </div>

            <div class="form-error" id="activity-editor-error" style="display: none;"></div>

            <div class="form-actions">
              <button type="button" class="btn-secondary" data-action="close-activity-editor">取消</button>
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
    document.body.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (!action) return;

      if (action === 'close-activity-editor') {
        e.preventDefault();
        this.close();
      } else if (action === 'toggle-manual-coords') {
        e.preventDefault();
        this.toggleManualCoords();
      }
    });

    document.body.addEventListener('submit', (e) => {
      if (e.target.id === 'activity-editor-form') {
        e.preventDefault();
        this.handleSubmit();
      }
    });
  }

  /**
   * Show modal to add activity
   */
  showAdd(dayNumber) {
    this.mode = 'add';
    this.currentDay = dayNumber;
    this.currentActivityIndex = null;

    const title = document.getElementById('activity-editor-title');
    if (title) title.textContent = `添加活动 - 第${dayNumber}天`;

    this.resetForm();
    this.open();
  }

  /**
   * Show modal to edit activity
   */
  showEdit(dayNumber, activityIndex, activity) {
    this.mode = 'edit';
    this.currentDay = dayNumber;
    this.currentActivityIndex = activityIndex;

    const title = document.getElementById('activity-editor-title');
    if (title) title.textContent = `编辑活动 - 第${dayNumber}天`;

    this.populateForm(activity);
    this.open();
  }

  /**
   * Open modal
   */
  open() {
    this.isOpen = true;
    const modal = document.getElementById('activity-editor-modal');
    if (modal) {
      modal.classList.add('active');
    }

    // Initialize place search after modal is visible
    setTimeout(() => {
      this.initPlaceSearch();
    }, 100);

    this.logger.info('Activity editor opened', { mode: this.mode, day: this.currentDay });
  }

  /**
   * Close modal
   */
  close() {
    this.isOpen = false;
    const modal = document.getElementById('activity-editor-modal');
    if (modal) {
      modal.classList.remove('active');
    }

    this.resetForm();
    this.logger.info('Activity editor closed');
  }

  /**
   * Initialize place search
   */
  async initPlaceSearch() {
    const input = document.getElementById('place-search-input');
    if (!input) return;

    // Check if Maps loader is available
    if (!window.googleMapsLoader) {
      this.logger.warn('Google Maps loader not available');
      this.showManualCoordsMode();
      return;
    }

    // Check if Maps is already loaded
    if (window.googleMapsLoader.isAvailable()) {
      this.logger.info('Google Maps already loaded, initializing place search');
      this.initPlaceAutocomplete(input);
      return;
    }

    // Try to load Maps API
    this.logger.info('Waiting for Google Maps API to load...');
    try {
      await window.googleMapsLoader.load();

      // Double check Places API is available
      if (window.google && window.google.maps && window.google.maps.places) {
        this.logger.info('Google Maps loaded successfully, initializing place search');
        this.initPlaceAutocomplete(input);
      } else {
        this.logger.warn('Google Maps loaded but Places API not available');
        this.showManualCoordsMode();
      }
    } catch (error) {
      this.logger.warn('Failed to load Google Maps API', error);
      this.showManualCoordsMode();
    }
  }

  /**
   * Initialize place autocomplete
   */
  initPlaceAutocomplete(input) {
    if (!this.placeSearch) {
      this.placeSearch = new PlaceSearchInput({
        inputId: 'place-search-input',
        onPlaceSelected: (place) => {
          this.handlePlaceSelected(place);
        }
      });
    }

    this.placeSearch.init(input);
  }

  /**
   * Show manual coordinates mode when Google Maps is not available
   */
  showManualCoordsMode() {
    // Hide place search
    const placeSearchGroup = document.getElementById('place-search-input')?.closest('.form-group');
    if (placeSearchGroup) {
      placeSearchGroup.style.display = 'none';
    }

    // Hide toggle button
    const toggleDiv = document.getElementById('manual-coords-toggle');
    if (toggleDiv) {
      toggleDiv.style.display = 'none';
    }

    // Show manual coords section
    const manualSection = document.getElementById('manual-coords-section');
    if (manualSection) {
      manualSection.style.display = 'block';
    }

    // Add helpful message
    const form = document.getElementById('activity-editor-form');
    if (form && !document.getElementById('maps-unavailable-notice')) {
      const notice = document.createElement('div');
      notice.id = 'maps-unavailable-notice';
      notice.style.cssText = 'padding: 12px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; margin-bottom: 16px; font-size: 14px; color: #856404;';
      notice.innerHTML = `
        <strong>ℹ️ 提示：</strong> 地图服务暂不可用，请手动输入坐标。
        您可以从 Google Maps 复制坐标。
      `;
      form.insertBefore(notice, form.firstChild);
    }
  }

  /**
   * Handle place selection from autocomplete
   */
  handlePlaceSelected(place) {
    this.logger.info('Place selected', place);

    // Show selected place
    const selectedPlaceDiv = document.getElementById('selected-place');
    const placeName = document.getElementById('selected-place-name');
    const placeCoords = document.getElementById('selected-place-coords');

    if (selectedPlaceDiv && placeName && placeCoords) {
      placeName.textContent = place.name;
      placeCoords.textContent = `${place.lat.toFixed(6)}, ${place.lng.toFixed(6)}`;
      selectedPlaceDiv.style.display = 'block';
    }

    // Fill manual coords fields (hidden)
    const latInput = document.getElementById('activity-lat');
    const lngInput = document.getElementById('activity-lng');
    const placeNameInput = document.getElementById('activity-place-name');

    if (latInput) latInput.value = place.lat;
    if (lngInput) lngInput.value = place.lng;
    if (placeNameInput) placeNameInput.value = place.name;

    this.clearError();
  }

  /**
   * Toggle manual coords input
   */
  toggleManualCoords() {
    const section = document.getElementById('manual-coords-section');
    if (!section) return;

    if (section.style.display === 'none') {
      section.style.display = 'block';
    } else {
      section.style.display = 'none';
    }
  }

  /**
   * Reset form
   */
  resetForm() {
    const form = document.getElementById('activity-editor-form');
    if (form) form.reset();

    // Hide selected place
    const selectedPlaceDiv = document.getElementById('selected-place');
    if (selectedPlaceDiv) selectedPlaceDiv.style.display = 'none';

    // Hide manual coords (will be shown again if Maps unavailable)
    const manualCoordsSection = document.getElementById('manual-coords-section');
    if (manualCoordsSection) manualCoordsSection.style.display = 'none';

    // Reset place search visibility (in case it was hidden in manual mode)
    const placeSearchGroup = document.getElementById('place-search-input')?.closest('.form-group');
    if (placeSearchGroup) placeSearchGroup.style.display = '';

    const toggleDiv = document.getElementById('manual-coords-toggle');
    if (toggleDiv) toggleDiv.style.display = '';

    // Remove Maps unavailable notice
    const notice = document.getElementById('maps-unavailable-notice');
    if (notice) notice.remove();

    // Clear place search
    if (this.placeSearch) {
      this.placeSearch.clear();
    }

    this.clearError();
  }

  /**
   * Populate form with activity data
   */
  populateForm(activity) {
    const timeInput = document.getElementById('activity-time');
    const typeInput = document.getElementById('activity-type');
    const descInput = document.getElementById('activity-description');
    const latInput = document.getElementById('activity-lat');
    const lngInput = document.getElementById('activity-lng');
    const placeNameInput = document.getElementById('activity-place-name');

    if (timeInput) timeInput.value = activity.time || '';
    if (typeInput) typeInput.value = activity.type || '';
    if (descInput) descInput.value = activity.description || '';

    if (activity.location) {
      if (latInput) latInput.value = activity.location.lat || '';
      if (lngInput) lngInput.value = activity.location.lng || '';
      if (placeNameInput) placeNameInput.value = activity.location.name || '';

      // Show selected place
      if (activity.location.lat && activity.location.lng) {
        const selectedPlaceDiv = document.getElementById('selected-place');
        const placeName = document.getElementById('selected-place-name');
        const placeCoords = document.getElementById('selected-place-coords');

        if (selectedPlaceDiv && placeName && placeCoords) {
          placeName.textContent = activity.location.name || activity.description;
          placeCoords.textContent = `${activity.location.lat}, ${activity.location.lng}`;
          selectedPlaceDiv.style.display = 'block';
        }
      }
    }
  }

  /**
   * Handle form submission
   */
  async handleSubmit() {
    this.logger.info('Form submission started');

    const form = document.getElementById('activity-editor-form');
    if (!form) {
      this.logger.error('Form not found');
      return;
    }

    const formData = new FormData(form);
    const time = formData.get('time');
    const type = formData.get('type');
    const description = formData.get('description');
    let lat = formData.get('lat');
    let lng = formData.get('lng');
    let placeName = formData.get('placeName');

    this.logger.debug('Form data collected', { time, type, description, lat, lng, placeName });

    // Validate required fields
    if (!time || !type || !description) {
      this.logger.warn('Missing required fields', { time, type, description });
      this.showError('请填写所有必填字段（时间、类型、描述）');
      return;
    }

    // Validate location
    if (!lat || !lng) {
      this.logger.warn('Missing location coordinates', { lat, lng });
      this.showError('❌ 请选择地点或手动输入坐标\n\n提示：\n1. 使用搜索框搜索地点\n2. 或点击"手动输入坐标"');
      return;
    }

    // Convert to numbers
    lat = parseFloat(lat);
    lng = parseFloat(lng);

    if (isNaN(lat) || isNaN(lng)) {
      this.logger.error('Invalid coordinates', { lat, lng });
      this.showError('坐标格式不正确，请重新输入');
      return;
    }

    // Validate coordinate ranges
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      this.logger.error('Coordinates out of range', { lat, lng });
      this.showError('坐标超出有效范围\n纬度: -90 到 90\n经度: -180 到 180');
      return;
    }

    // Create activity object
    const activity = {
      time,
      type,
      description,
      location: {
        lat,
        lng,
        name: placeName || description
      },
      icon: this.getActivityIcon(type)
    };

    this.logger.info('Activity object created, submitting...', activity);

    try {
      this.showLoading(true);

      if (this.mode === 'add') {
        this.logger.info('Calling addActivity', { day: this.currentDay });
        await this.routeEditorUI.addActivity(this.currentDay, activity);
      } else if (this.mode === 'edit') {
        this.logger.info('Calling updateActivity', { day: this.currentDay, index: this.currentActivityIndex });
        await this.routeEditorUI.updateActivity(this.currentDay, this.currentActivityIndex, activity);
      }

      this.logger.info('Activity saved successfully');
      this.close();
    } catch (error) {
      this.logger.error('Failed to save activity', error);
      this.showError('保存失败：' + (error.message || '请稍后再试'));
      console.error('Activity save error:', error);
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Get activity icon
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
   * Show loading state
   */
  showLoading(isLoading) {
    const form = document.getElementById('activity-editor-form');
    if (!form) return;

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = isLoading;
      submitBtn.textContent = isLoading ? '保存中...' : '保存';
    }
  }

  /**
   * Show error
   */
  showError(message) {
    const errorEl = document.getElementById('activity-editor-error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }

    // Also log to console for debugging
    this.logger.warn('Error shown to user:', message);

    // Scroll error into view
    setTimeout(() => {
      if (errorEl) {
        errorEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  }

  /**
   * Clear error
   */
  clearError() {
    const errorEl = document.getElementById('activity-editor-error');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.style.display = 'none';
    }
  }
}

// Make ActivityEditorModal available globally
window.ActivityEditorModal = ActivityEditorModal;
