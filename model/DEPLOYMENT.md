# Model Deployment Guide

This guide will help you deploy the model service to free hosting platforms.

## Prerequisites

1. GitHub account
2. Gemini API key (from Google AI Studio)
3. Account on a free hosting platform (Render, Railway, or Fly.io)

## Step-by-Step Deployment Instructions

### Step 1: Prepare Your Code

✅ Already done:
- `.gitignore` files created
- Environment variables configured
- Unnecessary files removed
- Deployment files created (Procfile, runtime.txt)

### Step 2: Create GitHub Repository

1. Go to [GitHub](https://github.com) and create a new repository
2. Name it something like `hackcbs-model` or `pitch-generator-api`
3. **DO NOT** initialize with README, .gitignore, or license (we already have these)

### Step 3: Push Code to GitHub

Open terminal in the `model` directory and run:

```bash
cd model
git init
git add .
git commit -m "Initial commit: Model deployment ready"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

Replace `YOUR_USERNAME` and `YOUR_REPO_NAME` with your actual GitHub details.

### Step 4: Deploy to Render (Recommended - Free Tier Available)

1. Go to [Render](https://render.com) and sign up/login
2. Click "New +" → "Web Service"
3. Connect your GitHub account and select your repository
4. Configure the service:
   - **Name**: `pitch-generator-api` (or any name you prefer)
   - **Region**: Choose closest to you
   - **Branch**: `main`
   - **Root Directory**: Leave empty (or `model` if deploying from root)
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn server:app --bind 0.0.0.0:$PORT`
5. Add Environment Variable:
   - **Key**: `GENAI_API_KEY`
   - **Value**: Your Gemini API key (from Google AI Studio)
6. Click "Create Web Service"
7. Wait for deployment (5-10 minutes)
8. Your API will be available at: `https://your-service-name.onrender.com`

### Alternative: Deploy to Railway

1. Go to [Railway](https://railway.app) and sign up/login
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway will auto-detect Python
5. Add Environment Variable:
   - Click on your service → Variables
   - Add `GENAI_API_KEY` with your API key
6. Railway will automatically deploy
7. Your API will be available at: `https://your-service-name.up.railway.app`

### Alternative: Deploy to Fly.io

1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Login: `fly auth login`
3. In the `model` directory, run: `fly launch`
4. Follow the prompts
5. Set environment variable: `fly secrets set GENAI_API_KEY=your_key_here`
6. Deploy: `fly deploy`

## Testing Your Deployment

Once deployed, test your API:

```bash
curl -X POST https://your-service-url.onrender.com/generate-pitch \
  -H "Content-Type: application/json" \
  -d '{"text": "I need 50k for my startup"}'
```

## Important Notes

1. **Free Tier Limitations**:
   - Render: Services spin down after 15 minutes of inactivity
   - First request after spin-down takes ~30 seconds
   - Consider upgrading for production use

2. **API Key Security**:
   - Never commit your API key to GitHub
   - Always use environment variables
   - The `.env` file is already in `.gitignore`

3. **Port Configuration**:
   - Hosting platforms set the `PORT` environment variable
   - The code automatically uses it

## Deploying Selector Service

If you also need to deploy `selector_service.py`, you can:

1. Create a separate service on the same platform
2. Use the same repository but different start command: `gunicorn selector_service:app --bind 0.0.0.0:$PORT`
3. Or combine both services into one Flask app (more complex)

## Troubleshooting

- **Build fails**: Check that all dependencies are in `requirements.txt`
- **Service crashes**: Check logs in your hosting platform dashboard
- **API key error**: Verify environment variable is set correctly
- **CORS errors**: Already configured in the code

## Next Steps

After deployment:
1. Update your frontend/client to use the new API URL
2. Test all endpoints
3. Monitor usage and costs (free tiers have limits)

