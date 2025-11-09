/**
 * DayEditorModal Component
 * Modal for adding/editing day information
 */

class DayEditorModal {
  constructor(routeEditorUI) {
    this.routeEditorUI = routeEditorUI;
    this.logger = new Logger({ prefix: '[DayEditorModal]', enabled: true });

    // State
    this.isOpen = false;
    this.mode = 'add'; // 'add' or 'edit'
    this.currentDayNumber = null;
    this.currentTrip = null;

    this.logger.info('DayEditorModal initialized');
  }

  /**
   * Initialize the modal
   */
  init() {
    this.createModal();
    this.attachEventListeners();
    this.logger.info('DayEditorModal setup complete');
  }

  /**
   * Create modal HTML
   */
  createModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'day-editor-modal';
    modal.innerHTML = `
      <div class="modal-overlay" data-action="close-day-editor"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h2 id="day-editor-title">添加新一天</h2>
          <button class="modal-close" data-action="close-day-editor">×</button>
        </div>
        <div class="modal-body">
          <form id="day-editor-form" class="auth-form">
            <div class="form-group">
              <label for="day-date">日期 *</label>
              <input type="date" id="day-date" name="date" required>
              <div class="form-help">选择这一天的日期</div>
            </div>

            <div class="form-group">
              <label for="day-title">标题（可选）</label>
              <input type="text" id="day-title" name="title"
                     placeholder="例如：京都一日游">
              <div class="form-help">为这一天添加一个描述性标题</div>
            </div>

            <div class="form-group">
              <label for="day-notes">备注（可选）</label>
              <textarea id="day-notes" name="notes" rows="4"
                        placeholder="添加这一天的备注信息，如天气预报、注意事项等"></textarea>
            </div>

            <div id="day-number-display" class="day-number-info" style="display: none;">
              <div class="info-badge">
                <span class="badge-label">天数序号：</span>
                <span class="badge-value" id="day-number-value">-</span>
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

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    document.body.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (!action) return;

      if (action === 'close-day-editor') {
        e.preventDefault();
        this.close();
      }
    });

    document.body.addEventListener('submit', (e) => {
      if (e.target.id === 'day-editor-form') {
        e.preventDefault();
        this.handleSubmit();
      }
    });
  }

  /**
   * Show modal to add a new day
   */
  showAdd(trip, suggestedDate = null) {
    this.mode = 'add';
    this.currentDayNumber = null;
    this.currentTrip = trip;

    const title = document.getElementById('day-editor-title');
    if (title) title.textContent = '添加新一天';

    // Hide day number display in add mode
    const dayNumberDisplay = document.getElementById('day-number-display');
    if (dayNumberDisplay) dayNumberDisplay.style.display = 'none';

    this.resetForm();

    // Set suggested date if provided
    if (suggestedDate) {
      const dateInput = document.getElementById('day-date');
      if (dateInput) dateInput.value = suggestedDate;
    }

    this.open();
  }

  /**
   * Show modal to edit a day
   */
  showEdit(dayNumber, dayData) {
    this.mode = 'edit';
    this.currentDayNumber = dayNumber;

    const title = document.getElementById('day-editor-title');
    if (title) title.textContent = `编辑第${dayNumber}天`;

    // Show day number display in edit mode
    const dayNumberDisplay = document.getElementById('day-number-display');
    const dayNumberValue = document.getElementById('day-number-value');
    if (dayNumberDisplay && dayNumberValue) {
      dayNumberDisplay.style.display = 'block';
      dayNumberValue.textContent = `第 ${dayNumber} 天`;
    }

    this.populateForm(dayData);
    this.open();
  }

  /**
   * Open modal
   */
  open() {
    this.isOpen = true;
    const modal = document.getElementById('day-editor-modal');
    if (modal) {
      modal.classList.add('active');
    }

    this.logger.info('Day editor opened', { mode: this.mode, day: this.currentDayNumber });
  }

  /**
   * Close modal
   */
  close() {
    this.isOpen = false;
    const modal = document.getElementById('day-editor-modal');
    if (modal) {
      modal.classList.remove('active');
    }

    this.resetForm();
    this.logger.info('Day editor closed');
  }

  /**
   * Reset form
   */
  resetForm() {
    const form = document.getElementById('day-editor-form');
    if (form) form.reset();

    this.clearError();
  }

  /**
   * Populate form with day data
   */
  populateForm(dayData) {
    const dateInput = document.getElementById('day-date');
    const titleInput = document.getElementById('day-title');
    const notesInput = document.getElementById('day-notes');

    if (dateInput) dateInput.value = dayData.date || '';
    if (titleInput) titleInput.value = dayData.title || '';
    if (notesInput) notesInput.value = dayData.notes || '';
  }

  /**
   * Handle form submission
   */
  async handleSubmit() {
    const form = document.getElementById('day-editor-form');
    if (!form) return;

    const formData = new FormData(form);
    const date = formData.get('date');
    const title = formData.get('title');
    const notes = formData.get('notes');

    // Validate
    if (!date) {
      this.showError('请选择日期');
      return;
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      this.showError('日期格式不正确');
      return;
    }

    // Create day object
    const dayData = {
      date,
      title: title || null,
      notes: notes || null
    };

    this.logger.info('Submitting day data', dayData);

    try {
      this.showLoading(true);

      if (this.mode === 'add') {
        await this.routeEditorUI.addDayData(dayData);
      } else if (this.mode === 'edit') {
        await this.routeEditorUI.updateDay(this.currentDayNumber, dayData);
      }

      this.close();
    } catch (error) {
      this.logger.error('Failed to save day', error);
      this.showError('保存失败，请稍后再试');
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Show loading state
   */
  showLoading(isLoading) {
    const form = document.getElementById('day-editor-form');
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
    const errorEl = document.getElementById('day-editor-error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }
  }

  /**
   * Clear error
   */
  clearError() {
    const errorEl = document.getElementById('day-editor-error');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.style.display = 'none';
    }
  }
}

// Make DayEditorModal available globally
window.DayEditorModal = DayEditorModal;
