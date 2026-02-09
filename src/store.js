// Local storage persistence for Bb Budget
const STORAGE_KEY = 'bb_budget_data';

const DEFAULT_CATEGORIES = [
  'Groceries',
  'Eating Out',
  'Coffee/Drinks',
  'Gas/Transport',
  'Travel',
  'Doctors/Health',
  'Home/Cat/Shipping',
  'Alcohol/Snacks/Entertainment',
  'Clothing/Beauty',
  'Education/Books',
  'Gifts/Donations',
  'Fitness/Wellness',
  'Misc',
  'Rent',
  'Utilities',
  'Storage',
  'Subscriptions',
  'Insurance',
  'Phone',
  'Internet',
  'Transfer/Payment',
  'Income',
  'Refund',
  'Ignore',
];

const DEFAULT_BUDGET_TARGETS = {
  'Groceries': 400,
  'Eating Out': 200,
  'Coffee/Drinks': 50,
  'Gas/Transport': 50,
  'Travel': 0,
  'Doctors/Health': 400,
  'Fitness/Wellness': 50,
  'Home/Cat/Shipping': 100,
  'Alcohol/Snacks/Entertainment': 100,
  'Clothing/Beauty': 100,
  'Education/Books': 50,
  'Gifts/Donations': 50,
  'Misc': 100,
};

const DEFAULT_FIXED_EXPENSES = {
  'Rent': 0,
  'Utilities': 0,
  'Internet': 0,
  'Storage': 116,
  'Subscriptions': 0,
  'Insurance': 0,
  'Phone': 45,
};

const ACCOUNTS = [
  { id: 'wf_checking', label: 'Wells Fargo Checking', type: 'checking' },
  { id: 'wf_credit', label: 'Wells Fargo Credit', type: 'credit' },
  { id: 'discover_credit', label: 'Discover Credit', type: 'credit' },
  { id: 'sofi_checking', label: 'SoFi Checking', type: 'checking' },
  { id: 'sofi_savings', label: 'SoFi Savings', type: 'savings' },
  { id: 'venmo', label: 'Venmo', type: 'checking' },
];

import { getPrefillData } from './prefillData';

function getDefaultData() {
  const prefill = getPrefillData();
  return {
    transactions: prefill.transactions,
    balanceSnapshots: prefill.balanceSnapshots,
    budgetTargets: { ...DEFAULT_BUDGET_TARGETS },
    fixedExpenses: { ...DEFAULT_FIXED_EXPENSES },
    income: [],
    categories: [...DEFAULT_CATEGORIES],
    subscriptions: [
      { name: 'Flo', amount: 15 },
      { name: 'Hulu', amount: 20.56 },
      { name: 'Planet Fitness', amount: 10.83 },
      { name: 'iCloud', amount: 2.99 },
      { name: 'Spotify', amount: 11.90 },
      { name: 'Audible', amount: 13.30 },
      { name: 'Spectrum', amount: 35.17 },
    ],
  };
}

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Merge with defaults for any missing fields
      const defaults = getDefaultData();
      return { ...defaults, ...parsed };
    }
  } catch (e) {
    console.error('Failed to load budget data:', e);
  }
  return getDefaultData();
}

export function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save budget data:', e);
  }
}

export function exportAllData() {
  const data = loadData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bb-budget-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importAllData(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    saveData(data);
    return data;
  } catch (e) {
    console.error('Failed to import data:', e);
    return null;
  }
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function getMonthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function getMonthLabel(monthKey) {
  const [year, month] = monthKey.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(month) - 1]} ${year}`;
}

export function getAvailableMonths(transactions) {
  const months = new Set(transactions.map(t => getMonthKey(t.date)));
  return Array.from(months).sort().reverse();
}

export function formatCurrency(amount) {
  const abs = Math.abs(amount);
  return `${amount < 0 ? '-' : ''}$${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export { DEFAULT_CATEGORIES, DEFAULT_BUDGET_TARGETS, DEFAULT_FIXED_EXPENSES, ACCOUNTS };
