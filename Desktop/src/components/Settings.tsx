import { useState, useEffect, useRef } from 'react';
import './Settings.css';
import { User } from '../types';
import {
    User as UserIcon, X, Moon, Shield, HardDrive, MessageSquare,
    Palette, LogOut, Trash2, Camera, Globe
} from 'lucide-react';
import { TauriService } from '../services/TauriService';
import { QRCodeSVG as QRCode } from "qrcode.react";
import { useLanguage } from '../i18n/LanguageContext';

interface SettingsProps {
    currentUser: User | null;
    onClose: () => void;
}

type Tab = 'account' | 'chats' | 'appearance' | 'privacy' | 'storage';

export function Settings({ currentUser, onClose }: SettingsProps) {
    const [activeTab, setActiveTab] = useState<Tab>('account');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { t, language, setLanguage } = useLanguage();

    // Appearance State (Initialize from localStorage or defaults)
    const [theme, setTheme] = useState<'dark' | 'light'>(
        (localStorage.getItem('theme') as 'dark' | 'light') || 'dark'
    );
    const [accentColor, setAccentColor] = useState(
        localStorage.getItem('accentColor') || '#0A84FF'
    );
    const [neonMode, setNeonMode] = useState(
        localStorage.getItem('neonMode') === 'true'
    );

    // Apply settings effects
    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'light') {
            root.style.setProperty('--color-bg-main', '#f2f2f7');
            root.style.setProperty('--color-bg-card', '#ffffff');
            root.style.setProperty('--color-text-main', '#000000');
            root.style.setProperty('--color-text-secondary', '#8e8e93');
        } else {
            root.style.setProperty('--color-bg-main', '#000000'); // Deep black
            root.style.setProperty('--color-bg-card', '#1c1c1e');
            root.style.setProperty('--color-text-main', '#ffffff');
            root.style.setProperty('--color-text-secondary', '#8e8e93');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        document.documentElement.style.setProperty('--color-accent', accentColor);
        localStorage.setItem('accentColor', accentColor);
    }, [accentColor]);

    useEffect(() => {
        if (neonMode) {
            document.body.classList.add('neon-mode');
        } else {
            document.body.classList.remove('neon-mode');
        }
        localStorage.setItem('neonMode', String(neonMode));
    }, [neonMode]);


    // Privacy State
    const [selfDestruct, setSelfDestruct] = useState(false);

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                TauriService.updateProfile(currentUser?.username || "Me", base64String)
                    .then(() => {
                        console.log("Avatar updated");
                        window.location.reload();
                    });
            };
            reader.readAsDataURL(file);
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'account':
                return (
                    <div className="profile-section">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                            accept="image/*"
                        />
                        <div className="avatar-large" onClick={handleAvatarClick} style={{ cursor: 'pointer' }}>
                            {currentUser?.avatar_url ? (
                                <img src={currentUser.avatar_url} alt="Profile" />
                            ) : (
                                currentUser?.username?.charAt(0).toUpperCase()
                            )}
                            <div className="avatar-overlay">
                                <Camera size={24} />
                            </div>
                        </div>
                        <div className="text-center">
                            <h3 className="profile-name">{currentUser?.username}</h3>
                            <p className="info-subtext">Online</p>
                        </div>

                        <div style={{ width: '100%' }}>
                            <label className="section-label">{t('settings.username')}</label>
                            <div className="info-box">
                                <span>@{currentUser?.username}</span>
                                <button className="btn-action">Edit</button>
                            </div>
                        </div>

                        <div style={{ width: '100%' }}>
                            <label className="section-label">Public Key (ID)</label>
                            <div className="info-box" style={{ fontFamily: 'monospace', userSelect: 'all', cursor: 'pointer' }}>
                                {currentUser?.id || "Generating..."}
                            </div>

                            <div className="mt-4 flex flex-col items-center">
                                <div className="p-4 bg-white rounded-xl shadow-lg border border-white/10">
                                    {currentUser?.id && (
                                        <QRCode value={currentUser.id} size={200} includeMargin={true} />
                                    )}
                                </div>
                                <p className="info-subtext mt-4 text-center">{t('settings.scan_to_add')}</p>
                            </div>
                        </div>

                        <div className="danger-zone">
                            <button className="btn-danger">
                                <LogOut size={18} /> Log Out
                            </button>
                        </div>
                    </div>
                );
            case 'appearance':
                return (
                    <div className="space-y-6">
                        <div>
                            <label className="section-label">{t('settings.select_language')}</label>
                            <div className="settings-grid">
                                <button
                                    className={`option-card ${language === 'ru' ? 'active' : ''}`}
                                    onClick={() => setLanguage('ru')}
                                >
                                    🇷🇺 Русский
                                </button>
                                <button
                                    className={`option-card ${language === 'en' ? 'active' : ''}`}
                                    onClick={() => setLanguage('en')}
                                >
                                    🇺🇸 English
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="section-label">Theme</label>
                            <div className="settings-grid">
                                <button
                                    className={`option-card ${theme === 'dark' ? 'active' : ''}`}
                                    onClick={() => setTheme('dark')}
                                >
                                    <Moon size={18} /> Dark
                                </button>
                                <button
                                    className={`option-card ${theme === 'light' ? 'active' : ''}`}
                                    onClick={() => setTheme('light')}
                                >
                                    <div className="w-4 h-4 rounded-full border border-current bg-white" /> Light
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="section-label">Accent Color</label>
                            <div className="color-picker">
                                {['#0A84FF', '#30D158', '#FF9F0A', '#FF375F', '#BF5AF2'].map(color => (
                                    <button
                                        key={color}
                                        className={`color-dot ${accentColor === color ? 'active' : ''}`}
                                        style={{ backgroundColor: color }}
                                        onClick={() => setAccentColor(color)}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="info-box">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Palette size={18} /> Neon Mode</span>
                                <div
                                    className={`toggle-switch ${neonMode ? 'checked' : ''}`}
                                    onClick={() => setNeonMode(!neonMode)}
                                >
                                    <div className="toggle-thumb" />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'privacy':
                return (
                    <div className="space-y-6">
                        <div className="info-box">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Shield size={18} /> Self-Destruct Timer</span>
                                <div
                                    className={`toggle-switch ${selfDestruct ? 'checked' : ''}`}
                                    onClick={() => setSelfDestruct(!selfDestruct)}
                                >
                                    <div className="toggle-thumb" />
                                </div>
                            </div>
                        </div>
                        <p className="info-subtext">Messages will auto-delete from both devices after being read.</p>
                    </div>
                );
            case 'chats':
                return (
                    <div className="space-y-6">
                        <div>
                            <label className="section-label">Chat Background</label>
                            <div className="settings-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                                <div className="option-card" style={{ height: '80px', justifyContent: 'center', backgroundColor: '#0F1117' }}>Default</div>
                                <div className="option-card" style={{ height: '80px', justifyContent: 'center', background: 'linear-gradient(to bottom right, #1c1c1e, #2c2c2e)' }}>Gradient</div>
                                <div className="option-card" style={{ height: '80px', justifyContent: 'center', backgroundColor: '#000' }}>Black</div>
                            </div>
                        </div>
                    </div>
                );
            case 'storage':
                return (
                    <div className="space-y-6">
                        <div className="info-box" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
                            <h3 style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><HardDrive size={18} /> Cache</h3>
                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.9rem' }}>
                                <span className="text-secondary">Used Space</span>
                                <span>24.5 MB</span>
                            </div>
                            <button className="btn-danger" style={{ marginTop: '0.5rem' }}>
                                <Trash2 size={16} /> Clear Cache
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
            <div className="settings-modal bg-[#1C1C1E] rounded-[32px] overflow-hidden shadow-2xl border border-white/5">
                {/* Sidebar (Navigation) */}
                <div className="settings-sidebar">
                    <div className="settings-header">
                        <button onClick={onClose} className="btn-close">
                            <X size={20} />
                        </button>
                        <h2>{t('settings.title')}</h2>
                    </div>

                    <nav className="settings-nav">
                        <button
                            onClick={() => setActiveTab('account')}
                            className={`nav-item ${activeTab === 'account' ? 'active' : ''}`}
                        >
                            <UserIcon size={18} /> {t('settings.account')}
                        </button>
                        <button
                            onClick={() => setActiveTab('chats')}
                            className={`nav-item ${activeTab === 'chats' ? 'active' : ''}`}
                        >
                            <MessageSquare size={18} /> {t('chats.title' as any) || 'Chats'}
                        </button>
                        <button
                            onClick={() => setActiveTab('appearance')}
                            className={`nav-item ${activeTab === 'appearance' ? 'active' : ''}`}
                        >
                            <Globe size={18} /> {t('settings.appearance')}
                        </button>
                        <button
                            onClick={() => setActiveTab('privacy')}
                            className={`nav-item ${activeTab === 'privacy' ? 'active' : ''}`}
                        >
                            <Shield size={18} /> {t('settings.privacy')}
                        </button>
                        <button
                            onClick={() => setActiveTab('storage')}
                            className={`nav-item ${activeTab === 'storage' ? 'active' : ''}`}
                        >
                            <HardDrive size={18} /> Storage
                        </button>
                    </nav>
                </div>

                {/* Content Area */}
                <div className="settings-content">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}
