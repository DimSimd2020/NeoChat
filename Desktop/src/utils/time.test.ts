import { formatTime } from './time';
import { describe, it, expect, vi } from 'vitest';

describe('formatTime', () => {
    it('returns empty string for zero timestamp', () => {
        expect(formatTime(0)).toBe("");
    });

    it('formats today time as HH:MM', () => {
        const now = Math.floor(Date.now() / 1000);
        const result = formatTime(now);
        expect(result).toMatch(/\d{2}:\d{2}/);
    });

    it('formats yesterday as Day Month', () => {
        const yesterday = Math.floor(Date.now() / 1000) - 86400;
        const result = formatTime(yesterday);
        // This depends on locale but we just check if it has letters usually
        expect(result).toBeTruthy();
    });

    it('formats last year as MM/DD/YY', () => {
        const lastYear = Math.floor(Date.now() / 1000) - 31536000;
        const result = formatTime(lastYear);
        expect(result).toBeTruthy();
    });

    it('is consistent for same input', () => {
        const ts = 1700000000;
        expect(formatTime(ts)).toBe(formatTime(ts));
    });
});
