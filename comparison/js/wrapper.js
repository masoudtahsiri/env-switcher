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

    // Ensure document doesn't have scrollbars that could interfere
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    // Add scroll event listener to the document
    document.addEventListener('scroll', function(event) {
      console.log(`[Wrapper ${frameId}] Document scroll event:`, {
        scrollX: window.scrollX,
        scrollY: window.scrollY
      });
      window.parent.postMessage({
        type: 'scroll',
        frameId: frameId,
        scrollX: window.scrollX,
        scrollY: window.scrollY
      }, '*');
    }, { passive: true });

    // Add wheel event listener to the document
    document.addEventListener('wheel', function(event) {
      console.log(`[Wrapper ${frameId}] Document wheel event:`, {
        deltaX: event.deltaX,
        deltaY: event.deltaY,
        deltaMode: event.deltaMode
      });
      
      // Calculate a higher factor for faster scrolling on long pages
      const scrollFactor = 1.5;
      
      window.parent.postMessage({
        type: 'scroll',
        frameId: frameId,
        deltaX: event.deltaX * scrollFactor,
        deltaY: event.deltaY * scrollFactor
      }, '*');
    }, { passive: true });

    // Add touch event listeners for mobile devices
    let touchStartY = 0;
    document.addEventListener('touchstart', function(event) {
      touchStartY = event.touches[0].clientY;
      console.log(`[Wrapper ${frameId}] Touch start:`, { touchStartY });
    }, { passive: true });

    document.addEventListener('touchmove', function(event) {
      const touchEndY = event.touches[0].clientY;
      const deltaY = touchStartY - touchEndY;
      console.log(`[Wrapper ${frameId}] Touch move:`, { 
        touchEndY, 
        deltaY,
        touchStartY 
      });
      window.parent.postMessage({
        type: 'scroll',
        frameId: frameId,
        deltaY: deltaY * 1.5 // Apply same scroll factor for touch
      }, '*');
      touchStartY = touchEndY;
    }, { passive: true });

    iframe.src = url;
    
    iframe.onload = function() {
      console.log(`[Wrapper ${frameId}] Iframe loaded`);
      
      // Report the content height to parent
      const contentHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight,
        document.body.clientHeight,
        document.documentElement.clientHeight
      );
      
      window.parent.postMessage({ 
        type: 'loaded', 
        frameId: frameId, 
        contentHeight: contentHeight 
      }, '*');
    };

    // Listen for incoming scroll messages
    window.addEventListener('message', function(event) {
      if (event.data.type === 'scroll') {
        console.log(`[Wrapper ${frameId}] Received scroll message:`, event.data);
        try {
          if (event.data.scrollX !== undefined && event.data.scrollY !== undefined) {
            window.scrollTo(event.data.scrollX, event.data.scrollY);
          } else if (event.data.deltaX !== undefined && event.data.deltaY !== undefined) {
            window.scrollBy(event.data.deltaX, event.data.deltaY);
          }
        } catch (e) {
          console.error(`[Wrapper ${frameId}] Error scrolling:`, e);
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