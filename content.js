// JobHunter Agent - Complete Fixed Content Script for Real Applications
console.log('🎯 JobHunter Real Application Content Script Loading...');

// ==============================
//  Main Controller Class
// ==============================
class JobHunterRealApply {
    constructor() {
        this.platform = this.detectPlatform();
        this.isProcessing = false; // Initial state, will be updated from storage
        this.processedJobs = new Set();
        this.sequentialBrowser = null;
        this.applicationObserver = null;
        this.settings = {
            smartFilterEnabled: true,
            autoApplyEnabled: false,
            stealthModeEnabled: true,
            maxApplicationsPerHour: 10,
            delayBetweenApplications: 30000,
        };
        this.userProfile = {
            name: "Ahmed Hany",
            email: "ahmed.hany.boshra.2001@gmail.com",
            phone: "01065232774",
            linkedinProfile: "https://linkedin.com/in/yourprofile",
            experience: "2"
        };
        this.customAnswers = {};
        console.log(`🎯 JobHunter detected platform: ${this.platform}`);
        this.initialize();
    }

    detectPlatform() {
        const hostname = window.location.hostname;
        if (hostname.includes('linkedin.com')) return 'linkedin';
        if (hostname.includes('indeed.com')) return 'indeed';
        if (hostname.includes('ziprecruiter.com')) return 'ziprecruiter';
        if (hostname.includes('glassdoor.com')) return 'glassdoor';
        return 'unknown';
    }

    async initialize() {
        try {
            console.log('🚀 JobHunter initializing...');
            await this.loadSettings();
            this.injectUI();
            this.updateUIState();
            this.bindEvents();
            this.startJobPageDetection();
            this.setupApplicationMonitoring();
            this.sequentialBrowser = new EnhancedSequentialBrowser(this);

            if (this.isProcessing) {
                console.log('🔄 Resuming auto-apply session from saved state...');
                this.sequentialBrowser.startAutoBrowseAndApply();
            }

            console.log(`✅ JobHunter initialized successfully on ${this.platform}`);
        } catch (error) {
            console.error('❌ JobHunter initialization failed:', error);
        }
    }

