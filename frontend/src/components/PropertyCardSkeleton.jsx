import React from 'react';

const PropertyCardSkeleton = () => {
    return (
        <div className="glass-card rounded-2xl overflow-hidden premium-shadow relative">
            {/* Image Placeholder */}
            <div className="h-64 bg-slate-200 relative animate-shimmer" />

            <div className="p-6">
                <div className="flex justify-between items-start gap-4 mb-4">
                    {/* Title Placeholder */}
                    <div className="h-7 bg-slate-200 rounded-lg w-3/4 animate-shimmer" />
                    {/* Translate Button Placeholder */}
                    <div className="w-10 h-10 bg-slate-200 rounded-xl shrink-0 animate-shimmer" />
                </div>

                <div className="flex flex-col gap-y-2 mt-2">
                    {/* Location Placeholder */}
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-slate-200 rounded-full shrink-0 animate-shimmer" />
                        <div className="h-3 bg-slate-200 rounded w-1/2 animate-shimmer" />
                    </div>
                    {/* Date Placeholder */}
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-slate-200 rounded-full shrink-0 animate-shimmer" />
                        <div className="h-3 bg-slate-200 rounded w-1/4 animate-shimmer" />
                    </div>
                </div>

                {/* Description Placeholder */}
                <div className="mt-4 space-y-2">
                    <div className="h-3 bg-slate-200 rounded w-full animate-shimmer" />
                    <div className="h-3 bg-slate-200 rounded w-5/6 animate-shimmer" />
                </div>

                {/* Characteristics Grid Placeholder */}
                <div className="grid grid-cols-3 gap-2 mt-6 py-4 border-y border-slate-100">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="flex flex-col items-center gap-2">
                            <div className="h-2 bg-slate-100 rounded w-12 animate-shimmer" />
                            <div className="h-4 bg-slate-200 rounded w-8 animate-shimmer" />
                        </div>
                    ))}
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    {/* Bottom Action Placeholders if any */}
                    <div className="h-10 w-24 bg-slate-100 rounded-xl animate-shimmer" />
                </div>
            </div>
        </div>
    );
};

export default PropertyCardSkeleton;
