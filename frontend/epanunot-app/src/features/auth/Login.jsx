import { useState } from 'react';
import { demoAccounts } from '../../data/mockData';
import styles from './Login.module.css';

const ALLOWED = ['@udd.edu.ph', '@cdd.edu.ph'];
const isAllowed = (email) => ALLOWED.some((d) => email.toLowerCase().endsWith(d));

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
        <main className={styles.login}>
        <section className={styles.hero}>
            <div className={styles.brand}>e<b>Panunot</b></div>
            <div>
            <h1>Walang Kanin Busseng?</h1>
            <p>Pwede na mangarap.</p>
            </div>
        </section>

        <section className={styles.panel}>
            <div className={styles.card}>
            <h2>Sign in</h2>
            <p>Use your UDD or CDD school Google account.</p>

            <button className={styles.gbtn} disabled={loading} onClick={() => signIn(demoAccounts[0])}>
                <GoogleG /> {loading ? 'Signing in...' : 'Continue with Google'}
            </button>

            {error && <div className={styles.error} role="alert">{error}</div>}

            <div className={styles.demo}>
                Prototype shortcuts
                <div className={styles.demoRow}>
                {demoAccounts.map((d) => (
                    <button key={d.role} className={styles.chip} onClick={() => signIn(d)}>
                    Sign in as {d.role}
                    </button>
                ))}
                <button
                    className={styles.chip}
                    onClick={() => signIn({ name: 'Test', email: 'test@gmail.com', role: 'student' })}
                >
                    Try a non-school email
                </button>
                </div>
            </div>
            </div>
        </section>
        </main>
    );
}
