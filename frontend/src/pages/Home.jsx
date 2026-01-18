import React, { useState, useEffect } from 'react';
import { Search, Filter, MapPin, ChevronRight } from 'lucide-react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import api from '../api';

const PropertyCard = ({ property, showEditAction = false }) => {
    return (
        <Motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ y: -5 }}
            className="glass-card rounded-2xl overflow-hidden group premium-shadow"
        >
            <div className="relative h-64 overflow-hidden">
                <img
                    src={property.images?.[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80'}
                    alt={property.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute top-4 left-4">
                    <span className="px-3 py-1.5 bg-white/90 backdrop-blur-sm text-primary-700 text-xs font-bold rounded-full uppercase tracking-wider">
                        {property.property_type}
                    </span>
                </div>
                <div className="absolute bottom-4 right-4">
                    <div className="bg-primary-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg">
                        ${Number(property.price).toLocaleString()}
                    </div>
                </div>
            </div>

            <div className="p-6">
                <h3 className="text-xl font-bold text-slate-800 group-hover:text-primary-600 transition-colors">
                    {property.title}
                </h3>
                <p className="text-slate-500 text-sm mt-2 line-clamp-2">
                    {property.description}
                </p>

                <div className="grid grid-cols-3 gap-4 mt-6 py-4 border-y border-slate-100">
                    <div className="flex flex-col items-center">
                        <span className="text-slate-400 text-[10px] uppercase font-bold tracking-tighter">Beds</span>
                        <span className="text-slate-700 font-semibold">{property.characteristics?.bedrooms || 0}</span>
                    </div>
                    <div className="flex flex-col items-center border-x border-slate-100">
                        <span className="text-slate-400 text-[10px] uppercase font-bold tracking-tighter">Baths</span>
                        <span className="text-slate-700 font-semibold">{property.characteristics?.bathrooms || 0}</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-slate-400 text-[10px] uppercase font-bold tracking-tighter">Area</span>
                        <span className="text-slate-700 font-semibold">{property.characteristics?.area || 0}m²</span>
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <Link
                        to={`/property/${property.id}`}
                        className="flex-1 flex items-center justify-center space-x-2 py-3 bg-slate-50 hover:bg-primary-50 text-slate-600 hover:text-primary-600 rounded-xl font-semibold transition-all group/btn"
                    >
                        <span>View Details</span>
                        <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </Link>
                    {showEditAction && (
                        <Link
                            to={`/edit-property/${property.id}`}
                            className="flex-none px-4 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"
                            title="Edit Details"
                        >
                            <span className="font-bold text-sm">Edit</span>
                        </Link>
                    )}
                </div>
            </div>
        </Motion.div>
    );
};

const Home = () => {
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ type: 'all', minPrice: '', maxPrice: '' });
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchProperties = async () => {
            try {
                const params = {};
                if (filter.type !== 'all') params.type = filter.type;
                if (filter.minPrice) params.min_price = filter.minPrice;
                if (filter.maxPrice) params.max_price = filter.maxPrice;

                const res = await api.get('/announcements', { params });
                setProperties(res.data);
                setLoading(false);
            } catch (err) {
                console.error('Failed to fetch properties:', err);
                setLoading(false);
            }
        };
        fetchProperties();
    }, [filter]);

    const filteredProperties = (properties || []).filter(p => {
        const matchesType = filter.type === 'all' || p.property_type.toLowerCase() === filter.type.toLowerCase();
        const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesType && matchesSearch;
    });

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
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
                            <option value="house">Houses</option>
                            <option value="apartment">Apartments</option>
                            <option value="villa">Villas</option>
                        </select>
                        <button className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-primary-200 transition-all flex items-center space-x-2">
                            <Filter className="w-5 h-5" />
                            <span>Filters</span>
                        </button>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <AnimatePresence>
                    {filteredProperties.map((p) => (
                        <PropertyCard key={p.id} property={p} />
                    ))}
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
        </div>
    );
};

export default Home;
export { PropertyCard };
