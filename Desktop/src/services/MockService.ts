import { Chat, Message, NetworkStatus, User } from '../types';

/**
 * MockService — used only for dev/testing without Tauri backend.
 * No fake contacts/chats. Clean state.
 */
export class MockService {
    private static readonly DELAY_MS = 300;

    private static readonly MY_PROFILE: User = {
        id: "my_local_pubkey_12345",
        username: "Me",
        status: "online",
        last_seen: Math.floor(Date.now() / 1000),
        is_registered: true
    };

    private static CHATS: Chat[] = [];
    private static MESSAGES: Record<string, Message[]> = {};

    static async getMyProfile(): Promise<User> {
        await this.delay();
        return this.MY_PROFILE;
    }

    static async getChats(): Promise<Chat[]> {
        await this.delay();
        return this.CHATS;
    }

    static async getMessages(chatId: string): Promise<Message[]> {
        await this.delay();
        return this.MESSAGES[chatId] || [];
    }

    static async sendMessage(chatId: string, text: string): Promise<Message> {
        await this.delay();
        const newMessage: Message = {
            id: `msg_${Date.now()}`,
            chat_id: chatId,
            sender_id: this.MY_PROFILE.id,
            text,
            timestamp: Math.floor(Date.now() / 1000),
            status: "sending",
            transport: "internet",
        };

        if (!this.MESSAGES[chatId]) {
            this.MESSAGES[chatId] = [];
        }
        this.MESSAGES[chatId].push(newMessage);
        return newMessage;
    }

    static async createChat(participantPubkey: string): Promise<Chat> {
        await this.delay();
        const newChat: Chat = {
            id: `chat_${Date.now()}`,
            name: `User ${participantPubkey.slice(0, 8)}`,
            chat_type: "private",
            unread_count: 0,
            participants: [this.MY_PROFILE.id, participantPubkey],
            transport: "internet",
        };
        this.CHATS.push(newChat);
        this.MESSAGES[newChat.id] = [];
        return newChat;
    }

    static async getNetworkStatus(): Promise<NetworkStatus> {
        return 'connected';
    }

    private static delay(): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, this.DELAY_MS));
    }
}
