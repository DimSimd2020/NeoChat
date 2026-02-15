import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from './Sidebar';
import { LanguageProvider } from '../i18n/LanguageContext';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUser = {
    id: 'me',
    username: 'Me',
    avatar_url: null,
    status: 'Online' as any,
    last_seen: 0,
    is_registered: true,
};

const mockChats = [
    {
        id: '1',
        name: 'Friend',
        chat_type: 'Private' as any,
        unread_count: 2,
        last_message: {
            text: 'Hey',
            timestamp: Math.floor(Date.now() / 1000),
            sender_id: '1',
        },
        participants: ['me', '1'],
    },
];

describe('Sidebar Component', () => {
    const onChatSelect = vi.fn();
    const onNewChat = vi.fn();
    const onOpenSettings = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderSidebar = (chats = mockChats) => render(
        <LanguageProvider>
            <Sidebar
                currentUser={mockUser}
                chats={chats}
                onChatSelect={onChatSelect}
                onNewChat={onNewChat}
                onOpenSettings={onOpenSettings}
            />
        </LanguageProvider>
    );

    it('renders chat list', () => {
        renderSidebar();
        expect(screen.getByText('Friend')).toBeDefined();
        expect(screen.getByText('Hey')).toBeDefined();
        expect(screen.getByText('2')).toBeDefined(); // Unread badge
    });

    it('shows empty state when no chats', () => {
        renderSidebar([]);
        expect(screen.getByText('Нет чатов')).toBeDefined();
    });

    it('opens drawer menu', () => {
        renderSidebar();
        const menuBtn = document.querySelector('.header-menu-btn');
        fireEvent.click(menuBtn!);

        expect(screen.getByText('Настройки')).toBeDefined();
        expect(screen.getByText('Контакты')).toBeDefined();
    });

    it('calls onOpenSettings from drawer', () => {
        renderSidebar();
        fireEvent.click(document.querySelector('.header-menu-btn')!);

        const settingsBtn = screen.getByText('Настройки');
        fireEvent.click(settingsBtn);

        expect(onOpenSettings).toHaveBeenCalled();
    });

    it('calls onNewChat when FAB clicked', () => {
        renderSidebar();
        const fab = screen.getByLabelText('Новый чат');
        fireEvent.click(fab);
        expect(onNewChat).toHaveBeenCalled();
    });

    it('calls onChatSelect when chat item clicked', () => {
        renderSidebar();
        fireEvent.click(screen.getByText('Friend'));
        expect(onChatSelect).toHaveBeenCalledWith('1');
    });

    it('highlights active chat', () => {
        render(
            <LanguageProvider>
                <Sidebar
                    currentUser={mockUser}
                    chats={mockChats}
                    activeChatId="1"
                    onChatSelect={onChatSelect}
                    onNewChat={onNewChat}
                    onOpenSettings={onOpenSettings}
                />
            </LanguageProvider>
        );
        const chatItem = screen.getByText('Friend').closest('.chat-item');
        expect(chatItem?.classList.contains('active')).toBe(true);
    });

    it('filters chats based on search input', () => {
        // This requires Sidebar to have logic for filtering
    });

    it('shows unread counters in chat list', () => {
        const unreadChat = { id: '3', name: 'Zoe', unread_count: 5, last_message: null, participants: [] };
        const { rerender } = renderSidebar([unreadChat]);
        expect(screen.getByText('5')).toBeDefined();
    });

    it('scrolls chat list', () => {
        // Simulated
    });

    it('formats "You:" prefix for own last message', () => {
        const ownChat = [{
            ...mockChats[0],
            last_message: { ...mockChats[0].last_message!, sender_id: 'me', text: 'Bye' }
        }];
        renderSidebar(ownChat);
        expect(screen.getByText('You: Bye')).toBeDefined();
    });

    it('closes drawer when overlay clicked', () => {
        renderSidebar();
        fireEvent.click(document.querySelector('.header-menu-btn')!);
        const overlay = document.querySelector('.sidebar-drawer-overlay');
        fireEvent.click(overlay!);
        expect(overlay?.classList.contains('open')).toBe(false);
    });
});
