import bcrypt from 'bcrypt';
import User from '../models/User.js';
import { OAuth2Client } from 'google-auth-library';

const SALT_ROUNDS = 10;

export async function register(req, res) {
  try {
    const { email, password, name, accountType, age, phone } = req.body;
    if (!email || !password || !accountType) {
      return res.status(400).json({ error: 'Email, password, and account type (investor/borrower) required' });
    }
    if (accountType !== 'investor' && accountType !== 'borrower') {
      return res.status(400).json({ error: 'Account type must be investor or borrower' });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'User already exists' });

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = new User({ 
      email, 
      password: hash, 
      name,
      accountType,
      age: age ? Number(age) : undefined,
      phone,
      provider: 'local' 
    });
    await user.save();

    // create session
    req.session.userId = user._id;
    req.session.user = user;
    res.json({ 
      id: user._id, 
      email: user.email, 
      name: user.name,
      accountType: user.accountType 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'invalid credentials' });

    req.session.userId = user._id;
    req.session.user = user;
    res.json({ 
      id: user._id, 
      email: user.email, 
      name: user.name,
      accountType: user.accountType 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
}

export async function logout(req, res) {
  req.session.destroy(err => {
    if (err) {
      console.error('session destroy', err);
      return res.status(500).json({ error: 'could not log out' });
    }
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
}

export async function currentUser(req, res) {
  try {
    if (!req.session?.userId) return res.status(200).json({ user: null });
    const user = await User.findById(req.session.userId).select('-password');
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
}

export function makeGoogleVerifier(clientId) {
  const client = new OAuth2Client(clientId);

  return async function googleAuth(req, res) {
    try {
      const { idToken } = req.body;
      if (!idToken) return res.status(400).json({ error: 'idToken required' });

      const ticket = await client.verifyIdToken({ idToken, audience: clientId });
      const payload = ticket.getPayload();
      const email = payload.email;
      const name = payload.name;
      const { accountType } = req.body; // require account type even for Google sign-in

      if (!accountType || (accountType !== 'investor' && accountType !== 'borrower')) {
        return res.status(400).json({ error: 'Account type must be investor or borrower' });
      }

      let user = await User.findOne({ email });
      if (!user) {
        user = new User({ 
          email, 
          name, 
          accountType,
          password: 'google', 
          provider: 'google' 
        });
        await user.save();
      }

      // create session
      req.session.userId = user._id;
      res.json({ id: user._id, email: user.email, name: user.name });
    } catch (err) {
      console.error('google auth error', err);
      res.status(401).json({ error: 'invalid Google token' });
    }
  };
}
