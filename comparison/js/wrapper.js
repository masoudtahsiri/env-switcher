// Wrapper script for handling scroll events
(function() {
  function init() {
    // Get the script element that loaded this file
    const scripts = document.getElementsByTagName('script');
    const currentScript = Array.from(scripts).find(script => 
      script.src.includes('wrapper.js')
    );

    if (!currentScript) {
      console.error('Could not find wrapper script element');
      return;
    }

    const frameId = currentScript.getAttribute('data-frame-id');
    const url = currentScript.getAttribute('data-url');

    if (!frameId || !url) {
      console.error('Missing frameId or url attributes');
      return;
    }

    const iframe = document.querySelector('iframe');
    if (!iframe) {
      console.error('Could not find iframe element');
      return;
    }

    console.log(`[Wrapper ${frameId}] Initializing with URL:`, url);
    
    // Scroll lock state
    let scrollLockEnabled = false;

    // Set up scroll detection on the main document
    document.addEventListener('scroll', function(event) {
      if (scrollLockEnabled) {
        const scrollData = {
          type: 'scroll',
          frameId: frameId,
          scrollX: window.scrollX,
          scrollY: window.scrollY,
          method: 'position'
        };
        
        console.log(`[Wrapper ${frameId}] Scroll event:`, scrollData);
        window.parent.postMessage(scrollData, '*');
      }
    }, { passive: true });

    // Set up wheel event detection for smoother scrolling
    document.addEventListener('wheel', function(event) {
      if (scrollLockEnabled) {
        const wheelData = {
          type: 'scroll',
          frameId: frameId,
          deltaX: event.deltaX,
          deltaY: event.deltaY,
          method: 'delta'
        };
        
        console.log(`[Wrapper ${frameId}] Wheel event:`, wheelData);
        window.parent.postMessage(wheelData, '*');
      }
    }, { passive: true });

    // Touch events for mobile
    let lastTouchY = 0;
    document.addEventListener('touchstart', function(event) {
      if (event.touches.length === 1) {
        lastTouchY = event.touches[0].clientY;
      }
    }, { passive: true });

    document.addEventListener('touchmove', function(event) {
      if (scrollLockEnabled && event.touches.length === 1) {
        const touchY = event.touches[0].clientY;
        const deltaY = lastTouchY - touchY;
        
        if (Math.abs(deltaY) > 5) { // Small threshold to avoid micro-movements
          const touchData = {
            type: 'scroll',
            frameId: frameId,
            deltaX: 0,
            deltaY: deltaY,
            method: 'touch'
          };
          
          console.log(`[Wrapper ${frameId}] Touch move:`, touchData);
          window.parent.postMessage(touchData, '*');
          
          lastTouchY = touchY;
        }
      }
    }, { passive: true });

    // Set iframe source
    iframe.src = url;
    
    iframe.onload = function() {
      console.log(`[Wrapper ${frameId}] Iframe loaded`);
      
      const loadedData = {
        type: 'loaded',
        frameId: frameId,
        width: iframe.offsetWidth,
        height: iframe.offsetHeight
      };
      
      window.parent.postMessage(loadedData, '*');
    };

    // Listen for incoming scroll messages
    window.addEventListener('message', function(event) {
      // Ignore messages from this window
      if (event.source === window) return;
      
      const data = event.data;
      
      // Handle scroll lock state update
      if (data.type === 'scrollLockState') {
        scrollLockEnabled = data.active;
        console.log(`[Wrapper ${frameId}] Scroll lock state updated:`, scrollLockEnabled);
        return;
      }
      
      // Handle scroll commands when they come from the other frame
      if (data.type === 'scroll' && data.frameId !== frameId) {
        console.log(`[Wrapper ${frameId}] Received scroll command:`, data);
        
        try {
          if (data.method === 'position') {
            // Absolute position scroll
            window.scrollTo(data.scrollX, data.scrollY);
          } else if (data.method === 'delta') {
            // Relative delta scroll
            window.scrollBy(data.deltaX, data.deltaY);
          } else if (data.method === 'touch') {
            // Touch scroll - similar to delta
            window.scrollBy(0, data.deltaY);
          }
        } catch (error) {
          console.error(`[Wrapper ${frameId}] Error scrolling:`, error);
        }
      }
    });
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(); 