import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../utils/databaseAuth';
import { Home, LayoutDashboard, PlusCircle, LogIn, Menu, X, Landmark, LogOut, Settings, User, Globe, ChevronDown, ArrowLeft } from 'lucide-react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import CompressedImage from './CompressedImage';
import { useLanguage } from '../contexts/LanguageContext';

const Navbar = () => {
    const [user] = useAuthState(auth);
    const [isOpen, setIsOpen] = useState(false);
    const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
    const langMenuRef = useRef(null);
    const { t, changeLanguage, currentLanguage } = useLanguage();
    const location = useLocation();
    const isAuthPage = location.pathname === '/auth';
    const isHomePage = location.pathname === '/';
    const shouldHideMenu = !user && (isAuthPage || isHomePage);

    // Back Button Logic
    const isPropertyPage = location.pathname.startsWith('/property/');
    const isLegalPage = ['/privacy', '/terms', '/cookies'].includes(location.pathname);
    const showBackButton = isPropertyPage || isLegalPage;

    const backLink = location.state?.from || '/';
    const isFromMyListings = location.state?.from && location.state.from.includes('my-listings');
    const backText = isLegalPage
        ? t('common.back')
        : (isFromMyListings ? t('property_details.back_to_my_listings') : t('property_details.back_to_results'));

    const languages = [
        { code: 'en-us', label: 'English (US)', short: 'EN' },
        { code: 'pt-br', label: 'Português (BR)', short: 'BR' },
        { code: 'pt-pt', label: 'Português (EU)', short: 'PT' },
        { code: 'es-es', label: 'Español (EU)', short: 'ES' },
    ];

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (langMenuRef.current && !langMenuRef.current.contains(event.target)) {
                setIsLangMenuOpen(false);
            }
        };

        if (isLangMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isLangMenuOpen]);

    return (
        <>
            <nav className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 md:px-8">
                    <div className="flex justify-between items-center h-20">
                        <div className="flex items-center gap-4">
                            {showBackButton && (
                                <Link
                                    to={backLink}
                                    className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-primary-600 hover:bg-slate-50 transition-all group/back"
                                    title={backText}
                                >
                                    <div className="flex items-center gap-1">
                                        <ArrowLeft className="w-5 h-5 group-hover/back:-translate-x-1 transition-transform" />
                                        <span className="font-bold text-sm hidden sm:block">{t('common.back')}</span>
                                    </div>
                                </Link>
                            )}
                            <Link to="/" className="flex items-center space-x-2 group">
                                <div className="bg-primary-600 p-2 rounded-xl group-hover:rotate-12 transition-transform shadow-lg shadow-primary-200">
                                    <Landmark className="text-white w-6 h-6" />
                                </div>
                                <span className="text-2xl font-black text-slate-800 tracking-tighter uppercase italic">Vita<span className="text-primary-600 not-italic">State</span></span>
                            </Link>
                        </div>

                        {/* Unified Menu Button and Language Switcher */}
                        <div className="flex items-center space-x-2 md:space-x-4">
                            {/* Language Dropdown */}
                            <div className="relative" ref={langMenuRef}>
                                <button
                                    onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${isLangMenuOpen ? 'bg-slate-200 text-slate-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                >
                                    <Globe className="w-4 h-4" />
                                    <span className="text-sm font-bold">{languages.find(l => l.code === currentLanguage)?.short || 'EN'}</span>
                                    <ChevronDown className={`w-3 h-3 transition-transform ${isLangMenuOpen ? 'rotate-180' : ''}`} />
                                </button>

                                <AnimatePresence>
                                    {isLangMenuOpen && (
                                        <Motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            transition={{ duration: 0.1 }}
                                            className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden py-1 z-50 origin-top-right ring-1 ring-black/5"
                                        >
                                            {languages.map(lang => (
                                                <button
                                                    key={lang.code}
                                                    onClick={() => {
                                                        changeLanguage(lang.code);
                                                        setIsLangMenuOpen(false);
                                                    }}
                                                    className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors flex items-center justify-between group ${currentLanguage === lang.code ? 'text-primary-600 bg-primary-50' : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'}`}
                                                >
                                                    <span className="relative z-10">{lang.label}</span>
                                                    {currentLanguage === lang.code && (
                                                        <Motion.div
                                                            layoutId="activeLang"
                                                            className="w-1.5 h-1.5 rounded-full bg-primary-600"
                                                        />
                                                    )}
                                                </button>
                                            ))}
                                        </Motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {!user && (
                                <Link
                                    to="/auth"
                                    className={`flex bg-slate-900 text-white p-2.5 md:px-8 md:py-2.5 rounded-xl font-bold shadow-xl hover:bg-slate-800 transition-all items-center space-x-2 ${isOpen ? 'md:opacity-0 md:pointer-events-none' : 'opacity-100'}`}
                                >
                                    <LogIn className="w-5 h-5" />
                                    <span className="hidden md:inline">{t('navbar.login')}</span>
                                </Link>
                            )}
                            {user && (
                                <button
                                    className="p-2 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                                    onClick={() => setIsOpen(!isOpen)}
                                    aria-label="Toggle menu"
                                >
                                    {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                                </button>
                            )}
                        </div>


                    </div>
                </div>
            </nav >

            {/* Mobile Menu Overlay */}
            < AnimatePresence >
                {isOpen && (
                    <div className="md:hidden">
                        {/* Backdrop with Blur */}
                        <Motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[40]"
                            onClick={() => setIsOpen(false)}
                            style={{ top: '80px' }} // Starts below the navbar
                        />

                        {/* Menu Content */}
                        <Motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="fixed top-20 left-0 right-0 bg-white border-b border-slate-100 px-4 py-8 space-y-6 z-[50] shadow-xl overflow-hidden"
                        >

                            {user ? (
                                <>
                                    <Link to="/profile" className="mobile-nav-link" onClick={() => setIsOpen(false)}>
                                        <Settings className="w-6 h-6" />
                                        <span>{t('navbar.profile')}</span>
                                    </Link>
                                    <Link to="/my-listings" className="mobile-nav-link" onClick={() => setIsOpen(false)}>
                                        <LayoutDashboard className="w-6 h-6" />
                                        <span>{t('navbar.my_listings')}</span>
                                    </Link>
                                    <Link to="/create-announcement" className="mobile-nav-link primary" onClick={() => setIsOpen(false)}>
                                        <PlusCircle className="w-6 h-6" />
                                        <span>{t('navbar.list_property')}</span>
                                    </Link>

                                    <div className="border-t border-slate-100 pt-6 mt-6">
                                        <button
                                            onClick={() => { auth.signOut(); setIsOpen(false); }}
                                            className="w-full flex items-center space-x-3 text-left text-xl font-bold text-red-500"
                                        >
                                            <LogOut className="w-6 h-6" />
                                            <span>{t('navbar.logout')}</span>
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <Link to="/auth" className="mobile-nav-link text-primary-600" onClick={() => setIsOpen(false)}>
                                    <LogIn className="w-6 h-6" />
                                    <span>{t('navbar.login')}</span>
                                </Link>
                            )}
                        </Motion.div>
                    </div>
                )
                }
            </AnimatePresence >

            {/* Desktop Side Drawer */}
            < div className="hidden md:block" >
                <AnimatePresence>
                    {isOpen && user && (
                        <>
                            {/* Backdrop */}
                            <Motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
                                onClick={() => setIsOpen(false)}
                            />

                            {/* Side Panel */}
                            <Motion.div
                                initial={{ x: '100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '100%' }}
                                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                className="fixed top-0 right-0 h-full w-80 bg-white/95 backdrop-blur-xl shadow-2xl z-[70] border-l border-white/20"
                            >
                                <div className="flex flex-col h-full p-6">
                                    <div className="flex justify-between items-center mb-8">
                                        <span className="text-xl font-bold text-slate-800">{t('navbar.menu')}</span>
                                        <button
                                            onClick={() => setIsOpen(false)}
                                            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                                        >
                                            <X className="w-5 h-5 text-slate-500" />
                                        </button>
                                    </div>

                                    <div className="p-4 bg-slate-50 rounded-2xl mb-8 flex items-center space-x-4">
                                        <CompressedImage
                                            src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || user.email}&background=0ea5e9&color=fff`}
                                            alt="Avatar"
                                            className="w-12 h-12 rounded-full border-2 border-white shadow-sm"
                                        />
                                        <div className="overflow-hidden">
                                            <p className="text-sm font-bold text-slate-800 truncate">{user.displayName || 'User'}</p>
                                            <p className="text-xs text-slate-500 truncate">{user.email}</p>
                                        </div>
                                    </div>

                                    <div className="flex-1 space-y-2">
                                        <Link
                                            to="/profile"
                                            className="drawer-nav-link"
                                            onClick={() => setIsOpen(false)}
                                        >
                                            <Settings className="w-5 h-5" />
                                            <span>{t('navbar.profile')}</span>
                                        </Link>

                                        <Link
                                            to="/my-listings"
                                            className="drawer-nav-link"
                                            onClick={() => setIsOpen(false)}
                                        >
                                            <LayoutDashboard className="w-5 h-5" />
                                            <span>{t('navbar.my_listings')}</span>
                                        </Link>

                                        <Link
                                            to="/create-announcement"
                                            className="drawer-nav-link primary"
                                            onClick={() => setIsOpen(false)}
                                        >
                                            <PlusCircle className="w-5 h-5" />
                                            <span>{t('navbar.list_property')}</span>
                                        </Link>
                                    </div>

                                    <div className="pt-6 border-t border-slate-100">
                                        <button
                                            onClick={() => {
                                                auth.signOut();
                                                setIsOpen(false);
                                            }}
                                            className="w-full flex items-center space-x-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors font-medium"
                                        >
                                            <LogOut className="w-5 h-5" />
                                            <span>{t('navbar.logout')}</span>
                                        </button>
                                    </div>
                                </div>
                            </Motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div >
        </>
    );
};

export default Navbar;
