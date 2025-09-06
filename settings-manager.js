// Settings Manager with Custom Answers (Fixed & Enhanced)
console.log('Settings Manager Loading...');

class SettingsManager {
  constructor() {
    this.settings = {};
    this.customAnswers = {};
    this.userProfile = {};
    this.initialize();
  }

  async initialize() {
    try {
      await this.loadData();
      this.createEnhancedUI();
      this.setupEventListeners();
      this.loadFormData();
      console.log('Enhanced Settings Manager initialized');
    } catch (error) {
      console.error('Settings initialization failed:', error);
    }
  }

  async loadData() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['jobHunterData']);
        if (result.jobHunterData) {
          this.settings = result.jobHunterData.settings || {};
          this.customAnswers = result.jobHunterData.customAnswers || {};
          this.userProfile = result.jobHunterData.userProfile || {};
        }
      }
      this.setDefaults();
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.setDefaults();
    }
  }

  setDefaults() {
    this.settings = {
      dailyLimit: 10,
      delayBetweenJobs: 30, // seconds
      salaryRange: {
        min: 50000,
        max: 150000
      },
      platforms: ['linkedin', 'indeed', 'ziprecruiter', 'glassdoor'],
      autoApplyEnabled: true,
      smartFilterEnabled: true,
      stealthModeEnabled: true,
      sequentialMode: true,
      ...this.settings
    };

    this.userProfile = {
      name: '',
      email: 'ahmed.hany.boshra.2001@gmail.com',
      phone: '01065232774',
      skills: [],
      experience: 4, // Default experience
      ...this.userProfile
    };

    if (Object.keys(this.customAnswers).length === 0) {
      this.customAnswers = {
        'aws': '3',
        'graphql': '2',
        'react': '4',
        'javascript': '5',
        'years of experience': '4',
        'willing to relocate': 'Yes',
        'work remotely': 'Yes',
        'authorized to work': 'Yes',
        'require sponsorship': 'No',
        'salary expectation': '80000',
        'current salary': '75000'
      };
    }
  }

  createEnhancedUI() {
    document.body.innerHTML = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; padding: 20px;">
        <div style="max-width: 900px; margin: 0 auto;">
          <div style="background: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
            <h1 style="font-size: 32px; color: #4a5568; margin-bottom: 10px;">JobHunter Settings</h1>
            <p style="color: #718096; font-size: 16px;">Configure your automated job application preferences</p>
          </div>

          <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
            <div style="display: flex; border-bottom: 1px solid #e2e8f0;">
              <button class="tab-btn active" data-tab="profile" style="flex: 1; padding: 15px; border: none; background: #667eea; color: white; cursor: pointer; font-weight: 600;">Profile</button>
              <button class="tab-btn" data-tab="automation" style="flex: 1; padding: 15px; border: none; background: #f7fafc; color: #4a5568; cursor: pointer; font-weight: 600;">Automation</button>
              <button class="tab-btn" data-tab="answers" style="flex: 1; padding: 15px; border: none; background: #f7fafc; color: #4a5568; cursor: pointer; font-weight: 600;">Custom Answers</button>
            </div>

            <div id="profile-tab" class="tab-content" style="padding: 30px; display: block;">
              <h2 style="color: #4a5568; margin-bottom: 20px;">User Profile</h2>
              
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div>
                  <label style="display: block; margin-bottom: 8px; font-weight: 600;">Full Name</label>
                  <input type="text" id="userName" style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px;">
                </div>
                <div>
                  <label style="display: block; margin-bottom: 8px; font-weight: 600;">Email</label>
                  <input type="email" id="userEmail" style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px;">
                </div>
              </div>
              
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div>
                  <label style="display: block; margin-bottom: 8px; font-weight: 600;">Phone</label>
                  <input type="tel" id="userPhone" style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px;">
                </div>
                <div>
                  <label style="display: block; margin-bottom: 8px; font-weight: 600;">Years of Experience</label>
                  <input type="number" id="userExperience" min="0" max="20" style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px;">
                </div>
              </div>

              <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px; font-weight: 600;">Skills</label>
                <div id="skillsContainer" style="display: flex; flex-wrap: wrap; gap: 5px; min-height: 40px; padding: 8px; border: 2px solid #e2e8f0; border-radius: 8px;">
                  <input type="text" id="skillInput" placeholder="Add skills..." style="border: none; outline: none; flex: 1; min-width: 100px;">
                </div>
              </div>
            </div>

            <div id="automation-tab" class="tab-content" style="padding: 30px; display: none;">
              <h2 style="color: #4a5568; margin-bottom: 20px;">Automation Settings</h2>
              
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div>
                  <label style="display: block; margin-bottom: 8px; font-weight: 600;">Daily Application Limit</label>
                  <input type="number" id="dailyLimit" min="1" max="50" style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px;">
                </div>
                <div>
                  <label style="display: block; margin-bottom: 8px; font-weight: 600;">Delay Between Jobs (seconds)</label>
                  <input type="number" id="delayBetweenJobs" min="10" max="300" style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px;">
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div>
                  <label style="display: block; margin-bottom: 8px; font-weight: 600;">Min Salary</label>
                  <input type="number" id="salaryMin" style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px;">
                </div>
                <div>
                  <label style="display: block; margin-bottom: 8px; font-weight: 600;">Max Salary</label>
                  <input type="number" id="salaryMax" style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px;">
                </div>
              </div>

              <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 12px; font-weight: 600;">Features</label>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                  <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="checkbox" id="autoApplyEnabled" style="transform: scale(1.2);">
                    <span>Auto Apply Mode</span>
                  </label>
                  <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="checkbox" id="smartFilterEnabled" style="transform: scale(1.2);">
                    <span>Smart Filtering</span>
                  </label>
                  <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="checkbox" id="stealthModeEnabled" style="transform: scale(1.2);">
                    <span>Stealth Mode</span>
                  </label>
                  <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="checkbox" id="sequentialMode" style="transform: scale(1.2);">
                    <span>Sequential Application</span>
                  </label>
                </div>
              </div>

              <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 12px; font-weight: 600;">Platforms</label>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                  <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="checkbox" id="platform-linkedin" style="transform: scale(1.2);">
                    <span>LinkedIn</span>
                  </label>
                  <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="checkbox" id="platform-indeed" style="transform: scale(1.2);">
                    <span>Indeed</span>
                  </label>
                  <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="checkbox" id="platform-ziprecruiter" style="transform: scale(1.2);">
                    <span>ZipRecruiter</span>
                  </label>
                  <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="checkbox" id="platform-glassdoor" style="transform: scale(1.2);">
                    <span>Glassdoor</span>
                  </label>
                </div>
              </div>
            </div>

            <div id="answers-tab" class="tab-content" style="padding: 30px; display: none;">
              <h2 style="color: #4a5568; margin-bottom: 20px;">Custom Application Answers</h2>
              <p style="color: #718096; margin-bottom: 20px;">Configure how the extension should answer common application questions</p>
              
              <div style="margin-bottom: 20px;">
                <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                  <input type="text" id="newQuestion" placeholder="Question keyword (e.g., 'aws', 'willing to relocate')" style="flex: 2; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px;">
                  <input type="text" id="newAnswer" placeholder="Answer (e.g., '3', 'Yes', 'Available immediately')" style="flex: 1; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px;">
                  <button id="addAnswer" style="padding: 12px 20px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">Add</button>
                </div>
              </div>

              <div style="max-height: 400px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <thead style="background: #f7fafc; position: sticky; top: 0;">
                    <tr>
                      <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; font-weight: 600;">Question Keywords</th>
                      <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; font-weight: 600;">Answer</th>
                      <th style="padding: 12px; text-align: center; border-bottom: 1px solid #e2e8f0; font-weight: 600;">Actions</th>
                    </tr>
                  </thead>
                  <tbody id="answersTableBody">
                  </tbody>
                </table>
              </div>
            </div>

            <div style="padding: 20px 30px; border-top: 1px solid #e2e8f0; background: #f7fafc; display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; gap: 10px;">
                <button id="saveSettings" style="padding: 12px 24px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">Save All Settings</button>
                <button id="resetSettings" style="padding: 12px 24px; background: #e2e8f0; color: #4a5568; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">Reset to Defaults</button>
              </div>
              <button id="testSettings" style="padding: 12px 24px; background: #48bb78; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">Test Extension</button>
            </div>
          </div>
        </div>
      </div>
      
      <div id="notification" style="position: fixed; top: 20px; right: 20px; padding: 12px 20px; background: #48bb78; color: white; border-radius: 8px; opacity: 0; transition: all 0.3s ease; z-index: 1000; display: none;"></div>
    `;
  }

  setupEventListeners() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tabName = e.target.getAttribute('data-tab');
        this.switchTab(tabName);
      });
    });

    const saveBtn = document.getElementById('saveSettings');
    const resetBtn = document.getElementById('resetSettings');
    const testBtn = document.getElementById('testSettings');
    const skillInput = document.getElementById('skillInput');
    const addAnswerBtn = document.getElementById('addAnswer');
    const newQuestionInput = document.getElementById('newQuestion');
    const newAnswerInput = document.getElementById('newAnswer');

    if (saveBtn) saveBtn.addEventListener('click', () => this.saveSettings());
    if (resetBtn) resetBtn.addEventListener('click', () => this.resetSettings());
    if (testBtn) testBtn.addEventListener('click', () => this.testExtension());
    
    if (skillInput) {
      skillInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && e.target.value.trim()) {
          e.preventDefault();
          this.addSkill(e.target.value.trim());
          e.target.value = '';
        }
      });
    }

    if (addAnswerBtn) addAnswerBtn.addEventListener('click', () => this.addCustomAnswer());
    if (newQuestionInput) newQuestionInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.addCustomAnswer();
    });
    if (newAnswerInput) newAnswerInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.addCustomAnswer();
    });
  }

  switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
      btn.style.background = '#f7fafc';
      btn.style.color = '#4a5568';
    });
    
    const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeBtn) {
      activeBtn.classList.add('active');
      activeBtn.style.background = '#667eea';
      activeBtn.style.color = 'white';
    }

    document.querySelectorAll('.tab-content').forEach(content => {
      content.style.display = 'none';
    });
    
    const activeContent = document.getElementById(`${tabName}-tab`);
    if (activeContent) {
      activeContent.style.display = 'block';
    }
  }

  loadFormData() {
    this.setElementValue('userName', this.userProfile.name || '');
    this.setElementValue('userEmail', this.userProfile.email || 'ahmed.hany.boshra.2001@gmail.com');
    this.setElementValue('userPhone', this.userProfile.phone || '01065232774');
    this.setElementValue('userExperience', this.userProfile.experience || 4);
    this.setElementValue('dailyLimit', this.settings.dailyLimit || 10);
    this.setElementValue('delayBetweenJobs', this.settings.delayBetweenJobs || 30);
    this.setElementValue('salaryMin', this.settings.salaryRange?.min || 50000);
    this.setElementValue('salaryMax', this.settings.salaryRange?.max || 150000);

    this.setCheckboxValue('autoApplyEnabled', this.settings.autoApplyEnabled);
    this.setCheckboxValue('smartFilterEnabled', this.settings.smartFilterEnabled);
    this.setCheckboxValue('stealthModeEnabled', this.settings.stealthModeEnabled);
    this.setCheckboxValue('sequentialMode', this.settings.sequentialMode);

    const platforms = this.settings.platforms || ['linkedin', 'indeed', 'ziprecruiter', 'glassdoor'];
    platforms.forEach(platform => this.setCheckboxValue(`platform-${platform}`, true));

    this.renderSkills();
    this.renderCustomAnswers();
  }

  setElementValue(id, value) {
    const element = document.getElementById(id);
    if (element) element.value = value;
  }

  setCheckboxValue(id, checked) {
    const element = document.getElementById(id);
    if (element) element.checked = checked;
  }

  addSkill(skill) {
    if (!this.userProfile.skills) this.userProfile.skills = [];
    if (!this.userProfile.skills.includes(skill)) {
      this.userProfile.skills.push(skill);
      this.renderSkills();
    }
  }

  renderSkills() {
    const container = document.getElementById('skillsContainer');
    const input = document.getElementById('skillInput');
    if (!container || !input) return;

    const existingTags = container.querySelectorAll('.skill-tag');
    existingTags.forEach(tag => tag.remove());

    if (this.userProfile.skills) {
      this.userProfile.skills.forEach(skill => {
        const tag = document.createElement('div');
        tag.className = 'skill-tag';
        tag.style.cssText = `
          background: #667eea; color: white; padding: 4px 8px; border-radius: 4px; 
          font-size: 12px; display: flex; align-items: center; gap: 5px;
        `;
        tag.innerHTML = `
          <span>${this.escapeHtml(skill)}</span>
          <span class="remove" style="cursor: pointer; font-weight: bold;">×</span>
        `;
        tag.querySelector('.remove').addEventListener('click', () => {
          this.removeSkill(skill);
          tag.remove();
        });
        container.insertBefore(tag, input);
      });
    }
  }

  removeSkill(skill) {
    if (this.userProfile.skills) {
      this.userProfile.skills = this.userProfile.skills.filter(s => s !== skill);
    }
  }

  addCustomAnswer() {
    const questionInput = document.getElementById('newQuestion');
    const answerInput = document.getElementById('newAnswer');
    
    const question = questionInput.value.trim();
    const answer = answerInput.value.trim();
    
    if (question && answer) {
      this.customAnswers[question.toLowerCase()] = answer;
      this.renderCustomAnswers();
      questionInput.value = '';
      answerInput.value = '';
      this.showNotification('Custom answer added!');
    }
  }

  renderCustomAnswers() {
    const tbody = document.getElementById('answersTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    Object.entries(this.customAnswers).forEach(([question, answer]) => {
      const row = document.createElement('tr');
      row.style.borderBottom = '1px solid #e2e8f0';
      row.innerHTML = `
        <td style="padding: 12px;">${this.escapeHtml(question)}</td>
        <td style="padding: 12px;">${this.escapeHtml(answer)}</td>
        <td style="padding: 12px; text-align: center;">
          <button class="edit-answer-btn" data-question="${this.escapeHtml(question)}" style="background: #ed8936; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; margin-right: 5px; font-size: 12px;">Edit</button>
          <button class="delete-answer-btn" data-question="${this.escapeHtml(question)}" style="background: #f56565; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">Delete</button>
        </td>
      `;
      tbody.appendChild(row);
    });
    
    // Attach event listeners after rendering
    document.querySelectorAll('.edit-answer-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const question = e.target.getAttribute('data-question');
            this.editAnswer(question);
        });
    });
    document.querySelectorAll('.delete-answer-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const question = e.target.getAttribute('data-question');
            this.deleteAnswer(question);
        });
    });
  }

  editAnswer(question) {
    const newAnswer = prompt(`Edit answer for "${question}":`, this.customAnswers[question]);
    if (newAnswer !== null && newAnswer.trim()) {
      this.customAnswers[question] = newAnswer.trim();
      this.renderCustomAnswers();
      this.showNotification('Answer updated!');
    }
  }

  deleteAnswer(question) {
    if (confirm(`Delete answer for "${question}"?`)) {
      delete this.customAnswers[question];
      this.renderCustomAnswers();
      this.showNotification('Answer deleted!');
    }
  }

  async saveSettings() {
    try {
      const newSettings = {
        dailyLimit: parseInt(document.getElementById('dailyLimit').value) || 10,
        delayBetweenJobs: parseInt(document.getElementById('delayBetweenJobs').value) || 30,
        salaryRange: {
          min: parseInt(document.getElementById('salaryMin').value) || 50000,
          max: parseInt(document.getElementById('salaryMax').value) || 150000
        },
        platforms: this.getSelectedPlatforms(),
        autoApplyEnabled: document.getElementById('autoApplyEnabled').checked,
        smartFilterEnabled: document.getElementById('smartFilterEnabled').checked,
        stealthModeEnabled: document.getElementById('stealthModeEnabled').checked,
        sequentialMode: document.getElementById('sequentialMode').checked
      };

      const newUserProfile = {
        name: document.getElementById('userName').value,
        email: document.getElementById('userEmail').value,
        phone: document.getElementById('userPhone').value,
        experience: parseInt(document.getElementById('userExperience').value) || 4,
        skills: this.userProfile.skills || []
      };

      const data = {
        settings: newSettings,
        userProfile: newUserProfile,
        customAnswers: this.customAnswers,
        applications: this.applications || [],
        stats: this.stats || { totalApplications: 0, todayApplications: 0, responseRate: 0, interviewsScheduled: 0, lastResetDate: new Date().toDateString() }
      };
      
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.set({ jobHunterData: data });
      }
      
      this.settings = newSettings;
      this.userProfile = newUserProfile;
      
      this.showNotification('All settings saved successfully!', 'success');
      
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showNotification('Failed to save settings!', 'error');
    }
  }

  getSelectedPlatforms() {
    const platforms = [];
    ['linkedin', 'indeed', 'ziprecruiter', 'glassdoor'].forEach(platform => {
      if (document.getElementById(`platform-${platform}`).checked) {
        platforms.push(platform);
      }
    });
    return platforms;
  }

  resetSettings() {
    if (!confirm('Reset all settings to defaults? This will clear all custom answers.')) {
      return;
    }

    this.setDefaults();
    this.customAnswers = {
      'aws': '3',
      'graphql': '2',
      'react': '4',
      'javascript': '5',
      'years of experience': '4',
      'willing to relocate': 'Yes',
      'work remotely': 'Yes',
      'authorized to work': 'Yes',
      'require sponsorship': 'No',
      'salary expectation': '80000',
      'current salary': '75000'
    };
    
    this.loadFormData();
    this.showNotification('Settings reset to defaults');
  }

  async testExtension() {
    try {
      this.showNotification('Testing extension...', 'info');
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        await chrome.tabs.create({ url: 'dashboard.html' });
        this.showNotification('Test dashboard opened!', 'success');
      } else {
        window.open('dashboard.html', '_blank');
        this.showNotification('Extension appears to be working!', 'success');
      }
    } catch (error) {
      console.error('Extension test failed:', error);
      this.showNotification('Extension test failed!', 'error');
    }
  }

  showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    if (!notification) return;

    const colors = {
      success: '#48bb78',
      error: '#f56565',
      warning: '#ed8936',
      info: '#4299e1'
    };

    notification.textContent = message;
    notification.style.display = 'block';
    notification.style.background = colors[type] || colors.success;
    notification.style.opacity = '1';

    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => notification.style.display = 'none', 300);
    }, 3000);
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

let settingsManager;

document.addEventListener('DOMContentLoaded', () => {
  settingsManager = new SettingsManager();
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(() => {
    if (!settingsManager) {
      settingsManager = new SettingsManager();
    }
  }, 100);
}