import { Message, User } from '../types';

interface MessageBubbleProps {
    message: Message;
    currentUser: User | null;
}

export function MessageBubble({ message, currentUser }: MessageBubbleProps) {
    const isMe = message.sender_id === currentUser?.id;
    return (
        <div className={`message-bubble ${isMe ? 'me' : 'them'}`}>
            <div className="msg-text">{message.text}</div>
            <div className="flex justify-end items-center gap-1">
                <span className="msg-time">
                    {new Date(message.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {isMe && (
                    <span className="msg-status">
                        {message.status === 'read' ? '✓✓' : message.status === 'delivered' ? '✓' : '•'}
                    </span>
                )}
            </div>
        </div>
    );
}
