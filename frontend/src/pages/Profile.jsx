import React, { useState, useEffect, useRef } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../utils/databaseAuth';
import { updateProfile, updatePassword } from 'firebase/auth';
import { User, Lock, Camera, Save, AlertCircle, CheckCircle, Upload } from 'lucide-react';
import { motion as Motion } from 'framer-motion';
import ImageEditor from '../components/ImageEditor';

const Profile = () => {
    const [user, loading] = useAuthState(auth);
    const [displayName, setDisplayName] = useState('');
    const [photoURL, setPhotoURL] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [message, setMessage] = useState({ type: '', text: '' });
    const [isSaving, setIsSaving] = useState(false);

    // Image Upload State
    const [imageSrc, setImageSrc] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (user) {
            setDisplayName(user.displayName || '');
            setPhotoURL(user.photoURL || '');
        }
    }, [user]);

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage({ type: '', text: '' });

        try {
            await updateProfile(user, {
                displayName,
                photoURL
            });
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        if (!newPassword) return;

        setIsSaving(true);
        setMessage({ type: '', text: '' });

        try {
            await updatePassword(user, newPassword);
            setMessage({ type: 'success', text: 'Password updated successfully!' });
            setNewPassword('');
        } catch (error) {
            // Re-authentication might be needed for sensitive operations
            if (error.code === 'auth/requires-recent-login') {
                setMessage({ type: 'error', text: 'Please sign out and sign in again to change your password.' });
            } else {
                setMessage({ type: 'error', text: error.message });
            }
        } finally {
            setIsSaving(false);
        }
    };

    const onFileChange = async (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.addEventListener('load', () => setImageSrc(reader.result));
            reader.readAsDataURL(file);
        }
    };

    const handleEditorSave = async (blob) => {
        setImageSrc(null); // Close editor
        setIsUploading(true);
        setMessage({ type: '', text: '' });

        try {
            if (!user) throw new Error('User not authenticated');

            const token = await user.getIdToken();
            const formData = new FormData();
            formData.append('file', blob, 'profile.jpg');

            const response = await fetch('/api/user/profile-image', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Upload failed');
            }

            const data = await response.json();
            const downloadURL = data.url;

            setPhotoURL(downloadURL);

            // Update profile with the new URL immediately
            await updateProfile(user, { photoURL: downloadURL });

            setMessage({ type: 'success', text: 'Image uploaded successfully!' });
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: `Failed to upload image: ${error.message}` });
        } finally {
            setIsUploading(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <Motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid gap-8"
            >
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
                    <h1 className="text-3xl font-bold text-slate-800 mb-2">Profile Settings</h1>
                    <p className="text-slate-500">Manage your account preferences and details</p>
                </div>

                {message.text && (
                    <Motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className={`p-4 rounded-xl flex items-center space-x-3 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
                            }`}
                    >
                        {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        <span className="font-medium">{message.text}</span>
                    </Motion.div>
                )}

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Public Profile Form */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 h-fit">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="bg-primary-50 p-3 rounded-full">
                                <User className="w-6 h-6 text-primary-600" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-800">Public Profile</h2>
                        </div>

                        <form onSubmit={handleUpdateProfile} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Display Name</label>
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                                    placeholder="Your Name"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Profile Picture</label>
                                <div className="flex items-center gap-4">
                                    <div className="relative group cursor-pointer w-20 h-20" onClick={() => fileInputRef.current?.click()}>
                                        {photoURL ? (
                                            <img src={photoURL} alt="Profile" className="w-full h-full rounded-2xl object-cover border-2 border-slate-200 shadow-sm" />
                                        ) : (
                                            <div className="w-full h-full rounded-2xl bg-slate-100 flex items-center justify-center border-2 border-slate-200 border-dashed">
                                                <Camera className="w-8 h-8 text-slate-400" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                            <Upload className="w-6 h-6 text-white" />
                                        </div>
                                    </div>

                                    <div className="flex-1">
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={onFileChange}
                                            onClick={(e) => (e.target.value = null)}
                                            accept="image/*"
                                            className="hidden"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isUploading}
                                            className="px-4 py-2 bg-slate-100 text-slate-600 font-semibold rounded-lg text-sm hover:bg-slate-200 transition-all disabled:opacity-50"
                                        >
                                            {isUploading ? 'Uploading...' : 'Change Photo'}
                                        </button>
                                        <p className="text-xs text-slate-400 mt-2">Recommended: Square JPG, max 2MB.</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSaving || isUploading}
                                className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center space-x-2 shadow-lg shadow-slate-200"
                            >
                                {isSaving ? (
                                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <Save className="w-5 h-5" />
                                        <span>Save Changes</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Security Form */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 h-fit">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="bg-orange-50 p-3 rounded-full">
                                <Lock className="w-6 h-6 text-orange-600" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-800">Security</h2>
                        </div>

                        <form onSubmit={handleUpdatePassword} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">New Password</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                                    placeholder="Min. 6 characters"
                                    minLength={6}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={!newPassword || isSaving}
                                className="w-full bg-white border-2 border-slate-200 text-slate-700 font-bold py-3 rounded-xl hover:border-slate-800 hover:text-slate-900 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving ? (
                                    <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <Save className="w-5 h-5" />
                                        <span>Update Password</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </Motion.div>

            {imageSrc && (
                <ImageEditor
                    imageSrc={imageSrc}
                    onCancel={() => setImageSrc(null)}
                    onSave={handleEditorSave}
                />
            )}
        </div>
    );
};

export default Profile;
