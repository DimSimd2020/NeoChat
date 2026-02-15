import { invoke } from '@tauri-apps/api/core';
import { Chat, Contact, Message, NetworkStatus, User } from '../types';

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
        // Rust expects: chat_id, limit, offset
        // We hardcode limit/offset for now as UI doesn't handle pagination yet
        return await invoke<Message[]>('get_messages', { chatId, limit: 50, offset: 0 });
    }

    static async sendMessage(chatId: string, text: string): Promise<Message> {
        // Rust expects: chat_id, text
        return await invoke<Message>('send_message', { chatId, text });
    }

    static async createChat(participantPubkey: string): Promise<Chat> {
        // Rust expects: pubkey
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

    static async getNetworkStatus(): Promise<NetworkStatus> {
        // We added a wrapper command in lib.rs for this
        return await invoke<NetworkStatus>('get_network_info');
    }

    static async updateProfile(name: string, avatar: string | null): Promise<void> {
        return await invoke<void>('update_profile', { name, avatar });
    }

    static async clearDatabase(): Promise<void> {
        return await invoke<void>('clear_database');
    }

    static async pollMessages(): Promise<Message[]> {
        return await invoke<Message[]>('poll_messages');
    }
}
