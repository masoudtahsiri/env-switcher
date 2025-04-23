// Helper function to generate the base environment name from type
function generateBaseName(type, url) {
  if (type === 'custom') {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace(/^www\./, '');
    } catch (e) {
      console.error('Invalid URL for custom name:', url);
      return 'Custom'; // Fallback name
    }
  }
  // Handle acronyms like UAT, QA
  if (type === 'uat' || type === 'qa') {
    return type.toUpperCase();
  }
  // Capitalize first letter for others
  return type.charAt(0).toUpperCase() + type.slice(1);
}

class EnvironmentManager {
  constructor() {
    this.initialize();
  }

  async initialize() {
    // Wait for DOM to be ready
    await this.waitForElements();
    
    // Add global event listeners that should only be added once
    this.addGlobalEventListeners();
    
    // Update UI elements
    await this.updateEnvironmentList();
    await this.updateGroupsList();
  }

  async waitForElements() {
    return new Promise((resolve) => {
      const checkElements = () => {
        const form = document.getElementById('envForm');
        const addGroupBtn = document.getElementById('addGroupBtn');
        const envList = document.getElementById('envList');
        const groupSelect = document.getElementById('envGroup');
        
        if (form && addGroupBtn && envList && groupSelect) {
          resolve();
        } else {
          setTimeout(checkElements, 100);
        }
      };
      
      checkElements();
    });
  }

