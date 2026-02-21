import { useMemo, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, AreaChart, Area,
} from 'recharts';
import { formatCurrency, getMonthKey, getMonthLabel, getAvailableMonths, ACCOUNTS } from '../store';
import AccountFilter from './AccountFilter';
import DateRangeFilter from './DateRangeFilter';

// Categories excluded from expense charts
const EXCLUDE_SET = new Set([
  'Transfer/Payment', 'Credit Payment', 'Income', 'Interest', 'Ignore', 'Refund',
]);
const FIXED_SET = new Set([
  'Rent', 'Utilities', 'Internet', 'Storage', 'Subscriptions', 'Insurance', 'Phone',
]);

// Color palette — known categories get stable colors, others get assigned from pool
const KNOWN_COLORS = {
  'Groceries': '#6b7f5c',
  'Eating Out': '#d4702e',
  'Coffee/Drinks': '#92400e',
  'Coffee': '#92400e',
  'Gas/Transport': '#78716c',
  'Parking': '#57534e',
  'Car Care': '#44403c',
  'Travel': '#2563eb',
  'Doctors/Health': '#c92250',
  'Fitness/Wellness': '#059669',
  'Home/Cat/Shipping': '#8f9e82',
  'Alcohol/Snacks/Entertainment': '#a855f7',
  'Clothing/Beauty': '#ec4899',
  'Clothes': '#ec4899',
  'Hair': '#db2777',
  'Education/Books': '#0891b2',
  'Gifts/Donations': '#f59e0b',
  'Gift': '#f59e0b',
  'Misc': '#a8a29e',
  'Art Materials': '#7c3aed',
  'Art Exhibit': '#8b5cf6',
  'Work Expenses': '#64748b',
  'Moving': '#ea580c',
  'Fidelity': '#15803d',
};
const FALLBACK_COLORS = [
  '#e11d48', '#0ea5e9', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#f43f5e', '#a3e635', '#38bdf8', '#c084fc',
  '#fb923c', '#22d3ee', '#facc15', '#4ade80', '#818cf8',
];

