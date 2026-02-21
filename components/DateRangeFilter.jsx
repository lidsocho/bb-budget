import { useState, useMemo } from 'react';
import { getMonthLabel } from '../store';

const PRESETS = [
  { id: 'this_month', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'last_3', label: 'Last 3 Months' },
  { id: 'last_6', label: 'Last 6 Months' },
  { id: 'ytd', label: 'Year to Date' },
  { id: 'last_year', label: 'Last Year' },
  { id: 'all', label: 'All Time' },
  { id: 'custom', label: 'Custom Range' },
];

function getPresetDates(presetId) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  switch (presetId) {
    case 'this_month':
      return {
        from: new Date(y, m, 1).toISOString().slice(0, 10),
        to: new Date(y, m + 1, 0).toISOString().slice(0, 10),
      };
    case 'last_month': {
      return {
        from: new Date(y, m - 1, 1).toISOString().slice(0, 10),
        to: new Date(y, m, 0).toISOString().slice(0, 10),
      };
    }
    case 'last_3':
      return {
        from: new Date(y, m - 2, 1).toISOString().slice(0, 10),
        to: new Date(y, m + 1, 0).toISOString().slice(0, 10),
      };
    case 'last_6':
      return {
        from: new Date(y, m - 5, 1).toISOString().slice(0, 10),
        to: new Date(y, m + 1, 0).toISOString().slice(0, 10),
      };
    case 'ytd':
      return {
        from: `${y}-01-01`,
        to: now.toISOString().slice(0, 10),
      };
    case 'last_year':
      return {
        from: `${y - 1}-01-01`,
        to: `${y - 1}-12-31`,
      };
    case 'all':
      return { from: '2020-01-01', to: '2099-12-31' };
    default:
      return null;
  }
}

export default function DateRangeFilter({ from, to, onChange, availableMonths }) {
  const [preset, setPreset] = useState('this_month');
  const [showCustom, setShowCustom] = useState(false);

  // Also expose month-specific shortcuts from available data
  const monthOptions = useMemo(() => {
    return (availableMonths || []).map(mk => ({
      value: mk,
      label: getMonthLabel(mk),
    }));
  }, [availableMonths]);

  function handlePreset(id) {
    setPreset(id);
    if (id === 'custom') {
      setShowCustom(true);
      return;
    }
    setShowCustom(false);
    const dates = getPresetDates(id);
    if (dates) onChange(dates.from, dates.to);
  }

  function handleMonthSelect(monthKey) {
    const [year, month] = monthKey.split('-').map(Number);
    const from = new Date(year, month - 1, 1).toISOString().slice(0, 10);
    const to = new Date(year, month, 0).toISOString().slice(0, 10);
    setPreset('month_' + monthKey);
    setShowCustom(false);
    onChange(from, to);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Preset buttons */}
      <div className="flex flex-wrap gap-1">
        {PRESETS.map(p => (
          <button
            key={p.id}
            onClick={() => handlePreset(p.id)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors
              ${preset === p.id
                ? 'bg-stone-800 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Month quick-select */}
      {monthOptions.length > 0 && (
        <select
          value={preset.startsWith('month_') ? preset.replace('month_', '') : ''}
          onChange={e => e.target.value && handleMonthSelect(e.target.value)}
          className="px-2 py-1 border border-stone-200 rounded-lg text-xs bg-white"
        >
          <option value="">Pick month...</option>
          {monthOptions.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      )}

      {/* Custom date inputs */}
      {showCustom && (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={from}
            onChange={e => onChange(e.target.value, to)}
            className="px-2 py-1 border border-stone-200 rounded-lg text-xs"
          />
          <span className="text-xs text-stone-400">to</span>
          <input
            type="date"
            value={to}
            onChange={e => onChange(from, e.target.value)}
            className="px-2 py-1 border border-stone-200 rounded-lg text-xs"
          />
        </div>
      )}
    </div>
  );
}

export { getPresetDates };
