// JobHunter Agent - Enhanced Background Service Worker for Real Applications
class JobHunterEnhancedBackground {
  constructor() {
    this.isRunning = false;
    this.applicationQueue = [];
    this.dailyLimit = 20;
    this.currentApplications = 0;
    this.realApplications = [];
    this.lastJobSiteCheck = 0;
    
    this.antiDetectionSettings = {
      minDelay: 3000,
      maxDelay: 10000,
      userAgents: [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      ]
    };
    
    this.initializeBackground();
  }

  async initializeBackground() {
    try {
      await this.initializeStorage();
      await this.setupAlarms();
      await this.loadSettings();
      await this.loadRealApplications();
      
      console.log('JobHunter Enhanced Background initialized successfully');
    } catch (error) {
      console.error('Failed to initialize background:', error);
    }
  }

  async initializeStorage() {
    const defaultData = {
      applications: [],
      settings: {
        autoApplyEnabled: false,
        smartFilterEnabled: true,
        stealthModeEnabled: true,
        realCaptureMode: true,
        dailyLimit: 20,
        platforms: ['linkedin', 'indeed', 'ziprecruiter', 'glassdoor'],
        salaryRange: { min: 60000, max: 180000 },
        locations: [],
        experience: { min: 2, max: 15 },
        keywords: ['javascript', 'react', 'node', 'python', 'engineer', 'developer'],
        blacklistedCompanies: [],
        targetJobTitles: ['software engineer', 'frontend developer', 'backend developer', 'full stack developer']
      },
      stats: {
        totalApplications: 0,
        todayApplications: 0,
        realApplications: 0,
        autoApplications: 0,
        responseRate: 0,
        interviewsScheduled: 0,
        lastResetDate: new Date().toDateString()
      },
      userProfile: {
        name: '',
        email: '',
        phone: '',
        resumeUrl: '',
        coverLetterTemplate: '',
        skills: [],
        linkedinProfile: '',
        githubProfile: ''
      },
      jobSiteData: {
        lastVisitedUrls: [],
        processedJobs: [],
        failedApplications: [],
        successfulApplications: []
      }
    };

    const result = await chrome.storage.local.get(['jobHunterData']);
    if (!result.jobHunterData) {
      await chrome.storage.local.set({ jobHunterData: defaultData });
    } else {
      // Merge with default data to ensure all fields exist
      const mergedData = this.mergeWithDefaults(result.jobHunterData, defaultData);
      await chrome.storage.local.set({ jobHunterData: mergedData });
    }
  }

  mergeWithDefaults(existing, defaults) {
    const merged = { ...defaults };
    
    Object.keys(existing).forEach(key => {
      if (typeof existing[key] === 'object' && !Array.isArray(existing[key])) {
        merged[key] = { ...defaults[key], ...existing[key] };
      } else {
        merged[key] = existing[key];
      }
    });
    
    return merged;
  }

  async setupAlarms() {
    // Clear existing alarms
    chrome.alarms.clearAll();
    
    // Daily reset alarm
    chrome.alarms.create('dailyReset', { 
      when: Date.now() + this.getTimeUntilMidnight(),
      periodInMinutes: 24 * 60 
    });

    // Application monitoring
    chrome.alarms.create('monitorApplications', { 
      periodInMinutes: 2 
    });

    // Stats update
    chrome.alarms.create('updateStats', { 
      periodInMinutes: 5 
    });

    // Real application validation
    chrome.alarms.create('validateRealApps', { 
      periodInMinutes: 10 
    });
  }

  getTimeUntilMidnight() {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    return midnight.getTime() - now.getTime();
  }

  async loadSettings() {
    const result = await chrome.storage.local.get(['jobHunterData']);
    if (result.jobHunterData) {
      this.dailyLimit = result.jobHunterData.settings.dailyLimit || 20;
      this.isRunning = result.jobHunterData.settings.autoApplyEnabled || false;
    }
  }

  async loadRealApplications() {
    const data = await this.getStorageData();
    if (data && data.applications) {
      this.realApplications = data.applications.filter(app => 
        app.realApplication || app.source === 'auto_apply' || app.source === 'manual_application'
      );
    }
  }

