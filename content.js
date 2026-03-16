// content.js - ФИНАЛЬНАЯ ВЕРСИЯ С DEBUG РЕЖИМОМ
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
      this.debugMode = false; // По умолчанию выключен
      
      // Свойства для секундомера
      this.stopwatchInterval = null;
      this.stopwatchStartTime = null;
      this.stopwatchElement = null;
      this.stopwatchContainer = null;
      this.isRendering = false;
      this.lastRenderText = '';
      this.renderObserver = null;
    }

    // Универсальный метод для логирования
    log(...args) {
      if (this.debugMode) {
        console.log("[Zolak Gallery]:", ...args);
      }
    }

    error(...args) {
      // Ошибки всегда показываем
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
          hostname.includes("dev.studio.zolak.tech");

        if (!isValidDomain) {
          this.log(
            "Не тот домен, расширение не должно было запуститься:",
            hostname,
          );
          return;
        }

        // Запускаем наблюдение за диалогом рендера только для studio
        if (hostname.includes("studio.zolak.tech") && fullUrl.startsWith("https://dev.studio.zolak.tech/studios/")) {
          this.log("Запуск секундомера для studios");
          this.observeRenderDialog();
        }

        this.findOriginalContainer();
        this.observeDOMChanges();
        this.log("Инициализация завершена");
      } catch (error) {
        this.error("Ошибка инициализации", error);
      }
    }

    // Наблюдение за диалогом рендера
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
        subtree: true
      });

      // Проверяем сразу на случай, если диалог уже есть
      setTimeout(() => this.checkForRenderDialog(), 1000);
    }

    // Проверка появления диалога
    checkForRenderDialog() {
      // Ищем диалог по части класса
      const dialog = document.querySelector('[class*="StudioRenderDialog-dialogContainer"]');
      if (dialog && !this.isRendering) {
        this.log("секундомер: обнаружен диалог рендера");
        this.startStopwatch(dialog);
      }
    }

    // Проверка исчезновения диалога
    checkForRenderDialogRemoved() {
      const dialog = document.querySelector('[class*="StudioRenderDialog-dialogContainer"]');
      if (!dialog && this.isRendering) {
        this.log("секундомер: диалог рендера закрыт");
        this.stopStopwatch();
      }
    }

    // Форматирование времени (без ограничения часов)
    formatTime(seconds) {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // Создание элемента секундомера
    createStopwatchElement() {
      const stopwatchDiv = document.createElement('div');
      stopwatchDiv.className = 'zolak-stopwatch';
      
      const timeSpan = document.createElement('span');
      timeSpan.className = 'zolak-stopwatch-time';
      timeSpan.textContent = '00:00:00';
      
      stopwatchDiv.appendChild(timeSpan);
      
      return { container: stopwatchDiv, timeSpan };
    }

    // Поиск места для вставки секундомера
    findInsertPosition(dialog) {
      this.log("секундомер: поиск места для вставки");
      
      // Ищем progressContainer
      const progressContainer = dialog.querySelector('[class*="StudioRenderDialog-progressContainer"]');
      if (!progressContainer) {
        this.log("секундомер: progressContainer не найден");
        return null;
      }
      
      // Ищем p с progressText внутри progressContainer
      const progressText = progressContainer.querySelector('[class*="StudioRenderDialog-progressText"]');
      if (!progressText) {
        this.log("секундомер: progressText не найден");
        return null;
      }
      
      this.log("секундомер: найдено место для вставки после progressText");
      return progressText;
    }

    // Запуск секундомера
    startStopwatch(dialog) {
      if (this.isRendering) {
        this.log("секундомер: уже запущен");
        return;
      }
      
      this.log("секундомер: запуск...");
      this.isRendering = true;
      this.stopwatchStartTime = Date.now();
      
      // Удаляем старый секундомер, если есть
      if (this.stopwatchContainer) {
        this.stopwatchContainer.remove();
      }
      
      // Создаем новый секундомер
      const { container, timeSpan } = this.createStopwatchElement();
      this.stopwatchContainer = container;
      this.stopwatchElement = timeSpan;
      
      // Находим место для вставки
      const insertAfter = this.findInsertPosition(dialog);
      
      if (insertAfter) {
        // Вставляем после progressText
        insertAfter.parentNode.insertBefore(container, insertAfter.nextSibling);
        this.log("секундомер: добавлен после progressText");
      } else {
        // Если не нашли нужное место, добавляем в конец progressContainer
        const progressContainer = dialog.querySelector('[class*="StudioRenderDialog-progressContainer"]');
        if (progressContainer) {
          progressContainer.appendChild(container);
          this.log("секундомер: добавлен в конец progressContainer");
        } else {
          // В самом крайнем случае - в конец диалога
          dialog.appendChild(container);
          this.log("секундомер: добавлен в конец диалога");
        }
      }
      
      // Запускаем обновление времени
      this.stopwatchInterval = setInterval(() => {
        if (this.stopwatchStartTime) {
          const elapsedSeconds = (Date.now() - this.stopwatchStartTime) / 1000;
          this.stopwatchElement.textContent = this.formatTime(elapsedSeconds);
        }
      }, 100);
      
      this.log("секундомер: запущен успешно");
    }

    // Остановка секундомера
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
        // Прямой console.log для времени рендера (всегда показываем)
        console.log(`[Zolak Gallery] Время рендера: ${formattedTime}`);
        
        // Сохраняем последнее время для истории
        this.lastRenderText = formattedTime;
      }
      
      // Удаляем контейнер
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
      // Это сообщение показываем всегда, чтобы пользователь знал состояние
      console.log(
        `[Zolak Gallery] Режим отладки: ${this.debugMode ? "включен" : "выключен"}`,
      );

      // Обновляем текст на кнопке
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

          // В debug режиме показываем все потенциальные контейнеры
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

      let clickTimeout = null;
      this.button.addEventListener("click", () => {
        if (clickTimeout) return;
        clickTimeout = setTimeout(() => {
          this.toggleGallery();
          clickTimeout = null;
        }, 100);
      });

      parent.insertBefore(this.button, this.originalContainer);
      this.log("Кнопка Gallery создана");
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

      // Создаем Debug Switch
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
})();