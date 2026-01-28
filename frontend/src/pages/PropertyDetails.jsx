import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import {
    ChevronLeft, ChevronRight, Bed, Bath, Bath as BathIcon, Square,
    MapPin, Share2, Heart, Calendar, ArrowLeft,
    CheckCircle2, Info, Building2, Layout, Car, DoorOpen,
    Edit, Save, Trash2, Undo2, Phone, Mail, Check, X, Plus, GripVertical, Languages,
    Image as ImageIcon, Loader, SquareDashed, PlusCircle, MessageCircle, Copy, Eye, Linkedin, Facebook
} from 'lucide-react';
import { motion as Motion, AnimatePresence, Reorder } from 'framer-motion';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../utils/databaseAuth';
import { MapContainer, TileLayer, Circle, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import PropertyStatusBadges from '../components/PropertyStatusBadges';
import CompressedImage from '../components/CompressedImage';
import AddressAutocomplete from '../components/AddressAutocomplete';
import ImageLightbox from '../components/ImageLightbox';
import PropertyCharacteristicsFields from '../components/PropertyCharacteristicsFields';
import PropertyPriceFields from '../components/PropertyPriceFields';
import { useLanguage } from '../contexts/LanguageContext';
import { useFavorites } from '../contexts/FavoritesContext';
import ReactGA from 'react-ga4';

// Fix for default marker icon in leaflet
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom Favicon Marker
const faviconIcon = L.icon({
    iconUrl: '/favicon.svg',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    className: 'drop-shadow-lg'
});

const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const LocationPicker = ({ location, setEditData, anchorLocation, onLocationChange }) => {
    const { t } = useLanguage();
    useMapEvents({
        click(e) {
            const { lat, lng } = e.latlng;

            if (anchorLocation) {
                const dist = calculateDistance(lat, lng, anchorLocation.lat, anchorLocation.lng);
                if (dist > 1000) {
                    alert(t('property_form.location_restriction_alert'));
                    return;
                }
            }

            setEditData(prev => ({
                ...prev,
                location: { lat, lng }
            }));

            if (!anchorLocation && onLocationChange) {
                onLocationChange(lat, lng);
            }
        },
    });
    return location ? (
        <>
            <Marker position={[location.lat, location.lng]} icon={faviconIcon} />
            <Circle
                center={[location.lat, location.lng]}
                radius={1000}
                pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.2, weight: 2 }}
            />
            {anchorLocation && (
                <Circle
                    center={[anchorLocation.lat, anchorLocation.lng]}
                    radius={1000}
                    pathOptions={{ color: 'red', fill: false, weight: 1, dashArray: '5, 10' }}
                />
            )}
        </>
    ) : null;
};

const RecenterMap = ({ center }) => {
    const map = useMapEvents({});
    useEffect(() => {
        if (center) {
            map.setView([center.lat, center.lng], 15);
        }
    }, [center, map]);
    return null;
};
import api from '../api';

const maskAddress = (address, defaultText = 'Location not specified') => {
    if (!address) return defaultText;
    const parts = address.split(',').map(s => s.trim());
    if (parts.length >= 4) {
        return `${parts[parts.length - 4]}, ${parts[parts.length - 3]} - ${parts[parts.length - 2]}`;
    }
    if (parts.length === 3) {
        return `${parts[0]} - ${parts[1]}`;
    }
    return address;
};

