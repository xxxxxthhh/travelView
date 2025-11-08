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

    // Activity editor modal
    this.activityEditorModal = null;

    this.logger.info('RouteEditorUI initialized');
  }

  /**
   * Initialize the route editor UI
   */
  init() {
    this.createEditModeToggle();
    this.attachEventListeners();

    // Initialize activity editor modal
    if (window.ActivityEditorModal) {
      this.activityEditorModal = new ActivityEditorModal(this);
      this.activityEditorModal.init();
    }

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

    // Check if trip has no days, show empty state
    if (!tripData.days || tripData.days.length === 0) {
      this.showEmptyState();
    } else {
      this.hideEmptyState();
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
      case 'add-first-day':
        e.preventDefault();
        this.addFirstDay();
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
        if (!isNaN(editDay) && !isNaN(editIndex)) this.editActivity(editDay, editIndex);
        break;
      case 'delete-activity':
        e.preventDefault();
        const delDay = parseInt(e.target.closest('[data-day]')?.dataset.day);
        const delIndex = parseInt(e.target.closest('[data-activity-index]')?.dataset.activityIndex);
        if (!isNaN(delDay) && !isNaN(delIndex)) this.deleteActivity(delDay, delIndex);
        break;
      case 'save-changes':
        e.preventDefault();
        this.saveChanges(true); // Exit edit mode after manual save
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

    // Check if trip has no days
    if (!this.tripData.days || this.tripData.days.length === 0) {
      this.showAddFirstDayButton();
    } else {
      // Add edit controls to timeline
      this.addEditControls();
    }

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
  async addActivity(dayNumber, activity = null) {
    if (!activity) {
      // Show modal to add activity
      if (this.activityEditorModal) {
        this.activityEditorModal.showAdd(dayNumber);
      }
      return;
    }

    // Activity data provided, add to tripData
    if (!this.tripData || !this.tripData.days) {
      this.logger.error('No trip data available');
      return;
    }

    const dayIndex = dayNumber - 1;
    if (dayIndex < 0 || dayIndex >= this.tripData.days.length) {
      this.logger.error('Invalid day number', { dayNumber });
      return;
    }

    if (!this.tripData.days[dayIndex].activities) {
      this.tripData.days[dayIndex].activities = [];
    }

    this.tripData.days[dayIndex].activities.push(activity);
    this.logger.info('Activity added', { dayNumber, activity });

    // Auto-save
    await this.saveChanges();
  }

  /**
   * Edit an activity
   */
  async editActivity(dayNumber, activityIndex) {
    if (!this.tripData || !this.tripData.days) {
      this.logger.error('No trip data available');
      return;
    }

    const dayIndex = dayNumber - 1;
    if (dayIndex < 0 || dayIndex >= this.tripData.days.length) {
      this.logger.error('Invalid day number', { dayNumber });
      return;
    }

    const day = this.tripData.days[dayIndex];
    if (!day.activities || activityIndex < 0 || activityIndex >= day.activities.length) {
      this.logger.error('Invalid activity index', { dayNumber, activityIndex });
      return;
    }

    const activity = day.activities[activityIndex];

    // Show modal to edit activity
    if (this.activityEditorModal) {
      this.activityEditorModal.showEdit(dayNumber, activityIndex, activity);
    }
  }

  /**
   * Update an activity (called from ActivityEditorModal)
   */
  async updateActivity(dayNumber, activityIndex, activity) {
    if (!this.tripData || !this.tripData.days) {
      this.logger.error('No trip data available');
      return;
    }

    const dayIndex = dayNumber - 1;
    if (dayIndex < 0 || dayIndex >= this.tripData.days.length) {
      this.logger.error('Invalid day number', { dayNumber });
      return;
    }

    const day = this.tripData.days[dayIndex];
    if (!day.activities || activityIndex < 0 || activityIndex >= day.activities.length) {
      this.logger.error('Invalid activity index', { dayNumber, activityIndex });
      return;
    }

    day.activities[activityIndex] = activity;
    this.logger.info('Activity updated', { dayNumber, activityIndex, activity });

    // Auto-save
    await this.saveChanges();
  }

  /**
   * Delete an activity
   */
  async deleteActivity(dayNumber, activityIndex) {
    if (!confirm('确定要删除这个活动吗？')) {
      return;
    }

    if (!this.tripData || !this.tripData.days) {
      this.logger.error('No trip data available');
      return;
    }

    const dayIndex = dayNumber - 1;
    if (dayIndex < 0 || dayIndex >= this.tripData.days.length) {
      this.logger.error('Invalid day number', { dayNumber });
      return;
    }

    const day = this.tripData.days[dayIndex];
    if (!day.activities || activityIndex < 0 || activityIndex >= day.activities.length) {
      this.logger.error('Invalid activity index', { dayNumber, activityIndex });
      return;
    }

    day.activities.splice(activityIndex, 1);
    this.logger.info('Activity deleted', { dayNumber, activityIndex });

    // Auto-save
    await this.saveChanges();
  }

  /**
   * Save changes to database
   */
  async saveChanges(exitEditMode = false) {
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

      // Reload trip to show changes
      if (window.travelApp && window.travelApp.onTripChanged) {
        const trip = this.tripManagerUI.trips.find(t => t.id === this.currentTripId);
        await window.travelApp.onTripChanged(trip);

        // Re-enable edit mode controls after reload
        if (this.isEditMode && !exitEditMode) {
          setTimeout(() => {
            this.addEditControls();
          }, 500);
        }
      }

      if (exitEditMode) {
        this.exitEditMode();
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

  /**
   * Show empty state when trip has no days
   */
  showEmptyState() {
    const timeline = document.querySelector('.timeline-content');
    if (!timeline) return;

    // Check if empty state already exists
    if (document.getElementById('trip-empty-state')) return;

    const emptyState = document.createElement('div');
    emptyState.id = 'trip-empty-state';
    emptyState.style.cssText = `
      padding: 60px 20px;
      text-align: center;
      color: #666;
    `;
    emptyState.innerHTML = `
      <div style="font-size: 48px; margin-bottom: 20px;">📅</div>
      <h3 style="margin: 0 0 12px 0; color: #333;">行程还没有任何天数</h3>
      <p style="margin: 0 0 24px 0; color: #999;">点击"编辑模式"按钮开始编辑行程</p>
      <p style="margin: 0; font-size: 14px; color: #999;">
        在编辑模式下，您可以添加天数、活动和路线
      </p>
    `;

    timeline.appendChild(emptyState);
    this.logger.info('Empty state shown');
  }

  /**
   * Show add first day button in edit mode
   */
  showAddFirstDayButton() {
    const emptyState = document.getElementById('trip-empty-state');
    if (!emptyState) return;

    // Check if button already exists
    if (emptyState.querySelector('[data-action="add-first-day"]')) return;

    const button = document.createElement('button');
    button.className = 'btn-primary';
    button.dataset.action = 'add-first-day';
    button.style.cssText = `
      margin-top: 20px;
      padding: 12px 24px;
      font-size: 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
    `;
    button.textContent = '+ 添加第一天';

    emptyState.appendChild(button);
    this.logger.info('Add first day button shown');
  }

  /**
   * Add first day to trip
   */
  async addFirstDay() {
    if (!this.tripData) {
      this.logger.error('No trip data available');
      return;
    }

    // Initialize days array if needed
    if (!this.tripData.days) {
      this.tripData.days = [];
    }

    // Get trip start date or use today
    const trip = this.tripManagerUI.trips.find(t => t.id === this.currentTripId);
    const startDate = trip && trip.start_date ? new Date(trip.start_date) : new Date();
    const dateStr = startDate.toISOString().split('T')[0];

    // Create first day
    const firstDay = {
      day: 1,
      date: dateStr,
      activities: []
    };

    this.tripData.days.push(firstDay);
    this.logger.info('First day added', firstDay);

    // Save to database
    try {
      await this.saveChanges();
      this.showMessage('第一天已添加', 'success');
    } catch (error) {
      this.logger.error('Failed to add first day', error);
      // Rollback
      this.tripData.days.pop();
      this.showMessage('添加失败，请稍后再试', 'error');
    }
  }

  /**
   * Hide empty state
   */
  hideEmptyState() {
    const emptyState = document.getElementById('trip-empty-state');
    if (emptyState) {
      emptyState.remove();
      this.logger.info('Empty state hidden');
    }
  }
}

// Make RouteEditorUI available globally
window.RouteEditorUI = RouteEditorUI;
