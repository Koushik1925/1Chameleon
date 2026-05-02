import { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function QRScanner({ onScanSuccess }) {
    const [error, setError] = useState('');

    useEffect(() => {
        // Create instance of HTML5 QR Code Scanner
        const scanner = new Html5QrcodeScanner(
            "qr-reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
            false // non-verbose
        );

        scanner.render(
            (decodedText) => {
                // Stop scanning after successful read
                scanner.clear();
                onScanSuccess(decodedText);
            },
            (error) => {
                // Silently ignore scan errors as it scans continuously
                // console.error(error);
            }
        );

        return () => {
            // Cleanup on unmount
            scanner.clear().catch(err => {
                console.error("Failed to clear html5QrcodeScanner. ", err);
            });
        };
    }, [onScanSuccess]);

    return (
        <div className="flex flex-col items-center justify-center w-full">
            <div className="w-full text-center mb-6">
                <h2 className="text-3xl font-bold text-white tracking-wide">
                    Pair Device
                </h2>
                <p className="text-slate-400 mt-2 text-sm font-medium">
                    Scan the QR code displayed on your desktop agent.
                </p>
            </div>

            <div className="relative w-full max-w-[280px] aspect-square mx-auto mb-6">
                {/* Futuristic Brackets */}
                <div className="scanner-bracket scanner-bracket-tl"></div>
                <div className="scanner-bracket scanner-bracket-tr"></div>
                <div className="scanner-bracket scanner-bracket-bl"></div>
                <div className="scanner-bracket scanner-bracket-br"></div>

                {/* Scanner Container */}
                <div className="w-full h-full rounded-xl overflow-hidden border flex items-center justify-center border-slate-700/50 bg-[#0b0f14]/50 active-scan-glow p-2">
                    <div id="qr-reader" className="w-full h-full [&>div]:border-none [&>div]:!bg-transparent"></div>
                </div>
            </div>

            {error && <p className="text-cyan-400 text-sm mt-2 font-medium tracking-wide">{error}</p>}
        </div>
    );
}
