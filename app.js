class JobBoard {
constructor() {
this.jobs = [];
this.filteredJobs = [];
this.db = null;
this.initDB();
this.initEventListeners();
this.loadJobs();
}

```
async initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('MalcolmJobBoard', 2);
        
        request.onerror = () => {
            console.error('IndexedDB error:', request.error);
            resolve(); // Continue without DB
        };
        
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
    document.getElementById('refreshButton')?.addEventListener('click', () => this.forceRefresh());
}

async loadJobs() {
    try {
        // Try to load fresh data from GitHub
        const response = await fetch('./data/jobs.json?t=' + Date.now());
        
        if (response.ok) {
            const data = await response.json();
            this.jobs = data.jobs || [];
            
            // Show metadata
            if (data.metadata) {
                console.log('Job board focus:', data.metadata);
            }
            
            this.updateLastUpdated(data.lastUpdated);
            
            // Cache the fresh data
            if (this.jobs.length > 0) {
                await this.cacheJobs();
            }
            
            document.getElementById('dataSource').textContent = 'Live Data';
            
        } else {
            console.log('No live data available, checking cache...');
            await this.loadCachedJobs();
        }
        
    } catch (error) {
        console.error('Error loading jobs:', error);
        await this.loadCachedJobs();
    }
    
    // If still no jobs, show sample data
    if (this.jobs.length === 0) {
        this.loadSampleJobs();
    }
    
    this.applyFilters();
    document.getElementById('loading').style.display = 'none';
}

async cacheJobs() {
    if (!this.db) return;
    
    try {
        const transaction = this.db.transaction(['jobs', 'metadata'], 'readwrite');
        const jobStore = transaction.objectStore('jobs');
        const metaStore = transaction.objectStore('metadata');
        
        // Clear old cache
        await new Promise((resolve) => {
            const clearReq = jobStore.clear();
            clearReq.onsuccess = resolve;
        });
        
        // Add new jobs
        for (const job of this.jobs) {
            jobStore.add(job);
        }
        
        // Update metadata
        metaStore.put({ 
            key: 'lastCached', 
            value: Date.now(),
            jobCount: this.jobs.length 
        });
        
        console.log(`Cached ${this.jobs.length} jobs`);
        
    } catch (error) {
        console.error('Cache error:', error);
    }
}

async loadCachedJobs() {
    if (!this.db) {
        console.log('No database available');
        return;
    }
    
    try {
        const transaction = this.db.transaction('jobs', 'readonly');
        const store = transaction.objectStore('jobs');
        const request = store.getAll();
        
        await new Promise((resolve) => {
            request.onsuccess = () => {
                this.jobs = request.result || [];
                if (this.jobs.length > 0) {
                    document.getElementById('dataSource').textContent = 'Cached Data';
                    console.log(`Loaded ${this.jobs.length} jobs from cache`);
                }
                resolve();
            };
            request.onerror = resolve;
        });
        
    } catch (error) {
        console.error('Error loading cache:', error);
    }
}

loadSampleJobs() {
    console.log('Loading sample jobs for demonstration...');
    document.getElementById('dataSource').textContent = 'Sample Data';
    
    this.jobs = [
        {
            id: 'sample-1',
            title: 'Project Manager - Digital Government',
            company: 'City of Los Angeles ITA',
            location: 'Los Angeles, CA (Hybrid)',
            description: 'Lead digital transformation initiatives for city services. Work with cross-functional teams to modernize government technology. Perfect for someone with policy and tech background.',
            url: 'https://www.governmentjobs.com/careers/lacity',
            posted: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            source: 'City of LA',
            salary: '$85,000 - $105,000',
            relevanceScore: 45
        },
        {
            id: 'sample-2',
            title: 'Policy Analyst - Technology & Innovation',
            company: 'RAND Corporation',
            location: 'Santa Monica, CA',
            description: 'Research and analyze technology policy issues. Combine quantitative analysis with policy expertise to inform decision-makers.',
            url: 'https://www.rand.org/jobs',
            posted: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            source: 'RAND',
            salary: '$75,000 - $95,000',
            relevanceScore: 40
        },
        {
            id: 'sample-3',
            title: 'Program Coordinator - Civic Tech',
            company: 'Hack for LA',
            location: 'Remote (Los Angeles based)',
            description: 'Coordinate volunteer civic technology projects. Bridge technical teams with community partners and government stakeholders.',
            url: 'https://www.hackforla.org',
            posted: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
            source: 'Hack for LA',
            salary: '$60,000 - $75,000',
            relevanceScore: 35
        }
    ];
}

updateLastUpdated(timestamp) {
    if (!timestamp) {
        document.getElementById('lastUpdated').textContent = 'Last updated: Unknown';
        return;
    }
    
    const date = new Date(timestamp);
    const now = new Date();
    const hoursDiff = Math.floor((now - date) / (1000 * 60 * 60));
    
    let timeAgo = '';
    if (hoursDiff < 1) {
        timeAgo = 'just now';
    } else if (hoursDiff === 1) {
        timeAgo = '1 hour ago';
    } else if (hoursDiff < 24) {
        timeAgo = `${hoursDiff} hours ago`;
    } else {
        const daysDiff = Math.floor(hoursDiff / 24);
        timeAgo = daysDiff === 1 ? '1 day ago' : `${daysDiff} days ago`;
    }
    
    const options = {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/New_York'
    };
    
    document.getElementById('lastUpdated').textContent = 
        `Last updated: ${timeAgo} (${date.toLocaleDateString('en-US', options)} EST)`;
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
    const remoteKeywords = ['remote', 'telecommute', 'work from home', 'virtual', 'anywhere', 'distributed'];
    const location = job.location.toLowerCase();
    return remoteKeywords.some(keyword => location.includes(keyword));
}

isLosAngeles(job) {
    const laKeywords = [
        'los angeles', 'la,', 'hollywood', 'beverly hills', 'santa monica', 
        'west hollywood', 'culver city', 'burbank', 'pasadena', 'glendale',
        'torrance', 'long beach', 'downtown la', 'playa vista', 'westwood'
    ];
    const location = job.location.toLowerCase();
    return laKeywords.some(keyword => location.includes(keyword));
}

isHybrid(job) {
    const hybridKeywords = ['hybrid', 'flexible', 'mixed', 'part remote', 'flex'];
    const text = (job.location + ' ' + job.description).toLowerCase();
    return hybridKeywords.some(keyword => text.includes(keyword));
}

matchesEmployerType(job, type) {
    const company = job.company.toLowerCase();
    const description = job.description.toLowerCase();
    const title = job.title.toLowerCase();
    
    const employerPatterns = {
        'nonprofit': [
            'nonprofit', 'non-profit', 'foundation', 'charity', 'ngo', '501c3',
            'community', 'social impact', 'humanitarian', 'advocacy', 'charitable'
        ],
        'education': [
            'university', 'college', 'school', 'education', 'academic', 'campus',
            'ucla', 'usc', 'caltech', 'student', 'faculty', 'research', 'institute'
        ],
        'government': [
            'government', 'federal', 'state', 'city', 'county', 'public sector',
            'agency', 'department', 'municipal', 'civic', 'civil service'
        ],
        'cultural': [
            'museum', 'gallery', 'cultural', 'arts', 'heritage', 'exhibition',
            'library', 'archive', 'curator', 'collections', 'theater', 'symphony'
        ],
        'think-tank': [
            'rand', 'brookings', 'policy', 'research', 'institute', 'think tank',
            'analysis', 'studies', 'center for'
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
            'project director', 'program coordinator', 'implementation manager',
            'delivery manager', 'scrum master', 'agile'
        ],
        'policy': [
            'policy analyst', 'policy advisor', 'policy writer', 'policy researcher',
            'legislative analyst', 'regulatory analyst', 'government relations',
            'public policy', 'policy coordinator'
        ],
        'tech-policy': [
            'technology policy', 'digital policy', 'tech policy', 'data governance',
            'digital transformation', 'civic tech', 'govtech', 'innovation'
        ],
        'administrative': [
            'administrative', 'administrator', 'coordinator', 'operations',
            'program assistant', 'executive assistant', 'office manager'
        ],
        'planning': [
            'planning', 'strategy', 'strategic', 'planner', 'business analyst',
            'analyst', 'consultant', 'research analyst'
        ]
    };

    const patterns = rolePatterns[type] || [];
    const searchText = [title, description].join(' ');
    
    return patterns.some(pattern => searchText.includes(pattern));
}

isPerfectMatch(job) {
    // Jobs that combine policy + tech are perfect for the user
    const text = (job.title + ' ' + job.description + ' ' + job.company).toLowerCase();
    
    const hasPolicyBackground = ['policy', 'government', 'civic', 'public', 'political'].some(
        term => text.includes(term)
    );
    
    const hasTechElement = ['digital', 'technology', 'data', 'software', 'technical', 'system'].some(
        term => text.includes(term)
    );
    
    return hasPolicyBackground && hasTechElement;
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
    
    // Sort by relevance score if available
    const sortedJobs = [...this.filteredJobs].sort((a, b) => {
        const scoreA = a.relevanceScore || 0;
        const scoreB = b.relevanceScore || 0;
        return scoreB - scoreA;
    });
    
    container.innerHTML = sortedJobs.map(job => this.renderJobCard(job)).join('');
}

renderJobCard(job) {
    const isPerfect = this.isPerfectMatch(job);
    const isPreferred = this.isPreferredEmployer(job);
    const roleMatches = this.getMatchingRoleTags(job);
    
    let cardClass = 'job-card';
    if (isPerfect) cardClass += ' perfect-match';
    else if (isPreferred) cardClass += ' preferred';
    
    return `
        <div class="${cardClass}">
            <div class="job-header">
                <h3 class="job-title">
                    <a href="${job.url}" target="_blank" rel="noopener">${this.escapeHtml(job.title)}</a>
                </h3>
                ${isPerfect ? '<span class="perfect-badge">🎯 Perfect Match</span>' : 
                  isPreferred ? '<span class="preferred-badge">⭐ Preferred</span>' : ''}
            </div>
            <div class="job-company">${this.escapeHtml(job.company)}</div>
            <div class="job-meta">
                <span>📍 ${this.escapeHtml(job.location)}</span>
                <span>📅 ${this.formatDate(job.posted)}</span>
                ${job.salary ? `<span>💰 ${this.escapeHtml(job.salary)}</span>` : ''}
            </div>
            <div class="job-description">${this.truncateDescription(job.description)}</div>
            <div class="job-footer">
                <div class="job-tags">
                    ${roleMatches.map(tag => 
                        `<span class="job-tag role-match">${tag}</span>`
                    ).join('')}
                    ${this.generateEmployerTags(job).map(tag => 
                        `<span class="job-tag">${tag}</span>`
                    ).join('')}
                </div>
                <div class="job-source">via ${job.source}</div>
            </div>
        </div>
    `;
}

escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

isPreferredEmployer(job) {
    const employerTypes = ['nonprofit', 'education', 'government', 'cultural', 'think-tank'];
    return employerTypes.some(type => this.matchesEmployerType(job, type));
}

getMatchingRoleTags(job) {
    const matches = [];
    
    if (this.matchesRoleType(job, 'project-management')) matches.push('Project Management');
    if (this.matchesRoleType(job, 'policy')) matches.push('Policy');
    if (this.matchesRoleType(job, 'tech-policy')) matches.push('Tech + Policy');
    if (this.matchesRoleType(job, 'administrative')) matches.push('Administrative');
    if (this.matchesRoleType(job, 'planning')) matches.push('Strategy');
    
    return matches.slice(0, 3);
}

generateEmployerTags(job) {
    const tags = [];
    
    if (this.matchesEmployerType(job, 'nonprofit')) tags.push('Nonprofit');
    if (this.matchesEmployerType(job, 'education')) tags.push('Education');
    if (this.matchesEmployerType(job, 'government')) tags.push('Government');
    if (this.matchesEmployerType(job, 'cultural')) tags.push('Cultural');
    if (this.matchesEmployerType(job, 'think-tank')) tags.push('Think Tank');
    if (this.isRemote(job)) tags.push('Remote');
    if (this.isHybrid(job)) tags.push('Hybrid');
    
    return tags.slice(0, 3);
}

formatDate(dateString) {
    if (!dateString) return 'Recently posted';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    if (diffDays <= 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
    });
}

truncateDescription(description, maxLength = 250) {
    if (!description) return 'No description available';
    if (description.length <= maxLength) return description;
    
    // Try to cut at a word boundary
    const truncated = description.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    return truncated.substring(0, lastSpace) + '...';
}

updateStats() {
    const total = this.filteredJobs.length;
    const remote = this.filteredJobs.filter(job => this.isRemote(job)).length;
    const perfect = this.filteredJobs.filter(job => this.isPerfectMatch(job)).length;
    const preferred = this.filteredJobs.filter(job => this.isPreferredEmployer(job)).length;
    
    document.getElementById('totalJobs').textContent = total;
    document.getElementById('remoteJobs').textContent = remote;
    document.getElementById('perfectMatches').textContent = perfect;
    document.getElementById('preferredJobs').textContent = preferred;
}

clearAllFilters() {
    document.getElementById('locationFilter').value = 'all';
    document.getElementById('employerFilter').value = 'all';
    document.getElementById('roleFilter').value = 'all';
    document.getElementById('searchInput').value = '';
    this.applyFilters();
}

async forceRefresh() {
    document.getElementById('loading').style.display = 'block';
    this.jobs = [];
    await this.loadJobs();
}
```

}

// Initialize when page loads
document.addEventListener(‘DOMContentLoaded’, () => {
new JobBoard();
});