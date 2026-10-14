/**
 * The Athenaeum Library Management System
 * Vanilla JavaScript Frontend Architecture
 * NCERT & UP Board (LKG to 12th), Reading Desk Token System, Audio Synthesis & Barcodes
 */

'use strict';

// ----------------------------------------------------------------------------
// 1. Application State
// ----------------------------------------------------------------------------
const AppState = {
  auth: {
    authenticated: false,
    username: null
  },
  currentTab: 'home',
  catalogue: {
    books: [],
    categories: [],
    classes: [],
    subjects: [],
    activeCategory: 'All',
    activeClass: 'All',
    activeBoard: 'All',
    activeSubject: 'All',
    searchQuery: '',
    availability: 'all',
    sort: 'class',
    viewMode: 'shelf' // 'shelf' | 'card'
  },
  tokens: {
    list: [],
    filter: 'active',
    occupiedDesks: []
  },
  stats: null,
  students: [],
  issues: [],
  activeIssueFilter: 'all',
  theme: localStorage.getItem('ansh_vansh_theme') || 'day',
  soundEnabled: true
};

// ----------------------------------------------------------------------------
// 2. Audio Effects Synthesis (Pure Web Audio API - Zero External Files)
// ----------------------------------------------------------------------------
const LibraryAudio = {
  ctx: null,

  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
  },

  playStamp() {
    if (!AppState.soundEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(130, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.12);

      gain.gain.setValueAtTime(0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);

      // Noise burst for paper impact slap
      const bufferSize = this.ctx.sampleRate * 0.06;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.setValueAtTime(800, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.4, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start(now);
    } catch (e) {
      // Audio silent fallback
    }
  },

  playBookSlide() {
    if (!AppState.soundEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.1);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {
      // Audio silent fallback
    }
  }
};

// ----------------------------------------------------------------------------
// 3. API Communication Helpers
// ----------------------------------------------------------------------------
async function apiCall(action, params = {}, options = {}) {
  const url = new URL('api.php', window.location.href);
  url.searchParams.set('action', action);

  if (options.method !== 'POST') {
    Object.keys(params).forEach(k => {
      if (params[k] !== undefined && params[k] !== null) {
        url.searchParams.set(k, params[k]);
      }
    });
  }

  const fetchOptions = {
    headers: { 'Accept': 'application/json' },
    ...options
  };

  if (options.method === 'POST') {
    fetchOptions.headers['Content-Type'] = 'application/json';
    fetchOptions.body = JSON.stringify(params);
  }

  try {
    const res = await fetch(url.toString(), fetchOptions);
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('API Error:', err);
    return {
      success: false,
      error: 'Communication with library server failed: ' + err.message
    };
  }
}

// ----------------------------------------------------------------------------
// 4. Utility Functions (XSS Sanitization, Dates, Barcodes)
// ----------------------------------------------------------------------------
function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function generateBarcodeSVG(codeText) {
  const code = (codeText || 'LIB-2024-000').toUpperCase();
  let bars = '';
  let x = 10;
  const barHeight = 40;

  bars += `<rect x="${x}" y="0" width="2" height="${barHeight}" fill="#1a1410"/>`;
  x += 4;

  for (let i = 0; i < code.length; i++) {
    const charCode = code.charCodeAt(i);
    const pattern = [
      (charCode % 2 === 0 ? 3 : 1),
      (charCode % 3 === 0 ? 2 : 1),
      (charCode % 5 === 0 ? 3 : 2),
      2
    ];
    for (let p = 0; p < pattern.length; p++) {
      const width = pattern[p];
      if (p % 2 === 0) {
        bars += `<rect x="${x}" y="0" width="${width}" height="${barHeight}" fill="#1a1410"/>`;
      }
      x += width + 1;
    }
    x += 1;
  }

  bars += `<rect x="${x}" y="0" width="3" height="${barHeight}" fill="#1a1410"/>`;
  x += 5;
  bars += `<rect x="${x}" y="0" width="2" height="${barHeight}" fill="#1a1410"/>`;
  x += 10;

  return `<svg class="barcode-svg" viewBox="0 0 ${x} ${barHeight}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">${bars}</svg>`;
}

function getCallNumber(book) {
  const cls = (book.class_grade || '').replace(/\s+/g, '').toUpperCase();
  const sub = (book.subject || 'GEN').substring(0, 3).toUpperCase();
  return `${cls} • ${sub}-${book.id}`;
}

