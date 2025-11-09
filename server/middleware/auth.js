import User from '../models/User.js';

export async function attachUser(req, res, next) {
    try {
        if (req.session?.userId) {
            const user = await User.findById(req.session.userId).select('-password');
            if (user) {
                req.session.user = user;
            }
        }
        next();
    } catch (err) {
        console.error('Error attaching user:', err);
        next();
    }
}