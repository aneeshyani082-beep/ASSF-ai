import { BuiltAppPreview } from '../types/edge';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function isBuildRequestPrompt(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  const actionVerb = /\b(build|create|make|design|develop|generate)\b/.test(lower);
  const artifactNoun =
    /\b(website|web app|webapp|site|store|shop|ecommerce|e-commerce|landing page|portfolio|app|application|dashboard|calculator|tracker|booking|menu|game|quiz|converter|planner|crm|tool)\b/.test(
      lower
    );
  return actionVerb && artifactNoun;
}

export function buildOfflineStorefrontHtml(description: string): string {
  const safeTitle = escapeHtml(description.trim().slice(0, 48) || 'ASSF Modern Store');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen font-sans">
  <header class="border-b border-slate-800 bg-slate-950/90 sticky top-0 z-30 backdrop-blur">
    <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
      <div class="font-bold text-lg tracking-tight text-white flex items-center gap-2">
        <span class="w-3 h-3 rounded-full bg-cyan-400"></span>
        <span>${safeTitle}</span>
      </div>
      <div class="flex items-center gap-4">
        <input id="searchBox" type="text" placeholder="Search products..." class="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-400" />
        <button id="cartBtn" class="px-4 py-1.5 rounded-lg bg-cyan-400 text-slate-950 font-semibold text-sm flex items-center gap-2">
          Cart (<span id="cartCount">0</span>)
        </button>
      </div>
    </div>
  </header>

  <main class="max-w-6xl mx-auto px-6 py-10 space-y-10">
    <section class="bg-gradient-to-br from-slate-900 to-cyan-950/40 border border-slate-800 rounded-2xl p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
      <div class="space-y-2 max-w-xl">
        <p class="text-xs uppercase tracking-widest text-cyan-400 font-semibold">2026 Flagship Collection</p>
        <h1 class="text-3xl sm:text-4xl font-bold text-white">${safeTitle}</h1>
        <p class="text-slate-300 text-sm">Instant product catalog, live category filtering, interactive shopping cart, and one-click checkout preview.</p>
      </div>
      <div class="flex gap-2 flex-wrap" id="catFilters"></div>
    </section>

    <section id="productGrid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"></section>
  </main>

  <aside id="cartDrawer" class="fixed inset-y-0 right-0 w-full max-w-md bg-slate-900 border-l border-slate-800 p-6 hidden flex-col justify-between z-50 shadow-2xl">
    <div>
      <div class="flex items-center justify-between pb-4 border-b border-slate-800">
        <h2 class="text-lg font-bold text-white">Your Shopping Cart</h2>
        <button id="closeCart" class="text-slate-400 hover:text-white text-sm">Close</button>
      </div>
      <div id="cartItems" class="py-4 space-y-3 max-h-[60vh] overflow-y-auto"></div>
    </div>
    <div class="border-t border-slate-800 pt-4 space-y-3">
      <div class="flex justify-between text-base font-bold text-white">
        <span>Total</span>
        <span id="cartTotal">$0.00</span>
      </div>
      <button id="checkoutBtn" class="w-full py-2.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-sm">Complete Order</button>
      <p id="orderConfirm" class="hidden text-xs text-emerald-400 font-medium text-center">Order confirmed! Receipt #ASSF-2026 generated.</p>
    </div>
  </aside>

  <script>
    const PRODUCTS = [
      { id: 1, name: 'Nova Pro Smart Hub', category: 'Hardware', price: 149, desc: 'Matter 1.4 & Wi-Fi 7 automated controller' },
      { id: 2, name: 'AeroSense Air Monitor', category: 'Sensors', price: 89, desc: 'Real-time VOC, CO2 & thermal telemetry' },
      { id: 3, name: 'VoltGaN 140W Charger', category: 'Power', price: 69, desc: 'Compact Gallium Nitride 3-port PD station' },
      { id: 4, name: 'EdgeCam Vision Kit', category: 'Hardware', price: 199, desc: 'On-device AI optical inspection camera' },
      { id: 5, name: 'PulseBand Bio Tracker', category: 'Wearables', price: 129, desc: '7-day battery health & activity sensor' },
      { id: 6, name: 'CoreDrive NVMe Dock', category: 'Power', price: 119, desc: 'High-speed 40Gbps workstation hub' }
    ];
    let activeCat = 'All', query = '', cart = [];
    const grid = document.getElementById('productGrid');
    const filters = document.getElementById('catFilters');
    const drawer = document.getElementById('cartDrawer');

    ['All', 'Hardware', 'Sensors', 'Power', 'Wearables'].forEach(cat => {
      const btn = document.createElement('button');
      btn.textContent = cat;
      btn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-400';
      btn.onclick = () => { activeCat = cat; render(); };
      filters.appendChild(btn);
    });

    document.getElementById('searchBox').oninput = (e) => { query = e.target.value.toLowerCase(); render(); };
    document.getElementById('cartBtn').onclick = () => { drawer.classList.remove('hidden'); drawer.classList.add('flex'); };
    document.getElementById('closeCart').onclick = () => { drawer.classList.add('hidden'); drawer.classList.remove('flex'); };
    document.getElementById('checkoutBtn').onclick = () => {
      if (!cart.length) return;
      cart = [];
      document.getElementById('orderConfirm').classList.remove('hidden');
      renderCart();
    };

    function addToCart(id) {
      const prod = PRODUCTS.find(p => p.id === id);
      const item = cart.find(c => c.id === id);
      if (item) item.qty += 1; else cart.push({ ...prod, qty: 1 });
      document.getElementById('orderConfirm').classList.add('hidden');
      renderCart();
    }

    function renderCart() {
      const wrap = document.getElementById('cartItems');
      wrap.innerHTML = cart.length ? '' : '<p class="text-sm text-slate-400">Your cart is empty.</p>';
      let total = 0, count = 0;
      cart.forEach(item => {
        total += item.price * item.qty;
        count += item.qty;
        const row = document.createElement('div');
        row.className = 'flex items-center justify-between bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm';
        row.innerHTML = '<div><div class="font-semibold text-white">' + item.name + '</div><div class="text-xs text-slate-400">$' + item.price + ' x ' + item.qty + '</div></div><div class="flex items-center gap-2"><button class="px-2 py-0.5 bg-slate-800 rounded" onclick="updateQty(' + item.id + ',-1)">-</button><button class="px-2 py-0.5 bg-slate-800 rounded" onclick="updateQty(' + item.id + ',1)">+</button></div>';
        wrap.appendChild(row);
      });
      document.getElementById('cartCount').textContent = count;
      document.getElementById('cartTotal').textContent = '$' + total.toFixed(2);
    }

    window.updateQty = function(id, delta) {
      const item = cart.find(c => c.id === id);
      if (!item) return;
      item.qty += delta;
      if (item.qty <= 0) cart = cart.filter(c => c.id !== id);
      renderCart();
    };

    function render() {
      grid.innerHTML = '';
      PRODUCTS.filter(p => (activeCat === 'All' || p.category === activeCat) && p.name.toLowerCase().includes(query)).forEach(p => {
        const card = document.createElement('div');
        card.className = 'bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4';
        card.innerHTML = '<div><div class="text-xs text-cyan-400 font-semibold">' + p.category + '</div><h3 class="text-lg font-bold text-white mt-1">' + p.name + '</h3><p class="text-xs text-slate-400 mt-1">' + p.desc + '</p></div><div class="flex items-center justify-between pt-2 border-t border-slate-800"><span class="text-xl font-bold text-white">$' + p.price + '</span><button class="px-3.5 py-1.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold text-xs">Add to Cart</button></div>';
        card.querySelector('button').onclick = () => addToCart(p.id);
        grid.appendChild(card);
      });
    }
    render();
  </script>
</body>
</html>`;
}

function buildOfflineUtilityAppHtml(description: string): string {
  const safeTitle = escapeHtml(description.trim().slice(0, 48) || 'ASSF Interactive App');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen font-sans p-6">
  <div class="max-w-4xl mx-auto space-y-6">
    <header class="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <span class="text-xs font-mono uppercase tracking-wider text-cyan-400">ASSF Instant Web App</span>
        <h1 class="text-2xl font-bold text-white mt-1">${safeTitle}</h1>
      </div>
      <div id="liveSummary" class="px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-sm font-bold">
        0 Tasks · 100% Ready
      </div>
    </header>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <section class="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h2 class="text-sm font-bold uppercase tracking-wider text-slate-300">Quick Calculator & Estimator</h2>
        <div class="space-y-3 text-xs">
          <label class="block space-y-1">
            <span class="text-slate-400">Primary Value / Amount</span>
            <input id="valA" type="number" value="1200" class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white" />
          </label>
          <label class="block space-y-1">
            <span class="text-slate-400">Rate / Multiplier (%)</span>
            <input id="valB" type="number" value="18" class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white" />
          </label>
          <label class="block space-y-1">
            <span class="text-slate-400">Units / Duration</span>
            <input id="valC" type="number" value="12" class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white" />
          </label>
        </div>
        <div class="bg-slate-950 border border-slate-800 rounded-xl p-4 grid grid-cols-2 gap-3">
          <div>
            <div class="text-[11px] text-slate-400">Adjusted Output</div>
            <div id="calcOut" class="text-xl font-bold text-emerald-400 mt-0.5">$1,416.00</div>
          </div>
          <div>
            <div class="text-[11px] text-slate-400">Cumulative Total</div>
            <div id="calcTotal" class="text-xl font-bold text-cyan-400 mt-0.5">$16,992.00</div>
          </div>
        </div>
      </section>

      <section class="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h2 class="text-sm font-bold uppercase tracking-wider text-slate-300">Interactive Tracker & Notes</h2>
        <div class="flex gap-2">
          <input id="itemInput" type="text" placeholder="Add new entry..." class="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white" />
          <button id="addBtn" class="px-4 py-2 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs">Add</button>
        </div>
        <div id="itemList" class="space-y-2 max-h-60 overflow-y-auto"></div>
      </section>
    </div>
  </div>

  <script>
    const valA = document.getElementById('valA');
    const valB = document.getElementById('valB');
    const valC = document.getElementById('valC');
    function recalc() {
      const a = Number(valA.value) || 0;
      const b = Number(valB.value) || 0;
      const c = Number(valC.value) || 1;
      const adjusted = a * (1 + b / 100);
      document.getElementById('calcOut').textContent = adjusted.toLocaleString(undefined, { maximumFractionDigits: 2 });
      document.getElementById('calcTotal').textContent = (adjusted * c).toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
    [valA, valB, valC].forEach(el => el.addEventListener('input', recalc));
    recalc();

    let items = [
      { id: 1, text: 'Initial workspace setup complete', done: true },
      { id: 2, text: 'Review live metrics & schedule', done: false }
    ];
    function renderItems() {
      const list = document.getElementById('itemList');
      list.innerHTML = '';
      items.forEach(it => {
        const row = document.createElement('div');
        row.className = 'flex items-center justify-between bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs';
        row.innerHTML = '<label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" ' + (it.done ? 'checked' : '') + ' /> <span class="' + (it.done ? 'line-through text-slate-500' : 'text-white') + '">' + it.text + '</span></label><button class="text-rose-400 hover:text-rose-300">Remove</button>';
        row.querySelector('input').onchange = () => { it.done = !it.done; renderItems(); };
        row.querySelector('button').onclick = () => { items = items.filter(x => x.id !== it.id); renderItems(); };
        list.appendChild(row);
      });
      const doneCount = items.filter(x => x.done).length;
      document.getElementById('liveSummary').textContent = doneCount + '/' + items.length + ' Completed';
    }
    document.getElementById('addBtn').onclick = () => {
      const input = document.getElementById('itemInput');
      if (!input.value.trim()) return;
      items.unshift({ id: Date.now(), text: input.value.trim(), done: false });
      input.value = '';
      renderItems();
    };
    renderItems();
  </script>
</body>
</html>`;
}

export function buildOfflineAdaptiveApp(prompt: string): BuiltAppPreview {
  const lower = prompt.toLowerCase();
  const isStore =
    /\b(store|shop|sell|selling|ecommerce|e-commerce|product|cart|menu|order|bakery|sneaker|watch|clothing|skincare)\b/.test(
      lower
    );
  const appTitle = prompt.trim().slice(0, 48) || (isStore ? 'ASSF Storefront' : 'ASSF Interactive App');
  if (isStore) {
    return {
      appTitle,
      summary: 'Interactive product storefront with search, category filters, shopping cart drawer, and checkout preview.',
      htmlCode: buildOfflineStorefrontHtml(prompt),
    };
  }
  return {
    appTitle,
    summary: 'Interactive live utility web app with real-time calculator, metrics panel, and task tracker.',
    htmlCode: buildOfflineUtilityAppHtml(prompt),
  };
}
