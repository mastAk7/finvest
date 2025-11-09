# Dashboard "Failed to Fetch" Error - Fix Guide

## Problem
The dashboard shows a "Session check failed: TypeError: Failed to fetch" error in the browser console. This happens when the frontend cannot reach the backend API.

## Root Causes

1. **Missing Environment Variable**: `VITE_API_BASE` is not set in Vercel
2. **Incorrect Backend URL**: The `VITE_API_BASE` points to the wrong URL
3. **CORS Configuration**: Backend CORS doesn't include your Vercel frontend URL
4. **Backend Not Running**: The backend service is down or not accessible

## Solution Steps

### Step 1: Verify Backend is Running
1. Check your backend URL (e.g., `https://your-backend.onrender.com`)
2. Visit `https://your-backend.onrender.com/` in your browser
3. Should see: `{"status":"ok"}`

### Step 2: Set Environment Variable in Vercel
1. Go to [Vercel Dashboard](https://vercel.com)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add a new variable:
   - **Name**: `VITE_API_BASE`
   - **Value**: `https://your-backend.onrender.com` (your actual backend URL)
   - **Environment**: Production, Preview, Development (select all)
5. **Important**: Do NOT include trailing slash
6. Click **Save**

### Step 3: Update Backend CORS
1. Go to your backend service (e.g., Render Dashboard)
2. Navigate to **Environment** settings
3. Find `CLIENT_ORIGIN` variable
4. Update it to include your Vercel URL:
   ```
   http://localhost:5173,https://your-project.vercel.app
   ```
5. Save and redeploy backend

### Step 4: Redeploy Frontend
1. After setting `VITE_API_BASE` in Vercel, trigger a new deployment:
   - Option A: Push a commit to your repository
   - Option B: Go to Vercel Dashboard → Deployments → Click "Redeploy"
2. Wait for deployment to complete (2-3 minutes)

### Step 5: Verify Fix
1. Open your Vercel URL in browser
2. Open browser DevTools (F12) → Console tab
3. The "Failed to fetch" error should be gone
4. If you're logged in, you should see the dashboard
5. If not logged in, you should see the landing page (no errors)

## Testing

### Test 1: Check Environment Variable
1. Open browser console on your deployed site
2. You should see a warning if `API_BASE` is not configured correctly
3. The warning will show the current `API_BASE` value

### Test 2: Check Network Tab
1. Open DevTools → Network tab
2. Refresh the page
3. Look for request to `/auth/me`
4. Check if it's going to the correct backend URL
5. Check the response status (should be 200 or 401, not failed)

## Common Issues

### Issue: Still seeing "Failed to fetch"
**Solution**: 
- Double-check `VITE_API_BASE` is set correctly in Vercel
- Make sure you redeployed after adding the variable
- Check backend CORS includes your Vercel URL
- Verify backend is running and accessible

### Issue: CORS error in console
**Solution**:
- Update `CLIENT_ORIGIN` in backend to include your Vercel URL
- Make sure there are no typos in the URL
- Redeploy backend after updating CORS

### Issue: 401/403 errors (not "Failed to fetch")
**Solution**: This is normal if you're not logged in. The app will show the landing page.

### Issue: Backend returns 500 error
**Solution**: Check backend logs for errors. Common causes:
- Database connection issues
- Missing environment variables in backend
- Server crashes

## Code Changes Made

The following improvements were made to handle errors more gracefully:

1. **Better Error Handling**: The app now handles network errors gracefully without breaking
2. **Timeout Protection**: Added 10-second timeout to prevent hanging requests
3. **Better Logging**: More informative console warnings to help debug issues
4. **Graceful Degradation**: App shows landing page if session check fails (user not logged in)

## Environment Variables Checklist

### Frontend (Vercel)
- [ ] `VITE_API_BASE` = `https://your-backend.onrender.com`

### Backend (Render)
- [ ] `CLIENT_ORIGIN` = `http://localhost:5173,https://your-project.vercel.app`
- [ ] `SESSION_SECRET` = (random secure string)
- [ ] `DB_URL` = (MongoDB connection string)
- [ ] `NODE_ENV` = `production`
- [ ] Other required variables (see `server/.example.env`)

## Still Having Issues?

1. Check browser console for specific error messages
2. Check Network tab to see the actual request/response
3. Verify backend is accessible: `curl https://your-backend.onrender.com/`
4. Check Vercel deployment logs for build errors
5. Check Render backend logs for runtime errors

