/* =============================================
   app.js — StockPro main application
   ============================================= */

/* ---- STATE ---- */
const State = {
    articles:   [],       
    movements:  [],       
    categories: [],        
    currentPage:     'dashboard',
    viewMode:        'grid', 
    editingArticle:  null,
    detailArticle:   null,
    movType:         'in',
    selectedColor:   '#3B82F6',
    selectedEmoji:   '💻',
    editingCategory: null,
    filters: {
      stock:    { category: '', status: '', search: '' },
      movement: { type: '', article: '', date: '' },
    },
};
  
const CAT_KEY = 'stockpro_categories';

let LoansCache = [];

function loadLoans() { 
  return LoansCache; 
}

function getLoanStatus(loan) {
    if (loan.returned) return 'returned';
    const today = new Date(); today.setHours(0,0,0,0);
    const end   = new Date(loan.dateEnd);
    const diff  = Math.ceil((end - today) / (1000*60*60*24));
    if (diff < 0)  return 'late';
    if (diff <= 3) return 'due-soon';
    return 'active';
}

function getLoanAlertCount() {
  return loadLoans().filter(l => {
    const s = getLoanStatus(l);
    return s === 'late' || s === 'due-soon';
  }).length;
}

function updateLoanBadge() {
  const count = getLoanAlertCount();
  const badge = document.getElementById('loanBadge');
  if (!badge) return;
  badge.textContent = count;
  badge.dataset.count = count;
}

/* ---- GESTION DÉLÉGUÉE ---- */
let DelegatedCache = [];
let currentTeam = 'SwissLife';

const TEAM_RESOURCES = {
  SwissLife: {
    color: '#d82034',
    sharepointUrl: 'https://cedclaimexperts.sharepoint.com/sites/DSI-MOA-TRANSFO/Documents%20partages/Forms/AllItems.aspx?id=%2Fsites%2FDSI%2DMOA%2DTRANSFO%2FDocuments%20partages%2FDir%20SI%2FSupport%20IT%2FAdministration%20%2D%20Gestion%20du%20Parc%2FGestion%20D%C3%A9l%C3%A9gu%C3%A9e%2FSwissLife&viewid=637f8af5%2Db42f%2D4ad2%2Db9ed%2D99703a7ea8bc',
    contacts: [
      { name: 'Vicent NUNES', phone: 'N/A', emails: ['vincent.nunes.externe@swisslife.fr', 'Outil Ticketing SwissLife'] },
    ],
  },
  Cardif: {
    color: '#179768',
    sharepointUrl: 'https://cedclaimexperts.sharepoint.com/sites/DSI-MOA-TRANSFO/Documents%20partages/Forms/AllItems.aspx?id=%2Fsites%2FDSI%2DMOA%2DTRANSFO%2FDocuments%20partages%2FDir%20SI%2FSupport%20IT%2FAdministration%20%2D%20Gestion%20du%20Parc%2FGestion%20D%C3%A9l%C3%A9gu%C3%A9e%2FCARDIF&viewid=637f8af5%2Db42f%2D4ad2%2Db9ed%2D99703a7ea8bc',
    contacts: [
      { name: 'Romain BUNEL', phone: '02 27 05 96 40', emails: ['romain.bunel@cardif-iard.fr', 'it.centre-services@cardif-iard.fr', 'Ticket Jira'] },
    ],
  },
  MSC: {
    color: '#ea5b0c',
    sharepointUrl: 'https://cedclaimexperts.sharepoint.com/sites/DSI-MOA-TRANSFO/Documents%20partages/Forms/AllItems.aspx?id=%2Fsites%2FDSI%2DMOA%2DTRANSFO%2FDocuments%20partages%2FDir%20SI%2FSupport%20IT%2FAdministration%20%2D%20Gestion%20du%20Parc%2FGestion%20D%C3%A9l%C3%A9gu%C3%A9e%2FMSC&viewid=637f8af5%2Db42f%2D4ad2%2Db9ed%2D99703a7ea8bc',
    contacts: [
      { name: 'Benoît DEZOTHEZ', phone: '01 56 24 77 33', emails: ['benoit.dezothez@msc-assurance.fr', 'service.supportinformatique@msc-assurance.fr'] },
    ],
  },
};

const RESOURCE_ICONS = {
  doc:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22 6 12 13 2 6"/></svg>',
};

function renderTeamResources() {
  const titleEl = document.getElementById('teamResourcesTitle');
  const gridEl  = document.getElementById('teamResourcesGrid');
  titleEl.textContent = `Ressources ${currentTeam}`;
  const team = TEAM_RESOURCES[currentTeam];

  let html = `
    <a class="resource-link-card" href="${team.sharepointUrl}" target="_blank" rel="noopener">
      <div class="resource-link-icon">${RESOURCE_ICONS.doc}</div>
      <div class="resource-link-text">
        <div class="resource-link-title">Procédures IT</div>
        <div class="resource-link-sub">SharePoint ${currentTeam}</div>
      </div>
    </a>
  `;

  team.contacts.forEach(c => {
    const emailLinks = c.emails.map(e => `<a href="mailto:${e}" onclick="event.stopPropagation()">${e}</a>`).join(' · ');
    html += `
      <div class="resource-contact-card">
        <div class="resource-link-icon">${RESOURCE_ICONS.mail}</div>
        <div class="resource-link-text">
          <div class="resource-link-title">${esc(c.name)}</div>
          <div class="resource-link-sub">📞 <a href="tel:${c.phone.replace(/\s/g,'')}">${c.phone}</a></div>
          <div class="resource-link-sub">${emailLinks}</div>
        </div>
      </div>
    `;
  });

  gridEl.innerHTML = html;
}

function getFilteredDelegated() {
  const search = document.getElementById('delegatedSearch')?.value.toLowerCase() || '';
  return DelegatedCache.filter(d => {
    if (d.team !== currentTeam) return false;
    if (search) {
      const txt = `${d.brand} ${d.model} ${d.serial} ${d.user}`.toLowerCase();
      if (!txt.includes(search)) return false;
    }
    return true;
  });
}

