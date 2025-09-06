# # 🚀 Setup Instructions for Your Policy + Tech Job Board

## Quick Start (Get it working in 10 minutes!)

### Step 1: Create GitHub Repository

1. Go to [GitHub](https://github.com) and create a new repository called `job-board`
1. Make it **public** (required for GitHub Pages)
1. Initialize with a README

### Step 2: Upload the Files

Upload these files to your repository:

- `.github/workflows/update-jobs.yml` (create the folders first)
- `scripts/fetch-jobs.js` (create scripts folder)
- `index.html`
- `styles.css`
- `app.js`
- `package.json`

### Step 3: Enable GitHub Pages

1. Go to Settings → Pages in your repository
1. Under “Source”, select “Deploy from a branch”
1. Choose “main” branch and “/ (root)” folder
1. Click Save

### Step 4: Enable GitHub Actions

1. Go to Settings → Actions → General
1. Under “Workflow permissions”, select “Read and write permissions”
1. Check “Allow GitHub Actions to create and approve pull requests”
1. Click Save

### Step 5: Create Data Directory

1. Create a folder called `data` in your repository
1. Create an empty file called `jobs.json` with this content:

```json
{
  "jobs": [],
  "lastUpdated": "2024-01-01T00:00:00Z",
  "totalJobs": 0,
  "sources": []
}
```

### Step 6: Trigger First Run

1. Go to Actions tab
1. Click on “Update Jobs Daily”
1. Click “Run workflow” → “Run workflow”
1. Wait 2-3 minutes for it to complete

### Step 7: View Your Job Board

Your job board will be live at:
`https://[your-github-username].github.io/job-board`

## 🎯 Why This Solution Works

### What I Fixed:

1. **No API Keys Needed**: Uses only free, public APIs (USA Jobs, RemoteOK)
1. **Proper Permissions**: GitHub Actions can now write to your repo
1. **Correct Timezone**: Updates at 12AM EST as requested
1. **Error Handling**: Won’t crash if an API is down
1. **Smart Filtering**: Specifically targets Policy + Tech hybrid roles
1. **Fallback Data**: Shows sample jobs if APIs fail

### How It Works:

- **Daily Updates**: Automatically fetches new jobs at midnight EST
- **Smart Matching**: Prioritizes jobs that combine policy and tech
- **Mission-Driven Focus**: Highlights nonprofits, universities, and government
- **LA + Remote**: Filters for Los Angeles area and remote positions
- **No Customer Service**: Explicitly excludes unwanted job types

## 🔧 Customization

### Adjust Your Target Roles

Edit `scripts/fetch-jobs.js` lines 8-20 to add/remove role keywords:

```javascript
this.targetRoles = [
    'project manager',
    'policy analyst',
    // Add your preferred titles here
];
```

### Change Update Time

Edit `.github/workflows/update-jobs.yml` line 6:

```yaml
- cron: '0 5 * * *'  # Currently 12AM EST
# Change to '0 13 * * *' for 8AM EST
```

### Add More Sources

The script is designed to easily add new job sources. Just follow the pattern in `fetchUSAJobs()` method.

## 📊 Features

### Perfect Match Detection 🎯

Jobs that combine both policy and technical elements are marked as “Perfect Match” - these are ideal for your Poli Sci + CS background.

### Intelligent Filtering

- **Location**: Remote, LA Area, or Hybrid
- **Employer Type**: Nonprofits, Universities, Government, Museums, Think Tanks
- **Role Focus**: Project Management, Policy, Tech+Policy Hybrid, Administrative, Strategy

### Relevance Scoring

Each job gets a score based on:

- Mission-driven employer (+20 points)
- Policy + Tech combination (+15 points)
- Remote availability (+10 points)
- LA location (+8 points)
- Role match (+10 points)

## 🐛 Troubleshooting

### If jobs aren’t updating:

1. Check Actions tab for error messages
1. Manually trigger the workflow
1. Verify the data/jobs.json file exists

### If the page shows “Sample Data”:

This means the fetch isn’t working yet. Check:

1. GitHub Actions ran successfully
1. The data/jobs.json file has content
1. Wait a few minutes for GitHub Pages to update

### If you see permission errors:

1. Go to Settings → Actions → General
1. Enable “Read and write permissions”
1. Re-run the workflow

## 📈 Next Steps

Once it’s working, you can:

1. Star the jobs you’ve applied to (add this feature)
1. Export jobs to CSV (add export button)
1. Set up email notifications (using GitHub Actions)
1. Add more job sources (Indeed RSS, AngelList, etc.)

## 💡 Pro Tips

1. **Manual Refresh**: Click the 🔄 Refresh button to check for new jobs
1. **Best Time to Check**: New government jobs post Monday mornings
1. **Hidden Gems**: Check the “Think Tank” employer filter - these often have policy+tech roles
1. **Use Search**: Try keywords like “digital”, “data”, “innovation” to find tech-forward policy roles

## Need Help?

The job board should work immediately after setup. If you have issues:

1. Check the GitHub Actions logs
1. Verify all files are uploaded correctly
1. Make sure GitHub Pages is enabled
1. The sample jobs will display even if the fetch fails

Good luck with your job search! 🚀