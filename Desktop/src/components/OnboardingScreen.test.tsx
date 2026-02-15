import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OnboardingScreen } from './OnboardingScreen';
import { LanguageProvider } from '../i18n/LanguageContext';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TauriService } from '../services/TauriService';

vi.mock('../services/TauriService', () => ({
    TauriService: {
        registerUser: vi.fn(() => Promise.resolve({ id: '1', username: 'Test', is_registered: true })),
    }
}));

describe('OnboardingScreen', () => {
    const onComplete = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders correctly', () => {
        render(
            <LanguageProvider>
                <OnboardingScreen onComplete={onComplete} />
            </LanguageProvider>
        );
        expect(screen.getByText('Welcome to NeoChat')).toBeDefined();
        expect(screen.getByLabelText(/Choose a Username/i)).toBeDefined();
    });

    it('button is disabled when username is empty', () => {
        render(
            <LanguageProvider>
                <OnboardingScreen onComplete={onComplete} />
            </LanguageProvider>
        );
        const btn = screen.getByText('Create Profile');
        expect(btn).toBeDisabled();
    });

    it('enables button when typing username', () => {
        render(
            <LanguageProvider>
                <OnboardingScreen onComplete={onComplete} />
            </LanguageProvider>
        );
        const input = screen.getByPlaceholderText('e.g. NeoUser');
        fireEvent.change(input, { target: { value: 'Neo' } });
        const btn = screen.getByText('Create Profile');
        expect(btn).not.toBeDisabled();
    });

    it('calls registerUser and onComplete sucessfully', async () => {
        render(
            <LanguageProvider>
                <OnboardingScreen onComplete={onComplete} />
            </LanguageProvider>
        );
        const input = screen.getByPlaceholderText('e.g. NeoUser');
        fireEvent.change(input, { target: { value: 'Neo' } });
        fireEvent.click(screen.getByText('Create Profile'));

        await waitFor(() => {
            expect(TauriService.registerUser).toHaveBeenCalledWith('Neo');
            expect(onComplete).toHaveBeenCalled();
        });
    });

    it('handles registration error', async () => {
        (TauriService.registerUser as any).mockRejectedValueOnce('Error code 500');
        render(
            <LanguageProvider>
                <OnboardingScreen onComplete={onComplete} />
            </LanguageProvider>
        );
        fireEvent.change(screen.getByPlaceholderText('e.g. NeoUser'), { target: { value: 'Neo' } });
        fireEvent.click(screen.getByText('Create Profile'));

        await waitFor(() => {
            expect(screen.getByText('Error code 500')).toBeDefined();
        });
    });

    it('submits on Enter key', async () => {
        render(
            <LanguageProvider>
                <OnboardingScreen onComplete={onComplete} />
            </LanguageProvider>
        );
        const input = screen.getByPlaceholderText('e.g. NeoUser');
        fireEvent.change(input, { target: { value: 'Neo' } });
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

        await waitFor(() => {
            expect(TauriService.registerUser).toHaveBeenCalledWith('Neo');
        });
    });
});