const PropertyDetails = () => {
    const { t, formatCurrency, currentLanguage } = useLanguage();
    const { isFavorite, addFavorite, removeFavorite } = useFavorites();
    const { id } = useParams();
    const location = useLocation();
    const [property, setProperty] = useState(null);
    const [favCount, setFavCount] = useState(0);

    useEffect(() => {
        if (property && import.meta.env.MEASUREMENT_ID) {
            ReactGA.send({
                hitType: "pageview",
                page: window.location.pathname,
                title: property.title || "Property Details"
            });
            setFavCount(property.favorite_count || 0);
        }
    }, [property]);

    const isNew = property && property.created_at && (new Date() - new Date(property.created_at)) < 7 * 24 * 60 * 60 * 1000;

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [id]);

    const [loading, setLoading] = useState(true);
    const [activeImage, setActiveImage] = useState(0);
    const [direction, setDirection] = useState(0);
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const [user] = useAuthState(auth);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState(null);
    const [saving, setSaving] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isResolvingAddress, setIsResolvingAddress] = useState(false);
    const [propertyTypes, setPropertyTypes] = useState([]);
    const [listingTypes, setListingTypes] = useState([]);
    const [propertyStatuses, setPropertyStatuses] = useState([]);
    const [errors, setErrors] = useState({});
    const minSwipeDistance = 50;
    const [anchorLocation, setAnchorLocation] = useState(null);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [lightboxImages, setLightboxImages] = useState([]);
    const [availableAmenities, setAvailableAmenities] = useState([]);
    const [amenityInput, setAmenityInput] = useState('');
    const [showAmenitySuggestions, setShowAmenitySuggestions] = useState(false);
    const scrollRef = React.useRef(null);

    const [translations, setTranslations] = useState({
        title: { text: null, active: false, loading: false },
        description: { text: null, active: false, loading: false }
    });

    const [isShareOpen, setIsShareOpen] = useState(false);

    const shareUrl = window.location.href;
    const shareTitle = property?.title || '';

    const handleCopyLink = () => {
        navigator.clipboard.writeText(shareUrl);
        alert(t('common.link_copied') || 'Link copied to clipboard!');
        setIsShareOpen(false);
    };

    const handleShareWhatsApp = () => {
        window.open(`https://wa.me/?text=${encodeURIComponent(shareTitle + ' ' + shareUrl)}`, '_blank');
        setIsShareOpen(false);
    };

    const handleShareEmail = () => {
        window.location.href = `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(shareUrl)}`;
        setIsShareOpen(false);
    };

    const handleShareLinkedIn = () => {
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank');
        setIsShareOpen(false);
    };

    const handleShareFacebook = () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
        setIsShareOpen(false);
    };

    const calculateTotalRent = (target = property) => {
        if (!target) return 0;
        const rent = parseFloat(target.rent_price || target.price || 0);
        const period = target.rent_period || 'month';

        if (period === 'day' || period === 'week') return rent;

        const condo = parseFloat(target.condo_fee || 0);
        const annual = parseFloat(target.annual_fee || 0);

        if (period === 'year') return rent + condo + annual;
        return rent + condo + (annual / 12);
    };

    const getPricePerArea = () => {
        if (!property) return null;
        const isLand = property.property_type === 'land';
        const areaValue = isLand ? property.characteristics?.total_area : property.characteristics?.area;
        const areaUnitRaw = isLand ? property.characteristics?.total_area_unit : property.characteristics?.area_unit;
        const areaUnit = t(`common.area_units.${areaUnitRaw}`) || areaUnitRaw || t('common.area_unit') || 'm²';

        if (!areaValue || areaValue <= 0) return formatCurrency(0, property.currency) + ' / ' + areaUnit;

        const salePrice = property.sale_price || (property.listing_type === 'sale' || property.listing_type === 'both' || property.listing_type === 'sale_rent' ? property.price : 0);
        if (!salePrice) return null;

        const pricePer = salePrice / areaValue;

        return `${formatCurrency(pricePer, property.currency)} / ${areaUnit}`;
    };

    const handleTranslate = async (field) => {
        const current = translations[field];
        if (current.active) {
            setTranslations(prev => ({
                ...prev,
                [field]: { ...prev[field], active: false }
            }));
            return;
        }

        if (current.text) {
            setTranslations(prev => ({
                ...prev,
                [field]: { ...prev[field], active: true }
            }));
            return;
        }

        setTranslations(prev => ({
            ...prev,
            [field]: { ...prev[field], loading: true }
        }));

        try {
            const targetLang = currentLanguage.split('-')[0];
            const textToTranslate = property[field];

            if (!textToTranslate) {
                setTranslations(prev => ({
                    ...prev,
                    [field]: { ...prev[field], loading: false }
                }));
                return;
            }

            const res = await api.post('/translate', {
                text: textToTranslate,
                target_lang: targetLang
            });
            const translatedText = res.data.translatedText;

            setTranslations(prev => ({
                ...prev,
                [field]: {
                    text: translatedText,
                    active: true,
                    loading: false
                }
            }));
        } catch (err) {
            console.error(`Translation failed for ${field}:`, err);
            setTranslations(prev => ({
                ...prev,
                [field]: { ...prev[field], loading: false }
            }));
            alert('Translation service unavailable at the moment.');
        }
    };

    const openLightbox = (imgs, index) => {
        setLightboxImages(imgs);
        setLightboxIndex(index);
        setLightboxOpen(true);
    };

    const isCreating = id === 'new';
    const isOwner = (user && property && user.uid === property.owner_id) || (isCreating && user);
    const isFav = property && !isCreating ? isFavorite(property.id) : false;

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

    const renderAddress = () => {
        const fullAddr = (isOwner || property.show_exact_address)
            ? property.display_address
            : maskAddress(property.display_address, t('property_card.location_not_specified'));

        if (!fullAddr || fullAddr === t('property_card.location_not_specified')) {
            return (
                <div className="flex flex-col min-h-[2.5rem] justify-center ml-1">
                    <span className="font-medium text-slate-400 italic">{t('property_card.location_not_specified')}</span>
                </div>
            );
        }

        const parts = fullAddr.split(',').map(s => s.trim());
        let line1 = '';
        let line2 = '';

        if (isOwner || property.show_exact_address) {
            // Full address: Break after neighborhood
            if (parts.length >= 4) {
                const breakIndex = Math.min(3, parts.length - 2);
                line1 = parts.slice(0, breakIndex).join(', ');
                line2 = parts.slice(breakIndex).join(', ');
            } else {
                line1 = fullAddr;
            }
        } else {
            // Masked address: Break after neighborhood
            if (parts.length >= 2) {
                line1 = parts[0];
                line2 = parts.slice(1).join(', ');
            } else {
                line1 = fullAddr;
            }
        }

        return (
            <div className="flex flex-col min-h-[3rem] justify-center ml-1">
                <span className="font-bold text-slate-700 leading-tight text-xl">{line1}</span>
                <span className="text-sm font-medium text-slate-400 leading-tight mt-0.5">
                    {line2 || ''}
                </span>
            </div>
        );
    };

    const navigate = useNavigate();
    const handleInputChange = (e) => {
        const { name, value, type } = e.target;

        // Block negative values for number inputs
        if (type === 'number' && value && parseFloat(value) < 0) {
            return;
        }

        // Clear error for this field if it exists
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }

        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setEditData(prev => ({
                ...prev,
                [parent]: { ...prev[parent], [child]: value }
            }));
        } else {
            setEditData(prev => ({ ...prev, [name]: value }));
        }
    };

    const getFieldStatus = (key) => {
        const err = errors[key];
        if (!isEditing || !err) return '';

        let val;
        if (key.includes('.')) {
            const [p, c] = key.split('.');
            val = editData[p]?.[c];
        } else {
            val = editData[key];
        }

        const numVal = parseFloat(val);
        // Error (Red) if negative number
        if (!isNaN(numVal) && numVal < 0) return 'neon-error';

        // Warning (Yellow) if empty/missing
        return 'neon-warning';
    };

    const checkValidity = (data) => {
        if (!data) return false;

        // Title required
        if (!data.title?.trim()) return false;

        // Price validation based on listing type
        const type = data.listing_type;
        if (type === 'sale' || type === 'both' || type === 'sale_rent') {
            if (data.sale_price === '' || data.sale_price === null || data.sale_price === undefined) return false;
            if (parseFloat(data.sale_price) < 0) return false;
        }
        if (type === 'rent' || type === 'both' || type === 'sale_rent') {
            if (data.rent_price === '' || data.rent_price === null || data.rent_price === undefined) return false;
            if (parseFloat(data.rent_price) < 0) return false;
        }
        if (type === 'vacation') {
            if (data.vacation_price === '' || data.vacation_price === null || data.vacation_price === undefined) return false;
            if (parseFloat(data.vacation_price) < 0) return false;
        }

        // Negative check for char fields
        const charFields = ['bedrooms', 'suites', 'rooms', 'bathrooms', 'garages', 'area', 'total_area'];
        for (const field of charFields) {
            if (parseFloat(data.characteristics?.[field]) < 0) return false;
        }

        // Fee validation
        if (parseFloat(data.condo_fee) < 0) return false;
        if (parseFloat(data.annual_fee) < 0) return false;

        return true;
    };

    const isFormValid = checkValidity(editData);

    const validate = () => {
        const newErrors = {};
        // Reuse logic or keep separate for specific error messages?
        // Keeping it separate to allow descriptive error messages in 'validate' vs simple boolean in 'checkValidity'

        if (!editData.title?.trim()) newErrors.title = t('common.title_required');

        const type = editData.listing_type;

        if (type === 'sale' || type === 'both' || type === 'sale_rent') {
            if (editData.sale_price === '' || editData.sale_price === null || editData.sale_price === undefined) {
                newErrors.sale_price = t('common.price_required');
            } else if (parseFloat(editData.sale_price) < 0) {
                newErrors.sale_price = t('common.price_negative');
            }
        }

        if (type === 'rent' || type === 'both' || type === 'sale_rent') {
            if (editData.rent_price === '' || editData.rent_price === null || editData.rent_price === undefined) {
                newErrors.rent_price = t('common.price_required');
            } else if (parseFloat(editData.rent_price) < 0) {
                newErrors.rent_price = t('common.price_negative');
            }
        }

        if (type === 'vacation') {
            if (editData.vacation_price === '' || editData.vacation_price === null || editData.vacation_price === undefined) {
                newErrors.vacation_price = t('common.price_required');
            } else if (parseFloat(editData.vacation_price) < 0) {
                newErrors.vacation_price = t('common.price_negative');
            }
        }

        const charFields = ['bedrooms', 'suites', 'rooms', 'bathrooms', 'garages', 'area', 'total_area'];
        charFields.forEach(field => {
            if (parseFloat(editData.characteristics?.[field]) < 0) {
                newErrors[`characteristics.${field}`] = t('common.field_negative');
            }
        });

        if (parseFloat(editData.condo_fee) < 0) newErrors.condo_fee = t('common.field_negative');
        if (parseFloat(editData.annual_fee) < 0) newErrors.annual_fee = t('common.field_negative');

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) {
            if (scrollRef.current) {
                scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            return;
        }
        setSaving(true);
        try {
            if (isCreating) {
                const res = await api.post('/announcements', editData);
                // Navigate to the new property or my listings
                navigate('/my-listings');
            } else {
                await api.put(`/announcements/${id}`, editData);
                setProperty(editData);
                setIsEditing(false);
            }
        } catch (err) {
            console.error('Failed to save property:', err);
            alert('Failed to save changes.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await api.delete(`/announcements/${id}`);
            navigate('/my-listings');
        } catch (err) {
            console.error('Failed to delete property:', err);
            alert('Failed to delete property.');
        } finally {
            setIsDeleting(false);
            setIsDeleteModalOpen(false);
        }
    };

    const getAmenityLabel = (item) => {
        if (!item) return '';
        const key = item.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
        const translationKey = `amenities.${key}`;
        const translated = t(translationKey);
        // If the translation returns the key itself (meaning no translation found), use the original item
        return translated === translationKey ? item : translated;
    };

    const handleEditStart = async () => {
        // Initialize edit data
        setEditData({ ...property });

        // Determine anchor location from private address to ensure constraints follow the address
        let initialAnchor = property.location;
        const privateAddr = property.address?.private;

        if (privateAddr) {
            try {
                // Show a loading state if manageable, or just rely on the slight delay
                // Ideally, we'd have a specific loading state for this button, but for now we execute directly
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(privateAddr)}&limit=1`);
                const data = await res.json();
                if (data && data.length > 0) {
                    initialAnchor = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
                }
            } catch (e) {
                console.error("Error geocoding anchor:", e);
                // Fallback to current pin location is already set
            }
        }

        setAnchorLocation(initialAnchor);
        setIsEditing(true);
    };

    useEffect(() => {
        const fetchAmenities = async () => {
            try {
                const res = await api.get('/amenities');
                setAvailableAmenities(res.data);
            } catch (err) {
                console.error('Failed to fetch amenities:', err);
            }
        };
        fetchAmenities();
    }, []);

    const addAmenity = (name) => {
        const cleanName = name.trim();
        if (!cleanName) return;
        if (editData.amenities.includes(cleanName)) {
            setAmenityInput('');
            setShowAmenitySuggestions(false);
            return;
        }
        setEditData(prev => ({
            ...prev,
            amenities: [...(prev.amenities || []), cleanName]
        }));
        setAmenityInput('');
        setShowAmenitySuggestions(false);
    };

    const removeAmenity = (name) => {
        setEditData(prev => ({
            ...prev,
            amenities: prev.amenities.filter(a => a !== name)
        }));
    };

    const reorderAmenities = (newOrder) => {
        setEditData(prev => ({
            ...prev,
            amenities: newOrder
        }));
    };
    const handleAddressSelect = (data) => {
        console.log("handleAddressSelect triggered", data);
        setAnchorLocation(data.location);

        let finalAddress = data.address;
        const currentInput = editData.address?.private || '';

        // Preserve number if manually entered or present
        const numberMatch = currentInput.match(/,\s*(\d+)/);
        if (numberMatch && numberMatch[1]) {
            const number = numberMatch[1];
            const alreadyHasNumber = new RegExp(`\\b${number}\\b`).test(data.address);

            if (!alreadyHasNumber) {
                const parts = data.address.split(',');
                if (parts.length > 1) {
                    finalAddress = `${parts[0]}, ${number},${parts.slice(1).join(',')}`;
                } else {
                    finalAddress = `${data.address}, ${number}`;
                }
            }
        } else {
            const spaceNumber = currentInput.match(/\s+(\d+)(?:\s|$)/);
            if (spaceNumber && spaceNumber[1]) {
                const number = spaceNumber[1];
                const alreadyHasNumber = new RegExp(`\\b${number}\\b`).test(data.address);

                if (!alreadyHasNumber && number.length < 5) {
                    const parts = data.address.split(',');
                    if (parts.length > 0) {
                        finalAddress = `${parts[0]}, ${number},${parts.slice(1).join(',')}`;
                    }
                }
            }
        }

        // Consistent public address formatting (Neighborhood, City, State - Country)
        const details = data.addressDetails || {};
        const neighborhood = details.neighborhood || '';
        const city = details.city || '';
        const state = details.state || '';
        const country = details.country || '';

        let public_parts = [neighborhood, city, state].filter(Boolean);
        let public_addr = public_parts.join(', ');

        if (country) public_addr += ` - ${country}`;

        console.log("New Public Address:", public_addr);
        console.log("New Private Address:", finalAddress);

        setEditData(prev => ({
            ...prev,
            address: {
                ...prev.address,
                private: finalAddress,
                public: public_addr
            },
            location: data.location
        }));
    };

    const fetchAddress = async (lat, lng) => {
        // Only reverse geocode if no anchor is set
        if (anchorLocation) return;

        console.log(`Geocoding started for: ${lat}, ${lng}`);
        setIsResolvingAddress(true);
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await response.json();
            if (data && data.address) {
                const { suburb, neighbourhood, quarter, city, town, municipality, village, state, country } = data.address;

                // Construct precise address for Private
                const region = suburb || neighbourhood || quarter || village || '';
                const cityPart = city || town || municipality || '';
                const locationParts = [region, cityPart, state, country].filter(Boolean);
                const fullAddress = locationParts.join(', ');

                // Construct masked address for Public
                let public_parts = [region, cityPart, state].filter(Boolean);
                let public_addr = public_parts.join(', ');

                if (country) public_addr += ` - ${country}`;

                console.log(`Address resolved: ${fullAddress}`);
                setEditData(prev => ({
                    ...prev,
                    address: {
                        ...prev.address,
                        private: fullAddress,
                        public: public_addr
                    }
                }));
            }
        } catch (error) {
            console.error('Geocoding failed:', error);
        } finally {
            setIsResolvingAddress(false);
        }
    };

    const handleImageUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        try {
            const { processPropertyImage } = await import('../utils/imageCompression');
            const uploadPromises = files.map(async (file) => {
                const compressedData = await processPropertyImage(file);
                return compressedData;
            });

            const compressedImages = await Promise.all(uploadPromises);
            setEditData(prev => ({ ...prev, images: [...(prev.images || []), ...compressedImages] }));
        } catch (err) {
            console.error('Failed to process images:', err);
            alert('Failed to process images.');
        }
    };

    const removeImage = (index) => {
        setEditData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
    };

    const handleLayoutUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const { processPropertyImage } = await import('../utils/imageCompression');
            const compressedData = await processPropertyImage(file);
            setEditData(prev => ({ ...prev, layout_image: compressedData }));
        } catch (err) {
            console.error('Failed to process layout:', err);
            alert('Failed to process floor plan.');
        }
    };

    const removeLayout = () => {
        setEditData(prev => ({ ...prev, layout_image: null }));
    };

    const backLink = location.state?.from === '/my-listings' ? '/my-listings' : '/';
    const backText = location.state?.from === '/my-listings' ? t('property_details.back_to_my_listings') : t('property_details.back_to_results');

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
        if (id === 'new') {
            const defaultData = {
                title: '',
                description: '',
                listing_type: 'sale',
                property_type: 'apartment',
                status: 'available',
                price: 0,
                sale_price: 0,
                rent_price: 0,
                vacation_price: 0,
                currency: 'BRL',
                location: { lat: -23.5505, lng: -46.6333 }, // Default generic location
                address: { private: '' },
                characteristics: {
                    bedrooms: 0, suites: 0, bathrooms: 0, rooms: 0, garages: 0, area: 0, total_area: 0
                },
                images: [],
                amenities: [],
                owner_id: user?.uid,
                show_exact_address: false
            };
            setProperty(defaultData);
            setEditData(defaultData);
            setIsEditing(true);
            setLoading(false);
            return;
        }

        const fetchProperty = async () => {
            try {
                const res = await api.get(`/announcements/${id}?coords=true`);
                setProperty(res.data);
                setLoading(false);
            } catch (err) {
                console.error('Failed to fetch property:', err);
                setProperty(null);
                setLoading(false);
            }
        };
        fetchProperty();
    }, [id, user]);



    if (loading) return <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
    </div>;
    if (!property) return <div className="min-h-screen flex items-center justify-center text-slate-500">{t('property_details.not_found')}</div>;

    const nextImage = () => {
        if (activeImage < (property.images?.length || 0) - 1) {
            setDirection(1);
            setActiveImage((prev) => prev + 1);
        }
    };
    const prevImage = () => {
        if (activeImage > 0) {
            setDirection(-1);
            setActiveImage((prev) => prev - 1);
        }
    };

    const slideVariants = {
        enter: (direction) => {
            if (direction === 0) return { x: 0, opacity: 0 };
            return {
                x: direction > 0 ? '100%' : '-100%',
                opacity: 1
            };
        },
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1
        },
        exit: (direction) => ({
            zIndex: 0,
            x: direction < 0 ? '100%' : '-100%',
            opacity: 1
        })
    };



    const onTouchStart = (e) => {
        setTouchEnd(null);
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

        // Swipe from left edge to go back
        if (isRightSwipe && touchStart < 100 && !isEditing) {
            navigate(backLink);
            return;
        }

        if (isLeftSwipe) {
            nextImage();
        }
        if (isRightSwipe) {
            prevImage();
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-0 md:px-12 py-8">



            <div className={`grid grid-cols-1 ${isCreating ? 'gap-0' : 'lg:grid-cols-3 gap-12'}`}>
                {/* Left Column: Media & Content */}
                <div className={`${isCreating ? 'w-full max-w-5xl mx-auto' : 'lg:col-span-2'} space-y-12`}>
                    {/* Media Section: Carousel or Image Manager */}
                    <div className="flex flex-col gap-1">
                        {isEditing ? (
                            <div className="space-y-8 px-4 md:px-0">
                                {/* ... (Edit mode render stays same, uses editData) ... */}
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <ImageIcon className="w-5 h-5 text-primary-600" />
                                        {t('property_details.property_gallery')}
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {editData.images?.map((url, idx) => (
                                            <div key={idx} className="relative aspect-square group bg-slate-100 rounded-2xl cursor-pointer" onClick={() => openLightbox(editData.images, idx)}>
                                                <CompressedImage src={url} className="w-full h-full object-cover rounded-2xl shadow-md transition-transform group-hover:scale-[1.02]" />
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-all z-10"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                        <label className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-primary-300 transition-all bg-white group">
                                            <div className="bg-slate-50 group-hover:bg-primary-50 p-3 rounded-full transition-colors">
                                                <Plus className="w-6 h-6 text-slate-400 group-hover:text-primary-500" />
                                            </div>
                                            <span className="text-xs font-bold text-slate-400 group-hover:text-primary-500 mt-2 uppercase tracking-wider">{t('property_details.add_photo')}</span>
                                            <input type="file" multiple onChange={handleImageUpload} className="hidden" />
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <Layout className="w-5 h-5 text-primary-600" />
                                        {t('property_details.building_layout')}
                                    </h3>
                                    {editData?.layout_image ? (
                                        <div className="relative w-full group bg-slate-900 p-4 border border-slate-200 flex items-center justify-center cursor-pointer rounded-3xl" style={{ minHeight: '400px', maxHeight: '700px' }} onClick={() => openLightbox([editData.layout_image], 0)}>
                                            <CompressedImage src={editData.layout_image} className="max-w-full max-h-full object-contain shadow-2xl transition-transform group-hover:scale-[1.01]" />
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); removeLayout(); }}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-all z-10"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="w-full h-32 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-primary-300 transition-all bg-white group">
                                            <Plus className="w-6 h-6 text-slate-400 group-hover:text-primary-500" />
                                            <span className="text-xs font-bold text-slate-400 group-hover:text-primary-500 mt-2 uppercase tracking-wider">{t('property_details.upload_floor_plan')}</span>
                                            <input type="file" onChange={handleLayoutUpload} className="hidden" />
                                        </label>
                                    )}
                                </div>
                            </div>
                        ) : (
                            /* Image Carousel */
                            (() => {
                                const safesImages = (property.images || []).filter(url => url && !url.startsWith('blob:'));
                                // Use default if empty
                                if (safesImages.length === 0) safesImages.push('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80');

                                return (
                                    <div className="relative">
                                        {isNew && (
                                            <div className="absolute -top-9 left-1 z-30 flex items-center gap-1 animate-pulse">
                                                <span className="text-green-400 font-bold text-4xl leading-none drop-shadow-[0_0_8px_rgba(74,222,128,0.6)] pb-2">·</span>
                                                <span className="text-green-400 font-bold text-lg lowercase tracking-wider drop-shadow-[0_0_8px_rgba(74,222,128,0.6)]">{t('common.new').toLowerCase()}</span>
                                            </div>
                                        )}
                                        <div
                                            className="relative h-[600px] rounded-none md:rounded-3xl overflow-hidden shadow-2xl group bg-black"
                                            onTouchStart={onTouchStart}
                                            onTouchMove={onTouchMove}
                                            onTouchEnd={onTouchEnd}
                                        >

                                            <AnimatePresence initial={false} custom={direction}>
                                                <Motion.div
                                                    key={activeImage}
                                                    custom={direction}
                                                    variants={slideVariants}
                                                    initial="enter"
                                                    animate="center"
                                                    exit="exit"
                                                    transition={{
                                                        x: { type: "spring", stiffness: 300, damping: 30 },
                                                        opacity: { duration: 0.2 }
                                                    }}
                                                    className="absolute inset-0 w-full h-full"
                                                >
                                                    <CompressedImage
                                                        src={safesImages?.[activeImage]}
                                                        alt={property.title}
                                                        className="w-full h-full object-contain cursor-zoom-in"
                                                        onClick={() => openLightbox(safesImages, activeImage)}
                                                    />
                                                </Motion.div>
                                            </AnimatePresence>

                                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none"></div>

                                            {(() => {
                                                const statusConfig = (propertyStatuses || []).find(s => s.id === property.status);
                                                if (!statusConfig?.showRibbon) return null;

                                                let label = t(`property_card.${statusConfig.id}`);
                                                if (property.status === 'sold') {
                                                    label = t('property_card.sold');
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
                                                    <div className="absolute top-0 right-0 z-20 overflow-hidden w-32 h-32 pointer-events-none rounded-tr-none md:rounded-tr-3xl">
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


                                            {safesImages?.length > 1 && (
                                                <>
                                                    <button
                                                        onClick={prevImage}
                                                        disabled={activeImage === 0}
                                                        className="carousel-nav-btn left-4"
                                                    >
                                                        <ChevronLeft className="w-6 h-6" />
                                                    </button>
                                                    <button
                                                        onClick={nextImage}
                                                        disabled={activeImage === (safesImages?.length || 0) - 1}
                                                        className="carousel-nav-btn right-4"
                                                    >
                                                        <ChevronRight className="w-6 h-6" />
                                                    </button>
                                                </>
                                            )}

                                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                                                {safesImages?.map((_, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => setActiveImage(i)}
                                                        className={`w-2 h-2 rounded-full transition-all ${i === activeImage ? 'bg-white w-6' : 'bg-white/50'}`}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()
                        )}
                        <div ref={scrollRef} className="flex flex-col-reverse items-center md:flex-row md:items-center justify-between gap-4 px-4 md:px-0">
                            <div className="text-slate-500 font-bold text-sm flex justify-start items-center gap-2 w-full md:w-auto">
                                <span className="text-slate-400 uppercase tracking-widest text-[10px] font-black">{t('property_details.listed_on')}</span>
                                <span>{property.created_at ? new Date(property.created_at).toLocaleDateString() : t('common.new')}</span>
                                {property.friendly_id && (
                                    <>
                                        <span className="w-1 h-1 bg-slate-300 rounded-full mx-1"></span>
                                        <span className="text-primary-600 font-black">{property.friendly_id}</span>
                                    </>
                                )}
                            </div>

                            <div className="flex items-center justify-between w-full md:w-auto md:justify-end gap-3 md:self-auto">
                                {isEditing ? (
                                    <div className="flex flex-wrap items-center gap-2">
                                        <select
                                            name="property_type"
                                            value={editData?.property_type || ''}
                                            onChange={handleInputChange}
                                            className="px-3 py-1 bg-white border border-primary-200 text-primary-700 text-xs font-bold rounded-full uppercase tracking-wider outline-none focus:ring-1 focus:ring-primary-500"
                                        >
                                            {propertyTypes.map(type => (
                                                <option key={type} value={type}>
                                                    {t(`home.${type}s`).replace(/s$/, '')}
                                                </option>
                                            ))}
                                        </select>
                                        <select
                                            name="listing_type"
                                            value={editData?.listing_type || ''}
                                            onChange={handleInputChange}
                                            className="px-3 py-1 bg-white border border-primary-200 text-primary-700 text-xs font-bold rounded-full uppercase tracking-wider outline-none focus:ring-1 focus:ring-primary-500"
                                        >
                                            {listingTypes.map(type => (
                                                <option key={type} value={type}>
                                                    {type === 'sale' ? t('common.for_sale') :
                                                        type === 'rent' ? t('common.for_rent') :
                                                            type === 'both' ? t('common.for_both') :
                                                                type === 'vacation' ? t('common.for_vacation') : type}
                                                </option>
                                            ))}
                                        </select>
                                        <select
                                            name="status"
                                            value={editData?.status || 'available'}
                                            onChange={handleInputChange}
                                            className="px-3 py-1 bg-white border border-primary-200 text-primary-700 text-xs font-bold rounded-full uppercase tracking-wider outline-none focus:ring-1 focus:ring-primary-500"
                                        >
                                            {propertyStatuses.map(status => {
                                                const currentType = editData?.listing_type || property.listing_type;
                                                let label = t(`property_card.${status.id}`);

                                                if (status.id === 'sold') {
                                                    label = t('property_card.sold');
                                                    if (currentType === 'rent' || currentType === 'vacation') return null;
                                                }

                                                if (status.id === 'rented') {
                                                    if (currentType === 'sale') return null;
                                                }

                                                return (
                                                    <option key={status.id} value={status.id}>
                                                        {label}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>
                                ) : (
                                    <PropertyStatusBadges property={property} hideNew={true} />
                                )}
                                {!isEditing && !isCreating && (
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <button
                                                onClick={toggleFavorite}
                                                className={`p-3 bg-white border border-slate-200 shadow-md hover:shadow-lg text-slate-500 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-200 rounded-full transition-all group/fav ${isOwner ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                title={isOwner ? t('common.your_property') : (isFav ? t('favorites.remove') || 'Remove from favorites' : t('favorites.add') || 'Add to favorites')}
                                            >
                                                <Heart className={`w-6 h-6 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`} />
                                            </button>
                                            {favCount > 0 && (
                                                <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                                                    {favCount}
                                                </span>
                                            )}
                                        </div>

                                        <div className="relative">
                                            <button
                                                onClick={() => setIsShareOpen(!isShareOpen)}
                                                className={`p-3 rounded-full border border-slate-200 shadow-md hover:shadow-lg transition-all ${isShareOpen ? 'bg-primary-50 text-primary-600 border-primary-200' : 'bg-white text-slate-500 hover:text-primary-600 hover:bg-primary-50 hover:border-primary-200'}`}
                                                title={t('common.share') || 'Share'}
                                            >
                                                <Share2 className="w-6 h-6" />
                                            </button>

                                            <AnimatePresence>
                                                {isShareOpen && (
                                                    <>
                                                        <div
                                                            className="fixed inset-0 z-40"
                                                            onClick={() => setIsShareOpen(false)}
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
                                                                onClick={handleShareFacebook}
                                                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 rounded-xl transition-colors text-slate-700 text-sm font-bold"
                                                            >
                                                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                                                    <Facebook className="w-4 h-4" />
                                                                </div>
                                                                Facebook
                                                            </button>
                                                            <button
                                                                onClick={handleShareLinkedIn}
                                                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 rounded-xl transition-colors text-slate-700 text-sm font-bold"
                                                            >
                                                                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
                                                                    <Linkedin className="w-4 h-4" />
                                                                </div>
                                                                LinkedIn
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
                                )}
                            </div>
                        </div>
                    </div>



                    {/* Title Section - Full Width & Prominent */}
                    <div className="px-4 md:px-0 mt-2 mb-2">
                        {isEditing ? (
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    name="title"
                                    value={editData?.title || ''}
                                    onChange={handleInputChange}
                                    className={`text-4xl md:text-6xl font-black text-slate-900 border-b-4 border-slate-200 focus:border-primary-500 bg-transparent outline-none w-full transition-all ${getFieldStatus('title')}`}
                                    placeholder={t('property_details.property_title_placeholder')}
                                />
                                {errors.title && <p className="text-red-500 text-xs font-bold">{errors.title}</p>}
                            </div>
                        ) : (
                            <div className="w-full">
                                <h1 className="text-4xl md:text-6xl font-black text-slate-900 leading-[1.1] tracking-tight drop-shadow-sm break-words">
                                    {translations.title.active ? translations.title.text : property.title}
                                    {!isEditing && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleTranslate('title'); }}
                                            disabled={translations.title.loading}
                                            className={`
                                                inline-flex align-middle ml-3 p-2 rounded-xl transition-all
                                                ${translations.title.active
                                                    ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'}
                                            `}
                                            style={{ verticalAlign: 'middle' }}
                                            title={translations.title.active ? t('common.show_original') : t('common.translate')}
                                        >
                                            {translations.title.loading ? (
                                                <Loader className="w-6 h-6 animate-spin" />
                                            ) : (
                                                <Languages className="w-6 h-6" />
                                            )}
                                        </button>
                                    )}
                                </h1>
                                {translations.title.active && (
                                    <p className="text-xs text-slate-400 mt-1 italic flex items-center gap-1">
                                        <Languages className="w-3 h-3" />
                                        {t('common.translated_automatically')}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 px-4 md:px-0">
                        <div>
                            <div className="flex items-start text-slate-500">
                                <MapPin className="w-5 h-5 mr-1 text-primary-500 shrink-0 mt-1" />
                                {renderAddress()}
                            </div>
                        </div>
                        <div className="text-right">

                            <div className="text-4xl font-black text-primary-600">
                                {isEditing ? (
                                    <PropertyPriceFields
                                        data={editData}
                                        onChange={handleInputChange}
                                        getFieldStatus={getFieldStatus}
                                        errors={errors}
                                        t={t}
                                        isEditMode={true}
                                    />
                                ) : (
                                    <div className="flex flex-col items-end gap-1">
                                        {(() => {
                                            const isBoth = property.listing_type === 'both' || property.listing_type === 'sale_rent';
                                            const isVacation = property.listing_type === 'vacation';

                                            if (isBoth) {
                                                return (
                                                    <div className="flex flex-col items-end">
                                                        <div className="flex flex-col items-end mb-4">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-bold text-slate-400 uppercase">{t('common.sale')}</span>
                                                                <span>{formatCurrency(property.sale_price || property.price, property.currency)}</span>
                                                            </div>
                                                            <p className="text-lg font-bold text-slate-600 mt-1">
                                                                {getPricePerArea()}
                                                            </p>
                                                        </div>
                                                        <div className="w-full h-px bg-slate-200 my-2"></div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-bold text-slate-400 uppercase">{t('common.total_rent')}</span>
                                                            <div className="flex items-baseline gap-1">
                                                                <span>{formatCurrency(calculateTotalRent(), property.currency)}</span>
                                                                <span className="text-xs font-medium text-slate-400 lowercase">{t(`common.periods.${property.rent_period || 'month'}`)}</span>
                                                            </div>
                                                        </div>
                                                        {(property.rent_period === 'month' || property.rent_period === 'year') && (
                                                            <div className="flex items-center gap-3 mt-1 text-slate-600 text-xs font-bold uppercase tracking-wider">
                                                                <span>{t('common.rent')}: {formatCurrency(property.rent_price || property.price, property.currency)}</span>
                                                                {parseFloat(property.condo_fee) > 0 && <span>{t('common.condo_fee')}: {formatCurrency(property.condo_fee, property.currency)}</span>}
                                                                {parseFloat(property.annual_fee) > 0 && <span>{t(`common.annual_fee_labels.${property.annual_fee_label || 'iptu'}`)}: {formatCurrency(property.annual_fee, property.currency)}</span>}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            }
                                            else if (isVacation) {
                                                return (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-slate-400 uppercase">{t('common.for_vacation')}</span>
                                                        <div className="flex items-baseline gap-1">
                                                            <span>{formatCurrency(property.vacation_price || property.price, property.currency)}</span>
                                                            <span className="text-xs font-medium text-slate-400 lowercase">{t(`common.periods.${property.vacation_period || 'day'}`)}</span>
                                                        </div>
                                                    </div>
                                                );
                                            } else if (property.listing_type === 'rent') {
                                                return (
                                                    <div className="flex flex-col items-end">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-bold text-slate-400 uppercase">{t('common.total_rent')}</span>
                                                            <div className="flex items-baseline gap-1">
                                                                <span>{formatCurrency(calculateTotalRent(), property.currency)}</span>
                                                                <span className="text-xs font-medium text-slate-400 lowercase">{t(`common.periods.${property.rent_period || 'month'}`)}</span>
                                                            </div>
                                                        </div>
                                                        {(property.rent_period === 'month' || property.rent_period === 'year') && (
                                                            <div className="flex items-center gap-3 mt-1 text-slate-600 text-xs font-bold uppercase tracking-wider">
                                                                <span>{t('common.rent')}: {formatCurrency(property.rent_price || property.price, property.currency)}</span>
                                                                {parseFloat(property.condo_fee) > 0 && <span>{t('common.condo_fee')}: {formatCurrency(property.condo_fee, property.currency)}</span>}
                                                                {parseFloat(property.annual_fee) > 0 && <span>{t(`common.annual_fee_labels.${property.annual_fee_label || 'iptu'}`)}: {formatCurrency(property.annual_fee, property.currency)}</span>}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div className="flex flex-col items-end">
                                                    <span>{formatCurrency(property.sale_price || property.price, property.currency)}</span>
                                                    <p className="text-lg font-bold text-slate-600 mt-1">
                                                        {getPricePerArea()}
                                                    </p>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Characteristics Grid */}
                    {isEditing ? (
                        <div className="px-4 md:px-0">
                            <PropertyCharacteristicsFields
                                data={editData}
                                onChange={handleInputChange}
                                getFieldStatus={getFieldStatus}
                                errors={errors}
                                t={t}
                            />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 px-4 md:px-0">
                            {[
                                { label: t('common.bedrooms'), name: 'characteristics.bedrooms', icon: Bed },
                                { label: t('common.suites'), name: 'characteristics.suites', icon: DoorOpen },
                                { label: t('common.rooms'), name: 'characteristics.rooms', icon: Layout },
                                { label: t('common.bathrooms'), name: 'characteristics.bathrooms', icon: BathIcon },
                                { label: t('common.garages'), name: 'characteristics.garages', icon: Car },
                                { label: t('common.area'), name: 'characteristics.area_combined', icon: SquareDashed, isCombined: true }
                            ].map((field) => {
                                const Icon = field.icon;
                                const targetObj = property;

                                if (field.isCombined) {
                                    const areaValue = targetObj?.characteristics?.area;
                                    const totalValue = targetObj?.characteristics?.total_area;
                                    const areaUnitRaw = targetObj?.characteristics?.area_unit;
                                    const totalUnitRaw = targetObj?.characteristics?.total_area_unit;

                                    const areaUnit = t(`common.area_units.${areaUnitRaw}`) || areaUnitRaw || t('common.area_unit');
                                    const totalUnit = t(`common.area_units.${totalUnitRaw}`) || totalUnitRaw || t('common.area_unit');

                                    return (
                                        <div key={field.name} className="glass-card p-5 rounded-2xl flex items-center space-x-4 transition-all relative overflow-hidden">
                                            {/* Watermark Icon - match edit mode style */}
                                            {!field.isCombined && (
                                                <Icon className="absolute -right-4 -bottom-4 w-24 h-24 text-primary-600/5 rotate-[-15deg] pointer-events-none" />
                                            )}
                                            <div className="flex-1 relative z-10">
                                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{field.label}</p>
                                                <p className="text-xl font-bold text-slate-800">
                                                    {(() => {
                                                        const sameUnit = areaUnitRaw === totalUnitRaw;
                                                        if (sameUnit) {
                                                            return <span>{areaValue || 0} / {totalValue || 0} {areaUnit}</span>;
                                                        } else {
                                                            return (
                                                                <span className="flex flex-col text-sm leading-tight gap-1">
                                                                    <span>{areaValue || 0} {areaUnit} (Util)</span>
                                                                    <span>{totalValue || 0} {totalUnit} (Total)</span>
                                                                </span>
                                                            )
                                                        }
                                                    })()}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                } else {
                                    // Standard View Mode
                                    let value = field.name.split('.').reduce((obj, key) => obj?.[key], targetObj);
                                    if (value === undefined || value === null) value = 0;

                                    return (
                                        <div key={field.name} className="glass-card p-5 rounded-2xl flex items-center space-x-4 transition-all relative overflow-hidden">
                                            {/* Watermark Icon - match edit mode style */}
                                            {!field.isCombined && (
                                                <Icon className="absolute -right-4 -bottom-4 w-24 h-24 text-primary-600/5 rotate-[-15deg] pointer-events-none" />
                                            )}
                                            <div className="flex-1 relative z-10">
                                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{field.label}</p>
                                                <p className="text-xl font-bold text-slate-800">
                                                    {value}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                }
                            })}
                        </div>
                    )}

                    {/* Description */}
                    {(isEditing || property.description?.trim()) && (
                        <div className="px-4 md:px-0">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-2xl font-bold text-slate-800">{t('property_details.about_property')}</h3>
                                {!isEditing && (
                                    <button
                                        onClick={() => handleTranslate('description')}
                                        disabled={translations.description.loading}
                                        className={`
                                        flex-shrink-0 p-2 rounded-xl transition-all
                                        ${translations.description.active
                                                ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'}
                                    `}
                                        title={translations.description.active ? t('common.show_original') : t('common.translate')}
                                    >
                                        {translations.description.loading ? (
                                            <Loader className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <Languages className="w-5 h-5" />
                                        )}
                                    </button>
                                )}
                            </div>
                            {isEditing ? (
                                <div className="w-full">
                                    <textarea
                                        name="description"
                                        value={editData.description}
                                        onChange={handleInputChange}
                                        rows="6"
                                        className={`w-full p-4 bg-slate-50 border-2 rounded-2xl text-slate-600 leading-relaxed text-lg outline-none transition-all resize-none ${getFieldStatus('description') || 'border-primary-100 focus:border-primary-500'}`}
                                        placeholder={t('property_details.describe_property_placeholder')}
                                    />
                                    {errors.description && <p className="text-red-500 text-xs font-bold mt-1">{errors.description}</p>}
                                </div>
                            ) : (
                                <div className="relative">
                                    <p className="text-slate-600 leading-relaxed text-lg whitespace-pre-line">
                                        {translations.description.active ? translations.description.text : property.description}
                                    </p>
                                    {translations.description.active && (
                                        <p className="text-xs text-slate-400 mt-2 italic flex items-center gap-1">
                                            <Languages className="w-3 h-3" />
                                            {t('common.translated_automatically')}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Amenities Section */}
                    {(isEditing || (property.amenities && property.amenities.length > 0)) && (
                        <div className="py-8 border-t border-slate-100 px-4 md:px-0">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-bold text-slate-800">{t('property_details.key_amenities')}</h3>
                                {isEditing && (
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">
                                        {t('property_details.drag_to_reorder')}
                                    </span>
                                )}
                            </div>

                            {isEditing ? (
                                <div className="space-y-4">
                                    {/* Google Keep Style Add Input */}
                                    <div className="relative">
                                        <div className="flex items-center gap-3 bg-white border-2 border-slate-100 rounded-2xl p-2 pl-4 focus-within:border-primary-500 transition-all shadow-sm">
                                            <button
                                                onClick={() => setShowAmenitySuggestions(!showAmenitySuggestions)}
                                                className={`p-1 rounded-lg transition-colors ${showAmenitySuggestions ? 'bg-primary-50 text-primary-600' : 'text-primary-500 hover:bg-slate-50'}`}
                                                title={t('property_details.view_all_amenities') || 'View all amenities'}
                                            >
                                                <Plus className={`w-5 h-5 transition-transform duration-300 ${showAmenitySuggestions ? 'rotate-45' : ''}`} />
                                            </button>
                                            <input
                                                type="text"
                                                placeholder={t('property_details.add_amenity_placeholder')}
                                                className="flex-1 bg-transparent outline-none text-slate-700 font-medium"
                                                value={amenityInput}
                                                onChange={(e) => {
                                                    setAmenityInput(e.target.value);
                                                    setShowAmenitySuggestions(true);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        addAmenity(amenityInput);
                                                    }
                                                }}
                                                onFocus={() => setShowAmenitySuggestions(true)}
                                            />
                                            {amenityInput && (
                                                <button
                                                    onClick={() => addAmenity(amenityInput)}
                                                    className="bg-primary-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-primary-700 transition-colors"
                                                >
                                                    {t('common.add') || 'Add'}
                                                </button>
                                            )}
                                        </div>

                                        {/* Suggestions Dropdown */}
                                        <AnimatePresence>
                                            {showAmenitySuggestions && (
                                                <>
                                                    {/* Backdrop to close on click outside */}
                                                    <div
                                                        className="fixed inset-0 z-[90]"
                                                        onClick={() => setShowAmenitySuggestions(false)}
                                                    />
                                                    <Motion.div
                                                        initial={{ opacity: 0, y: -10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -10 }}
                                                        className="absolute z-[100] left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 max-h-60 overflow-y-auto p-2"
                                                    >
                                                        {availableAmenities
                                                            .filter(a => {
                                                                const translatedName = getAmenityLabel(a);
                                                                return (amenityInput ? translatedName.toLowerCase().includes(amenityInput.toLowerCase()) : true) &&
                                                                    !editData.amenities.includes(a);
                                                            })
                                                            .map((suggestion, idx) => {
                                                                const translatedName = getAmenityLabel(suggestion);
                                                                return (
                                                                    <button
                                                                        key={idx}
                                                                        onClick={() => addAmenity(suggestion)}
                                                                        className="w-full text-left px-4 py-3 hover:bg-slate-50 rounded-xl text-slate-600 font-medium transition-colors flex items-center justify-between group"
                                                                    >
                                                                        <span>{translatedName}</span>
                                                                        <Plus className="w-4 h-4 text-slate-300 group-hover:text-primary-500" />
                                                                    </button>
                                                                );
                                                            })
                                                        }
                                                        {availableAmenities.filter(a => {
                                                            const translatedName = getAmenityLabel(a);
                                                            return (amenityInput ? translatedName.toLowerCase().includes(amenityInput.toLowerCase()) : true) &&
                                                                !editData.amenities.includes(a);
                                                        }).length === 0 && (
                                                                <div className="px-4 py-3 text-slate-400 text-sm italic">
                                                                    {amenityInput
                                                                        ? t('property_details.press_enter_to_add').replace('{name}', amenityInput)
                                                                        : t('property_details.no_more_amenities')
                                                                    }
                                                                </div>
                                                            )}
                                                    </Motion.div>
                                                </>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* Draggable List */}
                                    <Reorder.Group
                                        axis="y"
                                        values={editData.amenities || []}
                                        onReorder={reorderAmenities}
                                        className="space-y-2"
                                    >
                                        {(editData.amenities || []).map((item) => {
                                            const translatedName = getAmenityLabel(item);
                                            return (
                                                <Reorder.Item
                                                    key={item}
                                                    value={item}
                                                    className="flex items-center gap-3 bg-white border border-slate-100 p-3 rounded-2xl shadow-sm cursor-grab active:cursor-grabbing group hover:border-primary-200 transition-colors"
                                                >
                                                    <GripVertical className="w-5 h-5 text-slate-300 group-hover:text-slate-400" />
                                                    <span className="flex-1 font-medium text-slate-700">{translatedName}</span>
                                                    <button
                                                        onClick={() => removeAmenity(item)}
                                                        className="p-2 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-lg transition-all"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </Reorder.Item>
                                            );
                                        })}
                                    </Reorder.Group>

                                    {(!editData.amenities || editData.amenities.length === 0) && (
                                        <div className="text-center py-8 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 font-medium">
                                            {t('property_details.no_amenities_yet')}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    {(property.amenities || []).map((item, idx) => {
                                        const translatedName = getAmenityLabel(item);

                                        return (
                                            <Motion.div
                                                key={idx}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.05 }}
                                                className="flex items-center gap-3 group"
                                            >
                                                <div className="w-6 h-6 rounded-lg bg-green-500 flex items-center justify-center flex-shrink-0 shadow-sm shadow-green-200">
                                                    <Check className="w-4 h-4 text-white" />
                                                </div>
                                                <span className="text-slate-600 font-medium group-hover:text-slate-900 transition-colors">
                                                    {translatedName}
                                                </span>
                                            </Motion.div>
                                        );
                                    })}
                                    {(!property.amenities || property.amenities.length === 0) && (
                                        <p className="text-slate-400 italic col-span-full">{t('common.no_amenities_listed') || 'No specific amenities listed for this property.'}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Property Location */}
                    {property.location && (
                        <div className="md:px-0">
                            <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center px-4 md:px-0">
                                <MapPin className="w-6 h-6 mr-2 text-primary-600" />
                                {t('property_details.location') || 'Location'}
                            </h3>
                            <div className="px-8 md:px-0">
                                <div
                                    className="h-80 rounded-3xl overflow-hidden border border-slate-200 shadow-lg z-10 relative group"
                                >
                                    <MapContainer
                                        center={[Number(editData?.location?.lat || property.location.lat), Number(editData?.location?.lng || property.location.lng)]}
                                        zoom={14}
                                        scrollWheelZoom={true}
                                        dragging={true}
                                        style={{ height: '100%', width: '100%' }}
                                    >
                                        <TileLayer
                                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        />
                                        {isEditing ? (
                                            <>
                                                <LocationPicker
                                                    location={editData.location}
                                                    setEditData={setEditData}
                                                    anchorLocation={anchorLocation}
                                                    onLocationChange={fetchAddress}
                                                />
                                                <RecenterMap center={editData.location} />
                                            </>
                                        ) : (
                                            <>
                                                <Circle
                                                    center={[Number(property.location.lat), Number(property.location.lng)]}
                                                    radius={1000}
                                                    pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.2, weight: 2 }}
                                                />
                                                {isOwner && (
                                                    <Marker
                                                        position={[Number(property.location.lat), Number(property.location.lng)]}
                                                        icon={faviconIcon}
                                                    />
                                                )}
                                            </>
                                        )}
                                    </MapContainer>
                                    <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-slate-600 shadow-sm border border-slate-200">
                                        {isEditing && editData.location
                                            ? `${Number(editData.location.lat).toFixed(4)}, ${Number(editData.location.lng).toFixed(4)}`
                                            : (isOwner
                                                ? `${Number(property.location.lat).toFixed(4)}, ${Number(property.location.lng).toFixed(4)}`
                                                : t('property_details.approximate_location')
                                            )
                                        }
                                    </div>
                                    {isEditing && (
                                        <div className="absolute top-4 left-4 bg-primary-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg z-[400] pointer-events-none animate-pulse">
                                            {t('property_details.click_map_to_change')}
                                        </div>
                                    )}
                                </div>
                                {isEditing && (
                                    <div className="mt-4 space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-tighter ml-1">{t('property_details.property_address')}</label>
                                        <AddressAutocomplete
                                            name="address.private"
                                            value={editData.address?.private || ''}
                                            onChange={handleInputChange}
                                            onSelect={handleAddressSelect}
                                            disabled={isResolvingAddress}
                                            placeholder={t('property_details.search_address_placeholder')}
                                        />
                                        <div className="flex items-center gap-2 mt-4 p-4 bg-white/50 backdrop-blur-sm rounded-2xl border border-slate-100 shadow-sm transition-all hover:border-primary-200">
                                            <input
                                                type="checkbox"
                                                id="show_exact_address"
                                                className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                                                checked={editData.show_exact_address || false}
                                                onChange={(e) => setEditData(prev => ({ ...prev, show_exact_address: e.target.checked }))}
                                            />
                                            <label htmlFor="show_exact_address" className="text-sm font-bold text-slate-700 cursor-pointer">
                                                {t('property_details.show_exact_address') || 'Show exact address to public'}
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Building Layout */}
                    {
                        property.layout_image && !isEditing && (
                            <div className="px-4 md:px-0">
                                <h3 className="text-2xl font-bold text-slate-800 mb-1 flex items-center">
                                    <Layout className="w-7 h-7 mr-3 text-primary-600" />
                                    {t('property_details.building_layout')}
                                </h3>
                                <p className="text-slate-500 mb-6 text-sm">{t('property_details.floor_plan_description')}</p>
                                <div className="glass-card p-6 rounded-3xl overflow-hidden flex items-center justify-center bg-slate-900" style={{ minHeight: '400px', maxHeight: '800px' }}>
                                    <CompressedImage
                                        src={property.layout_image}
                                        alt="Building Layout"
                                        className="max-w-full max-h-full object-contain cursor-zoom-in transition-transform hover:scale-[1.01]"
                                        onClick={() => openLightbox([property.layout_image], 0)}
                                    />
                                </div>
                            </div>
                        )
                    }



                    {/* Create Action Button (Bottom of form for new listings) */}
                    {isCreating && (
                        <div className="mt-12 flex justify-end">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className={`bg-primary-600 text-white px-8 py-4 rounded-2xl font-bold shadow-xl hover:bg-primary-700 transition-all text-lg flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed ${!isFormValid ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {saving ? <Loader className="w-6 h-6 animate-spin" /> : <PlusCircle className="w-6 h-6" />}
                                <span>{t('common.create_listing')}</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Right Column: Sidebar */}
                <div className="space-y-8 px-4 md:px-0">
                    {/* Contact Card - Hide when creating new listing */}
                    {!isCreating && (
                        <div className="p-6 md:p-8 rounded-3xl sticky top-28 premium-shadow bg-primary-600 text-white shadow-2xl overflow-hidden relative">
                            {/* Background Pattern */}
                            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                            <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-32 h-32 bg-primary-500/30 rounded-full blur-3xl"></div>

                            {property.owner && (
                                <div className="flex items-center gap-4 mb-8 pb-8 border-b border-white/20 relative z-10">
                                    <CompressedImage
                                        src={(property.owner && property.owner.photo) || `https://ui-avatars.com/api/?name=${encodeURIComponent((property.owner && property.owner.name) || 'Owner')}&background=random`}
                                        alt={(property.owner && property.owner.name) || 'Owner'}
                                        className="w-16 h-16 rounded-full border-2 border-white/30 object-cover shadow-lg cursor-zoom-in transition-transform hover:scale-105"
                                        onClick={() => openLightbox([(property.owner && property.owner.photo) || `https://ui-avatars.com/api/?name=${encodeURIComponent((property.owner && property.owner.name) || 'Owner')}&background=random`], 0)}
                                    />
                                    <div>
                                        <p className="text-primary-100 text-xs font-bold uppercase tracking-widest mb-1">{t('property_details.listed_by')}</p>
                                        <h4 className="text-xl font-bold text-white leading-tight">{property.owner.name || t('property_details.property_owner') || 'Property Owner'}</h4>
                                    </div>
                                </div>
                            )}
                            <h3 className="text-2xl font-bold mb-6 italic relative z-10">
                                {isOwner ? t('property_details.manage_listing') : t('property_details.interested')}
                            </h3>
                            <div className="space-y-4 relative z-10">
                                {isOwner ? (
                                    <>
                                        {isEditing ? (
                                            <div className="flex flex-col gap-3">
                                                <button
                                                    onClick={handleSave}
                                                    disabled={saving || Object.keys(errors).length > 0}
                                                    className="w-full bg-white text-primary-600 py-4 rounded-2xl font-bold shadow-xl hover:bg-slate-50 transition-all text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {saving ? <Loader className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                                    <span>{t('property_details.save_changes')}</span>
                                                </button>
                                                <button
                                                    onClick={() => { setIsEditing(false); setErrors({}); }}
                                                    disabled={saving}
                                                    className="w-full bg-primary-500 text-white border-2 border-primary-400/50 py-4 rounded-2xl font-bold hover:bg-primary-400 transition-all text-lg flex items-center justify-center gap-2"
                                                >
                                                    <Undo2 className="w-5 h-5" />
                                                    <span>{t('property_details.cancel_edit')}</span>
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-3">
                                                <button
                                                    onClick={handleEditStart}
                                                    className="w-full bg-white text-primary-600 py-4 rounded-2xl font-bold shadow-xl hover:bg-slate-50 transition-all text-lg flex items-center justify-center gap-2"
                                                >
                                                    <Edit className="w-5 h-5" />
                                                    <span>{t('property_details.edit_listing')}</span>
                                                </button>
                                                <button
                                                    onClick={() => setIsDeleteModalOpen(true)}
                                                    className="w-full bg-red-500 text-white border-2 border-red-400/50 py-4 rounded-2xl font-bold hover:bg-red-600 transition-all text-lg flex items-center justify-center gap-2"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                    <span>{t('property_details.delete_listing')}</span>
                                                </button>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <div className="relative group/cs">
                                            <button
                                                disabled
                                                className="w-full bg-white/50 text-primary-600/50 py-4 rounded-2xl font-bold border-2 border-white/20 transition-all text-lg cursor-not-allowed"
                                            >
                                                {t('property_details.contact_agent')}
                                            </button>
                                            <div className="absolute -top-3 -right-2 bg-amber-400 text-slate-900 text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg transform rotate-12">
                                                {t('common.coming_soon')}
                                            </div>
                                        </div>
                                        <div className="relative group/cs">
                                            <button
                                                disabled
                                                className="w-full bg-primary-500/50 text-white/50 border-2 border-primary-400/20 py-4 rounded-2xl font-bold transition-all text-lg cursor-not-allowed"
                                            >
                                                {t('property_details.schedule_tour')}
                                            </button>
                                            <div className="absolute -top-3 -right-2 bg-amber-400 text-slate-900 text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg transform rotate-12">
                                                {t('common.coming_soon')}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {
                createPortal(
                    <AnimatePresence>
                        {isDeleteModalOpen && (
                            <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
                                <Motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => !isDeleting && setIsDeleteModalOpen(false)}
                                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                                />
                                <Motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                    className="relative bg-white rounded-[32px] p-10 max-w-md w-full shadow-2xl overflow-hidden border border-slate-100"
                                >
                                    <div className="bg-red-50 w-20 h-20 rounded-3xl flex items-center justify-center mb-8 rotate-12">
                                        <Trash2 className="w-10 h-10 text-red-500" />
                                    </div>
                                    <h3 className="text-3xl font-black text-slate-800 mb-3 tracking-tight">{t('property_details.delete_confirmation_title')}</h3>
                                    <p className="text-slate-500 mb-10 leading-relaxed text-lg">
                                        {t('property_details.delete_confirmation_text').replace('{title}', property.title)}
                                    </p>
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setIsDeleteModalOpen(false)}
                                            disabled={isDeleting}
                                            className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold transition-all disabled:opacity-50"
                                        >
                                            {t('property_details.cancel')}
                                        </button>
                                        <button
                                            onClick={handleDelete}
                                            disabled={isDeleting}
                                            className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold shadow-xl shadow-red-200 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                                        >
                                            {isDeleting ? (
                                                <Loader className="w-6 h-6 animate-spin" />
                                            ) : (
                                                <>
                                                    <Trash2 className="w-5 h-5" />
                                                    <span>{t('property_details.delete_forever')}</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </Motion.div>
                            </div>
                        )}
                    </AnimatePresence>,
                    document.body
                )
            }
            <ImageLightbox
                images={lightboxImages}
                initialIndex={lightboxIndex}
                isOpen={lightboxOpen}
                onClose={() => setLightboxOpen(false)}
            />
        </div >
    );
};

export default PropertyDetails;
