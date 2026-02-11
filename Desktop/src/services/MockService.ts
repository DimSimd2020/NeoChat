import { Chat, Message, NetworkStatus, User } from '../types';

export class MockService {
    private static readonly DELAY_MS = 300; // Simulate network latency

    private static readonly MY_PROFILE: User = {
        id: "my_local_pubkey_12345",
        username: "Me",
        status: "online",
        last_seen: 1678886400,
        is_registered: true
    };

    private static readonly CONTACT_ALICE: User = {
        id: "remote_pubkey_67890",
        username: "Alice",
        status: "online",
        last_seen: 1678886400,
        is_registered: true
    };

    private static readonly CHATS: Chat[] = [
        {
            id: "chat_1",
            name: "Alice",
            chat_type: "private",
            unread_count: 1,
            last_message: {
                text: "Hi there!",
                timestamp: 1678886405,
                sender_id: "remote_pubkey_67890",
            },
            participants: ["remote_pubkey_67890"],
        },
        {
            id: "chat_2",
            name: "Local Test Group",
            chat_type: "group",
            unread_count: 0,
            last_message: {
                text: "Welcome to NeoChat!",
                timestamp: 1678880000,
                sender_id: "my_local_pubkey_12345"
            },
            participants: ["my_local_pubkey_12345", "remote_pubkey_67890"]
        }
    ];

    private static readonly MESSAGES: Record<string, Message[]> = {
        "chat_1": [
            {
                id: "msg_0",
                chat_id: "chat_1",
                sender_id: "my_local_pubkey_12345",
                text: "Hello, Alice! (Contact ID: " + "remote_pubkey_67890" + ")", // Just to use the string if needed, or better:
                timestamp: 1678886300,
                status: "read",
            },
            {
                id: "msg_1",
                chat_id: "chat_1",
                sender_id: "remote_pubkey_67890",
                text: "Hi there!",
                timestamp: 1678886405,
                status: "read",
            },
        ],
        "chat_2": [
            {
                id: "msg_sys_1",
                chat_id: "chat_2",
                sender_id: "my_local_pubkey_12345",
                text: "Welcome to NeoChat!",
                timestamp: 1678880000,
                status: "read",
            }
        ]
    };

    // --- API ---

    static async getMyProfile(): Promise<User> {
        await this.delay();
        return this.MY_PROFILE;
    }

    // Expose for testing if needed, or remove unused warning by using it:
    static getAliceProfile(): User {
        return this.CONTACT_ALICE;
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
            timestamp: Date.now() / 1000,
            status: "sending",
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
            name: `New Chat ${participantPubkey.slice(0, 5)}`,
            chat_type: "private",
            unread_count: 0,
            participants: [this.MY_PROFILE.id, participantPubkey],
            last_message: {
                text: "Chat created",
                timestamp: Date.now() / 1000,
                sender_id: this.MY_PROFILE.id
            }
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
