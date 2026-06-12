(function () {
  "use strict";

  class GalleryTransformer {
    constructor() {
      this.originalContainer = null;
      this.parentContainer = null;
      this.galleryContainer = null;
      this.observer = null;
      this.button = null;
      this.isProcessing = false;
      this.currentHighlightedElement = null;
      this.isSearching = false;
      this.debugMode = false;

      // Свойства для секундомера
      this.stopwatchInterval = null;
      this.stopwatchStartTime = null;
      this.stopwatchElement = null;
      this.stopwatchContainer = null;
      this.isRendering = false;
      this.lastRenderText = "";
      this.renderObserver = null;

      // Свойства для overlay функционала
      this.overlayActive = false;
      this.overlayElement = null;
      this.overlayControlsContainer = null;
      this.debugSwitch = null;
      this.overlaySwitch = null;
      this.rulerSwitch = null;
      this.gridSwitch = null;
      this.canvasContainerRef = null;
      this.sortElement = null;

      // Свойства для ruler и grid
      this.rulerActive = false;
      this.gridActive = false;
      this.rulerElement = null;
      this.gridElement = null;

      // Флаг для анимации
      this.isAnimating = false;
    }

    // Универсальный метод для логирования
    log(...args) {
      if (this.debugMode) {
        console.log("[Zolak Gallery]:", ...args);
      }
    }

    error(...args) {
      console.error("[Zolak Gallery]:", ...args);
    }

    init() {
      this.log("Инициализация...");
      this.log("URL страницы:", window.location.href);

      try {
        const hostname = window.location.hostname;
        const fullUrl = window.location.href;

        const isValidDomain =
          hostname.includes("dev.admin.zolak.tech") ||
          hostname.includes("eu.admin.zolak.tech") ||
          hostname.includes("admin.zolak.tech") ||
          hostname.includes("dev.studio.zolak.tech") ||
          hostname.includes("eu.studio.zolak.tech");
        if (!isValidDomain) {
          this.log(
            "Не тот домен, расширение не должно было запуститься:",
            hostname,
          );
          return;
        }

        if (
          (hostname.includes("dev.studio.zolak.tech") ||
            hostname.includes("eu.studio.zolak.tech")) &&
          (fullUrl.includes("/studios/") || fullUrl.includes("/scenes/"))
        ) {
          this.log("Запуск секундомера для studios");
          this.observeRenderDialog();
        }

        if (
          fullUrl.includes("/studios/") &&
          (hostname.includes("dev.studio.zolak.tech") ||
            hostname.includes("eu.studio.zolak.tech"))
        ) {
          this.log(
            "Обнаружена страница studio, добавляем контролы Overlay и Debug",
          );
          this.createOverlayControls();
        }

        this.findOriginalContainer();
        this.observeDOMChanges();
        this.log("Инициализация завершена");
      } catch (error) {
        this.error("Ошибка инициализации", error);
      }
    }

    createOverlayControls() {
      this.log("Создание контролов Overlay и Debug");

      const checkInterval = setInterval(() => {
        const sortElement = document.querySelector('[class*="jss18"]');
        if (sortElement) {
          clearInterval(checkInterval);
          this.sortElement = sortElement;
          this.injectBaseControls(sortElement);
        }
      }, 500);

      const observer = new MutationObserver(() => {
        if (!this.overlayControlsContainer) {
          const sortElement = document.querySelector('[class*="jss18"]');
          if (sortElement) {
            this.sortElement = sortElement;
            this.injectBaseControls(sortElement);
          }
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    // Внедрение только базовых контролов (Debug и Overlay)
    injectBaseControls(sortElement) {
      if (this.overlayControlsContainer) return;

      this.log("Найден элемент сортировки, внедряем базовые контролы");

      this.overlayControlsContainer = document.createElement("div");
      this.overlayControlsContainer.className = "zolak-overlay-controls";
      this.overlayControlsContainer.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        margin-right: 16px;
      `;

      this.debugSwitch = this.createSwitchButton("Debug", this.debugMode);
      this.debugSwitch.addEventListener("click", () => {
        this.toggleDebug();
        this.updateSwitchState(this.debugSwitch, this.debugMode);
      });

      this.overlaySwitch = this.createSwitchButton("Overlay", false);
      this.overlaySwitch.addEventListener("click", () => {
        this.toggleOverlay();
        this.updateSwitchState(this.overlaySwitch, this.overlayActive);
        this.updateAdditionalControlsVisibility();
      });

      this.overlayControlsContainer.appendChild(this.debugSwitch);
      this.overlayControlsContainer.appendChild(this.overlaySwitch);

      sortElement.parentNode.insertBefore(
        this.overlayControlsContainer,
        sortElement,
      );

      this.log("Базовые контролы успешно внедрены");
    }

    // Обновление видимости дополнительных контролов (Ruler и Grid) с анимацией
    updateAdditionalControlsVisibility() {
      if (!this.overlayControlsContainer) return;

      if (this.overlayActive) {
        if (!this.rulerSwitch && !this.gridSwitch && !this.isAnimating) {
          this.log(
            "Overlay включен, добавляем контролы Ruler и Grid с анимацией",
          );

          // Создаем кнопки с начальным состоянием для анимации
          this.rulerSwitch = this.createSwitchButton("Ruler", false);
          this.rulerSwitch.style.opacity = "0";
          this.rulerSwitch.style.transform = "scale(0.8)";
          this.rulerSwitch.style.transition =
            "opacity 0.2s ease, transform 0.2s ease";

          this.gridSwitch = this.createSwitchButton("Grid", false);
          this.gridSwitch.style.opacity = "0";
          this.gridSwitch.style.transform = "scale(0.8)";
          this.gridSwitch.style.transition =
            "opacity 0.2s ease, transform 0.2s ease";

          this.rulerSwitch.addEventListener("click", () => {
            this.toggleRuler();
            this.updateSwitchState(this.rulerSwitch, this.rulerActive);
          });

          this.gridSwitch.addEventListener("click", () => {
            this.toggleGrid();
            this.updateSwitchState(this.gridSwitch, this.gridActive);
          });

          this.overlayControlsContainer.appendChild(this.rulerSwitch);
          this.overlayControlsContainer.appendChild(this.gridSwitch);

          // Запускаем анимацию появления
          requestAnimationFrame(() => {
            if (this.rulerSwitch) {
              this.rulerSwitch.style.opacity = "1";
              this.rulerSwitch.style.transform = "scale(1)";
            }
            if (this.gridSwitch) {
              this.gridSwitch.style.opacity = "1";
              this.gridSwitch.style.transform = "scale(1)";
            }
          });

          this.log("Контролы Ruler и Grid добавлены с анимацией появления");
        }
      } else {
        if ((this.rulerSwitch || this.gridSwitch) && !this.isAnimating) {
          this.log(
            "Overlay выключен, удаляем контролы Ruler и Grid с анимацией",
          );
          this.isAnimating = true;

          // Анимация исчезновения
          if (this.rulerSwitch) {
            this.rulerSwitch.style.opacity = "0";
            this.rulerSwitch.style.transform = "scale(0.8)";
          }
          if (this.gridSwitch) {
            this.gridSwitch.style.opacity = "0";
            this.gridSwitch.style.transform = "scale(0.8)";
          }

          // Удаляем после завершения анимации
          setTimeout(() => {
            if (this.rulerSwitch) {
              this.rulerSwitch.remove();
              this.rulerSwitch = null;
            }
            if (this.gridSwitch) {
              this.gridSwitch.remove();
              this.gridSwitch = null;
            }
            this.isAnimating = false;
            this.log("Контролы Ruler и Grid удалены после анимации");
          }, 200);
        }
      }
    }

    createSwitchButton(text, isActive) {
      const button = document.createElement("button");
      button.className = `zolak-switch-button ${isActive ? "active" : ""}`;
      button.setAttribute("data-state", isActive ? "on" : "off");
      button.innerHTML = `
        <span class="zolak-switch-label">${text}</span>
        <span class="zolak-switch-slider">
          <span class="zolak-switch-knob"></span>
        </span>
      `;

      return button;
    }

    updateSwitchState(button, isActive) {
      if (!button) return;

      button.classList.toggle("active", isActive);
      button.setAttribute("data-state", isActive ? "on" : "off");
    }

    toggleOverlay() {
      this.overlayActive = !this.overlayActive;
      this.log(`Overlay режим: ${this.overlayActive ? "включен" : "выключен"}`);

      if (this.overlayActive) {
        this.createOverlay();
      } else {
        this.removeOverlay();
        this.removeRuler();
        this.removeGrid();

        if (this.rulerActive) {
          this.rulerActive = false;
          if (this.rulerSwitch) {
            this.updateSwitchState(this.rulerSwitch, false);
          }
        }
        if (this.gridActive) {
          this.gridActive = false;
          if (this.gridSwitch) {
            this.updateSwitchState(this.gridSwitch, false);
          }
        }
      }
    }

    toggleRuler() {
      if (!this.overlayActive) {
        this.log("Ruler не может быть включен: Overlay выключен");
        return;
      }

      if (!this.rulerActive && this.gridActive) {
        this.toggleGrid();
        if (this.gridSwitch) {
          this.updateSwitchState(this.gridSwitch, false);
        }
      }

      this.rulerActive = !this.rulerActive;
      this.log(`Ruler режим: ${this.rulerActive ? "включен" : "выключен"}`);

      if (this.rulerActive) {
        this.createRuler();
      } else {
        this.removeRuler();
      }
    }

    toggleGrid() {
      if (!this.overlayActive) {
        this.log("Grid не может быть включен: Overlay выключен");
        return;
      }

      if (!this.gridActive && this.rulerActive) {
        this.toggleRuler();
        if (this.rulerSwitch) {
          this.updateSwitchState(this.rulerSwitch, false);
        }
      }

      this.gridActive = !this.gridActive;
      this.log(`Grid режим: ${this.gridActive ? "включен" : "выключен"}`);

      if (this.gridActive) {
        this.createGrid();
      } else {
        this.removeGrid();
      }
    }

    createRuler() {
      this.log("Создание ruler элемента");

      if (!this.overlayElement) {
        this.error("Overlay элемент не найден для создания ruler");
        return;
      }

      this.removeRuler();

      this.rulerElement = document.createElement("canvas");
      this.rulerElement.className = "zolak-ruler-canvas";
      this.rulerElement.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1001;
        opacity: 0;
        transition: opacity 0.15s ease;
      `;

      const width = this.overlayElement.clientWidth;
      const height = this.overlayElement.clientHeight;
      this.rulerElement.width = width;
      this.rulerElement.height = height;

      this.overlayElement.appendChild(this.rulerElement);
      this.drawRuler();

      // Анимация появления
      requestAnimationFrame(() => {
        if (this.rulerElement) {
          this.rulerElement.style.opacity = "1";
        }
      });

      this.log("Ruler элемент создан с анимацией появления");
    }

    drawRuler() {
      if (!this.rulerElement) return;

      const canvas = this.rulerElement;
      const ctx = canvas.getContext("2d");
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      ctx.strokeStyle = "#ff6b6b";
      ctx.fillStyle = "#ff6b6b";
      ctx.lineWidth = 1;

      // Центральные оси
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.beginPath();
      ctx.moveTo(centerX, 0);
      ctx.lineTo(centerX, height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();

      // Рисуем деления по горизонтали (от центра влево и вправо)
      // Максимальное расстояние от центра до края
      const maxXOffset = Math.max(centerX, width - centerX);

      // Рисуем деления влево от центра (отрицательные координаты)
      for (let offset = 0; offset <= maxXOffset; offset += 10) {
        if (offset === 0) continue; // Пропускаем центр, там уже есть ось

        const xLeft = centerX - offset;
        const xRight = centerX + offset;

        // Определяем высоту линии в зависимости от кратности
        let lineHeight = 8;
        if (offset % 10 === 0) {
          if (offset % 50 === 0) {
            lineHeight = 24;
          } else if (offset % 20 === 0) {
            lineHeight = 12;
          } else {
            lineHeight = 8;
          }
        }

        // Деление слева
        if (xLeft >= 0) {
          ctx.beginPath();
          ctx.moveTo(xLeft, centerY - lineHeight / 2);
          ctx.lineTo(xLeft, centerY + lineHeight / 2);
          ctx.stroke();
        }

        // Деление справа
        if (xRight <= width) {
          ctx.beginPath();
          ctx.moveTo(xRight, centerY - lineHeight / 2);
          ctx.lineTo(xRight, centerY + lineHeight / 2);
          ctx.stroke();
        }
      }

      // Рисуем деления по вертикали (от центра вверх и вниз)
      const maxYOffset = Math.max(centerY, height - centerY);

      for (let offset = 0; offset <= maxYOffset; offset += 10) {
        if (offset === 0) continue; // Пропускаем центр, там уже есть ось

        const yTop = centerY - offset;
        const yBottom = centerY + offset;

        // Определяем ширину линии в зависимости от кратности
        let lineWidth = 8;
        if (offset % 10 === 0) {
          if (offset % 50 === 0) {
            lineWidth = 24;
          } else if (offset % 20 === 0) {
            lineWidth = 12;
          } else {
            lineWidth = 8;
          }
        }

        // Деление сверху
        if (yTop >= 0) {
          ctx.beginPath();
          ctx.moveTo(centerX - lineWidth / 2, yTop);
          ctx.lineTo(centerX + lineWidth / 2, yTop);
          ctx.stroke();
        }

        // Деление снизу
        if (yBottom <= height) {
          ctx.beginPath();
          ctx.moveTo(centerX - lineWidth / 2, yBottom);
          ctx.lineTo(centerX + lineWidth / 2, yBottom);
          ctx.stroke();
        }
      }

      //Никаких подписей!

      this.log(
        "Ruler отрисован относительно центра, размеры: " + width + "x" + height,
      );
    }

    removeRuler() {
      if (this.rulerElement) {
        // Анимация исчезновения
        this.rulerElement.style.opacity = "0";
        setTimeout(() => {
          if (this.rulerElement) {
            this.rulerElement.remove();
            this.rulerElement = null;
          }
        }, 150);
        this.log("Ruler удален с анимацией исчезновения");
      }
    }

    createGrid() {
      this.log("Создание grid элемента");

      if (!this.overlayElement) {
        this.error("Overlay элемент не найден для создания grid");
        return;
      }

      this.removeGrid();

      this.gridElement = document.createElement("canvas");
      this.gridElement.className = "zolak-grid-canvas";
      this.gridElement.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1001;
        opacity: 0;
        transition: opacity 0.15s ease;
      `;

      const width = this.overlayElement.clientWidth;
      const height = this.overlayElement.clientHeight;
      this.gridElement.width = width;
      this.gridElement.height = height;

      this.overlayElement.appendChild(this.gridElement);
      this.drawGrid();

      // Анимация появления
      requestAnimationFrame(() => {
        if (this.gridElement) {
          this.gridElement.style.opacity = "1";
        }
      });

      this.log("Grid элемент создан с анимацией появления");
    }

    drawGrid() {
      if (!this.gridElement) return;

      const canvas = this.gridElement;
      const ctx = canvas.getContext("2d");
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      ctx.strokeStyle = "rgba(100, 200, 255, 0.4)";
      ctx.lineWidth = 0.5;

      for (let x = 0; x <= width; x += 5) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      for (let y = 0; y <= height; y += 5) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      ctx.strokeStyle = "rgba(100, 200, 255, 0.7)";
      ctx.lineWidth = 1;

      for (let x = 0; x <= width; x += 25) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      for (let y = 0; y <= height; y += 25) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      this.log(
        "Grid отрисован, размеры: " + width + "x" + height + ", шаг 5px",
      );
    }

    removeGrid() {
      if (this.gridElement) {
        // Анимация исчезновения
        this.gridElement.style.opacity = "0";
        setTimeout(() => {
          if (this.gridElement) {
            this.gridElement.remove();
            this.gridElement = null;
          }
        }, 150);
        this.log("Grid удален с анимацией исчезновения");
      }
    }

    findCanvasContainer() {
      this.log("Поиск canvas контейнера...");

      const canvasElements = document.querySelectorAll(
        'canvas[data-engine="three.js r164"]',
      );
      for (const canvas of canvasElements) {
        let parent = canvas.parentElement;
        while (parent) {
          const style = window.getComputedStyle(parent);
          if (style.position === "relative" || style.position === "absolute") {
            const rect = parent.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              this.log(
                `Найден canvas контейнер (способ 1): ${parent.className}, размер: ${rect.width}x${rect.height}`,
              );
              return parent;
            }
          }
          parent = parent.parentElement;
          if (parent === document.body) break;
        }
      }

      const allDivs = document.querySelectorAll("div");
      for (const div of allDivs) {
        const style = window.getComputedStyle(div);
        if (style.position === "relative" || style.position === "absolute") {
          const canvas = div.querySelector(
            'canvas[data-engine="three.js r164"]',
          );
          if (canvas) {
            const rect = div.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              this.log(
                `Найден canvas контейнер (способ 2): ${div.className}, размер: ${rect.width}x${rect.height}`,
              );
              return div;
            }
          }
        }
      }

      const jssContainers = document.querySelectorAll('[class*="jss"]');
      for (const container of jssContainers) {
        const canvas = container.querySelector(
          'canvas[data-engine="three.js r164"]',
        );
        if (canvas) {
          const rect = container.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            this.log(
              `Найден canvas контейнер (способ 3): ${container.className}, размер: ${rect.width}x${rect.height}`,
            );
            return container;
          }
        }
      }

      this.log("Canvas контейнер не найден ни одним из способов");
      return null;
    }

    createOverlay() {
      this.log("Создание overlay элемента");

      const canvasContainer = this.findCanvasContainer();

      if (!canvasContainer) {
        this.error("Не найден canvas контейнер");

        if (this.debugMode) {
          this.log("Поиск всех элементов с canvas:");
          const allCanvas = document.querySelectorAll("canvas");
          allCanvas.forEach((canvas, idx) => {
            this.log(`Canvas ${idx}:`, canvas, canvas.parentElement);
          });

          this.log("Поиск всех div с position relative:");
          const allDivs = document.querySelectorAll("div");
          allDivs.forEach((div, idx) => {
            const style = window.getComputedStyle(div);
            if (style.position === "relative") {
              this.log(`Div ${idx} с position relative:`, div.className, div);
            }
          });
        }

        this.overlayActive = false;
        this.updateSwitchState(this.overlaySwitch, false);
        return;
      }

      this.removeOverlay();

      const rect = canvasContainer.getBoundingClientRect();
      const containerHeight = rect.height;
      let containerWidth = rect.width;

      this.log(
        `Размеры canvas контейнера: ${containerWidth}x${containerHeight}px`,
      );

      if (
        document.querySelectorAll(
          ".MuiInputBase-input.MuiOutlinedInput-input.MuiAutocomplete-input.MuiAutocomplete-inputFocused.MuiInputBase-inputAdornedEnd.MuiOutlinedInput-inputAdornedEnd",
        )
      ) {
        const inputs = document.querySelectorAll(
          ".MuiInputBase-input.MuiOutlinedInput-input.MuiAutocomplete-input.MuiAutocomplete-inputFocused.MuiInputBase-inputAdornedEnd.MuiOutlinedInput-inputAdornedEnd",
        );
        const values = Array.from(inputs).map((input) => input.value);

        if (values.includes("Square")) {
          this.log("Контейнер с размерами 2048 × 2048 px (Square) найден");
          containerWidth = containerHeight;
        } else if (values.includes("Landscape")) {
          this.log("Контейнер с размерами 2560 × 1440 px (Landscape) найден");
        } else if (values.includes("Portrait")) {
          this.log("Контейнер с размерами 2000 × 2500 px (Portrait) найден");
          containerWidth = containerHeight * 0.9765625;
        } else {
          this.log(
            "Размеры в контейнере не определены, используем высоту для ширины",
          );
          containerWidth = containerHeight;
        }
      } else {
        this.log(
          "Контейнер с размерами не найден, возможно, структура страницы изменилась",
        );
        containerWidth = containerHeight;
      }

      this.log(
        `Квадрат будет размером: ${containerWidth}x${containerHeight}px`,
      );

      this.overlayElement = document.createElement("div");
      this.overlayElement.className = "zolak-canvas-overlay";

      this.overlayElement.style.cssText = `
        position: absolute;
        top: 0;
        left: 50%;
        transform: translateX(-50%);
        width: ${containerWidth}px;
        height: ${containerHeight}px;
        border: 3px solid #00ff00;
        box-sizing: border-box;
        pointer-events: none;
        z-index: 1000;
        background: transparent;
        box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.3);
        transition: all 0.2s ease;
        opacity: 0;
      `;

      const currentPosition = window.getComputedStyle(canvasContainer).position;
      if (currentPosition === "static") {
        canvasContainer.style.position = "relative";
        this.log("Установлен position: relative для canvas контейнера");
      } else {
        this.log(`Canvas контейнер уже имеет position: ${currentPosition}`);
      }

      this.canvasContainerRef = canvasContainer;
      canvasContainer.appendChild(this.overlayElement);

      // Анимация появления overlay
      requestAnimationFrame(() => {
        if (this.overlayElement) {
          this.overlayElement.style.opacity = "1";
        }
      });

      this.log(
        `Overlay создан: ${containerWidth}×${containerHeight}px, центрирован горизонтально`,
      );

      window.addEventListener("resize", this.handleOverlayResize.bind(this));
    }

    handleOverlayResize() {
      if (this.overlayActive && this.overlayElement) {
        let container = this.canvasContainerRef;

        if (!container || !document.body.contains(container)) {
          this.log("Ссылка на canvas контейнер потеряна, ищем заново...");
          container = this.findCanvasContainer();
          if (container) {
            this.canvasContainerRef = container;
          } else {
            this.log("Не удалось найти canvas контейнер при ресайзе");
            return;
          }
        }

        const newHeight = container.getBoundingClientRect().height;
        let newWidth = container.getBoundingClientRect().width;

        const inputs = document.querySelectorAll(
          ".MuiInputBase-input.MuiOutlinedInput-input.MuiAutocomplete-input.MuiAutocomplete-inputFocused.MuiInputBase-inputAdornedEnd.MuiOutlinedInput-inputAdornedEnd",
        );
        const values = Array.from(inputs).map((input) => input.value);

        if (values.includes("2048 × 2048 px (Square)")) {
          this.log("Контейнер с размерами 2048 × 2048 px (Square) найден");
          newWidth = newHeight;
        } else if (values.includes("2400 × 1600 px (Landscape)")) {
          this.log("Контейнер с размерами 2400 × 1600 px (Landscape) найден");
          newWidth = newWidth * 0.9375;
        } else if (values.includes("2560 × 1440 px (Landscape)")) {
          this.log("Контейнер с размерами 2560 × 1440 px (Landscape) найден");
        } else if (values.includes("2000 × 2500 px (Portrait)")) {
          this.log("Контейнер с размерами 2000 × 2500 px (Portrait) найден");
          newWidth = newHeight * 0.9765625;
        } else {
          this.log(
            "Размеры в контейнере не определены, используем высоту для ширины",
          );
          newWidth = newHeight;
        }

        this.overlayElement.style.width = `${newWidth}px`;
        this.overlayElement.style.height = `${newHeight}px`;

        if (this.rulerActive && this.rulerElement) {
          this.rulerElement.width = newWidth;
          this.rulerElement.height = newHeight;
          this.drawRuler();
        }

        if (this.gridActive && this.gridElement) {
          this.gridElement.width = newWidth;
          this.gridElement.height = newHeight;
          this.drawGrid();
        }

        this.log(`Overlay обновлен: новый размер ${newWidth}×${newHeight}px`);
      }
    }

    removeOverlay() {
      if (this.overlayElement) {
        // Анимация исчезновения
        this.overlayElement.style.opacity = "0";
        setTimeout(() => {
          if (this.overlayElement) {
            this.overlayElement.remove();
            this.overlayElement = null;
          }
        }, 200);
        this.log("Overlay удален с анимацией исчезновения");
      }

      this.canvasContainerRef = null;
      window.removeEventListener("resize", this.handleOverlayResize.bind(this));
    }

    observeRenderDialog() {
      this.log("Наблюдение за диалогом рендера...");

      this.renderObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.addedNodes.length > 0) {
            this.checkForRenderDialog();
          }
          if (mutation.removedNodes.length > 0) {
            this.checkForRenderDialogRemoved();
          }
        }
      });

      this.renderObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });

      setTimeout(() => this.checkForRenderDialog(), 1000);
    }

    checkForRenderDialog() {
      const dialog = document.querySelector(
        '[class*="StudioRenderDialog-dialogContainer"]',
      );
      if (dialog && !this.isRendering) {
        this.log("секундомер: обнаружен диалог рендера");
        this.startStopwatch(dialog);
      }
    }

    checkForRenderDialogRemoved() {
      const dialog = document.querySelector(
        '[class*="StudioRenderDialog-dialogContainer"]',
      );
      if (!dialog && this.isRendering) {
        this.log("секундомер: диалог рендера закрыт");
        this.stopStopwatch();
      }
    }

    formatTime(seconds) {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);

      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }

    createStopwatchElement() {
      const stopwatchDiv = document.createElement("div");
      stopwatchDiv.className = "zolak-stopwatch";

      const timeSpan = document.createElement("span");
      timeSpan.className = "zolak-stopwatch-time";
      timeSpan.textContent = "00:00:00";

      stopwatchDiv.appendChild(timeSpan);

      return { container: stopwatchDiv, timeSpan };
    }

    findInsertPosition(dialog) {
      this.log("секундомер: поиск места для вставки");

      const progressContainer = dialog.querySelector(
        '[class*="StudioRenderDialog-progressContainer"]',
      );
      if (!progressContainer) {
        this.log("секундомер: progressContainer не найден");
        return null;
      }

      const progressText = progressContainer.querySelector(
        '[class*="StudioRenderDialog-progressText"]',
      );
      if (!progressText) {
        this.log("секундомер: progressText не найден");
        return null;
      }

      this.log("секундомер: найдено место для вставки после progressText");
      return progressText;
    }

    startStopwatch(dialog) {
      if (this.isRendering) {
        this.log("секундомер: уже запущен");
        return;
      }

      this.log("секундомер: запуск...");
      this.isRendering = true;
      this.stopwatchStartTime = Date.now();

      if (this.stopwatchContainer) {
        this.stopwatchContainer.remove();
      }

      const { container, timeSpan } = this.createStopwatchElement();
      this.stopwatchContainer = container;
      this.stopwatchElement = timeSpan;

      const insertAfter = this.findInsertPosition(dialog);

      if (insertAfter) {
        insertAfter.parentNode.insertBefore(container, insertAfter.nextSibling);
        this.log("секундомер: добавлен после progressText");
      } else {
        const progressContainer = dialog.querySelector(
          '[class*="StudioRenderDialog-progressContainer"]',
        );
        if (progressContainer) {
          progressContainer.appendChild(container);
          this.log("секундомер: добавлен в конец progressContainer");
        } else {
          dialog.appendChild(container);
          this.log("секундомер: добавлен в конец диалога");
        }
      }

      this.stopwatchInterval = setInterval(() => {
        if (this.stopwatchStartTime) {
          const elapsedSeconds = (Date.now() - this.stopwatchStartTime) / 1000;
          this.stopwatchElement.textContent = this.formatTime(elapsedSeconds);
        }
      }, 100);

      this.log("секундомер: запущен успешно");
    }

    stopStopwatch() {
      if (!this.isRendering) {
        this.log("секундомер: не был запущен");
        return;
      }

      this.log("секундомер: остановка...");

      if (this.stopwatchInterval) {
        clearInterval(this.stopwatchInterval);
        this.stopwatchInterval = null;
      }

      if (this.stopwatchStartTime) {
        const elapsedSeconds = (Date.now() - this.stopwatchStartTime) / 1000;
        const formattedTime = this.formatTime(elapsedSeconds);
        console.log(`[Zolak Gallery] Время рендера: ${formattedTime}`);
        this.lastRenderText = formattedTime;
      }

      if (this.stopwatchContainer) {
        this.stopwatchContainer.remove();
        this.stopwatchContainer = null;
        this.stopwatchElement = null;
      }

      this.isRendering = false;
      this.stopwatchStartTime = null;
      this.log("секундомер: остановлен");
    }

    toggleDebug() {
      this.debugMode = !this.debugMode;
      console.log(
        `[Zolak Gallery] Режим отладки: ${this.debugMode ? "включен" : "выключен"}`,
      );

      const debugButton = this.galleryContainer?.querySelector(
        ".zolak-debug-button",
      );
      if (debugButton) {
        debugButton.textContent = `Debug ${this.debugMode ? "ON" : "OFF"}`;
        debugButton.classList.toggle("debug-on", this.debugMode);
      }
    }

    findOriginalContainer() {
      if (this.isSearching) return;
      this.isSearching = true;

      this.log("Поиск контейнера...");

      try {
        const allDivs = document.querySelectorAll("div");

        if (this.debugMode) {
          this.log("Всего div на странице:", allDivs.length);

          Array.from(allDivs).forEach((div) => {
            const items = div.querySelectorAll(':scope > [draggable="true"]');
            const hasImage = div.querySelector('img[alt="File"]');

            if (items.length > 0) {
              this.log(
                `Найден div с ${items.length} draggable элементами:`,
                div.className,
              );
            }

            if (hasImage) {
              this.log("Найден div с изображением:", div.className);
            }
          });
        }

        const container = Array.from(allDivs).find((div) => {
          if (this.galleryContainer && this.galleryContainer.contains(div))
            return false;
          if (this.button && this.button.contains(div)) return false;

          const items = div.querySelectorAll(':scope > [draggable="true"]');
          const hasDraggable = items.length >= 1;
          const hasImage = div.querySelector('img[alt="File"]');

          return hasDraggable && hasImage;
        });

        if (container) {
          this.log("Найден оригинальный контейнер:", container.className);
        } else if (this.debugMode) {
          this.log("Оригинальный контейнер не найден");
        }

        if (container && container !== this.originalContainer) {
          if (!container.closest(".zolak-gallery-modal")) {
            this.originalContainer = container;
            this.parentContainer = container.parentElement;
            this.transform();
          } else {
            this.log("Найденный контейнер внутри нашей галереи, пропускаем");
          }
        }
      } catch (error) {
        this.error("Ошибка поиска контейнера", error);
      } finally {
        this.isSearching = false;
      }
    }

    observeDOMChanges() {
      this.observer = new MutationObserver((mutations) => {
        if (this.isProcessing) return;

        try {
          if (
            !this.originalContainer ||
            !document.body.contains(this.originalContainer)
          ) {
            this.log("Контейнер потерян, ищем новый...");
            this.findOriginalContainer();
          }
        } catch (error) {
          this.error("Ошибка в MutationObserver", error);
        }
      });

      this.observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false,
      });
    }

    transform() {
      if (!this.originalContainer) return;

      this.log("Преобразование интерфейса...");

      try {
        if (this.button) {
          this.button.remove();
        }

        this.createGalleryButton();
        this.createGalleryContainer();

        this.log("Преобразование завершено");
      } catch (error) {
        this.error("Ошибка преобразования", error);
      }
    }

    createGalleryButton() {
      const parent = this.originalContainer.parentNode;
      if (!parent) {
        this.log("Нет родителя для кнопки");
        return;
      }

      this.button = document.createElement("button");
      this.button.className = "zolak-gallery-button";
      this.button.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="2" width="20" height="20" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
        Gallery
      `;

      this.button.setAttribute("tabindex", "-1");

      this.button.addEventListener("mousedown", (e) => e.preventDefault());
      this.button.addEventListener("mouseup", (e) => e.preventDefault());

      let clickTimeout = null;

      this.button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (event.detail === 0) {
          this.log("Клик с клавиатуры предотвращен");
          return;
        }

        if (clickTimeout) return;
        clickTimeout = setTimeout(() => {
          this.toggleGallery();
          clickTimeout = null;
        }, 100);
      });

      this.button.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          this.log("Нажатие Enter предотвращено");

          if (clickTimeout) return;
          clickTimeout = setTimeout(() => {
            this.toggleGallery();
            clickTimeout = null;
          }, 100);
        }
      });

      this.button.addEventListener("focus", (event) => {
        event.preventDefault();
        this.button.blur();
      });

      parent.insertBefore(this.button, this.originalContainer);
      this.log("Кнопка Gallery создана и защищена от срабатывания по Enter");
    }

    createGalleryContainer() {
      if (document.querySelector(".zolak-gallery-modal")) {
        this.galleryContainer = document.querySelector(".zolak-gallery-modal");
        return;
      }

      this.log("Создание контейнера галереи...");

      this.galleryContainer = document.createElement("div");
      this.galleryContainer.className = "zolak-gallery-modal";
      this.galleryContainer.style.display = "none";

      const header = document.createElement("div");
      header.className = "zolak-gallery-header";

      const title = document.createElement("h3");
      title.className = "zolak-gallery-title";
      title.textContent = "Media Gallery";

      const controlsContainer = document.createElement("div");
      controlsContainer.className = "zolak-gallery-controls";

      const debugButton = document.createElement("button");
      debugButton.className = "zolak-debug-button";
      debugButton.textContent = `Debug ${this.debugMode ? "ON" : "OFF"}`;
      debugButton.addEventListener("click", () => {
        this.toggleDebug();
      });

      const closeButton = document.createElement("button");
      closeButton.className = "zolak-gallery-close";
      closeButton.innerHTML = "✕";
      closeButton.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleGallery();
      });

      controlsContainer.appendChild(debugButton);
      controlsContainer.appendChild(closeButton);

      header.appendChild(title);
      header.appendChild(controlsContainer);

      const itemsContainer = document.createElement("div");
      itemsContainer.className = "zolak-gallery-items";

      let scrollTimeout = null;
      itemsContainer.addEventListener("scroll", () => {
        if (scrollTimeout) return;
        scrollTimeout = setTimeout(() => {
          this.updateScrollIndicators(itemsContainer);
          scrollTimeout = null;
        }, 50);
      });

      this.galleryContainer.appendChild(header);
      this.galleryContainer.appendChild(itemsContainer);

      document.body.appendChild(this.galleryContainer);

      this.galleryContainer.addEventListener("click", (e) => {
        if (e.target === this.galleryContainer) {
          this.toggleGallery();
        }
      });

      document.addEventListener("keydown", (e) => {
        if (
          e.key === "Escape" &&
          this.galleryContainer &&
          this.galleryContainer.style.display !== "none"
        ) {
          this.toggleGallery();
        }
      });

      this.log("Контейнер галереи создан");
    }

    populateGallery() {
      if (!this.originalContainer) {
        this.error("Нет оригинального контейнера");
        return;
      }

      this.log("Создание копий элементов для галереи...");

      try {
        const itemsContainer = this.galleryContainer.querySelector(
          ".zolak-gallery-items",
        );
        if (!itemsContainer) {
          this.error("Не найден контейнер элементов");
          return;
        }

        itemsContainer.innerHTML = "";

        const draggableItems = Array.from(
          this.originalContainer.querySelectorAll(
            ':scope > [draggable="true"]',
          ),
        );
        this.log(`Найдено ${draggableItems.length} элементов`);

        if (draggableItems.length === 0) {
          itemsContainer.innerHTML =
            '<div class="zolak-gallery-empty">Нет элементов для отображения</div>';
          return;
        }

        const itemsPerRow = 5;
        const rowsCount = Math.ceil(draggableItems.length / itemsPerRow);

        for (let rowIndex = 0; rowIndex < rowsCount; rowIndex++) {
          const row = document.createElement("div");
          row.className = "zolak-gallery-row";

          const startIdx = rowIndex * itemsPerRow;
          const endIdx = Math.min(
            startIdx + itemsPerRow,
            draggableItems.length,
          );

          for (let i = startIdx; i < endIdx; i++) {
            const originalElement = draggableItems[i];

            const clone = this.createBeautifulClone(originalElement, i);
            row.appendChild(clone);
          }

          itemsContainer.appendChild(row);
        }

        this.log(`Галерея заполнена: ${rowsCount} рядов`);
        this.updateItemsCounter(draggableItems.length);
      } catch (error) {
        this.error("Ошибка заполнения галереи:", error);
        const itemsContainer = this.galleryContainer.querySelector(
          ".zolak-gallery-items",
        );
        if (itemsContainer) {
          itemsContainer.innerHTML =
            '<div class="zolak-gallery-empty">Ошибка загрузки элементов</div>';
        }
      }
    }

    createBeautifulClone(originalElement, index) {
      const clone = originalElement.cloneNode(true);
      clone.classList.add("zolak-gallery-cloned-item");
      clone.setAttribute("data-original-index", index);

      const buttons = clone.querySelectorAll("button");
      buttons.forEach((button) => {
        const svg = button.querySelector("svg");
        if (svg) {
          const viewBox = svg.getAttribute("viewBox");
          if (
            viewBox === "0 0 16 4" ||
            svg.querySelectorAll("circle").length === 3
          ) {
            const newButton = document.createElement("button");
            newButton.className =
              button.className + " zolak-gallery-three-dots";
            newButton.innerHTML = button.innerHTML;

            newButton.addEventListener("click", (e) => {
              e.preventDefault();
              e.stopPropagation();
              this.handleThreeDotsClick(index);
            });

            button.parentNode.replaceChild(newButton, button);
          } else {
            button.style.pointerEvents = "none";
            button.style.opacity = "0.3";
          }
        }
      });

      return clone;
    }

    handleThreeDotsClick(index) {
      this.log(`Клик по троеточию элемента ${index} в галерее`);

      this.galleryContainer.style.display = "none";
      this.galleryContainer.classList.remove("zolak-gallery-open");
      document.body.style.overflow = "";

      if (this.currentHighlightedElement) {
        this.currentHighlightedElement.style.outline = "none";
        this.currentHighlightedElement.style.border = "none";
      }

      const originalItems = this.originalContainer.querySelectorAll(
        ':scope > [draggable="true"]',
      );
      const targetElement = originalItems[index];

      if (!targetElement) {
        this.error("Не найден оригинальный элемент");
        return;
      }

      const scrollContainer = this.parentContainer;

      if (scrollContainer) {
        const position = this.getElementPosition(
          targetElement,
          scrollContainer,
        );
        this.log(`Прокручиваем до позиции: ${position}px`);

        scrollContainer.scrollTo({
          left: position,
          behavior: "smooth",
        });

        setTimeout(() => {
          targetElement.style.outline = "3px solid red";
          targetElement.style.outlineOffset = "2px";
          targetElement.style.zIndex = "10000";
          this.currentHighlightedElement = targetElement;
          this.log("Элемент подсвечен красным");
        }, 300);
      } else {
        this.log("Нет родительского контейнера для прокрутки");
      }
    }

    getElementPosition(element, scrollContainer) {
      if (!scrollContainer || !element) return 0;

      const containerRect = scrollContainer.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();

      const relativeLeft =
        elementRect.left - containerRect.left + scrollContainer.scrollLeft;

      return Math.max(0, relativeLeft);
    }

    updateScrollIndicators(container) {
      if (!container) return;

      const isAtTop = container.scrollTop === 0;
      const isAtBottom =
        Math.abs(
          container.scrollTop + container.clientHeight - container.scrollHeight,
        ) < 10;

      if (isAtTop) {
        container.classList.remove("zolak-scroll-top");
      } else {
        container.classList.add("zolak-scroll-top");
      }

      if (isAtBottom) {
        container.classList.remove("zolak-scroll-bottom");
      } else {
        container.classList.add("zolak-scroll-bottom");
      }
    }

    updateItemsCounter(totalItems) {
      const title = this.galleryContainer.querySelector(".zolak-gallery-title");
      if (title) {
        const totalRows = Math.ceil(totalItems / 5);
        title.innerHTML = `Media Gallery <span class="zolak-gallery-counter">${totalItems} • ${totalRows} ${totalRows === 1 ? "row" : "rows"}</span>`;
      }
    }

    toggleGallery() {
      if (this.isProcessing) return;
      this.isProcessing = true;

      if (!this.galleryContainer) return;

      const isHidden = this.galleryContainer.style.display === "none";

      if (isHidden) {
        this.log("Открытие галереи...");
        this.populateGallery();
        this.galleryContainer.style.display = "flex";
        document.body.style.overflow = "hidden";

        setTimeout(() => {
          this.galleryContainer.classList.add("zolak-gallery-open");
        }, 10);
      } else {
        this.log("Закрытие галереи...");

        if (this.currentHighlightedElement) {
          this.currentHighlightedElement.style.outline = "none";
          this.currentHighlightedElement.style.border = "none";
          this.currentHighlightedElement = null;
        }

        this.galleryContainer.classList.remove("zolak-gallery-open");

        setTimeout(() => {
          this.galleryContainer.style.display = "none";
          document.body.style.overflow = "";
        }, 300);
      }

      setTimeout(() => {
        this.isProcessing = false;
      }, 500);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      new GalleryTransformer().init();
    });
  } else {
    new GalleryTransformer().init();
  }

  console.log("[Zolak Gallery] content.js загружен и выполняется");
})();
