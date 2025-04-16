// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Get current tab URL
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentUrl = tabs[0].url;
    const currentUrlObj = new URL(currentUrl);

    // Get environments from storage
    const { environments = [] } = await chrome.storage.sync.get('environments');

    // Update current environment display
    const currentEnvName = document.querySelector('.env-text');
    const currentEnvUrl = document.querySelector('.env-url');
    const currentEnvDot = document.querySelector('.env-dot');

    if (currentEnvName && currentEnvUrl && currentEnvDot) {
      const currentEnv = environments.find(env => {
        const envUrl = new URL(env.baseUrl.replace(/\/$/, ''));
        return currentUrlObj.origin === envUrl.origin;
      });

      if (currentEnv) {
        currentEnvName.textContent = currentEnv.name;
        currentEnvName.style.color = '#666';
        currentEnvDot.style.background = '#666';
        currentEnvUrl.textContent = currentUrl;
      } else {
        currentEnvName.textContent = 'Unknown';
        currentEnvName.style.color = '#666';
        currentEnvDot.style.background = '#666';
        currentEnvUrl.textContent = currentUrl;
      }
    }

    // Populate environment select
    const envSelect = document.getElementById('env-select');
    if (envSelect) {
      envSelect.innerHTML = '<option value="" disabled selected>Select environment...</option>';
      environments.forEach(env => {
        const option = document.createElement('option');
        option.value = env.baseUrl;
        option.textContent = env.name;
        const isCurrentEnv = env.baseUrl === currentUrlObj.origin;
        option.disabled = isCurrentEnv;
        envSelect.appendChild(option);
      });
    }

    // Switch environment
    document.getElementById('switch-btn').addEventListener('click', async () => {
      const select = document.getElementById('env-select');
      const selectedEnvUrl = select.value;
      const openInNewTab = document.getElementById('open-new-tab').checked;
      
      if (!selectedEnvUrl) {
        alert('Please select an environment');
        return;
      }

      const env = environments.find(e => e.baseUrl === selectedEnvUrl);
      if (!env) {
        alert('Environment not found');
        return;
      }

      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const currentTab = tabs[0];
        const currentUrl = currentTab.url;
        
        // Extract the path from the current URL
        const urlObj = new URL(currentUrl);
        const path = urlObj.pathname + urlObj.search + urlObj.hash;
        
        // Construct the new URL
        const newUrl = env.baseUrl + path;
        
        // Open URL based on checkbox state
        if (openInNewTab) {
          await chrome.tabs.create({ url: newUrl });
        } else {
          await chrome.tabs.update(currentTab.id, { url: newUrl });
          window.close();
        }
      } catch (error) {
        console.error('Error switching environment:', error);
        alert('Error switching environment: ' + error.message);
      }
    });

    // Handle adding new environment
    const addEnvForm = document.getElementById('add-env-form');
    if (addEnvForm) {
      addEnvForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('env-name').value.trim();
        const baseUrl = document.getElementById('env-url').value.trim().replace(/\/$/, '');

        if (!name || !baseUrl) {
          alert('Please fill in all fields');
          return;
        }

        try {
          new URL(baseUrl);
        } catch (e) {
          alert('Please enter a valid URL');
          return;
        }

        environments.push({ name, baseUrl });
        await chrome.storage.sync.set({ environments });
        window.location.reload();
      });
    }

    // Update environment list
    const envList = document.getElementById('env-list');
    if (envList) {
      envList.innerHTML = '';
      environments.forEach(env => {
        const envItem = document.createElement('div');
        envItem.className = 'env-item';
        envItem.innerHTML = `
          <div class="env-info">
            <div class="env-name">
              <span class="env-dot"></span>
              <span class="env-text">${env.name}</span>
            </div>
            <div class="env-url">${env.baseUrl}</div>
          </div>
          <div class="env-actions">
            <button class="delete-btn" data-url="${env.baseUrl}">
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
            </button>
          </div>
        `;
        envList.appendChild(envItem);

        // Add delete handler
        const deleteBtn = envItem.querySelector('.delete-btn');
        if (deleteBtn) {
          deleteBtn.addEventListener('click', async () => {
            if (confirm(`Are you sure you want to delete ${env.name}?`)) {
              const updatedEnvs = environments.filter(e => e.baseUrl !== env.baseUrl);
              await chrome.storage.sync.set({ environments: updatedEnvs });
              window.location.reload();
            }
          });
        }
      });
    }

    // Compare button click handler
    document.getElementById('compare-btn').addEventListener('click', async () => {
      try {
        const selectedEnv = document.getElementById('env-select').value;
        if (!selectedEnv) {
          alert('Please select an environment to compare');
          return;
        }

        // Get current tab URL
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const currentUrl = tab.url;

        // Find current environment
        const currentEnv = environments.find(env => currentUrl.startsWith(env.baseUrl));
        if (!currentEnv) {
          alert('Could not determine current environment');
          return;
        }

        // Find selected environment
        const selectedEnvObj = environments.find(env => env.baseUrl === selectedEnv);
        if (!selectedEnvObj) {
          alert('Selected environment not found');
          return;
        }

        // Extract path from current URL
        const path = currentUrl.replace(currentEnv.baseUrl, '');
        
        // Construct comparison URLs
        const env2Url = selectedEnvObj.baseUrl.replace(/\/$/, '') + path;
        const comparisonUrl = `comparison/comparison.html?env1=${encodeURIComponent(currentUrl)}&env2=${encodeURIComponent(env2Url)}&env1Name=${encodeURIComponent(currentEnv.name)}&env2Name=${encodeURIComponent(selectedEnvObj.name)}`;
        
        // Open comparison in new tab
        chrome.tabs.create({ url: comparisonUrl });
      } catch (error) {
        console.error('Error opening comparison:', error);
        alert('Error opening comparison: ' + error.message);
      }
    });

    // Add event listener for the domain button
    const setDomainBtn = document.getElementById('set-domain-btn');
    if (setDomainBtn) {
      setDomainBtn.addEventListener('click', async () => {
        try {
          // Get the current active tab
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          
          if (tab && tab.url) {
            // Extract the domain from the URL
            const url = new URL(tab.url);
            const domain = `${url.protocol}//${url.hostname}`;
            
            // Set the URL input value
            const urlInput = document.getElementById('env-url');
            if (urlInput) {
              urlInput.value = domain;
            }
          }
        } catch (error) {
          console.error('Error getting current URL:', error);
        }
      });
    }

    // --- Event Listener for Manage Button --- 
    const manageBtn = document.getElementById('manage-btn');
    if (manageBtn) {
      manageBtn.addEventListener('click', () => {
        // Open manage.html in the current tab within the extension context
        // or open in a new browser tab if preferred:
        // chrome.tabs.create({ url: chrome.runtime.getURL('manage.html') }); 
        window.location.href = 'manage.html'; 
      });
    }
    // --- End Manage Button Listener ---

    // Get widget visibility state from storage
    const { widgetVisible = true } = await chrome.storage.sync.get('widgetVisible');
    document.getElementById('widgetToggle').checked = widgetVisible;

    // Handle widget visibility toggle
    document.getElementById('widgetToggle').addEventListener('change', async function(e) {
      const isVisible = e.target.checked;
      await chrome.storage.sync.set({ widgetVisible: isVisible });
      
      // Send message to content script to update widget visibility
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { 
          action: 'toggleWidget', 
          visible: isVisible 
        });
      }
    });

  } catch (error) {
    console.error('Error initializing popup:', error);
  }
}); 