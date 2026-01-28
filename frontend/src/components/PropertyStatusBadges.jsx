import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const PropertyStatusBadges = ({ property, size = 'md' }) => {
    const { t } = useLanguage();
    const height = size === 'sm' ? 'h-6' : 'h-8';
    const fontSize = size === 'sm' ? 'text-[9px]' : 'text-[11px]';
    const padding = size === 'sm' ? 'px-2.5' : 'px-3';
    const gap = size === 'sm' ? 'gap-1.5' : 'gap-2';

    // Enhanced premium badge style
    const badgeBase = `${fontSize} ${padding} ${height} font-bold uppercase tracking-widest flex items-center justify-center whitespace-nowrap transition-all duration-300 rounded-lg shadow-sm`;

    const isNew = property.created_at && (new Date() - new Date(property.created_at)) < 7 * 24 * 60 * 60 * 1000;

    return (
        <div className={`flex flex-wrap items-center ${gap}`}>
            {/* New Badge */}
            {isNew && (
                <div className={`${badgeBase} bg-violet-500 text-white`}>
                    {t('common.new')}
                </div>
            )}

            {/* Property Type Badge */}
            <div className={`${badgeBase} bg-white text-slate-800 border border-slate-200`}>
                {property.property_type ? t(`home.${property.property_type.toLowerCase()}`) : 'Property'}
            </div>

            {/* Listing Type Badge */}
            {(() => {
                let badgeStyle = 'bg-emerald-500 text-white';
                let label = t('common.for_sale');

                const type = property.listing_type;
                if (type === 'rent') {
                    badgeStyle = 'bg-orange-600 text-white';
                    label = t('common.for_rent');
                } else if (type === 'both' || type === 'sale_rent') {
                    badgeStyle = 'bg-blue-600 text-white';
                    label = t('common.for_both');
                } else if (type === 'vacation') {
                    badgeStyle = 'bg-rose-500 text-white';
                    label = t('common.for_vacation');
                }

                return (
                    <div className={`${badgeBase} ${badgeStyle}`}>
                        {label}
                    </div>
                );
            })()}

        </div>
    );
};

export default PropertyStatusBadges;
