import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, X, Check } from 'lucide-react';

const SearchableSelect = ({
    value,
    onChange,
    options,
    placeholder,
    disabled = false,
    className = "",
    allLabel = "All"
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter options based on current text input (value)
    // Only filter if value is NOT 'all' and not exactly matching an option (to avoid filtering down to 1 when selected)
    // Actually, simple filtering is better: show matches.
    const getFilteredOptions = () => {
        if (!value || value === 'all') return options;
        const lowerValue = value.toLowerCase();
        return options.filter(opt =>
            opt.label.toLowerCase().includes(lowerValue)
        );
    };

    const filteredOptions = getFilteredOptions();

    const displayValue = value === 'all' ? '' : value;

    const handleInputChange = (e) => {
        const newValue = e.target.value;
        onChange(newValue === '' ? 'all' : newValue);
        if (!isOpen) setIsOpen(true);
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div className="relative group">
                <input
                    type="text"
                    value={displayValue}
                    onChange={handleInputChange}
                    onClick={() => !disabled && setIsOpen(true)}
                    onFocus={() => !disabled && setIsOpen(true)}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={`w-full px-4 py-2 pr-10 rounded-xl text-sm font-bold bg-white border-2 border-slate-100 text-slate-700 shadow-sm outline-none transition-all placeholder:font-normal placeholder:text-slate-400
                        ${disabled ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-50' : 'focus:border-primary-500 hover:border-slate-200'}
                    `}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {value !== 'all' && value !== '' && !disabled && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange('all');
                            }}
                            className="p-0.5 hover:bg-slate-100 rounded-full text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    )}
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>

            {isOpen && !disabled && (
                <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-slate-100 max-h-60 overflow-y-auto overflow-x-hidden">
                    {/* 'All' Option */}
                    <button
                        onClick={() => {
                            onChange('all');
                            setIsOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors border-b border-slate-50 flex items-center justify-between
                            ${value === 'all' ? 'bg-slate-50 text-primary-600 font-bold' : 'hover:bg-slate-50 text-slate-600 font-medium'}
                        `}
                    >
                        <span>{allLabel}</span>
                        {value === 'all' && <Check className="w-4 h-4" />}
                    </button>

                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => {
                                    onChange(opt.value);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between
                                    ${value === opt.value ? 'bg-primary-50 text-primary-600 font-bold' : 'hover:bg-slate-50 text-slate-700 font-bold'}
                                `}
                            >
                                <span className="truncate">{opt.label}</span>
                                {value === opt.value && <Check className="w-4 h-4 sticky right-0" />}
                            </button>
                        ))
                    ) : (
                        <div className="px-4 py-3 text-xs text-slate-400 text-center italic">
                            No options match "{displayValue}", but you can use this text to search.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchableSelect;
