import { proxy } from './proxy';

const testCases = [
  // 1. Unauthenticated visitors
  { path: '/', auth: false, role: undefined, expectAllowed: false, expectRedirect: '/login' },
  { path: '/accounts-and-coa', auth: false, role: undefined, expectAllowed: false, expectRedirect: '/login' },
  { path: '/customer/dashboard', auth: false, role: undefined, expectAllowed: false, expectRedirect: '/customer/login' },
  { path: '/login', auth: false, role: undefined, expectAllowed: true },
  { path: '/customer/login', auth: false, role: undefined, expectAllowed: true },

  // 2. Retail Customers
  { path: '/', auth: true, role: 'Customer', expectAllowed: false, expectRedirect: '/customer/dashboard' },
  { path: '/accounts-and-coa', auth: true, role: 'Customer', expectAllowed: false, expectRedirect: '/customer/dashboard' },
  { path: '/customer/dashboard', auth: true, role: 'Customer', expectAllowed: true },

  // 3. Compliance Auditor
  { path: '/', auth: true, role: 'ComplianceAuditor', expectAllowed: true },
  { path: '/accounts-and-coa', auth: true, role: 'ComplianceAuditor', expectAllowed: true },
  { path: '/accounts', auth: true, role: 'ComplianceAuditor', expectAllowed: true, expectRedirect: '/accounts-and-coa' },
  { path: '/transactions', auth: true, role: 'ComplianceAuditor', expectAllowed: true },
  { path: '/reconciliation', auth: true, role: 'ComplianceAuditor', expectAllowed: true },
  { path: '/holds', auth: true, role: 'ComplianceAuditor', expectAllowed: false, expectRedirect: '/' },
  { path: '/hangfire', auth: true, role: 'ComplianceAuditor', expectAllowed: false, expectRedirect: '/' },

  // 4. Bank Teller
  { path: '/', auth: true, role: 'BankTeller', expectAllowed: true },
  { path: '/accounts-and-coa', auth: true, role: 'BankTeller', expectAllowed: true },
  { path: '/holds', auth: true, role: 'BankTeller', expectAllowed: true },
  { path: '/reconciliation', auth: true, role: 'BankTeller', expectAllowed: false, expectRedirect: '/' },
  { path: '/hangfire', auth: true, role: 'BankTeller', expectAllowed: false, expectRedirect: '/' },

  // 5. System Admin
  { path: '/', auth: true, role: 'SystemAdmin', expectAllowed: true },
  { path: '/accounts-and-coa', auth: true, role: 'SystemAdmin', expectAllowed: true },
  { path: '/holds', auth: true, role: 'SystemAdmin', expectAllowed: true },
  { path: '/reconciliation', auth: true, role: 'SystemAdmin', expectAllowed: true },
  { path: '/hangfire', auth: true, role: 'SystemAdmin', expectAllowed: true },
  { path: '/unknown-route-123', auth: true, role: 'SystemAdmin', expectAllowed: false, expectRedirect: '/' }
];

let failed = 0;
for (const tc of testCases) {
  const res = proxy.evaluateRoute(tc.path, tc.auth, tc.role);
  const passAllowed = res.allowed === tc.expectAllowed;
  const passRedirect = tc.expectRedirect === undefined || res.redirectPath === tc.expectRedirect;
  if (!passAllowed || !passRedirect) {
    console.error('FAIL:', tc, 'GOT:', res);
    failed++;
  } else {
    console.log('PASS:', (tc.role || 'Anon').padEnd(18), tc.path.padEnd(22), '-> allowed:', res.allowed, res.redirectPath ? 'redirect: ' + res.redirectPath : '');
  }
}

if (failed === 0) {
  console.log('\n======================================================');
  console.log('ALL 23 SECURITY PROXY ROUTE GUARD TESTS PASSED!');
  console.log('======================================================');
} else {
  console.error('\n' + failed + ' test cases failed!');
  process.exit(1);
}
