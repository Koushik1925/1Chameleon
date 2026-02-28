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
        <div className="flex flex-col items-center justify-center h-full w-full p-6">
            <div className="max-w-md w-full bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-slate-700">
                <div className="p-6 text-center border-b border-slate-700">
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
                        Pair Device
                    </h2>
                    <p className="text-slate-400 mt-2 text-sm">
                        Scan the QR code displayed on your desktop agent to connect.
                    </p>
                </div>

                <div className="p-6">
                    <div id="qr-reader" className="w-full mx-auto" style={{ maxWidth: "400px" }}></div>
                    {error && <p className="text-red-400 text-sm mt-4 text-center">{error}</p>}
                </div>
            </div>
        </div>
    );
}
