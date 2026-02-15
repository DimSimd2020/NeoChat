import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import App from './App';
import { LanguageProvider } from './i18n/LanguageContext';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TauriService } from './services/TauriService';

vi.mock('./services/TauriService', () => ({
    TauriService: {
        getMyProfile: vi.fn(),
        getChats: vi.fn(() => Promise.resolve([])),
        getMessages: vi.fn(() => Promise.resolve([])),
        getContacts: vi.fn(() => Promise.resolve([])),
    }
}));

describe('App Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderApp = () => render(
        <LanguageProvider>
            <App />
        </LanguageProvider>
    );

    it('handles mobile view hiding main content when sidebar visible', async () => {
        // Mock innerWidth
        global.innerWidth = 400;
        fireEvent(window, new Event('resize'));

        (TauriService.getMyProfile as any).mockResolvedValue({ id: '1', username: 'Alice', is_registered: true });
        renderApp();
        await waitFor(() => screen.getByText('Alice'));

        // In mobile, if no chat selected, sidebar is shown, ChatWindow is hidden (via hidden class?)
        // App.tsx uses: const showSidebar = !isMobile || !activeChatId;
        expect(document.querySelector('.sidebar-container')).not.toHaveClass('hidden');
        expect(document.querySelector('.main-content')).toHaveClass('hidden');
    });

    it('shows ChatWindow on mobile when chat selected', async () => {
        global.innerWidth = 400;
        fireEvent(window, new Event('resize'));

        (TauriService.getMyProfile as any).mockResolvedValue({ id: '1', username: 'Alice', is_registered: true });
        (TauriService.getChats as any).mockResolvedValue([{ id: 'c1', name: 'Bob' }]);

        renderApp();
        await waitFor(() => screen.getByText('Bob'));

        fireEvent.click(screen.getByText('Bob'));

        await waitFor(() => {
            expect(document.querySelector('.main-content')).not.toHaveClass('hidden');
            expect(document.querySelector('.sidebar-container')).toHaveClass('hidden');
        });
    });

    it('shows loading state initially', () => {
        (TauriService.getMyProfile as any).mockReturnValue(new Promise(() => { })); // Never resolves
        renderApp();
        expect(screen.getByText('Loading...')).toBeDefined();
    });

    it('shows onboarding if user not registered', async () => {
        (TauriService.getMyProfile as any).mockResolvedValue({ id: '1', username: 'Guest', is_registered: false });
        renderApp();

        await waitFor(() => {
            expect(screen.getByText('Welcome to NeoChat')).toBeDefined();
        });
    });

    it('shows main dashboard if user registered', async () => {
        (TauriService.getMyProfile as any).mockResolvedValue({ id: '1', username: 'Alice', is_registered: true });
        (TauriService.getChats as any).mockResolvedValue([{ id: 'c1', name: 'Bob' }]);

        renderApp();

        await waitFor(() => {
            expect(screen.getByText('Alice')).toBeDefined();
            expect(screen.getByText('Bob')).toBeDefined();
        });
    });

    it('opens and closes settings', async () => {
        (TauriService.getMyProfile as any).mockResolvedValue({ id: '1', username: 'Alice', is_registered: true });
        renderApp();

        await waitFor(() => screen.getByText('Alice'));

        // Open settings via Menu button if possible, or trigger sidebar onOpenSettings
        // App renders Sidebar which has Menu button
        const menuBtn = screen.getByLabelText('Menu');
        fireEvent.click(menuBtn);

        const settingsBtn = screen.getByText('Настройки');
        fireEvent.click(settingsBtn);

        // In Settings component, it should show the account info
        await waitFor(() => {
            expect(screen.getByText('Публичный ключ (ID)')).toBeDefined();
        });
        const closeBtn = screen.getByLabelText('Close settings');
        fireEvent.click(closeBtn);

        await waitFor(() => {
            expect(screen.queryByText('Account')).toBeNull();
        });
    });

    it('opens new chat modal', async () => {
        (TauriService.getMyProfile as any).mockResolvedValue({ id: '1', username: 'Alice', is_registered: true });
        renderApp();
        await waitFor(() => screen.getByText('Alice'));

        const fab = screen.getByLabelText('Новый чат');
        fireEvent.click(fab);

        expect(screen.getByText('Новая беседа')).toBeDefined();
    });

    it('selects a chat', async () => {
        (TauriService.getMyProfile as any).mockResolvedValue({ id: '1', username: 'Alice', is_registered: true });
        (TauriService.getChats as any).mockResolvedValue([{ id: 'c1', name: 'Bob', participants: [], unread_count: 0 }]);

        renderApp();
        await waitFor(() => screen.getByText('Bob'));

        fireEvent.click(screen.getByText('Bob'));

        await waitFor(() => {
            expect(screen.queryByText('Select a chat to start messaging')).toBeNull();
            // The chat header in ChatWindow should now show 'Bob'
            const headers = screen.getAllByText('Bob');
            expect(headers.length).toBeGreaterThan(0);
        });
    });
});
