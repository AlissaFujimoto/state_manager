import React, { useState, useEffect } from 'react';
import { Search, Filter, MapPin, ChevronRight, ChevronLeft, Trash2, Edit, Calendar, ChevronsLeft, ChevronsRight, X, Check, Languages, Loader2 } from 'lucide-react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import PropertyStatusBadges from '../components/PropertyStatusBadges';
import CompressedImage from '../components/CompressedImage';
import PropertyCardSkeleton from '../components/PropertyCardSkeleton';
import PropertyCard from '../components/PropertyCard';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../utils/databaseAuth';
import { useLanguage } from '../contexts/LanguageContext';
import SearchableSelect from '../components/SearchableSelect';
import ReactGA from 'react-ga4';

const maskAddress = (address, t) => {
    if (!address) return t('property_card.location_not_specified');
    const parts = address.split(',').map(s => s.trim());
    if (parts.length >= 4) {
        return `${parts[parts.length - 4]}, ${parts[parts.length - 3]} - ${parts[parts.length - 2]}`;
    }
    if (parts.length === 3) {
        return `${parts[0]} - ${parts[1]}`;
    }
    return address;
};

const SlideFilter = ({ label, value, max, onChange, t }) => {
    const handleInputChange = (e) => {
        let val = e.target.value === '' ? '' : parseInt(e.target.value);
        if (val !== '' && val > max) val = max;
        if (val !== '' && val < 0) val = 0;
        onChange(val === '' ? '' : val.toString());
    };

    const handleSliderChange = (e) => {
        onChange(e.target.value);
    };

    return (
        <div className="space-y-3 p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-primary-200 transition-all group/sf hover:bg-white hover:shadow-xl hover:shadow-slate-200/50">
            <div className="flex justify-between items-center">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest group-hover/sf:text-primary-600 transition-colors">{label}</label>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{t('common.min')}</span>
                    <input
                        type="number"
                        min="0"
                        max={max}
                        value={value}
                        onChange={handleInputChange}
                        className="w-16 px-2 py-1.5 bg-white border-2 border-slate-100 rounded-lg text-sm font-bold text-primary-600 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-center shadow-sm transition-all"
                    />
                </div>
            </div>
            <div className="relative pt-2">
                <input
                    type="range"
                    min="0"
                    max={max}
                    value={value || 0}
                    onChange={handleSliderChange}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600 focus:outline-none"
                    style={{
                        background: `linear-gradient(to right, #0284c7 0%, #0284c7 ${(value / max) * 100}%, #e2e8f0 ${(value / max) * 100}%, #e2e8f0 100%)`
                    }}
                />
            </div>
            <div className="flex justify-between text-[10px] font-black text-slate-300 uppercase tracking-widest px-0.5">
                <span>0</span>
                <span>{max}</span>
            </div>
        </div>
    );
};

