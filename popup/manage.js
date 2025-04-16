// Initialize management page
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Get environments from storage
    const { environments = [] } = await chrome.storage.sync.get('environments');

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
        updateEnvList();
        
        // Clear form
        document.getElementById('env-name').value = '';
        document.getElementById('env-url').value = '';
      });
    }

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

    // Update environment list
    function updateEnvList() {
      const envList = document.getElementById('env-list');
      if (!envList) return;

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
              updateEnvList();
            }
          });
        }
      });
    }

    // Initial render
    updateEnvList();

  } catch (error) {
    console.error('Error initializing management page:', error);
  }
}); 