function getSpineTheme(id) {
  const themes = [
    { class: 'spine-crimson', h: 195, w: 46 },
    { class: 'spine-navy',    h: 205, w: 42 },
    { class: 'spine-forest',  h: 185, w: 48 },
    { class: 'spine-amber',   h: 190, w: 44 },
    { class: 'spine-cognac',  h: 210, w: 52 },
    { class: 'spine-plum',    h: 180, w: 45 },
    { class: 'spine-teal',    h: 195, w: 42 },
    { class: 'spine-charcoal',h: 200, w: 50 }
  ];
  return themes[id % themes.length];
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span style="font-size: 1.2rem;">${type === 'success' ? '📜' : '⚠️'}</span>
    <div>${escapeHTML(message)}</div>
  `;

  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 4200);
}

// ----------------------------------------------------------------------------
// 5. Navigation & Theme Controller
// ----------------------------------------------------------------------------
function initNavigation() {
  const links = document.querySelectorAll('.nav-link');
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = link.getAttribute('data-tab');
      navigateToTab(target);
    });
  });

  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '') || 'home';
    navigateToTab(hash, false);
  });

  // Guard against any accidental horizontal window displacement
  window.addEventListener('scroll', () => {
    if (window.scrollX !== 0) {
      window.scrollTo(0, window.scrollY);
    }
  });

  const lampBtn = document.getElementById('lamp-toggle');
  if (lampBtn) {
    lampBtn.addEventListener('click', () => {
      AppState.theme = AppState.theme === 'day' ? 'night' : 'day';
      applyTheme();
    });
  }

  const soundBtn = document.getElementById('sound-toggle');
  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      AppState.soundEnabled = !AppState.soundEnabled;
      soundBtn.setAttribute('title', AppState.soundEnabled ? 'Library Sounds: Enabled' : 'Library Sounds: Muted');
      soundBtn.innerHTML = AppState.soundEnabled 
        ? '<span class="btn-icon">🔔</span> <span class="btn-text">Sound</span>' 
        : '<span class="btn-icon">🔕</span> <span class="btn-text">Muted</span>';
      showToast(AppState.soundEnabled ? 'Library acoustics active.' : 'Library silence requested.', 'success');
    });
  }
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', AppState.theme);
  localStorage.setItem('ansh_vansh_theme', AppState.theme);
  const lampBtn = document.getElementById('lamp-toggle');
  if (lampBtn) {
    lampBtn.innerHTML = AppState.theme === 'night' 
      ? '<span class="lamp-icon">🟢</span> <span class="btn-text">Lamp On</span>' 
      : '<span class="lamp-icon">💡</span> <span class="btn-text">Lamp</span>';
  }
}

function navigateToTab(tabName, updateHash = true) {
  const validTabs = ['home', 'catalogue', 'tokens', 'members', 'circulation', 'dashboard'];
  if (!validTabs.includes(tabName)) tabName = 'home';

  AppState.currentTab = tabName;
  if (updateHash) {
    window.location.hash = '#' + tabName;
  }

  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('data-tab') === tabName) {
      link.classList.add('active');
      // Only scroll the navigation bar itself on mobile devices where the ribbon overflows
      try {
        const navBar = document.querySelector('.library-nav');
        if (navBar && navBar.scrollWidth > navBar.clientWidth) {
          const linkRect = link.getBoundingClientRect();
          const navRect = navBar.getBoundingClientRect();
          const scrollOffset = (linkRect.left - navRect.left) - (navRect.width / 2) + (linkRect.width / 2);
          navBar.scrollBy({ left: scrollOffset, behavior: 'smooth' });
        }
      } catch (err) {}
    } else {
      link.classList.remove('active');
    }
  });

  // Ensure window horizontal scroll is always strictly zero
  window.scrollTo(0, window.scrollY);
  if (document.documentElement.scrollLeft !== 0) document.documentElement.scrollLeft = 0;
  if (document.body.scrollLeft !== 0) document.body.scrollLeft = 0;

  document.querySelectorAll('.tab-section').forEach(sec => {
    if (sec.id === `section-${tabName}`) {
      sec.style.display = 'block';
    } else {
      sec.style.display = 'none';
    }
  });

  if (tabName === 'home') renderHomePage();
  else if (tabName === 'catalogue') loadCatalogue();
  else if (tabName === 'tokens') loadReadingTokens();
  else if (tabName === 'members') loadMembers();
  else if (tabName === 'circulation') loadCirculation();
  else if (tabName === 'dashboard') loadDashboard();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ----------------------------------------------------------------------------
// 6. Authentication Handling
// ----------------------------------------------------------------------------
async function checkAuth() {
  const data = await apiCall('check_auth');
  if (data && data.success) {
    AppState.auth.authenticated = data.authenticated;
    AppState.auth.username = data.username;
    updateAuthUI();
  }
}

function updateAuthUI() {
  const deskContainer = document.getElementById('librarian-desk-container');
  const adminOnlyElements = document.querySelectorAll('.admin-only');

  if (AppState.auth.authenticated) {
    deskContainer.innerHTML = `
      <div class="librarian-badge">
        <span>📖 Chief Librarian: <strong>${escapeHTML(AppState.auth.username)}</strong></span>
        <button id="logout-btn" class="logout-btn" title="Sign out of librarian desk">Log Out</button>
      </div>
    `;
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    adminOnlyElements.forEach(el => el.style.display = el.getAttribute('data-display') || 'inline-flex');
  } else {
    deskContainer.innerHTML = `
      <button id="login-modal-open-btn" class="librarian-desk-btn">
        <span>🗝️</span> Librarian Desk
      </button>
    `;
    const openBtn = document.getElementById('login-modal-open-btn');
    if (openBtn) openBtn.addEventListener('click', () => openModal('login-modal'));
    adminOnlyElements.forEach(el => el.style.display = 'none');
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const form = e.target;
  const username = form.username.value.trim();
  const password = form.password.value.trim();

  if (!username || !password) {
    showToast('Please enter both librarian username and password.', 'error');
    return;
  }

  const res = await apiCall('login', { username, password }, { method: 'POST' });
  if (res.success) {
    AppState.auth.authenticated = true;
    AppState.auth.username = res.username;
    updateAuthUI();
    closeModal('login-modal');
    showToast(res.message, 'success');
    LibraryAudio.playStamp();
    navigateToTab(AppState.currentTab, false);
  } else {
    showToast(res.error, 'error');
  }
}

async function handleLogout() {
  const res = await apiCall('logout', {}, { method: 'POST' });
  if (res.success) {
    AppState.auth.authenticated = false;
    AppState.auth.username = null;
    updateAuthUI();
    showToast(res.message, 'success');
    navigateToTab(AppState.currentTab, false);
  }
}

// ----------------------------------------------------------------------------
// 7. Home Page View (Grand Bookshelf, Live Stats & Curriculum Spines)
// ----------------------------------------------------------------------------
async function renderHomePage() {
  const res = await apiCall('stats');
  if (!res.success) return;

  AppState.stats = res;
  const summary = res.summary;

  document.getElementById('stat-total-books').textContent = summary.total_titles || '0';
  document.getElementById('stat-total-copies').textContent = summary.total_copies || '0';
  document.getElementById('stat-members').textContent = summary.total_students || '0';
  document.getElementById('stat-on-loan').textContent = summary.total_issued || '0';
  document.getElementById('stat-overdue').textContent = summary.total_overdue || '0';
  
  const tokenStatEl = document.getElementById('stat-active-tokens');
  if (tokenStatEl) tokenStatEl.textContent = summary.active_tokens || '0';

  // Helper to create realistic book spine with ribbons and embossed badges
  function createSpineElement(book) {
    const theme = getSpineTheme(book.id);
    const spine = document.createElement('div');
    spine.className = `book-spine ${theme.class}`;
    spine.style.setProperty('--spine-h', `${theme.h}px`);
    spine.style.setProperty('--spine-w', `${theme.w}px`);
    spine.setAttribute('tabindex', '0');
    spine.setAttribute('role', 'button');
    spine.setAttribute('aria-label', `${book.title} (${book.class_grade})`);

    // Silk bookmark ribbon dangling on select volumes
    const hasRibbon = (book.id % 2 === 0);
    const ribbonHtml = hasRibbon ? `<div class="spine-ribbon" aria-hidden="true"></div>` : '';

    const boardShort = (book.board || 'NCERT').replace(' / UP Board', '').replace(' / UPMSP', '').replace('General Reference', 'REF');

    spine.innerHTML = `
      ${ribbonHtml}
      <div class="spine-top-badge">${escapeHTML(book.class_grade || 'CL')}</div>
      <div class="spine-title">${escapeHTML(book.title)}</div>
      <div class="spine-bottom-tag">${escapeHTML(boardShort)}</div>
    `;

    spine.addEventListener('click', () => {
      LibraryAudio.playBookSlide();
      openBookDetails(book.id);
    });

    spine.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        LibraryAudio.playBookSlide();
        openBookDetails(book.id);
      }
    });

    return spine;
  }

  // Populate Upper Tier (Balvatika & Primary LKG to 5th)
  const shelfRow1 = document.getElementById('hero-bookshelf-row-1');
  if (shelfRow1) {
    shelfRow1.innerHTML = '';
    const primaryBooks = (res.shelf_primary && res.shelf_primary.length > 0) ? res.shelf_primary : res.new_arrivals;
    primaryBooks.forEach(b => shelfRow1.appendChild(createSpineElement(b)));
  }

  // Populate Lower Tier (Middle, Secondary & Senior 6th to 12th)
  const shelfRow2 = document.getElementById('hero-bookshelf-row-2');
  if (shelfRow2) {
    shelfRow2.innerHTML = '';
    const secondaryBooks = (res.shelf_secondary && res.shelf_secondary.length > 0) ? res.shelf_secondary : res.top_books;
    secondaryBooks.forEach(b => shelfRow2.appendChild(createSpineElement(b)));
  }

  // Bind Shelf Filter Buttons (Complete, Primary, Secondary)
  document.querySelectorAll('.shelf-filter-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.shelf-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const targetShelf = btn.getAttribute('data-shelf');
      const tier1 = document.getElementById('shelf-tier-1');
      const tier2 = document.getElementById('shelf-tier-2');
      if (!tier1 || !tier2) return;

      if (targetShelf === 'tier1') {
        tier1.style.display = 'block';
        tier2.style.display = 'none';
      } else if (targetShelf === 'tier2') {
        tier1.style.display = 'none';
        tier2.style.display = 'block';
      } else {
        tier1.style.display = 'block';
        tier2.style.display = 'block';
      }
    };
  });

  // New Arrivals Shelf
  const arrivalsGrid = document.getElementById('home-new-arrivals-grid');
  if (arrivalsGrid) {
    arrivalsGrid.innerHTML = '';
    res.new_arrivals.slice(0, 4).forEach(book => {
      arrivalsGrid.appendChild(createShelfBookCard(book));
    });
  }

  // Most Consulted Textbooks
  const mostBorrowedList = document.getElementById('home-most-borrowed-list');
  if (mostBorrowedList) {
    mostBorrowedList.innerHTML = '';
    const maxBorrows = Math.max(1, ...(res.top_books.map(b => parseInt(b.borrow_count) || 1)));
    res.top_books.slice(0, 5).forEach((book, idx) => {
      const count = parseInt(book.borrow_count) || 0;
      const pct = Math.round((count / maxBorrows) * 100);
      const item = document.createElement('div');
      item.className = 'podium-item';
      item.innerHTML = `
        <div class="podium-rank">${idx + 1}</div>
        <div class="podium-details">
          <div class="podium-title" title="${escapeHTML(book.title)}">${escapeHTML(book.title)}</div>
          <div class="podium-author">${escapeHTML(book.class_grade)} • ${escapeHTML(book.board)} • <em>${escapeHTML(book.shelf_no)}</em></div>
          <div class="podium-meter"><div class="podium-fill" style="width: ${pct}%"></div></div>
        </div>
        <div class="podium-count">${count} loans</div>
      `;
      item.addEventListener('click', () => openBookDetails(book.id));
      mostBorrowedList.appendChild(item);
    });
  }
}

// ----------------------------------------------------------------------------
// 8. Books Catalogue View (NCERT & UP Board Filters LKG to 12th)
// ----------------------------------------------------------------------------
async function loadCatalogue() {
  const params = {
    search: AppState.catalogue.searchQuery,
    category: AppState.catalogue.activeCategory,
    class_grade: AppState.catalogue.activeClass,
    board: AppState.catalogue.activeBoard,
    subject: AppState.catalogue.activeSubject,
    availability: AppState.catalogue.availability,
    sort: AppState.catalogue.sort
  };

  const res = await apiCall('books', params);
  if (!res.success) return;

  AppState.catalogue.books = res.books;
  AppState.catalogue.categories = res.categories;
  AppState.catalogue.classes = res.classes;
  AppState.catalogue.subjects = res.subjects;

  renderCategoryPills(res.categories);
  renderCatalogueGrid(res.books);
}

function renderCategoryPills(categories) {
  const container = document.getElementById('catalogue-category-pills');
  if (!container) return;

  container.innerHTML = '';
  const allPill = document.createElement('button');
  allPill.className = `filter-pill ${AppState.catalogue.activeCategory === 'All' ? 'active' : ''}`;
  allPill.textContent = 'All Categories';
  allPill.addEventListener('click', () => {
    AppState.catalogue.activeCategory = 'All';
    loadCatalogue();
  });
  container.appendChild(allPill);

  categories.forEach(cat => {
    const pill = document.createElement('button');
    pill.className = `filter-pill ${AppState.catalogue.activeCategory === cat ? 'active' : ''}`;
    pill.textContent = cat;
    pill.addEventListener('click', () => {
      AppState.catalogue.activeCategory = cat;
      loadCatalogue();
    });
    container.appendChild(pill);
  });
}

function renderCatalogueGrid(books) {
  const container = document.getElementById('catalogue-results-container');
  if (!container) return;

  container.innerHTML = '';

  if (books.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🗄️</div>
        <h3 class="empty-state-title">कोई पाठ्यपुस्तक नहीं मिली (No Textbooks Found)</h3>
        <p class="empty-state-text">आपके द्वारा चुने गए वर्ग (Class/Board/Subject) में कोई पुस्तक प्राप्त नहीं हुई। कृपया फ़िल्टर बदल कर पुनः खोजें।</p>
      </div>
    `;
    return;
  }

  if (AppState.catalogue.viewMode === 'shelf') {
    const grid = document.createElement('div');
    grid.className = 'shelf-books-grid';
    books.forEach(b => grid.appendChild(createShelfBookCard(b)));
    container.appendChild(grid);
  } else {
    const grid = document.createElement('div');
    grid.className = 'card-catalogue-grid';
    books.forEach(b => grid.appendChild(createIndexCard(b)));
    container.appendChild(grid);
  }
}

// Create Hardcover Book Card on Shelf with Token & Read Actions
function createShelfBookCard(book) {
  const card = document.createElement('div');
  card.className = 'book-card-shelf';

  const inStock = parseInt(book.available) > 0;
  const availText = inStock ? `Available ${book.available}/${book.quantity}` : 'Checked Out';
  const availClass = inStock ? 'in-stock' : 'out-of-stock';

  const isNcert = (book.board || '').includes('NCERT');
  const isUpBoard = (book.board || '').includes('UP');

  card.innerHTML = `
    <div class="book-cover-wrap">
      <span class="avail-badge ${availClass}">${availText}</span>
      ${book.cover_url ? `
        <img src="${escapeHTML(book.cover_url)}" alt="${escapeHTML(book.title)}" class="book-cover-img" loading="lazy" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'book-jacket-fallback\\'><div class=\\'fallback-title\\'>${escapeHTML(book.title)}</div><div class=\\'fallback-author\\'>${escapeHTML(book.board || book.author)}</div></div>';">
      ` : `
        <div class="book-jacket-fallback">
          <div class="fallback-title">${escapeHTML(book.title)}</div>
          <div class="fallback-author">${escapeHTML(book.board || book.author)}</div>
        </div>
      `}
    </div>
    <div class="book-card-body">
      <div style="display:flex; gap:0.35rem; margin-bottom:0.4rem; flex-wrap:wrap;">
        <span class="badge-curriculum badge-class">${escapeHTML(book.class_grade || 'All')}</span>
        ${isNcert ? '<span class="badge-curriculum badge-ncert">NCERT</span>' : ''}
        ${isUpBoard ? '<span class="badge-curriculum badge-upboard">UP Board</span>' : ''}
      </div>
      <h3 class="book-card-title">${escapeHTML(book.title)}</h3>
      <div class="book-card-author">${escapeHTML(book.subject || book.category)} • <em>${escapeHTML(book.author)}</em></div>
      <span class="book-card-shelf-no">📍 ${escapeHTML(book.shelf_no)}</span>
      
      <div class="book-card-actions" style="margin-top:auto; display:flex; gap:0.5rem; flex-wrap:wrap;">
        <button class="btn-library btn-primary" style="flex:1" data-action="details">Inspect</button>
        <button class="btn-library btn-gold" data-action="quick-token" title="Issue Reading Desk Token for In-Library Study">🎫 Token</button>
      </div>
    </div>
  `;

  card.querySelector('[data-action="details"]').addEventListener('click', () => {
    LibraryAudio.playBookSlide();
    openBookDetails(book.id);
  });

  card.querySelector('[data-action="quick-token"]').addEventListener('click', (e) => {
    e.stopPropagation();
    navigateToTab('tokens');
    setTimeout(() => {
      const select = document.getElementById('token-book-select');
      if (select) select.value = book.id;
    }, 200);
  });

  return card;
}