  async monitorJobSiteActivity() {
    try {
      // Get all tabs on job sites
      const tabs = await chrome.tabs.query({});
      const jobSiteTabs = tabs.filter(tab => this.isJobSite(tab.url));
      
      for (const tab of jobSiteTabs) {
        try {
          // Check if content script is loaded and responsive
          const response = await chrome.tabs.sendMessage(tab.id, { 
            action: 'getStatus' 
          });
          
          if (response && response.platform) {
            console.log(`Monitoring ${response.platform} tab: ${tab.url}`);
            
            // If auto apply is enabled, check for new jobs
            if (this.isRunning && response.isRunning) {
              await this.checkForNewJobsOnTab(tab.id);
            }
          }
        } catch (error) {
          // Content script not loaded or tab not ready
          console.log(`Tab ${tab.id} not ready for monitoring`);
        }
      }
    } catch (error) {
      console.error('Error monitoring job site activity:', error);
    }
  }

  async checkForNewJobsOnTab(tabId) {
    try {
      const data = await this.getStorageData();
      
      // Check daily limit
      if (data.stats.todayApplications >= this.dailyLimit) {
        console.log('Daily limit reached, stopping auto apply');
        return;
      }

      // Send message to content script to check for new jobs
      await chrome.tabs.sendMessage(tabId, { 
        action: 'scanForJobs',
        settings: data.settings 
      });
      
    } catch (error) {
      console.error('Error checking for new jobs:', error);
    }
  }

  isJobSite(url) {
    if (!url) return false;
    const jobSites = ['linkedin.com', 'indeed.com', 'ziprecruiter.com', 'glassdoor.com'];
    return jobSites.some(site => url.includes(site));
  }

  async processRealApplication(applicationData) {
    try {
      console.log('Processing real application:', applicationData);

      // Validate application data
      if (!this.validateApplicationData(applicationData)) {
        console.log('Invalid application data, skipping');
        return { success: false, reason: 'Invalid data' };
      }

      // Check if already processed
      const data = await this.getStorageData();
      const isDuplicate = this.checkForDuplicate(applicationData, data.applications);
      
      if (isDuplicate) {
        console.log('Duplicate application detected, skipping');
        return { success: false, reason: 'Duplicate' };
      }

      // Apply smart filtering
      if (data.settings.smartFilterEnabled) {
        const filterResult = this.applySmartFilters(applicationData, data.settings);
        if (!filterResult.passed) {
          console.log('Application filtered out:', filterResult.reason);
          return { success: false, reason: filterResult.reason };
        }
      }

      // Process the application
      const processedApp = await this.finalizeApplication(applicationData);
      
      // Save to storage
      await this.saveApplicationRecord(processedApp);
      
      // Send notification
      await this.sendNotification(
        'Application Submitted', 
        `Applied to ${processedApp.jobTitle} at ${processedApp.company}`
      );

      return { success: true, application: processedApp };

    } catch (error) {
      console.error('Error processing real application:', error);
      await this.logError('Real Application Processing Error', error);
      return { success: false, reason: error.message };
    }
  }

  validateApplicationData(appData) {
    const required = ['jobTitle', 'company', 'platform'];
    return required.every(field => appData[field] && appData[field].trim().length > 0);
  }

  checkForDuplicate(newApp, existingApps) {
    return existingApps.some(existing => 
      existing.jobTitle === newApp.jobTitle &&
      existing.company === newApp.company &&
      existing.platform === newApp.platform
    );
  }

