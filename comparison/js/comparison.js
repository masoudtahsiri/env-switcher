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
        console.log('Scroll lock toggled:', this.scrollLockEnabled);

        if (this.scrollLockEnabled) {
          this.setupScrollSyncWrappers();
        } else {
          this.removeScrollSync();
        }
        // Toggle body class to potentially prevent body scroll if needed
        document.body.classList.toggle('scroll-locked', this.scrollLockEnabled);
      });
    }
  }

  // Sets up the wrapper/transform structure for scroll sync
  setupScrollSyncWrappers() {
    console.log("Setting up scroll sync wrappers");

    ['env1', 'env2'].forEach(envId => {
      const frame = this.iframes[envId];
      const container = document.querySelector(`.env-frame-container:has(#${envId}-proxy)`); // Find container via proxy ID

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

      // 2. Move the iframe inside the wrapper
      container.appendChild(wrapper); // Add wrapper to container first
      wrapper.appendChild(frame); // Move frame into wrapper

      // 3. Style the iframe for transform scrolling
      frame.style.position = 'absolute';
      frame.style.top = '0';
      frame.style.left = '0';
      frame.style.width = '100%';
      frame.style.height = '10000px'; // Large height
      frame.style.overflow = 'hidden'; // Hide internal scrollbar **IMPORTANT**
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
    // console.log(`Scroll ${sourceEnvId}: ${scrollTop}`); // Reduce noise

    // Apply transform to the source iframe
    sourceFrame.style.transform = `translateY(-${scrollTop}px)`;

    // Find and update the target wrapper and frame
    const targetEnvId = sourceEnvId === 'env1' ? 'env2' : 'env1';
    const targetWrapper = document.getElementById(`${targetEnvId}-scroll-wrapper`);
    const targetFrame = this.iframes[targetEnvId];

    if (targetWrapper && targetFrame) {
       // Only update target scrollTop if it's different to avoid triggering its own scroll event
      if (Math.abs(targetWrapper.scrollTop - scrollTop) > 1) { // Add tolerance
          // console.log(`Syncing ${targetEnvId} to ${scrollTop}`); // Reduce noise
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
    console.log("Removing scroll sync wrappers");

    ['env1', 'env2'].forEach(envId => {
      const wrapper = document.getElementById(`${envId}-scroll-wrapper`);
      const frame = this.iframes[envId];
      // Find the container where the wrapper *should* be
      const container = document.querySelector(`.env-frame-container:has(#${envId}-proxy)`);

      if (wrapper && frame && container) {
        console.log(`Removing wrapper for ${envId}`);
        // 1. Remove scroll listener
        if (this.scrollListeners[envId]) {
          wrapper.removeEventListener('scroll', this.scrollListeners[envId]);
          // delete this.scrollListeners[envId]; // Keep ref in case toggle quickly
        }

        // 2. Move iframe back to original container
        container.appendChild(frame);

        // 3. Remove the wrapper AFTER moving the frame
        if (wrapper.parentNode === container) { // Check parent before removal
          container.removeChild(wrapper);
        }

        // 4. Reset iframe styles **AFTER** moving it
        frame.style.position = '';
        frame.style.height = '100%';
        frame.style.overflow = 'auto'; // **IMPORTANT: Allow iframe's own scrollbar**
        frame.style.transform = '';
        frame.style.top = '';
        frame.style.left = '';
        frame.style.width = '';

        // 5. Reset container overflow
        container.style.overflow = ''; // **IMPORTANT: Allow container to show iframe scrollbar**

      } else {
          console.log(`No wrapper/frame/container found for ${envId}, attempting style reset anyway.`);
          if(frame) {
                frame.style.position = '';
                frame.style.height = '100%';
                frame.style.overflow = 'auto'; // Reset overflow
                frame.style.transform = '';
                frame.style.top = '';
                frame.style.left = '';
                frame.style.width = '';
          }
          if(container) {
              container.style.overflow = ''; // Reset container overflow
          }
      }
    });
    // Ensure body scrolling is re-enabled
    document.body.classList.remove('scroll-locked');
  }

  // Updated to accept envName
  loadEnvironment(frameId, url, envName) {
    console.log(`Loading environment ${frameId} (${envName}) with URL:`, url);

    const frameContainer = document.querySelector(`.env-frame-container:has(#${frameId}-frame)`);
    const placeholderFrame = document.getElementById(`${frameId}-frame`);
    const loadingElement = document.getElementById(`${frameId}-loading`);
    const label = document.getElementById(`${frameId}-label`);

    if (!frameContainer) {
      console.error(`Frame container not found for ${frameId}`);
      return;
    }
    if (!placeholderFrame) {
      console.error(`Placeholder frame ${frameId}-frame not found`);
      return;
    }

    if (loadingElement) {
      loadingElement.style.display = 'flex';
    }

    // Set label text using envName
    if (label) {
      label.textContent = envName || url; // Use name, fallback to URL
    } else {
      console.warn(`Label element not found for ${frameId}`);
    }

    try {
      const actualFrame = document.createElement('iframe');
      actualFrame.id = `${frameId}-proxy`;
      actualFrame.className = 'env-frame';
      actualFrame.style.width = '100%';
      actualFrame.style.height = '100%';
      actualFrame.style.border = 'none';
      actualFrame.style.display = 'block';
      actualFrame.style.overflow = 'auto'; // Default state allows scrollbar

      this.iframes[frameId] = actualFrame;

      actualFrame.onload = () => {
        console.log(`Direct frame ${frameId} loaded`);
        setTimeout(() => {
          if (loadingElement) {
            loadingElement.style.display = 'none';
          }
        }, 500);

        if (this.scrollLockEnabled) {
           this.setupScrollSyncWrappers();
        }
      };

      actualFrame.onerror = (e) => {
        console.error(`Error loading frame ${frameId}:`, e);
        if (loadingElement) {
          loadingElement.style.display = 'none';
        }
      };

      actualFrame.src = url;

      if (placeholderFrame.parentNode === frameContainer) {
         frameContainer.replaceChild(actualFrame, placeholderFrame);
      } else {
        console.error(`Placeholder frame ${frameId}-frame is not in the expected container.`);
         frameContainer.appendChild(actualFrame); // Fallback
      }

      console.log(`Environment ${frameId} setup complete`);
    } catch (e) {
      console.error(`Error setting up environment ${frameId}:`, e);
      if (loadingElement) {
        loadingElement.style.display = 'none';
      }
    }
  }

  init() {
    const urlParams = new URLSearchParams(window.location.search);
    const env1Url = decodeURIComponent(urlParams.get('env1'));
    const env2Url = decodeURIComponent(urlParams.get('env2'));
    // Read environment names, provide defaults
    const env1Name = decodeURIComponent(urlParams.get('env1Name') || 'Environment 1'); 
    const env2Name = decodeURIComponent(urlParams.get('env2Name') || 'Environment 2');

    if (!env1Url || !env2Url) {
      console.error('Missing environment URLs');
      return;
    }

    console.log('Initializing with URLs:', { env1Url, env2Url, env1Name, env2Name });
    // Pass names to loadEnvironment
    this.loadEnvironment('env1', env1Url, env1Name);
    this.loadEnvironment('env2', env2Url, env2Name);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const loader = new EnvironmentLoader();
  loader.init();
}); 