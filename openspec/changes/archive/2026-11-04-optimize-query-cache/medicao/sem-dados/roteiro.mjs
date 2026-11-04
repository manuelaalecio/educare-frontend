const task = await taskSpace("educare medicao linha de base");
const page = task.page("p1");
const results = [];
let seen = 0;
const decode = (url) => {
  const id = new URL(url).pathname.split('/').pop();
  try { const s = Buffer.from(id, 'base64url').toString('utf8'); return /^[\x20-\x7e]+$/.test(s) ? s : id; } catch { return id; }
};
const entries = () => page.evaluate(() => performance.getEntriesByType('resource')
  .filter((e) => e.name.includes('_serverFn'))
  .map((e) => ({ name: e.name, ms: Math.round(e.duration) })));
async function step(label, extra = {}) {
  await page.waitForTimeout(1500);
  const all = await entries();
  const fresh = all.slice(seen);
  seen = all.length;
  results.push({ step: label, at: new Date().toISOString(), ...extra, serverFn: fresh.map((e) => ({ fn: decode(e.name), ms: e.ms })) });
}
const navTiming = () => page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; return { ttfb: Math.round(n.responseStart), load: Math.round(n.loadEventEnd) }; });
async function fullLoad(url, label, ready) {
  await page.goto(url, { timeout: 30000 });
  await page.waitForLoadState();
  await ready();
  seen = 0;
  await step(label, { document: await navTiming() });
}
const onPath = (p) => page.waitForFunction((p) => location.pathname === p, p, { timeout: 15000 });
const shows = (text) => page.waitForFunction((t) => document.body.innerText.includes(t), text, { timeout: 15000 });
const BASE = 'https://educare-frontend-ruby.vercel.app';
const usersReady = () => shows('com acesso ao sistema');

await fullLoad(BASE + '/configuracoes/usuarios', 'Carga completa de Usuários', usersReady);
await page.click('loc=href:/configuracoes/turmas', { label: 'aba Turmas' });
await onPath('/configuracoes/turmas'); await shows('Nova turma'); await step('Usuários → Turmas');
await page.click('css:a[aria-label="Início"]', { label: 'menu Início' });
await onPath('/'); await step('Turmas → Início');
await page.click('css:a[aria-label="Configurações"]', { label: 'menu Configurações' });
await onPath('/configuracoes/usuarios'); await usersReady(); await step('Início → Configurações (Usuários)');
await page.click('loc=href:/configuracoes/turmas', { label: 'aba Turmas' });
await onPath('/configuracoes/turmas'); await shows('Nova turma'); await step('Usuários → Turmas (de novo)');
await page.click('css:a[aria-label="Crianças"]', { label: 'menu Crianças' });
await onPath('/criancas'); await shows('cadastrad'); await step('Turmas → Crianças');
await page.click('css:a[aria-label="Início"]', { label: 'menu Início' });
await onPath('/'); await step('Crianças → Início');
await page.click('css:a[aria-label="Crianças"]', { label: 'menu Crianças' });
await onPath('/criancas'); await shows('cadastrad'); await step('Início → Crianças (em menos de 1 min)');
await page.goto(BASE + '/configuracoes/usuarios', { timeout: 30000 });
await page.waitForLoadState(); await usersReady();
for (let i = 1; i <= 10; i++) {
  await page.reload({ timeout: 30000 });
  await page.waitForLoadState();
  await usersReady();
  seen = 0;
  await step(`F5 ${i} em Usuários`, { document: await navTiming() });
}
console.log(JSON.stringify(results));
