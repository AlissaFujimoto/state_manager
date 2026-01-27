import React, { useState, useEffect } from 'react';
import { getImageDisplayUrl } from '../utils/imageCompression';
import { auth } from '../utils/databaseAuth';

/**
 * Image component that automatically handles compressed images
 * Decompresses gzipped base64 images or displays regular URLs
 */
const CompressedImage = ({ src, alt = '', className = '', onError, style, ...props }) => {
    const [displayUrl, setDisplayUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const loadImage = async () => {
            if (!src) {
                setDisplayUrl(null);
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(false);

            try {
                // Check if it's a profile reference that needs to be fetched
                if (src.startsWith('profile:')) {
                    const uid = src.split(':')[1];
                    const user = auth.currentUser;
                    if (user) {
                        const token = await user.getIdToken();
                        const apiBase = import.meta.env.API_BASE_URL || 'http://localhost:5000/api';
                        const response = await fetch(`${apiBase}/user/profile-photo/${uid}`, {
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        });

                        if (response.ok) {
                            const data = await response.json();
                            // Now decompress the fetched photo data
                            const url = getImageDisplayUrl(data.photoData);
                            setDisplayUrl(url);
                        } else {
                            setError(true);
                        }
                    } else {
                        setError(true);
                    }
                } else {
                    // Regular compressed image or URL
                    const url = getImageDisplayUrl(src);
                    if (url) {
                        setDisplayUrl(url);
                    } else {
                        // Fallback: If decompression fails or it returns null,
                        // it might be a valid URL that isCompressedImage() misdiagnosed (e.g. relative path).
                        // Try displaying it as-is.
                        console.warn('getImageDisplayUrl returned null, falling back to original src:', src);
                        setDisplayUrl(src);
                    }
                }
            } catch (err) {
                console.error('Failed to process image:', err);
                setError(true);
                if (onError) onError(err);
            } finally {
                setLoading(false);
            }
        };

        loadImage();
    }, [src, onError]);

    if (loading) {
        return (
            <div className={`bg-slate-100 flex items-center justify-center ${className}`} style={style}>
                <div className="w-8 h-8 border-4 border-slate-300 border-t-primary-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error || !displayUrl) {
        return (
            <div className={`bg-slate-100 flex items-center justify-center ${className}`} style={style}>
                <span className="text-slate-400 text-sm">Image unavailable</span>
            </div>
        );
    }

    return (
        <img
            src={displayUrl}
            alt={alt}
            className={className}
            style={style}
            onError={(e) => {
                console.error('Image load error:', e);
                setError(true);
                if (onError) onError(e);
            }}
            {...props}
        />
    );
};

export default CompressedImage;
