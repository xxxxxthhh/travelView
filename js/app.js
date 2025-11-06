/**
 * 关西旅行可视化应用 - 主应用逻辑
 */

class TravelApp {
  constructor() {
    this.currentDay = 1;
    this.map = null;
    this.markers = [];
    this.routes = [];
    this.tripData = null;
    this.filterType = "all";
    this.renderedRoutes = new Set(); // 跟踪已渲染的路线
    this.lastRenderedDay = 0; // 记录上次渲染到的天数

    this.init();
  }

  async init() {
    try {
      // 显示API密钥状态
      this.checkApiKeyStatus();

      // 加载数据
      await this.loadTripData();

      // 初始化组件
      this.initTimeline();
      await this.initMap();
      this.initEventListeners();
      this.initMapControls();

      // 设置初始状态
      this.showDay(1);

      console.log("Travel App initialized successfully");
    } catch (error) {
      console.error("Failed to initialize app:", error);
      this.showError("应用初始化失败，请刷新页面重试");
    }
  }

  checkApiKeyStatus() {
    const config = window.MAPS_CONFIG || {};
    const status = GoogleMapsLoader.getApiKeyStatus(config);

    if (!status.valid) {
      console.warn(`🔑 ${status.message}: ${status.suggestion}`);
      this.showWarning(status.message, status.suggestion);
    } else {
      console.log("🔑 Google Maps API密钥配置正确");
    }
  }

