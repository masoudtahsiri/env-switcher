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

  // Helper method to normalize groups for consistent comparison
  normalizeGroup(group) {
    // Log the input group value
    console.log('Normalizing group:', { rawGroup: group });
    
    // If group is null, undefined, or empty string, return null
    if (!group || group.trim() === '') {
      console.log('Group is empty/null/undefined, returning null');
      return null;
    }
    
    // Normalize the group
    const normalized = group.toLowerCase().trim();
    console.log('Normalized group result:', { 
      rawGroup: group,
      normalized: normalized
    });
    
    return normalized;
  }

  // Helper method to get the current environment
  getCurrentEnvironment() {
    if (!this.currentTab || !this.currentTab.url) {
      console.error('No current tab or URL available');
      return null;
    }
    
    const currentUrl = this.currentTab.url;
    console.log('Matching environment for URL:', currentUrl);
    
    try {
      const currentUrlObj = new URL(currentUrl);
      const currentHostname = currentUrlObj.hostname.replace(/^www\./, '');
      
      const currentEnv = this.environments.find(env => {
        if (!env?.url) return false;
        
        try {
          const envUrlObj = new URL(env.url);
          const envHostname = envUrlObj.hostname.replace(/^www\./, '');
          
          // Check for exact match or if current URL starts with environment URL
          const envUrlLower = env.url.toLowerCase();
          const currentUrlLower = currentUrl.toLowerCase();
          
          return currentHostname === envHostname || 
                 currentUrlLower.startsWith(envUrlLower.endsWith('/') ? envUrlLower : envUrlLower + '/');
        } catch (e) {
          console.warn(`Could not parse URL for comparison: ${env.url}`, e);
          // Fallback to simple string comparison if URL parsing fails
          return currentUrl.toLowerCase().startsWith(env.url.toLowerCase());
        }
      });
      
      if (currentEnv) {
        console.log('Found current environment:', {
          name: currentEnv.name,
          url: currentEnv.url,
          group: currentEnv.group
        });
      } else {
        console.warn('No matching environment found for URL:', currentUrl);
      }
      
      return currentEnv;
    } catch (e) {
      console.error('Error identifying current environment:', e);
      return null;
    }
  }

  // Helper method to check if two environments are in the same group
  areInSameGroup(env1, env2) {
    // If either environment is missing, return false
    if (!env1 || !env2) {
      console.log('areInSameGroup: One or both environments are missing', { env1, env2 });
      return false;
    }

    // Log the raw environment data
    console.log('areInSameGroup check:', {
      env1: { 
        name: env1.name, 
        group: env1.group,
        hasGroup: Boolean(env1.group),
        groupType: typeof env1.group
      },
      env2: { 
        name: env2.name, 
        group: env2.group,
        hasGroup: Boolean(env2.group),
        groupType: typeof env2.group
      }
    });

    // Handle case where both environments have no group property at all
    if (!('group' in env1) && !('group' in env2)) {
      console.log('areInSameGroup: Both environments have no group property');
      return true;
    }

    // Normalize both groups
    const group1 = this.normalizeGroup(env1.group);
    const group2 = this.normalizeGroup(env2.group);

    console.log('Normalized groups:', {
      env1: { name: env1.name, originalGroup: env1.group, normalizedGroup: group1 },
      env2: { name: env2.name, originalGroup: env2.group, normalizedGroup: group2 }
    });

    // If both environments have no group (normalized to null), consider them in the same group
    if (group1 === null && group2 === null) {
      console.log('areInSameGroup: Both environments are ungrouped');
      return true;
    }

    // If only one environment has a group, they're not in the same group
    if ((group1 === null && group2 !== null) || (group1 !== null && group2 === null)) {
      console.log('areInSameGroup: One environment is grouped, the other is not');
      return false;
    }

    // Compare the normalized groups
    const sameGroup = group1 === group2;
    console.log('areInSameGroup final result:', { 
      sameGroup,
      group1,
      group2,
      env1Name: env1.name,
      env2Name: env2.name
    });
    
    return sameGroup;
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
    const envSelect = document.getElementById('environmentSelect');
    if (!envSelect) return;

    // Clear existing options
    while (envSelect.options.length > 0) {
      envSelect.remove(0);
    }

    // Get current environment using our helper method
    const currentEnv = this.getCurrentEnvironment();
    console.log('Current environment for dropdown:', JSON.stringify(currentEnv, null, 2));

    // If no current environment is found, show a message and disable the switch button
    if (!currentEnv) {
      console.warn('No current environment found');
      this.updateCurrentEnvironmentDisplay(null);
      
      // Add message option
      const messageOption = document.createElement('option');
      messageOption.value = "";
      messageOption.textContent = "Current URL does not match any environment";
      messageOption.disabled = true;
      messageOption.selected = true;
      envSelect.appendChild(messageOption);
      
      // Disable the switch button
      const switchButton = document.getElementById('switchBtn');
      if (switchButton) {
        switchButton.disabled = true;
      }
      
      return;
    }

    // Enable the switch button
    const switchButton = document.getElementById('switchBtn');
    if (switchButton) {
      switchButton.disabled = false;
    }

    // Update current environment display
    this.updateCurrentEnvironmentDisplay(currentEnv);

    // Get the current environment's group
    const currentGroup = this.normalizeGroup(currentEnv.group);
    console.log('Current environment group:', {
      name: currentEnv.name,
      group: currentEnv.group,
      normalizedGroup: currentGroup,
      url: currentEnv.url
    });

    // Log all available environments
    console.log('All available environments:', this.environments.map(env => ({
      name: env.name,
      group: env.group,
      normalizedGroup: this.normalizeGroup(env.group),
      url: env.url
    })));

    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = "";
    defaultOption.textContent = "Select an environment...";
    defaultOption.disabled = true;
    defaultOption.selected = true;
    envSelect.appendChild(defaultOption);

    // First, filter environments to only those in the same group
    const sameGroupEnvs = this.environments.filter(env => {
      // Skip if environment is invalid
      if (!env || !env.name) {
        console.log('Skipping invalid environment:', env);
        return false;
      }

      // Skip the current environment itself
      if (env.name === currentEnv.name) {
        console.log('Skipping current environment:', env.name);
        return false;
      }

      // Check if environment is in the same group
      const envGroup = this.normalizeGroup(env.group);
      const isSameGroup = currentGroup === envGroup;
      
      console.log('Group comparison:', {
        current: { name: currentEnv.name, group: currentGroup, url: currentEnv.url },
        target: { name: env.name, group: envGroup, url: env.url },
        isSameGroup
      });

      return isSameGroup;
    });

    // Then, filter out environments with the same origin
    const filteredEnvs = sameGroupEnvs.filter(env => {
      try {
        const currentOrigin = new URL(currentEnv.url).origin;
        const envOrigin = new URL(env.url).origin;
        const isSameOrigin = currentOrigin === envOrigin;
        
        if (isSameOrigin) {
          console.log('Skipping environment with same origin:', {
            name: env.name,
            url: env.url,
            origin: envOrigin
          });
        }
        
        return !isSameOrigin;
      } catch (e) {
        console.warn('Error comparing URLs:', e);
        return false;
      }
    });

    console.log('Filtered environments:', filteredEnvs.map(env => ({
      name: env.name,
      group: env.group,
      normalizedGroup: this.normalizeGroup(env.group),
      url: env.url
    })));

    // Add environments to dropdown
    if (filteredEnvs.length === 0) {
      const noEnvOption = document.createElement('option');
      noEnvOption.value = "";
      noEnvOption.textContent = "No other environments in this group";
      noEnvOption.disabled = true;
      envSelect.appendChild(noEnvOption);
    } else {
      filteredEnvs.forEach(env => {
        const option = document.createElement('option');
        option.value = env.name;
        option.textContent = env.name;
        option.dataset.group = env.group || 'null';
        option.dataset.url = env.url; // Add URL to dataset for debugging
        envSelect.appendChild(option);
      });
    }

    // Log final dropdown state
    console.log('Final dropdown options:', Array.from(envSelect.options).map(opt => ({
      value: opt.value,
      text: opt.textContent,
      group: opt.dataset.group,
      url: opt.dataset.url,
      disabled: opt.disabled
    })));
  }

  // Helper method to update the current environment display
  updateCurrentEnvironmentDisplay(env) {
    const envNameElement = document.querySelector('.env-name .env-text');
    const envUrlElement = document.querySelector('.env-url');
    const envDotElement = document.querySelector('.env-dot');
    const envGroupElement = document.querySelector('.env-group-label');
    
    if (!envNameElement || !envUrlElement || !envDotElement) {
      console.error('Environment display elements not found');
      return;
    }
    
    if (env) {
      // Update text content
      envNameElement.textContent = env.name;
      envUrlElement.textContent = env.url;
      
      // Update group label
      if (envGroupElement) {
        envGroupElement.textContent = env.group || 'Ungrouped';
      }
      
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
      if (envGroupElement) {
        envGroupElement.textContent = 'Ungrouped';
      }
    }
  }

  setupEventListeners() {
    // Add event listener for environment switch
    const switchButton = document.getElementById('switchBtn');
    if (switchButton) {
      switchButton.addEventListener('click', () => {
        console.log('Switch button clicked');
        this.switchEnvironment();
      });
    } else {
      console.warn('Switch button not found');
    }

    // Add event listener for compare button
    const compareButton = document.getElementById('compareBtn');
    if (compareButton) {
      compareButton.addEventListener('click', () => {
        console.log('Compare button clicked');
        this.compareEnvironments();
      });
    } else {
      console.warn('Compare button not found');
    }

    // Add event listener for manage button
    const manageButton = document.getElementById('manageBtn');
    if (manageButton) {
      manageButton.addEventListener('click', () => {
        console.log('Manage button clicked');
        // Load manage.html content into the popup
        fetch('manage.html')
          .then(response => response.text())
          .then(html => {
            // Create a temporary container to parse the HTML
            const temp = document.createElement('div');
            temp.innerHTML = html;
            
            // Get the popup content
            const popupContent = temp.querySelector('.popup');
            if (!popupContent) {
              console.error('Popup content not found in manage.html');
              return;
            }
            
            // Replace the current popup content
            const currentPopup = document.querySelector('.popup');
            if (!currentPopup) {
              console.error('Current popup element not found');
              return;
            }
            
            currentPopup.innerHTML = popupContent.innerHTML;
            
            // Load the manage.js script
            const script = document.createElement('script');
            script.src = 'js/manage.js';
            script.onload = () => {
              // Initialize the manage page
              if (typeof EnvironmentManager !== 'undefined') {
                new EnvironmentManager();
              } else {
                console.error('EnvironmentManager class not found');
              }
            };
            document.body.appendChild(script);
          })
          .catch(error => {
            console.error('Error loading manage page:', error);
          });
      });
    } else {
      console.warn('Manage button not found');
    }
  }

  async switchEnvironment() {
    try {
      const select = document.getElementById('environmentSelect');
      if (!select) {
        console.error('Environment select element not found');
        return;
      }

      const targetEnvName = select.value;
      if (!targetEnvName) {
        console.error('No environment selected');
        return;
      }

      console.log('Switching to environment:', targetEnvName);

      // Get current environment
      const currentEnv = this.getCurrentEnvironment();
      if (!currentEnv) {
        console.error('Current environment not found');
        return;
      }

      // Get current group
      const currentGroup = this.normalizeGroup(currentEnv.group);
      console.log('Current environment group:', {
        name: currentEnv.name,
        group: currentEnv.group,
        normalizedGroup: currentGroup,
        url: currentEnv.url
      });

      // Find target environment within the same group
      const targetEnv = this.environments.find(env => {
        if (!env || !env.name) return false;
        
        // Check if this is the target environment by name
        const isTarget = env.name === targetEnvName;
        
        // Check if it's in the same group
        const envGroup = this.normalizeGroup(env.group);
        const isSameGroup = currentGroup === envGroup;
        
        console.log('Target environment check:', {
          name: env.name,
          isTarget,
          group: env.group,
          normalizedGroup: envGroup,
          isSameGroup,
          url: env.url
        });
        
        return isTarget && isSameGroup;
      });

      if (!targetEnv) {
        console.error('Target environment not found in the same group:', {
          targetName: targetEnvName,
          currentGroup: currentGroup
        });
        return;
      }

      // Log environment details
      console.log('Environment details:', {
        current: { name: currentEnv.name, group: currentEnv.group, url: currentEnv.url },
        target: { name: targetEnv.name, group: targetEnv.group, url: targetEnv.url }
      });

      // Execute the switch
      await this.executeSwitch(targetEnv);
    } catch (error) {
      console.error('Error in switchEnvironment:', error);
      alert('Error switching environment: ' + error.message);
    }
  }

  async executeSwitch(targetEnv) {
    try {
      // Get the current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        console.error('No active tab found');
        return;
      }

      // Check if "Open in new tab" is enabled
      const openInNewTab = document.getElementById('openInNewTab').checked;
      
      if (openInNewTab) {
        // Create a new tab with the target URL
        await chrome.tabs.create({ url: targetEnv.url });
      } else {
        // Update the current tab with the target URL
        await chrome.tabs.update(tab.id, { url: targetEnv.url });
      }
      
      // Update the UI with the target environment
      this.updateCurrentEnvironmentDisplay(targetEnv);
      
      console.log('Successfully switched to environment:', targetEnv.name);
    } catch (error) {
      console.error('Error executing environment switch:', error);
      alert('Error switching environment: ' + error.message);
    }
  }

  async compareEnvironments() {
    console.log('Starting environment comparison...');
    console.log('Current tab URL:', this.currentTab.url);

    // Get current environment using our helper method
    const currentEnv = this.getCurrentEnvironment();

    if (!currentEnv || !currentEnv.url) {
      console.error('Invalid current environment:', currentEnv);
      alert('Could not determine current environment');
      return;
    }

    // Get selected environment from dropdown
    const envSelect = document.getElementById('environmentSelect');
    if (!envSelect) {
      console.error('Environment select element not found');
      return;
    }

    const selectedEnvName = envSelect.value;
    if (!selectedEnvName) {
      console.error('No environment selected');
      alert('Please select an environment to compare with');
      return;
    }

    // Get current group
    const currentGroup = this.normalizeGroup(currentEnv.group);
    console.log('Current environment group:', {
      name: currentEnv.name,
      group: currentEnv.group,
      normalizedGroup: currentGroup,
      url: currentEnv.url
    });

    // Find the selected environment within the same group
    const selectedEnv = this.environments.find(env => {
      if (!env || !env.name) return false;
      
      // Check if this is the target environment by name
      const isTarget = env.name === selectedEnvName;
      
      // Check if it's in the same group
      const envGroup = this.normalizeGroup(env.group);
      const isSameGroup = currentGroup === envGroup;
      
      console.log('Target environment check:', {
        name: env.name,
        isTarget,
        group: env.group,
        normalizedGroup: envGroup,
        isSameGroup,
        url: env.url
      });
      
      return isTarget && isSameGroup;
    });

    if (!selectedEnv || !selectedEnv.url) {
      console.error('Selected environment not found in the same group:', {
        targetName: selectedEnvName,
        currentGroup: currentGroup
      });
      return;
    }

    // Store environments for comparison
    const comparisonData = {
      env1: {
        name: currentEnv.name,
        url: currentEnv.url,
        type: currentEnv.type || getEnvironmentType(currentEnv)
      },
      env2: {
        name: selectedEnv.name,
        url: selectedEnv.url,
        type: selectedEnv.type || getEnvironmentType(selectedEnv)
      }
    };

    console.log('Preparing to store comparison data:', comparisonData);

    // Validate URLs before storing
    if (!comparisonData.env1.url || !comparisonData.env2.url) {
      console.error('Invalid URLs in comparison data:', {
        env1Url: comparisonData.env1.url,
        env2Url: comparisonData.env2.url
      });
      alert('Error: Invalid environment URLs');
      return;
    }

    try {
      // Store in chrome.storage.local
      await chrome.storage.local.set({ comparisonData });

      // Verify the data was stored
      const storedData = await chrome.storage.local.get('comparisonData');
      console.log('Verified stored comparison data:', storedData);

      if (!storedData.comparisonData || 
          !storedData.comparisonData.env1.url || 
          !storedData.comparisonData.env2.url) {
        throw new Error('Failed to verify stored comparison data');
      }

      // Open comparison page
      const comparisonUrl = chrome.runtime.getURL('comparison/comparison.html');
      await chrome.tabs.create({ url: comparisonUrl });
    } catch (error) {
      console.error('Error in comparison process:', error);
      alert('Error preparing comparison data: ' + error.message);
    }
  }
}

// Initialize popup
const popupInstance = new Popup();

// Update the current environment section
async function updateCurrentEnvironment() {
  // Use the popup instance's methods to get the current environment and update display
  const currentEnv = popupInstance.getCurrentEnvironment();
  popupInstance.updateCurrentEnvironmentDisplay(currentEnv);
} 