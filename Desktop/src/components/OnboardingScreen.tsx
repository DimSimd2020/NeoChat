import { useState, useRef } from 'react';
import { User, ArrowRight, Loader2, Upload, AlertCircle, Eye, EyeOff, Check, ShieldCheck } from 'lucide-react';
import './OnboardingScreen.css';
import { TauriService } from '../services/TauriService';
import { useLanguage } from '../i18n/LanguageContext';
import {
    hashPassword,
    checkPasswordRequirements,
    allRequirementsMet,
    getPasswordStrength
} from '../utils/crypto';

interface OnboardingScreenProps {
    onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
    const { t } = useLanguage();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const passReqs = checkPasswordRequirements(password);
    const strength = getPasswordStrength(passReqs);
    const isReady = username.trim() && allRequirementsMet(passReqs) && password === confirmPassword;

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && isReady) {
            handleRegister();
        }
    };

    const handleRegister = async () => {
        if (!isReady) return;

        setIsLoading(true);
        setError(null);
        try {
            // Hash password before saving
            const hashed = await hashPassword(password);
            localStorage.setItem('neochat_password_hash', hashed);

            await TauriService.registerUser(username);
            onComplete();
        } catch (err: any) {
            setError(err.toString());
        } finally {
            setIsLoading(false);
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        setError(null);

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const content = event.target?.result as string;
                const data = JSON.parse(content);

                if (data.user_id && data.password_hash) {
                    localStorage.setItem('neochat_password_hash', data.password_hash);

                    if (data.username) {
                        await TauriService.registerUser(data.username);
                    }

                    onComplete();
                } else {
                    setError(t('key_export.import_fail'));
                }
            } catch (err) {
                setError(t('key_export.import_fail'));
            } finally {
                setIsLoading(false);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="onboarding-container">
            <div className="onboarding-card">
                <div className="onboarding-icon">
                    <User size={48} />
                </div>

                <h1 className="onboarding-title">{t('onboarding.welcome')}</h1>
                <p className="onboarding-subtitle">{t('onboarding.subtitle')}</p>

                <div className="onboarding-form">
                    <div className="input-group">
                        <label htmlFor="username-input">{t('onboarding.username_label')}</label>
                        <input
                            id="username-input"
                            type="text"
                            placeholder={t('onboarding.username_placeholder')}
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoFocus
                        />
                    </div>

                    <div className="input-group">
                        <label>{t('password.title')}</label>
                        <div className="password-input-wrapper">
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder={t('password.placeholder')}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                            <button
                                type="button"
                                className="toggle-password"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {password.length > 0 && (
                        <div className="password-feedback">
                            <div className="strength-meter">
                                <div
                                    className="strength-bar"
                                    style={{
                                        width: `${strength.level * 25}%`,
                                        backgroundColor: strength.color
                                    }}
                                />
                            </div>
                            <span className="strength-text" style={{ color: strength.color }}>
                                {t(strength.key)}
                            </span>
                            <div className="requirements-grid">
                                <div className={`req ${passReqs.length ? 'met' : ''}`}>
                                    <Check size={12} /> {t('password.req_length')}
                                </div>
                                <div className={`req ${passReqs.upper ? 'met' : ''}`}>
                                    <Check size={12} /> {t('password.req_upper')}
                                </div>
                                <div className={`req ${passReqs.lower ? 'met' : ''}`}>
                                    <Check size={12} /> {t('password.req_lower')}
                                </div>
                                <div className={`req ${passReqs.digit ? 'met' : ''}`}>
                                    <Check size={12} /> {t('password.req_digit')}
                                </div>
                                <div className={`req ${passReqs.special ? 'met' : ''}`}>
                                    <Check size={12} /> {t('password.req_special')}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="input-group">
                        <label>{t('password.confirm')}</label>
                        <input
                            type="password"
                            placeholder={t('password.placeholder')}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                        {confirmPassword && password !== confirmPassword && (
                            <span className="error-hint">{t('password.mismatch')}</span>
                        )}
                    </div>

                    {error && (
                        <div className="error-message">
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        className="btn-primary"
                        onClick={handleRegister}
                        disabled={isLoading || !isReady}
                    >
                        {isLoading ? <Loader2 className="spinner" size={20} /> : t('onboarding.start')}
                        {!isLoading && <ArrowRight size={20} />}
                    </button>

                    <div className="onboarding-divider">
                        <span>{t('common.or_upload')}</span>
                    </div>

                    <button
                        className="btn-secondary"
                        onClick={handleImportClick}
                        disabled={isLoading}
                    >
                        <Upload size={18} />
                        {t('key_export.import')}
                    </button>

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".neokey,application/json"
                        style={{ display: 'none' }}
                    />
                </div>

                <div className="onboarding-footer">
                    <p>{t('onboarding.footer')}</p>
                </div>
            </div>
        </div>
    );
}
