class JobBoard {
    constructor() {
        this.jobs = [];
        this.filteredJobs = [];
        this.db = null;
        this.initDB();
        this.initEventListeners();
        this.loadJobs();
    }

    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('MalcolmJobBoard', 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('jobs')) {
                    const store = db.createObjectStore('jobs', { keyPath: 'id' });
                    store.createIndex('company', 'company', { unique: false });
                    store.createIndex('location', 'location', { unique: false });
                    store.createIndex('posted', 'posted', { unique: false });
                }
                if (!db.objectStoreNames.contains('metadata')) {
                    db.createObjectStore('metadata', { keyPath: 'key' });
                }
            };
        });
    }

    initEventListeners() {
        document.getElementById('locationFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('employerFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('roleFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('searchInput').addEventListener('input', () => this.applyFilters());
        document.getElementById('clearFilters').addEventListener('click', () => this.clearAllFilters());
    }

    async loadJobs() {
        try {
            // Try to load from GitHub repository first
            const response = await fetch('./data/jobs.json');
            if (response.ok) {
                const data = await response.json();
                this.jobs = data.jobs || [];
                this.updateLastUpdated(data.lastUpdated);
                await this.cacheJobs();
            } else {
                // Fallback to cached data
                await this.loadCachedJobs();
            }
        } catch (error) {
            console.error('Error loading jobs:', error);
            await this.loadCachedJobs();
        }
        
        this.applyFilters();
        document.getElementById('loading').style.display = 'none';
    }

    async cacheJobs() {
        if (!this.db) return;
        
        const transaction = this.db.transaction(['jobs', 'metadata'], 'readwrite');
        const jobStore = transaction.objectStore('jobs');
        const metaStore = transaction.objectStore('metadata');
        
        // Clear existing jobs
        await jobStore.clear();
        
        // Cache new jobs
        for (const job of this.jobs) {
            await jobStore.add(job);
        }
        
        // Update cache timestamp
        await metaStore.put({ key: 'lastCached', value: Date.now() });
    }

    async loadCachedJobs() {
        if (!this.db) return;
        
        const transaction = this.db.transaction('jobs', 'readonly');
        const store = transaction.objectStore('jobs');
        const request = store.getAll();
        
        return new Promise((resolve) => {
            request.onsuccess = () => {
                this.jobs = request.result || [];
                document.getElementById('lastUpdated').textContent = 'Last updated: Using cached data';
                resolve();
            };
        });
    }

    updateLastUpdated(timestamp) {
        const date = new Date(timestamp);
        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'America/Los_Angeles'
        };
        document.getElementById('lastUpdated').textContent = 
            `Last updated: ${date.toLocaleDateString('en-US', options)} PST`;
    }

    applyFilters() {
        const locationFilter = document.getElementById('locationFilter').value;
        const employerFilter = document.getElementById('employerFilter').value;
        const roleFilter = document.getElementById('roleFilter').value;
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();

        this.filteredJobs = this.jobs.filter(job => {
            // Location filter
            if (locationFilter !== 'all') {
                if (locationFilter === 'remote' && !this.isRemote(job)) return false;
                if (locationFilter === 'los-angeles' && !this.isLosAngeles(job)) return false;
                if (locationFilter === 'hybrid' && !this.isHybrid(job)) return false;
            }

            // Employer filter
            if (employerFilter !== 'all') {
                if (!this.matchesEmployerType(job, employerFilter)) return false;
            }

            // Role filter
            if (roleFilter !== 'all') {
                if (!this.matchesRoleType(job, roleFilter)) return false;
            }

            // Search filter
            if (searchTerm) {
                const searchableText = [
                    job.title,
                    job.company,
                    job.description,
                    job.location
                ].join(' ').toLowerCase();
                
                if (!searchableText.includes(searchTerm)) return false;
            }

            return true;
        });

        this.renderJobs();
        this.updateStats();
    }

    isRemote(job) {
        const remoteKeywords = ['remote', 'telecommute', 'work from home', 'virtual', 'anywhere'];
        const location = job.location.toLowerCase();
        return remoteKeywords.some(keyword => location.includes(keyword));
    }

    isLosAngeles(job) {
        const laKeywords = ['los angeles', 'la,', 'hollywood', 'beverly hills', 'santa monica', 
                           'west hollywood', 'culver city', 'burbank', 'pasadena', 'glendale'];
        const location = job.location.toLowerCase();
        return laKeywords.some(keyword => location.includes(keyword));
    }

    isHybrid(job) {
        const hybridKeywords = ['hybrid', 'flexible', 'mixed', 'part remote'];
        const location = job.location.toLowerCase();
        return hybridKeywords.some(keyword => location.includes(keyword));
    }

    matchesEmployerType(job, type) {
        const company = job.company.toLowerCase();
        const description = job.description.toLowerCase();
        const title = job.title.toLowerCase();
        
        const employerPatterns = {
            'nonprofit': [
                'nonprofit', 'non-profit', 'foundation', 'charity', 'ngo', 'charitable',
                'community', 'social impact', 'humanitarian'
            ],
            'education': [
                'university', 'college', 'school', 'education', 'academic', 'campus',
                'student', 'faculty', 'research', 'institute'
            ],
            'museum': [
                'museum', 'gallery', 'cultural', 'arts', 'heritage', 'exhibition',
                'curator', 'collections'
            ],
            'library': [
                'library', 'librarian', 'information', 'archives', 'bibliographic'
            ],
            'government': [
                'government', 'federal', 'state', 'city', 'county', 'public sector',
                'agency', 'department', 'municipal'
            ]
        };

        const patterns = employerPatterns[type] || [];
        const searchText = [company, description, title].join(' ');
        
        return patterns.some(pattern => searchText.includes(pattern));
    }

    matchesRoleType(job, type) {
        const title = job.title.toLowerCase();
        const description = job.description.toLowerCase();
        
        const rolePatterns = {
            'project-management': [
                'project manager', 'program manager', 'project coordinator', 'project lead',
                'project director', 'program coordinator', 'project specialist'
            ],
            'administrative': [
                'administrative', 'administrator', 'admin', 'coordinator', 'assistant',
                'specialist', 'support', 'operations'
            ],
            'policy': [
                'policy', 'analyst', 'research', 'writer', 'proofreading', 'editor',
                'content', 'communications', 'writing'
            ],
            'planning': [
                'planning', 'strategy', 'strategic', 'planner', 'development',
                'analyst', 'consultant'
            ]
        };

        const patterns = rolePatterns[type] || [];
        const searchText = [title, description].join(' ');
        
        return patterns.some(pattern => searchText.includes(pattern));
    }

    isPreferredEmployer(job) {
        const employerTypes = ['nonprofit', 'education', 'museum', 'library', 'government'];
        return employerTypes.some(type => this.matchesEmployerType(job, type));
    }

    renderJobs() {
        const container = document.getElementById('jobsContainer');
        const noResults = document.getElementById('noResults');
        
        if (this.filteredJobs.length === 0) {
            container.style.display = 'none';
            noResults.style.display = 'block';
            return;
        }
        
        container.style.display = 'grid';
        noResults.style.display = 'none';
        
        container.innerHTML = this.filteredJobs.map(job => this.renderJobCard(job)).join('');
    }

    renderJobCard(job) {
        const isPreferred = this.isPreferredEmployer(job);
        const roleMatches = this.getMatchingRoleTags(job);
        
        return `
            <div class="job-card ${isPreferred ? 'preferred' : ''}">
                <div class="job-header">
                    <h3 class="job-title">
                        <a href="${job.url}" target="_blank" rel="noopener">${job.title}</a>
                    </h3>
                    ${isPreferred ? '<span class="preferred-badge">Preferred Employer</span>' : ''}
                </div>
                <div class="job-company">${job.company}</div>
                <div class="job-meta">
                    <span>📍 ${job.location}</span>
                    <span>📅 ${this.formatDate(job.posted)}</span>
                    <span>💼 ${job.source}</span>
                </div>
                <div class="job-description">${this.truncateDescription(job.description)}</div>
                <div class="job-tags">
                    ${roleMatches.map(tag => 
                        `<span class="job-tag role-match">${tag}</span>`
                    ).join('')}
                    ${this.generateEmployerTags(job).map(tag => 
                        `<span class="job-tag">${tag}</span>`
                    ).join('')}
                </div>
            </div>
        `;
    }

    getMatchingRoleTags(job) {
        const matches = [];
        const title = job.title.toLowerCase();
        const description = job.description.toLowerCase();
        
        if (this.matchesRoleType(job, 'project-management')) matches.push('Project Management');
        if (this.matchesRoleType(job, 'administrative')) matches.push('Administrative');
        if (this.matchesRoleType(job, 'policy')) matches.push('Policy & Writing');
        if (this.matchesRoleType(job, 'planning')) matches.push('Planning & Strategy');
        
        return matches;
    }

    generateEmployerTags(job) {
        const tags = [];
        
        if (this.matchesEmployerType(job, 'nonprofit')) tags.push('Nonprofit');
        if (this.matchesEmployerType(job, 'education')) tags.push('Education');
        if (this.matchesEmployerType(job, 'museum')) tags.push('Cultural');
        if (this.matchesEmployerType(job, 'library')) tags.push('Library');
        if (this.matchesEmployerType(job, 'government')) tags.push('Government');
        if (this.isRemote(job)) tags.push('Remote');
        
        return tags.slice(0, 3); // Limit to 3 tags
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) return 'Today';
        if (diffDays === 2) return 'Yesterday';
        if (diffDays <= 7) return `${diffDays - 1} days ago`;
        
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
        });
    }

    truncateDescription(description, maxLength = 200) {
        if (description.length <= maxLength) return description;
        return description.substring(0, maxLength).trim() + '...';
    }

    updateStats() {
        const total = this.filteredJobs.length;
        const remote = this.filteredJobs.filter(job => this.isRemote(job)).length;
        const preferred = this.filteredJobs.filter(job => this.isPreferredEmployer(job)).length;
        
        document.getElementById('totalJobs').textContent = total;
        document.getElementById('remoteJobs').textContent = remote;
        document.getElementById('preferredJobs').textContent = preferred;
    }

    clearAllFilters() {
        document.getElementById('locationFilter').value = 'all';
        document.getElementById('employerFilter').value = 'all';
        document.getElementById('roleFilter').value = 'all';
        document.getElementById('searchInput').value = '';
        this.applyFilters();
    }
}

// Initialize the job board when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new JobBoard();
});
