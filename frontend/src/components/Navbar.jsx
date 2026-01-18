import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../utils/databaseAuth';
import { Home, LayoutDashboard, PlusCircle, LogIn, Menu, X, Landmark, LogOut, Settings } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar = () => {
    const [user] = useAuthState(auth);
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();

    return (
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
                            <div className="relative">
                                <button
                                    onClick={() => setIsOpen(!isOpen)}
                                    className="flex items-center space-x-3 p-1.5 pr-4 rounded-full bg-white border border-slate-200 hover:border-primary-200 hover:shadow-md transition-all ease-in-out duration-300"
                                >
                                    <img
                                        src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || user.email}&background=0ea5e9&color=fff`}
                                        alt="Avatar"
                                        className="w-8 h-8 rounded-full"
                                    />
                                    <span className="text-sm font-bold text-slate-700">{user.displayName?.split(' ')[0] || 'User'}</span>
                                </button>

                                <AnimatePresence>
                                    {isOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 8, scale: 0.98 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 8, scale: 0.98 }}
                                            transition={{ duration: 0.2, ease: "easeOut" }}
                                            className="absolute right-0 mt-3 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 origin-top-right"
                                        >
                                            <div className="px-4 py-3 border-b border-slate-100 mb-2 flex items-center space-x-3">
                                                <img
                                                    src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || user.email}&background=0ea5e9&color=fff`}
                                                    alt="Avatar"
                                                    className="w-10 h-10 rounded-full"
                                                />
                                                <div className="overflow-hidden">
                                                    <p className="text-sm font-bold text-slate-800 truncate">{user.displayName || 'User'}</p>
                                                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                                                </div>
                                            </div>

                                            <Link
                                                to="/dashboard"
                                                className="flex items-center space-x-3 px-4 py-2.5 text-slate-600 hover:bg-slate-50 hover:text-primary-600 transition-colors"
                                                onClick={() => setIsOpen(false)}
                                            >
                                                <LayoutDashboard className="w-4 h-4" />
                                                <span className="font-medium">Dashboard</span>
                                            </Link>

                                            <Link
                                                to="/create-announcement"
                                                className="flex items-center space-x-3 px-4 py-2.5 text-slate-600 hover:bg-slate-50 hover:text-primary-600 transition-colors"
                                                onClick={() => setIsOpen(false)}
                                            >
                                                <PlusCircle className="w-4 h-4" />
                                                <span className="font-medium">List Property</span>
                                            </Link>

                                            <Link
                                                to="/profile"
                                                className="flex items-center space-x-3 px-4 py-2.5 text-slate-600 hover:bg-slate-50 hover:text-primary-600 transition-colors"
                                                onClick={() => setIsOpen(false)}
                                            >
                                                <Settings className="w-4 h-4" />
                                                <span className="font-medium">Profile Settings</span>
                                            </Link>

                                            <div className="h-px bg-slate-100 my-2"></div>

                                            <button
                                                onClick={() => {
                                                    auth.signOut();
                                                    setIsOpen(false);
                                                }}
                                                className="w-full flex items-center space-x-3 px-4 py-2.5 text-red-500 hover:bg-red-50 transition-colors"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                <span className="font-medium">Sign Out</span>
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
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

            {/* Mobile Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden bg-white border-t border-slate-100 px-4 py-8 space-y-6"
                    >
                        <Link to="/" className="block text-xl font-bold text-slate-800" onClick={() => setIsOpen(false)}>Home</Link>
                        {user ? (
                            <>
                                <Link to="/dashboard" className="block text-xl font-bold text-slate-800" onClick={() => setIsOpen(false)}>Dashboard</Link>
                                <Link to="/profile" className="block text-xl font-bold text-slate-800" onClick={() => setIsOpen(false)}>Profile Settings</Link>
                                <Link to="/create-announcement" className="block text-xl font-bold text-primary-600" onClick={() => setIsOpen(false)}>List Property</Link>
                                <button
                                    onClick={() => { auth.signOut(); setIsOpen(false); }}
                                    className="w-full text-left text-xl font-bold text-red-500"
                                >
                                    Sign Out
                                </button>
                            </>
                        ) : (
                            <Link to="/auth" className="block text-xl font-bold text-primary-600" onClick={() => setIsOpen(false)}>Sign In</Link>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
};

export default Navbar;