// Create Vintage Index Card for Card Catalogue View
function createIndexCard(book) {
  const card = document.createElement('div');
  card.className = 'catalogue-index-card';

  const inStock = parseInt(book.available) > 0;
  const callNum = getCallNumber(book);

  card.innerHTML = `
    <div class="card-call-number">${callNum}</div>
    <div class="card-typewriter-title">${escapeHTML(book.title)}</div>
    <div class="card-typewriter-author">Board / Author: ${escapeHTML(book.board)} (${escapeHTML(book.author)})</div>
    <table class="card-details-table">
      <tr><td class="key">CLASS:</td><td class="val">${escapeHTML(book.class_grade)}</td></tr>
      <tr><td class="key">SUBJECT:</td><td class="val">${escapeHTML(book.subject)}</td></tr>
      <tr><td class="key">MEDIUM:</td><td class="val">${escapeHTML(book.medium || 'Hindi')}</td></tr>
      <tr><td class="key">LOCATION:</td><td class="val">${escapeHTML(book.shelf_no)}</td></tr>
      <tr><td class="key">HOLDINGS:</td><td class="val">${book.available} avail. of ${book.quantity} copies</td></tr>
    </table>
    <div class="card-rubber-stamp ${inStock ? '' : 'out'}">
      ${inStock ? '★ ON SHELF ★' : '● ON LOAN / IN READING HALL ●'}
    </div>
    <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
      <button class="btn-library btn-secondary" style="font-size:0.75rem; padding: 0.35rem 0.7rem;" data-action="inspect">View Ledger</button>
      <button class="btn-library btn-gold" style="font-size:0.75rem; padding: 0.35rem 0.7rem;" data-action="token">🎫 Take Token</button>
    </div>
  `;

  card.querySelector('[data-action="inspect"]').addEventListener('click', () => {
    LibraryAudio.playBookSlide();
    openBookDetails(book.id);
  });

  card.querySelector('[data-action="token"]').addEventListener('click', () => {
    navigateToTab('tokens');
    setTimeout(() => {
      const select = document.getElementById('token-book-select');
      if (select) select.value = book.id;
    }, 200);
  });

  return card;
}

// ----------------------------------------------------------------------------
// 9. Book Details Modal & Digital Reader Launcher
// ----------------------------------------------------------------------------
async function openBookDetails(bookId) {
  const res = await apiCall('book_details', { id: bookId });
  if (!res.success) {
    showToast(res.error, 'error');
    return;
  }

  const { book, borrowers, reservations, active_tokens } = res;
  const inStock = parseInt(book.available) > 0;

  const content = document.getElementById('book-details-content');
  content.innerHTML = `
    <div style="display: flex; gap: 1.5rem; flex-wrap: wrap;">
      <div style="width: 170px; flex-shrink: 0;">
        ${book.cover_url ? `
          <img src="${escapeHTML(book.cover_url)}" alt="${escapeHTML(book.title)}" style="width:100%; border-radius:4px; box-shadow: var(--shadow-book);">
        ` : `
          <div class="book-jacket-fallback" style="height: 220px; border-radius: 4px;">
            <div class="fallback-title">${escapeHTML(book.title)}</div>
            <div class="fallback-author">${escapeHTML(book.board || book.author)}</div>
          </div>
        `}
        <div style="margin-top: 0.8rem; text-align: center;">
          <span class="avail-badge ${inStock ? 'in-stock' : 'out-of-stock'}">
            ${inStock ? `Available ${book.available}/${book.quantity}` : 'Checked Out'}
          </span>
        </div>
      </div>
      <div style="flex: 1; min-width: 260px;">
        <div style="display: flex; gap: 0.4rem; margin-bottom: 0.4rem; flex-wrap: wrap;">
          <span class="badge-curriculum badge-class">${escapeHTML(book.class_grade)}</span>
          <span class="badge-curriculum badge-ncert">${escapeHTML(book.board)}</span>
          <span class="badge-curriculum" style="background:#4a2e1d; color:#fff;">${escapeHTML(book.medium)} Medium</span>
        </div>
        <h2 style="font-size: 1.6rem; margin-bottom: 0.3rem;">${escapeHTML(book.title)}</h2>
        <div style="font-size: 1.05rem; font-style: italic; color: var(--ink-secondary); margin-bottom: 1rem;">
          Subject: ${escapeHTML(book.subject)} • Author: ${escapeHTML(book.author)}
        </div>

        ${book.description ? `
          <div style="background:var(--parchment-base); padding:0.8rem 1rem; border-radius:4px; border:1px solid var(--paper-edge); font-size:0.86rem; margin-bottom:1rem; line-height:1.6;">
            <strong>पाठ्यक्रम एवं विवरण:</strong> ${escapeHTML(book.description)}
          </div>
        ` : ''}

        <table class="card-details-table" style="font-size: 0.88rem;">
          <tr><td class="key">ISBN CODE:</td><td class="val">${escapeHTML(book.isbn)}</td></tr>
          <tr><td class="key">SHELF NO:</td><td class="val"><strong>${escapeHTML(book.shelf_no)}</strong></td></tr>
          <tr><td class="key">TOTAL HOLDINGS:</td><td class="val">${book.quantity} copies</td></tr>
          <tr><td class="key">CIRCULATION:</td><td class="val">${book.quantity - book.available} on loan</td></tr>
        </table>

        <div style="display: flex; gap: 0.6rem; margin-top: 1.2rem; flex-wrap: wrap;">
          <button id="book-take-token-btn" class="btn-library btn-primary" style="background:linear-gradient(180deg,#d35400,#a04000);">
            🎫 Issue Reading Desk Token (वाचनालय में पढ़ें)
          </button>
          <button id="book-open-reader-btn" class="btn-library btn-gold">
            📖 Open e-Reading Stacks (ई-वाचनालय)
          </button>
          ${!inStock ? `
            <button id="book-reserve-btn" class="btn-library btn-secondary">📜 Place Reserve Hold</button>
          ` : ''}
          ${AppState.auth.authenticated ? `
            <button id="book-issue-quick-btn" class="btn-library btn-secondary">🖋️ Home Loan</button>
            <button id="book-edit-btn" class="btn-library btn-secondary">✏️ Edit</button>
            <button id="book-delete-btn" class="btn-library btn-danger">🗑️</button>
          ` : ''}
        </div>
      </div>
    </div>

    <!-- Active Reading Tokens on this Book -->
    ${active_tokens && active_tokens.length > 0 ? `
      <div style="margin-top: 1.8rem; background: #fff5ea; border: 1px solid #e6b88a; padding: 1rem; border-radius: 4px;">
        <h4 style="font-size: 0.95rem; color: #8c2017; margin-bottom: 0.4rem;">
          🪑 Currently Being Read in Hall (${active_tokens.length} Scholar(s)):
        </h4>
        <ul style="font-size: 0.84rem; padding-left: 1.2rem; line-height: 1.6;">
          ${active_tokens.map(t => `
            <li><strong>${escapeHTML(t.student_name)}</strong> [${escapeHTML(t.member_id)}] at <strong>${escapeHTML(t.desk_number)}</strong> (Reading for ${t.reading_minutes} mins)</li>
          `).join('')}
        </ul>
      </div>
    ` : ''}

    <!-- Active Home Loan Borrowers List -->
    <div style="margin-top: 2rem;">
      <h3 style="font-size: 1.15rem; margin-bottom: 0.8rem; border-bottom: 1px solid var(--paper-edge); padding-bottom: 0.4rem;">
        Home Loan Borrowers (${borrowers.length})
      </h3>
      ${borrowers.length === 0 ? `
        <p style="font-size: 0.88rem; color: var(--ink-muted); font-style: italic;">All catalogued copies are currently resting on ${escapeHTML(book.shelf_no)}.</p>
      ` : `
        <div class="ledger-table-wrap">
          <table class="ledger-table">
            <thead>
              <tr>
                <th>Scholar</th>
                <th>Roll No</th>
                <th>Issued</th>
                <th>Due Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${borrowers.map(b => `
                <tr>
                  <td><strong>${escapeHTML(b.student_name)}</strong><br><small style="color:var(--ink-muted)">${escapeHTML(b.member_id)}</small></td>
                  <td>${escapeHTML(b.roll_no)}</td>
                  <td>${formatDate(b.issue_date)}</td>
                  <td>${formatDate(b.due_date)}</td>
                  <td>
                    ${parseInt(b.is_overdue) === 1 ? `
                      <span class="stamp stamp-overdue" style="font-size:0.65rem; padding: 2px 6px;">OVERDUE (${b.days_overdue}d)</span>
                    ` : `
                      <span class="stamp stamp-issued" style="font-size:0.65rem; padding: 2px 6px;">ON LOAN</span>
                    `}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;

  // Attach button events
  const tokenBtn = document.getElementById('book-take-token-btn');
  if (tokenBtn) {
    tokenBtn.addEventListener('click', () => {
      closeModal('book-details-modal');
      navigateToTab('tokens');
      setTimeout(() => {
        const select = document.getElementById('token-book-select');
        if (select) select.value = book.id;
      }, 200);
    });
  }

  const readerBtn = document.getElementById('book-open-reader-btn');
  if (readerBtn) {
    readerBtn.addEventListener('click', () => {
      closeModal('book-details-modal');
      openDigitalReader(book.id);
    });
  }

  const reserveBtn = document.getElementById('book-reserve-btn');
  if (reserveBtn) {
    reserveBtn.addEventListener('click', () => {
      closeModal('book-details-modal');
      openReserveModal(book);
    });
  }

  const quickIssueBtn = document.getElementById('book-issue-quick-btn');
  if (quickIssueBtn) {
    quickIssueBtn.addEventListener('click', () => {
      closeModal('book-details-modal');
      navigateToTab('circulation');
      setTimeout(() => {
        const bookSelect = document.getElementById('issue-book-select');
        if (bookSelect) bookSelect.value = book.id;
      }, 200);
    });
  }

  const editBtn = document.getElementById('book-edit-btn');
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      closeModal('book-details-modal');
      openBookFormModal(book);
    });
  }

  const deleteBtn = document.getElementById('book-delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      closeModal('book-details-modal');
      confirmBookDelete(book);
    });
  }

  openModal('book-details-modal');
}

// ----------------------------------------------------------------------------
// 10. Reading Desk Token System (वाचनालय टोकन व्यवस्था)
// ----------------------------------------------------------------------------
async function loadReadingTokens() {
  populateTokenDropdowns();
  
  const params = {
    status: AppState.tokens.filter,
    search: (document.getElementById('token-search-input')?.value || '').trim()
  };

  const res = await apiCall('tokens', params);
  if (!res.success) return;

  AppState.tokens.list = res.tokens;
  AppState.tokens.occupiedDesks = res.occupied_desks || [];

  renderReadingDesksMap(res.occupied_desks || []);
  renderTokensTable(res.tokens);
}

async function populateTokenDropdowns() {
  const bRes = await apiCall('books');
  const bookSelect = document.getElementById('token-book-select');
  if (bookSelect && bRes.success) {
    const currentVal = bookSelect.value;
    bookSelect.innerHTML = '<option value="">-- Choose NCERT / UP Board Textbook (LKG–12) --</option>';
    
    // Group by class
    const byClass = {};
    bRes.books.forEach(b => {
      const cls = b.class_grade || 'Other';
      if (!byClass[cls]) byClass[cls] = [];
      byClass[cls].push(b);
    });

    Object.keys(byClass).forEach(cls => {
      const optGroup = document.createElement('optgroup');
      optGroup.label = cls;
      byClass[cls].forEach(b => {
        const opt = document.createElement('option');
        opt.value = b.id;
        opt.textContent = `${b.title} [${b.board}] (${b.subject}) - ${b.shelf_no}`;
        optGroup.appendChild(opt);
      });
      bookSelect.appendChild(optGroup);
    });

    if (currentVal) bookSelect.value = currentVal;
  }

  const sRes = await apiCall('students');
  const studentSelect = document.getElementById('token-student-select');
  if (studentSelect && sRes.success) {
    studentSelect.innerHTML = '<option value="">-- Choose Registered Student --</option>';
    sRes.students.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.name} (${s.member_id} / ${s.roll_no})`;
      studentSelect.appendChild(opt);
    });
  }

  // Desks 1 to 24
  const deskSelect = document.getElementById('token-desk-select');
  if (deskSelect) {
    deskSelect.innerHTML = '<option value="">-- Auto Assign Next Available Desk --</option>';
    for (let d = 1; d <= 24; d++) {
      const dName = 'Desk #' + String(d).padStart(2, '0');
      const opt = document.createElement('option');
      opt.value = dName;
      opt.textContent = `${dName} (${AppState.tokens.occupiedDesks.includes(dName) ? 'Occupied' : 'Vacant'})`;
      deskSelect.appendChild(opt);
    }
  }
}

