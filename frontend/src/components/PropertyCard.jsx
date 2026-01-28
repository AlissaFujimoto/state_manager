import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../utils/databaseAuth';
import { useLanguage } from '../contexts/LanguageContext';
import { ChevronLeft, ChevronRight, Loader2, Languages, Heart, MapPin, Calendar, Copy, Check, Share2, Mail, MessageCircle } from 'lucide-react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import CompressedImage from './CompressedImage';
import PropertyStatusBadges from './PropertyStatusBadges';
import api from '../api';
import { useFavorites } from '../contexts/FavoritesContext';

const PropertyCard = ({ property, propertyStatuses = [], showEditAction = false, onDelete }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [currentImgIndex, setCurrentImgIndex] = useState(0);
    const [user] = useAuthState(auth);
    const { t, formatCurrency, currentLanguage } = useLanguage();

    const { isFavorite, addFavorite, removeFavorite } = useFavorites();
    const isFav = isFavorite(property.id);

    const isOwner = user && property.owner_id === user.uid;

    const isNew = property.created_at && (new Date() - new Date(property.created_at)) < 7 * 24 * 60 * 60 * 1000;

    const [favCount, setFavCount] = useState(property.favorite_count || 0);
    const [copied, setCopied] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [isMobileFlip, setIsMobileFlip] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setIsMobileFlip(prev => !prev);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const shareUrl = `${window.location.origin}/property/${property.id}`;
    const shareTitle = property.title;

    const handleCopy = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(property.friendly_id);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCopyLink = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(shareUrl);
        alert(t('common.link_copied') || 'Link copied to clipboard!');
        setIsShareOpen(false);
    };

    const handleShareWhatsApp = (e) => {
        e.stopPropagation();
        window.open(`https://wa.me/?text=${encodeURIComponent(shareTitle + ' ' + shareUrl)}`, '_blank');
        setIsShareOpen(false);
    };

    const handleShareEmail = (e) => {
        e.stopPropagation();
        window.location.href = `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(shareUrl)}`;
        setIsShareOpen(false);
    };

    const calculateTotalRent = () => {
        const rent = parseFloat(property.rent_price || property.price || 0);
        const period = property.rent_period || 'month';

        if (period === 'day' || period === 'week') return rent;

        const condo = parseFloat(property.condo_fee || 0);
        const annual = parseFloat(property.annual_fee || 0);

        if (period === 'year') return rent + condo + annual;
        return rent + condo + (annual / 12);
    };

    const getPricePerArea = () => {
        const isLand = property.property_type === 'land';
        const areaValue = isLand ? property.characteristics?.total_area : property.characteristics?.area;
        const areaUnitRaw = isLand ? property.characteristics?.total_area_unit : property.characteristics?.area_unit;
        const areaUnit = t(`common.area_units.${areaUnitRaw}`) || areaUnitRaw || t('common.area_unit') || 'm²';

        if (!areaValue || areaValue <= 0) return formatCurrency(0, property.currency) + ' / ' + areaUnit;

        const salePrice = property.sale_price || (property.listing_type === 'sale' ? property.price : 0);
        if (!salePrice) return formatCurrency(0, property.currency) + ' / ' + areaUnit;

        const pricePer = salePrice / areaValue;

        return `${formatCurrency(pricePer, property.currency)} / ${areaUnit}`;
    };

    const maskAddress = (address) => {
        if (!address) return '';
        const parts = address.split(',').map(s => s.trim());
        if (parts.length >= 4) {
            return `${parts[parts.length - 4]}, ${parts[parts.length - 3]} - ${parts[parts.length - 2]}`;
        }
        if (parts.length === 3) {
            return `${parts[0]} - ${parts[1]}`;
        }
        return address;
    };

    const renderAddress = () => {
        const fullAddr = (isOwner || property.show_exact_address)
            ? property.display_address
            : maskAddress(property.display_address);

        if (!fullAddr) return (
            <div className="h-8 flex flex-col justify-center">
                <span className="text-xs font-medium text-slate-400 italic line-clamp-1">
                    {t('property_card.location_not_specified')}
                </span>
                <span className="h-3.5 invisible">_</span>
            </div>
        );

        const parts = fullAddr.split(',').map(s => s.trim());
        let line1 = '';
        let line2 = '';

        if (isOwner || property.show_exact_address) {
            // Full address: Break after neighborhood
            // Common structure: Street, Number, Neighborhood, City, State...
            // We break before the last 2 parts (usually City, State/Country) OR at index 3 if long
            if (parts.length >= 4) {
                const breakIndex = Math.min(3, parts.length - 2);
                line1 = parts.slice(0, breakIndex).join(', ');
                line2 = parts.slice(breakIndex).join(', ');
            } else {
                line1 = fullAddr;
            }
        } else {
            // Masked address: "Neighborhood, City - State"
            if (parts.length >= 2) {
                line1 = parts[0];
                line2 = parts.slice(1).join(', ');
            } else {
                line1 = fullAddr;
            }
        }

        return (
            <div className="h-8 flex flex-col justify-center gap-0">
                <span className="text-xs font-bold text-slate-700 line-clamp-1 leading-tight">{line1}</span>
                <span className="text-[10px] font-medium text-slate-400 line-clamp-1 leading-tight h-3.5 min-w-[1px]">
                    {line2 || ' '}
                </span>
            </div>
        );
    };

    useEffect(() => {
        setFavCount(property.favorite_count || 0);
    }, [property.favorite_count]);

    const toggleFavorite = (e) => {
        e.stopPropagation();
        if (!user) {
            alert(t('common.login_required') || 'Please login to favorite properties');
            return;
        }

        if (isOwner) {
            alert(t('common.cannot_favorite_own') || 'You cannot favorite your own property');
            return;
        }

        if (isFav) {
            removeFavorite(property.id);
            setFavCount(c => Math.max(0, c - 1));
        } else {
            addFavorite(property.id);
            setFavCount(c => c + 1);
        }
    };

    const displayImages = [
        ...(property.images || [])
    ].filter(url => url && !url.startsWith('blob:'));

    // Fallback if no images
    if (displayImages.length === 0) {
        displayImages.push('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80');
    }

    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const minSwipeDistance = 50;

    // Auto-slide photos every 5 seconds
    useEffect(() => {
        if (displayImages.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentImgIndex((prev) => (prev + 1) % displayImages.length);
        }, 5000);

        return () => clearInterval(interval);
    }, [displayImages.length]);

    const handleCardClick = () => {
        navigate(`/property/${property.id}`, { state: { from: location.pathname } });
    };

    const nextImage = (e) => {
        if (e) e.stopPropagation();
        setCurrentImgIndex((prev) => (prev + 1) % displayImages.length);
    };

    const prevImage = (e) => {
        if (e) e.stopPropagation();
        setCurrentImgIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length);
    };

    const onTouchStart = (e) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = (e) => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe || isRightSwipe) {
            if (e) e.stopPropagation();
            if (isLeftSwipe) nextImage();
            if (isRightSwipe) prevImage();
        }
    };



    return (
        <div
            onClick={handleCardClick}
            className="relative group h-full cursor-pointer"
        >
            {isNew && (
                <div className="absolute -top-6 left-1 z-50 flex items-center gap-1 animate-pulse transition-transform duration-300 group-hover:-translate-y-1">
                    <span className="text-green-500 font-bold text-3xl leading-none drop-shadow-[0_0_8px_rgba(74,222,128,0.6)] pb-1.5">·</span>
                    <span className="text-green-500 font-bold text-sm lowercase tracking-wider drop-shadow-[0_0_8px_rgba(74,222,128,0.6)]">{t('common.new').toLowerCase()}</span>
                </div>
            )}

            <div className="glass-card rounded-2xl overflow-hidden premium-shadow relative h-full transition-all duration-300 group-hover:shadow-2xl group-hover:-translate-y-1">
                <div
                    className="relative h-64 overflow-hidden group/image"
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                >
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
                                className="carousel-nav-btn left-2 p-1.5 z-10"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                                onClick={nextImage}
                                className="carousel-nav-btn right-2 p-1.5 z-10"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>

                            {/* Image Indicator Dots */}
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                                {displayImages.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={(e) => { e.stopPropagation(); setCurrentImgIndex(idx); }}
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
                        if (property.status === 'sold') {
                            label = property.listing_type === 'rent' ? t('property_card.rented') : t('property_card.sold');
                        }

                        const colorMap = {
                            amber: 'bg-amber-500',
                            emerald: 'bg-emerald-500',
                            indigo: 'bg-indigo-500',
                            rose: 'bg-rose-500',
                            blue: 'bg-blue-500',
                            orange: 'bg-orange-500'
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


                    <div className={`absolute left-4 z-10 transition-transform duration-300 group-hover:scale-105 top-4`}>
                        <PropertyStatusBadges property={property} size="sm" hideNew={true} />
                    </div>

                    {property.created_at && (
                        <div className="absolute bottom-4 left-4 z-10">
                            <div className="bg-white/70 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-lg border border-white/30 flex items-center gap-1.5 transition-all group-hover:bg-white/90">
                                <Calendar className="w-3.5 h-3.5 text-primary-600" />
                                <span className="text-[10px] font-bold text-slate-800">
                                    {new Date(property.created_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="absolute bottom-4 right-4 z-10">
                        <div className="relative group/price bg-primary-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg flex flex-col items-center overflow-hidden">
                            {(() => {
                                const isBoth = property.listing_type === 'both' || property.listing_type === 'sale_rent';
                                const isVacation = property.listing_type === 'vacation';
                                const isSaleListing = property.listing_type === 'sale' || isBoth;

                                return (
                                    <>
                                        {isBoth ? (
                                            <div className="flex flex-col items-center min-w-[3rem]">
                                                {/* Sale Price w/ Flip */}
                                                <div className="grid grid-cols-1 items-center justify-items-center h-6 overflow-hidden">
                                                    <span className={`row-start-1 col-start-1 text-sm transition-all duration-300 md:group-hover/price:-translate-y-full md:group-hover/price:opacity-0 ${isMobileFlip ? '-translate-y-full opacity-0' : ''} md:translate-y-0 md:opacity-100`}>
                                                        {formatCurrency(property.sale_price || property.price, property.currency)}
                                                    </span>
                                                    <span className={`row-start-1 col-start-1 text-sm transition-all duration-300 md:group-hover/price:translate-y-0 md:group-hover/price:opacity-100 whitespace-nowrap ${isMobileFlip ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'} md:translate-y-full md:opacity-0`}>
                                                        {getPricePerArea()}
                                                    </span>
                                                </div>

                                                <div className="w-full h-px bg-white/20 my-1"></div>

                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-sm">{formatCurrency(calculateTotalRent(), property.currency)}</span>
                                                    <span className="text-[10px] opacity-70 italic font-medium">{t(`common.periods.${property.rent_period || 'month'}`)}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            // Standard Behavior for other types
                                            <>
                                                <div className={`transition-all duration-300 ${isSaleListing ? `md:group-hover/price:opacity-0 md:group-hover/price:translate-y-2 ${isMobileFlip ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'} md:opacity-100 md:translate-y-0` : ''}`}>
                                                    {isVacation ? (
                                                        <div className="flex items-baseline gap-1">
                                                            <span className="text-lg">{formatCurrency(property.vacation_price || property.price, property.currency)}</span>
                                                            <span className="text-xs opacity-80 italic font-medium">{t(`common.periods.${property.vacation_period || 'day'}`)}</span>
                                                        </div>
                                                    ) : property.listing_type === 'rent' ? (
                                                        <div className="flex items-baseline gap-1">
                                                            <span className="text-lg">{formatCurrency(calculateTotalRent(), property.currency)}</span>
                                                            <span className="text-xs opacity-80 italic font-medium">{t(`common.periods.${property.rent_period || 'month'}`)}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-lg">{formatCurrency(property.sale_price || property.price, property.currency)}</span>
                                                    )}
                                                </div>

                                                {isSaleListing && (
                                                    <div className={`absolute inset-0 bg-primary-600 flex flex-col items-center justify-center transition-all duration-300 p-2 text-center pointer-events-none md:group-hover/price:opacity-100 md:group-hover/price:translate-y-0 ${isMobileFlip ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'} md:opacity-0 md:-translate-y-2`}>
                                                        <span className="text-sm font-black tracking-tight leading-normal">
                                                            {getPricePerArea()}
                                                        </span>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>

                <div className="p-6 pb-10">
                    <div className="flex justify-between items-start gap-2">
                        <div className="relative flex-1 pl-7">
                            <h3 className="text-xl font-bold text-slate-800 group-hover:text-primary-600 transition-colors leading-tight">
                                {property.title}
                            </h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative shrink-0">
                                <button
                                    onClick={toggleFavorite}
                                    className={`p-2 rounded-xl transition-all ${isFav ? 'bg-rose-100 text-rose-500' : 'bg-slate-100 text-slate-400 hover:text-rose-500 hover:bg-rose-50'} ${isOwner ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    title={isOwner ? t('common.your_property') : (isFav ? t('favorites.remove') || 'Remove from favorites' : t('favorites.add') || 'Add to favorites')}
                                >
                                    <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-500' : ''}`} />
                                </button>
                                {favCount > 0 && (
                                    <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-400 pointer-events-none">
                                        {favCount}
                                    </span>
                                )}
                            </div>

                            <div className="relative">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsShareOpen(!isShareOpen); }}
                                    className={`p-2 rounded-xl transition-all ${isShareOpen ? 'bg-primary-100 text-primary-600' : 'bg-slate-100 text-slate-400 hover:text-primary-600 hover:bg-primary-50'}`}
                                    title={t('common.share') || 'Share'}
                                >
                                    <Share2 className="w-4 h-4" />
                                </button>

                                <AnimatePresence>
                                    {isShareOpen && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-40"
                                                onClick={(e) => { e.stopPropagation(); setIsShareOpen(false); }}
                                            />
                                            <Motion.div
                                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                                className="absolute top-full right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-50 overflow-hidden"
                                                onClick={e => e.stopPropagation()}
                                            >
                                                <button
                                                    onClick={handleShareWhatsApp}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 rounded-xl transition-colors text-slate-700 text-sm font-bold"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                                                        <MessageCircle className="w-4 h-4" />
                                                    </div>
                                                    WhatsApp
                                                </button>
                                                <button
                                                    onClick={handleShareEmail}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 rounded-xl transition-colors text-slate-700 text-sm font-bold"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                                                        <Mail className="w-4 h-4" />
                                                    </div>
                                                    Email
                                                </button>
                                                <button
                                                    onClick={handleCopyLink}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 rounded-xl transition-colors text-slate-700 text-sm font-bold"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                                                        <Copy className="w-4 h-4" />
                                                    </div>
                                                    {t('common.copy_link') || 'Copy Link'}
                                                </button>
                                            </Motion.div>
                                        </>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col gap-y-1.5 text-slate-500 mt-5">
                        <div className="flex items-start gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-primary-500 shrink-0 mt-0.5" />
                            {renderAddress()}
                        </div>
                        <p className="text-slate-500 text-sm mt-2 line-clamp-2 min-h-[40px]">
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
                                <div className="text-slate-700 font-semibold text-center w-full px-1">
                                    {(() => {
                                        const areaUnit = t(`common.area_units.${property.characteristics?.area_unit}`) || property.characteristics?.area_unit || t('common.area_unit');
                                        const totalUnit = t(`common.area_units.${property.characteristics?.total_area_unit}`) || property.characteristics?.total_area_unit || t('common.area_unit');
                                        const sameUnit = property.characteristics?.area_unit === property.characteristics?.total_area_unit;

                                        if (sameUnit) {
                                            return (
                                                <span>
                                                    {property.characteristics?.area || 0} / {property.characteristics?.total_area || 0} {areaUnit}
                                                </span>
                                            );
                                        } else {
                                            return (
                                                <div className="flex flex-col leading-tight -mt-0.5">
                                                    <span className="text-[11px]">{property.characteristics?.area || 0} {areaUnit} /</span>
                                                    <span className="text-[11px]">{property.characteristics?.total_area || 0} {totalUnit}</span>
                                                </div>
                                            );
                                        }
                                    })()}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
                {property.friendly_id && (
                    <div className="absolute bottom-3 left-6 group/id">
                        <div className="relative">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest pointer-events-none">
                                {property.friendly_id}
                            </span>
                            <button
                                onClick={handleCopy}
                                className={`absolute -top-3.5 -right-3.5 p-1.5 rounded-lg border shadow-sm transition-all duration-300 ${copied ? 'bg-green-500 border-green-600 text-white scale-110' : 'bg-white border-slate-200 text-slate-400 hover:text-primary-600 hover:border-primary-500 opacity-0 group-hover/id:opacity-100'}`}
                                title={t('common.copy')}
                            >
                                {copied ? <Check className="w-2 h-2" /> : <Copy className="w-2 h-2" />}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PropertyCard;
