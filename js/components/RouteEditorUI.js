/**
 * RouteEditorUI Component
 * Allows users to create and edit custom routes
 */

class RouteEditorUI {
  constructor(dataManager, tripManagerUI) {
    this.dataManager = dataManager;
    this.tripManagerUI = tripManagerUI;
    this.logger = new Logger({ prefix: '[RouteEditorUI]', enabled: true });

    // State
    this.isEditMode = false;
    this.currentTripId = null;
    this.tripData = null;
    this.routeData = null;

    this.logger.info('RouteEditorUI initialized');
  }

  /**
   * Initialize the route editor UI
   */
  init() {
    this.createEditModeToggle();
    this.attachEventListeners();
    this.logger.info('RouteEditorUI setup complete');
  }

  /**
   * Create edit mode toggle button
   */
  createEditModeToggle() {
    const header = document.querySelector('.header');
    if (!header) {
      this.logger.error('Header element not found');
      return;
    }

    const toggleButton = document.createElement('button');
    toggleButton.className = 'edit-mode-toggle';
    toggleButton.id = 'edit-mode-toggle';
    toggleButton.dataset.action = 'toggle-edit-mode';
    toggleButton.innerHTML = '✏️ 编辑模式';
    toggleButton.style.display = 'none'; // Hidden by default
    header.appendChild(toggleButton);
  }

  /**
   * Show edit mode toggle (when trip is loaded)
   */
  showEditToggle(tripId, tripData, routeData) {
    this.currentTripId = tripId;
    this.tripData = tripData;
    this.routeData = routeData;

    const toggle = document.getElementById('edit-mode-toggle');
    if (toggle) {
      toggle.style.display = 'block';
    }
  }

  /**
   * Hide edit mode toggle
   */
  hideEditToggle() {
    this.currentTripId = null;
    this.isEditMode = false;

    const toggle = document.getElementById('edit-mode-toggle');
    if (toggle) {
      toggle.style.display = 'none';
    }

    this.exitEditMode();
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    document.body.addEventListener('click', this.handleClick.bind(this));
  }

  /**
   * Handle click events
   */
  handleClick(e) {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (!action) return;

    switch (action) {
      case 'toggle-edit-mode':
        e.preventDefault();
        this.toggleEditMode();
        break;
      case 'add-day':
        e.preventDefault();
        this.addDay();
        break;
      case 'edit-day':
        e.preventDefault();
        const dayNumber = parseInt(e.target.closest('[data-day]')?.dataset.day);
        if (dayNumber) this.editDay(dayNumber);
        break;
      case 'delete-day':
        e.preventDefault();
        const deleteDayNumber = parseInt(e.target.closest('[data-day]')?.dataset.day);
        if (deleteDayNumber) this.deleteDay(deleteDayNumber);
        break;
      case 'add-activity':
        e.preventDefault();
        const activityDay = parseInt(e.target.closest('[data-day]')?.dataset.day);
        if (activityDay) this.addActivity(activityDay);
        break;
      case 'edit-activity':
        e.preventDefault();
        const editDay = parseInt(e.target.closest('[data-day]')?.dataset.day);
        const editIndex = parseInt(e.target.closest('[data-activity-index]')?.dataset.activityIndex);
        if (editDay && editIndex !== undefined) this.editActivity(editDay, editIndex);
        break;
      case 'delete-activity':
        e.preventDefault();
        const delDay = parseInt(e.target.closest('[data-day]')?.dataset.day);
        const delIndex = parseInt(e.target.closest('[data-activity-index]')?.dataset.activityIndex);
        if (delDay && delIndex !== undefined) this.deleteActivity(delDay, delIndex);
        break;
      case 'save-changes':
        e.preventDefault();
        this.saveChanges();
        break;
      case 'cancel-edit':
        e.preventDefault();
        this.exitEditMode();
        break;
    }
  }

  /**
   * Toggle edit mode
   */
  toggleEditMode() {
    if (!this.currentTripId) {
      this.showMessage('请先选择一个行程', 'warning');
      return;
    }

    this.isEditMode = !this.isEditMode;

    if (this.isEditMode) {
      this.enterEditMode();
    } else {
      this.exitEditMode();
    }
  }

  /**
   * Enter edit mode
   */
  enterEditMode() {
    this.logger.info('Entering edit mode');

    // Update toggle button
    const toggle = document.getElementById('edit-mode-toggle');
    if (toggle) {
      toggle.classList.add('active');
      toggle.innerHTML = '✓ 编辑中';
    }

    // Add edit controls to timeline
    this.addEditControls();

    // Show save/cancel buttons
    this.showEditActions();

    this.showMessage('编辑模式已启用', 'success');
  }

  /**
   * Exit edit mode
   */
  exitEditMode() {
    this.logger.info('Exiting edit mode');

    // Update toggle button
    const toggle = document.getElementById('edit-mode-toggle');
    if (toggle) {
      toggle.classList.remove('active');
      toggle.innerHTML = '✏️ 编辑模式';
    }

    // Remove edit controls
    this.removeEditControls();

    // Hide save/cancel buttons
    this.hideEditActions();
  }

