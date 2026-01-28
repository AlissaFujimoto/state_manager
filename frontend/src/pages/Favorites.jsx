import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useFavorites } from '../contexts/FavoritesContext';
import PropertyCard from '../components/PropertyCard';
import PropertyCardSkeleton from '../components/PropertyCardSkeleton';
import api from '../api';
import { Heart } from 'lucide-react';

const Favorites = () => {
    const { t } = useLanguage();
    const { favorites, loading: authLoading } = useFavorites();
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);

    const [propertyStatuses, setPropertyStatuses] = useState([]);

    useEffect(() => {
        const fetchProperties = async () => {
            if (authLoading) return;

            if (favorites.length === 0) {
                setProperties([]);
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                // Fetch statuses and properties in parallel
                const [statusesRes, ...propertiesRes] = await Promise.all([
                    api.get('/statuses'),
                    ...favorites.map(id =>
                        api.get(`/announcements/${id}`).then(res => res.data).catch(() => null)
                    )
                ]);

                setPropertyStatuses(statusesRes.data);
                const validProperties = propertiesRes.filter(p => p !== null);
                setProperties(validProperties);
            } catch (err) {
                console.error('Failed to fetch favorite properties:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchProperties();
    }, [favorites, authLoading]);

    if (authLoading) {
        return (
            <div className="max-w-7xl mx-auto px-8 md:px-12 py-8 min-h-screen">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[1, 2, 3].map(i => <PropertyCardSkeleton key={i} />)}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-8 md:px-12 py-8 min-h-screen">
            <div className="flex items-center gap-3 mb-8">
                <div className="bg-rose-100 p-3 rounded-2xl">
                    <Heart className="w-8 h-8 text-rose-600 fill-rose-600" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">
                        {t('favorites.title') || 'My Favorites'}
                    </h1>
                    <p className="text-slate-500 font-medium">
                        {favorites.length} {favorites.length === 1 ? (t('common.property') || 'property') : (t('common.properties') || 'properties')}
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
                    {[1, 2, 3, 4, 5, 6].map(i => <PropertyCardSkeleton key={i} />)}
                </div>
            ) : properties.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
                    {properties.map(property => (
                        <PropertyCard key={property.id} property={property} propertyStatuses={propertyStatuses} />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="bg-slate-100 p-6 rounded-3xl mb-4">
                        <Heart className="w-12 h-12 text-slate-300" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-700 mb-2">
                        {t('favorites.empty_title') || 'No favorites yet'}
                    </h3>
                    <p className="text-slate-400 max-w-md">
                        {t('favorites.empty_description') || 'Start browsing properties and click the heart icon to save them here for later.'}
                    </p>
                </div>
            )}
        </div>
    );
};

export default Favorites;
