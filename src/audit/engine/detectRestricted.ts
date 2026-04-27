export function detectRestricted(txns) {
  const keywords = [
    'bar',
    'lounge',
    'club',
    'karaoke',
    '바',
    '라운지',
    '클럽',
    '노래방',
    '유흥',
    '주점',
    '단란',
    'pub',
    'room'
  ];

  return txns
    .filter(t =>
      keywords.some(k =>
        t.vendor.toLowerCase().includes(k)
      )
    )
    .map(t => ({
      rule: 'RESTRICTED_VENDOR',
      severity: 'CRITICAL',
      vendor: t.vendor,
      evidence: 'Restricted keyword matched'
    }));
}
