'use client';

import { AccountType } from '@/lib/types';
import { Translations } from '@/lib/translations';

interface OnboardingScreenProps {
  tr: Translations;
  onSelect: (type: AccountType) => void;
}

export default function OnboardingScreen({ tr, onSelect }: OnboardingScreenProps) {
  return (
    <div className="min-h-[calc(100vh-56px)] flex flex-col items-center justify-center px-4 py-12 bg-gradient-to-b from-slate-50 to-white">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-100 mb-4">
            <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900">{tr.chooseContext}</h1>
          <p className="text-sm text-slate-500 mt-2">{tr.chooseContextSub}</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => onSelect('personal')}
            className="w-full group relative bg-white border-2 border-slate-200 hover:border-emerald-400 rounded-2xl p-6 text-left transition-all duration-200 hover:shadow-lg hover:shadow-emerald-100 active:scale-[0.98]"
          >
            <div className="flex items-start gap-4">
              <div className="text-4xl leading-none mt-0.5">🏠</div>
              <div>
                <div className="font-bold text-slate-900 text-base mb-1">{tr.personal}</div>
                <div className="text-sm text-slate-500 leading-relaxed">{tr.personalDesc}</div>
                <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                  Base Currency: CAD
                </div>
              </div>
            </div>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-50 group-hover:bg-emerald-500 flex items-center justify-center transition-all duration-200">
              <svg className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          <button
            onClick={() => onSelect('business')}
            className="w-full group relative bg-white border-2 border-slate-200 hover:border-teal-400 rounded-2xl p-6 text-left transition-all duration-200 hover:shadow-lg hover:shadow-teal-100 active:scale-[0.98]"
          >
            <div className="flex items-start gap-4">
              <div className="text-4xl leading-none mt-0.5">💼</div>
              <div>
                <div className="font-bold text-slate-900 text-base mb-1">{tr.business}</div>
                <div className="text-sm text-slate-500 leading-relaxed">{tr.businessDesc}</div>
                <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-teal-600 bg-teal-50 px-2.5 py-1 rounded-full">
                  GST / HST / QST Ready
                </div>
              </div>
            </div>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-50 group-hover:bg-teal-500 flex items-center justify-center transition-all duration-200">
              <svg className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
