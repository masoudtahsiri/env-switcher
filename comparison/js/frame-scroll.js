// Frame scroll synchronization handler
(() => {
  let isLocked = false;
  let isScrolling = false;
  const SCROLL_THROTTLE = 50; // ms
  let lastScrollTime = 0;

  // Function to notify parent of scroll position
  function notifyScroll() {
    if (!isLocked || isScrolling) return;

    const now = Date.now();
    if (now - lastScrollTime < SCROLL_THROTTLE) return;
    lastScrollTime = now;

    window.parent.postMessage({
      type: 'scroll',
      frameId: window.name,
      scrollTop: window.scrollY,
      scrollLeft: window.scrollX
    }, '*');
  }

  // Listen for scroll events
  window.addEventListener('scroll', notifyScroll, { passive: true });
  window.addEventListener('wheel', notifyScroll, { passive: true });
  window.addEventListener('touchmove', notifyScroll, { passive: true });

  // Listen for messages from parent
  window.addEventListener('message', (event) => {
    if (!event.data) return;

    switch (event.data.type) {
      case 'scrollLockState':
        isLocked = event.data.isLocked;
        break;

      case 'syncScroll':
        if (!isLocked) return;
        isScrolling = true;
        window.scrollTo({
          top: event.data.scrollTop,
          left: event.data.scrollLeft,
          behavior: 'auto'
        });
        setTimeout(() => {
          isScrolling = false;
        }, SCROLL_THROTTLE);
        break;
    }
  }, false);
})(); 