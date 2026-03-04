'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { MdClose, MdSearch, MdChevronRight, MdTipsAndUpdates, MdArrowBack } from 'react-icons/md';
import { getHelpSectionsForRole } from './help.data';

// ─── Colores de sección ──────────────────────────────────────────────────────
const COLORS = {
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', ring: 'ring-orange-200', dot: 'bg-orange-500' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', ring: 'ring-blue-200', dot: 'bg-blue-500' },
    green: { bg: 'bg-green-50', text: 'text-green-600', ring: 'ring-green-200', dot: 'bg-green-500' },
    gray: { bg: 'bg-gray-50', text: 'text-gray-600', ring: 'ring-gray-200', dot: 'bg-gray-500' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', ring: 'ring-purple-200', dot: 'bg-purple-500' },
    red: { bg: 'bg-red-50', text: 'text-red-600', ring: 'ring-red-200', dot: 'bg-red-500' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-200', dot: 'bg-emerald-500' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', ring: 'ring-amber-200', dot: 'bg-amber-500' },
    slate: { bg: 'bg-slate-50', text: 'text-slate-600', ring: 'ring-slate-200', dot: 'bg-slate-500' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', ring: 'ring-indigo-200', dot: 'bg-indigo-500' },
    teal: { bg: 'bg-teal-50', text: 'text-teal-600', ring: 'ring-teal-200', dot: 'bg-teal-500' },
};

// ─── Renderizado de contenido de artículo ────────────────────────────────────
function ArticleContent({ article, color }) {
    const c = COLORS[color] || COLORS.gray;

    return (
        <div className="space-y-4">
            {article.content && (
                <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
                    {article.content}
                </p>
            )}

            {article.steps && (
                <ol className="space-y-2">
                    {article.steps.map((step, i) => (
                        <li key={i} className="flex gap-3 text-sm">
                            {/^\d+\./.test(step) || /^[🟡🔵🟠🟢⚫🔴🟣🟤⚪]/.test(step) ? (
                                <span className="text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{
                                    __html: step.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                }} />
                            ) : (
                                <>
                                    <span className={`flex-shrink-0 w-5 h-5 rounded-full ${c.dot} text-white text-xs flex items-center justify-center font-bold mt-0.5`}>
                                        {i + 1}
                                    </span>
                                    <span className="text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{
                                        __html: step.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                    }} />
                                </>
                            )}
                        </li>
                    ))}
                </ol>
            )}

            {article.tip && (
                <div className={`flex gap-2 p-3 rounded-lg ${c.bg} ring-1 ${c.ring}`}>
                    <MdTipsAndUpdates className={`w-4 h-4 flex-shrink-0 mt-0.5 ${c.text}`} />
                    <p className="text-xs text-gray-700 leading-relaxed">
                        <span className={`font-semibold ${c.text}`}>Tip: </span>
                        {article.tip}
                    </p>
                </div>
            )}
        </div>
    );
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function HelpCenter({ isOpen, onClose, role }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeSection, setActiveSection] = useState(null);
    const [activeArticle, setActiveArticle] = useState(null);
    const [mobileView, setMobileView] = useState('list'); // 'list' | 'section' | 'article'

    const sections = useMemo(() => getHelpSectionsForRole(role), [role]);

    // Reset al abrir
    useEffect(() => {
        if (isOpen) {
            setSearchQuery('');
            setActiveSection(sections[0] || null);
            setActiveArticle(null);
            setMobileView('list');
        }
    }, [isOpen, sections]);

    // Cerrar con Escape
    useEffect(() => {
        const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
        if (isOpen) window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    // Resultados de búsqueda
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase();
        const results = [];
        sections.forEach(section => {
            section.articles.forEach(article => {
                const hit =
                    article.title.toLowerCase().includes(q) ||
                    (article.content || '').toLowerCase().includes(q) ||
                    (article.steps || []).some(s => s.toLowerCase().includes(q)) ||
                    (article.tip || '').toLowerCase().includes(q);
                if (hit) results.push({ section, article });
            });
        });
        return results;
    }, [searchQuery, sections]);

    const handleSelectArticle = useCallback((section, article) => {
        setActiveSection(section);
        setActiveArticle(article);
        setMobileView('article');
    }, []);

    const handleSelectSection = useCallback((section) => {
        setActiveSection(section);
        setActiveArticle(section.articles[0] || null);
        setMobileView('section');
    }, []);

    const ROLE_LABELS = {
        staff: { label: 'Staff', color: 'bg-orange-100 text-orange-700' },
        admin: { label: 'Admin', color: 'bg-blue-100 text-blue-700' },
        manager: { label: 'Manager', color: 'bg-indigo-100 text-indigo-700' },
        superadmin: { label: 'Superadmin', color: 'bg-purple-100 text-purple-700' },
    };
    const roleInfo = ROLE_LABELS[role] || { label: role, color: 'bg-gray-100 text-gray-700' };

    if (!isOpen) return null;

    const currentColor = COLORS[activeSection?.color] || COLORS.gray;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">

                {/* ── Header ──────────────────────────────────────────────────────── */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">❓</span>
                        <div>
                            <h2 className="font-bold text-gray-900 text-lg leading-none">Centro de Ayuda</h2>
                            <p className="text-xs text-gray-400 mt-0.5">Todo lo que necesitás saber</p>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${roleInfo.color}`}>
                            {roleInfo.label}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                        aria-label="Cerrar ayuda"
                    >
                        <MdClose className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* ── Buscador ─────────────────────────────────────────────────────── */}
                <div className="px-5 py-3 border-b border-gray-100 flex-shrink-0">
                    <div className="relative">
                        <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar en la ayuda..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                            autoFocus
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <MdClose className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Cuerpo ───────────────────────────────────────────────────────── */}
                <div className="flex flex-1 overflow-hidden">

                    {/* Resultados de búsqueda */}
                    {searchQuery.trim() ? (
                        <div className="flex-1 overflow-y-auto p-5">
                            {searchResults.length === 0 ? (
                                <div className="text-center py-12 text-gray-400">
                                    <p className="text-4xl mb-3">🔍</p>
                                    <p className="font-medium">Sin resultados para "{searchQuery}"</p>
                                    <p className="text-sm mt-1">Probá con otras palabras</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <p className="text-xs text-gray-400 mb-3">{searchResults.length} resultado(s)</p>
                                    {searchResults.map(({ section, article }) => {
                                        const c = COLORS[section.color] || COLORS.gray;
                                        return (
                                            <button
                                                key={article.id}
                                                onClick={() => { setSearchQuery(''); handleSelectArticle(section, article); }}
                                                className="w-full text-left p-4 bg-white border border-gray-100 rounded-xl hover:border-gray-300 hover:shadow-sm transition-all group"
                                            >
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-sm">{section.emoji}</span>
                                                    <span className={`text-xs font-semibold ${c.text}`}>{section.title}</span>
                                                </div>
                                                <p className="font-medium text-gray-900 text-sm group-hover:text-purple-700 transition-colors">
                                                    {article.title}
                                                </p>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* ── Sidebar (secciones) — desktop ── */}
                            <aside className="hidden md:flex flex-col w-56 border-r border-gray-100 overflow-y-auto flex-shrink-0 bg-gray-50/50">
                                {sections.map((section) => {
                                    const c = COLORS[section.color] || COLORS.gray;
                                    const isActive = activeSection?.id === section.id;
                                    return (
                                        <button
                                            key={section.id}
                                            onClick={() => handleSelectSection(section)}
                                            className={`flex items-center gap-3 px-4 py-3 text-left transition-all border-l-2 ${isActive
                                                    ? `border-current ${c.text} ${c.bg} font-semibold`
                                                    : 'border-transparent text-gray-600 hover:bg-white hover:text-gray-900'
                                                }`}
                                        >
                                            <span className="text-base flex-shrink-0">{section.emoji}</span>
                                            <span className="text-sm truncate">{section.title}</span>
                                        </button>
                                    );
                                })}
                            </aside>

                            {/* ── Panel central (artículos de la sección) ── */}
                            {activeSection && (
                                <div className="hidden md:flex flex-1 overflow-hidden">
                                    {/* Lista de artículos */}
                                    <div className="w-52 border-r border-gray-100 overflow-y-auto flex-shrink-0">
                                        <div className={`px-4 py-3 border-b border-gray-100 ${currentColor.bg}`}>
                                            <p className={`text-xs font-bold uppercase tracking-wide ${currentColor.text}`}>
                                                {activeSection.emoji} {activeSection.title}
                                            </p>
                                        </div>
                                        {activeSection.articles.map((article) => {
                                            const isActive = activeArticle?.id === article.id;
                                            return (
                                                <button
                                                    key={article.id}
                                                    onClick={() => setActiveArticle(article)}
                                                    className={`w-full text-left px-4 py-3 text-sm border-b border-gray-50 transition-all flex items-center justify-between gap-2 ${isActive
                                                            ? `${currentColor.bg} ${currentColor.text} font-medium`
                                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                                        }`}
                                                >
                                                    <span className="leading-snug">{article.title}</span>
                                                    {isActive && <MdChevronRight className="w-4 h-4 flex-shrink-0" />}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Contenido del artículo */}
                                    <div className="flex-1 overflow-y-auto p-6">
                                        {activeArticle ? (
                                            <div>
                                                <div className="mb-5">
                                                    <span className={`text-xs font-semibold ${currentColor.text} uppercase tracking-wide`}>
                                                        {activeSection.emoji} {activeSection.title}
                                                    </span>
                                                    <h3 className="text-lg font-bold text-gray-900 mt-1">{activeArticle.title}</h3>
                                                </div>
                                                <ArticleContent article={activeArticle} color={activeSection.color} />
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-gray-400">
                                                <p className="text-sm">Seleccioná un tema</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ── Vista Mobile ── */}
                            <div className="md:hidden flex-1 overflow-y-auto">
                                {mobileView === 'list' && (
                                    <div className="p-4 space-y-2">
                                        {sections.map((section) => {
                                            const c = COLORS[section.color] || COLORS.gray;
                                            return (
                                                <button
                                                    key={section.id}
                                                    onClick={() => handleSelectSection(section)}
                                                    className={`w-full flex items-center gap-3 p-4 rounded-xl border ${c.bg} border-gray-100 hover:border-gray-300 transition-all`}
                                                >
                                                    <span className="text-2xl">{section.emoji}</span>
                                                    <div className="flex-1 text-left">
                                                        <p className={`font-semibold text-sm ${c.text}`}>{section.title}</p>
                                                        <p className="text-xs text-gray-400">{section.articles.length} temas</p>
                                                    </div>
                                                    <MdChevronRight className="w-5 h-5 text-gray-400" />
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {mobileView === 'section' && activeSection && (
                                    <div>
                                        <button
                                            onClick={() => setMobileView('list')}
                                            className="flex items-center gap-2 px-4 py-3 text-sm text-gray-600 border-b border-gray-100 w-full hover:bg-gray-50"
                                        >
                                            <MdArrowBack className="w-4 h-4" /> Volver
                                        </button>
                                        <div className={`px-4 py-3 border-b border-gray-100 ${currentColor.bg}`}>
                                            <p className={`text-sm font-bold ${currentColor.text}`}>
                                                {activeSection.emoji} {activeSection.title}
                                            </p>
                                        </div>
                                        {activeSection.articles.map((article) => (
                                            <button
                                                key={article.id}
                                                onClick={() => { setActiveArticle(article); setMobileView('article'); }}
                                                className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-700 border-b border-gray-50 hover:bg-gray-50"
                                            >
                                                {article.title}
                                                <MdChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {mobileView === 'article' && activeSection && activeArticle && (
                                    <div>
                                        <button
                                            onClick={() => setMobileView('section')}
                                            className="flex items-center gap-2 px-4 py-3 text-sm text-gray-600 border-b border-gray-100 w-full hover:bg-gray-50"
                                        >
                                            <MdArrowBack className="w-4 h-4" /> {activeSection.title}
                                        </button>
                                        <div className="p-5">
                                            <span className={`text-xs font-semibold ${currentColor.text} uppercase tracking-wide`}>
                                                {activeSection.emoji} {activeSection.title}
                                            </span>
                                            <h3 className="text-base font-bold text-gray-900 mt-1 mb-4">{activeArticle.title}</h3>
                                            <ArticleContent article={activeArticle} color={activeSection.color} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* ── Footer ──────────────────────────────────────────────────────── */}
                <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex-shrink-0">
                    <p className="text-xs text-gray-400 text-center">
                        Meeting Restobar · Centro de Ayuda · {sections.reduce((acc, s) => acc + s.articles.length, 0)} temas disponibles
                    </p>
                </div>
            </div>
        </div>
    );
}
