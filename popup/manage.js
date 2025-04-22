// Initialize management page
document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('add-env-form');
  const envList = document.getElementById('env-list');
  const groupSelect = document.getElementById('env-group');
  const addGroupBtn = document.getElementById('add-group-btn');
  const setDomainBtn = document.getElementById('set-domain-btn');

  // Load environments and populate groups
  loadEnvironmentsAndGroups();

  // Add new environment
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    const name = document.getElementById('env-name').value.trim();
    const url = document.getElementById('env-url').value.trim();
    const group = groupSelect.value || null;

    if (!name || !url) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      new URL(url); // Validate URL
    } catch (e) {
      alert('Please enter a valid URL');
      return;
    }

    chrome.storage.sync.get(['environments'], function(result) {
      const environments = result.environments || [];
      environments.push({ name, url, group });
      
      chrome.storage.sync.set({ environments }, function() {
        loadEnvironmentsAndGroups();
        form.reset();
      });
    });
  });

  // Add new group
  addGroupBtn.addEventListener('click', function() {
    const groupName = prompt('Enter new group name:');
    if (!groupName) return;

    const trimmedGroupName = groupName.trim();
    if (!trimmedGroupName) {
      alert('Group name cannot be empty');
      return;
    }

    chrome.storage.sync.get(['groups'], function(result) {
      const groups = result.groups || [];
      if (!groups.includes(trimmedGroupName)) {
        groups.push(trimmedGroupName);
        chrome.storage.sync.set({ groups }, function() {
          addGroupOption(trimmedGroupName);
        });
      }
    });
  });

  // Set domain from current tab
  setDomainBtn.addEventListener('click', function() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs[0] && tabs[0].url) {
        try {
          const url = new URL(tabs[0].url);
          document.getElementById('env-url').value = url.origin;
        } catch (e) {
          console.error('Error parsing URL:', e);
        }
      }
    });
  });

  // Delete environment
  envList.addEventListener('click', function(e) {
    if (e.target.closest('.delete-btn')) {
      const envItem = e.target.closest('.env-item');
      if (!envItem) return;

      const envIndex = Array.from(envList.children).indexOf(envItem);
      if (envIndex === -1) return;

      if (confirm('Are you sure you want to delete this environment?')) {
        chrome.storage.sync.get(['environments'], function(result) {
          const environments = result.environments || [];
          environments.splice(envIndex, 1);
          
          chrome.storage.sync.set({ environments }, function() {
            loadEnvironmentsAndGroups();
          });
        });
      }
    }
  });
});

function loadEnvironmentsAndGroups() {
  chrome.storage.sync.get(['environments', 'groups'], function(result) {
    const environments = result.environments || [];
    const groups = result.groups || [];

    // Populate groups dropdown
    const groupSelect = document.getElementById('env-group');
    if (groupSelect) {
      groupSelect.innerHTML = '<option value="">Select a group</option>';
      groups.forEach(group => addGroupOption(group));
    }

    // Populate environment list
    const envList = document.getElementById('env-list');
    if (!envList) return;
    
    envList.innerHTML = '';
    
    // Group environments
    const groupedEnvs = {};
    environments.forEach(env => {
      if (!env) return;
      const group = env.group || 'No Group';
      if (!groupedEnvs[group]) {
        groupedEnvs[group] = [];
      }
      groupedEnvs[group].push(env);
    });

    // Create environment items by group
    Object.entries(groupedEnvs).forEach(([group, envs]) => {
      if (group !== 'No Group') {
        const groupHeader = document.createElement('div');
        groupHeader.className = 'group-header';
        groupHeader.textContent = group;
        envList.appendChild(groupHeader);
      }

      envs.forEach(env => {
        if (!env) return;
        const envItem = createEnvironmentItem(env);
        if (envItem) {
          envList.appendChild(envItem);
        }
      });
    });
  });
}

function addGroupOption(groupName) {
  if (!groupName) return;
  
  const groupSelect = document.getElementById('env-group');
  if (!groupSelect) return;

  const option = document.createElement('option');
  option.value = groupName;
  option.textContent = groupName;
  groupSelect.appendChild(option);
}

function createEnvironmentItem(env) {
  if (!env || !env.name || !env.url) return null;

  const envItem = document.createElement('div');
  envItem.className = 'env-item';
  envItem.innerHTML = `
    <div class="env-info">
      <div class="env-name">
        <span class="env-text">${env.name}</span>
        ${env.group ? `<span class="env-badge">${env.group}</span>` : ''}
      </div>
      <div class="env-url">${env.url}</div>
    </div>
    <div class="env-actions">
      <button class="delete-btn" title="Delete Environment">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>
  `;
  return envItem;
}

// Delete environment function
async function deleteEnvironment(name, url) {
  try {
    console.log(`Attempting to delete environment: ${name} (${url})`);
    
    // Get all environments
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

// Add event listener to the document for delete buttons
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
        await deleteEnvironment(name, url);
      }
    }
  }
}); 