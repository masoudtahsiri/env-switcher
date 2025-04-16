// Proxy script for handling iframe communication
document.addEventListener('DOMContentLoaded', function() {
  // Get the current script element
  const scripts = document.getElementsByTagName('script');
  const currentScript = Array.from(scripts).find(script => 
    script.src.includes('proxy.js')
  );

  if (!currentScript) {
    console.error('Proxy script not found');
    return;
  }

  const frameId = currentScript.getAttribute('data-frame-id');
  const url = currentScript.getAttribute('data-url');

  if (!frameId || !url) {
    console.error('Missing frame ID or URL');
    return;
  }

  const iframe = document.querySelector('iframe');
  if (!iframe) {
    console.error('Iframe not found');
    return;
  }

  // Set up the iframe
  iframe.src = url;
  
  // Handle iframe load
  iframe.onload = function() {
    try {
      // Wait a short moment to ensure the iframe is fully loaded
      setTimeout(() => {
        window.parent.postMessage({ type: 'loaded', frameId: frameId }, '*');
        console.log(`[Proxy ${frameId}] Iframe loaded successfully`);
      }, 100);
    } catch (e) {
      console.error(`[Proxy ${frameId}] Error sending loaded message:`, e);
    }
  };

  // Handle iframe errors
  iframe.onerror = function() {
    console.error(`[Proxy ${frameId}] Error loading iframe content`);
    window.parent.postMessage({ type: 'error', frameId: frameId }, '*');
  };

  // Add scroll event listeners
  const handleScroll = function() {
    try {
      window.parent.postMessage({
        type: 'scroll',
        frameId: frameId,
        scrollX: window.scrollX,
        scrollY: window.scrollY
      }, '*');
    } catch (e) {
      console.error(`[Proxy ${frameId}] Error sending scroll message:`, e);
    }
  };

  const handleWheel = function(e) {
    try {
      window.parent.postMessage({
        type: 'scroll',
        frameId: frameId,
        deltaX: e.deltaX,
        deltaY: e.deltaY
      }, '*');
    } catch (e) {
      console.error(`[Proxy ${frameId}] Error sending wheel message:`, e);
    }
  };

  // Add event listeners with passive option for better performance
  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('wheel', handleWheel, { passive: true });

  // Handle messages from parent
  window.addEventListener('message', function(event) {
    if (!event.data || typeof event.data !== 'object') return;

    const { type, scrollX, scrollY, deltaX, deltaY } = event.data;

    if (type === 'scroll') {
      try {
        if (scrollX !== undefined && scrollY !== undefined) {
          window.scrollTo(scrollX, scrollY);
        } else if (deltaX !== undefined && deltaY !== undefined) {
          window.scrollBy(deltaX, deltaY);
        }
      } catch (e) {
        console.error(`[Proxy ${frameId}] Error handling scroll message:`, e);
      }
    }
  });
}); 