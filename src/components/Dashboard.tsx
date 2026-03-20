import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { formatCurrency } from '../utils/formatters';
import { motion } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, LabelList,
  PieChart, Pie, Cell, ComposedChart, Area, Line, LineChart
} from 'recharts';
import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';
import { Brain, TrendingUp, TrendingDown, AlertCircle, Plus, Edit, Trash2, ChevronLeft, ChevronRight, ChevronDown, Search, Download, Filter, DollarSign, Target, Activity, ActivitySquare, Camera, PieChart as PieChartIcon, Info, HelpCircle, Upload, X } from 'lucide-react';

const DEPARTMENTS = [
  "All",
  "Quality", "Procurement", "Production", "Operations", 
  "Documents", "Accounts", "Sales", "Admin", 
  "HR", "MDO"
];

const FormulaPopup = ({ title, formula, explanation, example }: { title: string, formula: string, explanation: string, example?: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block ml-2" ref={popupRef}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[9px] font-bold text-slate-500 dark:text-slate-400 hover:bg-orange-100 hover:text-orange-600 dark:hover:bg-orange-900/50 dark:hover:text-orange-400 transition-colors z-10"
        title="Show Formula & Explanation"
      >
        F=
      </button>
      
      {isOpen && (
        <div className="absolute right-0 sm:left-0 sm:right-auto top-full mt-2 w-64 p-3 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50 animate-in fade-in slide-in-from-top-2">
          <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1">{title}</h4>
          <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-100 dark:border-slate-700 mb-2">
            <code className="text-[10px] text-orange-600 dark:text-orange-400 font-mono break-words">{formula}</code>
          </div>
          <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">
            {explanation}
          </p>
          {example && (
            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
              <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Example</span>
              <p className="text-[10px] text-slate-700 dark:text-slate-300 font-mono mt-1">{example}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function Dashboard() {
  const { transactions, addTransaction, updateTransaction, deleteTransaction, renameCategory, sales, setSales, monthlySales, setMonthlySales, saveSalesSettings, companyName, setCompanyName, logo, setLogo, isSettingsOpen, setIsSettingsOpen } = useAppContext();
  const [selectedDept, setSelectedDept] = useState("All");
  const [selectedHead, setSelectedHead] = useState("All");
  const [selectedSubHead, setSelectedSubHead] = useState("All");
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [datePreset, setDatePreset] = useState("Custom");
  const [showFormulas, setShowFormulas] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [barChartMetric, setBarChartMetric] = useState<'all' | 'actual_vs_forecast'>('all');
  const [pieChartMetric, setPieChartMetric] = useState<'actual' | 'forecast'>('forecast');
  
  const [forecastAdjustments, setForecastAdjustments] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('forecastAdjustments');
    return saved ? JSON.parse(saved) : {};
  });
  const [varianceSearchQuery, setVarianceSearchQuery] = useState("");
  const [budgetComparisonMetric, setBudgetComparisonMetric] = useState('actual');
  const [budgetComparisonView, setBudgetComparisonView] = useState('department'); // 'department' or 'month'

  useEffect(() => {
    localStorage.setItem('forecastAdjustments', JSON.stringify(forecastAdjustments));
  }, [forecastAdjustments]);

  const [targetCostPct, setTargetCostPct] = useState<number>(() => {
    const saved = localStorage.getItem('targetCostPct');
    return saved ? Number(saved) : 50;
  });

  useEffect(() => {
    localStorage.setItem('targetCostPct', targetCostPct.toString());
  }, [targetCostPct]);

  const totalActualSales = useMemo(() => Object.values(monthlySales).reduce((a: number, b: number) => a + b, 0), [monthlySales]);

  // Dynamic Departments based on transactions
  const dynamicDepartments = useMemo(() => {
    const depts = new Set(transactions.map(t => t.department));
    DEPARTMENTS.forEach(d => {
      if (d !== "All") depts.add(d);
    });
    return ["All", ...Array.from(depts)];
  }, [transactions]);

  const dynamicHeads = useMemo(() => Array.from(new Set(transactions.map(t => t.head))), [transactions]);
  const dynamicSubHeads = useMemo(() => Array.from(new Set(transactions.map(t => t.subHead))), [transactions]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Form State
  type FormRowType = {
    id: string;
    date: string;
    departments: string[];
    head: string;
    subHead: string;
    actual: number;
    forecast: number;
    isNewDept: boolean;
    isNewHead: boolean;
    isNewSubHead: boolean;
    renamingField: 'department' | 'head' | 'subHead' | null;
    renameValue: string;
  };

  const defaultRow = (): FormRowType => ({
    id: Math.random().toString(36).substr(2, 9),
    date: new Date().toISOString().slice(0, 7),
    departments: [DEPARTMENTS[1]],
    head: '',
    subHead: '',
    actual: 0,
    forecast: 0,
    isNewDept: false,
    isNewHead: false,
    isNewSubHead: false,
    renamingField: null,
    renameValue: ''
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formRows, setFormRows] = useState<FormRowType[]>([defaultRow()]);

  const updateRow = (index: number, updates: Partial<FormRowType>) => {
    setFormRows(prev => {
      const newRows = [...prev];
      newRows[index] = { ...newRows[index], ...updates };
      return newRows;
    });
  };

  const addRow = () => {
    setFormRows(prev => [...prev, defaultRow()]);
  };

  const removeRow = (index: number) => {
    setFormRows(prev => prev.filter((_, i) => i !== index));
  };

  const handlePresetChange = (preset: string) => {
    setDatePreset(preset);
    const today = new Date();
    let start = '';
    let end = '';
    
    if (preset === 'This Month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    } else if (preset === 'Last Quarter') {
      const currentQuarter = Math.floor(today.getMonth() / 3);
      const lastQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1;
      const year = currentQuarter === 0 ? today.getFullYear() - 1 : today.getFullYear();
      start = new Date(year, lastQuarter * 3, 1).toISOString().split('T')[0];
      end = new Date(year, lastQuarter * 3 + 3, 0).toISOString().split('T')[0];
    } else if (preset === 'Year to Date') {
      start = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
      end = today.toISOString().split('T')[0];
    } else if (preset === 'All Time') {
      start = '';
      end = '';
    }
    
    if (preset !== 'Custom') {
      setDateRange({ start, end });
      setCurrentPage(1);
    }
  };

  // Apply adjustments to create adjustedTransactions
  const adjustedTransactions = useMemo(() => {
    return transactions.map(t => {
      let adj = 0;
      if (forecastAdjustments[t.subHead] !== undefined) {
        adj = forecastAdjustments[t.subHead];
      } else if (forecastAdjustments[t.head] !== undefined) {
        adj = forecastAdjustments[t.head];
      } else if (forecastAdjustments[t.department] !== undefined) {
        adj = forecastAdjustments[t.department];
      }
      
      return {
        ...t,
        originalForecast: t.forecast,
        forecast: t.forecast * (1 + adj / 100)
      };
    });
  }, [transactions, forecastAdjustments]);

  // Filtering
  const filteredTransactions = useMemo(() => {
    return adjustedTransactions.filter(t => {
      const matchDept = selectedDept === "All" || t.department === selectedDept;
      const matchHead = selectedHead === "All" || t.head === selectedHead;
      const matchSubHead = selectedSubHead === "All" || t.subHead === selectedSubHead;
      const matchStart = !dateRange.start || t.date >= dateRange.start;
      const matchEnd = !dateRange.end || t.date <= dateRange.end;

      return matchDept && matchHead && matchSubHead && matchStart && matchEnd;
    });
  }, [adjustedTransactions, selectedDept, selectedHead, selectedSubHead, dateRange]);

  const searchedTransactions = useMemo(() => {
    const searchLower = searchQuery.toLowerCase();
    return filteredTransactions.filter(t => {
      if (!searchQuery) return true;
      return t.department.toLowerCase().includes(searchLower) ||
             t.head.toLowerCase().includes(searchLower) ||
             t.subHead.toLowerCase().includes(searchLower);
    });
  }, [filteredTransactions, searchQuery]);

  // Dynamic labels based on filter level
  const getLevelLabel = () => {
    if (selectedSubHead !== "All") return `in ${selectedSubHead}`;
    if (selectedHead !== "All") return `in ${selectedHead}`;
    if (selectedDept !== "All") return `in ${selectedDept}`;
    return 'by Department';
  };

  const getColumnLabel = () => {
    if (selectedHead !== "All") return "Sub Head";
    if (selectedDept !== "All") return "Head";
    return "Department";
  };

  // Chart Data: Top Expenses by current filter level
  const chartData = useMemo(() => {
    let groupBy: 'department' | 'head' | 'subHead' = 'department';
    if (selectedHead !== "All") groupBy = 'subHead';
    else if (selectedDept !== "All") groupBy = 'head';

    const grouped = filteredTransactions.reduce((acc, curr) => {
      const key = curr[groupBy];
      if (!acc[key]) acc[key] = { actual: 0, forecast: 0, originalForecast: 0 };
      acc[key].actual += curr.actual;
      acc[key].forecast += curr.forecast;
      acc[key].originalForecast += curr.originalForecast || curr.forecast;
      return acc;
    }, {} as Record<string, { actual: number, forecast: number, originalForecast: number }>);
    
    return Object.entries(grouped)
      .map(([name, values]: [string, any]) => {
        return { 
          name, 
          actual: values.actual, 
          forecast: values.forecast,
          originalForecast: values.originalForecast
        };
      })
      .sort((a, b) => b.actual - a.actual);
  }, [filteredTransactions, selectedDept, selectedHead]);

  // Variance Tree Data
  const varianceTree = useMemo(() => {
    interface VarianceNode {
      id: string;
      name: string;
      level: 'department' | 'head' | 'subHead';
      actual: number;
      originalForecast: number;
      forecast: number;
      children?: VarianceNode[];
    }
    
    const tree: VarianceNode[] = [];
    const deptMap = new Map<string, VarianceNode>();
    const headMap = new Map<string, VarianceNode>();
    
    // Filter transactions based on date and search query, but NOT department/head filters
    // so the tree always shows the full hierarchy unless searched
    const searchLower = varianceSearchQuery.toLowerCase();
    const treeTransactions = adjustedTransactions.filter(t => {
      const matchStart = !dateRange.start || t.date >= dateRange.start;
      const matchEnd = !dateRange.end || t.date <= dateRange.end;
      const matchSearch = !varianceSearchQuery || 
             t.department.toLowerCase().includes(searchLower) ||
             t.head.toLowerCase().includes(searchLower) ||
             t.subHead.toLowerCase().includes(searchLower);
      return matchStart && matchEnd && matchSearch;
    });
    
    treeTransactions.forEach(t => {
      // Department level
      let deptNode = deptMap.get(t.department);
      if (!deptNode) {
        deptNode = {
          id: `dept-${t.department}`,
          name: t.department,
          level: 'department',
          actual: 0,
          originalForecast: 0,
          forecast: 0,
          children: []
        };
        deptMap.set(t.department, deptNode);
        tree.push(deptNode);
      }
      deptNode.actual += t.actual;
      deptNode.originalForecast += t.originalForecast || t.forecast;
      deptNode.forecast += t.forecast;
      
      // Head level
      const headId = `head-${t.department}-${t.head}`;
      let headNode = headMap.get(headId);
      if (!headNode) {
        headNode = {
          id: headId,
          name: t.head,
          level: 'head',
          actual: 0,
          originalForecast: 0,
          forecast: 0,
          children: []
        };
        headMap.set(headId, headNode);
        deptNode.children!.push(headNode);
      }
      headNode.actual += t.actual;
      headNode.originalForecast += t.originalForecast || t.forecast;
      headNode.forecast += t.forecast;
      
      // SubHead level
      let subHeadNode = headNode.children!.find(c => c.name === t.subHead);
      if (!subHeadNode) {
        subHeadNode = {
          id: `sub-${t.department}-${t.head}-${t.subHead}`,
          name: t.subHead,
          level: 'subHead',
          actual: 0,
          originalForecast: 0,
          forecast: 0
        };
        headNode.children!.push(subHeadNode);
      }
      subHeadNode.actual += t.actual;
      subHeadNode.originalForecast += t.originalForecast || t.forecast;
      subHeadNode.forecast += t.forecast;
    });
    
    // Sort tree by actual descending
    tree.sort((a, b) => b.actual - a.actual);
    tree.forEach(d => {
      d.children?.sort((a, b) => b.actual - a.actual);
      d.children?.forEach(h => {
        h.children?.sort((a, b) => b.actual - a.actual);
      });
    });
    
    return tree;
  }, [adjustedTransactions, dateRange, varianceSearchQuery]);

  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  
  const toggleNode = (id: string) => {
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Aggregations
  const totals = useMemo(() => {
    return chartData.reduce((acc, curr) => ({
      actual: acc.actual + curr.actual,
      forecast: acc.forecast + curr.forecast
    }), { actual: 0, forecast: 0 });
  }, [chartData]);

  const variance = totals.forecast - totals.actual;
  const variancePercent = totals.actual > 0 ? (variance / totals.actual) * 100 : 0;

  // New KPIs
  const avgMonthlyExpense = totals.actual / 12;
  const totalCompanyExpense = useMemo(() => transactions.reduce((sum, t) => sum + t.actual, 0), [transactions]);
  const deptExpenseShare = totalCompanyExpense > 0 ? (totals.actual / totalCompanyExpense) * 100 : 0;
  const salesToDeptRatio = totals.actual > 0 ? (totalActualSales / totals.actual) : 0;
  const forecastExpenseToSalesRatio = sales.forecast > 0 ? (totals.forecast / sales.forecast) * 100 : 0;
  
  const { fixedCost, variableCost } = useMemo(() => {
    const fixedKeywords = ['salaries', 'rent', 'amc', 'insurance', 'fixed', 'wages', 'personnel', 'benefits'];
    const fixed = filteredTransactions.reduce((sum, t) => {
      const isFixed = fixedKeywords.some(k => 
        t.subHead.toLowerCase().includes(k) || 
        t.head.toLowerCase().includes(k)
      );
      return sum + (isFixed ? t.actual : 0);
    }, 0);
    return { fixedCost: fixed, variableCost: totals.actual - fixed };
  }, [filteredTransactions, totals.actual]);

  const fixedCostPercent = totals.actual > 0 ? (fixedCost / totals.actual) * 100 : 0;
  const variableCostPercent = totals.actual > 0 ? (variableCost / totals.actual) * 100 : 0;

  const monthWiseData = useMemo(() => {
    const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
    const data = months.map(month => ({ name: month, actual: 0, forecast: 0 }));
    
    filteredTransactions.forEach(t => {
      if (t.date) {
        const dateObj = new Date(t.date);
        const monthIndex = dateObj.getMonth(); // 0-11
        // Map 0-11 (Jan-Dec) to our financial year array (Apr-Mar)
        // Jan (0) -> index 9
        // Feb (1) -> index 10
        // Mar (2) -> index 11
        // Apr (3) -> index 0
        const fyIndex = monthIndex >= 3 ? monthIndex - 3 : monthIndex + 9;
        if (fyIndex >= 0 && fyIndex < 12) {
          data[fyIndex].actual += t.actual;
          data[fyIndex].forecast += t.forecast;
        }
      }
    });
    
    return data;
  }, [filteredTransactions]);

  const budgetComparisonData = budgetComparisonView === 'department' ? chartData.slice(0, 10) : monthWiseData;

  // Pie Chart Data: Distribution of Forecast by current filter level
  const pieChartData = useMemo(() => {
    return chartData
      .map(d => ({ name: d.name, value: pieChartMetric === 'actual' ? d.actual : d.forecast }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [chartData, pieChartMetric]);

  const headShareData = useMemo(() => {
    const headTotals = filteredTransactions.reduce((acc, curr) => {
      const key = curr.head;
      if (!acc[key]) acc[key] = 0;
      
      let val = curr[pieChartMetric];
      if (pieChartMetric === 'forecast') {
        const adj = forecastAdjustments[key] || 0;
        val = val * (1 + adj / 100);
      }
      acc[key] += val;
      return acc;
    }, {} as Record<string, number>);
    
    const total = (Object.values(headTotals) as number[]).reduce((sum: number, val: number) => sum + val, 0);
    
    return Object.entries(headTotals)
      .map(([name, value]) => ({ 
        name, 
        value: Number(value),
        percent: (total as number) > 0 ? (Number(value) / (total as number)) * 100 : 0
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTransactions, pieChartMetric, forecastAdjustments]);

  const COLORS = ['#3B82F6', '#8B5CF6', '#F97316', '#10B981', '#EF4444', '#F59E0B', '#6366F1', '#EC4899', '#14B8A6', '#84CC16'];

  // Pagination Logic
  const totalPages = Math.ceil(searchedTransactions.length / itemsPerPage);
  const paginatedTransactions = searchedTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const exportToCSV = () => {
    const headers = ["Date", "Department", "Head", "Sub Head", "Actual (25-26)", "Forecast (26-27)"];
    const csvData = searchedTransactions.map(t => [
      t.date,
      t.department,
      t.head,
      t.subHead,
      t.actual,
      t.forecast
    ]);
    
    const csvContent = [
      headers.join(","),
      ...csvData.map(row => row.join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "transactions_export.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredChartData = useMemo(() => {
    if (!varianceSearchQuery) return chartData;
    const lower = varianceSearchQuery.toLowerCase();
    return chartData.filter(item => item.name.toLowerCase().includes(lower));
  }, [chartData, varianceSearchQuery]);

  const renderVarianceRow = (node: any, depth: number) => {
    const variance = node.forecast - node.actual;
    const variancePercent = node.actual > 0 ? (variance / node.actual) * 100 : 0;
    const isOverBudget = variance > 0;
    const isExpanded = expandedNodes[node.id];
    const hasChildren = node.children && node.children.length > 0;
    
    return (
      <React.Fragment key={node.id}>
        <tr className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${depth === 0 ? 'bg-white dark:bg-slate-900' : depth === 1 ? 'bg-slate-50/30 dark:bg-slate-800/30' : 'bg-slate-100/30 dark:bg-slate-700/30'}`}>
          <td 
            className={`px-6 py-4 font-medium text-slate-900 dark:text-white ${hasChildren ? 'cursor-pointer select-none' : ''}`}
            onClick={() => hasChildren && toggleNode(node.id)}
          >
            <div className="flex items-center" style={{ paddingLeft: `${depth * 1.5}rem` }}>
              {hasChildren ? (
                <div className="mr-2 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700">
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
              ) : (
                <span className="w-6 mr-2 inline-block"></span>
              )}
              {node.name}
            </div>
          </td>
          <td className="px-6 py-4 text-right font-mono text-slate-500">{formatCurrency(node.actual)}</td>
          <td className="px-6 py-4 text-right font-mono font-medium text-slate-900 dark:text-white">
            <div className="flex items-center justify-end gap-1">
              <input 
                type="number" 
                value={forecastAdjustments[node.name] !== undefined ? forecastAdjustments[node.name] : ''}
                placeholder="0"
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : undefined;
                  setForecastAdjustments(prev => {
                    const next = { ...prev };
                    if (val === undefined) {
                      delete next[node.name];
                    } else {
                      next[node.name] = val;
                    }
                    return next;
                  });
                }}
                className="w-16 text-right bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1 focus:ring-orange-500 focus:border-orange-500"
              />
              <span className="text-slate-500">%</span>
            </div>
          </td>
          <td className="px-6 py-4 text-right font-mono font-medium text-slate-900 dark:text-white">
            <input 
              type="number" 
              value={node.forecast.toFixed(0)}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : 0;
                const newAdj = node.originalForecast > 0 ? ((val - node.originalForecast) / node.originalForecast) * 100 : 0;
                setForecastAdjustments(prev => ({ ...prev, [node.name]: newAdj }));
              }}
              className="w-32 text-right bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1 focus:ring-orange-500 focus:border-orange-500 ml-auto"
            />
          </td>
          <td className="px-6 py-4 text-right font-mono">
            <div className={`flex items-center justify-end gap-1 ${isOverBudget ? 'text-red-500' : 'text-green-500'}`}>
              {isOverBudget ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {formatCurrency(Math.abs(variance))}
            </div>
          </td>
          <td className="px-6 py-4 text-right font-mono">
            <div className={`flex items-center justify-end gap-1 ${isOverBudget ? 'text-red-500' : 'text-green-500'}`}>
              {Math.abs(variancePercent).toFixed(0)}%
            </div>
          </td>
          <td className="px-6 py-4 text-center">
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
              isOverBudget 
                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' 
                : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
            }`}>
              {isOverBudget ? 'Optimization Required' : 'Optimal Efficiency'}
            </span>
          </td>
        </tr>
        {isExpanded && node.children && node.children.map((child: any) => renderVarianceRow(child, depth + 1))}
      </React.Fragment>
    );
  };

  const exportVarianceToCSV = () => {
    const headers = ["Level", "Name", "Actual (25-26)", "Adj %", "Forecast (26-27)", "Variances", "Variances %", "Status"];
    
    const flattenTree = (nodes: any[], depth: number = 0): any[] => {
      let result: any[] = [];
      nodes.forEach(node => {
        const variance = node.forecast - node.actual;
        const variancePercent = node.actual > 0 ? (variance / node.actual) * 100 : 0;
        const status = variance > 0 ? 'Optimization Required' : 'Optimal Efficiency';
        const adj = forecastAdjustments[node.name] || 0;
        
        result.push([
          node.level,
          node.name,
          node.actual.toFixed(2),
          adj.toFixed(2) + '%',
          node.forecast.toFixed(2),
          variance.toFixed(2),
          variancePercent.toFixed(2) + '%',
          status
        ]);
        
        if (node.children && node.children.length > 0) {
          result = result.concat(flattenTree(node.children, depth + 1));
        }
      });
      return result;
    };
    
    const csvData = flattenTree(varianceTree);
    
    const csvContent = [
      headers.join(","),
      ...csvData.map(row => row.join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "variance_analysis_export.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRenameSubmit = (rowIndex: number, type: 'department' | 'head' | 'subHead') => {
    const row = formRows[rowIndex];
    if (row.renameValue.trim()) {
      const oldName = type === 'department' ? row.departments[0] : row[type as keyof FormRowType] as string;
      renameCategory(type, oldName, row.renameValue.trim());
      
      setFormRows(prev => prev.map((r, i) => {
        const updated = { ...r };
        if (type === 'department' && r.departments.includes(oldName)) {
           updated.departments = r.departments.map(d => d === oldName ? row.renameValue.trim() : d);
        } else if (r[type as keyof FormRowType] === oldName) {
           (updated as any)[type] = row.renameValue.trim();
        }
        if (i === rowIndex) {
           updated.renamingField = null;
        }
        return updated;
      }));
    } else {
      updateRow(rowIndex, { renamingField: null });
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    for (const row of formRows) {
      if (row.departments.length === 0) {
        alert("Please select at least one department in all rows.");
        return;
      }
    }
    
    if (editingId) {
      const row = formRows[0];
      let finalDate = row.date;
      if (finalDate.length === 7) finalDate += '-01';
      
      updateTransaction(editingId, {
        date: finalDate,
        department: row.departments[0],
        head: row.head,
        subHead: row.subHead,
        actual: row.actual,
        forecast: row.forecast
      });
    } else {
      formRows.forEach(row => {
        let finalDate = row.date;
        if (finalDate.length === 7) finalDate += '-01';
        
        row.departments.forEach(dept => {
          addTransaction({
            date: finalDate,
            department: dept,
            head: row.head,
            subHead: row.subHead,
            actual: row.actual,
            forecast: row.forecast
          });
        });
      });
    }
    
    setIsFormOpen(false);
    setEditingId(null);
    setFormRows([defaultRow()]);
  };

  const openEdit = (tx: any) => {
    setFormRows([{
      id: tx.id,
      date: tx.date.slice(0, 7),
      departments: [tx.department],
      head: tx.head,
      subHead: tx.subHead,
      actual: tx.actual,
      forecast: tx.forecast,
      isNewDept: false,
      isNewHead: false,
      isNewSubHead: false,
      renamingField: null,
      renameValue: ''
    }]);
    setEditingId(tx.id);
    setIsFormOpen(true);
  };

  const handleSnapshot = async () => {
    const element = document.getElementById('dashboard-content');
    if (!element) return;
    
    try {
      const imgData = await htmlToImage.toPng(element, { quality: 0.95, backgroundColor: '#ffffff' });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      
      // We need to get the image dimensions to calculate the height properly
      const img = new Image();
      img.src = imgData;
      img.onload = () => {
        const pdfHeight = (img.height * pdfWidth) / img.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save('dashboard-snapshot.pdf');
      };
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  return (
    <div id="dashboard-content" className="space-y-8">
      {/* Formula Bar Toggle & Snapshot */}
      <div className="flex justify-end gap-3">
        <button 
          onClick={handleSnapshot}
          className="flex items-center gap-2 text-sm font-medium text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-300 bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20 dark:hover:bg-orange-900/40 px-4 py-2 rounded-lg transition-colors"
        >
          <Camera className="w-4 h-4" />
          Snapshot
        </button>
        <button 
          onClick={() => setShowFormulas(!showFormulas)}
          className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 px-4 py-2 rounded-lg transition-colors"
        >
          <AlertCircle className="w-4 h-4" />
          {showFormulas ? 'Hide Formulas' : 'Show Formulas'}
        </button>
      </div>

      {/* Formula Bar */}
      {showFormulas && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl p-6 rounded-2xl border border-emerald-200/50 dark:border-emerald-800/30 shadow-xl mb-6"
        >
          <div className="flex items-center gap-3 mb-6 border-b border-emerald-100 dark:border-emerald-900/30 pb-4">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <Brain className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Financial Intelligence Guide</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Strategic insights and logic behind the dashboard metrics</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold">
                <TrendingUp className="w-4 h-4" />
                <span>Growth Dynamics</span>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1 text-sm">Sales & Expense Growth</h3>
                <div className="bg-slate-50/80 dark:bg-slate-800/50 p-3 rounded-lg font-mono text-[11px] mb-2 border border-blue-100 dark:border-blue-900/20">
                  Growth % = ((Forecast - Actual) / Actual) * 100
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  <span className="font-bold text-blue-600 dark:text-blue-400">Strategic Impact:</span> Measures the velocity of business expansion vs operational scaling. Ideal state is Sales Growth &gt; Expense Growth.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold">
                <ActivitySquare className="w-4 h-4" />
                <span>Efficiency Ratios</span>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1 text-sm">Expense to Sales Ratio</h3>
                <div className="bg-slate-50/80 dark:bg-slate-800/50 p-3 rounded-lg font-mono text-[11px] mb-2 border border-purple-100 dark:border-purple-900/20">
                  Ratio % = (Total Expenses / Total Sales) * 100
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  <span className="font-bold text-purple-600 dark:text-purple-400">Strategic Impact:</span> Benchmarks operational efficiency. A declining ratio indicates positive operating leverage.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                <Target className="w-4 h-4" />
                <span>Target Planning</span>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1 text-sm">Required Sales ({targetCostPct}% Floor)</h3>
                <div className="bg-slate-50/80 dark:bg-slate-800/50 p-3 rounded-lg font-mono text-[11px] mb-2 border border-emerald-100 dark:border-emerald-900/20">
                  Target = Forecast Expenses / {(targetCostPct / 100).toFixed(2)}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">Strategic Impact:</span> Defines the minimum revenue required to maintain a {targetCostPct}% gross margin target based on current cost structure.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold">
                <PieChartIcon className="w-4 h-4" />
                <span>Allocation Analysis</span>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1 text-sm">Department Share</h3>
                <div className="bg-slate-50/80 dark:bg-slate-800/50 p-3 rounded-lg font-mono text-[11px] mb-2 border border-indigo-100 dark:border-indigo-900/20">
                  Share % = (Dept Expense / Total Expense) * 100
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">Strategic Impact:</span> Identifies where capital is being deployed. Helps in re-allocating resources to high-ROI departments.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold">
                <AlertCircle className="w-4 h-4" />
                <span>Variance Tracking</span>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1 text-sm">Budget Variance</h3>
                <div className="bg-slate-50/80 dark:bg-slate-800/50 p-3 rounded-lg font-mono text-[11px] mb-2 border border-red-100 dark:border-red-900/20">
                  Variance = Forecast - Actual
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  <span className="font-bold text-red-600 dark:text-red-400">Strategic Impact:</span> Measures fiscal discipline. Significant positive variance requires immediate review of cost drivers.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                <DollarSign className="w-4 h-4" />
                <span>Profitability</span>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1 text-sm">EBITDA / Net Profit</h3>
                <div className="bg-slate-50/80 dark:bg-slate-800/50 p-3 rounded-lg font-mono text-[11px] mb-2 border border-emerald-100 dark:border-emerald-900/20">
                  Profit = Forecasted Sales - Forecasted Expenses
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">Strategic Impact:</span> The ultimate measure of business health. Shows the projected bottom line after all operational costs are deducted from expected revenue.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-bold">
                <Activity className="w-4 h-4" />
                <span>Forecast Calculation</span>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1 text-sm">How Forecasts are Derived</h3>
                <div className="bg-slate-50/80 dark:bg-slate-800/50 p-3 rounded-lg font-mono text-[11px] mb-2 border border-orange-100 dark:border-orange-900/20">
                  Forecast = Actual + Manual Adjustment
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  <span className="font-bold text-orange-600 dark:text-orange-400">Strategic Impact:</span> Forecasts are initially based on historical actuals. Directors can manually override these in the "Variance Analysis" table below to simulate different scenarios.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 font-bold">
                <Filter className="w-4 h-4" />
                <span>Filter & Linkage Guide</span>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1 text-sm">How Filters Affect Data</h3>
                <div className="bg-slate-50/80 dark:bg-slate-800/50 p-3 rounded-lg font-mono text-[11px] mb-2 border border-teal-100 dark:border-teal-900/20">
                  Global Filters → KPIs & Charts
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  <span className="font-bold text-teal-600 dark:text-teal-400">Strategic Impact:</span> Selecting a Department, Head, or Sub-Head in the left panel instantly recalculates ALL KPIs, Pie Charts, and Trend lines to reflect only that specific segment's data.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800/50">
            <p className="text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <Info className="w-4 h-4" />
              <strong>Director's Insight:</strong> This guide helps you understand the mathematical foundation of the dashboard. Use these metrics to drive data-backed strategic discussions during board meetings.
            </p>
          </div>
        </motion.div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Sidebar for Filters */}
        <div className="w-full lg:w-64 flex-shrink-0">
          <div className="bg-slate-900 dark:bg-slate-950 p-5 rounded-2xl shadow-lg flex flex-col gap-5 sticky top-4 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <Filter className="w-5 h-5 text-orange-500" />
                Control Panel
              </h3>
              <div className="group relative">
                <Info className="w-4 h-4 text-slate-400 cursor-help" />
                <div className="absolute left-full ml-2 top-0 w-56 p-3 bg-slate-800 text-white text-[10px] rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none border border-slate-700 leading-relaxed">
                  <p className="font-bold text-orange-400 mb-1">Executive Guidance:</p>
                  Use these filters to isolate specific business units. All charts and KPIs will dynamically re-calculate based on your selection.
                </div>
              </div>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-tight">1. Department</label>
                <div className="group relative">
                  <HelpCircle className="w-3 h-3 text-slate-500 cursor-help" />
                  <div className="absolute left-full ml-2 top-0 w-40 p-2 bg-slate-800 text-[9px] rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none border border-slate-700">
                    Broadest level. Affects all high-level KPIs and allocation charts.
                  </div>
                </div>
              </div>
              <select 
                value={selectedDept}
                onChange={(e) => {
                  setSelectedDept(e.target.value);
                  setSelectedHead("All");
                  setSelectedSubHead("All");
                  setCurrentPage(1);
                }}
                className="bg-slate-800 border-none text-white text-sm rounded-lg focus:ring-2 focus:ring-orange-500 block w-full p-2.5 transition-all"
              >
                {dynamicDepartments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-tight">2. Expense Head</label>
                <div className="group relative">
                  <HelpCircle className="w-3 h-3 text-slate-500 cursor-help" />
                  <div className="absolute left-full ml-2 top-0 w-40 p-2 bg-slate-800 text-[9px] rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none border border-slate-700">
                    Drill down into specific cost categories within the department.
                  </div>
                </div>
              </div>
              <select 
                value={selectedHead}
                onChange={(e) => {
                  setSelectedHead(e.target.value);
                  setSelectedSubHead("All");
                  setCurrentPage(1);
                }}
                className="bg-slate-800 border-none text-white text-sm rounded-lg focus:ring-2 focus:ring-blue-500 block w-full p-2.5 transition-all"
              >
                <option value="All">All Categories</option>
                {Array.from(new Set(transactions.filter(t => selectedDept === "All" || t.department === selectedDept).map(t => t.head))).map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-tight">3. Sub-Head</label>
                <div className="group relative">
                  <HelpCircle className="w-3 h-3 text-slate-500 cursor-help" />
                  <div className="absolute left-full ml-2 top-0 w-40 p-2 bg-slate-800 text-[9px] rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none border border-slate-700">
                    Granular analysis. Best for identifying specific line-item variances.
                  </div>
                </div>
              </div>
              <select 
                value={selectedSubHead}
                onChange={(e) => {
                  setSelectedSubHead(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-800 border-none text-white text-sm rounded-lg focus:ring-2 focus:ring-emerald-500 block w-full p-2.5 transition-all"
              >
                <option value="All">All Line Items</option>
                {Array.from(new Set(transactions.filter(t => (selectedDept === "All" || t.department === selectedDept) && (selectedHead === "All" || t.head === selectedHead)).map(t => t.subHead))).map(sh => <option key={sh} value={sh}>{sh}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-tight">4. Time Period</label>
                <div className="group relative">
                  <HelpCircle className="w-3 h-3 text-slate-500 cursor-help" />
                  <div className="absolute left-full ml-2 top-0 w-40 p-2 bg-slate-800 text-[9px] rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none border border-slate-700">
                    Analyze trends over specific durations.
                  </div>
                </div>
              </div>
              <select 
                value={datePreset}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="bg-slate-800 border-none text-white text-sm rounded-lg focus:ring-2 focus:ring-purple-500 block w-full p-2.5 transition-all"
              >
                <option value="All Time">Full Fiscal Year</option>
                <option value="This Month">Current Month</option>
                <option value="Last Quarter">Previous Quarter</option>
                <option value="Year to Date">Year to Date (YTD)</option>
                <option value="Custom">Custom Range</option>
              </select>
            </div>

            {datePreset === "Custom" && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-medium text-slate-500 uppercase">Start Date</label>
                  <input 
                    type="date" 
                    value={dateRange.start}
                    onChange={(e) => {
                      setDateRange(prev => ({ ...prev, start: e.target.value }));
                      setCurrentPage(1);
                    }}
                    className="bg-slate-800 border-none text-white text-sm rounded-lg focus:ring-2 focus:ring-orange-500 block w-full p-2.5"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-medium text-slate-500 uppercase">End Date</label>
                  <input 
                    type="date" 
                    value={dateRange.end}
                    onChange={(e) => {
                      setDateRange(prev => ({ ...prev, end: e.target.value }));
                      setCurrentPage(1);
                    }}
                    className="bg-slate-800 border-none text-white text-sm rounded-lg focus:ring-2 focus:ring-orange-500 block w-full p-2.5"
                  />
                </div>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-slate-800 flex flex-col gap-3">
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-3 rounded-xl font-bold text-xs transition-all w-full border border-slate-700 shadow-lg hover:shadow-orange-500/10"
              >
                <Target className="w-4 h-4 text-orange-500" /> Strategic Settings
              </button>
              <button 
                onClick={() => {
                  setEditingId(null);
                  setFormRows([defaultRow()]);
                  setIsFormOpen(true);
                }}
                className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-3 rounded-xl font-bold text-xs transition-all w-full shadow-lg hover:shadow-orange-600/20"
              >
                <Plus className="w-4 h-4" /> Add Transaction
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 space-y-6">

          {/* SALES & EXPENSE FORECAST ANALYSIS */}
          <div className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-xl hover:bg-white/90 dark:hover:bg-slate-900/70 transition-all duration-300 p-6 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <Activity className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-bold">Sales & Expense Forecast Analysis</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {/* Sales Growth */}
              <div className="p-5 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30">
                <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Sales Growth
                  <FormulaPopup 
                    title="Sales Growth" 
                    formula="((Forecast FY26-27 - Current FY25-26) / Current FY25-26) * 100" 
                    explanation="Measures the percentage increase or decrease in projected sales for the upcoming financial year compared to the current year's actual sales." 
                    example={`(($${formatCurrency(sales.forecast)} - $${formatCurrency(totalActualSales)}) / $${formatCurrency(totalActualSales)}) * 100 = ${totalActualSales > 0 ? (((sales.forecast - totalActualSales) / totalActualSales) * 100).toFixed(0) : 0}%`}
                  />
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Current FY25-26</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(totalActualSales)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Forecast FY26-27</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(sales.forecast)}</span>
                  </div>
                  <div className="pt-3 border-t border-blue-200 dark:border-blue-800/50 flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-700 dark:text-slate-300">Growth</span>
                    <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${sales.forecast >= totalActualSales ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                      {sales.forecast >= totalActualSales ? '+' : ''}{totalActualSales > 0 ? (((sales.forecast - totalActualSales) / totalActualSales) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Expense Growth */}
              <div className="p-5 rounded-xl bg-orange-50/50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800/30">
                <h4 className="text-sm font-semibold text-orange-800 dark:text-orange-300 mb-4 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4" /> Expense Growth
                  <FormulaPopup 
                    title="Expense Growth" 
                    formula="((Forecast FY26-27 - Current FY25-26) / Current FY25-26) * 100" 
                    explanation="Measures the percentage increase or decrease in projected expenses for the upcoming financial year compared to the current year's actual expenses." 
                    example={`(($${formatCurrency(totals.forecast)} - $${formatCurrency(totals.actual)}) / $${formatCurrency(totals.actual)}) * 100 = ${totals.actual > 0 ? (((totals.forecast - totals.actual) / totals.actual) * 100).toFixed(0) : 0}%`}
                  />
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Current FY25-26</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(totals.actual)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Forecast FY26-27</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(totals.forecast)}</span>
                  </div>
                  <div className="pt-3 border-t border-orange-200 dark:border-orange-800/50 flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-700 dark:text-slate-300">Growth</span>
                    <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${totals.forecast <= totals.actual ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                      {totals.forecast >= totals.actual ? '+' : ''}{totals.actual > 0 ? (((totals.forecast - totals.actual) / totals.actual) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Expense to Sales Ratio */}
              <div className="p-5 rounded-xl bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800/30">
                <h4 className="text-sm font-semibold text-purple-800 dark:text-purple-300 mb-4 flex items-center gap-2">
                  <ActivitySquare className="w-4 h-4" /> Expense to Sales Ratio
                  <FormulaPopup 
                    title="Expense to Sales Ratio" 
                    formula="(Total Expenses / Total Sales) * 100" 
                    explanation="Indicates what percentage of your sales revenue is consumed by expenses. A lower ratio means higher profitability." 
                    example={`($${formatCurrency(totals.forecast)} / $${formatCurrency(sales.forecast)}) * 100 = ${sales.forecast > 0 ? ((totals.forecast / sales.forecast) * 100).toFixed(0) : 0}%`}
                  />
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Current Ratio</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{totalActualSales > 0 ? ((totals.actual / totalActualSales) * 100).toFixed(0) : 0}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Forecast Ratio</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{sales.forecast > 0 ? ((totals.forecast / sales.forecast) * 100).toFixed(0) : 0}%</span>
                  </div>
                  <div className="pt-3 border-t border-purple-200 dark:border-purple-800/50 flex justify-between items-center">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-gray-700 dark:text-slate-300">Req. Sales (</span>
                      <input 
                        type="number" 
                        value={targetCostPct}
                        onChange={(e) => setTargetCostPct(Number(e.target.value) || 0)}
                        className="w-10 text-xs text-center bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-700 rounded p-0.5 focus:ring-purple-500 focus:border-purple-500"
                      />
                      <span className="text-xs font-bold text-gray-700 dark:text-slate-300">% Cost)</span>
                    </div>
                    <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                      {formatCurrency(totals.forecast / (targetCostPct / 100 || 1))}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-md font-bold mb-4 text-slate-900 dark:text-white flex items-center">
                Sales vs Expenses Trend
                <FormulaPopup 
                  title="Sales vs Expenses Trend" 
                  formula="Monthly Actual Sales vs Monthly Actual Expenses" 
                  explanation="A month-by-month comparison of actual sales revenue against actual expenses incurred, helping identify seasonal trends and cash flow patterns." 
                  example={`Apr: Sales $${formatCurrency(monthlySales['Apr'] || 0)} vs Exp $${formatCurrency(monthWiseData.find(d => d.name === 'Apr')?.actual || 0)}`}
                />
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthWiseData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                    <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" stroke="#9CA3AF" fontSize={12} tickFormatter={(value) => `₹${(value / 10000000).toFixed(0)}Cr`} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="right" orientation="right" stroke="#9CA3AF" fontSize={12} tickFormatter={(value) => `₹${(value / 10000000).toFixed(0)}Cr`} tickLine={false} axisLine={false} />
                    <RechartsTooltip 
                      itemStyle={{ color: '#fff' }}
                      cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                      contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar yAxisId="left" dataKey={(d) => monthlySales[d.name] || 0} name="Actual Sales" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="actual" name="Actual Expenses" fill="#F97316" radius={[4, 4, 0, 0]} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-xl hover:bg-white/90 dark:hover:bg-slate-900/70 transition-all duration-300 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm relative overflow-visible flex flex-col justify-between"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-red-500 rounded-l-2xl" />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center">
                    Total Variance
                    <FormulaPopup 
                      title="Total Variance" 
                      formula="Total Forecast (26-27) - Total Actual (25-26)" 
                      explanation="The absolute monetary difference between the forecasted expenses for the next financial year and the actual expenses of the current year." 
                      example={`$${formatCurrency(totals.forecast)} - $${formatCurrency(totals.actual)} = $${formatCurrency(variance)}`}
                    />
                  </h3>
                  <div className="p-1.5 bg-slate-50/50 dark:bg-slate-800/50 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  </div>
                </div>
                <p className={`text-xl font-bold ${variance > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                  {variance > 0 ? '+' : ''}{formatCurrency(variance)}
                </p>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-xl hover:bg-white/90 dark:hover:bg-slate-900/70 transition-all duration-300 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm relative overflow-visible flex flex-col justify-between"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 rounded-l-2xl" />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center">
                    EBITDA / Net Profit
                    <FormulaPopup 
                      title="EBITDA / Net Profit (Forecast)" 
                      formula="Forecasted Sales - Forecasted Total Expenses" 
                      explanation="The projected bottom line profit or loss for the upcoming financial year based on your forecasted sales and expenses." 
                      example={`$${formatCurrency(sales.forecast)} - $${formatCurrency(totals.forecast)} = $${formatCurrency(sales.forecast - totals.forecast)}`}
                    />
                  </h3>
                  <div className="p-1.5 bg-slate-50/50 dark:bg-slate-800/50 rounded-lg">
                    <DollarSign className="w-4 h-4 text-indigo-500" />
                  </div>
                </div>
                <p className={`text-xl font-bold ${sales.forecast - totals.forecast >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {formatCurrency(sales.forecast - totals.forecast)}
                </p>
              </div>
            </motion.div>
          </div>

          {/* Charts Moved Up */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-xl hover:bg-white/90 dark:hover:bg-slate-900/70 transition-all duration-300 p-6 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold flex items-center">
                  Total Expenses Value & %
                  <FormulaPopup 
                    title="Total Expenses Distribution" 
                    formula="(Category Value / Total Value) * 100" 
                    explanation="Shows the proportional distribution of expenses across different categories (Actual or Forecast). Helps identify which areas consume the largest share of the budget." 
                    example={pieChartData.length > 0 ? `(${formatCurrency(pieChartData[0].value)} / ${formatCurrency(pieChartMetric === 'actual' ? totals.actual : totals.forecast)}) * 100 = ${((pieChartData[0].value / (pieChartMetric === 'actual' ? totals.actual : totals.forecast)) * 100).toFixed(0)}%` : undefined}
                  />
                </h2>
                <select
                  value={pieChartMetric}
                  onChange={(e) => setPieChartMetric(e.target.value as any)}
                  className="bg-slate-50/50 dark:bg-slate-800/50 border border-slate-300/50 dark:border-slate-700/50 text-slate-900 dark:text-white text-xs rounded-lg focus:ring-orange-500 focus:border-orange-500 p-2"
                >
                  <option value="actual">Actual</option>
                  <option value="forecast">Forecast</option>
                </select>
              </div>
              <div className="h-80 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      itemStyle={{ color: '#fff' }}
                      contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                      formatter={(value: number, name: string, props: any) => {
                        const total = pieChartData.reduce((sum, d) => sum + d.value, 0);
                        const percent = total > 0 ? ((value / total) * 100).toFixed(0) : 0;
                        return [`${formatCurrency(value)} (${percent}%)`, name];
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Total {pieChartMetric === 'actual' ? 'Actual' : 'Forecast'}</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(pieChartMetric === 'actual' ? totals.actual : totals.forecast)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-xl hover:bg-white/90 dark:hover:bg-slate-900/70 transition-all duration-300 p-6 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold flex items-center">
                  Budget Comparison {getLevelLabel()}
                  <FormulaPopup 
                    title="Budget Comparison" 
                    formula="Actual (25-26) vs Forecast (26-27)" 
                    explanation="A side-by-side visual comparison of current actual expenses against future forecasted expenses, broken down by the selected filter level (Department, Head, or Month)." 
                    example={budgetComparisonData.length > 0 ? `${budgetComparisonData[0].name}: Actual $${formatCurrency(budgetComparisonData[0].actual)} vs Forecast $${formatCurrency(budgetComparisonData[0].forecast)}` : undefined}
                  />
                </h2>
                <div className="flex gap-2">
                  <select
                    value={budgetComparisonView}
                    onChange={(e) => setBudgetComparisonView(e.target.value)}
                    className="bg-slate-50/50 dark:bg-slate-800/50 border border-slate-300/50 dark:border-slate-700/50 text-slate-900 dark:text-white text-xs rounded-lg focus:ring-orange-500 focus:border-orange-500 p-2"
                  >
                    <option value="department">By Department</option>
                    <option value="month">By Month</option>
                  </select>
                  <select
                    value={budgetComparisonMetric}
                    onChange={(e) => setBudgetComparisonMetric(e.target.value)}
                    className="bg-slate-50/50 dark:bg-slate-800/50 border border-slate-300/50 dark:border-slate-700/50 text-slate-900 dark:text-white text-xs rounded-lg focus:ring-orange-500 focus:border-orange-500 p-2"
                  >
                    <option value="all">All Metrics</option>
                    <option value="actual">Actual Only</option>
                    <option value="forecast">Forecast Only</option>
                  </select>
                </div>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={budgetComparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#9CA3AF" 
                      fontSize={12} 
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#9CA3AF" 
                      fontSize={12}
                      tickFormatter={(value) => `₹${(value / 10000000).toFixed(0)}Cr`}
                      tickLine={false}
                      axisLine={false}
                    />
                    <RechartsTooltip 
                      itemStyle={{ color: '#fff' }}
                      cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                      contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    {(budgetComparisonMetric === 'all' || budgetComparisonMetric === 'actual') && (
                      <Bar dataKey="actual" name="Actual (25-26)" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    )}
                    {(budgetComparisonMetric === 'all' || budgetComparisonMetric === 'forecast') && (
                      <Bar dataKey="forecast" name="Forecast (26-27)" fill="#F97316" radius={[4, 4, 0, 0]} />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

      {/* Head-wise Expenses Share moved here */}
      <div className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-xl hover:bg-white/90 dark:hover:bg-slate-900/70 transition-all duration-300 p-6 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm mb-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold flex items-center">
            Head-wise Expenses Share
            <FormulaPopup 
              title="Head-wise Expenses Share" 
              formula="(Head Expense / Total Expense) * 100" 
              explanation="Ranks expense heads by their total value and shows their percentage contribution to the overall expenses. Useful for identifying top cost drivers." 
              example={headShareData.length > 0 ? `(${formatCurrency(headShareData[0].value)} / ${formatCurrency(pieChartMetric === 'actual' ? totals.actual : totals.forecast)}) * 100 = ${headShareData[0].percent.toFixed(0)}%` : undefined}
            />
          </h2>
          <select
            value={pieChartMetric}
            onChange={(e) => setPieChartMetric(e.target.value as any)}
            className="bg-slate-50/50 dark:bg-slate-800/50 border border-slate-300/50 dark:border-slate-700/50 text-slate-900 dark:text-white text-xs rounded-lg focus:ring-orange-500 focus:border-orange-500 p-2"
          >
            <option value="actual">Actual</option>
            <option value="forecast">Forecast</option>
          </select>
        </div>
        <div className="h-80 overflow-y-auto pr-2">
          <ResponsiveContainer width="100%" height={Math.max(320, headShareData.length * 40)}>
            <BarChart layout="vertical" data={headShareData} margin={{ top: 5, right: 120, left: 100, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} width={100} />
              <RechartsTooltip 
                itemStyle={{ color: '#fff' }}
                cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                formatter={(value: number, name: string, props: any) => [`${formatCurrency(value)} (${props.payload.percent.toFixed(0)}%)`, 'Value']}
              />
              <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]}>
                <LabelList 
                  dataKey="value" 
                  position="right" 
                  formatter={(value: number) => {
                    const item = headShareData.find(d => d.value === value);
                    return `${formatCurrency(value)} (${item?.percent.toFixed(0)}%)`;
                  }}
                  fill="currentColor"
                  className="text-slate-700 dark:text-slate-300 text-xs font-medium"
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      </div> {/* End Main Content Area */}
      </div> {/* End Flex Container */}

      {/* Department Analysis Table */}
      <div className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-xl hover:bg-white/90 dark:hover:bg-slate-900/70 transition-all duration-300 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm overflow-visible mb-6">
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold flex items-center">
              Variance Analysis {getLevelLabel()}
              <FormulaPopup 
                title="Variance Analysis" 
                formula="Variance = Forecast - Actual | Variance % = (Variance / Actual) * 100" 
                explanation="A detailed breakdown of expenses showing the exact monetary and percentage differences between current actuals and future forecasts. Includes manual adjustment tracking." 
                example={filteredChartData.length > 0 ? `Variance: $${formatCurrency(filteredChartData[0].forecast)} - $${formatCurrency(filteredChartData[0].actual)} = $${formatCurrency(filteredChartData[0].forecast - filteredChartData[0].actual)}` : undefined}
              />
            </h2>
            <p className="text-sm text-slate-500 mt-1">Comparing Forecast vs Actual to identify optimization or investment opportunities.</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="w-4 h-4 text-slate-400" />
              </div>
              <input 
                type="text" 
                value={varianceSearchQuery}
                onChange={(e) => setVarianceSearchQuery(e.target.value)}
                className="bg-slate-50/50 dark:bg-slate-800/50 border border-gray-200 dark:border-gray-700 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block w-full pl-10 p-2.5 outline-none transition-all" 
                placeholder="Search category..." 
              />
            </div>
            <button 
              onClick={exportVarianceToCSV}
              className="flex items-center gap-2 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 px-4 py-2.5 rounded-lg font-medium transition-colors whitespace-nowrap text-sm"
            >
              Export CSV
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50/50 dark:bg-slate-800/50/50">
              <tr>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium text-right">Actual (25-26)</th>
                <th className="px-6 py-4 font-medium text-right">Adj %</th>
                <th className="px-6 py-4 font-medium text-right">Forecast (26-27)</th>
                <th className="px-6 py-4 font-medium text-right">Variances</th>
                <th className="px-6 py-4 font-medium text-right">Variances %</th>
                <th className="px-6 py-4 font-medium text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {varianceTree.length > 0 ? (
                varianceTree.map(node => renderVarianceRow(node, 0))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                    No data found for the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-xl hover:bg-white/90 dark:hover:bg-slate-900/70 transition-all duration-300 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm overflow-visible mb-6">
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold flex items-center">
              Department Forecast Details
              <FormulaPopup 
                title="Department Forecast Details" 
                formula="Line-item level Actual vs Forecast" 
                explanation="A granular, transaction-level view of all expenses, allowing you to see exactly where every dollar is allocated and forecasted across departments, heads, and sub-heads." 
                example={searchedTransactions.length > 0 ? `Tx: ${searchedTransactions[0].department} - ${searchedTransactions[0].head} | Actual: $${formatCurrency(searchedTransactions[0].actual)}` : undefined}
              />
            </h2>
            <div className="text-sm text-slate-500 mt-1">
              Showing {searchedTransactions.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, searchedTransactions.length)} of {searchedTransactions.length}
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="w-4 h-4 text-slate-400" />
              </div>
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-50/50 dark:bg-slate-800/50 border border-gray-200 dark:border-gray-700 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block w-full pl-10 p-2.5 outline-none transition-all" 
                placeholder="Search sub-heads..." 
              />
            </div>
            <button 
              onClick={exportToCSV}
              className="flex items-center gap-2 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 px-4 py-2.5 rounded-lg font-medium transition-colors whitespace-nowrap text-sm"
            >
              Export CSV
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50/50 dark:bg-slate-800/50/50">
              <tr>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Department</th>
                <th className="px-6 py-4 font-medium">Head</th>
                <th className="px-6 py-4 font-medium">Sub Head</th>
                <th className="px-6 py-4 font-medium text-right">Actual (25-26)</th>
                <th className="px-6 py-4 font-medium text-right">Forecast (26-27)</th>
                <th className="px-6 py-4 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {paginatedTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">{tx.date}</td>
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{tx.department}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-slate-300">{tx.head}</td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{tx.subHead}</td>
                  <td className="px-6 py-4 text-right font-mono">{formatCurrency(tx.actual)}</td>
                  <td className="px-6 py-4 text-right font-mono text-orange-600 dark:text-orange-400">{formatCurrency(tx.forecast)}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openEdit(tx)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-1">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteTransaction(tx.id)} className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedTransactions.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                    No transactions found for the selected filters.
                  </td>
                </tr>
              )}
              {paginatedTransactions.length > 0 && (
                <tr className="bg-slate-50/80 dark:bg-slate-800/80 font-bold border-t-2 border-slate-200 dark:border-slate-700">
                  <td colSpan={4} className="px-6 py-4 text-right">Total for Filtered Results:</td>
                  <td className="px-6 py-4 text-right font-mono">{formatCurrency(searchedTransactions.reduce((sum, tx) => sum + tx.actual, 0))}</td>
                  <td className="px-6 py-4 text-right font-mono text-orange-600 dark:text-orange-400">{formatCurrency(searchedTransactions.reduce((sum, tx) => sum + tx.forecast, 0))}</td>
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300/50 dark:border-slate-700/50 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5 && currentPage > 3) {
                  pageNum = currentPage - 2 + i;
                  if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium transition-colors ${
                      currentPage === pageNum 
                        ? 'bg-orange-600 text-white' 
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-slate-300'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300/50 dark:border-slate-700/50 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Sales Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-xl hover:bg-white/90 dark:hover:bg-slate-900/70 transition-all duration-300 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200/50 dark:border-slate-700/50"
          >
            <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-orange-500" />
                Sales Settings
              </h2>
              <button onClick={() => setIsSettingsOpen(false)} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <div className="space-y-6">
                {/* Sales Settings */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                  <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200/50 dark:border-slate-700/50">
                    <div>
                      <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Total Actual Sales (FY 25-26)</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Sum of all monthly actuals below</p>
                    </div>
                    <span className="text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(totalActualSales)}</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Forecast Amount (FY 26-27)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">$</span>
                        <input
                          type="number"
                          value={sales.forecast}
                          onChange={(e) => setSales({ ...sales, forecast: Number(e.target.value) })}
                          className="pl-7 bg-white dark:bg-slate-900 border border-slate-300/50 dark:border-slate-700/50 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block w-full p-2.5"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Growth Percentage (%)</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={totalActualSales > 0 ? Number((((sales.forecast - totalActualSales) / totalActualSales) * 100).toFixed(2)) : 0}
                          onChange={(e) => {
                            const pct = Number(e.target.value);
                            const newForecast = totalActualSales * (1 + (pct / 100));
                            setSales({ ...sales, forecast: newForecast });
                          }}
                          className="pr-7 bg-white dark:bg-slate-900 border border-slate-300/50 dark:border-slate-700/50 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block w-full p-2.5"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">%</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4 border-b border-slate-200/50 dark:border-slate-700/50 pb-2">Monthly Actual Sales (FY 25-26)</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'].map(month => (
                      <div key={month}>
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{month}</label>
                        <input
                          type="number"
                          value={monthlySales[month]}
                          onChange={(e) => setMonthlySales({ ...monthlySales, [month]: Number(e.target.value) })}
                          className="bg-slate-50/50 dark:bg-slate-800/50 border border-slate-300/50 dark:border-slate-700/50 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block w-full p-2"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200/50 dark:border-slate-700/50 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-800/50">
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300/50 dark:border-slate-700/50 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
              <button 
                onClick={async () => {
                  await saveSalesSettings();
                  setIsSettingsOpen(false);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-lg hover:bg-orange-700 transition-colors"
              >
                Save
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-xl hover:bg-white/90 dark:hover:bg-slate-900/70 transition-all duration-300 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200/50 dark:border-slate-700/50"
          >
            <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50 flex justify-between items-center">
              <h2 className="text-xl font-bold">{editingId ? 'Edit Transaction' : 'Add New Transaction'}</h2>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-500 hover:text-gray-700 dark:hover:text-slate-300">
                &times;
              </button>
            </div>
            <form onSubmit={handleFormSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {formRows.map((row, index) => (
                <div key={row.id} className="p-4 border border-slate-200/50 dark:border-slate-700/50 rounded-xl relative bg-gray-50/50 dark:bg-gray-800/20">
                  {formRows.length > 1 && (
                    <button type="button" onClick={() => removeRow(index)} className="absolute top-4 right-4 text-red-500 hover:text-red-700 p-1">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Month</label>
                      <input required type="month" value={row.date} onChange={e => updateRow(index, { date: e.target.value })} className="w-full p-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-300/50 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Department{editingId ? '' : '(s)'}</label>
                      {row.isNewDept ? (
                        <div className="flex gap-2">
                          <input 
                            required 
                            autoFocus
                            type="text" 
                            value={row.departments[0] || ''} 
                            onChange={e => updateRow(index, { departments: [e.target.value] })} 
                            className="w-full p-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-300/50 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-white" 
                            placeholder="Enter new department" 
                          />
                          <button 
                            type="button" 
                            onClick={() => updateRow(index, { isNewDept: false, departments: [DEPARTMENTS[1]] })}
                            className="px-3 py-2.5 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : row.renamingField === 'department' ? (
                        <div className="flex gap-2">
                          <input 
                            required 
                            autoFocus
                            type="text" 
                            value={row.renameValue} 
                            onChange={e => updateRow(index, { renameValue: e.target.value })} 
                            className="w-full p-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-300/50 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-white" 
                            placeholder="Rename department" 
                          />
                          <button 
                            type="button" 
                            onClick={() => handleRenameSubmit(index, 'department')}
                            className="px-3 py-2.5 bg-orange-600 text-white hover:bg-orange-700 rounded-lg text-sm"
                          >
                            Save
                          </button>
                          <button 
                            type="button" 
                            onClick={() => updateRow(index, { renamingField: null })}
                            className="px-3 py-2.5 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2 items-start">
                          <div className="w-full max-h-40 overflow-y-auto p-2 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-300/50 dark:border-slate-700/50 rounded-lg">
                            {dynamicDepartments.filter(d => d !== "All").map(d => (
                              <label key={d} className="flex items-center gap-2 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
                                <input 
                                  type={editingId ? "radio" : "checkbox"} 
                                  name={`department-${row.id}`}
                                  value={d}
                                  checked={row.departments.includes(d)}
                                  onChange={(e) => {
                                    if (editingId) {
                                      updateRow(index, { departments: [d] });
                                    } else {
                                      if (e.target.checked) {
                                        updateRow(index, { departments: [...row.departments, d] });
                                      } else {
                                        updateRow(index, { departments: row.departments.filter(dept => dept !== d) });
                                      }
                                    }
                                  }}
                                  className="text-orange-600 focus:ring-orange-500 rounded-sm"
                                />
                                <span className="text-sm text-slate-900 dark:text-white">{d}</span>
                              </label>
                            ))}
                            <button 
                              type="button"
                              onClick={() => updateRow(index, { isNewDept: true, departments: [''] })}
                              className="mt-2 ml-1 text-sm font-bold text-orange-600 hover:text-orange-700"
                            >
                              + Add New Department
                            </button>
                          </div>
                          {row.departments.length === 1 && (
                            <button
                              type="button"
                              onClick={() => updateRow(index, { renameValue: row.departments[0], renamingField: 'department' })}
                              className="px-3 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 border border-slate-300/50 dark:border-slate-700/50 rounded-lg text-gray-600 dark:text-slate-400"
                              title="Rename this department"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Head</label>
                      {row.isNewHead ? (
                        <div className="flex gap-2">
                          <input 
                            required 
                            autoFocus
                            type="text" 
                            value={row.head} 
                            onChange={e => updateRow(index, { head: e.target.value })} 
                            className="w-full p-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-300/50 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-white" 
                            placeholder="Enter new head" 
                          />
                          <button 
                            type="button" 
                            onClick={() => updateRow(index, { isNewHead: false, head: dynamicHeads[0] || '' })}
                            className="px-3 py-2.5 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : row.renamingField === 'head' ? (
                        <div className="flex gap-2">
                          <input 
                            required 
                            autoFocus
                            type="text" 
                            value={row.renameValue} 
                            onChange={e => updateRow(index, { renameValue: e.target.value })} 
                            className="w-full p-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-300/50 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-white" 
                            placeholder="Rename head" 
                          />
                          <button 
                            type="button" 
                            onClick={() => handleRenameSubmit(index, 'head')}
                            className="px-3 py-2.5 bg-orange-600 text-white hover:bg-orange-700 rounded-lg text-sm"
                          >
                            Save
                          </button>
                          <button 
                            type="button" 
                            onClick={() => updateRow(index, { renamingField: null })}
                            className="px-3 py-2.5 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <select 
                            required 
                            value={row.head} 
                            onChange={e => {
                              if (e.target.value === 'ADD_NEW') {
                                updateRow(index, { isNewHead: true, head: '' });
                              } else {
                                updateRow(index, { head: e.target.value });
                              }
                            }} 
                            className="w-full p-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-300/50 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-white"
                          >
                            <option value="" disabled>Select Head</option>
                            {dynamicHeads.map(h => <option key={h} value={h}>{h}</option>)}
                            <option value="ADD_NEW" className="font-bold text-orange-600">+ Add New Head</option>
                          </select>
                          {row.head && (
                            <button
                              type="button"
                              onClick={() => updateRow(index, { renameValue: row.head, renamingField: 'head' })}
                              className="px-3 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 border border-slate-300/50 dark:border-slate-700/50 rounded-lg text-gray-600 dark:text-slate-400"
                              title="Rename this head"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Sub Head</label>
                      {row.isNewSubHead ? (
                        <div className="flex gap-2">
                          <input 
                            required 
                            autoFocus
                            type="text" 
                            value={row.subHead} 
                            onChange={e => updateRow(index, { subHead: e.target.value })} 
                            className="w-full p-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-300/50 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-white" 
                            placeholder="Enter new sub head" 
                          />
                          <button 
                            type="button" 
                            onClick={() => updateRow(index, { isNewSubHead: false, subHead: dynamicSubHeads[0] || '' })}
                            className="px-3 py-2.5 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : row.renamingField === 'subHead' ? (
                        <div className="flex gap-2">
                          <input 
                            required 
                            autoFocus
                            type="text" 
                            value={row.renameValue} 
                            onChange={e => updateRow(index, { renameValue: e.target.value })} 
                            className="w-full p-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-300/50 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-white" 
                            placeholder="Rename sub head" 
                          />
                          <button 
                            type="button" 
                            onClick={() => handleRenameSubmit(index, 'subHead')}
                            className="px-3 py-2.5 bg-orange-600 text-white hover:bg-orange-700 rounded-lg text-sm"
                          >
                            Save
                          </button>
                          <button 
                            type="button" 
                            onClick={() => updateRow(index, { renamingField: null })}
                            className="px-3 py-2.5 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <select 
                            required 
                            value={row.subHead} 
                            onChange={e => {
                              if (e.target.value === 'ADD_NEW') {
                                updateRow(index, { isNewSubHead: true, subHead: '' });
                              } else {
                                updateRow(index, { subHead: e.target.value });
                              }
                            }} 
                            className="w-full p-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-300/50 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-white"
                          >
                            <option value="" disabled>Select Sub Head</option>
                            {dynamicSubHeads.map(sh => <option key={sh} value={sh}>{sh}</option>)}
                            <option value="ADD_NEW" className="font-bold text-orange-600">+ Add New Sub Head</option>
                          </select>
                          {row.subHead && (
                            <button
                              type="button"
                              onClick={() => updateRow(index, { renameValue: row.subHead, renamingField: 'subHead' })}
                              className="px-3 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 border border-slate-300/50 dark:border-slate-700/50 rounded-lg text-gray-600 dark:text-slate-400"
                              title="Rename this sub head"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Actual (25-26) ₹</label>
                      <input required type="number" value={row.actual} onChange={e => updateRow(index, { actual: Number(e.target.value) })} className="w-full p-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-300/50 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-white" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-1">Forecast (26-27) ₹</label>
                      <input required type="number" value={row.forecast} onChange={e => updateRow(index, { forecast: Number(e.target.value) })} className="w-full p-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-300/50 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-white" />
                    </div>
                  </div>
                </div>
              ))}
              
              {!editingId && (
                <button 
                  type="button" 
                  onClick={addRow} 
                  className="w-full py-4 border-2 border-dashed border-slate-300/50 dark:border-slate-700/50 rounded-xl text-slate-500 hover:text-gray-700 dark:hover:text-slate-300 hover:border-gray-400 dark:hover:border-gray-600 flex items-center justify-center gap-2 transition-colors"
                >
                  <Plus className="w-5 h-5" /> Add Another Transaction
                </button>
              )}

              <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-white/80 dark:bg-slate-900/50 backdrop-blur-xl hover:bg-white/90 dark:hover:bg-slate-900/70 transition-all duration-300 py-4 border-t border-slate-200/50 dark:border-slate-700/50">
                <button type="button" onClick={() => setIsFormOpen(false)} className="px-5 py-2.5 rounded-lg border border-slate-300/50 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-medium">
                  {editingId ? 'Save Changes' : 'Save All Transactions'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
