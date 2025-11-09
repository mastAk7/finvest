# Vercel Frontend Deployment - Quick Checklist

## ✅ Pre-Deployment

- [x] `vercel.json` created
- [x] `README.md` created with instructions
- [ ] Code pushed to GitHub

## 🚀 Deployment Steps

### Step 1: Vercel Setup
- [ ] Go to [vercel.com](https://vercel.com)
- [ ] Sign up/login (GitHub login recommended)
- [ ] Click "Add New..." → "Project"

### Step 2: Import Repository
- [ ] Connect GitHub account
- [ ] Select your repository
- [ ] Click "Import"

### Step 3: Configure Project
- [ ] **Root Directory**: Set to `client`
- [ ] **Framework Preset**: Vite (auto-detected)
- [ ] **Build Command**: `npm run build` (auto-detected)
- [ ] **Output Directory**: `dist` (auto-detected)

### Step 4: Environment Variables
- [ ] Add `VITE_API_BASE` = `https://your-backend.onrender.com`
- [ ] Replace with your actual backend URL

### Step 5: Deploy
- [ ] Click "Deploy"
- [ ] Wait 2-3 minutes
- [ ] Copy your Vercel URL (e.g., `https://your-project.vercel.app`)

### Step 6: Update Backend CORS
- [ ] Go to Render Dashboard → Backend Service → Environment
- [ ] Update `CLIENT_ORIGIN` to:
  ```
  http://localhost:5173,https://your-project.vercel.app
  ```
- [ ] Save and redeploy backend

## 📝 Important Notes

1. **Root Directory**: Must be `client` (not root)
2. **Environment Variables**: Must start with `VITE_` to be exposed
3. **Backend CORS**: Must include Vercel URL after deployment
4. **Build**: Happens automatically on every push to main branch

## ✅ After Deployment

- [ ] Visit your Vercel URL
- [ ] Test login/signup
- [ ] Test dashboard
- [ ] Check browser console for errors
- [ ] Verify API calls work

## 🔗 URLs After Deployment

- **Frontend**: `https://your-project.vercel.app`
- **Backend**: `https://your-backend.onrender.com`
- **Model API**: `https://finvest-2p2y.onrender.com`

## 🐛 Troubleshooting

### Build Fails
- Check Root Directory is `client`
- Verify `package.json` exists
- Check Vercel build logs

### API Calls Fail
- Verify `VITE_API_BASE` is correct
- Check backend CORS includes Vercel URL
- Check browser console for errors

### 404 on Routes
- Vercel rewrites configured in `vercel.json`
- Should work automatically

