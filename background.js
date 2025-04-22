// Background script for Environment Switcher
chrome.runtime.onInstalled.addListener(() => {
  console.log('Environment Switcher installed');
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Make the listener async to use await for chrome.tabs API calls
  (async () => {
    console.log('Background received message:', message);

    // Handle switching tabs (from content script)
    if (message.action === 'switchTab') {
      console.log('Background: Handling switchTab request');
      const { url, openInNewTab } = message;

      if (!url) {
        console.error('Background: No URL provided for switchTab action.');
        sendResponse({ success: false, error: 'No URL provided' });
        return;
      }

      try {
        if (openInNewTab) {
          console.log('Background: Creating new tab with URL:', url);
          await chrome.tabs.create({ url: url });
          sendResponse({ success: true, action: 'created' });
        } else {
          const senderTabId = sender.tab?.id;
          let tabToUpdateId = senderTabId;

          if (!tabToUpdateId) {
             console.warn('Background: Sender tab ID not available, querying active tab.');
             const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
             if (currentTab?.id) {
                tabToUpdateId = currentTab.id;
             }
          }

          if (tabToUpdateId) {
            console.log('Background: Updating tab ID', tabToUpdateId, 'with URL:', url);
            await chrome.tabs.update(tabToUpdateId, { url: url });
            sendResponse({ success: true, action: 'updated', tabId: tabToUpdateId });
          } else {
            console.error('Background: Could not find a tab to update. Opening new tab as fallback.');
            await chrome.tabs.create({ url: url });
            sendResponse({ success: false, error: 'No suitable tab found to update, opened new tab instead.' });
          }
        }
      } catch (error) {
        console.error('Background: Error handling switchTab action:', error);
        sendResponse({ success: false, error: error.message });
      }
    }
    
    // Handle opening new tabs (legacy or other source)
    else if (message.action === 'openNewTab') {
        console.log('Background: Handling openNewTab request');
        if (message.url) {
            await chrome.tabs.create({ url: message.url });
            sendResponse({ success: true }); 
        } else {
            console.error('Background: No URL provided for openNewTab action.');
            sendResponse({ success: false, error: 'No URL provided'});
        }
    }
    
    // Add other message handlers here if needed
    // else if (message.action === '...') { ... }
    
    else {
        console.log('Background: Received unhandled action:', message.action);
        // Optionally send a response for unhandled actions
        // sendResponse({ success: false, error: 'Unknown action' });
    }

  })(); // Immediately invoke the async function

  // Return true ONLY if you intend to sendResponse asynchronously.
  // Both 'switchTab' and 'openNewTab' actions now use async/await, so we MUST return true.
  return true;
});

console.log('Background script loaded and listener added.'); 