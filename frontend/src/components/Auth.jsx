import React, { useState, useEffect } from 'react';
import { auth } from '../utils/databaseAuth';
import { loginWithGoogle } from '../utils/googleAuth';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { LogIn, Mail, Lock, User, Chrome, Apple } from 'lucide-react';
import { motion as Motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';

const Auth = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const [user] = useAuthState(auth);

    useEffect(() => {
        if (user) {
            navigate('/dashboard');
        }
    }, [user, navigate]);

    const handleGoogleLogin = async () => {
        try {
            await loginWithGoogle();
            // Navigation handled by useEffect
        } catch (err) {
            console.error('Google Login Error Details:', err);
            if (err.code === 'auth/configuration-not-found') {
                setError('Configuration Error: "Email/Password" or "Google" sign-in provider is disabled in Firebase Console.');
            } else if (err.code === 'auth/api-key-not-valid.-please-pass-a-valid-api-key.') {
                setError('Invalid API Key. Please check your .env.local file.');
            } else {
                setError(err.message);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await updateProfile(userCredential.user, { displayName: name });
            }
            // Navigation handled by useEffect
        } catch (err) {
            console.error('Auth Error Details:', err);
            if (err.code === 'auth/configuration-not-found') {
                setError('Configuration Error: "Email/Password" sign-in provider is likely disabled in Firebase Console.');
            } else {
                setError(err.message);
            }
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4">
            <Motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card w-full max-w-md p-8 rounded-2xl"
            >
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-slate-800">
                        {isLogin ? 'Welcome Back' : 'Create Account'}
                    </h2>
                    <p className="text-slate-500 mt-2">
                        {isLogin ? 'Enter your details to sign in' : 'Join our premium real estate network'}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 border border-red-100">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLogin && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all"
                                    placeholder="John Doe"
                                    required
                                />
                            </div>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all"
                                placeholder="name@example.com"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-primary-200 transition-all flex items-center justify-center space-x-2"
                    >
                        <LogIn className="w-5 h-5" />
                        <span>{isLogin ? 'Sign In' : 'Sign Up'}</span>
                    </button>
                </form>

                <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-slate-500">Or continue with</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={handleGoogleLogin}
                        className="flex items-center justify-center space-x-2 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
                    >
                        <Chrome className="w-5 h-5 text-red-500" />
                        <span className="font-medium">Google</span>
                    </Motion.button>
                    <Motion.button
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center justify-center space-x-2 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
                        onClick={() => alert("Apple Login not implemented in backend")}
                    >
                        <Apple className="w-5 h-5 text-slate-900" />
                        <span className="font-medium">Apple</span>
                    </Motion.button>
                </div>

                <p className="mt-8 text-center text-slate-600">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-primary-600 font-semibold hover:underline"
                    >
                        {isLogin ? 'Sign up' : 'Sign in'}
                    </button>
                </p>
            </Motion.div>
        </div>
    );
};

export default Auth;
