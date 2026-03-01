import React, { createContext, useContext, useState } from 'react';

export interface Transaction {
  id: string;
  date: string;
  department: string;
  head: string;
  subHead: string;
  actual: number;
  plan: number;
  forecast: number;
}

interface AppContextType {
  companyName: string;
  setCompanyName: (name: string) => void;
  logoUrl: string | null;
  setLogoUrl: (url: string | null) => void;
  transactions: Transaction[];
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, tx: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (id: string) => void;
  renameCategory: (type: 'department' | 'head' | 'subHead', oldName: string, newName: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const generateMockData = (): Transaction[] => {
  const depts = [
    "Procurement", "Production", "Quality Control", "Packaging", 
    "Sales & Distribution", "Marketing", "R&D", "Human Resources", 
    "Finance", "IT & Operations"
  ];
  const heads = ["Raw Materials", "Equipment", "Salaries", "Software", "Logistics", "Advertising"];
  const subHeads = ["Spices", "Machinery", "Bonus", "Cloud", "Transport", "Social Media"];
  
  const data: Transaction[] = [];
  for (let i = 0; i < 50; i++) {
    const actual = Math.floor(Math.random() * 50000000) + 1000000;
    const plan = actual * (1 + (Math.random() * 0.2 - 0.1));
    const forecast = plan * (1 + (Math.random() * 0.15));
    
    data.push({
      id: `tx-${i}`,
      date: new Date(2025, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
      department: depts[Math.floor(Math.random() * depts.length)],
      head: heads[Math.floor(Math.random() * heads.length)],
      subHead: subHeads[Math.floor(Math.random() * subHeads.length)],
      actual,
      plan,
      forecast
    });
  }
  return data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [companyName, setCompanyName] = useState('Global Spices Co.');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>(generateMockData());

  const addTransaction = (tx: Omit<Transaction, 'id'>) => {
    setTransactions(prev => [{ ...tx, id: `tx-${Date.now()}` }, ...prev]);
  };

  const updateTransaction = (id: string, tx: Omit<Transaction, 'id'>) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...tx, id } : t));
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const renameCategory = (type: 'department' | 'head' | 'subHead', oldName: string, newName: string) => {
    setTransactions(prev => prev.map(t => {
      if (t[type] === oldName) {
        return { ...t, [type]: newName };
      }
      return t;
    }));
  };

  return (
    <AppContext.Provider value={{
      companyName, setCompanyName,
      logoUrl, setLogoUrl,
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
