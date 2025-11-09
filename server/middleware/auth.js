import User from '../models/User.js';

export async function attachUser(req, res, next) {
    try {
        // Debug session state
        if (process.env.NODE_ENV === 'development') {
            console.log('Session state:', {
                hasSession: !!req.session,
                sessionID: req.sessionID,
                hasUserId: !!req.session?.userId,
                hasUser: !!req.session?.user,
                cookies: Object.keys(req.cookies || {})
            });
        }

        // If we have a userId but no user object, fetch it
        if (req.session?.userId && !req.session?.user) {
            const user = await User.findById(req.session.userId).select('-password');
            if (user) {
                req.session.user = user;
            } else {
                // User was deleted, clear session
                req.session.userId = null;
            }
        }
        
        // If we already have a user object, ensure it's up to date
        if (req.session?.user && req.session?.userId) {
            // Optionally refresh user data (or skip for performance)
            // For now, we'll trust the cached user object
        }
        
        next();
    } catch (err) {
        console.error('Error attaching user:', err);
        // Don't block the request, just continue without user
        next();
    }
}
}