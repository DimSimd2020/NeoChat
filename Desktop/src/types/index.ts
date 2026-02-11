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
}

export type ChatType = 'private' | 'group';

export interface Chat {
    id: string; // chat_uuid_v4
    chat_type: ChatType; // Updated field name to match Rust uniffi
    name: string;
    avatar_url?: string;
    unread_count: number;
    last_message?: {
        text: string;
        timestamp: number;
        sender_id: string;
    };
    participants: string[]; // pubkeys
}

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Message {
    id: string; // msg_uuid_v4
    chat_id: string;
    sender_id: string; // pubkey_string_base32
    text: string;
    timestamp: number;
    status: MessageStatus;
    attachments?: string[]; // list of file paths or metadata
}

export type NetworkStatus = 'connected' | 'disconnected' | 'connecting';
