import { useEffect, useRef } from 'react';

// A small wrapper to render Google's One Tap / button and forward the id token
// to the backend. Expects Vite env var VITE_GOOGLE_CLIENT_ID to be present.
export default function GoogleSignIn({ onSuccess, theme = 'outline', size = 'large' }) {
  const btnRef = useRef(null);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.warn('VITE_GOOGLE_CLIENT_ID not set; Google Sign-in will not work.');
      return;
    }

    if (!window.google || !window.google.accounts || !window.google.accounts.id) {
      console.warn('Google Identity SDK not loaded');
      return;
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response) => {
        // response.credential is the ID token
        const idToken = response.credential;
        try {
          const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:3000';
          const r = await fetch(apiBase + '/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ idToken })
          });
          const data = await r.json();
          if (!r.ok) throw data;
          onSuccess && onSuccess(data);
        } catch (err) {
          console.error('Google sign-in failed', err);
        }
      }
    });

    // render the button into our placeholder
    try {
      window.google.accounts.id.renderButton(btnRef.current, {
        theme,
        size
      });
    } catch (err) {
      // ignore if render fails
    }

    // Optional: prompt() could be used to show One Tap automatically
  }, [onSuccess, theme, size]);

  return <div ref={btnRef} />;
}
