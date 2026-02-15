import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import './ChatWindow.css';
import { Chat, Message, User, TransportMode } from '../types';
import { TauriService } from '../services/TauriService';
import { MoreVertical, Send, Paperclip, Smile, Mic, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

const TRANSPORT_ICONS: Record<TransportMode, string> = {
    internet: '🌐',
    cdn_relay: '☁️',
    dns_tunnel: '📡',
    mesh: '🕸️',
    sms: '📱',
};

interface ChatWindowProps {
    chatId: string | null;
    currentUser: User | null;
    onBack?: () => void;
}

export function ChatWindow({ chatId, currentUser, onBack }: ChatWindowProps) {
    const { t } = useLanguage();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [currentChat, setCurrentChat] = useState<Chat | null>(null);
    const [loading, setLoading] = useState(false);
    const [showTransportMenu, setShowTransportMenu] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatId) {
            setLoading(true);
            TauriService.getChats().then(chats => {
                const chat = chats.find(c => c.id === chatId);
                setCurrentChat(chat || null);
            });
            // Fetch messages effectively
            const fetchMsgs = () => {
                TauriService.getMessages(chatId).then(setMessages);
            };
            fetchMsgs();
            setLoading(false);

            // Poll for local updates (synced by App.tsx)
            const interval = setInterval(fetchMsgs, 2000);
            return () => clearInterval(interval);
        } else {
            setCurrentChat(null);
            setMessages([]);
        }
    }, [chatId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSend = async () => {
        if (!inputText.trim() || !chatId) return;

        try {
            const tempId = `temp_${Date.now()}`;
            const optimisticMsg: Message = {
                id: tempId,
                chat_id: chatId,
                sender_id: currentUser?.id || '',
                text: inputText,
                timestamp: Date.now() / 1000,
                status: 'sending',
                transport: currentChat?.transport || 'internet',
            };

            setMessages(prev => [...prev, optimisticMsg]);
            setInputText('');

            const sentMsg = await TauriService.sendMessage(chatId, inputText);

            setMessages(prev => prev.map(m => m.id === tempId ? sentMsg : m));
        } catch (error) {
            console.error("Failed to send", error);
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!chatId) {
        return (
            <div className="chat-window empty-state">
                <div className="empty-state-card">
                    <h3>{t('chats.select_chat')}</h3>
                    <p className="text-sm text-secondary">{t('chats.select_chat_desc')}</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return <div className="chat-window loading-state">{t('common.loading')}</div>;
    }

    return (
        <div className="chat-window">
            {/* Header */}
            <div className="chat-header">
                <div className="chat-header-left">
                    {onBack && (
                        <button onClick={onBack} className="btn-icon back-btn" aria-label={t('common.back')}>
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <div className="avatar">
                        {currentChat?.avatar_url ? (
                            <img src={currentChat.avatar_url} alt={currentChat.name} />
                        ) : (
                            currentChat?.name.charAt(0).toUpperCase()
                        )}
                    </div>
                    <div>
                        <div className="font-bold">{currentChat?.name}</div>
                        <div className="text-xs text-secondary">{t('chats.last_seen')}</div>
                    </div>
                </div>
                <div className="chat-header-right">
                    <div className="transport-indicator-wrap">
                        <button
                            className="transport-indicator"
                            onClick={() => setShowTransportMenu(!showTransportMenu)}
                            title={t(`transport.${currentChat?.transport || 'internet'}`)}
                        >
                            <span className="transport-icon">{TRANSPORT_ICONS[currentChat?.transport || 'internet']}</span>
                            <span className="transport-label">{t(`transport.${currentChat?.transport || 'internet'}`)}</span>
                        </button>
                        {showTransportMenu && (
                            <div className="transport-dropdown">
                                {(Object.keys(TRANSPORT_ICONS) as TransportMode[]).map(mode => (
                                    <button
                                        key={mode}
                                        className={`transport-option ${currentChat?.transport === mode ? 'active' : ''}`}
                                        onClick={() => {
                                            if (currentChat) {
                                                setCurrentChat({ ...currentChat, transport: mode });
                                            }
                                            setShowTransportMenu(false);
                                        }}
                                    >
                                        <span>{TRANSPORT_ICONS[mode]}</span>
                                        <span>{t(`transport.${mode}`)}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <button className="btn-icon" aria-label={t('chats.more_options')}>
                        <MoreVertical size={20} />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="chat-messages">
                {messages.map((msg) => {
                    const isMe = msg.sender_id === currentUser?.id;
                    return (
                        <div key={msg.id} className={`message-bubble ${isMe ? 'me' : 'them'}`}>
                            <div className="msg-text">{msg.text}</div>
                            <div className="msg-meta">
                                <span className="msg-time">
                                    {new Date(msg.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {isMe && (
                                    <span className="msg-status">
                                        {msg.status === 'read' ? '✓✓' : msg.status === 'delivered' ? '✓' : '•'}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="chat-input-area">
                <button className="btn-icon" aria-label={t('chats.attach_file')}>
                    <Paperclip size={20} />
                </button>
                <textarea
                    className="chat-input"
                    placeholder={t('chats.write_message')}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                />
                <button className="btn-icon" aria-label={t('chats.emoji')}>
                    <Smile size={20} />
                </button>
                {inputText ? (
                    <button className="btn-send" onClick={handleSend} aria-label={t('chats.send')}>
                        <Send size={20} />
                    </button>
                ) : (
                    <button className="btn-icon" aria-label={t('chats.voice')}>
                        <Mic size={20} />
                    </button>
                )}
            </div>
        </div>
    );
}
