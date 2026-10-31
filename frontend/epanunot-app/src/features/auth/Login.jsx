import { useEffect, useState } from 'react';
import { api, developmentAccounts, errorMessage, googleLoginUrl, loginAsDevelopmentAccount } from '../../api/client.js';
import styles from './Login.module.css';
import LoadingScreen from '../../components/LoadingScreen.jsx';

const GoogleG = () => (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z"/>
        <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-2.9-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z"/>
        <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2 1.4-4.9 2.3-8.5 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/>
    </svg>
);

export default function Login({ error: sessionError = '', onLogin }) {
    const [loading, setLoading] = useState(false);
    const [accounts, setAccounts] = useState([]);
    const [developmentError, setDevelopmentError] = useState('');
    useEffect(() => {
        if (!import.meta.env.DEV) return;
        let active = true;
        developmentAccounts()
            .then((response) => { if (active) setAccounts(response.data); })
            .catch(() => { /* The picker is unavailable outside the local backend. */ });
        return () => { active = false; };
    }, []);
    const errors = {
        school_account_required: 'Please use your verified @udd.edu.ph or @cdd.edu.ph Google school account.',
        cancelled: 'Google sign-in was cancelled. You can try again.',
        login_failed: 'Google sign-in could not be completed. Please try again.',
        not_configured: 'Google sign-in is not configured on the server yet.',
        account_conflict: 'This email is linked to another account. Please contact your administrator.',
    };
    const code = new URLSearchParams(window.location.search).get('auth_error');
    const error = developmentError || errors[code] || sessionError;

    const signInAs = async (account) => {
        setDevelopmentError('');
        setLoading(true);
        try {
            await loginAsDevelopmentAccount(account);
            const response = await api('/me');
            window.history.replaceState(null, '', '/');
            onLogin(response.data);
        } catch (error) {
            setDevelopmentError(errorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    const signInWithGoogle = () => {
        setLoading(true);
        window.location.assign(googleLoginUrl);
    };

    if (loading) return <LoadingScreen message="Signing you in…" />;

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
                        onClick={signInWithGoogle}
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

                    {accounts.length > 0 && (
                        <details className={styles.demo}>
                            <summary>Local development accounts</summary>
                            <p className={styles.demoHint}>
                                Test different roles without another school account. Google sign-in stays available above.
                            </p>
                            <div className={styles.demoRow}>
                                {accounts.map((account) => (
                                    <button key={account.key} type="button" className={styles.chip}
                                        disabled={loading} onClick={() => signInAs(account.key)}>
                                        {account.name}
                                    </button>
                                ))}
                            </div>
                            <p className={styles.demoHint}>Mayor and classmates share a test block. New Student starts without a block.</p>
                        </details>
                    )}

                </div>
            </section>
        </main>
    );
}