function renderDelegatedPage() {
  renderTeamResources();
  const items = getFilteredDelegated();
  // Affiche la colonne Token uniquement pour Cardif
  const showToken = currentTeam === 'Cardif';
  const tableHead = document.querySelector('#delegatedTable thead tr');
  if (tableHead) {
    tableHead.querySelectorAll('th').forEach(th => {
      if (th.textContent.trim() === 'Token') th.style.display = showToken ? '' : 'none';
    });
  }
  const tbody = document.getElementById('delegatedBody');

  if (!items.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-cell">Aucun matériel référencé pour cette équipe</td></tr>';
    return;
  }

  tbody.innerHTML = items.map(d => {
    const screensTxt = (d.screens && d.screens.length)
      ? d.screens.map(s => `${s.size}"`).join(', ')
      : '—';
      return `
      <tr>
        <td>${esc(d.user) || '—'}</td>
        <td><strong>${esc(d.brand)}</strong> ${esc(d.model)}</td>
        <td style="font-family:var(--mono);font-size:.82rem">${esc(d.serial) || '—'}</td>
        <td>${screensTxt}</td>
        <td><span class="antitheft-pill ${d.antitheft ? 'yes' : 'no'}">${d.antitheft ? '✓ Oui' : '✕ Non'}</span></td>
        <td><span class="antitheft-pill ${d.filtreConf ? 'yes' : 'no'}">${d.filtreConf ? '✓ Oui' : '✕ Non'}</span></td>
        <td style="display:${showToken ? '' : 'none'}">${esc(d.token) || '—'}</td>
        <td style="font-size:.82rem;color:var(--text2)">${esc(d.note) || '—'}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="icon-btn" title="Modifier" onclick="openEditDelegated(${d.id})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
          </button>
          <button class="icon-btn danger" title="Supprimer" onclick="confirmDeleteDelegated(${d.id})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function switchTeam(team) {
  currentTeam = team;
  document.querySelectorAll('.team-tab').forEach(el => el.classList.toggle('active', el.dataset.team === team));
  renderDelegatedPage();
}

function setAntitheft(val) {
  document.getElementById('delegatedAntitheft').value = val === 'yes' ? 'true' : 'false';
  document.querySelectorAll('.antitheft-btn').forEach(el => el.classList.toggle('active', el.dataset.val === val));
}

function setFiltreConf(val) {
  document.getElementById('delegatedFiltreConf').value = val === 'yes' ? 'true' : 'false';
  document.querySelectorAll('.filtreconf-btn').forEach(el => el.classList.toggle('active', el.dataset.val === val));
}

let screenCount = 0;

function addScreenRow(size = '') {
  screenCount++;
  const id = `screen-${screenCount}`;
  const container = document.getElementById('screensContainer');
  const row = document.createElement('div');
  row.className = 'screen-row';
  row.id = id;
  row.innerHTML = `
    <select class="input screen-size-select">
      <option value="20" ${size==='21'?'selected':''}>20"</option>
      <option value="21.5" ${size==='22'?'selected':''}>21.5"</option>
      <option value="24" ${size==='24'?'selected':''}>24"</option>
      <option value="autre" ${size==='autre'?'selected':''}>Autre</option>
    </select>
    <button type="button" class="icon-btn danger" onclick="document.getElementById('${id}').remove()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  `;
  container.appendChild(row);
}

function getScreensFromForm() {
  return [...document.querySelectorAll('.screen-row')].map(row => ({
    size: row.querySelector('.screen-size-select').value,
  }));
}

function clearScreens() {
  document.getElementById('screensContainer').innerHTML = '';
  screenCount = 0;
}

function openAddDelegated() {
  document.getElementById('modalDelegatedTitle').textContent = `Ajouter un PC — ${currentTeam}`;
  document.getElementById('delegatedId').value = '';
  document.getElementById('delegatedTeam').value = currentTeam;
  document.getElementById('delegatedBrand').value = '';
  document.getElementById('delegatedModel').value = '';
  document.getElementById('delegatedSerial').value = '';
  document.getElementById('delegatedUser').value = '';
  document.getElementById('delegatedNote').value = '';
  setAntitheft('no');
  setFiltreConf('no');
  document.getElementById('delegatedToken').value = '';
  clearScreens();
  openModal('modalDelegated');
}

function openEditDelegated(id) {
  const d = DelegatedCache.find(x => x.id === id);
  if (!d) return;
  document.getElementById('modalDelegatedTitle').textContent = `Modifier le PC — ${d.team}`;
  document.getElementById('delegatedId').value = d.id;
  document.getElementById('delegatedTeam').value = d.team;
  document.getElementById('delegatedBrand').value = d.brand;
  document.getElementById('delegatedModel').value = d.model;
  document.getElementById('delegatedSerial').value = d.serial;
  document.getElementById('delegatedUser').value = d.user;
  document.getElementById('delegatedNote').value = d.note;
  setAntitheft(d.antitheft ? 'yes' : 'no');
  setFiltreConf(d.filtreConf ? 'yes' : 'no');
  document.getElementById('delegatedToken').value = d.token || '';
  clearScreens();
  (d.screens || []).forEach(s => addScreenRow(s.size));
  openModal('modalDelegated');
}

async function saveDelegated() {
  const id     = document.getElementById('delegatedId').value;
  const team   = document.getElementById('delegatedTeam').value;
  const brand  = document.getElementById('delegatedBrand').value.trim();
  const model  = document.getElementById('delegatedModel').value.trim();
  const serial = document.getElementById('delegatedSerial').value.trim();
  const user   = document.getElementById('delegatedUser').value.trim();
  const note   = document.getElementById('delegatedNote').value.trim();
  const antitheft  = document.getElementById('delegatedAntitheft').value === 'true';
  const filtreConf = document.getElementById('delegatedFiltreConf').value === 'true';
  const token      = document.getElementById('delegatedToken').value.trim();
  const screens    = getScreensFromForm();

  if (!brand)  { toast('warning', 'Champ requis', 'La marque est obligatoire.'); return; }
  if (!model)  { toast('warning', 'Champ requis', 'Le modèle est obligatoire.'); return; }
  if (!serial) { toast('warning', 'Champ requis', 'Le numéro de série est obligatoire.'); return; }

  const data = { team, brand, model, serial, antitheft, filtreConf, token, user, note, screens, dateAdded: new Date().toISOString().split('T')[0] };

  const btn = document.getElementById('saveDelegatedBtn');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Enregistrement…';

  try {
    if (id) {
      const updated = await API.updateDelegated(parseInt(id), data);
      const idx = DelegatedCache.findIndex(x => x.id === updated.id);
      if (idx !== -1) DelegatedCache[idx] = updated;
      toast('success', 'Matériel modifié', `${brand} ${model}`);
    } else {
      const created = await API.createDelegated(data);
      DelegatedCache.push(created);
      toast('success', 'Matériel ajouté', `${brand} ${model} → ${team}`);
    }
    closeModal('modalDelegated');
    renderDelegatedPage();
  } catch(e) {
    toast('error', 'Erreur', e.message);
  } finally {
    btn.disabled = false; btn.innerHTML = 'Enregistrer';
  }
}

function confirmDeleteDelegated(id) {
  const d = DelegatedCache.find(x => x.id === id);
  if (!d) return;
  document.getElementById('confirmTitle').textContent = 'Supprimer le matériel';
  document.getElementById('confirmMessage').textContent = `Supprimer "${d.brand} ${d.model}" (${d.serial}) ?`;
  document.getElementById('confirmBtn').onclick = () => deleteDelegated(id);
  openModal('modalConfirm');
}

async function deleteDelegated(id) {
  try {
    await API.deleteDelegated(id);
    DelegatedCache = DelegatedCache.filter(x => x.id !== id);
    closeModal('modalConfirm');
    renderDelegatedPage();
    toast('info', 'Matériel supprimé', '');
  } catch(e) {
    toast('error', 'Erreur', e.message);
  }
}

/* ---- DARK MODE ---- */
function initDarkMode() {
  const saved = localStorage.getItem('stockpro_dark');
  if (saved === 'true') document.body.classList.add('dark');
  updateDarkLabel();
}
function toggleDarkMode() {
  document.body.classList.toggle('dark');
  localStorage.setItem('stockpro_dark', document.body.classList.contains('dark'));
  updateDarkLabel();
}
function updateDarkLabel() {
  const isDark = document.body.classList.contains('dark');
  const lbl = document.getElementById('darkToggleLabel');
  if (lbl) lbl.textContent = isDark ? 'Mode clair' : 'Mode sombre';
}

function loadMovements() {
  // Les mouvements sont maintenant chargés depuis Baserow dans loadData()
}
async function addMovement(mov) {
  const created = await API.createMovement(mov);
  State.movements.unshift(created);
}

function loadCustomCategories() {
  try { return JSON.parse(localStorage.getItem(CAT_KEY)) || []; }
  catch { return []; }
}
function saveCustomCategories(cats) {
  localStorage.setItem(CAT_KEY, JSON.stringify(cats));
}

/* ---- QR CODE ---- */
function openQR(id) {
  const a = State.articles.find(x => x.id === id);
  if (!a) return;

  document.getElementById('qrArticleName').textContent = a.name;

  // Génère une URL qui pointe vers l'app avec l'ID de l'article en paramètre
  const url = `${location.href.split('?')[0]}?article=${a.id}`;

  const canvas = document.getElementById('qrCanvas');
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

  // qrcode.js utilise un div, on le recycle
  const tmp = document.createElement('div');
  new QRCode(tmp, {
    text: url,
    width: 200, height: 200,
    colorDark: '#0F172A', colorLight: '#FFFFFF',
    correctLevel: QRCode.CorrectLevel.H,
  });
  // Récupère l'image générée et la dessine sur le canvas
  setTimeout(() => {
    const img = tmp.querySelector('img') || tmp.querySelector('canvas');
    if (!img) return;
    const src = img.tagName === 'CANVAS' ? img.toDataURL() : img.src;
    const image = new Image();
    image.onload = () => {
      canvas.width = 200; canvas.height = 200;
      canvas.getContext('2d').drawImage(image, 0, 0, 200, 200);
    };
    image.src = src;
  }, 100);

  // Téléchargement
  document.getElementById('qrDownloadBtn').onclick = () => {
    const link = document.createElement('a');
    link.download = `QR-${a.name.replace(/\s+/g,'-')}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  // Impression
  document.getElementById('qrPrintBtn').onclick = () => {
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>QR - ${a.name}</title>
      <style>body{font-family:sans-serif;text-align:center;padding:40px}
      h2{margin-bottom:8px}p{color:#666;margin-bottom:20px}
      img{border:1px solid #eee;padding:12px;border-radius:8px}</style>
      </head><body>
      <h2>${a.name}</h2>
      <p>Référence : ${a.ref || '—'} · Catégorie : ${a.category}</p>
      <img src="${canvas.toDataURL()}" width="220" />
      <p style="margin-top:20px;font-size:12px;color:#999">${url}</p>
      <script>window.onload=()=>{window.print();window.close()}<\/script>
      </body></html>`);
    win.document.close();
  };

  openModal('modalQR');
}
  
/* ---- HELPERS ---- */
function getStatus(article) {
  if (article.qty > article.threshold)   return 'ok';
  if (article.qty === article.threshold) return 'warning';
  return 'critical';
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getAlertArticles() {
  return State.articles.filter(a => getStatus(a) !== 'ok');
}

function buildCategories() {
  const custom = loadCustomCategories();
  const fromArticles = [...new Set(State.articles.map(a => a.category).filter(Boolean))];
  const map = new Map();
  // custom first
  custom.forEach(c => map.set(c.name, c));
  // fill in from articles if not in custom
  fromArticles.forEach(name => {
    if (!map.has(name)) map.set(name, { name, color: '#6B7280', emoji: '📦', description: '' });
  });
  State.categories = [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

/* ---- TOAST ---- */
function toast(type, title, msg, duration = 3500) {
  const icons = {
    success: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>',
    error:   '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    warning: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    info:    '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `${icons[type]}<div class="toast-body"><div class="toast-title">${title}</div>${msg ? `<div class="toast-msg">${msg}</div>` : ''}</div>`;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(() => {
    el.classList.add('removing');
    setTimeout(() => el.remove(), 200);
  }, duration);
}

/* ---- PLAN DU BÂTIMENT ---- */
function openFloorplanFullscreen() {
  const src = document.getElementById('floorplanImg').src;
  document.getElementById('floorplanOverlayImg').src = src;
  document.getElementById('floorplanOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeFloorplanFullscreen() {
  document.getElementById('floorplanOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

/* ---- NAVIGATION ---- */
function navigate(page) {
  State.currentPage = page;
  localStorage.setItem('stockpro_page', page);
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.page === page));
  document.querySelectorAll('.page').forEach(el => el.classList.toggle('active', el.id === `page-${page}`));
  const titles = { dashboard: 'Dashboard', stock: 'Inventaire', movements: 'Mouvements de stock', categories: 'Catégories', alerts: 'Alertes de stock', orders: 'Commandes', loans: 'Prêts de matériel', delegated: 'Gestion Déléguée'};
  document.getElementById('pageTitle').textContent = titles[page] || page;
  if (page === 'alerts')     renderAlerts();
  if (page === 'movements')  renderMovementsTable();
  if (page === 'categories') renderCategories();
  if (page === 'stock')      renderArticles();
  if (page === 'orders')     renderOrderPage();
  if (page === 'loans')      renderLoansPage();
  if (page === 'delegated')  renderDelegatedPage();
  if (page === 'floorplan') {
    const img = document.getElementById('floorplanImg');
    const placeholder = document.getElementById('floorplanPlaceholder');
    if (img) {
      img.onerror = () => { img.style.display = 'none'; if (placeholder) placeholder.style.display = 'flex'; };
      img.onload = () => { img.style.display = 'block'; if (placeholder) placeholder.style.display = 'none'; };
      img.src = img.src; // force reload check
    }
  }
}
  
/* ---- MODAL ---- */
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

/* ---- SYNC STATUS ---- */
function setSyncStatus(state) {
  const el = document.getElementById('syncStatus');
  const dot = el.querySelector('.sync-dot');
  const txt = el.querySelector('.sync-text');
  if (state === 'syncing') { dot.style.background = 'var(--orange)'; txt.textContent = 'Synchro…'; }
  else if (state === 'error') { dot.style.background = 'var(--red)'; txt.textContent = 'Hors-ligne'; }
  else { dot.style.background = 'var(--green)'; txt.textContent = 'Synchronisé'; }
}

/* ---- LOAD DATA ---- */
async function loadData() {
  setSyncStatus('syncing');

  try {

    const [articles, loans, delegated, movements] = await Promise.all([
      API.getArticles(),
      API.getLoans(),
      API.getDelegated(),
      API.getMovements()
    ]);

    State.articles = articles;
    LoansCache = loans;
    DelegatedCache = delegated;
    State.movements = movements;

    console.log("Articles :", State.articles);
    console.log("Loans :", LoansCache);
    console.log("Delegated :", DelegatedCache);

    buildCategories();
    setSyncStatus('ok');
    renderAll();

  } catch (e) {
    console.error(e);
    setSyncStatus('error');
    toast(
      'error',
      'Erreur de connexion',
      'Impossible de joindre Baserow. Vérifiez votre connexion internet.'
    );
    renderAll();
  }
}
  
function renderAll() {
  updateAlertBadge();
  updateLoanBadge();
  renderDashboard();
  renderArticles();
  renderMovementsTable();
  renderCategories();
  renderAlerts();
  renderLoansPage();
  populateSelects();
}

/* ---- ALERT BADGE ---- */
function updateAlertBadge() {
  const count = getAlertArticles().length;
  const badge = document.getElementById('alertBadge');
  badge.textContent = count;
  badge.dataset.count = count;
}

/* ---- DASHBOARD ---- */
function renderDashboard() {
  const total = State.articles.length;
  const ok      = State.articles.filter(a => getStatus(a) === 'ok').length;
  const warning = State.articles.filter(a => getStatus(a) === 'warning').length;
  const critical = State.articles.filter(a => getStatus(a) === 'critical').length;

  document.getElementById('statTotalArticles').textContent = total;
  document.getElementById('statOk').textContent = ok;
  document.getElementById('statWarning').textContent = warning;
  document.getElementById('statCritical').textContent = critical;
  document.getElementById('alertCount').textContent = `${warning + critical} article${warning+critical !== 1 ? 's' : ''}`;

  // Alert list on dashboard
  const alertList = document.getElementById('dashboardAlertList');
  const alerts = getAlertArticles().sort((a,b) => a.qty - b.qty);
  if (!alerts.length) {
    alertList.innerHTML = '<div class="empty-state small">Aucune alerte 🎉</div>';
  } else {
    alertList.innerHTML = alerts.slice(0,8).map(a => {
      const status = getStatus(a);
      return `<div class="alert-item ${status}" onclick="showDetail(${a.id})">
        <div class="alert-item-info">
          <div class="alert-item-name">${esc(a.name)}</div>
          <div class="alert-item-cat">${esc(a.category)}</div>
        </div>
        <div class="alert-item-qty">${a.qty}</div>
      </div>`;
    }).join('');
  }

  // Recent movements
  const movList = document.getElementById('dashboardMovements');
  const recent = State.movements.slice(0, 6);
  if (!recent.length) {
    movList.innerHTML = '<div class="empty-state small">Aucun mouvement</div>';
  } else {
    movList.innerHTML = recent.map(m => {
      const sign = m.type === 'in' ? '+' : '-';
      return `<div class="movement-entry">
        <div class="mov-badge ${m.type}">${sign}</div>
        <div class="mov-info">
          <div class="mov-article">${esc(m.articleName)}</div>
          <div class="mov-reason">${esc(m.reason)}</div>
        </div>
        <div class="mov-qty ${m.type}">${sign}${m.qty}</div>
        <div class="mov-date">${fmtDate(m.date)}</div>
      </div>`;
    }).join('');
  }

  // Category bars
  renderCategoryBars();
}
  
function renderCategoryBars() {
  const container = document.getElementById('categoryBars');
  const cats = State.categories;
  if (!cats.length) { container.innerHTML = '<div class="empty-state small">Aucune catégorie</div>'; return; }

  const counts = {};
  State.articles.forEach(a => { counts[a.category] = (counts[a.category] || 0) + 1; });
  const max = Math.max(...Object.values(counts), 1);

  container.innerHTML = cats.map(c => {
    const cnt = counts[c.name] || 0;
    const pct = Math.round((cnt / max) * 100);
    return `<div class="cat-bar-row">
      <div class="cat-bar-label"><span>${c.emoji}</span><span>${esc(c.name)}</span></div>
      <div class="cat-bar-track"><div class="cat-bar-fill" style="width:${pct}%;background:${c.color}"></div></div>
      <div class="cat-bar-count">${cnt} article${cnt !== 1 ? 's' : ''}</div>
    </div>`;
  }).join('');
}

/* ---- ARTICLES ---- */
function getFilteredArticles() {
  const { category, status, search } = State.filters.stock;
  return State.articles.filter(a => {
    if (category && a.category !== category) return false;
    if (status && getStatus(a) !== status)   return false;
    if (search) {
      const q = search.toLowerCase();
      if (!a.name.toLowerCase().includes(q) && !a.ref.toLowerCase().includes(q) && !a.category.toLowerCase().includes(q)) return false;
    }
    return true;
  }).sort((a, b) => {
    const catCmp = a.category.localeCompare(b.category, 'fr');
    if (catCmp !== 0) return catCmp;
    return a.name.localeCompare(b.name, 'fr');
  });
}
  
function renderArticles() {
  const grid = document.getElementById('articlesGrid');
  const articles = getFilteredArticles();
  if (!articles.length) {
    grid.innerHTML = '<div class="empty-state">Aucun article trouvé<small>Modifiez les filtres ou ajoutez un article.</small></div>';
    return;
  }
  const isList = State.viewMode === 'list';
  grid.className = `articles-grid${isList ? ' list-view' : ''}`;
  grid.innerHTML = articles.map(a => articleCard(a, isList)).join('');
}

function articleCard(a, isList) {
  const status = getStatus(a);
  const cat = State.categories.find(c => c.name === a.category) || {};
  const imgHtml = a.image
    ? `<img src="${esc(a.image)}" alt="${esc(a.name)}" loading="lazy" />`
    : `<div class="no-img">${cat.emoji || '📦'}</div>`;

  if (isList) {
    return `<div class="article-card ${status}" onclick="showDetail(${a.id})">
      <div class="article-card-img">${imgHtml}<div class="status-dot ${status}"></div></div>
      <div class="article-card-body">
        <div><div class="article-card-name">${esc(a.name)}</div><div class="article-card-ref">${esc(a.ref) || '—'}</div></div>
        <div class="article-card-cat" style="background:${cat.color||'#e5e7eb'}22;color:${cat.color||'#6B7280'}">${cat.emoji||'📦'} ${esc(a.category)}</div>
        ${a.location ? `<span style="font-size:.77rem;color:var(--text3)">📍 ${esc(a.location)}</span>` : ''}
      </div>
      <div class="article-card-footer">
        <div><div class="article-qty ${status}">${a.qty}</div><div class="article-unit">unités</div></div>
        <div class="article-actions" onclick="event.stopPropagation()">
          <button class="icon-btn" title="Entrée stock" onclick="openMovForArticleId(${a.id},'in')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg></button>
          <button class="icon-btn" title="Sortie stock" onclick="openMovForArticleId(${a.id},'out')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg></button>
          <button class="icon-btn" title="Modifier" onclick="openEditArticle(${a.id})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg></button>
          <button class="icon-btn danger" title="Supprimer" onclick="confirmDeleteArticle(${a.id})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></button>
          <button class="icon-btn" title="QR Code" onclick="openQR(${a.id})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/><rect x="7" y="7" width="2" height="2"/><rect x="17" y="7" width="2" height="2"/><rect x="7" y="17" width="2" height="2"/><path d="M16 16h2v2h-2z"/><path d="M18 18h2v2h-2z"/></svg></button>
        </div>
      </div>
    </div>`;
  }

  return `<div class="article-card ${status}" onclick="showDetail(${a.id})">
    <div class="article-card-img">${imgHtml}<div class="status-dot ${status}"></div></div>
    <div class="article-card-body">
      <div class="article-card-name">${esc(a.name)}</div>
      <div class="article-card-ref">${esc(a.ref) || '—'}</div>
      <div class="article-card-cat" style="background:${cat.color||'#e5e7eb'}22;color:${cat.color||'#6B7280'}">${cat.emoji||'📦'} ${esc(a.category)}</div>
    </div>
    <div class="article-card-footer">
      <div><div class="article-qty ${status}">${a.qty}</div><div class="article-unit">unités</div></div>
      <div class="article-actions" onclick="event.stopPropagation()">
        <button class="icon-btn" title="Entrée" onclick="openMovForArticleId(${a.id},'in')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg></button>
        <button class="icon-btn" title="Sortie" onclick="openMovForArticleId(${a.id},'out')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg></button>
        <button class="icon-btn" title="Modifier" onclick="openEditArticle(${a.id})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg></button>
        <button class="icon-btn danger" title="Supprimer" onclick="confirmDeleteArticle(${a.id})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></button>
        <button class="icon-btn" title="QR Code" onclick="openQR(${a.id})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/><rect x="7" y="7" width="2" height="2"/><rect x="17" y="7" width="2" height="2"/><rect x="7" y="17" width="2" height="2"/><path d="M16 16h2v2h-2z"/><path d="M18 18h2v2h-2z"/></svg></button>
      </div>
    </div>
  </div>`;
}
  
/* ---- ARTICLE MODAL ---- */
function openAddArticle() {
  State.editingArticle = null;
  document.getElementById('modalArticleTitle').textContent = 'Nouvel article';
  document.getElementById('articleId').value = '';
  document.getElementById('articleName').value = '';
  document.getElementById('articleRef').value = '';
  document.getElementById('articleCategory').value = '';
  document.getElementById('articleQty').value = 0;
  document.getElementById('articleThreshold').value = 3;
  document.getElementById('articleLocation').value = '';
  document.getElementById('articleDesc').value = '';
  clearImagePreview();
  openModal('modalArticle');
}

function openEditArticle(id) {
  const a = State.articles.find(x => x.id === id);
  if (!a) return;
  State.editingArticle = a;
  document.getElementById('modalArticleTitle').textContent = 'Modifier l\'article';
  document.getElementById('articleId').value = a.id;
  document.getElementById('articleName').value = a.name;
  document.getElementById('articleRef').value = a.ref;
  document.getElementById('articleCategory').value = a.category;
  document.getElementById('articleQty').value = a.qty;
  document.getElementById('articleThreshold').value = a.threshold;
  document.getElementById('articleLocation').value = a.location;
  document.getElementById('articleDesc').value = a.description;
  if (a.image) {
    showImagePreview(a.image);
  } else {
    clearImagePreview();
  }
  closeModal('modalDetail');
  openModal('modalArticle');
}

function editCurrentArticle() {
  if (State.detailArticle) openEditArticle(State.detailArticle.id);
}

async function saveArticle() {
  const name     = document.getElementById('articleName').value.trim();
  const category = document.getElementById('articleCategory').value;
  if (!name) { toast('warning', 'Champ requis', 'Le nom de l\'article est obligatoire.'); return; }
  if (!category) { toast('warning', 'Champ requis', 'Veuillez sélectionner une catégorie.'); return; }

  const cat = State.categories.find(c => c.name === category) || {};
  const articleData = {
    name,
    ref:         document.getElementById('articleRef').value.trim(),
    category,
    qty:         parseInt(document.getElementById('articleQty').value) || 0,
    threshold:   parseInt(document.getElementById('articleThreshold').value) || 3,
    location:    document.getElementById('articleLocation').value.trim(),
    description: document.getElementById('articleDesc').value.trim(),
    image:       document.getElementById('previewImg').src.includes('data:') || document.getElementById('imagePreview').style.display !== 'none' ? document.getElementById('previewImg').src : '',
    catColor:    cat.color || '#6B7280',
    catEmoji:    cat.emoji || '📦',
  };

  const btn = document.getElementById('saveArticleBtn');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Enregistrement…';

  try {
    if (State.editingArticle) {
      const updated = await API.updateArticle(State.editingArticle.id, articleData);
      const idx = State.articles.findIndex(x => x.id === updated.id);
      if (idx !== -1) State.articles[idx] = updated;
      toast('success', 'Article modifié', `"${updated.name}" a été mis à jour.`);
    } else {
      const created = await API.createArticle(articleData);
      State.articles.push(created);
      toast('success', 'Article ajouté', `"${created.name}" a été créé.`);
    }
    buildCategories();
    closeModal('modalArticle');
    renderAll();
  } catch(e) {
    toast('error', 'Erreur', e.message);
  } finally {
    btn.disabled = false; btn.innerHTML = 'Enregistrer';
  }
}
  
function confirmDeleteArticle(id) {
  const a = State.articles.find(x => x.id === id);
  if (!a) return;
  document.getElementById('confirmTitle').textContent = 'Supprimer l\'article';
  document.getElementById('confirmMessage').textContent = `Supprimer définitivement "${a.name}" ? Cette action est irréversible.`;
  document.getElementById('confirmBtn').onclick = () => deleteArticle(id);
  openModal('modalConfirm');
}

async function deleteArticle(id) {
  const btn = document.getElementById('confirmBtn');
  btn.disabled = true; btn.textContent = 'Suppression…';
  try {
    await API.deleteArticle(id);
    State.articles = State.articles.filter(x => x.id !== id);
    State.movements = State.movements.filter(m => m.articleId !== id);
    buildCategories();
    closeModal('modalConfirm');
    closeModal('modalDetail');
    renderAll();
    toast('success', 'Article supprimé', 'L\'article a été supprimé.');
  } catch(e) {
    toast('error', 'Erreur', e.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Supprimer';
  }
}

function deleteCurrentArticle() {
  if (State.detailArticle) confirmDeleteArticle(State.detailArticle.id);
}

/* ---- IMAGE UPLOAD ---- */
function showImagePreview(src) {
  document.getElementById('previewImg').src = src;
  document.getElementById('imagePreview').style.display = 'block';
  document.getElementById('imagePlaceholder').style.display = 'none';
}
function clearImagePreview() {
  document.getElementById('previewImg').src = '';
  document.getElementById('imagePreview').style.display = 'none';
  document.getElementById('imagePlaceholder').style.display = 'flex';
}

/* ---- DETAIL MODAL ---- */
function showDetail(id) {
  const a = State.articles.find(x => x.id === id);
  if (!a) return;
  State.detailArticle = a;
  const status = getStatus(a);
  const cat = State.categories.find(c => c.name === a.category) || {};

  document.getElementById('detailArticleName').textContent = a.name;
  const di = document.getElementById('detailImage');
  if (a.image) {
    di.innerHTML = `<img src="${esc(a.image)}" alt="${esc(a.name)}" />`;
  } else {
    di.innerHTML = `<div class="detail-image-placeholder">${cat.emoji || '📦'}</div>`;
  }
  document.getElementById('detailCategory').textContent = a.category || '—';
  document.getElementById('detailRef').textContent = a.ref || '—';
  document.getElementById('detailLocation').textContent = a.location || '—';
  document.getElementById('detailThreshold').textContent = a.threshold;
  document.getElementById('detailQty').textContent = a.qty;
  document.getElementById('detailQty').className = `stock-number ${status}`;
  document.getElementById('detailDesc').textContent = a.description || '';

  const labels = { ok: '✓ Stock OK', warning: '⚠ Seuil d\'alerte', critical: '✕ Stock critique' };
  const chipClass = { ok: 'chip-green', warning: 'chip-orange', critical: 'chip-red' };
  document.getElementById('detailBadge').innerHTML = `<span class="chip ${chipClass[status]}">${labels[status]}</span>`;

  // History
  const hist = State.movements.filter(m => m.articleId === a.id).slice(0, 15);
  const histEl = document.getElementById('detailHistory');
  if (!hist.length) {
    histEl.innerHTML = '<div class="empty-state small">Aucun mouvement pour cet article</div>';
  } else {
    histEl.innerHTML = hist.map(m => {
      const sign = m.type === 'in' ? '+' : '-';
      return `<div class="movement-entry">
        <div class="mov-badge ${m.type}">${sign}</div>
        <div class="mov-info"><div class="mov-reason">${esc(m.reason)}</div></div>
        <div class="mov-qty ${m.type}">${sign}${m.qty}</div>
        <div class="mov-date">${fmtDate(m.date)}</div>
      </div>`;
    }).join('');
  }

  openModal('modalDetail');
}
  
/* ---- MOVEMENTS MODAL ---- */
let _movForArticleId = null;
let _movForType = 'in';

function openAddMovement(type = 'in') {
  _movForArticleId = null;
  _movForType = type;
  resetMovType(type);

  multiMovRows = [];
  multiRowCounter = 0;
  document.getElementById('multiMovSection').style.display = 'none';
  document.getElementById('singleMovSection').style.display = 'block';
  document.getElementById('toggleMultiMov').textContent = '+ Mode mutliple';

  document.getElementById('movArticle').value = '';
  document.getElementById('movQty').value = 1;
  document.getElementById('movDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('movReason').value = '';
  document.getElementById('stockPreview').style.display = 'none';
  openModal('modalMovement');
}

function openMovementForArticle(type) {
  if (!State.detailArticle) return;
  openMovForArticleId(State.detailArticle.id, type);
  closeModal('modalDetail');
}

function openMovForArticleId(id, type) {
  _movForArticleId = id;
  _movForType = type;
  const a = State.articles.find(x => x.id === id);
  resetMovType(type);
  // Reset mode multi
  multiMovRows = [];
  multiRowCounter = 0;
  document.getElementById('multiMovSection').style.display = 'none';
  document.getElementById('singleMovSection').style.display = 'block';
  document.getElementById('toggleMultiMov').textContent = '+ Mode multiple';
  // Rempli le mode simple
  document.getElementById('movArticle').value = id;
  document.getElementById('movQty').value = 1;
  document.getElementById('movDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('movReason').value = '';
  if (a) updateStockPreview(a, 1, type);
  openModal('modalMovement');
}

function resetMovType(type) {
  State.movType = type;
  document.getElementById('typeIn').classList.toggle('active', type === 'in');
  document.getElementById('typeOut').classList.toggle('active', type === 'out');
}

function updateStockPreview(a, qty, type) {
  const prev = document.getElementById('stockPreview');
  const newQty = type === 'in' ? a.qty + qty : a.qty - qty;
  document.getElementById('previewCurrent').textContent = a.qty;
  document.getElementById('previewNew').textContent = newQty;
  document.getElementById('previewNew').style.color = newQty < 0 ? 'var(--red)' : 'var(--text)';
  prev.style.display = 'flex';
}

async function saveMovement() {
  const isMulti = document.getElementById('multiMovSection').style.display !== 'none';

  if (isMulti) {
    // Validation mode multi
    if (!multiMovRows.length) { toast('warning', 'Aucun article', 'Ajoutez au moins un article.'); return; }
    const date   = document.getElementById('movDate').value;
    const reason = document.getElementById('movReason').value.trim();
    if (!date)   { toast('warning', 'Champ requis', 'La date est obligatoire.'); return; }
    if (!reason) { toast('warning', 'Champ requis', 'La raison est obligatoire.'); return; }

    for (const row of multiMovRows) {
      if (!row.articleId) { toast('warning', 'Article manquant', 'Chaque ligne doit avoir un article sélectionné.'); return; }
      if (!row.qty || row.qty < 1) { toast('warning', 'Quantité invalide', 'Chaque ligne doit avoir une quantité ≥ 1.'); return; }
    }

    const btn = document.getElementById('saveMovementBtn');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Validation…';

    try {
      for (const row of multiMovRows) {
        const a = State.articles.find(x => x.id === row.articleId);
        if (!a) continue;
        const type = State.movType;
        if (type === 'out' && row.qty > a.qty) {
          toast('warning', 'Stock insuffisant', `"${a.name}" : stock actuel ${a.qty}, demandé ${row.qty}.`);
          btn.disabled = false; btn.innerHTML = 'Valider le mouvement';
          return;
        }
        const newQty = type === 'in' ? a.qty + row.qty : a.qty - row.qty;
        await API.updateArticle(a.id, { ...a, qty: newQty });
        a.qty = newQty;
        await addMovement({ articleId: a.id, articleName: a.name, type, qty: row.qty, date, reason });
      }
      closeModal('modalMovement');
      renderAll();
      toast('success', `${multiMovRows.length} mouvement(s) enregistré(s)`, `Type : ${State.movType === 'in' ? 'Entrée' : 'Sortie'}`);
      multiMovRows = [];
    } catch(e) {
      toast('error', 'Erreur', e.message);
    } finally {
      btn.disabled = false; btn.innerHTML = 'Valider le mouvement';
    }
    return;
  }

  // Mode simple (code existant inchangé)
  const articleId = parseInt(document.getElementById('movArticle').value);
  const qty       = parseInt(document.getElementById('movQty').value);
  const date      = document.getElementById('movDate').value;
  const reason    = document.getElementById('movReason').value.trim();

  if (!articleId) { toast('warning', 'Champ requis', 'Sélectionnez un article.'); return; }
  if (!qty || qty < 1) { toast('warning', 'Champ requis', 'La quantité doit être ≥ 1.'); return; }
  if (!date) { toast('warning', 'Champ requis', 'La date est obligatoire.'); return; }
  if (!reason) { toast('warning', 'Champ requis', 'La raison est obligatoire.'); return; }

  const a = State.articles.find(x => x.id === articleId);
  if (!a) return;

  const type = State.movType;
  if (type === 'out' && qty > a.qty) {
    toast('warning', 'Stock insuffisant', `Impossible de retirer ${qty} unités (stock actuel : ${a.qty}).`);
    return;
  }

  const btn = document.getElementById('saveMovementBtn');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Validation…';

  try {
    const newQty = type === 'in' ? a.qty + qty : a.qty - qty;
    await API.updateArticle(a.id, { ...a, qty: newQty });
    a.qty = newQty;
    await addMovement({ articleId: a.id, articleName: a.name, type, qty, date, reason });
    closeModal('modalMovement');
    renderAll();
    toast('success', `Mouvement enregistré`, `${type === 'in' ? '+' : '-'}${qty} × ${a.name}`);
  } catch(e) {
    toast('error', 'Erreur', e.message);
  } finally {
    btn.disabled = false; btn.innerHTML = 'Valider le mouvement';
  }
}

/* ---- MOUVEMENTS MULTIPLES ---- */
let multiMovRows = [];
let multiRowCounter = 0;

function addMultiMovRow() {
  multiRowCounter++;
  multiMovRows.push({ id: multiRowCounter, articleId: null, qty: 1 });
  renderMultiMovRows();
}

function removeMultiMovRow(id) {
  multiMovRows = multiMovRows.filter(r => r.id !== id);
  renderMultiMovRows();
}

function setMultiMovArticle(id, articleId) {
  const row = multiMovRows.find(r => r.id === id);
  if (row) row.articleId = parseInt(articleId) || null;
  updateMultiMovPreview();
}

function setMultiMovQty(id, qty) {
  const row = multiMovRows.find(r => r.id === id);
  if (row) row.qty = parseInt(qty) || 1;
  updateMultiMovPreview();
}

function updateMultiMovPreview() {
  multiMovRows.forEach(row => {
    const previewEl = document.getElementById(`multi-preview-${row.id}`);
    if (!previewEl) return;
    const a = State.articles.find(x => x.id === row.articleId);
    if (!a) { previewEl.textContent = ''; return; }
    const newQty = State.movType === 'in' ? a.qty + row.qty : a.qty - row.qty;
    const color = newQty < 0 ? 'var(--red)' : newQty <= a.threshold ? 'var(--orange)' : 'var(--green)';
    previewEl.innerHTML = `Stock : <strong>${a.qty}</strong> → <strong style="color:${color}">${newQty}</strong>`;
  });
}

function renderMultiMovRows() {
  const container = document.getElementById('multiMovRows');
  if (!container) return;
  if (!multiMovRows.length) {
    container.innerHTML = '<div style="color:var(--text3);font-size:.82rem;padding:8px 0">Aucune ligne — cliquez sur "+ Ligne" pour ajouter.</div>';
    return;
  }
  container.innerHTML = multiMovRows.map(row => {
    const articlesOptions = State.articles.map(a =>
      `<option value="${a.id}" ${row.articleId === a.id ? 'selected' : ''}>${esc(a.name)} (stock: ${a.qty})</option>`
    ).join('');
    return `<div class="multi-mov-row" id="multi-row-${row.id}" style="display:flex;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
      <select class="input" style="flex:2;min-width:0" onchange="setMultiMovArticle(${row.id}, this.value)">
        <option value="">Choisir un article…</option>
        ${articlesOptions}
      </select>
      <input type="number" class="input" style="width:70px;flex-shrink:0;text-align:center" min="1" value="${row.qty}"
        oninput="setMultiMovQty(${row.id}, this.value)" onchange="setMultiMovQty(${row.id}, this.value)" />
      <span id="multi-preview-${row.id}" style="font-size:.78rem;color:var(--text2);min-width:110px;flex-shrink:0"></span>
      <button class="icon-btn danger" style="flex-shrink:0" onclick="removeMultiMovRow(${row.id})" title="Supprimer ligne">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>`;
  }).join('');
  updateMultiMovPreview();
}

function toggleMultiMode() {
  const multiSection = document.getElementById('multiMovSection');
  const singleSection = document.getElementById('singleMovSection');
  const btn = document.getElementById('toggleMultiMov');
  const isMulti = multiSection.style.display !== 'none';
  if (isMulti) {
    multiSection.style.display = 'none';
    singleSection.style.display = 'block';
    btn.textContent = '+ Mode mutliple';
    multiMovRows = [];
  } else {
    multiSection.style.display = 'block';
    singleSection.style.display = 'none';
    btn.textContent = '← Mode unique';
    if (!multiMovRows.length) addMultiMovRow();
  }
}

/* ---- MOVEMENTS TABLE ---- */
function getFilteredMovements() {
  const { type, article, date } = State.filters.movement;
  return State.movements.filter(m => {
    if (type && m.type !== type) return false;
    if (article && String(m.articleId) !== article) return false;
    if (date && m.date !== date) return false;
    return true;
  }).sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date) - new Date(a.date);
  });
}

function renderMovementsTable() {
  const tbody = document.getElementById('movementsBody');
  const movs = getFilteredMovements();
  if (!movs.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">Aucun mouvement à afficher</td></tr>';
    return;
  }
  tbody.innerHTML = movs.map(m => {
    const sign = m.type === 'in' ? '+' : '-';
    return `<tr>
      <td class="date-cell">${fmtDate(m.date)}</td>
      <td>${esc(m.articleName)}</td>
      <td><span class="type-pill ${m.type}">${m.type === 'in' ? '↑ Entrée' : '↓ Sortie'}</span></td>
      <td class="qty-cell ${m.type}">${sign}${m.qty}</td>
      <td>${esc(m.reason)}</td>
      <td>
        <button class="icon-btn danger" title="Supprimer" onclick="deleteMovement(${m.id})">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
        </button>
      </td>
    </tr>`;
  }).join('');
}
  
async function deleteMovement(id) {
  try {
    await API.deleteMovement(id);
    State.movements = State.movements.filter(m => m.id !== id);
    renderMovementsTable();
    renderDashboard();
    toast('info', 'Mouvement supprimé', '');
  } catch(e) {
    toast('error', 'Erreur', e.message);
  }
}

/* ---- CATEGORIES ---- */
function renderCategories() {
  const grid = document.getElementById('categoriesGrid');
  if (!State.categories.length) {
    grid.innerHTML = '<div class="empty-state">Aucune catégorie.<small>Créez votre première catégorie.</small></div>';
    return;
  }
  const counts = {};
  State.articles.forEach(a => { counts[a.category] = (counts[a.category] || 0) + 1; });
  grid.innerHTML = State.categories.map(c => {
    const cnt = counts[c.name] || 0;
    return `<div class="category-card">
      <div class="cat-card-header">
        <div class="cat-emoji-wrap" style="background:${c.color}22">${c.emoji}</div>
        <div class="cat-card-actions">
          <button class="icon-btn" title="Modifier" onclick="openEditCategory('${esc(c.name)}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg></button>
          <button class="icon-btn danger" title="Supprimer" onclick="confirmDeleteCategory('${esc(c.name)}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg></button>
        </div>
      </div>
      <div class="cat-card-name" style="color:${c.color}">${esc(c.name)}</div>
      <div class="cat-card-desc">${esc(c.description) || '—'}</div>
      <div class="cat-card-stat"><span class="cat-count">${cnt}</span> article${cnt !== 1 ? 's' : ''}</div>
    </div>`;
  }).join('');
}

function openAddCategory() {
  State.editingCategory = null;
  document.getElementById('modalCategoryTitle').textContent = 'Nouvelle catégorie';
  document.getElementById('categoryId').value = '';
  document.getElementById('categoryName').value = '';
  document.getElementById('categoryDesc').value = '';
  selectColor('#3B82F6');
  selectEmoji('💻');
  openModal('modalCategory');
}

function openEditCategory(name) {
  const c = State.categories.find(x => x.name === name);
  if (!c) return;
  State.editingCategory = c;
  document.getElementById('modalCategoryTitle').textContent = 'Modifier la catégorie';
  document.getElementById('categoryId').value = c.name;
  document.getElementById('categoryName').value = c.name;
  document.getElementById('categoryDesc').value = c.description || '';
  selectColor(c.color);
  selectEmoji(c.emoji);
  openModal('modalCategory');
}
  
function saveCategory() {
  const name = document.getElementById('categoryName').value.trim();
  const color = document.getElementById('categoryColor').value;
  const emoji = document.getElementById('categoryEmoji').value;
  const description = document.getElementById('categoryDesc').value.trim();
  if (!name) { toast('warning', 'Champ requis', 'Le nom est obligatoire.'); return; }

  const cats = loadCustomCategories();
  if (State.editingCategory) {
    const idx = cats.findIndex(c => c.name === State.editingCategory.name);
    const updated = { name, color, emoji, description };
    if (idx !== -1) cats[idx] = updated;
    else cats.push(updated);
    // update articles with old name
    if (State.editingCategory.name !== name) {
      State.articles.forEach(a => { if (a.category === State.editingCategory.name) { a.category = name; a.catColor = color; a.catEmoji = emoji; } });
    }
    toast('success', 'Catégorie modifiée', name);
  } else {
    if (cats.find(c => c.name === name)) { toast('warning', 'Doublon', 'Cette catégorie existe déjà.'); return; }
    cats.push({ name, color, emoji, description });
    toast('success', 'Catégorie créée', name);
  }
  saveCustomCategories(cats);
  buildCategories();
  State.categories.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  closeModal('modalCategory');
  renderAll();
}

function confirmDeleteCategory(name) {
  const used = State.articles.some(a => a.category === name);
  document.getElementById('confirmTitle').textContent = 'Supprimer la catégorie';
  document.getElementById('confirmMessage').textContent = used
    ? `La catégorie "${name}" est utilisée par des articles. Supprimer quand même ?`
    : `Supprimer la catégorie "${name}" ?`;
  document.getElementById('confirmBtn').onclick = () => deleteCategory(name);
  openModal('modalConfirm');
}

function deleteCategory(name) {
  const cats = loadCustomCategories().filter(c => c.name !== name);
  saveCustomCategories(cats);
  buildCategories();
  State.categories.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  closeModal('modalConfirm');
  renderAll();
  toast('info', 'Catégorie supprimée', name);
}

function selectColor(color) {
  State.selectedColor = color;
  document.getElementById('categoryColor').value = color;
  document.querySelectorAll('.color-swatch').forEach(el => el.classList.toggle('active', el.dataset.color === color));
}

function selectEmoji(emoji) {
  State.selectedEmoji = emoji;
  document.getElementById('categoryEmoji').value = emoji;
  document.querySelectorAll('.emoji-btn').forEach(el => el.classList.toggle('active', el.dataset.emoji === emoji));
}

/* ---- ALERTS PAGE ---- */
function renderAlerts() {
  const container = document.getElementById('alertsSections');
  const criticals = State.articles.filter(a => getStatus(a) === 'critical').sort((a,b) => a.qty - b.qty);
  const warnings  = State.articles.filter(a => getStatus(a) === 'warning').sort((a,b) => a.name.localeCompare(b.name));
  const oks       = State.articles.filter(a => getStatus(a) === 'ok').sort((a,b) => a.qty - b.qty);

  let html = '';
  if (!State.articles.length) {
    container.innerHTML = '<div class="empty-state">Aucun article dans l\'inventaire.</div>';
    return;
  }

  if (criticals.length) {
    html += `<div>
      <div class="alert-section-title">🔴 Stock critique — ${criticals.length} article${criticals.length !== 1 ? 's' : ''}</div>
      <div class="alerts-card-grid">${criticals.map(a => alertCard(a, 'critical')).join('')}</div>
    </div>`;
  }
  if (warnings.length) {
    html += `<div>
      <div class="alert-section-title">🟠 Seuil d'alerte — ${warnings.length} article${warnings.length !== 1 ? 's' : ''}</div>
      <div class="alerts-card-grid">${warnings.map(a => alertCard(a, 'warning')).join('')}</div>
    </div>`;
  }
  if (oks.length) {
    html += `<div>
      <div class="alert-section-title">🟢 Stock OK — ${oks.length} article${oks.length !== 1 ? 's' : ''}</div>
      <div class="alerts-card-grid">${oks.slice(0,12).map(a => alertCard(a, 'ok')).join('')}</div>
      ${oks.length > 12 ? `<p style="color:var(--text3);font-size:.82rem;margin-top:8px">… et ${oks.length - 12} autres articles en stock OK.</p>` : ''}
    </div>`;
  }

  container.innerHTML = html || '<div class="empty-state">Aucun article.</div>';
}
  
function alertCard(a, status) {
  const cat = State.categories.find(c => c.name === a.category) || {};
  const restockBtn = (status === 'critical' || status === 'warning')
    ? `<button class="restock-btn" onclick="event.stopPropagation();restock(${a.id})">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
        Réapprovisionner (+${Math.max(a.threshold - a.qty + 1, 1)})
        </button>`
    : '';
  return `<div class="alert-card ${status}" onclick="showDetail(${a.id})">
    <div class="alert-card-name">${esc(a.name)}</div>
    <div class="alert-card-cat">${cat.emoji || '📦'} ${esc(a.category)}</div>
    <div class="alert-card-qty">${a.qty}</div>
    <div class="alert-card-label">unités restantes</div>
    ${restockBtn}
  </div>`;
}

function restock(id) {
  const a = State.articles.find(x => x.id === id);
  if (!a) return;
  const needed = Math.max(a.threshold - a.qty + 1, 1);
  resetMovType('in');
  document.getElementById('movArticle').value = a.id;
  document.getElementById('movQty').value = needed;
  document.getElementById('movDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('movReason').value = 'Réapprovisionnement';
  updateStockPreview(a, needed, 'in');
  openModal('modalMovement');
}

/* ---- POPULATE SELECTS ---- */
function populateSelects() {
  // Category filter (stock page)
  const fc = document.getElementById('filterCategory');
  const curCat = fc.value;
  fc.innerHTML = '<option value="">Toutes les catégories</option>' +
    State.categories.map(c => `<option value="${esc(c.name)}" ${curCat===c.name?'selected':''}>${c.emoji} ${esc(c.name)}</option>`).join('');

  // Category in article form
  const ac = document.getElementById('articleCategory');
  const curAc = ac.value;
  ac.innerHTML = '<option value="">Sélectionner…</option>' +
    State.categories.map(c => `<option value="${esc(c.name)}" ${curAc===c.name?'selected':''}>${c.emoji} ${esc(c.name)}</option>`).join('');

  // Article in movement form
  const ma = document.getElementById('movArticle');
  const curMa = ma.value;
  ma.innerHTML = '<option value="">Sélectionner un article…</option>' +
    State.articles.map(a => `<option value="${a.id}" ${curMa==a.id?'selected':''}>${esc(a.name)}</option>`).join('');

  // Article filter in movements table
  const fa = document.getElementById('filterMovArticle');
  const curFa = fa.value;
  fa.innerHTML = '<option value="">Tous les articles</option>' +
    State.articles.map(a => `<option value="${a.id}" ${curFa==a.id?'selected':''}>${esc(a.name)}</option>`).join('');
}

/* ---- SEARCH ---- */
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ---- PAGE COMMANDES ---- */

// État des sélections commande
const OrderState = {
  selected: new Set(),   // IDs des articles cochés
  quantities: {},        // { id: quantité }
  comments: {},          // { id: commentaire }
};

function getOrderCandidates() {
  const catFilter    = document.getElementById('orderFilterCat')?.value || '';
  const statusFilter = document.getElementById('orderFilterStatus')?.value || '';
  return State.articles
    .filter(a => {
      const s = getStatus(a);
      if (catFilter && a.category !== catFilter) return false;
      if (statusFilter && s !== statusFilter) return false;
      return true;
    })
    .sort((a, b) => {
      // critiques en premier, puis par catégorie
      const sA = getStatus(a) === 'critical' ? 0 : 1;
      const sB = getStatus(b) === 'critical' ? 0 : 1;
      if (sA !== sB) return sA - sB;
      return a.category.localeCompare(b.category, 'fr') || a.name.localeCompare(b.name, 'fr');
    });
}

function renderOrderPage() {
  const candidates = getOrderCandidates();
  const tbody = document.getElementById('orderTableBody');
  const countEl = document.getElementById('orderAlertCount');
  if (countEl) countEl.textContent = `${candidates.length} article${candidates.length !== 1 ? 's' : ''}`;

  if (!candidates.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-cell">🎉 Aucun article en alerte — stock en bonne santé !</td></tr>`;
    updateOrderSummary();
    return;
  }

  tbody.innerHTML = candidates.map(a => {
    const status = getStatus(a);
    const defQty = OrderState.quantities[a.id] ?? Math.max(a.threshold - a.qty + 1, 1);
    const comment = OrderState.comments[a.id] ?? '';
    const checked = OrderState.selected.has(a.id);
    const cat = State.categories.find(c => c.name === a.category) || {};
    return `<tr class="${checked ? 'order-row-selected' : ''}" id="order-row-${a.id}">
      <td><input type="checkbox" ${checked ? 'checked' : ''} onchange="toggleOrderRow(${a.id}, this.checked)" /></td>
      <td><strong>${esc(a.name)}</strong></td>
      <td><span style="font-size:.78rem;padding:2px 8px;border-radius:99px;background:${cat.color||'#e5e7eb'}22;color:${cat.color||'#6b7280'}">${cat.emoji||'📦'} ${esc(a.category)}</span></td>
      <td style="font-family:var(--mono);font-size:.8rem;color:var(--text3)">${esc(a.ref) || '—'}</td>
      <td><span class="article-qty ${status}" style="font-size:1rem">${a.qty}</span></td>
      <td style="color:var(--text3)">${a.threshold}</td>
      <td><span class="type-pill ${status === 'critical' ? 'out' : 'in'}">${status === 'critical' ? '🔴 Critique' : '🟠 Alerte'}</span></td>
      <td><input type="number" class="order-qty-input" min="1" value="${defQty}" onchange="setOrderQty(${a.id}, this.value)" oninput="setOrderQty(${a.id}, this.value)" /></td>
      <td><input type="text" class="order-comment-input" placeholder="ex: Amazon, fournisseur…" value="${esc(comment)}" oninput="setOrderComment(${a.id}, this.value)" /></td>
    </tr>`;
  }).join('');

  updateOrderSummary();
  populateOrderCatFilter();
}

function toggleOrderRow(id, checked) {
  if (checked) OrderState.selected.add(id);
  else OrderState.selected.delete(id);
  const row = document.getElementById(`order-row-${id}`);
  if (row) row.classList.toggle('order-row-selected', checked);
  updateOrderSummary();
}

function setOrderQty(id, val) {
  OrderState.quantities[id] = Math.max(1, parseInt(val) || 1);
}

function setOrderComment(id, val) {
  OrderState.comments[id] = val;
}

function updateOrderSummary() {
  const bar = document.getElementById('orderSummaryBar');
  const txt = document.getElementById('orderSummaryText');
  if (!bar || !txt) return;
  const count = OrderState.selected.size;
  const totalQty = [...OrderState.selected].reduce((sum, id) => {
    return sum + (OrderState.quantities[id] ?? 1);
  }, 0);
  if (count === 0) {
    bar.classList.remove('has-items');
    txt.textContent = 'Sélectionnez les articles à commander ci-dessous.';
  } else {
    bar.classList.add('has-items');
    txt.textContent = `✓ ${count} article${count !== 1 ? 's' : ''} sélectionné${count !== 1 ? 's' : ''} — ${totalQty} unité${totalQty !== 1 ? 's' : ''} au total à commander.`;
  }
}

function populateOrderCatFilter() {
  const sel = document.getElementById('orderFilterCat');
  if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = '<option value="">Toutes les catégories</option>' +
    State.categories.map(c => `<option value="${esc(c.name)}" ${cur===c.name?'selected':''}>${c.emoji} ${esc(c.name)}</option>`).join('');
}

function selectAllOrders() {
  getOrderCandidates().forEach(a => OrderState.selected.add(a.id));
  renderOrderPage();
}

function clearAllOrders() {
  OrderState.selected.clear();
  renderOrderPage();
}

function buildMailHTML(selectedItems) {
  const intro = (document.getElementById('orderMailIntro')?.value || '')
    .replace(/\\n/g, '<br>').replace(/\n/g, '<br>');
  const from  = document.getElementById('orderMailFrom')?.value || 'Le gestionnaire de stock';
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  const rows = selectedItems.map(({ article: a, qty, comment }) => {
    const status = getStatus(a);
    const badge = status === 'critical'
      ? '<span class="badge-critical">🔴 Critique</span>'
      : '<span class="badge-warning">🟠 Alerte</span>';
    return `<tr>
      <td><strong>${esc(a.name)}</strong></td>
      <td>${esc(a.category)}</td>
      <td style="text-align:center">${a.qty}</td>
      <td style="text-align:center;font-weight:700;color:#2563EB">${qty}</td>
      <td>${esc(comment) || '—'}</td>
    </tr>`;
  }).join('');

  const totalQty = selectedItems.reduce((s, x) => s + x.qty, 0);

  return `
    <div class="mail-header-block">
      <div class="mail-logo">⬡ Stock Eurexo TOURS</div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Article</th>
          <th>Catégorie</th>
          <th style="text-align:center">Stock actuel</th>
          <th style="text-align:center">Qté à commander</th>
          <th>Commentaire</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function getSelectedItems() {
  return [...OrderState.selected].map(id => {
    const a = State.articles.find(x => x.id === id);
    if (!a) return null;
    return {
      article:  a,
      qty:      OrderState.quantities[id] ?? Math.max(a.threshold - a.qty + 1, 1),
      comment:  OrderState.comments[id] ?? '',
    };
  }).filter(Boolean);
}

function previewOrder() {
  const items = getSelectedItems();
  if (!items.length) { toast('warning', 'Aucun article', 'Sélectionnez au moins un article à commander.'); return; }
  document.getElementById('mailPreviewContent').innerHTML = buildMailHTML(items);
  document.getElementById('previewSendBtn').textContent = '📧 Générer le mail mis en forme';
  document.getElementById('previewSendBtn').onclick = sendOrderMail;
  openModal('modalOrderPreview');
}

function sendOrderMail() {
  const items = getSelectedItems();
  if (!items.length) { toast('warning', 'Aucun article', 'Sélectionnez au moins un article.'); return; }

  const to      = document.getElementById('orderMailTo')?.value || '';
  const subject = document.getElementById('orderMailSubject')?.value || 'Demande de réapprovisionnement';

  // Ouvre une fenêtre avec le mail HTML prêt à copier-coller
  const html = buildMailHTML(items);
  const win = window.open('', '_blank', 'width=800,height=700');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Mail de commande</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; background: #f1f5f9; padding: 0; }

      .toolbar {
        position: sticky; top: 0; z-index: 100;
        background: #1e293b; padding: 14px 24px;
        display: flex; align-items: center; justify-content: space-between;
        gap: 12px; flex-wrap: wrap;
      }
      .toolbar-title { color: white; font-weight: 700; font-size: .95rem; }
      .toolbar-sub { color: #94a3b8; font-size: .8rem; margin-top: 2px; }
      .toolbar-actions { display: flex; gap: 10px; flex-wrap: wrap; }

      .btn {
        padding: 9px 18px; border-radius: 7px; border: none; cursor: pointer;
        font-size: .85rem; font-weight: 600; display: inline-flex; align-items: center; gap: 7px;
        text-decoration: none;
      }
      .btn-primary { background: #2563EB; color: white; }
      .btn-primary:hover { background: #1d4ed8; }
      .btn-secondary { background: #334155; color: white; }
      .btn-secondary:hover { background: #475569; }
      .btn-ghost { background: transparent; color: #94a3b8; border: 1px solid #334155; }
      .btn-ghost:hover { background: #334155; color: white; }

      .hint {
        background: #1d4ed8; color: white;
        padding: 10px 24px; font-size: .82rem;
        display: flex; align-items: center; gap: 10px;
      }
      .hint strong { font-weight: 700; }

      .mail-wrap {
        max-width: 760px; margin: 24px auto;
        background: white; border-radius: 10px;
        box-shadow: 0 4px 24px rgba(0,0,0,.12);
        overflow: hidden;
      }
      .mail-meta {
        background: #f8fafc; border-bottom: 1px solid #e2e8f0;
        padding: 14px 24px; display: flex; flex-direction: column; gap: 8px;
      }
      .mail-meta-row { display: flex; gap: 10px; font-size: .875rem; }
      .mail-meta-row span { color: #64748b; min-width: 60px; }
      .mail-meta-row strong { color: #0f172a; }
      .mail-body { padding: 32px; }

      /* Styles mail intégrés */
      .mail-header-block { border-bottom: 3px solid #2563EB; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
      .mail-logo { font-size: 1.3rem; font-weight: 800; color: #2563EB; }
      .mail-date { font-size: .8rem; color: #64748b; }
      h2 { font-size: 1.1rem; margin-bottom: 8px; color: #0f172a; }
      .mail-intro { margin-bottom: 24px; color: #475569; line-height: 1.6; }
      .mail-total-bar { background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; padding: 12px 16px; margin: 16px 0; display: flex; justify-content: space-between; align-items: center; }
      .mail-total-bar strong { color: #1D4ED8; font-size: 1rem; }
      table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: .85rem; }
      table th { background: #2563EB; color: white; padding: 10px 12px; text-align: left; font-weight: 600; font-size: .8rem; }
      table td { padding: 9px 12px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
      table tr:nth-child(even) td { background: #f8fafc; }
      table tr:last-child td { border-bottom: none; }
      .mail-footer { margin-top: 28px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: .8rem; color: #94a3b8; display: flex; justify-content: space-between; }
    </style>
  </head><body>

  <div class="toolbar">
    <div>
      <div class="toolbar-title">📧 Mail prêt à envoyer</div>
      <div class="toolbar-sub">Copie le contenu et colle-le dans ton client mail</div>
    </div>
    <div class="toolbar-actions">
      <a class="btn btn-ghost" href="mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}" target="_blank">
        ✉ Ouvrir client mail (objet pré-rempli)
      </a>
      <button class="btn btn-primary" onclick="copyMail()">📋 Copier le contenu</button>
      <button class="btn btn-secondary" onclick="window.print()">🖨 Imprimer / PDF</button>
    </div>
  </div>

  <div class="hint">
    💡 <span><strong>Comment procéder :</strong> Clique "Ouvrir client mail" pour créer un nouveau mail (objet et destinataire pré-rempli), puis clique "Copier le contenu" et colle-le (<strong>Clique droit > Conserver la mise en forme</strong>) dans le corps du mail.</span>
  </div>

  <div class="mail-wrap">
    <div class="mail-meta">
      <div class="mail-meta-row"><span>À :</span><strong>${to || '(destinataire non renseigné)'}</strong></div>
      <div class="mail-meta-row"><span>Objet :</span><strong>${esc(subject)}</strong></div>
    </div>
    <div class="mail-body" id="mailBody">
      ${html}
    </div>
  </div>

  <script>
    function copyMail() {
      const body = document.getElementById('mailBody');
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(body);
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand('copy');
      sel.removeAllRanges();
      const btn = event.target;
      btn.textContent = '✅ Copié !';
      setTimeout(() => btn.textContent = '📋 Copier le contenu', 2000);
    }
  <\/script>
  </body></html>`);
  win.document.close();
  closeModal('modalOrderPreview');
  toast('success', 'Fenêtre ouverte', 'Copie le contenu et colle-le dans ton mail.');
}

/* ---- PAGE PRÊTS ---- */

function renderLoansPage() {
  const loans  = loadLoans();
  const search = document.getElementById('loanSearch')?.value.toLowerCase() || '';
  const filter = document.getElementById('loanFilterStatus')?.value || '';

  // Stats
  const active   = loans.filter(l => getLoanStatus(l) === 'active').length;
  const late     = loans.filter(l => getLoanStatus(l) === 'late').length;
  const dueSoon  = loans.filter(l => getLoanStatus(l) === 'due-soon').length;
  const returned = loans.filter(l => getLoanStatus(l) === 'returned').length;
  document.getElementById('loanStatTotal').textContent   = active + dueSoon;
  document.getElementById('loanStatLate').textContent    = late;
  document.getElementById('loanStatDueSoon').textContent = dueSoon;
  document.getElementById('loanStatReturned').textContent = returned;
  updateLoanBadge();

  // Filtrage
  let filtered = [...loans].reverse().filter(l => {
    const s = getLoanStatus(l);
    if (filter === 'active'   && s !== 'active' && s !== 'due-soon') return false;
    if (filter === 'late'     && s !== 'late')     return false;
    if (filter === 'returned' && s !== 'returned') return false;
    if (search) {
      const txt = `${l.articleName} ${l.borrower} ${l.note||''}`.toLowerCase();
      if (!txt.includes(search)) return false;
    }
    return true;
  });

  const tbody = document.getElementById('loansBody');
  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">Aucun prêt trouvé</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(l => {
    const s = getLoanStatus(l);
    const statusLabels = { active: '✓ En cours', late: '⚠ En retard', 'due-soon': '⏰ Bientôt', returned: '✓ Rendu' };
    const statusPill = `<span class="loan-status-pill ${s}">${statusLabels[s]}</span>`;

    const today = new Date(); today.setHours(0,0,0,0);
    const end   = new Date(l.dateEnd);
    const diff  = Math.ceil((end - today) / (1000*60*60*24));
    let overdueTxt = '';
    if (s === 'late')     overdueTxt = `<span class="loan-overdue-days">${Math.abs(diff)} jour${Math.abs(diff)>1?'s':''} de retard</span>`;
    if (s === 'due-soon') overdueTxt = `<span class="loan-overdue-days" style="color:var(--orange)">Dans ${diff} jour${diff>1?'s':''}</span>`;

    const returnBtn = !l.returned
      ? `<button class="return-btn" onclick="markReturned(${l.id})">✓ Rendu</button>`
      : `<span style="font-size:.77rem;color:var(--text3)">Rendu le ${fmtDate(l.returnedAt)}</span>`;

    return `<tr>
      <td><strong>${esc(l.articleName)}</strong></td>
      <td>${esc(l.borrower)}</td>
      <td style="font-weight:600">${l.qty}</td>
      <td class="date-cell">${fmtDate(l.dateStart)}</td>
      <td class="date-cell">${fmtDate(l.dateEnd)}${overdueTxt}</td>
      <td>${statusPill}</td>
      <td style="font-size:.82rem;color:var(--text2)">${esc(l.note)||'—'}</td>
      <td>
        <div style="display:flex;gap:6px;align-items:center">
          ${returnBtn}
          <button class="icon-btn danger" title="Supprimer" onclick="deleteLoan(${l.id})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function openAddLoan() {
  document.getElementById('modalLoanTitle').textContent = 'Nouveau prêt';
  document.getElementById('loanId').value = '';
  document.getElementById('loanBorrower').value = '';
  document.getElementById('loanQty').value = 1;
  document.getElementById('loanNote').value = '';
  document.getElementById('loanDateStart').value = new Date().toISOString().split('T')[0];
  document.getElementById('loanDateEnd').value = '';

  // Populate article select
  const sel = document.getElementById('loanArticle');
  sel.innerHTML = '<option value="">Sélectionner un article…</option>' +
    State.articles.map(a => `<option value="${a.id}">${esc(a.name)} (stock: ${a.qty})</option>`).join('');

  openModal('modalLoan');
}

async function saveLoan() {
  const articleId = parseInt(document.getElementById('loanArticle').value);
  const borrower  = document.getElementById('loanBorrower').value.trim();
  const qty       = parseInt(document.getElementById('loanQty').value) || 1;
  const dateStart = document.getElementById('loanDateStart').value;
  const dateEnd   = document.getElementById('loanDateEnd').value;
  const note      = document.getElementById('loanNote').value.trim();

  if (!articleId) { toast('warning', 'Champ requis', 'Sélectionnez un article.'); return; }
  if (!borrower)  { toast('warning', 'Champ requis', 'Le nom de l\'emprunteur est obligatoire.'); return; }
  if (!dateEnd)   { toast('warning', 'Champ requis', 'La date de retour prévue est obligatoire.'); return; }
  if (dateEnd < dateStart) { toast('warning', 'Date invalide', 'La date de retour doit être après le début.'); return; }

  const article = State.articles.find(x => x.id === articleId);
  if (!article) return;
  if (qty > article.qty) {
    toast('warning', 'Stock insuffisant', `Stock disponible : ${article.qty} unité(s).`);
    return;
  }

  const btn = document.getElementById('saveLoanBtn');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Enregistrement…';

  try {
    const created = await API.createLoan({
      borrower, articleName: article.name, articleId,
      qty, dateStart, dateEnd, note,
      returned: false, returnedAt: null,
    });
    LoansCache.unshift(created);

    // Décrémente le stock pendant la durée du prêt
    const newQty = article.qty - qty;
    await API.updateArticle(article.id, { ...article, qty: newQty });
    article.qty = newQty;
    await addMovement({
      articleId: article.id, articleName: article.name,
      type: 'out', qty,
      date: dateStart,
      reason: `Prêt à ${borrower}`,
    });

    closeModal('modalLoan');
    renderAll();
    toast('success', 'Prêt enregistré', `${article.name} prêté à ${borrower} (stock décrémenté)`);
  } catch(e) {
    toast('error', 'Erreur', e.message);
  } finally {
    btn.disabled = false; btn.innerHTML = 'Enregistrer le prêt';
  }
}

async function markReturned(id) {
  const loan = LoansCache.find(l => l.id === id);
  if (!loan) return;

  const btn = event.target;
  btn.disabled = true; btn.textContent = '…';

  try {
    const returnedAt = new Date().toISOString().split('T')[0];
    const updated = await API.updateLoan(id, {
      ...loan,
      returned: true,
      returnedAt,
    });
    const idx = LoansCache.findIndex(l => l.id === id);
    if (idx !== -1) LoansCache[idx] = updated;

    // Recrédite le stock au retour
    const article = State.articles.find(a => a.id === loan.articleId);
    if (article) {
      const newQty = article.qty + loan.qty;
      await API.updateArticle(article.id, { ...article, qty: newQty });
      article.qty = newQty;
      await addMovement({
        articleId: article.id, articleName: article.name,
        type: 'in', qty: loan.qty,
        date: returnedAt,
        reason: `Retour de prêt — ${loan.borrower}`,
      });
    }

    renderAll();
    toast('success', 'Matériel rendu', `${loan.articleName} marqué comme rendu (stock recrédité).`);
  } catch(e) {
    toast('error', 'Erreur', e.message);
    btn.disabled = false; btn.textContent = '✓ Rendu';
  }
}

async function deleteLoan(id) {
  const loan = LoansCache.find(l => l.id === id);
  try {
    await API.deleteLoan(id);
    LoansCache = LoansCache.filter(l => l.id !== id);

    if (loan && !loan.returned) {
      const article = State.articles.find(a => a.id === loan.articleId);
      if (article) {
        const newQty = article.qty + loan.qty;
        await API.updateArticle(article.id, { ...article, qty: newQty });
        article.qty = newQty;
        await addMovement({
          articleId: article.id, articleName: article.name,
          type: 'in', qty: loan.qty,
          date: new Date().toISOString().split('T')[0],
          reason: `Annulation prêt — ${loan.borrower}`,
        });
      }
    }

    renderAll();
    toast('info', 'Prêt supprimé', '');
  } catch(e) {
    toast('error', 'Erreur', e.message);
  }
}

function checkLoanAlerts() {
  const late = loadLoans().filter(l => getLoanStatus(l) === 'late');
  if (late.length) {
    toast('warning',
      `${late.length} prêt${late.length>1?'s':''} en retard`,
      late.slice(0,2).map(l => `${l.articleName} → ${l.borrower}`).join(' · '),
      6000
    );
  }
}

/* ---- EXPORT EXCEL ---- */
function exportToExcel() {
  const articles = getFilteredArticles();
  if (!articles.length) { toast('warning', 'Aucun article', 'Aucun article à exporter.'); return; }

  const statusLabels = { ok: 'Stock OK', warning: 'Alerte', critical: 'Critique' };

  const data = articles.map(a => ({
    'Nom':          a.name,
    'Référence':    a.ref || '',
    'Catégorie':    a.category,
    'Quantité':     a.qty,
    'Seuil alerte': a.threshold,
    'Statut':       statusLabels[getStatus(a)],
    'Emplacement':  a.location || '',
    'Description':  a.description || '',
  }));

  const ws = XLSX.utils.json_to_sheet(data);

  // Largeurs de colonnes
  ws['!cols'] = [
    { wch: 30 }, { wch: 15 }, { wch: 18 },
    { wch: 10 }, { wch: 12 }, { wch: 12 },
    { wch: 18 }, { wch: 35 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inventaire');

  const date = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `inventaire-${date}.xlsx`);
  toast('success', 'Export réussi', `${articles.length} articles exportés.`);
}

/* ---- INIT & EVENT LISTENERS ---- */
document.addEventListener('DOMContentLoaded', () => {
  loadMovements();

  // Navigation
  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.addEventListener('click', () => navigate(el.dataset.page));
  });

  // Sidebar toggle (desktop)
  document.getElementById('sidebarToggle').addEventListener('click', () => {
    const sb = document.getElementById('sidebar');
    const mw = document.getElementById('mainWrapper');
    const isCollapsed = sb.classList.toggle('collapsed');
    mw.classList.toggle('collapsed', isCollapsed);
    localStorage.setItem('stockpro_sidebar', isCollapsed ? 'collapsed' : 'open');
  });

  document.querySelector('.sidebar-header').addEventListener('click', (e) => {
    const sb = document.getElementById('sidebar');
    if (sb.classList.contains('collapsed') && !e.target.closest('.sidebar-toggle')) {
      sb.classList.remove('collapsed');
      document.getElementById('mainWrapper').classList.remove('collapsed');
      localStorage.setItem('stockpro_sidebar', 'open');
    }
  });

  // Restaure l'état de la sidebar au chargement
  if (localStorage.getItem('stockpro_sidebar') === 'collapsed') {
    document.getElementById('sidebar').classList.add('collapsed');
    document.getElementById('mainWrapper').classList.add('collapsed');
  }

  // Mobile hamburger
  const mobileBtn = document.createElement('button');
  mobileBtn.className = 'mobile-menu-btn';
  mobileBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
  document.querySelector('.topbar-left').prepend(mobileBtn);
  const overlay = document.createElement('div');
  overlay.className = 'mobile-overlay';
  document.body.appendChild(overlay);
  mobileBtn.addEventListener('click', () => {
    document.getElementById('sidebar').classList.add('mobile-open');
    overlay.classList.add('active');
  });
  overlay.addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('mobile-open');
    overlay.classList.remove('active');
  });

  // Add article button
  document.getElementById('addArticleBtn').addEventListener('click', openAddArticle);
  document.getElementById('saveArticleBtn').addEventListener('click', saveArticle);

  // Movement buttons
  document.getElementById('addMovementBtn').addEventListener('click', () => openAddMovement('in'));
  document.getElementById('saveMovementBtn').addEventListener('click', saveMovement);
  document.getElementById('typeIn').addEventListener('click', () => { resetMovType('in'); updateMovPreview(); if (typeof updateMultiMovPreview === 'function') updateMultiMovPreview(); });
  document.getElementById('typeOut').addEventListener('click', () => { resetMovType('out'); updateMovPreview(); if (typeof updateMultiMovPreview === 'function') updateMultiMovPreview(); });
  document.getElementById('toggleMultiMov').addEventListener('click', toggleMultiMode);
  document.getElementById('addMultiMovRowBtn').addEventListener('click', addMultiMovRow);

  function updateMovPreview() {
    const id = parseInt(document.getElementById('movArticle').value);
    const qty = parseInt(document.getElementById('movQty').value) || 0;
    const a = State.articles.find(x => x.id === id);
    if (a && qty) updateStockPreview(a, qty, State.movType);
  }
  document.getElementById('movArticle').addEventListener('change', updateMovPreview);
  document.getElementById('movQty').addEventListener('input', updateMovPreview);

  // Category buttons
  document.getElementById('addCategoryBtn').addEventListener('click', openAddCategory);
  document.getElementById('saveCategoryBtn').addEventListener('click', saveCategory);
  document.getElementById('addArticleBtn').addEventListener('click', openAddArticle);

  // Color picker
  document.getElementById('colorPicker').addEventListener('click', e => {
    const swatch = e.target.closest('.color-swatch');
    if (swatch) selectColor(swatch.dataset.color);
  });
  // Emoji picker
  document.getElementById('emojiPicker').addEventListener('click', e => {
    const btn = e.target.closest('.emoji-btn');
    if (btn) selectEmoji(btn.dataset.emoji);
  });

  // Image upload
  const zone = document.getElementById('imageUploadZone');
  const fileInput = document.getElementById('imageFile');
  zone.addEventListener('click', e => { if (!e.target.closest('.remove-image')) fileInput.click(); });
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.style.borderColor = 'var(--accent)'; });
  zone.addEventListener('dragleave', () => { zone.style.borderColor = ''; });
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.style.borderColor = '';
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handleImageFile(file);
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) handleImageFile(fileInput.files[0]);
  });
  document.getElementById('removeImage').addEventListener('click', e => { e.stopPropagation(); clearImagePreview(); });

  function handleImageFile(file) {
    if (file.size > 5 * 1024 * 1024) { toast('warning', 'Image trop lourde', 'Maximum 5 Mo.'); return; }
    const reader = new FileReader();
    reader.onload = e => showImagePreview(e.target.result);
    reader.readAsDataURL(file);
  }

  // Filters — Stock
  document.getElementById('exportExcelBtn').addEventListener('click', exportToExcel);
  document.getElementById('filterCategory').addEventListener('change', e => { State.filters.stock.category = e.target.value; renderArticles(); });
  document.getElementById('filterStatus').addEventListener('change', e => { State.filters.stock.status = e.target.value; renderArticles(); });
  document.getElementById('stockSearch').addEventListener('input', e => { State.filters.stock.search = e.target.value; renderArticles(); });

  // Global search
  document.getElementById('globalSearch').addEventListener('input', e => {
    State.filters.stock.search = e.target.value;
    if (e.target.value) navigate('stock');
    renderArticles();
  });

  // Filters — Movements
  document.getElementById('filterMovType').addEventListener('change', e => { State.filters.movement.type = e.target.value; renderMovementsTable(); });
  document.getElementById('filterMovArticle').addEventListener('change', e => { State.filters.movement.article = e.target.value; renderMovementsTable(); });
  document.getElementById('filterMovDate').addEventListener('change', e => { State.filters.movement.date = e.target.value; renderMovementsTable(); });

  // View toggle
  document.getElementById('viewGrid').addEventListener('click', () => { State.viewMode = 'grid'; document.getElementById('viewGrid').classList.add('active'); document.getElementById('viewList').classList.remove('active'); renderArticles(); });
  document.getElementById('viewList').addEventListener('click', () => { State.viewMode = 'list'; document.getElementById('viewList').classList.add('active'); document.getElementById('viewGrid').classList.remove('active'); renderArticles(); });

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
      // Fermeture modale uniquement via bouton Annuler / X
      // (clic dans le vide désactivé pour éviter les fermetures accidentelles)
  });

  // Load data
  // Commandes
  document.getElementById('orderSelectAll').addEventListener('click', selectAllOrders);
  document.getElementById('orderClearAll').addEventListener('click', clearAllOrders);
  document.getElementById('orderPreviewBtn').addEventListener('click', previewOrder);
  document.getElementById('orderSendBtn').addEventListener('click', () => {
    const items = getSelectedItems();
    if (!items.length) { toast('warning', 'Aucun article', 'Sélectionnez au moins un article.'); return; }
    sendOrderMail();
  });
  document.getElementById('orderFilterCat').addEventListener('change', renderOrderPage);
  document.getElementById('orderFilterStatus').addEventListener('change', renderOrderPage);
  document.getElementById('orderCheckAll').addEventListener('change', e => {
    if (e.target.checked) selectAllOrders(); else clearAllOrders();
  });
  // Prêts
  document.getElementById('addLoanBtn').addEventListener('click', openAddLoan);
  document.getElementById('saveLoanBtn').addEventListener('click', saveLoan);
  document.getElementById('loanFilterStatus').addEventListener('change', renderLoansPage);
  document.getElementById('loanSearch').addEventListener('input', renderLoansPage);

  // Gestion Déléguée
  document.getElementById('addDelegatedBtn').addEventListener('click', openAddDelegated);
  document.getElementById('saveDelegatedBtn').addEventListener('click', saveDelegated);
  document.getElementById('delegatedSearch').addEventListener('input', renderDelegatedPage);
  document.getElementById('teamTabs').addEventListener('click', e => {
    const tab = e.target.closest('.team-tab');
    if (tab) switchTeam(tab.dataset.team);
  });
  document.getElementById('antitheftToggle').addEventListener('click', e => {
    const btn = e.target.closest('.antitheft-btn');
    if (btn) setAntitheft(btn.dataset.val);
  });
  document.getElementById('filtreConfToggle').addEventListener('click', e => {
    const btn = e.target.closest('.filtreconf-btn');
    if (btn) setFiltreConf(btn.dataset.val);
  });
  document.getElementById('addScreenBtn').addEventListener('click', () => addScreenRow());

  // Dark mode
  initDarkMode();
  document.getElementById('darkToggle').addEventListener('click', toggleDarkMode);

  // Raccourcis clavier
  document.addEventListener('keydown', e => {
  // Ignore si on est dans un champ de saisie ou si une modale est ouverte
  const tag = document.activeElement.tagName;
  const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  const modalOpen = document.querySelector('.modal-overlay.open');

  if (!inInput && !modalOpen) {
    switch(e.key.toLowerCase()) {
      case 'n': openAddArticle(); break;
      case 'm': openAddMovement('in'); break;
      case 'd': navigate('dashboard'); break;
      case 'i': navigate('stock'); break;
      case 'a': navigate('alerts'); break;
      case 'c': navigate('categories'); break;
      case 'o': navigate('orders'); break;
      case 'l': navigate('loans'); break;
      case '?': openModal('modalShortcuts'); break;
    }
  }
  // Ctrl+K — toujours actif
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    document.getElementById('globalSearch').focus();
  }
  // Échap — ferme les modales
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  }
});

checkLoanAlerts();

const savedPage = localStorage.getItem('stockpro_page');
if (savedPage && savedPage !== 'dashboard') navigate(savedPage);
     
// Load data
loadData();

  function checkUrlArticle() {
  const params = new URLSearchParams(window.location.search);
  const articleId = parseInt(params.get('article'));
  if (!articleId) return;
  // Attend que les données soient chargées puis ouvre la fiche
  const tries = setInterval(() => {
    const a = State.articles.find(x => x.id === articleId);
    if (a) {
      clearInterval(tries);
      showDetail(articleId);
      // Nettoie l'URL sans recharger la page
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, 200);
  // Abandon après 10 secondes
  setTimeout(() => clearInterval(tries), 10000);
}

checkUrlArticle();

});
