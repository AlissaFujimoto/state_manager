import React, { useState, useEffect } from 'react';
import { Search, Filter, MapPin, ChevronRight, ChevronLeft, Trash2, Edit, Calendar, ChevronsLeft, ChevronsRight, X, Check } from 'lucide-react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import PropertyStatusBadges from '../components/PropertyStatusBadges';
import CompressedImage from '../components/CompressedImage';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../utils/databaseAuth';
import { useLanguage } from '../contexts/LanguageContext';
import SearchableSelect from '../components/SearchableSelect';

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

const variants = {
    enter: (direction) => ({
        x: direction > 0 ? 300 : -300,
        opacity: 0
    }),
    center: {
        zIndex: 1,
        x: 0,
        opacity: 1
    },
    exit: (direction) => ({
        zIndex: 0,
        x: direction < 0 ? 300 : -300,
        opacity: 0
    })
};

export const PropertyCard = ({ property, propertyStatuses = [], showEditAction = false, onDelete }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [currentImgIndex, setCurrentImgIndex] = useState(0);
    const [user] = useAuthState(auth);
    const { t, formatCurrency } = useLanguage();

    const isOwner = user && property.owner_id === user.uid;

    // Combine images and layout_image (if exists)
    // Filter out potential invalid blob URLs that might have been saved erroneously
    const displayImages = [
        ...(property.images || []),
        ...(property.layout_image ? [property.layout_image] : [])
    ].filter(url => url && !url.startsWith('blob:'));

    // Fallback if no images
    if (displayImages.length === 0) {
        displayImages.push('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80');
    }

    const handleCardClick = () => {
        navigate(`/property/${property.id}`, { state: { from: location.pathname } });
    };

    const nextImage = (e) => {
        e.stopPropagation();
        if (currentImgIndex < displayImages.length - 1) {
            setCurrentImgIndex((prev) => prev + 1);
        }
    };

    const prevImage = (e) => {
        e.stopPropagation();
        if (currentImgIndex > 0) {
            setCurrentImgIndex((prev) => prev - 1);
        }
    };

    return (
        <div
            onClick={handleCardClick}
            className="glass-card rounded-2xl overflow-hidden group premium-shadow cursor-pointer relative"
        >
            <div className="relative h-64 overflow-hidden group/image">
                <AnimatePresence mode="wait">
                    <Motion.div
                        key={currentImgIndex}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="w-full h-full absolute inset-0"
                    >
                        <CompressedImage
                            src={displayImages[currentImgIndex]}
                            alt={property.title}
                            onError={(e) => {
                                e.target.src = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80';
                            }}
                            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                        />
                    </Motion.div>
                </AnimatePresence>

                {/* Navigation Arrows */}
                {displayImages.length > 1 && (
                    <>
                        <button
                            onClick={prevImage}
                            disabled={currentImgIndex === 0}
                            className="carousel-nav-btn left-2 p-1.5 z-10"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={nextImage}
                            disabled={currentImgIndex === displayImages.length - 1}
                            className="carousel-nav-btn right-2 p-1.5 z-10"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>

                        {/* Image Indicator Dots */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                            {displayImages.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentImgIndex ? 'bg-white w-3' : 'bg-white/50'}`}
                                />
                            ))}
                        </div>
                    </>

                )}

                {(() => {
                    const statusConfig = (propertyStatuses || []).find(s => s.id === property.status);
                    if (!statusConfig?.showRibbon) return null;

                    let label = t(`property_card.${statusConfig.id}`);
                    if (property.status === 'sold_rented') {
                        label = property.listing_type === 'rent' ? t('property_card.rented') : t('property_card.sold');
                    }

                    const colorMap = {
                        amber: 'bg-amber-500',
                        emerald: 'bg-emerald-500',
                        indigo: 'bg-indigo-500',
                        rose: 'bg-rose-500',
                        blue: 'bg-blue-500'
                    };

                    const bgColor = colorMap[statusConfig.color] || 'bg-slate-500';

                    return (
                        <div className="absolute top-0 right-0 z-20 overflow-hidden w-32 h-32 pointer-events-none rounded-tr-2xl">
                            <div className={`
                                ${bgColor}
                                text-white
                                text-[10px] font-bold uppercase tracking-wide py-1.5
                                absolute top-6 -right-12 w-48
                                transform rotate-45
                                shadow-sm text-center
                            `}>
                                {label}
                            </div>
                        </div>
                    );
                })()}

                <div className="absolute top-4 left-4 z-10 transition-transform duration-300 group-hover:scale-105">
                    <PropertyStatusBadges property={property} size="sm" />
                </div>
                <div className="absolute bottom-4 right-4 z-10">
                    <div className="bg-primary-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg">
                        {formatCurrency(property.price)}
                    </div>
                </div>
            </div>

            <div className="p-6">
                <h3 className="text-xl font-bold text-slate-800 group-hover:text-primary-600 transition-colors">
                    {property.title}
                </h3>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-500 mt-1.5">
                    <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-primary-500 shrink-0" />
                        <span className="text-xs font-medium line-clamp-1">
                            {property.display_address || t('property_card.location_not_specified')}
                        </span>
                    </div>
                    {property.created_at && (
                        <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-xs font-medium">{new Date(property.created_at).toLocaleDateString()}</span>
                        </div>
                    )}
                </div>
                <p className="text-slate-500 text-sm mt-2 line-clamp-2">
                    {property.description}
                </p>

                <div className="grid grid-cols-3 gap-2 mt-6 py-4 border-y border-slate-100">
                    <div className="flex flex-col items-center">
                        <span className="text-slate-400 text-[10px] uppercase font-bold tracking-tighter">{t('common.bedrooms')}</span>
                        <span className="text-slate-700 font-semibold">{property.characteristics?.bedrooms || 0}</span>
                    </div>
                    <div className="flex flex-col items-center border-x border-slate-100">
                        <span className="text-slate-400 text-[10px] uppercase font-bold tracking-tighter">{t('common.suites')}</span>
                        <span className="text-slate-700 font-semibold">{property.characteristics?.suites || 0}</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-slate-400 text-[10px] uppercase font-bold tracking-tighter">{t('common.rooms')}</span>
                        <span className="text-slate-700 font-semibold">{property.characteristics?.rooms || 0}</span>
                    </div>
                    <div className="flex flex-col items-center pt-2 mt-2 border-t border-slate-50">
                        <span className="text-slate-400 text-[10px] uppercase font-bold tracking-tighter">{t('common.bathrooms')}</span>
                        <span className="text-slate-700 font-semibold">{property.characteristics?.bathrooms || 0}</span>
                    </div>
                    <div className="flex flex-col items-center pt-2 mt-2 border-x border-t border-slate-50">
                        <span className="text-slate-400 text-[10px] uppercase font-bold tracking-tighter">{t('common.garages')}</span>
                        <span className="text-slate-700 font-semibold">{property.characteristics?.garages || 0}</span>
                    </div>
                    <div className="flex flex-col items-center pt-2 mt-2 border-t border-slate-50 overflow-hidden">
                        <span className="text-slate-400 text-[10px] uppercase font-bold tracking-tighter text-center">{t('common.area')}</span>
                        <span className="text-slate-700 font-semibold text-[11px] text-center truncate w-full px-1">
                            {property.characteristics?.area || 0} / {property.characteristics?.total_area || 0}{t('common.m2')}
                        </span>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    {/* View Details button removed, card is clickable */}

                    {/* Action buttons removed - card is clickable to go to details page */}
                    <div className="flex justify-end gap-3 mt-6">
                    </div>
                </div>
            </div>
        </div>
    );
};

const Home = () => {
    const [properties, setProperties] = useState([]);
    const [propertyTypes, setPropertyTypes] = useState([]);
    const [listingTypes, setListingTypes] = useState([]);
    const [propertyStatuses, setPropertyStatuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({
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
        amenities: [],
        sortBy: 'newest'
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [availableAmenities, setAvailableAmenities] = useState([]);
    const [brazilianStates, setBrazilianStates] = useState([]);
    const [brazilianCities, setBrazilianCities] = useState([]);
    const { t, regions, formatCurrency } = useLanguage();

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const [direction, setDirection] = useState(0);

    // Minimum swipe distance (in px)
    const minSwipeDistance = 50;

    const ITEMS_PER_PAGE = isMobile ? 6 : 9;

    const filteredProperties = (properties || []).filter(p => {
        const matchesType = filter.type === 'all' || p.property_type.toLowerCase() === filter.type.toLowerCase();
        const matchesListingType = filter.listingType === 'all' || p.listing_type.toLowerCase() === filter.listingType.toLowerCase();
        const query = searchQuery.toLowerCase();
        // Localized values for search
        const typeTranslated = p.property_type ? t(`home.${p.property_type.toLowerCase()}`).toLowerCase() : '';
        const listingTypeTranslated = p.listing_type ? t(`common.${p.listing_type.toLowerCase()}`).toLowerCase() : '';
        const listingTypeForTranslated = p.listing_type ? t(`common.for_${p.listing_type.toLowerCase()}`).toLowerCase() : '';

        let statusTranslated = '';
        if (p.status) {
            if (p.status === 'sold_rented') {
                statusTranslated = p.listing_type === 'rent' ? t('property_card.rented').toLowerCase() : t('property_card.sold').toLowerCase();
            } else {
                statusTranslated = t(`property_card.${p.status.toLowerCase()}`).toLowerCase();
            }
        }

        const propertyAmenitiesTranslated = (p.amenities || []).map(a => {
            const key = a.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
            return t(`amenities.${key}`).toLowerCase();
        });

        const matchesSearch = p.title.toLowerCase().includes(query) ||
            p.description?.toLowerCase().includes(query) ||
            p.display_address?.toLowerCase().includes(query) ||
            p.address?.public?.toLowerCase().includes(query) ||
            p.property_type?.toLowerCase().includes(query) ||
            p.listing_type?.toLowerCase().includes(query) ||
            p.status?.toLowerCase().includes(query) ||
            typeTranslated.includes(query) ||
            listingTypeTranslated.includes(query) ||
            listingTypeForTranslated.includes(query) ||
            statusTranslated.includes(query) ||
            propertyAmenitiesTranslated.some(a => a.includes(query));

        const price = Number(p.price);
        const matchesMinPrice = filter.minPrice === '' || price >= Number(filter.minPrice);
        const matchesMaxPrice = filter.maxPrice === '' || price <= Number(filter.maxPrice);

        const chars = p.characteristics || {};
        const matchesBedrooms = filter.minBedrooms === '' || Number(chars.bedrooms) >= Number(filter.minBedrooms);
        const matchesBathrooms = filter.minBathrooms === '' || Number(chars.bathrooms) >= Number(filter.minBathrooms);
        const matchesSuites = filter.minSuites === '' || Number(chars.suites) >= Number(filter.minSuites);
        const matchesRooms = filter.minRooms === '' || Number(chars.rooms) >= Number(filter.minRooms);
        const matchesGarages = filter.minGarages === '' || Number(chars.garages) >= Number(filter.minGarages);

        const area = Number(chars.area || 0);
        const matchesMinArea = filter.minArea === '' || area >= Number(filter.minArea);
        const matchesMaxArea = filter.maxArea === '' || area <= Number(filter.maxArea);

        const matchesAmenities = filter.amenities.length === 0 ||
            filter.amenities.every(a => (p.amenities || []).includes(a));

        const matchesState = filter.state === 'all' ||
            p.display_address?.toLowerCase().includes(filter.state.toLowerCase()) ||
            p.address?.public?.toLowerCase().includes(filter.state.toLowerCase());

        const matchesCity = filter.city === 'all' ||
            p.display_address?.toLowerCase().includes(filter.city.toLowerCase()) ||
            p.address?.public?.toLowerCase().includes(filter.city.toLowerCase());

        return matchesType && matchesListingType && matchesSearch && matchesMinPrice && matchesMaxPrice &&
            matchesBedrooms && matchesBathrooms && matchesSuites && matchesRooms && matchesGarages &&
            matchesMinArea && matchesMaxArea && matchesAmenities && matchesState && matchesCity;
    }).sort((a, b) => {
        if (filter.sortBy === 'price_asc') return Number(a.price) - Number(b.price);
        if (filter.sortBy === 'price_desc') return Number(b.price) - Number(a.price);
        if (filter.sortBy === 'beds_desc') return Number(b.characteristics?.bedrooms || 0) - Number(a.characteristics?.bedrooms || 0);
        if (filter.sortBy === 'area_desc') return Number(b.characteristics?.area || 0) - Number(a.characteristics?.area || 0);
        // Default: newest (assuming ID or created_at logic, here just fallback)
        return 0;
    });

    const totalPages = Math.ceil(filteredProperties.length / ITEMS_PER_PAGE);

    const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
    const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;

    const currentItems = filteredProperties.slice(indexOfFirstItem, indexOfLastItem);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);



    useEffect(() => {
        const fetchTypes = async () => {
            try {
                const res = await api.get('/types');
                setPropertyTypes(res.data);
            } catch (err) {
                console.error('Failed to fetch property types:', err);
            }
        };
        const fetchListingTypes = async () => {
            try {
                const res = await api.get('/listing-types');
                setListingTypes(res.data);
            } catch (err) {
                console.error('Failed to fetch listing types:', err);
            }
        };
        const fetchStatuses = async () => {
            try {
                const res = await api.get('/statuses');
                setPropertyStatuses(res.data);
            } catch (err) {
                console.error('Failed to fetch statuses:', err);
            }
        };
        const fetchAmenities = async () => {
            try {
                const res = await api.get('/amenities');
                setAvailableAmenities(res.data);
            } catch (err) {
                console.error('Failed to fetch amenities:', err);
            }
        };
        const fetchRegions = async () => {
            try {
                const res = await api.get('/region');
                setRegions(res.data);
            } catch (err) {
                console.error('Failed to fetch regions:', err);
            }
        };

        const fetchIBGEStates = async () => {
            try {
                const res = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome');
                const data = await res.json();
                setBrazilianStates(data.map(s => ({ id: s.id, sigla: s.sigla, nome: s.nome })));
            } catch (err) {
                console.error('Failed to fetch IBGE states:', err);
            }
        };

        fetchTypes();
        fetchListingTypes();
        fetchStatuses();
        fetchAmenities();
        fetchRegions();
        fetchIBGEStates();
    }, []);

    // Fetch cities when state changes
    useEffect(() => {
        const fetchIBGECities = async () => {
            if (filter.state === 'all') {
                setBrazilianCities([]);
                return;
            }

            const stateObj = brazilianStates.find(s => s.nome === filter.state);
            if (!stateObj) return;

            try {
                const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${stateObj.id}/municipios?orderBy=nome`);
                const data = await res.json();
                setBrazilianCities(data.map(c => c.nome));
            } catch (err) {
                console.error('Failed to fetch IBGE cities:', err);
            }
        };
        fetchIBGECities();
    }, [filter.state, brazilianStates]);

    useEffect(() => {
        const fetchProperties = async () => {
            try {
                const params = {};
                if (filter.type !== 'all') params.type = filter.type;
                if (filter.listingType !== 'all') params.listing_type = filter.listingType;
                if (filter.minPrice) params.min_price = filter.minPrice;
                if (filter.maxPrice) params.max_price = filter.maxPrice;

                const res = await api.get('/announcements', { params });
                setProperties(res.data);
                setLoading(false);
            } catch (err) {
                console.error('Failed to fetch properties:', err);
                if (err.response) {
                    console.error('Error response:', err.response.status, err.response.data);
                }
                setLoading(false);
            }
        };
        fetchProperties();
    }, [filter]);

    // Reset page to 1 whenever filters change
    useEffect(() => {
        setCurrentPage(1);
        setDirection(0);
    }, [filter, searchQuery]);

    const paginate = (newDirection) => {
        if (newDirection > 0 && currentPage < totalPages) {
            setDirection(1);
            setCurrentPage((prev) => prev + 1);
        } else if (newDirection < 0 && currentPage > 1) {
            setDirection(-1);
            setCurrentPage((prev) => prev - 1);
        }
    };

    const jumpToPage = (page) => {
        const newDirection = page > currentPage ? 1 : -1;
        setDirection(newDirection);
        setCurrentPage(page);
    };

    const onTouchStart = (e) => {
        setTouchEnd(null); // Reset touch end
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;

        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) {
            paginate(1);
        }

        if (isRightSwipe) {
            paginate(-1);
        }
    };



    return (
        <div
            className="max-w-7xl mx-auto px-4 py-8 min-h-screen"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            <header className="mb-12">
                <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight">
                    {t('home.hero_title')} <span className="text-primary-600">{t('home.dream_state')}</span>
                </h1>
                <p className="text-slate-500 mt-4 text-lg">{t('home.hero_subtitle')}</p>

                <div className="mt-8 flex flex-col gap-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder={t('common.search_placeholder')}
                                className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <button
                            onClick={() => setIsFilterOpen(true)}
                            className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-primary-200 transition-all flex items-center justify-center space-x-2 group"
                        >
                            <Filter className="w-5 h-5" />
                            <span>{t('common.advanced_filters')}</span>
                            {Object.values(filter).filter(v => v !== 'all' && v !== '' && v !== 'newest' && (Array.isArray(v) ? v.length > 0 : true)).length > 0 && (
                                <span className="bg-white text-primary-600 w-5 h-5 rounded-full flex items-center justify-center text-[10px]">
                                    {Object.values(filter).filter(v => v !== 'all' && v !== '' && v !== 'newest' && (Array.isArray(v) ? v.length > 0 : true)).length}
                                </span>
                            )}
                        </button>
                    </div>

                    <div className="flex md:flex-nowrap flex-wrap gap-3 items-center overflow-visible md:overflow-visible pb-4 md:pb-0 hide-scrollbar">
                        {isMobile ? (
                            <div className="flex gap-2 w-full md:w-auto">
                                <select
                                    value={filter.listingType}
                                    onChange={(e) => setFilter({ ...filter, listingType: e.target.value })}
                                    className="flex-1 px-4 py-2 rounded-xl text-sm font-bold bg-white border-2 border-slate-100 text-slate-700 shadow-sm outline-none focus:border-primary-500 transition-all cursor-pointer hover:border-slate-200"
                                >
                                    <option value="all">{t('common.all')}</option>
                                    {listingTypes.map(type => (
                                        <option key={type} value={type}>{t(`common.${type}`)}</option>
                                    ))}
                                </select>

                                <select
                                    value={filter.type}
                                    onChange={(e) => setFilter({ ...filter, type: e.target.value })}
                                    className="flex-1 px-4 py-2 rounded-xl text-sm font-bold bg-white border-2 border-slate-100 text-slate-700 shadow-sm outline-none focus:border-primary-500 transition-all cursor-pointer hover:border-slate-200"
                                >
                                    <option value="all">{t('home.all_properties')}</option>
                                    {propertyTypes.map(type => (
                                        <option key={type} value={type}>{t(`home.${type}s`)}</option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <>
                                {/* Listing Types Pills */}
                                <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
                                    <button
                                        onClick={() => setFilter({ ...filter, listingType: 'all' })}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filter.listingType === 'all' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        {t('common.all')}
                                    </button>
                                    {listingTypes.map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setFilter({ ...filter, listingType: type })}
                                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filter.listingType === type ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            {t(`common.${type}`)}
                                        </button>
                                    ))}
                                </div>

                                <div className="h-8 w-px bg-slate-200 self-center hidden md:block shrink-0" />

                                {/* Property Type Pills */}
                                <div className="flex md:flex-nowrap flex-wrap gap-2 shrink-0">
                                    <button
                                        onClick={() => setFilter({ ...filter, type: 'all' })}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border-2 whitespace-nowrap ${filter.type === 'all' ? 'bg-primary-600 border-primary-600 text-white shadow-lg shadow-primary-200' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'}`}
                                    >
                                        {t('home.all_properties')}
                                    </button>
                                    {propertyTypes.map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setFilter({ ...filter, type: type })}
                                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border-2 whitespace-nowrap ${filter.type === type ? 'bg-primary-600 border-primary-600 text-white shadow-lg shadow-primary-200' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'}`}
                                        >
                                            {t(`home.${type}s`)}
                                        </button>
                                    ))}
                                </div>

                                <div className="h-8 w-px bg-slate-200 self-center hidden md:block shrink-0" />
                            </>
                        )}

                        {/* Region Selectors */}
                        <div className="flex gap-2 shrink-0 w-full md:w-auto">
                            <SearchableSelect
                                value={filter.state}
                                onChange={(val) => setFilter({ ...filter, state: val, city: 'all' })}
                                options={brazilianStates.map(s => ({ value: s.nome, label: s.nome }))}
                                placeholder={t('home.all_states')}
                                allLabel={t('home.all_states')}
                                className="flex-1 md:flex-none md:w-50"
                            />

                            <SearchableSelect
                                value={filter.city}
                                onChange={(val) => setFilter({ ...filter, city: val })}
                                options={brazilianCities.map(c => ({ value: c, label: c }))}
                                placeholder={t('home.all_cities')}
                                allLabel={t('home.all_cities')}
                                disabled={filter.state === 'all'}
                                className="flex-1 md:flex-none md:w-42"
                            />
                        </div>
                    </div>
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
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
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
                                {/* Sort Section */}
                                <section>
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">{t('common.sort_by')}</h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { id: 'newest', label: t('common.newest') },
                                            { id: 'price_asc', label: t('common.lower_price') },
                                            { id: 'price_desc', label: t('common.higher_price') },
                                            { id: 'area_desc', label: t('common.largest_area') }
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
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">{t('common.price')}</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 ml-1">{t('common.min')} ({t('common.currency_symbol')})</label>
                                            <input
                                                type="number"
                                                placeholder={t('common.any')}
                                                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-primary-500 transition-all font-bold"
                                                value={filter.minPrice}
                                                onChange={(e) => setFilter({ ...filter, minPrice: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 ml-1">{t('common.max')} ({t('common.currency_symbol')})</label>
                                            <input
                                                type="number"
                                                placeholder={t('common.any')}
                                                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-primary-500 transition-all font-bold"
                                                value={filter.maxPrice}
                                                onChange={(e) => setFilter({ ...filter, maxPrice: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </section>

                                {/* Characteristics */}
                                <section>
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">{t('common.rooms')}</h3>
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-3 gap-2">
                                            <label className="col-span-3 text-xs font-bold text-slate-500 ml-1">{t('common.bedrooms')}</label>
                                            {['', '1', '2', '3', '4', '5+'].map((val) => (
                                                <button
                                                    key={val}
                                                    onClick={() => setFilter({ ...filter, minBedrooms: val === '5+' ? '5' : val })}
                                                    className={`py-3 rounded-xl text-sm font-bold border-2 transition-all ${((val === '' && filter.minBedrooms === '') || (val === '5+' && filter.minBedrooms === '5') || (val !== '' && val !== '5+' && filter.minBedrooms === val)) ? 'border-primary-600 bg-primary-50 text-primary-600' : 'border-slate-100 text-slate-500'}`}
                                                >
                                                    {val || t('common.any')}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <label className="col-span-3 text-xs font-bold text-slate-500 ml-1">{t('common.bathrooms')}</label>
                                            {['', '1', '2', '3', '4', '5+'].map((val) => (
                                                <button
                                                    key={val}
                                                    onClick={() => setFilter({ ...filter, minBathrooms: val === '5+' ? '5' : val })}
                                                    className={`py-3 rounded-xl text-sm font-bold border-2 transition-all ${((val === '' && filter.minBathrooms === '') || (val === '5+' && filter.minBathrooms === '5') || (val !== '' && val !== '5+' && filter.minBathrooms === val)) ? 'border-primary-600 bg-primary-50 text-primary-600' : 'border-slate-100 text-slate-500'}`}
                                                >
                                                    {val || t('common.any')}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <label className="col-span-3 text-xs font-bold text-slate-500 ml-1">{t('common.suites')}</label>
                                            {['', '1', '2', '3', '4', '5+'].map((val) => (
                                                <button
                                                    key={val}
                                                    onClick={() => setFilter({ ...filter, minSuites: val === '5+' ? '5' : val })}
                                                    className={`py-3 rounded-xl text-sm font-bold border-2 transition-all ${((val === '' && filter.minSuites === '') || (val === '5+' && filter.minSuites === '5') || (val !== '' && val !== '5+' && filter.minSuites === val)) ? 'border-primary-600 bg-primary-50 text-primary-600' : 'border-slate-100 text-slate-500'}`}
                                                >
                                                    {val || t('common.any')}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <label className="col-span-3 text-xs font-bold text-slate-500 ml-1">{t('common.rooms')}</label>
                                            {['', '1', '2', '3', '4', '5+'].map((val) => (
                                                <button
                                                    key={val}
                                                    onClick={() => setFilter({ ...filter, minRooms: val === '5+' ? '5' : val })}
                                                    className={`py-3 rounded-xl text-sm font-bold border-2 transition-all ${((val === '' && filter.minRooms === '') || (val === '5+' && filter.minRooms === '5') || (val !== '' && val !== '5+' && filter.minRooms === val)) ? 'border-primary-600 bg-primary-50 text-primary-600' : 'border-slate-100 text-slate-500'}`}
                                                >
                                                    {val || t('common.any')}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <label className="col-span-3 text-xs font-bold text-slate-500 ml-1">{t('common.garages')}</label>
                                            {['', '1', '2', '3', '4', '5+'].map((val) => (
                                                <button
                                                    key={val}
                                                    onClick={() => setFilter({ ...filter, minGarages: val === '5+' ? '5' : val })}
                                                    className={`py-3 rounded-xl text-sm font-bold border-2 transition-all ${((val === '' && filter.minGarages === '') || (val === '5+' && filter.minGarages === '5') || (val !== '' && val !== '5+' && filter.minGarages === val)) ? 'border-primary-600 bg-primary-50 text-primary-600' : 'border-slate-100 text-slate-500'}`}
                                                >
                                                    {val || t('common.any')}
                                                </button>
                                            ))}
                                        </div>
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
                            <div className="p-6 border-t border-slate-100 bg-white/80 backdrop-blur-md absolute bottom-0 left-0 right-0 grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setFilter({
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
                                        amenities: [],
                                        sortBy: 'newest'
                                    })}
                                    className="py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-all border-2 border-slate-100"
                                >
                                    {t('common.reset_all')}
                                </button>
                                <button
                                    onClick={() => setIsFilterOpen(false)}
                                    className="py-4 bg-primary-600 text-white rounded-2xl font-bold shadow-xl shadow-primary-200 hover:bg-primary-700 transition-all"
                                >
                                    {t('common.show_results').replace('{count}', filteredProperties.length)}
                                </button>
                            </div>
                        </Motion.div>
                    </>
                )}
            </AnimatePresence>

            <div className="relative">
                <AnimatePresence initial={false} custom={direction} mode="popLayout">
                    <Motion.div
                        key={currentPage}
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{
                            x: { type: "spring", stiffness: 300, damping: 30 },
                            opacity: { duration: 0.2 }
                        }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full"
                    >
                        {currentItems.map((p) => (
                            <PropertyCard key={p.id} property={p} propertyStatuses={propertyStatuses} />
                        ))}
                    </Motion.div>
                </AnimatePresence>
            </div>

            {filteredProperties.length === 0 && !loading && (
                <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                    <div className="bg-slate-200 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="text-slate-500" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-700">{t('common.no_properties')}</h3>
                    <p className="text-slate-500 mt-2">{t('common.try_adjusting')}</p>
                </div>
            )}

            {/* Pagination Controls */}
            {filteredProperties.length > ITEMS_PER_PAGE && (
                <div className="flex justify-center items-center mt-12 gap-2 md:gap-4">
                    {/* First Page Button */}
                    {totalPages > (isMobile ? 3 : 9) && (
                        <button
                            onClick={() => jumpToPage(1)}
                            disabled={currentPage === 1}
                            className="pagination-btn hidden md:flex"
                        >
                            <ChevronsLeft className="w-5 h-5" />
                        </button>
                    )}
                    {/* Mobile First Page Button */}
                    {totalPages > (isMobile ? 3 : 9) && isMobile && (
                        <button
                            onClick={() => jumpToPage(1)}
                            disabled={currentPage === 1}
                            className="pagination-btn flex md:hidden"
                        >
                            <ChevronsLeft className="w-4 h-4" />
                        </button>
                    )}


                    <button
                        onClick={() => paginate(-1)}
                        disabled={currentPage === 1}
                        className="pagination-btn"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-1 md:gap-2">
                        {(() => {
                            const MAX_VISIBLE_PAGES = isMobile ? 3 : 9;
                            let start = Math.max(1, currentPage - Math.floor(MAX_VISIBLE_PAGES / 2));
                            let end = start + MAX_VISIBLE_PAGES - 1;

                            if (end > totalPages) {
                                end = totalPages;
                                start = Math.max(1, end - MAX_VISIBLE_PAGES + 1);
                            }

                            // Ensure start is at least 1
                            if (start < 1) start = 1;

                            // Recalculate end if start changed (to maintain window size if possible, or clamp)
                            end = Math.min(start + MAX_VISIBLE_PAGES - 1, totalPages);

                            return Array.from({ length: end - start + 1 }, (_, i) => start + i).map((page) => (
                                <button
                                    key={page}
                                    onClick={() => jumpToPage(page)}
                                    className={`pagination-number ${currentPage === page ? 'active' : 'inactive'}`}
                                >
                                    {page}
                                </button>
                            ));
                        })()}
                    </div>

                    <button
                        onClick={() => paginate(1)}
                        disabled={currentPage === totalPages}
                        className="pagination-btn"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>

                    {/* Last Page Button */}
                    {totalPages > (isMobile ? 3 : 9) && (
                        <button
                            onClick={() => jumpToPage(totalPages)}
                            disabled={currentPage === totalPages}
                            className="pagination-btn hidden md:flex"
                        >
                            <ChevronsRight className="w-5 h-5" />
                        </button>
                    )}
                    {/* Mobile Last Page Button */}
                    {totalPages > (isMobile ? 3 : 9) && isMobile && (
                        <button
                            onClick={() => jumpToPage(totalPages)}
                            disabled={currentPage === totalPages}
                            className="pagination-btn flex md:hidden"
                        >
                            <ChevronsRight className="w-4 h-4" />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default Home;
