// Roteiro de medição do optimize-query-cache. Rodar igual antes e depois do
// deploy: ego-browser.exe nodejs < roteiro.mjs
// Precisa de uma sessão de COORDENADOR no ego lite e da turma "Maternal A".
const task = await taskSpace("educare medicao");
const page = task.page("p1");
const BASE = 'https://educare-frontend-ruby.vercel.app';
const results = [];
let seen = 0;
const entries = () => page.evaluate(() => performance.getEntriesByType('resource')
  .filter((e) => e.name.includes('_serverFn'))
  .map((e) => ({ fn: new URL(e.name).pathname.split('/').pop().slice(0, 8), ms: Math.round(e.duration) })));
async function step(label, extra = {}) {
  await page.waitForTimeout(1500);
  const all = await entries();
  const fresh = all.slice(seen);
  seen = all.length;
  results.push({ step: label, at: new Date().toISOString(), ...extra, serverFn: fresh });
}
const navTiming = () => page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; return { ttfb: Math.round(n.responseStart), load: Math.round(n.loadEventEnd) }; });
const onPath = (p) => page.waitForFunction((p) => location.pathname === p, p, { timeout: 15000 });
const shows = (t) => page.waitForFunction((t) => document.body.innerText.includes(t), t, { timeout: 15000 });
const usersReady = () => shows('com acesso ao sistema');
const classroomsReady = () => page.waitForFunction(() => document.querySelectorAll('table tbody tr').length > 0, undefined, { timeout: 15000 });
const childrenReady = () => shows('Mostrando');
async function rename(from, to) {
  await page.click(`loc=role:button[name='Editar ${from}']`, { label: `editar ${from}` });
  await page.waitForSelector("loc=role:textbox[name='Nome da turma']");
  await page.evaluate((to) => {
    const input = document.querySelector('[role=dialog] input');
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    set.call(input, to); input.dispatchEvent(new Event('input', { bubbles: true }));
    input.form.requestSubmit();
  }, to);
  await shows('Turma renomeada.');
  await page.waitForFunction((to) => [...document.querySelectorAll('table tbody tr td:first-child')].some((td) => td.innerText.trim() === to), to, { timeout: 15000 });
}

await page.goto(BASE + '/configuracoes/usuarios', { timeout: 30000 });
await page.waitForLoadState(); await usersReady();
seen = 0; await step('Carga completa de Usuários', { document: await navTiming() });
await page.click('loc=href:/configuracoes/turmas', { label: 'aba Turmas' });
await onPath('/configuracoes/turmas'); await classroomsReady(); await step('Usuários → Turmas');
await page.click('css:a[aria-label="Início"]', { label: 'menu Início' });
await onPath('/'); await step('Turmas → Início');
await page.click('css:a[aria-label="Configurações"]', { label: 'menu Configurações' });
await onPath('/configuracoes/usuarios'); await usersReady(); await step('Início → Configurações (Usuários)');
await page.click('loc=href:/configuracoes/turmas', { label: 'aba Turmas' });
await onPath('/configuracoes/turmas'); await classroomsReady(); await step('Usuários → Turmas (de novo)');
await rename('Maternal A', 'Maternal A (medição)'); await step('Renomear turma');
await rename('Maternal A (medição)', 'Maternal A'); await step('Desfazer o nome');
await page.click('css:a[aria-label="Crianças"]', { label: 'menu Crianças' });
await onPath('/criancas'); await childrenReady(); await step('Turmas → Crianças');
const child = await page.evaluate(() => [...document.querySelectorAll('a[href^="/criancas/"]')].filter((a) => a.offsetParent).map((a) => a.getAttribute('href')).find((h) => /^\/criancas\/[0-9a-f-]{36}$/.test(h)));
await page.evaluate((h) => [...document.querySelectorAll(`a[href="${h}"]`)].find((a) => a.offsetParent).click(), child);
await onPath(child); await shows('Histórico'); await step('Crianças → detalhes');
await page.evaluate(() => history.back());
await onPath('/criancas'); await childrenReady(); await step('Detalhes → voltar à lista');
await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Próxima' && b.offsetParent).click());
await page.waitForFunction(() => location.search.includes('pagina=2'), undefined, { timeout: 15000 }); await shows('Mostrando 21'); await step('Crianças → página 2');
await page.click('css:a[aria-label="Início"]', { label: 'menu Início' });
await onPath('/'); await step('Crianças → Início');
await page.click('css:a[aria-label="Crianças"]', { label: 'menu Crianças' });
await onPath('/criancas'); await childrenReady(); await step('Início → Crianças (em menos de 1 min)');
await page.goto(BASE + '/configuracoes/usuarios', { timeout: 30000 });
await page.waitForLoadState(); await usersReady();
results.push({ step: 'início dos 10 F5', at: new Date().toISOString() });
for (let i = 1; i <= 10; i++) {
  await page.reload({ timeout: 30000 });
  await page.waitForLoadState(); await usersReady();
  seen = 0; await step(`F5 ${i} em Usuários`, { document: await navTiming() });
}
console.log(JSON.stringify(results));
await task.finish({ keep: [] });
