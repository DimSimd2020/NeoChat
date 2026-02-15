import { renderHook, act } from '@testing-library/react';
import { LanguageProvider, useLanguage } from '../i18n/LanguageContext';
import { ReactNode } from 'react';
import { describe, it, expect, beforeEach } from 'vitest';

const wrapper = ({ children }: { children: ReactNode }) => (
    <LanguageProvider>{children}</LanguageProvider>
);

describe('LanguageContext', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('provides default language as ru', () => {
        const { result } = renderHook(() => useLanguage(), { wrapper });
        expect(result.current.language).toBe('ru');
    });

    it('updates language and persists to localStorage', () => {
        const { result } = renderHook(() => useLanguage(), { wrapper });

        act(() => {
            result.current.setLanguage('en');
        });

        expect(result.current.language).toBe('en');
        expect(localStorage.getItem('app_lang')).toBe('en');
    });

    it('translates simple keys', () => {
        const { result } = renderHook(() => useLanguage(), { wrapper });
        expect(result.current.t('common.settings')).toBe('Настройки');
    });

    it('translates nested keys', () => {
        const { result } = renderHook(() => useLanguage(), { wrapper });
        expect(result.current.t('onboarding.welcome')).toBe('Добро пожаловать в NeoChat');
    });

    it('returns path if translation missing', () => {
        const { result } = renderHook(() => useLanguage(), { wrapper });
        expect(result.current.t('missing.key')).toBe('missing.key');
    });

    it('switches translations when language changes', () => {
        const { result } = renderHook(() => useLanguage(), { wrapper });

        expect(result.current.t('common.settings')).toBe('Настройки');

        act(() => {
            result.current.setLanguage('en');
        });

        expect(result.current.t('common.settings')).toBe('Settings');
    });
});
