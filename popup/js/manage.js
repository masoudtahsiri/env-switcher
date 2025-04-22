class EnvironmentManager {
  constructor() {
    this.initialize();
  }

  async initialize() {
    // Add global event listeners that should only be added once
    this.addGlobalEventListeners();
    
    // Update UI elements
    await this.updateEnvironmentList();
    await this.updateGroupsList();
  }

  async saveEnvironment() {
    const name = document.getElementById('env-name').value.trim();
    const url = document.getElementById('env-url').value.trim();
    const group = document.getElementById('env-group').value.trim();

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
      this.updateEnvironmentList();
      
      // Clear form
      document.getElementById('env-name').value = '';
      document.getElementById('env-url').value = '';
      document.getElementById('env-group').value = '';

      alert('Environment saved successfully!');
    } catch (error) {
      alert('Error saving environment: ' + error.message);
    }
  }

  async updateEnvironmentList() {
    const { environments = [] } = await chrome.storage.sync.get('environments');
    const list = document.getElementById('env-list');
    
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
        item.innerHTML = `
          <div class="env-info">
            <div class="env-name">
              <span class="env-dot"></span>
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
    const groupSelect = document.getElementById('env-group');
    
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
      
      // Disable delete button after deleting a group
      const deleteGroupBtn = document.getElementById('delete-group-btn');
      deleteGroupBtn.disabled = true;
      
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
        console.log('Editing environment:', envName, envUrl);
        
        const { environments = [] } = await chrome.storage.sync.get('environments');
        console.log('All environments:', environments);
        
        // Make sure we're finding the exact match by name and url
        const env = environments.find(e => e.name === envName && e.url === envUrl);
        console.log('Found environment for editing:', env);
        
        if (env) {
          // Verify this is the correct environment
          console.log(`Loading environment: Name: ${env.name}, URL: ${env.url}, Group: ${env.group || 'No Group'}`);
          
          // Populate form with environment data
          document.getElementById('env-name').value = env.name;
          document.getElementById('env-url').value = env.url;
          document.getElementById('env-group').value = env.group || '';
          
          // Change button text to "Update"
          const submitButton = document.querySelector('button[type="submit"]');
          submitButton.textContent = 'Update Environment';
          
          // Store both name and URL to uniquely identify the environment being edited
          submitButton.dataset.editing = envName;
          submitButton.dataset.editingUrl = envUrl;
          
          // Scroll to the form
          document.querySelector('.add-env-card').scrollIntoView({ behavior: 'smooth' });
        } else {
          console.error(`Could not find environment with name: ${envName} and url: ${envUrl}`);
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
        console.log('Deleting environment:', envName, envUrl);
        
        if (confirm(`Are you sure you want to delete the environment "${envName}"?`)) {
          try {
            const { environments = [] } = await chrome.storage.sync.get('environments');
            const updatedEnvs = environments.filter(env => !(env.name === envName && env.url === envUrl));
            await chrome.storage.sync.set({ environments: updatedEnvs });
            await this.updateEnvironmentList();
            await this.updateGroupsList();
            
            // If this was the last environment, clear the form
            if (updatedEnvs.length === 0) {
              document.getElementById('env-name').value = '';
              document.getElementById('env-url').value = '';
              document.getElementById('env-group').value = '';
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
    // Add event listener for form submission
    document.getElementById('add-env-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = document.getElementById('env-name').value.trim();
      const url = document.getElementById('env-url').value.trim();
      const group = document.getElementById('env-group').value.trim();
      const submitButton = e.target.querySelector('button[type="submit"]');
      const isEditing = submitButton.dataset.editing;
      const editingUrl = submitButton.dataset.editingUrl;

      if (!name || !url) {
        alert('Please fill in all required fields');
        return;
      }

      try {
        // Validate URL
        new URL(url);

        // Get existing environments
        const { environments = [] } = await chrome.storage.sync.get('environments');

        if (isEditing) {
          console.log('Updating environment with name:', isEditing, 'and URL:', editingUrl);
          // Update existing environment - use both name and URL to find the exact environment
          const index = environments.findIndex(env => env.name === isEditing && env.url === editingUrl);
          console.log('Found environment at index:', index, environments[index]);
          
          if (index !== -1) {
            const oldEnvironment = environments[index];
            console.log('Updating from:', oldEnvironment);
            console.log('Updating to:', { name, url, group: group || null });
            
            environments[index] = {
              name,
              url,
              group: group || null
            };
            
            // Save to storage
            await chrome.storage.sync.set({ environments });
            console.log('Updated environments saved:', environments);

            // Reset form
            submitButton.textContent = 'Add Environment';
            delete submitButton.dataset.editing;
            delete submitButton.dataset.editingUrl;
            document.getElementById('env-name').value = '';
            document.getElementById('env-url').value = '';
            document.getElementById('env-group').value = '';

            // Update UI
            await this.updateEnvironmentList();
            await this.updateGroupsList();

            alert('Environment updated successfully!');
          } else {
            console.error(`Environment with name "${isEditing}" and URL "${editingUrl}" not found for updating`);
            alert(`Error: Could not find environment "${isEditing}" to update`);
          }
        } else {
          // Check if name and URL already exists
          if (environments.some(env => env.name === name && env.url === url)) {
            alert('An environment with this name and URL already exists');
            return;
          }

          // Add new environment
          environments.push({
            name,
            url,
            group: group || null
          });
          
          // Save to storage
          await chrome.storage.sync.set({ environments });

          // Reset form
          document.getElementById('env-name').value = '';
          document.getElementById('env-url').value = '';
          document.getElementById('env-group').value = '';

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

    // Add event listener for group select change
    const groupSelect = document.getElementById('env-group');
    const deleteGroupBtn = document.getElementById('delete-group-btn');
    
    groupSelect.addEventListener('change', () => {
      // Enable or disable delete button based on selection
      if (groupSelect.value && groupSelect.value !== '') {
        deleteGroupBtn.disabled = false;
      } else {
        deleteGroupBtn.disabled = true;
      }
    });
    
    // Add event listener for delete group button
    deleteGroupBtn.addEventListener('click', async () => {
      const selectedGroup = groupSelect.value;
      
      if (selectedGroup) {
        await this.deleteGroup(selectedGroup);
        groupSelect.value = ''; // Reset to default option
        deleteGroupBtn.disabled = true;
      }
    });

    // Add event listener for add group button
    document.getElementById('add-group-btn').addEventListener('click', async () => {
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
        const option = document.createElement('option');
        option.value = groupName.trim();
        option.textContent = groupName.trim();
        groupSelect.appendChild(option);
        
        // Select the new group
        groupSelect.value = groupName.trim();
        
        // Enable delete button
        deleteGroupBtn.disabled = false;
        
        // Focus on the form
        document.getElementById('env-name').focus();
      }
    });
  }
}

// Initialize the environment manager when the page loads
document.addEventListener('DOMContentLoaded', () => {
  new EnvironmentManager();
}); 