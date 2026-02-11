import './Sidebar.css';
import { User, Chat } from '../types';
import {
    Search, Plus, User as UserIcon, Settings, Menu, X,
    QrCode, ChevronRight, Shield, Github
} from 'lucide-react';
import { useState } from 'react';
import logoClean from '../../assets/logo_clean.png';
import { useLanguage } from '../i18n/LanguageContext';

interface SidebarProps {
    currentUser: User | null;
    chats: Chat[];
    activeChatId?: string;
    onChatSelect: (id: string) => void;
    onNewChat: () => void;
    onOpenSettings: () => void;
}

const formatTime = (ts: number): string => {
    if (!ts) return "";
    const date = new Date(ts * 1000);
    const now = new Date();

    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    if (date.getFullYear() === now.getFullYear()) {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }

    return date.toLocaleDateString([], { year: '2-digit', month: 'numeric', day: 'numeric' });
};

export function Sidebar({ currentUser, chats, activeChatId, onChatSelect, onNewChat, onOpenSettings }: SidebarProps) {
    const [isdrawerOpen, setIsDrawerOpen] = useState(false);
    const { t } = useLanguage();

    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <button className="btn-icon header-menu-btn" onClick={() => setIsDrawerOpen(true)}>
                    <Menu size={24} />
                </button>
                <div className="search-bar">
                    <Search size={18} />
                    <input type="text" placeholder={t('common.search')} className="search-input" />
                </div>
            </div>

            {/* Side Drawer */}
            <div className={`sidebar-drawer-overlay ${isdrawerOpen ? 'open' : ''}`} onClick={() => setIsDrawerOpen(false)}>
                <div className="sidebar-drawer" onClick={e => e.stopPropagation()}>
                    <div className="drawer-header">
                        <div className="user-profile-drawer">
                            <div className="avatar large gradient-ring">
                                {currentUser?.avatar_url ? (
                                    <img src={currentUser.avatar_url} alt="You" />
                                ) : (
                                    currentUser?.username?.charAt(0).toUpperCase() || <UserIcon size={32} />
                                )}
                            </div>
                            <div className="drawer-user-info">
                                <div className="font-bold text-xl">{currentUser?.username || "Guest"}</div>
                                <div className="text-sm opacity-70 truncate font-mono" style={{ maxWidth: '200px' }}>{currentUser?.id || "No ID"}</div>
                            </div>
                        </div>
                        <button className="btn-icon drawer-close" onClick={() => setIsDrawerOpen(false)}>
                            <X size={20} />
                        </button>
                    </div>

                    <div className="drawer-content">
                        <div className="drawer-section">
                            <button className="drawer-item modern" onClick={() => { onOpenSettings(); setIsDrawerOpen(false); }}>
                                <div className="icon-bg bg-blue"><Settings size={20} /></div>
                                <span>{t('common.settings')}</span>
                                <ChevronRight size={16} className="ml-auto opacity-30" />
                            </button>
                            <button className="drawer-item modern">
                                <div className="icon-bg bg-green"><UserIcon size={20} /></div>
                                <span>{t('common.contacts')}</span>
                                <ChevronRight size={16} className="ml-auto opacity-30" />
                            </button>
                            <button className="drawer-item modern">
                                <div className="icon-bg bg-purple"><QrCode size={20} /></div>
                                <span>{t('common.my_qr')}</span>
                                <ChevronRight size={16} className="ml-auto opacity-30" />
                            </button>
                        </div>

                        <div className="drawer-section mt-4">
                            <button className="drawer-item modern">
                                <div className="icon-bg bg-orange"><Shield size={20} /></div>
                                <span>Security & Privacy</span>
                            </button>
                            <button className="drawer-item modern" onClick={() => window.open('https://github.com/DimSimd2020/NeoChat')}>
                                <div className="icon-bg bg-gray"><Github size={20} /></div>
                                <span>Source Code</span>
                            </button>
                        </div>
                    </div>

                    <div className="drawer-footer">
                        <img src={logoClean} alt="NeoChat" className="version-logo large" />
                        <span className="version-text">{t('common.version')}</span>
                    </div>
                </div>
            </div>

            <div className="chat-list">
                {chats.length === 0 ? (
                    <div className="empty-state text-center py-12 opacity-30">
                        <p>{t('sidebar.no_chats')}</p>
                    </div>
                ) : (
                    chats.map((chat) => (
                        <div
                            key={chat.id}
                            className={`chat-item ${activeChatId === chat.id ? 'active' : ''}`}
                            onClick={() => onChatSelect(chat.id)}
                        >
                            <div className="avatar">
                                {chat.avatar_url ? (
                                    <img src={chat.avatar_url} alt={chat.name} />
                                ) : (
                                    chat.name.charAt(0).toUpperCase()
                                )}
                            </div>

                            <div className="chat-info">
                                <div className="chat-header">
                                    <span className="chat-name">{chat.name}</span>
                                    <span className="chat-time">
                                        {chat.last_message ? formatTime(chat.last_message.timestamp) : ''}
                                    </span>
                                </div>

                                <div className="bottom-row flex justify-between items-center">
                                    <div className="chat-msg">
                                        {chat.last_message?.sender_id === currentUser?.id ? "You: " : ""}
                                        {chat.last_message?.text || "No messages"}
                                    </div>
                                    {chat.unread_count > 0 && (
                                        <div className="unread-badge">{chat.unread_count}</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="fab-container">
                <button className="fab-btn fab-add" onClick={onNewChat} aria-label={t('sidebar.new_chat')}>
                    <Plus size={24} />
                </button>
            </div>
        </div>
    );
}