// 24 Desks Seating Layout Map
function renderReadingDesksMap(occupiedDesks) {
  const container = document.getElementById('reading-desks-grid');
  if (!container) return;

  container.innerHTML = '';
  const total = 24;
  const occupiedCount = occupiedDesks.length;

  const badge = document.getElementById('desks-occupancy-badge');
  if (badge) {
    badge.innerHTML = `<strong>${occupiedCount} / ${total}</strong> Desks Active (${total - occupiedCount} Available)`;
  }

  for (let i = 1; i <= total; i++) {
    const deskName = 'Desk #' + String(i).padStart(2, '0');
    const isOccupied = occupiedDesks.includes(deskName);

    const seat = document.createElement('div');
    seat.className = `desk-seat-card ${isOccupied ? 'occupied' : 'vacant'}`;
    seat.innerHTML = `
      <div class="seat-lamp">${isOccupied ? '🟠' : '🟢'}</div>
      <div class="seat-number">${deskName}</div>
      <div class="seat-status-text">${isOccupied ? 'अध्ययनरत' : 'उपलब्ध'}</div>
    `;

    seat.addEventListener('click', () => {
      if (!isOccupied) {
        const select = document.getElementById('token-desk-select');
        if (select) select.value = deskName;
        showToast(`${deskName} चयनित किया गया।`, 'success');
      } else {
        const matching = AppState.tokens.list.find(t => t.desk_number.startsWith(deskName) && t.status === 'active');
        if (matching) {
          openTokenSlipModal(matching);
        }
      }
    });

    container.appendChild(seat);
  }
}

// Render Active Tokens Table
function renderTokensTable(tokens) {
  const tbody = document.getElementById('tokens-table-body');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (tokens.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state" style="padding: 2.5rem;">
          <div class="empty-state-icon">🪑</div>
          <div class="empty-state-title">No Active Reading Tokens</div>
          <div class="empty-state-text">Currently no students are seated with reading passes in the reading hall.</div>
        </td>
      </tr>
    `;
    return;
  }

  tokens.forEach(t => {
    const isActive = t.status === 'active';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${escapeHTML(t.token_code)}</strong></td>
      <td><span class="token-desk-badge" style="padding:2px 8px; font-size:0.75rem;">${escapeHTML(t.desk_number)}</span></td>
      <td><strong>${escapeHTML(t.student_name)}</strong><br><small style="color:var(--ink-muted)">${escapeHTML(t.member_id)}</small></td>
      <td><strong>${escapeHTML(t.book_title)}</strong><br><small style="color:var(--ink-muted)">${escapeHTML(t.class_grade)} • ${escapeHTML(t.subject)}</small></td>
      <td>${formatDate(t.issued_at)}</td>
      <td>${t.duration_minutes} मिनट</td>
      <td>
        ${isActive ? `
          <span class="stamp stamp-issued" style="font-size:0.65rem; padding: 2px 6px;">अध्ययनरत (ACTIVE)</span>
        ` : `
          <span class="stamp stamp-returned" style="font-size:0.65rem; padding: 2px 6px;">COMPLETED</span>
        `}
      </td>
      <td>
        <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
          <button class="btn-library btn-gold" style="font-size:0.75rem; padding: 0.35rem 0.6rem;" data-action="pass" title="Inspect Token Pass">Pass</button>
          <button class="btn-library btn-primary" style="font-size:0.75rem; padding: 0.35rem 0.6rem;" data-action="read" title="Open in Digital Reading Stacks">📖 Read</button>
          ${isActive ? `
            <button class="btn-library btn-danger" style="font-size:0.75rem; padding: 0.35rem 0.6rem;" data-action="vacate" title="Release Desk Token">Vacate</button>
          ` : ''}
        </div>
      </td>
    `;

    tr.querySelector('[data-action="pass"]').addEventListener('click', () => openTokenSlipModal(t));
    tr.querySelector('[data-action="read"]').addEventListener('click', () => openDigitalReader(t.book_id, t));

    const vacateBtn = tr.querySelector('[data-action="vacate"]');
    if (vacateBtn) {
      vacateBtn.addEventListener('click', () => handleVacateToken(t));
    }

    tbody.appendChild(tr);
  });
}

// Issue Reading Token Form Handler
async function handleIssueReadingToken(e) {
  e.preventDefault();
  const form = e.target;
  const book_id = parseInt(form.book_id.value);
  const student_id = parseInt(form.student_id.value) || 0;
  const member_id = form.member_id.value.trim();
  const desk_number = form.desk_number.value.trim();

  if (!book_id) {
    showToast('Please select a textbook.', 'error');
    return;
  }

  if (!student_id && !member_id) {
    showToast('Please select a student or enter a Member ID.', 'error');
    return;
  }

  const res = await apiCall('issue_token', { book_id, student_id, member_id, desk_number }, { method: 'POST' });
  if (res.success) {
    LibraryAudio.playStamp();
    showToast(res.message, 'success');
    form.reset();
    loadReadingTokens();

    openTokenSlipModal({
      token_number: res.token_number,
      token_code: res.token_code,
      desk_number: res.desk_number,
      student_name: res.student_name,
      member_id: res.member_id,
      roll_no: res.roll_no,
      book_title: res.book_title,
      class_grade: res.class_grade,
      subject: res.subject,
      shelf_no: res.shelf_no,
      issued_at: res.issued_at,
      book_id: book_id
    });
  } else {
    showToast(res.error, 'error');
  }
}

// Vacate Desk & Return Token
function handleVacateToken(token) {
  openConfirmDialog({
    title: 'वाचनालय डेस्क खाली करें (Vacate Desk Token)',
    message: `क्या आप ${escapeHTML(token.student_name)} का वाचनालय टोकन <strong>${escapeHTML(token.token_code)}</strong> जमा करके <strong>${escapeHTML(token.desk_number)}</strong> को रिक्त घोषित करना चाहते हैं?`,
    confirmText: 'टोकन जमा करें (Vacate)',
    onConfirm: async () => {
      const res = await apiCall('return_token', { token_id: token.id }, { method: 'POST' });
      if (res.success) {
        LibraryAudio.playStamp();
        showToast(res.message, 'success');
        loadReadingTokens();
      } else {
        showToast(res.error, 'error');
      }
    }
  });
}

