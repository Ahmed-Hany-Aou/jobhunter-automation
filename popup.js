// JobHunter Agent - Popup Script (Fixed for CSP)
console.log('JobHunter Popup Script Loading...');

class JobHunterPopup {
  constructor() {
    this.isRunning = false;
    this.stats = {};
    this.settings = {};
    this.applications = [];
    this.isInitialized = false;
    
    this.initialize();
  }

  async initialize() {
    try {
      console.log('Loading popup data...');
      await this.loadData();
      this.setupEventListeners();
      this.updateUI();
      this.startStatsPolling();
      this.isInitialized = true;
      console.log('Popup initialized successfully');
    } catch (error) {
      console.error('Popup initialization failed:', error);
      this.showNotification('Failed to initialize popup: ' + error.message, 'error');
    }
  }

  async loadData() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['jobHunterData']);
        if (result.jobHunterData) {
          this.settings = result.jobHunterData.settings || this.getDefaultSettings();
          this.applications = result.jobHunterData.applications || [];
          this.stats = result.jobHunterData.stats || this.getDefaultStats();
        } else {
          await this.initializeDefaultData();
        }

        // Try to get updated stats from background
        try {
          const statsResponse = await chrome.runtime.sendMessage({ action: 'getStats' });
          if (statsResponse && !statsResponse.error) {
            this.stats = { ...this.stats, ...statsResponse };
          }
        } catch (error) {
          console.log('Background script not ready, using stored stats');
        }
      } else {
        console.log('Chrome storage not available');
        this.initializeDefaultData();
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      await this.initializeDefaultData();
    }
  }

  getDefaultSettings() {
    return {
      autoApplyEnabled: false,
      smartFilterEnabled: true,
      stealthModeEnabled: true,
      dailyLimit: 50,
      platforms: ['linkedin', 'indeed', 'ziprecruiter', 'glassdoor'],
      maxApplicationsPerHour: 10
    };
  }

  getDefaultStats() {
    return {
      totalApplications: 0,
      todayApplications: 0,
      responseRate: 0,
      interviewsScheduled: 0,
      lastResetDate: new Date().toDateString()
    };
  }

  async initializeDefaultData() {
    const defaultData = {
      applications: [],
      settings: this.getDefaultSettings(),
      stats: this.getDefaultStats(),
      userProfile: {
        name: '',
        email: '',
        phone: '',
        skills: []
      }
    };

    if (typeof chrome !== 'undefined' && chrome.storage) {
      try {
        await chrome.storage.local.set({ jobHunterData: defaultData });
      } catch (error) {
        console.error('Failed to save default data:', error);
      }
    }
    
    this.settings = defaultData.settings;
    this.applications = defaultData.applications;
    this.stats = defaultData.stats;
  }

  setupEventListeners() {
    // Start/Stop button
    const startStopBtn = document.getElementById('startStopBtn');
    if (startStopBtn) {
      startStopBtn.addEventListener('click', () => this.toggleAutoApply());
    }

    // Dashboard button
    const viewDashboardBtn = document.getElementById('viewDashboard');
    if (viewDashboardBtn) {
      viewDashboardBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: 'dashboard.html' });
      });
    }

    // Settings button
    const openSettingsBtn = document.getElementById('openSettings');
    if (openSettingsBtn) {
      openSettingsBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: 'options.html' });
      });
    }

    // Toggle switches
    this.setupToggle('smartFilterToggle', 'smartFilterEnabled');
    this.setupToggle('autoApplyToggle', 'autoApplyEnabled');
    this.setupToggle('stealthModeToggle', 'stealthModeEnabled');
  }

  setupToggle(toggleId, settingKey) {
    const toggle = document.getElementById(toggleId);
    if (!toggle) return;
    
    // Set initial state
    if (this.settings && this.settings[settingKey]) {
      toggle.classList.add('active');
    }

    toggle.addEventListener('click', async () => {
      toggle.classList.toggle('active');
      const isActive = toggle.classList.contains('active');
      
      // Update settings locally
      if (!this.settings) this.settings = this.getDefaultSettings();
      this.settings[settingKey] = isActive;
      
      // Save to storage
      try {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          const result = await chrome.storage.local.get(['jobHunterData']);
          const data = result.jobHunterData || {};
          if (!data.settings) data.settings = this.getDefaultSettings();
          data.settings[settingKey] = isActive;
          await chrome.storage.local.set({ jobHunterData: data });
          
          // Try to update background script
          try {
            await chrome.runtime.sendMessage({
              action: 'updateSettings',
              settings: { [settingKey]: isActive }
            });
          } catch (error) {
            console.log('Background script not ready');
          }
        }
      } catch (error) {
        console.error('Failed to save setting:', error);
        this.showNotification('Failed to save setting', 'error');
      }
    });
  }
  
  // Refined toggleAutoApply method to handle content script communication
  async toggleAutoApply() {
    const button = document.getElementById('startStopBtn');
    if (!button) return;

    // Check current state
    this.isRunning = button.classList.contains('active');

    if (this.isRunning) {
      // If already running, stop it
      this.isRunning = false;
      this.updateButtonState(false);
      
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && this.isJobSite(tab.url)) {
          await chrome.tabs.sendMessage(tab.id, { action: 'stopAutoApply' });
        }
        this.showNotification('Auto Apply Stopped', 'success');
      } catch (error) {
        this.showNotification('Could not stop auto apply', 'error');
        console.error('Error stopping auto apply:', error);
      }

    } else {
      // If not running, start it
      this.updateButtonState(true, true); // Show loading state

      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !this.isJobSite(tab.url)) {
          this.updateButtonState(false); // Revert button state
          this.showNotification('Please navigate to a job site first', 'warning');
          return;
        }

        // Try to get status from content script; inject if not present.
        const response = await new Promise(resolve => {
          chrome.tabs.sendMessage(tab.id, { action: 'getStatus' }, response => {
            if (chrome.runtime.lastError) {
              // Content script not active, inject it.
              chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
              }, () => {
                // After injection, retry getStatus.
                chrome.tabs.sendMessage(tab.id, { action: 'getStatus' }, resolve);
              });
            } else {
              resolve(response);
            }
          });
        });

        // Now that content script is guaranteed to be active, send the start message.
        await chrome.tabs.sendMessage(tab.id, { action: 'startAutoApply' });

        this.isRunning = true;
        this.updateButtonState(true);
        this.showNotification('Auto Apply Started - Scanning for jobs...', 'success');
        
      } catch (error) {
        console.error('Failed to start auto apply:', error);
        this.updateButtonState(false); // Reset button state
        this.showNotification('Failed to start auto apply: ' + error.message, 'error');
      }
    }
  }

  updateButtonState(isRunning, isLoading = false) {
    const button = document.getElementById('startStopBtn');
    if (!button) return;

    if (isLoading) {
      button.innerHTML = '<span class="loading" id="loadingSpinner"></span>Starting...';
      button.disabled = true;
      button.classList.add('loading-state');
    } else {
      button.disabled = false;
      button.classList.remove('loading-state');
      if (isRunning) {
        button.innerHTML = 'Stop Auto Apply';
        button.classList.remove('btn-primary');
        button.classList.add('btn-danger', 'active');
      } else {
        button.innerHTML = 'Start Auto Apply';
        button.classList.remove('btn-danger', 'active');
        button.classList.add('btn-primary');
      }
    }
  }

  isJobSite(url) {
    if (!url) return false;
    const jobSites = ['linkedin.com', 'indeed.com', 'ziprecruiter.com', 'glassdoor.com'];
    return jobSites.some(site => url.includes(site));
  }

  updateUI() {
    this.updateStats();
    this.updateRecentActivity();
    const startStopBtn = document.getElementById('startStopBtn');
    if (startStopBtn) {
      this.updateButtonState(this.isRunning);
    }
  }

  updateStats() {
    const elements = {
      todayApplications: document.getElementById('todayApplications'),
      totalApplications: document.getElementById('totalApplications'),
      responseRate: document.getElementById('responseRate'),
      interviewsScheduled: document.getElementById('interviewsScheduled'),
      activeJobs: document.getElementById('activeJobs'),
      progressFill: document.getElementById('progressFill'),
      progressText: document.getElementById('progressText')
    };

    // Update stat cards
    if (elements.todayApplications) {
      elements.todayApplications.textContent = this.stats.todayApplications || 0;
    }
    if (elements.totalApplications) {
      elements.totalApplications.textContent = this.stats.totalApplications || 0;
    }
    if (elements.responseRate) {
      elements.responseRate.textContent = `${this.stats.responseRate || 0}%`;
    }
    if (elements.interviewsScheduled) {
      elements.interviewsScheduled.textContent = this.stats.interviewsScheduled || 0;
    }
    if (elements.activeJobs) {
      elements.activeJobs.textContent = this.getActiveJobsCount();
    }

    // Update progress bar
    if (elements.progressFill && elements.progressText) {
      const dailyLimit = this.settings.dailyLimit || 50;
      const todayApps = this.stats.todayApplications || 0;
      const progress = Math.min((todayApps / dailyLimit) * 100, 100);
      
      elements.progressFill.style.width = `${progress}%`;
      elements.progressText.textContent = `${todayApps}/${dailyLimit}`;
    }
  }

  getActiveJobsCount() {
    if (!this.applications || this.applications.length === 0) return 0;
    
    return this.applications.filter(app => 
      app.status === 'applied' || app.status === 'viewed'
    ).length;
  }

  updateRecentActivity() {
    const activityContainer = document.getElementById('recentActivity');
    if (!activityContainer) return;

    if (!this.applications || this.applications.length === 0) {
      activityContainer.innerHTML = this.getEmptyActivityHTML();
      return;
    }

    const recentApps = this.applications
      .sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt))
      .slice(0, 5);

    const activityHTML = recentApps.map(app => {
      const timeAgo = this.getTimeAgo(new Date(app.appliedAt));
      return `
        <div class="activity-item">
          <div class="activity-dot"></div>
          <span>Applied to ${this.escapeHtml(app.jobTitle)} at ${this.escapeHtml(app.company)} • ${timeAgo}</span>
        </div>
      `;
    }).join('');

    activityContainer.innerHTML = activityHTML;
  }

  getEmptyActivityHTML() {
    return `
      <div class="activity-item">
        <div class="activity-dot"></div>
        <span>No recent applications</span>
      </div>
    `;
  }

  getTimeAgo(date) {
    try {
      const now = new Date();
      const diffInMs = now - date;
      const diffInMinutes = Math.floor(diffInMs / 60000);
      const diffInHours = Math.floor(diffInMinutes / 60);
      const diffInDays = Math.floor(diffInHours / 24);

      if (diffInMinutes < 1) return 'just now';
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      if (diffInHours < 24) return `${diffInHours}h ago`;
      return `${diffInDays}d ago`;
    } catch (error) {
      return 'unknown time';
    }
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    if (!notification) {
      console.log(`${type}: ${message}`);
      return;
    }

    notification.textContent = message;
    notification.className = `notification ${type} show`;

    setTimeout(() => {
      notification.classList.remove('show');
    }, 3000);
  }

  startStatsPolling() {
    // Update stats every 10 seconds
    setInterval(async () => {
      if (!this.isInitialized) return;
      
      try {
        await this.loadData();
        this.updateUI();
      } catch (error) {
        console.log('Stats polling error (this is normal if background script is not ready)');
      }
    }, 10000);
  }

  async exportData() {
    try {
      const data = {
        applications: this.applications,
        stats: this.stats,
        exportedAt: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `jobhunter-data-${new Date().toISOString().split('T')[0]}.json`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);
      this.showNotification('Data exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      this.showNotification('Export failed', 'error');
    }
  }
}

// Initialize popup when DOM is loaded
function initializePopup() {
  try {
    console.log('Initializing popup...');
    window.jobHunterPopup = new JobHunterPopup();
    console.log('Popup initialized successfully');
  } catch (error) {
    console.error('Failed to initialize popup:', error);
  }
}

// Multiple initialization strategies
document.addEventListener('DOMContentLoaded', initializePopup);

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(initializePopup, 100);
}

// Fallback initialization
setTimeout(() => {
  if (!window.jobHunterPopup) {
    console.log('Fallback popup initialization...');
    initializePopup();
  }
}, 2000);

console.log('Popup script loaded successfully');