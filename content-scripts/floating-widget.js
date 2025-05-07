// Helper function to determine environment type
function getEnvironmentType(env) {
  // Prefer the 'type' property if it exists
  if (env && env.type) {
    return env.type;
  }
  // Fallback to checking the name for legacy environments
  if (env && env.name) {
    const lowerName = env.name.toLowerCase();
    if (lowerName.includes('staging') || lowerName.includes('stg')) return 'staging';
    if (lowerName.includes('prod') || lowerName.includes('production')) return 'production';
    if (lowerName.includes('dev') || lowerName.includes('development')) return 'development';
    if (lowerName.includes('uat')) return 'uat';
    if (lowerName.includes('qa') || lowerName.includes('test')) return 'qa';
  }
  return 'custom'; // Default to custom if no type or relevant name found
}

class FloatingWidget {
  constructor() {
    this.widget = null;
    this.button = null;
    this.menu = null;
    this.currentEnv = null;
    this.environments = [];
    this.openInNewTab = false;
    this.isDragging = false;
    this.widgetPosition = null;
    this.widgetVisible = true;
    this.showWidgetEvenWithoutMatch = true;
    this.initialized = false;
    this.observer = null;

    // Bind methods that will be used as event listeners
    this.dragBound = this.drag.bind(this);
    this.stopDraggingBound = this.stopDragging.bind(this);

    // Initialize immediately
    this.init();
  }

  async init() {
    try {
      // Get current URL and environments
      const currentUrl = window.location.href;
      
      try {
        const storage = await chrome.storage.sync.get(['environments', 'widgetPosition', 'openInNewTab', 'widgetVisible']);
        this.environments = storage.environments || [];
        this.widgetPosition = storage.widgetPosition;
        this.openInNewTab = storage.openInNewTab || false;
        this.widgetVisible = storage.widgetVisible !== false;
      } catch (error) {
        if (error.message.includes('Extension context invalidated')) {
          window.location.reload();
          return;
        }
        throw error;
      }
      
      // Check if current URL matches any environment
      const currentEnv = this.matchCurrentEnvironment(currentUrl, this.environments);
      
      if (!currentEnv) {
        return;
      }
      
      this.currentEnv = currentEnv;
      
      // Create widget elements
      this.createWidget();
      
      // Load saved position if exists
      if (this.widgetPosition) {
        this.widget.style.left = this.widgetPosition.left;
        this.widget.style.top = this.widgetPosition.top;
      } else {
        // Default position: top right corner
        this.widget.style.top = '20px';
        this.widget.style.right = '20px';
        this.widget.style.left = 'auto';
        this.widget.style.bottom = 'auto';
      }
      
      // Add event listeners
      this.setupEventListeners();
  
      // Set initial visibility based on storage state
      this.setVisibility(this.widgetVisible);
  
      this.initialized = true;
      
    } catch (error) {
      if (error.message.includes('Extension context invalidated')) {
        window.location.reload();
      }
    }
  }

