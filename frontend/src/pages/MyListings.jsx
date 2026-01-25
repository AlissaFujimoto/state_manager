import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../utils/databaseAuth';
import Profile from '../components/Profile';
import { PropertyCard } from './Home';
import {
    Plus, LayoutGrid, List as ListIcon, Loader, Trash2, AlertCircle,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import api from '../api';
import { useLanguage } from '../contexts/LanguageContext';
import PropertyCardSkeleton from '../components/PropertyCardSkeleton';

const MyListings = () => {
    const { t } = useLanguage();
    const [user] = useAuthState(auth);
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('grid'); // grid or list
    const [currentPage, setCurrentPage] = useState(1);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [propertyToDelete, setPropertyToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [propertyStatuses, setPropertyStatuses] = useState([]);

    const ITEMS_PER_PAGE = isMobile ? 6 : 9;

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const totalPages = Math.ceil(announcements.length / ITEMS_PER_PAGE);

    useEffect(() => {
        if (user) {
            const fetchUserAnnouncements = async () => {
                try {
                    const res = await api.get('/user/announcements');
                    setAnnouncements(res.data);
                    setLoading(false);
                } catch (err) {
                    console.error('Failed to fetch user announcements:', err);
                    setLoading(false);
                }
            };
            fetchUserAnnouncements();
        }
    }, [user]);

    useEffect(() => {
        const fetchStatuses = async () => {
            try {
                const res = await api.get('/statuses');
                setPropertyStatuses(res.data);
            } catch (err) {
                console.error('Failed to fetch statuses:', err);
            }
        };
        fetchStatuses();
    }, []);

    const handleDeleteClick = (id) => {
        setPropertyToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!propertyToDelete) return;
        setIsDeleting(true);
        try {
            await api.delete(`/announcements/${propertyToDelete}`);
            setAnnouncements(announcements.filter(p => p.id !== propertyToDelete));
            setIsDeleteModalOpen(false);
            setPropertyToDelete(null);
        } catch (err) {
            console.error('Failed to delete announcement:', err);
            alert('Error deleting listing. Please try again.');
        } finally {
            setIsDeleting(false);
        }
    };

    if (!user) return null;

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <Profile user={user} />

            <div className="mt-12">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">{t('my_listings.title')}</h2>
                        <p className="text-slate-500 text-sm mt-1">{t('my_listings.subtitle')}</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="bg-white border border-slate-200 rounded-xl p-1 flex">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-slate-100 text-primary-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <LayoutGrid className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-slate-100 text-primary-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <ListIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <Link
                            to="/create-announcement"
                            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-primary-200 transition-all flex items-center space-x-2"
                        >
                            <Plus className="w-5 h-5" />
                            <span>{t('my_listings.new_listing')}</span>
                        </Link>
                    </div>
                </div>

                {loading ? (
                    <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" : "space-y-4"}>
                        {[...Array(ITEMS_PER_PAGE)].map((_, i) => (
                            <PropertyCardSkeleton key={`skeleton-${i}`} />
                        ))}
                    </div>
                ) : (announcements || []).length > 0 ? (
                    <>
                        <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" : "space-y-4"}>
                            {announcements.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((p) => (
                                <PropertyCard
                                    key={p.id}
                                    property={p}
                                    propertyStatuses={propertyStatuses}
                                />
                            ))}
                        </div>

                        {/* Pagination Controls */}
                        {announcements.length > ITEMS_PER_PAGE && (
                            <div className="flex justify-center items-center mt-12 gap-2 md:gap-4">
                                <button
                                    onClick={() => {
                                        setCurrentPage(prev => Math.max(1, prev - 1));
                                    }}
                                    disabled={currentPage === 1}
                                    className="pagination-btn"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>

                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.ceil(announcements.length / ITEMS_PER_PAGE) }, (_, i) => i + 1).map(page => (
                                        <button
                                            key={page}
                                            onClick={() => {
                                                setCurrentPage(page);
                                            }}
                                            className={`pagination-number ${currentPage === page ? 'active' : 'inactive'}`}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={() => {
                                        setCurrentPage(prev => Math.min(Math.ceil(announcements.length / ITEMS_PER_PAGE), prev + 1));
                                    }}
                                    disabled={currentPage === Math.ceil(announcements.length / ITEMS_PER_PAGE)}
                                    className="pagination-btn"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                        <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Plus className="text-slate-400" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-700">{t('my_listings.no_active_listings')}</h3>
                        <p className="text-slate-500 mt-2">{t('my_listings.start_showcasing')}</p>
                        <Link
                            to="/create-announcement"
                            className="mt-6 inline-flex items-center text-primary-600 font-bold hover:underline"
                        >
                            {t('my_listings.create_first')}
                        </Link>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {isDeleteModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !isDeleting && setIsDeleteModalOpen(false)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl overflow-hidden"
                        >
                            <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                                <Trash2 className="w-8 h-8 text-red-600" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 mb-2">{t('my_listings.delete_confirm_title')}</h3>
                            <p className="text-slate-500 mb-8">
                                {t('my_listings.delete_confirm_text')}
                            </p>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setIsDeleteModalOpen(false)}
                                    disabled={isDeleting}
                                    className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold transition-all disabled:opacity-50"
                                >
                                    {t('my_listings.cancel')}
                                </button>
                                <button
                                    onClick={handleDeleteConfirm}
                                    disabled={isDeleting}
                                    className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold shadow-lg shadow-red-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isDeleting ? (
                                        <Loader className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <span>{t('my_listings.confirm_delete')}</span>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MyListings;
