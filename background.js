// Background script for Environment Switcher
chrome.runtime.onInstalled.addListener(() => {
  console.log('Environment Switcher installed');
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Background received message:', message);

  if (message.action === 'injectWidgetScript') {
    console.log('🔄 Injecting widget script into tab:', message.tabId);
    
    // Inject the content script
    chrome.scripting.executeScript({
      target: { tabId: message.tabId },
      files: ['content-scripts/floating-widget.js']
    })
    .then(() => {
      console.log('✅ Script injected successfully');
      
      // Add a small delay to ensure the script is initialized
      setTimeout(() => {
        // Send message to update widget visibility
        chrome.tabs.sendMessage(message.tabId, {
          action: 'updateWidgetVisibility',
          isVisible: message.isVisible
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('❌ Error sending visibility message:', chrome.runtime.lastError);
            sendResponse({ error: chrome.runtime.lastError.message });
          } else {
            console.log('✅ Visibility message sent successfully');
            sendResponse({ success: true });
          }
        });
      }, 100);
    })
    .catch((error) => {
      console.error('❌ Error injecting script:', error);
      sendResponse({ error: error.message });
    });

    // Return true to indicate we will send a response asynchronously
    return true;
  }

  // Handle widget visibility updates
  if (message.action === 'updateWidgetVisibility') {
    console.log('Background: Handling widget visibility update:', message.isVisible);
    
    // Get the tab ID from the message or sender
    const tabId = message.tabId || sender.tab?.id;
    
    if (!tabId) {
      console.error('Background: No tab ID available for widget visibility update');
      sendResponse({ success: false, error: 'No tab ID available' });
      return true;
    }

    // First, ensure the content script is loaded
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content-scripts/floating-widget.js']
    }).then(() => {
      console.log('Background: Content script injected');
      
      // Wait a bit for the script to initialize
      setTimeout(() => {
        // Forward the message to the content script
        chrome.tabs.sendMessage(tabId, {
          action: 'updateWidgetVisibility',
          isVisible: message.isVisible
        }).then(response => {
          console.log('Background: Content script response:', response);
          sendResponse({ success: true });
        }).catch(error => {
          console.error('Background: Error sending message to content script:', error);
          sendResponse({ success: false, error: error.message });
        });
      }, 100);
    }).catch(error => {
      console.error('Background: Error injecting content script:', error);
      sendResponse({ success: false, error: error.message });
    });

    return true; // Keep the message channel open for the async response
  }
  
  // Handle switching tabs (from content script)
  else if (message.action === 'switchTab') {
    console.log('Background: Handling switchTab request');
    const { url, openInNewTab } = message;

    if (!url) {
      console.error('Background: No URL provided for switchTab action.');
      sendResponse({ success: false, error: 'No URL provided' });
      return true;
    }

    if (openInNewTab) {
      chrome.tabs.create({ url: url })
        .then(() => sendResponse({ success: true, action: 'created' }))
        .catch(error => sendResponse({ success: false, error: error.message }));
    } else {
      const senderTabId = sender.tab?.id;
      let tabToUpdateId = senderTabId;

      if (!tabToUpdateId) {
        chrome.tabs.query({ active: true, currentWindow: true })
          .then(tabs => {
            if (tabs[0]?.id) {
              tabToUpdateId = tabs[0].id;
              return chrome.tabs.update(tabToUpdateId, { url: url });
            } else {
              return chrome.tabs.create({ url: url });
            }
          })
          .then(() => sendResponse({ success: true, action: 'updated' }))
          .catch(error => sendResponse({ success: false, error: error.message }));
      } else {
        chrome.tabs.update(tabToUpdateId, { url: url })
          .then(() => sendResponse({ success: true, action: 'updated' }))
          .catch(error => sendResponse({ success: false, error: error.message }));
      }
    }
    return true;
  }
  
  // Handle opening new tabs
  else if (message.action === 'openNewTab') {
    console.log('Background: Handling openNewTab request');
    if (message.url) {
      chrome.tabs.create({ url: message.url })
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
    } else {
      sendResponse({ success: false, error: 'No URL provided' });
    }
    return true;
  }
  
  return false;
});

console.log('Background script loaded and listener added.'); 