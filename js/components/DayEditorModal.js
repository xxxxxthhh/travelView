
/**
 * DayEditorModal Component
 * Modal for adding/editing trip days
 */

class DayEditorModal {
  constructor(routeEditorUI) {
    this.routeEditorUI = routeEditorUI;
    this.logger = new Logger({ prefix: '[DayEditorModal]', enabled: true });

    this.isOpen = false;
    this.mode = 'add';
    this.dayNumber = null;
    this.existingDayData = null;
    this.placeSearch = null; // Google Places Autocomplete instance

    this.logger.info('DayEditorModal initialized');
  }

  init() {
    this.createModal();
    this.attachEventListeners();
    this.logger.info('DayEditorModal setup complete');
  }

  createModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'day-editor-modal';
    modal.innerHTML = `
      <div class="modal-overlay" data-action="close-day-editor"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h2 id="day-editor-title">添加行程日程</h2>
          <button class="modal-close" data-action="close-day-editor">×</button>
        </div>
        <div class="modal-body">
          <form id="day-editor-form" class="trip-form">
            <div class="form-group">
              <label for="day-date">日期 *</label>
              <input type="date" id="day-date" name="date" required>
            </div>

            <div class="form-group">
              <label for="day-title">本日主题</label>
              <input type="text" id="day-title" name="title" placeholder="例如：京都文化探索日">
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="day-weather">天气</label>
                <input type="text" id="day-weather" name="weather" placeholder="例如：☀️ 或 阴 22℃">
              </div>
              <div class="form-group">
                <label for="day-notes">备注</label>
                <input type="text" id="day-notes" name="notes" placeholder="可选的行程备注">
              </div>
            </div>

            <div class="form-group">
              <label for="day-accommodation-name">住宿名称</label>
              <input type="text" id="day-accommodation-name" name="accommodation-name" placeholder="例如：大阪南海瑞士酒店">
            </div>

            <div class="form-group">
              <label>📍 住宿地址</label>
              <div class="place-search-container">
                <input type="text" id="day-accommodation-address" name="accommodation-address"
                       placeholder="🔍 搜索住宿地点..."
                       autocomplete="off">
                <div class="place-search-help">
                  输入地点名称，选择建议项自动获取坐标
                </div>
              </div>
            </div>

            <div class="selected-place" id="day-selected-place" style="display: none;">
              <div class="selected-place-header">
                <span class="selected-place-icon">📍</span>
                <span class="selected-place-name" id="day-selected-place-name"></span>
              </div>
              <div class="selected-place-coords">
                <span id="day-selected-place-coords"></span>
              </div>
            </div>

            <div class="form-group manual-coords" id="day-manual-coords-toggle">
              <button type="button" class="btn-link" data-action="toggle-day-manual-coords">
                ⚙️ 手动输入坐标
              </button>
            </div>

            <div class="manual-coords-section" id="day-manual-coords-section" style="display: none;">
              <div class="form-row">
                <div class="form-group">
                  <label for="day-accommodation-lat">纬度 (Latitude)</label>
                  <input type="number" step="0.000001" min="-90" max="90" id="day-accommodation-lat" name="accommodation-lat" placeholder="35.6586">
                </div>
                <div class="form-group">
                  <label for="day-accommodation-lng">经度 (Longitude)</label>
                  <input type="number" step="0.000001" min="-180" max="180" id="day-accommodation-lng" name="accommodation-lng" placeholder="139.7454">
                </div>
              </div>
            </div>

            <div class="form-error" id="day-editor-error" style="display: none;"></div>

            <div class="form-actions">
              <button type="button" class="btn-secondary" data-action="close-day-editor">取消</button>
              <button type="submit" class="btn-primary">保存</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  attachEventListeners() {
    document.body.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (!action) return;

      if (action === 'close-day-editor') {
        e.preventDefault();
        this.close();
      } else if (action === 'toggle-day-manual-coords') {
        e.preventDefault();
        this.toggleManualCoords();
      }
    });

    document.body.addEventListener('submit', async (e) => {
      if (e.target.id === 'day-editor-form') {
        e.preventDefault();
        await this.handleSubmit();
      }
    });
  }

  showAdd(dayNumber, defaultDate) {
    this.mode = 'add';
    this.dayNumber = dayNumber;
    this.existingDayData = null;

    const title = document.getElementById('day-editor-title');
    if (title) title.textContent = `添加第${dayNumber}天`;

    this.resetForm();

    const dateInput = document.getElementById('day-date');
    if (dateInput && defaultDate) {
      dateInput.value = defaultDate;
    }

    this.open();
  }

  showEdit(dayNumber, dayData) {
    this.mode = 'edit';
    this.dayNumber = dayNumber;
    this.existingDayData = dayData || null;

    const title = document.getElementById('day-editor-title');
    if (title) title.textContent = `编辑第${dayNumber}天`;

    this.resetForm();
    this.populateForm(dayData);
    this.open();
  }

  open() {
    this.isOpen = true;
    const modal = document.getElementById('day-editor-modal');
    if (modal) {
      modal.classList.add('active');
    }

    // Initialize place search after modal is visible
    setTimeout(() => {
      this.initPlaceSearch();
    }, 100);

    this.logger.info('Day editor opened', { mode: this.mode, day: this.dayNumber });
  }

  close() {
    this.isOpen = false;
    const modal = document.getElementById('day-editor-modal');
    if (modal) {
      modal.classList.remove('active');
    }
    this.resetForm();
    this.logger.info('Day editor closed');
  }

  resetForm() {
    const form = document.getElementById('day-editor-form');
    if (form) {
      form.reset();
    }

    // Hide selected place
    const selectedPlaceDiv = document.getElementById('day-selected-place');
    if (selectedPlaceDiv) selectedPlaceDiv.style.display = 'none';

    // Hide manual coords
    const manualCoordsSection = document.getElementById('day-manual-coords-section');
    if (manualCoordsSection) manualCoordsSection.style.display = 'none';

    // Clear place search
    if (this.placeSearch) {
      this.placeSearch.clear();
    }

    this.clearError();
  }

  populateForm(dayData = {}) {
    const dateInput = document.getElementById('day-date');
    const titleInput = document.getElementById('day-title');
    const weatherInput = document.getElementById('day-weather');
    const notesInput = document.getElementById('day-notes');
    const accNameInput = document.getElementById('day-accommodation-name');
    const accAddressInput = document.getElementById('day-accommodation-address');
    const accLatInput = document.getElementById('day-accommodation-lat');
    const accLngInput = document.getElementById('day-accommodation-lng');

    if (dateInput) dateInput.value = dayData.date ? dayData.date.substring(0, 10) : '';
    if (titleInput) titleInput.value = dayData.title || '';
    if (weatherInput) weatherInput.value = dayData.weather || '';
    if (notesInput) notesInput.value = dayData.notes || '';

    const accommodation = dayData.accommodation || {};
    if (accNameInput) accNameInput.value = accommodation.name || '';
    if (accAddressInput) accAddressInput.value = accommodation.address || '';

    if (accommodation.location) {
      if (accLatInput) accLatInput.value = accommodation.location.lat ?? '';
      if (accLngInput) accLngInput.value = accommodation.location.lng ?? '';
    } else {
      if (accLatInput) accLatInput.value = '';
      if (accLngInput) accLngInput.value = '';
    }
  }

  async handleSubmit() {
    const form = document.getElementById('day-editor-form');
    if (!form) return;

    const formData = new FormData(form);
    const date = formData.get('date');
    const title = formData.get('title') || '';
    const weather = formData.get('weather') || '';
    const notes = formData.get('notes') || '';
    const accommodationName = formData.get('accommodation-name') || '';
    const accommodationAddress = formData.get('accommodation-address') || '';
    const accommodationLat = formData.get('accommodation-lat');
    const accommodationLng = formData.get('accommodation-lng');

    if (!date) {
      this.showError('请填写日期');
      return;
    }

    let accommodation = null;
    if (accommodationName || accommodationAddress || accommodationLat || accommodationLng) {
      accommodation = {
        name: accommodationName || '',
        address: accommodationAddress || ''
      };

      if (accommodationLat && accommodationLng) {
        const lat = parseFloat(accommodationLat);
        const lng = parseFloat(accommodationLng);
        if (isNaN(lat) || isNaN(lng)) {
          this.showError('住宿坐标格式不正确');
          return;
        }
        accommodation.location = { lat, lng };
      }
    }

    const dayPayload = {
      day: this.dayNumber,
      date,
      title,
      weather,
      notes,
      accommodation
    };

    this.logger.info('Submitting day data', { mode: this.mode, day: this.dayNumber });

    try {
      this.showLoading(true);

      if (this.mode === 'add') {
        await this.routeEditorUI.createDay(dayPayload);
      } else {
        await this.routeEditorUI.updateDay(this.dayNumber, dayPayload);
      }

      this.close();
    } catch (error) {
      this.logger.error('Failed to save day', error);
      this.showError(error.message || '保存失败，请稍后再试');
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Initialize place search for accommodation address
   */
  async initPlaceSearch() {
    const input = document.getElementById('day-accommodation-address');
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
        inputId: 'day-accommodation-address',
        onPlaceSelected: (place) => {
          this.handlePlaceSelected(place);
        }
      });
    }

    this.placeSearch.init(input);
  }

  /**
   * Handle place selection from autocomplete
   */
  handlePlaceSelected(place) {
    this.logger.info('Place selected', place);

    // Show selected place
    const selectedPlaceDiv = document.getElementById('day-selected-place');
    const placeName = document.getElementById('day-selected-place-name');
    const placeCoords = document.getElementById('day-selected-place-coords');

    if (selectedPlaceDiv && placeName && placeCoords) {
      placeName.textContent = place.name;
      placeCoords.textContent = `${place.lat.toFixed(6)}, ${place.lng.toFixed(6)}`;
      selectedPlaceDiv.style.display = 'block';
    }

    // Fill manual coords fields (hidden)
    const latInput = document.getElementById('day-accommodation-lat');
    const lngInput = document.getElementById('day-accommodation-lng');
    const addressInput = document.getElementById('day-accommodation-address');
    const nameInput = document.getElementById('day-accommodation-name');

    if (latInput) latInput.value = place.lat;
    if (lngInput) lngInput.value = place.lng;
    if (addressInput) addressInput.value = place.address;
    // Auto-fill name if empty
    if (nameInput && !nameInput.value) {
      nameInput.value = place.name;
    }

    this.clearError();
  }

  /**
   * Show manual coordinates mode when Google Maps is not available
   */
  showManualCoordsMode() {
    // Hide toggle button
    const toggleDiv = document.getElementById('day-manual-coords-toggle');
    if (toggleDiv) {
      toggleDiv.style.display = 'none';
    }

    // Show manual coords section
    const manualSection = document.getElementById('day-manual-coords-section');
    if (manualSection) {
      manualSection.style.display = 'block';
    }

    // Update help text
    const helpText = document.querySelector('#day-accommodation-address + .place-search-help');
    if (helpText) {
      helpText.innerHTML = 'ℹ️ 地图服务暂不可用，请点击下方"手动输入坐标"';
      helpText.style.color = '#856404';
    }
  }

  /**
   * Toggle manual coords input
   */
  toggleManualCoords() {
    const section = document.getElementById('day-manual-coords-section');
    if (!section) return;

    if (section.style.display === 'none') {
      section.style.display = 'block';
    } else {
      section.style.display = 'none';
    }
  }

  showLoading(isLoading) {
    const form = document.getElementById('day-editor-form');
    if (!form) return;

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = isLoading;
      submitBtn.textContent = isLoading ? '保存中...' : '保存';
    }
  }

  showError(message) {
    const errorEl = document.getElementById('day-editor-error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }
  }

  clearError() {
    const errorEl = document.getElementById('day-editor-error');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.style.display = 'none';
    }
  }
}

window.DayEditorModal = DayEditorModal;