// Stamped Token Pass Modal
function openTokenSlipModal(token) {
  const container = document.getElementById('token-slip-content');
  if (!container) return;

  container.innerHTML = `
    <div class="reading-token-slip">
      <div class="token-slip-header">
        <div class="token-slip-brand">
          <img src="images/ansh_vansh_logo.png" alt="Ansh Vansh Library" class="token-slip-logo-img">
          <div>
            <div class="token-inst-title">ANSH VANSH LIBRARY</div>
            <div class="token-inst-sub">वाचनालय प्रवेश टोकन • NCERT &amp; UP Board</div>
          </div>
        </div>
        <div class="token-big-number">TOKEN #${token.token_number || '101'}</div>
        <div class="token-desk-badge">${escapeHTML(token.desk_number)}</div>
      </div>

      <table class="token-slip-table">
        <tr><td class="lbl">SCHOLAR:</td><td><strong>${escapeHTML(token.student_name)}</strong></td></tr>
        <tr><td class="lbl">MEMBER ID:</td><td><code>${escapeHTML(token.member_id)}</code></td></tr>
        <tr><td class="lbl">TEXTBOOK:</td><td><strong>${escapeHTML(token.book_title)}</strong></td></tr>
        <tr><td class="lbl">CLASS / BOARD:</td><td>${escapeHTML(token.class_grade || 'All Classes')} • ${escapeHTML(token.subject || '')}</td></tr>
        <tr><td class="lbl">STACKS SHELF:</td><td>${escapeHTML(token.shelf_no || 'Central Stacks')}</td></tr>
        <tr><td class="lbl">ISSUED AT:</td><td>${formatDate(token.issued_at)}</td></tr>
      </table>

      <div style="text-align: center; margin-top: 1.2rem; display: flex; gap: 0.6rem; justify-content: center;">
        <button id="token-read-now-btn" class="btn-library btn-primary">📖 Open in e-Reading Stacks (ई-वाचनालय)</button>
        <button id="token-print-slip-btn" class="btn-library btn-secondary">🖨️ Print Token</button>
      </div>
    </div>
  `;

  document.getElementById('token-read-now-btn').addEventListener('click', () => {
    closeModal('token-slip-modal');
    openDigitalReader(token.book_id, token);
  });

  document.getElementById('token-print-slip-btn').addEventListener('click', () => {
    window.print();
  });

  openModal('token-slip-modal');
}

// Digital Reading Room E-Reader Modal (ई-वाचनालय)
async function openDigitalReader(bookId, tokenContext = null) {
  const res = await apiCall('read_book_content', { id: bookId });
  if (!res.success) {
    showToast(res.error, 'error');
    return;
  }

  const { book, chapters, notice } = res;
  const container = document.getElementById('digital-reader-content');
  if (!container) return;

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--brass-gold); padding-bottom: 0.8rem; margin-bottom: 1.2rem; flex-wrap: wrap; gap: 0.6rem;">
      <div>
        <span class="badge-curriculum badge-class">${escapeHTML(book.class_grade)}</span>
        <span class="badge-curriculum badge-ncert">${escapeHTML(book.board)}</span>
        <h3 style="font-size: 1.4rem; display: inline; margin-left: 0.5rem;">${escapeHTML(book.title)}</h3>
      </div>
      ${tokenContext ? `
        <div style="font-family: var(--font-typewriter); font-size: 0.85rem; color: #8c2017;">
          Scholar: <strong>${escapeHTML(tokenContext.student_name)}</strong> • <strong>${escapeHTML(tokenContext.desk_number)}</strong>
        </div>
      ` : ''}
    </div>

    <div class="digital-reading-room-layout">
      <!-- Left: Chapters & Syllabus Index -->
      <div class="reader-sidebar">
        <h4 style="font-size: 0.92rem; text-transform: uppercase; color: var(--wood-darkest); margin-bottom: 0.4rem;">
          अध्याय सूची (Chapters Index)
        </h4>
        <div id="reader-chapters-container" class="reader-chapters-list">
          ${chapters.map((ch, idx) => `
            <button class="chapter-select-btn ${idx === 0 ? 'active' : ''}" data-idx="${idx}">
              <strong>अध्याय ${ch.no}:</strong> ${escapeHTML(ch.title)}
              <div style="font-size: 0.72rem; color: var(--ink-muted); margin-top: 2px;">पृष्ठ: ${ch.pages}</div>
            </button>
          `).join('')}
        </div>
        
        <div style="margin-top: auto; padding-top: 1rem; border-top: 1px solid var(--paper-edge);">
          <div style="font-size: 0.75rem; color: var(--ink-muted); margin-bottom: 0.5rem;">
            📍 Physical Shelf: <strong>${escapeHTML(book.shelf_no)}</strong>
          </div>
          ${book.pdf_preview_url ? `
            <a href="${escapeHTML(book.pdf_preview_url)}" target="_blank" rel="noopener" class="btn-library btn-secondary" style="font-size:0.75rem; width:100%; text-align:center;">
              🔗 Official NCERT ePathshala Portal
            </a>
          ` : ''}
        </div>
      </div>

      <!-- Right: Main Reading Canvas -->
      <div id="reader-canvas-main" class="reader-main-canvas">
        <div id="chapter-view-display">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--paper-edge); padding-bottom:0.6rem; margin-bottom:1rem;">
            <h3 id="display-ch-title" style="font-size:1.3rem; color:#8c2017;">अध्याय 1: प्रारंभिक अध्याय (Foundational Concepts)</h3>
            <span id="display-ch-pages" style="font-family:var(--font-typewriter); font-size:0.85rem; color:var(--ink-muted);">पृष्ठ: 1 - 24</span>
          </div>

          <div style="line-height: 1.8; font-size: 0.95rem;">
            <p><strong>पाठ का परिचय एवं मुख्य संकल्पनाएं:</strong></p>
            <p style="margin-top:0.4rem;" id="display-ch-desc">
              ${escapeHTML(chapters[0].desc)}
            </p>

            <div style="margin-top: 1.2rem; background: var(--parchment-base); padding: 1.2rem; border-radius: 6px; border-left: 4px solid var(--banker-green);">
              <h4 style="font-size: 1rem; color: var(--banker-green); margin-bottom: 0.4rem;">
                📌 बोर्ड परीक्षा हेतु महत्वपूर्ण स्मरण बिंदु (Key Revision Points):
              </h4>
              <ul style="padding-left: 1.2rem; line-height: 1.8; font-size: 0.9rem;">
                <li>पाठ्यपुस्तक के प्रत्येक अध्याय में दिए गए अभ्यास प्रश्नों को चरणबद्ध तरीके से हल करें।</li>
                <li>महत्वपूर्ण सूत्रों, परिभाषाओं एवं आरेखों (Diagrams) को अपनी अध्ययन नोटबुक में रेखांकित करें।</li>
                <li>विगत 5 वर्षों के बोर्ड परीक्षा प्रश्नों का विश्लेषण इस अध्याय के संदर्भ में आवश्यक है।</li>
              </ul>
            </div>

            <div style="margin-top: 1.2rem; font-style: italic; color: var(--ink-muted); font-size: 0.85rem;">
              ${escapeHTML(notice)}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Chapter buttons interactivity
  const chBtns = document.querySelectorAll('.chapter-select-btn');
  chBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      chBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const idx = parseInt(btn.getAttribute('data-idx'));
      const ch = chapters[idx];
      document.getElementById('display-ch-title').textContent = `अध्याय ${ch.no}: ${ch.title}`;
      document.getElementById('display-ch-pages').textContent = `पृष्ठ: ${ch.pages}`;
      document.getElementById('display-ch-desc').textContent = ch.desc;
      LibraryAudio.playBookSlide();
    });
  });

  openModal('digital-reader-modal');
}

// ----------------------------------------------------------------------------
// 11. Students / Members View & Printable Library Card
// ----------------------------------------------------------------------------
async function loadMembers() {
  const search = (document.getElementById('member-search-input')?.value || '').trim();
  const res = await apiCall('students', { search });
  if (!res.success) return;

  AppState.students = res.students;
  renderMembersTable(res.students);
}

function renderMembersTable(students) {
  const tbody = document.getElementById('members-table-body');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (students.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state" style="padding: 2rem;">
          <div class="empty-state-icon">👥</div>
          <div class="empty-state-title">No Registered Scholars</div>
          <div class="empty-state-text">No student profiles matched your query in the member roll.</div>
        </td>
      </tr>
    `;
    return;
  }

  students.forEach(s => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${escapeHTML(s.name)}</strong></td>
      <td><code>${escapeHTML(s.member_id)}</code></td>
      <td>${escapeHTML(s.roll_no)}</td>
      <td>${escapeHTML(s.email)}<br><small style="color:var(--ink-muted)">${escapeHTML(s.phone)}</small></td>
      <td>
        ${parseInt(s.active_loans) > 0 ? `
          <span class="stamp stamp-issued" style="font-size:0.7rem; padding: 2px 6px;">${s.active_loans} on loan</span>
        ` : `
          <span style="color:var(--ink-muted); font-size: 0.85rem;">None</span>
        `}
      </td>
      <td>
        <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
          <button class="btn-library btn-gold" style="font-size:0.75rem; padding: 0.35rem 0.65rem;" data-action="card">🎫 Print Card</button>
          <button class="btn-library btn-secondary" style="font-size:0.75rem; padding: 0.35rem 0.65rem;" data-action="history">📜 History</button>
          ${AppState.auth.authenticated ? `
            <button class="btn-library btn-secondary" style="font-size:0.75rem; padding: 0.35rem 0.65rem;" data-action="edit">✏️</button>
            <button class="btn-library btn-danger" style="font-size:0.75rem; padding: 0.35rem 0.65rem;" data-action="delete">🗑️</button>
          ` : ''}
        </div>
      </td>
    `;

    tr.querySelector('[data-action="card"]').addEventListener('click', () => openLibraryCard(s));
    tr.querySelector('[data-action="history"]').addEventListener('click', () => openMemberHistory(s.id));

    const editBtn = tr.querySelector('[data-action="edit"]');
    if (editBtn) editBtn.addEventListener('click', () => openStudentFormModal(s));

    const delBtn = tr.querySelector('[data-action="delete"]');
    if (delBtn) delBtn.addEventListener('click', () => confirmStudentDelete(s));

    tbody.appendChild(tr);
  });
}

