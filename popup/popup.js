// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  try {
  // Get current tab URL
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentUrl = tabs[0]?.url;
    if (!currentUrl) {
      console.error('No current URL found');
      return;
    }

    const currentUrlObj = new URL(currentUrl);

    // Get environments from storage
    const { environments = [] } = await chrome.storage.sync.get('environments');

  // Update current environment display
    const currentEnvName = document.querySelector('.env-text');
    const currentEnvUrl = document.querySelector('.env-url');
    const currentEnvDot = document.querySelector('.env-dot');

    if (currentEnvName && currentEnvUrl && currentEnvDot) {
  const currentEnv = environments.find(env => {
        if (!env || !env.url) return false;
        try {
          const envUrl = new URL(env.url);
    return currentUrlObj.origin === envUrl.origin;
        } catch (e) {
          console.error('Error parsing environment URL:', e);
          return false;
        }
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

    // Find current environment for group filtering
    const currentEnv = environments.find(env => {
      if (!env || !env.url) return false;
      try {
        const envUrl = new URL(env.url);
        return currentUrlObj.origin === envUrl.origin;
      } catch (e) {
        console.error('Error parsing environment URL:', e);
        return false;
      }
    });

    // Populate environment select (only showing environments from the same group)
    const envSelect = document.getElementById('env-select');
    if (envSelect) {
      envSelect.innerHTML = '<option value="" disabled selected>Select environment...</option>';
      
      // Filter environments by group
      const sameGroupEnvs = environments.filter(env => {
        if (!env || !env.url || !env.name) return false;
        
        // If current env has no group, only show other envs with no group
        if (!currentEnv?.group) {
          return !env.group;
        }
        // Otherwise show envs with the same group
        return env.group?.toLowerCase() === currentEnv.group?.toLowerCase();
      });

      console.log('Current environment:', currentEnv);
      console.log('Same group environments:', sameGroupEnvs);

      sameGroupEnvs.forEach(env => {
        if (!env || !env.url || !env.name) return;
        
        try {
          const envUrl = new URL(env.url);
          // Only add environments that are not the current one
          if (envUrl.origin !== currentUrlObj.origin) {
    const option = document.createElement('option');
            option.value = env.url;
    option.textContent = env.name;
    envSelect.appendChild(option);
          }
        } catch (e) {
          console.error('Error parsing environment URL:', e);
        }
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

      const env = environments.find(e => e.url === selectedEnvUrl);
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
        const newUrl = env.url + path;
        
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
        let url = document.getElementById('env-url').value.trim();

        if (!name || !url) {
          alert('Please fill in all required fields');
      return;
    }

    try {
          // Ensure URL has protocol
          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
          }

          // Parse and reconstruct URL to ensure consistency
          const urlObj = new URL(url);
          // Remove trailing slash if it exists
          url = urlObj.origin + (urlObj.pathname !== '/' ? urlObj.pathname : '');

          // Get existing environments
          const { environments = [] } = await chrome.storage.sync.get('environments');
          environments.push({ name, url });
          await chrome.storage.sync.set({ environments });
          window.location.reload();
    } catch (e) {
      alert('Please enter a valid URL');
      return;
        }
      });
    }

    // Update environment list
    const envList = document.getElementById('env-list');
    if (envList) {
      envList.innerHTML = '';
      
      // Group environments
      const groupedEnvs = {};
      environments.forEach(env => {
        const group = env.group || 'No Group';
        if (!groupedEnvs[group]) {
          groupedEnvs[group] = [];
        }
        groupedEnvs[group].push(env);
      });

      // Create sections for each group
      Object.entries(groupedEnvs).forEach(([group, envs]) => {
        // Add group header if it's not "No Group"
        if (group !== 'No Group') {
          const groupHeader = document.createElement('div');
          groupHeader.className = 'group-header';
          groupHeader.textContent = group;
          envList.appendChild(groupHeader);
        }

        // Add environments for this group
        envs.forEach(env => {
      const envItem = document.createElement('div');
      envItem.className = 'env-item';
      envItem.innerHTML = `
            <div class="env-info">
              <div class="env-name">
                <span class="env-dot"></span>
                <span class="env-text">${env.name}</span>
                ${env.group ? `<span class="env-badge">${env.group}</span>` : ''}
              </div>
              <div class="env-url">${env.url}</div>
            </div>
            <div class="env-actions">
              <button class="delete-btn" data-name="${env.name}" data-url="${env.url}" data-group="${env.group || ''}">
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
                try {
                  console.log('Deleting environment:', env);
                  
                  // Direct approach: clear all environments and add back all except the one to delete
                  const { environments = [] } = await chrome.storage.sync.get('environments');
                  console.log('Original environments:', environments);
                  
                  // Create a new array without the environment to delete
                  const newEnvs = [];
                  for (const e of environments) {
                    // Skip the environment we want to delete
                    if (e.name === env.name && e.url === env.url) {
                      console.log('Skipping environment:', e);
                      continue;
                    }
                    newEnvs.push(e);
                  }
                  
                  console.log('New environments array:', newEnvs);
                  
                  // Set the new environments array
                  await chrome.storage.sync.set({ environments: newEnvs });
                  console.log('Storage updated');
                  
                  // Refresh the page to show updated list
                  window.location.reload();
                } catch (error) {
                  console.error('Error deleting environment:', error);
                  alert('Error deleting environment: ' + error.message);
                }
              }
            });
          }
        });
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
        const currentEnv = environments.find(env => currentUrl.startsWith(env.url));
        if (!currentEnv) {
          alert('Could not determine current environment');
          return;
        }

        // Find selected environment
        const selectedEnvObj = environments.find(env => env.url === selectedEnv);
        if (!selectedEnvObj) {
          alert('Selected environment not found');
          return;
        }

        // Extract path from current URL
        const path = currentUrl.replace(currentEnv.url, '');
        
        // Construct comparison URLs
        const env2Url = selectedEnvObj.url.replace(/\/$/, '') + path;
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

    // Delete environment function
    async function deleteEnvironment(name, url) {
      try {
        console.log(`Attempting to delete environment: ${name} (${url})`);
        
        // Get all environments directly from storage
        const data = await chrome.storage.sync.get('environments');
        console.log('Current storage data:', data);
        
        const environments = data.environments || [];
        console.log('Current environments:', environments);
        
        // Find the environment to delete
        const updatedEnvironments = environments.filter(env => {
          const match = env.name === name && env.url === url;
          if (match) {
            console.log('Found environment to delete:', env);
          }
          return !match;
        });
        
        console.log('Updated environments:', updatedEnvironments);
        
        // Save the updated environments directly to storage
        await chrome.storage.sync.set({ environments: updatedEnvironments });
        console.log('Storage updated successfully');
        
        // Reload the page to show updated environments
        window.location.reload();
      } catch (error) {
        console.error('Error deleting environment:', error);
        alert('Failed to delete environment: ' + error.message);
      }
    }

    // Add global event listener for delete buttons
    document.addEventListener('click', async function(event) {
      const deleteButton = event.target.closest('.delete-btn');
      if (deleteButton) {
        const envItem = deleteButton.closest('.env-item');
        const nameElement = envItem.querySelector('.env-text');
        const urlElement = envItem.querySelector('.env-url');
        
        if (nameElement && urlElement) {
          const name = nameElement.textContent;
          const url = urlElement.textContent;
          
          if (confirm(`Are you sure you want to delete ${name}?`)) {
            event.preventDefault();
            event.stopPropagation();
            await deleteEnvironment(name, url);
          }
        }
      }
    });

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