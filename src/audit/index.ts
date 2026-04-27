import data from './testData/data.json';
import { detectRestricted } from './engine/detectRestricted';
import { detectSplit } from './engine/detectSplit';

function runAudit() {
  const restricted = detectRestricted(data);
  const split = detectSplit(data);

  const results = [...restricted, ...split];

  console.log('=== AUDIT RESULTS ===');

  results.forEach(r => {
    console.log(`[${r.severity}] ${r.rule} - ${r.vendor}`);
    console.log(`→ ${r.evidence}`);
  });
}

runAudit();
