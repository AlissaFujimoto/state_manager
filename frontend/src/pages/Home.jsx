import React, { useState, useEffect } from 'react';
import { Search, Filter, MapPin, ChevronRight, ChevronLeft, Trash2, Edit, Calendar, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import PropertyStatusBadges from '../components/PropertyStatusBadges';
import CompressedImage from '../components/CompressedImage';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../utils/databaseAuth';

const maskAddress = (address) => {
    if (!address) return 'Location not specified';
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

                    let label = statusConfig.label;
                    if (property.status === 'sold_rented') {
                        label = property.listing_type === 'rent' ? 'Rented' : 'Sold';
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
                        ${Number(property.price).toLocaleString()}
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
                            {property.display_address || 'Location not specified'}
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
                        <span className="text-slate-400 text-[10px] uppercase font-bold tracking-tighter">Beds</span>
                        <span className="text-slate-700 font-semibold">{property.characteristics?.bedrooms || 0}</span>
                    </div>
                    <div className="flex flex-col items-center border-x border-slate-100">
                        <span className="text-slate-400 text-[10px] uppercase font-bold tracking-tighter">Suites</span>
                        <span className="text-slate-700 font-semibold">{property.characteristics?.suites || 0}</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-slate-400 text-[10px] uppercase font-bold tracking-tighter">Rooms</span>
                        <span className="text-slate-700 font-semibold">{property.characteristics?.rooms || 0}</span>
                    </div>
                    <div className="flex flex-col items-center pt-2 mt-2 border-t border-slate-50">
                        <span className="text-slate-400 text-[10px] uppercase font-bold tracking-tighter">Baths</span>
                        <span className="text-slate-700 font-semibold">{property.characteristics?.bathrooms || 0}</span>
                    </div>
                    <div className="flex flex-col items-center pt-2 mt-2 border-x border-t border-slate-50">
                        <span className="text-slate-400 text-[10px] uppercase font-bold tracking-tighter">Grgs</span>
                        <span className="text-slate-700 font-semibold">{property.characteristics?.garages || 0}</span>
                    </div>
                    <div className="flex flex-col items-center pt-2 mt-2 border-t border-slate-50 overflow-hidden">
                        <span className="text-slate-400 text-[10px] uppercase font-bold tracking-tighter text-center">Area / Total</span>
                        <span className="text-slate-700 font-semibold text-[11px] text-center truncate w-full px-1">
                            {property.characteristics?.area || 0} / {property.characteristics?.total_area || 0}m²
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
    const [filter, setFilter] = useState({ type: 'all', listingType: 'all', minPrice: '', maxPrice: '' });
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const [direction, setDirection] = useState(0);

    // Minimum swipe distance (in px)
    const minSwipeDistance = 50;

    const ITEMS_PER_PAGE = isMobile ? 6 : 9;

    const filteredProperties = (properties || []).filter(p => {
        const matchesType = filter.type === 'all' || p.property_type.toLowerCase() === filter.type.toLowerCase();
        const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesType && matchesSearch;
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
        fetchTypes();
        fetchListingTypes();
        fetchStatuses();
    }, []);

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
                    Find Your <span className="text-primary-600">Dream State</span>
                </h1>
                <p className="text-slate-500 mt-4 text-lg">Browse thousands of premium properties for rent and sale.</p>

                <div className="mt-8 flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search by location, title or style..."
                            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-4">
                        <select
                            className="px-6 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-primary-500 transition-all font-medium text-slate-700"
                            value={filter.type}
                            onChange={(e) => setFilter({ ...filter, type: e.target.value })}
                        >
                            <option value="all">All Types</option>
                            {propertyTypes.map(type => (
                                <option key={type} value={type}>
                                    {type.charAt(0).toUpperCase() + type.slice(1)}s
                                </option>
                            ))}
                        </select>
                        <select
                            className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 focus:ring-2 focus:ring-primary-500 transition-all outline-none font-bold text-slate-700 appearance-none"
                            value={filter.listingType}
                            onChange={(e) => setFilter({ ...filter, listingType: e.target.value })}
                        >
                            <option value="all">Sale / Rent</option>
                            {listingTypes.map(type => (
                                <option key={type} value={type}>
                                    For {type.charAt(0).toUpperCase() + type.slice(1)}
                                </option>
                            ))}
                        </select>
                        <button className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-primary-200 transition-all flex items-center space-x-2">
                            <Filter className="w-5 h-5" />
                            <span>Filters</span>
                        </button>
                    </div>
                </div>
            </header>

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
                    <h3 className="text-xl font-bold text-slate-700">No properties found</h3>
                    <p className="text-slate-500 mt-2">Try adjusting your filters or search terms.</p>
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
