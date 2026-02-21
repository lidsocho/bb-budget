import { useState, useRef, useMemo } from 'react';
import { Upload, Check, CheckCheck, X, Sparkles, Copy } from 'lucide-react';
import { parseCSV, suggestCategory } from '../csvParser';
import { ACCOUNTS, formatCurrency, getMonthKey } from '../store';
import AccountFilter from './AccountFilter';
import DateRangeFilter from './DateRangeFilter';

// Normalize description for merchant matching
function normalizeMerchant(desc) {
  if (!desc) return '';
  return desc
    .toLowerCase()
    .replace(/\d{4,}/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/[#*]/g, '')
    .trim();
}

// Extract merchant key — first 3 words up to 40 chars
function getMerchantKey(desc) {
  if (!desc) return '';
  const norm = normalizeMerchant(desc);
  const words = norm.split(/\s+/).slice(0, 3).join(' ');
  return words.slice(0, 40);
}

export default function TransactionReview({ data, onUpdate }) {
  const [importing, setImporting] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [filterAccounts, setFilterAccounts] = useState(ACCOUNTS.map(a => a.id));
  const [filterReviewed, setFilterReviewed] = useState('unreviewed');
  const [filterCategory, setFilterCategory] = useState('all');
  const [applyAllMenu, setApplyAllMenu] = useState(null);
  const fileRef = useRef();

  const now = new Date();
  const [dateFrom, setDateFrom] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  );
  const [dateTo, setDateTo] = useState(
    new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
  );

  const availableMonths = useMemo(() => {
    const m = new Set(data.transactions.map(t => t.month));
    return Array.from(m).sort().reverse();
  }, [data.transactions]);

  const filtered = useMemo(() => {
    return data.transactions
      .filter(t => {
        if (t.date < dateFrom || t.date > dateTo) return false;
        if (!filterAccounts.includes(t.account)) return false;
        if (filterReviewed === 'unreviewed' && t.reviewed) return false;
        if (filterReviewed === 'reviewed' && !t.reviewed) return false;
        if (filterCategory === 'uncategorized' && t.category) return false;
        if (filterCategory !== 'all' && filterCategory !== 'uncategorized' && t.category !== filterCategory) return false;
        return true;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [data.transactions, dateFrom, dateTo, filterAccounts, filterReviewed, filterCategory]);

  const stats = useMemo(() => {
    const rangeTxns = data.transactions.filter(t => t.date >= dateFrom && t.date <= dateTo);
    const total = rangeTxns.length;
    const reviewed = rangeTxns.filter(t => t.reviewed).length;
    return { total, reviewed, pct: total ? Math.round((reviewed / total) * 100) : 0 };
  }, [data.transactions, dateFrom, dateTo]);

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !selectedAccount) return;
    setImporting(true);
    try {
      const text = await file.text();
      const { transactions: newTxns, latestBalance } = await parseCSV(text, selectedAccount);
      for (const txn of newTxns) {
        const suggestion = suggestCategory(txn.description);
        if (suggestion) txn.category = suggestion;
      }
      const existing = new Set(data.transactions.map(t => `${t.date}|${t.amount}|${t.description}`));
      const unique = newTxns.filter(t => !existing.has(`${t.date}|${t.amount}|${t.description}`));

      let updatedSnapshots = [...data.balanceSnapshots];
      if (latestBalance) {
        const snapDate = latestBalance.date;
        const existingSnap = updatedSnapshots.find(s => s.date === snapDate);
        if (existingSnap) {
          existingSnap[selectedAccount] = latestBalance.balance;
        } else {
          const sorted = [...updatedSnapshots].sort((a, b) => b.date.localeCompare(a.date));
          const prev = sorted[0] || {};
          updatedSnapshots.push({
            id: `snap_${Date.now()}`, date: snapDate,
            wf_checking: prev.wf_checking || 0, wf_credit: prev.wf_credit || 0,
            discover_credit: prev.discover_credit || 0, sofi_checking: prev.sofi_checking || 0,
            sofi_savings: prev.sofi_savings || 0, venmo: prev.venmo || 0,
            [selectedAccount]: latestBalance.balance,
          });
        }
      }
      onUpdate({ ...data, transactions: [...data.transactions, ...unique], balanceSnapshots: updatedSnapshots });
      const balanceMsg = latestBalance ? ` Balance: ${formatCurrency(latestBalance.balance)} on ${latestBalance.date}.` : '';
      alert(`Imported ${unique.length} new transactions (${newTxns.length - unique.length} dupes skipped).${balanceMsg}`);
    } catch (err) {
      alert('Error parsing CSV: ' + err.message);
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function updateTransaction(id, updates) {
    onUpdate({ ...data, transactions: data.transactions.map(t => t.id === id ? { ...t, ...updates } : t) });
  }

  function applyCategoryToSimilar(txn, category, mode) {
    const updated = data.transactions.map(t => {
      if (t.id === txn.id) return { ...t, category };
      if (mode === 'exact' && normalizeMerchant(t.description) === normalizeMerchant(txn.description)) return { ...t, category };
      if (mode === 'merchant' && getMerchantKey(t.description) === getMerchantKey(txn.description)) return { ...t, category };
      return t;
    });
    onUpdate({ ...data, transactions: updated });
    setApplyAllMenu(null);
  }

  function countSimilar(txn, mode) {
    if (mode === 'exact') {
      const norm = normalizeMerchant(txn.description);
      return data.transactions.filter(t => t.id !== txn.id && normalizeMerchant(t.description) === norm).length;
    }
    const key = getMerchantKey(txn.description);
    return data.transactions.filter(t => t.id !== txn.id && getMerchantKey(t.description) === key).length;
  }

  function autoSuggestAll() {
    const updated = data.transactions.map(t => {
      if (t.date >= dateFrom && t.date <= dateTo && !t.category) {
        const s = suggestCategory(t.description);
        return s ? { ...t, category: s } : t;
      }
      return t;
    });
    onUpdate({ ...data, transactions: updated });
  }

  function markAllReviewed() {
    const updated = data.transactions.map(t =>
      t.date >= dateFrom && t.date <= dateTo && t.category ? { ...t, reviewed: true } : t
    );
    onUpdate({ ...data, transactions: updated });
  }

  return (
    <div className="space-y-6">
      {/* Import */}
      <div className="bg-white rounded-xl border border-stone-200 p-5">
        <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-4">Import Transactions</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-stone-500 mb-1">Account</label>
            <select value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)}
              className="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sage-300">
              <option value="">Select account...</option>
              {ACCOUNTS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
          </div>
          <div>
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFileUpload}
              disabled={!selectedAccount || importing} className="hidden" id="csv-upload" />
            <label htmlFor="csv-upload"
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors
                ${selectedAccount ? 'bg-stone-800 text-white hover:bg-stone-700' : 'bg-stone-100 text-stone-400 cursor-not-allowed'}`}>
              <Upload size={16} />
              {importing ? 'Importing...' : 'Upload CSV'}
            </label>
          </div>
        </div>
      </div>

      {/* Date Range */}
      <div className="bg-white rounded-xl border border-stone-200 p-4">
        <DateRangeFilter from={dateFrom} to={dateTo}
          onChange={(f, t) => { setDateFrom(f); setDateTo(t); }}
          availableMonths={availableMonths} />
      </div>

      {/* Filters & Progress */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <AccountFilter selected={filterAccounts} onChange={setFilterAccounts} />
          <select value={filterReviewed} onChange={e => setFilterReviewed(e.target.value)}
            className="px-3 py-1.5 border border-stone-200 rounded-lg text-sm bg-white">
            <option value="all">All</option>
            <option value="unreviewed">Unreviewed</option>
            <option value="reviewed">Reviewed</option>
          </select>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
            className="px-3 py-1.5 border border-stone-200 rounded-lg text-sm bg-white">
            <option value="all">All Categories</option>
            <option value="uncategorized">Uncategorized</option>
            {data.categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-stone-500">
            <span className="num">{stats.reviewed}</span>/{stats.total} reviewed ({stats.pct}%)
          </div>
          <div className="w-24 h-1.5 bg-stone-200 rounded-full overflow-hidden">
            <div className="h-full bg-sage-500 rounded-full transition-all duration-300" style={{ width: `${stats.pct}%` }} />
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {filtered.length > 0 && (
        <div className="flex gap-2">
          <button onClick={autoSuggestAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-clay-50 text-clay-700 rounded-lg hover:bg-clay-100 transition-colors">
            <Sparkles size={14} /> Auto-categorize uncategorized
          </button>
          <button onClick={markAllReviewed}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-sage-50 text-sage-700 rounded-lg hover:bg-sage-100 transition-colors">
            <CheckCheck size={14} /> Mark all categorized as reviewed
          </button>
        </div>
      )}

      {/* Transaction List */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-stone-400">
            {data.transactions.length === 0 ? 'Import a CSV to get started' : 'No transactions match your filters'}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-xs text-stone-500 uppercase tracking-wider border-b border-stone-100">
                <th className="text-left p-3 font-semibold">Date</th>
                <th className="text-left p-3 font-semibold">Description</th>
                <th className="text-left p-3 font-semibold">Account</th>
                <th className="text-right p-3 font-semibold">Amount</th>
                <th className="text-left p-3 font-semibold w-52">Category</th>
                <th className="text-center p-3 font-semibold w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(txn => (
                <tr key={txn.id}
                  className={`border-b border-stone-50 transition-colors ${txn.reviewed ? 'bg-sage-50/30' : 'hover:bg-stone-50'}`}>
                  <td className="p-3 text-sm num text-stone-500">{txn.date}</td>
                  <td className="p-3 text-sm max-w-xs truncate" title={txn.description}>{txn.description}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                      ${txn.account === 'wf_credit' ? 'bg-wine-50 text-wine-600' :
                        txn.account === 'discover_credit' ? 'bg-clay-50 text-clay-700' :
                        txn.account === 'wf_checking' ? 'bg-stone-100 text-stone-600' :
                        txn.account === 'sofi_checking' ? 'bg-sage-50 text-sage-600' :
                        txn.account === 'venmo' ? 'bg-blue-50 text-blue-600' :
                        'bg-stone-100 text-stone-600'}`}>
                      {ACCOUNTS.find(a => a.id === txn.account)?.label?.replace('Wells Fargo', 'WF') || txn.account}
                    </span>
                  </td>
                  <td className={`p-3 text-sm text-right num ${txn.amount >= 0 ? 'num-pos' : 'num-neg'}`}>
                    {formatCurrency(txn.amount)}
                  </td>
                  <td className="p-3 relative">
                    <div className="flex items-center gap-1">
                      <select value={txn.category || ''}
                        onChange={e => {
                          const cat = e.target.value || null;
                          updateTransaction(txn.id, { category: cat });
                          if (cat) {
                            const exactCount = countSimilar(txn, 'exact');
                            const merchantCount = countSimilar(txn, 'merchant');
                            if (exactCount > 0 || merchantCount > 0) {
                              setApplyAllMenu({ txnId: txn.id, txn, category: cat, exactCount, merchantCount });
                            }
                          }
                        }}
                        className={`flex-1 px-2 py-1 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sage-300
                          ${txn.category ? 'border-stone-200' : 'border-clay-300 bg-clay-50'}`}>
                        <option value="">— Select —</option>
                        {data.categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      {txn.category && (
                        <button onClick={() => {
                          const exactCount = countSimilar(txn, 'exact');
                          const merchantCount = countSimilar(txn, 'merchant');
                          if (exactCount > 0 || merchantCount > 0) {
                            setApplyAllMenu(applyAllMenu?.txnId === txn.id ? null : { txnId: txn.id, txn, category: txn.category, exactCount, merchantCount });
                          }
                        }}
                          className="p-1 rounded text-stone-400 hover:text-clay-600 hover:bg-clay-50 transition-colors"
                          title="Apply to similar transactions">
                          <Copy size={14} />
                        </button>
                      )}
                    </div>
                    {applyAllMenu?.txnId === txn.id && (
                      <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-stone-200 rounded-xl shadow-lg z-50 py-2">
                        <div className="px-3 py-1 text-xs text-stone-500 font-medium">
                          Apply "{applyAllMenu.category}" to similar:
                        </div>
                        {applyAllMenu.exactCount > 0 && (
                          <button onClick={() => applyCategoryToSimilar(txn, applyAllMenu.category, 'exact')}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-sage-50 transition-colors">
                            <span className="font-medium">Exact description match</span>
                            <span className="text-stone-400 ml-1">({applyAllMenu.exactCount} transactions)</span>
                          </button>
                        )}
                        {applyAllMenu.merchantCount > 0 && applyAllMenu.merchantCount !== applyAllMenu.exactCount && (
                          <button onClick={() => applyCategoryToSimilar(txn, applyAllMenu.category, 'merchant')}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-sage-50 transition-colors">
                            <span className="font-medium">Same merchant</span>
                            <span className="text-stone-400 ml-1">({applyAllMenu.merchantCount} transactions)</span>
                            <div className="text-xs text-stone-400 mt-0.5 truncate">Matches: "{getMerchantKey(txn.description)}..."</div>
                          </button>
                        )}
                        <button onClick={() => setApplyAllMenu(null)}
                          className="w-full text-left px-3 py-1.5 text-xs text-stone-400 hover:bg-stone-50 transition-colors border-t border-stone-100 mt-1">
                          Dismiss
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {!txn.reviewed ? (
                        <button onClick={() => updateTransaction(txn.id, { reviewed: true })} disabled={!txn.category}
                          className={`p-1 rounded transition-colors ${txn.category ? 'text-sage-600 hover:bg-sage-100' : 'text-stone-300 cursor-not-allowed'}`}
                          title="Mark reviewed">
                          <Check size={16} />
                        </button>
                      ) : (
                        <span className="p-1 text-sage-500"><CheckCheck size={16} /></span>
                      )}
                      <button onClick={() => onUpdate({ ...data, transactions: data.transactions.filter(t => t.id !== txn.id) })}
                        className="p-1 rounded text-stone-300 hover:text-wine-500 hover:bg-wine-50 transition-colors" title="Delete">
                        <X size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {filtered.length > 0 && (
        <div className="flex justify-end gap-6 text-sm px-2">
          <div className="text-stone-500">
            Showing <span className="num font-medium text-stone-700">{filtered.length}</span> transactions
          </div>
          <div className="text-stone-500">
            Total: <span className={`num font-semibold ${filtered.reduce((s, t) => s + t.amount, 0) >= 0 ? 'num-pos' : 'num-neg'}`}>
              {formatCurrency(filtered.reduce((s, t) => s + t.amount, 0))}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
