import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { formatCurrency } from '../utils/formatters';
import { motion } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, LabelList,
  PieChart, Pie, Cell, ComposedChart, Area, Line, LineChart
} from 'recharts';
import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';
import { Brain, TrendingUp, TrendingDown, AlertCircle, Plus, Edit, Trash2, ChevronLeft, ChevronRight, Search, Download, Filter, DollarSign, Target, Activity, ActivitySquare, Camera, PieChart as PieChartIcon } from 'lucide-react';

const DEPARTMENTS = [
  "All",
  "Quality", "Procurement", "Production", "Operations", 
  "Documents", "Accounts", "Sales", "Admin", 
  "HR", "MDO"
];

export default function Dashboard() {
  const { transactions, addTransaction, updateTransaction, deleteTransaction, renameCategory } = useAppContext();
  const [selectedDept, setSelectedDept] = useState("All");
  const [selectedHead, setSelectedHead] = useState("All");
  const [selectedSubHead, setSelectedSubHead] = useState("All");
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [datePreset, setDatePreset] = useState("Custom");
  const [showFormulas, setShowFormulas] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [barChartMetric, setBarChartMetric] = useState<'all' | 'actual_vs_forecast'>('all');
  const [pieChartMetric, setPieChartMetric] = useState<'actual' | 'forecast'>('forecast');
  
  const [forecastAdjustments, setForecastAdjustments] = useState<Record<string, number>>({});
  const [varianceSearchQuery, setVarianceSearchQuery] = useState("");
  const [budgetComparisonMetric, setBudgetComparisonMetric] = useState('actual');
  const [budgetComparisonView, setBudgetComparisonView] = useState('department'); // 'department' or 'month'
  
  const [sales, setSales] = useState({
    forecast: 115000000
  });
  
  const [monthlySales, setMonthlySales] = useState<Record<string, number>>({
    'Apr': 8000000, 'May': 8200000, 'Jun': 8400000, 'Jul': 8600000, 
    'Aug': 8800000, 'Sep': 9000000, 'Oct': 9200000, 'Nov': 9400000, 
    'Dec': 9600000, 'Jan': 8000000, 'Feb': 8500000, 'Mar': 9000000
  });
  const [isSalesFormOpen, setIsSalesFormOpen] = useState(false);
  
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

  // Filtering
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchDept = selectedDept === "All" || t.department === selectedDept;
      const matchHead = selectedHead === "All" || t.head === selectedHead;
      const matchSubHead = selectedSubHead === "All" || t.subHead === selectedSubHead;
      const matchStart = !dateRange.start || t.date >= dateRange.start;
      const matchEnd = !dateRange.end || t.date <= dateRange.end;

      return matchDept && matchHead && matchSubHead && matchStart && matchEnd;
    });
  }, [transactions, selectedDept, selectedHead, selectedSubHead, dateRange]);

  const searchedTransactions = useMemo(() => {
    const searchLower = searchQuery.toLowerCase();
    return filteredTransactions.filter(t => {
      if (!searchQuery) return true;
      return t.department.toLowerCase().includes(searchLower) ||
             t.head.toLowerCase().includes(searchLower) ||
             t.subHead.toLowerCase().includes(searchLower);
    });
  }, [filteredTransactions, searchQuery]);

  // Aggregations
  const totals = useMemo(() => {
    let groupBy: 'department' | 'head' | 'subHead' = 'department';
    if (selectedHead !== "All") groupBy = 'subHead';
    else if (selectedDept !== "All") groupBy = 'head';

    return filteredTransactions.reduce((acc, curr) => {
      const key = curr[groupBy];
      const adj = forecastAdjustments[key] || 0;
      const adjustedForecast = curr.forecast * (1 + adj / 100);

      return {
        actual: acc.actual + curr.actual,
        forecast: acc.forecast + adjustedForecast
      };
    }, { actual: 0, forecast: 0 });
  }, [filteredTransactions, selectedDept, selectedHead, forecastAdjustments]);

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

    const totals = filteredTransactions.reduce((acc, curr) => {
      const key = curr[groupBy];
      if (!acc[key]) acc[key] = { actual: 0, forecast: 0, originalForecast: 0 };
      acc[key].actual += curr.actual;
      acc[key].originalForecast += curr.forecast;
      
      const adj = forecastAdjustments[key] || 0;
      acc[key].forecast += curr.forecast * (1 + adj / 100);
      return acc;
    }, {} as Record<string, { actual: number, forecast: number, originalForecast: number }>);
    
    return Object.entries(totals)
      .map(([name, values]: [string, any]) => ({ 
        name, 
        actual: values.actual, 
        forecast: values.forecast,
        originalForecast: values.originalForecast
      }))
      .sort((a, b) => b.actual - a.actual);
  }, [filteredTransactions, selectedDept, selectedHead, forecastAdjustments]);

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
    let groupBy: 'department' | 'head' | 'subHead' = 'department';
    if (selectedHead !== "All") groupBy = 'subHead';
    else if (selectedDept !== "All") groupBy = 'head';

    const totals = filteredTransactions.reduce((acc, curr) => {
      const key = curr[groupBy];
      if (!acc[key]) acc[key] = 0;
      
      let val = curr[pieChartMetric];
      if (pieChartMetric === 'forecast') {
        const adj = forecastAdjustments[key] || 0;
        val = val * (1 + adj / 100);
      }
      acc[key] += val;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(totals)
      .map(([name, value]) => ({ name, value: Number(value) }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTransactions, selectedDept, selectedHead, pieChartMetric, forecastAdjustments]);

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
    
    const total = Object.values(headTotals).reduce((sum, val) => sum + val, 0);
    
    return Object.entries(headTotals)
      .map(([name, value]) => ({ 
        name, 
        value: Number(value),
        percent: total > 0 ? (Number(value) / total) * 100 : 0
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

  const exportVarianceToCSV = () => {
    const headers = [getColumnLabel(), "Actual (25-26)", "Forecast (26-27)", "Variance", "Variance %", "Status"];
    const csvData = filteredChartData.map(row => {
      const variance = row.forecast - row.actual;
      const variancePercent = row.actual > 0 ? (variance / row.actual) * 100 : 0;
      const status = variance > 0 ? 'Optimization Required' : 'Optimal Efficiency';
      return [
        row.name,
        row.actual,
        row.forecast,
        variance,
        variancePercent.toFixed(2) + '%',
        status
      ];
    });
    
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
          className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-xl hover:bg-white/90 dark:hover:bg-slate-900/70 transition-all duration-300 p-6 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm"
        >
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-blue-500" />
            Dashboard Formulas & Methodology
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Forecasting</h3>
              <div className="bg-slate-50/50 dark:bg-slate-800/50 p-3 rounded-lg font-mono text-xs mb-3 border border-gray-200 dark:border-gray-700">
                Forecast = (Actual_25_26 * 0.6) + (Plan_25_26 * 0.4) * (1 + Market_Volatility_Index)
              </div>
              <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600 dark:text-slate-400">
                <li><strong>Market Volatility Index:</strong> Currently set at +4.2% due to expected supply chain disruptions.</li>
                <li><strong>Inflation Adjustment:</strong> A base 6% inflation rate is factored into the Plan values.</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Variance Analysis</h3>
              <div className="bg-slate-50/50 dark:bg-slate-800/50 p-3 rounded-lg font-mono text-xs mb-3 border border-gray-200 dark:border-gray-700">
                Variance = Forecast - Plan<br/>
                Variance % = (Variance / Plan) * 100
              </div>
              <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600 dark:text-slate-400">
                <li><strong>Positive Variance:</strong> Forecast exceeds actual (Optimization Required).</li>
                <li><strong>Negative Variance:</strong> Forecast is below actual (Optimal Efficiency).</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Sales & Expense Growth</h3>
              <div className="bg-slate-50/50 dark:bg-slate-800/50 p-3 rounded-lg font-mono text-xs mb-3 border border-gray-200 dark:border-gray-700">
                Growth % = ((Forecast - Actual) / Actual) * 100
              </div>
              <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600 dark:text-slate-400">
                <li>Calculated for both Sales and Expenses to track year-over-year projected growth.</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Expense to Sales Ratio</h3>
              <div className="bg-slate-50/50 dark:bg-slate-800/50 p-3 rounded-lg font-mono text-xs mb-3 border border-gray-200 dark:border-gray-700">
                Ratio % = (Total Expenses / Total Sales) * 100
              </div>
              <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600 dark:text-slate-400">
                <li>Measures operational efficiency. Lower percentage indicates higher profitability.</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Required Sales (50% Cost)</h3>
              <div className="bg-slate-50/50 dark:bg-slate-800/50 p-3 rounded-lg font-mono text-xs mb-3 border border-gray-200 dark:border-gray-700">
                Req. Sales = Forecast Expenses / 0.5
              </div>
              <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600 dark:text-slate-400">
                <li>The target sales volume required to ensure expenses do not exceed 50% of revenue.</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Department Expense Share</h3>
              <div className="bg-slate-50/50 dark:bg-slate-800/50 p-3 rounded-lg font-mono text-xs mb-3 border border-gray-200 dark:border-gray-700">
                Share % = (Dept Expense / Total Company Expense) * 100
              </div>
              <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600 dark:text-slate-400">
                <li>Identifies which departments consume the largest portion of the budget.</li>
              </ul>
            </div>
          </div>
        </motion.div>
      )}

      {/* Filters */}
      <div className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-xl hover:bg-white/90 dark:hover:bg-slate-900/70 transition-all duration-300 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Department</label>
          <select 
            value={selectedDept}
            onChange={(e) => {
              setSelectedDept(e.target.value);
              setSelectedHead("All");
              setSelectedSubHead("All");
              setCurrentPage(1);
            }}
            className="bg-slate-50/50 dark:bg-slate-800/50 border border-slate-300/50 dark:border-slate-700/50 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block w-full p-2.5"
          >
            {dynamicDepartments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Head</label>
          <select 
            value={selectedHead}
            onChange={(e) => {
              setSelectedHead(e.target.value);
              setSelectedSubHead("All");
              setCurrentPage(1);
            }}
            className="bg-slate-50/50 dark:bg-slate-800/50 border border-slate-300/50 dark:border-slate-700/50 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block w-full p-2.5"
          >
            <option value="All">All</option>
            {Array.from(new Set(transactions.filter(t => selectedDept === "All" || t.department === selectedDept).map(t => t.head))).map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Sub Head</label>
          <select 
            value={selectedSubHead}
            onChange={(e) => {
              setSelectedSubHead(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-50/50 dark:bg-slate-800/50 border border-slate-300/50 dark:border-slate-700/50 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block w-full p-2.5"
          >
            <option value="All">All</option>
            {Array.from(new Set(transactions.filter(t => (selectedDept === "All" || t.department === selectedDept) && (selectedHead === "All" || t.head === selectedHead)).map(t => t.subHead))).map(sh => <option key={sh} value={sh}>{sh}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Date Range</label>
          <select 
            value={datePreset}
            onChange={(e) => handlePresetChange(e.target.value)}
            className="bg-slate-50/50 dark:bg-slate-800/50 border border-slate-300/50 dark:border-slate-700/50 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block w-full p-2.5"
          >
            <option value="All Time">All Time</option>
            <option value="This Month">This Month</option>
            <option value="Last Quarter">Last Quarter</option>
            <option value="Year to Date">Year to Date</option>
            <option value="Custom">Custom Range</option>
          </select>
        </div>
        {datePreset === "Custom" && (
          <>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Start Date</label>
              <input 
                type="date" 
                value={dateRange.start}
                onChange={(e) => {
                  setDateRange(prev => ({ ...prev, start: e.target.value }));
                  setCurrentPage(1);
                }}
                className="bg-slate-50/50 dark:bg-slate-800/50 border border-slate-300/50 dark:border-slate-700/50 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block w-full p-2.5"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">End Date</label>
              <input 
                type="date" 
                value={dateRange.end}
                onChange={(e) => {
                  setDateRange(prev => ({ ...prev, end: e.target.value }));
                  setCurrentPage(1);
                }}
                className="bg-slate-50/50 dark:bg-slate-800/50 border border-slate-300/50 dark:border-slate-700/50 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block w-full p-2.5"
              />
            </div>
          </>
        )}
        <div className="ml-auto flex gap-2">
          <button 
            onClick={() => setIsSalesFormOpen(true)}
            className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
          >
            <Target className="w-4 h-4" /> Sales Settings
          </button>
          <button 
            onClick={() => {
              setEditingId(null);
              setFormRows([defaultRow()]);
              setIsFormOpen(true);
            }}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Transaction
          </button>
        </div>
      </div>

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
                  {sales.forecast >= totalActualSales ? '+' : ''}{totalActualSales > 0 ? (((sales.forecast - totalActualSales) / totalActualSales) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </div>

          {/* Expense Growth */}
          <div className="p-5 rounded-xl bg-orange-50/50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800/30">
            <h4 className="text-sm font-semibold text-orange-800 dark:text-orange-300 mb-4 flex items-center gap-2">
              <TrendingDown className="w-4 h-4" /> Expense Growth
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
                  {totals.forecast >= totals.actual ? '+' : ''}{totals.actual > 0 ? (((totals.forecast - totals.actual) / totals.actual) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </div>

          {/* Expense to Sales Ratio */}
          <div className="p-5 rounded-xl bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800/30">
            <h4 className="text-sm font-semibold text-purple-800 dark:text-purple-300 mb-4 flex items-center gap-2">
              <ActivitySquare className="w-4 h-4" /> Expense to Sales Ratio
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Current Ratio</span>
                <span className="font-semibold text-slate-900 dark:text-white">{totalActualSales > 0 ? ((totals.actual / totalActualSales) * 100).toFixed(1) : 0}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Forecast Ratio</span>
                <span className="font-semibold text-slate-900 dark:text-white">{sales.forecast > 0 ? ((totals.forecast / sales.forecast) * 100).toFixed(1) : 0}%</span>
              </div>
              <div className="pt-3 border-t border-purple-200 dark:border-purple-800/50 flex justify-between items-center">
                <span className="text-xs font-bold text-gray-700 dark:text-slate-300">Req. Sales (50% Cost)</span>
                <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                  {formatCurrency(totals.forecast / 0.5)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-md font-bold mb-4 text-slate-900 dark:text-white">Sales vs Expenses Trend</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthWiseData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" stroke="#9CA3AF" fontSize={12} tickFormatter={(value) => `₹${(value / 10000000).toFixed(0)}Cr`} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="#9CA3AF" fontSize={12} tickFormatter={(value) => `₹${(value / 10000000).toFixed(0)}Cr`} tickLine={false} axisLine={false} />
                <RechartsTooltip 
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-xl hover:bg-white/90 dark:hover:bg-slate-900/70 transition-all duration-300 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm relative overflow-hidden flex flex-col justify-between"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Actual (25-26)</h3>
              <div className="p-1.5 bg-slate-50/50 dark:bg-slate-800/50 rounded-lg">
                <DollarSign className="w-4 h-4 text-blue-500" />
              </div>
            </div>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(totals.actual)}</p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-xl hover:bg-white/90 dark:hover:bg-slate-900/70 transition-all duration-300 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm relative overflow-hidden flex flex-col justify-between"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Forecast (26-27)</h3>
              <div className="p-1.5 bg-slate-50/50 dark:bg-slate-800/50 rounded-lg">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
            </div>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(totals.forecast)}</p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-xl hover:bg-white/90 dark:hover:bg-slate-900/70 transition-all duration-300 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm relative overflow-hidden flex flex-col justify-between"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Variance</h3>
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
          className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-xl hover:bg-white/90 dark:hover:bg-slate-900/70 transition-all duration-300 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm relative overflow-hidden flex flex-col justify-between"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400">Forecast vs Sales</h3>
              <div className="p-1.5 bg-slate-50/50 dark:bg-slate-800/50 rounded-lg">
                <PieChartIcon className="w-4 h-4 text-indigo-500" />
              </div>
            </div>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{forecastExpenseToSalesRatio.toFixed(1)}%</p>
          </div>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-xl hover:bg-white/90 dark:hover:bg-slate-900/70 transition-all duration-300 p-6 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold">
              Total Expenses Value & %
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
                  contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  formatter={(value: number, name: string, props: any) => {
                    const total = pieChartData.reduce((sum, d) => sum + d.value, 0);
                    const percent = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
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
            <h2 className="text-lg font-bold">
              Budget Comparison {getLevelLabel()}
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

        <div className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-xl hover:bg-white/90 dark:hover:bg-slate-900/70 transition-all duration-300 p-6 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold">
              Head-wise Expenses Share
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
                  cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                  contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  formatter={(value: number, name: string, props: any) => [`${formatCurrency(value)} (${props.payload.percent.toFixed(1)}%)`, 'Value']}
                />
                <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]}>
                  <LabelList 
                    dataKey="value" 
                    position="right" 
                    formatter={(value: number) => {
                      const item = headShareData.find(d => d.value === value);
                      return `${formatCurrency(value)} (${item?.percent.toFixed(1)}%)`;
                    }}
                    fill="currentColor"
                    className="text-slate-700 dark:text-slate-300 text-xs font-medium"
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Department Analysis Table */}
      <div className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-xl hover:bg-white/90 dark:hover:bg-slate-900/70 transition-all duration-300 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm overflow-hidden mb-6">
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-bold">Variance Analysis {getLevelLabel()}</h2>
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
                placeholder={`Search ${getColumnLabel().toLowerCase()}...`} 
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
                <th className="px-6 py-4 font-medium">{getColumnLabel()}</th>
                <th className="px-6 py-4 font-medium text-right">Actual (25-26)</th>
                <th className="px-6 py-4 font-medium text-right">Forecast (26-27)</th>
                <th className="px-6 py-4 font-medium text-right">Variance (Fcst vs Actual)</th>
                <th className="px-6 py-4 font-medium text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {filteredChartData.map((row, i) => {
                const variance = row.forecast - row.actual;
                const variancePercent = row.actual > 0 ? (variance / row.actual) * 100 : 0;
                const isOverBudget = variance > 0;
                
                return (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{row.name}</td>
                    <td className="px-6 py-4 text-right font-mono text-slate-500">{formatCurrency(row.actual)}</td>
                    <td className="px-6 py-4 text-right font-mono font-medium text-slate-900 dark:text-white">{formatCurrency(row.forecast)}</td>
                    <td className="px-6 py-4 text-right font-mono">
                      <div className={`flex items-center justify-end gap-1 ${isOverBudget ? 'text-red-500' : 'text-green-500'}`}>
                        {isOverBudget ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {formatCurrency(Math.abs(variance))} ({Math.abs(variancePercent).toFixed(1)}%)
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
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-xl hover:bg-white/90 dark:hover:bg-slate-900/70 transition-all duration-300 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm overflow-hidden mb-6">
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-bold">Department Forecast Details</h2>
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
      {isSalesFormOpen && (
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
              <button onClick={() => setIsSalesFormOpen(false)} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Total Sales Forecast (FY 26-27)</label>
                  <input
                    type="number"
                    value={sales.forecast}
                    onChange={(e) => setSales({ ...sales, forecast: Number(e.target.value) })}
                    className="bg-slate-50/50 dark:bg-slate-800/50 border border-slate-300/50 dark:border-slate-700/50 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block w-full p-2.5"
                  />
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
                onClick={() => setIsSalesFormOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300/50 dark:border-slate-700/50 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Close
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
