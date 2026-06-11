interface Transaction {
  vendor: string;
  amount: number;
}

interface AuditResult {
  rule: string;
  severity: string;
  vendor: string;
  evidence: string;
}

export function detectSplit(txns: Transaction[]): AuditResult[] {
  const threshold = 100000;

  const grouped: Record<string, Transaction[]> = {};
  const results: AuditResult[] = [];

  txns.forEach(t => {
    if (!grouped[t.vendor]) grouped[t.vendor] = [];
    grouped[t.vendor].push(t);
  });

  Object.entries(grouped).forEach(([vendor, list]) => {
    const total = list.reduce((sum, t) => sum + t.amount, 0);

    if (list.length >= 2 && total > threshold) {
      results.push({
        rule: 'SPLIT_PAYMENT',
        severity: 'HIGH',
        vendor,
        evidence: `Multiple transactions detected, total=${total}`
      });
    }
  });

  return results;
}
