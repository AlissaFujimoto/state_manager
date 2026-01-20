import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    ChevronLeft, ChevronRight, Bed, Bath, Square,
    MapPin, Share2, Heart, Calendar, ArrowLeft,
    CheckCircle2, Info, Building2, Layout, Car, DoorOpen, Bath as BathIcon
} from 'lucide-react';
import { MapContainer, TileLayer, Circle } from 'react-leaflet';
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
import api from '../api';

const PropertyDetails = () => {
    const { id } = useParams();
    const [property, setProperty] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeImage, setActiveImage] = useState(0);

    useEffect(() => {
        const fetchProperty = async () => {
            try {
                const res = await api.get(`/announcements/${id}?coords=true`);
                setProperty(res.data);
                setLoading(false);
            } catch (err) {
                console.error('Failed to fetch property:', err);
                setLoading(false);
            }
        };
        fetchProperty();
    }, [id]);

    if (loading) return <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
    </div>;
    if (!property) return <div className="min-h-screen flex items-center justify-center text-slate-500">Property not found</div>;

    const nextImage = () => {
        if (activeImage < (property.images?.length || 0) - 1) {
            setActiveImage((prev) => prev + 1);
        }
    };
    const prevImage = () => {
        if (activeImage > 0) {
            setActiveImage((prev) => prev - 1);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <Link to="/" className="inline-flex items-center text-slate-500 hover:text-primary-600 transition-colors mb-6 font-medium">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to results
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Left Column: Media & Content */}
                <div className="lg:col-span-2 space-y-12">
                    {/* Image Carousel */}
                    <div className="relative h-[500px] rounded-3xl overflow-hidden shadow-2xl group">
                        <AnimatePresence mode="wait">
                            <Motion.img
                                key={activeImage}
                                src={property.images?.[activeImage]}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.5 }}
                                className="w-full h-full object-cover"
                            />
                        </AnimatePresence>

                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>

                        {property.images?.length > 1 && (
                            <>
                                <button
                                    onClick={prevImage}
                                    disabled={activeImage === 0}
                                    className={`absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 ${activeImage === 0 ? 'bg-black/20 text-white/40 cursor-not-allowed' : 'bg-black/30 hover:bg-black/50 text-white'
                                        }`}
                                >
                                    <ChevronLeft className="w-6 h-6" />
                                </button>
                                <button
                                    onClick={nextImage}
                                    disabled={activeImage === (property.images?.length || 0) - 1}
                                    className={`absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 ${activeImage === (property.images?.length || 0) - 1 ? 'bg-black/20 text-white/40 cursor-not-allowed' : 'bg-black/30 hover:bg-black/50 text-white'
                                        }`}
                                >
                                    <ChevronRight className="w-6 h-6" />
                                </button>
                            </>
                        )}

                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                            {property.images?.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setActiveImage(i)}
                                    className={`w-2 h-2 rounded-full transition-all ${i === activeImage ? 'bg-white w-6' : 'bg-white/50'}`}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Property Header */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="px-3 py-1 bg-primary-50 text-primary-700 text-xs font-bold rounded-full uppercase tracking-wider border border-primary-100 italic">
                                    Lux Premium
                                </span>
                                <span className="text-slate-400 font-medium whitespace-nowrap">
                                    • {property.created_at ? new Date(property.created_at).toLocaleDateString() : 'Recently'}
                                </span>
                            </div>
                            <h1 className="text-4xl font-extrabold text-slate-900">{property.title}</h1>
                            <div className="flex items-center text-slate-500 mt-3">
                                <MapPin className="w-5 h-5 mr-2 text-primary-500" />
                                <span className="font-medium">
                                    {property.address || (property.location ? `${Number(property.location.lat).toFixed(4)}, ${Number(property.location.lng).toFixed(4)}` : 'Location not specified')}
                                </span>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-1">Asking Price</p>
                            <div className="text-4xl font-black text-primary-600">
                                ${Number(property.price).toLocaleString()}
                            </div>
                        </div>
                    </div>

                    {/* Characteristics Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        <div className="glass-card p-5 rounded-2xl flex items-center space-x-4">
                            <div className="bg-primary-50 p-3 rounded-xl text-primary-600">
                                <Bed className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Bedrooms</p>
                                <p className="text-xl font-bold text-slate-800">{property.characteristics?.bedrooms || 0}</p>
                            </div>
                        </div>
                        <div className="glass-card p-5 rounded-2xl flex items-center space-x-4">
                            <div className="bg-primary-50 p-3 rounded-xl text-primary-600">
                                <DoorOpen className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Suites</p>
                                <p className="text-xl font-bold text-slate-800">{property.suites || 0}</p>
                            </div>
                        </div>
                        <div className="glass-card p-5 rounded-2xl flex items-center space-x-4">
                            <div className="bg-primary-50 p-3 rounded-xl text-primary-600">
                                <Layout className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Rooms</p>
                                <p className="text-xl font-bold text-slate-800">{property.rooms || 0}</p>
                            </div>
                        </div>
                        <div className="glass-card p-5 rounded-2xl flex items-center space-x-4">
                            <div className="bg-primary-50 p-3 rounded-xl text-primary-600">
                                <BathIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Baths</p>
                                <p className="text-xl font-bold text-slate-800">{property.bathrooms || 0}</p>
                            </div>
                        </div>
                        <div className="glass-card p-5 rounded-2xl flex items-center space-x-4">
                            <div className="bg-primary-50 p-3 rounded-xl text-primary-600">
                                <Car className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Garages</p>
                                <p className="text-xl font-bold text-slate-800">{property.garages || 0}</p>
                            </div>
                        </div>
                        <div className="glass-card p-5 rounded-2xl flex items-center space-x-4">
                            <div className="bg-primary-50 p-3 rounded-xl text-primary-600">
                                <Square className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Area</p>
                                <p className="text-xl font-bold text-slate-800">{property.area || 0}m²</p>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <h3 className="text-2xl font-bold text-slate-800 mb-4">About this property</h3>
                        <p className="text-slate-600 leading-relaxed text-lg">
                            {property.description}
                        </p>
                    </div>

                    {/* Property Location */}
                    {property.location && (
                        <div>
                            <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center">
                                <MapPin className="w-6 h-6 mr-2 text-primary-600" />
                                Location
                            </h3>
                            <div className="h-80 rounded-3xl overflow-hidden border border-slate-200 shadow-lg z-0 relative group">
                                <MapContainer
                                    center={[Number(property.location.lat), Number(property.location.lng)]}
                                    zoom={15}
                                    scrollWheelZoom={true}
                                    style={{ height: '100%', width: '100%' }}
                                >
                                    <TileLayer
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />
                                    <Circle
                                        center={[Number(property.location.lat), Number(property.location.lng)]}
                                        radius={500}
                                        pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.2, weight: 2 }}
                                    />
                                </MapContainer>
                                <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-slate-600 shadow-sm border border-slate-200">
                                    {Number(property.location.lat).toFixed(4)}, {Number(property.location.lng).toFixed(4)}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Amenities */}
                    {property.amenities && (
                        <div>
                            <h3 className="text-2xl font-bold text-slate-800 mb-6">Key Amenities</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4">
                                {property.amenities.map((item, idx) => (
                                    <div key={idx} className="flex items-center text-slate-700">
                                        <CheckCircle2 className="w-5 h-5 text-green-500 mr-3" />
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Building Layout */}
                    {property.layout_image && (
                        <div>
                            <h3 className="text-2xl font-bold text-slate-800 mb-1 flex items-center">
                                <Layout className="w-7 h-7 mr-3 text-primary-600" />
                                Building Layout
                            </h3>
                            <p className="text-slate-500 mb-6 text-sm">Detailed architectural floor plan of the property.</p>
                            <div className="glass-card p-4 rounded-3xl overflow-hidden">
                                <img
                                    src={property.layout_image}
                                    alt="Building Layout"
                                    className="w-full h-auto rounded-2xl"
                                />
                            </div>
                        </div>
                    )}


                </div>

                {/* Right Column: Sidebar */}
                <div className="space-y-8">
                    {/* Contact Card */}
                    <div className="p-8 rounded-3xl sticky top-28 premium-shadow bg-primary-600 text-white shadow-2xl overflow-hidden relative">
                        {/* Background Pattern */}
                        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-32 h-32 bg-primary-500/30 rounded-full blur-3xl"></div>

                        {property.owner && (
                            <div className="flex items-center gap-4 mb-8 pb-8 border-b border-white/20 relative z-10">
                                <img
                                    src={property.owner.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(property.owner.name || 'Owner')}&background=random`}
                                    alt={property.owner.name}
                                    className="w-16 h-16 rounded-full border-2 border-white/30 object-cover shadow-lg"
                                />
                                <div>
                                    <p className="text-primary-100 text-xs font-bold uppercase tracking-widest mb-1">Listed by</p>
                                    <h4 className="text-xl font-bold text-white leading-tight">{property.owner.name || 'Property Owner'}</h4>
                                </div>
                            </div>
                        )}
                        <h3 className="text-2xl font-bold mb-6 italic relative z-10">Interested?</h3>
                        <div className="space-y-4 relative z-10">
                            <button className="w-full bg-white text-primary-600 py-4 rounded-2xl font-bold shadow-xl hover:bg-slate-50 transition-all text-lg">
                                Contact Agent
                            </button>
                            <button className="w-full bg-primary-500 text-white border-2 border-primary-400/50 py-4 rounded-2xl font-bold hover:bg-primary-400 transition-all text-lg">
                                Schedule a Tour
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PropertyDetails;
