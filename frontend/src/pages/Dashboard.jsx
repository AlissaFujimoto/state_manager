import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../utils/databaseAuth';
import Profile from '../components/Profile';
import { PropertyCard } from './Home';
import { Plus, LayoutGrid, List as ListIcon, Loader, Trash2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import api from '../api';

const Dashboard = () => {
    const [user] = useAuthState(auth);
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('grid'); // grid or list
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [propertyToDelete, setPropertyToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

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
                        <h2 className="text-2xl font-bold text-slate-800">Your Announcements</h2>
                        <p className="text-slate-500 text-sm mt-1">Manage and track your active property listings.</p>
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
                            <span>New Listing</span>
                        </Link>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader className="w-8 h-8 text-primary-500 animate-spin" />
                    </div>
                ) : (announcements || []).length > 0 ? (
                    <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" : "space-y-4"}>
                        {announcements.map((p) => (
                            <PropertyCard
                                key={p.id}
                                property={p}
                                showEditAction={true}
                                onDelete={handleDeleteClick}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                        <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Plus className="text-slate-400" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-700">No active listings</h3>
                        <p className="text-slate-500 mt-2">Start showcasing your properties today.</p>
                        <Link
                            to="/create-announcement"
                            className="mt-6 inline-flex items-center text-primary-600 font-bold hover:underline"
                        >
                            Create your first announcement
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
                            <h3 className="text-2xl font-black text-slate-800 mb-2">Delete listing?</h3>
                            <p className="text-slate-500 mb-8">
                                Are you sure you want to delete this listing? This action cannot be undone and the property will be removed from the ecosystem.
                            </p>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setIsDeleteModalOpen(false)}
                                    disabled={isDeleting}
                                    className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold transition-all disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteConfirm}
                                    disabled={isDeleting}
                                    className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold shadow-lg shadow-red-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isDeleting ? (
                                        <Loader className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <span>Confirm Delete</span>
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

export default Dashboard;
