import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../utils/databaseAuth';
import Profile from '../components/Profile';
import { PropertyCard } from './Home';
import { Plus, LayoutGrid, List as ListIcon, Loader } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api';

const Dashboard = () => {
    const [user] = useAuthState(auth);
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('grid'); // grid or list

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
                            <PropertyCard key={p.id} property={p} />
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
        </div>
    );
};

export default Dashboard;