  applySmartFilters(appData, settings) {
    const reasons = [];

    // Title filtering
    if (appData.jobTitle) {
      const titleLower = appData.jobTitle.toLowerCase();
      
      // Check excluded keywords
      const excludeKeywords = ['intern', 'entry level', 'junior', 'part time', 'contract'];
      const hasExcluded = excludeKeywords.some(keyword => titleLower.includes(keyword));
      if (hasExcluded) {
        return { passed: false, reason: 'Contains excluded keywords' };
      }

      // Check required keywords
      const requiredKeywords = settings.targetJobTitles || [];
      if (requiredKeywords.length > 0) {
        const hasRequired = requiredKeywords.some(keyword => 
          titleLower.includes(keyword.toLowerCase())
        );
        if (!hasRequired) {
          return { passed: false, reason: 'Missing target job title keywords' };
        }
      }
    }

    // Company filtering
    if (appData.company && settings.blacklistedCompanies) {
      const companyLower = appData.company.toLowerCase();
      const isBlacklisted = settings.blacklistedCompanies.some(company => 
        companyLower.includes(company.toLowerCase())
      );
      if (isBlacklisted) {
        return { passed: false, reason: 'Company is blacklisted' };
      }
    }

    // Salary filtering (if available)
    const salary = this.extractSalaryFromDescription(appData.description);
    if (salary && settings.salaryRange) {
      if (salary < settings.salaryRange.min || salary > settings.salaryRange.max) {
        return { passed: false, reason: 'Salary outside preferred range' };
      }
    }

    return { passed: true, reason: 'All filters passed' };
  }

  extractSalaryFromDescription(description) {
    if (!description) return null;
    
    const salaryPatterns = [
      /\$([0-9,]+(?:\.[0-9]{2})?)\s*(?:per year|annually|\/year)/gi,
      /([0-9,]+)k?\s*(?:per year|annually|\/year)/gi,
      /\$([0-9,]+(?:\.[0-9]{2})?)\s*-\s*\$([0-9,]+(?:\.[0-9]{2})?)/gi
    ];

    for (const pattern of salaryPatterns) {
      const match = description.match(pattern);
      if (match) {
        const numbers = match[0].match(/[0-9,]+/g);
        if (numbers) {
          return parseInt(numbers[0].replace(/,/g, ''));
        }
      }
    }
    
    return null;
  }

  async finalizeApplication(appData) {
    return {
      id: Date.now().toString(),
      jobTitle: appData.jobTitle,
      company: appData.company,
      platform: appData.platform,
      location: appData.location || 'Not specified',
      appliedAt: new Date().toISOString(),
      status: 'applied',
      url: appData.url || window.location.href,
      source: appData.source || 'auto_apply',
      realApplication: true,
      matchScore: this.calculateMatchScore(appData),
      notes: appData.notes || '',
      salary: this.extractSalaryFromDescription(appData.description),
      description: appData.description ? appData.description.substring(0, 500) : ''
    };
  }

  calculateMatchScore(appData) {
    let score = 0.5; // Base score
    
    if (appData.jobTitle) {
      const titleLower = appData.jobTitle.toLowerCase();
      if (titleLower.includes('senior')) score += 0.2;
      if (titleLower.includes('lead') || titleLower.includes('principal')) score += 0.15;
      if (titleLower.includes('engineer') || titleLower.includes('developer')) score += 0.1;
      if (titleLower.includes('remote')) score += 0.1;
    }
    
    if (appData.description) {
      const descLower = appData.description.toLowerCase();
      const skills = ['javascript', 'react', 'node', 'python', 'typescript'];
      const matchedSkills = skills.filter(skill => descLower.includes(skill));
      score += matchedSkills.length * 0.05;
    }
    
    return Math.min(score, 1.0);
  }

  async saveApplicationRecord(appRecord) {
    const data = await this.getStorageData();
    
    // Add to applications array
    data.applications.push(appRecord);
    
    // Update stats
    data.stats.totalApplications = data.applications.length;
    
    const today = new Date().toDateString();
    data.stats.todayApplications = data.applications.filter(app => {
      const appDate = new Date(app.appliedAt).toDateString();
      return appDate === today;
    }).length;
    
    data.stats.realApplications = data.applications.filter(app => 
      app.realApplication || app.source === 'auto_apply' || app.source === 'manual_application'
    ).length;
    
    data.stats.autoApplications = data.applications.filter(app => 
      app.source === 'auto_apply'
    ).length;

    // Update job site data
    if (!data.jobSiteData.successfulApplications) {
      data.jobSiteData.successfulApplications = [];
    }
    data.jobSiteData.successfulApplications.push({
      jobId: appRecord.id,
      platform: appRecord.platform,
      timestamp: appRecord.appliedAt
    });

    await chrome.storage.local.set({ jobHunterData: data });
    
    console.log('Application record saved:', appRecord);
  }

