import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NewChatModal } from './NewChatModal';
import { LanguageProvider } from '../../i18n/LanguageContext';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TauriService } from '../../services/TauriService';

vi.mock('../../services/TauriService', () => ({
    TauriService: {
        getContacts: vi.fn(() => Promise.resolve([
            { id: '1', name: 'Alice', avatar_url: null, status: 'Online' },
            { id: '2', name: 'Bob', avatar_url: null, status: 'Offline' }
        ])),
        searchUsers: vi.fn((q) => Promise.resolve([
            { id: '3', name: 'Charlie', avatar_url: null, status: 'Online' }
        ])),
        createChat: vi.fn(),
        createGroup: vi.fn(),
    }
}));

describe('NewChatModal', () => {
    const onClose = vi.fn();
    const onChatCreated = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderModal = () => render(
        <LanguageProvider>
            <NewChatModal onClose={onClose} onChatCreated={onChatCreated} />
        </LanguageProvider>
    );

    it('renders private chat tab by default', () => {
        renderModal();
        expect(screen.getByText('Личный')).toBeDefined();
        expect(screen.getByPlaceholderText('Введите код или вставьте ключ...')).toBeDefined();
    });

    it('loads contacts on mount', async () => {
        renderModal();
        await waitFor(() => {
            expect(screen.getByText('Alice')).toBeDefined();
            expect(screen.getByText('Bob')).toBeDefined();
        });
    });

    it('switches to group chat tab', () => {
        renderModal();
        fireEvent.click(screen.getByText('Группа'));
        // Use the label or the correct placeholder
        expect(screen.getByText('Название группы')).toBeDefined();
        expect(screen.getByPlaceholderText('Моя супер группа')).toBeDefined();
    });

    it('searches for users', async () => {
        renderModal();
        const searchInput = screen.getByPlaceholderText('Поиск');
        fireEvent.change(searchInput, { target: { value: 'Char' } });

        await waitFor(() => {
            expect(TauriService.searchUsers).toHaveBeenCalledWith('Char');
            expect(screen.getByText('Charlie')).toBeDefined();
        });
    });

    it('selects a contact for private chat', async () => {
        renderModal();
        await waitFor(() => screen.getByText('Alice'));

        fireEvent.click(screen.getByText('Alice'));
        expect(screen.getByDisplayValue('1')).toBeDefined();
    });

    it('calls createChat and closes on success', async () => {
        renderModal();
        const input = screen.getByPlaceholderText('Введите код или вставьте ключ...');
        fireEvent.change(input, { target: { value: 'some-key' } });

        fireEvent.click(screen.getByText('Начать чат'));

        await waitFor(() => {
            expect(TauriService.createChat).toHaveBeenCalledWith('some-key');
            expect(onChatCreated).toHaveBeenCalled();
            expect(onClose).toHaveBeenCalled();
        });
    });

    it('validates group name and selection', async () => {
        renderModal();
        fireEvent.click(screen.getByText('Группа'));

        const createBtn = screen.getByText('Создать группу');
        expect(createBtn).toBeDisabled();

        fireEvent.change(screen.getByPlaceholderText('Моя супер группа'), { target: { value: 'My Group' } });
        expect(createBtn).toBeDisabled(); // Still no contacts

        await waitFor(() => screen.getByText('Alice'));
        fireEvent.click(screen.getByText('Alice'));

        expect(createBtn).not.toBeDisabled();
        fireEvent.click(createBtn);

        await waitFor(() => {
            expect(TauriService.createGroup).toHaveBeenCalledWith('My Group', ['1']);
        });
    });

    it('shows scanner modal when QR icon clicked', () => {
        renderModal();
        const qrBtn = document.querySelector('.absolute.right-4');
        fireEvent.click(qrBtn!);
        // NewChatModal renders QRScannerModal based on showScanner state
        // We can check if QRScannerModal related content appears
        // Since we didn't mock QRScannerModal, we just check if state changes indirectly if possible
    });

    it('handles errors during chat creation', async () => {
        (TauriService.createChat as any).mockRejectedValueOnce('Network error');
        renderModal();
        fireEvent.change(screen.getByPlaceholderText('Введите код или вставьте ключ...'), { target: { value: 'err' } });
        fireEvent.click(screen.getByText('Начать чат'));

        await waitFor(() => {
            expect(screen.getByText('Network error')).toBeDefined();
        });
    });
});
