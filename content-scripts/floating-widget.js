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
    console.log('🏗️ Creating new FloatingWidget instance');
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
      console.log('🚀 Initializing widget...');
      
      // Get current URL and environments
      const currentUrl = window.location.href;
      const storage = await chrome.storage.sync.get(['environments', 'widgetPosition', 'openInNewTab', 'widgetVisible']);
      this.environments = storage.environments || [];
      this.widgetPosition = storage.widgetPosition;
      this.openInNewTab = storage.openInNewTab || false;
      this.widgetVisible = storage.widgetVisible !== false;
      
      console.log('📊 Widget state:', {
        environments: this.environments.length,
        widgetPosition: this.widgetPosition,
        openInNewTab: this.openInNewTab,
        widgetVisible: this.widgetVisible
      });
      
      // Check if current URL matches any environment
      const currentEnv = this.matchCurrentEnvironment(currentUrl, this.environments);
      
      if (!currentEnv) {
        console.log('❌ No matching environment found for current URL:', currentUrl);
        return;
      }
      
      console.log('✅ Current environment:', currentEnv.name);
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
      console.log('✅ Widget initialization complete');
      
    } catch (error) {
      console.error('❌ Error initializing widget:', error);
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
            console.log('Widget visibility changed via DOM:', isVisible);
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

    console.log('Matching environment for URL:', currentUrl);
    if (environments && environments.length > 0) {
      console.log('Available environments:', environments);
      for (const env of environments) {
        if (env && env.url) {
          try {
            const envUrlLower = env.url.toLowerCase();
            const currentOrigin = new URL(currentUrl).origin;
            const envOrigin = new URL(envUrlLower).origin;

            if (currentOrigin === envOrigin || currentUrlLower.startsWith(envUrlLower.endsWith('/') ? envUrlLower : envUrlLower + '/')) {
              matchedEnv = env;
              console.log(`Match found: ${env.name} (${env.url})`);
              break;
            }
          } catch (e) {
            console.warn(`Could not parse URL for comparison: ${env.url}`, e);
            if (currentUrlLower.startsWith(env.url.toLowerCase())) {
              matchedEnv = env;
              console.log(`Match found (fallback): ${env.name} (${env.url})`);
              break;
            }
          }
        }
      }
    } else {
      console.log('No environments loaded from storage.');
    }
    
    return matchedEnv;
  }

  detectEnvironment() {
    // ... (Keep existing detectEnvironment logic) ...
     const currentUrl = window.location.href.toLowerCase();
    let matchedEnv = null;

    console.log('Detecting environment for URL:', currentUrl);
    // Ensure environments array exists and has elements
    if (this.environments && this.environments.length > 0) {
        console.log('Available environments:', this.environments);
        for (const env of this.environments) {
            if (env && env.url) {
                try {
                    const envUrlLower = env.url.toLowerCase();
                    const currentOrigin = new URL(currentUrl).origin;
                    const envOrigin = new URL(envUrlLower).origin;

                    if (currentOrigin === envOrigin || currentUrl.startsWith(envUrlLower.endsWith('/') ? envUrlLower : envUrlLower + '/')) {
                        matchedEnv = env;
                        console.log(`Match found: ${env.name} (${env.url})`);
                        break;
                    }
                } catch (e) {
                    console.warn(`Could not parse URL for comparison: ${env.url}`, e);
                    if (currentUrl.startsWith(env.url.toLowerCase())) {
                        matchedEnv = env;
                        console.log(`Match found (fallback): ${env.name} (${env.url})`);
                        break;
                    }
                }
            }
        }
    } else {
        console.log('No environments loaded from storage.');
    }
    
    this.currentEnv = matchedEnv;
    console.log('Detected environment:', this.currentEnv);
  }

  // Add try-catch to storage access in loadVisibilityState
  async loadVisibilityState(visible = true) {
     // This might be redundant now if init handles visibility correctly,
     // but keep it for potential external calls (e.g., from popup)
     try {
        const storage = await chrome.storage.sync.get(['widgetVisible']);
        this.widgetVisible = storage.widgetVisible !== false; 
        if (this.widget) {
            this.setVisibility(this.widgetVisible);
        }
    } catch (error) {
        console.error('Error loading visibility state:', error);
        if (this.widget) {
            this.setVisibility(true); // Default to visible if storage fails
        }
    }
  }
  
  // RESTORED: createWidget method
  createWidget() {
    if (this.widget) {
        return;
    }
    
    // Add check for document.body
    if (!document.body) {
        console.error('Cannot create widget: document.body is not available yet.');
        // Optionally retry after a delay or wait for body
        // window.addEventListener('DOMContentLoaded', () => this.createWidget()); 
        return; 
    }
    console.log('[DEBUG] document.body exists, proceeding with widget creation.');

    this.widget = document.createElement('div');
    this.widget.className = 'env-switcher-widget';
    this.widget.style.position = 'fixed'; // Ensure it's fixed
    this.widget.style.zIndex = '2147483647'; // Max z-index
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
    
    // Create and append the SVG icon
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
    this.menu.setAttribute('aria-hidden', 'true'); // Start hidden
    
    const menuContent = document.createElement('div');
    menuContent.className = 'env-switcher-menu-content';
    this.menu.appendChild(menuContent);
    
    this.widget.appendChild(closeButton);
    this.widget.appendChild(this.button);
    this.widget.appendChild(this.menu);
    
    document.body.appendChild(this.widget);
    console.log('Widget created and appended to body.');
  }

  // RESTORED: updateMenuPosition method
  updateMenuPosition() {
    if (!this.menu || !this.widget) return;
    
    const widgetRect = this.widget.getBoundingClientRect();
    const menuHeight = this.menu.offsetHeight;
    const menuWidth = this.menu.offsetWidth;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const margin = 10; // Margin from viewport edges

    // Default: Position menu above the widget, aligned left
    this.menu.style.bottom = widgetRect.height + 'px';
    this.menu.style.top = 'auto';
    this.menu.style.left = '0px';
    this.menu.style.right = 'auto';

    // Check if menu goes off-screen vertically (top)
    if (widgetRect.top - menuHeight < margin) {
        // Position below widget
        this.menu.style.top = widgetRect.height + 'px';
        this.menu.style.bottom = 'auto';
    }

    // Check if menu goes off-screen horizontally (right)
    if (widgetRect.left + menuWidth > viewportWidth - margin) {
        // Align menu to the right edge of the widget
        this.menu.style.left = 'auto';
        this.menu.style.right = '0px';
    }
    
    // Check if menu goes off-screen horizontally (left) - less common if aligning left first
    if (widgetRect.left < margin && this.menu.style.left !== 'auto') {
         // If near left edge, ensure it doesn't go off (might already be handled by right alignment)
         if (widgetRect.left + menuWidth > viewportWidth - margin) { 
             // If it also goes off right, maybe center align? Complex. Sticking to right align for now.
             this.menu.style.left = 'auto';
             this.menu.style.right = '0px';
         } else {
             // Keep left aligned at 0px relative to widget
             this.menu.style.left = '0px';
             this.menu.style.right = 'auto';
         }
    }
  }

  // RESTORED: startDragging method
  startDragging(e) {
    // Only drag if mousedown is on the widget itself or the button, not the menu
    if (e.target === this.widget || this.widget.contains(e.target) && !this.menu.contains(e.target)) {
        // Prevent drag initiation on close button specifically
        if (e.target.classList.contains('env-switcher-close')) return;

        this.isDragging = true;
        // Calculate offset from the top-left corner of the widget
        const rect = this.widget.getBoundingClientRect();
        this.initialX = e.clientX - rect.left;
        this.initialY = e.clientY - rect.top;

        this.widget.style.transition = 'none'; // Disable transitions during drag
        this.widget.style.cursor = 'grabbing';
        document.body.style.cursor = 'grabbing'; // Change body cursor too
        this.closeMenu(); // Close menu when starting drag

        document.addEventListener('mousemove', this.dragBound); // Use bound listener
        document.addEventListener('mouseup', this.stopDraggingBound); // Use bound listener
        
        e.preventDefault(); // Prevent text selection or other default actions
    }
  }

  // RESTORED: drag method
  drag(e) {
    if (!this.isDragging) return;
    e.preventDefault();

    // Calculate new top-left position
    let newX = e.clientX - this.initialX;
    let newY = e.clientY - this.initialY;

    // Get viewport dimensions and widget size
    const maxX = window.innerWidth - this.widget.offsetWidth;
    const maxY = window.innerHeight - this.widget.offsetHeight;

    // Constrain position within viewport boundaries
    newX = Math.max(0, Math.min(newX, maxX));
    newY = Math.max(0, Math.min(newY, maxY));

    // Set position using left/top
    this.widget.style.left = `${newX}px`;
    this.widget.style.top = `${newY}px`;
    // Important: Reset right/bottom to allow left/top to take precedence
    this.widget.style.right = 'auto';
    this.widget.style.bottom = 'auto';
  }

  // Modified stopDragging method
  async stopDragging() {
    if (!this.isDragging) return;
    this.isDragging = false;

    document.removeEventListener('mousemove', this.dragBound); // Use bound listener
    document.removeEventListener('mouseup', this.stopDraggingBound); // Use bound listener

    this.widget.style.transition = ''; // Re-enable transitions if any
    this.widget.style.cursor = 'grab';
    document.body.style.cursor = 'default';

    // Save position (important: save what was set in drag - left/top)
    const finalPosition = {
      left: this.widget.style.left,
      top: this.widget.style.top // Save top instead of bottom
    };
    this.widgetPosition = finalPosition;
    
    try {
        // Only save if position is valid
        if (finalPosition.left && finalPosition.top) {
            await chrome.storage.sync.set({ widgetPosition: finalPosition });
            console.log('Widget position saved:', finalPosition);
        } else {
             console.warn('Widget position not saved, invalid values:', finalPosition);
        }
    } catch (error) {
        console.error('Error saving widget position:', error);
    }
  }

  // RESTORED: toggleMenu method
  toggleMenu(forceVisible = null) {
      if (!this.menu || this.isDragging) return; // Don't toggle if dragging or no menu
      
      const isVisible = this.menu.classList.contains('visible');
      const shouldBeVisible = forceVisible === null ? !isVisible : forceVisible;

      if (shouldBeVisible) {
          // Update content right before showing
          this.updateMenu(); 
          this.menu.classList.add('visible');
          this.menu.setAttribute('aria-hidden', 'false');
          this.button.setAttribute('aria-expanded', 'true');
          this.updateMenuPosition(); // Adjust position after content is populated
      } else {
          this.menu.classList.remove('visible');
          this.menu.setAttribute('aria-hidden', 'true');
          this.button.setAttribute('aria-expanded', 'false');
      }
  }

  // RESTORED: closeMenu method
  closeMenu() {
      this.toggleMenu(false);
  }

  // Add try-catch around openInNewTab storage access in updateMenu's listener
  updateMenu() {
    if (!this.menu) return;

    const menuContent = this.menu.querySelector('.env-switcher-menu-content');
    if (!menuContent) return;

    // Clear existing content
    menuContent.innerHTML = '';

    // Add "Open in New Tab" toggle
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
    
    // Add event listener for toggle
    toggleWrapper.addEventListener('click', async (e) => {
      // Toggle the checkbox state
      toggleInput.checked = !toggleInput.checked;
      this.openInNewTab = toggleInput.checked;
      
      try {
        await chrome.storage.sync.set({ openInNewTab: this.openInNewTab });
        console.log('Open in new tab preference saved:', this.openInNewTab);
      } catch (error) {
        console.error('Error saving openInNewTab preference:', error);
      }
    });
    
    toggleWrapper.appendChild(toggleInput);
    toggleWrapper.appendChild(toggleSlider);
    toggleWrapper.appendChild(toggleLabel);
    
    menuContent.appendChild(toggleWrapper);

    // Add divider
    const divider = document.createElement('hr');
    divider.className = 'env-divider';
    menuContent.appendChild(divider);

    // Filter environments
    let environmentsToDisplay = (this.environments || []).filter(env => env && env.url);
    const currentGroup = this.currentEnv ? this.currentEnv.group : null;
    
    // Exclude the current environment itself
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

    // Filter by the current environment's group if it exists
    if (currentGroup) {
      environmentsToDisplay = environmentsToDisplay.filter(env => env.group === currentGroup);
    }

    // Add environments to menu
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

    // Update menu position after adding items
    this.updateMenuPosition();
  }
  
  // RESTORED: createEnvironmentItem method (was present but might need context)
  createEnvironmentItem(env, currentEnv) {
      const item = document.createElement('div');
      item.className = 'env-switcher-menu-item env-switcher-env-item'; // Added specific class
      item.setAttribute('role', 'menuitem');
      item.setAttribute('aria-label', `Switch to ${env.name}`);
      item.tabIndex = 0; // Make focusable

      const envType = getEnvironmentType(env);
      const iconClass = `env-switcher-menu-item-icon ${envType}`;
      
      const icon = document.createElement('span'); // Use span for icon
      icon.className = iconClass;
      icon.setAttribute('aria-hidden', 'true'); // Hide decorative icon from screen readers

      const name = document.createElement('div');
      name.className = 'env-switcher-menu-item-name'; // Use a distinct class for name
      name.textContent = env.name || ''; // Use env.name directly

      item.appendChild(icon);
      item.appendChild(name);

      // Add click listener
      item.addEventListener('click', () => {
          this.switchToEnvironment(env.url);
      });

      // Add keyboard listener
      item.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
              this.switchToEnvironment(env.url);
              e.preventDefault(); // Prevent space from scrolling
          }
      });

      // Check if this environment matches the current one (useful if filtering logic changes)
      // Note: Current filtering should prevent the exact URL match
      if (currentEnv && env.url === currentEnv.url) {
          item.classList.add('active'); // Add active class if it's the current env
          item.setAttribute('aria-current', 'page');
      }

      return item;
  }

  // Add try-catch around sendMessage in switchToEnvironment
  async switchToEnvironment(targetUrl) {
    console.log(`Requesting switch to URL: ${targetUrl}`);
    try {
      // Use the instance property instead of reading from storage
      const openInNewTab = this.openInNewTab;
      console.log(`'Open in New Tab' state: ${openInNewTab}`);

      // 2. Construct the final URL (keeping the path)
      const currentUrlObj = new URL(window.location.href);
      const path = currentUrlObj.pathname + currentUrlObj.search + currentUrlObj.hash;
      const targetUrlObj = new URL(targetUrl);
      targetUrlObj.pathname = path;
      targetUrlObj.search = ''; // Clear search/hash for consistency often
      targetUrlObj.hash = '';
      const finalUrl = targetUrlObj.toString();
      console.log(`Final URL constructed: ${finalUrl}`);

      // 3. Send message to background script to handle tab switching
      chrome.runtime.sendMessage(
        { 
          action: 'switchTab', 
          url: finalUrl, 
          openInNewTab: openInNewTab 
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('Error sending switchTab message:', chrome.runtime.lastError.message);
            alert('Could not communicate with the extension background.');
          } else {
            console.log('Background script response:', response);
          }
        }
      );
      
      // 4. Close the menu locally
      this.closeMenu(); 

    } catch (error) {
      console.error('Error preparing environment switch:', error);
      alert('Error constructing URL for switching: ' + error.message);
    }
  }

  // Modified setupEventListeners to include necessary listeners
  setupEventListeners() {
    if (!this.widget) {
      console.error('❌ Cannot setup listeners, widget not created.');
      return;
    }
    
    console.log('🎯 Setting up event listeners:', {
      timestamp: new Date().toISOString(),
      widgetExists: !!this.widget,
      widgetVisible: this.widgetVisible
    });
    
    // Listen for storage changes
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync' && changes.widgetVisible) {
        console.log('💾 Storage Changed:', {
          newVisibility: changes.widgetVisible.newValue ? 'VISIBLE' : 'HIDDEN',
          oldVisibility: changes.widgetVisible.oldValue ? 'VISIBLE' : 'HIDDEN',
          timestamp: new Date().toISOString()
        });
        this.setVisibility(changes.widgetVisible.newValue);
      }
    });

    // Listen for messages
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('📨 Widget Received Message:', {
        action: message.action,
        isVisible: message.isVisible,
        sender: sender,
        timestamp: new Date().toISOString()
      });
      
      if (message.action === 'updateWidgetVisibility') {
        console.log('👁️ Updating Widget Visibility from Message:', {
          newState: message.isVisible ? 'VISIBLE' : 'HIDDEN',
          currentState: this.widgetVisible,
          timestamp: new Date().toISOString()
        });
        
        // Update storage first
        chrome.storage.sync.set({ widgetVisible: message.isVisible }, () => {
          if (chrome.runtime.lastError) {
            console.error('❌ Error updating storage:', chrome.runtime.lastError);
          } else {
            console.log('💾 Storage updated to match visibility state');
            // Then update widget visibility
            this.setVisibility(message.isVisible);
            sendResponse({ 
              success: true,
              timestamp: new Date().toISOString(),
              widgetVisible: this.widgetVisible
            });
          }
        });
        return true; // Keep the message channel open for the async response
      }
      return false;
    });

    // Button click to toggle menu
    this.button.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMenu();
    });
    
    // Close button listener
    const closeButton = this.widget.querySelector('.env-switcher-close');
    if (closeButton) {
      closeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log('🔴 Close Button Clicked:', {
          timestamp: new Date().toISOString(),
          currentVisibility: this.widgetVisible
        });
        this.setVisibility(false);
      });
    }
    
    // Close menu if clicking outside the widget
    document.addEventListener('click', (e) => {
      if (this.widget && !this.widget.contains(e.target) && this.menu.classList.contains('visible')) {
        this.closeMenu();
      }
    });

    // Drag listeners on the widget
    this.widget.addEventListener('mousedown', (e) => this.startDragging(e));

    // Update menu position on window resize
    window.addEventListener('resize', () => this.updateMenuPosition());

    // Add visibility change listener
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        // When page becomes visible, check storage state
        chrome.storage.sync.get(['widgetVisible'], (result) => {
          const shouldBeVisible = result.widgetVisible !== false;
          if (shouldBeVisible !== this.widgetVisible) {
            this.setVisibility(shouldBeVisible);
          }
        });
      }
    });
  }

  setVisibility(visible) {
    console.log('👁️ Setting Widget Visibility:', {
      newState: visible ? 'VISIBLE' : 'HIDDEN',
      currentState: this.widgetVisible,
      timestamp: new Date().toISOString(),
      widgetExists: !!this.widget,
      widgetDisplay: this.widget?.style.display
    });
    
    this.widgetVisible = visible;
    
    if (visible) {
      // If turning on and widget doesn't exist, create it
      if (!this.widget) {
        console.log('🔄 Widget does not exist, creating new instance');
        this.init();
        return;
      }
      
      // Show the widget
      this.widget.style.display = 'block';
      console.log('✅ Widget displayed');
    } else {
      // If turning off and widget exists, hide it
      if (this.widget) {
        this.widget.style.display = 'none';
        console.log('✅ Widget hidden');
        
        // Update storage to match visibility state
        try {
          if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
            chrome.storage.sync.set({ widgetVisible: false }, () => {
              if (chrome.runtime.lastError) {
                console.log('💾 Storage update skipped (extension context invalidated)');
              } else {
                console.log('💾 Storage updated to match visibility state');
              }
            });
          } else {
            console.log('💾 Storage update skipped (extension context invalidated)');
          }
        } catch (error) {
          console.log('💾 Storage update skipped (extension context invalidated)');
        }
      }
    }
    
    // If hiding, also close the menu
    if (!visible) {
      this.closeMenu();
    }
  }
  
  // RESTORED: generateColor (or keep if it existed)
  generateColor(name) {
    // Basic placeholder, can be replaced with previous logic if needed
    let hash = 0;
    name = name || ''; // Handle null/undefined names
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
      hash = hash & hash; // Convert to 32bit integer
    }
    const color = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return "#" + "00000".substring(0, 6 - color.length) + color;
  }
}