  setupMutationObserver() {
    // Create a mutation observer to watch for changes to the widget
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          // Check if the widget's visibility has changed
          const isVisible = this.widget.style.display !== 'none';
          if (isVisible !== this.widgetVisible) {
            this.setVisibility(isVisible);
          }
        }
      });
    });

    // Start observing the widget for changes
    if (this.widget) {
      this.observer.observe(this.widget, {
        attributes: true,
        attributeFilter: ['style']
      });
    }
  }

  matchCurrentEnvironment(currentUrl, environments) {
    const currentUrlLower = currentUrl.toLowerCase();
    let matchedEnv = null;

    if (environments && environments.length > 0) {
      for (const env of environments) {
        if (env && env.url) {
          try {
            const envUrlLower = env.url.toLowerCase();
            const currentOrigin = new URL(currentUrl).origin;
            const envOrigin = new URL(envUrlLower).origin;

            if (currentOrigin === envOrigin || currentUrlLower.startsWith(envUrlLower.endsWith('/') ? envUrlLower : envUrlLower + '/')) {
              matchedEnv = env;
              break;
            }
          } catch (e) {
            if (currentUrlLower.startsWith(env.url.toLowerCase())) {
              matchedEnv = env;
              break;
            }
          }
        }
      }
    }
    
    return matchedEnv;
  }

  detectEnvironment() {
    const currentUrl = window.location.href.toLowerCase();
    let matchedEnv = null;

    if (this.environments && this.environments.length > 0) {
      for (const env of this.environments) {
        if (env && env.url) {
          try {
            const envUrlLower = env.url.toLowerCase();
            const currentOrigin = new URL(currentUrl).origin;
            const envOrigin = new URL(envUrlLower).origin;

            if (currentOrigin === envOrigin || currentUrl.startsWith(envUrlLower.endsWith('/') ? envUrlLower : envUrlLower + '/')) {
              matchedEnv = env;
              break;
            }
          } catch (e) {
            if (currentUrl.startsWith(env.url.toLowerCase())) {
              matchedEnv = env;
              break;
            }
          }
        }
      }
    }
    
    this.currentEnv = matchedEnv;
  }

  async loadVisibilityState(visible = true) {
    try {
      const storage = await chrome.storage.sync.get(['widgetVisible']);
      this.widgetVisible = storage.widgetVisible !== false; 
      if (this.widget) {
        this.setVisibility(this.widgetVisible);
      }
    } catch (error) {
      if (this.widget) {
        this.setVisibility(true);
      }
    }
  }
  
  createWidget() {
    if (this.widget) {
      return;
    }
    
    if (!document.body) {
      return; 
    }

    this.widget = document.createElement('div');
    this.widget.className = 'env-switcher-widget';
    this.widget.style.position = 'fixed';
    this.widget.style.zIndex = '2147483647';
    this.widget.style.cursor = 'grab';
    
    const closeButton = document.createElement('button');
    closeButton.className = 'env-switcher-close';
    closeButton.innerHTML = '✕';
    closeButton.title = 'Hide Widget';
    closeButton.setAttribute('aria-label', 'Hide Environment Switcher Widget');
    
    this.button = document.createElement('button');
    this.button.className = 'env-switcher-button';
    this.button.title = 'Environment Switcher';
    this.button.setAttribute('aria-label', 'Toggle Environment Switcher Menu');
    this.button.setAttribute('aria-haspopup', 'true');
    this.button.setAttribute('aria-expanded', 'false');
    
    const svgIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgIcon.setAttribute('class', 'env-switcher-icon');
    svgIcon.setAttribute('viewBox', '0 0 24 24');
    svgIcon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svgIcon.setAttribute('fill', 'white');
    svgIcon.setAttribute('width', '28');
    svgIcon.setAttribute('height', '28');
    svgIcon.setAttribute('stroke', 'white');
    svgIcon.setAttribute('stroke-width', '1.5');
    svgIcon.setAttribute('stroke-linecap', 'round');
    svgIcon.setAttribute('stroke-linejoin', 'round');
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.1-.3 2.13-.83 3h2.06c.5-1.25.77-2.6.77-4 0-4.42-3.58-8-8-8zm-6 8c0-1.1.3-2.13.83-3H4.77C4.27 10.25 4 11.6 4 13c0 4.42 3.58 8 8 8v3l4-4-4-4v3c-3.31 0-6-2.69-6-6z');
    
    svgIcon.appendChild(path);
    this.button.appendChild(svgIcon);
    
    this.menu = document.createElement('div');
    this.menu.className = 'env-switcher-menu';
    this.menu.setAttribute('role', 'menu');
    this.menu.setAttribute('aria-hidden', 'true');
    
    const menuContent = document.createElement('div');
    menuContent.className = 'env-switcher-menu-content';
    this.menu.appendChild(menuContent);
    
    this.widget.appendChild(closeButton);
    this.widget.appendChild(this.button);
    this.widget.appendChild(this.menu);
    
    document.body.appendChild(this.widget);
  }

  updateMenuPosition() {
    if (!this.menu || !this.widget) return;
    
    const widgetRect = this.widget.getBoundingClientRect();
    const menuHeight = this.menu.offsetHeight;
    const menuWidth = this.menu.offsetWidth;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const margin = 10;

    this.menu.style.bottom = widgetRect.height + 'px';
    this.menu.style.top = 'auto';
    this.menu.style.left = '0px';
    this.menu.style.right = 'auto';

    if (widgetRect.top - menuHeight < margin) {
      this.menu.style.top = widgetRect.height + 'px';
      this.menu.style.bottom = 'auto';
    }

    if (widgetRect.left + menuWidth > viewportWidth - margin) {
      this.menu.style.left = 'auto';
      this.menu.style.right = '0px';
    }
    
    if (widgetRect.left < margin && this.menu.style.left !== 'auto') {
      if (widgetRect.left + menuWidth > viewportWidth - margin) {
        this.menu.style.left = 'auto';
        this.menu.style.right = '0px';
      } else {
        this.menu.style.left = '0px';
        this.menu.style.right = 'auto';
      }
    }
  }

  startDragging(e) {
    if (e.target === this.widget || this.widget.contains(e.target) && !this.menu.contains(e.target)) {
      if (e.target.classList.contains('env-switcher-close')) return;

      this.isDragging = true;
      const rect = this.widget.getBoundingClientRect();
      this.initialX = e.clientX - rect.left;
      this.initialY = e.clientY - rect.top;

      this.widget.style.transition = 'none';
      this.widget.style.cursor = 'grabbing';
      document.body.style.cursor = 'grabbing';
      this.closeMenu();

      document.addEventListener('mousemove', this.dragBound);
      document.addEventListener('mouseup', this.stopDraggingBound);
      
      e.preventDefault();
    }
  }

  drag(e) {
    if (!this.isDragging) return;
    e.preventDefault();

    let newX = e.clientX - this.initialX;
    let newY = e.clientY - this.initialY;

    const maxX = window.innerWidth - this.widget.offsetWidth;
    const maxY = window.innerHeight - this.widget.offsetHeight;

    newX = Math.max(0, Math.min(newX, maxX));
    newY = Math.max(0, Math.min(newY, maxY));

    this.widget.style.left = `${newX}px`;
    this.widget.style.top = `${newY}px`;
    this.widget.style.right = 'auto';
    this.widget.style.bottom = 'auto';
  }

  async stopDragging() {
    if (!this.isDragging) return;
    this.isDragging = false;

    document.removeEventListener('mousemove', this.dragBound);
    document.removeEventListener('mouseup', this.stopDraggingBound);

    this.widget.style.transition = '';
    this.widget.style.cursor = 'grab';
    document.body.style.cursor = 'default';

    const finalPosition = {
      left: this.widget.style.left,
      top: this.widget.style.top
    };
    this.widgetPosition = finalPosition;
    
    try {
      if (finalPosition.left && finalPosition.top) {
        await chrome.storage.sync.set({ widgetPosition: finalPosition });
      }
    } catch (error) {
      // Handle error silently
    }
  }

  toggleMenu(forceVisible = null) {
    if (!this.menu || this.isDragging) return;
    
    const isVisible = this.menu.classList.contains('visible');
    const shouldBeVisible = forceVisible === null ? !isVisible : forceVisible;

    if (shouldBeVisible) {
      this.updateMenu();
      this.menu.classList.add('visible');
      this.menu.setAttribute('aria-hidden', 'false');
      this.button.setAttribute('aria-expanded', 'true');
      this.updateMenuPosition();
    } else {
      this.menu.classList.remove('visible');
      this.menu.setAttribute('aria-hidden', 'true');
      this.button.setAttribute('aria-expanded', 'false');
    }
  }

  closeMenu() {
    this.toggleMenu(false);
  }

  updateMenu() {
    if (!this.menu) return;

    const menuContent = this.menu.querySelector('.env-switcher-menu-content');
    if (!menuContent) return;

    menuContent.innerHTML = '';

    const toggleWrapper = document.createElement('div');
    toggleWrapper.className = 'toggle-wrapper';
    
    const toggleInput = document.createElement('input');
    toggleInput.type = 'checkbox';
    toggleInput.id = 'openInNewTab';
    toggleInput.className = 'toggle-input';
    toggleInput.checked = this.openInNewTab;
    
    const toggleSlider = document.createElement('span');
    toggleSlider.className = 'toggle-slider';
    
    const toggleLabel = document.createElement('span');
    toggleLabel.className = 'toggle-label';
    toggleLabel.textContent = 'Open in new tab';
    
    toggleWrapper.addEventListener('click', async (e) => {
      toggleInput.checked = !toggleInput.checked;
      this.openInNewTab = toggleInput.checked;
      
      try {
        await chrome.storage.sync.set({ openInNewTab: this.openInNewTab });
      } catch (error) {
        // Handle error silently
      }
    });
    
    toggleWrapper.appendChild(toggleInput);
    toggleWrapper.appendChild(toggleSlider);
    toggleWrapper.appendChild(toggleLabel);
    
    menuContent.appendChild(toggleWrapper);

    const divider = document.createElement('hr');
    divider.className = 'env-divider';
    menuContent.appendChild(divider);

    let environmentsToDisplay = (this.environments || []).filter(env => env && env.url);
    const currentGroup = this.currentEnv ? this.currentEnv.group : null;
    
    if (this.currentEnv) {
      environmentsToDisplay = environmentsToDisplay.filter(env => {
        try {
          const currentOrigin = new URL(this.currentEnv.url).origin;
          const envOrigin = new URL(env.url).origin;
          return currentOrigin !== envOrigin;
        } catch (e) {
          return env.url !== this.currentEnv.url;
        }
      });
    }

    if (currentGroup) {
      environmentsToDisplay = environmentsToDisplay.filter(env => env.group === currentGroup);
    }

    if (environmentsToDisplay.length > 0) {
      environmentsToDisplay.forEach(env => {
        const envItem = this.createEnvironmentItem(env, this.currentEnv);
        menuContent.appendChild(envItem);
      });
    } else {
      const noEnvs = document.createElement('div');
      noEnvs.className = 'env-switcher-menu-no-envs';
      if (currentGroup) {
        noEnvs.textContent = 'No other environments in this group';
      } else {
        noEnvs.textContent = 'No environments available to switch to';
      }
      menuContent.appendChild(noEnvs);
    }

    this.updateMenuPosition();
  }
  
  createEnvironmentItem(env, currentEnv) {
    const item = document.createElement('div');
    item.className = 'env-switcher-menu-item env-switcher-env-item';
    item.setAttribute('role', 'menuitem');
    item.setAttribute('aria-label', `Switch to ${env.name}`);
    item.tabIndex = 0;

    const envType = getEnvironmentType(env);
    const iconClass = `env-switcher-menu-item-icon ${envType}`;
    
    const icon = document.createElement('span');
    icon.className = iconClass;
    icon.setAttribute('aria-hidden', 'true');

    const name = document.createElement('div');
    name.className = 'env-switcher-menu-item-name';
    name.textContent = env.name || '';

    item.appendChild(icon);
    item.appendChild(name);

    item.addEventListener('click', () => {
      this.switchToEnvironment(env.url);
    });

    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        this.switchToEnvironment(env.url);
        e.preventDefault();
      }
    });

    if (currentEnv && env.url === currentEnv.url) {
      item.classList.add('active');
      item.setAttribute('aria-current', 'page');
    }

    return item;
  }

  async switchToEnvironment(targetUrl) {
    try {
      const openInNewTab = this.openInNewTab;

      const currentUrlObj = new URL(window.location.href);
      const path = currentUrlObj.pathname + currentUrlObj.search + currentUrlObj.hash;
      const targetUrlObj = new URL(targetUrl);
      targetUrlObj.pathname = path;
      targetUrlObj.search = '';
      targetUrlObj.hash = '';
      const finalUrl = targetUrlObj.toString();

      try {
        chrome.runtime.sendMessage(
          { 
            action: 'switchTab', 
            url: finalUrl, 
            openInNewTab: openInNewTab 
          },
          (response) => {
            if (chrome.runtime.lastError) {
              if (chrome.runtime.lastError.message.includes('Extension context invalidated')) {
                window.location.reload();
                return;
              }
            }
          }
        );
      } catch (error) {
        if (error.message.includes('Extension context invalidated')) {
          window.location.reload();
          return;
        }
        throw error;
      }
      
      this.closeMenu();

    } catch (error) {
      if (error.message.includes('Extension context invalidated')) {
        window.location.reload();
        return;
      }
    }
  }

  setupEventListeners() {
    if (!this.widget) {
      return;
    }

    const safeAddEventListener = (element, event, handler) => {
      try {
        if (element && typeof element.addEventListener === 'function') {
          element.addEventListener(event, (e) => {
            try {
              handler(e);
            } catch (error) {
              if (error.message.includes('Extension context invalidated')) {
                this.handleContextInvalidation();
                return;
              }
            }
          });
        }
      } catch (error) {
        if (error.message.includes('Extension context invalidated')) {
          this.handleContextInvalidation();
          return;
        }
      }
    };

    const safeSetupChromeListener = (api, event, handler) => {
      try {
        if (typeof chrome !== 'undefined' && chrome[api] && typeof chrome[api][event] === 'function') {
          chrome[api][event](handler);
        }
      } catch (error) {
        if (error.message.includes('Extension context invalidated')) {
          this.handleContextInvalidation();
          return;
        }
      }
    };
    
    safeSetupChromeListener('storage', 'onChanged', (changes, areaName) => {
      try {
        if (areaName === 'sync' && changes.widgetVisible) {
          this.setVisibility(changes.widgetVisible.newValue);
        }
      } catch (error) {
        if (error.message.includes('Extension context invalidated')) {
          this.handleContextInvalidation();
          return;
        }
      }
    });

    safeSetupChromeListener('runtime', 'onMessage', (message, sender, sendResponse) => {
      try {
        if (message.action === 'updateWidgetVisibility') {
          try {
            chrome.storage.sync.set({ widgetVisible: message.isVisible }, () => {
              try {
                if (chrome.runtime.lastError) {
                  if (chrome.runtime.lastError.message.includes('Extension context invalidated')) {
                    this.handleContextInvalidation();
                    return;
                  }
                } else {
                  this.setVisibility(message.isVisible);
                  sendResponse({ 
                    success: true,
                    widgetVisible: this.widgetVisible
                  });
                }
              } catch (error) {
                if (error.message.includes('Extension context invalidated')) {
                  this.handleContextInvalidation();
                  return;
                }
              }
            });
          } catch (error) {
            if (error.message.includes('Extension context invalidated')) {
              this.handleContextInvalidation();
              return;
            }
          }
          return true;
        }
        return false;
      } catch (error) {
        if (error.message.includes('Extension context invalidated')) {
          this.handleContextInvalidation();
          return false;
        }
        return false;
      }
    });

    safeAddEventListener(this.button, 'click', (e) => {
      e.stopPropagation();
      this.toggleMenu();
    });
    
    const closeButton = this.widget.querySelector('.env-switcher-close');
    if (closeButton) {
      safeAddEventListener(closeButton, 'click', (e) => {
        e.stopPropagation();
        this.setVisibility(false);
      });
    }
    
    safeAddEventListener(document, 'click', (e) => {
      if (this.widget && !this.widget.contains(e.target) && this.menu.classList.contains('visible')) {
        this.closeMenu();
      }
    });

    safeAddEventListener(this.widget, 'mousedown', (e) => this.startDragging(e));
    safeAddEventListener(window, 'resize', () => this.updateMenuPosition());

    let visibilityChangeTimeout = null;
    let recoveryAttempts = 0;
    const MAX_RECOVERY_ATTEMPTS = 3;
    const INITIAL_RETRY_DELAY = 1000;
    let isRecovering = false;
    let lastRecoveryAttempt = 0;
    const MIN_RECOVERY_INTERVAL = 5000;
    let isContextValid = true;

    const cleanupVisibilityChange = () => {
      if (visibilityChangeTimeout) {
        clearTimeout(visibilityChangeTimeout);
        visibilityChangeTimeout = null;
      }
    };

    const checkContextValidity = () => {
      try {
        isContextValid = typeof chrome !== 'undefined' && 
                        chrome.runtime && 
                        chrome.runtime.id && 
                        typeof chrome.storage !== 'undefined';
        return isContextValid;
      } catch (error) {
        isContextValid = false;
        return false;
      }
    };

    const attemptRecovery = async () => {
      const now = Date.now();
      if (now - lastRecoveryAttempt < MIN_RECOVERY_INTERVAL) {
        return;
      }

      if (isRecovering) {
        return;
      }

      lastRecoveryAttempt = now;
      isRecovering = true;
      
      try {
        if (!checkContextValidity()) {
          await this.handleContextInvalidation();
          recoveryAttempts = 0;
          cleanupVisibilityChange();
        } else {
          cleanupVisibilityChange();
        }
      } catch (error) {
        recoveryAttempts++;
        
        if (recoveryAttempts >= MAX_RECOVERY_ATTEMPTS) {
          cleanupVisibilityChange();
          window.location.reload();
        } else {
          const delay = INITIAL_RETRY_DELAY * Math.pow(2, recoveryAttempts);
          visibilityChangeTimeout = setTimeout(attemptRecovery, delay);
        }
      }
    };

    safeAddEventListener(document, 'visibilitychange', () => {
      if (!document.hidden) {
        if (visibilityChangeTimeout) {
          clearTimeout(visibilityChangeTimeout);
          visibilityChangeTimeout = null;
        }

        visibilityChangeTimeout = setTimeout(async () => {
          try {
            if (!checkContextValidity()) {
              await attemptRecovery().catch(err => {
                if (recoveryAttempts >= MAX_RECOVERY_ATTEMPTS) {
                  window.location.reload();
                }
              });
              return;
            }

            recoveryAttempts = 0;
            isRecovering = false;

            if (!this.widget) {
              this.createWidget();
              if (this.widgetPosition) {
                this.widget.style.left = this.widgetPosition.left;
                this.widget.style.top = this.widgetPosition.top;
              }
              this.setVisibility(this.widgetVisible);
            }

            try {
              const result = await chrome.storage.sync.get(['widgetVisible']);
              if (result.widgetVisible !== undefined && result.widgetVisible !== this.widgetVisible) {
                this.setVisibility(result.widgetVisible);
              }
            } catch (storageError) {
              if (storageError.message && storageError.message.includes('Extension context invalidated')) {
                isContextValid = false;
                await attemptRecovery();
              }
            }

          } catch (error) {
            if (visibilityChangeTimeout) {
              clearTimeout(visibilityChangeTimeout);
              visibilityChangeTimeout = null;
            }
            
            recoveryAttempts++;
            
            if (recoveryAttempts < MAX_RECOVERY_ATTEMPTS) {
              isRecovering = false;
              lastRecoveryAttempt = 0;
              
              const delay = INITIAL_RETRY_DELAY * Math.pow(2, recoveryAttempts);
              visibilityChangeTimeout = setTimeout(attemptRecovery, delay);
            } else {
              window.location.reload();
            }
          }
        }, 1000);
      }
    });
  }

  setVisibility(visible) {
    this.widgetVisible = visible;
    
    if (!this.widget) {
      return;
    }
    
    if (visible) {
      this.widget.style.display = 'block';
    } else {
      this.widget.style.display = 'none';
      this.closeMenu();
    }
    
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
        chrome.storage.sync.set({ widgetVisible: visible });
      }
    } catch (error) {
      // Handle error silently
    }
  }
  
  generateColor(name) {
    let hash = 0;
    name = name || '';
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
      hash = hash & hash;
    }
    const color = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return "#" + "00000".substring(0, 6 - color.length) + color;
  }

  handleContextInvalidation() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    if (this.widget && this.widget.parentNode) {
      this.widget.parentNode.removeChild(this.widget);
      this.widget = null;
    }
    
    if (this.visibilityChangeTimeout) {
      clearTimeout(this.visibilityChangeTimeout);
      this.visibilityChangeTimeout = null;
    }
    
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          if (typeof chrome !== 'undefined' && 
              chrome.runtime && 
              chrome.runtime.id && 
              chrome.runtime.lastError === undefined && 
              typeof chrome.storage !== 'undefined' && 
              chrome.storage.sync) {
            
            try {
              await chrome.storage.sync.get(['widgetVisible']);
              await this.init();
              resolve(true);
            } catch (error) {
              reject(error);
            }
          } else {
            if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
              window.location.reload();
            }
            reject(new Error('Extension context still invalid'));
          }
        } catch (error) {
          window.location.reload();
          reject(error);
        }
      }, 1500);
    });
  }
}

