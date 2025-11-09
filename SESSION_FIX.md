# Session & Login Fix - Complete Guide

## Problem Summary
Users were able to log in, but subsequent API calls (fetching pitches, submitting pitches) were failing with "Please log in" errors. This was caused by session cookie issues.

## Root Causes Fixed

### 1. Cookie Name Mismatch ✅
- **Issue**: Logout was trying to clear `connect.sid` but session was using `finvest.sid`
- **Fix**: Updated logout to use correct cookie name

### 2. Session Not Persisting ✅
- **Issue**: Session cookies weren't being sent properly in cross-origin requests
- **Fix**: Improved cookie configuration and session handling

### 3. Session User Object Missing ✅
- **Issue**: `req.session.user` wasn't always populated even when `req.session.userId` existed
- **Fix**: Enhanced `attachUser` middleware to always populate user object

### 4. Better Error Handling ✅
- **Issue**: Frontend didn't handle session expiration gracefully
- **Fix**: Added proper 401 handling and user feedback

## Changes Made

### Backend Changes

#### 1. `server/controllers/authController.js`
- Fixed logout to clear correct cookie name (`finvest.sid`)
- Added proper cookie options for logout

#### 2. `server/index.js`
- Improved session cookie configuration
- Better comments explaining cookie settings
- Removed unnecessary domain setting (let browser handle it)

#### 3. `server/middleware/auth.js`
- Enhanced to always populate `req.session.user` from `req.session.userId`
- Added debug logging for development
- Better error handling

#### 4. `server/routes/pitch.js`
- Added fallback to fetch user if `req.session.user` is missing
- Better session debugging
- More robust authentication checks

### Frontend Changes

#### 1. `client/src/App.jsx`
- Better error handling for 401 responses
- Automatic logout on session expiration
- Improved user feedback messages
- Better session check with timeout

## Deployment Checklist

### Step 1: Deploy Backend Changes
1. Push changes to your repository
2. Render will automatically redeploy
3. Wait for deployment to complete (5-10 minutes)

### Step 2: Verify Backend Environment Variables
In Render Dashboard → Your Backend → Environment, ensure:

```env
SESSION_SECRET=<your-secret-string>
CLIENT_ORIGIN=http://localhost:5173,https://your-vercel-app.vercel.app
NODE_ENV=production
```

**Important**: 
- `CLIENT_ORIGIN` must include your Vercel URL
- No trailing slashes
- Comma-separated for multiple origins

### Step 3: Test Session Flow

1. **Clear Browser Data** (Important!)
   - Open DevTools (F12)
   - Go to Application tab → Cookies
   - Delete all cookies for your site
   - Or use Incognito/Private window

2. **Test Login**
   - Go to your Vercel URL
   - Log in with credentials
   - Check browser console - should see "Auth success"
   - Check Network tab - verify cookie `finvest.sid` is set

3. **Test Dashboard**
   - Should see dashboard after login
   - Check Network tab for `/pitch/my-pitches` request
   - Should return 200 OK (not 401)

4. **Test Pitch Submission**
   - Generate a pitch
   - Submit it
   - Should succeed without "Please log in" error

## Debugging Session Issues

### Check Backend Logs (Render)
1. Go to Render Dashboard → Your Backend → Logs
2. Look for "Session state" or "Session check" messages
3. Should see:
   ```
   Session state: { hasSession: true, hasUserId: true, hasUser: true }
   ```

### Check Browser Cookies
1. Open DevTools (F12) → Application tab → Cookies
2. Look for cookie named `finvest.sid`
3. Should have:
   - **Domain**: Your backend domain (e.g., `.onrender.com`)
   - **Path**: `/`
   - **HttpOnly**: ✓ (checked)
   - **Secure**: ✓ (if HTTPS)
   - **SameSite**: Lax

### Check Network Requests
1. Open DevTools → Network tab
2. Filter by "Fetch/XHR"
3. Check requests to `/auth/me`, `/pitch/my-pitches`, etc.
4. Look at Request Headers:
   - Should include `Cookie: finvest.sid=...`
5. Look at Response Headers:
   - Should include `Set-Cookie: finvest.sid=...` (on login)

## Common Issues & Solutions

### Issue: Still getting "Please log in" errors
**Solutions**:
1. Clear browser cookies and try again
2. Check `CLIENT_ORIGIN` includes your Vercel URL
3. Verify backend is redeployed with latest code
4. Check browser console for CORS errors
5. Verify `VITE_API_BASE` is set correctly in Vercel

### Issue: Cookie not being set
**Solutions**:
1. Check CORS configuration in backend
2. Verify `CLIENT_ORIGIN` matches your frontend URL exactly
3. Check if using HTTPS (required for secure cookies in production)
4. Try in Incognito mode to rule out browser extensions

### Issue: Session works in one browser but not another
**Solutions**:
1. Clear cookies in the problematic browser
2. Check browser settings (cookies enabled?)
3. Try different browser to isolate issue

### Issue: Works locally but not in production
**Solutions**:
1. Verify `NODE_ENV=production` in Render
2. Check `CLIENT_ORIGIN` includes production URL
3. Verify `VITE_API_BASE` is set in Vercel
4. Check that both frontend and backend are using HTTPS

## Testing Checklist

After deploying, test:

- [ ] Can log in successfully
- [ ] Dashboard loads after login
- [ ] Can see "My Loan Requests" (borrower) or "Active Loan Requests" (investor)
- [ ] Can generate a pitch
- [ ] Can submit a pitch
- [ ] Session persists after page refresh
- [ ] Can log out successfully
- [ ] After logout, can't access protected routes

## Technical Details

### Session Cookie Configuration
```javascript
{
  name: 'finvest.sid',
  maxAge: 24 hours,
  sameSite: 'lax',  // Allows cross-site requests
  secure: true,     // Only in production HTTPS
  httpOnly: true   // Prevents JS access
}
```

### Session Flow
1. User logs in → Backend creates session → Sets cookie
2. Browser stores cookie → Sends with subsequent requests
3. Backend middleware (`attachUser`) → Populates `req.session.user`
4. Routes check `req.session.user` → Allow/deny access

### Why `sameSite: 'lax'`?
- Allows cookies to be sent with cross-site GET requests
- Required for Vercel (frontend) → Render (backend) setup
- More secure than `none` but works with cross-origin

## Next Steps

1. **Deploy the changes** to both frontend and backend
2. **Test thoroughly** using the checklist above
3. **Monitor logs** for any session-related errors
4. **Update users** if they need to log in again (cookies will be reset)

## Support

If issues persist:
1. Check Render backend logs for errors
2. Check browser console for errors
3. Check Network tab for failed requests
4. Verify all environment variables are set correctly
5. Try clearing all cookies and testing in Incognito mode