  async saveEnvironment() {
    const name = document.getElementById('envName').value.trim();
    const url = document.getElementById('envUrl').value.trim();
    const group = document.getElementById('envGroup').value.trim();

    if (!name || !url) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      // Validate URL
      new URL(url);

      // Get existing environments
      const { environments = [] } = await chrome.storage.sync.get('environments');

      // Check if name already exists
      if (environments.some(env => env.name === name)) {
        alert('An environment with this name already exists');
        return;
      }

      // Add new environment
      environments.push({
        name,
        url,
        group: group || null // Store group if provided
      });

      // Save to storage
      await chrome.storage.sync.set({ environments });

      // Update UI
      await this.updateEnvironmentList();
      await this.updateGroupsList();
      
      // Clear form
      document.getElementById('envName').value = '';
      document.getElementById('envUrl').value = '';
      document.getElementById('envGroup').value = '';

      alert('Environment saved successfully!');
    } catch (error) {
      console.error('Error saving environment:', error);
      alert('Error saving environment: ' + error.message);
    }
  }

  async updateEnvironmentList() {
    const { environments = [] } = await chrome.storage.sync.get('environments');
    const list = document.getElementById('envList');
    
    if (!list) {
      console.error('Environment list element not found!');
      return;
    }
    
    list.innerHTML = '';

    // Group environments by their group
    const groupedEnvs = environments.reduce((groups, env) => {
      const group = env.group || 'Ungrouped';
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(env);
      return groups;
    }, {});

    // Display environments by group
    Object.entries(groupedEnvs).forEach(([group, envs]) => {
      const groupHeader = document.createElement('div');
      groupHeader.className = 'group-header';
      groupHeader.textContent = group;
      list.appendChild(groupHeader);

      envs.forEach(env => {
        const item = document.createElement('div');
        item.className = 'env-item';
        
        // Get environment type class
        const envType = this.getEnvironmentTypeFromName(env.name);
        
        item.innerHTML = `
          <div class="env-info">
            <div class="env-name">
              <span class="env-dot ${envType}"></span>
              <span class="env-text">${env.name}</span>
              ${env.group ? `<span class="env-badge">${env.group}</span>` : ''}
            </div>
            <div class="env-url">${env.url}</div>
          </div>
          <div class="env-actions">
            <button class="edit-btn" data-name="${env.name}" data-url="${env.url}" title="Edit Environment">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </button>
            <button class="delete-btn" data-name="${env.name}" data-url="${env.url}" title="Delete Environment">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>
        `;
        list.appendChild(item);
      });
    });

    // Add event listeners for environment items
    this.addEnvironmentEventListeners();
  }

  async updateGroupsList() {
    const { environments = [] } = await chrome.storage.sync.get('environments');
    const groupSelect = document.getElementById('envGroup');
    
    if (!groupSelect) {
      console.error('Group select element not found!');
      return;
    }
    
    // Clear existing options except the first one
    while (groupSelect.options.length > 1) {
      groupSelect.remove(1);
    }

    // Get unique groups
    const groups = [...new Set(environments.map(env => env.group).filter(Boolean))];

    // Add groups to select
    groups.forEach(group => {
      const option = document.createElement('option');
      option.value = group;
      option.textContent = group;
      groupSelect.appendChild(option);
    });
  }

  async deleteGroup(groupName) {
    if (!confirm(`Are you sure you want to delete the group "${groupName}"? This will remove the group from all environments.`)) {
      return;
    }

    try {
      const { environments = [] } = await chrome.storage.sync.get('environments');
      
      // Remove group from environments
      const updatedEnvironments = environments.map(env => {
        if (env.group === groupName) {
          return { ...env, group: null };
        }
        return env;
      });

      await chrome.storage.sync.set({ environments: updatedEnvironments });
      await this.updateEnvironmentList();
      await this.updateGroupsList();
      
      alert('Group deleted successfully!');
    } catch (error) {
      alert('Error deleting group: ' + error.message);
    }
  }

  // Event listeners for dynamic environment items (added after each update)
  addEnvironmentEventListeners() {
    // Add event listeners for edit buttons
    document.querySelectorAll('.edit-btn').forEach(button => {
      button.addEventListener('click', async (e) => {
        // Make sure we get the button even if we clicked on the SVG or path
        const button = e.target.closest('.edit-btn');
        if (!button) return;
        
        const envName = button.dataset.name;
        const envUrl = button.dataset.url;
        
        const { environments = [] } = await chrome.storage.sync.get('environments');
        const env = environments.find(e => e.name === envName && e.url === envUrl);
        
        if (env) {
          // Populate form with environment data
          document.getElementById('envName').value = env.name;
          document.getElementById('envUrl').value = env.url;
          document.getElementById('envGroup').value = env.group || '';
          
          // Change button text to "Update"
          const submitButton = document.querySelector('button[type="submit"]');
          submitButton.textContent = 'Update Environment';
          submitButton.dataset.editing = envName;
          submitButton.dataset.editingUrl = envUrl;
          
          // Scroll to the form
          document.querySelector('.card').scrollIntoView({ behavior: 'smooth' });
        }
      });
    });

    // Add event listener for delete buttons
    document.querySelectorAll('.delete-btn').forEach(button => {
      button.addEventListener('click', async (e) => {
        // Make sure we get the button even if we clicked on the SVG or path
        const button = e.target.closest('.delete-btn');
        if (!button) return;
        
        const envName = button.dataset.name;
        const envUrl = button.dataset.url;
        
        if (confirm(`Are you sure you want to delete the environment "${envName}"?`)) {
          try {
            const { environments = [] } = await chrome.storage.sync.get('environments');
            const updatedEnvs = environments.filter(env => !(env.name === envName && env.url === envUrl));
            await chrome.storage.sync.set({ environments: updatedEnvs });
            await this.updateEnvironmentList();
            await this.updateGroupsList();
            
            // If this was the last environment, clear the form
            if (updatedEnvs.length === 0) {
              document.getElementById('envName').value = '';
              document.getElementById('envUrl').value = '';
              document.getElementById('envGroup').value = '';
              const submitButton = document.querySelector('button[type="submit"]');
              submitButton.textContent = 'Add Environment';
              delete submitButton.dataset.editing;
              delete submitButton.dataset.editingUrl;
            }
          } catch (error) {
            console.error('Error deleting environment:', error);
            alert('Error deleting environment: ' + error.message);
          }
        }
      });
    });
  }

  // Event listeners for static elements (added only once)
  addGlobalEventListeners() {
    const form = document.getElementById('envForm');
    const addGroupBtn = document.getElementById('addGroupBtn');
    const setDomainBtn = document.getElementById('setDomainBtn');
    const backButton = document.getElementById('back-to-main');
    
    if (backButton) {
      backButton.addEventListener('click', () => {
        // Simply navigate to popup.html
        window.location.href = 'popup.html';
      });
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const type = document.getElementById('envType').value.trim();
        const url = document.getElementById('envUrl').value.trim();
        const group = document.getElementById('envGroup').value.trim();
        const submitButton = e.target.querySelector('button[type="submit"]');
        const isEditing = submitButton.dataset.editing; // Original name of env being edited
        const editingUrl = submitButton.dataset.editingUrl; // Original URL of env being edited

        if (!type || !url) {
          alert('Please fill in all required fields');
          return;
        }

        try {
          // Validate URL
          new URL(url);

          // Get existing environments
          const { environments = [] } = await chrome.storage.sync.get('environments');

          // Generate the base name using the helper function
          const generatedName = generateBaseName(type, url);

          if (isEditing) {
            // Find the environment using its original name and URL
            const index = environments.findIndex(env => env.name === isEditing && env.url === editingUrl);
            
            if (index !== -1) {
              // Check if the NEW combination of type and URL already exists (excluding the one being edited)
              if (environments.some((env, i) => i !== index && env.type === type && env.url === url)) {
                alert('Another environment with this type and URL already exists.');
                return;
              }
              
              // Update the environment, using the newly generated name
              environments[index] = {
                name: generatedName, // Use the generated name directly
                type,
                url,
                group: group || null
              };
              
              // Save to storage
              await chrome.storage.sync.set({ environments });

              // Reset form
              submitButton.textContent = 'Add Environment';
              delete submitButton.dataset.editing;
              delete submitButton.dataset.editingUrl;
              document.getElementById('envType').value = '';
              document.getElementById('envUrl').value = '';
              document.getElementById('envGroup').value = '';

              // Update UI
              await this.updateEnvironmentList();
              await this.updateGroupsList();

              alert('Environment updated successfully!');
            } else {
              alert(`Error: Could not find environment "${isEditing}" to update`);
            }
          } else {
            // Check if type and URL already exists when adding
            if (environments.some(env => env.type === type && env.url === url)) {
              alert('An environment with this type and URL already exists');
              return;
            }

            // Add new environment using the generated name directly
            environments.push({
              name: generatedName, // Use the generated name directly
              type,
              url,
              group: group || null
            });
            
            // Save to storage
            await chrome.storage.sync.set({ environments });

            // Reset form
            document.getElementById('envType').value = '';
            document.getElementById('envUrl').value = '';
            document.getElementById('envGroup').value = '';

            // Update UI
            await this.updateEnvironmentList();
            await this.updateGroupsList();

            alert('Environment added successfully!');
          }
        } catch (error) {
          console.error('Error saving environment:', error);
          alert('Error saving environment: ' + error.message);
        }
      });
    }
    
    if (addGroupBtn) {
      addGroupBtn.addEventListener('click', async () => {
        const groupName = prompt('Enter new group name:');
        if (groupName && groupName.trim()) {
          // Get existing environments to check for duplicate groups
          const { environments = [] } = await chrome.storage.sync.get('environments');
          const existingGroups = [...new Set(environments.map(env => env.group).filter(Boolean))];
          
          if (existingGroups.includes(groupName.trim())) {
            alert('A group with this name already exists');
            return;
          }
          
          // Add the new group to the dropdown
          const groupSelect = document.getElementById('envGroup');
          const option = document.createElement('option');
          option.value = groupName.trim();
          option.textContent = groupName.trim();
          groupSelect.appendChild(option);
          
          // Select the new group
          groupSelect.value = groupName.trim();
          
          // Focus on the form
          document.getElementById('envType').focus();
        }
      });
    }

    if (setDomainBtn) {
      setDomainBtn.addEventListener('click', async () => {
        try {
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tabs.length > 0) {
            const currentUrl = tabs[0].url;
            const urlField = document.getElementById('envUrl');
            if (currentUrl && urlField) {
              const urlObj = new URL(currentUrl);
              urlField.value = urlObj.origin;
            }
          } else {
            console.error('No active tab found.');
            alert('Could not get URL from the current tab.');
          }
        } catch (error) {
          console.error('Error fetching current URL:', error);
          alert('Error fetching current URL. Make sure the tab is fully loaded.');
        }
      });
    }

    // Add event listener for delete group button
    const deleteGroupBtn = document.getElementById('deleteGroupBtn');
    if (deleteGroupBtn) {
      deleteGroupBtn.addEventListener('click', () => {
        const groupSelect = document.getElementById('envGroup');
        const selectedGroup = groupSelect.value;
        
        if (!selectedGroup) {
          alert('Please select a group to delete');
          return;
        }

        if (confirm(`Are you sure you want to delete the group "${selectedGroup}"?`)) {
          chrome.storage.sync.get(['environments'], (result) => {
            const environments = result.environments || [];
            
            // Remove group from environments
            const updatedEnvironments = environments.map(env => {
              if (env.group === selectedGroup) {
                return { ...env, group: '' };
              }
              return env;
            });

            // Update storage
            chrome.storage.sync.set({ environments: updatedEnvironments }, () => {
              // Update the group select options
              updateGroupSelect();
              // Update the environment list
              updateEnvironmentList();
            });
          });
        }
      });
    }
  }

  // Helper function to determine environment type from name
  getEnvironmentTypeFromName(name) {
    if (!name) return 'custom';
    
    const lowerName = name.toLowerCase();
    if (lowerName.includes('staging') || lowerName.includes('stg')) {
      return 'staging';
    } else if (lowerName.includes('prod') || lowerName.includes('production')) {
      return 'production';
    } else if (lowerName.includes('dev') || lowerName.includes('development')) {
      return 'development';
    } else if (lowerName.includes('uat')) {
      return 'uat';
    } else if (lowerName.includes('qa') || lowerName.includes('test')) {
      return 'qa';
    }
    return 'custom';
  }
}

// Initialize the environment manager when the page loads
document.addEventListener('DOMContentLoaded', () => {
  new EnvironmentManager();
}); 