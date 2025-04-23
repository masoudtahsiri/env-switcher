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
    const envSelect = document.getElementById('environmentSelect');
    if (!envSelect) return;

    // Clear existing options
    while (envSelect.options.length > 0) {
      envSelect.remove(0);
    }

    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = "";
    defaultOption.textContent = "Select an environment...";
    defaultOption.disabled = true;
    defaultOption.selected = true;
    envSelect.appendChild(defaultOption);

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

    // Update current environment display
    this.updateCurrentEnvironmentDisplay(currentEnv);

    // Filter environments to only show those from the same group
    const currentGroup = currentEnv.group ? currentEnv.group.toLowerCase() : null;
    console.log('Current group (normalized):', currentGroup);

    const sameGroupEnvs = this.environments.filter(env => {
      // Skip if environment is invalid
      if (!env || !env.name) return false;
      
      // Skip the current environment itself
      if (env.name === currentEnv.name) return false;
      
      // Group matching logic:
      
      // If current env has no group, only show other envs with no group
      if (!currentGroup) {
        return !env.group;
      }
      
      // Otherwise show envs with the same group (case-insensitive)
      const envGroup = env.group ? env.group.toLowerCase() : null;
      const isInSameGroup = envGroup === currentGroup;
      
      console.log('Group comparison:', {
        envName: env.name,
        envGroup: envGroup,
        currentGroup: currentGroup,
        isInSameGroup
      });
      
      return isInSameGroup;
    });

    console.log('Same group environments to display:', sameGroupEnvs);

    // Add environments to dropdown
    if (sameGroupEnvs.length === 0) {
      console.log('No other environments in the same group found');
      const noEnvOption = document.createElement('option');
      noEnvOption.value = "";
      noEnvOption.textContent = "No other environments in this group";
      noEnvOption.disabled = true;
      envSelect.appendChild(noEnvOption);
    } else {
      // Add environments to dropdown
      sameGroupEnvs.forEach(env => {
        const option = document.createElement('option');
        option.value = env.name;
        option.textContent = env.name;
        envSelect.appendChild(option);
      });
    }
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
    const envSelect = document.getElementById('environmentSelect');
    if (!envSelect) {
      console.error('Environment select not found');
      return;
    }

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

    // Get current environment for group check
    const currentUrl = this.currentTab.url;
    const currentEnv = this.environments.find(env => {
      if (!env?.url) return false;
      try {
        const currentUrlObj = new URL(currentUrl);
        const envUrlObj = new URL(env.url);
        const currentHostname = currentUrlObj.hostname.replace(/^www\./, '');
        const envHostname = envUrlObj.hostname.replace(/^www\./, '');
        return currentHostname === envHostname;
      } catch (e) {
        console.error('Error parsing URL:', e);
        return false;
      }
    });

    // Normalize group values for comparison - ensuring the same logic as in updateEnvironmentList
    const currentGroup = currentEnv?.group ? currentEnv.group.toLowerCase() : null;
    const targetGroup = targetEnv?.group ? targetEnv.group.toLowerCase() : null;

    // Ensure environments are in the same group (using normalized values)
    if (currentEnv && currentGroup !== targetGroup) {
      console.error('Environment group mismatch:', {
        currentGroup: currentGroup || 'ungrouped',
        targetGroup: targetGroup || 'ungrouped'
      });
      
      // This should not happen due to dropdown filtering, so log more debug info
      console.warn('This should not happen. Environment groups should be filtered in the dropdown.');
      console.warn('Available dropdown options:', Array.from(envSelect.options).map(o => o.value));
      console.warn('All environments:', this.environments);
      
      alert('Can only switch between environments in the same group');
      return;
    }

    try {
      console.log('Switching to environment:', targetEnv);
      const openInNewTab = document.getElementById('openInNewTab')?.checked || false;
      
      // Extract the path from the current URL
      const currentUrlObj = new URL(currentUrl);
      const path = currentUrlObj.pathname + currentUrlObj.search + currentUrlObj.hash;
      
      // Create a new URL object from the target environment URL
      const targetUrlObj = new URL(targetEnv.url);
      
      // Set the path from the current URL
      targetUrlObj.pathname = path;
      
      // Get the final URL string
      const finalUrl = targetUrlObj.toString();
      console.log('Final URL for environment switch:', finalUrl);
      
      // Send message to background script to handle the tab switch
      chrome.runtime.sendMessage(
        { 
          action: 'switchTab', 
          url: finalUrl, 
          openInNewTab: openInNewTab 
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('Error sending switchTab message:', chrome.runtime.lastError.message);
            alert('Could not communicate with the extension background.');
          } else {
            console.log('Background script response:', response);
            if (response && response.success) {
              console.log('Environment switch successful');
            }
          }
        }
      );
    } catch (error) {
      console.error('Error switching environment:', error);
      alert('Error switching environment: ' + error.message);
    }
  }

  async compareEnvironments() {
    console.log('Starting environment comparison...');
    console.log('Current tab URL:', this.currentTab.url);

    // Get current environment
    const currentEnv = this.environments.find(env => {
      if (!env || !env.url) return false;
      const currentUrl = this.currentTab.url;
      const envUrl = env.url;
      
      try {
        // Parse URLs
        const currentUrlObj = new URL(currentUrl);
        const envUrlObj = new URL(envUrl);
        
        // Get hostnames without www
        const currentHostname = currentUrlObj.hostname.replace(/^www\./, '');
        const envHostname = envUrlObj.hostname.replace(/^www\./, '');
        
        console.log('URL comparison:', {
          currentUrl: currentUrl,
          envUrl: envUrl,
          currentHostname: currentHostname,
          envHostname: envHostname,
          matches: currentHostname === envHostname
        });
        
        return currentHostname === envHostname;
      } catch (e) {
        console.error('Error parsing URL:', e);
        return false;
      }
    });

    console.log('Current environment details:', currentEnv);

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

    // Find the selected environment
    const selectedEnv = this.environments.find(env => env.name === selectedEnvName);
    console.log('Selected environment details:', selectedEnv);

    if (!selectedEnv || !selectedEnv.url) {
      console.error('Invalid selected environment:', selectedEnv);
      alert('Selected environment not found or invalid');
      return;
    }

    // Normalize group values for comparison
    const currentGroup = currentEnv?.group ? currentEnv.group.toLowerCase() : null;
    const selectedGroup = selectedEnv?.group ? selectedEnv.group.toLowerCase() : null;

    // Check if environments are in the same group using normalized values
    if (currentGroup !== selectedGroup) {
      console.error('Environment group mismatch:', {
        currentGroup: currentGroup || 'ungrouped',
        selectedGroup: selectedGroup || 'ungrouped'
      });
      
      // This should not happen due to dropdown filtering, so log more debug info
      console.warn('This should not happen. Environment groups should be filtered in the dropdown.');
      console.warn('Available dropdown options:', Array.from(envSelect.options).map(o => o.value));
      
      alert('Can only compare environments in the same group');
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
new Popup();

// Update the current environment section
async function updateCurrentEnvironment() {
  const currentEnv = await getCurrentEnvironment();
  if (currentEnv) {
    const envName = document.querySelector('.env-name');
    const envUrl = document.querySelector('.env-url');
    const envGroup = document.querySelector('.env-group-label');
    
    if (envName) envName.textContent = currentEnv.name;
    if (envUrl) envUrl.textContent = currentEnv.url;
    if (envGroup) {
      envGroup.textContent = currentEnv.group || 'Ungrouped';
    }
  }
} 