// Background script for Environment Switcher
chrome.runtime.onInstalled.addListener(() => {
  console.log('Environment Switcher installed');
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openNewTab') {
    chrome.tabs.create({ url: request.url });
  }
}); 