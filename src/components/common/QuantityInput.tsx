import React, { useState, useEffect, useRef } from 'react';
import { Minus, Plus } from 'lucide-react';

export interface QuantityInputProps {
  value: number;
  min?: number;
  max?: number;
  stockLimit?: number;
  productName?: string;
  onQuantityChange: (newQty: number) => void;
  onExceedStock?: (maxStock: number) => void;
  onRemove?: () => void;
  size?: 'sm' | 'md';
  className?: string;
  disabled?: boolean;
}

export const QuantityInput: React.FC<QuantityInputProps> = ({
  value,
  min = 1,
  max,
  stockLimit,
  productName,
  onQuantityChange,
  onExceedStock,
  onRemove,
  size = 'sm',
  className = '',
  disabled = false,
}) => {
  const effectiveMax = stockLimit !== undefined ? (max !== undefined ? Math.min(max, stockLimit) : stockLimit) : max;

  const [textValue, setTextValue] = useState<string>(value.toString());
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external changes when not focused
  useEffect(() => {
    if (!isFocused) {
      setTextValue(value.toString());
    }
  }, [value, isFocused]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setTextValue(raw);

    if (raw === '') {
      // Allow user to temporarily clear the box while typing
      return;
    }

    const parsed = parseInt(raw, 10);
    if (isNaN(parsed)) return;

    if (effectiveMax !== undefined && parsed > effectiveMax) {
      onExceedStock?.(effectiveMax);
      setTextValue(effectiveMax.toString());
      onQuantityChange(effectiveMax);
      return;
    }

    if (parsed >= min) {
      onQuantityChange(parsed);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const parsed = parseInt(textValue, 10);

    if (isNaN(parsed) || parsed < min) {
      if (parsed <= 0 && onRemove && min <= 0) {
        onRemove();
      } else {
        setTextValue(min.toString());
        onQuantityChange(min);
      }
    } else if (effectiveMax !== undefined && parsed > effectiveMax) {
      onExceedStock?.(effectiveMax);
      setTextValue(effectiveMax.toString());
      onQuantityChange(effectiveMax);
    } else {
      setTextValue(parsed.toString());
      onQuantityChange(parsed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    }
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;

    if (value <= min) {
      if (onRemove) {
        onRemove();
      }
      return;
    }

    const next = value - 1;
    setTextValue(next.toString());
    onQuantityChange(next);
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;

    if (effectiveMax !== undefined && value >= effectiveMax) {
      onExceedStock?.(effectiveMax);
      return;
    }

    const next = value + 1;
    setTextValue(next.toString());
    onQuantityChange(next);
  };

  const buttonSizeClass = size === 'sm' ? 'w-6 h-6' : 'w-7 h-7';
  const iconSizeClass = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';
  const inputSizeClass = size === 'sm' ? 'w-11 h-6 text-xs' : 'w-14 h-7 text-sm';

  return (
    <div
      className={`inline-flex items-center gap-1 ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Decrement Button */}
      <button
        type="button"
        onClick={handleDecrement}
        disabled={disabled}
        aria-label="Decrease quantity"
        title={value <= min && onRemove ? 'Remove item' : 'Decrease'}
        className={`${buttonSizeClass} flex items-center justify-center bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0`}
      >
        <Minus className={iconSizeClass} />
      </button>

      {/* Editable Numeric Input Field */}
      <input
        ref={inputRef}
        type="number"
        min={min}
        max={effectiveMax}
        step={1}
        value={textValue}
        disabled={disabled}
        onChange={handleInputChange}
        onFocus={(e) => {
          setIsFocused(true);
          e.target.select();
        }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        aria-label={`Quantity ${productName ? `for ${productName}` : ''}`}
        className={`${inputSizeClass} text-center font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded px-1 py-0.5 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-2xs`}
      />

      {/* Increment Button */}
      <button
        type="button"
        onClick={handleIncrement}
        disabled={disabled || (effectiveMax !== undefined && value >= effectiveMax)}
        aria-label="Increase quantity"
        title={effectiveMax !== undefined && value >= effectiveMax ? `Maximum stock: ${effectiveMax}` : 'Increase'}
        className={`${buttonSizeClass} flex items-center justify-center bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0`}
      >
        <Plus className={iconSizeClass} />
      </button>
    </div>
  );
};