  async updateResponseRates() {
    try {
      const data = await this.getStorageData();
      if (!data.applications || data.applications.length === 0) return;

      // Simple response rate calculation
      const totalApps = data.applications.length;
      const responses = data.applications.filter(app => 
        app.status === 'interview' || app.status === 'offer' || app.status === 'response'
      ).length;
      
      data.stats.responseRate = totalApps > 0 ? Math.round((responses / totalApps) * 100) : 0;
      data.stats.interviewsScheduled = data.applications.filter(app => 
        app.status === 'interview'
      ).length;

      await chrome.storage.local.set({ jobHunterData: data });
      
    } catch (error) {
      console.error('Error updating response rates:', error);
    }
  }

  async validateRealApplications() {
    try {
      const data = await this.getStorageData();
      if (!data.applications) return;

      // Find applications that might be duplicates or invalid
      const validApps = [];
      const duplicates = [];
      
      data.applications.forEach(app => {
        const existingApp = validApps.find(existing => 
          existing.jobTitle === app.jobTitle &&
          existing.company === app.company &&
          existing.platform === app.platform
        );
        
        if (existingApp) {
          duplicates.push(app);
        } else {
          validApps.push(app);
        }
      });

      if (duplicates.length > 0) {
        console.log(`Found ${duplicates.length} duplicate applications, cleaning up...`);
        data.applications = validApps;
        await chrome.storage.local.set({ jobHunterData: data });
      }

    } catch (error) {
      console.error('Error validating real applications:', error);
    }
  }

  async getStorageData() {
    const result = await chrome.storage.local.get(['jobHunterData']);
    return result.jobHunterData || {};
  }

  async sendNotification(title, message) {
    try {
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: title,
        message: message
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  async logError(title, error) {
    const data = await this.getStorageData();
    if (!data.errorLog) {
      data.errorLog = [];
    }
    
    data.errorLog.push({
      title: title,
      error: error.message,
      timestamp: new Date().toISOString(),
      stack: error.stack
    });

    // Keep only last 50 errors
    if (data.errorLog.length > 50) {
      data.errorLog = data.errorLog.slice(-50);
    }

    await chrome.storage.local.set({ jobHunterData: data });
  }

  async resetDailyStats() {
    const data = await this.getStorageData();
    const today = new Date().toDateString();
    
    if (data.stats.lastResetDate !== today) {
      data.stats.todayApplications = 0;
      data.stats.lastResetDate = today;
      await chrome.storage.local.set({ jobHunterData: data });
      
      console.log('Daily stats reset');
      await this.sendNotification('Daily Reset', 'Application stats have been reset for the new day');
    }
  }
}

// Initialize background service
let jobHunterBackground;

async function ensureInitialized() {
  if (!jobHunterBackground) {
    jobHunterBackground = new JobHunterEnhancedBackground();
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return jobHunterBackground;
}

// Event listeners
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('JobHunter Enhanced Agent installed:', details.reason);
  
  await ensureInitialized();
  
  if (details.reason === 'install') {
    chrome.tabs.create({ url: 'options.html' });
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  try {
    const background = await ensureInitialized();
    
    switch (alarm.name) {
      case 'dailyReset':
        await background.resetDailyStats();
        break;
      case 'monitorApplications':
        await background.monitorJobSiteActivity();
        break;
      case 'updateStats':
        await background.updateResponseRates();
        break;
      case 'validateRealApps':
        await background.validateRealApplications();
        break;
    }
  } catch (error) {
    console.error('Alarm handler error:', error);
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      const background = await ensureInitialized();
      
      switch (request.action) {
        case 'getStats':
          const data = await background.getStorageData();
          sendResponse(data ? data.stats : null);
          break;
          
        case 'processRealApplication':
          const result = await background.processRealApplication(request.applicationData);
          sendResponse(result);
          break;
          
        case 'toggleAutoApply':
          background.isRunning = request.enabled;
          
          // Update settings in storage
          const currentData = await background.getStorageData();
          if (currentData.settings) {
            currentData.settings.autoApplyEnabled = request.enabled;
            await chrome.storage.local.set({ jobHunterData: currentData });
          }
          
          sendResponse({ success: true, isRunning: background.isRunning });
          break;
          
        case 'updateSettings':
          const settingsData = await background.getStorageData();
          if (settingsData) {
            settingsData.settings = { ...settingsData.settings, ...request.settings };
            await chrome.storage.local.set({ jobHunterData: settingsData });
            await background.loadSettings();
          }
          sendResponse({ success: true });
          break;
          
        case 'getRealApplications':
          const realApps = await background.getStorageData();
          const realApplications = realApps.applications ? realApps.applications.filter(app => 
            app.realApplication || app.source === 'auto_apply' || app.source === 'manual_application'
          ) : [];
          sendResponse({ applications: realApplications });
          break;
          
        case 'applicationCompleted':
          await background.saveApplicationRecord(request.application);
          sendResponse({ success: true });
          break;
          
        default:
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Background message handler error:', error);
      sendResponse({ error: error.message });
    }
  })();
  
  return true;
});

// Tab update listener for enhanced job site detection
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const background = await ensureInitialized();
    
