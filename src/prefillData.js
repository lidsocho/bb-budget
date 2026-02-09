// Prefilled data extracted from Bb family budget - Lidia's columns only
// Nov 2025 and Dec 2025

export function getPrefillData() {
  let id = 1;
  const mkId = () => `prefill_${id++}`;

  const transactions = [
    // =====================================================
    // NOVEMBER 2025 - Variable Expenses (Lidia)
    // =====================================================
    { id: mkId(), date: '2025-11-01', description: 'Gas / public transport / car care', amount: -110.90, category: 'Gas/Transport', account: 'wf_checking', reviewed: true, month: '2025-11' },
    { id: mkId(), date: '2025-11-01', description: 'Groceries (incl Liquid IV $19.82)', amount: -397.04, category: 'Groceries', account: 'wf_checking', reviewed: true, month: '2025-11' },
    { id: mkId(), date: '2025-11-01', description: 'Eating Out', amount: -115.67, category: 'Eating Out', account: 'wf_checking', reviewed: true, month: '2025-11' },
    { id: mkId(), date: '2025-11-01', description: 'Doctors / health / passport', amount: -495.77, category: 'Doctors/Health', account: 'wf_checking', reviewed: true, month: '2025-11' },
    { id: mkId(), date: '2025-11-01', description: 'Costco membership + family trip', amount: -2230.36, category: 'Travel', account: 'wf_checking', reviewed: true, month: '2025-11' },
    { id: mkId(), date: '2025-11-01', description: 'Cat / plants / art / home / airtags', amount: -335.83, category: 'Home/Cat/Shipping', account: 'wf_checking', reviewed: true, month: '2025-11' },
    { id: mkId(), date: '2025-11-01', description: 'Alcohol / snacks / coffee / entertainment', amount: -133.75, category: 'Alcohol/Snacks/Entertainment', account: 'wf_checking', reviewed: true, month: '2025-11' },
    { id: mkId(), date: '2025-11-01', description: 'Misc expenses', amount: -3128.75, category: 'Misc', account: 'wf_checking', reviewed: true, month: '2025-11' },

    // NOVEMBER 2025 - Fixed Expenses (Lidia)
    { id: mkId(), date: '2025-11-01', description: 'Rent (Lidia portion)', amount: -200, category: 'Rent', account: 'sofi_checking', reviewed: true, month: '2025-11' },
    { id: mkId(), date: '2025-11-01', description: 'Utilities - SPU', amount: -222.24, category: 'Utilities', account: 'wf_checking', reviewed: true, month: '2025-11' },
    { id: mkId(), date: '2025-11-01', description: 'Utilities - SCL', amount: -181.22, category: 'Utilities', account: 'wf_checking', reviewed: true, month: '2025-11' },
    { id: mkId(), date: '2025-11-01', description: 'Storage', amount: -116, category: 'Storage', account: 'wf_checking', reviewed: true, month: '2025-11' },
    { id: mkId(), date: '2025-11-01', description: 'Jetbrains subscription', amount: -8.72, category: 'Subscriptions', account: 'wf_checking', reviewed: true, month: '2025-11' },
    { id: mkId(), date: '2025-11-01', description: 'Car Insurance', amount: -50, category: 'Insurance', account: 'wf_checking', reviewed: true, month: '2025-11' },
    { id: mkId(), date: '2025-11-01', description: 'Phone - Lidia', amount: -45, category: 'Phone', account: 'wf_checking', reviewed: true, month: '2025-11' },

    // NOVEMBER 2025 - Subscriptions (Lidia)
    { id: mkId(), date: '2025-11-01', description: 'Flo', amount: -15, category: 'Subscriptions', account: 'wf_checking', reviewed: true, month: '2025-11' },
    { id: mkId(), date: '2025-11-01', description: 'Hulu', amount: -20.56, category: 'Subscriptions', account: 'wf_checking', reviewed: true, month: '2025-11' },
    { id: mkId(), date: '2025-11-01', description: 'iCloud', amount: -2.99, category: 'Subscriptions', account: 'wf_checking', reviewed: true, month: '2025-11' },
    { id: mkId(), date: '2025-11-01', description: 'Spotify', amount: -12.98, category: 'Subscriptions', account: 'wf_checking', reviewed: true, month: '2025-11' },
    { id: mkId(), date: '2025-11-01', description: 'Audible', amount: -13.30, category: 'Subscriptions', account: 'wf_checking', reviewed: true, month: '2025-11' },

    // NOVEMBER 2025 - Credit Card Payments (Lidia)
    { id: mkId(), date: '2025-11-01', description: 'WF Credit Card payment (SPU + Liquid IV + figma + SCL)', amount: -45.91, category: 'Transfer/Payment', account: 'wf_checking', reviewed: true, month: '2025-11' },
    { id: mkId(), date: '2025-11-01', description: 'Discover payment (Dillards $208.39, battery $325.52)', amount: -33.54, category: 'Transfer/Payment', account: 'wf_checking', reviewed: true, month: '2025-11' },

    // NOVEMBER 2025 - Income (Lidia)
    { id: mkId(), date: '2025-11-01', description: 'Lidia paychecks', amount: 3323.55, category: 'Income', account: 'sofi_checking', reviewed: true, month: '2025-11' },
    { id: mkId(), date: '2025-11-15', description: 'Other deposits', amount: 4410.28, category: 'Income', account: 'sofi_checking', reviewed: true, month: '2025-11' },

    // =====================================================
    // DECEMBER 2025 - Variable Expenses (Lidia)
    // =====================================================
    { id: mkId(), date: '2025-12-01', description: 'Gas / public transport / car care', amount: -378.49, category: 'Gas/Transport', account: 'wf_checking', reviewed: true, month: '2025-12' },
    { id: mkId(), date: '2025-12-01', description: 'Groceries', amount: -244.96, category: 'Groceries', account: 'wf_checking', reviewed: true, month: '2025-12' },
    { id: mkId(), date: '2025-12-01', description: 'Eating Out', amount: -90.05, category: 'Eating Out', account: 'wf_checking', reviewed: true, month: '2025-12' },
    { id: mkId(), date: '2025-12-01', description: 'Family trip', amount: -1212.07, category: 'Travel', account: 'wf_checking', reviewed: true, month: '2025-12' },
    { id: mkId(), date: '2025-12-01', description: 'Cat / art / home / shipping', amount: -278.34, category: 'Home/Cat/Shipping', account: 'wf_checking', reviewed: true, month: '2025-12' },
    { id: mkId(), date: '2025-12-01', description: 'Alcohol / snacks / coffee / entertainment', amount: -21.21, category: 'Alcohol/Snacks/Entertainment', account: 'wf_checking', reviewed: true, month: '2025-12' },
    { id: mkId(), date: '2025-12-01', description: 'Misc (Sumit, fliers, sign)', amount: -228.47, category: 'Misc', account: 'wf_checking', reviewed: true, month: '2025-12' },

    // DECEMBER 2025 - Fixed Expenses (Lidia)
    { id: mkId(), date: '2025-12-01', description: 'Utilities - PSE', amount: -36.02, category: 'Utilities', account: 'wf_checking', reviewed: true, month: '2025-12' },
    { id: mkId(), date: '2025-12-01', description: 'Storage', amount: -116, category: 'Storage', account: 'wf_checking', reviewed: true, month: '2025-12' },
    { id: mkId(), date: '2025-12-01', description: 'Figma', amount: -16.56, category: 'Subscriptions', account: 'wf_credit', reviewed: true, month: '2025-12' },
    { id: mkId(), date: '2025-12-01', description: 'Jetbrains subscription', amount: -8.72, category: 'Subscriptions', account: 'wf_checking', reviewed: true, month: '2025-12' },

    // DECEMBER 2025 - Subscriptions (Lidia)
    { id: mkId(), date: '2025-12-01', description: 'iCloud', amount: -2.99, category: 'Subscriptions', account: 'wf_checking', reviewed: true, month: '2025-12' },
    { id: mkId(), date: '2025-12-01', description: 'Spotify', amount: -12.98, category: 'Subscriptions', account: 'wf_checking', reviewed: true, month: '2025-12' },

    // DECEMBER 2025 - Credit Card Payments (Lidia)
    { id: mkId(), date: '2025-12-01', description: 'Discover payment', amount: -546.89, category: 'Transfer/Payment', account: 'wf_checking', reviewed: true, month: '2025-12' },

    // DECEMBER 2025 - Income (Lidia)
    { id: mkId(), date: '2025-12-01', description: 'Lidia paychecks', amount: 2034.01, category: 'Income', account: 'sofi_checking', reviewed: true, month: '2025-12' },
    { id: mkId(), date: '2025-12-15', description: 'Other deposits', amount: 1620.18, category: 'Income', account: 'sofi_checking', reviewed: true, month: '2025-12' },
  ];

  // Balance snapshots extracted from the bi-monthly tracking at the bottom
  const balanceSnapshots = [
    // Oct 2025
    { id: 'snap_01', date: '2025-10-01', wf_checking: 1166.36, wf_credit: 0, discover_credit: 0, sofi_checking: 612.77, sofi_savings: 0 },
    { id: 'snap_02', date: '2025-10-15', wf_checking: 4809.11, wf_credit: 0, discover_credit: 0, sofi_checking: 0, sofi_savings: 0 },
    // Nov 2025 (11/14 snapshot)
    { id: 'snap_03', date: '2025-11-14', wf_checking: 2116.63, wf_credit: 477.50, discover_credit: 546.89, sofi_checking: 3408.64, sofi_savings: 0 },
    // Nov end
    { id: 'snap_04', date: '2025-11-28', wf_checking: 2231.99, wf_credit: 477.50, discover_credit: 546.89, sofi_checking: 2619.44, sofi_savings: 0 },
    // Dec 2025 (12/16 + 12/25 snapshot)
    { id: 'snap_05', date: '2025-12-16', wf_checking: 2724.20, wf_credit: 629.52, discover_credit: 12.98, sofi_checking: 2773.22, sofi_savings: 0 },
  ];

  return { transactions, balanceSnapshots };
}
