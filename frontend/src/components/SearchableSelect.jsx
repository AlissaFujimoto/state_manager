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
    const [searchTerm, setSearchTerm] = useState("");
    const containerRef = useRef(null);
    const inputRef = useRef(null);

    // Sync internal input text with external value prop
    useEffect(() => {
        if (value === 'all') {
            setSearchTerm(allLabel);
        } else {
            const selectedOption = options.find(opt => opt.value === value);
            if (selectedOption) {
                setSearchTerm(selectedOption.label);
            } else {
                // Fallback if value doesn't match option (e.g. initial load or custom value)
                // For cities, value matches label usually.
                setSearchTerm(value || "");
            }
        }
    }, [value, options, allLabel]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
                // On close, revert search term to selected value label
                if (value === 'all') {
                    setSearchTerm(allLabel);
                } else {
                    const selected = options.find(opt => opt.value === value);
                    setSearchTerm(selected ? selected.label : value);
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [value, options, allLabel]);

    const getFilteredOptions = () => {
        // If searching (searchTerm doesn't match the selected value label exactly OR we are focused/open)
        // Actually simplest is: filter by searchTerm if it's not equal to the currently selected label
        // But cleaner: just filter by searchTerm always, unless searchTerm === allLabel?

        if (!searchTerm || searchTerm === allLabel) return options;

        // If the search term is exactly the selected label, show all options (user just clicked open)
        // or should we filter? Standard combobox behavior: if text is selected, show all.
        const selectedOption = options.find(opt => opt.value === value);
        if (selectedOption && searchTerm === selectedOption.label) return options;

        const lowerValue = searchTerm.toLowerCase();
        return options.filter(opt =>
            opt.label.toLowerCase().includes(lowerValue)
        );
    };

    const filteredOptions = getFilteredOptions();

    const handleInputChange = (e) => {
        setSearchTerm(e.target.value);
        if (!isOpen) setIsOpen(true);
    };

    const handleInputClick = () => {
        if (!disabled) {
            setIsOpen(true);
            // Always clear the text so it looks like a placeholder for new typing
            setSearchTerm('');
        }
    };

    const toggleDropdown = (e) => {
        e.stopPropagation();
        if (!disabled) {
            const willOpen = !isOpen;
            setIsOpen(willOpen);

            if (willOpen) {
                inputRef.current?.focus();
                // Match input click behavior: clear text to show placeholder
                setSearchTerm('');
            } else {
                // Closing logic - revert text
                if (value === 'all') {
                    setSearchTerm(allLabel);
                } else {
                    const selected = options.find(opt => opt.value === value);
                    setSearchTerm(selected ? selected.label : value);
                }
            }
        }
    };

    const handleOptionSelect = (val) => {
        onChange(val);
        setIsOpen(false);
        // Explicitly update searchTerm to match the new selection immediately
        if (val === 'all') {
            setSearchTerm(allLabel);
        } else {
            const selected = options.find(opt => opt.value === val);
            setSearchTerm(selected ? selected.label : val);
        }
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div className="relative group cursor-pointer" onClick={handleInputClick}>
                <input
                    ref={inputRef}
                    type="text"
                    value={searchTerm}
                    onChange={handleInputChange}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={`w-full px-4 py-2 pr-10 rounded-xl text-sm font-bold bg-white border-2 text-slate-700 shadow-sm outline-none transition-all placeholder:font-normal placeholder:text-slate-400 cursor-pointer
                        ${disabled
                            ? 'bg-slate-50 text-slate-400 border-slate-50 cursor-not-allowed'
                            : 'border-slate-200 focus:border-primary-500 hover:border-primary-200'}
                    `}
                />
                <div
                    className="absolute right-0 top-0 h-full w-10 flex items-center justify-center cursor-pointer"
                    onClick={toggleDropdown}
                >
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>

            {isOpen && !disabled && (
                <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-slate-100 max-h-60 overflow-y-auto overflow-x-hidden">
                    {/* 'All' Option */}
                    <button
                        onClick={() => handleOptionSelect('all')}
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
                                onClick={() => handleOptionSelect(opt.value)}
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
                            {/* No matches */}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchableSelect;
