'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

interface DynamicPinInputProps {
  value: string;
  onChange: (val: string) => void;
  label?: string;
  minBoxes?: number;
  placeholderChar?: string;
  required?: boolean;
  disabled?: boolean;
  errorMsg?: string;
}

export function DynamicPinInput({
  value = '',
  onChange,
  label = 'Security PIN (Min 4 Digits)',
  minBoxes = 4,
  required = true,
  disabled = false,
  errorMsg,
}: DynamicPinInputProps) {
  const [showPin, setShowPin] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Compute number of boxes to render: min 4 boxes, expanding dynamically when typing > 4 digits
  const boxCount = Math.min(12, Math.max(minBoxes, value.length < minBoxes ? minBoxes : value.length + 1));

  // Ensure inputRefs array matches current boxCount
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, boxCount);
  }, [boxCount]);

  const handleBoxChange = (index: number, char: string) => {
    if (disabled) return;

    // Handle multi-character paste or typed string
    if (char.length > 1) {
      const cleanInput = char.replace(/\s+/g, '');
      const newValue = value.slice(0, index) + cleanInput + value.slice(index + 1);
      onChange(newValue);
      const nextIndex = Math.min(11, index + cleanInput.length);
      setTimeout(() => inputRefs.current[nextIndex]?.focus(), 10);
      return;
    }

    const currentArr = value.split('');
    if (char) {
      currentArr[index] = char;
      const nextValue = currentArr.join('');
      onChange(nextValue);

      // Auto-advance focus to next box
      if (index < boxCount - 1) {
        setTimeout(() => inputRefs.current[index + 1]?.focus(), 10);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'Backspace') {
      const currentArr = value.split('');
      if (currentArr[index]) {
        // Clear character in current box
        currentArr.splice(index, 1);
        onChange(currentArr.join(''));
      } else if (index > 0) {
        // Move back to previous box and clear
        currentArr.splice(index - 1, 1);
        onChange(currentArr.join(''));
        setTimeout(() => inputRefs.current[index - 1]?.focus(), 10);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < boxCount - 1) {
      inputRefs.current[index + 1]?.focus();
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // If current box already has a char and user types a new character, append/replace & advance focus
      const currentChar = value[index] || '';
      if (currentChar) {
        e.preventDefault();
        const currentArr = value.split('');
        if (index === value.length - 1) {
          const nextVal = value + e.key;
          onChange(nextVal);
          setTimeout(() => inputRefs.current[index + 1]?.focus(), 10);
        } else {
          currentArr[index] = e.key;
          onChange(currentArr.join(''));
          setTimeout(() => inputRefs.current[index + 1]?.focus(), 10);
        }
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (disabled) return;
    const pastedText = e.clipboardData.getData('text').trim();
    if (pastedText) {
      onChange(pastedText);
      const focusIdx = Math.min(11, pastedText.length);
      setTimeout(() => inputRefs.current[focusIdx]?.focus(), 10);
    }
  };

  return (
    <div className="space-y-2 font-sans w-full">
      <div className="flex items-center justify-between">
        {label && (
          <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5 uppercase tracking-wider">
            <Lock className="w-3.5 h-3.5 text-neutral-400" /> {label}
          </label>
        )}
        <button
          type="button"
          onClick={() => setShowPin(!showPin)}
          className="text-neutral-400 hover:text-white text-xs flex items-center gap-1 bg-transparent border-none cursor-pointer transition-colors"
          tabIndex={-1}
        >
          {showPin ? (
            <>
              <EyeOff className="w-3.5 h-3.5" />
              <span>Hide PIN</span>
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5" />
              <span>Show PIN</span>
            </>
          )}
        </button>
      </div>

      {/* Dynamic Box Grid */}
      <div className="flex items-center gap-2 flex-wrap">
        {Array.from({ length: boxCount }).map((_, idx) => {
          const char = value[idx] || '';
          const isFocused = value.length === idx;

          return (
            <input
              key={idx}
              ref={(el) => {
                inputRefs.current[idx] = el;
              }}
              type={showPin ? 'text' : 'password'}
              maxLength={1}
              value={char}
              disabled={disabled}
              onChange={(e) => handleBoxChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              onPaste={handlePaste}
              className={`w-9 sm:w-10 h-10 sm:h-11 text-center text-sm font-bold rounded-xl outline-none transition-all border-none touch-press ${
                char
                  ? 'bg-neutral-900 text-white shadow-sm ring-1 ring-neutral-700'
                  : isFocused
                  ? 'bg-neutral-900/80 text-white ring-2 ring-neutral-500'
                  : 'bg-neutral-950 text-neutral-500 hover:bg-neutral-900/50'
              } disabled:opacity-50 cursor-text`}
            />
          );
        })}
      </div>

      {/* Optional Error Message */}
      {errorMsg && (
        <p className="text-[11px] text-rose-400 font-medium mt-1">{errorMsg}</p>
      )}
    </div>
  );
}
