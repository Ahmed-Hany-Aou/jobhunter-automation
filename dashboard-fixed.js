// JobHunter Agent - Fixed Dashboard Script (CSP Compliant)
console.log('Real Application Test Page Loading...');

class RealApplicationTester {
  constructor() {
    this.applications = [];
    this.realApplications = [];
    this.initialize();
  }

  async initialize() {
    try {
      await this.loadData();
      this.setupEventListeners();
      this.updateMetrics();
      this.updateStatus();
      this.addLog('Tester initialized successfully', 'success');
    } catch (error) {
      console.error('Tester initialization failed:', error);
      this.addLog('Initialization failed: ' + error.message, 'error');
    }
  }

  async loadData() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['jobHunterData']);
        if (result.jobHunterData) {
          this.applications = result.jobHunterData.applications || [];
          this.realApplications = this.applications.filter(app => 
            app.realApplication || app.source === 'auto_apply' || app.source === 'manual_application'
          );
        }
      } else {
        console.log('Chrome storage not available - using sample data');
        this.loadSampleData();
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      this.applications = [];
      this.realApplications = [];
    }
  }

  loadSampleData() {
    this.applications = [
      {
        id: '1',
        jobTitle: 'Software Engineer',
        company: 'Tech Corp',
        platform: 'linkedin',
        status: 'applied',
        appliedAt: new Date().toISOString(),
        matchScore: 0.85,
        source: 'demo'
      }
    ];
    this.realApplications = [];
  }

  setupEventListeners() {
    const elements = {
      checkRealAppsBtn: 'checkForRealApplications',
      enableAutoModeBtn: 'enableAutoApplyMode',
      testJobDetectionBtn: 'testJobDetection',
      clearRealDataBtn: 'clearRealDataOnly',
      simulateLinkedInBtn: () => this.simulateApplicationCapture('linkedin'),
      simulateIndeedBtn: () => this.simulateApplicationCapture('indeed'),
      injectTestJobBtn: 'injectTestJobData',
      testFiltersBtn: 'testSmartFilters'
    };

    Object.entries(elements).forEach(([id, method]) => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener('click', () => {
          if (typeof method === 'string') {
            this[method]();
          } else {
            method();
          }
        });
      }
    });
  }

  async checkForRealApplications() {
    try {
      this.addLog('Checking for real applications...', 'info');
      
      await this.loadData();
      
      let output = 'REAL APPLICATION ANALYSIS:\n\n';
      
      output += `Total Applications in Storage: ${this.applications.length}\n`;
      output += `Real Applications Detected: ${this.realApplications.length}\n`;
      output += `Demo/Sample Applications: ${this.applications.length - this.realApplications.length}\n\n`;

      if (this.realApplications.length > 0) {
        output += 'REAL APPLICATIONS FOUND:\n';
        this.realApplications.forEach((app, index) => {
          output += `${index + 1}. ${app.jobTitle} at ${app.company}\n`;
          output += `   Platform: ${app.platform}\n`;
          output += `   Applied: ${new Date(app.appliedAt).toLocaleString()}\n`;
          output += `   Source: ${app.source || 'unknown'}\n`;
          output += `   Real: ${app.realApplication ? 'Yes' : 'Detected as real'}\n\n`;
        });
        
        this.addLog(`Found ${this.realApplications.length} real applications!`, 'success');
      } else {
        output += 'NO REAL APPLICATIONS FOUND\n';
        output += 'This means:\n';
        output += '- Extension is not capturing real job applications\n';
        output += '- Only demo/sample data is present\n';
        output += '- Manual application detection may not be working\n\n';
        
        this.addLog('No real applications detected', 'error');
      }

      output += '\nRECOMMENDATIONS:\n';
      if (this.realApplications.length === 0) {
        output += '1. Try applying to a job manually on LinkedIn/Indeed\n';
        output += '2. Enable Auto Apply mode and visit job pages\n';
        output += '3. Check if content script is loading on job sites\n';
        output += '4. Verify extension permissions are granted\n';
      } else {
        output += '1. Great! Real application capture is working\n';
        output += '2. You can now use auto-apply mode safely\n';
        output += '3. Monitor the success rate and adjust filters\n';
      }

      document.getElementById('realAppResults').textContent = output;
      this.updateMetrics();
      this.updateRecentApplications();
      this.renderJobs(this.realApplications);

    } catch (error) {
      console.error('Error checking real applications:', error);
      this.addLog('Error checking applications: ' + error.message, 'error');
    }
  }

  async enableAutoApplyMode() {
    try {
      this.addLog('Enabling auto apply mode...', 'info');
      
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['jobHunterData']);
        const data = result.jobHunterData || {};
        
        if (!data.settings) data.settings = {};
        data.settings.autoApplyEnabled = true;
        data.settings.smartFilterEnabled = true;
        data.settings.stealthModeEnabled = true;
        data.settings.dailyLimit = 10;
        data.settings.realCaptureMode = true;
        
        await chrome.storage.local.set({ jobHunterData: data });
        
        // Try to communicate with active tab
        try {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab && this.isJobSite(tab.url)) {
            await chrome.tabs.sendMessage(tab.id, { action: 'startAutoApply' });
            this.addLog('Auto apply mode enabled on current tab', 'success');
          } else {
            this.addLog('Auto apply mode enabled (navigate to a job site to activate)', 'success');
          }
        } catch (error) {
          this.addLog('Auto apply mode enabled (content script not ready)', 'success');
        }
      } else {
        this.addLog('Auto apply mode enabled (Chrome storage not available)', 'success');
      }
      
      this.updateStatus();
      
    } catch (error) {
      console.error('Error enabling auto mode:', error);
      this.addLog('Failed to enable auto mode: ' + error.message, 'error');
    }
  }

  async testJobDetection() {
    try {
      this.addLog('Testing job page detection...', 'info');
      
      if (typeof chrome === 'undefined') {
        this.addLog('Chrome APIs not available - testing in development mode', 'info');
        return;
      }
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        this.addLog('No active tab found', 'error');
        return;
      }
      
      if (!this.isJobSite(tab.url)) {
        this.addLog('Current tab is not a job site. Navigate to LinkedIn, Indeed, ZipRecruiter, or Glassdoor first.', 'error');
        return;
      }
      
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getStatus' });
        if (response && response.success !== false) {
          this.addLog(`Job site detected: ${response.platform || 'unknown'}`, 'success');
          this.addLog(`Auto apply status: ${response.isRunning ? 'Active' : 'Inactive'}`, 'info');
          
          // Try to get job data from current page
          await chrome.tabs.sendMessage(tab.id, { action: 'applyToCurrentJob' });
          this.addLog('Job detection test completed', 'success');
        } else {
          this.addLog('Content script not responding', 'error');
        }
      } catch (error) {
        this.addLog('Content script not loaded or not responding', 'error');
      }
      
    } catch (error) {
      console.error('Job detection test failed:', error);
      this.addLog('Job detection test failed: ' + error.message, 'error');
    }
  }

  async clearRealDataOnly() {
    if (!confirm('Clear only real application data? This will keep demo data intact.')) {
      return;
    }

    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['jobHunterData']);
        const data = result.jobHunterData || {};
        
        if (data.applications) {
          // Keep only demo/sample applications
          data.applications = data.applications.filter(app => 
            !app.realApplication && app.source !== 'auto_apply' && app.source !== 'manual_application'
          );
          
          // Update stats
          if (data.stats) {
            data.stats.totalApplications = data.applications.length;
            data.stats.todayApplications = 0;
          }
          
          await chrome.storage.local.set({ jobHunterData: data });
        }
      }
      
      this.addLog('Real application data cleared', 'success');
      await this.loadData();
      this.updateMetrics();
      this.updateRecentApplications();
      this.renderJobs([]);
      
    } catch (error) {
      console.error('Failed to clear real data:', error);
      this.addLog('Failed to clear real data: ' + error.message, 'error');
    }
  }

  async simulateApplicationCapture(platform) {
    try {
      this.addLog(`Simulating ${platform} application capture...`, 'info');
      
      const mockApplication = {
        id: Date.now().toString(),
        jobTitle: `Senior Software Engineer (${platform} test)`,
        company: `Test Company ${Math.floor(Math.random() * 100)}`,
        platform: platform,
        location: 'Remote',
        appliedAt: new Date().toISOString(),
        status: 'applied',
        url: `https://${platform}.com/jobs/test-${Date.now()}`,
        source: 'auto_apply',
        realApplication: true,
        matchScore: 0.85 + Math.random() * 0.15
      };

      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['jobHunterData']);
        const data = result.jobHunterData || { applications: [], settings: {}, stats: {} };
        
        data.applications.push(mockApplication);
        
        // Update stats
        if (!data.stats) data.stats = {};
        data.stats.totalApplications = data.applications.length;
        const today = new Date().toDateString();
        data.stats.todayApplications = data.applications.filter(app => {
          const appDate = new Date(app.appliedAt).toDateString();
          return appDate === today;
        }).length;

        await chrome.storage.local.set({ jobHunterData: data });
      }
      
      this.addLog(`${platform} application simulated successfully`, 'success');
      document.getElementById('manualTestResults').textContent = 
        `Simulated application:\n${JSON.stringify(mockApplication, null, 2)}`;
      
      await this.loadData();
      this.updateMetrics();
      this.updateRecentApplications();
      this.renderJobs(this.realApplications);
      
    } catch (error) {
      console.error('Simulation failed:', error);
      this.addLog('Simulation failed: ' + error.message, 'error');
    }
  }

  async injectTestJobData() {
    try {
      this.addLog('Injecting comprehensive test job data...', 'info');
      
      const testJobs = [
        {
          id: `test-${Date.now()}-1`,
          jobTitle: 'Senior Full Stack Developer',
          company: 'TechCorp Industries',
          platform: 'linkedin',
          location: 'San Francisco, CA',
          appliedAt: new Date().toISOString(),
          status: 'applied',
          url: 'https://linkedin.com/jobs/view/test-123',
          source: 'auto_apply',
          realApplication: true,
          matchScore: 0.92
        },
        {
          id: `test-${Date.now()}-2`,
          jobTitle: 'React Developer',
          company: 'Startup XYZ',
          platform: 'indeed',
          location: 'Remote',
          appliedAt: new Date(Date.now() - 3600000).toISOString(),
          status: 'applied',
          url: 'https://indeed.com/jobs/test-456',
          source: 'manual_application',
          realApplication: true,
          matchScore: 0.88
        },
        {
          id: `test-${Date.now()}-3`,
          jobTitle: 'Frontend Engineer',
          company: 'Innovation Labs',
          platform: 'ziprecruiter',
          location: 'New York, NY',
          appliedAt: new Date(Date.now() - 7200000).toISOString(),
          status: 'applied',
          url: 'https://ziprecruiter.com/jobs/test-789',
          source: 'auto_apply',
          realApplication: true,
          matchScore: 0.85
        }
      ];

      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['jobHunterData']);
        const data = result.jobHunterData || { applications: [], settings: {}, stats: {} };
        
        data.applications.push(...testJobs);
        
        // Update stats
        if (!data.stats) data.stats = {};
        data.stats.totalApplications = data.applications.length;
        const today = new Date().toDateString();
        data.stats.todayApplications = data.applications.filter(app => {
          const appDate = new Date(app.appliedAt).toDateString();
          return appDate === today;
        }).length;

        await chrome.storage.local.set({ jobHunterData: data });
      }
      
      this.addLog(`Injected ${testJobs.length} test job applications`, 'success');
      document.getElementById('manualTestResults').textContent = 
        `Injected test jobs:\n${testJobs.map(job => `- ${job.jobTitle} at ${job.company} (${job.platform})`).join('\n')}`;
      
      await this.loadData();
      this.updateMetrics();
      this.updateRecentApplications();
      this.renderJobs(this.realApplications);
      
    } catch (error) {
      console.error('Test injection failed:', error);
      this.addLog('Test injection failed: ' + error.message, 'error');
    }
  }

  testSmartFilters() {
    this.addLog('Testing smart filter logic...', 'info');
    
    const testJobs = [
      { title: 'Senior Software Engineer', company: 'Google', description: 'React, Node.js, 5+ years' },
      { title: 'Junior Developer', company: 'Startup', description: 'Entry level position' },
      { title: 'Lead Frontend Engineer', company: 'Facebook', description: 'JavaScript, React, senior level' },
      { title: 'Intern - Software Development', company: 'Microsoft', description: 'Summer internship' }
    ];

    let results = 'SMART FILTER TEST RESULTS:\n\n';
    
    testJobs.forEach((job, index) => {
      const passed = this.evaluateJobForTesting(job);
      results += `${index + 1}. ${job.title} at ${job.company}\n`;
      results += `   Filter Result: ${passed ? 'PASS ✅' : 'FILTERED OUT ❌'}\n`;
      results += `   Reason: ${this.getFilterReason(job)}\n\n`;
    });

    document.getElementById('manualTestResults').textContent = results;
    this.addLog('Smart filter test completed', 'success');
  }

  evaluateJobForTesting(job) {
    const titleLower = job.title.toLowerCase();
    
    // Check for excluded keywords
    const excludeKeywords = ['intern', 'entry level', 'junior'];
    if (excludeKeywords.some(keyword => titleLower.includes(keyword))) {
      return false;
    }
    
    // Check for good keywords
    const goodKeywords = ['senior', 'lead', 'principal', 'staff', 'engineer', 'developer'];
    return goodKeywords.some(keyword => titleLower.includes(keyword));
  }

  getFilterReason(job) {
    const titleLower = job.title.toLowerCase();
    
    if (['intern', 'entry level', 'junior'].some(keyword => titleLower.includes(keyword))) {
      return 'Contains excluded keywords';
    }
    
    if (!['senior', 'lead', 'principal', 'staff', 'engineer', 'developer'].some(keyword => titleLower.includes(keyword))) {
      return 'Missing required keywords';
    }
    
    return 'Meets all filter criteria';
  }

  // CRITICAL: This is the missing renderJobs function that was causing the error
  renderJobs(jobs) {
    const table = document.getElementById('jobsTable');
    const tbody = document.getElementById('jobsTableBody');
    const recentAppsContainer = document.getElementById('recentApplicationsList');
    
    if (!jobs || jobs.length === 0) {
      table.style.display = 'none';
      recentAppsContainer.innerHTML = `
        <div style="text-align: center; color: #718096; padding: 20px;">
          No real applications detected yet
        </div>
      `;
      return;
    }

    // Show table and populate it
    table.style.display = 'table';
    tbody.innerHTML = '';

    jobs.forEach((job, index) => {
      const row = document.createElement('tr');
      
      // Safely handle date
      const appliedDate = job.appliedAt ? 
        new Date(job.appliedAt).toLocaleDateString() : 'N/A';
      
      // Safely handle all fields
      const jobTitle = job.jobTitle || job.title || 'Unknown';
      const company = job.company || 'Unknown';
      const platform = job.platform || 'Unknown';
      const status = job.status || 'Unknown';
      const matchScore = job.matchScore !== undefined ? 
        Math.round(job.matchScore * 100) + '%' : '-';

      row.innerHTML = `
        <td>${appliedDate}</td>
        <td><strong>${this.escapeHtml(jobTitle)}</strong></td>
        <td>${this.escapeHtml(company)}</td>
        <td><span class="platform-indicator ${platform}">${platform}</span></td>
        <td>${this.escapeHtml(status)}</td>
        <td>${matchScore}</td>
        <td>
          <button class="test-btn" style="padding: 4px 8px; font-size: 12px; margin: 2px;" data-job-id="${job.id || index}">View</button>
          <button class="test-btn danger" style="padding: 4px 8px; font-size: 12px; margin: 2px;" data-job-id="${job.id || index}">Delete</button>
        </td>
      `;
      
      tbody.appendChild(row);
    });

    // Add click handlers for action buttons
    tbody.addEventListener('click', (e) => {
      if (e.target.classList.contains('test-btn')) {
        const jobId = e.target.getAttribute('data-job-id');
        const job = jobs.find(j => j.id === jobId) || jobs[parseInt(jobId)];
        
        if (e.target.classList.contains('danger')) {
          this.deleteJob(jobId, job);
        } else {
          this.viewJob(job);
        }
      }
    });

    // Hide the old recent applications display
    recentAppsContainer.style.display = 'none';
  }

  viewJob(job) {
    if (!job) return;
    
    const details = `
Job Details:
Title: ${job.jobTitle || job.title || 'Unknown'}
Company: ${job.company || 'Unknown'}
Platform: ${job.platform || 'Unknown'}
Location: ${job.location || 'Not specified'}
Applied: ${job.appliedAt ? new Date(job.appliedAt).toLocaleString() : 'Unknown'}
Status: ${job.status || 'Unknown'}
Source: ${job.source || 'Unknown'}
Match Score: ${job.matchScore ? Math.round(job.matchScore * 100) + '%' : 'N/A'}
URL: ${job.url || 'Not available'}
    `;
    
    alert(details);
  }

  async deleteJob(jobId, job) {
    if (!confirm(`Delete application for ${job?.jobTitle || 'this job'}?`)) {
      return;
    }

    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['jobHunterData']);
        const data = result.jobHunterData || {};
        
        if (data.applications) {
          data.applications = data.applications.filter(app => app.id !== jobId);
          
          // Update stats
          if (data.stats) {
            data.stats.totalApplications = data.applications.length;
            const today = new Date().toDateString();
            data.stats.todayApplications = data.applications.filter(app => {
              const appDate = new Date(app.appliedAt).toDateString();
              return appDate === today;
            }).length;
          }
          
          await chrome.storage.local.set({ jobHunterData: data });
        }
      }
      
      this.addLog('Job application deleted', 'success');
      await this.loadData();
      this.updateMetrics();
      this.updateRecentApplications();
      this.renderJobs(this.realApplications);
      
    } catch (error) {
      console.error('Failed to delete job:', error);
      this.addLog('Failed to delete job: ' + error.message, 'error');
    }
  }

  updateMetrics() {
    document.getElementById('totalRealApps').textContent = this.realApplications.length;
    
    const today = new Date().toDateString();
    const todayRealApps = this.realApplications.filter(app => {
      const appDate = new Date(app.appliedAt).toDateString();
      return appDate === today;
    }).length;
    document.getElementById('todayRealApps').textContent = todayRealApps;
    
    const autoAppliedJobs = this.realApplications.filter(app => 
      app.source === 'auto_apply'
    ).length;
    document.getElementById('autoAppliedJobs').textContent = autoAppliedJobs;
    
    const successRate = this.applications.length > 0 ? 
      Math.round((this.realApplications.length / this.applications.length) * 100) : 0;
    document.getElementById('successRate').textContent = successRate + '%';
  }

  updateStatus() {
    const statusEl = document.getElementById('statusDisplay');
    
    if (this.realApplications.length > 0) {
      statusEl.innerHTML = `
        ✅ <strong>Real applications detected!</strong><br>
        Extension is working correctly and capturing real job applications.
      `;
      statusEl.parentElement.style.background = 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)';
    } else {
      statusEl.innerHTML = `
        ⚠️ <strong>No real applications found</strong><br>
        Extension may not be capturing real applications yet. Try the testing steps above.
      `;
      statusEl.parentElement.style.background = 'linear-gradient(135deg, #ed8936 0%, #dd6b20 100%)';
    }
  }

  updateRecentApplications() {
    // This method is kept for compatibility but renderJobs handles the display now
    const container = document.getElementById('recentApplicationsList');
    
    if (this.realApplications.length === 0) {
      container.style.display = 'block';
      container.innerHTML = `
        <div style="text-align: center; color: #718096; padding: 20px;">
          No real applications detected yet
        </div>
      `;
      return;
    }

    // Hide this container since we're using the table now
    container.style.display = 'none';
  }

  isJobSite(url) {
    if (!url) return false;
    const jobSites = ['linkedin.com', 'indeed.com', 'ziprecruiter.com', 'glassdoor.com'];
    return jobSites.some(site => url.includes(site));
  }

  addLog(message, type = 'info') {
    const logContainer = document.getElementById('activityLog');
    const timestamp = new Date().toLocaleTimeString();
    
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${type}`;
    logEntry.textContent = `[${timestamp}] ${message}`;
    
    logContainer.appendChild(logEntry);
    logContainer.scrollTop = logContainer.scrollHeight;
    
    // Keep only last 50 log entries
    while (logContainer.children.length > 50) {
      logContainer.removeChild(logContainer.firstChild);
    }
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize the tester when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  try {
    window.realApplicationTester = new RealApplicationTester();
    console.log('Real Application Tester initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Real Application Tester:', error);
  }
});

// Fallback initialization
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(() => {
    if (!window.realApplicationTester) {
      try {
        window.realApplicationTester = new RealApplicationTester();
        console.log('Real Application Tester initialized via fallback');
      } catch (error) {
        console.error('Fallback initialization failed:', error);
      }
    }
  }, 100);
}

console.log('Dashboard script loaded successfully');