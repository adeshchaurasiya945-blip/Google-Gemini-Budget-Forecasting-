import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAppContext } from '../context/AppContext';
import { Moon, Sun, Upload, Edit2, Check, Maximize, Minimize } from 'lucide-react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  const { companyName, setCompanyName, logoUrl, setLogoUrl } = useAppContext();
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(companyName);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleNameSave = () => {
    setCompanyName(tempName);
    setIsEditingName(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div 
              className="relative group cursor-pointer w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center overflow-hidden border border-orange-200 dark:border-orange-800/50"
              onClick={() => fileInputRef.current?.click()}
            >
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <span className="text-orange-600 dark:text-orange-400 font-bold text-xl">
                  {companyName.charAt(0).toUpperCase()}
                </span>
              )}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Upload className="w-4 h-4 text-white" />
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleLogoUpload} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
            
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="px-2 py-1 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
                />
                <button onClick={handleNameSave} className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded">
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h1 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  {companyName}
                </h1>
                <button 
                  onClick={() => setIsEditingName(true)}
                  className="p-1 text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                  title="Rename Company"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium px-3 py-1 rounded-full bg-blue-100/50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50 hidden sm:block backdrop-blur-sm">
              FY 2026-27 Forecast
            </div>
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