    async loadSettings() {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                const result = await chrome.storage.local.get(['jobHunterData']);
                if (result.jobHunterData) {
                    this.settings = { ...this.settings, ...result.jobHunterData.settings };
                    this.userProfile = { ...this.userProfile, ...result.jobHunterData.userProfile };
                    this.customAnswers = { ...this.customAnswers, ...result.jobHunterData.customAnswers };
                    this.isProcessing = result.jobHunterData.isProcessing || false;
                }
            }
            console.log('Settings loaded. Current state isProcessing:', this.isProcessing);
        } catch (error) {
            console.log('Using default settings');
        }
    }
    
    async toggleAutoApply() {
        if (this.isProcessing) {
            this.isProcessing = false;
            if (this.sequentialBrowser) this.sequentialBrowser.stopBrowsing();
            this.showNotification('Auto Apply Stopped', 'success');
        } else {
            this.isProcessing = true;
            if (this.sequentialBrowser) {
                await this.sequentialBrowser.startAutoBrowseAndApply();
            }
            this.showNotification('Auto Apply Started', 'success');
        }
    
        this.updateUIState();
    
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                const result = await chrome.storage.local.get(['jobHunterData']);
                const data = result.jobHunterData || {};
                data.isProcessing = this.isProcessing;
                await chrome.storage.local.set({ jobHunterData: data });
            }
        } catch (error) {
            console.error('Failed to save processing state:', error);
        }
    }

    updateUIState() {
        const fab = document.getElementById('jobhunter-fab');
        if (!fab) return;
        
        const fabInner = fab.querySelector('.jh-fab');
        const statusEl = fab.querySelector('#jh-status');

        if (this.isProcessing) {
            fabInner.classList.add('active');
            fabInner.title = 'JobHunter Agent - AUTO APPLY ACTIVE (Click to Stop)';
            if (statusEl) statusEl.textContent = 'Auto Active';
        } else {
            fabInner.classList.remove('active');
            fabInner.title = 'JobHunter Agent - Click to Start Auto Browse';
            if (statusEl) statusEl.textContent = 'Click to Browse';
        }
    }
    
    detectJobOnPage() {
        const jobData = {};
        switch (this.platform) {
            case 'linkedin':
                jobData.title = this.getLinkedInJobTitle();
                jobData.company = this.getLinkedInCompany();
                jobData.location = this.getLinkedInLocation();
                jobData.description = this.getLinkedInDescription();
                jobData.applyButton = this.getLinkedInApplyButton();
                break;
        }
        jobData.url = window.location.href;
        jobData.platform = this.platform;
        jobData.detectedAt = new Date().toISOString();
        return jobData;
    }

    getLinkedInJobTitle() {
        const selectors = ['.top-card-layout__title', '.job-details-jobs-unified-top-card__job-title h1', '.jobs-unified-top-card__job-title'];
        return this.getTextFromSelectors(selectors);
    }
    getLinkedInCompany() {
        const selectors = ['.top-card-layout__card .top-card-layout__first-subline a', '.job-details-jobs-unified-top-card__company-name a', '.jobs-unified-top-card__company-name a'];
        return this.getTextFromSelectors(selectors);
    }
    getLinkedInLocation() {
        const selectors = ['.top-card-layout__second-subline', '.job-details-jobs-unified-top-card__bullet', '.jobs-unified-top-card__bullet'];
        return this.getTextFromSelectors(selectors);
    }
    getLinkedInDescription() {
        const selectors = ['.jobs-description__content .jobs-box__html-content', '.job-details-module__content', '.jobs-description-content__text'];
        return this.getTextFromSelectors(selectors);
    }
    getLinkedInApplyButton() {
        const selectors = ['.jobs-apply-button', '.jobs-s-apply button', 'button[aria-label*="Apply"]'];
        return this.getElementFromSelectors(selectors);
    }
    
    getTextFromSelectors(selectors) {
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.trim()) {
                return element.textContent.trim();
            }
        }
        return null;
    }

    getElementFromSelectors(selectors) {
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                return element;
            }
        }
        return null;
    }
    
    evaluateJob(jobData) {
        if (!this.settings.smartFilterEnabled) return true;
        const filters = {
            titleKeywords: ['senior', 'lead', 'principal', 'staff', 'engineer', 'developer'],
            excludeKeywords: ['intern', 'entry level', 'junior'],
            minSalary: this.settings.salaryRange?.min || 60000,
            maxSalary: this.settings.salaryRange?.max || 200000
        };
        if (jobData.title) {
            const titleLower = jobData.title.toLowerCase();
            const hasExcludedKeywords = filters.excludeKeywords.some(keyword => titleLower.includes(keyword));
            if (hasExcludedKeywords) return false;
        }
        return true;
    }

    async processRealApplication(jobData) { }
    async saveApplicationData(jobData) { }
    
    startJobPageDetection() {
        let lastUrl = window.location.href;
        const checkForJobPage = () => {
            if (window.location.href !== lastUrl) {
                lastUrl = window.location.href;
                setTimeout(() => this.handleJobPageLoad(), 2000);
            }
        };
        setInterval(checkForJobPage, 1000);
        setTimeout(() => this.handleJobPageLoad(), 3000);
    }
    
    setupApplicationMonitoring() {
        console.log('Application monitoring setup initialized.');
        this.applicationObserver = null; 
    }

    handleJobPageLoad() {
        const jobData = this.detectJobOnPage();
        if (jobData.title && jobData.company) {
            console.log('Job detected:', jobData.title, 'at', jobData.company);
        }
    }
    
    injectUI() {
        const existingFab = document.getElementById('jobhunter-fab');
        if (existingFab) existingFab.remove();
        const fab = document.createElement('div');
        fab.id = 'jobhunter-fab';
        fab.innerHTML = `
            <div class="jh-fab" title="JobHunter Agent - Click to Start Auto Browse">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <circle cx="12" cy="12" r="10" stroke="white" stroke-width="2" fill="none"/>
                    <path d="M8 12l2 2 4-4" stroke="white" stroke-width="2" fill="none"/>
                </svg>
                <div class="jh-status" id="jh-status">Click to Browse</div>
            </div>
        `;
        this.injectStyles();
        document.body.appendChild(fab);
        fab.addEventListener('click', () => {
            this.toggleAutoApply();
        });
    }

    bindEvents() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'B') {
                e.preventDefault();
                this.toggleAutoApply();
            }
        });
    }

    injectStyles() {
        if (document.getElementById('jobhunter-styles')) return;
        const style = document.createElement('style');
        style.id = 'jobhunter-styles';
        style.textContent = `
            #jobhunter-fab { position: fixed !important; top: 100px !important; right: 30px !important; z-index: 999999 !important; }
            .jh-fab { width: 80px !important; height: 80px !important; background: linear-gradient(135deg, #48bb78 0%, #38a169 100%) !important; border-radius: 50% !important; display: flex !important; flex-direction: column; align-items: center !important; justify-content: center !important; cursor: pointer !important; box-shadow: 0 8px 25px rgba(72, 187, 120, 0.6) !important; transition: all 0.3s ease !important; position: relative !important; border: 3px solid white !important; }
            .jh-fab:hover { transform: scale(1.1) !important; }
            .jh-fab.active { background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%) !important; animation: jh-pulse 1.5s ease-in-out infinite !important; }
            .jh-status { color: white; font-size: 10px; font-weight: bold; margin-top: 4px; }
            .jh-fab:hover .jh-status { display: none; }
            .jh-fab:hover::after { content: attr(title); position: absolute !important; top: -45px !important; left: 50% !important; transform: translateX(-50%) !important; background: rgba(0, 0, 0, 0.9) !important; color: white !important; padding: 8px 16px !important; border-radius: 8px !important; font-size: 14px !important; white-space: nowrap !important; pointer-events: none !important; font-weight: 600 !important; }
            @keyframes jh-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(0.95); } }
        `;
        document.head.appendChild(style);
    }

    showNotification(message, type = 'success') {
        const existingToast = document.querySelector('.jh-toast');
        if(existingToast) existingToast.remove();

        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed; top: 20px; left: 50%; transform: translateX(-50%) translateY(-100px);
            background: white; border: 3px solid ${type === 'success' ? '#48bb78' : '#f56565'};
            color: ${type === 'success' ? '#22543d' : '#742a2a'};
            border-radius: 12px; padding: 16px 24px; box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
            z-index: 1000000; font-size: 16px; font-weight: 600; opacity: 0;
            transition: all 0.4s ease;
        `;
        notification.className = 'jh-toast';
        notification.textContent = `${type === 'success' ? '✅' : '❌'} ${message}`;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(-50%) translateY(0)';
        }, 100);

        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(-50%) translateY(-100px)';
            setTimeout(() => notification.remove(), 400);
        }, 4000);
    }
}
// -----------------------------
//  Sequential Browser Class
// -----------------------------
class EnhancedSequentialBrowser {
    constructor(mainJobHunter) {
        this.mainJobHunter = mainJobHunter;
        this.isPaused = false;
        this.jobQueue = [];
        this.currentJobIndex = 0;
        this.applicationsToday = 0;
        this.dailyLimit = 50;
        this.delayBetweenJobs = 10000;
        this.processedJobIds = new Set();
    }

    async startAutoBrowseAndApply() {
        console.log('🚀 Starting auto-browse and apply process...');
        this.mainJobHunter.isProcessing = true;
        this.isPaused = false;
        this.showBrowserUI();
        
        try {
            await this.scanJobListPanel();
            if (this.jobQueue.length > 0) {
                await this.processJobsSequentially();
            } else {
                this.mainJobHunter.showNotification('No new jobs found to process.', 'warning');
            }
        } catch (error) {
            console.error('Auto-browse error:', error);
        } finally {
            this.mainJobHunter.isProcessing = false;
            this.hideBrowserUI();
            this.mainJobHunter.updateUIState();
        }
    }

    stopBrowsing() {
        this.mainJobHunter.isProcessing = false;
        this.hideBrowserUI();
        this.mainJobHunter.showNotification('Auto-browse stopped', 'warning');
    }

    async scanJobListPanel() {
        console.log('📋 Scanning job list panel...');
        const listContainerSelectors = [
            '.scaffold-layout__list',
            'div.jobs-search-results-list__pane',
            '.jobs-search-results-list',
            '[aria-label="Job listings"]'
        ];
        let jobListContainer = null;
        for (const selector of listContainerSelectors) {
            jobListContainer = document.querySelector(selector);
            if (jobListContainer) {
                console.log(`Found job list container with selector: ${selector}`);
                break;
            }
        }

        if (!jobListContainer) {
            console.error('Could not find job list container.');
            this.mainJobHunter.showNotification('Could not find job list. Are you on a LinkedIn jobs page?', 'error');
            return;
        }

        const jobCardSelectors = [
            'li.scaffold-layout__list-item',
            'li[data-occludable-job-id]',
            'div.job-search-card'
        ];
        let jobCards = [];
        for (const selector of jobCardSelectors) {
            jobCards = jobListContainer.querySelectorAll(selector);
            if (jobCards.length > 0) {
                console.log(`Found ${jobCards.length} job cards with selector: ${selector}`);
                break;
            }
        }

        this.jobQueue = [];
        for (let i = 0; i < jobCards.length; i++) {
            const jobData = this.extractJobFromCard(jobCards[i], i);
            if (jobData && !this.processedJobIds.has(jobData.id)) {
                this.jobQueue.push(jobData);
            }
        }

        console.log(`✅ Found ${this.jobQueue.length} initial jobs to process.`);

        if (jobListContainer.scrollHeight > jobListContainer.clientHeight) {
            await this.loadMoreJobs(jobListContainer);
        }
    }
    
    async loadMoreJobs(jobListContainer) {
        console.log('📜 Scrolling to load more jobs...');
        let initialHeight = jobListContainer.scrollHeight;
        jobListContainer.scrollTop = initialHeight;
        await this.delay(3000);

        let newHeight = jobListContainer.scrollHeight;
        if (newHeight > initialHeight) {
             console.log('✅ More jobs loaded. Re-scanning...');
        } else {
             console.log('🏁 Reached the end of the job list.');
        }
    }

    async processJobsSequentially() {
        console.log(`🔄 Processing ${this.jobQueue.length} jobs sequentially...`);
        for (let i = 0; i < this.jobQueue.length; i++) {
            if (!this.mainJobHunter.isProcessing) {
                console.log('Process stopped by user');
                break;
            }
            if (this.applicationsToday >= this.dailyLimit) {
                this.mainJobHunter.showNotification(`Daily limit of ${this.dailyLimit} applications reached`, 'warning');
                break;
            }
            this.currentJobIndex = i;
            const job = this.jobQueue[i];
            console.log(`\n🎯 Processing job ${i + 1}/${this.jobQueue.length}: ${job.title}`);
            this.updateBrowserUI(job, i);
            try {
                await this.clickJobCard(job);
                await this.delay(3000);
                if (job.hasEasyApply) {
                    const applied = await this.applyToJob(job);
                    if (applied) {
                        this.applicationsToday++;
                        this.processedJobIds.add(job.id);
                        this.mainJobHunter.showNotification(`Applied to ${job.title} (${this.applicationsToday}/${this.dailyLimit})`, 'success');
                    }
                } else {
                    console.log(`⏭️ Skipping ${job.title} - Not an Easy Apply job.`);
                }
                if (i < this.jobQueue.length - 1) {
                    await this.countdownDelay(this.delayBetweenJobs);
                }
            } catch (error) {
                console.error(`Error processing ${job.title}:`, error);
            }
        }
        this.mainJobHunter.showNotification(`Completed! Applied to ${this.applicationsToday} jobs`, 'success');
    }

    async applyToJob(job) {
        console.log('🎯 Attempting to apply to job...');
        await this.delay(2000);
        let easyApplyButton = null;
        let attempts = 0;
        const maxAttempts = 10;

        while (!easyApplyButton && attempts < maxAttempts) {
            const buttonSelectors = [
                '.jobs-apply-button.jobs-apply-button--inline',
                'button.jobs-apply-button[aria-label*="Easy Apply"]',
                '.job-details-jobs-unified-top-card__primary-actions-container .jobs-apply-button',
                '.jobs-s-apply__button'
            ];
            for (const selector of buttonSelectors) {
                const button = document.querySelector(selector);
                if (button && this.isButtonVisible(button)) {
                    easyApplyButton = button;
                    console.log(`✅ Found Easy Apply button with selector: ${selector}`);
                    break;
                }
            }
            if (!easyApplyButton) {
                attempts++;
                console.log(`⏳ Waiting for Easy Apply button... Attempt ${attempts}/${maxAttempts}`);
                await this.delay(1000);
            }
        }

        if (!easyApplyButton) {
            console.log('❌ Easy Apply button not found');
            return false;
        }

        try {
            easyApplyButton.click();
            console.log('🖱️ Clicked Easy Apply button');
            await this.delay(2500);
            if (this.isModalOpen()) {
                console.log('✅ Application modal opened');
                const handler = new EnhancedLinkedInApplicationHandler(this.mainJobHunter);
                return await handler.processApplicationSteps();
            } else {
                console.log('⚠️ Modal did not open after click');
                return false;
            }
        } catch (error) {
            console.error('❌ Error clicking Easy Apply:', error);
            return false;
        }
    }
    
    isButtonVisible(button) {
        if (!button) return false;
        const rect = button.getBoundingClientRect();
        const style = window.getComputedStyle(button);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && !button.disabled;
    }

    isModalOpen() {
        const modalSelectors = [
            'div.jobs-easy-apply-modal',
            'div[aria-labelledby*="jobs-apply-header"]',
            'div[role="dialog"].artdeco-modal'
        ];
        for (const selector of modalSelectors) {
            const modal = document.querySelector(selector);
            if (modal && modal.offsetParent !== null) {
                 console.log(`✅ Modal found with selector: ${selector}`);
                return true;
            }
        }
        return false;
    }

    async clickJobCard(job) {
        console.log(`Clicking on job card: ${job.title}`);
        if (job.clickElement) {
            job.clickElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await this.delay(1000);
            job.clickElement.click();
        }
    }
    
    extractJobFromCard(jobCard, index) {
        try {
            const jobId = jobCard.getAttribute('data-job-id') || jobCard.getAttribute('data-occludable-job-id') || `job_${index}_${Date.now()}`;
            
            const titleElement = jobCard.querySelector('a.job-card-container__link strong, a.job-card-list__title strong');
            const companyElement = jobCard.querySelector('.job-card-container__primary-description, .artdeco-entity-lockup__subtitle');
            const locationElement = jobCard.querySelector('.job-card-container__metadata-item');
            
            const hasEasyApply = jobCard.textContent.includes('Easy Apply');

            if (!titleElement || !companyElement) {
                return null;
            }

            const jobData = {
                id: jobId,
                index: index,
                title: titleElement.textContent.trim(),
                company: companyElement.textContent.trim(),
                location: locationElement ? locationElement.textContent.trim() : 'N/A',
                hasEasyApply: hasEasyApply,
                element: jobCard,
                clickElement: jobCard.querySelector('a.job-card-container__link') || jobCard,
                platform: 'linkedin'
            };
            
            console.log(`📌 Extracted Job ${index}: ${jobData.title} at ${jobData.company} ${hasEasyApply ? '✅ Easy Apply' : '❌ External'}`);
            return jobData;
            
        } catch (error) {
            console.error(`Error extracting job from card ${index}:`, error);
            return null;
        }
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    async countdownDelay(totalMs) {
        const interval = 1000;
        let remaining = totalMs;
        while (remaining > 0 && this.mainJobHunter.isProcessing && !this.isPaused) {
            this.updateCountdown(Math.ceil(remaining / 1000));
            await this.delay(Math.min(interval, remaining));
            remaining -= interval;
        }
        this.updateCountdown(0);
    }
    
    showBrowserUI() {
        const existingUI = document.getElementById('auto-browser-ui');
        if (existingUI) existingUI.remove();
        const ui = document.createElement('div');
        ui.id = 'auto-browser-ui';
        ui.innerHTML = `
            <div style="position: fixed; top: 20px; right: 20px; background: white; border: 3px solid #48bb78; border-radius: 12px; padding: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); z-index: 999999; font-family: -apple-system, sans-serif; min-width: 350px; max-width: 400px;">
                <h3 style="margin: 0 0 15px 0; color: #2d3748; font-size: 18px; font-weight: 700;">
                    🤖 Auto Job Browser
                </h3>
                <div style="background: #f7fafc; border-radius: 8px; padding: 12px; margin-bottom: 15px;">
                    <div id="browser-status" style="font-size: 14px; color: #4a5568; margin-bottom: 8px;">Initializing...</div>
                    <div id="current-job-info" style="font-size: 13px; color: #718096;">Scanning job listings...</div>
                </div>
                <div style="margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span style="font-size: 12px; color: #718096;">Progress</span>
                        <span id="progress-text" style="font-size: 12px; color: #718096;">0/0</span>
                    </div>
                    <div style="background: #e2e8f0; border-radius: 4px; height: 8px; overflow: hidden;">
                        <div id="progress-bar" style="background: linear-gradient(90deg, #48bb78, #38a169); height: 100%; width: 0%; transition: width 0.3s;"></div>
                    </div>
                </div>
                <div id="countdown-section" style="display: none; margin-bottom: 15px; padding: 10px; background: #fef5e7; border-radius: 6px;">
                    <span style="font-size: 13px; color: #f39c12;">⏱️ Next job in: </span>
                    <span id="countdown-timer" style="font-size: 14px; font-weight: 600; color: #e67e22;"></span>
                    <span style="font-size: 13px; color: #f39c12;">s</span>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button id="pause-browser" style="flex: 1; background: #ed8936; color: white; border: none; padding: 10px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600;">⏸️ Pause</button>
                    <button id="stop-browser" style="flex: 1; background: #f56565; color: white; border: none; padding: 10px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600;">⏹️ Stop</button>
                </div>
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
                    <div style="font-size: 11px; color: #a0aec0;">
                        Applications today: <span id="apps-today" style="font-weight: 600;">${this.applicationsToday}</span> / ${this.dailyLimit}
                    </div>
                </div>
            </div>`;
        document.body.appendChild(ui);
        document.getElementById('stop-browser').addEventListener('click', () => this.stopBrowsing());
        document.getElementById('pause-browser').addEventListener('click', () => this.togglePause());
    }

    updateBrowserUI(job, index) {
        const statusEl = document.getElementById('browser-status');
        const jobInfoEl = document.getElementById('current-job-info');
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');
        const appsToday = document.getElementById('apps-today');
        if (statusEl) statusEl.textContent = `Processing Job ${index + 1} of ${this.jobQueue.length}`;
        if (jobInfoEl) jobInfoEl.innerHTML = `<strong>${job.title}</strong><br><span style="color: #a0aec0;">${job.company}</span>`;
        if (progressBar) progressBar.style.width = `${((index + 1) / this.jobQueue.length) * 100}%`;
        if (progressText) progressText.textContent = `${index + 1}/${this.jobQueue.length}`;
        if (appsToday) appsToday.textContent = this.applicationsToday;
    }

    updateCountdown(seconds) {
        const countdownSection = document.getElementById('countdown-section');
        const timerEl = document.getElementById('countdown-timer');
        if (countdownSection && timerEl) {
            if (seconds > 0) {
                countdownSection.style.display = 'block';
                timerEl.textContent = seconds;
            } else {
                countdownSection.style.display = 'none';
            }
        }
    }

    hideBrowserUI() {
        const ui = document.getElementById('auto-browser-ui');
        if (ui) ui.remove();
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        const pauseBtn = document.getElementById('pause-browser');
        if (pauseBtn) {
            pauseBtn.textContent = this.isPaused ? '▶️ Resume' : '⏸️ Pause';
        }
    }
}
// -----------------------------
//  Perfect Form Filler Class
// -----------------------------
class PerfectFormFiller {
  constructor(userProfile, customAnswers) {
    this.userProfile = userProfile;
    this.customAnswers = customAnswers;
  }

  async fillLinkedInForm() {
    console.log('Starting intelligent LinkedIn form filling...');
    await this.handleRadioButtons();
    await this.handleCheckboxes();
    await this.handleTextInputs();
    await this.handleTextareas();
    await this.handleNumberInputs();
    await this.handleDropdowns();
    console.log('Form filling completed');
  }

  async handleRadioButtons() {
    const radioGroups = this.getRadioGroups();
    for (const [groupName, radios] of radioGroups.entries()) {
      const question = this.getFieldQuestion(radios[0]);
      const answer = this.getRadioAnswer(question);
      if (answer) {
        const radioToSelect = this.findMatchingRadio(radios, answer);
        if (radioToSelect) {
          await this.selectRadio(radioToSelect);
          console.log(`Selected radio: ${answer} for question: ${question}`);
        }
      }
    }
  }

  getRadioGroups() {
    const radioGroups = new Map();
    const allRadios = document.querySelectorAll('input[type="radio"]');
    allRadios.forEach(radio => {
      if (!this.isElementVisible(radio)) return;
      const groupName = radio.name || 'default';
      if (!radioGroups.has(groupName)) {
        radioGroups.set(groupName, []);
      }
      radioGroups.get(groupName).push(radio);
    });
    return radioGroups;
  }

  getQuestionForRadioGroup(firstRadio) {
    let question = '';
    const fieldset = firstRadio.closest('fieldset');
    if (fieldset) {
      const legend = fieldset.querySelector('legend');
      if (legend) question = legend.textContent.trim();
    }
    if (!question) {
      const formGroup = firstRadio.closest('.form-group, .question-group, [class*="question"]');
      if (formGroup) {
        const label = formGroup.querySelector('label, .question-text, .field-label');
        if (label && !label.contains(firstRadio)) {
          question = label.textContent.trim();
        }
      }
    }
    if (!question) {
      const parent = firstRadio.closest('div, section');
      if (parent) {
        const clone = parent.cloneNode(true);
        const inputs = clone.querySelectorAll('input, button');
        inputs.forEach(input => input.remove());
        question = clone.textContent.trim();
      }
    }
    if (!question) {
      question = firstRadio.getAttribute('aria-label') || firstRadio.getAttribute('data-question') || '';
    }
    return question.replace(/[*\s]+$/, '');
  }

  getRadioAnswer(question) {
    const questionLower = question.toLowerCase();
    const yesKeywords = ['comfortable', 'available', 'authorized', 'eligible', 'relocate', 'start', 'onsite'];
    const noKeywords = ['sponsorship', 'not required'];
    if (yesKeywords.some(keyword => questionLower.includes(keyword))) {
      return 'Yes';
    }
    if (noKeywords.some(keyword => questionLower.includes(keyword))) {
      return 'No';
    }
    return 'Yes';
  }

  findMatchingRadio(radios, targetAnswer) {
    const targetLower = targetAnswer.toLowerCase();
    for (const radio of radios) {
      const radioText = this.getRadioLabel(radio).toLowerCase();
      if (radioText.includes(targetLower)) {
        return radio;
      }
    }
    return radios[0];
  }

  getRadioLabel(radio) {
    if (radio.id) {
      const label = document.querySelector(`label[for="${radio.id}"]`);
      if (label) return label.textContent.trim();
    }
    const parentLabel = radio.closest('label');
    if (parentLabel) {
      return parentLabel.textContent.replace(radio.value || '', '').trim();
    }
    if (radio.nextSibling) {
      return radio.nextSibling.textContent?.trim() || '';
    }
    if (radio.parentElement) {
      return radio.parentElement.textContent.replace(radio.value || '', '').trim();
    }
    return radio.value || '';
  }

  async selectRadio(radio) {
    if (!radio.checked) {
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
      radio.dispatchEvent(new Event('click', { bubbles: true }));
      await this.randomDelay(300, 600);
    }
  }

  async handleNumberInputs() {
    console.log('Processing number inputs...');
    const numberInputs = document.querySelectorAll('input[type="number"], input[inputmode="numeric"], input[type="text"][name*="year"], input[type="text"][name*="experience"], input[type="text"][placeholder*="year"], input[type="text"][placeholder*="experience"]');
    for (const input of numberInputs) {
      if (!this.shouldFillField(input)) continue;
      const question = this.getFieldQuestion(input);
      const answer = this.getNumericAnswer(question, input);
      if (answer) {
        await this.setFieldValue(input, answer);
        console.log(`Filled number field: "${question}" with: ${answer}`);
      }
    }
  }

  getNumericAnswer(question, input) {
    const questionLower = question.toLowerCase();
    const placeholder = (input.placeholder || '').toLowerCase();
    const name = (input.name || '').toLowerCase();
    const combined = `${questionLower} ${placeholder} ${name}`;
    if (combined.includes('challenging tasks') || combined.includes('how many')) {
      return '5';
    }
    for (const [keyword, answer] of Object.entries(this.customAnswers)) {
      if (combined.includes(keyword.toLowerCase()) && !isNaN(answer)) {
        return answer;
      }
    }
    if (combined.includes('salary') || combined.includes('compensation')) {
      if (combined.includes('current')) return this.customAnswers['current salary'] || '75000';
      return this.customAnswers['salary expectation'] || '85000';
    }
    if (combined.includes('years') || combined.includes('experience')) {
      return this.userProfile.experience || '4';
    }
    if (input.hasAttribute('required')) {
      return '3';
    }
    return null;
  }

  async handleDropdowns() {
    console.log('Processing dropdowns...');
    const selects = document.querySelectorAll('select:not([disabled])');
    for (const select of selects) {
      if (!this.shouldFillField(select)) continue;
      const question = this.getFieldQuestion(select);
      const answer = this.findBestDropdownAnswer(question, select);
      if (answer) {
        await this.setDropdownValue(select, answer);
        console.log(`Selected dropdown option: ${answer}`);
      }
    }
  }

  findBestDropdownAnswer(question, select) {
    const questionLower = question.toLowerCase();
    const options = Array.from(select.options).map(opt => opt.textContent.toLowerCase());
    for (const [keyword, answer] of Object.entries(this.customAnswers)) {
      if (questionLower.includes(keyword.toLowerCase())) {
        const targetOption = options.find(opt => opt.includes(answer.toLowerCase()));
        if (targetOption) {
          return targetOption;
        }
      }
    }
    if (questionLower.includes('country') || questionLower.includes('location')) {
      const preferredCountries = ['egypt', 'united states', 'canada', 'remote'];
      for (const country of preferredCountries) {
        if (options.some(opt => opt.includes(country))) return country;
      }
    }
    if (questionLower.includes('education') || questionLower.includes('degree')) {
      const preferredEducation = ['bachelor', 'university', 'graduate'];
      for (const edu of preferredEducation) {
        if (options.some(opt => opt.includes(edu))) return edu;
      }
    }
    return select.options.length > 1 ? select.options[1].textContent : null;
  }

  async setDropdownValue(select, targetValue) {
    const targetLower = targetValue.toLowerCase();
    for (let i = 0; i < select.options.length; i++) {
      const optionText = select.options[i].textContent.toLowerCase();
      if (optionText.includes(targetLower)) {
        select.selectedIndex = i;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        await this.randomDelay(300, 600);
        return;
      }
    }
    if (select.options.length > 1) {
      select.selectedIndex = 1;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  async handleTextInputs() {
    console.log('Processing text inputs...');
    const textInputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input:not([type])');
    for (const input of textInputs) {
      if (!this.shouldFillField(input)) continue;
      const fieldInfo = this.analyzeField(input);
      const answer = this.findBestAnswer(fieldInfo);
      if (answer) {
        await this.setFieldValue(input, answer);
        console.log(`Filled text input: ${fieldInfo.identifier} = ${answer}`);
      }
    }
  }

  analyzeField(field) {
    const label = this.getFieldQuestion(field);
    const placeholder = field.placeholder || '';
    const name = field.name || field.id || '';
    const type = field.type || 'text';
    return {
      element: field,
      label: label,
      placeholder: placeholder,
      name: name,
      type: type,
      identifier: `${label} ${placeholder} ${name}`.toLowerCase(),
      isRequired: field.hasAttribute('required') || field.getAttribute('aria-required') === 'true'
    };
  }

  getFieldQuestion(field) {
    let question = '';
    if (field.id) {
      const label = document.querySelector(`label[for="${field.id}"]`);
      if (label) question = label.textContent.trim();
    }
    if (!question) {
      const parentLabel = field.closest('label');
      if (parentLabel) question = parentLabel.textContent.replace(field.value || '', '').trim();
    }
    if (!question) {
      const container = field.closest('.form-group, .question-group, .question, [class*="question"]');
      if (container) {
        const label = container.querySelector('label, .label, .question-text');
        if (label && !label.contains(field)) question = label.textContent.trim();
      }
    }
    if (!question && field.previousElementSibling) {
      const prevText = field.previousElementSibling.textContent?.trim();
      if (prevText && prevText.length < 200) question = prevText;
    }
    if (!question) {
      question = field.getAttribute('aria-label') || field.placeholder || '';
    }
    return question.replace(/[*:]+\s*$/, '').trim();
  }

  findBestAnswer(fieldInfo) {
    const identifier = fieldInfo.identifier;
    for (const [keyword, answer] of Object.entries(this.customAnswers)) {
      if (identifier.includes(keyword.toLowerCase())) return answer;
    }
    if (fieldInfo.type === 'email' || identifier.includes('email')) return this.userProfile.email;
    if (fieldInfo.type === 'tel' || identifier.includes('phone')) return this.userProfile.phone;
    if (identifier.includes('name')) return this.userProfile.name;
    if (identifier.includes('website') || identifier.includes('linkedin')) return this.userProfile.linkedinProfile;
    if (fieldInfo.isRequired) return 'Available immediately';
    return null;
  }

  shouldFillField(field) {
    if (field.value && field.value.trim() && field.value !== field.placeholder) return false;
    if (!this.isElementVisible(field) || field.disabled) return false;
    if (field.type === 'hidden') return false;
    return true;
  }

  isElementVisible(element) {
    return element.offsetParent !== null && !element.hidden && window.getComputedStyle(element).display !== 'none' && window.getComputedStyle(element).visibility !== 'hidden';
  }

  async setFieldValue(field, value) {
    field.focus();
    await this.randomDelay(200, 400);
    field.value = '';
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    await this.randomDelay(100, 200);
    field.dispatchEvent(new Event('change', { bubbles: true }));
    await this.randomDelay(100, 200);
    field.dispatchEvent(new Event('blur', { bubbles: true }));
    await this.randomDelay(200, 400);
  }

  async handleTextareas() {
    console.log('Processing textareas...');
    const textareas = document.querySelectorAll('textarea:not([disabled])');
    for (const textarea of textareas) {
      if (!this.shouldFillField(textarea)) continue;
      const question = this.getFieldQuestion(textarea);
      let answer = 'I am excited about this opportunity and believe my technical skills and experience make me a strong candidate for this position. I look forward to contributing to your team.';
      if (question.toLowerCase().includes('why') || question.toLowerCase().includes('interest')) {
        answer = 'I am interested in this position because it aligns with my technical skills and career goals. I am available to start immediately.';
      }
      await this.setFieldValue(textarea, answer);
      console.log('Filled textarea');
    }
  }

  async handleCheckboxes() {
    console.log('Processing checkboxes...');
    const checkboxes = document.querySelectorAll('input[type="checkbox"]:not([disabled])');
    for (const checkbox of checkboxes) {
      if (!this.isElementVisible(checkbox)) continue;
      const question = this.getFieldQuestion(checkbox).toLowerCase();
      if (question.includes('terms') || question.includes('privacy') || question.includes('agree') || question.includes('consent')) {
        if (!checkbox.checked) {
          checkbox.checked = true;
          checkbox.dispatchEvent(new Event('change', { bubbles: true }));
          console.log('Checked agreement checkbox');
        }
      }
    }
  }

  randomDelay(min, max) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}
// -----------------------------
//  LinkedIn Application Handler
// -----------------------------
class EnhancedLinkedInApplicationHandler {
  constructor(mainJobHunter) {
    this.mainJobHunter = mainJobHunter;
    this.formFiller = new PerfectFormFiller(mainJobHunter.userProfile, mainJobHunter.customAnswers);
  }
  
  // ++ THIS ENTIRE METHOD IS REWRITTEN FOR MORE RELIABILITY ++
  async processApplicationSteps() {
    let stepCount = 0;
    const maxSteps = 10;
    while (stepCount < maxSteps) {
        await this.randomDelay(1500, 2500); // Wait for content to load on each step
        console.log(`Processing application step ${stepCount + 1}...`);
        
        if (this.isApplicationComplete()) {
            break; 
        }

        await this.fillCurrentForm();
        
        if (this.checkForValidationErrors()) {
            console.log('Validation errors found, attempting to fix...');
            await this.fixValidationErrors();
        }

        const nextButton = this.findNextButton();
        if (nextButton) {
            console.log('Clicking next/submit button...');
            await this.clickElementSafely(nextButton);
        } else {
            console.log('No more "Next" or "Submit" buttons found. Checking for completion...');
            break;
        }
        stepCount++;
    }

    let attempts = 0;
    const maxAttempts = 10; // Try for 10 seconds
    while (attempts < maxAttempts) {
        if (this.isApplicationComplete()) {
            console.log('✅ Application complete. Looking for "Done" or "Close" button...');
            await this.randomDelay(1000, 1500);
            
            const doneButton = this.findDoneOrCloseButton();
            if (doneButton) {
                console.log('🖱️ Clicking "Done" or "Close" button.');
                await this.clickElementSafely(doneButton);
                await this.randomDelay(1500, 2500);
                return true;
            }
        }
        await this.delay(1000);
        attempts++;
    }

    console.log('⚠️ Timed out waiting for "Done" button, but application was likely sent.');
    return !this.isModalOpen();
  }

  async fillCurrentForm() {
    try {
      console.log('Filling current form step...');
      await this.formFiller.fillLinkedInForm();
      await this.handleLinkedInSpecificFields();
    } catch (error) {
      console.error('Error filling form:', error);
    }
  }

  async handleLinkedInSpecificFields() {
    await this.handleResumeUpload();
    await this.handleCoverLetter();
    await this.handleAdditionalQuestions();
  }

  async handleResumeUpload() {
    const resumeButtons = document.querySelectorAll('button[aria-label*="resume"], button[aria-label*="Upload"], .file-upload-button');
    for (const button of resumeButtons) {
      const text = button.textContent.toLowerCase();
      if (text.includes('skip') || text.includes('use existing') || text.includes('continue without')) {
        console.log('Skipping resume upload');
        await this.clickElementSafely(button);
        await this.randomDelay(1000, 2000);
        break;
      }
    }
  }

  async handleCoverLetter() {
    const coverLetterTextarea = document.querySelector('textarea[name*="cover"], textarea[placeholder*="cover"], textarea[aria-label*="cover"]');
    if (coverLetterTextarea && !coverLetterTextarea.value) {
      const coverLetter = 'I am excited about this opportunity and believe my technical skills and experience make me a strong candidate for this position. I look forward to contributing to your team and am available to start immediately.';
      await this.formFiller.setFieldValue(coverLetterTextarea, coverLetter);
      console.log('Added cover letter');
    }
  }

  async handleAdditionalQuestions() {
    const requiredFields = document.querySelectorAll('input[required], select[required], textarea[required]');
    for (const field of requiredFields) {
      if (this.formFiller.shouldFillField(field)) {
        const fieldInfo = this.formFiller.analyzeField(field);
        if (field.tagName === 'SELECT') {
          const answer = this.formFiller.findBestDropdownAnswer(fieldInfo, field);
          if (answer) {
            await this.formFiller.setDropdownValue(field, answer);
          }
        } else {
          const answer = this.formFiller.findBestAnswer(fieldInfo);
          if (answer) {
            await this.formFiller.setFieldValue(field, answer);
          }
        }
      }
    }
  }

  checkForValidationErrors() {
    const errorSelectors = [
      '.artdeco-inline-feedback--error',
      '[aria-invalid="true"]'
    ];
    for (const selector of errorSelectors) {
      if (document.querySelector(selector)) {
        console.log(`Validation error found with selector: ${selector}`);
        return true;
      }
    }
    return false;
  }

  async fixValidationErrors() {
    console.log('Attempting to fix validation errors...');
    const errorFields = document.querySelectorAll('[aria-invalid="true"]');
    for (const field of errorFields) {
      if (this.formFiller.shouldFillField(field)) {
        console.log('Fixing field with error:', field.name || field.id);
        if (field.tagName === 'SELECT') {
            if (field.options.length > 1) field.selectedIndex = 1;
        } else if (field.type === 'number') {
            await this.formFiller.setFieldValue(field, '3');
        } else {
            await this.formFiller.setFieldValue(field, 'N/A');
        }
        field.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }

  findNextButton() {
    const selectors = [
      'button[aria-label*="Continue"]',
      'button[aria-label*="Next"]',
      'button[aria-label*="Submit"]',
      'button[aria-label*="Review"]',
      '.artdeco-button--primary:not([disabled])'
    ];
    for (const selector of selectors) {
        const buttons = document.querySelectorAll(selector);
        for(const button of buttons) {
            const text = button.textContent.toLowerCase().trim();
            if(['continue', 'next', 'review application', 'submit application'].includes(text) && this.isElementVisible(button)) {
                return button;
            }
        }
    }
    return null;
  }
  
  // ++ UPDATED THIS METHOD TO BE MORE SPECIFIC ++
  findDoneOrCloseButton() {
    const selectors = [
        'button[aria-label="Dismiss"]', // The 'X' button in the corner
        '.artdeco-modal__actionbar .artdeco-button--primary', // The "Done" button in the footer
        'button.jobs-apply-completion__ad-modal-dismiss-button'
    ];
    for (const selector of selectors) {
        const button = document.querySelector(selector);
        if (button && this.isElementVisible(button)) {
            return button;
        }
    }
    return null;
  }
  
  // ++ UPDATED THIS METHOD TO BE MORE RELIABLE ++
  isApplicationComplete() {
    const successHeader = document.querySelector('h2.t-24, p.t-24, #post-apply-modal-header__text');
    if (successHeader && (successHeader.textContent.includes('Application sent') || successHeader.textContent.includes('Submitted'))) {
        return true;
    }
    const successModal = document.querySelector('.jobs-easy-apply-confirmation');
    if (successModal) {
        return true;
    }
    return false;
  }
  
  isElementVisible(element) {
    if (!element) return false;
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && element.offsetParent !== null;
  }

  async clickElementSafely(element) {
    try {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await this.randomDelay(500, 1000);
      element.click();
      return true;
    } catch (error) {
      console.log('Click error:', error.message);
      return false;
    }
  }

  randomDelay(min, max) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}
// -----------------------------
//  Initialize Everything
// -----------------------------
function initializeJobHunterRealApply() {
  try {
    console.log('🚀 Initializing JobHunter Real Application System...');
    const hostname = window.location.hostname;
    const isJobSite = ['linkedin.com'].some(site => hostname.includes(site));
    if (isJobSite) {
        if (!window.jobHunterRealApply) {
            window.jobHunterRealApply = new JobHunterRealApply();
            console.log('✅ JobHunter Real Application System initialized successfully');
            console.log('📌 Click the green button or press Ctrl+Shift+B to start auto-browsing jobs');
        }
    } else {
      console.log('ℹ️ Not a supported job site, JobHunter will not initialize');
    }
  } catch (error) {
    console.error('❌ Failed to initialize JobHunter Real Application System:', error);
  }
}

if (typeof window.jobHunterInitialized === 'undefined') {
    window.jobHunterInitialized = true;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeJobHunterRealApply);
    } else {
        initializeJobHunterRealApply();
    }
}