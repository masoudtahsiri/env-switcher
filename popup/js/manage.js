class EnvironmentManager {
  constructor() {
    this.initialize();
  }

  async initialize() {
    await this.updateEnvironmentList();
    this.addEventListeners();
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
    const list = document.getElementById('environment-list');
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
        item.className = 'environment-item';
        item.innerHTML = `
          <div class="environment-info">
            <span class="environment-name">${env.name}</span>
            <span class="environment-url">${env.url}</span>
            ${env.group ? `<span class="environment-group">Group: ${env.group}</span>` : ''}
          </div>
          <div class="environment-actions">
            <button class="edit-btn" data-name="${env.name}">Edit</button>
            <button class="delete-btn" data-name="${env.name}">Delete</button>
          </div>
        `;
        list.appendChild(item);
      });
    });

    // Add event listeners
    this.addEventListeners();
  }

  addEventListeners() {
    // Add event listeners for edit buttons
    document.querySelectorAll('.edit-btn').forEach(button => {
      button.addEventListener('click', async (e) => {
        const envName = e.target.dataset.name;
        const { environments = [] } = await chrome.storage.sync.get('environments');
        const env = environments.find(e => e.name === envName);
        
        if (env) {
          // Populate form with environment data
          document.getElementById('env-name').value = env.name;
          document.getElementById('env-url').value = env.url;
          document.getElementById('env-group').value = env.group || '';
          
          // Change button text to "Update"
          const submitButton = document.querySelector('button[type="submit"]');
          submitButton.textContent = 'Update Environment';
          submitButton.dataset.editing = envName;
        }
      });
    });

    // Add event listener for delete buttons
    document.querySelectorAll('.delete-btn').forEach(button => {
      button.addEventListener('click', async (e) => {
        const envName = e.target.dataset.name;
        if (confirm(`Are you sure you want to delete the environment "${envName}"?`)) {
          try {
            const { environments = [] } = await chrome.storage.sync.get('environments');
            const updatedEnvs = environments.filter(env => env.name !== envName);
            await chrome.storage.sync.set({ environments: updatedEnvs });
            this.updateEnvironmentList();
            
            // If this was the last environment, clear the form
            if (updatedEnvs.length === 0) {
              document.getElementById('env-name').value = '';
              document.getElementById('env-url').value = '';
              document.getElementById('env-group').value = '';
              const submitButton = document.querySelector('button[type="submit"]');
              submitButton.textContent = 'Add Environment';
              delete submitButton.dataset.editing;
            }
          } catch (error) {
            console.error('Error deleting environment:', error);
            alert('Error deleting environment: ' + error.message);
          }
        }
      });
    });

    // Add event listener for form submission
    document.querySelector('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = document.getElementById('env-name').value.trim();
      const url = document.getElementById('env-url').value.trim();
      const group = document.getElementById('env-group').value.trim();
      const submitButton = document.querySelector('button[type="submit"]');
      const isEditing = submitButton.dataset.editing;

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
          // Update existing environment
          const index = environments.findIndex(env => env.name === isEditing);
          if (index !== -1) {
            environments[index] = {
              name,
              url,
              group: group || null
            };
          }
        } else {
          // Check if name already exists
          if (environments.some(env => env.name === name)) {
            alert('An environment with this name already exists');
            return;
          }

          // Add new environment
          environments.push({
            name,
            url,
            group: group || null
          });
        }

        // Save to storage
        await chrome.storage.sync.set({ environments });

        // Update UI
        this.updateEnvironmentList();
        
        // Clear form and reset button
        document.getElementById('env-name').value = '';
        document.getElementById('env-url').value = '';
        document.getElementById('env-group').value = '';
        submitButton.textContent = 'Add Environment';
        delete submitButton.dataset.editing;

        alert(isEditing ? 'Environment updated successfully!' : 'Environment added successfully!');
      } catch (error) {
        alert('Error saving environment: ' + error.message);
      }
    });
  }
}

// Initialize the environment manager when the page loads
document.addEventListener('DOMContentLoaded', () => {
  new EnvironmentManager();
}); 