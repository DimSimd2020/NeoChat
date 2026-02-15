import { render, screen, fireEvent } from '@testing-library/react';
import { Settings } from './Settings';
import { LanguageProvider } from '../i18n/LanguageContext';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUser = {
    id: 'test-id',
    username: 'TestUser',
    status: 'Online' as any,
    last_seen: 0,
    is_registered: true,
};

describe('Settings Component', () => {
    const onClose = vi.fn();

    beforeEach(() => {
        localStorage.clear();
    });

    const renderSettings = () => render(
        <LanguageProvider>
            <Settings currentUser={mockUser} onClose={onClose} />
        </LanguageProvider>
    );

    it('renders account tab by default', () => {
        renderSettings();
        expect(screen.getByText('TestUser')).toBeDefined();
        expect(screen.getByText('Публичный ключ (ID)')).toBeDefined();
    });

    it('switches to appearance tab and back', () => {
        renderSettings();

        // Find appearance button in sidebar
        const appearanceBtn = screen.getByText('Внешний вид');
        fireEvent.click(appearanceBtn);

        expect(screen.getByText('Выберите язык')).toBeDefined();
        expect(screen.getByText('Тема')).toBeDefined();

        // Go back to account
        const accountBtn = screen.getByText('Аккаунт');
        fireEvent.click(accountBtn);
        expect(screen.getByText('TestUser')).toBeDefined();
    });

    it('changes language to English', () => {
        renderSettings();

        fireEvent.click(screen.getByText('Внешний вид'));
        const enBtn = screen.getByText('English');
        fireEvent.click(enBtn);

        expect(screen.getByText('Appearance')).toBeDefined();
        expect(screen.getByText('Select Language')).toBeDefined();
    });

    it('toggles neon mode', () => {
        renderSettings();
        fireEvent.click(screen.getByText('Внешний вид'));

        const neonToggle = screen.getByText('Неоновый режим').closest('.toggle-control');
        const switch_ = neonToggle?.querySelector('.toggle-switch');

        expect(switch_?.classList.contains('checked')).toBe(false);
        fireEvent.click(switch_!);
        expect(switch_?.classList.contains('checked')).toBe(true);
        expect(localStorage.getItem('neonMode')).toBe('true');
    });

    it('persists active tab after rerender', () => {
        const { unmount } = renderSettings();
        fireEvent.click(screen.getByText('Приватность'));
        expect(localStorage.getItem('settings_active_tab')).toBe('privacy');

        unmount();
        renderSettings();
        expect(screen.getByText('Таймер самоуничтожения')).toBeDefined();
    });

    it('calls onClose when X button clicked', () => {
        renderSettings();
        const closeBtn = document.querySelector('.btn-close');
        fireEvent.click(closeBtn!);
        expect(onClose).toHaveBeenCalled();
    });

    it('displays QR code for user ID', () => {
        renderSettings();
        const qr = document.querySelector('svg');
        expect(qr).toBeDefined();
    });

    it('persists neon mode through multiple toggles', () => {
        renderSettings();
        fireEvent.click(screen.getByText('Внешний вид'));
        const neonToggle = screen.getByText('Неоновый режим').closest('.toggle-control');
        const switch_ = neonToggle?.querySelector('.toggle-switch');

        // Toggle ON
        fireEvent.click(switch_!);
        expect(localStorage.getItem('neonMode')).toBe('true');

        // Toggle OFF
        fireEvent.click(switch_!);
        expect(localStorage.getItem('neonMode')).toBe('false');
    });

    it('updates profile avatar via camera click (simulated)', () => {
        renderSettings();
        const cameraIcon = document.querySelector('.camera-icon') || document.querySelector('svg.lucide-camera');
        expect(cameraIcon).toBeDefined();
        // In real app it opens file dialog, here we test if it doesn't crash
        fireEvent.click(cameraIcon!);
    });

    it('shows uniffi public key correctly', () => {
        renderSettings();
        expect(screen.getByText('test-id')).toBeDefined();
    });

    it('renders chat customization options', () => {
        renderSettings();
        fireEvent.click(screen.getByText('Чаты'));
        expect(screen.getByText('Фон чата')).toBeDefined();
        expect(screen.getByText('Стандартный')).toBeDefined();
        expect(screen.getByText('Градиент')).toBeDefined();
    });

    it('renders storage management options', () => {
        renderSettings();
        fireEvent.click(screen.getByText('Хранилище'));
        expect(screen.getByText('Кэш')).toBeDefined();
        expect(screen.getByText('Очистить кэш')).toBeDefined();
    });

    it('renders privacy toggle', () => {
        renderSettings();
        fireEvent.click(screen.getByText('Приватность'));
        expect(screen.getByText('Таймер самоуничтожения')).toBeDefined();
    });
});
