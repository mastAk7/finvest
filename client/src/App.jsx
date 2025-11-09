import React, { useState, useEffect } from "react";
import "./App.css";
import GoogleSignIn from './components/GoogleSignIn';
import { useToast } from './components/Toast.jsx';

function App() {
  const [screen, setScreen] = useState("landing"); // landing | mode | details | dashboard
  const [mode, setMode] = useState(null); // "investor" | "borrower" | null
  const [user, setUser] = useState({ name: "", age: "", phone: "" });
  const [errors, setErrors] = useState({});
  const [account, setAccount] = useState(null); // { id, email, name, accountType }
  const toast = useToast();

  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

  useEffect(() => {
    // check current session
    (async function () {
      try {
        // Validate API_BASE is set correctly
        if (!API_BASE || API_BASE === 'http://localhost:3000') {
          console.warn('API_BASE not configured. Using default localhost. This will fail in production.');
        }
        
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        try {
          const r = await fetch(API_BASE + '/auth/me', { 
            credentials: 'include',
            headers: {
              'Accept': 'application/json'
            },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (!r.ok) {
            // If 401/403, user is not logged in - this is fine
            if (r.status === 401 || r.status === 403) {
              setAccount(null);
              setScreen("landing");
              setMode(null);
              return;
            }
            throw new Error(`Session check failed: ${r.status} ${r.statusText}`);
          }
          
          const data = await r.json();
          if (data?.user) {
            setAccount(data.user);
            if (data.user.accountType) {
              setMode(data.user.accountType);
              setScreen('dashboard');
            }
            // Update user data if available
            if (data.user.name || data.user.age || data.user.phone) {
              setUser(prev => ({
                ...prev,
                name: data.user.name || prev.name,
                age: data.user.age || prev.age,
                phone: data.user.phone || prev.phone
              }));
            }
          } else {
            // No user in response - not logged in
            setAccount(null);
            setScreen("landing");
            setMode(null);
          }
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (err) {
        // Only log error if it's not a network/CORS issue that we can handle gracefully
        if (err.name === 'AbortError') {
          console.warn('Session check timed out. User may not be logged in.');
        } else if (err.message?.includes('Failed to fetch') || err.message?.includes('CORS')) {
          console.warn('Session check failed - API may not be reachable. Check VITE_API_BASE environment variable.');
          console.warn('Current API_BASE:', API_BASE);
        } else {
          console.warn('Session check failed:', err);
        }
        // Reset states on session error - user is not logged in
        setAccount(null);
        setScreen("landing");
        setMode(null);
      }
    })();
  }, [API_BASE]);

  const handleTryFinvest = () => {
    setScreen("mode");
  };

  const handleChooseMode = (selectedMode) => {
    if (account) {
      // If already logged in, update mode and stay in dashboard
      setMode(selectedMode);
      return;
    }
    setMode(selectedMode);
    setScreen("details");
  };

  const handleChange = (e) => {
    setUser({
      ...user,
      [e.target.name]: e.target.value,
    });
  };

  const validate = () => {
    const newErrors = {};
    if (!user.name.trim()) newErrors.name = "Please enter your full name.";
    if (!user.age) newErrors.age = "Please enter your age.";
    else if (Number(user.age) < 18) newErrors.age = "You must be at least 18.";
    if (!user.phone.trim()) newErrors.phone = "Please enter your mobile number.";
    else if (!/^[0-9]{10}$/.test(user.phone.trim())) {
      newErrors.phone = "Mobile number should be 10 digits.";
    }
    return newErrors;
  };

  const handleAuthSuccess = (data) => {
    if (!data) {
      console.error('No data received in handleAuthSuccess');
      return;
    }
    // Update account state with user data
    setAccount(data);
    
    // Update user details if provided
    setUser(prev => ({ 
      ...prev, 
      name: data.name || prev.name,
      age: data.age || prev.age,
      phone: data.phone || prev.phone
    }));

    // Set mode if provided and not already set
    if (data.accountType && !mode) {
      setMode(data.accountType);
    }

    // Move to dashboard
    setScreen("dashboard");
    
    console.log('Auth success - Updated states:', {
      account: data,
      mode: data.accountType || mode,
      screen: 'dashboard'
    });
  };

  const handleLogout = async () => {
    try {
      const response = await fetch(API_BASE + '/auth/logout', { 
        method: 'POST', 
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Logout failed');
      }
    } catch (e) {
      console.warn('Logout error:', e);
    } finally {
      // Reset all states regardless of logout API success
      setAccount(null);
      setScreen("landing");
      setMode(null);
      setUser({ name: "", age: "", phone: "" });
      setErrors({});
      
      console.log('Logged out - States reset');
    }
  };

  const resetFlow = () => {
    setScreen("landing");
    setMode(null);
    setUser({ name: "", age: "", phone: "" });
    setErrors({});
  };

  return (
    <div className="app-root">
      <TopBar
        onLogoClick={handleLogout}
        account={account}
      />

      <main className="app-main">
        {/* If user is logged in, only show dashboard */}
        {account ? (
          <Dashboard 
            mode={mode} 
            user={user} 
            account={account} 
            onBack={handleLogout}  // Changed from resetFlow to handleLogout for logged-in users
          />
        ) : (
          <>
            {screen === "landing" && <Landing onTry={handleTryFinvest} />}
            {screen === "mode" && (
              <ModeSelection
                onSelect={handleChooseMode}
                onBack={() => setScreen("landing")}
              />
            )}
            {screen === "details" && (
              <DetailsForm
                mode={mode}
                user={user}
                onChange={handleChange}
                onAuthSuccess={handleAuthSuccess}
                onBack={() => setScreen("mode")}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

/* ----------------- Top Bar ----------------- */

function TopBar({ onLogoClick, account }) {
  return (
    <header className="topbar">
      <div className="topbar-left" onClick={onLogoClick}>
        <div className="logo-mark">₹</div>
        <div className="logo-text">
          <span className="logo-main">Finvest</span>
          <span className="logo-tagline">Invest. Borrow. Grow.</span>
        </div>
      </div>
      <div className="topbar-right">
        {account && (
          <div className="profile-pill">
            <span style={{ marginRight: '12px', color: '#666' }}>
              {account.name || account.email}
            </span>
            <button className="ghost-btn" onClick={onLogoClick}>
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

/* ----------------- Landing ----------------- */

function Landing({ onTry }) {
  return (
    <section className="landing">
      <div className="landing-content">
        <div className="landing-left">
          <h1>
            A smarter way to <span className="accent">invest</span> and{" "}
            <span className="accent">borrow</span>.
          </h1>
          <p>
            Finvest connects responsible borrowers with data-driven investors.
            Transparent returns, simple repayments, and a clean dashboard
            experience designed for both mobile and desktop.
          </p>
          <div className="landing-actions">
            <button className="primary-btn" onClick={onTry}>
              Try Finvest
            </button>
            <button
              className="ghost-btn"
              onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })}
            >
              Learn more
            </button>
          </div>
          <div className="landing-meta">
            <div>
              <strong>0%</strong>
              <span>Demo only, no real money</span>
            </div>
            <div>
              <strong>2 modes</strong>
              <span>Investor &amp; Borrower view</span>
            </div>
          </div>
        </div>

        <div className="landing-right">
          <div className="glass-card">
            <h3>Finvest snapshot</h3>
            <div className="stat-row">
              <span>Active Investors</span>
              <span className="stat-value">1,284</span>
            </div>
            <div className="stat-row">
              <span>Average ROI (demo)</span>
              <span className="stat-value positive">+10.4%</span>
            </div>
            <div className="stat-row">
              <span>On-time repayments</span>
              <span className="stat-value">96%</span>
            </div>
            <div className="sparkline">
              <div className="sparkline-pill" />
              <div className="sparkline-pill" />
              <div className="sparkline-pill" />
              <div className="sparkline-pill" />
              <div className="sparkline-pill" />
            </div>
            <p className="glass-caption">
              Visual dashboard preview — you’ll get a personalised version once you
              join as an investor or borrower.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
/* ----------------- Mode Selection ----------------- */

function ModeSelection({ onSelect, onBack }) {
  return (
    <section className="mode-section">
      <div className="flow-header">
        <button className="back-link" onClick={onBack}>
          ← Back
        </button>
        <div className="stepper">
          <div className="step active">1</div>
          <div className="step-line active" />
          <div className="step">2</div>
          <div className="step-line" />
          <div className="step">3</div>
        </div>
      </div>

      <h2 className="section-title">How do you want to use Finvest?</h2>
      <p className="section-subtitle">
        Choose a mode to continue. You can always come back and explore the other
        side later.
      </p>

      <div className="mode-grid">
        <div
          className="mode-card investor-card"
          onClick={() => onSelect("investor")}
        >
          <div className="pill">For Investors</div>
          <h3>Investor Mode</h3>
          <p>
            Track your deployed capital, expected returns, and portfolio risk from
            a single, clean dashboard.
          </p>
          <ul>
            <li>See total invested and projected returns</li>
            <li>View active loans and repayment status</li>
            <li>Monitor risk level at a glance</li>
          </ul>
          <button className="primary-btn small">Continue as Investor</button>
        </div>

        <div
          className="mode-card borrower-card"
          onClick={() => onSelect("borrower")}
        >
          <div className="pill pill-alt">For Borrowers</div>
          <h3>Borrower Mode</h3>
          <p>
            Keep EMIs, due dates, and outstanding balance simple and transparent —
            no spreadsheets needed.
          </p>
          <ul>
            <li>Check outstanding loan amount</li>
            <li>See upcoming EMI and due dates</li>
            <li>Build a clean repayment history</li>
          </ul>
          <button className="secondary-btn small">Continue as Borrower</button>
        </div>
      </div>
    </section>
  );
}

/* ----------------- Details / Verification ----------------- */

function DetailsForm({ mode, user, onChange, onAuthSuccess, onBack }) {
  const [isRegistering, setIsRegistering] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

  const validateForm = () => {
    if (isRegistering) {
      if (!user.name?.trim()) return "Please enter your full name";
      if (!user.age) return "Please enter your age";
      if (Number(user.age) < 18) return "You must be at least 18 years old";
      if (!user.phone?.trim()) return "Please enter your mobile number";
      if (!/^[0-9]{10}$/.test(user.phone.trim())) return "Mobile number should be 10 digits";
    }
    if (!email?.trim()) return "Please enter your email";
    if (!password?.trim()) return "Please enter your password";
    if (password.length < 6) return "Password must be at least 6 characters";
    return null;
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError(null);

    const validationError = validateForm();
    if (validationError) {
      setAuthError(validationError);
      return;
    }

    const endpoint = isRegistering ? '/auth/register' : '/auth/login';
    const body = {
      email: email.trim(),
      password: password.trim(),
      ...(isRegistering ? {
        name: user.name.trim(),
        accountType: mode,
        age: Number(user.age),
        phone: user.phone.trim()
      } : {})
    };

    try {
      console.log('Sending auth request:', { endpoint, body: { ...body, password: '***' } });
      const r = await fetch(API_BASE + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      });

      const data = await r.json();
      console.log('Auth response:', data);

      if (!r.ok) throw new Error(data.error || 'Authentication failed');
      onAuthSuccess(data);
    } catch (err) {
      console.error('Auth error:', err);
      setAuthError(err.message || 'Authentication failed. Please try again.');
    }
  };

  return (
    <section className="details-section">
      <div className="flow-header">
        <button className="back-link" onClick={onBack}>← Back</button>
      </div>
      <div className="details-layout">
        <div className="details-main">
          <h2 className="section-title">{mode === 'investor' ? 'Investor Account' : 'Borrower Account'}</h2>
          <p className="section-subtitle">{isRegistering ? 'Create your account to continue' : 'Sign in to your account'}</p>

          <div style={{ marginBottom: 20 }}>
            <GoogleSignIn onSuccess={(data) => onAuthSuccess({ ...data, accountType: mode })} />
            <div className="divider">or continue with email</div>
          </div>

          <form className="details-form" onSubmit={handleAuth}>
            {isRegistering && (
              <div className="form-row">
                <label>Full name
                  <input type="text" name="name" value={user.name} onChange={onChange} placeholder="e.g. Aman Verma" required />
                </label>
              </div>
            )}

            <div className="form-row">
              <label>Email
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </label>
            </div>

            <div className="form-row">
              <label>Password
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </label>
            </div>

            {isRegistering && (
              <div className="form-row form-row-grid">
                <label>Age
                  <input type="number" name="age" value={user.age} onChange={onChange} placeholder="21" />
                </label>
                <label>Mobile number
                  <input type="tel" name="phone" value={user.phone} onChange={onChange} placeholder="10-digit mobile" />
                </label>
              </div>
            )}

            {authError && <div className="error-text">{authError}</div>}

            <button 
              type="submit" 
              className="primary-btn wide"
              disabled={isLoading}
            >
              {isLoading ? 'Please wait...' : (isRegistering ? 'Create Account' : 'Sign In')}
            </button>

            <p className="auth-switch">
              {isRegistering ? 'Already have an account? ' : 'Need an account? '}
              <button 
                type="button" 
                className="text-btn" 
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setAuthError(null);
                  setEmail('');
                  setPassword('');
                }}
                disabled={isLoading}
              >
                {isRegistering ? 'Sign in' : 'Register'}
              </button>
            </p>
          </form>
        </div>
        <div className="details-sidecard">
          <h3>Why we ask for this</h3>
          <ul>
            <li>Personalize your dashboard experience</li>
            <li>Set up your {mode} profile securely</li>
            <li>Enable account recovery if needed</li>
          </ul>
          <p className="sidecard-footnote">Your data is encrypted and never shared.</p>
        </div>
      </div>
    </section>
  );
}

/* ----------------- Dashboard ----------------- */

function Dashboard({ mode, user, account, onBack }) {
  const isInvestor = mode === "investor";
  const greeting = isInvestor ? "Investor dashboard" : "Borrower dashboard";

  return (
    <section className="dash-section">
      <div className="flow-header">
        <div className="stepper">
          <div className="step complete">1</div>
          <div className="step-line complete" />
          <div className="step complete">2</div>
          <div className="step-line complete" />
          <div className="step active">3</div>
        </div>
      </div>

      <header className="dash-header">
        <div>
          <p className="dash-kicker">{greeting}</p>
          <h2>
            Welcome, <span className="accent">{(account && (account.name || account.email)) || user.name || "Guest"}</span>
          </h2>
        </div>
        <div className="dash-user-pill">
          <span className="dot" />
          <span className="role-label">
            {isInvestor ? "Investor mode" : "Borrower mode"}
          </span>
        </div>
      </header>

      <div className="dash-grid">
        {isInvestor ? <InvestorCards /> : (
          <>
            <BorrowerCards />
            <ActivityPanel isInvestor={isInvestor} />
          </>
        )}
      </div>
    </section>
  );
}

function InvestorCards() {
  const [pitches, setPitches] = useState([]);
  const [selectedPitch, setSelectedPitch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bids, setBids] = useState([]);
  const [bidLoading, setBidLoading] = useState(false);
  const [bidForm, setBidForm] = useState({
    principal: '',
    interestAnnualPct: '',
    tenureMonths: ''
  });
  const [submittingBid, setSubmittingBid] = useState(false);
  const toast = useToast();
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

  useEffect(() => {
    const fetchPitches = async () => {
      try {
        const response = await fetch(`${API_BASE}/pitch/list`, {
          credentials: 'include'
        });
        if (!response.ok) throw new Error('Failed to fetch pitches');
        const data = await response.json();
        setPitches(Array.isArray(data.pitches) ? data.pitches : []);
      } catch (err) {
        console.error('Error fetching pitches:', err);
        toast.error('Failed to load loan requests. Please refresh the page.');
        setPitches([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPitches();
  }, [API_BASE, toast]);

  useEffect(() => {
    if (selectedPitch) {
      fetchBids(selectedPitch._id);
    } else {
      setBids([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPitch]);

  const fetchBids = async (pitchId) => {
    setBidLoading(true);
    try {
      const response = await fetch(`${API_BASE}/bids/${pitchId}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch bids');
      const data = await response.json();
      setBids(Array.isArray(data.bids) ? data.bids : []);
    } catch (err) {
      console.error('Error fetching bids:', err);
      toast.error('Failed to load bids. Please try again.');
      setBids([]);
    } finally {
      setBidLoading(false);
    }
  };

  const handleBidSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPitch) return;

    // Check if there's already a final offer
    const hasFinalOffer = bids.some(bid => bid.isFinal);
    if (hasFinalOffer) {
      toast.warning('A final offer has already been sent for this pitch. Bidding is now closed.');
      return;
    }

    // Validate form inputs
    if (!bidForm.principal || !bidForm.interestAnnualPct || !bidForm.tenureMonths) {
      toast.error('Please fill in all bid fields.');
      return;
    }

    const principal = parseFloat(bidForm.principal);
    const interest = parseFloat(bidForm.interestAnnualPct);
    const tenure = parseInt(bidForm.tenureMonths);

    if (isNaN(principal) || principal <= 0) {
      toast.error('Please enter a valid principal amount.');
      return;
    }

    if (isNaN(interest) || interest < 0 || interest > 100) {
      toast.error('Please enter a valid interest rate (0-100%).');
      return;
    }

    if (isNaN(tenure) || tenure <= 0) {
      toast.error('Please enter a valid tenure in months.');
      return;
    }

    setSubmittingBid(true);
    try {
      const response = await fetch(`${API_BASE}/bids/${selectedPitch._id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          principal,
          interestAnnualPct: interest,
          tenureMonths: tenure
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit bid');
      }

      const data = await response.json();
      // Reset form and refresh bids
      setBidForm({ principal: '', interestAnnualPct: '', tenureMonths: '' });
      await fetchBids(selectedPitch._id);
      
      // Show success message
      if (data.message && data.message.includes('updated')) {
        toast.success('Bid updated successfully!');
      } else {
        toast.success('Bid submitted successfully!');
      }
    } catch (err) {
      console.error('Error submitting bid:', err);
      toast.error(err.message || 'Failed to submit bid. Please try again.');
    } finally {
      setSubmittingBid(false);
    }
  };

  const handleFinalBid = async (bidId) => {
    if (!window.confirm('Are you sure you want to send this offer to the borrower? This will close all other bids for this pitch.')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/bids/${bidId}/final`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send offer');
      }

      const data = await response.json();
      toast.success('Offer sent to borrower successfully! All other bids have been closed.');
      
      // Refresh bids to show updated status
      if (selectedPitch) {
        await fetchBids(selectedPitch._id);
      }
    } catch (err) {
      console.error('Error sending offer:', err);
      toast.error(err.message || 'Failed to send offer. Please try again.');
    }
  };

  return (
    <div className="investor-layout">
      {/* Left Column - Pitch List */}
      <div className="pitch-list-column">
        <div className="dash-card">
          <p className="card-label">Active Loan Requests</p>
          {loading ? (
            <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Loading pitches...</p>
          ) : pitches.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>No active loan requests at the moment.</p>
          ) : (
            <div style={{ marginTop: '1rem' }}>
              {pitches.map(pitch => (
                <div
                  key={pitch._id}
                  className={`pitch-card ${selectedPitch?._id === pitch._id ? 'selected' : ''}`}
                  style={{
                    padding: '1rem',
                    marginBottom: '1rem',
                    border: selectedPitch?._id === pitch._id ? '2px solid #3b82f6' : '1px solid rgba(51, 65, 85, 0.9)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    backgroundColor: selectedPitch?._id === pitch._id ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => setSelectedPitch(pitch)}
                >
                  <h4 style={{ color: 'var(--text-main)', margin: 0, marginBottom: '0.5rem' }}>
                    {pitch.extractedInfo.purpose || 'Loan Request'}
                  </h4>
                  <p style={{ margin: '0.5rem 0', fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                    {pitch.professionalPitch.substring(0, 100)}...
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <span>Amount: {pitch.extractedInfo.loanAmount}</span>
                    <span>Posted: {new Date(pitch.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Column - Details & Bids */}
      <div className="details-column">
        {selectedPitch ? (
          <div className="details-content">
            {/* Pitch & Borrower Details */}
            <div className="dash-card">
              <p className="card-label">Pitch Details</p>
              <div style={{ marginTop: '1rem' }}>
                <h4 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                  {selectedPitch.extractedInfo.purpose || 'Loan Request'}
                </h4>
                <p style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap', lineHeight: '1.6', color: 'var(--text-main)' }}>
                  {selectedPitch.professionalPitch}
                </p>
                
                <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px', border: '1px solid rgba(51, 65, 85, 0.5)' }}>
                  <h4 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>Borrower Details:</h4>
                  <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem', color: 'var(--text-main)' }}>
                    <li style={{ marginBottom: '0.5rem' }}>
                      <strong>Requested Amount:</strong> {selectedPitch.extractedInfo.loanAmount}
                    </li>
                    <li style={{ marginBottom: '0.5rem' }}>
                      <strong>Business Type:</strong> {selectedPitch.extractedInfo.businessType}
                    </li>
                    <li style={{ marginBottom: '0.5rem' }}>
                      <strong>Date Posted:</strong> {new Date(selectedPitch.createdAt).toLocaleDateString()}
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Bid Input Form */}
            <div className="dash-card">
              <p className="card-label">Set Your Bid</p>
              {bids.some(bid => bid.isFinal) && (
                <div style={{ 
                  marginTop: '0.5rem', 
                  padding: '0.75rem',
                  backgroundColor: 'rgba(251, 191, 36, 0.15)',
                  borderRadius: '6px',
                  border: '1px solid rgba(251, 191, 36, 0.3)',
                  marginBottom: '1rem'
                }}>
                  <p style={{ 
                    margin: 0, 
                    fontSize: '0.85rem', 
                    color: '#fde047',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span>⚠️</span>
                    <span>A final offer has been sent for this pitch. Bidding is now closed.</span>
                  </p>
                </div>
              )}
              <form onSubmit={handleBidSubmit} style={{ marginTop: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                      Principal Amount (₹)
                      <input
                        type="number"
                        value={bidForm.principal}
                        onChange={(e) => setBidForm({ ...bidForm, principal: e.target.value })}
                        placeholder="50000"
                        required
                        min="0"
                        style={{ 
                          width: '100%', 
                          padding: '0.75rem', 
                          marginTop: '0.5rem', 
                          borderRadius: '6px', 
                          border: '1px solid rgba(51, 65, 85, 0.9)',
                          fontSize: '0.9rem',
                          transition: 'all 0.2s ease',
                          backgroundColor: 'var(--bg-soft)',
                          color: 'var(--text-main)'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#3b82f6';
                          e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.2)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = 'rgba(51, 65, 85, 0.9)';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </label>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                      Interest Rate (%)
                      <input
                        type="number"
                        step="0.1"
                        value={bidForm.interestAnnualPct}
                        onChange={(e) => setBidForm({ ...bidForm, interestAnnualPct: e.target.value })}
                        placeholder="10.0"
                        required
                        min="0"
                        max="100"
                        style={{ 
                          width: '100%', 
                          padding: '0.75rem', 
                          marginTop: '0.5rem', 
                          borderRadius: '6px', 
                          border: '1px solid rgba(51, 65, 85, 0.9)',
                          fontSize: '0.9rem',
                          transition: 'all 0.2s ease',
                          backgroundColor: 'var(--bg-soft)',
                          color: 'var(--text-main)'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#3b82f6';
                          e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.2)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = 'rgba(51, 65, 85, 0.9)';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </label>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                      Tenure (Months)
                      <input
                        type="number"
                        value={bidForm.tenureMonths}
                        onChange={(e) => setBidForm({ ...bidForm, tenureMonths: e.target.value })}
                        placeholder="12"
                        required
                        min="1"
                        style={{ 
                          width: '100%', 
                          padding: '0.75rem', 
                          marginTop: '0.5rem', 
                          borderRadius: '6px', 
                          border: '1px solid rgba(51, 65, 85, 0.9)',
                          fontSize: '0.9rem',
                          transition: 'all 0.2s ease',
                          backgroundColor: 'var(--bg-soft)',
                          color: 'var(--text-main)'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#3b82f6';
                          e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.2)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = 'rgba(51, 65, 85, 0.9)';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </label>
                  </div>
                </div>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={submittingBid || bids.some(bid => bid.isFinal)}
                  style={{ 
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    borderRadius: '6px',
                    cursor: (submittingBid || bids.some(bid => bid.isFinal)) ? 'not-allowed' : 'pointer',
                    opacity: (submittingBid || bids.some(bid => bid.isFinal)) ? 0.7 : 1,
                    transition: 'all 0.2s ease'
                  }}
                >
                  {submittingBid ? 'Submitting...' : bids.some(bid => bid.isFinal) ? 'Bidding Closed' : 'Submit Bid'}
                </button>
              </form>
            </div>

            {/* All Bids List */}
            <div className="dash-card">
              <p className="card-label">All Bids (Sorted by Score)</p>
              {bidLoading ? (
                <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Loading bids...</p>
              ) : bids.length === 0 ? (
                <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>No bids yet. Be the first to bid!</p>
              ) : (
                <div style={{ marginTop: '1rem' }}>
                  {bids.map((bid, index) => {
                    const isBestOffer = index === 0 && bid.compositeScore !== undefined;
                    const isFinal = bid.isFinal;
                    
                    return (
                      <div
                        key={bid._id}
                        className="bid-card"
                        style={{
                          padding: '1.25rem',
                          marginBottom: '1rem',
                          border: isFinal ? '2px solid #3b82f6' : isBestOffer ? '2px solid #22c55e' : '1px solid rgba(51, 65, 85, 0.9)',
                          borderRadius: '8px',
                          backgroundColor: isFinal ? 'rgba(59, 130, 246, 0.15)' : isBestOffer ? 'rgba(34, 197, 94, 0.15)' : 'var(--bg-soft)',
                          boxShadow: isFinal || isBestOffer ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.2)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
                              {bid.investor?.name || bid.investor?.email || 'Unknown Investor'}
                            </strong>
                            {isFinal && (
                              <span style={{ 
                                padding: '0.25rem 0.6rem', 
                                backgroundColor: '#3b82f6', 
                                color: 'white', 
                                borderRadius: '12px', 
                                fontSize: '0.7rem',
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>
                                Final Offer
                              </span>
                            )}
                            {isBestOffer && !isFinal && (
                              <span style={{ 
                                padding: '0.25rem 0.6rem', 
                                backgroundColor: '#22c55e', 
                                color: 'white', 
                                borderRadius: '12px', 
                                fontSize: '0.7rem',
                                fontWeight: '600'
                              }}>
                                Best Offer
                              </span>
                            )}
                          </div>
                          {bid.compositeScore !== undefined && (
                            <div style={{ 
                              display: 'flex', 
                              flexDirection: 'column', 
                              alignItems: 'flex-end',
                              gap: '0.25rem'
                            }}>
                              <span style={{ 
                                fontSize: '0.75rem', 
                                color: 'var(--text-muted)',
                                fontWeight: '500'
                              }}>
                                Score
                              </span>
                              <span style={{ 
                                fontSize: '1rem', 
                                color: isBestOffer ? '#22c55e' : 'var(--text-main)',
                                fontWeight: '700'
                              }}>
                                {bid.compositeScore.toFixed(3)}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(3, 1fr)', 
                          gap: '1rem', 
                          marginTop: '0.75rem',
                          padding: '0.75rem',
                          backgroundColor: 'rgba(255, 255, 255, 0.03)',
                          borderRadius: '6px',
                          border: '1px solid rgba(51, 65, 85, 0.5)'
                        }}>
                          <div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Principal
                            </div>
                            <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-main)' }}>
                              ₹{bid.principal?.toLocaleString('en-IN')}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Interest
                            </div>
                            <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-main)' }}>
                              {bid.interestAnnualPct}%
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Tenure
                            </div>
                            <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-main)' }}>
                              {bid.tenureMonths} months
                            </div>
                          </div>
                        </div>
                        
                        {!isFinal && (
                          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                              className="primary-btn"
                              onClick={() => handleFinalBid(bid._id)}
                              disabled={bids.some(b => b.isFinal && b._id !== bid._id)}
                              style={{ 
                                padding: '0.6rem 1.5rem', 
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                borderRadius: '6px',
                                cursor: bids.some(b => b.isFinal && b._id !== bid._id) ? 'not-allowed' : 'pointer',
                                opacity: bids.some(b => b.isFinal && b._id !== bid._id) ? 0.5 : 1,
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                if (!bids.some(b => b.isFinal && b._id !== bid._id)) {
                                  e.target.style.transform = 'translateY(-1px)';
                                  e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = 'none';
                              }}
                            >
                              {bids.some(b => b.isFinal && b._id !== bid._id) ? 'Bidding Closed' : 'Send Final Offer'}
                            </button>
                          </div>
                        )}
                        {isFinal && (
                          <div style={{ 
                            marginTop: '1rem', 
                            padding: '0.75rem',
                            backgroundColor: 'rgba(59, 130, 246, 0.15)',
                            borderRadius: '6px',
                            border: '1px solid rgba(59, 130, 246, 0.3)'
                          }}>
                            <p style={{ 
                              margin: 0, 
                              fontSize: '0.85rem', 
                              color: '#93c5fd',
                              fontWeight: '500',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem'
                            }}>
                              <span>✓</span>
                              <span>This offer has been sent to the borrower. Awaiting response.</span>
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="dash-card">
            <p className="card-label">Select a Pitch</p>
            <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>
              Click on a loan request from the left to view details and place bids.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function BorrowerCards() {
  const [slangText, setSlangText] = useState('');
  const [loading, setLoading] = useState(false);
  const [pitch, setPitch] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [myPitches, setMyPitches] = useState([]);
  const [loadingPitches, setLoadingPitches] = useState(false);
  const [selectedPitch, setSelectedPitch] = useState(null);
  const toast = useToast();
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

  useEffect(() => {
    fetchMyPitches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_BASE]);

  const fetchMyPitches = async () => {
    setLoadingPitches(true);
    try {
      const response = await fetch(`${API_BASE}/pitch/my-pitches`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          // Session expired - user needs to log in again
          toast.error('Session expired. Please log in again.');
          // Trigger logout to reset state
          setAccount(null);
          setScreen("landing");
          setMode(null);
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch pitches');
      }
      
      const data = await response.json();
      setMyPitches(Array.isArray(data.pitches) ? data.pitches : []);
    } catch (err) {
      console.error('Error fetching pitches:', err);
      if (err.message?.includes('Session expired') || err.message?.includes('log in')) {
        toast.error('Please log in again to view your loan requests.');
      } else {
        toast.error('Failed to load your loan requests. Please refresh the page.');
      }
      setMyPitches([]);
    } finally {
      setLoadingPitches(false);
    }
  };

  const handleGeneratePitch = async (e) => {
    e.preventDefault();
    if (!slangText.trim()) {
      toast.warning('Please enter your loan requirement description.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/pitch/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ slangText: slangText.trim() }),
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate pitch');
      }
      const data = await response.json();
      setPitch(data);
      setShowConfirm(true);
      toast.success('Pitch generated successfully! Review and submit.');
    } catch (err) {
      console.error('Pitch generation error:', err);
      toast.error(err.message || 'Failed to generate pitch. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPitch = async () => {
    try {
      const response = await fetch(`${API_BASE}/pitch/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pitch),
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to submit pitch');
      
      // Clear the form and hide confirmation
      setSlangText('');
      setPitch(null);
      setShowConfirm(false);
      
      // You might want to show a success message
    } catch (err) {
      console.error('Pitch submission error:', err);
      // You might want to show an error message
    }
  };

  return (
    <div className="borrower-layout">
      {/* Left Column - Create New Pitch */}
      <div className="pitch-list-column">
        <div className="dash-card">
          <p className="card-label">Create New Loan Request</p>
          <form onSubmit={handleGeneratePitch} style={{ marginTop: '1rem' }}>
            <textarea
              value={slangText}
              onChange={(e) => setSlangText(e.target.value)}
              placeholder="Describe your loan requirement in your own words..."
              style={{
                width: '100%',
                minHeight: '120px',
                padding: '0.75rem',
                marginBottom: '1rem',
                borderRadius: '6px',
                border: '1px solid rgba(51, 65, 85, 0.9)',
                fontSize: '0.9rem',
                fontFamily: 'inherit',
                resize: 'vertical',
                transition: 'all 0.2s ease',
                backgroundColor: 'var(--bg-soft)',
                color: 'var(--text-main)'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#3b82f6';
                e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.2)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(51, 65, 85, 0.9)';
                e.target.style.boxShadow = 'none';
              }}
            />
            <button
              type="submit"
              className="primary-btn"
              disabled={loading || !slangText.trim()}
              style={{ width: '100%' }}
            >
              {loading ? 'Generating...' : 'Generate Professional Pitch'}
            </button>
          </form>
        </div>

        {showConfirm && pitch && (
          <div className="dash-card" style={{ marginTop: '1rem' }}>
            <p className="card-label">Generated Pitch</p>
            <div style={{ marginTop: '1rem' }}>
              <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-main)' }}>Professional Version:</h4>
              <p style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap', lineHeight: '1.6', color: 'var(--text-main)' }}>
                {pitch.professional_pitch}
              </p>
              
              {pitch.extracted_info && (
                <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px', border: '1px solid rgba(51, 65, 85, 0.5)' }}>
                  <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-main)' }}>Key Details:</h4>
                  <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem', color: 'var(--text-main)' }}>
                    {pitch.extracted_info.loan_amount && (
                      <li style={{ marginBottom: '0.5rem' }}>Amount: <strong>{pitch.extracted_info.loan_amount}</strong></li>
                    )}
                    {pitch.extracted_info.purpose && (
                      <li style={{ marginBottom: '0.5rem' }}>Purpose: <strong>{pitch.extracted_info.purpose}</strong></li>
                    )}
                    {pitch.extracted_info.business_type && (
                      <li style={{ marginBottom: '0.5rem' }}>Business Type: <strong>{pitch.extracted_info.business_type}</strong></li>
                    )}
                  </ul>
                </div>
              )}

              <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                <button 
                  className="primary-btn" 
                  onClick={async () => {
                    try {
                      const response = await fetch(`${API_BASE}/pitch/submit`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Accept': 'application/json'
                        },
                        credentials: 'include',
                        body: JSON.stringify({
                          professionalPitch: pitch.professional_pitch,
                          originalText: slangText,
                          extractedInfo: pitch.extracted_info
                        })
                      });

                      if (!response.ok) {
                        if (response.status === 401) {
                          // Session expired
                          toast.error('Session expired. Please log in again.');
                          setAccount(null);
                          setScreen("landing");
                          setMode(null);
                          return;
                        }
                        const error = await response.json().catch(() => ({}));
                        throw new Error(error.error || 'Failed to submit pitch');
                      }

                      // Clear form and show success
                      setPitch(null);
                      setShowConfirm(false);
                      setSlangText('');
                      toast.success('Pitch submitted successfully!');
                      // Refresh pitches list
                      await fetchMyPitches();

                    } catch (err) {
                      console.error('Error submitting pitch:', err);
                      toast.error(err.message || 'Failed to submit pitch. Please try again.');
                    }
                  }}
                >
                  Submit Pitch
                </button>
                <button 
                  className="ghost-btn"
                  onClick={() => {
                    setPitch(null);
                    setShowConfirm(false);
                  }}
                >
                  Start Over
                </button>
              </div>
            </div>
          </div>
        )}

        {/* My Pitches List */}
        <div className="dash-card" style={{ marginTop: '1rem' }}>
          <p className="card-label">My Loan Requests</p>
          {loadingPitches ? (
            <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Loading your pitches...</p>
          ) : myPitches.length === 0 ? (
            <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>You haven't created any loan requests yet.</p>
          ) : (
            <div style={{ marginTop: '1rem' }}>
              {myPitches.map(p => (
                <div
                  key={p._id}
                  className={`pitch-card ${selectedPitch?._id === p._id ? 'selected' : ''}`}
                  style={{
                    padding: '1rem',
                    marginBottom: '1rem',
                    border: selectedPitch?._id === p._id ? '2px solid #3b82f6' : '1px solid rgba(51, 65, 85, 0.9)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    backgroundColor: selectedPitch?._id === p._id ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-soft)',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => setSelectedPitch(p)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-main)' }}>
                      {p.extractedInfo?.purpose || 'Loan Request'}
                    </h4>
                    <span style={{
                      padding: '0.25rem 0.6rem',
                      borderRadius: '12px',
                      fontSize: '0.7rem',
                      fontWeight: '600',
                      backgroundColor: p.status === 'offer_sent' ? 'rgba(59, 130, 246, 0.2)' : p.status === 'approved' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(251, 191, 36, 0.2)',
                      color: p.status === 'offer_sent' ? '#93c5fd' : p.status === 'approved' ? '#86efac' : '#fde047'
                    }}>
                      {p.status === 'offer_sent' ? 'Offer Received' : p.status === 'approved' ? 'Approved' : 'Pending'}
                    </span>
                  </div>
                  <p style={{ margin: '0.5rem 0', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                    {p.professionalPitch.substring(0, 120)}...
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span>Amount: {p.extractedInfo?.loanAmount || 'N/A'}</span>
                    <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Column - Pitch Details & Final Offer */}
      <div className="details-column">
        {selectedPitch ? (
          <div className="details-content">
            {/* Pitch Details */}
            <div className="dash-card">
              <p className="card-label">Pitch Details</p>
              <div style={{ marginTop: '1rem' }}>
                <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-main)' }}>
                  {selectedPitch.extractedInfo?.purpose || 'Loan Request'}
                </h4>
                <p style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap', lineHeight: '1.6', color: 'var(--text-main)' }}>
                  {selectedPitch.professionalPitch}
                </p>
                
                <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px', border: '1px solid rgba(51, 65, 85, 0.5)' }}>
                  <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-main)' }}>Request Details:</h4>
                  <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem', color: 'var(--text-main)' }}>
                    <li style={{ marginBottom: '0.5rem' }}>
                      <strong>Requested Amount:</strong> {selectedPitch.extractedInfo?.loanAmount || 'Not specified'}
                    </li>
                    <li style={{ marginBottom: '0.5rem' }}>
                      <strong>Business Type:</strong> {selectedPitch.extractedInfo?.businessType || 'Not specified'}
                    </li>
                    <li style={{ marginBottom: '0.5rem' }}>
                      <strong>Date Posted:</strong> {new Date(selectedPitch.createdAt).toLocaleDateString()}
                    </li>
                    <li style={{ marginBottom: '0.5rem' }}>
                      <strong>Status:</strong> 
                      <span style={{
                        marginLeft: '0.5rem',
                        padding: '0.25rem 0.6rem',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        backgroundColor: selectedPitch.status === 'offer_sent' ? 'rgba(59, 130, 246, 0.2)' : selectedPitch.status === 'approved' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(251, 191, 36, 0.2)',
                        color: selectedPitch.status === 'offer_sent' ? '#93c5fd' : selectedPitch.status === 'approved' ? '#86efac' : '#fde047'
                      }}>
                        {selectedPitch.status === 'offer_sent' ? 'Offer Received' : selectedPitch.status === 'approved' ? 'Approved' : 'Pending'}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Final Offer Display */}
            {selectedPitch.finalOffer && selectedPitch.status === 'offer_sent' && (
              <div className="dash-card" style={{ 
                border: '2px solid #3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.15)'
              }}>
                <p className="card-label">Final Offer Received</p>
                <div style={{ marginTop: '1rem' }}>
                  <div style={{
                    padding: '1rem',
                    backgroundColor: 'var(--bg-soft)',
                    borderRadius: '6px',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    marginBottom: '1rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                      <div>
                        <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>
                          Investor: {selectedPitch.finalOffer.investor?.name || selectedPitch.finalOffer.investor?.email || 'Unknown'}
                        </strong>
                        <span style={{
                          marginLeft: '0.75rem',
                          padding: '0.25rem 0.6rem',
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          borderRadius: '12px',
                          fontSize: '0.7rem',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Final Offer
                        </span>
                      </div>
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '1rem',
                      padding: '1rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '6px',
                      border: '1px solid rgba(51, 65, 85, 0.5)'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Principal
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-main)' }}>
                          ₹{selectedPitch.finalOffer.principal?.toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Interest Rate
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-main)' }}>
                          {selectedPitch.finalOffer.interestAnnualPct}%
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Tenure
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-main)' }}>
                          {selectedPitch.finalOffer.tenureMonths} months
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'rgba(59, 130, 246, 0.15)', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                      <p style={{ 
                        margin: 0, 
                        fontSize: '0.85rem', 
                        color: '#93c5fd',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        💡 This is the final offer from the investor. You can accept or reject it.
                      </p>
                    </div>

                    <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                      <button
                        className="primary-btn"
                        onClick={async () => {
                          if (!window.confirm('Are you sure you want to accept this offer?')) return;
                          try {
                            const response = await fetch(`${API_BASE}/bids/${selectedPitch.finalOffer._id}/accept`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              credentials: 'include'
                            });
                            if (!response.ok) {
                              const error = await response.json();
                              throw new Error(error.error || 'Failed to accept offer');
                            }
                            toast.success('Offer accepted successfully!');
                            // Refresh pitches and update selected pitch
                            const updatedResponse = await fetch(`${API_BASE}/pitch/my-pitches`, {
                              credentials: 'include'
                            });
                            if (updatedResponse.ok) {
                              const updatedData = await updatedResponse.json();
                              setMyPitches(Array.isArray(updatedData.pitches) ? updatedData.pitches : []);
                              // Update selected pitch with latest data
                              if (updatedData.pitches) {
                                const updated = updatedData.pitches.find(p => p._id === selectedPitch._id);
                                if (updated) {
                                  setSelectedPitch(updated);
                                }
                              }
                            }
                          } catch (err) {
                            console.error('Error accepting offer:', err);
                            toast.error(err.message || 'Failed to accept offer. Please try again.');
                          }
                        }}
                        style={{ flex: 1 }}
                      >
                        Accept Offer
                      </button>
                      <button
                        className="ghost-btn"
                        onClick={() => setSelectedPitch(null)}
                        style={{ flex: 1 }}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedPitch.status !== 'offer_sent' && (
              <div className="dash-card">
                <p className="card-label">Offer Status</p>
                <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px', border: '1px solid rgba(51, 65, 85, 0.5)' }}>
                  <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                    {selectedPitch.status === 'pending' 
                      ? '⏳ Waiting for investors to place bids. Check back later!'
                      : selectedPitch.status === 'approved'
                      ? '✅ This pitch has been approved.'
                      : 'No offers received yet.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="dash-card">
            <p className="card-label">Select a Pitch</p>
            <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>
              Click on a loan request from the left to view details and check for offers.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityPanel({ isInvestor }) {
  return (
    <div className="activity-panel">
      <h3>Recent activity (demo)</h3>
      <ul>
        {isInvestor ? (
          <>
            <li>
              Matched with borrower <strong>#A104</strong> • ₹25,000 at 11.5%
            </li>
            <li>
              EMI received from <strong>#B212</strong> • ₹3,200 credited
            </li>
            <li>Portfolio risk score updated • Moderate</li>
          </>
        ) : (
          <>
            <li>
              EMI of <strong>₹7,500</strong> scheduled for 12 Nov 2025
            </li>
            <li>
              Repayment received • <strong>₹4,000</strong> on 02 Nov 2025
            </li>
            <li>Credit score hint • Slightly improved this month</li>
          </>
        )}
      </ul>
      <p className="activity-footnote">
        Hook this panel to your MongoDB/Express backend to show live data.
      </p>
    </div>
  );
}

export default App;
