console.log('Initializing comparison...');

class EnvironmentLoader {
  constructor() {
    this.scrollLockEnabled = false;
    this.isScrolling = false;
    this.scrollListeners = {}; // Store bound event listeners
    this.iframes = {}; // Store iframe references
    this.setupScrollLock();
  }

  setupScrollLock() {
    const scrollLockButton = document.getElementById('scroll-lock');
    if (scrollLockButton) {
      scrollLockButton.addEventListener('click', () => {
        this.scrollLockEnabled = !this.scrollLockEnabled;
        scrollLockButton.classList.toggle('active', this.scrollLockEnabled);
        scrollLockButton.textContent = this.scrollLockEnabled ? 'Unlock Scroll' : 'Lock Scroll';
        console.log('Scroll lock toggled:', this.scrollLockEnabled);

        if (this.scrollLockEnabled) {
          this.setupScrollSyncWrappers();
        } else {
          this.removeScrollSync();
        }
      });
    }
  }

  // Sets up the wrapper/transform structure for scroll sync
  setupScrollSyncWrappers() {
    console.log("Setting up scroll sync wrappers");

    // Register iframe references
    this.iframes['env1'] = document.getElementById('env1-frame');
    this.iframes['env2'] = document.getElementById('env2-frame');

    // Check for cross-origin restrictions
    try {
      // Try to access contentDocument to see if we hit a cross-origin restriction
      const env1Document = this.iframes['env1'].contentDocument;
      const env2Document = this.iframes['env2'].contentDocument;
      console.log("Same-origin frames detected, using transform-based scroll sync");
    } catch (e) {
      console.warn("Cross-origin frames detected, using fallback scroll sync method");
      this.setupFallbackScrollSync();
      return;
    }

    ['env1', 'env2'].forEach(envId => {
      const frame = this.iframes[envId];
      const container = frame.closest('.env-frame-container');

      if (!frame) {
        console.error(`Cannot find frame for ${envId}`);
        return;
      }
      if (!container) {
        console.error(`Cannot find container for frame ${envId}`);
        return;
      }

      // If frame is already inside a wrapper, just ensure it's scrollable
      if (frame.parentNode?.id === `${envId}-scroll-wrapper`) {
        console.log(`Wrapper already exists for ${envId}, ensuring scrollable.`);
        frame.parentNode.style.overflowY = 'scroll';
        container.style.overflow = 'hidden'; // Ensure container clips
        // Re-attach listener if needed
        if (!this.scrollListeners[envId]) {
          this.scrollListeners[envId] = this.handleWrapperScroll.bind(this, envId);
          frame.parentNode.addEventListener('scroll', this.scrollListeners[envId]);
        }
        return;
      }

      // 1. Create the scroll wrapper
      console.log(`Creating scroll wrapper for ${envId}`);
      const wrapper = document.createElement('div');
      wrapper.id = `${envId}-scroll-wrapper`;
      wrapper.className = 'scroll-wrapper';
      wrapper.style.overflowY = 'scroll'; // Make wrapper scrollable
      wrapper.style.width = '100%';
      wrapper.style.height = '100%';
      wrapper.style.position = 'relative';

      // 2. Move the iframe inside the wrapper
      container.appendChild(wrapper); // Add wrapper to container first
      wrapper.appendChild(frame); // Move frame into wrapper

      // 3. Style the iframe for transform scrolling
      frame.style.position = 'absolute';
      frame.style.top = '0';
      frame.style.left = '0';
      frame.style.width = '100%';
      frame.style.height = '10000px'; // Large height to ensure scrollability
      frame.style.overflow = 'hidden';
      frame.style.transform = `translateY(-${wrapper.scrollTop}px)`;

      // 4. Style the container to clip the transformed iframe
      container.style.overflow = 'hidden'; // **IMPORTANT**

      // 5. Add scroll listener (store reference)
      if (!this.scrollListeners[envId]) {
        this.scrollListeners[envId] = this.handleWrapperScroll.bind(this, envId);
      }
      wrapper.removeEventListener('scroll', this.scrollListeners[envId]); // Avoid duplicates
      wrapper.addEventListener('scroll', this.scrollListeners[envId]);

      console.log(`Wrapper and listener set up for ${envId}`);
    });
  }

