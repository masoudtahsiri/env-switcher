console.log('Initializing comparison...');

class EnvironmentLoader {
  constructor() {
    this.scrollLockEnabled = false;
    this.isScrolling = false;
    this.scrollListeners = {}; // Store bound event listeners
    this.iframes = {}; // Store iframe references
    this.setupScrollLock();
    
    // Add message listener for content height reports
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'loaded' && event.data.contentHeight) {
        const frameId = event.data.frameId;
        const contentHeight = event.data.contentHeight;
        console.log(`Received content height for ${frameId}: ${contentHeight}px`);
        
        const frame = this.iframes[frameId];
        if (frame) {
          // Add extra padding to ensure we can scroll to the bottom
          frame.style.height = `${contentHeight + 2000}px`;
          console.log(`Updated height for ${frameId} to ${frame.style.height}`);
        }
      }
    });
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

    // Force the main document to never scroll
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

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
        frame.parentNode.style.overflowX = 'hidden'; // Prevent horizontal scrollbars
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
      wrapper.style.overflowY = 'scroll'; // Make wrapper scrollable vertically
      wrapper.style.overflowX = 'hidden'; // Hide horizontal scrollbar
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
      // Set initial large height, will be adjusted on load
      frame.style.height = '10000px'; 
      frame.style.overflow = 'hidden'; // Prevent iframe scrollbars
      frame.style.transform = `translateY(-${wrapper.scrollTop}px)`;

      // 4. Style the container to clip the transformed iframe
      container.style.overflow = 'hidden'; // **IMPORTANT**
      
      // 5. Create a sizer element to define scroll height
      let sizer = wrapper.querySelector('.scroll-sizer');
      if (!sizer) {
        sizer = document.createElement('div');
        sizer.className = 'scroll-sizer';
        sizer.style.position = 'relative';
        sizer.style.width = '1px';
        sizer.style.height = '10000px'; // Initial large height
        sizer.style.float = 'left'; // Ensure it takes up space vertically
        wrapper.appendChild(sizer);
      }

      // 6. Add scroll listener (store reference)
      if (!this.scrollListeners[envId]) {
        this.scrollListeners[envId] = this.handleWrapperScroll.bind(this, envId);
      }
      wrapper.removeEventListener('scroll', this.scrollListeners[envId]); // Avoid duplicates
      wrapper.addEventListener('scroll', this.scrollListeners[envId]);

      // 7. Adjust iframe and sizer height when iframe loads
      frame.removeEventListener('load', this.handleFrameLoad); // Remove previous listener if any
      this.handleFrameLoad = () => {
        try {
          // Try to get the actual height of the content
          const doc = frame.contentDocument;
          
          // Add null check for contentDocument
          if (!doc) {
            console.warn(`contentDocument is null for ${envId}. Cannot determine height.`);
            // Keep the large default heights for frame and sizer if error
            frame.style.height = '10000px';
            const sizer = frame.parentNode.querySelector('.scroll-sizer');
            if (sizer) sizer.style.height = '10000px';
            return; // Exit if document is not accessible
          }

          const docHeight = Math.max(
            doc.body?.scrollHeight || 0, // Use optional chaining and default value
            doc.documentElement?.scrollHeight || 0,
            doc.body?.offsetHeight || 0, 
            doc.documentElement?.offsetHeight || 0,
            doc.body?.clientHeight || 0, 
            doc.documentElement?.clientHeight || 0
          );
          
          console.log(`Content height for ${envId}: ${docHeight}px`);
          
          // Ensure a minimum height if detection fails or content is very small
          const finalHeight = Math.max(docHeight, 1000); // Use a minimum height (e.g., 1000px)

          // Set iframe height to actual content height
          frame.style.height = `${finalHeight}px`; 
          // Set sizer height to match content height
          const sizer = frame.parentNode.querySelector('.scroll-sizer');
          if (sizer) sizer.style.height = `${finalHeight}px`; 

          // Trigger initial scroll position update
          this.handleWrapperScroll(envId);
        } catch (e) {
          console.warn(`Unable to determine content height for ${envId} (likely cross-origin or access issue):`, e);
          // Keep the large default heights for frame and sizer if error
          frame.style.height = '10000px';
          const sizer = frame.parentNode.querySelector('.scroll-sizer');
          if (sizer) sizer.style.height = '10000px';
        }
      };
      frame.addEventListener('load', this.handleFrameLoad);

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
    
    // Make sure parent document doesn't scroll
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    
    // Apply special styling for cross-origin frames
    ['env1', 'env2'].forEach(envId => {
      const frame = this.iframes[envId];
      const container = frame.closest('.env-frame-container');
      
      if (frame && container) {
        // Ensure iframe takes full height and has scrolling enabled
        frame.style.width = '100%';
        frame.style.height = '100%';
        frame.style.border = 'none';
        frame.style.overflow = 'auto'; // This is important for cross-origin frames
        
        // Container should not scroll
        container.style.overflow = 'hidden';
        
        // Add special class for cross-origin handling
        frame.classList.add('cross-origin-frame');
      }
    });
    
    // Setup scroll sync between frames using messaging
    let lastScrollPosition = 0;
    let lastScrollTime = 0;
    
    // Use main window's wheel events to control iframe scrolling
    const handleWheelEvent = (e) => {
      if (!this.scrollLockEnabled) return;
      if (this.isScrolling) return;
      
      this.isScrolling = true;
      
      // Calculate how much to scroll
      const delta = e.deltaY || e.detail || e.wheelDelta;
      
      // Use a higher value for faster scrolling on long pages
      const scrollFactor = 1.5;
      const scrollAmount = delta * scrollFactor;
      
      try {
        // Try to scroll both frames
        env1Frame.contentWindow.scrollBy(0, scrollAmount);
        env2Frame.contentWindow.scrollBy(0, scrollAmount);
        
        // Record scroll position and time
        lastScrollPosition += scrollAmount;
        lastScrollTime = Date.now();
      } catch (err) {
        console.error("Error syncing scroll with fallback method:", err);
      }
      
      setTimeout(() => {
        this.isScrolling = false;
      }, 30); // Shorter timeout for more responsive scrolling
      
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
}