const RangeSlideFilter = ({ label, minVal, maxVal, max, onChange, t, unit }) => {
    const handleMinInputChange = (e) => {
        let val = e.target.value === '' ? '' : Math.max(0, Math.min(max, parseInt(e.target.value)));
        onChange(val === '' ? '' : val.toString(), maxVal);
    };

    const handleMaxInputChange = (e) => {
        let val = e.target.value === '' ? '' : Math.max(0, Math.min(max, parseInt(e.target.value)));
        onChange(minVal, val === '' ? '' : val.toString());
    };

    return (
        <div className="space-y-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-primary-200 transition-all group/sf hover:bg-white hover:shadow-xl hover:shadow-slate-200/50">
            <div className="flex justify-between items-center">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest group-hover/sf:text-primary-600 transition-colors">
                    {label} {unit && `(${unit})`}
                </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter ml-1">{t('common.min')}</span>
                    <input
                        type="number"
                        min="0"
                        max={max}
                        value={minVal}
                        onChange={handleMinInputChange}
                        className="w-full px-2 py-1.5 bg-white border-2 border-slate-100 rounded-lg text-sm font-bold text-primary-600 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-center shadow-sm transition-all"
                    />
                </div>
                <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter ml-1">{t('common.max')}</span>
                    <input
                        type="number"
                        min="0"
                        max={max}
                        value={maxVal}
                        onChange={handleMaxInputChange}
                        className="w-full px-2 py-1.5 bg-white border-2 border-slate-100 rounded-lg text-sm font-bold text-primary-600 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-center shadow-sm transition-all"
                    />
                </div>
            </div>

            <div className="relative pt-2 h-6">
                <input
                    type="range"
                    min="0"
                    max={max}
                    value={minVal || 0}
                    onChange={(e) => {
                        const val = Math.min(Number(e.target.value), Number(maxVal || max) - 1);
                        onChange(val.toString(), maxVal);
                    }}
                    className="absolute w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600 focus:outline-none z-10 range-slider-input"
                    style={{
                        background: 'transparent'
                    }}
                />
                <input
                    type="range"
                    min="0"
                    max={max}
                    value={maxVal || max}
                    onChange={(e) => {
                        const val = Math.max(Number(e.target.value), Number(minVal || 0) + 1);
                        onChange(minVal, val.toString());
                    }}
                    className="absolute w-full h-1.5 bg-transparent rounded-lg appearance-none cursor-pointer accent-primary-600 focus:outline-none z-20 range-slider-input"
                />
                <div
                    className="absolute h-1.5 bg-primary-600 rounded-lg z-0"
                    style={{
                        left: `${((minVal || 0) / max) * 100}%`,
                        right: `${100 - (((maxVal || max) / max) * 100)}%`
                    }}
                />
            </div>
            <div className="flex justify-between text-[10px] font-black text-slate-300 uppercase tracking-widest px-0.5">
                <span>0</span>
                <span>{max.toLocaleString()}</span>
            </div>
        </div>
    );
};



// PropertyCard component moved to ../components/PropertyCard.jsx

