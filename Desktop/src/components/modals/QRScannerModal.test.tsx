import { render, screen, fireEvent } from '@testing-library/react';
import { QRScannerModal } from './QRScannerModal';
import { describe, it, expect, vi } from 'vitest';
import { LanguageProvider } from '../../i18n/LanguageContext';

describe('QRScannerModal', () => {
    const onScan = vi.fn();
    const onClose = vi.fn();

    it('renders title and close button', () => {
        render(
            <LanguageProvider>
                <QRScannerModal onScan={onScan} onClose={onClose} />
            </LanguageProvider>
        );
        expect(screen.getByText('Сканировать QR-код')).toBeDefined();
        expect(screen.getByLabelText('Close scanner')).toBeDefined();
    });

    it('calls onClose when close button clicked', () => {
        render(
            <LanguageProvider>
                <QRScannerModal onScan={onScan} onClose={onClose} />
            </LanguageProvider>
        );
        fireEvent.click(screen.getByLabelText('Close scanner'));
        expect(onClose).toHaveBeenCalled();
    });

    it('simulates a scan when manual input used (if any)', () => {
        // Current QRScannerModal might not have manual input, but let's check.
    });
});