function openLibraryCard(student) {
  const container = document.getElementById('printable-card-view');
  if (!container) return;

  const validUntil = new Date();
  validUntil.setFullYear(validUntil.getFullYear() + 2);
  const validUntilStr = validUntil.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });

  container.innerHTML = `
    <div class="official-library-card">
      <div class="card-top-header">
        <div class="card-logo-row">
          <img src="images/ansh_vansh_logo.png" alt="Ansh Vansh Crest" class="card-logo-img">
          <div>
            <div class="card-institution">ANSH VANSH LIBRARY</div>
            <div class="card-sub-header">Official Academic Membership • Est. 2026</div>
          </div>
        </div>
      </div>
      <div class="card-body-layout">
        <div class="card-photo-frame">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
          <span style="font-size:0.6rem; margin-top: 4px; text-transform: uppercase;">VERIFIED SEAL</span>
        </div>
        <div class="card-details-list">
          <div class="card-detail-row"><span class="label">MEMBER:</span><span class="val">${escapeHTML(student.name)}</span></div>
          <div class="card-detail-row"><span class="label">MEMBER ID:</span><span class="val">${escapeHTML(student.member_id)}</span></div>
          <div class="card-detail-row"><span class="label">ROLL NO:</span><span class="val">${escapeHTML(student.roll_no)}</span></div>
          <div class="card-detail-row"><span class="label">ISSUED:</span><span class="val">${formatDate(student.created_at)}</span></div>
          <div class="card-detail-row"><span class="label">VALID THRU:</span><span class="val">${validUntilStr}</span></div>
        </div>
      </div>
      <div class="card-barcode-area">
        ${generateBarcodeSVG(student.member_id)}
        <div class="barcode-label">${escapeHTML(student.member_id)}</div>
      </div>
    </div>
  `;

  openModal('library-card-modal');
}

async function openMemberHistory(studentId) {
  const res = await apiCall('student_details', { id: studentId });
  if (!res.success) {
    showToast(res.error, 'error');
    return;
  }

  const { student, history, token_history, fines_paid } = res;
  const content = document.getElementById('member-history-content');
  content.innerHTML = `
    <div style="margin-bottom: 1.2rem; border-bottom: 1px solid var(--paper-edge); padding-bottom: 0.8rem;">
      <h3 style="font-size: 1.3rem;">Borrowing &amp; Reading Stacks History: ${escapeHTML(student.name)}</h3>
      <div style="font-size: 0.88rem; color: var(--ink-secondary);">
        Member ID: <code>${escapeHTML(student.member_id)}</code> • Roll No: ${escapeHTML(student.roll_no)} • Fines Paid: Rs. ${fines_paid.toFixed(2)}
      </div>
    </div>

    <!-- Reading Tokens History -->
    ${token_history && token_history.length > 0 ? `
      <div style="margin-bottom: 1.8rem;">
        <h4 style="font-size: 1rem; color: #8c2017; margin-bottom: 0.5rem;">वाचनालय अध्ययन सत्र (Reading Desk Sessions)</h4>
        <div class="ledger-table-wrap">
          <table class="ledger-table">
            <thead>
              <tr>
                <th>Token #</th>
                <th>Desk</th>
                <th>Textbook</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${token_history.map(t => `
                <tr>
                  <td><code>${escapeHTML(t.token_code)}</code></td>
                  <td>${escapeHTML(t.desk_number)}</td>
                  <td><strong>${escapeHTML(t.book_title)}</strong> (${escapeHTML(t.class_grade)})</td>
                  <td>${formatDate(t.issued_at)}</td>
                  <td><span class="stamp stamp-${t.status === 'active' ? 'issued' : 'returned'}" style="font-size:0.6rem; padding:2px 5px;">${t.status.toUpperCase()}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    ` : ''}

    <h4 style="font-size: 1rem; color: var(--wood-darkest); margin-bottom: 0.5rem;">Home Loan Circulation Ledger</h4>
    ${history.length === 0 ? `
      <p style="font-style: italic; color: var(--ink-muted);">This scholar has not yet checked out volumes for home loan.</p>
    ` : `
      <div class="ledger-table-wrap">
        <table class="ledger-table">
          <thead>
            <tr>
              <th>Volume Title</th>
              <th>Borrowed</th>
              <th>Due Date</th>
              <th>Returned</th>
              <th>Fine</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${history.map(h => `
              <tr>
                <td><strong>${escapeHTML(h.book_title)}</strong><br><small style="color:var(--ink-muted)">${escapeHTML(h.shelf_no)}</small></td>
                <td>${formatDate(h.issue_date)}</td>
                <td>${formatDate(h.due_date)}</td>
                <td>${h.return_date ? formatDate(h.return_date) : '<em>On Loan</em>'}</td>
                <td>Rs. ${parseFloat(h.fine).toFixed(2)}</td>
                <td>
                  ${h.status === 'returned' ? `
                    <span class="stamp stamp-returned" style="font-size:0.65rem; padding: 2px 5px;">RETURNED</span>
                  ` : (h.status === 'overdue' ? `
                    <span class="stamp stamp-overdue" style="font-size:0.65rem; padding: 2px 5px;">OVERDUE (${h.days_overdue}d)</span>
                  ` : `
                    <span class="stamp stamp-issued" style="font-size:0.65rem; padding: 2px 5px;">ACTIVE</span>
                  `)}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `}
  `;

  openModal('member-history-modal');
}

function openStudentFormModal(student = null) {
  const form = document.getElementById('student-form');
  form.reset();
  const titleEl = document.getElementById('student-form-modal-title');

  if (student) {
    titleEl.textContent = 'Edit Member Profile';
    form.id.value = student.id;
    form.name.value = student.name;
    form.roll_no.value = student.roll_no;
    form.email.value = student.email;
    form.phone.value = student.phone;
    form.member_id.value = student.member_id;
  } else {
    titleEl.textContent = 'Register New Library Member';
    form.id.value = '';
    form.member_id.value = 'LIB-' + new Date().getFullYear() + '-' + Math.floor(100 + Math.random() * 900);
  }

  openModal('student-form-modal');
}

async function handleStudentFormSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const payload = {
    id: form.id.value || null,
    name: form.name.value.trim(),
    roll_no: form.roll_no.value.trim(),
    email: form.email.value.trim(),
    phone: form.phone.value.trim(),
    member_id: form.member_id.value.trim()
  };

  const res = await apiCall('save_student', payload, { method: 'POST' });
  if (res.success) {
    showToast(res.message, 'success');
    closeModal('student-form-modal');
    LibraryAudio.playStamp();
    loadMembers();
  } else {
    showToast(res.error, 'error');
  }
}

function confirmStudentDelete(student) {
  openConfirmDialog({
    title: 'Purge Member Record?',
    message: `Are you sure you wish to remove student ${escapeHTML(student.name)} (${escapeHTML(student.member_id)})?`,
    confirmText: 'Purge Member',
    onConfirm: async () => {
      const res = await apiCall('delete_student', { id: student.id }, { method: 'POST' });
      if (res.success) {
        showToast(res.message, 'success');
        loadMembers();
      } else {
        showToast(res.error, 'error');
      }
    }
  });
}

// ----------------------------------------------------------------------------
// 12. Circulation Desk (Issue & Return with Date Due Slip)
// ----------------------------------------------------------------------------
async function loadCirculation() {
  populateCirculationDropdowns();
  loadIssuesList();
}

async function populateCirculationDropdowns() {
  const bRes = await apiCall('books', { availability: 'available' });
  const bookSelect = document.getElementById('issue-book-select');
  if (bookSelect && bRes.success) {
    bookSelect.innerHTML = '<option value="">-- Choose Volume from Shelves --</option>';
    bRes.books.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.id;
      opt.textContent = `${b.title} [${b.class_grade} • ${b.shelf_no}] (Avail: ${b.available}/${b.quantity})`;
      bookSelect.appendChild(opt);
    });
  }

  const sRes = await apiCall('students');
  const studentSelect = document.getElementById('issue-student-select');
  if (studentSelect && sRes.success) {
    studentSelect.innerHTML = '<option value="">-- Choose Registered Student --</option>';
    sRes.students.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.name} (${s.member_id} / ${s.roll_no})`;
      studentSelect.appendChild(opt);
    });
  }
}

async function handleIssueFormSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const book_id = parseInt(form.book_id.value);
  const student_id = parseInt(form.student_id.value);
  const days = parseInt(form.loan_days.value) || 14;

  if (!book_id || !student_id) {
    showToast('Please select both a volume and a student.', 'error');
    return;
  }

  const res = await apiCall('issue_book', { book_id, student_id, days }, { method: 'POST' });
  if (res.success) {
    LibraryAudio.playStamp();
    showToast(res.message, 'success');
    form.reset();
    populateCirculationDropdowns();
    loadIssuesList();

    showDueSlipModal({
      book_title: res.book_title,
      student_name: res.student_name,
      member_id: res.member_id,
      shelf_no: res.shelf_no,
      issue_date: res.issue_date,
      due_date: res.due_date,
      status: 'issued'
    });
  } else {
    showToast(res.error, 'error');
  }
}

async function loadIssuesList() {
  const params = {
    status: AppState.activeIssueFilter,
    search: (document.getElementById('issues-search-input')?.value || '').trim()
  };

  const res = await apiCall('issues', params);
  if (!res.success) return;

  AppState.issues = res.issues;
  renderIssuesTable(res.issues);
}

function renderIssuesTable(issues) {
  const tbody = document.getElementById('issues-table-body');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (issues.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state" style="padding: 2.5rem;">
          <div class="empty-state-icon">📖</div>
          <div class="empty-state-title">No Circulation Records</div>
          <div class="empty-state-text">No active or archived book loans match this ledger view.</div>
        </td>
      </tr>
    `;
    return;
  }

  issues.forEach(i => {
    const isReturned = i.computed_status === 'returned';
    const isOverdue = i.computed_status === 'overdue';
    const fineVal = parseFloat(i.computed_fine);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>#${i.id}</td>
      <td><strong>${escapeHTML(i.book_title)}</strong><br><small style="color:var(--ink-muted)">${escapeHTML(i.class_grade || '')} • ${escapeHTML(i.shelf_no)}</small></td>
      <td><strong>${escapeHTML(i.student_name)}</strong><br><small style="color:var(--ink-muted)">${escapeHTML(i.member_id)}</small></td>
      <td>${formatDate(i.issue_date)}</td>
      <td>${formatDate(i.due_date)}</td>
      <td>
        ${isReturned ? `
          <span class="stamp stamp-returned" style="font-size:0.68rem; padding: 2px 6px;">RETURNED</span>
        ` : (isOverdue ? `
          <span class="stamp stamp-overdue" style="font-size:0.68rem; padding: 2px 6px;">OVERDUE (${i.overdue_days}d)</span>
        ` : `
          <span class="stamp stamp-issued" style="font-size:0.68rem; padding: 2px 6px;">ACTIVE</span>
        `)}
      </td>
      <td>
        ${fineVal > 0 ? `
          <strong style="color:var(--stamp-red)">Rs. ${fineVal.toFixed(2)}</strong>
        ` : `
          <span style="color:var(--ink-muted)">Rs. 0.00</span>
        `}
      </td>
      <td>
        <div style="display: flex; gap: 0.4rem;">
          <button class="btn-library btn-secondary" style="font-size:0.75rem; padding: 0.35rem 0.6rem;" data-action="slip" title="Inspect Due Slip">Slip</button>
          ${!isReturned && AppState.auth.authenticated ? `
            <button class="btn-library btn-primary" style="font-size:0.75rem; padding: 0.35rem 0.6rem;" data-action="return">Return</button>
          ` : ''}
        </div>
      </td>
    `;

    tr.querySelector('[data-action="slip"]').addEventListener('click', () => {
      showDueSlipModal({
        book_title: i.book_title,
        student_name: i.student_name,
        member_id: i.member_id,
        shelf_no: i.shelf_no,
        issue_date: i.issue_date,
        due_date: i.due_date,
        return_date: i.return_date,
        fine: i.computed_fine,
        overdue_days: i.overdue_days,
        status: i.computed_status
      });
    });

    const returnBtn = tr.querySelector('[data-action="return"]');
    if (returnBtn) returnBtn.addEventListener('click', () => handleReturnBook(i));

    tbody.appendChild(tr);
  });
}

async function handleReturnBook(issue) {
  const fineAmt = parseFloat(issue.computed_fine);
  const msg = fineAmt > 0 
    ? `Volume is overdue by ${issue.overdue_days} days. Total late fine to collect: Rs. ${fineAmt.toFixed(2)} (at Rs. 2/day). Confirm book return?`
    : `Confirm return of "${escapeHTML(issue.book_title)}" borrowed by ${escapeHTML(issue.student_name)}?`;

  openConfirmDialog({
    title: 'Process Volume Return',
    message: msg,
    confirmText: 'Stamp & Return Volume',
    onConfirm: async () => {
      const res = await apiCall('return_book', { issue_id: issue.id }, { method: 'POST' });
      if (res.success) {
        LibraryAudio.playStamp();
        showToast(res.message, 'success');
        loadCirculation();
        populateCirculationDropdowns();

        if (res.next_reservation) {
          setTimeout(() => {
            showToast(`Priority Notification: ${res.next_reservation.name} has a waiting reservation for this book!`, 'success');
          }, 1200);
        }

        showDueSlipModal({
          book_title: res.book_title,
          student_name: res.student_name,
          member_id: res.member_id,
          shelf_no: issue.shelf_no,
          issue_date: issue.issue_date,
          due_date: res.due_date,
          return_date: res.return_date,
          fine: res.fine,
          overdue_days: res.days_overdue,
          status: 'returned'
        });
      } else {
        showToast(res.error, 'error');
      }
    }
  });
}

function showDueSlipModal(data) {
  const container = document.getElementById('due-slip-content');
  if (!container) return;

  container.innerHTML = `
    <div class="due-slip-container">
      <div class="due-slip-header">
        <div class="due-slip-brand">
          <img src="images/ansh_vansh_logo.png" alt="Logo" class="due-slip-logo-img">
          <div>
            <div class="due-slip-title">ANSH VANSH CIRCULATION SLIP</div>
            <div class="due-slip-notice">Please Keep Glued to Inside Back Cover • NCERT/UP Board</div>
          </div>
        </div>
      </div>
      <div style="font-size: 0.82rem; margin-bottom: 0.8rem; line-height: 1.5;">
        <div><strong>Title:</strong> ${escapeHTML(data.book_title)}</div>
        <div><strong>Member:</strong> ${escapeHTML(data.student_name)} [${escapeHTML(data.member_id)}]</div>
        <div><strong>Shelf:</strong> ${escapeHTML(data.shelf_no || 'Standard Stacks')}</div>
      </div>

      <table class="due-slip-table">
        <thead>
          <tr>
            <th>DATE ISSUED</th>
            <th>DATE DUE</th>
            <th>RETURN STAMP</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <span class="stamp stamp-issued">${formatDate(data.issue_date)}</span>
            </td>
            <td>
              <span class="stamp stamp-due">${formatDate(data.due_date)}</span>
            </td>
            <td>
              ${data.status === 'returned' ? `
                <span class="stamp stamp-returned">RETURNED<br>${formatDate(data.return_date)}</span>
              ` : (data.status === 'overdue' ? `
                <span class="stamp stamp-overdue">★ OVERDUE ★<br>Rs. ${parseFloat(data.fine).toFixed(2)}</span>
              ` : `
                <span style="color:var(--ink-muted); font-size:0.75rem;">[OPEN]</span>
              `)}
            </td>
          </tr>
        </tbody>
      </table>

      ${parseFloat(data.fine) > 0 ? `
        <div style="margin-top: 0.8rem; text-align: center; color: var(--stamp-red); font-size: 0.85rem; font-weight: 700;">
          Late fine assessed: Rs. ${parseFloat(data.fine).toFixed(2)} (${data.overdue_days} days @ Rs. 2.00/day)
        </div>
      ` : ''}
    </div>
  `;

  openModal('due-slip-modal');
}

// ----------------------------------------------------------------------------
// 13. Librarian Dashboard & Analytics
// ----------------------------------------------------------------------------
async function loadDashboard() {
  const res = await apiCall('stats');
  if (!res.success) return;

  const s = res.summary;
  document.getElementById('dash-titles').textContent = s.total_titles || '0';
  document.getElementById('dash-copies').textContent = s.total_copies || '0';
  document.getElementById('dash-members').textContent = s.total_students || '0';
  document.getElementById('dash-issued').textContent = s.total_issued || '0';
  document.getElementById('dash-overdue').textContent = s.total_overdue || '0';
  document.getElementById('dash-fines').textContent = 'Rs. ' + parseFloat(s.fines_collected).toFixed(2);

  renderMonthlyBarChart(res.monthly_issues);

  const topList = document.getElementById('dash-top-books-list');
  if (topList) {
    topList.innerHTML = '';
    const maxBorrows = Math.max(1, ...(res.top_books.map(b => parseInt(b.borrow_count) || 1)));
    res.top_books.forEach((book, idx) => {
      const count = parseInt(book.borrow_count) || 0;
      const pct = Math.round((count / maxBorrows) * 100);
      const row = document.createElement('div');
      row.className = 'podium-item';
      row.innerHTML = `
        <div class="podium-rank">${idx + 1}</div>
        <div class="podium-details">
          <div class="podium-title">${escapeHTML(book.title)}</div>
          <div class="podium-author">${escapeHTML(book.class_grade)} • ${escapeHTML(book.board)}</div>
          <div class="podium-meter"><div class="podium-fill" style="width: ${pct}%"></div></div>
        </div>
        <div class="podium-count">${count} borrows</div>
      `;
      topList.appendChild(row);
    });
  }

  const actTbody = document.getElementById('dash-recent-activity-tbody');
  if (actTbody) {
    actTbody.innerHTML = '';
    res.recent_issues.forEach(i => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${escapeHTML(i.book_title)}</strong></td>
        <td>${escapeHTML(i.student_name)}</td>
        <td>${formatDate(i.issue_date)}</td>
        <td>${formatDate(i.due_date)}</td>
        <td>
          ${i.status === 'returned' ? `
            <span class="stamp stamp-returned" style="font-size:0.62rem; padding: 2px 4px;">RETURNED</span>
          ` : (i.status === 'overdue' ? `
            <span class="stamp stamp-overdue" style="font-size:0.62rem; padding: 2px 4px;">OVERDUE</span>
          ` : `
            <span class="stamp stamp-issued" style="font-size:0.62rem; padding: 2px 4px;">ACTIVE</span>
          `)}
        </td>
      `;
      actTbody.appendChild(tr);
    });
  }
}

