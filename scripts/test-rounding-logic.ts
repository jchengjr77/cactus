/**
 * Test script to verify the nearest hour rounding logic
 *
 * Run with: npx ts-node scripts/test-rounding-logic.ts
 */

function roundToNearestHour(date: Date): Date {
  const minutes = date.getMinutes();
  const roundedTime = new Date(date);

  if (minutes < 30) {
    // Round down to current hour
    roundedTime.setMinutes(0, 0, 0);
  } else {
    // Round up to next hour
    roundedTime.setMinutes(0, 0, 0);
    roundedTime.setHours(roundedTime.getHours() + 1);
  }

  return roundedTime;
}

// Test cases
const testCases = [
  { input: '2024-10-26T14:10:00', expected: '2024-10-26T14:00:00', description: '2:10 PM → 2:00 PM (< 30 min)' },
  { input: '2024-10-26T14:29:00', expected: '2024-10-26T14:00:00', description: '2:29 PM → 2:00 PM (< 30 min)' },
  { input: '2024-10-26T14:30:00', expected: '2024-10-26T15:00:00', description: '2:30 PM → 3:00 PM (≥ 30 min)' },
  { input: '2024-10-26T14:43:00', expected: '2024-10-26T15:00:00', description: '2:43 PM → 3:00 PM (≥ 30 min)' },
  { input: '2024-10-26T14:59:00', expected: '2024-10-26T15:00:00', description: '2:59 PM → 3:00 PM (≥ 30 min)' },
  { input: '2024-10-26T14:00:00', expected: '2024-10-26T14:00:00', description: '2:00 PM → 2:00 PM (exactly on hour)' },
  { input: '2024-10-26T23:45:00', expected: '2024-10-27T00:00:00', description: '11:45 PM → 12:00 AM (next day)' },
];

console.log('Testing Nearest Hour Rounding Logic\n');
console.log('='.repeat(80));

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  const input = new Date(testCase.input);
  const expected = new Date(testCase.expected);
  const result = roundToNearestHour(input);

  const success = result.getTime() === expected.getTime();

  if (success) {
    passed++;
    console.log(`✅ Test ${index + 1}: ${testCase.description}`);
  } else {
    failed++;
    console.log(`❌ Test ${index + 1}: ${testCase.description}`);
    console.log(`   Expected: ${expected.toISOString()}`);
    console.log(`   Got:      ${result.toISOString()}`);
  }
});

console.log('='.repeat(80));
console.log(`\nResults: ${passed} passed, ${failed} failed out of ${testCases.length} tests\n`);

// Demo: Calculate updates_due for different cadences
console.log('Demo: updates_due calculation\n');
console.log('-'.repeat(80));

const demoTime = new Date('2024-10-26T14:43:00');
const roundedTime = roundToNearestHour(demoTime);

console.log(`Group activated at: ${demoTime.toLocaleString()}`);
console.log(`Rounded to:         ${roundedTime.toLocaleString()}`);
console.log('');

const cadences = [
  { hours: 12, label: '12h' },
  { hours: 24, label: 'daily' },
  { hours: 72, label: '3 days' },
  { hours: 168, label: 'weekly' },
];

cadences.forEach(({ hours, label }) => {
  const deadline = new Date(roundedTime);
  deadline.setHours(deadline.getHours() + hours);

  console.log(`${label.padEnd(8)} (${hours.toString().padStart(3)}h cadence) → updates_due: ${deadline.toLocaleString()}`);
});

console.log('-'.repeat(80));
