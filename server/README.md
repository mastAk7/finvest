# Backend Deployment - Render

Deploy your Node.js/Express backend to Render.

## Prerequisites

- GitHub repository with your code
- Render account
- MongoDB Atlas account (free tier)
- Model API deployed: https://finvest-2p2y.onrender.com
- Selector API deployed (or update SELECTOR_API_URL later)

## Step-by-Step Deployment

### Step 1: Go to Render Dashboard

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub account if not already connected
4. Select your repository

### Step 2: Configure the Service

**Service Settings:**

- **Name**: `finvest-backend` (or any name you prefer)
- **Region**: Choose closest to you
- **Branch**: `main` (or your default branch)
- **Root Directory**: `server`
- **Runtime**: Node
- **Build Command**: `npm install`
- **Start Command**: `node index.js`

### Step 3: Environment Variables

Go to **Environment** tab and add:

```env
SESSION_SECRET=your-random-secret-string
DB_URL=mongodb+srv://username:password@cluster.mongodb.net/hackcbs?retryWrites=true&w=majority
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
MODEL_API_URL=https://finvest-2p2y.onrender.com
SELECTOR_API_URL=https://your-selector-service.onrender.com
CLIENT_ORIGIN=http://localhost:5173
NODE_ENV=production
```

**How to get values:**

1. **SESSION_SECRET**: Generate random string:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **DB_URL**: 
   - Create MongoDB Atlas cluster (free tier)
   - Create database user
   - Whitelist IP: `0.0.0.0/0` (allows all IPs)
   - Get connection string from Atlas dashboard

3. **GOOGLE_CLIENT_ID & SECRET**: From Google Cloud Console

4. **MODEL_API_URL**: Already deployed ✅

5. **SELECTOR_API_URL**: Your deployed selector service URL

6. **CLIENT_ORIGIN**: Your frontend URL (or `http://localhost:5173` for local dev)

### Step 4: Deploy

1. Click "Create Web Service"
2. Wait for deployment (5-10 minutes)
3. Your backend will be available at: `https://your-service-name.onrender.com`

### Step 5: Update Frontend

Update your frontend to use the new backend URL:

**Option 1: Environment Variable**
```env
VITE_API_BASE=https://your-backend.onrender.com
```

**Option 2: Update in code**
- Find where `API_BASE` is set in frontend
- Update to your Render backend URL

## Testing

### Test Backend Health
```bash
curl https://your-backend.onrender.com/
```
Should return: `{"status":"ok"}`

### Test API Endpoint
```bash
curl -X POST https://your-backend.onrender.com/pitch/generate \
  -H "Content-Type: application/json" \
  -d '{"slangText": "I need 50000 rupees"}'
```

## Important Notes

1. **MongoDB Atlas**: Use free tier, whitelist `0.0.0.0/0` for Render
2. **CORS**: Set `CLIENT_ORIGIN` to your frontend URL
3. **Free Tier**: Service spins down after 15 min inactivity (first request may take 30-60 seconds)
4. **Port**: Render automatically sets `PORT` environment variable

## Troubleshooting

- **Build fails**: Check Root Directory is set to `server`
- **Service crashes**: Check all environment variables are set correctly
- **Database error**: Verify MongoDB Atlas connection string and IP whitelist
- **CORS errors**: Verify `CLIENT_ORIGIN` matches your frontend URL exactly

## Environment Variables Checklist

- [ ] `SESSION_SECRET` - Random secure string
- [ ] `DB_URL` - MongoDB Atlas connection string
- [ ] `GOOGLE_CLIENT_ID` - Google OAuth client ID
- [ ] `GOOGLE_CLIENT_SECRET` - Google OAuth secret
- [ ] `MODEL_API_URL` - https://finvest-2p2y.onrender.com
- [ ] `SELECTOR_API_URL` - Your selector service URL
- [ ] `CLIENT_ORIGIN` - Your frontend URL
- [ ] `NODE_ENV` - Set to `production`

