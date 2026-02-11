import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import './ChatWindow.css';
import { Chat, Message, User } from '../types';
import { TauriService } from '../services/TauriService';
import { MoreVertical, Send, Paperclip, Smile, Mic, ArrowLeft } from 'lucide-react';

interface ChatWindowProps {
    chatId: string | null;
    currentUser: User | null;
    onBack?: () => void;
}

export function ChatWindow({ chatId, currentUser, onBack }: ChatWindowProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [currentChat, setCurrentChat] = useState<Chat | null>(null);
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatId) {
            setLoading(true);
            TauriService.getChats().then(chats => {
                const chat = chats.find(c => c.id === chatId);
                setCurrentChat(chat || null);
            });
            // Fetch messages
            TauriService.getMessages(chatId).then(msgs => {
                setMessages(msgs);
                setLoading(false);
            });
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
                status: 'sending'
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
                <div className="p-4 bg-card rounded-lg flex flex-col items-center gap-2">
                    <h3>Select a chat to start messaging</h3>
                    <p className="text-sm text-secondary">Choose a conversation from the sidebar</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return <div className="chat-window flex items-center justify-center">Loading...</div>;
    }

    return (
        <div className="chat-window">
            {/* Header */}
            <div className="chat-header">
                <div className="flex items-center gap-4">
                    {onBack && (
                        <button onClick={onBack} className="md:hidden btn-icon" aria-label="Back">
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
                        <div className="text-xs text-secondary">last seen recently</div>
                    </div>
                </div>
                <button className="btn-icon" aria-label="More options">
                    <MoreVertical size={20} />
                </button>
            </div>

            {/* Messages */}
            <div className="chat-messages">
                {messages.map((msg) => {
                    const isMe = msg.sender_id === currentUser?.id;
                    return (
                        <div key={msg.id} className={`message-bubble ${isMe ? 'me' : 'them'}`}>
                            <div className="msg-text">{msg.text}</div>
                            <div className="flex justify-end items-center gap-1">
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
                <button className="btn-icon" aria-label="Attach file">
                    <Paperclip size={20} />
                </button>
                <textarea
                    className="chat-input"
                    placeholder="Write a message..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                />
                <button className="btn-icon" aria-label="Add emoji">
                    <Smile size={20} />
                </button>
                {inputText ? (
                    <button className="btn-send" onClick={handleSend} aria-label="Send message">
                        <Send size={20} />
                    </button>
                ) : (
                    <button className="btn-icon" aria-label="Voice message">
                        <Mic size={20} />
                    </button>
                )}
            </div>
        </div>
    );
}
