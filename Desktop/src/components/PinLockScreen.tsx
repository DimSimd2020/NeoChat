import { useState, useRef, useEffect } from 'react';
import { Lock, ShieldCheck, AlertCircle, Eye, EyeOff } from 'lucide-react';
import './PinLockScreen.css';
import { useLanguage } from '../i18n/LanguageContext';
import { hashPassword } from '../utils/crypto';

interface PinLockScreenProps {
    onUnlock: () => void;
}

export function PinLockScreen({ onUnlock }: PinLockScreenProps) {
    const { t } = useLanguage();
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [shake, setShake] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
    const [lockoutRemaining, setLockoutRemaining] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
        // Check for existing lockout
        const stored = localStorage.getItem('neochat_lockout');
        if (stored) {
            const until = parseInt(stored);
            if (until > Date.now()) {
                setLockoutUntil(until);
            } else {
                localStorage.removeItem('neochat_lockout');
            }
        }
    }, []);

    // Lockout countdown
    useEffect(() => {
        if (!lockoutUntil) return;
        const timer = setInterval(() => {
            const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
            if (remaining <= 0) {
                setLockoutUntil(null);
                setLockoutRemaining(0);
                localStorage.removeItem('neochat_lockout');
                clearInterval(timer);
            } else {
                setLockoutRemaining(remaining);
            }
        }, 500);
        return () => clearInterval(timer);
    }, [lockoutUntil]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (lockoutUntil && lockoutUntil > Date.now()) return;
        if (!password) return;

        const storedHash = localStorage.getItem('neochat_password_hash');
        if (!storedHash) {
            onUnlock();
            return;
        }

        const inputHash = await hashPassword(password);

        if (inputHash === storedHash) {
            setAttempts(0);
            localStorage.removeItem('neochat_lockout');
            onUnlock();
        } else {
            const newAttempts = attempts + 1;
            setAttempts(newAttempts);
            setError(t('password.wrong'));
            setShake(true);
            setTimeout(() => {
                setShake(false);
                setPassword('');
                inputRef.current?.focus();
            }, 500);

            // Lockout after 5 failed attempts — 30 seconds + 30 more per extra attempt
            if (newAttempts >= 5) {
                const lockoutSeconds = 30 + (newAttempts - 5) * 30;
                const until = Date.now() + lockoutSeconds * 1000;
                setLockoutUntil(until);
                localStorage.setItem('neochat_lockout', String(until));
            }
        }
    };

    const isLockedOut = lockoutUntil && lockoutUntil > Date.now();

    return (
        <div className="pin-lock-screen">
            <div className="pin-lock-container">
                <div className="pin-lock-icon">
                    <Lock size={48} />
                </div>
                <h2 className="pin-lock-title">{t('password.locked')}</h2>
                <p className="pin-lock-subtitle">{t('password.enter')}</p>

                <form onSubmit={handleSubmit} className={`password-form ${shake ? 'shake' : ''}`}>
                    <div className="password-input-wrap">
                        <input
                            ref={inputRef}
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); setError(null); }}
                            placeholder={t('password.placeholder')}
                            className="password-field"
                            disabled={!!isLockedOut}
                            autoFocus
                        />
                        <button
                            type="button"
                            className="password-toggle"
                            onClick={() => setShowPassword(!showPassword)}
                            tabIndex={-1}
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    <button
                        type="submit"
                        className="unlock-btn"
                        disabled={!password || !!isLockedOut}
                    >
                        {t('password.unlock')}
                    </button>
                </form>

                {error && !isLockedOut && (
                    <div className="pin-error">
                        <AlertCircle size={16} />
                        <span>{error} ({5 - attempts > 0 ? `${5 - attempts}` : '0'} {t('password.attempts_left')})</span>
                    </div>
                )}

                {isLockedOut && (
                    <div className="lockout-msg">
                        <AlertCircle size={16} />
                        <span>{t('password.locked_for')} {lockoutRemaining}{t('password.seconds_short')}</span>
                    </div>
                )}

                <div className="pin-footer">
                    <ShieldCheck size={16} />
                    <span>{t('password.desc')}</span>
                </div>
            </div>
        </div>
    );
}
