import React, { useState, useMemo } from 'react';
import { useAppContext, Transaction } from '../context/AppContext';
import { Search, Plus, Edit2, Trash2, Filter, ChevronLeft, ChevronRight, X, Save } from 'lucide-react';

export default function AdminPanel() {
  const { transactions, addTransaction, updateTransaction, deleteTransaction } = useAppContext();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [formData, setFormData] = useState<Partial<Transaction>>({});

  const departments = useMemo(() => {
    const depts = new Set(transactions.map(t => t.department));
    return ['All', ...Array.from(depts).sort()];
  }, [transactions]);

  const filteredData = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = 
        t.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.head.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.subHead.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept = selectedDept === 'All' || t.department === selectedDept;
      return matchesSearch && matchesDept;
    });
  }, [transactions, searchQuery, selectedDept]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleOpenModal = (tx?: Transaction) => {
    if (tx) {
      setEditingTx(tx);
      setFormData({ ...tx });
    } else {
      setEditingTx(null);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        department: '',
        head: '',
        subHead: '',
        actual: 0,
        plan: 0,
        forecast: 0
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTx(null);
    setFormData({});
  };

  const handleSave = () => {
    if (!formData.date || !formData.department || !formData.head || !formData.subHead) {
      alert('Please fill in all required text fields.');
      return;
    }

    const txData = {
      date: formData.date,
      department: formData.department,
      head: formData.head,
      subHead: formData.subHead,
      actual: Number(formData.actual) || 0,
      plan: Number(formData.plan) || 0,
      forecast: Number(formData.forecast) || 0
    };

    if (editingTx) {
      updateTransaction(editingTx.id, txData);
    } else {
      addTransaction(txData);
    }
    handleCloseModal();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      deleteTransaction(id);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)]">
      {/* Sidebar */}
      <div className="w-full lg:w-64 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 flex flex-col gap-6 flex-shrink-0">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Database Tables</h2>
          <nav className="space-y-1">
            <button className="w-full flex items-center justify-between px-3 py-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-lg font-medium">
              <span>Transactions</span>
              <span className="bg-orange-100 dark:bg-orange-900/40 py-0.5 px-2 rounded-full text-xs">
                {transactions.length}
              </span>
            </button>
            {/* Future tables can be added here */}
          </nav>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">Filters</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Department</label>
              <select 
                value={selectedDept}
                onChange={(e) => { setSelectedDept(e.target.value); setCurrentPage(1); }}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
              >
                {departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Transactions Data</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage all budget and forecast records</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search records..." 
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
            <button 
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Add Record
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Department</th>
                <th className="px-6 py-4 font-medium">Head</th>
                <th className="px-6 py-4 font-medium">Sub Head</th>
                <th className="px-6 py-4 font-medium text-right">Actual</th>
                <th className="px-6 py-4 font-medium text-right">Plan</th>
                <th className="px-6 py-4 font-medium text-right">Forecast</th>
                <th className="px-6 py-4 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {paginatedData.length > 0 ? (
                paginatedData.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-3 whitespace-nowrap">{tx.date}</td>
                    <td className="px-6 py-3 font-medium text-slate-900 dark:text-white">{tx.department}</td>
                    <td className="px-6 py-3">{tx.head}</td>
                    <td className="px-6 py-3">{tx.subHead}</td>
                    <td className="px-6 py-3 text-right font-mono text-slate-600 dark:text-slate-300">
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(tx.actual)}
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-slate-600 dark:text-slate-300">
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(tx.plan)}
                    </td>
                    <td className="px-6 py-3 text-right font-mono font-medium text-slate-900 dark:text-white">
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(tx.forecast)}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleOpenModal(tx)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(tx.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-md transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    No records found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
            <div className="text-sm text-slate-500">
              Showing <span className="font-medium text-slate-900 dark:text-white">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-slate-900 dark:text-white">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span> of <span className="font-medium text-slate-900 dark:text-white">{filteredData.length}</span> results
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium px-2">
                {currentPage} / {totalPages}
              </span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingTx ? 'Edit Record' : 'Add New Record'}
              </h2>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
                  <input 
                    type="date" 
                    value={formData.date || ''}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Department</label>
                  <input 
                    type="text" 
                    value={formData.department || ''}
                    onChange={e => setFormData({...formData, department: e.target.value})}
                    placeholder="e.g. Sales & Distribution"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Head</label>
                  <input 
                    type="text" 
                    value={formData.head || ''}
                    onChange={e => setFormData({...formData, head: e.target.value})}
                    placeholder="e.g. Logistics"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sub Head</label>
                  <input 
                    type="text" 
                    value={formData.subHead || ''}
                    onChange={e => setFormData({...formData, subHead: e.target.value})}
                    placeholder="e.g. Transport"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
                
                <div className="md:col-span-2 border-t border-slate-200 dark:border-slate-800 pt-4 mt-2">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Financial Data (INR)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Actual (25-26)</label>
                      <input 
                        type="number" 
                        value={formData.actual || ''}
                        onChange={e => setFormData({...formData, actual: Number(e.target.value)})}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Plan (25-26)</label>
                      <input 
                        type="number" 
                        value={formData.plan || ''}
                        onChange={e => setFormData({...formData, plan: Number(e.target.value)})}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Forecast (26-27)</label>
                      <input 
                        type="number" 
                        value={formData.forecast || ''}
                        onChange={e => setFormData({...formData, forecast: Number(e.target.value)})}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
              <button 
                onClick={handleCloseModal}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
