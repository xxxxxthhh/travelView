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

    // Day editor modal
    this.dayEditorModal = null;

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

    // Initialize day editor modal
    if (window.DayEditorModal) {
      this.dayEditorModal = new DayEditorModal(this);
      this.dayEditorModal.init();
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
    this.removeEditControls();
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
        <span class="edit-mode-indicator">✏️ 编辑模式 (更改自动保存)</span>
        <div class="edit-actions-buttons">
          <button class="btn-primary" data-action="save-changes">完成编辑</button>
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
   * Add a new day (show modal)
   */
  async addDay() {
    if (!this.tripData) {
      this.logger.error('No trip data available');
      return;
    }

    // Calculate suggested date (next day after last day)
    let suggestedDate = null;
    if (this.tripData.days && this.tripData.days.length > 0) {
      const lastDay = this.tripData.days[this.tripData.days.length - 1];
      if (lastDay.date) {
        const nextDate = new Date(lastDay.date);
        nextDate.setDate(nextDate.getDate() + 1);
        suggestedDate = nextDate.toISOString().split('T')[0];
      }
    } else {
      // No days yet, suggest trip start date or today
      const trip = this.tripManagerUI.trips.find(t => t.id === this.currentTripId);
      if (trip && trip.start_date) {
        suggestedDate = trip.start_date;
      } else {
        suggestedDate = new Date().toISOString().split('T')[0];
      }
    }

    // Calculate next day number
  let nextDayNumber = 1;
  if (this.tripData.days && this.tripData.days.length > 0) {
    const maxDay = Math.max(...this.tripData.days.map(d => d.day));
    nextDayNumber = maxDay + 1;
  }

  // Show day editor modal
  if (!this.dayEditorModal && window.DayEditorModal) {
    this.dayEditorModal = new DayEditorModal(this);
    this.dayEditorModal.init();
  }

  if (this.dayEditorModal) {
    this.dayEditorModal.showAdd(nextDayNumber, suggestedDate);
  } else {
    this.logger.error('DayEditorModal not initialized');
  }
}



  /**
   * Add a new day (actual implementation called by DayEditorModal)
   */
  async addDayData(dayData) {
    if (!this.tripData) {
      this.logger.error('No trip data available');
      return;
    }

    // Initialize days array if needed
    if (!this.tripData.days) {
      this.tripData.days = [];
    }

    // Calculate day number
    const dayNumber = this.tripData.days.length + 1;

    try {
      // Call granular add method
      const newDay = await this.dataManager.addDay(this.currentTripId, {
        day: dayNumber,
        date: dayData.date,
        title: dayData.title,
        notes: dayData.notes
      });

      // Update local state
      const localDay = {
        id: newDay.id,
        day: dayNumber,
        date: dayData.date,
        title: dayData.title || null,
        notes: dayData.notes || null,
        activities: []
      };
      
      this.tripData.days.push(localDay);
      this.logger.info('New day added', localDay);

      // Update UI without reload
      if (window.travelApp && window.travelApp.timeline) {
        window.travelApp.timeline.updateData(this.tripData);
      }
      
      // Re-add edit controls
      this.addEditControls();

      this.showMessage(`第${dayNumber}天已添加`, 'success');
    } catch (error) {
      this.logger.error('Failed to add new day', error);
      this.showMessage('添加失败，请稍后再试', 'error');
      throw error;
    }
  }

  /**
   * Create a new day (alias for addDayData with different payload structure)
   * Used by the new DayEditorModal
   */
  async createDay(dayPayload) {
    // Map the payload from the new DayEditorModal to what addDayData expects
    // or handle it directly here if it has more fields (like accommodation)
    
    if (!this.tripData) {
      this.logger.error('No trip data available');
      return;
    }

    // Initialize days array if needed
    if (!this.tripData.days) {
      this.tripData.days = [];
    }

    // Calculate day number
    const dayNumber = this.tripData.days.length + 1;

    try {
      // Call granular add method
      const newDay = await this.dataManager.addDay(this.currentTripId, {
        day: dayNumber,
        date: dayPayload.date,
        title: dayPayload.title,
        notes: dayPayload.notes
      });

      // Update local state - only add once
      const localDay = {
        id: newDay.id,
        day: dayNumber,
        date: dayPayload.date,
        title: dayPayload.title || null,
        weather: dayPayload.weather || null,
        notes: dayPayload.notes || null,
        accommodation: dayPayload.accommodation || null,
        activities: []
      };

      this.tripData.days.push(localDay);
      this.logger.info('New day created', localDay);

      // Update UI without reload
      if (window.travelApp && window.travelApp.timeline) {
        window.travelApp.timeline.updateData(this.tripData);
      }
      
      // Re-add edit controls
      this.addEditControls();

      this.showMessage(`第${dayNumber}天已添加`, 'success');
    } catch (error) {
      this.logger.error('Failed to create new day', error);
      this.showMessage('添加失败，请稍后再试', 'error');
      throw error;
    }
  }

  /**
   * Edit a day (show modal)
   */
  async editDay(dayNumber) {
    if (!this.tripData || !this.tripData.days) {
      this.logger.error('No trip data available');
      return;
    }

    const dayIndex = dayNumber - 1;
    if (dayIndex < 0 || dayIndex >= this.tripData.days.length) {
      this.logger.error('Invalid day number', { dayNumber });
      return;
    }

    const dayData = this.tripData.days[dayIndex];

    // Show day editor modal
    if (this.dayEditorModal) {
      this.dayEditorModal.showEdit(dayNumber, dayData);
    }
  }

  /**
   * Update a day (actual implementation called by DayEditorModal)
   */
  async updateDay(dayNumber, dayData) {
    if (!this.tripData || !this.tripData.days) {
      this.logger.error('No trip data available');
      return;
    }

    const dayIndex = dayNumber - 1;
    if (dayIndex < 0 || dayIndex >= this.tripData.days.length) {
      this.logger.error('Invalid day number', { dayNumber });
      return;
    }

    try {
      // Call granular update method
      await this.dataManager.updateDay(this.currentTripId, dayNumber, dayData);

      // Update local state
      const day = this.tripData.days[dayIndex];
      day.date = dayData.date;
      day.title = dayData.title || null;
      day.weather = dayData.weather || null;
      day.notes = dayData.notes || null;
      day.accommodation = dayData.accommodation || null;

      this.logger.info('Day updated', { dayNumber, dayData });

      // Update UI without reload
      if (window.travelApp && window.travelApp.timeline) {
        window.travelApp.timeline.updateData(this.tripData);
      }
      
      // Re-add edit controls
      this.addEditControls();

      this.showMessage(`第${dayNumber}天已更新`, 'success');
    } catch (error) {
      this.logger.error('Failed to update day', error);
      this.showMessage('更新失败，请稍后再试', 'error');
      throw error;
    }
  }

  /**
   * Delete a day
   */
  async deleteDay(dayNumber) {
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
    const activityCount = day.activities ? day.activities.length : 0;

    // Confirm deletion
    let confirmMessage = `确定要删除第${dayNumber}天吗？`;
    if (activityCount > 0) {
      confirmMessage += `\n\n该天包含 ${activityCount} 个活动，删除后将无法恢复。`;
    }

    if (!confirm(confirmMessage)) {
      return;
    }

    this.logger.info('Deleting day', { dayNumber, activityCount });

    try {
      // Call granular delete method
      await this.dataManager.deleteDay(this.currentTripId, dayNumber);

      // Update local state
      this.tripData.days.splice(dayIndex, 1);

      // Recalculate day numbers for remaining days
      this.tripData.days.forEach((day, index) => {
        day.day = index + 1;
      });

      this.logger.info('Day numbers recalculated', {
        totalDays: this.tripData.days.length
      });

      // Update UI without reload
      if (window.travelApp && window.travelApp.timeline) {
        window.travelApp.timeline.updateData(this.tripData);
      }
      
      // Re-add edit controls
      this.addEditControls();

      this.showMessage(`第${dayNumber}天已删除`, 'success');
    } catch (error) {
      this.logger.error('Failed to delete day', error);
      this.showMessage('删除失败，请稍后再试', 'error');
    }
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

    try {
      // Call granular add method
      const newActivity = await this.dataManager.addActivity(this.currentTripId, dayNumber, activity);

      // Update local state
      const localActivity = {
        id: newActivity.id,
        ...activity
      };
      
      this.tripData.days[dayIndex].activities.push(localActivity);
      this.logger.info('Activity added', { dayNumber, activity: localActivity });

      // Update UI without reload
      if (window.travelApp && window.travelApp.timeline) {
        window.travelApp.timeline.updateData(this.tripData);
      }
      
      // Re-add edit controls
      this.addEditControls();
      
      // Also update map if possible
      if (window.travelApp && window.travelApp.mapManager) {
        // This is a bit heavy, but better than full reload
        // Ideally we would just add one marker
        window.travelApp.mapManager.clearAllMarkers();
        window.travelApp.renderAllMarkers(this.tripData);
      }

      this.showMessage('活动已添加', 'success');
    } catch (error) {
      this.logger.error('Failed to add activity', error);
      this.showMessage('添加失败，请稍后再试', 'error');
    }
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

    try {
      // Call granular update method
      await this.dataManager.updateActivity(this.currentTripId, dayNumber, activityIndex, activity);

      // Update local state
      // Preserve ID if it exists
      const existingId = day.activities[activityIndex].id;
      day.activities[activityIndex] = {
        ...activity,
        id: existingId
      };
      
      this.logger.info('Activity updated', { dayNumber, activityIndex, activity });

      // Update UI without reload
      if (window.travelApp && window.travelApp.timeline) {
        window.travelApp.timeline.updateData(this.tripData);
      }
      
      // Re-add edit controls
      this.addEditControls();
      
      // Update map
      if (window.travelApp && window.travelApp.mapManager) {
        window.travelApp.mapManager.clearAllMarkers();
        window.travelApp.renderAllMarkers(this.tripData);
      }

      this.showMessage('活动已更新', 'success');
    } catch (error) {
      this.logger.error('Failed to update activity', error);
      this.showMessage('更新失败，请稍后再试', 'error');
    }
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

    try {
      // Call granular delete method
      await this.dataManager.deleteActivity(this.currentTripId, dayNumber, activityIndex);

      // Update local state
      day.activities.splice(activityIndex, 1);
      this.logger.info('Activity deleted', { dayNumber, activityIndex });

      // Update UI without reload
      if (window.travelApp && window.travelApp.timeline) {
        window.travelApp.timeline.updateData(this.tripData);
      }
      
      // Re-add edit controls
      this.addEditControls();
      
      // Update map
      if (window.travelApp && window.travelApp.mapManager) {
        window.travelApp.mapManager.clearAllMarkers();
        window.travelApp.renderAllMarkers(this.tripData);
      }

      this.showMessage('活动已删除', 'success');
    } catch (error) {
      this.logger.error('Failed to delete activity', error);
      this.showMessage('删除失败，请稍后再试', 'error');
    }
  }

  /**
   * Save changes to database
   */
  /**
   * Save changes (Routes only, as Trip Data is auto-saved)
   */
  async saveChanges(exitEditMode = false) {
    if (!this.currentTripId) {
      this.showMessage('没有选中的行程', 'error');
      return;
    }

    this.logger.info('Saving route changes', { tripId: this.currentTripId });

    try {
      if (!this.routeData) {
        this.routeData = { routes: [], returnRoute: null };
      }

      if (!Array.isArray(this.routeData.routes)) {
        this.routeData.routes = [];
      }

      // Save route data only
      await this.dataManager.saveRouteData(this.currentTripId, this.routeData);

      this.showMessage('所有更改已保存', 'success');

      if (exitEditMode) {
        this.exitEditMode();
      }
    } catch (error) {
      this.logger.error('Failed to save route changes', error);
      this.showMessage('保存路线失败，请稍后再试', 'error');
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
    if (!this.dayEditorModal) {
      this.showMessage('当前无法编辑天数', 'error');
      return;
    }

    // Calculate default date
    let defaultDate = null;
    const trip = this.tripManagerUI?.trips?.find(t => t.id === this.currentTripId);
    if (trip && trip.start_date) {
      defaultDate = trip.start_date;
    } else {
      defaultDate = new Date().toISOString().split('T')[0];
    }

    this.dayEditorModal.showAdd(1, defaultDate);
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

  /**
   * Wait for DOM update (better than setTimeout)
   * Returns a promise that resolves when the timeline is updated
   */
  waitForDOMUpdate() {
    return new Promise((resolve) => {
      // Use requestAnimationFrame to wait for next paint
      requestAnimationFrame(() => {
        // Wait one more frame to ensure timeline is fully rendered
        requestAnimationFrame(() => {
          // Additional check: wait for day items to exist
          const checkInterval = setInterval(() => {
            const dayItems = document.querySelectorAll('.day-item');
            if (dayItems.length > 0 || this.tripData.days.length === 0) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 50);

          // Timeout after 2 seconds
          setTimeout(() => {
            clearInterval(checkInterval);
            resolve();
          }, 2000);
        });
      });
    });
  }
}

// Make RouteEditorUI available globally
window.RouteEditorUI = RouteEditorUI;
