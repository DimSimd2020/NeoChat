import { useState, useEffect, useRef } from 'react';
import './Settings.css';
import { User } from '../types';
import {
    User as UserIcon, X, Moon, Shield, HardDrive, MessageSquare,
    Palette, LogOut, Trash2, Camera, ChevronRight, Sun, Lock,
    AlertCircle, Check, Eye, EyeOff, Download, Upload, KeyRound, Monitor, ImagePlus
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { TauriService } from '../services/TauriService';
import { QRCodeSVG as QRCode } from "qrcode.react";
import { useLanguage } from '../i18n/LanguageContext';

interface SettingsProps {
    currentUser: User | null;
    onClose: () => void;
}

type Tab = 'account' | 'chats' | 'appearance' | 'privacy' | 'storage';

function hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '10, 132, 255';
}

import {
    hashPassword,
    checkPasswordRequirements,
    allRequirementsMet,
    getPasswordStrength,
    PasswordRequirements
} from '../utils/crypto';

export function Settings({ currentUser, onClose }: SettingsProps) {
    const { t, language, setLanguage } = useLanguage();

    const [activeTab, setActiveTab] = useState<Tab>(() => {
        return (localStorage.getItem('settings_active_tab') as Tab) || 'account';
    });
    useEffect(() => { localStorage.setItem('settings_active_tab', activeTab); }, [activeTab]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const bgFileInputRef = useRef<HTMLInputElement>(null);

    // Chat Background
    const [chatBg, setChatBg] = useState(() => localStorage.getItem('chatBackground') || 'default');
    const [customBgPreview, setCustomBgPreview] = useState<string | null>(() => localStorage.getItem('chatBgCustomImage'));

    const { theme, setTheme, currentTheme } = useTheme();
    const [accentColor, setAccentColor] = useState(localStorage.getItem('accentColor') || '#0A84FF');
    const [neonMode, setNeonMode] = useState(localStorage.getItem('neonMode') === 'true');

    // Password State
    const [hasPassword, setHasPassword] = useState(() => !!localStorage.getItem('neochat_password_hash'));
    const [showPasswordSetup, setShowPasswordSetup] = useState(false);
    const [passwordStep, setPasswordStep] = useState<'enter' | 'confirm'>('enter');
    const [passwordValue, setPasswordValue] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [showPassConfirm, setShowPassConfirm] = useState(false);
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

    // Computed password requirements
    const passReqs = checkPasswordRequirements(passwordValue);
    const passStrength = getPasswordStrength(passReqs);

    // Privacy
    const [selfDestruct, setSelfDestruct] = useState(() =>
        localStorage.getItem('self_destruct') === 'true'
    );

    // Apply chat background
    const applyChatBg = (bg: string, currentThemeMode: string) => {
        const root = document.documentElement;
        const isLight = currentThemeMode === 'light';
        // Clear custom image
        root.style.setProperty('--chat-bg-image', 'none');
        switch (bg) {
            case 'gradient':
                root.style.setProperty('--chat-bg', isLight
                    ? 'linear-gradient(160deg, #E8E8ED 0%, #D1D1D6 50%, #E8E8ED 100%)'
                    : 'linear-gradient(160deg, #1c1c1e 0%, #2c2c3e 50%, #1c1c2e 100%)');
                break;
            case 'black':
                root.style.setProperty('--chat-bg', isLight ? '#FFFFFF' : '#000000');
                break;
            case 'custom':
                const img = localStorage.getItem('chatBgCustomImage');
                if (img) {
                    root.style.setProperty('--chat-bg', isLight ? '#F2F2F7' : '#0F1117');
                    root.style.setProperty('--chat-bg-image', `url(${img})`);
                }
                break;
            default:
                root.style.setProperty('--chat-bg', isLight ? '#F2F2F7' : '#0F1117');
        }
        localStorage.setItem('chatBackground', bg);
    };

    useEffect(() => {
        applyChatBg(chatBg, currentTheme);
    }, [chatBg, currentTheme]);

    // Theme is now managed by ThemeContext globally.
    // Real-time update issues fixed by moving logic to Context.

    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--color-accent', accentColor);
        root.style.setProperty('--color-accent-rgb', hexToRgb(accentColor));
        localStorage.setItem('accentColor', accentColor);
    }, [accentColor]);

    useEffect(() => {
        if (neonMode) { document.body.classList.add('neon-mode'); }
        else { document.body.classList.remove('neon-mode'); }
        localStorage.setItem('neonMode', String(neonMode));
    }, [neonMode]);

    useEffect(() => {
        localStorage.setItem('self_destruct', String(selfDestruct));
    }, [selfDestruct]);

    const handleAvatarClick = () => { fileInputRef.current?.click(); };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                TauriService.updateProfile(currentUser?.username || "Me", base64String)
                    .then(() => { window.location.reload(); });
            };
            reader.readAsDataURL(file);
        }
    };

    // Password handlers
    const handleSetPassword = async () => {
        if (passwordStep === 'enter') {
            if (!allRequirementsMet(passReqs)) {
                setPasswordError(t('password.req_length'));
                return;
            }
            setPasswordStep('confirm');
            setPasswordError(null);
        } else {
            if (passwordConfirm !== passwordValue) {
                setPasswordError(t('password.mismatch'));
                setPasswordConfirm('');
                return;
            }
            const hash = await hashPassword(passwordValue);
            localStorage.setItem('neochat_password_hash', hash);
            // Migrate legacy PIN if exists
            localStorage.removeItem('neochat_pin');
            setHasPassword(true);
            setShowPasswordSetup(false);
            setPasswordValue('');
            setPasswordConfirm('');
            setPasswordStep('enter');
            setShowPass(false);
            setShowPassConfirm(false);
            setPasswordSuccess(t('password.set_success'));
            setTimeout(() => setPasswordSuccess(null), 3000);
        }
    };

    const handleRemovePassword = () => {
        localStorage.removeItem('neochat_password_hash');
        localStorage.removeItem('neochat_pin'); // legacy
        setHasPassword(false);
        setPasswordSuccess(t('password.removed'));
        setTimeout(() => setPasswordSuccess(null), 3000);
    };

    // Key export/import
    const handleExportKey = async () => {
        if (!hasPassword) {
            setPasswordError(t('key_export.need_password'));
            return;
        }

        try {
            const { save } = await import('@tauri-apps/plugin-dialog');
            const { writeTextFile } = await import('@tauri-apps/plugin-fs');

            const filePath = await save({
                filters: [{
                    name: 'NeoKey',
                    extensions: ['neokey']
                }],
                defaultPath: `neochat-key-${currentUser?.username || t('common.guest')}.neokey`
            });

            if (!filePath) return;

            const exportData = {
                version: 1,
                user_id: currentUser?.id,
                username: currentUser?.username,
                password_hash: localStorage.getItem('neochat_password_hash'),
                exported_at: new Date().toISOString(),
                app: 'NeoChat Desktop v0.1.0'
            };

            await writeTextFile(filePath, JSON.stringify(exportData, null, 2));

            setPasswordSuccess(`${t('key_export.export_success')}\nPath: ${filePath}`);
            setTimeout(() => setPasswordSuccess(null), 10000); // Show longer because of path
        } catch (err) {
            console.error(err);
            setPasswordError(String(err));
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'account':
                return (
                    <div className="settings-tab-content profile-section">
                        <div className="profile-avatar-container">
                            <input type="file" ref={fileInputRef} onChange={handleFileChange}
                                style={{ display: 'none' }} accept="image/*" />
                            <div className="avatar-large" onClick={handleAvatarClick}>
                                {currentUser?.avatar_url ? (
                                    <img src={currentUser.avatar_url} alt={currentUser?.username || ''} />
                                ) : (currentUser?.username?.charAt(0).toUpperCase())}
                                <div className="avatar-overlay"><Camera size={28} /></div>
                            </div>
                            <div className="profile-info">
                                <h3 className="profile-name">{currentUser?.username}</h3>
                                <div className="status-online">
                                    <div className="status-dot"></div>
                                    {t('common.online')}
                                </div>
                            </div>
                        </div>

                        <div className="w-full space-y-6">
                            <div>
                                <label className="section-label">{t('settings.username')}</label>
                                <div className="info-card">
                                    <div className="info-row">
                                        <span className="font-bold">@{currentUser?.username}</span>
                                        <button className="btn-action">{t('common.save')}</button>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="section-label">{t('settings.pubkey_id')}</label>
                                <div className="info-card">
                                    <div className="info-row">
                                        <span className="info-value">{currentUser?.id || t('common.generating')}</span>
                                    </div>
                                    <div className="mt-4 flex justify-center">
                                        <div className="qr-preview">
                                            {currentUser?.id && (
                                                <QRCode value={currentUser.id} size={180} includeMargin={false} />
                                            )}
                                        </div>
                                    </div>
                                    <p className="info-subtext text-center mt-2">{t('settings.scan_to_add')}</p>
                                </div>
                            </div>
                        </div>

                        <div className="danger-zone">
                            <button className="btn-danger">
                                <LogOut size={20} /> {t('settings.logout')}
                            </button>
                        </div>
                    </div>
                );
            case 'appearance':
                return (
                    <div className="settings-tab-content space-y-8">
                        <div>
                            <label className="section-label">{t('settings.select_language')}</label>
                            <div className="settings-grid">
                                <button className={`option-card ${language === 'ru' ? 'active' : ''}`}
                                    onClick={() => setLanguage('ru')}>
                                    <div className="option-icon">🇷🇺</div> Русский
                                </button>
                                <button className={`option-card ${language === 'en' ? 'active' : ''}`}
                                    onClick={() => setLanguage('en')}>
                                    <div className="option-icon">🇺🇸</div> English
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="section-label">{t('settings.theme')}</label>
                            <div className="settings-grid">
                                <button className={`option-card ${theme === 'dark' ? 'active' : ''}`}
                                    onClick={() => setTheme('dark')}>
                                    <div className="option-icon"><Moon size={18} /></div> {t('settings.dark')}
                                </button>
                                <button className={`option-card ${theme === 'light' ? 'active' : ''}`}
                                    onClick={() => setTheme('light')}>
                                    <div className="option-icon"><Sun size={18} /></div> {t('settings.light')}
                                </button>
                                <button className={`option-card ${theme === 'system' ? 'active' : ''}`}
                                    onClick={() => setTheme('system')}>
                                    <div className="option-icon"><Monitor size={18} /></div> {t('settings.system')}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="section-label">{t('settings.accent')}</label>
                            <div className="color-picker">
                                {['#0A84FF', '#30D158', '#FF9F0A', '#FF375F', '#BF5AF2'].map(color => (
                                    <button key={color}
                                        className={`color-dot ${accentColor === color ? 'active' : ''}`}
                                        style={{ backgroundColor: color, color: color }}
                                        onClick={() => setAccentColor(color)} />
                                ))}
                            </div>
                        </div>
                        <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--settings-border)' }}>
                            <label className="section-label">{t('settings.advanced')}</label>
                            <div className="toggle-control">
                                <div className="toggle-info">
                                    <div className="option-icon" style={{ background: 'rgba(255, 159, 10, 0.1)', color: '#FF9F0A' }}>
                                        <Palette size={18} />
                                    </div>
                                    <div>
                                        <div className="font-bold">{t('settings.neon_mode')}</div>
                                        <div className="text-xs opacity-50">{t('settings.experimental_desc')}</div>
                                    </div>
                                </div>
                                <div className={`toggle-switch ${neonMode ? 'checked' : ''}`}
                                    onClick={() => setNeonMode(!neonMode)}>
                                    <div className="toggle-thumb" />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'privacy':
                return (
                    <div className="settings-tab-content space-y-6">
                        <label className="section-label">{t('settings.privacy')}</label>

                        {/* Password Section */}
                        <div className="info-card security-card">
                            <div className="toggle-control" style={{ padding: 0 }}>
                                <div className="toggle-info">
                                    <div className="option-icon" style={{ background: 'rgba(10, 132, 255, 0.1)', color: '#0A84FF' }}>
                                        <Lock size={18} />
                                    </div>
                                    <div>
                                        <div className="font-bold">{t('password.title')}</div>
                                        <div className="text-xs opacity-50">{t('password.desc')}</div>
                                    </div>
                                </div>
                                {hasPassword ? (
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <button className="btn-action" onClick={() => {
                                            setShowPasswordSetup(true);
                                            setPasswordStep('enter');
                                            setPasswordValue('');
                                            setPasswordConfirm('');
                                        }}>{t('password.change')}</button>
                                        <button className="btn-action btn-danger-sm" onClick={handleRemovePassword}>
                                            {t('password.remove')}
                                        </button>
                                    </div>
                                ) : (
                                    <button className="btn-action" onClick={() => {
                                        setShowPasswordSetup(true);
                                        setPasswordStep('enter');
                                        setPasswordValue('');
                                        setPasswordConfirm('');
                                    }}>{t('password.set')}</button>
                                )}
                            </div>

                            {passwordSuccess && (
                                <div className="pin-success-msg">
                                    <Check size={16} /> {passwordSuccess}
                                </div>
                            )}

                            {showPasswordSetup && (
                                <div className="password-setup-section">
                                    <label className="section-label" style={{ fontSize: '0.8rem', marginTop: '1rem' }}>
                                        {passwordStep === 'enter' ? t('password.new_pass') : t('password.confirm')}
                                    </label>

                                    <div className="password-input-row">
                                        <div className="password-input-wrap-settings">
                                            <input
                                                type={passwordStep === 'enter' ? (showPass ? 'text' : 'password') : (showPassConfirm ? 'text' : 'password')}
                                                value={passwordStep === 'enter' ? passwordValue : passwordConfirm}
                                                onChange={e => {
                                                    if (passwordStep === 'enter') setPasswordValue(e.target.value);
                                                    else setPasswordConfirm(e.target.value);
                                                    setPasswordError(null);
                                                }}
                                                placeholder={t('password.placeholder')}
                                                className="password-input-field"
                                                autoFocus
                                            />
                                            <button
                                                type="button"
                                                className="password-toggle-btn"
                                                onClick={() => {
                                                    if (passwordStep === 'enter') setShowPass(!showPass);
                                                    else setShowPassConfirm(!showPassConfirm);
                                                }}
                                            >
                                                {(passwordStep === 'enter' ? showPass : showPassConfirm) ?
                                                    <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                        <button className="btn-action btn-next" onClick={handleSetPassword}
                                            disabled={passwordStep === 'enter' && !allRequirementsMet(passReqs)}>
                                            {passwordStep === 'enter' ? '→' : t('password.set')}
                                        </button>
                                    </div>

                                    {/* Strength indicator & requirements — only on first step */}
                                    {passwordStep === 'enter' && passwordValue.length > 0 && (
                                        <div className="password-strength-section">
                                            <div className="strength-bar-container">
                                                <div className="strength-bar"
                                                    style={{
                                                        width: `${passStrength.level * 25}%`,
                                                        backgroundColor: passStrength.color
                                                    }} />
                                            </div>
                                            <span className="strength-label" style={{ color: passStrength.color }}>
                                                {t(passStrength.key)}
                                            </span>

                                            <div className="password-reqs">
                                                <div className={`req-item ${passReqs.length ? 'met' : ''}`}>
                                                    {passReqs.length ? <Check size={13} /> : <AlertCircle size={13} />}
                                                    <span>{t('password.req_length')}</span>
                                                </div>
                                                <div className={`req-item ${passReqs.upper ? 'met' : ''}`}>
                                                    {passReqs.upper ? <Check size={13} /> : <AlertCircle size={13} />}
                                                    <span>{t('password.req_upper')}</span>
                                                </div>
                                                <div className={`req-item ${passReqs.lower ? 'met' : ''}`}>
                                                    {passReqs.lower ? <Check size={13} /> : <AlertCircle size={13} />}
                                                    <span>{t('password.req_lower')}</span>
                                                </div>
                                                <div className={`req-item ${passReqs.digit ? 'met' : ''}`}>
                                                    {passReqs.digit ? <Check size={13} /> : <AlertCircle size={13} />}
                                                    <span>{t('password.req_digit')}</span>
                                                </div>
                                                <div className={`req-item ${passReqs.special ? 'met' : ''}`}>
                                                    {passReqs.special ? <Check size={13} /> : <AlertCircle size={13} />}
                                                    <span>{t('password.req_special')}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {passwordError && (
                                        <div className="pin-error-inline">
                                            <AlertCircle size={14} /> {passwordError}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Key Export / Import */}
                        <div className="info-card security-card">
                            <div className="toggle-control" style={{ padding: 0 }}>
                                <div className="toggle-info">
                                    <div className="option-icon" style={{ background: 'rgba(191, 90, 242, 0.1)', color: '#BF5AF2' }}>
                                        <KeyRound size={18} />
                                    </div>
                                    <div>
                                        <div className="font-bold">{t('key_export.title')}</div>
                                        <div className="text-xs opacity-50">{t('key_export.desc')}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="key-actions">
                                <button className="btn-key-action" onClick={handleExportKey}>
                                    <Download size={16} />
                                    <div>
                                        <div className="font-bold">{t('key_export.export')}</div>
                                        <div className="text-xs opacity-50">{t('key_export.export_desc')}</div>
                                    </div>
                                </button>
                                <button className="btn-key-action" onClick={() => {
                                    // TODO: implement import
                                    setPasswordError(t('key_export.import_desc'));
                                }}>
                                    <Upload size={16} />
                                    <div>
                                        <div className="font-bold">{t('key_export.import')}</div>
                                        <div className="text-xs opacity-50">{t('key_export.import_desc')}</div>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Self-Destruct */}
                        <div className="toggle-control">
                            <div className="toggle-info">
                                <div className="option-icon" style={{ background: 'rgba(48, 209, 88, 0.1)', color: '#30D158' }}>
                                    <Shield size={18} />
                                </div>
                                <div>
                                    <div className="font-bold">{t('privacy.self_destruct')}</div>
                                    <div className="text-xs opacity-50">{t('privacy.self_destruct_desc')}</div>
                                </div>
                            </div>
                            <div className={`toggle-switch ${selfDestruct ? 'checked' : ''}`}
                                onClick={() => setSelfDestruct(!selfDestruct)}>
                                <div className="toggle-thumb" />
                            </div>
                        </div>
                    </div>
                );
            case 'chats':
                return (
                    <div className="settings-tab-content space-y-8">
                        <div>
                            <label className="section-label">{t('chats.background')}</label>
                            <div className="settings-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                                <button className={`option-card flex-col py-6 ${chatBg === 'default' ? 'active' : ''}`}
                                    style={{ backgroundColor: currentTheme === 'light' ? '#F2F2F7' : '#0F1117' }}
                                    onClick={() => setChatBg('default')}>
                                    <span className="text-xs opacity-50">{t('chats.default')}</span>
                                </button>
                                <button className={`option-card flex-col py-6 ${chatBg === 'gradient' ? 'active' : ''}`}
                                    style={{
                                        background: currentTheme === 'light'
                                            ? 'linear-gradient(to bottom right, #E8E8ED, #D1D1D6)'
                                            : 'linear-gradient(to bottom right, #1c1c1e, #2c2c2e)'
                                    }}
                                    onClick={() => setChatBg('gradient')}>
                                    <span className="text-xs opacity-50">{t('chats.gradient')}</span>
                                </button>
                                <button className={`option-card flex-col py-6 ${chatBg === 'black' ? 'active' : ''}`}
                                    style={{ backgroundColor: currentTheme === 'light' ? '#FFFFFF' : '#000' }}
                                    onClick={() => setChatBg('black')}>
                                    <span className="text-xs opacity-50">{currentTheme === 'light' ? t('chats.white') : t('chats.black')}</span>
                                </button>
                                <button className={`option-card flex-col py-6 ${chatBg === 'custom' ? 'active' : ''}`}
                                    style={{
                                        backgroundImage: customBgPreview ? `url(${customBgPreview})` : 'none',
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        position: 'relative',
                                    }}
                                    onClick={() => bgFileInputRef.current?.click()}>
                                    {!customBgPreview && <ImagePlus size={24} style={{ opacity: 0.4 }} />}
                                    <span className="text-xs opacity-50" style={{
                                        textShadow: customBgPreview ? '0 1px 4px rgba(0,0,0,0.8)' : 'none',
                                        color: customBgPreview ? '#fff' : undefined,
                                    }}>{t('chats.custom_image')}</span>
                                </button>
                            </div>
                            <input
                                type="file"
                                ref={bgFileInputRef}
                                style={{ display: 'none' }}
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onloadend = () => {
                                            const b64 = reader.result as string;
                                            localStorage.setItem('chatBgCustomImage', b64);
                                            setCustomBgPreview(b64);
                                            setChatBg('custom');
                                        };
                                        reader.readAsDataURL(file);
                                    }
                                    e.target.value = '';
                                }}
                            />
                            {chatBg === 'custom' && customBgPreview && (
                                <button
                                    className="btn-action mt-4"
                                    onClick={() => {
                                        localStorage.removeItem('chatBgCustomImage');
                                        setCustomBgPreview(null);
                                        setChatBg('default');
                                    }}
                                >
                                    <Trash2 size={14} /> {t('chats.remove_image')}
                                </button>
                            )}
                        </div>
                    </div>
                );
            case 'storage':
                return (
                    <div className="settings-tab-content space-y-6">
                        <label className="section-label">{t('storage.title')}</label>
                        <div className="info-card">
                            <div className="info-row">
                                <div className="flex items-center gap-3">
                                    <div className="option-icon"><HardDrive size={18} /></div>
                                    <div className="font-bold">{t('storage.cache')}</div>
                                </div>
                            </div>
                            <div className="info-row mt-2">
                                <span className="text-sm opacity-50">{t('storage.used')}</span>
                                <span className="font-mono">{t('storage.used_val')}</span>
                            </div>
                            <button
                                className="btn-danger mt-4 w-full"
                                onClick={async () => {
                                    if (confirm(t('storage.confirm_clear_db'))) {
                                        await TauriService.clearDatabase();
                                        localStorage.clear();
                                        window.location.reload();
                                    }
                                }}
                            >
                                <Trash2 size={16} /> {t('storage.clear_all')}
                            </button>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="settings-overlay">
            <div className="settings-modal">
                <div className="settings-sidebar">
                    <div className="settings-header">
                        <button onClick={onClose} className="btn-close" aria-label={t('common.close_settings')}>
                            <X size={20} />
                        </button>
                        <h2>{t('settings.title')}</h2>
                    </div>
                    <nav className="settings-nav">
                        <button onClick={() => setActiveTab('account')}
                            className={`nav-item ${activeTab === 'account' ? 'active' : ''}`}>
                            <div className="nav-item-content"><UserIcon size={18} /><span>{t('settings.account')}</span></div>
                            <ChevronRight size={14} className="nav-arrow" />
                        </button>
                        <button onClick={() => setActiveTab('chats')}
                            className={`nav-item ${activeTab === 'chats' ? 'active' : ''}`}>
                            <div className="nav-item-content"><MessageSquare size={18} /><span>{t('chats.title')}</span></div>
                            <ChevronRight size={14} className="nav-arrow" />
                        </button>
                        <button onClick={() => setActiveTab('appearance')}
                            className={`nav-item ${activeTab === 'appearance' ? 'active' : ''}`}>
                            <div className="nav-item-content"><Palette size={18} /><span>{t('settings.appearance')}</span></div>
                            <ChevronRight size={14} className="nav-arrow" />
                        </button>
                        <button onClick={() => setActiveTab('privacy')}
                            className={`nav-item ${activeTab === 'privacy' ? 'active' : ''}`}>
                            <div className="nav-item-content"><Shield size={18} /><span>{t('settings.privacy')}</span></div>
                            <ChevronRight size={14} className="nav-arrow" />
                        </button>
                        <button onClick={() => setActiveTab('storage')}
                            className={`nav-item ${activeTab === 'storage' ? 'active' : ''}`}>
                            <div className="nav-item-content"><HardDrive size={18} /><span>{t('storage.title')}</span></div>
                            <ChevronRight size={14} className="nav-arrow" />
                        </button>
                    </nav>
                </div>
                <div className="settings-content">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}
