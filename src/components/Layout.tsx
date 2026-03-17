import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAppContext } from '../context/AppContext';
import { Moon, Sun, Maximize, Minimize, Edit2, Upload, Settings, X } from 'lucide-react';
import { motion } from 'motion/react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  const { companyName, setCompanyName, logo, setLogo } = useAppContext();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tempName, setTempName] = useState(companyName);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    setTempName(companyName);
  }, [companyName]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempName.trim()) {
      setCompanyName(tempName.trim());
      setIsSettingsOpen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen().catch(err => console.error(err));
    } else {
      await document.exitFullscreen().catch(err => console.error(err));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50/50 via-emerald-50/30 to-teal-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Company Settings</h2>
              <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Company Logo</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center overflow-hidden border border-orange-200 dark:border-orange-800/50">
                    {logo ? (
                      <img src={logo} alt="Company Logo" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-orange-600 dark:text-orange-400 font-bold text-2xl">
                        {companyName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <label className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer transition-colors text-sm font-medium border border-slate-200 dark:border-slate-700">
                    <Upload className="w-4 h-4" />
                    Upload New Logo
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </label>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Company Name</label>
                <form onSubmit={handleNameSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                  <button type="submit" className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors">
                    Save
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-50 w-full border-b border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/90 backdrop-blur-xl">
        {/* Animated Spices Background */}
        <div className="absolute inset-0 pointer-events-none opacity-20 dark:opacity-30 flex items-center justify-around overflow-hidden">
          <motion.img 
            src="https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=100&h=100&fit=crop&q=80" 
            alt="Cardamom"
            className="w-12 h-12 rounded-full object-cover mix-blend-multiply dark:mix-blend-screen"
            animate={{ y: [-10, 10, -10], rotate: [0, 10, -10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.img 
            src="https://images.unsplash.com/photo-1509358271058-acd22cc93898?w=100&h=100&fit=crop&q=80" 
            alt="Black Pepper"
            className="w-10 h-10 rounded-full object-cover mix-blend-multiply dark:mix-blend-screen"
            animate={{ y: [10, -10, 10], rotate: [0, -15, 15, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.img 
            src="https://images.unsplash.com/photo-1611078813435-08e8cb2f8f78?w=100&h=100&fit=crop&q=80" 
            alt="Clove"
            className="w-14 h-14 rounded-full object-cover mix-blend-multiply dark:mix-blend-screen"
            animate={{ y: [-5, 15, -5], rotate: [0, 20, -20, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-4 group">
            <div className="relative">
              <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center overflow-hidden border border-orange-200 dark:border-orange-800/50">
                {logo ? (
                  <img src={logo} alt="Company Logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-orange-600 dark:text-orange-400 font-bold text-xl">
                    {companyName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  {companyName}
                </h1>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium px-3 py-1 rounded-full bg-blue-100/50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50 hidden sm:block backdrop-blur-sm">
              FY 2026-27 Forecast
            </div>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-full hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all duration-300"
              title="Company Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-full hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all duration-300"
              title={isFullscreen ? "Exit Fullscreen (ESC)" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all duration-300"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>
      
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
