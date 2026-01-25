import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Link } from 'react-router-dom';

const Footer = () => {
    const { t } = useLanguage();

    return (
        <footer className="bg-white border-t border-slate-100 py-12 mt-20">
            <div className="max-w-7xl mx-auto px-4 text-center">
                <p className="text-slate-400 font-medium">© 2026 Vita State Manager. {t('navbar.all_rights_reserved')}</p>
                <div className="flex justify-center space-x-6 mt-4">
                    <Link to="/privacy" className="text-slate-400 hover:text-primary-600 transition-colors font-medium">{t('navbar.privacy_policy')}</Link>
                    <Link to="/terms" className="text-slate-400 hover:text-primary-600 transition-colors font-medium">{t('navbar.terms_of_service')}</Link>
                    <Link to="/cookies" className="text-slate-400 hover:text-primary-600 transition-colors font-medium">{t('navbar.cookies')}</Link>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
