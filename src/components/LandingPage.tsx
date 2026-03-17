import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, PieChart, Target, ArrowRight, Upload, Edit2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export default function LandingPage({ onStart }: { onStart: () => void }) {
  const { companyName, setCompanyName, logo, setLogo } = useAppContext();
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(companyName);

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
      setIsEditingName(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center relative overflow-hidden">
      {/* Header with Logo and Company Name */}
      <div className="absolute top-0 left-0 w-full p-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-orange-900/30 flex items-center justify-center overflow-hidden border border-orange-800/50">
              {logo ? (
                <img src={logo} alt="Company Logo" className="w-full h-full object-cover" />
              ) : (
                <span className="text-orange-400 font-bold text-2xl">
                  {companyName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <label className="absolute -bottom-2 -right-2 p-1.5 bg-slate-800 rounded-full shadow-lg border border-slate-700 cursor-pointer hover:bg-slate-700 transition-colors" title="Upload Logo">
              <Upload className="w-3 h-3 text-slate-400" />
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </label>
          </div>
          
          <div className="flex items-center gap-2">
            {isEditingName ? (
              <form onSubmit={handleNameSubmit} className="flex items-center gap-2">
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="bg-slate-800/50 border border-orange-800/50 rounded px-2 py-1 text-xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-orange-500 w-48"
                  autoFocus
                  onBlur={handleNameSubmit}
                />
              </form>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
                  {companyName}
                </h1>
                <button
                  onClick={() => setIsEditingName(true)}
                  className="p-1.5 rounded-full hover:bg-slate-800/50 transition-colors"
                  title="Edit Company Name"
                >
                  <Edit2 className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-orange-600/20 blur-[120px]" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[40%] rounded-full bg-red-600/20 blur-[120px]" />
      </div>

      <div className="z-10 max-w-4xl mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8">
            <span className="flex h-2 w-2 rounded-full bg-orange-500 animate-pulse"></span>
            <span className="text-sm font-medium text-orange-200">Financial Year 2026-27</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
            Next-Gen Budget <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">
              Forecasting
            </span>
          </h1>
          
          <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            Advanced predictive analytics for the spices industry. Compare 2025-26 performance and accurately forecast your 2026-27 budget with AI-driven insights.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
        >
          {[
            { icon: TrendingUp, title: "Accurate Projections", desc: "Data-driven forecasting models" },
            { icon: PieChart, title: "Department Analysis", desc: "Granular insights across 10 divisions" },
            { icon: Target, title: "Cost Optimization", desc: "AI-powered cost cutting recommendations" }
          ].map((feature, idx) => (
            <div key={idx} className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm text-left">
              <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-400 text-sm">{feature.desc}</p>
            </div>
          ))}
        </motion.div>

        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onStart}
          className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold rounded-full overflow-hidden transition-all hover:shadow-[0_0_40px_rgba(249,115,22,0.4)]"
        >
          <span className="relative z-10 text-lg">Launch Dashboard</span>
          <ArrowRight className="relative z-10 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </motion.button>
      </div>
    </div>
  );
}
