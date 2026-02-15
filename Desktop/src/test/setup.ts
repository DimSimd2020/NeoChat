import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// Mock Tauri APIs
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

vi.mock('html5-qrcode', () => ({
    Html5QrcodeScanner: class {
        render = vi.fn();
        clear = vi.fn().mockResolvedValue(undefined);
    },
    Html5Qrcode: class {
        scanFile = vi.fn().mockResolvedValue('test');
    },
}));

vi.mock('@tauri-apps/api', () => ({
    listen: vi.fn(),
}));

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
            store[key] = value.toString();
        },
        removeItem: (key: string) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        },
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});
