import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TauriService } from './TauriService';
import { invoke } from '@tauri-apps/api/core';

vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

describe('TauriService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('getChats returns list of chats', async () => {
        const mockChats = [{ id: '1', name: 'Test Chat' }];
        (invoke as any).mockResolvedValue(mockChats);

        const chats = await TauriService.getChats();
        expect(chats).toEqual(mockChats);
        expect(invoke).toHaveBeenCalledWith('get_chats');
    });

    it('sendMessage returns a message object', async () => {
        const mockMsg = { id: 'm1', text: 'Hello', chat_id: '1' };
        (invoke as any).mockResolvedValue(mockMsg);

        const msg = await TauriService.sendMessage('1', 'Hello');
        expect(msg).toEqual(mockMsg);
        expect(invoke).toHaveBeenCalledWith('send_message', { chatId: '1', text: 'Hello' });
    });

    it('searchUsers returns hits', async () => {
        const mockUsers = [{ id: 'u1', name: 'Alice' }];
        (invoke as any).mockResolvedValue(mockUsers);

        const results = await TauriService.searchUsers('Alice');
        expect(results).toEqual(mockUsers);
        expect(invoke).toHaveBeenCalledWith('search_users', { query: 'Alice' });
    });

    it('updateProfile calls tauri command', async () => {
        (invoke as any).mockResolvedValue(undefined);
        await TauriService.updateProfile('NewName', 'avatar_data');
        expect(invoke).toHaveBeenCalledWith('update_profile', { name: 'NewName', avatar: 'avatar_data' });
    });
});
