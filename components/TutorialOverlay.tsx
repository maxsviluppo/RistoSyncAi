import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowRight, CheckCircle, Info, ChevronRight, ChevronLeft, MapPin } from 'lucide-react';

export interface TutorialStep {
    targetId?: string; // If undefined, it's a modal (center screen)
    title: string;
    content: React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

interface TutorialOverlayProps {
    steps: TutorialStep[];
    currentStep: number;
    onNext: () => void;
    onPrev: () => void;
    onClose: (dontShowAgain: boolean) => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
    steps,
    currentStep,
    onNext,
    onPrev,
    onClose
}) => {
    const [dontShowAgain, setDontShowAgain] = useState(false);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const step = steps[currentStep];

    useEffect(() => {
        const updateRect = () => {
            if (step.targetId) {
                const element = document.getElementById(step.targetId);
                if (element) {
                    const rect = element.getBoundingClientRect();
                    setTargetRect(rect);

                    // Optional: Scroll into view if needed
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else {
                    // Fallback if element not found: show as modal?
                    console.warn(`Tutorial target ${step.targetId} not found`);
                    setTargetRect(null);
                }
            } else {
                setTargetRect(null);
            }
        };

        // Initial update
        updateRect();

        // Update on resize
        window.addEventListener('resize', updateRect);

        // Polling for dynamic content (animations etc)
        const interval = setInterval(updateRect, 100);

        return () => {
            window.removeEventListener('resize', updateRect);
            clearInterval(interval);
        };
    }, [currentStep, step.targetId]);

    // Handle center modal (no target)
    if (!step.targetId || !targetRect) {
        return (
            <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl max-w-lg w-full relative overflow-hidden animate-slide-up">
                    {/* Header Image/Gradient */}
                    <div className="h-32 bg-gradient-to-br from-blue-600 to-indigo-600 relative overflow-hidden flex items-center justify-center">
                        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
                        <Info size={48} className="text-white relative z-10 drop-shadow-lg" />
                    </div>

                    <div className="p-8">
                        <h2 className="text-2xl font-black text-white mb-4">{step.title}</h2>
                        <div className="text-slate-300 mb-8 leading-relaxed text-sm">
                            {step.content}
                        </div>

                        {/* Checkbox only on first or last step? Or always visible? User requested ability to flag "dont show again" */}
                        <label className="flex items-center gap-3 cursor-pointer text-slate-400 hover:text-white transition-colors mb-6">
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    checked={dontShowAgain}
                                    onChange={(e) => setDontShowAgain(e.target.checked)}
                                    className="peer sr-only"
                                />
                                <div className="w-5 h-5 border-2 border-slate-600 rounded peer-checked:bg-blue-500 peer-checked:border-blue-500 transition-all"></div>
                                <CheckCircle size={14} className="absolute inset-0 m-auto text-white opacity-0 peer-checked:opacity-100 pointer-events-none" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wide">Non mostrare più all'avvio</span>
                        </label>

                        <div className="flex gap-3">
                            <button
                                onClick={() => onClose(dontShowAgain)}
                                className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                            >
                                Salta Tutorial
                            </button>
                            <button
                                onClick={onNext}
                                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 group"
                            >
                                Inizia Tour <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Handle Spotlight Overlay
    return (
        <div className="fixed inset-0 z-[10000] overflow-hidden pointer-events-none">
            {/* SVG Mask for the hole */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <defs>
                    <mask id="tutorial-mask">
                        <rect x="0" y="0" width="100%" height="100%" fill="white" />
                        <rect
                            x={targetRect.left - 4}
                            y={targetRect.top - 4}
                            width={targetRect.width + 8}
                            height={targetRect.height + 8}
                            rx="12" // Rounded corners for the hole
                            fill="black"
                        />
                    </mask>
                </defs>
                <rect
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    fill="rgba(0,0,0,0.8)"
                    mask="url(#tutorial-mask)"
                />
                {/* Border highlight around the target */}
                <rect
                    x={targetRect.left - 4}
                    y={targetRect.top - 4}
                    width={targetRect.width + 8}
                    height={targetRect.height + 8}
                    rx="12"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="4"
                    className="animate-pulse"
                />
            </svg>

            {/* Tooltip Card */}
            <div
                className="absolute w-80 bg-slate-900 text-white p-6 rounded-2xl shadow-2xl border border-slate-700 animate-fade-in transition-all duration-300 z-50 pointer-events-auto"
                style={{
                    // Smart Positioning Logic
                    ...(() => {
                        const pos = step.position || 'bottom';
                        const gap = 16;
                        const isBottomHalf = targetRect.top > window.innerHeight / 2;

                        if (pos === 'right') {
                            return {
                                left: targetRect.right + gap,
                                // If weak vertical space, align bottom with target bottom, else align top
                                ...(isBottomHalf
                                    ? { bottom: window.innerHeight - targetRect.bottom, top: 'auto' }
                                    : { top: targetRect.top, bottom: 'auto' }
                                )
                            };
                        }
                        if (pos === 'left') {
                            return {
                                left: targetRect.left - 320 - gap, // 320 = w-80
                                ...(isBottomHalf
                                    ? { bottom: window.innerHeight - targetRect.bottom, top: 'auto' }
                                    : { top: targetRect.top, bottom: 'auto' }
                                )
                            };
                        }
                        if (pos === 'top') {
                            return {
                                top: 'auto',
                                bottom: window.innerHeight - targetRect.top + gap,
                                left: Math.max(10, Math.min(window.innerWidth - 330, targetRect.left + (targetRect.width / 2) - 160))
                            };
                        }
                        // Default Bottom
                        return {
                            top: targetRect.bottom + gap,
                            bottom: 'auto',
                            left: Math.max(10, Math.min(window.innerWidth - 330, targetRect.left + (targetRect.width / 2) - 160))
                        };
                    })()
                }}
            >
                <button
                    onClick={() => onClose(dontShowAgain)}
                    className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
                >
                    <X size={16} />
                </button>

                <div className="flex items-center gap-2 mb-3 text-blue-400 font-bold text-xs uppercase tracking-wider">
                    <MapPin size={14} />
                    <span>Step {currentStep + 1} di {steps.length}</span>
                </div>

                <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                <div className="text-slate-300 text-sm mb-6 leading-relaxed">
                    {step.content}
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-slate-500 hover:text-slate-300 transition-colors mb-4">
                    <input
                        type="checkbox"
                        checked={dontShowAgain}
                        onChange={(e) => setDontShowAgain(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-[10px] uppercase font-bold">Non mostrare più</span>
                </label>

                <div className="flex justify-between items-center">
                    <button
                        onClick={onPrev}
                        disabled={currentStep === 0}
                        className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>

                    <button
                        onClick={onNext}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-sm shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
                    >
                        {currentStep === steps.length - 1 ? 'Fine' : 'Avanti'} <ChevronRight size={16} />
                    </button>
                </div>

                {/* Arrow pointing to target - Only show for top/bottom as side positioning arrow is harder to place generically */}
                <div
                    className="absolute w-4 h-4 bg-slate-900 border-t border-l border-slate-700 transform rotate-45"
                    style={{
                        display: (step.position === 'left' || step.position === 'right') ? 'none' : 'block',
                        ...(step.position === 'top'
                            ? { bottom: -8, top: 'auto', borderTop: 'none', borderLeft: 'none', borderBottom: '1px solid #334155', borderRight: '1px solid #334155' }
                            : { top: -8, bottom: 'auto' }
                        ),
                        left: '50%',
                        marginLeft: -8,
                    }}
                ></div>
            </div>
        </div>
    );
};
