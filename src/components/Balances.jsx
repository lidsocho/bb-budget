import { useState, useMemo } from 'react';
import { Plus, Trash2, Info } from 'lucide-react';
import { formatCurrency, generateId, ACCOUNTS } from '../store';
import DateRangeFilter from './DateRangeFilter';

// Map account IDs to snapshot field names
const ACCT_TO_FIELD = {
  wf_checking: 'wf_checking',
  wf_credit: 'wf_credit',
  discover_credit: 'discover_credit',
  sofi_checking: 'sofi_checking',
  sofi_savings: 'sofi_savings',
  venmo: 'venmo',
};

const CREDIT_ACCOUNTS = new Set(['wf_credit', 'discover_credit']);

export default function Balances({ data, onUpdate }) {
  const [historyFrom, setHistoryFrom] = useState('2020-01-01');
  const [historyTo, setHistoryTo] = useState('2099-12-31');

  const [newSnapshot, setNewSnapshot] = useState({
    date: new Date().toISOString().slice(0, 10),
    wf_checking: '',
    wf_credit: '',
    discover_credit: '',
    sofi_checking: '',
    sofi_savings: '',
    venmo: '',
  });

  const snapshots = useMemo(() => {
    return [...data.balanceSnapshots].sort((a, b) => b.date.localeCompare(a.date));
  }, [data.balanceSnapshots]);

  const latest = snapshots[0];

  // Compute current balances: last snapshot + all transactions since
  const computed = useMemo(() => {
    if (!latest) return null;

    const snapshotDate = latest.date;
    const result = {};

    for (const acctId of Object.keys(ACCT_TO_FIELD)) {
      const field = ACCT_TO_FIELD[acctId];
      const snapshotVal = latest[field] || 0;

      // Sum all transactions for this account AFTER the snapshot date
      const txnsAfter = data.transactions.filter(
        t => t.account === acctId && t.date > snapshotDate
      );
      const txnSum = txnsAfter.reduce((s, t) => s + t.amount, 0);

      if (CREDIT_ACCOUNTS.has(acctId)) {
        // Credit cards: snapshot stores amount owed (positive).
        // Charges come in as negative amounts → increase owed.
        // Payments come in as positive amounts → decrease owed.
        // current_owed = snapshot_owed - sum(txns)
        result[acctId] = {
          snapshot: snapshotVal,
          txnDelta: -txnSum,
          current: snapshotVal - txnSum,
          txnCount: txnsAfter.length,
          isCredit: true,
        };
      } else {
        // Checking/savings: snapshot is balance.
        // Income/credits are positive, expenses are negative.
        // current = snapshot + sum(txns)
        result[acctId] = {
          snapshot: snapshotVal,
          txnDelta: txnSum,
          current: snapshotVal + txnSum,
          txnCount: txnsAfter.length,
          isCredit: false,
        };
      }
    }

    return result;
  }, [latest, data.transactions]);

  // Total liquid = sum of checking/savings current balances
  const totalLiquid = useMemo(() => {
    if (!computed) return 0;
    return Object.entries(computed)
      .filter(([_, v]) => !v.isCredit)
      .reduce((s, [_, v]) => s + v.current, 0);
  }, [computed]);

  const prevTotalLiquid = useMemo(() => {
    if (!computed) return 0;
    return Object.entries(computed)
      .filter(([_, v]) => !v.isCredit)
      .reduce((s, [_, v]) => s + v.snapshot, 0);
  }, [computed]);

  function addSnapshot() {
    const snap = {
      id: generateId(),
      date: newSnapshot.date,
      wf_checking: parseFloat(newSnapshot.wf_checking) || 0,
      wf_credit: parseFloat(newSnapshot.wf_credit) || 0,
      discover_credit: parseFloat(newSnapshot.discover_credit) || 0,
      sofi_checking: parseFloat(newSnapshot.sofi_checking) || 0,
      sofi_savings: parseFloat(newSnapshot.sofi_savings) || 0,
      venmo: parseFloat(newSnapshot.venmo) || 0,
    };
    onUpdate({
      ...data,
      balanceSnapshots: [...data.balanceSnapshots, snap],
    });
    setNewSnapshot({
      date: new Date().toISOString().slice(0, 10),
      wf_checking: '', wf_credit: '', discover_credit: '',
      sofi_checking: '', sofi_savings: '', venmo: '',
    });
  }

  function deleteSnapshot(id) {
    onUpdate({
      ...data,
      balanceSnapshots: data.balanceSnapshots.filter(s => s.id !== id),
    });
  }

  function getTotal(snap) {
    return (snap.wf_checking || 0) + (snap.sofi_checking || 0) + (snap.sofi_savings || 0) + (snap.venmo || 0);
  }

  function DeltaBadge({ delta }) {
    if (delta === null || delta === undefined || delta === 0) return null;
    const positive = delta >= 0;
    return (
      <span className={`num text-xs font-medium ${positive ? 'text-sage-600' : 'text-wine-600'}`}>
        {positive ? '+' : ''}{formatCurrency(delta)}
      </span>
    );
  }

  const ACCT_DISPLAY = [
    { id: 'wf_checking', label: 'WF Checking', border: 'border-stone-200', bg: 'bg-white' },
    { id: 'wf_credit', label: 'WF Credit', border: 'border-wine-200', bg: 'bg-white' },
    { id: 'discover_credit', label: 'Discover Credit', border: 'border-wine-200', bg: 'bg-white' },
    { id: 'sofi_checking', label: 'SoFi Checking', border: 'border-stone-200', bg: 'bg-white' },
    { id: 'sofi_savings', label: 'SoFi Savings', border: 'border-stone-200', bg: 'bg-white' },
    { id: 'venmo', label: 'Venmo', border: 'border-stone-200', bg: 'bg-white' },
  ];

  return (
    <div className="space-y-6">
      {/* Computed Current Balances */}
      {computed ? (
        <>
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <Info size={12} />
            <span>
              Computed from snapshot on <span className="font-medium text-stone-500">{latest.date}</span>
              {' '}+ all imported transactions since
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
            {ACCT_DISPLAY.map(({ id, label, border, bg }) => {
              const acct = computed[id];
              if (!acct) return null;
              const displayVal = acct.isCredit ? -acct.current : acct.current;
              return (
                <div key={id} className={`${bg} rounded-xl border ${border} p-4`}>
                  <div className="text-xs text-stone-500 mb-1">{label}</div>
                  <div className={`num font-semibold text-lg ${acct.isCredit ? 'num-neg' : ''}`}>
                    {formatCurrency(displayVal)}
                  </div>
                  <DeltaBadge delta={acct.isCredit ? -acct.txnDelta : acct.txnDelta} />
                  {acct.txnCount > 0 && (
                    <div className="text-[10px] text-stone-400 mt-0.5">
                      {acct.txnCount} txn{acct.txnCount !== 1 ? 's' : ''} since snapshot
                    </div>
                  )}
                </div>
              );
            })}
            <div className="bg-sage-50 rounded-xl border border-sage-200 p-4">
              <div className="text-xs text-sage-700 mb-1">Total Liquid</div>
              <div className="num font-bold text-lg text-sage-800">{formatCurrency(totalLiquid)}</div>
              <DeltaBadge delta={totalLiquid - prevTotalLiquid} />
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 p-8 text-center text-stone-400">
          Add a balance snapshot to start tracking. Current balances will be computed from the snapshot + imported transactions.
        </div>
      )}

      {/* Add Snapshot */}
      <div className="bg-white rounded-xl border border-stone-200 p-5">
        <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-2">Log Balance Snapshot</h3>
        <p className="text-xs text-stone-400 mb-4">
          Enter your actual account balances as of a specific date. The app will then add/subtract all imported transactions after that date to compute your current balances.
          For best accuracy, log a new snapshot whenever you start a fresh import cycle.
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 items-end">
          <div>
            <label className="block text-xs text-stone-500 mb-1">Date</label>
            <input type="date" value={newSnapshot.date}
              onChange={e => setNewSnapshot({ ...newSnapshot, date: e.target.value })}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">WF Checking</label>
            <input type="number" step="0.01" placeholder="0.00" value={newSnapshot.wf_checking}
              onChange={e => setNewSnapshot({ ...newSnapshot, wf_checking: e.target.value })}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm num" />
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">WF Credit (owed)</label>
            <input type="number" step="0.01" placeholder="0.00" value={newSnapshot.wf_credit}
              onChange={e => setNewSnapshot({ ...newSnapshot, wf_credit: e.target.value })}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm num" />
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">Discover (owed)</label>
            <input type="number" step="0.01" placeholder="0.00" value={newSnapshot.discover_credit}
              onChange={e => setNewSnapshot({ ...newSnapshot, discover_credit: e.target.value })}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm num" />
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">SoFi Checking</label>
            <input type="number" step="0.01" placeholder="0.00" value={newSnapshot.sofi_checking}
              onChange={e => setNewSnapshot({ ...newSnapshot, sofi_checking: e.target.value })}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm num" />
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">SoFi Savings</label>
            <input type="number" step="0.01" placeholder="0.00" value={newSnapshot.sofi_savings}
              onChange={e => setNewSnapshot({ ...newSnapshot, sofi_savings: e.target.value })}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm num" />
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">Venmo</label>
            <input type="number" step="0.01" placeholder="0.00" value={newSnapshot.venmo}
              onChange={e => setNewSnapshot({ ...newSnapshot, venmo: e.target.value })}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm num" />
          </div>
        </div>
        <button onClick={addSnapshot}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-stone-800 text-white rounded-lg text-sm font-medium hover:bg-stone-700 transition-colors">
          <Plus size={16} /> Save Snapshot
        </button>
      </div>

      {/* Snapshot History */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="p-4 border-b border-stone-100 space-y-3">
          <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider">Snapshot History</h3>
          <DateRangeFilter from={historyFrom} to={historyTo}
            onChange={(f, t) => { setHistoryFrom(f); setHistoryTo(t); }} />
        </div>
        {(() => {
          const filteredSnaps = snapshots.filter(s => s.date >= historyFrom && s.date <= historyTo);
          return filteredSnaps.length === 0 ? (
            <div className="p-12 text-center text-stone-400">No snapshots in this range</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-xs text-stone-500 uppercase tracking-wider border-b border-stone-100">
                  <th className="text-left p-3 font-semibold">Date</th>
                  <th className="text-right p-3 font-semibold">WF Checking</th>
                  <th className="text-right p-3 font-semibold">WF Credit</th>
                  <th className="text-right p-3 font-semibold">Discover</th>
                  <th className="text-right p-3 font-semibold">SoFi Checking</th>
                  <th className="text-right p-3 font-semibold">SoFi Savings</th>
                  <th className="text-right p-3 font-semibold">Venmo</th>
                  <th className="text-right p-3 font-semibold">Total Liquid</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody>
                {filteredSnaps.map(snap => (
                  <tr key={snap.id} className="border-b border-stone-50 hover:bg-stone-50">
                    <td className="p-3 text-sm num text-stone-500">{snap.date}</td>
                    <td className="p-3 text-sm num text-right">{formatCurrency(snap.wf_checking)}</td>
                    <td className="p-3 text-sm num text-right num-neg">{formatCurrency(-(snap.wf_credit || 0))}</td>
                    <td className="p-3 text-sm num text-right num-neg">{formatCurrency(-(snap.discover_credit || 0))}</td>
                    <td className="p-3 text-sm num text-right">{formatCurrency(snap.sofi_checking)}</td>
                    <td className="p-3 text-sm num text-right">{formatCurrency(snap.sofi_savings)}</td>
                    <td className="p-3 text-sm num text-right">{formatCurrency(snap.venmo || 0)}</td>
                    <td className="p-3 text-sm num text-right font-semibold">{formatCurrency(getTotal(snap))}</td>
                    <td className="p-3 text-center">
                      <button onClick={() => deleteSnapshot(snap.id)}
                        className="p-1 rounded text-stone-300 hover:text-wine-500 hover:bg-wine-50 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          );
        })()}
      </div>
    </div>
  );
}