let widgetInstance = null;

async function initializeWidget() {
  try {
    const storage = await chrome.storage.sync.get(['widgetVisible', 'environments']);
    const shouldBeVisible = storage.widgetVisible !== false;
    
    if (widgetInstance) {
      if (widgetInstance.widget && widgetInstance.widget.parentNode) {
        widgetInstance.widget.parentNode.removeChild(widgetInstance.widget);
      }
      widgetInstance = null;
    }
    
    if (shouldBeVisible) {
      widgetInstance = new FloatingWidget();
      
      if (widgetInstance && widgetInstance.widget) {
        widgetInstance.setVisibility(true);
      }
    }
  } catch (error) {
    // Handle error silently
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateWidgetVisibility') {
    if (message.isVisible) {
      if (!widgetInstance) {
        widgetInstance = new FloatingWidget();
      } else {
        widgetInstance.setVisibility(true);
      }
    } else {
      if (widgetInstance) {
        widgetInstance.setVisibility(false);
      }
    }
    
    sendResponse({ success: true });
    return true;
  }
  return false;
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && changes.widgetVisible) {
    if (changes.widgetVisible.newValue) {
      if (!widgetInstance) {
        widgetInstance = new FloatingWidget();
      } else {
        widgetInstance.setVisibility(true);
      }
    } else {
      if (widgetInstance) {
        widgetInstance.setVisibility(false);
      }
    }
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeWidget);
} else {
  initializeWidget();
} 