import React, { useState, useEffect } from 'react';
import {
    Upload, X, Plus, Info, Home, DollarSign,
    Text, List, Image as ImageIcon, Layout,
    ArrowRight, ArrowLeft, CheckCircle2, MapPin, Search, Loader
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import AddressAutocomplete from '../components/AddressAutocomplete';
import CompressedImage from '../components/CompressedImage';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../utils/databaseAuth';
import ImageLightbox from '../components/ImageLightbox';
import { useLanguage } from '../contexts/LanguageContext';


const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ1) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
};

const LocationPicker = ({ location, setFormData, anchorLocation, onLocationChange }) => {
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

            setFormData(prev => ({
                ...prev,
                address: {
                    ...prev.address,
                    location: { lat, lng }
                }
            }));

            if (!anchorLocation && onLocationChange) {
                onLocationChange(lat, lng);
            }
        },
    });
    return location ? (
        <>
            <Marker position={[location.lat, location.lng]} />
            <Circle
                center={[location.lat, location.lng]}
                radius={1000}
                pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.1 }}
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
            map.setView([center.lat, center.lng], 13);
        }
    }, [center, map]);
    return null;
};

const PropertyForm = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = !!id;
    const [user, loadingAuth] = useAuthState(auth);
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [isResolvingAddress, setIsResolvingAddress] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [showErrors, setShowErrors] = useState(false);
    const [invalidatedFields, setInvalidatedFields] = useState(new Set());
    const [isShaking, setIsShaking] = useState(false);
    const [propertyTypes, setPropertyTypes] = useState([]);
    const [listingTypes, setListingTypes] = useState([]);
    const [propertyStatuses, setPropertyStatuses] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [anchorLocation, setAnchorLocation] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        price: '',
        property_type: 'house',
        listing_type: 'sale',
        status: 'available',
        characteristics: {
            bedrooms: 0,
            suites: 0,
            rooms: 0,
            bathrooms: 0,
            garages: 0,
            area: 0,
            total_area: 0
        },
        images: [],
        layout_image: null,
        address: {
            location: { lat: -23.5505, lng: -46.6333 },
            private: '',
            public: ''
        }
    });

    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [lightboxImages, setLightboxImages] = useState([]);

    const openLightbox = (imgs, index) => {
        setLightboxImages(imgs);
        setLightboxIndex(index);
        setLightboxOpen(true);
    };

    const isOwner = user && !loadingAuth; // Basic check during form creation/edit

    // Fetch static data (types, statuses)
    useEffect(() => {
        const fetchStaticData = async () => {
            // Property Types
            try {
                const res = await api.get('/types');
                if (Array.isArray(res.data) && res.data.length > 0) {
                    setPropertyTypes(res.data);
                } else {
                    console.warn("Received empty or invalid property types:", res.data);
                }
            } catch (err) {
                console.error("Failed to fetch property types:", err);
            }

            // Listing Types
            try {
                const res = await api.get('/listing-types');
                if (Array.isArray(res.data) && res.data.length > 0) {
                    setListingTypes(res.data);
                } else {
                    console.warn("Received empty or invalid listing types:", res.data);
                }
            } catch (err) {
                console.error("Failed to fetch listing types:", err);
            }

            // Statuses
            try {
                const res = await api.get('/statuses');
                if (Array.isArray(res.data) && res.data.length > 0) {
                    setPropertyStatuses(res.data);
                } else {
                    console.warn("Received empty or invalid statuses:", res.data);
                }
            } catch (err) {
                console.error("Failed to fetch statuses:", err);
            }
        };
        fetchStaticData();
    }, []);

    // Fetch existing property data for Edit Mode
    useEffect(() => {
        if (isEditMode && id && !loadingAuth) { // Wait for auth to be ready
            const fetchProperty = async () => {
                setLoading(true);
                try {
                    const res = await api.get(`/announcements/${id}?coords=true`);
                    const data = res.data;

                    // Parse address: New backend returns 'address' object, legacy/fallback might need check
                    // But we unified backend to return 'address' object.
                    // If old data exists without 'address' dict, we might need fallback logic here or hope backend handles it (backend *does* handle migration in from_dict but returns new structure)

                    const addr = data.address || {};
                    const loc = addr.location || data.location || { lat: -23.5505, lng: -46.6333 };

                    setFormData({
                        title: data.title || '',
                        description: data.description || '',
                        price: data.price || '',
                        property_type: data.property_type || 'house',
                        listing_type: data.listing_type || 'sale',
                        status: data.status || 'available',
                        characteristics: data.characteristics || {
                            bedrooms: 0, suites: 0, rooms: 0, bathrooms: 0, garages: 0, area: 0, total_area: 0
                        },
                        images: data.images || [],
                        layout_image: data.layout_image,
                        address: {
                            location: loc,
                            private: addr.private || data.private_address || '',
                            public: addr.public || data.public_address || ''
                        }
                    });

                    if (loc) {
                        setAnchorLocation(loc);
                    }
                } catch (err) {
                    console.error("Failed to fetch property:", err);
                    alert("Failed to load property details.");
                } finally {
                    setLoading(false);
                }
            };
            fetchProperty();
        }
    }, [isEditMode, id, loadingAuth, user]);

    const handleAddressSelect = (data) => {
        console.log("Selected:", data);
        setAnchorLocation(data.location);

        const details = data.addressDetails || {};
        const neighborhood = details.neighborhood || '';
        const city = details.city || '';
        const state = details.state || '';

        let public_addr = [neighborhood, city].filter(Boolean).join(', ');
        if (state) public_addr += ` - ${state}`;

        setFormData(prev => ({
            ...prev,
            address: {
                ...prev.address,
                location: data.location,
                private: data.address,
                public: public_addr
            }
        }));
    };

    const fetchAddress = async (lat, lng) => {
        if (anchorLocation) return;

        console.log(`Geocoding started for: ${lat}, ${lng}`);
        setIsResolvingAddress(true);
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await response.json();
            if (data && data.address) {
                const { suburb, neighbourhood, quarter, city, town, municipality, village, state, country } = data.address;

                // Construct masked address for Public
                const region = suburb || neighbourhood || quarter || village || '';
                const cityPart = city || town || municipality || '';
                const stateName = state || '';

                let public_addr = [region, cityPart].filter(Boolean).join(', ');
                if (stateName) public_addr += ` - ${stateName}`;

                setFormData(prev => ({
                    ...prev,
                    address: {
                        ...prev.address,
                        private: data.display_name,
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

    // Automatic reverse geocoding - REMOVED to prevent auto-fill when clearing address
    // Effect now only relies on manual interactions (map click or address select)

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setFormData(prev => ({
                ...prev,
                [parent]: { ...prev[parent], [child]: value }
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleImageUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setIsUploading(true);
        try {
            const { processPropertyImage } = await import('../utils/imageCompression');
            const uploadPromises = files.map(async (file) => {
                // Process image: resize to 1920x1080 and compress
                const compressedData = await processPropertyImage(file);
                return compressedData;
            });

            const compressedImages = await Promise.all(uploadPromises);
            setFormData(prev => ({
                ...prev,
                images: [...prev.images, ...compressedImages]
            }));
        } catch (err) {
            console.error('Failed to process images:', err);
            alert('Failed to process some images. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleLayoutUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const { processPropertyImage } = await import('../utils/imageCompression');
            // Process layout image same as property images
            const compressedData = await processPropertyImage(file);
            setFormData(prev => ({ ...prev, layout_image: compressedData }));
        } catch (err) {
            console.error('Failed to process layout:', err);
            alert('Failed to process floor plan. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    const removeImage = (index) => {
        setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
    };

    const isFieldInvalidValue = (value) => {
        const num = parseFloat(value);
        return !isNaN(num) && num < 0;
    };

    const isFieldMissing = (name) => {
        if (name === 'title' || name === 'description' || name === 'price') {
            return !formData[name] && formData[name] !== 0;
        }
        return false;
    };

    const isFieldValid = (name) => {
        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            const val = formData[parent][child];
            if (val === '') return true; // Optional fields are valid if empty
            return !isFieldInvalidValue(val);
        }
        if (isFieldMissing(name)) return false;
        if (name === 'price') return !isFieldInvalidValue(formData.price) && formData.price !== '';
        return true;
    };

    const getFieldStatus = (name, forceShow = false) => {
        let val;
        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            val = formData[parent][child];
        } else {
            val = formData[name];
        }

        const isMissing = isFieldMissing(name);
        const isInvalidValue = isFieldInvalidValue(val);

        // Immediate feedback for invalid values (negatives)
        if (isInvalidValue) return 'error';

        // Feedback for missing fields only after submit attempt
        if (showErrors || forceShow) {
            if (isMissing) return 'warning';
        }

        return 'neutral';
    };

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };



    const getValidationErrors = () => {
        const errors = [];
        if (isFieldMissing('title')) errors.push(t('common.title_required'));
        if (isFieldMissing('description')) errors.push(t('common.description_required'));
        if (isFieldMissing('price')) errors.push(t('common.price_required'));
        if (isFieldInvalidValue(formData.price)) errors.push(t('common.price_negative'));

        const charFields = ['bedrooms', 'suites', 'rooms', 'bathrooms', 'garages', 'area', 'total_area'];
        charFields.forEach(f => {
            if (isFieldInvalidValue(formData.characteristics[f])) {
                errors.push(`${t(`common.${f}`)} ${t('common.field_negative')}`);
            }
        });
        return errors;
    };

    const isStepValid = (s) => {
        if (s === 1) {
            return !!(formData.title && formData.description &&
                formData.price !== '' && parseFloat(formData.price) >= 0);
        }
        if (s === 2) {
            const c = formData.characteristics;
            const fields = ['bedrooms', 'suites', 'rooms', 'bathrooms', 'garages', 'area', 'total_area'];
            return fields.every(field => {
                const val = c[field];
                if (val === '') return true;
                return parseFloat(val) >= 0;
            });
        }
        return true;
    };

    const nextStep = () => {
        if (isStepValid(step)) {
            setStep(prev => prev + 1);
            setShowErrors(false);
        } else {
            setShowErrors(true);
            const invalidFieldsInStep = [];
            if (step === 1) {
                if (isFieldMissing('title')) invalidFieldsInStep.push('title');
                if (isFieldMissing('description')) invalidFieldsInStep.push('description');
                if (isFieldMissing('price') || isFieldInvalidValue(formData.price)) invalidFieldsInStep.push('price');
            }
            if (step === 2) {
                const charFields = ['bedrooms', 'suites', 'rooms', 'bathrooms', 'garages', 'area', 'total_area'];
                charFields.forEach(f => {
                    const val = formData.characteristics[f];
                    if (isFieldInvalidValue(val)) {
                        invalidFieldsInStep.push(`characteristics.${f}`);
                    }
                });
            }
            if (invalidFieldsInStep.length > 0) {
                setInvalidatedFields(prev => {
                    const next = new Set(prev);
                    invalidFieldsInStep.forEach(f => next.add(f));
                    return next;
                });
            }
            scrollToTop();
        }
    };
    const prevStep = () => setStep(prev => prev - 1);

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

        if (isLeftSwipe && step < 3) {
            nextStep();
        }
        if (isRightSwipe && step > 1 && step < 4) {
            prevStep();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const errors = getValidationErrors();
        const hasErrors = errors.length > 0;
        const step1Valid = isStepValid(1);
        const step2Valid = isStepValid(2);

        if (!step1Valid || !step2Valid || hasErrors) {
            setShowErrors(true);
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 500);

            const invalidFields = [];

            // Track Step 1
            if (isFieldMissing('title')) invalidFields.push('title');
            if (isFieldMissing('description')) invalidFields.push('description');
            if (isFieldMissing('price') || isFieldInvalidValue(formData.price)) invalidFields.push('price');

            // Track Step 2
            const charFields = ['bedrooms', 'suites', 'rooms', 'bathrooms', 'garages', 'area'];
            charFields.forEach(f => {
                const val = formData.characteristics[f];
                if (isFieldInvalidValue(val)) {
                    invalidFields.push(`characteristics.${f}`);
                }
            });

            if (invalidFields.length > 0) {
                setInvalidatedFields(prev => {
                    const next = new Set(prev);
                    invalidFields.forEach(f => next.add(f));
                    return next;
                });
            }

            console.log('Validation failed', { errors, invalidFields });
            scrollToTop();
            return;
        }

        console.log('Submission started. current address:', formData.address);
        if (isResolvingAddress || isUploading) {
            console.warn('Submission blocked: Resolution or Upload in progress.');
            return;
        }
        setLoading(true);
        try {
            console.log('Sending data to backend:', formData);
            if (isEditMode) {
                await api.put(`/announcements/${id}`, formData);
            } else {
                await api.post('/announcements', formData);
            }
            setStep(4); // Success step
        } catch (err) {
            console.error('Failed to save announcement:', err);
            alert('Error saving listing. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="max-w-4xl mx-auto px-4 py-12"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            {/* Progress Bar - Only for mobile steps */}
            {step < 4 && isMobile && (
                <div className="mb-12">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">{t('property_form.step_indicator').replace('{step}', step)}</span>
                        <span className="text-sm font-bold text-primary-600">
                            {step === 1 ? t('property_form.basic_info_title') : step === 2 ? t('property_form.characteristics_title') : t('property_form.media_assets_title')}
                        </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <Motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(step / 3) * 100}%` }}
                            className="h-full bg-primary-600"
                        />
                    </div>
                </div>
            )}

            <Motion.div
                layout
                className={`glass-card rounded-3xl p-8 md:p-12 shadow-2xl ${!isMobile && step < 4 ? 'max-w-none' : ''}`}
            >
                <form onSubmit={handleSubmit}>
                    {showErrors && getValidationErrors().length > 0 && (
                        <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 animate-fade-in">
                            <Info className="w-5 h-5 text-red-500 mt-0.5" />
                            <div>
                                <h3 className="text-sm font-bold text-red-800">{t('property_form.correct_errors')}</h3>
                                <ul className="text-sm text-red-600 list-disc list-inside mt-1">
                                    {getValidationErrors().map((err, i) => <li key={i}>{err}</li>)}
                                </ul>
                            </div>
                        </div>
                    )}
                    <AnimatePresence mode="wait">
                        {step === 4 ? (
                            <Motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-12"
                            >
                                <div className="bg-green-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8">
                                    <CheckCircle2 className="w-12 h-12 text-green-600" />
                                </div>
                                <h2 className="text-4xl font-black text-slate-800 mb-4">{isEditMode ? t('property_form.listing_updated') : t('property_form.listing_published')}</h2>
                                <p className="text-slate-500 text-lg mb-12">{isEditMode ? t('property_form.success_msg_updated') : t('property_form.success_msg_published')}</p>
                                <div className="flex flex-col md:flex-row gap-4 justify-center">
                                    <button
                                        type="button"
                                        onClick={() => navigate('/my-listings')}
                                        className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-bold shadow-xl hover:bg-slate-800 transition-all"
                                    >
                                        {t('property_form.go_to_my_listings')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => navigate('/')}
                                        className="bg-primary-50 text-primary-600 px-10 py-4 rounded-2xl font-bold border border-primary-100 hover:bg-primary-100 transition-all"
                                    >
                                        {t('property_form.view_homepage')}
                                    </button>
                                </div>
                            </Motion.div>
                        ) : (
                            <div className={!isMobile ? "space-y-12" : ""}>
                                {(step === 1 || !isMobile) && (
                                    <Motion.div
                                        key="step1"
                                        initial={isMobile ? { opacity: 0, x: 20 } : {}}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={isMobile ? { opacity: 0, x: -20 } : {}}
                                        className="space-y-6"
                                    >
                                        <div className="text-center mb-8">
                                            <h2 className="text-3xl font-black text-slate-800">{t('property_form.basic_info_title')}</h2>
                                            <p className="text-slate-500 mt-2">{t('property_form.basic_info_subtitle')}</p>
                                        </div>

                                        <div className="field-container">
                                            <label className="block text-sm font-bold text-slate-700 mb-2">{t('property_form.announcement_title')}</label>
                                            <input
                                                type="text"
                                                id="title"
                                                name="title"
                                                value={formData.title}
                                                onChange={handleInputChange}

                                                className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-primary-500 transition-all outline-none ${getFieldStatus('title') === 'error' ? 'neon-error' : getFieldStatus('title') === 'warning' ? 'neon-warning' : 'border-slate-200'}`}
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="field-container">
                                                <label className="block text-sm font-bold text-slate-700 mb-2">{t('property_form.property_type')}</label>
                                                <select
                                                    name="property_type"
                                                    value={formData.property_type}
                                                    onChange={handleInputChange}
                                                    className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-primary-500 transition-all outline-none border-slate-200`}
                                                >
                                                    {propertyTypes.map(type => (
                                                        <option key={type} value={type}>
                                                            {t(`home.${type}s`).replace(/s$/, '')}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="field-container">
                                                <label className="block text-sm font-bold text-slate-700 mb-2">{t('property_form.listing_type')}</label>
                                                <select
                                                    name="listing_type"
                                                    value={formData.listing_type}
                                                    onChange={handleInputChange}
                                                    className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-primary-500 transition-all outline-none border-slate-200`}
                                                >
                                                    {listingTypes.map(type => (
                                                        <option key={type} value={type}>
                                                            {type === 'sale' ? t('common.for_sale') : t('common.for_rent')}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="field-container">
                                                <label className="block text-sm font-bold text-slate-700 mb-2">{t('property_form.status')}</label>
                                                <select
                                                    name="status"
                                                    value={formData.status}
                                                    onChange={handleInputChange}
                                                    className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-primary-500 transition-all outline-none border-slate-200`}
                                                >
                                                    {(propertyStatuses || []).map(status => {
                                                        let label = t(`property_card.${status.id}`);
                                                        if (status.id === 'sold_rented') {
                                                            label = formData.listing_type === 'rent' ? t('property_card.rented') : t('property_card.sold');
                                                        }
                                                        return (
                                                            <option key={status.id} value={status.id}>
                                                                {label}
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="field-container">
                                            <label className="block text-sm font-bold text-slate-700 mb-2">{t('property_form.price_label')}</label>
                                            <input
                                                type="number"
                                                id="price"
                                                name="price"
                                                value={formData.price}
                                                onChange={handleInputChange}


                                                placeholder="500,000"
                                                className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-primary-500 transition-all outline-none ${getFieldStatus('price') === 'error' ? 'neon-error' : getFieldStatus('price') === 'warning' ? 'neon-warning' : 'border-slate-200'}`}
                                            />
                                        </div>

                                        <div className="field-container">
                                            <label className="block text-sm font-bold text-slate-700 mb-2">{t('property_form.description_label')}</label>
                                            <textarea
                                                id="description"
                                                name="description"
                                                value={formData.description}
                                                onChange={handleInputChange}

                                                rows="4"
                                                placeholder={t('property_form.description_placeholder')}
                                                className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-primary-500 transition-all outline-none ${getFieldStatus('description') === 'error' ? 'neon-error' : getFieldStatus('description') === 'warning' ? 'neon-warning' : 'border-slate-200'}`}
                                            ></textarea>
                                        </div>

                                        {isMobile && (
                                            <div className="flex justify-between items-center">
                                                <button
                                                    type="button"
                                                    onClick={() => navigate(-1)}
                                                    className="text-slate-400 font-bold flex items-center gap-2 hover:text-red-500 transition-all px-2"
                                                >
                                                    <span>{t('property_form.cancel')}</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={nextStep}
                                                    className={`bg-primary-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 hover:bg-primary-700 transition-all ${!isStepValid(1) ? 'opacity-50 cursor-not-allowed' : ''} ${isShaking ? 'shake' : ''}`}
                                                >
                                                    <span>{t('property_form.next_step')}</span>
                                                    <ArrowRight className="w-5 h-5" />
                                                </button>
                                            </div>
                                        )}
                                    </Motion.div>
                                )}

                                {(!isMobile && step < 4) && <div className="h-px bg-slate-100 my-8"></div>}

                                {(step === 2 || !isMobile) && (
                                    <Motion.div
                                        key="step2"
                                        initial={isMobile ? { opacity: 0, x: 20 } : {}}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={isMobile ? { opacity: 0, x: -20 } : {}}
                                        className="space-y-6"
                                    >
                                        <div className="text-center mb-8">
                                            <h2 className="text-3xl font-black text-slate-800">{t('property_form.characteristics_title')}</h2>
                                            <p className="text-slate-500 mt-2">{t('property_form.characteristics_subtitle')}</p>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                            {[
                                                { label: t('common.bedrooms'), name: 'characteristics.bedrooms' },
                                                { label: t('common.suites'), name: 'characteristics.suites' },
                                                { label: t('common.rooms'), name: 'characteristics.rooms' },
                                                { label: t('common.bathrooms'), name: 'characteristics.bathrooms' },
                                                { label: t('common.garages'), name: 'characteristics.garages' },
                                                { label: `${t('common.area')} (${t('common.m2')})`, name: 'characteristics.area' },
                                                { label: `${t('common.total')} (${t('common.m2')})`, name: 'characteristics.total_area' }
                                            ].map((field) => (
                                                <div key={field.name} className="field-container">
                                                    <label className="block text-sm font-bold text-slate-700 mb-2">{field.label}</label>
                                                    <input
                                                        type="number"
                                                        id={field.name}
                                                        name={field.name}
                                                        value={field.name.split('.').reduce((obj, key) => obj[key], formData)}
                                                        onChange={handleInputChange}


                                                        className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-primary-500 transition-all outline-none ${getFieldStatus(field.name) === 'error' ? 'neon-error' : getFieldStatus(field.name) === 'warning' ? 'neon-warning' : 'border-slate-200'}`}
                                                    />
                                                </div>
                                            ))}
                                        </div>

                                        {isMobile && (
                                            <div className="flex justify-between mt-12">
                                                <button
                                                    type="button"
                                                    onClick={prevStep}
                                                    className="text-slate-500 font-bold flex items-center gap-2 hover:text-slate-800 transition-all"
                                                >
                                                    <ArrowLeft className="w-5 h-5" />
                                                    <span>{t('property_form.prev_step')}</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={nextStep}
                                                    className={`bg-primary-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 hover:bg-primary-700 transition-all ${!isStepValid(2) ? 'opacity-50 cursor-not-allowed' : ''} ${isShaking ? 'shake' : ''}`}
                                                >
                                                    <span>{t('property_form.next_step')}</span>
                                                    <ArrowRight className="w-5 h-5" />
                                                </button>
                                            </div>
                                        )}
                                    </Motion.div>
                                )}

                                {(!isMobile && step < 4) && <div className="h-px bg-slate-100 my-8"></div>}

                                {(step === 3 || !isMobile) && (
                                    <Motion.div
                                        key="step3"
                                        initial={isMobile ? { opacity: 0, x: 20 } : {}}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={isMobile ? { opacity: 0, x: -20 } : {}}
                                        className="space-y-8"
                                    >
                                        <div className="text-center mb-8">
                                            <h2 className="text-3xl font-black text-slate-800">{t('property_form.media_assets_title')}</h2>
                                            <p className="text-slate-500 mt-2">{t('property_form.media_assets_subtitle')}</p>
                                        </div>

                                        {/* Image Gallery Upload */}
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-3">{t('property_details.property_gallery')}</label>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                {formData.images.map((url, idx) => (
                                                    <div key={idx} className="relative aspect-square group z-10 bg-slate-100 rounded-2xl cursor-pointer" onClick={() => openLightbox(formData.images, idx)}>
                                                        <CompressedImage src={url} className="w-full h-full object-cover rounded-2xl shadow-sm transition-transform group-hover:scale-[1.02]" />
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                                                            className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-md z-20 hover:bg-red-600 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                                <label className={`aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-all ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                    {isUploading ? (
                                                        <Loader className="w-8 h-8 text-primary-500 animate-spin" />
                                                    ) : (
                                                        <Plus className="w-8 h-8 text-slate-400" />
                                                    )}
                                                    <span className="text-xs font-bold text-slate-400 mt-2 uppercase">
                                                        {isUploading ? t('common.uploading') || 'Uploading...' : t('property_form.add_photos')}
                                                    </span>
                                                    <input type="file" multiple onChange={handleImageUpload} className="hidden" disabled={isUploading} />
                                                </label>
                                            </div>
                                        </div>


                                        {/* Layout Upload */}
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-3">{t('property_form.building_layout_title')}</label>
                                            {formData.layout_image ? (
                                                <div className="relative group bg-slate-100 p-4 border border-slate-200 flex items-center justify-center cursor-pointer" style={{ minHeight: '300px', maxHeight: '500px' }} onClick={() => openLightbox([formData.layout_image], 0)}>
                                                    <CompressedImage src={formData.layout_image} className="max-w-full max-h-full object-contain rounded-2xl transition-transform group-hover:scale-[1.02]" />
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); setFormData(prev => ({ ...prev, layout_image: null })); }}
                                                        className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-md z-20 hover:bg-red-600 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <label className={`w-full h-40 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-all ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                    {isUploading ? (
                                                        <Loader className="w-10 h-10 text-primary-500 animate-spin" />
                                                    ) : (
                                                        <Layout className="w-10 h-10 text-slate-400" />
                                                    )}
                                                    <span className="text-sm font-bold text-slate-400 mt-2 uppercase">
                                                        {isUploading ? t('common.uploading') || 'Uploading...' : t('property_form.upload_floor_plan')}
                                                    </span>
                                                    <input type="file" onChange={handleLayoutUpload} className="hidden" disabled={isUploading} />
                                                </label>
                                            )}
                                        </div>

                                        {/* Address & Map Localization */}
                                        <div className="space-y-6">
                                            <div className="field-container">
                                                <label className="block text-sm font-bold text-slate-700 mb-2">{t('property_details.search_address_label')}</label>
                                                <AddressAutocomplete
                                                    value={formData.address?.private || ''}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            address: {
                                                                ...prev.address,
                                                                private: val
                                                            }
                                                        }));
                                                    }}
                                                    onSelect={handleAddressSelect}
                                                    disabled={isResolvingAddress}
                                                    placeholder={t('property_details.search_address_placeholder')}
                                                />
                                            </div>



                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                                    <MapPin className="w-4 h-4 text-primary-600" />
                                                    <span>{t('property_form.confirm_location_title')}</span>
                                                </label>
                                                <div
                                                    className="h-72 rounded-2xl overflow-hidden border border-slate-200 shadow-inner z-10"
                                                >
                                                    <MapContainer
                                                        center={[formData.address.location.lat, formData.address.location.lng]}
                                                        zoom={12}
                                                        scrollWheelZoom={true}
                                                        dragging={true}
                                                        tap={false}
                                                        style={{ height: '100%', width: '100%' }}
                                                    >
                                                        <TileLayer
                                                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                                        />
                                                        <LocationPicker
                                                            location={formData.address.location}
                                                            setFormData={setFormData}
                                                            anchorLocation={anchorLocation}
                                                            onLocationChange={fetchAddress}
                                                        />
                                                        <RecenterMap center={formData.address.location} />
                                                    </MapContainer>
                                                </div>
                                                <p className="text-xs text-slate-400 mt-2">{t('property_details.click_map_to_change')}</p>
                                            </div>
                                        </div>

                                        {(isMobile || !isMobile) && (
                                            <div className="flex justify-between mt-12">
                                                {isMobile ? (
                                                    <button
                                                        type="button"
                                                        onClick={prevStep}
                                                        className="text-slate-500 font-bold flex items-center gap-2 hover:text-slate-800 transition-all"
                                                    >
                                                        <ArrowLeft className="w-5 h-5" />
                                                        <span>{t('property_form.prev_step')}</span>
                                                    </button>
                                                ) : <div></div>}
                                                <button
                                                    type="submit"
                                                    id="submit-button"
                                                    disabled={loading || isResolvingAddress}
                                                    className={`bg-primary-600 text-white px-12 py-4 rounded-2xl font-bold shadow-xl flex items-center gap-2 transition-all transform hover:-translate-y-1 ${(!isStepValid(1) || !isStepValid(2)) ? 'opacity-50 cursor-not-allowed hover:bg-primary-700' : 'hover:bg-primary-700'} ${isShaking ? 'shake' : ''}`}
                                                >
                                                    <span>
                                                        {loading ? t('common.submitting') :
                                                            isResolvingAddress ? t('common.searching_location') :
                                                                (isEditMode ? t('property_form.save_changes') : t('property_form.finish'))}
                                                    </span>
                                                    <CheckCircle2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        )}
                                    </Motion.div>
                                )}
                            </div>
                        )}
                    </AnimatePresence>
                </form>
            </Motion.div>
            <ImageLightbox
                images={lightboxImages}
                initialIndex={lightboxIndex}
                isOpen={lightboxOpen}
                onClose={() => setLightboxOpen(false)}
            />
        </div>
    );
};

export default PropertyForm;
