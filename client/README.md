# Frontend Deployment - Vercel

Deploy your React frontend to Vercel.

## Prerequisites

- GitHub repository with your code
- Vercel account (free tier available)
- Backend API deployed on Render

## Step-by-Step Deployment

### Step 1: Go to Vercel

1. Go to [Vercel](https://vercel.com)
2. Sign up/login (you can use GitHub to sign in)
3. Click "Add New..." → "Project"

### Step 2: Import Your Repository

1. Connect your GitHub account if not already connected
2. Select your repository (`finvest` or your repo name)
3. Click "Import"

### Step 3: Configure Project

Vercel will auto-detect Vite/React. Configure:

- **Framework Preset**: Vite (auto-detected)
- **Root Directory**: `client`
- **Build Command**: `npm run build` (auto-detected)
- **Output Directory**: `dist` (auto-detected)
- **Install Command**: `npm install` (auto-detected)

### Step 4: Environment Variables

Click "Environment Variables" and add:

```env
VITE_API_BASE=https://your-backend.onrender.com
```

**Important:**
- Replace `your-backend.onrender.com` with your actual backend URL from Render
- Vercel environment variables starting with `VITE_` are exposed to the frontend
- No quotes needed in Vercel's environment variable input

### Step 5: Deploy

1. Click "Deploy"
2. Wait 2-3 minutes for build and deployment
3. Your frontend will be live at: `https://your-project-name.vercel.app`

### Step 6: Update Backend CORS

After getting your Vercel URL, update backend CORS:

1. Go to Render Dashboard → Your Backend Service → Environment
2. Update `CLIENT_ORIGIN` to include your Vercel URL:
   ```
   http://localhost:5173,https://your-project-name.vercel.app
   ```
3. Save and redeploy backend

## Custom Domain (Optional)

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions

## Environment Variables

### Required
- `VITE_API_BASE` - Your backend API URL (e.g., `https://your-backend.onrender.com`)

### Optional
- Add any other `VITE_*` variables if needed

## Build Configuration

The project uses:
- **Vite** as the build tool
- **React** as the framework
- Build output goes to `dist/` directory
- SPA routing is handled by Vercel rewrites

## Troubleshooting

### Build Fails
- Check that Root Directory is set to `client`
- Verify `package.json` exists in `client/` directory
- Check build logs in Vercel dashboard

### API Calls Fail
- Verify `VITE_API_BASE` is set correctly
- Check backend CORS includes your Vercel URL
- Check browser console for CORS errors

### 404 on Routes
- Vercel rewrites are configured in `vercel.json`
- All routes should redirect to `index.html` for SPA routing

### Environment Variables Not Working
- Make sure variable name starts with `VITE_`
- Redeploy after adding/changing variables
- Variables are available at build time, not runtime

## Testing

After deployment:

1. Visit your Vercel URL
2. Test login/signup
3. Test dashboard
4. Check browser console for errors

## Continuous Deployment

Vercel automatically deploys when you:
- Push to `main` branch (production)
- Push to other branches (preview deployments)
- Create pull requests (preview deployments)

## Free Tier Limits

Vercel free tier includes:
- Unlimited deployments
- 100GB bandwidth/month
- Custom domains
- SSL certificates (automatic)
