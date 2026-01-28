import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader, X } from 'lucide-react';

const AddressAutocomplete = ({
    value,
    onChange,
    onSelect,
    disabled,
    name,
    placeholder = "Enter address..."
}) => {
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef(null);
    const suggestionsRef = useRef(suggestions);
    const handleSelectRef = useRef(null);

    // Keep refs updated
    useEffect(() => {
        suggestionsRef.current = suggestions;
        handleSelectRef.current = handleSelect;
    }); // Update on every render, which is fine

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                // Check if suggestions exist and suggestions are currently shown
                // If so, select the first one automatically
                if (showSuggestions && suggestionsRef.current.length > 0 && handleSelectRef.current) {
                    handleSelectRef.current(suggestionsRef.current[0]);
                }
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showSuggestions]); // Re-bind if showSuggestions changes, but logic uses refs so it's safe

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (value && value.length > 2 && showSuggestions) {
                setLoading(true);
                try {
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&addressdetails=1&limit=5`
                    );
                    const data = await response.json();
                    setSuggestions(data);
                } catch (error) {
                    console.error('Autocomplete failed:', error);
                    setSuggestions([]);
                } finally {
                    setLoading(false);
                }
            } else if (!value) {
                setSuggestions([]);
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [value, showSuggestions]);


    const handleInputChange = (e) => {
        onChange(e);
        setShowSuggestions(true);
    };

    const formatAddress = (item, userValue) => {
        const { address } = item;
        if (!address) return item.display_name;

        const street = address.road || address.pedestrian || address.street || address.path || '';
        const suburb = address.suburb || address.neighbourhood || address.quarter || '';
        const city = address.city || address.town || address.municipality || address.village || '';
        const state = address.state || '';
        const country = address.country || '';
        const zip = address.postcode || '';

        let number = address.house_number || '';

        if (!number && userValue) {
            const match = userValue.match(/,\s*(\d+)/) || userValue.match(/\b(\d+)\b/);
            if (match && match[1].length < 5) number = match[1];
        }

        const mainParts = [street, number, suburb, city].filter(Boolean);
        let result = mainParts.join(', ');

        if (state) {
            result += ` - ${state}`;
        }

        if (country) {
            result += `, ${country}`;
        }

        if (zip) {
            result += `, ${zip}`;
        }

        return result;
    };

    const handleSelect = (item) => {
        setShowSuggestions(false);
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        // Format address selection similarly
        const finalAddress = formatAddress(item, value);

        // Extract detailed address components
        const addr = item.address || {};
        const details = {
            street: addr.road || addr.pedestrian || addr.street || addr.path || '',
            number: addr.house_number || '',
            complement: '', // Nominatim doesn't usually provide this
            neighborhood: addr.suburb || addr.neighbourhood || addr.quarter || '',
            city: addr.city || addr.town || addr.municipality || addr.village || '',
            state: addr.state || '',
            country: addr.country || '',
            zip_code: addr.postcode || ''
        };

        onSelect({
            address: finalAddress,
            location: { lat, lng: lon },
            addressDetails: details
        });
    };

    const clearInput = () => {
        onChange({ target: { name: 'address', value: '' } });
        setSuggestions([]);
    };

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <div className="relative flex items-center">
                <input
                    type="text"
                    name={name || "address"}
                    value={value}
                    onChange={handleInputChange}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder={placeholder}
                    disabled={disabled}
                    className="w-full px-3 py-2.5 pl-10 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all outline-none text-slate-800 font-medium sm:text-sm"
                    autoComplete="off"
                />
                <Search className="absolute left-3 w-4 h-4 text-slate-400" />
                {loading && (
                    <div className="absolute right-9">
                        <Loader className="w-4 h-4 animate-spin text-primary-500" />
                    </div>
                )}
                {value && !disabled && (
                    <button
                        type="button"
                        onClick={clearInput}
                        className="absolute right-3 p-1 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-slate-100 max-h-60 overflow-y-auto">
                    {suggestions.map((item, idx) => {
                        const displayName = formatAddress(item, value);
                        return (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => handleSelect(item)}
                                className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-start gap-3 transition-colors border-b border-slate-50 last:border-0"
                            >
                                <MapPin className="w-4 h-4 text-primary-500 mt-1 shrink-0" />
                                <span className="text-sm text-slate-700 line-clamp-2">{displayName}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default AddressAutocomplete;
