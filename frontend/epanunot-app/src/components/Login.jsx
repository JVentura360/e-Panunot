import { useState } from 'react';

const ALLOWED = ['@udd.edu.ph', '@cdd.edu.ph'];
const isAllowed = (email) => ALLOWED.some((d) => email.toLowerCase().endsWith(d));

// Demo accounts so you can preview each role. Remove once Laravel returns the real role.
const DEMO = [
  { name: 'Busseng Kanin', email: 'busseng.kanin@udd.edu.ph', role: 'Student', block: '31-ITE-04' },
  { name: 'Marco Santos', email: 'marco.santos@cdd.edu.ph', role: 'mayor', block: '31-ITE-04' },
  { name: 'Admin Office', email: 'admin@udd.edu.ph', role: 'admin', block: '-' },
];

const GoogleG = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z"/>
    <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-2.9-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z"/>
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2 1.4-4.9 2.3-8.5 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/>
  </svg>
);

export default function Login({ onLogin }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Mock sign-in. Swap for @react-oauth/google, then POST the credential to Laravel.
  // Always re-check the email domain on the backend too, never trust the client alone.
  const signIn = (account) => {
    setError('');
    if (!isAllowed(account.email)) {
      setError('Use your school account ending in @udd.edu.ph or @cdd.edu.ph.');
      return;
    }
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin(account); }, 600);
  };

  return (
    <main className="login">
      <section className="login-hero">
        <div className="brand">e<b>Panunot</b></div>
        <div>
          <h1>Walang Kanin Mayor?</h1>
          <p>'Gang Kaibigan lang Talaga Kayo Sir.</p>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <h2>Sign in</h2>
          <p>Use your UDD or CDD school Google account.</p>

          <button className="gbtn" disabled={loading} onClick={() => signIn(DEMO[0])}>
            <GoogleG /> {loading ? 'Signing in...' : 'Continue with Google'}
          </button>

          {error && <div className="error" role="alert">{error}</div>}

          <div className="demo">
            Prototype shortcuts
            <div className="demo-row">
              {DEMO.map((d) => (
                <button key={d.role} className="chip" onClick={() => signIn(d)}>Sign in as {d.role}</button>
              ))}
              <button className="chip" onClick={() => signIn({ name: 'Test', email: 'test@gmail.com', role: 'student' })}>
                Try a non-school email
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}