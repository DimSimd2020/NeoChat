
import { invoke } from '@tauri-apps/api/core';
import { Chat, Contact, Message, NetworkStatus, User } from '../types';

export interface SmsEnvelope {
    id: string;
    recipient_phone: string;
    encrypted_payload: string;
}

export class TauriService {
    static async getMyProfile(): Promise<User> {
        return await invoke<User>('get_my_profile');
    }

    static async registerUser(username: string): Promise<User> {
        return await invoke<User>('register_user', { username });
    }

    static async getChats(): Promise<Chat[]> {
        return await invoke<Chat[]>('get_chats');
    }

    static async getMessages(chatId: string): Promise<Message[]> {
        return await invoke<Message[]>('get_messages', { chatId, limit: 50, offset: 0 });
    }

    static async sendMessage(chatId: string, text: string): Promise<Message> {
        return await invoke<Message>('send_message', { chatId, text });
    }

    static async createChat(participantPubkey: string): Promise<Chat> {
        return await invoke<Chat>('create_chat', { pubkey: participantPubkey });
    }

    static async createGroup(name: string, participants: string[]): Promise<Chat> {
        return await invoke<Chat>('create_group', { name, participants });
    }

    static async getContacts(): Promise<Contact[]> {
        return await invoke<Contact[]>('get_contacts');
    }

    static async searchUsers(query: string): Promise<Contact[]> {
        return await invoke<Contact[]>('search_users', { query });
    }

    static async addContact(pubkey: string, name: string): Promise<void> {
        return await invoke<void>('add_contact', { pubkey, name });
    }
    
    static async addContactWithPhone(pubkey: string, name: string, phone: string): Promise<void> {
        return await invoke<void>('add_contact_with_phone', { pubkey, name, phone });
    }

    static async getNetworkStatus(): Promise<NetworkStatus> {
        return await invoke<NetworkStatus>('get_network_info');
    }

    static async updateProfile(name: string, avatar: string | null): Promise<void> {
        return await invoke<void>('update_profile', { name, avatar });
    }

    static async clearDatabase(): Promise<void> {
        return await invoke<void>('clear_database');
    }
    
    // SMS Logic
    static async pollOutgoingSms(): Promise<SmsEnvelope[]> {
        return await invoke<SmsEnvelope[]>('poll_outgoing_sms');
    }
    
    static async markSmsSent(msgId: string): Promise<void> {
        return await invoke<void>('mark_sms_sent', { msgId });
    }
}
