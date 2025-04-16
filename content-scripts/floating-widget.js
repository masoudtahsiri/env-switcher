class FloatingWidget {
  constructor() {
    this.widget = null;
    this.button = null;
    this.menu = null;
    this.currentEnv = null;
    this.environments = [];
    this.openInNewTab = false;
    this.isDragging = false;
    this.currentX = 0;
    this.currentY = 0;
    this.initialX = 0;
    this.initialY = 0;
    this.init();
  }

  async init() {
    try {
      // Get environments from storage
      const storage = await chrome.storage.sync.get(['environments', 'widgetPosition', 'widgetVisible']);
      console.log('Storage data:', storage);
      
      this.environments = storage.environments || [];
      
      // Get current environment
      const currentUrl = window.location.href;
      
      // Find current environment by matching the URL
      this.currentEnv = this.environments.find(env => {
        try {
          const currentUrlLower = currentUrl.toLowerCase();
          const baseUrlLower = env.baseUrl.toLowerCase();
          return currentUrlLower.includes(baseUrlLower.replace(/https?:\/\/(www\.)?/, ''));
        } catch (e) {
          console.error('Error matching environment:', e);
          return false;
        }
      });

      // Create widget elements
      this.createWidget();

      // Set saved position if exists
      if (storage.widgetPosition) {
        this.widget.style.top = storage.widgetPosition.top;
        this.widget.style.left = storage.widgetPosition.left;
        this.widget.style.bottom = storage.widgetPosition.bottom;
        this.widget.style.right = storage.widgetPosition.right;
      }

      // Add drag event listeners to the button
      this.button.addEventListener('mousedown', (e) => this.startDragging(e));
      document.addEventListener('mousemove', (e) => this.drag(e));
      document.addEventListener('mouseup', () => this.stopDragging());

      // Add click listener for menu toggle
      this.button.addEventListener('click', (e) => {
        if (!this.isDragging) {
          e.stopPropagation();
          this.toggleMenu();
        }
      });

      // Close menu when clicking outside
      document.addEventListener('click', (e) => {
        if (!this.widget.contains(e.target)) {
          this.closeMenu();
        }
      });

      // Update menu position on window resize
      window.addEventListener('resize', () => this.updateMenuPosition());

      // Load visibility state
      this.loadVisibilityState();

      // Setup event listeners
      this.setupEventListeners();
    } catch (error) {
      console.error('Error initializing widget:', error);
    }
  }

  async loadVisibilityState() {
    const { widgetVisible = true } = await chrome.storage.sync.get('widgetVisible');
    this.setVisibility(widgetVisible);
  }

  updateMenuPosition() {
    const rect = this.widget.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Remove all position classes
    this.menu.classList.remove(
      'position-top',
      'position-bottom',
      'position-left',
      'position-right'
    );

    // Default to position-top
    let position = 'position-top';

    // If widget is near the top of the viewport, position menu below
    if (rect.top < 100) {
      position = 'position-bottom';
    }

    // If widget is near the left edge, position menu to the right
    if (rect.left < 100) {
      position = 'position-right';
    }

    // If widget is near the right edge, position menu to the left
    if (viewportWidth - rect.right < 100) {
      position = 'position-left';
    }

    this.menu.classList.add(position);
  }

  startDragging(e) {
    if (e.target === this.button) {
      this.isDragging = true;
      
      const rect = this.widget.getBoundingClientRect();
      this.initialX = e.clientX - rect.left;
      this.initialY = e.clientY - rect.top;
      
      this.widget.style.transition = 'none';
      this.closeMenu();
      
      e.preventDefault(); // Prevent text selection
    }
  }

  drag(e) {
    if (!this.isDragging) return;
    
    e.preventDefault();
    
    const x = e.clientX - this.initialX;
    const y = e.clientY - this.initialY;
    
    const maxX = window.innerWidth - this.widget.offsetWidth;
    const maxY = window.innerHeight - this.widget.offsetHeight;
    
    const boundedX = Math.min(Math.max(0, x), maxX);
    const boundedY = Math.min(Math.max(0, y), maxY);
    
    this.widget.style.left = `${boundedX}px`;
    this.widget.style.top = `${boundedY}px`;
    this.widget.style.right = 'auto';
    this.widget.style.bottom = 'auto';
  }

  async stopDragging() {
    if (!this.isDragging) return;
    
    this.isDragging = false;
    
    const position = {
      top: this.widget.style.top,
      left: this.widget.style.left,
      bottom: this.widget.style.bottom,
      right: this.widget.style.right
    };
    
    await chrome.storage.sync.set({ widgetPosition: position });
    this.widget.style.transition = '';
  }

  toggleMenu() {
    if (!this.isDragging) {
      const isActive = this.menu.classList.contains('active');
      if (!isActive) {
        this.updateMenuPosition();
        this.updateMenu();
      }
      this.menu.classList.toggle('active');
    }
  }

  closeMenu() {
    this.menu.classList.remove('active');
  }

  createWidget() {
    // Create main widget container
    this.widget = document.createElement('div');
    this.widget.className = 'env-switcher-widget';
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.className = 'env-switcher-close';
    closeButton.innerHTML = '×';
    closeButton.title = 'Hide Widget';
    
    // Create main button
    this.button = document.createElement('button');
    this.button.className = 'env-switcher-button';
    this.button.innerHTML = '🔄';
    
    // Create menu
    this.menu = document.createElement('div');
    this.menu.className = 'env-switcher-menu';
    
    // Add elements to DOM
    this.widget.appendChild(closeButton);
    this.widget.appendChild(this.button);
    this.widget.appendChild(this.menu);
    
    document.body.appendChild(this.widget);

    // Populate menu
    this.updateMenu();
  }

  updateMenu() {
    // Clear the menu
    this.menu.innerHTML = '';

    // Create checkbox for new tab option
    const checkboxContainer = document.createElement('div');
    checkboxContainer.className = 'env-switcher-menu-item';
    
    const label = document.createElement('label');
    label.style.display = 'flex';
    label.style.alignItems = 'center';
    label.style.cursor = 'pointer';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.style.marginRight = '8px';
    checkbox.checked = this.openInNewTab;
    checkbox.addEventListener('change', (e) => {
      this.openInNewTab = e.target.checked;
      e.stopPropagation();
    });
    
    const span = document.createElement('span');
    span.textContent = 'Open in new tab';
    
    label.appendChild(checkbox);
    label.appendChild(span);
    checkboxContainer.appendChild(label);
    this.menu.appendChild(checkboxContainer);

    // Add environment items
    if (this.currentEnv) {
      // Find the other environment (not current one)
      const otherEnv = this.environments.find(env => 
        env.name !== this.currentEnv.name
      );
      
      if (otherEnv) {
        const item = document.createElement('div');
        item.className = 'env-switcher-menu-item';

        const icon = document.createElement('span');
        icon.className = `env-switcher-menu-item-icon ${otherEnv.name.toLowerCase()}`;
        
        const text = document.createElement('span');
        text.textContent = otherEnv.name;

        item.appendChild(icon);
        item.appendChild(text);
        item.addEventListener('click', () => this.switchEnvironment(otherEnv));
        
        this.menu.appendChild(item);
      } else {
        const noEnvMessage = document.createElement('div');
        noEnvMessage.className = 'env-switcher-menu-item';
        noEnvMessage.style.opacity = '0.7';
        noEnvMessage.style.fontStyle = 'italic';
        noEnvMessage.textContent = 'No other environments available';
        this.menu.appendChild(noEnvMessage);
      }
    } else {
      const noEnvMessage = document.createElement('div');
      noEnvMessage.className = 'env-switcher-menu-item';
      noEnvMessage.style.opacity = '0.7';
      noEnvMessage.style.fontStyle = 'italic';
      noEnvMessage.textContent = 'Current environment not detected';
      this.menu.appendChild(noEnvMessage);
    }
  }

  async switchEnvironment(targetEnv) {
    if (!this.currentEnv) {
      console.error('Could not determine current environment');
      return;
    }

    try {
      // Extract the path from the current URL
      const currentUrl = window.location.href;
      const urlObj = new URL(currentUrl);
      const path = urlObj.pathname + urlObj.search + urlObj.hash;
      
      // Construct the new URL
      const newUrl = targetEnv.baseUrl.replace(/\/$/, '') + path;
      
      // Open URL based on checkbox state
      if (this.openInNewTab) {
        chrome.runtime.sendMessage({
          action: 'openNewTab',
          url: newUrl
        });
      } else {
        window.location.href = newUrl;
      }
      
      this.closeMenu();
    } catch (error) {
      console.error('Error switching environment:', error);
      alert('Error switching environment: ' + error.message);
    }
  }

  setupEventListeners() {
    // Add close button listener
    this.widget.querySelector('.env-switcher-close').addEventListener('click', async () => {
      await chrome.storage.sync.set({ widgetVisible: false });
      this.setVisibility(false);
    });

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'toggleWidget') {
        this.setVisibility(message.visible);
      }
    });
  }

  setVisibility(visible) {
    this.widget.style.display = visible ? 'block' : 'none';
  }
}

// Initialize widget
new FloatingWidget(); 