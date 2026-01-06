# GitHub Repository Setup Guide

## Step 1: Create the Repository on GitHub

1. Go to [github.com/new](https://github.com/new)
2. Fill in:
   - **Repository name:** `mcp-enterprise-support-demo`
   - **Description:** `MCP server demonstrating AI-native enterprise support personalization`
   - **Visibility:** Public
   - **DO NOT** initialize with README, .gitignore, or license (we have these already)
3. Click **Create repository**

## Step 2: Push Your Local Files

After creating the empty repo, GitHub will show you commands. Use these:

```bash
# Navigate to the project folder
cd /path/to/mcp-enterprise-support-demo

# Initialize git
git init

# Add all files
git add .

# Create first commit
git commit -m "Initial commit: MCP Enterprise Support Demo"

# Add your GitHub repo as remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/mcp-enterprise-support-demo.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 3: Enable GitHub Pages (for the landing page)

1. Go to your repo on GitHub
2. Click **Settings** (tab at the top)
3. Scroll down to **Pages** in the left sidebar
4. Under "Source", select:
   - **Branch:** `main`
   - **Folder:** `/docs`
5. Click **Save**
6. Wait 1-2 minutes, then your landing page will be live at:
   `https://YOUR_USERNAME.github.io/mcp-enterprise-support-demo`

## Step 4: Update Links in the Landing Page

Before pushing (or after, with another commit), update these placeholders in `docs/index.html`:

1. Find and replace `ashleyharrison` with your actual GitHub username (appears in several links)
2. Update the LinkedIn URL in the footer if needed

```bash
# If you've already pushed and need to update:
# Edit docs/index.html, then:
git add docs/index.html
git commit -m "Update links with correct username"
git push
```

## Step 5: Add Topics/Tags (Optional but Recommended)

1. On your repo page, click the gear icon next to "About"
2. Add topics: `mcp`, `anthropic`, `claude`, `typescript`, `enterprise-support`, `ai`
3. Add a website URL (your GitHub Pages link)

## Final Checklist

- [ ] Repository created and public
- [ ] All files pushed
- [ ] GitHub Pages enabled and working
- [ ] Links in landing page updated with your username
- [ ] Topics added for discoverability
- [ ] Test the MCP Inspector locally to confirm everything works

## Your Links

Once complete, you'll have:

- **Repository:** `https://github.com/YOUR_USERNAME/mcp-enterprise-support-demo`
- **Landing Page:** `https://YOUR_USERNAME.github.io/mcp-enterprise-support-demo`

Use these links in your:
- Anthropic application ("Why Anthropic?" response)
- Cover letter
- LinkedIn profile
- Resume (optional projects section)
