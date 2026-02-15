import { Chat } from '../types';

interface ChatItemProps {
    chat: Chat;
    isActive: boolean;
    onClick: () => void;
    formatTime: (ts: number) => string;
}

export function ChatItem({ chat, isActive, onClick, formatTime }: ChatItemProps) {
    return (
        <div
            className={`chat-item ${isActive ? 'active' : ''} ${chat.unread_count > 0 ? 'unread' : ''}`}
            onClick={onClick}
        >
            <div className="avatar">
                {chat.avatar_url ? (
                    <img src={chat.avatar_url} alt={chat.name} />
                ) : (
                    chat.name.charAt(0).toUpperCase()
                )}
                {chat.unread_count > 0 && <div className="unread-badge">{chat.unread_count}</div>}
            </div>
            <div className="chat-info">
                <div className="chat-name-row">
                    <span className="chat-name">{chat.name}</span>
                    <span className="chat-time">{chat.last_message ? formatTime(chat.last_message.timestamp) : ""}</span>
                </div>
                <div className="chat-last-msg">
                    {chat.last_message ? chat.last_message.text : "No messages yet"}
                </div>
            </div>
        </div>
    );
}
