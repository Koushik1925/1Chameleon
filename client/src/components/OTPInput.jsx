import { useState, useRef, useEffect } from 'react';

export default function OTPInput({ length = 6, onComplete }) {
    const [otp, setOtp] = useState(new Array(length).fill(''));
    const inputRefs = useRef([]);

    useEffect(() => {
        // Focus first input on mount
        if (inputRefs.current[0]) {
            inputRefs.current[0].focus();
        }
    }, []);

    const handleChange = (index, e) => {
        const value = e.target.value;
        if (isNaN(value)) return;

        const newOtp = [...otp];
        // allow only one char
        newOtp[index] = value.substring(value.length - 1);
        setOtp(newOtp);

        // Combine and check completion
        const combinedOtp = newOtp.join('');
        if (combinedOtp.length === length) {
            onComplete(combinedOtp);
        }

        // Move to next input if current is filled
        if (value && index < length - 1 && inputRefs.current[index + 1]) {
            inputRefs.current[index + 1].focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace') {
            const newOtp = [...otp];
            if (otp[index] === '') {
                // Move to previous input and clear it
                if (index > 0 && inputRefs.current[index - 1]) {
                    newOtp[index - 1] = '';
                    setOtp(newOtp);
                    inputRefs.current[index - 1].focus();
                }
            } else {
                // Clear current input
                newOtp[index] = '';
                setOtp(newOtp);
            }
        } else if (e.key === 'ArrowLeft' && index > 0) {
            inputRefs.current[index - 1].focus();
        } else if (e.key === 'ArrowRight' && index < length - 1) {
            inputRefs.current[index + 1].focus();
        } else if (e.key === 'Enter') {
            const combinedOtp = otp.join('');
            if (combinedOtp.length === length) {
                onComplete(combinedOtp);
            }
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
        if (!pasteData) return;

        const newOtp = [...otp];
        for (let i = 0; i < pasteData.length; i++) {
            newOtp[i] = pasteData[i];
        }
        setOtp(newOtp);

        // Focus on the next empty input or the last one
        const nextFocusIndex = Math.min(pasteData.length, length - 1);
        inputRefs.current[nextFocusIndex].focus();

        if (pasteData.length === length) {
            onComplete(pasteData);
        }
    };

    return (
        <div className="flex gap-2 sm:gap-3 justify-center" onPaste={handlePaste}>
            {otp.map((data, index) => {
                return (
                    <input
                        key={index}
                        type="text"
                        name="otp"
                        maxLength="1"
                        ref={(ref) => inputRefs.current[index] = ref}
                        value={data}
                        onChange={(e) => handleChange(index, e)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        className="w-10 h-14 sm:w-14 sm:h-16 bg-[#111827] border border-slate-700/50 rounded-lg text-center text-xl sm:text-2xl font-medium text-white shadow-inner focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all duration-200 placeholder-slate-600"
                        placeholder="-"
                    />
                );
            })}
        </div>
    );
}