function getColorForCategory(cat, index) {
  return KNOWN_COLORS[cat] || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-stone-200 rounded-lg shadow-lg p-3 text-sm">
      <div className="font-medium text-stone-700 mb-1">{label}</div>
      {payload.filter(p => p.value !== 0).map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-stone-600">{p.name}:</span>
          <span className="num font-medium">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function Trends({ data }) {
  const [chartType, setChartType] = useState('spending');
  const [filterAccounts, setFilterAccounts] = useState(ACCOUNTS.map(a => a.id));

  // Default to last 6 months for trends
  const now = new Date();
  const [dateFrom, setDateFrom] = useState(
    new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().slice(0, 10)
  );
  const [dateTo, setDateTo] = useState(
    new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
  );

  const availableMonths = useMemo(() => getAvailableMonths(data.transactions), [data.transactions]);

  // Get months in range
  const monthsInRange = useMemo(() => {
    const all = getAvailableMonths(data.transactions).reverse();
    return all.filter(m => {
      const [y, mo] = m.split('-').map(Number);
      const mStart = new Date(y, mo - 1, 1).toISOString().slice(0, 10);
      const mEnd = new Date(y, mo, 0).toISOString().slice(0, 10);
      return mEnd >= dateFrom && mStart <= dateTo;
    });
  }, [data.transactions, dateFrom, dateTo]);

  // Filtered transactions
  const filteredTxns = useMemo(() => {
    return data.transactions.filter(t =>
      t.date >= dateFrom && t.date <= dateTo && filterAccounts.includes(t.account)
    );
  }, [data.transactions, dateFrom, dateTo, filterAccounts]);

  // Derive expense categories dynamically from data.categories
  const expenseCategories = useMemo(() => {
    return data.categories.filter(cat => !EXCLUDE_SET.has(cat) && !FIXED_SET.has(cat));
  }, [data.categories]);

  const categoryTrends = useMemo(() => {
    return monthsInRange.map(month => {
      const txns = filteredTxns.filter(
        t => t.month === month && t.category && !EXCLUDE_SET.has(t.category)
      );
      const row = { month: getMonthLabel(month) };
      for (const cat of expenseCategories) {
        row[cat] = txns.filter(t => t.category === cat).reduce((s, t) => s + Math.abs(t.amount), 0);
      }
      return row;
    });
  }, [filteredTxns, monthsInRange, expenseCategories]);

  const spendingTrends = useMemo(() => {
    return monthsInRange.map(month => {
      const txns = filteredTxns.filter(t => t.month === month && t.category);
      const expenses = txns
        .filter(t => !EXCLUDE_SET.has(t.category) && t.category !== 'Income' && t.category !== 'Interest')
        .reduce((s, t) => s + Math.abs(t.amount), 0);
      const income = txns.filter(t => t.category === 'Income' || t.category === 'Interest').reduce((s, t) => s + Math.abs(t.amount), 0);
      return { month: getMonthLabel(month), Expenses: expenses, Income: income, Net: income - expenses };
    });
  }, [filteredTxns, monthsInRange]);

  const balanceTrends = useMemo(() => {
    const CREDIT_ACCOUNTS = new Set(['wf_credit', 'discover_credit']);
    const ACCT_FIELDS = ['wf_checking', 'wf_credit', 'discover_credit', 'sofi_checking', 'sofi_savings', 'venmo'];

    // Start with snapshot data points
    const points = data.balanceSnapshots
      .filter(s => s.date >= dateFrom && s.date <= dateTo)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(snap => ({
        date: snap.date,
        'WF Checking': snap.wf_checking || 0,
        'WF Credit': Math.abs(snap.wf_credit || 0),
        'Discover Credit': Math.abs(snap.discover_credit || 0),
        'SoFi Checking': snap.sofi_checking || 0,
        'SoFi Savings': snap.sofi_savings || 0,
        'Venmo': snap.venmo || 0,
        'Total Liquid': (snap.wf_checking || 0) + (snap.sofi_checking || 0) + (snap.sofi_savings || 0) + (snap.venmo || 0),
      }));

    // Add computed "today" point from latest snapshot + transactions since
    const allSnaps = [...data.balanceSnapshots].sort((a, b) => b.date.localeCompare(a.date));
    const latestSnap = allSnaps[0];
    if (latestSnap) {
      const today = new Date().toISOString().slice(0, 10);
      if (today > latestSnap.date && today >= dateFrom && today <= dateTo) {
        const computed = {};
        for (const field of ACCT_FIELDS) {
          const snapVal = latestSnap[field] || 0;
          const txnSum = data.transactions
            .filter(t => t.account === field && t.date > latestSnap.date)
            .reduce((s, t) => s + t.amount, 0);
          if (CREDIT_ACCOUNTS.has(field)) {
            computed[field] = snapVal - txnSum; // charges (negative) increase owed
          } else {
            computed[field] = snapVal + txnSum;
          }
        }
        points.push({
          date: today + ' (now)',
          'WF Checking': computed.wf_checking,
          'WF Credit': Math.abs(computed.wf_credit),
          'Discover Credit': Math.abs(computed.discover_credit),
          'SoFi Checking': computed.sofi_checking,
          'SoFi Savings': computed.sofi_savings,
          'Venmo': computed.venmo,
          'Total Liquid': computed.wf_checking + computed.sofi_checking + computed.sofi_savings + computed.venmo,
        });
      }
    }

    return points;
  }, [data.balanceSnapshots, data.transactions, dateFrom, dateTo]);

  // Active categories (ones with data in the range)
  const activeCategories = useMemo(() => {
    return expenseCategories.filter(cat =>
      categoryTrends.some(row => row[cat] > 0)
    );
  }, [categoryTrends, expenseCategories]);

  return (
    <div className="space-y-6">
      {/* Date Range */}
      <div className="bg-white rounded-xl border border-stone-200 p-4">
        <DateRangeFilter from={dateFrom} to={dateTo}
          onChange={(f, t) => { setDateFrom(f); setDateTo(t); }}
          availableMonths={availableMonths} />
      </div>

      {/* Chart Selector + Account Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {[
            { id: 'spending', label: 'Income vs Spending' },
            { id: 'categories', label: 'Category Breakdown' },
            { id: 'balances', label: 'Account Balances' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setChartType(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                ${chartType === tab.id ? 'bg-stone-800 text-white' : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'}`}>
              {tab.label}
            </button>
          ))}
        </div>
        {chartType !== 'balances' && (
          <AccountFilter selected={filterAccounts} onChange={setFilterAccounts} />
        )}
      </div>

      {/* Income vs Spending */}
      {chartType === 'spending' && (
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-4">Income vs Expenses</h3>
          {spendingTrends.length === 0 ? (
            <div className="p-12 text-center text-stone-400">No data in selected range</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={spendingTrends} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#78716c' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#78716c' }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="Income" fill="#6b7f5c" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Expenses" fill="#c92250" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4">
                <h4 className="text-xs text-stone-500 uppercase tracking-wider mb-2">Net (Income − Expenses)</h4>
                <ResponsiveContainer width="100%" height={150}>
                  <AreaChart data={spendingTrends} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#78716c' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#78716c' }} tickFormatter={v => `$${v.toFixed(0)}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="Net" stroke="#6b7f5c" fill="#e8ebe5" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      )}

      {/* Category Breakdown */}
      {chartType === 'categories' && (
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-4">Variable Expenses by Category</h3>
          {categoryTrends.length === 0 ? (
            <div className="p-12 text-center text-stone-400">No data in selected range</div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={categoryTrends} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#78716c' }} />
                <YAxis tick={{ fontSize: 12, fill: '#78716c' }} tickFormatter={v => `$${v.toFixed(0)}`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {activeCategories.map((cat, i) => (
                  <Bar key={cat} dataKey={cat} stackId="a" fill={getColorForCategory(cat, i)} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* Balance Trends */}
      {chartType === 'balances' && (
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-4">Account Balances Over Time</h3>
          {balanceTrends.length === 0 ? (
            <div className="p-12 text-center text-stone-400">Add balance snapshots to see trends</div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={balanceTrends} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#78716c' }} />
                <YAxis tick={{ fontSize: 12, fill: '#78716c' }} tickFormatter={v => `$${(v/1000).toFixed(1)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="WF Checking" stroke="#d4702e" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="WF Credit" stroke="#c92250" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 4" />
                <Line type="monotone" dataKey="Discover Credit" stroke="#a91843" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 4" />
                <Line type="monotone" dataKey="SoFi Checking" stroke="#6b7f5c" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="SoFi Savings" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Venmo" stroke="#008CFF" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Total Liquid" stroke="#292524" strokeWidth={2.5} dot={{ r: 3 }} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  );
}