  /**
   * Add edit controls to timeline
   */
  addEditControls() {
    const timeline = document.querySelector('.timeline-content');
    if (!timeline) return;

    // Add "Add Day" button at the end
    const addDayBtn = document.createElement('div');
    addDayBtn.className = 'add-day-button';
    addDayBtn.innerHTML = `
      <button class="btn-primary" data-action="add-day">
        <span>+</span> 添加新一天
      </button>
    `;
    timeline.appendChild(addDayBtn);

    // Add edit buttons to each day
    const dayItems = timeline.querySelectorAll('.day-item');
    dayItems.forEach((dayItem, index) => {
      const dayNumber = index + 1;
      const header = dayItem.querySelector('.day-header');
      if (!header) return;

      const editControls = document.createElement('div');
      editControls.className = 'day-edit-controls';
      editControls.innerHTML = `
        <button class="edit-btn" data-action="add-activity" data-day="${dayNumber}" title="添加活动">
          <span>+</span>
        </button>
        <button class="edit-btn" data-action="edit-day" data-day="${dayNumber}" title="编辑天">
          ✏️
        </button>
        <button class="edit-btn danger" data-action="delete-day" data-day="${dayNumber}" title="删除天">
          🗑️
        </button>
      `;
      header.appendChild(editControls);

      // Add edit/delete buttons to each activity
      const activities = dayItem.querySelectorAll('.activity-item');
      activities.forEach((activityItem, actIndex) => {
        const actEditControls = document.createElement('div');
        actEditControls.className = 'activity-edit-controls';
        actEditControls.innerHTML = `
          <button class="edit-btn-small" data-action="edit-activity" data-day="${dayNumber}" data-activity-index="${actIndex}" title="编辑">
            ✏️
          </button>
          <button class="edit-btn-small danger" data-action="delete-activity" data-day="${dayNumber}" data-activity-index="${actIndex}" title="删除">
            ×
          </button>
        `;
        activityItem.appendChild(actEditControls);
      });
    });
  }

  /**
   * Remove edit controls from timeline
   */
  removeEditControls() {
    // Remove add day button
    const addDayBtn = document.querySelector('.add-day-button');
    if (addDayBtn) addDayBtn.remove();

    // Remove all edit controls
    document.querySelectorAll('.day-edit-controls, .activity-edit-controls').forEach(el => el.remove());
  }

  /**
   * Show edit actions (save/cancel buttons)
   */
  showEditActions() {
    const container = document.querySelector('.container');
    if (!container) return;

    const actions = document.createElement('div');
    actions.className = 'edit-actions-bar';
    actions.id = 'edit-actions-bar';
    actions.innerHTML = `
      <div class="edit-actions-content">
        <span class="edit-mode-indicator">✏️ 编辑模式</span>
        <div class="edit-actions-buttons">
          <button class="btn-secondary" data-action="cancel-edit">取消</button>
          <button class="btn-primary" data-action="save-changes">保存更改</button>
        </div>
      </div>
    `;
    container.appendChild(actions);
  }

  /**
   * Hide edit actions
   */
  hideEditActions() {
    const actions = document.getElementById('edit-actions-bar');
    if (actions) actions.remove();
  }

  /**
   * Add a new day
   */
  async addDay() {
    // TODO: Show modal to input day details
    this.showMessage('添加新一天的功能即将推出', 'info');
  }

  /**
   * Edit a day
   */
  async editDay(dayNumber) {
    // TODO: Show modal to edit day details
    this.showMessage(`编辑第${dayNumber}天的功能即将推出`, 'info');
  }

  /**
   * Delete a day
   */
  async deleteDay(dayNumber) {
    if (!confirm(`确定要删除第${dayNumber}天吗？`)) {
      return;
    }

    // TODO: Implement delete day
    this.showMessage('删除天的功能即将推出', 'info');
  }

  /**
   * Add an activity
   */
  async addActivity(dayNumber) {
    // TODO: Show modal to add activity
    this.showMessage(`为第${dayNumber}天添加活动的功能即将推出`, 'info');
  }

  /**
   * Edit an activity
   */
  async editActivity(dayNumber, activityIndex) {
    // TODO: Show modal to edit activity
    this.showMessage(`编辑活动的功能即将推出`, 'info');
  }

  /**
   * Delete an activity
   */
  async deleteActivity(dayNumber, activityIndex) {
    if (!confirm('确定要删除这个活动吗？')) {
      return;
    }

    // TODO: Implement delete activity
    this.showMessage('删除活动的功能即将推出', 'info');
  }

  /**
   * Save changes to database
   */
  async saveChanges() {
    if (!this.currentTripId) {
      this.showMessage('没有选中的行程', 'error');
      return;
    }

    this.logger.info('Saving changes', { tripId: this.currentTripId });

    try {
      // Save trip data
      await this.dataManager.saveTripData(this.currentTripId, this.tripData);

      // Save route data
      await this.dataManager.saveRouteData(this.currentTripId, this.routeData);

      this.showMessage('更改已保存', 'success');
      this.exitEditMode();

      // Reload trip to show changes
      if (window.travelApp && window.travelApp.onTripChanged) {
        const trip = this.tripManagerUI.trips.find(t => t.id === this.currentTripId);
        await window.travelApp.onTripChanged(trip);
      }
    } catch (error) {
      this.logger.error('Failed to save changes', error);
      this.showMessage('保存失败，请稍后再试', 'error');
    }
  }

  /**
   * Show message
   */
  showMessage(message, type = 'info') {
    const className = type === 'success' ? 'success-message' :
                     type === 'error' ? 'error-message' :
                     type === 'warning' ? 'warning-message' :
                     'info-message';

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
}

// Make RouteEditorUI available globally
window.RouteEditorUI = RouteEditorUI;