function renderMonthlyBarChart(data) {
  const container = document.getElementById('monthly-chart-wrap');
  if (!container) return;

  if (!data || data.length === 0) {
    container.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--ink-muted);">No monthly circulation records yet.</div>';
    return;
  }

  const width = 640;
  const height = 260;
  const padLeft = 50;
  const padBottom = 40;
  const padTop = 30;
  const padRight = 20;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const maxVal = Math.max(5, ...(data.map(d => parseInt(d.issue_count) || 0))) + 1;
  const barSlotW = chartW / data.length;
  const barW = Math.min(48, barSlotW * 0.6);

  let svg = `
    <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: 100%; display: block;" xmlns="http://www.w3.org/2000/svg">
      <line x1="${padLeft}" y1="${padTop}" x2="${width - padRight}" y2="${padTop}" stroke="var(--paper-edge)" stroke-dasharray="4,4" />
      <line x1="${padLeft}" y1="${padTop + chartH * 0.5}" x2="${width - padRight}" y2="${padTop + chartH * 0.5}" stroke="var(--paper-edge)" stroke-dasharray="4,4" />
      <line x1="${padLeft}" y1="${height - padBottom}" x2="${width - padRight}" y2="${height - padBottom}" stroke="var(--brass-dark)" stroke-width="2" />

      <text x="${padLeft - 8}" y="${padTop + 5}" font-family="Courier Prime, monospace" font-size="11" fill="var(--ink-muted)" text-anchor="end">${maxVal}</text>
      <text x="${padLeft - 8}" y="${padTop + chartH * 0.5 + 4}" font-family="Courier Prime, monospace" font-size="11" fill="var(--ink-muted)" text-anchor="end">${Math.round(maxVal / 2)}</text>
      <text x="${padLeft - 8}" y="${height - padBottom}" font-family="Courier Prime, monospace" font-size="11" fill="var(--ink-muted)" text-anchor="end">0</text>
  `;

  data.forEach((d, idx) => {
    const val = parseInt(d.issue_count) || 0;
    const barH = (val / maxVal) * chartH;
    const x = padLeft + idx * barSlotW + (barSlotW - barW) / 2;
    const y = height - padBottom - barH;

    svg += `
      <g class="chart-bar-group">
        <rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="3" fill="url(#barGradient)" stroke="var(--brass-gold)" stroke-width="1">
          <title>${d.month_label}: ${val} books issued</title>
        </rect>
        <text x="${x + barW / 2}" y="${y - 6}" font-family="Playfair Display, serif" font-weight="700" font-size="12" fill="var(--banker-green-light)" text-anchor="middle">${val}</text>
        <text x="${x + barW / 2}" y="${height - padBottom + 20}" font-family="Courier Prime, monospace" font-size="11" fill="var(--ink-secondary)" text-anchor="middle">${d.month_label}</text>
      </g>
    `;
  });

  svg += `
      <defs>
        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--banker-green-light)" />
          <stop offset="100%" stop-color="var(--banker-green)" />
        </linearGradient>
      </defs>
    </svg>
  `;

  container.innerHTML = svg;
}

