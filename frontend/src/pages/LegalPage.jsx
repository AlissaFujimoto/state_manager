import React, { useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { motion as Motion } from 'framer-motion';
import { Shield, FileText, Cookie, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LegalPage = ({ type }) => {
    const { t } = useLanguage();
    const navigate = useNavigate();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [type]);

    const icons = {
        privacy: Shield,
        terms: FileText,
        cookies: Cookie
    };

    const Icon = icons[type];

    return (
        <div className="max-w-4xl mx-auto px-4 py-12 md:py-20">

            <Motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[2.5rem] p-8 md:p-16 shadow-2xl shadow-slate-200/50 border border-slate-50"
            >
                <div className="flex items-center gap-6 mb-12">
                    <div className="p-5 bg-primary-50 rounded-3xl text-primary-600">
                        <Icon className="w-10 h-10" />
                    </div>
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
                            {t(`${type}.title`)}
                        </h1>
                        <p className="text-slate-400 font-bold text-sm mt-2 uppercase tracking-widest">
                            {t(`${type}.last_updated`)}
                        </p>
                    </div>
                </div>

                <div className="space-y-12">
                    <p className="text-xl text-slate-600 leading-relaxed font-medium italic border-l-4 border-primary-200 pl-6">
                        {t(`${type}.intro`)}
                    </p>

                    <section className="space-y-6">
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-primary-500" />
                            {t(`${type}.section1_title`)}
                        </h2>
                        <p className="text-lg text-slate-600 leading-relaxed">
                            {t(`${type}.section1_text`)}
                        </p>
                    </section>

                    <section className="space-y-6">
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-primary-500" />
                            {t(`${type}.section2_title`)}
                        </h2>
                        <p className="text-lg text-slate-600 leading-relaxed">
                            {t(`${type}.section2_text`)}
                        </p>
                    </section>

                    <section className="space-y-6">
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-primary-500" />
                            {t(`${type}.section3_title`)}
                        </h2>
                        <p className="text-lg text-slate-600 leading-relaxed">
                            {t(`${type}.section3_text`)}
                        </p>
                    </section>
                </div>

                <div className="mt-20 pt-12 border-t border-slate-100 flex flex-col items-center gap-8">
                    <button
                        onClick={() => navigate(-1)}
                        className="bg-primary-600 hover:bg-primary-700 text-white px-10 py-4 rounded-2xl font-bold shadow-lg shadow-primary-200 transition-all flex items-center justify-center space-x-2 group"
                    >
                        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span>{t('common.back')}</span>
                    </button>

                    <p className="text-slate-400 font-medium italic">
                        © 2026 VitEstate. {t('navbar.all_rights_reserved')}
                    </p>
                </div>
            </Motion.div>
        </div>
    );
};

export default LegalPage;
