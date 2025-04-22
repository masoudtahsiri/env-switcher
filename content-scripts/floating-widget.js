class FloatingWidget {
  constructor() {
    this.widget = null;
    this.button = null;
    this.menu = null;
    this.currentEnv = null;
    this.environments = [];
    this.openInNewTab = false;
    this.isDragging = false;
    this.widgetPosition = null; // Initialize position
    this.widgetVisible = true; // Initialize visibility
    this.showWidgetEvenWithoutMatch = true; // Let's default to showing it

    // Bind methods that will be used as event listeners
    this.dragBound = this.drag.bind(this);
    this.stopDraggingBound = this.stopDragging.bind(this);

    this.init();
  }

  async init() {
    try {
      // Get current URL and environments
      const currentUrl = window.location.href;
      const storage = await chrome.storage.sync.get(['environments', 'widgetPosition', 'openInNewTab', 'widgetVisible']);
      this.environments = storage.environments || [];
      this.widgetPosition = storage.widgetPosition;
      this.openInNewTab = storage.openInNewTab || false;
      this.widgetVisible = storage.widgetVisible !== false;
      
      // Check if current URL matches any environment
      const currentEnv = this.matchCurrentEnvironment(currentUrl, this.environments);
      
      if (!currentEnv) {
        console.log('No matching environment found for current URL:', currentUrl);
        return; // Don't create widget if no matching environment
      }
      
      console.log('Current environment:', currentEnv.name);
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
      
      // Set initial visibility
      this.setVisibility(this.widgetVisible);
      
    } catch (error) {
      console.error('Error initializing widget:', error);
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
        console.warn('Widget already created.');
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
    // Find menu content container *inside* this method now
    const menuContent = this.widget.querySelector('.env-switcher-menu-content');
    if (!menuContent) {
      console.error('Menu content container not found during updateMenu');
      return; 
    }
    
    menuContent.innerHTML = ''; // Clear previous content
    menuContent.setAttribute('role', 'menu');
    menuContent.setAttribute('aria-label', 'Environment Actions'); // General label for the menu

    // --- 1. "Open in New Tab" Section (Pinned Top) ---
    const checkboxContainer = document.createElement('div');
    checkboxContainer.className = 'env-switcher-menu-item env-switcher-setting-item'; // Added specific class
    checkboxContainer.setAttribute('role', 'menuitemcheckbox');
    checkboxContainer.setAttribute('aria-label', 'Open in New Tab setting');
    checkboxContainer.setAttribute('aria-checked', this.openInNewTab.toString());
    checkboxContainer.tabIndex = 0; // Make it focusable

    const newTabCheckbox = document.createElement('input');
    newTabCheckbox.type = 'checkbox';
    newTabCheckbox.id = 'new-tab-checkbox'; // Keep ID for label association
    newTabCheckbox.checked = this.openInNewTab;
    newTabCheckbox.tabIndex = -1; // Prevent double tabbing

    const checkboxLabel = document.createElement('label');
    checkboxLabel.htmlFor = 'new-tab-checkbox';
    checkboxLabel.textContent = 'Open in New Tab';

    checkboxContainer.appendChild(newTabCheckbox);
    checkboxContainer.appendChild(checkboxLabel);
    menuContent.appendChild(checkboxContainer);

    // Add click/keyboard listener for the container
    checkboxContainer.addEventListener('click', async () => { // Make listener async
        this.openInNewTab = !this.openInNewTab;
        newTabCheckbox.checked = this.openInNewTab;
        checkboxContainer.setAttribute('aria-checked', this.openInNewTab.toString());
        try {
            await chrome.storage.sync.set({ openInNewTab: this.openInNewTab });
        } catch (error) {
             console.error('Error saving openInNewTab setting:', error);
             // Optionally revert the UI change if saving fails
             // this.openInNewTab = !this.openInNewTab; 
             // newTabCheckbox.checked = this.openInNewTab;
             // checkboxContainer.setAttribute('aria-checked', this.openInNewTab.toString());
        }
    });
    checkboxContainer.addEventListener('keydown', (e) => {
         if (e.key === 'Enter' || e.key === ' ') {
             checkboxContainer.click();
             e.preventDefault();
         }
    });


    // --- Divider 1 ---
    const divider1 = document.createElement('div');
    divider1.className = 'env-switcher-menu-divider';
    menuContent.appendChild(divider1);

    // --- Filtering and Grouping Logic ---
    let environmentsToDisplay = (this.environments || []).filter(env => env && env.url);
    const currentGroup = this.currentEnv ? this.currentEnv.group : null;
    
    // Exclude the current environment itself
    if (this.currentEnv) {
        environmentsToDisplay = environmentsToDisplay.filter(env => {
            // Robust check for URL equality
             try {
                const currentOrigin = new URL(this.currentEnv.url).origin;
                const envOrigin = new URL(env.url).origin;
                return currentOrigin !== envOrigin;
            } catch (e) {
                // Fallback to string comparison if URL parsing fails
                return env.url !== this.currentEnv.url;
            }
        });
    }

    // Filter by the current environment's group if it exists
    if (currentGroup) {
        environmentsToDisplay = environmentsToDisplay.filter(env => env.group === currentGroup);
    } 

    // --- 3. Environment List Items ---
    if (environmentsToDisplay.length > 0) {
        environmentsToDisplay.forEach(env => {
            const envItem = this.createEnvironmentItem(env, this.currentEnv);
            menuContent.appendChild(envItem);
        });
    } else {
        const noEnvMessage = document.createElement('div');
        noEnvMessage.className = 'env-switcher-menu-no-envs';
        if (currentGroup) {
            noEnvMessage.textContent = 'No other environments in this group.';
        } else {
             noEnvMessage.textContent = 'No environments available to switch to.';
        }
        menuContent.appendChild(noEnvMessage);
    }
  }
  
  // RESTORED: createEnvironmentItem method (was present but might need context)
  createEnvironmentItem(env, currentEnv) {
      const item = document.createElement('div');
      item.className = 'env-switcher-menu-item env-switcher-env-item'; // Added specific class
      item.setAttribute('role', 'menuitem');
      item.setAttribute('aria-label', `Switch to ${env.name}`);
      item.tabIndex = 0; // Make focusable

      const icon = document.createElement('span'); // Use span for icon
      icon.className = 'env-switcher-menu-item-icon';
      icon.setAttribute('aria-hidden', 'true'); // Hide decorative icon from screen readers

      // Basic icon logic based on name (can be expanded)
      if (env.name && env.name.toLowerCase().includes('staging')) {
          icon.textContent = '🟡';
      } else if (env.name && env.name.toLowerCase().includes('production')) {
          icon.textContent = '🟢';
      } else {
          // Default icon or color logic (e.g., based on generateColor)
          // For now, a generic dot or leave empty if no match
          icon.textContent = '🔹'; // Default blue dot
      }

      const name = document.createElement('div');
      name.className = 'env-switcher-menu-item-name';
      // Capitalize the first letter of the environment name
      name.textContent = env.name ? env.name.charAt(0).toUpperCase() + env.name.slice(1) : '';

      item.appendChild(icon);
      item.appendChild(name);

      // Add click listener
      item.addEventListener('click', () => {
          this.switchToEnvironment(env);
      });

      // Add keyboard listener
      item.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
              this.switchToEnvironment(env);
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
  switchToEnvironment(env) {
    console.log('Switching to environment:', env.name, 'URL:', env.url);
    if (env.url) {
      try {
        const currentUrl = window.location.href;
        const currentUrlObj = new URL(currentUrl);
        const path = currentUrlObj.pathname + currentUrlObj.search + currentUrlObj.hash;
        const targetUrlObj = new URL(env.url);
        targetUrlObj.pathname = path; 
        const newUrl = targetUrlObj.toString();
        
        console.log('URL Construction:', { /* ... */ });
        
        if (this.openInNewTab) {
          try {
            chrome.runtime.sendMessage({
              action: 'openNewTab',
              url: newUrl
            });
            // Removed the callback function that was causing the error
          } catch (error) {
             console.error('Synchronous error calling sendMessage (rare):', error);
             alert('Error trying to open in new tab: ' + error.message);
          }
        } else {
          window.location.href = newUrl;
        }
      } catch (error) {
        console.error('Error constructing URL or switching environment:', error);
        alert('Error switching environment: ' + error.message);
      }
    }
    this.toggleMenu(false); // Close menu after switch
  }

  // Modified setupEventListeners to include necessary listeners
  setupEventListeners() {
    if (!this.widget) {
        console.error('Cannot setup listeners, widget not created.');
        return;
    }
    
    // Button click to toggle menu
    this.button.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent click from closing menu immediately
        this.toggleMenu();
    });
    
    // Close button listener
    const closeButton = this.widget.querySelector('.env-switcher-close');
    if (closeButton) {
        closeButton.addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
                await chrome.storage.sync.set({ widgetVisible: false });
                this.setVisibility(false);
            } catch (error) {
                console.error('Error setting widgetVisible to false:', error);
                this.setVisibility(false); 
            }
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
    // Note: move and up listeners are added dynamically in startDragging

    // Update menu position on window resize
    window.addEventListener('resize', () => this.updateMenuPosition());

    // Listen for messages from popup
    try {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
          if (!this.widget) return; 
          
          if (message.action === 'toggleWidget') {
            this.setVisibility(message.visible);
          }
        });
    } catch (error) {
        console.error('Error adding runtime message listener:', error);
    }
  }
  
  setVisibility(visible) {
    console.log('[DEBUG] setVisibility called with:', visible);
    if (this.widget) { 
        this.widget.style.display = visible ? 'block' : 'none';
        this.widgetVisible = visible; 
    } else {
        console.warn('setVisibility called but widget does not exist');
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

// Initialize widget
try {
    new FloatingWidget(); 
} catch (error) {
    console.error('Critical error initializing FloatingWidget:', error);
} 