// ----------------------------------------------------------------------------
// 14. Modals & Confirmation Dialogs
// ----------------------------------------------------------------------------
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('open');
    const firstInput = modal.querySelector('input:not([type="hidden"]), select, textarea');
    if (firstInput) setTimeout(() => firstInput.focus(), 100);
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('open');
}

function initModals() {
  document.querySelectorAll('.modal-backdrop').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modal.id);
    });

    const closeBtn = modal.querySelector('.modal-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', () => closeModal(modal.id));
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const openModals = document.querySelectorAll('.modal-backdrop.open');
      if (openModals.length > 0) {
        closeModal(openModals[openModals.length - 1].id);
      }
    }
  });

  const cancelBtn = document.getElementById('dialog-cancel-action-btn');
  if (cancelBtn) cancelBtn.addEventListener('click', () => closeModal('confirm-action-modal'));
}

let activeConfirmCallback = null;

function openConfirmDialog({ title, message, confirmText = 'Confirm', onConfirm }) {
  document.getElementById('confirm-dialog-title').textContent = title || 'Library Archive Confirmation';
  document.getElementById('confirm-dialog-message').innerHTML = message || 'Are you sure you wish to proceed?';
  const confirmBtn = document.getElementById('dialog-confirm-action-btn');
  confirmBtn.textContent = confirmText;

  activeConfirmCallback = onConfirm;
  confirmBtn.onclick = () => {
    if (activeConfirmCallback) activeConfirmCallback();
    closeModal('confirm-action-modal');
  };

  openModal('confirm-action-modal');
}

// ----------------------------------------------------------------------------
// 15. Form Submissions & Event Listeners
// ----------------------------------------------------------------------------
function initForms() {
  const loginForm = document.getElementById('librarian-login-form');
  if (loginForm) loginForm.addEventListener('submit', handleLogin);

  const bookForm = document.getElementById('book-form');
  if (bookForm) bookForm.addEventListener('submit', handleBookFormSubmit);

  const addBookBtn = document.getElementById('catalogue-add-book-btn');
  if (addBookBtn) addBookBtn.addEventListener('click', () => openBookFormModal(null));

  const studentForm = document.getElementById('student-form');
  if (studentForm) studentForm.addEventListener('submit', handleStudentFormSubmit);

  const addMemberBtn = document.getElementById('members-add-student-btn');
  if (addMemberBtn) addMemberBtn.addEventListener('click', () => openStudentFormModal(null));

  const reserveForm = document.getElementById('reserve-book-form');
  if (reserveForm) reserveForm.addEventListener('submit', handleReserveSubmit);

  const issueForm = document.getElementById('circulation-issue-form');
  if (issueForm) issueForm.addEventListener('submit', handleIssueFormSubmit);

  // Issue Reading Token Form
  const tokenForm = document.getElementById('issue-reading-token-form');
  if (tokenForm) tokenForm.addEventListener('submit', handleIssueReadingToken);

  // Catalogue Search
  const searchInput = document.getElementById('catalogue-search-input');
  if (searchInput) {
    let timeout = null;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        AppState.catalogue.searchQuery = e.target.value.trim();
        loadCatalogue();
      }, 250);
    });
  }

  // Catalogue Class Filter
  const classSelect = document.getElementById('catalogue-class-select');
  if (classSelect) {
    classSelect.addEventListener('change', (e) => {
      AppState.catalogue.activeClass = e.target.value;
      loadCatalogue();
    });
  }

  // Catalogue Board Filter
  const boardSelect = document.getElementById('catalogue-board-select');
  if (boardSelect) {
    boardSelect.addEventListener('change', (e) => {
      AppState.catalogue.activeBoard = e.target.value;
      loadCatalogue();
    });
  }

  // Catalogue Subject Filter
  const subjectSelect = document.getElementById('catalogue-subject-select');
  if (subjectSelect) {
    subjectSelect.addEventListener('change', (e) => {
      AppState.catalogue.activeSubject = e.target.value;
      loadCatalogue();
    });
  }

  // Catalogue Availability Select
  const availSelect = document.getElementById('catalogue-avail-select');
  if (availSelect) {
    availSelect.addEventListener('change', (e) => {
      AppState.catalogue.availability = e.target.value;
      loadCatalogue();
    });
  }

  // Catalogue Sort Select
  const sortSelect = document.getElementById('catalogue-sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      AppState.catalogue.sort = e.target.value;
      loadCatalogue();
    });
  }

  // View Mode Buttons (Shelf View vs Card Catalogue View)
  const shelfViewBtn = document.getElementById('view-shelf-btn');
  const cardViewBtn = document.getElementById('view-card-btn');
  if (shelfViewBtn && cardViewBtn) {
    shelfViewBtn.addEventListener('click', () => {
      AppState.catalogue.viewMode = 'shelf';
      shelfViewBtn.classList.add('active');
      cardViewBtn.classList.remove('active');
      renderCatalogueGrid(AppState.catalogue.books);
    });
    cardViewBtn.addEventListener('click', () => {
      AppState.catalogue.viewMode = 'card';
      cardViewBtn.classList.add('active');
      shelfViewBtn.classList.remove('active');
      renderCatalogueGrid(AppState.catalogue.books);
    });
  }

  // Member Search Input
  const memberSearchInput = document.getElementById('member-search-input');
  if (memberSearchInput) {
    let timeout = null;
    memberSearchInput.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => loadMembers(), 250);
    });
  }

  // Issue Search Input
  const issuesSearchInput = document.getElementById('issues-search-input');
  if (issuesSearchInput) {
    let timeout = null;
    issuesSearchInput.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => loadIssuesList(), 250);
    });
  }

  // Issue Status Filter Pills
  document.querySelectorAll('.issue-filter-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.issue-filter-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      AppState.activeIssueFilter = btn.getAttribute('data-status');
      loadIssuesList();
    });
  });

  // Token Status Filter Pills
  document.querySelectorAll('.token-filter-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.token-filter-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      AppState.tokens.filter = btn.getAttribute('data-status');
      loadReadingTokens();
    });
  });

  // Token Search Input
  const tokenSearchInput = document.getElementById('token-search-input');
  if (tokenSearchInput) {
    let timeout = null;
    tokenSearchInput.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => loadReadingTokens(), 250);
    });
  }

  const printCardBtn = document.getElementById('print-library-card-btn');
  if (printCardBtn) printCardBtn.addEventListener('click', () => window.print());
}

function openBookFormModal(book = null) {
  const form = document.getElementById('book-form');
  form.reset();
  const titleEl = document.getElementById('book-form-modal-title');

  if (book) {
    titleEl.textContent = 'Edit Textbook in Archives';
    form.id.value = book.id;
    form.title.value = book.title;
    form.author.value = book.author;
    form.isbn.value = book.isbn;
    form.category.value = book.category;
    form.class_grade.value = book.class_grade || 'Class 10';
    form.board.value = book.board || 'NCERT / UP Board';
    form.quantity.value = book.quantity;
    form.shelf_no.value = book.shelf_no;
    form.cover_url.value = book.cover_url || '';
    form.description.value = book.description || '';
  } else {
    titleEl.textContent = 'Catalog New NCERT / UP Board Volume';
    form.id.value = '';
    form.quantity.value = '6';
    form.shelf_no.value = 'Shelf Sec-01';
  }

  openModal('book-form-modal');
}

async function handleBookFormSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const payload = {
    id: form.id.value || null,
    title: form.title.value.trim(),
    author: form.author.value.trim(),
    isbn: form.isbn.value.trim(),
    category: form.category.value.trim(),
    class_grade: form.class_grade.value.trim(),
    board: form.board.value.trim(),
    quantity: parseInt(form.quantity.value) || 1,
    shelf_no: form.shelf_no.value.trim(),
    cover_url: form.cover_url.value.trim(),
    description: form.description.value.trim()
  };

  const res = await apiCall('save_book', payload, { method: 'POST' });
  if (res.success) {
    showToast(res.message, 'success');
    closeModal('book-form-modal');
    LibraryAudio.playStamp();
    loadCatalogue();
  } else {
    showToast(res.error, 'error');
  }
}

function confirmBookDelete(book) {
  openConfirmDialog({
    title: 'Withdraw Volume from Archives?',
    message: `Are you certain you wish to purge "${escapeHTML(book.title)}"?`,
    confirmText: 'Withdraw Volume',
    onConfirm: async () => {
      const res = await apiCall('delete_book', { id: book.id }, { method: 'POST' });
      if (res.success) {
        showToast(res.message, 'success');
        loadCatalogue();
      } else {
        showToast(res.error, 'error');
      }
    }
  });
}

function openReserveModal(book) {
  const form = document.getElementById('reserve-book-form');
  form.reset();
  form.book_id.value = book.id;
  document.getElementById('reserve-book-title').textContent = book.title;
  openModal('reserve-modal');
}

async function handleReserveSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const book_id = form.book_id.value;
  const member_id = form.member_id.value.trim();

  if (!member_id) {
    showToast('Please enter your Member ID or Roll Number.', 'error');
    return;
  }

  const res = await apiCall('reserve_book', { book_id, member_id }, { method: 'POST' });
  if (res.success) {
    showToast(res.message, 'success');
    closeModal('reserve-modal');
    LibraryAudio.playStamp();
  } else {
    showToast(res.error, 'error');
  }
}

// ----------------------------------------------------------------------------
// 16. Application Initialization
// ----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  try {
    window.scrollTo(0, 0);
    if (document.documentElement) document.documentElement.scrollLeft = 0;
    if (document.body) document.body.scrollLeft = 0;
  } catch (e) {}

  applyTheme();
  initNavigation();
  initModals();
  initForms();

  await checkAuth();

  const initialHash = window.location.hash.replace('#', '') || 'home';
  navigateToTab(initialHash, false);

  try {
    window.scrollTo(0, 0);
    if (document.documentElement) document.documentElement.scrollLeft = 0;
    if (document.body) document.body.scrollLeft = 0;
  } catch (e) {}
});
