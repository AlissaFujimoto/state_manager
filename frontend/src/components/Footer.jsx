import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const Footer = () => {
    const { t } = useLanguage();

    return (
        <footer className="bg-white border-t border-slate-100 py-12 mt-20">
            <div className="max-w-7xl mx-auto px-4 text-center">
                <p className="text-slate-400 font-medium">© 2026 Vita State Manager. {t('navbar.all_rights_reserved')}</p>
                <div className="flex justify-center space-x-6 mt-4">
                    <a href="#" className="text-slate-300 hover:text-primary-500 transition-colors">{t('navbar.privacy_policy')}</a>
                    <a href="#" className="text-slate-300 hover:text-primary-500 transition-colors">{t('navbar.terms_of_service')}</a>
                    <a href="#" className="text-slate-300 hover:text-primary-500 transition-colors">{t('navbar.cookies')}</a>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
