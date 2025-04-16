document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Get current tab URL
    const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentUrl = currentTab.url;
    
    // Convert production URL to staging URL while preserving the path
    const stagingUrl = currentUrl.replace('credaily.com', 'cre2stg.wpengine.com');
    
    // Set environment URLs
    document.getElementById('env1').value = currentUrl;
    document.getElementById('env2').value = stagingUrl;
    
    // Add event listener for compare button
    document.getElementById('compareBtn').addEventListener('click', async () => {
      try {
        const env1Url = document.getElementById('env1').value;
        const env2Url = document.getElementById('env2').value;
        
        if (!env1Url || !env2Url) {
          alert('Please enter both environment URLs');
          return;
        }
        
        // Store URLs in chrome.storage
        await chrome.storage.local.set({
          env1Url: env1Url,
          env2Url: env2Url
        });
        
        // Open comparison in new tab
        const comparisonUrl = chrome.runtime.getURL('comparison/comparison.html');
        chrome.tabs.create({ url: comparisonUrl });
      } catch (error) {
        console.error('Error in compare button click:', error);
        alert('Error opening comparison. Please try again.');
      }
    });
  } catch (error) {
    console.error('Error in popup:', error);
    alert('Error initializing popup');
  }
}); 