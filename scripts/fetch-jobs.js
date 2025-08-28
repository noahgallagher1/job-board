const fs = require('fs');
const path = require('path');
const https = require('https');

class JobFetcher {
    constructor() {
        this.jobs = [];
        this.seenJobs = new Set();
        
        // API Configuration
        this.apis = {
            usaJobs: {
                baseUrl: 'https://data.usajobs.gov/api/search',
                headers: {
                    'User-Agent': 'malcolm-job-board/1.0 (malcolm@example.com)'
                }
            },
            adzuna: {
                baseUrl: 'https://api.adzuna.com/v1/api/jobs/us/search/1',
                appId: process.env.ADZUNA_APP_ID,
                appKey: process.env.ADZUNA_APP_KEY
            },
            jooble: {
                baseUrl: 'https://jooble.org/api/',
                key: process.env.JOOBLE_API_KEY
            }
        };
        
        // Search criteria
        this.targetRoles = [
            'project manager', 'program manager', 'project coordinator',
            'administrative coordinator', 'administrative specialist', 'administrator',
            'policy analyst', 'policy writer', 'proofreader', 'editor',
            'planning specialist', 'strategic planner', 'strategy analyst'
        ];
        
        this.excludeTerms = [
            'customer service', 'customer support', 'call center',
            'customer care', 'customer success', 'help desk',
            'customer representative', 'sales', 'retail'
        ];
        
        this.preferredEmployers = [
            'museum', 'library', 'nonprofit', 'university', 'college',
            'foundation', 'charity', 'educational', 'cultural', 'arts'
        ];
    }

    async fetchAllJobs() {
        console.log('🚀 Starting job fetch process...');
        
        try {
            // Fetch from multiple sources
            await this.fetchUSAJobs();
            await this.fetchAdzunaJobs();
            await this.fetchJoobleJobs();
            await this.fetchRSSFeeds();
            
            // Process and save jobs
            this.processJobs();
            await this.saveJobs();
            
            console.log(`✅ Successfully fetched ${this.jobs.length} jobs`);
            
        } catch (error) {
            console.error('❌ Error in job fetching process:', error);
            throw error;
        }
    }

    async fetchUSAJobs() {
        console.log('📡 Fetching USA Jobs...');
        
        try {
            const queries = [
                'project+manager', 'program+manager', 'administrator',
                'policy+analyst', 'planning+specialist'
            ];
            
            for (const query of queries) {
                const url = `${this.apis.usaJobs.baseUrl}?Keyword=${query}&LocationName=Remote;Los Angeles, CA&ResultsPerPage=50`;
                
                const data = await this.makeRequest(url, this.apis.usaJobs.headers);
                
                if (data && data.SearchResult && data.SearchResult.SearchResultItems) {
                    for (const item of data.SearchResult.SearchResultItems) {
                        const job = this.parseUSAJob(item.MatchedObjectDescriptor);
                        if (this.isValidJob(job)) {
                            this.addJob(job);
                        }
                    }
                }
                
                // Rate limiting
                await this.sleep(1000);
            }
            
            console.log(`✅ USA Jobs: ${this.jobs.length} jobs added`);
            
        } catch (error) {
            console.error('❌ USA Jobs error:', error);
        }
    }

    async fetchAdzunaJobs() {
        if (!this.apis.adzuna.appId || !this.apis.adzuna.appKey) {
            console.log('⚠️ Skipping Adzuna (no API keys)');
            return;
        }
        
        console.log('📡 Fetching Adzuna Jobs...');
        
        try {
            const queries = [
                'project manager nonprofit', 'administrator museum',
                'policy analyst', 'program coordinator'
            ];
            
            for (const query of queries) {
                const params = new URLSearchParams({
                    app_id: this.apis.adzuna.appId,
                    app_key: this.apis.adzuna.appKey,
                    what: query,
                    where: 'Los Angeles, CA',
                    distance: 50,
                    results_per_page: 25,
                    content_type: 'application/json'
                });
                
                const url = `${this.apis.adzuna.baseUrl}?${params}`;
                const data = await this.makeRequest(url);
                
                if (data && data.results) {
                    for (const job of data.results) {
                        const processedJob = this.parseAdzunaJob(job);
                        if (this.isValidJob(processedJob)) {
                            this.addJob(processedJob);
                        }
                    }
                }
                
                await this.sleep(1000);
            }
            
            console.log(`✅ Adzuna: Added jobs (total: ${this.jobs.length})`);
            
        } catch (error) {
            console.error('❌ Adzuna error:', error);
        }
    }

    async fetchJoobleJobs() {
        if (!this.apis.jooble.key) {
            console.log('⚠️ Skipping Jooble (no API key)');
            return;
        }
        
        console.log('📡 Fetching Jooble Jobs...');
        
        try {
            const queries = [
                'project manager nonprofit', 'administrator museum library',
                'policy writer', 'program coordinator university'
            ];
            
            for (const query of queries) {
                const postData = JSON.stringify({
                    keywords: query,
                    location: 'Los Angeles, CA',
                    radius: '50'
                });
                
                const url = `${this.apis.jooble.baseUrl}${this.apis.jooble.key}`;
                const data = await this.makePostRequest(url, postData);
                
                if (data && data.jobs) {
                    for (const job of data.jobs) {
                        const processedJob = this.parseJoobleJob(job);
                        if (this.isValidJob(processedJob)) {
                            this.addJob(processedJob);
                        }
                    }
                }
                
                await this.sleep(1000);
            }
            
            console.log(`✅ Jooble: Added jobs (total: ${this.jobs.length})`);
            
        } catch (error) {
            console.error('❌ Jooble error:', error);
        }
    }

