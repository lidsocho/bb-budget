import { useState, useRef } from 'react';
import { Download, Upload, Plus, Trash2, Save } from 'lucide-react';
import { exportAllData, importAllData, formatCurrency } from '../store';

export default function Settings({ data, onUpdate }) {
  const fileRef = useRef();
  const [newSub, setNewSub] = useState({ name: '', amount: '' });
  const [newCategory, setNewCategory] = useState('');

  function updateBudgetTarget(category, value) {
    onUpdate({
      ...data,
      budgetTargets: { ...data.budgetTargets, [category]: parseFloat(value) || 0 },
    });
  }

  function addSubscription() {
    if (!newSub.name || !newSub.amount) return;
    onUpdate({
      ...data,
      subscriptions: [...data.subscriptions, { name: newSub.name, amount: parseFloat(newSub.amount) || 0 }],
    });
    setNewSub({ name: '', amount: '' });
  }

  function removeSubscription(index) {
    onUpdate({
      ...data,
      subscriptions: data.subscriptions.filter((_, i) => i !== index),
    });
  }

  function updateSubscription(index, field, value) {
    const updated = [...data.subscriptions];
    updated[index] = { ...updated[index], [field]: field === 'amount' ? parseFloat(value) || 0 : value };
    onUpdate({ ...data, subscriptions: updated });
  }

  function addCategory() {
    if (!newCategory || data.categories.includes(newCategory)) return;
    onUpdate({
      ...data,
      categories: [...data.categories, newCategory],
    });
    setNewCategory('');
  }

  function removeCategory(cat) {
    // Don't remove if transactions use it
    const inUse = data.transactions.some(t => t.category === cat);
    if (inUse) {
      alert(`Can't remove "${cat}" — it's used by existing transactions. Re-categorize them first.`);
      return;
    }
    onUpdate({
      ...data,
      categories: data.categories.filter(c => c !== cat),
    });
  }

  function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then(text => {
      const imported = importAllData(text);
      if (imported) {
        onUpdate(imported);
        alert('Data imported successfully');
      } else {
        alert('Failed to import data — check file format');
      }
    });
    if (fileRef.current) fileRef.current.value = '';
  }

  function clearAllData() {
    if (window.confirm('Are you sure? This will delete ALL your budget data. Export a backup first!')) {
      if (window.confirm('Really? This cannot be undone.')) {
        localStorage.removeItem('bb_budget_data');
        window.location.reload();
      }
    }
  }

  const subsTotal = data.subscriptions.reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Budget Targets */}
      <div className="bg-white rounded-xl border border-stone-200 p-5">
        <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-4">Monthly Budget Targets</h3>
        <p className="text-xs text-stone-400 mb-4">Set spending limits for variable categories. These show up as progress bars in the Monthly Summary.</p>
        <div className="space-y-2">
          {Object.entries(data.budgetTargets).map(([cat, amount]) => (
            <div key={cat} className="flex items-center gap-3">
              <span className="text-sm text-stone-700 w-56">{cat}</span>
              <div className="flex items-center gap-1">
                <span className="text-sm text-stone-400">$</span>
                <input
                  type="number"
                  value={amount || ''}
                  onChange={e => updateBudgetTarget(cat, e.target.value)}
                  placeholder="0"
                  className="w-24 px-2 py-1 border border-stone-200 rounded-lg text-sm num text-right"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Subscriptions */}
      <div className="bg-white rounded-xl border border-stone-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider">Subscriptions</h3>
          <span className="num text-sm text-stone-500">Total: {formatCurrency(subsTotal)}/mo</span>
        </div>
        <div className="space-y-2">
          {data.subscriptions.map((sub, i) => (
            <div key={i} className="flex items-center gap-3">
              <input
                type="text"
                value={sub.name}
                onChange={e => updateSubscription(i, 'name', e.target.value)}
                className="flex-1 px-2 py-1 border border-stone-200 rounded-lg text-sm"
              />
              <div className="flex items-center gap-1">
                <span className="text-sm text-stone-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={sub.amount || ''}
                  onChange={e => updateSubscription(i, 'amount', e.target.value)}
                  className="w-20 px-2 py-1 border border-stone-200 rounded-lg text-sm num text-right"
                />
              </div>
              <button
                onClick={() => removeSubscription(i)}
                className="p-1 rounded text-stone-300 hover:text-wine-500 hover:bg-wine-50 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3">
          <input
            type="text"
            value={newSub.name}
            onChange={e => setNewSub({ ...newSub, name: e.target.value })}
            placeholder="Service name"
            className="flex-1 px-2 py-1 border border-stone-200 rounded-lg text-sm"
          />
          <div className="flex items-center gap-1">
            <span className="text-sm text-stone-400">$</span>
            <input
              type="number"
              step="0.01"
              value={newSub.amount}
              onChange={e => setNewSub({ ...newSub, amount: e.target.value })}
              placeholder="0.00"
              className="w-20 px-2 py-1 border border-stone-200 rounded-lg text-sm num text-right"
            />
          </div>
          <button
            onClick={addSubscription}
            className="p-1.5 rounded bg-sage-50 text-sage-700 hover:bg-sage-100 transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="bg-white rounded-xl border border-stone-200 p-5">
        <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-4">Expense Categories</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {data.categories.map(cat => (
            <span key={cat} className="inline-flex items-center gap-1 px-2 py-1 bg-stone-100 rounded-lg text-sm">
              {cat}
              <button
                onClick={() => removeCategory(cat)}
                className="text-stone-400 hover:text-wine-500"
              >
                <Trash2 size={12} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newCategory}
            onChange={e => setNewCategory(e.target.value)}
            placeholder="New category name"
            className="flex-1 px-2 py-1 border border-stone-200 rounded-lg text-sm"
            onKeyDown={e => e.key === 'Enter' && addCategory()}
          />
          <button
            onClick={addCategory}
            className="p-1.5 rounded bg-sage-50 text-sage-700 hover:bg-sage-100 transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-white rounded-xl border border-stone-200 p-5">
        <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-4">Data Management</h3>
        <p className="text-xs text-stone-400 mb-4">Your data is stored in your browser's local storage. Export regularly as a backup.</p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={exportAllData}
            className="inline-flex items-center gap-2 px-4 py-2 bg-stone-800 text-white rounded-lg text-sm font-medium hover:bg-stone-700 transition-colors"
          >
            <Download size={16} /> Export Backup (JSON)
          </button>
          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
              id="json-import"
            />
            <label
              htmlFor="json-import"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 text-stone-700 rounded-lg text-sm font-medium hover:bg-stone-50 transition-colors cursor-pointer"
            >
              <Upload size={16} /> Import Backup
            </label>
          </div>
          <button
            onClick={clearAllData}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-wine-200 text-wine-600 rounded-lg text-sm font-medium hover:bg-wine-50 transition-colors"
          >
            <Trash2 size={16} /> Clear All Data
          </button>
        </div>
      </div>
    </div>
  );
}
