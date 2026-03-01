import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Transaction {
  id: number;
  date: string;
  department: string;
  head: string;
  subHead: string;
  actual: number;
  plan: number;
  forecast: number;
  created_at: string;
}

export interface Categories {
  departments: string[];
  heads: string[];
  subHeads: string[];
}

interface AppContextType {
  companyName: string;
  setCompanyName: (name: string) => void;
  logoUrl: string | null;
  setLogoUrl: (url: string | null) => void;
  transactions: Transaction[];
  categories: Categories;
  loading: boolean;
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: number, tx: Omit<Transaction, 'id'>) => void; // Changed to number
  deleteTransaction: (id: number) => void; // Changed to number
  renameCategory: (type: 'department' | 'head' | 'subHead', oldName: string, newName: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [companyName, setCompanyName] = useState('Global Spices Co.');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Define categories state
  const [categories, setCategories] = useState<Categories>({
    departments: [],
    heads: [],
    subHeads: []
  });

  // Helper to extract unique categories from transaction data
  const updateCategoriesFromData = (data: Transaction[]) => {
    const depts = Array.from(new Set(data.map(item => item.department))).sort();
    const heads = Array.from(new Set(data.map(item => item.head))).sort();
    const subHeads = Array.from(new Set(data.map(item => item.subHead))).sort();

    setCategories({
      departments: depts,
      heads: heads,
      subHeads: subHeads
    });
  };

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        console.log('🧪 Fetching transactions from Supabase...');
        console.log('Supabase instance:', !!supabase);
        
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .order('date', { ascending: false });
        
        console.log('Response received');
        console.log('Error object:', error);
        console.log('Data received:', data);

        if (error) {
          console.error('❌ Supabase error:', error.message, error.code, error.details);
          alert(`Database error: ${error.message}`);
        } else if (data && data.length > 0) {
          console.log('✅ Successfully fetched', data.length, 'records');
          const txs = data as Transaction[];
          setTransactions(txs);
          updateCategoriesFromData(txs);
        } else if (data) {
          console.log('✅ Query successful but no data returned (empty table)');
          setTransactions([]);
        } else {
          console.warn('⚠️ No data and no error returned');
        }
      } catch (err) {
        console.error('❌ Unexpected error:', err);
        alert(`Unexpected error: ${err}`);
      } finally { 
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

 const addTransaction = async (tx: Omit<Transaction, 'id'>) => {
  try {
    // 1. Ensure numerical values are actually numbers, not strings from input fields
    const formattedTx = {
      ...tx,
      actual: Number(tx.actual),
      plan: Number(tx.plan),
      forecast: Number(tx.forecast),
    };

    const { data, error } = await supabase
      .from('transactions')
      .insert([formattedTx]) // Supabase generates the ID automatically
      .select();

    if (error) {
      console.error('Supabase Insert Error:', error.message);
      alert(`Error: ${error.message}`); // Helpful for immediate debugging
      return;
    }

    if (data) {
      setTransactions(prev => [data[0], ...prev]);
      updateCategoriesFromData([data[0], ...transactions]);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
};

const updateTransaction = async (id: number, tx: Omit<Transaction, 'id'>) => {
  const { error } = await supabase
    .from('transactions')
    .update(tx)
    .eq('id', id);

  if (!error) {
    const updatedTxs = transactions.map(t => (t.id === id ? { ...tx, id } : t));
    setTransactions(updatedTxs);
    updateCategoriesFromData(updatedTxs);
  }
};

const deleteTransaction = async (id: number) => {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);

  if (!error) {
    const updatedTxs = transactions.filter(t => t.id !== id);
    setTransactions(updatedTxs);
    updateCategoriesFromData(updatedTxs);
  }
};

  const renameCategory = (type: 'department' | 'head' | 'subHead', oldName: string, newName: string) => {
    // Note: To persist this in DB, you would need a bulk update query.
    setTransactions(prev => prev.map(t => {
      if (t[type] === oldName) return { ...t, [type]: newName };
      return t;
    }));
  };

  return (
    <AppContext.Provider value={{
      companyName, setCompanyName,
      logoUrl, setLogoUrl,
      transactions, categories, loading, // categories now shared globally
      addTransaction, updateTransaction, deleteTransaction, renameCategory
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