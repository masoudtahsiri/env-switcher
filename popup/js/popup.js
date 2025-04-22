// Function to determine environment type based on name (legacy support)
function getEnvironmentType(env) {
  // If environment has a type property, use it
  if (env.type) {
    return env.type;
  }
  
  // Legacy support: determine type from name
  if (!env.name) return '';
  
  const lowerName = env.name.toLowerCase();
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

class Popup {
  constructor() {
    this.environments = [];
    this.currentTab = null;
    this.init();
  }

  async init() {
    try {
      // Get current tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      this.currentTab = tabs[0];
      
      // Load environments
      await this.loadEnvironments();
      
      // Setup event listeners
      this.setupEventListeners();
    } catch (error) {
      console.error('Error initializing popup:', error);
    }
  }

  async loadEnvironments() {
    const storage = await chrome.storage.sync.get('environments');
    this.environments = storage.environments || [];
    this.updateEnvironmentList();
  }

  updateEnvironmentList() {
    const envSelect = document.getElementById('env-select');
    if (!envSelect) return;

    // Clear existing options
    while (envSelect.options.length > 1) {
      envSelect.remove(1);
    }

    // Get current environment and URL
    const currentUrl = this.currentTab.url;
    console.log('Current URL:', currentUrl);

    // Get current environment
    const currentEnv = this.environments.find(env => {
      if (!env?.url) return false;
      
      try {
        // Parse URLs
        const currentUrlObj = new URL(currentUrl);
        const envUrlObj = new URL(env.url);
        
        // Get hostnames without www
        const currentHostname = currentUrlObj.hostname.replace(/^www\./, '');
        const envHostname = envUrlObj.hostname.replace(/^www\./, '');
        
        console.log('Comparing hostnames:', {
          current: currentHostname,
          env: envHostname,
          matches: currentHostname === envHostname
        });
        
        return currentHostname === envHostname;
      } catch (e) {
        console.error('Error parsing URL:', e);
        return false;
      }
    });

    console.log('Current environment:', currentEnv);
    console.log('All environments:', this.environments);

    // If no current environment is found, don't show any environments in the dropdown
    if (!currentEnv) {
      this.updateCurrentEnvironmentDisplay(null);
      return;
    }

    // Filter environments to only show those from the same group
    const sameGroupEnvs = this.environments.filter(env => {
      // Skip if no group info
      if (!env) return false;
      
      // If current env has no group, only show other envs with no group
      if (!currentEnv.group) {
        return !env.group;
      }
      
      // Otherwise show envs with the same group
      const isInSameGroup = env.group?.toLowerCase() === currentEnv.group?.toLowerCase();
      console.log('Group comparison:', {
        envName: env.name,
        envGroup: env.group,
        currentGroup: currentEnv.group,
        isInSameGroup
      });
      
      return isInSameGroup;
    });

    console.log('Same group environments:', sameGroupEnvs);

    // Add environments to dropdown
    sameGroupEnvs.forEach(env => {
      if (env.name !== currentEnv.name) {
        const option = document.createElement('option');
        option.value = env.name;
        option.textContent = env.name;
        envSelect.appendChild(option);
      }
    });

    // Update current environment display
    this.updateCurrentEnvironmentDisplay(currentEnv);
  }

  // Helper method to update the current environment display
  updateCurrentEnvironmentDisplay(env) {
    const envNameElement = document.querySelector('.env-name .env-text');
    const envUrlElement = document.querySelector('.env-url');
    const envDotElement = document.querySelector('.env-dot');
    
    if (!envNameElement || !envUrlElement || !envDotElement) {
      console.error('Environment display elements not found');
      return;
    }
    
    if (env) {
      // Update text content
      envNameElement.textContent = env.name;
      envUrlElement.textContent = env.url;
      
      // Update dot color based on environment type
      envDotElement.className = 'env-dot';
      const envType = getEnvironmentType(env);
      if (envType) {
        envDotElement.classList.add(envType);
      }
    } else {
      // No environment found
      envNameElement.textContent = 'Unknown Environment';
      envUrlElement.textContent = this.currentTab ? this.currentTab.url : 'Unknown URL';
      envDotElement.className = 'env-dot';
    }
  }

  setupEventListeners() {
    // Add event listener for environment switch
    const switchButton = document.getElementById('switch-environment');
    if (switchButton) {
      switchButton.addEventListener('click', () => this.switchEnvironment());
    }

    // Add event listener for compare button
    const compareButton = document.getElementById('compare-environments');
    if (compareButton) {
      compareButton.addEventListener('click', () => this.compareEnvironments());
    }
  }

  async switchEnvironment() {
    const envSelect = document.getElementById('env-select');
    const selectedEnvName = envSelect.value;
    
    if (!selectedEnvName) {
      alert('Please select an environment to switch to');
      return;
    }

    const targetEnv = this.environments.find(env => env.name === selectedEnvName);
    if (!targetEnv) {
      alert('Selected environment not found');
      return;
    }

    try {
      // Extract the path from the current URL
      const currentUrl = this.currentTab.url;
      const currentUrlObj = new URL(currentUrl);
      const path = currentUrlObj.pathname + currentUrlObj.search + currentUrlObj.hash;
      
      // Create a new URL object from the target environment URL
      const targetUrlObj = new URL(targetEnv.url);
      
      // Set the path, search, and hash from the current URL
      targetUrlObj.pathname = path;
      
      // Get the final URL string
      const newUrl = targetUrlObj.toString();
      
      // Open the URL in a new tab
      await chrome.tabs.create({ url: newUrl });
    } catch (error) {
      console.error('Error switching environment:', error);
      alert('Error switching environment: ' + error.message);
    }
  }

  async compareEnvironments() {
    // Get current environment
    const currentEnv = this.environments.find(env => {
      if (!env || !env.url) return false;
      const currentUrl = this.currentTab.url;
      const envUrl = env.url;
      
      // Convert URLs to lowercase for comparison
      const currentUrlLower = currentUrl.toLowerCase();
      const envUrlLower = env.url.toLowerCase();
      
      // Remove protocol and www for comparison
      const cleanCurrentUrl = currentUrlLower.replace(/https?:\/\/(www\.)?/, '');
      const cleanEnvUrl = envUrlLower.replace(/https?:\/\/(www\.)?/, '');
      
      return cleanCurrentUrl.includes(cleanEnvUrl);
    });

    if (!currentEnv) {
      alert('Could not determine current environment');
      return;
    }

    // Get other environments from the same group
    const sameGroupEnvs = this.environments.filter(env => {
      if (!currentEnv.group) {
        return !env.group;
      }
      return env.group === currentEnv.group;
    });

    // Filter out current environment
    const otherEnvs = sameGroupEnvs.filter(env => env.name !== currentEnv.name);

    if (otherEnvs.length === 0) {
      alert('No other environments in the same group to compare with');
      return;
    }

    // Open comparison page
    const comparisonUrl = chrome.runtime.getURL('comparison/comparison.html');
    await chrome.tabs.create({ url: comparisonUrl });
  }
}

// Initialize popup
new Popup();

// Update the current environment section
async function updateCurrentEnvironment() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentUrl = tabs[0].url;
    
    // Get environments from storage
    const { environments = [] } = await chrome.storage.sync.get('environments');
    
    // Find a matching environment
    const currentEnv = environments.find(env => {
      return currentUrl.includes(new URL(env.url).host);
    });
    
    const envNameElement = document.querySelector('.env-name .env-text');
    const envUrlElement = document.querySelector('.env-url');
    const envDotElement = document.querySelector('.env-dot');
    
    if (currentEnv) {
      // Set environment name and URL
      envNameElement.textContent = currentEnv.name;
      envUrlElement.textContent = currentEnv.url;
      
      // Set environment color based on type
      const envType = getEnvironmentType(currentEnv);
      envDotElement.className = 'env-dot';
      if (envType) {
        envDotElement.classList.add(envType);
      }
      
      // Remove current environment from dropdown options
      const currentHost = new URL(currentEnv.url).host;
      environments.forEach(env => {
        if (env.name !== currentEnv.name && new URL(env.url).host === currentHost) {
          // Don't add the current environment to the dropdown
        }
      });
    } else {
      envNameElement.textContent = 'Unknown Environment';
      envUrlElement.textContent = currentUrl;
      envDotElement.className = 'env-dot';
    }
  } catch (error) {
    console.error('Error updating current environment:', error);
  }
} 