  // Sets up a fallback scroll sync for cross-origin iframes
  setupFallbackScrollSync() {
    console.log("Setting up fallback scroll sync for cross-origin iframes");
    
    const env1Frame = this.iframes['env1'];
    const env2Frame = this.iframes['env2'];
    
    if (!env1Frame || !env2Frame) {
      console.error("Could not find frames for fallback scroll sync");
      return;
    }
    
    // Use main window's wheel events to control iframe scrolling
    const handleWheelEvent = (e) => {
      if (!this.scrollLockEnabled) return;
      if (this.isScrolling) return;
      
      this.isScrolling = true;
      
      // Calculate how much to scroll
      const delta = e.deltaY || e.detail || e.wheelDelta;
      
      try {
        // Try to scroll both frames
        env1Frame.contentWindow.scrollBy(0, delta);
        env2Frame.contentWindow.scrollBy(0, delta);
      } catch (err) {
        console.error("Error syncing scroll with fallback method:", err);
      }
      
      setTimeout(() => {
        this.isScrolling = false;
      }, 50);
      
      // Prevent default scrolling of the parent window
      e.preventDefault();
    };
    
    // Add wheel event listener with passive: false to allow preventDefault
    window.addEventListener('wheel', handleWheelEvent, { passive: false });
    
    // Store this listener so we can remove it later
    this.wheelListener = handleWheelEvent;
    
    console.log("Fallback scroll sync setup complete");
  }

  // Handles scroll events on the wrappers
  handleWrapperScroll(sourceEnvId) {
    // Debounce / prevent loops
    if (this.isScrolling) return;
    this.isScrolling = true;

    const sourceWrapper = document.getElementById(`${sourceEnvId}-scroll-wrapper`);
    const sourceFrame = this.iframes[sourceEnvId];

    if (!sourceWrapper || !sourceFrame) {
      console.error(`Missing source wrapper or frame for ${sourceEnvId} during scroll.`);
      this.isScrolling = false;
      return;
    }

    const scrollTop = sourceWrapper.scrollTop;

    // Apply transform to the source iframe
    sourceFrame.style.transform = `translateY(-${scrollTop}px)`;

    // Find and update the target wrapper and frame
    const targetEnvId = sourceEnvId === 'env1' ? 'env2' : 'env1';
    const targetWrapper = document.getElementById(`${targetEnvId}-scroll-wrapper`);
    const targetFrame = this.iframes[targetEnvId];

    if (targetWrapper && targetFrame) {
      // Only update target scrollTop if it's different to avoid triggering its own scroll event
      if (Math.abs(targetWrapper.scrollTop - scrollTop) > 1) { // Add tolerance
        targetWrapper.scrollTop = scrollTop;
        // Apply transform immediately for smoothness
        targetFrame.style.transform = `translateY(-${scrollTop}px)`;
      }
    }

    // Reset scrolling flag after a short delay
    setTimeout(() => {
      this.isScrolling = false;
    }, 15); // Slightly longer but still short
  }

