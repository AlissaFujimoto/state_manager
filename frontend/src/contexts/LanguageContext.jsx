import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const [translations, setTranslations] = useState(null);
    const [loading, setLoading] = useState(true);
    const [regions, setRegions] = useState([]);
    const [currentLanguage, setCurrentLanguage] = useState(null);

    const fetchLanguageData = async (lang = '') => {
        setLoading(true);
        try {
            const res = await api.get(`/region${lang ? `?lang=${lang}` : ''}`);
            setTranslations(res.data.languagePack);
            setRegions(res.data.regions);
            setCurrentLanguage(res.data.language);
        } catch (err) {
            console.error('Failed to fetch language data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLanguageData();
    }, []);

    const changeLanguage = (lang) => {
        fetchLanguageData(lang);
    };

    const t = (path) => {
        if (!translations) return path;
        const keys = path.split('.');
        let result = translations;
        for (const key of keys) {
            if (!result || result[key] === undefined) return path;
            result = result[key];
        }
        return result;
    };

    const formatCurrency = (amount) => {
        const value = Number(amount) || 0;
        const locale = currentLanguage === 'pt-br' ? 'pt-BR' : 'en-US';
        const currency = currentLanguage === 'pt-br' ? 'BRL' : 'USD';

        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    return (
        <LanguageContext.Provider value={{ t, formatCurrency, translations, regions, loading, changeLanguage, currentLanguage }}>
            {!loading && children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