const Home = () => {
    const [properties, setProperties] = useState(() => {
        try {
            const saved = sessionStorage.getItem('home_properties');
            return saved ? JSON.parse(saved) : [];
        } catch (e) { return []; }
    });
    const [propertyTypes, setPropertyTypes] = useState([]);
    const [listingTypes, setListingTypes] = useState([]);
    const [propertyStatuses, setPropertyStatuses] = useState([]);
    const [allRegions, setAllRegions] = useState({});
    const [loading, setLoading] = useState(() => !sessionStorage.getItem('home_properties'));

    useEffect(() => {
        if (import.meta.env.MEASUREMENT_ID) {
            ReactGA.send({ hitType: "pageview", page: window.location.pathname, title: "Home Page" });
        }

        const fetchMetadata = async () => {
            try {
                const [typesRes, listingTypesRes, statusesRes, amenitiesRes, regionsRes] = await Promise.all([
                    api.get('/types'),
                    api.get('/listing-types'),
                    api.get('/statuses'),
                    api.get('/amenities'),
                    api.get('/regions')
                ]);
                setPropertyTypes(typesRes.data);
                setListingTypes(listingTypesRes.data);
                setPropertyStatuses(statusesRes.data);
                setAvailableAmenities(amenitiesRes.data);
                setAllRegions(regionsRes.data);
                setCountryStates(Object.keys(regionsRes.data.Brazil || {}));
            } catch (err) {
                console.error('Failed to fetch metadata:', err);
            }
        };
        fetchMetadata();

        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);

        // Restore scroll position
        const savedScroll = sessionStorage.getItem('home_scroll_y');
        if (savedScroll) {
            setTimeout(() => window.scrollTo(0, parseInt(savedScroll)), 0);
        }

        return () => {
            sessionStorage.setItem('home_scroll_y', window.scrollY.toString());
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    const [filter, setFilter] = useState(() => {
        try {
            const saved = sessionStorage.getItem('home_filter');
            return saved ? JSON.parse(saved) : {
                type: 'all',
                listingType: 'all',
                minPrice: '',
                maxPrice: '',
                minBedrooms: '',
                minBathrooms: '',
                minSuites: '',
                minRooms: '',
                minGarages: '',
                minArea: '',
                maxArea: '',
                state: 'all',
                city: 'all',
                country: 'Brazil',
                amenities: [],
                sortBy: 'newest'
            };
        } catch (e) {
            return {
                type: 'all',
                listingType: 'all',
                minPrice: '',
                maxPrice: '',
                minBedrooms: '',
                minBathrooms: '',
                minSuites: '',
                minRooms: '',
                minGarages: '',
                minArea: '',
                maxArea: '',
                state: 'all',
                city: 'all',
                country: 'Brazil',
                amenities: [],
                sortBy: 'newest'
            };
        }
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    useEffect(() => {
        // Hide navbar when advanced filter is open
        window.dispatchEvent(new CustomEvent('toggle-navbar', { detail: isFilterOpen }));
    }, [isFilterOpen]);

    const [availableAmenities, setAvailableAmenities] = useState([]);
    // const [allCountries, setAllCountries] = useState([]); // Unused
    const [countryStates, setCountryStates] = useState([]);
    const [stateCities, setStateCities] = useState([]);
    const { t, regions, formatCurrency, currentLanguage } = useLanguage();

    useEffect(() => {
        if (allRegions.Brazil && filter.state !== 'all') {
            const cities = allRegions.Brazil[filter.state] || [];
            setStateCities(cities);
        } else {
            setStateCities([]);
        }
    }, [filter.state, allRegions]);

    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    const ITEMS_PER_PAGE = 9; // Backend Limit
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const maxValues = React.useMemo(() => {
        if (!properties || properties.length === 0) return { bedrooms: 10, bathrooms: 10, suites: 10, rooms: 15, garages: 10, price: 10000000, area: 5000 };
        return {
            bedrooms: Math.max(...properties.map(p => Number(p.characteristics?.bedrooms || 0)), 1),
            bathrooms: Math.max(...properties.map(p => Number(p.characteristics?.bathrooms || 0)), 1),
            suites: Math.max(...properties.map(p => Number(p.characteristics?.suites || 0)), 1),
            rooms: Math.max(...properties.map(p => Number(p.characteristics?.rooms || 0)), 1),
            garages: Math.max(...properties.map(p => Number(p.characteristics?.garages || 0)), 1),
            price: Math.max(...properties.map(p => Number(p.price || 0)), 100000),
            area: Math.max(...properties.map(p => Number(p.characteristics?.area || 0)), 100),
        };
    }, [properties]);

    const normalize = (str) => {
        return (str || '')
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
    };

    const suggestions = React.useMemo(() => {
        const s = new Set();
        if (properties && properties.length > 0) {
            properties.forEach(p => {
                if (p.title) s.add(p.title);
                if (p.display_address) {
                    const parts = p.display_address.split(',').map(part => part.trim());
                    parts.forEach(part => {
                        if (part.length > 3) s.add(part);
                    });
                }
            });
        }
        // Add categories & regions
        propertyTypes.forEach(type => s.add(t(`property_types.${type}`)));
        listingTypes.forEach(type => s.add(t(`listing_types.${type}`)));

        // Add common descriptors
        ['new', 'sale', 'rent', 'pool', 'garage', 'garden', 'luxury', 'beach', 'center'].forEach(term => {
            const trans = t(`common.${term}`);
            if (trans && trans !== `common.${term}`) s.add(trans);
        });

        // Add ALL states and ALL cities from the regions data
        if (allRegions.Brazil) {
            Object.keys(allRegions.Brazil).forEach(state => {
                s.add(state);
                const cities = allRegions.Brazil[state];
                if (Array.isArray(cities)) {
                    cities.forEach(city => s.add(city));
                }
            });
        }

        return Array.from(s).filter(val => val && typeof val === 'string');
    }, [properties, propertyTypes, listingTypes, allRegions, t]);

    // Backend Fetch Logic
    const fetchProperties = async (reset = false) => {
        if (reset) {
            setLoading(true);
            setProperties([]);
        } else {
            setIsLoadingMore(true);
        }

        try {
            const params = {
                limit: ITEMS_PER_PAGE,
                snippet_only: 'true',
                search: searchQuery,
                property_type: filter.type,
                listing_type: filter.listingType,
                min_price: filter.minPrice,
                max_price: filter.maxPrice,
                bedrooms: filter.minBedrooms,
                bathrooms: filter.minBathrooms,
                suites: filter.minSuites,
                rooms: filter.minRooms,
                garages: filter.minGarages,
                min_area: filter.minArea,
                max_area: filter.maxArea,
                state: filter.state,
                city: filter.city,
                sort_by: filter.sortBy,
                amenities: filter.amenities?.length > 0 ? filter.amenities.join(',') : undefined
            };

            // Remove empty filters
            Object.keys(params).forEach(key => {
                if (params[key] === undefined || params[key] === null || params[key] === '' || params[key] === 'all' || (Array.isArray(params[key]) && params[key].length === 0)) {
                    delete params[key];
                }
            });

            // Pagination Cursor
            if (!reset && properties.length > 0) {
                const lastId = properties[properties.length - 1].id;
                params.start_after = lastId;
            }

            const res = await api.get('/announcements', { params });
            const newDate = res.data;

            if (reset) {
                setProperties(newDate);
            } else {
                setProperties(prev => [...prev, ...newDate]);
            }

            setHasMore(newDate.length === ITEMS_PER_PAGE);
            setLoading(false);
            setIsLoadingMore(false);
        } catch (err) {
            console.error('Failed to fetch properties:', err);
            setLoading(false);
            setIsLoadingMore(false);
        }
    };

    // Debounce Filter Changes
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchProperties(true);
        }, 500); // 500ms debounce
        return () => clearTimeout(timer);
    }, [filter, searchQuery]);

    const loadMore = () => {
        if (!isLoadingMore && hasMore) {
            fetchProperties(false);
        }
    };



    return (
        <div
            className="max-w-7xl mx-auto px-8 md:px-12 py-8 min-h-screen"
        >
            <header className="mb-12 landscape:mb-6">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight landscape:text-2xl">
                    {t('home.hero_title')} <span className="text-primary-600">{t('home.dream_state')}</span>
                </h1>
                <p className="hidden lg:block text-slate-500 mt-4 text-lg landscape:hidden">{t('home.hero_subtitle')}</p>

                <div className="mt-8 landscape:mt-4 flex flex-col gap-6">
                    <div className="flex gap-3 lg:gap-4">
                        <div className="flex-1 relative z-20 group">
                            {/* Best match calculation */}
                            {(() => {
                                // 1. Try Full Phrase Match first (High priority for Cities/States)
                                const fullMatch = suggestions.find(s =>
                                    normalize(s).startsWith(normalize(searchQuery)) &&
                                    normalize(s) !== normalize(searchQuery)
                                );

                                // 2. Try Last Token Match (Fallback for random words)
                                const lastTokenMatch = searchQuery.match(/(\S+)$/);
                                const lastToken = lastTokenMatch ? lastTokenMatch[1] : '';
                                const tokenMatch = lastToken && suggestions.find(s =>
                                    normalize(s).startsWith(normalize(lastToken)) &&
                                    normalize(s) !== normalize(lastToken)
                                );

                                let ghostText = '';
                                let fullCompletion = '';

                                if (fullMatch) {
                                    // Ghost shows the remainder of the phrase
                                    ghostText = searchQuery + fullMatch.slice(searchQuery.length);
                                    fullCompletion = fullMatch;
                                } else if (tokenMatch) {
                                    // Ghost shows the remainder of the word
                                    ghostText = searchQuery.slice(0, searchQuery.length - lastToken.length) + tokenMatch;
                                    fullCompletion = searchQuery.slice(0, searchQuery.length - lastToken.length) + tokenMatch;
                                }

                                return (
                                    <>
                                        {/* Ghost Input (Background) */}
                                        <input
                                            type="text"
                                            readOnly
                                            className="absolute inset-0 w-full pl-12 pr-4 py-4 bg-transparent border border-transparent rounded-2xl text-slate-300 pointer-events-none z-0"
                                            value={ghostText}
                                        />

                                        {/* Real Input (Foreground) */}
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none z-20" />
                                        <input
                                            type="text"
                                            placeholder={t('common.search_placeholder')}
                                            className="w-full pl-12 pr-4 py-4 bg-transparent border border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all relative z-10 text-slate-900 placeholder:text-slate-400"
                                            style={{ backgroundColor: searchQuery ? 'transparent' : 'white' }}
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onFocus={() => setShowSuggestions(true)}
                                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                            onKeyDown={(e) => {
                                                if ((e.key === 'Tab' || e.key === 'ArrowRight') && fullCompletion) {
                                                    e.preventDefault();
                                                    setSearchQuery(fullCompletion);
                                                }
                                            }}
                                            autoComplete="off"
                                        />
                                    </>
                                );
                            })()}

                            {/* Suggestions Autocomplete */}
                            <AnimatePresence>
                                {showSuggestions && searchQuery && suggestions.filter(s => normalize(s).includes(normalize(searchQuery))).slice(0, 5).length > 0 && (
                                    <Motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 ring-1 ring-slate-100"
                                    >
                                        <div className="py-2">
                                            {suggestions
                                                .filter(s => normalize(s).includes(normalize(searchQuery)))
                                                .slice(0, 5)
                                                .map((suggestion, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => { setSearchQuery(suggestion); setShowSuggestions(false); }}
                                                        className="w-full text-left px-6 py-3 hover:bg-slate-50 text-slate-600 font-medium transition-colors flex items-center gap-3"
                                                    >
                                                        <Search className="w-4 h-4 text-slate-300" />
                                                        <span>{suggestion}</span>
                                                    </button>
                                                ))}
                                        </div>
                                    </Motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <button
                            onClick={() => setIsFilterOpen(true)}
                            className="bg-primary-600 hover:bg-primary-700 text-white p-4 lg:px-8 lg:py-4 rounded-2xl font-bold shadow-lg shadow-primary-200 transition-all flex items-center justify-center gap-2 group shrink-0"
                        >
                            <Filter className="w-5 h-5" />
                            <span className="hidden lg:inline">{t('common.advanced_filters')}</span>
                            {Object.entries(filter).filter(([k, v]) => k !== 'country' && v !== 'all' && v !== '' && v !== 'newest' && (Array.isArray(v) ? v.length > 0 : true)).length > 0 && (
                                <span className="bg-white text-primary-600 w-5 h-5 rounded-full flex items-center justify-center text-[10px]">
                                    {Object.entries(filter).filter(([k, v]) => k !== 'country' && v !== 'all' && v !== '' && v !== 'newest' && (Array.isArray(v) ? v.length > 0 : true)).length}
                                </span>
                            )}
                        </button>
                    </div>

                    {!isMobile && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 w-full">
                            {/* Listing Type */}
                            <SearchableSelect
                                value={filter.listingType}
                                onChange={(val) => setFilter({ ...filter, listingType: val })}
                                options={listingTypes.map(type => ({ value: type, label: t(`listing_types.${type}`) }))}
                                placeholder={t('common.all_types')}
                                allLabel={t('common.all_types')}
                                className="w-full"
                            />

                            {/* Property Type */}
                            <SearchableSelect
                                value={filter.type}
                                onChange={(val) => setFilter({ ...filter, type: val })}
                                options={propertyTypes.map(type => ({ value: type, label: t(`property_types.${type}`) }))}
                                placeholder={t('home.all_properties')}
                                allLabel={t('home.all_properties')}
                                className="w-full"
                            />

                            {/* Country removed from UI (hardcoded to Brazil) */}

                            {/* State */}
                            <SearchableSelect
                                value={filter.state}
                                onChange={(val) => setFilter({ ...filter, state: val, city: 'all' })}
                                options={countryStates.map(s => ({ value: s, label: s }))}
                                placeholder={t('home.all_states')}
                                allLabel={t('home.all_states')}
                                disabled={filter.country === 'all'}
                                className="w-full"
                            />

                            {/* City */}
                            <SearchableSelect
                                value={filter.city}
                                onChange={(val) => setFilter({ ...filter, city: val })}
                                options={stateCities.map(c => ({ value: c, label: c }))}
                                placeholder={t('home.all_cities')}
                                allLabel={t('home.all_cities')}
                                disabled={filter.state === 'all'}
                                className="w-full"
                            />
                        </div>
                    )}
                </div>
            </header>

            {/* Advanced Filter Drawer */}
            <AnimatePresence>
                {isFilterOpen && (
                    <>
                        <Motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsFilterOpen(false)}
                            className="fixed inset-0 bg-black/40 z-[100]"
                        />
                        <Motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-[101] overflow-hidden flex flex-col"
                        >
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight">{t('common.advanced_filters')}</h2>
                                <button
                                    onClick={() => setIsFilterOpen(false)}
                                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                                >
                                    <X className="w-6 h-6 text-slate-500" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-32">
                                {isMobile && (
                                    <section className="space-y-4 border-b border-slate-100 pb-8">
                                        <div className="grid grid-cols-2 gap-3">
                                            {/* Listing Type */}
                                            <SearchableSelect
                                                value={filter.listingType}
                                                onChange={(val) => setFilter({ ...filter, listingType: val })}
                                                options={listingTypes.map(type => ({ value: type, label: t(`common.for_${type}`) }))}
                                                placeholder={t('common.all_types')}
                                                allLabel={t('common.all_types')}
                                                className="w-full"
                                            />

                                            {/* Property Type */}
                                            <SearchableSelect
                                                value={filter.type}
                                                onChange={(val) => setFilter({ ...filter, type: val })}
                                                options={propertyTypes.map(type => ({ value: type, label: t(`home.${type}s`) }))}
                                                placeholder={t('home.all_properties')}
                                                allLabel={t('home.all_properties')}
                                                className="w-full"
                                            />
                                        </div>

                                        {/* Country removed from UI */}

                                        <div className="grid grid-cols-2 gap-3">
                                            {/* State */}
                                            <SearchableSelect
                                                value={filter.state}
                                                onChange={(val) => setFilter({ ...filter, state: val, city: 'all' })}
                                                options={countryStates.map(s => ({ value: s, label: s }))}
                                                placeholder={t('home.all_states')}
                                                allLabel={t('home.all_states')}
                                                disabled={filter.country === 'all'}
                                                className="w-full"
                                            />

                                            {/* City */}
                                            <SearchableSelect
                                                value={filter.city}
                                                onChange={(val) => setFilter({ ...filter, city: val })}
                                                options={stateCities.map(c => ({ value: c, label: c }))}
                                                placeholder={t('home.all_cities')}
                                                allLabel={t('home.all_cities')}
                                                disabled={filter.state === 'all'}
                                                className="w-full"
                                            />
                                        </div>
                                    </section>
                                )}

                                {/* Sort Section */}
                                <section>
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">{t('common.sort_by')}</h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { id: 'newest', label: t('common.newest') },
                                            { id: 'oldest', label: t('common.oldest') || 'Oldest' },
                                            { id: 'price_asc', label: t('common.lower_price') },
                                            { id: 'price_desc', label: t('common.higher_price') }
                                        ].map((opt) => (
                                            <button
                                                key={opt.id}
                                                onClick={() => setFilter({ ...filter, sortBy: opt.id })}
                                                className={`px-4 py-3 rounded-xl text-sm font-bold transition-all border-2 ${filter.sortBy === opt.id ? 'border-primary-600 bg-primary-50 text-primary-600' : 'border-slate-100 text-slate-500 hover:border-slate-200'}`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </section>

                                {/* Price Range Section */}
                                <section>
                                    <RangeSlideFilter
                                        label={t('common.price')}
                                        minVal={filter.minPrice}
                                        maxVal={filter.maxPrice}
                                        max={maxValues.price}
                                        unit={t('common.currency_symbol')}
                                        onChange={(min, max) => setFilter({ ...filter, minPrice: min, maxPrice: max })}
                                        t={t}
                                    />
                                </section>

                                {/* Area Section */}
                                <section>
                                    <RangeSlideFilter
                                        label={t('common.area')}
                                        minVal={filter.minArea}
                                        maxVal={filter.maxArea}
                                        max={maxValues.area}
                                        unit={t('common.area_unit')}
                                        onChange={(min, max) => setFilter({ ...filter, minArea: min, maxArea: max })}
                                        t={t}
                                    />
                                </section>

                                {/* Characteristics */}
                                <section>
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">{t('common.rooms')}</h3>
                                    <div className="space-y-4">
                                        <SlideFilter
                                            label={t('common.bedrooms')}
                                            value={filter.minBedrooms}
                                            max={maxValues.bedrooms}
                                            onChange={(val) => setFilter({ ...filter, minBedrooms: val })}
                                            t={t}
                                        />
                                        <SlideFilter
                                            label={t('common.bathrooms')}
                                            value={filter.minBathrooms}
                                            max={maxValues.bathrooms}
                                            onChange={(val) => setFilter({ ...filter, minBathrooms: val })}
                                            t={t}
                                        />
                                        <SlideFilter
                                            label={t('common.suites')}
                                            value={filter.minSuites}
                                            max={maxValues.suites}
                                            onChange={(val) => setFilter({ ...filter, minSuites: val })}
                                            t={t}
                                        />
                                        <SlideFilter
                                            label={t('common.rooms')}
                                            value={filter.minRooms}
                                            max={maxValues.rooms}
                                            onChange={(val) => setFilter({ ...filter, minRooms: val })}
                                            t={t}
                                        />
                                        <SlideFilter
                                            label={t('common.garages')}
                                            value={filter.minGarages}
                                            max={maxValues.garages}
                                            onChange={(val) => setFilter({ ...filter, minGarages: val })}
                                            t={t}
                                        />
                                    </div>
                                </section>

                                {/* Amenities Section */}
                                <section>
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">{t('common.amenities')}</h3>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                        {availableAmenities.map((amenity) => {
                                            const key = amenity.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
                                            const translatedName = t(`amenities.${key}`);

                                            return (
                                                <label key={amenity} className="flex items-center gap-3 cursor-pointer group">
                                                    <div
                                                        onClick={() => {
                                                            const isSelected = filter.amenities.includes(amenity);
                                                            setFilter({
                                                                ...filter,
                                                                amenities: isSelected
                                                                    ? filter.amenities.filter(a => a !== amenity)
                                                                    : [...filter.amenities, amenity]
                                                            });
                                                        }}
                                                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${filter.amenities.includes(amenity) ? 'bg-primary-600 border-primary-600' : 'border-slate-200 group-hover:border-primary-300'}`}
                                                    >
                                                        {filter.amenities.includes(amenity) && <Check className="w-4 h-4 text-white" />}
                                                    </div>
                                                    <span className={`text-sm font-medium transition-colors ${filter.amenities.includes(amenity) ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>{translatedName}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </section>
                            </div>

                            {/* Sticky Footer Action Buttons */}
                            <div className="p-6 border-t border-slate-100 bg-white absolute bottom-0 left-0 right-0 grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => {
                                        setFilter({
                                            type: 'all',
                                            listingType: 'all',
                                            minPrice: '',
                                            maxPrice: '',
                                            minBedrooms: '',
                                            minBathrooms: '',
                                            minSuites: '',
                                            minRooms: '',
                                            minGarages: '',
                                            minArea: '',
                                            maxArea: '',
                                            state: 'all',
                                            city: 'all',
                                            country: 'Brazil',
                                            amenities: [],
                                            sortBy: 'newest'
                                        });
                                        setIsFilterOpen(false);
                                    }}
                                    className="py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-all border-2 border-slate-100"
                                >
                                    {t('common.reset_all')}
                                </button>
                                <button
                                    onClick={() => setIsFilterOpen(false)}
                                    className="py-4 bg-primary-600 text-white rounded-2xl font-bold shadow-xl shadow-primary-200 hover:bg-primary-700 transition-all"
                                >
                                    {t('common.show_results')}
                                </button>
                            </div>
                        </Motion.div>
                    </>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
                {properties.map((p) => (
                    <PropertyCard key={p.id} property={p} propertyStatuses={propertyStatuses} />
                ))}

                {(loading || isLoadingMore) && (
                    [...Array(3)].map((_, i) => (
                        <PropertyCardSkeleton key={`skeleton-${i}`} />
                    ))
                )}
            </div>

            {properties.length === 0 && !loading && !isLoadingMore && (
                <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                    <div className="bg-slate-200 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="text-slate-500" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-700">{t('common.no_properties')}</h3>
                    <p className="text-slate-500 mt-2">{t('common.try_adjusting')}</p>
                </div>
            )}

            {/* Load More Button */}
            {hasMore && !loading && properties.length > 0 && (
                <div className="flex justify-center mt-12 pb-12">
                    <button
                        onClick={loadMore}
                        disabled={isLoadingMore}
                        className="bg-white border-2 border-slate-100 text-slate-600 hover:border-primary-500 hover:text-primary-600 px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoadingMore ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                {t('common.loading') || 'Loading...'}
                            </>
                        ) : (
                            <>
                                {t('common.load_more') || 'Load More'}
                                <ChevronRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

export default Home;
