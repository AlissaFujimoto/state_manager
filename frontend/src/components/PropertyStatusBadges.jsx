import React from 'react';

const PropertyStatusBadges = ({ property, size = 'md' }) => {
    const height = size === 'sm' ? 'h-6' : 'h-8';
    const fontSize = size === 'sm' ? 'text-[9px]' : 'text-[11px]';
    const padding = size === 'sm' ? 'px-2.5' : 'px-3';
    const gap = size === 'sm' ? 'gap-1.5' : 'gap-2';

    // Minimalist badge style
    const badgeBase = `${fontSize} ${padding} ${height} font-bold uppercase tracking-wide flex items-center justify-center whitespace-nowrap transition-all duration-200 rounded-md`;

    return (
        <div className={`flex items-center ${gap}`}>
            {/* Property Type Badge */}
            <div className={`${badgeBase} bg-white/95 text-slate-700 shadow-sm`}>
                {property.property_type || 'Property'}
            </div>

            {/* Listing Type Badge */}
            <div className={`${badgeBase} ${property.listing_type === 'rent' ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'} shadow-sm`}>
                {property.listing_type === 'rent' ? 'For Rent' : 'For Sale'}
            </div>
        </div>
    );
};

export default PropertyStatusBadges;
