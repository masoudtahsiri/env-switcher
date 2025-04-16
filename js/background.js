// Listen for messages from popup
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === 'openComparison') {
    try {
      // Store URLs in storage
      await chrome.storage.local.set({
        env1Url: request.env1Url,
        env2Url: request.env2Url
      });

      // Create a new tab with the comparison page
      chrome.tabs.create({
        url: chrome.runtime.getURL('comparison/comparison.html')
      });
    } catch (error) {
      console.error('Error in background script:', error);
    }
  }
});

// Function to inject URLs into the comparison page
function injectUrls(env1Url, env2Url) {
  // Wait for the page to load
  window.addEventListener('load', () => {
    // Set the URLs in the comparison page
    const env1Frame = document.getElementById('env1-frame');
    const env2Frame = document.getElementById('env2-frame');
    
    if (env1Frame && env2Frame) {
      env1Frame.src = env1Url;
      env2Frame.src = env2Url;
    }
  });
} 