  async loadTripData() {
    try {
      console.log("🔄 Loading trip data from JSON file...");
      const response = await fetch("./data/kansai-trip.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      this.tripData = await response.json();
      console.log("✅ Trip data loaded successfully:", this.tripData);

      // 验证第一天的住宿信息
      if (
        this.tripData.days &&
        this.tripData.days[0] &&
        this.tripData.days[0].accommodation
      ) {
        console.log("🏨 第一天住宿信息:", this.tripData.days[0].accommodation);
      }
    } catch (error) {
      console.warn(
        "⚠️ Failed to load trip data, using fallback data. Error:",
        error
      );
      // 使用默认数据作为后备
      this.tripData = this.getFallbackData();
      console.log("🔄 Using fallback data:", this.tripData);
    }
  }

  initTimeline() {
    const timeline = new Timeline({
      container: ".timeline",
      data: this.tripData,
      onDayClick: (day) => this.showDay(day),
      onFilterChange: (type) => this.setFilter(type),
    });

    this.timeline = timeline;
  }

  async initMap() {
    const config = window.MAPS_CONFIG || {};

    // 检查是否启用地图功能
    if (!config.ENABLE_MAPS) {
      this.showMapPlaceholder("演示模式", "地图功能已禁用，时间轴功能完全可用");
      return;
    }

    try {
      // 使用加载器加载Google Maps
      await window.googleMapsLoader.load(config);

      const mapContainer = document.querySelector("#map");
      if (!mapContainer) {
        console.error("Map container not found");
        return;
      }

      this.mapManager = new MapManager({
        container: "#map",
        data: this.tripData,
        onMarkerClick: (day, activityIndex) =>
          this.highlightActivity(day, activityIndex),
      });

      console.log("🗺️ Google Maps加载成功");
    } catch (error) {
      console.error("Google Maps加载失败:", error);
      this.showMapPlaceholder("地图加载失败", error.message);
    }
  }

  initEventListeners() {
    // 键盘导航
    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft" && this.currentDay > 1) {
        this.showDay(this.currentDay - 1);
      } else if (
        e.key === "ArrowRight" &&
        this.currentDay < this.tripData.days.length
      ) {
        this.showDay(this.currentDay + 1);
      }
    });

    // 窗口大小变化
    window.addEventListener("resize", () => {
      if (this.mapManager) {
        this.mapManager.resize();
      }
    });

    // 控制按钮
    this.setupControlButtons();
  }

  setupControlButtons() {
    // 添加地图控制按钮
    const controlsHtml = `
            <div class="map-controls">
                <button class="control-btn" data-action="reset-view" data-tooltip="重置视图">
                    🗺️
                </button>
                <button class="control-btn" data-action="toggle-routes" data-tooltip="显示/隐藏路线">
                    🛤️
                </button>
                <button class="control-btn" data-action="toggle-traffic" data-tooltip="显示/隐藏交通">
                    🚦
                </button>
                <button class="control-btn" data-action="fullscreen" data-tooltip="全屏">
                    ⛶
                </button>
            </div>
        `;

    const mapContainer = document.querySelector(".map-container");
    if (mapContainer && !mapContainer.querySelector(".map-controls")) {
      mapContainer.insertAdjacentHTML("beforeend", controlsHtml);

      // 绑定事件
      mapContainer.addEventListener("click", (e) => {
        const btn = e.target.closest(".control-btn");
        if (!btn) return;

        const action = btn.dataset.action;
        this.handleControlAction(action);
      });
    }
  }

  handleControlAction(action) {
    if (!this.mapManager) return;

    switch (action) {
      case "reset-view":
        this.mapManager.resetView();
        break;
      case "toggle-routes":
        // 重新启用路线切换功能
        this.mapManager.toggleRoutes();
        break;
      case "toggle-traffic":
        this.mapManager.toggleTraffic();
        break;
      case "fullscreen":
        this.toggleFullscreen();
        break;
    }
  }

  showDay(day) {
    console.log(
      `🎯 显示第${day}天 (当前: currentDay=${this.currentDay}, lastRenderedDay=${this.lastRenderedDay})`
    );
    console.log(`🎯 当前已渲染路线集合:`, Array.from(this.renderedRoutes));

    if (day < 1 || day > this.tripData.days.length) {
      console.warn(`⚠️ 无效的天数: ${day}`);
      return;
    }

    this.currentDay = day;

    // 更新时间轴
    if (this.timeline) {
      this.timeline.setActiveDay(day);
    }

    // 更新地图 - 显示累积路线并聚焦到起点
    if (this.mapManager) {
      this.mapManager.showDay(day);
      // 聚焦到当天路线的起点
      this.mapManager.focusOnDayRoute(day);
      // 添加累积路线显示
      this.addProgressiveRoutes(day);
    } else {
      console.warn("🚫 MapManager 未初始化，无法显示路线");
    }

    // 更新统计信息
    this.updateStats(day);

    console.log(`✅ 第${day}天显示完成`);
  }

  // 添加渐进式路线显示功能 - 优化版本
  async addProgressiveRoutes(upToDay) {
    if (!this.mapManager) {
      console.warn("🚫 MapManager 未初始化，跳过路线渲染");
      return;
    }

    console.log(
      `🛣️ 渐进式显示到第${upToDay}天的路线 (当前: lastRenderedDay=${this.lastRenderedDay})`
    );

    // 显示进度指示器
    this.showRouteProgress(upToDay);

    // 更新时间轴样式
    this.updateTimelineProgress(upToDay);

    // 获取所有路线段定义
    const routeSegments = this.getRouteSegments();
    console.log(`📋 总共找到 ${routeSegments.length} 条路线段`);

    // 如果是向后跳转（比如从第5天跳到第3天），需要清除后面的路线
    if (upToDay < this.lastRenderedDay) {
      console.log(`🔄 向后跳转: 从第${this.lastRenderedDay}天到第${upToDay}天`);
      // 清除所有路线和状态，重新开始
      this.mapManager.clearAllRoutes();
      this.renderedRoutes.clear();
      this.lastRenderedDay = 0;
    }

    // 渲染从第1天到目标天数的所有路线
    const startDay = 1;
    const endDay = upToDay;
    console.log(`📈 渲染路线: 从第${startDay}天到第${endDay}天`);

    for (let day = startDay; day <= endDay; day++) {
      const daySegments = routeSegments.filter(
        (segment) => segment.day === day
      );
      console.log(`  • 第${day}天: 找到${daySegments.length}条路线`);

      for (const segment of daySegments) {
        const routeId = `${segment.day}-${segment.start.lat}-${segment.end.lat}`;
        console.log(`    - 处理路线: ${segment.label} (ID: ${routeId})`);

        // 避免重复渲染
        console.log(`    🔍 检查路线ID是否已渲染: ${routeId}`);
        console.log(
          `    🔍 当前已渲染路线集合:`,
          Array.from(this.renderedRoutes)
        );

        if (!this.renderedRoutes.has(routeId)) {
          console.log(`    ✅ 渲染新路线: ${segment.label}`);
          try {
            const result = await this.mapManager.addCustomRoute(
              segment.start,
              segment.end,
              {
                color: segment.color,
                label: segment.label,
                day: segment.day,
                routeId: routeId,
              }
            );

            console.log(`    🔍 addCustomRoute 返回结果:`, result);

            // 只有在成功渲染后才添加到集合
            if (result === true) {
              this.renderedRoutes.add(routeId);
              console.log(`    ✅ 路线渲染成功并添加到集合: ${segment.label}`);
              console.log(
                `    🔍 更新后的已渲染路线集合:`,
                Array.from(this.renderedRoutes)
              );
            } else {
              console.error(
                `    ❌ 路线渲染失败，返回值: ${result}, 路线: ${segment.label}`
              );
            }
          } catch (error) {
            console.error(`    ❌ 路线渲染失败: ${segment.label}`, error);
          }
        } else {
          console.log(`    ⏭️ 跳过已渲染路线: ${segment.label}`);
          console.log(`    🔍 该路线ID已存在于集合中: ${routeId}`);
        }

        // 添加短暂延迟，让路线绘制更平滑
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    // 更新记录的最后渲染天数
    this.lastRenderedDay = upToDay;
    console.log(`📊 更新 lastRenderedDay 为: ${this.lastRenderedDay}`);
    console.log(`📊 当前已渲染路线数量: ${this.renderedRoutes.size}`);

    // 如果到了最后一天，连接回起点形成环形
    if (
      upToDay === this.tripData.days.length &&
      !this.renderedRoutes.has("return-route")
    ) {
      console.log("🔄 添加返程路线，形成完整环形");
      await this.addReturnRoute();
    }
  }

  // 清除指定天数之后的路线
  async clearRoutesAfterDay(keepUpToDay) {
    console.log(`🧹 清除第${keepUpToDay}天之后的路线`);

    // 清除所有路线（这里可以进一步优化为选择性清除）
    this.mapManager.clearAllRoutes();
    this.renderedRoutes.clear();

    // 重新渲染到指定天数
    this.lastRenderedDay = 0;
    const routeSegments = this.getRouteSegments();

    for (let day = 1; day <= keepUpToDay; day++) {
      const daySegments = routeSegments.filter(
        (segment) => segment.day === day
      );

      for (const segment of daySegments) {
        const routeId = `${segment.day}-${segment.start.lat}-${segment.end.lat}`;

        try {
          const result = await this.mapManager.addCustomRoute(
            segment.start,
            segment.end,
            {
              color: segment.color,
              label: segment.label,
              day: segment.day,
              routeId: routeId,
            }
          );

          // 只有在成功渲染后才添加到集合
          if (result === true) {
            this.renderedRoutes.add(routeId);
            console.log(`🧹 重新渲染路线成功: ${segment.label}`);
          } else {
            console.error(
              `🧹 重新渲染路线失败，返回值: ${result}, 路线: ${segment.label}`
            );
          }
        } catch (error) {
          console.error(`🧹 重新渲染路线失败: ${segment.label}`, error);
        }

        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    this.lastRenderedDay = keepUpToDay;
  }

  // 显示路线构建进度 - 增强版本
  showRouteProgress(currentDay) {
    const progressEl = document.getElementById("route-progress");
    if (!progressEl) return;

    const totalDays = this.tripData.days.length;
    const isComplete = currentDay === totalDays;
    const isIncremental = currentDay > this.lastRenderedDay;
    const isBackward = currentDay < this.lastRenderedDay;

    progressEl.style.display = "flex";
    progressEl.className = `route-progress ${isComplete ? "complete" : ""}`;

    const iconEl = progressEl.querySelector(".route-progress-icon");
    const textEl = progressEl.querySelector(".route-progress-text");

    if (isComplete) {
      iconEl.textContent = "🎯";
      textEl.textContent = "完整环形路线已构建！";

      // 3秒后隐藏
      setTimeout(() => {
        progressEl.style.display = "none";
      }, 3000);
    } else if (isIncremental && this.lastRenderedDay > 0) {
      iconEl.textContent = "➕";
      textEl.textContent = `增量添加第${
        this.lastRenderedDay + 1
      }-${currentDay}天路线 (${currentDay}/${totalDays})`;

      // 2秒后隐藏
      setTimeout(() => {
        progressEl.style.display = "none";
      }, 2000);
    } else if (isBackward) {
      iconEl.textContent = "⬅️";
      textEl.textContent = `回退到第${currentDay}天 (${currentDay}/${totalDays})`;

      // 2秒后隐藏
      setTimeout(() => {
        progressEl.style.display = "none";
      }, 2000);
    } else {
      iconEl.textContent = "🛣️";
      textEl.textContent = `路线构建中... (${currentDay}/${totalDays} 天)`;

      // 1.5秒后隐藏
      setTimeout(() => {
        progressEl.style.display = "none";
      }, 1500);
    }
  }

  // 更新时间轴进度样式
  updateTimelineProgress(currentDay) {
    const dayItems = document.querySelectorAll(".day-item");

    dayItems.forEach((item, index) => {
      const day = index + 1;
      item.classList.remove("building-route", "route-complete");

      if (day < currentDay) {
        item.classList.add("route-complete");
      } else if (day === currentDay) {
        item.classList.add("building-route");
      }
    });
  }

  // 获取所有路线段定义
  getRouteSegments() {
    return [
      // D1: 关西机场 → 和歌山
      {
        day: 1,
        start: { lat: 34.4347, lng: 135.2441 }, // 关西机场
        end: { lat: 34.2307, lng: 135.1733 }, // DAIWA ROYNET HOTEL WAKAYAMA CASTLE
        color: "#e74c3c",
        label: "D1: 关西机场 → 和歌山酒店",
      },
      // D2: 和歌山 → 小玉列车 → 白滨 → Fukuro住宿
      {
        day: 2,
        start: { lat: 34.2307, lng: 135.1733 }, // 和歌山酒店
        end: { lat: 34.2133, lng: 135.3167 }, // 贵志站(小玉站长)
        color: "#3498db",
        label: "D2: 和歌山 → 贵志站(小玉列车)",
      },
      {
        day: 2,
        start: { lat: 34.2307, lng: 135.1733 }, // Hotel
        end: { lat: 33.6917, lng: 135.3361 }, // 白滨
        color: "#3498db",
        label: "D2: 贵志站 → 酒店取车 → 白滨温泉游览",
      },
      {
        day: 2,
        start: { lat: 33.6917, lng: 135.3361 }, // 白滨
        end: { lat: 33.4559, lng: 135.7757 }, // Fukuro住宿地
        color: "#3498db",
        label: "D2: 白滨 → Fukuro住宿",
      },
      // D3: Fukuro → 串本 → 熊野 → 纪伊胜浦
      {
        day: 3,
        start: { lat: 33.4559, lng: 135.7757 }, // Fukuro住宿地
        end: { lat: 33.4708, lng: 135.7881 }, // 串本桥杭岩
        color: "#f39c12",
        label: "D3: Fukuro → 串本(本州最南端)",
      },
      {
        day: 3,
        start: { lat: 33.4708, lng: 135.7881 }, // 串本
        end: { lat: 33.6685, lng: 135.9034 }, // 熊野古道（大门板）
        color: "#f39c12",
        label: "D3: 串本 → 熊野古道（大门板）",
      },
      {
        day: 3,
        start: { lat: 33.6685, lng: 135.9034 }, // 熊野古道(那智大社+瀑布)
        end: { lat: 33.6276, lng: 135.9524 }, // 浦岛温泉(纪伊胜浦)
        color: "#f39c12",
        label: "D3: 熊野古道(那智大社+瀑布) → 浦岛温泉(纪伊胜浦)",
      },
      // D4: 纪伊胜浦 → 孤独鸟居 → 京都
      {
        day: 4,
        start: { lat: 33.6276, lng: 135.9524 }, // 浦岛温泉(纪伊胜浦)
        // 33.6351594067096, 135.95028092279622
        end: { lat: 33.6352, lng: 135.9503 }, // 孤独鸟居
        color: "#9b59b6",
        label: "D4: 纪伊胜浦 → 孤独鸟居+金枪鱼市场",
      },
      {
        day: 4,
        start: { lat: 33.6352, lng: 135.9503 }, // 孤独鸟居
        end: { lat: 35.0124, lng: 135.7493 }, // 京都
        color: "#9b59b6",
        label: "D4: 孤独鸟居 → 京都(长距离)",
      },
      // D5: 京都 → 大原三千院 → 贵船
      {
        day: 5,
        start: { lat: 35.0115, lng: 135.7478 }, // Minn 二条城京町家
        end: { lat: 35.12, lng: 135.7667 }, // 大原三千院
        color: "#27ae60",
        label: "D5: 京都 → 大原三千院",
      },
      {
        day: 5,
        start: { lat: 35.12, lng: 135.7667 }, // 三千院
        end: { lat: 35.1331, lng: 135.7644 }, // 贵船神社
        color: "#27ae60",
        label: "D5: 三千院 → 贵船神社",
      },
      {
        day: 5,
        start: { lat: 35.1331, lng: 135.7644 }, // 贵船
        end: { lat: 35.0115, lng: 135.7478 }, // 返回京都
        color: "#27ae60",
        label: "D5: 贵船 → 返回京都",
      },
      // D6: 京都 → 岚山一日游
      {
        day: 6,
        start: { lat: 35.0115, lng: 135.7478 }, // Minn 二条城京町家
        end: { lat: 35.0169, lng: 135.6762 }, // 岚山竹林
        color: "#16a085",
        label: "D6: 京都 → 岚山",
      },
      {
        day: 6,
        start: { lat: 35.0169, lng: 135.6762 }, // 岚山
        end: { lat: 35.0115, lng: 135.7478 }, // 返回京都
        color: "#16a085",
        label: "D6: 岚山 → 返回京都",
      },
      // D7: 京都 → 清水寺 → 伏见稻荷 → 大阪
      {
        day: 7,
        start: { lat: 35.0115, lng: 135.7478 }, // Minn 二条城京町家
        end: { lat: 34.9949, lng: 135.785 }, // 清水寺
        color: "#c0392b",
        label: "D7: 京都 → 清水寺",
      },
      {
        day: 7,
        start: { lat: 34.9949, lng: 135.785 }, // 清水寺
        end: { lat: 34.9671, lng: 135.7727 }, // 伏见稻荷大社
        color: "#c0392b",
        label: "D7: 清水寺 → 伏见稻荷",
      },
      {
        day: 7,
        start: { lat: 34.9671, lng: 135.7727 }, // 伏见稻荷
        end: { lat: 34.6560, lng: 135.5060 }, // 大阪难波酒店
        color: "#c0392b",
        label: "D7: 伏见稻荷 → 大阪酒店check-in",
      },
      {
        day: 7,
        start: { lat: 34.6560, lng: 135.5060 }, // 大阪酒店
        end: { lat: 34.4347, lng: 135.2441 }, // 关西机场(还车)
        color: "#c0392b",
        label: "D7: 大阪酒店 → 关西机场(还车)",
      },
      {
        day: 7,
        start: { lat: 34.4347, lng: 135.2441 }, // 关西机场
        end: { lat: 34.6560, lng: 135.5060 }, // 大阪难波
        color: "#c0392b",
        label: "D7: 关西机场 → 大阪难波",
      },
      // D8: 大阪 → 环球影城
      {
        day: 8,
        start: { lat: 34.6560, lng: 135.5060 }, // 大阪难波
        end: { lat: 34.6653, lng: 135.4322 }, // 环球影城
        color: "#8e44ad",
        label: "D8: 难波 → 环球影城",
      },
      {
        day: 8,
        start: { lat: 34.6653, lng: 135.4322 }, // 环球影城
        end: { lat: 34.6560, lng: 135.5060 }, // 返回难波
        color: "#8e44ad",
        label: "D8: 环球影城 → 返回难波",
      },
      // D9: 大阪 → 世博会
      {
        day: 9,
        start: { lat: 34.6560, lng: 135.5060 }, // 大阪难波
        end: { lat: 34.65, lng: 135.4167 }, // 2025世博会
        color: "#2980b9",
        label: "D9: 难波 → 2025世博会",
      },
      {
        day: 9,
        start: { lat: 34.65, lng: 135.4167 }, // 世博会
        end: { lat: 34.6560, lng: 135.5060 }, // 返回难波
        color: "#2980b9",
        label: "D9: 世博会 → 返回难波",
      },
      // D10: 大阪城 → 机场
      {
        day: 10,
        start: { lat: 34.6560, lng: 135.5060 }, // 大阪难波
        end: { lat: 34.6873, lng: 135.5262 }, // 大阪城
        color: "#d35400",
        label: "D10: 难波 → 大阪城",
      },
      {
        day: 10,
        start: { lat: 34.6873, lng: 135.5262 }, // 大阪城
        end: { lat: 34.6638, lng: 135.5048 }, // 黑门市场
        color: "#d35400",
        label: "D10: 大阪城 → 黑门市场",
      },
    ];
  }

  // 添加返程路线，形成环形
  async addReturnRoute() {
    const returnRouteId = "return-route";
    if (this.renderedRoutes.has(returnRouteId)) {
      return; // 已经添加过返程路线
    }

    const result = await this.mapManager.addCustomRoute(
      { lat: 34.6638, lng: 135.5048 }, // 黑门市场
      { lat: 34.4347, lng: 135.2441 }, // 关西机场
      {
        color: "#34495e",
        label: "D10: 黑门市场 → 关西机场(返程)",
        strokeWeight: 5,
        strokeOpacity: 0.9,
        routeId: returnRouteId,
      }
    );

    if (result === true) {
      this.renderedRoutes.add(returnRouteId);
      console.log("🎯 完整的10天环形路线已构建完成！");
      this.showCompletionMessage();
    } else {
      console.error("❌ 返程路线添加失败");
    }
  }

  // 显示完成提示
  showCompletionMessage() {
    const messageHtml = `
            <div class="completion-message" style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: white;
                padding: 30px 40px;
                border-radius: 20px;
                box-shadow: 0 8px 30px rgba(102,126,234,0.4);
                z-index: 10000;
                text-align: center;
                max-width: 400px;
            ">
                <div style="font-size: 3em; margin-bottom: 15px;">🎉</div>
                <h3 style="margin: 0 0 15px 0; font-size: 1.4em;">完整路线已构建！</h3>
                <p style="margin: 0 0 20px 0; opacity: 0.9; line-height: 1.5;">
                    恭喜！你的10天关西之旅路线图已完成。<br>
                    从关西机场出发，最终回到关西机场，<br>
                    形成了一个完美的环形路线。
                </p>
                <button onclick="this.parentElement.remove()" style="
                    background: rgba(255,255,255,0.2);
                    border: 2px solid rgba(255,255,255,0.5);
                    color: white;
                    padding: 10px 20px;
                    border-radius: 10px;
                    cursor: pointer;
                    font-size: 1em;
                ">完美！</button>
            </div>
        `;

    document.body.insertAdjacentHTML("beforeend", messageHtml);

    // 5秒后自动移除
    setTimeout(() => {
      const messageEl = document.querySelector(".completion-message");
      if (messageEl) messageEl.remove();
    }, 5000);
  }

  setFilter(type) {
    this.filterType = type;

    if (this.timeline) {
      this.timeline.setFilter(type);
    }

    if (this.mapManager) {
      this.mapManager.setFilter(type);
    }
  }

  highlightActivity(day, activityIndex) {
    if (this.timeline) {
      this.timeline.highlightActivity(day, activityIndex);
    }

    this.showDay(day);
  }

  updateStats(day) {
    const dayData = this.tripData.days.find((d) => d.day === day);
    if (!dayData) return;

    const stats = this.calculateDayStats(dayData);
    this.renderStats(stats);
  }

  calculateDayStats(dayData) {
    const activities = dayData.activities || [];

    return {
      totalActivities: activities.length,
      totalDistance: this.calculateDistance(activities),
      transportCount: activities.filter((a) => a.type === "transport").length,
      sightseeingCount: activities.filter((a) => a.type === "sightseeing")
        .length,
      estimatedTime: this.calculateEstimatedTime(activities),
    };
  }

  calculateDistance(activities) {
    // 简化的距离计算，实际项目中可以使用Google Maps Distance Matrix API
    let totalDistance = 0;
    for (let i = 1; i < activities.length; i++) {
      if (activities[i].location && activities[i - 1].location) {
        const dist = this.getDistanceBetweenPoints(
          activities[i - 1].location,
          activities[i].location
        );
        totalDistance += dist;
      }
    }
    return Math.round(totalDistance);
  }

  getDistanceBetweenPoints(point1, point2) {
    const R = 6371; // 地球半径（公里）
    const dLat = this.toRad(point2.lat - point1.lat);
    const dLon = this.toRad(point2.lng - point1.lng);
    const lat1 = this.toRad(point1.lat);
    const lat2 = this.toRad(point2.lat);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRad(value) {
    return (value * Math.PI) / 180;
  }

  calculateEstimatedTime(activities) {
    // 根据活动类型估算时间
    return activities.reduce((total, activity) => {
      switch (activity.type) {
        case "sightseeing":
          return total + 120; // 2小时
        case "transport":
          return total + 30; // 30分钟
        case "food":
          return total + 60; // 1小时
        default:
          return total + 30;
      }
    }, 0);
  }

  renderStats(stats) {
    const statsContainer = document.querySelector(".route-stats");
    if (!statsContainer) return;

    statsContainer.innerHTML = `
            <h4>今日统计</h4>
            <div class="stat-item">
                <span class="stat-label">活动数量</span>
                <span class="stat-value">${stats.totalActivities}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">预计距离</span>
                <span class="stat-value">${stats.totalDistance}km</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">景点参观</span>
                <span class="stat-value">${stats.sightseeingCount}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">预计用时</span>
                <span class="stat-value">${Math.round(
                  stats.estimatedTime / 60
                )}h</span>
            </div>
        `;
  }

  showMapPlaceholder(title = "地图加载中...", message = "请确保网络连接正常") {
    const mapContainer =
      document.querySelector("#map") ||
      document.querySelector(".map-container");
    if (!mapContainer) return;

    const config = window.MAPS_CONFIG || {};
    const keyStatus = GoogleMapsLoader.getApiKeyStatus(config);

    let suggestionHtml = "";
    if (!keyStatus.valid) {
      suggestionHtml = `
                <div style="margin-top: 15px; padding: 10px; background: rgba(255,107,107,0.1); border-radius: 8px; border-left: 3px solid #ff6b6b;">
                    <strong>配置说明：</strong><br>
                    ${keyStatus.suggestion}
                </div>
            `;
    }

    mapContainer.innerHTML = `
            <div class="map-placeholder">
                <div class="placeholder-content">
                    <div class="placeholder-icon">🗺️</div>
                    <div class="placeholder-title">${title}</div>
                    <div class="placeholder-description">
                        ${message}
                        ${suggestionHtml}
                    </div>
                </div>
            </div>
        `;
  }

  showWarning(message, suggestion) {
    const warningHtml = `
            <div class="warning-message" style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #f9ca24, #f0932b);
                color: white;
                padding: 15px 20px;
                border-radius: 10px;
                box-shadow: 0 4px 15px rgba(249,202,36,0.3);
                z-index: 10000;
                max-width: 350px;
                font-size: 0.9em;
            ">
                <div style="font-weight: 600; margin-bottom: 5px;">⚠️ 配置提醒</div>
                <div style="margin-bottom: 8px;">${message}</div>
                <div style="font-size: 0.85em; opacity: 0.9;">${suggestion}</div>
                <button onclick="this.parentElement.remove()" style="
                    background: none;
                    border: none;
                    color: white;
                    float: right;
                    font-size: 18px;
                    cursor: pointer;
                    margin-top: -5px;
                ">×</button>
            </div>
        `;

    document.body.insertAdjacentHTML("beforeend", warningHtml);

    // 8秒后自动移除
    setTimeout(() => {
      const warningEl = document.querySelector(".warning-message");
      if (warningEl) warningEl.remove();
    }, 8000);
  }

  showError(message) {
    const errorHtml = `
            <div class="error-message" style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: #ff6b6b;
                color: white;
                padding: 15px 20px;
                border-radius: 10px;
                box-shadow: 0 4px 15px rgba(255,107,107,0.3);
                z-index: 10000;
                max-width: 300px;
            ">
                ${message}
                <button onclick="this.parentElement.remove()" style="
                    background: none;
                    border: none;
                    color: white;
                    float: right;
                    font-size: 18px;
                    cursor: pointer;
                    margin-left: 10px;
                ">×</button>
            </div>
        `;

    document.body.insertAdjacentHTML("beforeend", errorHtml);

    // 3秒后自动移除
    setTimeout(() => {
      const errorEl = document.querySelector(".error-message");
      if (errorEl) errorEl.remove();
    }, 3000);
  }

  toggleFullscreen() {
    const mapContainer = document.querySelector(".map-container");
    if (!mapContainer) return;

    if (!document.fullscreenElement) {
      mapContainer.requestFullscreen().catch((err) => {
        console.error("Failed to enter fullscreen:", err);
      });
    } else {
      document.exitFullscreen();
    }
  }

  getFallbackData() {
    // 提供默认数据，确保应用能正常运行
    return {
      tripInfo: {
        title: "关西之旅",
        dates: "2024-08-22 至 2024-08-31",
        duration: "10天9晚",
        cities: ["大阪", "和歌山", "白滨", "京都"],
      },
      days: [
        {
          day: 1,
          date: "2024-08-22",
          title: "抵达日",
          weather: "☀️",
          activities: [
            {
              time: "14:56",
              type: "transport",
              description: "抵达关西机场",
              location: { lat: 34.4347, lng: 135.2441 },
              icon: "✈️",
            },
            {
              time: "17:00",
              type: "transport",
              description: "机场取车",
              location: { lat: 34.4347, lng: 135.2441 },
              icon: "🚗",
            },
          ],
          accommodation: {
            name: "DAIWA ROYNET HOTEL WAKAYAMA CASTLE",
            location: { lat: 34.2307, lng: 135.1733 },
          },
        },
        // 可以添加更多天的数据
      ],
    };
  }

  initMapControls() {
    const toggleButton = document.getElementById("toggle-detail");
    const modeDescription = document.getElementById("mode-description");

    if (toggleButton && this.mapManager) {
      toggleButton.addEventListener("click", () => {
        const isDetailed = this.mapManager.toggleDetailLevel();
        toggleButton.textContent = isDetailed ? "显示主要城市" : "显示详细标记";
        modeDescription.textContent = isDetailed
          ? "显示所有活动详情"
          : "显示5个主要停留地点";
      });
    }

    // 智能路线控制函数
    window.clearRoutes = () => {
      if (this.mapManager) {
        console.log("🧹 清除所有路线");
        this.mapManager.clearAllRoutes();
        this.renderedRoutes.clear();
        this.lastRenderedDay = 0;
        this.updateTimelineProgress(0);
        return true;
      }
      return false;
    };

    // 快速测试功能 - 显示到指定天的路线（智能增量）
    window.showRoutesToDay = (day) => {
      if (day < 1 || day > this.tripData.days.length) {
        console.warn(
          `⚠️ 无效天数: ${day}，应该在1-${this.tripData.days.length}之间`
        );
        return false;
      }
      console.log(`🛣️ 智能显示到第${day}天的累积路线`);
      this.currentDay = day;
      this.addProgressiveRoutes(day);
      return true;
    };

    // 向前一天
    window.nextDay = () => {
      const nextDay = this.currentDay + 1;
      if (nextDay <= this.tripData.days.length) {
        console.log(`➡️ 前进到第${nextDay}天`);
        this.showDay(nextDay);
        return true;
      } else {
        console.log("🏁 已经是最后一天了");
        return false;
      }
    };

    // 向后一天
    window.prevDay = () => {
      const prevDay = this.currentDay - 1;
      if (prevDay >= 1) {
        console.log(`⬅️ 返回到第${prevDay}天`);
        this.showDay(prevDay);
        return true;
      } else {
        console.log("🚩 已经是第一天了");
        return false;
      }
    };

    // 重置到起始状态
    window.resetToDay1 = () => {
      console.log("🔄 重置到第1天");
      this.showDay(1);
      return true;
    };

    // 跳转到最后一天（完整路线）
    window.showCompleteRoute = () => {
      console.log("🎯 显示完整的10天路线");
      this.showDay(this.tripData.days.length);
      return true;
    };

    // 获取当前状态信息
    window.getRouteStatus = () => {
      const status = {
        currentDay: this.currentDay,
        lastRenderedDay: this.lastRenderedDay,
        totalDays: this.tripData.days.length,
        renderedRoutesCount: this.renderedRoutes.size,
        renderedRoutes: Array.from(this.renderedRoutes),
      };
      console.log("📊 当前路线状态:", status);
      return status;
    };

    console.log("🎮 智能渐进式路线控制功能已准备就绪");
    console.log("使用方法:");
    console.log("  • 点击时间轴上的天数来逐步构建路线（智能增量）");
    console.log("  • showRoutesToDay(5) - 智能显示到第5天的路线");
    console.log("  • nextDay() - 前进一天");
    console.log("  • prevDay() - 后退一天");
    console.log("  • showCompleteRoute() - 显示完整路线");
    console.log("  • clearRoutes() - 清除所有路线");
    console.log("  • resetToDay1() - 重置到第1天");
    console.log("  • getRouteStatus() - 查看当前状态");
  }
}

// 当DOM加载完成后初始化应用
document.addEventListener("DOMContentLoaded", () => {
  window.travelApp = new TravelApp();
});

// 导出给其他模块使用
if (typeof module !== "undefined" && module.exports) {
  module.exports = TravelApp;
}
