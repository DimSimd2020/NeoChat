export type UserStatus = 'online' | 'offline' | 'typing';

export interface User {
    id: string; // pubkey_string_base32
    username: string;
    status: UserStatus;
    last_seen: number; // unix timestamp
    avatar_url?: string;
    is_registered: boolean;
}

export interface Contact {
    id: string;
    name: string;
    avatar_url?: string;
    status: UserStatus;
    phone_number?: string; // For SMS fallback mode
}

export type ChatType = 'private' | 'group';
export type TransportMode = 'internet' | 'cdn_relay' | 'dns_tunnel' | 'mesh' | 'sms';

export interface Chat {
    id: string; // chat_uuid_v4
    chat_type: ChatType;
    name: string;
    avatar_url?: string;
    unread_count: number;
    last_message?: {
        text: string;
        timestamp: number;
        sender_id: string;
    };
    participants: string[];
    transport: TransportMode;
}

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Message {
    id: string;
    chat_id: string;
    sender_id: string;
    text: string;
    timestamp: number;
    status: MessageStatus;
    attachments?: string[];
    transport: TransportMode;
}

export type NetworkStatus = 'connected' | 'disconnected' | 'connecting';
