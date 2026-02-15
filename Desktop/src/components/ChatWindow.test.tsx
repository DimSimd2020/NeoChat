import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatWindow } from './ChatWindow';
import { LanguageProvider } from '../i18n/LanguageContext';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TauriService } from '../services/TauriService';

vi.mock('../services/TauriService', () => ({
    TauriService: {
        getChats: vi.fn(() => Promise.resolve([
            { id: 'c1', name: 'Bob', avatar_url: null }
        ])),
        getMessages: vi.fn(() => Promise.resolve([
            { id: 'm1', chat_id: 'c1', sender_id: 'other', text: 'Hello Alice', timestamp: 12345678, status: 'read' }
        ])),
        sendMessage: vi.fn((cid, text) => Promise.resolve({
            id: 'm2', chat_id: cid, sender_id: 'me', text: text, timestamp: Date.now() / 1000, status: 'sent'
        })),
    }
}));

const currentUser = { id: 'me', username: 'Alice', is_registered: true, avatar_url: null, status: 'Online' as any, last_seen: 0 };

describe('ChatWindow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders empty state when no chatId', () => {
        render(<ChatWindow chatId={null} currentUser={currentUser} />);
        expect(screen.getByText('Select a chat to start messaging')).toBeDefined();
    });

    it('loads chat and messages', async () => {
        render(<ChatWindow chatId="c1" currentUser={currentUser} />);

        await waitFor(() => {
            expect(screen.getByText('Bob')).toBeDefined();
            expect(screen.getByText('Hello Alice')).toBeDefined();
        });
    });

    it('sends a message on button click', async () => {
        render(<ChatWindow chatId="c1" currentUser={currentUser} />);
        await waitFor(() => screen.getByText('Bob'));

        const input = screen.getByPlaceholderText('Write a message...');
        fireEvent.change(input, { target: { value: 'How are you?' } });

        const sendBtn = screen.getByLabelText('Send message');
        fireEvent.click(sendBtn);

        await waitFor(() => {
            expect(TauriService.sendMessage).toHaveBeenCalledWith('c1', 'How are you?');
            expect(screen.getByText('How are you?')).toBeDefined();
            expect(input).toHaveValue('');
        });
    });

    it('sends a message on Enter', async () => {
        render(<ChatWindow chatId="c1" currentUser={currentUser} />);
        await waitFor(() => screen.getByText('Bob'));

        const input = screen.getByPlaceholderText('Write a message...');
        fireEvent.change(input, { target: { value: 'Enter test' } });
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

        await waitFor(() => {
            expect(TauriService.sendMessage).toHaveBeenCalledWith('c1', 'Enter test');
        });
    });

    it('does not send empty message', async () => {
        render(<ChatWindow chatId="c1" currentUser={currentUser} />);
        await waitFor(() => screen.getByText('Bob'));

        const input = screen.getByPlaceholderText('Write a message...');
        fireEvent.change(input, { target: { value: '   ' } });
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

        expect(TauriService.sendMessage).not.toHaveBeenCalled();
    });

    it('shows voice mic when input is empty', async () => {
        render(<ChatWindow chatId="c1" currentUser={currentUser} />);
        await waitFor(() => screen.getByText('Bob'));
        expect(screen.getByLabelText('Voice message')).toBeDefined();
    });

    it('switches to send icon when typing', async () => {
        render(<ChatWindow chatId="c1" currentUser={currentUser} />);
        await waitFor(() => screen.getByText('Bob'));

        fireEvent.change(screen.getByPlaceholderText('Write a message...'), { target: { value: 'a' } });
        expect(screen.getByLabelText('Send message')).toBeDefined();
    });
});