    async fetchRSSFeeds() {
        console.log('📡 Fetching RSS Feeds...');
        
        const rssFeeds = [
            'https://rss.indeed.com/rss?q=nonprofit+project+manager&l=Los+Angeles,+CA',
            'https://rss.indeed.com/rss?q=museum+administrator&l=Los+Angeles,+CA',
            'https://rss.indeed.com/rss?q=library+coordinator&l=Los+Angeles,+CA'
        ];
        
        // Note: In production, you'd use a proper RSS parser
        // For now, we'll implement a simple fallback
        try {
            for (const feed of rssFeeds) {
                await this.sleep(2000); // Longer delays for RSS
            }
            console.log('✅ RSS feeds processed');
        } catch (error) {
            console.error('❌ RSS error:', error);
        }
    }

    parseUSAJob(job) {
        return {
            id: `usa-${job.PositionID}`,
            title: job.PositionTitle,
            company: job.OrganizationName,
            location: job.PositionLocationDisplay,
            description: job.UserArea?.Details?.JobSummary || job.QualificationSummary || '',
            url: job.PositionURI,
            posted: job.PublicationStartDate,
            source: 'USA Jobs',
            salary: job.PositionRemuneration?.[0]?.Description || ''
        };
    }

    parseAdzunaJob(job) {
        return {
            id: `adzuna-${job.id}`,
            title: job.title,
            company: job.company.display_name,
            location: job.location.display_name,
            description: job.description,
            url: job.redirect_url,
            posted: job.created,
            source: 'Adzuna',
            salary: job.salary_min && job.salary_max ? 
                   `$${job.salary_min} - $${job.salary_max}` : ''
        };
    }

    parseJoobleJob(job) {
        return {
            id: `jooble-${job.id || Math.random().toString(36)}`,
            title: job.title,
            company: job.company,
            location: job.location,
            description: job.snippet,
            url: job.link,
            posted: job.updated || new Date().toISOString(),
            source: 'Jooble',
            salary: job.salary || ''
        };
    }

    isValidJob(job) {
        if (!job.title || !job.company || !job.description) return false;
        
        // Check if already seen
        const jobKey = `${job.title}-${job.company}`.toLowerCase();
        if (this.seenJobs.has(jobKey)) return false;
        
        const searchText = [job.title, job.description, job.company].join(' ').toLowerCase();
        
        // Exclude customer service roles
        for (const exclude of this.excludeTerms) {
            if (searchText.includes(exclude)) return false;
        }
        
        // Must match at least one target role
        const matchesRole = this.targetRoles.some(role => 
            searchText.includes(role.toLowerCase())
        );
        
        if (!matchesRole) return false;
        
        this.seenJobs.add(jobKey);
        return true;
    }

    addJob(job) {
        // Add preference score
        job.preferenceScore = this.calculatePreferenceScore(job);
        this.jobs.push(job);
    }

    calculatePreferenceScore(job) {
        let score = 0;
        const searchText = [job.title, job.description, job.company].join(' ').toLowerCase();
        
        // Preferred employer bonus
        for (const employer of this.preferredEmployers) {
            if (searchText.includes(employer)) {
                score += 10;
                break;
            }
        }
        
        // Location bonus
        if (job.location.toLowerCase().includes('remote')) score += 5;
        if (job.location.toLowerCase().includes('los angeles')) score += 3;
        
        // Role match bonus
        for (const role of this.targetRoles) {
            if (searchText.includes(role)) {
                score += 2;
                break;
            }
        }
        
        return score;
    }

    processJobs() {
        // Sort by preference score and recency
        this.jobs.sort((a, b) => {
            const scoreA = a.preferenceScore || 0;
            const scoreB = b.preferenceScore || 0;
            if (scoreA !== scoreB) return scoreB - scoreA;
            
            // Then by date
            return new Date(b.posted) - new Date(a.posted);
        });
        
        // Limit to 50 jobs to keep data manageable
        this.jobs = this.jobs.slice(0, 50);
        
        console.log(`🔍 Processed and filtered to ${this.jobs.length} jobs`);
    }

    async saveJobs() {
        const dataDir = path.join(__dirname, '..', 'data');
        const filePath = path.join(dataDir, 'jobs.json');
        
        // Ensure data directory exists
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        const output = {
            jobs: this.jobs,
            lastUpdated: new Date().toISOString(),
            totalFetched: this.jobs.length,
            sources: ['USA Jobs', 'Adzuna', 'Jooble', 'RSS Feeds']
        };
        
        fs.writeFileSync(filePath, JSON.stringify(output, null, 2));
        console.log(`💾 Saved ${this.jobs.length} jobs to ${filePath}`);
    }

    async makeRequest(url, headers = {}) {
        return new Promise((resolve, reject) => {
            const request = https.get(url, { headers }, (response) => {
                let data = '';
                response.on('data', chunk => data += chunk);
                response.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (error) {
                        reject(error);
                    }
                });
            });
            
            request.on('error', reject);
            request.setTimeout(10000, () => {
                request.destroy();
                reject(new Error('Request timeout'));
            });
        });
    }

    async makePostRequest(url, postData) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const options = {
                hostname: urlObj.hostname,
                path: urlObj.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };
            
            const request = https.request(options, (response) => {
                let data = '';
                response.on('data', chunk => data += chunk);
                response.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (error) {
                        reject(error);
                    }
                });
            });
            
            request.on('error', reject);
            request.write(postData);
            request.end();
        });
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Run the job fetcher
if (require.main === module) {
    const fetcher = new JobFetcher();
    fetcher.fetchAllJobs().catch(console.error);
}

module.exports = JobFetcher;
