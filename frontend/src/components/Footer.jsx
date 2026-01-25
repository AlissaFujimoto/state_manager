import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Link } from 'react-router-dom';

const Footer = () => {
    const { t } = useLanguage();

    return (
        <footer className="bg-white border-t border-slate-100 py-12 mt-20">
            <div className="max-w-7xl mx-auto px-6 md:px-8">
                <div className="flex flex-col items-center">
                    <p className="text-slate-400 font-medium text-sm md:text-base mb-6">
                        © 2026 Vita State Manager. {t('navbar.all_rights_reserved')}
                    </p>
                    <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4 py-4 border-t border-slate-50 w-full max-w-2xl">
                        <Link to="/privacy" className="text-slate-400 hover:text-primary-600 transition-colors font-semibold text-sm uppercase tracking-wider">{t('navbar.privacy_policy')}</Link>
                        <Link to="/terms" className="text-slate-400 hover:text-primary-600 transition-colors font-semibold text-sm uppercase tracking-wider">{t('navbar.terms_of_service')}</Link>
                        <Link to="/cookies" className="text-slate-400 hover:text-primary-600 transition-colors font-semibold text-sm uppercase tracking-wider">{t('navbar.cookies')}</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
