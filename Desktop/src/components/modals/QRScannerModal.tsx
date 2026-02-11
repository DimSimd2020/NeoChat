import React, { useEffect, useRef, useState } from 'react';
import './QRScannerModal.css';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { X, Upload } from 'lucide-react';

interface QRScannerModalProps {
    onScan: (result: string) => void;
    onClose: () => void;
}

export function QRScannerModal({ onScan, onClose }: QRScannerModalProps) {
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const scanner = new Html5QrcodeScanner(
            "reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
            /* verbose= */ false
        );

        scanner.render((decodedText) => {
            onScan(decodedText);
            // close immediately on success? Or let user confirm? 
            // Usually immediate is fine for simple actions.
            // But we might want to stop scanning first.
            scanner.clear();
            onClose();
        }, (_errorMessage) => {
            // console.log(errorMessage); // Ignore parse errors
        });

        scannerRef.current = scanner;

        return () => {
            scanner.clear().catch(err => console.error("Failed to clear scanner", err));
        };
    }, [onScan, onClose]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const html5QrCode = new Html5Qrcode("reader-file-hidden");
        try {
            const result = await html5QrCode.scanFile(file, true);
            onScan(result);
            onClose();
        } catch (err: any) {
            setError("Could not find QR code in image.");
        }
    };

    return (
        <div className="qr-modal-overlay">
            <div className="qr-modal bg-[#1C1C1E]">
                <div className="qr-header">
                    <h3>Scan QR Code</h3>
                    <button onClick={onClose} className="btn-close">
                        <X size={20} />
                    </button>
                </div>

                <div id="reader" style={{ width: '100%' }}></div>
                <div id="reader-file-hidden" style={{ display: 'none' }}></div>

                <div className="qr-actions">
                    <p className="text-secondary mb-4">Or upload an image</p>
                    <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                    />
                    <button className="btn-secondary" onClick={() => fileInputRef.current?.click()}>
                        <Upload size={18} className="mr-2" /> Upload Image
                    </button>
                    {error && <p className="text-red-500 mt-2">{error}</p>}
                </div>
            </div>
        </div>
    );
}
