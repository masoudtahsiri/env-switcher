// Background script for Environment Switcher
chrome.runtime.onInstalled.addListener(() => {
  console.log('Environment Switcher installed');
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'openComparison') {
    // Open the comparison page in a new tab
    chrome.tabs.create({
      url: `comparison/comparison.html?${message.params}`,
      active: true
    });
  }
}); 