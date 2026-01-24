import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Shield, LogOut, Settings } from 'lucide-react';
import { auth } from '../utils/databaseAuth';
import CompressedImage from './CompressedImage';

const Profile = ({ user }) => {
    const navigate = useNavigate();
    if (!user) return null;

    return (
        <div className="glass-card rounded-2xl p-6 mb-8 overflow-hidden relative">
            {/* Background design element */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>

            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                <div className="relative">
                    {user.photoURL ? (
                        <CompressedImage
                            src={user.photoURL}
                            alt={user.displayName}
                            className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-lg"
                        />
                    ) : (
                        <div className="w-24 h-24 rounded-2xl bg-primary-100 flex items-center justify-center border-4 border-white shadow-lg">
                            <User className="w-12 h-12 text-primary-600" />
                        </div>
                    )}
                    <div className="absolute -bottom-2 -right-2 bg-green-500 w-6 h-6 rounded-full border-4 border-white"></div>
                </div>

                <div className="flex-1 text-center md:text-left">
                    <h3 className="text-2xl font-bold text-slate-800">{user.displayName || 'Anonymous User'}</h3>
                    <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-2">
                        <div className="flex items-center text-slate-500 text-sm">
                            <Mail className="w-4 h-4 mr-1.5" />
                            {user.email}
                        </div>
                        <div className="flex items-center text-slate-500 text-sm">
                            <Shield className="w-4 h-4 mr-1.5" />
                            ID: {user.uid.slice(0, 8)}...
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-2">
                        <span className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-semibold border border-primary-100 uppercase tracking-wider">
                            Verified Owner
                        </span>
                        <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold border border-slate-200 uppercase tracking-wider">
                            Premium Member
                        </span>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-3">
                    <Link
                        to="/profile"
                        className="flex items-center space-x-2 px-4 py-2 bg-slate-100 rounded-xl text-slate-700 hover:bg-slate-200 transition-all font-medium border border-slate-200"
                    >
                        <Settings className="w-4 h-4" />
                        <span>Profile Settings</span>
                    </Link>
                    <button
                        onClick={() => auth.signOut()}
                        className="flex items-center space-x-2 px-4 py-2 border border-slate-200 rounded-xl text-red-500 hover:bg-red-50 transition-all font-medium"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Profile;
