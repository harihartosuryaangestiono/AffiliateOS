const origin=process.argv[2]||'http://localhost:3000';
const routes=[
  'dashboard',
  'my-work',
  'performance',
  'tiktok',
  'shopee',
  'creators',
  'creators/acquisition',
  'creators/outreach',
  'creators/performance',
  'campaigns',
  'campaigns/planning',
  'hsl',
  'hsl/stock',
  'peak-days',
  'samples',
  'imports',
  'imports/tiktok',
  'imports/shopee',
  'products',
  'reports',
  'reports/monthly',
  'clients',
  'brands',
  'tasks',
  'users',
  'settings',
  'login',
  'clients/10000000-0000-4000-8000-000000000001',
  'campaigns/10000000-0000-4000-8000-000000000030',
  'creators/10000000-0000-4000-8000-000000000100',
];
for(const route of routes){const result=await fetch(origin+'/'+route);if(result.status!==200)throw Error(`${route}: expected 200, got ${result.status}`);const html=await result.text();if(!html.includes('AffiliateOS')||html.includes('We couldn’t load this workspace.'))throw Error(`${route}: unexpected error document`);console.log(`PASS /${route}`);}
const missing=await fetch(origin+'/this-route-does-not-exist',{redirect:'manual'});
const missingLocation=missing.headers.get('location');
if(missing.status!==307||missingLocation!=='/login')throw Error(`Unauthenticated unknown workspace route must redirect to /login, got ${missing.status} ${missingLocation||''}`);
console.log('PASS unauthenticated unknown workspace route → /login');
