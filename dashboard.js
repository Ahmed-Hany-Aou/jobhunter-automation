// JobHunter Agent - Dashboard Script (Consolidated & Fixed)
console.log('Dashboard Script Loading...');

class JobHunterDashboard {
  constructor() {
    this.applications = [];
    this.stats = {};
    this.initialize();
  }

  async initialize() {
    try {
      console.log('Initializing dashboard...');
      await this.loadData();
      this.setupEventListeners();
      this.updateUI();
      this.showMessage('Dashboard loaded successfully', 'success');
    } catch (error) {
      console.error('Dashboard initialization failed:', error);
      this.showMessage('Failed to load dashboard: ' + error.message, 'error');
    }
  }

  async loadData() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['jobHunterData']);
        if (result.jobHunterData) {
          // Filter for "real" applications only for the main table
          this.applications = (result.jobHunterData.applications || []).filter(app => 
            app.realApplication || app.source === 'auto_apply' || app.source === 'manual_application'
          );
          this.stats = result.jobHunterData.stats || {};
          console.log(`Loaded ${this.applications.length} real applications`);
        } else {
          this.applications = [];
          this.stats = {};
        }
      } else {
        console.log('Chrome storage not available, using sample data');
        this.loadSampleData();
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      this.applications = [];
      this.stats = {};
    }
  }

  loadSampleData() {
    this.applications = [{
      id: '1',
      jobTitle: 'Software Engineer',
      company: 'Tech Corp',
      platform: 'linkedin',
      status: 'applied',
      appliedAt: new Date().toISOString(),
      matchScore: 0.85,
      source: 'demo'
    }, ];

    this.stats = {
      totalApplications: this.applications.length,
      todayApplications: 1,
      responseRate: 50,
      interviewsScheduled: 1
    };
  }

  setupEventListeners() {
    const addSampleBtn = document.getElementById('addSampleBtn');
    const clearDataBtn = document.getElementById('clearDataBtn');
    const refreshBtn = document.getElementById('refreshBtn');

    if (addSampleBtn) {
      addSampleBtn.addEventListener('click', () => this.addSampleData());
    }
    if (clearDataBtn) {
      clearDataBtn.addEventListener('click', () => this.clearAllData());
    }
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshData());
    }

    // New event delegation for the jobs table
    const jobsTableBody = document.getElementById('jobsTableBody');
    if (jobsTableBody) {
      jobsTableBody.addEventListener('click', (e) => {
        const btn = e.target.closest('.test-btn');
        if (btn) {
          const jobId = btn.getAttribute('data-job-id');
          const job = this.applications.find(j => j.id === jobId);

          if (btn.classList.contains('danger')) {
            this.deleteJob(jobId, job);
          } else {
            this.viewJob(job);
          }
        }
      });
    }
  }

  async addSampleData() {
    try {
      this.loadSampleData();

      if (typeof chrome !== 'undefined' && chrome.storage) {
        const data = {
          applications: this.applications,
          stats: this.stats,
          settings: {
            dailyLimit: 50,
            platforms: ['linkedin', 'indeed', 'ziprecruiter', 'glassdoor']
          }
        };

        await chrome.storage.local.set({
          jobHunterData: data
        });
      }

      this.updateUI();
      this.showMessage('Sample data added successfully!', 'success');
    } catch (error) {
      console.error('Failed to add sample data:', error);
      this.showMessage('Failed to add sample data: ' + error.message, 'error');
    }
  }

  async clearAllData() {
    if (!confirm('Are you sure you want to clear all application data?')) {
      return;
    }

    try {
      this.applications = [];
      this.stats = {};

      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.clear();
      }

      this.updateUI();
      this.showMessage('All data cleared successfully!', 'success');
    } catch (error) {
      console.error('Failed to clear data:', error);
      this.showMessage('Failed to clear data: ' + error.message, 'error');
    }
  }

  async refreshData() {
    try {
      await this.loadData();
      this.updateUI();
      this.showMessage('Data refreshed successfully!', 'success');
    } catch (error) {
      console.error('Failed to refresh data:', error);
      this.showMessage('Failed to refresh data: ' + error.message, 'error');
    }
  }

  updateUI() {
    this.updateStats();
    this.renderApplicationsTable();
    this.updateStatus();
    this.updateMetrics();
  }

  updateStats() {
    document.getElementById('totalApplications').textContent = this.stats.totalApplications || 0;
    document.getElementById('responseRate').textContent = `${this.stats.responseRate || 0}%`;
    document.getElementById('interviewsScheduled').textContent = this.stats.interviewsScheduled || 0;
    document.getElementById('todayApplications').textContent = this.stats.todayApplications || 0;
  }

  updateMetrics() {
    document.getElementById('totalRealApps').textContent = this.applications.length;

    const today = new Date().toDateString();
    const todayRealApps = this.applications.filter(app => {
      const appDate = new Date(app.appliedAt).toDateString();
      return appDate === today;
    }).length;
    document.getElementById('todayRealApps').textContent = todayRealApps;

    const autoAppliedJobs = this.applications.filter(app =>
      app.source === 'auto_apply'
    ).length;
    document.getElementById('autoAppliedJobs').textContent = autoAppliedJobs;

    const successRate = this.stats.totalApplications > 0 ?
      Math.round((this.applications.length / this.stats.totalApplications) * 100) : 0;
    document.getElementById('successRate').textContent = successRate + '%';
  }

  updateStatus() {
    const statusEl = document.getElementById('statusDisplay');
    if (!statusEl) return;

    if (this.applications.length > 0) {
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

  renderApplicationsTable() {
    const tbody = document.getElementById('jobsTableBody');
    const table = document.getElementById('jobsTable');

    if (!tbody || !table) return;

    if (this.applications.length === 0) {
      table.style.display = 'none';
      tbody.innerHTML = '';
      document.getElementById('recentApplicationsList').style.display = 'block';
      document.getElementById('recentApplicationsList').innerHTML = `
        <div style="text-align: center; color: #718096; padding: 20px;">
          No real applications detected yet
        </div>
      `;
      return;
    }

    document.getElementById('recentApplicationsList').style.display = 'none';
    table.style.display = 'table';
    tbody.innerHTML = this.applications.map(app => `
      <tr>
        <td>${this.formatDate(app.appliedAt)}</td>
        <td style="font-weight: 600;">${this.escapeHtml(app.jobTitle)}</td>
        <td>${this.escapeHtml(app.company)}</td>
        <td><span class="platform-indicator ${this.escapeHtml(app.platform)}">${this.escapeHtml(app.platform)}</span></td>
        <td>
          <span class="status-badge status-${this.escapeHtml(app.status)}">${this.escapeHtml(app.status)}</span>
        </td>
        <td>${app.matchScore ? Math.round(app.matchScore * 100) + '%' : '-'}</td>
        <td>
          <button class="test-btn" style="padding: 4px 8px; font-size: 12px; margin: 2px;" data-job-id="${app.id}">View</button>
          <button class="test-btn danger" style="padding: 4px 8px; font-size: 12px; margin: 2px;" data-job-id="${app.id}">Delete</button>
        </td>
      </tr>
    `).join('');
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
          this.updateStatsBasedOnApplications(data.applications, data.stats);
          await chrome.storage.local.set({ jobHunterData: data });
        }
      }

      this.showMessage('Job application deleted', 'success');
      await this.loadData();
      this.updateUI();
    } catch (error) {
      console.error('Failed to delete job:', error);
      this.showMessage('Failed to delete job: ' + error.message, 'error');
    }
  }

  updateStatsBasedOnApplications(applications, stats) {
    stats.totalApplications = applications.length;
    const today = new Date().toDateString();
    stats.todayApplications = applications.filter(app => new Date(app.appliedAt).toDateString() === today).length;
    stats.responseRate = applications.length > 0 ? Math.round((applications.filter(app => app.status === 'interview' || app.status === 'offer' || app.status === 'response').length / applications.length) * 100) : 0;
    stats.interviewsScheduled = applications.filter(app => app.status === 'interview').length;
    return stats;
  }

  formatDate(dateString) {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  }

  showMessage(message, type = 'success') {
    const container = document.getElementById('messageContainer');
    if (!container) return;

    container.innerHTML = '';
    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'success' ? 'success-message' : 'error-message';
    messageDiv.textContent = message;
    container.appendChild(messageDiv);

    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.remove();
      }
    }, 5000);
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
  new JobHunterDashboard();
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(() => {
    new JobHunterDashboard();
  }, 100);
}