    if (background.isJobSite(tab.url)) {
      try {
        // Wait a bit for the page to fully load
        setTimeout(async () => {
          try {
            await chrome.tabs.sendMessage(tabId, { 
              action: 'jobSiteDetected',
              settings: (await background.getStorageData()).settings 
            });
          } catch (error) {
            console.log('Content script not ready yet');
          }
        }, 2000);
      } catch (error) {
        console.log('Tab not ready for content script');
      }
    }
  }
});

// Error handling
self.addEventListener('error', async (event) => {
  console.error('Background script error:', event.error);
  try {
    const background = await ensureInitialized();
    await background.logError('Background Script Error', event.error);
  } catch (error) {
    console.error('Failed to log error:', error);
  }
});

self.addEventListener('unhandledrejection', async (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  try {
    const background = await ensureInitialized();
    await background.logError('Unhandled Promise Rejection', new Error(event.reason));
  } catch (error) {
    console.error('Failed to log error:', error);
  }


});
// Extension Reload Handler - Add this to your background.js

class ExtensionReloadHandler {
  constructor() {
    this.setupReloadHandling();
  }

  setupReloadHandling() {
    // Listen for extension reload/update
    chrome.runtime.onInstalled.addListener((details) => {
      if (details.reason === 'install') {
        console.log('Extension installed');
      } else if (details.reason === 'update') {
        console.log('Extension updated');
        this.notifyContentScripts();
      }
    });

    // Handle context invalidation
    chrome.runtime.onConnect.addListener((port) => {
      port.onDisconnect.addListener(() => {
        if (chrome.runtime.lastError) {
          console.log('Port disconnected:', chrome.runtime.lastError.message);
        }
      });
    });
  }

  async notifyContentScripts() {
    try {
      const tabs = await chrome.tabs.query({});
      
      for (const tab of tabs) {
        try {
          await chrome.tabs.sendMessage(tab.id, { 
            action: 'extensionReloaded',
            timestamp: Date.now()
          });
        } catch (error) {
          // Content script not loaded on this tab, which is fine
          console.log(`Tab ${tab.id} doesn't have content script`);
        }
      }
    } catch (error) {
      console.error('Error notifying content scripts:', error);
    }
  }

  // Enhanced message handler with context validation
  handleMessage(request, sender, sendResponse) {
    try {
      // Validate that the context is still valid
      if (!chrome.storage) {
        sendResponse({ error: 'Extension context invalid' });
        return;
      }

      switch (request.action) {
        case 'ping':
          sendResponse({ success: true, timestamp: Date.now() });
          break;
          
        case 'validateContext':
          sendResponse({ 
            valid: true, 
            extensionId: chrome.runtime.id,
            timestamp: Date.now()
          });
          break;
          
        default:
          // Handle other messages
          this.handleOtherMessages(request, sender, sendResponse);
      }
    } catch (error) {
      console.error('Message handler error:', error);
      sendResponse({ error: error.message });
    }
  }

  handleOtherMessages(request, sender, sendResponse) {
    // Your existing message handling logic
    sendResponse({ success: true });
  }
}

// Initialize the reload handler
const reloadHandler = new ExtensionReloadHandler();

// Update your existing message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  reloadHandler.handleMessage(request, sender, sendResponse);
  return true; // Keep message channel open for async responses
});