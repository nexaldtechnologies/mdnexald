

import React, { useState } from 'react';
import { Logo } from './Logo';


import { FloatingBackground } from './FloatingBackground';
import { useTypewriter } from '../hooks/useTypewriter';
import { TOOLS_DATA } from '../constants';

interface LandingPageProps {
  onStart: () => void;
  onPricing: () => void;
  onBlog: () => void;
  onAbout: () => void;
  onTerms: () => void;
  onPrivacy: () => void;
  onContact: () => void;
  onLogin: () => void;
  onLogout: () => void;
  onToggleTheme: () => void;
  isAuthenticated: boolean;
  userName?: string;
  onNavigateToTools: () => void;
}

const TYPEWRITER_PHRASES = [
  "Built by Clinicians for Clinicians",
  "Designed for Real-World Practice",
  "Streamlining Clinical Workflows"
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onStart,
  onPricing,
  onBlog,
  onAbout,
  onTerms,
  onPrivacy,
  onContact,
  onLogin,
  onLogout,
  onToggleTheme,
  theme,

  isAuthenticated,
  userName = 'User',
  onNavigateToTools
}) => {
  const [activeToolIndex, setActiveToolIndex] = useState(0);
  const typewriterText = useTypewriter(TYPEWRITER_PHRASES, 50, 30, 2000);

  // Resolve theme for inline styles
  const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const bgOpacity = isDark ? '40' : '15'; // Darker background for dark mode (25% vs 8%)

  const featuredTools = TOOLS_DATA.filter(t => ['dictionary', 'icd10', 'drug_checker', 'mdnexa-calc'].includes(t.id));

  const handleNextTool = () => {
    setActiveToolIndex((prev) => (prev + 1) % featuredTools.length);
  };

  const handlePrevTool = () => {
    setActiveToolIndex((prev) => (prev - 1 + featuredTools.length) % featuredTools.length);
  };

  const getToolStyle = (index: number) => {
    // Calculate position in the cycle relative to activeIndex
    // 0: Front, 1: Right, 2: Back, 3: Left (for 4 items)
    const position = (index - activeToolIndex + featuredTools.length) % featuredTools.length;

    // Base styles
    const base = "absolute top-1/2 left-1/2 transition-all duration-500 ease-in-out cursor-pointer p-6 rounded-2xl border flex flex-col items-center text-center h-72 w-80 bg-white dark:bg-slate-950 shadow-xl overflow-hidden";

    if (position === 0) {
      // FRONT
      return {
        zIndex: 30,
        opacity: 1,
        transform: 'translate(-50%, -50%) scale(1.15)',
        className: `${base} border-medical-500 ring-4 ring-medical-500/20`
      };
    } else if (position === 1) {
      // RIGHT
      return {
        zIndex: 20,
        opacity: 0.8,
        transform: 'translate(15%, -50%) scale(0.9)',
        className: `${base} border-slate-200 dark:border-slate-800 pointer-events-none`
      };
    } else if (position === 2) {
      // BACK
      return {
        zIndex: 10,
        opacity: 0.5,
        transform: 'translate(-50%, -65%) scale(0.75)',
        className: `${base} border-slate-200 dark:border-slate-800 pointer-events-none grayscale`
      };
    } else {
      // LEFT (position === 3)
      return {
        zIndex: 20,
        opacity: 0.8,
        transform: 'translate(-115%, -50%) scale(0.9)',
        className: `${base} border-slate-200 dark:border-slate-800 pointer-events-none`
      };
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-800 dark:text-white font-sans selection:bg-medical-100 dark:selection:bg-medical-900">
      {/* Navigation */}
      <div className="w-full bg-blue-50 dark:bg-slate-900 sticky top-0 z-50 shadow-sm">
        <nav className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 flex items-center justify-center text-medical-600">
              <Logo className="w-full h-full" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">MDnexa™</span>
          </div>
          <div className="flex items-center gap-4 md:gap-6">
            <button
              onClick={onToggleTheme}
              className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
              title="Toggle theme"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 hidden dark:block">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 block dark:hidden">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
            </button>
            {/* Menu Dropdown - Always Visible */}
            <div className="relative group mx-1">
              <button className="flex items-center gap-1 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-medical-600 dark:hover:text-white transition-colors p-2">
                Menu
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-400 group-hover:text-medical-600">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </button>
              <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-800 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform origin-top-right z-50">
                <button onClick={onAbout} className="block w-full text-left px-5 py-3 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-medical-600 dark:hover:text-white transition-colors">
                  About Us
                </button>
                <button onClick={onBlog} className="block w-full text-left px-5 py-3 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-medical-600 dark:hover:text-white transition-colors">
                  Blog
                </button>
                <button onClick={onPricing} className="block w-full text-left px-5 py-3 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-medical-600 dark:hover:text-white transition-colors">
                  Pricing
                </button>
              </div>
            </div>



            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  Logged in as <span className="text-slate-900 dark:text-white font-semibold">{userName}</span>
                </span>
                <button
                  onClick={onLogout}
                  className="px-6 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                {/* Trust Indicator - Premium & Bold */}
                <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500 text-white shadow-sm">
                    <svg className="w-2.5 h-2.5 stroke-current stroke-[3]" fill="none" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                  <span className="text-xs font-extrabold tracking-tight text-slate-800 dark:text-slate-100 uppercase">No card required</span>
                </div>

                <button
                  onClick={onLogin}
                  className="px-6 py-2.5 rounded-lg bg-medical-600 text-white text-sm font-bold shadow-lg shadow-medical-600/20 hover:bg-medical-700 transition-all transform hover:-translate-y-0.5"
                >
                  Login
                </button>
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* Hero Section */}
      <header className="relative pt-24 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Animated Geometric Background */}
        <FloatingBackground />

        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">

          {/* No Credit Card Badge */}
          {/* Removed from here */}

          <h1 className="animate-fade-in-up text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 dark:text-white mb-8 leading-tight max-w-5xl mx-auto text-center" style={{ animationDelay: '0.1s' }}>
            A unified platform for <br className="hidden md:block" /> <span className="text-medical-600 dark:text-medical-500">on-call medicine</span>
          </h1>

          <div className="animate-fade-in-up flex justify-center mb-8" style={{ animationDelay: '0.2s' }}>
            <div className="px-3 py-1.5 bg-medical-50 dark:bg-medical-900/40 border border-medical-100 dark:border-medical-900/50 rounded-full shadow-sm backdrop-blur-sm transition-all hover:scale-105">
              <span className="text-medical-700 dark:text-medical-300 font-bold uppercase tracking-widest text-[10px] md:text-xs">
                Built by a German Physician
              </span>
            </div>
          </div>

          <p className="animate-fade-in-up text-lg md:text-xl font-medium text-slate-600 dark:text-slate-300 mb-10 max-w-3xl mx-auto" style={{ animationDelay: '0.3s' }}>
            AI-assisted reasoning and dedicated clinical tools, built for moments that matter.
          </p>

          <div className="animate-fade-in-up flex flex-col sm:flex-row justify-center items-center gap-4 mb-8" style={{ animationDelay: '0.4s' }}>
            <button
              onClick={() => {
                console.log("Enter Dashboard Clicked -> Triggering onStart");
                onStart();
              }}
              className="bg-medical-600 hover:bg-medical-700 text-white font-bold py-4 px-10 rounded-xl shadow-xl transition-all hover:scale-105 active:scale-95 w-full sm:w-auto"
            >
              Enter Dashboard
            </button>
            <button
              onClick={onNavigateToTools}
              className="bg-white dark:bg-slate-800 text-slate-700 dark:text-white border border-slate-200 dark:border-slate-700 font-bold py-4 px-10 rounded-xl shadow-md hover:shadow-lg transition-all hover:bg-slate-50 dark:hover:bg-slate-700 w-full sm:w-auto"
            >
              Explore MDnexa Tools
            </button>
          </div>


          <style>{`
            @keyframes fadeInUp {
              from {
                opacity: 0;
                transform: translateY(20px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
            .animate-fade-in-up {
              opacity: 0; /* Example starting state, animation fills forwards */
              animation: fadeInUp 0.8s ease-out forwards;
            }
          `}</style>

        </div>
      </header>

      {/* 🚀 MDnexa GPT Advertisement - Premium Light Gradient Design */}
      <div className="max-w-5xl mx-auto px-6 -mt-16 mb-24 relative z-20">
        {/* Gradient Border Wrapper */}
        <div className="p-[2px] rounded-3xl bg-gradient-to-r from-medical-300 via-purple-300 to-emerald-300 shadow-xl transform hover:scale-[1.01] transition-transform duration-500">
          <div className="bg-white dark:bg-slate-900 rounded-[22px] p-6 md:p-8 relative overflow-hidden isolate h-full">

            {/* Subtle Inner Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-50 to-blue-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 -z-10"></div>

            {/* Decorative colored hazes */}
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-medical-200/40 dark:bg-medical-900/20 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none -z-10"></div>
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-purple-200/40 dark:bg-purple-900/20 rounded-full blur-[80px] -ml-20 -mb-20 pointer-events-none -z-10"></div>

            <div className="flex flex-col gap-8 items-center text-center">
              <div className="flex-1 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-medical-50 to-purple-50 dark:from-medical-900/40 dark:to-purple-900/40 border border-medical-100 dark:border-medical-800 text-medical-600 dark:text-medical-300 text-xs font-bold uppercase tracking-wider">
                  <span>🚀</span> New Release
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">
                    MDnexa GPT
                  </h2>
                  <p className="text-lg md:text-xl font-semibold text-medical-600 dark:text-medical-400">
                    Smarter Clinical Support for Physicians
                  </p>
                </div>

                <p className="text-slate-600 dark:text-slate-300 text-base md:text-lg leading-relaxed max-w-3xl font-medium">
                  Your on-call clinical assistant, built to deliver fast, guideline-aligned answers for real-world medicine. From ICD-10 code lookups and drug safety checks to concise explanations of pathophysiology and differential diagnoses, MDnexa GPT helps clinicians make informed decisions with confidence.
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-4 text-sm font-semibold text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <svg className="w-3 h-3 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <span>Built for physicians</span>
                  </div>
                  <div className="hidden sm:block w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <svg className="w-3 h-3 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <span>Powered by evidence</span>
                  </div>
                  <div className="hidden sm:block w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <svg className="w-3 h-3 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <span>Enhanced by MDnexa</span>
                  </div>
                </div>
              </div>

              <div className="flex-shrink-0 w-full lg:w-auto text-center lg:text-right">
                <a
                  href="https://chatgpt.com/g/g-694b1c3b51e48191b0a14a569482abe5-mdnexa-gpt"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full lg:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-bold text-white bg-slate-900 dark:bg-white dark:text-slate-900 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-200 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 transform"
                >
                  Try MDnexa GPT
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                  </svg>
                </a>
                <p className="mt-3 text-xs font-medium text-slate-400 dark:text-slate-500">
                  Integrated with <span className="text-slate-600 dark:text-slate-300 font-bold">MDnexa Dashboard</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Target Audience & Deliverables Section */}
      <section className="py-20 bg-white dark:bg-slate-950 border-y border-slate-100 dark:border-slate-900 relative z-10">
        <div className="max-w-6xl mx-auto px-6">

          {/* Who It Is For */}
          <div className="text-center mb-20">
            <span className="text-sm font-bold text-medical-600 dark:text-medical-400 uppercase tracking-widest mb-6 block">
              Who It Is For
            </span>

            <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-3 text-base md:text-lg font-medium text-slate-600 dark:text-slate-400 mb-10 max-w-4xl mx-auto">
              {[
                "Physicians", "Residents", "Medical Students", "Nurses", "Paramedics", "Allied Health Professionals"
              ].map((role, idx, arr) => (
                <React.Fragment key={role}>
                  <span className="text-slate-900 dark:text-white font-semibold">{role}</span>
                  {idx < arr.length - 1 && <span className="text-slate-300 dark:text-slate-700">•</span>}
                </React.Fragment>
              ))}
            </div>
            <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-3 text-sm md:text-base font-medium text-slate-500 dark:text-slate-500 mb-10 max-w-4xl mx-auto">
              {[
                "Emergency Medicine", "Intensive Care", "Internal Medicine", "Surgery", "Anesthesiology"
              ].map((role, idx, arr) => (
                <React.Fragment key={role}>
                  <span className="">{role}</span>
                  {idx < arr.length - 1 && <span className="text-slate-300 dark:text-slate-700">•</span>}
                </React.Fragment>
              ))}
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-8 md:p-10 border border-slate-100 dark:border-slate-800 max-w-4xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-4">
                Your Everyday Clinical Companion
              </h2>
              <div className="text-lg md:text-xl text-slate-600 dark:text-slate-400 leading-relaxed space-y-4">
                <p>
                  Inspired by the trusted pocket reference books clinicians have carried for decades - now continuously updated, instantly searchable, and able to contextualize information within modern medical practice.
                </p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  MDnexa™ is designed to support professional judgment, not replace it.
                </p>
              </div>
            </div>
          </div>

          {/* What MDnexa Delivers */}
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">What MDnexa Delivers</h2>
              <ul className="space-y-4">
                {[
                  "Structured diagnostic reasoning",
                  "Evidence-based management steps",
                  "Clear pathophysiology explanations",
                  "Dose and regimen adjustments (age, weight, renal/hepatic function)",
                  "Drug interactions and safety alerts",
                  "Local guideline adaptation",
                  "Concise, clinically relevant summaries",
                  "Integrated medical reference tools"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="mt-1 w-5 h-5 rounded-full bg-medical-100 dark:bg-medical-900/30 flex items-center justify-center shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-medical-600 dark:text-medical-400">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-lg text-slate-700 dark:text-slate-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-medical-50 dark:bg-medical-900/10 rounded-3xl transform rotate-3"></div>
              <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 flex flex-col items-center justify-center text-center shadow-xl">
                <div className="w-16 h-16 text-medical-600 mb-4">
                  <Logo className="w-full h-full" />
                </div>
                <div className="h-16 w-full max-w-lg mx-auto flex items-center justify-center">
                  <div className="inline-block text-center min-w-[320px]">
                    <span className="text-xl md:text-2xl text-slate-800 dark:text-slate-200 font-serif italic font-medium inline-block">
                      {typewriterText}
                      <span className="w-0.5 h-6 bg-medical-500 animate-pulse ml-1 inline-block align-middle"></span>
                    </span>
                  </div>
                </div>

              </div>
            </div>
          </div>

          <div className="mt-16 flex justify-center">
            <div className="px-8 py-4 bg-medical-50 dark:bg-medical-900/30 border border-medical-100 dark:border-medical-900/50 rounded-full shadow-sm text-center max-w-3xl">
              <p className="text-sm md:text-lg font-medium text-medical-800 dark:text-medical-200">
                MDnexa is designed to support clinical decision-making, not replace it.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* MDnexa Tools Section */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-end mb-8">
            <div className="text-center md:text-left">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">MDnexa Tools</h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl">
                Specialized clinical utilities integrated directly into your workflow.
              </p>
            </div>
            <button
              onClick={onNavigateToTools}
              className="hidden md:flex items-center gap-2 text-medical-600 dark:text-medical-400 font-bold hover:text-medical-700 dark:hover:text-medical-300 transition-colors"
            >
              View All
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>


          {/* 3D Carousel Container */}
          <div className="relative h-[400px] max-w-4xl mx-auto flex items-center justify-center perspective-1000">

            {/* Left Arrow */}
            <button
              onClick={handlePrevTool}
              className="absolute left-4 md:left-0 z-40 p-3 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-lg hover:bg-medical-50 dark:hover:bg-slate-700 transition-all transform hover:scale-110"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>

            {/* Tools Cycle */}
            <div className="relative w-full h-full flex items-center justify-center">
              {featuredTools.map((tool, index) => {
                const style = getToolStyle(index);
                const position = (index - activeToolIndex + featuredTools.length) % featuredTools.length;

                return (
                  <div
                    key={tool.id}
                    className={style.className}
                    style={{
                      zIndex: style.zIndex,
                      opacity: style.opacity,
                      transform: style.transform,
                      borderColor: position === 0 ? tool.accentColor : undefined,
                    }}
                    onClick={() => {
                      if (position === 0) onNavigateToTools();
                      else {
                        // Clicking a side card rotates it to front
                        const diff = index - activeToolIndex;
                        // Shortest path logic could be added, but setting index works
                        setActiveToolIndex(index);
                      }
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-transform"
                      style={{ backgroundColor: `${tool.accentColor}${bgOpacity}` }}
                    >
                      <img src={tool.iconPath} alt={tool.name} className="w-6 h-6 object-contain dark:brightness-0 dark:invert" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{tool.name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                      {tool.description}
                    </p>

                    {/* Click Hint for Front Card */}
                    {position === 0 && (
                      <div className="mt-4 flex items-center font-bold text-sm" style={{ color: tool.accentColor }}>
                        Try Tool
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Right Arrow */}
            <button
              onClick={handleNextTool}
              className="absolute right-4 md:right-0 z-40 p-3 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-lg hover:bg-medical-50 dark:hover:bg-slate-700 transition-all transform hover:scale-110"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>

          </div>

          {/* Pagination Indicators for completeness */}
          <div className="flex justify-center gap-2 mt-8">
            {featuredTools.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveToolIndex(idx)}
                className={`w-2 h-2 rounded-full transition-all ${idx === activeToolIndex
                  ? 'bg-medical-600 w-8'
                  : 'bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                  }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      < section id="features-grid" className="py-24 bg-slate-50 dark:bg-slate-900/50 relative z-10" >
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {/* Feature 1 */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Localized & guideline-aware</h3>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                Adapts information to local standards of care, drug names, and protocols , with international references when local guidance is unavailable.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 rounded-xl flex items-center justify-center text-purple-600 dark:text-purple-400 mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Built for real workflows</h3>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                Designed for fast use during ward work, on call, exam preparation, and documentation , not long literature searches.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-teal-50 dark:bg-teal-900/20 rounded-xl flex items-center justify-center text-teal-600 dark:text-teal-400 mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Clinically focused AI</h3>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                Structured outputs tuned for medical reasoning, differential diagnosis, dosing decisions, and safety considerations.
              </p>
            </div>
          </div>
        </div>
      </section >

      {/* Footer */}
      < footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-900 py-12" >
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-center md:text-left gap-4">
          <div className="text-sm text-slate-500 dark:text-slate-500">
            © 2025 MDnexa™ | Powered by Trulonis Tech™. All rights reserved.
          </div>
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
            <button onClick={onTerms} className="text-sm text-slate-500 hover:text-medical-600 dark:text-slate-500 dark:hover:text-medical-400 transition-colors">
              Terms of Service
            </button>
            <button onClick={onPrivacy} className="text-sm text-slate-500 hover:text-medical-600 dark:text-slate-500 dark:hover:text-medical-400 transition-colors">
              Privacy Policy
            </button>
            <button onClick={onContact} className="text-sm text-slate-500 hover:text-medical-600 dark:text-slate-500 dark:hover:text-medical-400 transition-colors">
              Contact
            </button>
          </div>
        </div>
      </footer >
    </div >
  );
}
