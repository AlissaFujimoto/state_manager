import React from 'react';

const PropertyPriceFields = ({ data, onChange, getFieldStatus, errors, t, isEditMode = false }) => {
    // If not in edit mode (PropertyDetails Edit Mode OR PropertyForm wizard) but we want to reuse logic?
    // Actually, this component is intended effectively for "Input Mode".

    // We need to handle safely the values.
    // data is like formData or editData.

    const currency = data.currency || 'BRL';
    const type = data.listing_type;

    return (
        <div className={`space-y-4 ${isEditMode ? 'flex flex-col items-end' : ''}`}> {/* Alignment helper for specific layouts */}

            {/* Currency Selector - In PropertyDetails it was right aligned, in Form it was full width or grid */}
            {/* We will try to make it flexible or structured generally */}

            <div className={`flex ${isEditMode ? 'items-center gap-2' : 'flex-col gap-1.5'}`}>
                <label className={`${isEditMode ? 'text-xs font-bold text-slate-400 uppercase' : 'block text-sm font-bold text-slate-700'}`}>
                    {t('common.currency') || 'Currency'}
                </label>
                <select
                    name="currency"
                    value={currency}
                    onChange={onChange}
                    className={isEditMode
                        ? "text-xl font-bold text-primary-600 bg-transparent border-b-2 border-primary-500 outline-none p-1 cursor-pointer"
                        : "w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                    }
                >
                    {Object.entries(t('common.currencies') || {}).map(([code, label]) => (
                        <option key={code} value={code} className="text-slate-800 text-sm font-bold">{isEditMode ? code : label}</option>
                    ))}
                </select>
            </div>

            {/* Sale Price */}
            {(type === 'sale' || type === 'both' || type === 'sale_rent') && (
                <div className={isEditMode ? "flex flex-col items-end" : "field-container"}>
                    {isEditMode ? (
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-400 uppercase">{t('common.sale')}</span>
                            <input
                                type="number"
                                name="sale_price"
                                value={(data.sale_price !== undefined && data.sale_price !== null) ? data.sale_price : ''}
                                onChange={onChange}
                                placeholder=""
                                className={`text-3xl font-black text-primary-600 border-b-2 bg-transparent outline-none w-48 text-right transition-all ${getFieldStatus('sale_price') || (errors?.sale_price ? 'border-red-500' : 'border-primary-500')}`}
                            />
                        </div>
                    ) : (
                        <>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('common.sale_price')}</label>
                            <input
                                type="number"
                                name="sale_price"
                                value={(data.sale_price !== undefined && data.sale_price !== null) ? data.sale_price : ''}
                                onChange={onChange}
                                placeholder=""
                                className={`w-full px-3 py-2.5 text-sm bg-slate-50 border rounded-xl focus:ring-2 focus:ring-primary-500 transition-all outline-none ${getFieldStatus('sale_price') === 'error' ? 'neon-error' : getFieldStatus('sale_price') === 'warning' ? 'neon-warning' : 'border-slate-200'}`}
                            />
                        </>
                    )}
                    {errors?.sale_price && <p className={`text-red-500 text-xs font-bold ${isEditMode ? 'mt-1' : 'mt-1'}`}>{errors.sale_price}</p>}
                </div>
            )}

            {/* Rent Price */}
            {(type === 'rent' || type === 'both' || type === 'sale_rent') && (
                <div className={isEditMode ? "flex flex-col items-end" : "field-container"}>
                    {isEditMode ? (
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-400 uppercase">{t('common.rent')}</span>
                            <input
                                type="number"
                                name="rent_price"
                                value={(data.rent_price !== undefined && data.rent_price !== null) ? data.rent_price : ''}
                                onChange={onChange}
                                placeholder=""
                                className={`text-3xl font-black text-primary-600 border-b-2 bg-transparent outline-none w-48 text-right transition-all ${getFieldStatus('rent_price') || (errors?.rent_price ? 'border-red-500' : 'border-primary-500')}`}
                            />
                        </div>
                    ) : (
                        <>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('common.rent_price')}</label>
                            <input
                                type="number"
                                name="rent_price"
                                value={(data.rent_price !== undefined && data.rent_price !== null) ? data.rent_price : ''}
                                onChange={onChange}
                                placeholder=""
                                className={`w-full px-3 py-2.5 text-sm bg-slate-50 border rounded-xl focus:ring-2 focus:ring-primary-500 transition-all outline-none ${getFieldStatus('rent_price') === 'error' ? 'neon-error' : getFieldStatus('rent_price') === 'warning' ? 'neon-warning' : 'border-slate-200'}`}
                            />
                        </>
                    )}
                    {errors?.rent_price && <p className={`text-red-500 text-xs font-bold ${isEditMode ? 'mt-1' : 'mt-1'}`}>{errors.rent_price}</p>}

                    {/* Rent Period Selector */}
                    <div className={`mt-1 flex items-center gap-2 ${isEditMode ? 'justify-end' : ''}`}>
                        <span className="text-[10px] font-bold text-slate-400 uppercase leading-none">{t('common.period') || 'Period'}</span>
                        <select
                            name="rent_period"
                            value={data.rent_period || 'month'}
                            onChange={onChange}
                            className="text-xs font-bold text-primary-600 bg-transparent border-b border-primary-200 outline-none cursor-pointer"
                        >
                            {['day', 'week', 'month', 'year'].map(p => (
                                <option key={p} value={p}>{t(`common.periods.${p}`)}</option>
                            ))}
                        </select>
                    </div>

                    {/* Additional Rent Fees (Condo & Annual) */}
                    {(data.rent_period === 'month' || data.rent_period === 'year') && (
                        <div className={`mt-4 space-y-3 ${isEditMode ? 'w-full max-w-xs' : ''}`}>
                            <div className={`flex ${isEditMode ? 'items-center justify-end gap-2 text-right' : 'flex-col gap-1'}`}>
                                <label className={`text-[10px] font-bold text-slate-400 uppercase leading-none`}>{t('common.condo_fee')}</label>
                                <input
                                    type="number"
                                    name="condo_fee"
                                    value={(data.condo_fee !== undefined && data.condo_fee !== null) ? data.condo_fee : ''}
                                    onChange={onChange}
                                    placeholder="0"
                                    className={isEditMode
                                        ? "text-sm font-bold text-slate-600 bg-transparent border-b border-slate-200 outline-none w-24 text-right"
                                        : "w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-primary-500"
                                    }
                                />
                            </div>

                            <div className={`flex ${isEditMode ? 'items-center justify-end gap-2 text-right' : 'flex-col gap-1'}`}>
                                <div className="flex items-center gap-1">
                                    <select
                                        name="annual_fee_label"
                                        value={data.annual_fee_label || 'iptu'}
                                        onChange={onChange}
                                        className="text-[10px] font-bold text-slate-400 uppercase bg-transparent outline-none cursor-pointer border-b border-transparent hover:border-slate-300"
                                    >
                                        {Object.entries(t('common.annual_fee_labels') || {}).map(([key, label]) => (
                                            <option key={key} value={key}>{label}</option>
                                        ))}
                                    </select>
                                </div>
                                <input
                                    type="number"
                                    name="annual_fee"
                                    value={(data.annual_fee !== undefined && data.annual_fee !== null) ? data.annual_fee : ''}
                                    onChange={onChange}
                                    placeholder="0"
                                    className={isEditMode
                                        ? "text-sm font-bold text-slate-600 bg-transparent border-b border-slate-200 outline-none w-24 text-right"
                                        : "w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-primary-500"
                                    }
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Vacation Price */}
            {type === 'vacation' && (
                <div className={isEditMode ? "flex flex-col items-end" : "field-container"}>
                    {isEditMode ? (
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-400 uppercase">{t('common.for_vacation')}</span>
                            <input
                                type="number"
                                name="vacation_price"
                                value={(data.vacation_price !== undefined && data.vacation_price !== null) ? data.vacation_price : ''}
                                onChange={onChange}
                                placeholder=""
                                className={`text-3xl font-black text-primary-600 border-b-2 bg-transparent outline-none w-48 text-right transition-all ${getFieldStatus('vacation_price') || (errors?.vacation_price ? 'border-red-500' : 'border-primary-500')}`}
                            />
                        </div>
                    ) : (
                        <>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('common.vacation_price')}</label>
                            <input
                                type="number"
                                name="vacation_price"
                                value={(data.vacation_price !== undefined && data.vacation_price !== null) ? data.vacation_price : ''}
                                onChange={onChange}
                                placeholder=""
                                className={`w-full px-3 py-2.5 text-sm bg-slate-50 border rounded-xl focus:ring-2 focus:ring-primary-500 transition-all outline-none ${getFieldStatus('vacation_price') === 'error' ? 'neon-error' : getFieldStatus('vacation_price') === 'warning' ? 'neon-warning' : 'border-slate-200'}`}
                            />
                        </>
                    )}
                    {errors?.vacation_price && <p className={`text-red-500 text-xs font-bold ${isEditMode ? 'mt-1' : 'mt-1'}`}>{errors.vacation_price}</p>}

                    {/* Vacation Period Selector */}
                    <div className={`mt-1 flex items-center gap-2 ${isEditMode ? 'justify-end' : ''}`}>
                        <span className="text-[10px] font-bold text-slate-400 uppercase leading-none">{t('common.period') || 'Period'}</span>
                        <select
                            name="vacation_period"
                            value={data.vacation_period || 'day'}
                            onChange={onChange}
                            className="text-xs font-bold text-primary-600 bg-transparent border-b border-primary-200 outline-none cursor-pointer"
                        >
                            {['day', 'week', 'month', 'year'].map(p => (
                                <option key={p} value={p}>{t(`common.periods.${p}`)}</option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

        </div>
    );
};

export default PropertyPriceFields;
