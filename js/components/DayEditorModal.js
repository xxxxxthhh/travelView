
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
              <label>第几天</label>
              <input type="text" id="day-editor-number" disabled value="1">
            </div>

            <div class="form-group">
              <label for="day-date">日期 *</label>
              <input type="date" id="day-date" name="date" required>
            </div>

            <div class="form-group">
              <label for="day-title">当天标题</label>
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
              <label for="day-accommodation-address">住宿地址</label>
              <input type="text" id="day-accommodation-address" name="accommodation-address" placeholder="住宿的详细地址（可选）">
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="day-accommodation-lat">住宿纬度</label>
                <input type="number" step="0.000001" min="-90" max="90" id="day-accommodation-lat" name="accommodation-lat" placeholder="可选">
              </div>
              <div class="form-group">
                <label for="day-accommodation-lng">住宿经度</label>
                <input type="number" step="0.000001" min="-180" max="180" id="day-accommodation-lng" name="accommodation-lng" placeholder="可选">
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

    const numberInput = document.getElementById('day-editor-number');
    if (numberInput) numberInput.value = dayNumber;

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

    const numberInput = document.getElementById('day-editor-number');
    if (numberInput) numberInput.value = dayNumber;

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