  // Tears down the wrapper/transform structure, restoring normal iframe behavior
  removeScrollSync() {
    console.log("Removing scroll sync");

    // Remove wheel listener if it exists (for fallback method)
    if (this.wheelListener) {
      window.removeEventListener('wheel', this.wheelListener, { passive: false });
      this.wheelListener = null;
      console.log("Removed fallback wheel listener");
    }

    ['env1', 'env2'].forEach(envId => {
      const wrapper = document.getElementById(`${envId}-scroll-wrapper`);
      const frame = this.iframes[envId];
      const container = frame?.closest('.env-frame-container');

      if (wrapper && frame && container) {
        console.log(`Removing wrapper for ${envId}`);
        // 1. Remove scroll listener
        if (this.scrollListeners[envId]) {
          wrapper.removeEventListener('scroll', this.scrollListeners[envId]);
        }

        // 2. Move iframe back to original container
        container.appendChild(frame);

        // 3. Remove the wrapper AFTER moving the frame
        if (wrapper.parentNode === container) {
          container.removeChild(wrapper);
        }

        // 4. Reset iframe styles **AFTER** moving it
        frame.style.position = '';
        frame.style.height = '100%';
        frame.style.overflow = 'auto';
        frame.style.transform = '';
        frame.style.top = '';
        frame.style.left = '';
        frame.style.width = '';

        // 5. Reset container overflow
        container.style.overflow = '';
      }
    });
  }
}

async function initializeComparison() {
  try {
    // Get the stored data
    const storedData = await chrome.storage.local.get(['comparisonData']);
    console.log('Retrieved stored data:', storedData);
    
    if (!storedData.comparisonData) {
      console.error('No comparison data found');
      return;
    }

    const { env1, env2 } = storedData.comparisonData;
    console.log('Retrieved comparison data:', storedData.comparisonData);

    // Load both environments
    await loadEnvironment('env1', env1);
    await loadEnvironment('env2', env2);
  } catch (error) {
    console.error('Error initializing comparison:', error);
  }
}

async function loadEnvironment(envId, env) {
  console.log(`Loading environment ${envId}:`, env);
  
  if (!env || !env.url) {
    console.error(`No URL provided for environment ${envId}`);
    return;
  }

  try {
    // Update the environment name and type
    const nameElement = document.getElementById(`${envId}-name`);
    const typeElement = document.getElementById(`${envId}-type`);
    const loadingElement = document.getElementById(`${envId}-loading`);
    const frame = document.getElementById(`${envId}-frame`);

    if (nameElement) {
      nameElement.textContent = env.name || 'Unknown Environment';
    }

    if (typeElement) {
      const type = env.type || getEnvironmentType(env);
      typeElement.textContent = type.charAt(0).toUpperCase() + type.slice(1);
      typeElement.className = `env-type ${type}`;
    }

    if (loadingElement) {
      loadingElement.style.display = 'flex';
    }

    if (frame) {
      // Ensure proper iframe attributes
      frame.setAttribute('name', envId);
      frame.setAttribute('data-env-name', env.name);
      frame.setAttribute('data-env-url', env.url);
      
      // Set iframe src directly
      frame.src = env.url;
      
      // Set onload handler
      frame.onload = () => {
        console.log(`Frame ${envId} loaded with URL: ${env.url}`);
        
        if (loadingElement) {
          loadingElement.style.display = 'none';
        }
        
        // Try to access the iframe content (will fail for cross-origin)
        try {
          const frameDocument = frame.contentDocument;
          console.log(`Frame ${envId} same-origin access successful`);
        } catch (e) {
          console.warn(`Frame ${envId} is cross-origin: ${e.message}`);
        }
      };
    }
  } catch (error) {
    console.error(`Error loading environment ${envId}:`, error);
    const loadingElement = document.getElementById(`${envId}-loading`);
    if (loadingElement) {
      loadingElement.style.display = 'none';
    }
  }
}

function getEnvironmentType(env) {
  const name = env.name.toLowerCase();
  if (name.includes('prod')) return 'production';
  if (name.includes('stg')) return 'staging';
  if (name.includes('dev')) return 'development';
  if (name.includes('qa')) return 'qa';
  if (name.includes('uat')) return 'uat';
  return 'custom';
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', () => {
  console.log('Comparison page loaded, initializing...');
  const loader = new EnvironmentLoader();
  initializeComparison();
}); 