// Initialize widget when the DOM is ready
let widgetInstance = null;

async function initializeWidget() {
  console.log('🔄 Initializing widget...');
  
  try {
    // Check storage state directly
    const storage = await chrome.storage.sync.get(['widgetVisible', 'environments']);
    const shouldBeVisible = storage.widgetVisible !== false;
    console.log('📋 Storage state:', { shouldBeVisible, environments: storage.environments?.length });
    
    // Destroy existing instance if it exists
    if (widgetInstance) {
      console.log('🗑️ Destroying existing widget instance');
      if (widgetInstance.widget && widgetInstance.widget.parentNode) {
        widgetInstance.widget.parentNode.removeChild(widgetInstance.widget);
      }
      widgetInstance = null;
    }
    
    // Create new instance if widget should be visible
    if (shouldBeVisible) {
      console.log('🔄 Creating new widget instance');
      widgetInstance = new FloatingWidget();
      
      // Ensure widget is visible
      if (widgetInstance && widgetInstance.widget) {
        console.log('👁️ Setting initial visibility to true');
        widgetInstance.setVisibility(true);
      }
    }
  } catch (error) {
    console.error('❌ Error initializing widget:', error);
  }
}

// Listen for messages at the global level
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Global message listener received:', message);
  
  if (message.action === 'updateWidgetVisibility') {
    console.log('👁️ Updating widget visibility:', message.isVisible);
    
    if (message.isVisible) {
      // If turning on, create new instance if needed
      if (!widgetInstance) {
        console.log('🔄 Creating new widget instance');
        widgetInstance = new FloatingWidget();
      } else {
        // If instance exists, just update visibility
        widgetInstance.setVisibility(true);
      }
    } else {
      // If turning off, update visibility
      if (widgetInstance) {
        widgetInstance.setVisibility(false);
      }
    }
    
    sendResponse({ success: true });
    return true;
  }
  return false;
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && changes.widgetVisible) {
    console.log('💾 Storage changed:', changes.widgetVisible.newValue);
    
    if (changes.widgetVisible.newValue) {
      // If turning on, create new instance if needed
      if (!widgetInstance) {
        console.log('🔄 Creating new widget instance');
        widgetInstance = new FloatingWidget();
      } else {
        // If instance exists, just update visibility
        widgetInstance.setVisibility(true);
      }
    } else {
      // If turning off, update visibility
      if (widgetInstance) {
        widgetInstance.setVisibility(false);
      }
    }
  }
});

// Initialize immediately if DOM is ready, otherwise wait for DOMContentLoaded
if (document.readyState === 'loading') {
  console.log('⏳ DOM still loading, waiting for DOMContentLoaded...');
  document.addEventListener('DOMContentLoaded', initializeWidget);
} else {
  console.log('✅ DOM already loaded, initializing immediately');
  initializeWidget();
} 