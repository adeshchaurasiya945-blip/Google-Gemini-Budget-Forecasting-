export const formatCurrency = (value: number) => {
  if (value === undefined || value === null || isNaN(value)) return '₹0';
  if (value >= 10000000) {
    return `₹${(value / 10000000).toFixed(0)} Cr`;
  } else if (value >= 100000) {
    return `₹${(value / 100000).toFixed(0)} L`;
  } else {
    return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  }
};
