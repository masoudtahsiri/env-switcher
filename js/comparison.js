class EnvironmentLoader {https://www.credaily.com  constructor() {
    this.env1Frame = document.getElementById('env1-frame');
    this.env2Frame = document.getElementById('env2-frame');
    this.isLoading = false;
    this.isScrollLocked = false;
    this.isScrolling = false;
    
    if (!this.env1Frame || !this.env2Frame) {
      console.error('Could not find iframe elements');
      this.showError('Could not initialize environment frames');
      return;
    }
    
    // Initialize scroll lock button
    this.scrollLockBtn = document.getElementById('scroll-lock-btn');
    if (this.scrollLockBtn) {
      this.scrollLockBtn.addEventListener('click', () => this.toggleScrollLock());
    }
    
    this.init();
  }
  
  toggleScrollLock() {
    try {
      this.isScrollLocked = !this.isScrollLocked;
      this.scrollLockBtn.classList.toggle('active', this.isScrollLocked);
      
      if (this.isScrollLocked) {
        // Add scroll event listeners to both iframes
        this.env1Frame.contentWindow.addEventListener('scroll', () => {
          if (!this.isScrolling) {
            this.isScrolling = true;
            const scrollY = this.env1Frame.contentWindow.scrollY;
            this.env2Frame.contentWindow.scrollTo(0, scrollY);
            setTimeout(() => this.isScrolling = false, 50);
          }
        });
        
        this.env2Frame.contentWindow.addEventListener('scroll', () => {
          if (!this.isScrolling) {
            this.isScrolling = true;
            const scrollY = this.env2Frame.contentWindow.scrollY;
            this.env1Frame.contentWindow.scrollTo(0, scrollY);
            setTimeout(() => this.isScrolling = false, 50);
          }
        });
      } else {
        // Remove scroll event listeners by reloading the iframes
        const env1Src = this.env1Frame.srcdoc;
        const env2Src = this.env2Frame.srcdoc;
        this.env1Frame.srcdoc = env1Src;
        this.env2Frame.srcdoc = env2Src;
      }
    } catch (e) {
      console.error('Error toggling scroll lock:', e);
      this.isScrollLocked = false;
      this.scrollLockBtn.classList.remove('active');
    }
  }
  
  handleScroll(sourceFrame) {
    if (!this.isScrollLocked || this.isScrolling) return;
    
    try {
      this.isScrolling = true;
      
      const sourceWindow = sourceFrame.contentWindow;
      const targetFrame = sourceFrame === this.env1Frame ? this.env2Frame : this.env1Frame;
      const targetWindow = targetFrame.contentWindow;
      
      if (!sourceWindow || !targetWindow) {
        console.warn('Cannot sync scroll: windows not accessible');
        return;
      }
      
      // Get scroll positions
      const sourceDoc = sourceWindow.document.documentElement;
      const targetDoc = targetWindow.document.documentElement;
      
      // Calculate scroll percentages
      const sourceScrollPercentage = sourceWindow.scrollY / (sourceDoc.scrollHeight - sourceWindow.innerHeight);
      
      // Apply scroll position to target
      const targetScrollMax = targetDoc.scrollHeight - targetWindow.innerHeight;
      const targetScrollPosition = Math.round(sourceScrollPercentage * targetScrollMax);
      
      targetWindow.scrollTo(0, targetScrollPosition);
      
    } catch (e) {
      console.error('Error handling scroll:', e);
    } finally {
      // Small delay before allowing next scroll sync
      setTimeout(() => {
        this.isScrolling = false;
      }, 10);
    }
  }
  
  async init() {
    try {
      console.log('Starting initialization...');
      
      // Get URLs from storage
      const storage = await chrome.storage.local.get(['env1Url', 'env2Url']);
      console.log('Retrieved from storage:', storage);
      
      const { env1Url, env2Url } = storage;
      
      if (!env1Url || !env2Url) {
        console.error('Missing URLs:', { env1Url, env2Url });
        this.showError('Missing environment URLs. Please try loading again from the popup.');
        return;
      }
      
      // Set environment labels
      const env1Label = document.querySelector('.env-container:first-child .env-label .env-name');
      const env2Label = document.querySelector('.env-container:last-child .env-label .env-name');
      const env1UrlSpan = document.querySelector('.env-container:first-child .env-label .env-url');
      const env2UrlSpan = document.querySelector('.env-container:last-child .env-label .env-url');
      
      if (env1Label && env2Label && env1UrlSpan && env2UrlSpan) {
        console.log('Setting environment labels...');
        env1Label.textContent = 'Production';
        env2Label.textContent = 'Staging';
        env1UrlSpan.textContent = env1Url;
        env2UrlSpan.textContent = env2Url;
      } else {
        console.error('Could not find environment label elements');
        throw new Error('Could not find environment label elements');
      }
      
      console.log('Starting to load URLs...');
      // Load URLs
      await this.loadUrls(env1Url, env1Url, env2Url);
      
    } catch (error) {
      console.error('Error in init:', error);
      this.showError(`Error initializing environments: ${error.message}`);
    }
  }
  
  async loadUrls(currentUrl, env1BaseUrl, env2BaseUrl) {
    try {
      console.log('Starting loadUrls with:', { currentUrl, env1BaseUrl, env2BaseUrl });
      
      // Remove trailing slashes from base URLs
      env1BaseUrl = env1BaseUrl.replace(/\/$/, '');
      env2BaseUrl = env2BaseUrl.replace(/\/$/, '');
      
      // Log URLs for debugging
      console.log('Processed URLs:', {
        currentUrl,
        env1BaseUrl,
        env2BaseUrl
      });
      
      // Show loading indicators
      this.showLoading(true);
      
      // Create a wrapper HTML that includes necessary CORS headers
      const wrapperHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <meta http-equiv="Content-Security-Policy" content="default-src * 'unsafe-inline' 'unsafe-eval' 'unsafe-hashes'; script-src * 'unsafe-inline' 'unsafe-eval' 'unsafe-hashes' 'wasm-unsafe-eval' 'inline-speculation-rules' 'unsafe-hashes' 'unsafe-inline' 'unsafe-hashes' 'unsafe-inline' 'unsafe-hashes' 'unsafe-inline'; style-src * 'unsafe-inline'; img-src * data: blob:; font-src * data:; connect-src *; frame-src *; object-src *; base-uri *; worker-src blob:; child-src blob: 'unsafe-inline' 'unsafe-eval';">
            <style>
              body { margin: 0; padding: 0; }
              iframe { width: 100%; height: 100%; border: none; }
            </style>
          </head>
          <body>
            <iframe src="about:blank"></iframe>
          </body>
        </html>
      `;
      
      console.log('Setting initial wrapper HTML...');
      // Set initial content
      this.env1Frame.srcdoc = wrapperHtml;
      this.env2Frame.srcdoc = wrapperHtml;
      
      console.log('Waiting for initial iframe load...');
      // Wait for initial content to load
      await Promise.all([
        this.waitForIframeLoad(this.env1Frame),
        this.waitForIframeLoad(this.env2Frame)
      ]);
      
      console.log('Creating temporary tabs...');
      // Create temporary tabs to load content
      const [tab1, tab2] = await Promise.all([
        chrome.tabs.create({ url: env1BaseUrl, active: false }),
        chrome.tabs.create({ url: env2BaseUrl, active: false })
      ]);
      
      console.log('Waiting for tabs to load...');
      // Wait for tabs to load
      await Promise.all([
        this.waitForTabLoad(tab1.id),
        this.waitForTabLoad(tab2.id)
      ]);
      
      console.log('Getting page content...');
      // Get content from tabs
      const [content1, content2] = await Promise.all([
        this.getPageContent(tab1.id),
        this.getPageContent(tab2.id)
      ]);
      
      console.log('Closing temporary tabs...');
      // Close temporary tabs
      await Promise.all([
        chrome.tabs.remove(tab1.id),
        chrome.tabs.remove(tab2.id)
      ]);
      
      console.log('Updating iframe content...');
      // Update iframe content
      this.env1Frame.srcdoc = this.wrapContent(content1);
      this.env2Frame.srcdoc = this.wrapContent(content2);
      
      console.log('Waiting for final iframe load...');
      // Wait for content to load in iframes
      await Promise.all([
        this.waitForIframeLoad(this.env1Frame),
        this.waitForIframeLoad(this.env2Frame)
      ]);
      
      // Additional wait to ensure content is loaded
      console.log('Waiting additional time for content to stabilize...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Verify content is loaded and check CSP headers
      console.log('Verifying content is loaded...');
      if (!this.env1Frame.contentDocument?.body?.children.length || 
          !this.env2Frame.contentDocument?.body?.children.length) {
        throw new Error('Content not properly loaded in iframes. Please check if the pages require authentication or if there are any CORS restrictions.');
      }

      // Log CSP headers in both iframes
      console.log('Checking CSP headers in iframes:');
      [this.env1Frame, this.env2Frame].forEach((frame, index) => {
        const cspMeta = frame.contentDocument.querySelector('meta[http-equiv="Content-Security-Policy"]');
        console.log(`Frame ${index + 1} CSP header:`, cspMeta?.getAttribute('content'));
      });
      
      // Hide loading indicators
      this.showLoading(false);
      console.log('Loading complete!');
      
    } catch (e) {
      console.error('Error loading URLs:', e);
      this.showError(`Error loading URLs: ${e.message}. Please check the environment configurations and make sure the URLs are accessible.`);
    }
  }
  
  waitForTabLoad(tabId, timeout = 60000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkTab = async () => {
        try {
          const tab = await chrome.tabs.get(tabId);
          if (tab.status === 'complete') {
            // Additional wait to ensure dynamic content is loaded
            await new Promise(resolve => setTimeout(resolve, 2000));
            resolve();
          } else if (Date.now() - startTime > timeout) {
            reject(new Error(`Tab load timeout after ${timeout}ms`));
          } else {
            setTimeout(checkTab, 100);
          }
        } catch (e) {
          reject(new Error(`Error checking tab status: ${e.message}`));
        }
      };
      checkTab();
    });
  }
  
  waitForIframeLoad(iframe) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Iframe load timeout after 60 seconds. Current state: ${iframe.contentDocument?.readyState}`));
      }, 60000); // 60 second timeout
      
      const checkIframe = () => {
        try {
          // First check if we can access the iframe's contentDocument
          if (!iframe.contentDocument) {
            console.log('Cannot access iframe contentDocument yet, waiting...');
            setTimeout(checkIframe, 100);
            return;
          }

          // Then check the readyState
          const readyState = iframe.contentDocument.readyState;
          console.log(`Iframe readyState: ${readyState}`);

          if (readyState === 'complete') {
            // Additional check to ensure content is actually loaded
            if (iframe.contentDocument.body && iframe.contentDocument.body.children.length > 0) {
            clearTimeout(timeout);
            resolve();
            } else {
              console.log('Iframe document ready but no content yet, waiting...');
              setTimeout(checkIframe, 100);
            }
          } else {
            console.log(`Iframe not ready yet, state: ${readyState}`);
            setTimeout(checkIframe, 100);
          }
        } catch (e) {
          console.log('Cannot access iframe content yet, waiting...');
          setTimeout(checkIframe, 100);
        }
      };
      
      // Set up load event handler
      iframe.onload = () => {
        console.log('Iframe onload event fired');
        checkIframe();
      };
      
      // Set up error handler
      iframe.onerror = (error) => {
        console.error('Iframe load error:', error);
        clearTimeout(timeout);
        reject(new Error('Iframe load error'));
      };
      
      // Start checking immediately
      checkIframe();
    });
  }
  
  async getPageContent(tabId) {
    try {
      // Inject script to get page content
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          // Clone the document
          const clone = document.documentElement.cloneNode(true);
          
          // Remove scripts and inline event handlers
          const scripts = clone.getElementsByTagName('script');
          while (scripts.length > 0) scripts[0].remove();
          
          // Remove inline event handlers
          const elements = clone.getElementsByTagName('*');
          for (let el of elements) {
            const attrs = el.attributes;
            for (let i = attrs.length - 1; i >= 0; i--) {
              const attr = attrs[i];
              if (attr.name.startsWith('on')) {
                el.removeAttribute(attr.name);
              }
            }
          }
          
          // Remove third-party content
          const iframes = clone.getElementsByTagName('iframe');
          while (iframes.length > 0) iframes[0].remove();
          
          // Fix resource paths
          const resources = clone.querySelectorAll('img, link[rel="stylesheet"], link[rel="icon"], link[rel="shortcut icon"]');
          resources.forEach(resource => {
            const href = resource.getAttribute('href') || resource.getAttribute('src');
            if (href) {
              // Convert relative URLs to absolute
              try {
                const absoluteUrl = new URL(href, window.location.href).href;
                if (resource.tagName === 'IMG') {
                  resource.setAttribute('src', absoluteUrl);
                } else {
                  resource.setAttribute('href', absoluteUrl);
                }
              } catch (e) {
                console.warn('Could not convert URL:', href);
              }
            }
          });
          
          // Keep only essential styles
          const styles = Array.from(document.styleSheets).map(sheet => {
            try {
              return Array.from(sheet.cssRules)
                .filter(rule => {
                  // Keep only essential styles
                  const selector = rule.selectorText?.toLowerCase() || '';
                  return !selector.includes('script') && 
                         !selector.includes('iframe') &&
                         !selector.includes('noscript');
                })
                .map(rule => {
                  // Fix URLs in CSS
                  let cssText = rule.cssText;
                  cssText = cssText.replace(/url\(['"]?([^'"]+)['"]?\)/g, (match, url) => {
                    try {
                      const absoluteUrl = new URL(url, window.location.href).href;
                      return `url("${absoluteUrl}")`;
                    } catch (e) {
                      return match;
                    }
                  });
                  return cssText;
                })
                .join('\n');
            } catch (e) {
              return '';
            }
          }).filter(Boolean);
          
          // Add styles to head
          const styleElement = document.createElement('style');
          styleElement.textContent = styles.join('\n');
          clone.querySelector('head').appendChild(styleElement);
          
          // Remove any existing CSP headers
          const cspMeta = clone.querySelector('meta[http-equiv="Content-Security-Policy"]');
          if (cspMeta) {
            cspMeta.remove();
          }
          
          return clone.outerHTML;
        }
      });
      return result;
    } catch (e) {
      console.error('Error getting page content:', e);
      return `<div style="padding: 20px; color: red;">
        Error loading content. This might be due to CORS restrictions or the page requiring authentication.
        Please try accessing the page directly in a new tab.
      </div>`;
    }
  }
  
  wrapContent(content) {
    console.log('Starting wrapContent with CSP header');
    // Remove any existing CSP headers from the content
    content = content.replace(/<meta[^>]*http-equiv="Content-Security-Policy"[^>]*>/g, '');
    
    // Fix resource paths
    content = content.replace(/chrome-extension:\/\/[^/]+\//g, '');
    
    const wrappedContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <meta http-equiv="Content-Security-Policy" content="default-src * 'unsafe-inline' 'unsafe-eval' 'unsafe-hashes'; script-src * 'unsafe-inline' 'unsafe-eval' 'unsafe-hashes' 'wasm-unsafe-eval' 'inline-speculation-rules' 'unsafe-hashes' 'unsafe-inline' 'unsafe-hashes' 'unsafe-inline' 'unsafe-hashes' 'unsafe-inline'; style-src * 'unsafe-inline'; img-src * data: blob:; font-src * data:; connect-src *; frame-src *; object-src *; base-uri *; worker-src blob:; child-src blob: 'unsafe-inline' 'unsafe-eval';">
          <style>
            html, body {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
            }
            body {
              margin-top: 48px;
              overflow-y: scroll !important;
              overflow-x: hidden !important;
              -webkit-overflow-scrolling: touch;
            }
          </style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `;
    console.log('Finished wrapContent, checking for CSP headers in content');
    return wrappedContent;
  }
  
  showLoading(show) {
    this.isLoading = show;
    document.querySelectorAll('.loading-indicator').forEach(indicator => {
      indicator.style.display = show ? 'flex' : 'none';
    });
  }
  
  showError(message) {
    this.showLoading(false);
    alert(message);
  }
}

// Initialize the loader when the page loads
document.addEventListener('DOMContentLoaded', () => {
  new EnvironmentLoader();
}); 