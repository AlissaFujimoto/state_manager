import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const PropertyStatusBadges = ({ property, size = 'md', hideNew = false, showType = true, showListingType = true }) => {
    const { t } = useLanguage();
    let height = 'h-8';
    let fontSize = 'text-[11px]';
    let padding = 'px-3';
    let gap = 'gap-2';

    if (size === 'sm') {
        height = 'h-6';
        fontSize = 'text-[9px]';
        padding = 'px-2.5';
        gap = 'gap-1.5';
    } else if (size === 'xs') {
        height = 'h-5';
        fontSize = 'text-[10px]';
        padding = 'px-2';
        gap = 'gap-1';
    }

    // Enhanced premium badge style
    const badgeBase = `${fontSize} ${padding} ${height} font-bold uppercase tracking-widest flex items-center justify-center whitespace-nowrap transition-all duration-300 rounded-lg shadow-sm`;

    const isNew = !hideNew && property.created_at && (new Date() - new Date(property.created_at)) < 7 * 24 * 60 * 60 * 1000;

    return (
        <div className={`flex flex-wrap items-center ${gap}`}>
            {/* New Badge */}
            {isNew && (
                <div className={`${badgeBase} bg-violet-500 text-white`}>
                    {t('common.new')}
                </div>
            )}

            {/* Property Type Badge */}
            {showType && (
                <div className={`${badgeBase} bg-white text-slate-800 border border-slate-200`}>
                    {property.property_type ? t(`property_types.${property.property_type.toLowerCase()}`) : 'Property'}
                </div>
            )}

            {/* Listing Type Badge */}
            {showListingType && (() => {
                let badgeStyle = 'bg-emerald-500 text-white';

                const type = property.listing_type;
                let label = t(`listing_types.${type}`) || type;

                if (type === 'rent') {
                    badgeStyle = 'bg-orange-600 text-white';
                } else if (type === 'both' || type === 'sale_rent') {
                    badgeStyle = 'bg-blue-600 text-white';
                } else if (type === 'vacation') {
                    badgeStyle = 'bg-rose-500 text-white';
                } else if (type === 'business_transfer') {
                    badgeStyle = 'bg-indigo-600 text-white';
                } else if (type === 'launch') {
                    badgeStyle = 'bg-purple-600 text-white';
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
