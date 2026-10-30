import { useState } from 'react';
import { api, setToken, errorMessage } from '../../api/client.js';
import styles from './Login.module.css';

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
    const [token, setTokenText] = useState('');

    const signInWithToken = async () => {
        setError('');
        setLoading(true);

        try {
            setToken(token.trim());
            onLogin((await api('/me')).data);
        } catch (e) {
            setToken(null);
            setError(errorMessage(e));
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className={styles.login}>
            <div className={styles.scenery} aria-hidden="true">
                <span className={styles.cornerRing} />
                <span className={styles.bottomRing} />
            </div>

            <section className={styles.panel} aria-label="Sign in">
                <div className={styles.card}>
                    <div className={styles.illustration} aria-hidden="true">
                        <div className={styles.backNote} />
                        <div className={styles.frontNote}>
                            <span className={styles.noteTab} />
                            <span className={styles.noteRow}><i /><b /></span>
                            <span className={styles.noteRow}><i /><b /></span>
                            <span className={styles.noteRow}><i /><b /></span>
                        </div>
                        <span className={styles.noteDot} />
                    </div>

                    <h1 className={styles.brand}>e<b>Panunot</b></h1>

                    <button
                        className={styles.gbtn}
                        disabled={loading}
                        aria-busy={loading}
                        onClick={() => setError('Google sign-in is not connected yet.')}
                    >
                        <span className={styles.providerIcon}><GoogleG /></span>
                        <span>Continue with UdD/CdD account</span>
                    </button>

                    <p className={styles.schoolNote}>
                        For @udd.edu.ph and @cdd.edu.ph accounts.
                    </p>

                    {error && (
                        <div className={styles.error} role="alert">
                            {error}
                        </div>
                    )}

                    <details className={styles.demo}>
                        <summary>Prototype options</summary>

                        <p className={styles.demoHint}>
                            Paste your API token to access your account.
                        </p>

                        <div className={styles.demoRow}>
                            <input
                                type="password"
                                value={token}
                                onChange={(e) => setTokenText(e.target.value)}
                                placeholder="Paste API token"
                            />

                            <button
                                className={styles.chip}
                                disabled={loading || !token.trim()}
                                onClick={signInWithToken}
                            >
                                {loading ? 'Signing in...' : 'Sign in with token'}
                            </button>
                        </div>
                    </details>
                </div>
            </section>
        </main>
    );
}
