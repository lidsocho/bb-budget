import { useMemo, useState, useRef, useEffect } from 'react';
import { formatCurrency, getAvailableMonths, ACCOUNTS } from '../store';
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import AccountFilter from './AccountFilter';
import DateRangeFilter from './DateRangeFilter';

const EXCLUDE_SET = new Set([
  'Transfer/Payment', 'Credit Payment', 'Income', 'Interest', 'Ignore', 'Refund',
]);
const FIXED_SET = new Set([
  'Rent', 'Utilities', 'Internet', 'Storage', 'Subscriptions', 'Insurance', 'Phone',
]);

function ProgressBar({ spent, budget }) {
  if (!budget) return null;
  const pct = Math.min((spent / budget) * 100, 100);
  const over = spent > budget;
  return (
    <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${over ? 'bg-wine-400' : 'bg-sage-400'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// Inline editable category name
function EditableCategoryName({ name, onRename }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const inputRef = useRef();

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  function save() {
    const trimmed = value.trim();
    if (trimmed && trimmed !== name) {
      onRename(name, trimmed);
    }
    setEditing(false);
    setValue(trimmed || name);
  }

  function cancel() {
    setValue(name);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input ref={inputRef} value={value} onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
          className="text-sm px-1.5 py-0.5 border border-sage-300 rounded bg-white w-40 focus:outline-none focus:ring-1 focus:ring-sage-400"
        />
        <button onClick={save} className="p-0.5 text-sage-600 hover:text-sage-800"><Check size={13} /></button>
        <button onClick={cancel} className="p-0.5 text-stone-400 hover:text-stone-600"><X size={13} /></button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 group">
      <span className="text-sm text-stone-700">{name}</span>
      <button onClick={() => setEditing(true)}
        className="p-0.5 rounded text-stone-300 opacity-0 group-hover:opacity-100 hover:text-stone-500 transition-opacity">
        <Pencil size={12} />
      </button>
    </div>
  );
}

// Add budget inline form
function AddBudgetRow({ categories, existingBudgets, onAdd }) {
  const [open, setOpen] = useState(false);
  const [selectedCat, setSelectedCat] = useState('');
  const [amount, setAmount] = useState('');

  const available = categories.filter(c => !existingBudgets[c]);

  function submit() {
    const val = parseFloat(amount);
    if (selectedCat && val > 0) {
      onAdd(selectedCat, val);
      setSelectedCat('');
      setAmount('');
      setOpen(false);
    }
  }

  if (!open) {
    return available.length > 0 ? (
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-sage-600 transition-colors mt-2">
        <Plus size={14} /> Add budget target
      </button>
    ) : null;
  }

  return (
    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-stone-100">
      <select value={selectedCat} onChange={e => setSelectedCat(e.target.value)}
        className="text-xs px-2 py-1.5 border border-stone-200 rounded-lg bg-white flex-1">
        <option value="">Category...</option>
        {available.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <input type="number" step="1" placeholder="$/mo" value={amount}
        onChange={e => setAmount(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(); }}
        className="num text-xs px-2 py-1.5 border border-stone-200 rounded-lg w-20"
      />
      <button onClick={submit}
        className="p-1.5 bg-sage-600 text-white rounded-lg hover:bg-sage-700 transition-colors">
        <Check size={13} />
      </button>
      <button onClick={() => { setOpen(false); setSelectedCat(''); setAmount(''); }}
        className="p-1.5 text-stone-400 hover:text-stone-600">
        <X size={13} />
      </button>
    </div>
  );
}

export default function MonthlySummary({ data, onUpdate }) {
  const now = new Date();
  const [dateFrom, setDateFrom] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  );
  const [dateTo, setDateTo] = useState(
    new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
  );
  const [filterAccounts, setFilterAccounts] = useState(ACCOUNTS.map(a => a.id));

  const availableMonths = useMemo(() => getAvailableMonths(data.transactions), [data.transactions]);

  const { variableCategories, fixedCategories } = useMemo(() => {
    const variable = [];
    const fixed = [];
    for (const cat of data.categories) {
      if (EXCLUDE_SET.has(cat)) continue;
      if (FIXED_SET.has(cat)) fixed.push(cat);
      else variable.push(cat);
    }
    return { variableCategories: variable, fixedCategories: fixed };
  }, [data.categories]);

  const summary = useMemo(() => {
    const txns = data.transactions.filter(t => {
      if (t.date < dateFrom || t.date > dateTo) return false;
      if (!filterAccounts.includes(t.account)) return false;
      if (!t.category || EXCLUDE_SET.has(t.category)) return false;
      return true;
    });

    const byCategory = {};
    for (const txn of txns) {
      if (!byCategory[txn.category]) byCategory[txn.category] = [];
      byCategory[txn.category].push(txn);
    }

    const variableTotals = {};
    let variableTotal = 0;
    for (const cat of variableCategories) {
      const total = (byCategory[cat] || []).reduce((s, t) => s + Math.abs(t.amount), 0);
      variableTotals[cat] = total;
      variableTotal += total;
    }

    const fixedTotals = {};
    let fixedTotal = 0;
    for (const cat of fixedCategories) {
      const total = (byCategory[cat] || []).reduce((s, t) => s + Math.abs(t.amount), 0);
      fixedTotals[cat] = total;
      fixedTotal += total;
    }

    const incomeTxns = data.transactions.filter(
      t => t.date >= dateFrom && t.date <= dateTo && (t.category === 'Income' || t.category === 'Interest')
    );
    const totalIncome = incomeTxns.reduce((s, t) => s + Math.abs(t.amount), 0);
    const subsTotal = data.subscriptions.reduce((s, sub) => s + sub.amount, 0);

    const [y1, m1] = dateFrom.split('-').map(Number);
    const [y2, m2] = dateTo.split('-').map(Number);
    const monthSpan = Math.max(1, (y2 - y1) * 12 + m2 - m1 + 1);

    return {
      variableTotals, variableTotal, fixedTotals, fixedTotal,
      totalIncome, subsTotal, totalExpenses: variableTotal + fixedTotal,
      net: totalIncome - (variableTotal + fixedTotal), monthSpan,
    };
  }, [data, dateFrom, dateTo, filterAccounts, variableCategories, fixedCategories]);

  const showAvg = summary.monthSpan > 1;

  // --- Mutations ---

  function renameCategory(oldName, newName) {
    if (data.categories.includes(newName) && newName !== oldName) return; // no dupes
    const updatedCategories = data.categories.map(c => c === oldName ? newName : c);
    const updatedTxns = data.transactions.map(t =>
      t.category === oldName ? { ...t, category: newName } : t
    );
    const updatedBudgets = { ...data.budgetTargets };
    if (updatedBudgets[oldName] !== undefined) {
      updatedBudgets[newName] = updatedBudgets[oldName];
      delete updatedBudgets[oldName];
    }
    const updatedFixed = { ...data.fixedExpenses };
    if (updatedFixed[oldName] !== undefined) {
      updatedFixed[newName] = updatedFixed[oldName];
      delete updatedFixed[oldName];
    }
    onUpdate({ ...data, categories: updatedCategories, transactions: updatedTxns, budgetTargets: updatedBudgets, fixedExpenses: updatedFixed });
  }

  function addBudget(cat, amount) {
    onUpdate({ ...data, budgetTargets: { ...data.budgetTargets, [cat]: amount } });
  }

  function removeBudget(cat) {
    const updated = { ...data.budgetTargets };
    delete updated[cat];
    onUpdate({ ...data, budgetTargets: updated });
  }

  return (
    <div className="space-y-6">
      {/* Date Range */}
      <div className="bg-white rounded-xl border border-stone-200 p-4">
        <DateRangeFilter from={dateFrom} to={dateTo}
          onChange={(f, t) => { setDateFrom(f); setDateTo(t); }}
          availableMonths={availableMonths} />
      </div>

      {/* Filters + Summary cards */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AccountFilter selected={filterAccounts} onChange={setFilterAccounts} />
        <div className="flex gap-3">
          <div className="px-4 py-2 bg-white border border-stone-200 rounded-xl text-center">
            <div className="text-xs text-stone-500 mb-0.5">Income</div>
            <div className="num num-pos font-semibold">{formatCurrency(summary.totalIncome)}</div>
            {showAvg && <div className="num text-xs text-stone-400">{formatCurrency(summary.totalIncome / summary.monthSpan)}/mo</div>}
          </div>
          <div className="px-4 py-2 bg-white border border-stone-200 rounded-xl text-center">
            <div className="text-xs text-stone-500 mb-0.5">Expenses</div>
            <div className="num num-neg font-semibold">{formatCurrency(summary.totalExpenses)}</div>
            {showAvg && <div className="num text-xs text-stone-400">{formatCurrency(summary.totalExpenses / summary.monthSpan)}/mo</div>}
          </div>
          <div className={`px-4 py-2 border rounded-xl text-center
            ${summary.net >= 0 ? 'bg-sage-50 border-sage-200' : 'bg-wine-50 border-wine-200'}`}>
            <div className="text-xs text-stone-500 mb-0.5">Net</div>
            <div className={`num font-bold ${summary.net >= 0 ? 'num-pos' : 'num-neg'}`}>
              {formatCurrency(summary.net)}
            </div>
            {showAvg && <div className="num text-xs text-stone-400">{formatCurrency(summary.net / summary.monthSpan)}/mo</div>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Variable Expenses */}
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider">Variable Expenses</h3>
            <span className="num font-semibold text-stone-700">{formatCurrency(summary.variableTotal)}</span>
          </div>
          <div className="space-y-3">
            {variableCategories.filter(cat => summary.variableTotals[cat] > 0 || data.budgetTargets[cat]).map(cat => {
              const spent = summary.variableTotals[cat] || 0;
              const budget = (data.budgetTargets[cat] || 0) * (showAvg ? summary.monthSpan : 1);
              const over = budget > 0 && spent > budget;
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-1">
                    <EditableCategoryName name={cat} onRename={renameCategory} />
                    <div className="flex items-center gap-2">
                      <span className={`num text-sm font-medium ${over ? 'num-neg' : ''}`}>
                        {formatCurrency(spent)}
                      </span>
                      {budget > 0 && (
                        <>
                          <span className="num text-xs text-stone-400">/ {formatCurrency(budget)}</span>
                          <button onClick={() => removeBudget(cat)}
                            className="p-0.5 text-stone-300 hover:text-wine-500 transition-colors">
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <ProgressBar spent={spent} budget={budget} />
                </div>
              );
            })}
            {/* Zero-spend categories */}
            {(() => {
              const zeroSpend = variableCategories.filter(cat => !summary.variableTotals[cat] && !data.budgetTargets[cat]);
              return zeroSpend.length > 0 && (
                <div className="text-xs text-stone-400 pt-1">
                  No spending: {zeroSpend.join(', ')}
                </div>
              );
            })()}
            <AddBudgetRow categories={variableCategories} existingBudgets={data.budgetTargets} onAdd={addBudget} />
          </div>
        </div>

        {/* Fixed Expenses */}
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider">Fixed Expenses</h3>
            <span className="num font-semibold text-stone-700">{formatCurrency(summary.fixedTotal)}</span>
          </div>
          <div className="space-y-3">
            {fixedCategories.map(cat => {
              const spent = summary.fixedTotals[cat] || 0;
              return (
                <div key={cat} className="flex items-center justify-between py-1">
                  <EditableCategoryName name={cat} onRename={renameCategory} />
                  <span className="num text-sm font-medium">{spent > 0 ? formatCurrency(spent) : '—'}</span>
                </div>
              );
            })}
            <div className="border-t border-stone-100 pt-2 mt-2">
              <div className="text-xs text-stone-500 mb-2">Subscriptions breakdown:</div>
              {data.subscriptions.map((sub, i) => (
                <div key={i} className="flex items-center justify-between py-0.5">
                  <span className="text-xs text-stone-500">{sub.name}</span>
                  <span className="num text-xs text-stone-500">{formatCurrency(sub.amount)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-1 border-t border-stone-50">
                <span className="text-xs font-medium text-stone-600">Subs total</span>
                <span className="num text-xs font-medium">{formatCurrency(summary.subsTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
