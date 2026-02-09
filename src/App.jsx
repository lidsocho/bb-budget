import { useState, useEffect, useCallback } from 'react';
import { ClipboardList, LayoutDashboard, TrendingUp, Wallet, Settings as SettingsIcon } from 'lucide-react';
import { loadData, saveData } from './store';
import TransactionReview from './components/TransactionReview';
import MonthlySummary from './components/MonthlySummary';
import Trends from './components/Trends';
import Balances from './components/Balances';
import Settings from './components/Settings';

const TABS = [
  { id: 'review', label: 'Review', icon: ClipboardList },
  { id: 'summary', label: 'Summary', icon: LayoutDashboard },
  { id: 'trends', label: 'Trends', icon: TrendingUp },
  { id: 'balances', label: 'Balances', icon: Wallet },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

function App() {
  const [activeTab, setActiveTab] = useState('review');
  const [data, setData] = useState(() => loadData());

  const handleUpdate = useCallback((newData) => {
    setData(newData);
    saveData(newData);
  }, []);

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-stone-800 tracking-tight">Bb Budget</span>
              <span className="text-xs text-stone-400 hidden sm:inline">by Lidia</span>
            </div>
            <div className="text-xs num text-stone-400">
              {data.transactions.length} transactions
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-stone-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-0.5 -mb-px overflow-x-auto">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                    ${active 
                      ? 'border-stone-800 text-stone-800' 
                      : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'}`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'review' && <TransactionReview data={data} onUpdate={handleUpdate} />}
        {activeTab === 'summary' && <MonthlySummary data={data} onUpdate={handleUpdate} />}
        {activeTab === 'trends' && <Trends data={data} />}
        {activeTab === 'balances' && <Balances data={data} onUpdate={handleUpdate} />}
        {activeTab === 'settings' && <Settings data={data} onUpdate={handleUpdate} />}
      </main>
    </div>
  );
}

export default App;
