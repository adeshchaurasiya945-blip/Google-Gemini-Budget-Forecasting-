import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { rawCsvData } from '../data/csvData';
import { parseCsvData } from '../utils/parseData';

export interface Transaction {
  id: string;
  date: string;
  department: string;
  head: string;
  subHead: string;
  actual: number;
  forecast: number;
}

interface AppContextType {
  companyName: string;
  setCompanyName: (name: string) => void;
  logo: string | null;
  setLogo: (logo: string | null) => void;
  transactions: Transaction[];
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, tx: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (id: string) => void;
  renameCategory: (type: 'department' | 'head' | 'subHead', oldName: string, newName: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [companyName, setCompanyName] = useState(() => localStorage.getItem('companyName') || 'Global Spices Co.');
  const [logo, setLogo] = useState<string | null>(() => localStorage.getItem('companyLogo'));
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    localStorage.setItem('companyName', companyName);
  }, [companyName]);

  useEffect(() => {
    if (logo) {
      localStorage.setItem('companyLogo', logo);
    } else {
      localStorage.removeItem('companyLogo');
    }
  }, [logo]);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    // Force use of CSV data as requested by user
    const parsedData = parseCsvData(rawCsvData);
    setTransactions(parsedData);
    setIsLoading(false);
    return;
    
    /*
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      // Fallback to CSV data if Supabase is not configured
      const parsedData = parseCsvData(rawCsvData);
      setTransactions(parsedData);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching transactions:', error);
        // Fallback to CSV data on error
        const parsedData = parseCsvData(rawCsvData);
        setTransactions(parsedData);
      } else if (data) {
        if (data.length === 0) {
          // Use CSV data if database is empty
          const parsedData = parseCsvData(rawCsvData);
          setTransactions(parsedData);
        } else {
          setTransactions(data);
        }
      }
    } catch (err: any) {
      console.error('Supabase fetch error:', err);
      // Fallback to CSV data on error
      const parsedData = parseCsvData(rawCsvData);
      setTransactions(parsedData);
    } finally {
      setIsLoading(false);
    }
    */
  };

  const addTransaction = async (tx: Omit<Transaction, 'id'>) => {
    const newTx = { ...tx, id: `tx-${Date.now()}` };
    // Optimistic update
    setTransactions(prev => [newTx, ...prev]);
    
    try {
      const { error } = await supabase.from('transactions').insert([newTx]);
      if (error) {
        console.error('Error adding transaction:', error);
        alert(`Failed to save to database: ${error.message}\n\nPlease check your Supabase setup (Table name, RLS policies, and Environment Variables).`);
      }
    } catch (err: any) {
      console.error('Supabase insert error:', err);
      alert(`Connection error: ${err.message}`);
    }
  };

  const updateTransaction = async (id: string, tx: Omit<Transaction, 'id'>) => {
    // Optimistic update
    setTransactions(prev => prev.map(t => t.id === id ? { ...tx, id } : t));
    
    try {
      const { error } = await supabase.from('transactions').update(tx).eq('id', id);
      if (error) {
        console.error('Error updating transaction:', error);
        alert(`Failed to update database: ${error.message}`);
      }
    } catch (err: any) {
      console.error('Supabase update error:', err);
    }
  };

  const deleteTransaction = async (id: string) => {
    // Optimistic update
    setTransactions(prev => prev.filter(t => t.id !== id));
    
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) {
        console.error('Error deleting transaction:', error);
        alert(`Failed to delete from database: ${error.message}`);
      }
    } catch (err: any) {
      console.error('Supabase delete error:', err);
    }
  };

  const renameCategory = async (type: 'department' | 'head' | 'subHead', oldName: string, newName: string) => {
    // Optimistic update
    setTransactions(prev => prev.map(t => {
      if (t[type] === oldName) {
        return { ...t, [type]: newName };
      }
      return t;
    }));
    
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ [type]: newName })
        .eq(type, oldName);
      if (error) console.error('Error renaming category:', error);
    } catch (err) {
      console.error('Supabase rename error:', err);
    }
  };

  return (
    <AppContext.Provider value={{
      companyName, setCompanyName, logo, setLogo,
      transactions, addTransaction, updateTransaction, deleteTransaction, renameCategory
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
