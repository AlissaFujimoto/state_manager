import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../utils/databaseAuth';
import api from '../api';

const FavoritesContext = createContext();

export const useFavorites = () => useContext(FavoritesContext);

export const FavoritesProvider = ({ children }) => {
    const [user] = useAuthState(auth);
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFavorites = async () => {
            if (!user) {
                setFavorites([]);
                setLoading(false);
                return;
            }

            try {
                const res = await api.get('/user/favorites');
                setFavorites(res.data);
            } catch (err) {
                console.error('Failed to fetch favorites:', err);
                setFavorites([]);
            } finally {
                setLoading(false);
            }
        };

        fetchFavorites();
    }, [user]);

    const addFavorite = async (propertyId) => {
        if (!user) return; // Or show login modal
        try {
            // Optimistic update
            const newFavorites = [...favorites, propertyId];
            setFavorites(newFavorites);

            await api.post(`/user/favorites/${propertyId}`);
        } catch (err) {
            console.error('Failed to add favorite:', err);
            // Revert
            setFavorites(prev => prev.filter(id => id !== propertyId));
        }
    };

    const removeFavorite = async (propertyId) => {
        if (!user) return;
        try {
            // Optimistic update
            const newFavorites = favorites.filter(id => id !== propertyId);
            setFavorites(newFavorites);

            await api.delete(`/user/favorites/${propertyId}`);
        } catch (err) {
            console.error('Failed to remove favorite:', err);
            // Revert
            setFavorites(prev => [...prev, propertyId]);
        }
    };

    const isFavorite = (propertyId) => {
        return favorites.includes(propertyId);
    };

    return (
        <FavoritesContext.Provider value={{ favorites, addFavorite, removeFavorite, isFavorite, loading }}>
            {children}
        </FavoritesContext.Provider>
    );
};
