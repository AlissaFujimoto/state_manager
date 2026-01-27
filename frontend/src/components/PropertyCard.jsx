import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../utils/databaseAuth';
import { useLanguage } from '../contexts/LanguageContext';
import { ChevronLeft, ChevronRight, Loader2, Languages, Heart, MapPin, Calendar } from 'lucide-react';
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
    const [translations, setTranslations] = useState({
        title: '',
        description: '',
        active: false,
        loading: false
    });
    const { isFavorite, addFavorite, removeFavorite } = useFavorites();
    const isFav = isFavorite(property.id);

    const isOwner = user && property.owner_id === user.uid;

    const [favCount, setFavCount] = useState(property.favorite_count || 0);

    useEffect(() => {
        setFavCount(property.favorite_count || 0);
    }, [property.favorite_count]);

    const toggleFavorite = (e) => {
        e.stopPropagation();
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

    const handleTranslate = async (e) => {
        e.stopPropagation();
        if (translations.active) {
            setTranslations(prev => ({ ...prev, active: false }));
            return;
        }

        if (translations.title && translations.description) {
            setTranslations(prev => ({ ...prev, active: true }));
            return;
        }

        setTranslations(prev => ({ ...prev, loading: true }));
        try {
            const targetLang = currentLanguage.split('-')[0];
            const [titleRes, descRes] = await Promise.all([
                api.post('/translate', { text: property.title, target_lang: targetLang }),
                api.post('/translate', { text: property.description, target_lang: targetLang })
            ]);

            setTranslations({
                title: titleRes.data.translatedText,
                description: descRes.data.translatedText,
                active: true,
                loading: false
            });
        } catch (err) {
            console.error('Translation failed:', err);
            setTranslations(prev => ({ ...prev, loading: false }));
        }
    };

    return (
        <div
            onClick={handleCardClick}
            className="glass-card rounded-2xl overflow-hidden group premium-shadow cursor-pointer relative"
        >
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
                    <div className="bg-primary-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg flex flex-col items-end">
                        {(() => {
                            const isBoth = property.listing_type === 'both' || property.listing_type === 'sale_rent';
                            const isVacation = property.listing_type === 'vacation';

                            if (isBoth) {
                                return (
                                    <>
                                        <span className="text-sm">{formatCurrency(property.sale_price || property.price, property.currency)}</span>
                                        <div className="w-full h-px bg-white/20 my-1"></div>
                                        <span className="text-sm">{formatCurrency(property.rent_price || property.price, property.currency)}</span>
                                    </>
                                );
                            } else if (isVacation) {
                                return (
                                    <span className="text-lg">{formatCurrency(property.vacation_price || property.price, property.currency)}</span>
                                );
                            } else if (property.listing_type === 'rent') {
                                return (
                                    <span className="text-lg">{formatCurrency(property.rent_price || property.price, property.currency)}</span>
                                );
                            }

                            return <span className="text-lg">{formatCurrency(property.sale_price || property.price, property.currency)}</span>;
                        })()}
                    </div>
                </div>
            </div>

            <div className="p-6">
                <div className="flex justify-between items-start gap-2">
                    <h3 className="text-xl font-bold text-slate-800 group-hover:text-primary-600 transition-colors leading-tight">
                        {translations.active ? translations.title : property.title}
                    </h3>
                    <div className="flex gap-2 shrink-0">
                        <button
                            onClick={handleTranslate}
                            disabled={translations.loading}
                            className={`p-2 rounded-xl transition-all ${translations.active ? 'bg-primary-100 text-primary-600' : 'bg-slate-100 text-slate-400 hover:text-primary-600 hover:bg-primary-50'}`}
                            title={translations.active ? t('common.show_original') : t('common.translate')}
                        >
                            {translations.loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Languages className="w-4 h-4" />
                            )}
                        </button>
                        <div className="relative">
                            <button
                                onClick={toggleFavorite}
                                className={`p-2 rounded-xl transition-all ${isFav ? 'bg-rose-100 text-rose-500' : 'bg-slate-100 text-slate-400 hover:text-rose-500 hover:bg-rose-50'}`}
                                title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                            >
                                <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-500' : ''}`} />
                            </button>
                            {favCount > 0 && (
                                <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-400 pointer-events-none">
                                    {favCount}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex flex-col gap-y-1.5 text-slate-500 mt-5">
                    <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-primary-500 shrink-0" />
                        <span className="text-xs font-medium line-clamp-1">
                            {property.display_address || t('property_card.location_not_specified')}
                        </span>
                    </div>
                    {property.created_at && (
                        <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-xs font-medium">{new Date(property.created_at).toLocaleDateString()}</span>
                        </div>
                    )}
                </div>
                <p className="text-slate-500 text-sm mt-2 line-clamp-2">
                    {translations.active ? translations.description : property.description}
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

                <div className="flex justify-end gap-3 mt-6">
                </div>
            </div>
        </div>
    );
};

export default PropertyCard;
