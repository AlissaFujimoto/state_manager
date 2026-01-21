import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../utils/databaseAuth';
import { Home, LayoutDashboard, PlusCircle, LogIn, Menu, X, Landmark, LogOut, Settings, User } from 'lucide-react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

const Navbar = () => {
    const [user] = useAuthState(auth);
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <nav className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 md:px-8">
                    <div className="flex justify-between items-center h-20">
                        <Link to="/" className="flex items-center space-x-2 group">
                            <div className="bg-primary-600 p-2 rounded-xl group-hover:rotate-12 transition-transform shadow-lg shadow-primary-200">
                                <Landmark className="text-white w-6 h-6" />
                            </div>
                            <span className="text-2xl font-black text-slate-800 tracking-tighter uppercase italic">Mugen<span className="text-primary-600 not-italic">State</span></span>
                        </Link>

                        {/* Desktop Menu */}
                        <div className="hidden md:flex items-center space-x-8">
                            <Link to="/" className="text-slate-600 hover:text-primary-600 font-bold transition-colors">Home</Link>
                            {user ? (
                                <button
                                    onClick={() => setIsOpen(!isOpen)}
                                    className="flex items-center space-x-3 p-1.5 pr-4 rounded-full bg-white border border-slate-200 hover:border-primary-200 hover:shadow-md transition-all ease-in-out duration-300"
                                >
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                                        <User className="w-5 h-5 text-slate-600" />
                                    </div>
                                    <span className="text-sm font-bold text-slate-700">{user.displayName?.split(' ')[0] || 'User'}</span>
                                </button>
                            ) : (
                                <Link
                                    to="/auth"
                                    className="bg-slate-900 text-white px-8 py-2.5 rounded-xl font-bold shadow-xl hover:bg-slate-800 transition-all flex items-center space-x-2"
                                >
                                    <LogIn className="w-5 h-5" />
                                    <span>Sign In</span>
                                </Link>
                            )}
                        </div>

                        {/* Mobile Menu Button */}
                        <button className="md:hidden p-2 text-slate-600" onClick={() => setIsOpen(!isOpen)}>
                            {isOpen ? <X /> : <Menu />}
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
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
                            <Link to="/" className="mobile-nav-link" onClick={() => setIsOpen(false)}>
                                <Home className="w-6 h-6" />
                                <span>Home</span>
                            </Link>
                            {user ? (
                                <>
                                    <Link to="/profile" className="mobile-nav-link" onClick={() => setIsOpen(false)}>
                                        <Settings className="w-6 h-6" />
                                        <span>Profile Settings</span>
                                    </Link>
                                    <Link to="/dashboard" className="mobile-nav-link" onClick={() => setIsOpen(false)}>
                                        <LayoutDashboard className="w-6 h-6" />
                                        <span>Dashboard</span>
                                    </Link>
                                    <Link to="/create-announcement" className="mobile-nav-link primary" onClick={() => setIsOpen(false)}>
                                        <PlusCircle className="w-6 h-6" />
                                        <span>List Property</span>
                                    </Link>

                                    <div className="border-t border-slate-100 pt-6 mt-6">
                                        <button
                                            onClick={() => { auth.signOut(); setIsOpen(false); }}
                                            className="w-full flex items-center space-x-3 text-left text-xl font-bold text-red-500"
                                        >
                                            <LogOut className="w-6 h-6" />
                                            <span>Sign Out</span>
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <Link to="/auth" className="mobile-nav-link text-primary-600" onClick={() => setIsOpen(false)}>
                                    <LogIn className="w-6 h-6" />
                                    <span>Sign In</span>
                                </Link>
                            )}
                        </Motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Desktop Side Drawer */}
            <div className="hidden md:block">
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
                                        <span className="text-xl font-bold text-slate-800">Menu</span>
                                        <button
                                            onClick={() => setIsOpen(false)}
                                            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                                        >
                                            <X className="w-5 h-5 text-slate-500" />
                                        </button>
                                    </div>

                                    <div className="p-4 bg-slate-50 rounded-2xl mb-8 flex items-center space-x-4">
                                        <img
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
                                            <span>Profile Settings</span>
                                        </Link>

                                        <Link
                                            to="/dashboard"
                                            className="drawer-nav-link"
                                            onClick={() => setIsOpen(false)}
                                        >
                                            <LayoutDashboard className="w-5 h-5" />
                                            <span>Dashboard</span>
                                        </Link>

                                        <Link
                                            to="/create-announcement"
                                            className="drawer-nav-link primary"
                                            onClick={() => setIsOpen(false)}
                                        >
                                            <PlusCircle className="w-5 h-5" />
                                            <span>List Property</span>
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
                                            <span>Sign Out</span>
                                        </button>
                                    </div>
                                </div>
                            </Motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>
        </>
    );
};

export default Navbar;
