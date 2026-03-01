import { useState, useRef, useEffect } from 'react';

export default function OTPInput({ length = 6, onComplete }) {
    const [otp, setOtp] = useState(new Array(length).fill(''));
    const [isSuccess, setIsSuccess] = useState(false);
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
            setIsSuccess(true);
            setTimeout(() => onComplete(combinedOtp), 300); // 300ms for animation to play
        } else {
            setIsSuccess(false);
        }

        // Move to next input if current is filled
        if (value && index < length - 1 && inputRefs.current[index + 1]) {
            inputRefs.current[index + 1].focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace') {
            e.preventDefault(); // Prevent default fast backward jumping
            setIsSuccess(false);
            const newOtp = [...otp];
            if (otp[index]) {
                // Clear current input if it has a value
                newOtp[index] = '';
                setOtp(newOtp);
            } else if (index > 0) {
                // If empty, jump left and clear that input
                newOtp[index - 1] = '';
                setOtp(newOtp);
                inputRefs.current[index - 1].focus();
            }
        } else if (e.key === 'ArrowLeft' && index > 0) {
            e.preventDefault();
            inputRefs.current[index - 1].focus();
        } else if (e.key === 'ArrowRight' && index < length - 1) {
            e.preventDefault();
            inputRefs.current[index + 1].focus();
        } else if (e.key === 'Enter') {
            const combinedOtp = otp.join('');
            if (combinedOtp.length === length) {
                setIsSuccess(true);
                setTimeout(() => onComplete(combinedOtp), 300);
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
            setIsSuccess(true);
            setTimeout(() => onComplete(pasteData), 300);
        } else {
            setIsSuccess(false);
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
                        className={`w-10 h-14 sm:w-14 sm:h-16 bg-[#111827] border ${isSuccess ? 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)] transition-all duration-300 transform scale-105' : 'border-slate-700/50 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 shadow-inner'} rounded-lg text-center text-xl sm:text-2xl font-medium text-white focus:outline-none transition-all duration-200 placeholder-slate-600`}
                        placeholder="-"
                    />
                );
            })}
        </div>
    );
}
