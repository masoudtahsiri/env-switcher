class EnvironmentLoader {
  constructor() {
    this.env1Container = document.getElementById('environment1');
    this.env2Container = document.getElementById('environment2');
    this.env1Frame = null;
    this.env2Frame = null;
    this.scrollLockEnabled = false;
    
    // Initialize scroll lock button
    this.scrollLockBtn = document.getElementById('scrollLockBtn');
    if (this.scrollLockBtn) {
      this.scrollLockBtn.addEventListener('click', () => this.toggleScrollLock());
    }
    
    // Set up message listener for iframe communication
    window.addEventListener('message', this.handleMessage.bind(this));
    
    console.log('[EnvironmentLoader] Initialized');
  }
  
  toggleScrollLock() {
    this.scrollLockEnabled = !this.scrollLockEnabled;
    this.scrollLockBtn.classList.toggle('active', this.scrollLockEnabled);
    
    // Update scroll lock state in wrappers
    this.broadcastScrollLockState();
    
    console.log('[EnvironmentLoader] Scroll lock toggled:', this.scrollLockEnabled);
  }
  
  broadcastScrollLockState() {
    // Send scroll lock state to both wrappers
    const message = {
      type: 'scrollLockState',
      active: this.scrollLockEnabled
    };
    
    if (this.env1Frame && this.env1Frame.contentWindow) {
      this.env1Frame.contentWindow.postMessage(message, '*');
    }
    
    if (this.env2Frame && this.env2Frame.contentWindow) {
      this.env2Frame.contentWindow.postMessage(message, '*');
    }
  }
  
  handleMessage(event) {
    if (!event.data || !event.data.type) return;
    
    const { type, frameId } = event.data;
    
    if (type === 'loaded') {
      console.log(`[EnvironmentLoader] Frame ${frameId} reported loaded`);
      this.hideLoadingIndicator(frameId);
      
      // After both frames are loaded, broadcast scroll lock state
      if (this.env1Frame && this.env2Frame) {
        this.broadcastScrollLockState();
      }
    }
    
    if (type === 'scroll' && this.scrollLockEnabled) {
      // Handle scroll synchronization
      if (frameId === 'env1') {
        console.log('[EnvironmentLoader] Syncing scroll from env1 to env2');
        this.syncScroll(event.data, this.env2Frame);
      } else if (frameId === 'env2') {
        console.log('[EnvironmentLoader] Syncing scroll from env2 to env1');
        this.syncScroll(event.data, this.env1Frame);
      }
    }
  }
  
  syncScroll(scrollData, targetFrame) {
    if (!targetFrame || !targetFrame.contentWindow) {
      console.error('[EnvironmentLoader] Target frame not available for scroll sync');
      return;
    }
    
    // Forward the scroll data to the target frame
    targetFrame.contentWindow.postMessage(scrollData, '*');
  }
  
  hideLoadingIndicator(frameId) {
    const container = frameId === 'env1' ? this.env1Container : this.env2Container;
    const loadingIndicator = container.querySelector('.loading-indicator');
    if (loadingIndicator) {
      loadingIndicator.style.display = 'none';
    }
  }
  
  showLoadingIndicator(frameId) {
    const container = frameId === 'env1' ? this.env1Container : this.env2Container;
    const loadingIndicator = container.querySelector('.loading-indicator');
    if (loadingIndicator) {
      loadingIndicator.style.display = 'flex';
    }
  }

  loadEnvironment(container, url, frameId) {
    if (!url) {
      console.error(`[EnvironmentLoader] No URL provided for ${frameId}`);
      return;
    }
    
    console.log(`[EnvironmentLoader] Loading ${frameId} with URL:`, url);
    
    try {
      // Create wrapper iframe that will contain the actual site iframe
      const wrapperFrame = document.createElement('iframe');
      wrapperFrame.className = 'wrapper-frame';
      wrapperFrame.style.width = '100%';
      wrapperFrame.style.height = '100%';
      wrapperFrame.style.border = 'none';
      
      // Add data attributes for the wrapper script
      const wrapperScriptUrl = chrome.runtime.getURL('comparison/js/wrapper.js');
      
      // Create wrapper HTML content
      const wrapperContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${frameId} Wrapper</title>
          <style>
            body, html {
              margin: 0;
              padding: 0;
              height: 100%;
              width: 100%;
              overflow: auto;
            }
            iframe {
              width: 100%;
              height: 100%;
              border: none;
            }
          </style>
        </head>
        <body>
          <iframe></iframe>
          <script src="${wrapperScriptUrl}" data-frame-id="${frameId}" data-url="${url}"></script>
        </body>
        </html>
      `;
      
      // Create a blob URL for the wrapper document
      const blob = new Blob([wrapperContent], {type: 'text/html'});
      const blobUrl = URL.createObjectURL(blob);
      
      // Set the wrapper frame source to the blob URL
      wrapperFrame.src = blobUrl;
      
      // Clear container and add wrapper frame
      container.innerHTML = `
        <div class="loading-indicator">
          <div class="spinner"></div>
          <div>Loading...</div>
        </div>
      `;
      container.appendChild(wrapperFrame);
      
      // Store reference to the wrapper frame
      if (frameId === 'env1') {
        this.env1Frame = wrapperFrame;
      } else if (frameId === 'env2') {
        this.env2Frame = wrapperFrame;
      }
      
      // Show loading indicator
      this.showLoadingIndicator(frameId);
      
      // Clean up blob URL when frame is loaded
      wrapperFrame.onload = () => {
        URL.revokeObjectURL(blobUrl);
      };
      
      console.log(`[EnvironmentLoader] Setup complete for ${frameId}`);
    } catch (error) {
      console.error(`[EnvironmentLoader] Error loading ${frameId}:`, error);
      container.innerHTML = `<div class="error-message">Error loading environment: ${error.message}</div>`;
    }
  }

  init() {
    // Get URLs from query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const env1Url = urlParams.get('env1');
    const env2Url = urlParams.get('env2');
    
    console.log('[EnvironmentLoader] Initializing with URLs:', { env1Url, env2Url });
    
    if (!env1Url || !env2Url) {
      console.error('[EnvironmentLoader] Missing environment URLs');
      this.env1Container.innerHTML = '<div class="error-message">Error: Missing environment URLs</div>';
      this.env2Container.innerHTML = '<div class="error-message">Error: Missing environment URLs</div>';
      return;
    }
    
    // Load environments
    this.loadEnvironment(this.env1Container, decodeURIComponent(env1Url), 'env1');
    this.loadEnvironment(this.env2Container, decodeURIComponent(env2Url), 'env2');
  }
}

document.addEventListener('DOMContentLoaded', function() {
  console.log('[Comparison] DOM content loaded, initializing environment loader');
  const environmentLoader = new EnvironmentLoader();
  environmentLoader.init();
}); 