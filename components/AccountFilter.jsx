import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { ACCOUNTS } from '../store';

export default function AccountFilter({ selected, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const allSelected = selected.length === ACCOUNTS.length;
  const creditAccounts = ACCOUNTS.filter(a => a.type === 'credit').map(a => a.id);
  const creditOnly = selected.length === creditAccounts.length && creditAccounts.every(id => selected.includes(id));

  function toggle(id) {
    if (selected.includes(id)) {
      const next = selected.filter(s => s !== id);
      onChange(next.length > 0 ? next : ACCOUNTS.map(a => a.id)); // don't allow empty
    } else {
      onChange([...selected, id]);
    }
  }

  function selectAll() {
    onChange(ACCOUNTS.map(a => a.id));
  }

  function selectCreditOnly() {
    onChange(creditAccounts);
  }

  const label = allSelected
    ? 'All Accounts'
    : selected.length === 1
      ? (ACCOUNTS.find(a => a.id === selected[0])?.label?.replace('Wells Fargo', 'WF') || selected[0])
      : `${selected.length} accounts`;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 border border-stone-200 rounded-lg text-sm bg-white hover:bg-stone-50 transition-colors min-w-[160px]"
      >
        <span className="flex-1 text-left truncate">{label}</span>
        <ChevronDown size={14} className={`text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-stone-200 rounded-xl shadow-lg z-50 py-1 animate-in fade-in duration-100">
          {/* Quick filters */}
          <div className="flex gap-1 px-2 py-1.5 border-b border-stone-100">
            <button
              onClick={selectAll}
              className={`px-2 py-0.5 text-xs rounded-md font-medium transition-colors
                ${allSelected ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
            >
              All
            </button>
            <button
              onClick={selectCreditOnly}
              className={`px-2 py-0.5 text-xs rounded-md font-medium transition-colors
                ${creditOnly && !allSelected ? 'bg-wine-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
            >
              Credit Cards Only
            </button>
          </div>

          {/* Account checkboxes */}
          {ACCOUNTS.map(acct => {
            const checked = selected.includes(acct.id);
            return (
              <label
                key={acct.id}
                className="flex items-center gap-3 px-3 py-2 hover:bg-stone-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(acct.id)}
                  className="rounded border-stone-300 text-sage-600 focus:ring-sage-500 w-4 h-4"
                />
                <span className={`flex items-center gap-2 text-sm ${checked ? 'text-stone-800' : 'text-stone-400'}`}>
                  <span className={`w-2 h-2 rounded-full
                    ${acct.id === 'wf_credit' ? 'bg-wine-400' :
                      acct.id === 'discover_credit' ? 'bg-clay-500' :
                      acct.id === 'wf_checking' ? 'bg-stone-400' :
                      acct.id === 'sofi_checking' ? 'bg-sage-500' :
                      acct.id === 'sofi_savings' ? 'bg-blue-500' :
                      acct.id === 'venmo' ? 'bg-blue-400' :
                      'bg-stone-400'}`}
                  />
                  {acct.label}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
