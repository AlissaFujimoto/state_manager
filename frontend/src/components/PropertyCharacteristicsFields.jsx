import React from 'react';
import { Bed, DoorOpen, Layout, Bath as BathIcon, Car, SquareDashed } from 'lucide-react';

const PropertyCharacteristicsFields = ({ data, onChange, getFieldStatus, errors, t }) => {

    // Safety check for data
    const safeData = data || { characteristics: {} };

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {[
                { label: t('common.bedrooms'), name: 'characteristics.bedrooms', icon: Bed },
                { label: t('common.suites'), name: 'characteristics.suites', icon: DoorOpen },
                { label: t('common.rooms'), name: 'characteristics.rooms', icon: Layout },
                { label: t('common.bathrooms'), name: 'characteristics.bathrooms', icon: BathIcon },
                { label: t('common.garages'), name: 'characteristics.garages', icon: Car },
                { label: t('common.area'), name: 'characteristics.area_combined', icon: SquareDashed, isCombined: true }
            ].map((field) => {
                const Icon = field.icon;

                let content;
                // Determine if this field has an error.
                // For combined, we check both internal fields.
                // For simple, we check the field name.
                // Note: getFieldStatus usually returns 'neon-error' or similar string, or check errors object directly.
                const simpleError = errors?.[field.name];
                const areaError = errors?.['characteristics.area'];
                const totalAreaError = errors?.['characteristics.total_area'];

                const hasError = field.isCombined ? (areaError || totalAreaError) : simpleError;

                if (field.isCombined) {
                    const areaValue = safeData.characteristics?.area;
                    const totalValue = safeData.characteristics?.total_area;
                    const areaUnitRaw = safeData.characteristics?.area_unit;
                    const totalUnitRaw = safeData.characteristics?.total_area_unit;

                    content = (
                        <div className="flex flex-col gap-3 mt-1 relative z-10 w-full">
                            {/* Area Input */}
                            <div className="w-full">
                                <div className="flex gap-2 items-center">
                                    <span className="text-[10px] font-bold text-slate-400 w-8">UTIL</span>
                                    <input
                                        type="number"
                                        name="characteristics.area"
                                        value={areaValue || 0}
                                        onChange={onChange}
                                        className={`text-sm font-bold text-slate-800 bg-transparent border-b outline-none w-full ${getFieldStatus('characteristics.area') === 'error' || getFieldStatus('characteristics.area') === 'neon-error' ? 'neon-error' : getFieldStatus('characteristics.area')?.includes('neon-warning') ? 'neon-warning' : 'border-primary-200 focus:border-primary-500'}`}
                                    />
                                    <select
                                        name="characteristics.area_unit"
                                        value={areaUnitRaw || 'm2'}
                                        onChange={onChange}
                                        className="text-[10px] font-bold text-primary-600 uppercase bg-primary-50 px-1 py-1 rounded-md outline-none"
                                    >
                                        {Object.entries(t('common.area_units') || {}).map(([code, label]) => (
                                            <option key={code} value={code}>{label}</option>
                                        ))}
                                    </select>
                                </div>
                                {areaError && <p className="text-red-500 text-[10px] font-bold mt-1 text-right">{t('common.field_negative') || areaError}</p>}
                            </div>

                            {/* Total Input */}
                            <div className="w-full">
                                <div className="flex gap-2 items-center">
                                    <span className="text-[10px] font-bold text-slate-400 w-8">TOT</span>
                                    <input
                                        type="number"
                                        name="characteristics.total_area"
                                        value={totalValue || 0}
                                        onChange={onChange}
                                        className={`text-sm font-bold text-slate-800 bg-transparent border-b outline-none w-full ${getFieldStatus('characteristics.total_area') === 'error' || getFieldStatus('characteristics.total_area') === 'neon-error' ? 'neon-error' : getFieldStatus('characteristics.total_area')?.includes('neon-warning') ? 'neon-warning' : 'border-primary-200 focus:border-primary-500'}`}
                                    />
                                    <select
                                        name="characteristics.total_area_unit"
                                        value={totalUnitRaw || 'm2'}
                                        onChange={onChange}
                                        className="text-[10px] font-bold text-primary-600 uppercase bg-primary-50 px-1 py-1 rounded-md outline-none"
                                    >
                                        {Object.entries(t('common.area_units') || {}).map(([code, label]) => (
                                            <option key={code} value={code}>{label}</option>
                                        ))}
                                    </select>
                                </div>
                                {totalAreaError && <p className="text-red-500 text-[10px] font-bold mt-1 text-right">{t('common.field_negative') || totalAreaError}</p>}
                            </div>
                        </div>
                    );
                } else {
                    // Using reduce to safely access nested existing values if any, though flat naming is used in inputs mainly
                    // But property details uses dot notation for name, so we keep that consistent.
                    let value;
                    if (field.name.includes('.')) {
                        const [parent, child] = field.name.split('.');
                        value = safeData[parent]?.[child];
                    } else {
                        value = safeData[field.name];
                    }

                    if (value === undefined || value === null) value = 0;

                    const statusClass = getFieldStatus(field.name);
                    const isNeonError = statusClass === 'error' || statusClass === 'neon-error';
                    const isNeonWarning = statusClass === 'warning' || statusClass === 'neon-warning' || statusClass?.includes('neon-warning');

                    content = (
                        <div className="space-y-2 relative z-10 w-full">
                            <input
                                type="number"
                                name={field.name}
                                value={value}
                                onChange={onChange}
                                className={`text-xl font-bold text-slate-800 bg-transparent border-b outline-none w-full ${isNeonError ? 'border-red-500 focus:border-red-600' : isNeonWarning ? 'neon-warning' : 'border-primary-200 focus:border-primary-500'}`}
                            />
                            {simpleError && <p className="text-red-500 text-[10px] font-bold absolute top-full left-0 w-full pt-1">{t('common.field_negative') || simpleError}</p>}
                        </div>
                    );
                }

                return (
                    <div key={field.name} className={`glass-card p-5 rounded-2xl flex items-center space-x-4 transition-all relative overflow-hidden ${hasError ? 'border-red-500 bg-red-50' : ''}`}>
                        {/* Background Icon Watermark - Hide for Area (combined) */}
                        {!field.isCombined && (
                            <Icon className="absolute -right-4 -bottom-4 w-24 h-24 text-primary-600/5 rotate-[-15deg] pointer-events-none" />
                        )}

                        <div className="flex-1">
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider relative z-10">{field.label}</p>
                            {content}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default PropertyCharacteristicsFields;
