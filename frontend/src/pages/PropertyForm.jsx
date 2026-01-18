import React, { useState } from 'react';
import {
    Upload, X, Plus, Info, Home, DollarSign,
    Text, List, Image as ImageIcon, Layout,
    ArrowRight, ArrowLeft, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const PropertyForm = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        id: crypto.randomUUID(),
        title: '',
        description: '',
        price: '',
        property_type: 'house',
        characteristics: {
            bedrooms: '',
            bathrooms: '',
            area: ''
        },
        images: [],
        layout_image: null
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setFormData(prev => ({
                ...prev,
                [parent]: { ...prev[parent], [child]: value }
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleImageUpload = (e) => {
        const files = Array.from(e.target.files);
        const mockUrls = files.map(f => URL.createObjectURL(f));
        setFormData(prev => ({ ...prev, images: [...prev.images, ...mockUrls] }));
    };

    const handleLayoutUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({ ...prev, layout_image: URL.createObjectURL(file) }));
        }
    };

    const removeImage = (index) => {
        setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
    };

    const nextStep = () => setStep(prev => prev + 1);
    const prevStep = () => setStep(prev => prev - 1);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/announcements', formData);
            setStep(4); // Success step
        } catch (err) {
            console.error('Failed to create announcement:', err);
            alert('Error creating listing. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-12">
            {/* Progress Bar */}
            {step < 4 && (
                <div className="mb-12">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Step {step} of 3</span>
                        <span className="text-sm font-bold text-primary-600">
                            {step === 1 ? 'Basic Information' : step === 2 ? 'Characteristics' : 'Media Assets'}
                        </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(step / 3) * 100}%` }}
                            className="h-full bg-primary-600"
                        />
                    </div>
                </div>
            )}

            <motion.div
                layout
                className="glass-card rounded-3xl p-8 md:p-12 shadow-2xl"
            >
                <form onSubmit={handleSubmit}>
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="text-center mb-8">
                                    <h2 className="text-3xl font-black text-slate-800">Basic Information</h2>
                                    <p className="text-slate-500 mt-2">Let's start with the core details of your property.</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Announcement Title</label>
                                    <input
                                        type="text"
                                        name="title"
                                        value={formData.title}
                                        onChange={handleInputChange}
                                        placeholder="e.g. Modern Villa with Sunset View"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Property Type</label>
                                        <select
                                            name="property_type"
                                            value={formData.property_type}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                                        >
                                            <option value="house">House</option>
                                            <option value="apartment">Apartment</option>
                                            <option value="villa">Villa</option>
                                            <option value="land">Land</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Price ($)</label>
                                        <input
                                            type="number"
                                            name="price"
                                            value={formData.price}
                                            onChange={handleInputChange}
                                            placeholder="500,000"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        rows="4"
                                        placeholder="Describe the property's unique features..."
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                                        required
                                    ></textarea>
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={nextStep}
                                        className="bg-primary-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 hover:bg-primary-700 transition-all"
                                    >
                                        <span>Next Step</span>
                                        <ArrowRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="text-center mb-8">
                                    <h2 className="text-3xl font-black text-slate-800">Characteristics</h2>
                                    <p className="text-slate-500 mt-2">Specify the technical specs of the property.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Bedrooms</label>
                                        <input
                                            type="number"
                                            name="characteristics.bedrooms"
                                            value={formData.characteristics.bedrooms}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Bathrooms</label>
                                        <input
                                            type="number"
                                            name="characteristics.bathrooms"
                                            value={formData.characteristics.bathrooms}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Area (m²)</label>
                                        <input
                                            type="number"
                                            name="characteristics.area"
                                            value={formData.characteristics.area}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-between mt-12">
                                    <button
                                        type="button"
                                        onClick={prevStep}
                                        className="text-slate-500 font-bold flex items-center gap-2 hover:text-slate-800 transition-all"
                                    >
                                        <ArrowLeft className="w-5 h-5" />
                                        <span>Go Back</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={nextStep}
                                        className="bg-primary-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 hover:bg-primary-700 transition-all"
                                    >
                                        <span>Next Step</span>
                                        <ArrowRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-8"
                            >
                                <div className="text-center mb-8">
                                    <h2 className="text-3xl font-black text-slate-800">Media Assets</h2>
                                    <p className="text-slate-500 mt-2">Upload high-quality images and the building layout.</p>
                                </div>

                                {/* Image Gallery Upload */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-3">Property Gallery</label>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {formData.images.map((url, idx) => (
                                            <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden group">
                                                <img src={url} className="w-full h-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => removeImage(idx)}
                                                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                        <label className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-all">
                                            <Plus className="w-8 h-8 text-slate-400" />
                                            <span className="text-xs font-bold text-slate-400 mt-2 uppercase">Add Photo</span>
                                            <input type="file" multiple onChange={handleImageUpload} className="hidden" />
                                        </label>
                                    </div>
                                </div>

                                {/* Layout Upload */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-3">Building Layout (Floor Plan)</label>
                                    {formData.layout_image ? (
                                        <div className="relative rounded-2xl overflow-hidden bg-slate-100 p-4 border border-slate-200">
                                            <img src={formData.layout_image} className="max-h-64 mx-auto rounded-xl" />
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, layout_image: null }))}
                                                className="absolute top-6 right-6 bg-red-500 text-white p-2 rounded-full shadow-lg"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="w-full h-40 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-all">
                                            <Layout className="w-10 h-10 text-slate-400" />
                                            <span className="text-sm font-bold text-slate-400 mt-2 uppercase">Upload Floor Plan</span>
                                            <input type="file" onChange={handleLayoutUpload} className="hidden" />
                                        </label>
                                    )}
                                </div>

                                <div className="flex justify-between mt-12">
                                    <button
                                        type="button"
                                        onClick={prevStep}
                                        className="text-slate-500 font-bold flex items-center gap-2 hover:text-slate-800 transition-all"
                                    >
                                        <ArrowLeft className="w-5 h-5" />
                                        <span>Go Back</span>
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="bg-primary-600 text-white px-12 py-4 rounded-2xl font-bold shadow-xl flex items-center gap-2 hover:bg-primary-700 transition-all transform hover:-translate-y-1 disabled:opacity-50"
                                    >
                                        <span>{loading ? 'Submitting...' : 'Submit Listing'}</span>
                                        <CheckCircle2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === 4 && (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-12"
                            >
                                <div className="bg-green-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8">
                                    <CheckCircle2 className="w-12 h-12 text-green-600" />
                                </div>
                                <h2 className="text-4xl font-black text-slate-800 mb-4">Listing Published!</h2>
                                <p className="text-slate-500 text-lg mb-12">Your property has been successfully announced to the Mugen ecosystem.</p>
                                <div className="flex flex-col md:flex-row gap-4 justify-center">
                                    <button
                                        onClick={() => navigate('/dashboard')}
                                        className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-bold shadow-xl hover:bg-slate-800 transition-all"
                                    >
                                        Go to Dashboard
                                    </button>
                                    <button
                                        onClick={() => navigate('/')}
                                        className="bg-primary-50 text-primary-600 px-10 py-4 rounded-2xl font-bold border border-primary-100 hover:bg-primary-100 transition-all"
                                    >
                                        View Homepage
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </form>
            </motion.div>
        </div>
    );
};

export default PropertyForm;
