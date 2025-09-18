/* script.js */
/*
  DemoShop script
  - Renders a set of sample products
  - Provides cart functionality (add/remove/update) with localStorage persistence
  - Provides basic localStorage user auth (signup/login) with role selection (customer/retailer)
  - Implements page navigation (show/hide sections)
  - Includes filters, search, checkout simulation, and order history
*/

/* =========================
   Sample Data & Utilities
   ========================= */
const PRODUCTS = [
  // sample product array (id, name, price, image, description, category)
  {id:1, name:"Classic White Tee", price:19.99, img:"https://picsum.photos/seed/p1/600/400", desc:"Soft cotton tee, everyday essential.", category:"Clothing"},
  {id:2, name:"Blue Denim Jacket", price:79.00, img:"https://picsum.photos/seed/p2/600/400", desc:"Stylish denim jacket for cooler days.", category:"Clothing"},
  {id:3, name:"Wireless Headphones", price:129.99, img:"https://picsum.photos/seed/p3/600/400", desc:"Noise-cancelling over-ear headphones.", category:"Electronics"},
  {id:4, name:"Espresso Maker", price:89.50, img:"https://picsum.photos/seed/p4/600/400", desc:"Compact espresso machine for home.", category:"Home"},
  {id:5, name:"Stainless Water Bottle", price:24.99, img:"https://picsum.photos/seed/p5/600/400", desc:"Keeps drinks cold for 24 hours.", category:"Accessories"},
  {id:6, name:"Running Sneakers", price:69.00, img:"https://picsum.photos/seed/p6/600/400", desc:"Lightweight and comfortable.", category:"Footwear"},
  {id:7, name:"Smartwatch", price:199.99, img:"https://picsum.photos/seed/p7/600/400", desc:"Track activity, notifications and more.", category:"Electronics"},
  {id:8, name:"Decorative Lamp", price:45.00, img:"https://picsum.photos/seed/p8/600/400", desc:"Stylish lamp for living spaces.", category:"Home"},
  {id:9, name:"Travel Backpack", price:55.75, img:"https://picsum.photos/seed/p9/600/400", desc:"Durable backpack with multiple compartments.", category:"Accessories"},
  {id:10, name:"Sunglasses", price:29.99, img:"https://picsum.photos/seed/p10/600/400", desc:"UV protected sunglasses.", category:"Accessories"}
];

/* keys used in localStorage */
const LS_CART = 'demoshop_cart_v1';
const LS_USERS = 'demoshop_users_v1';
const LS_CURRENT_USER = 'demoshop_current_user_v1';
const LS_ORDERS = 'demoshop_orders_v1';

/* helper to read/write localStorage with JSON */
function lsRead(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch(e){ return fallback; }
}
function lsWrite(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/* initial setup if not present */
if (!lsRead(LS_USERS, null)) {
  // create a demo user
  lsWrite(LS_USERS, [{email:"demo@demo.com", password:"password", name:"Demo User", role:"customer"}]);
}
if (!lsRead(LS_CART, null)) lsWrite(LS_CART, []);
if (!lsRead(LS_ORDERS, null)) lsWrite(LS_ORDERS, []);

/* =========================
   Navigation & Page Logic
   ========================= */
const pages = Array.from(document.querySelectorAll('.page'));
function navigateTo(pageId) {
  pages.forEach(p => p.classList.remove('active'));
  const el = document.getElementById(pageId);
  if (el) el.classList.add('active');

  // run per-page renderers
  if (pageId === 'home') renderHome();
  if (pageId === 'products') renderProducts();
  if (pageId === 'productDetail') renderProductDetail();
  if (pageId === 'cart') renderCart();
  if (pageId === 'checkout') renderCheckout();
  if (pageId === 'account') renderAccount();
  if (pageId === 'orders') renderOrders();
  if (pageId === 'orderConfirmation') renderOrderConfirmation();
}

/* attach nav search and account link */
document.getElementById('searchBtn').addEventListener('click', () => {
  const q = document.getElementById('searchInput').value.trim();
  applySearch(q);
});
document.getElementById('searchInput').addEventListener('keyup', (e) => {
  if (e.key === 'Enter') document.getElementById('searchBtn').click();
});

/* show cart count */
function updateCartCount() {
  const cart = lsRead(LS_CART, []);
  const count = cart.reduce((s,i) => s + i.qty, 0);
  document.getElementById('cartCount').textContent = count;
}
updateCartCount();

/* =========================
   Home rendering (categories & featured)
   ========================= */
function getCategories() {
  const cats = Array.from(new Set(PRODUCTS.map(p => p.category)));
  return cats;
}

function renderHome() {
  // categories
  const catGrid = document.getElementById('categoryGrid');
  catGrid.innerHTML = '';
  getCategories().forEach(cat => {
    const div = document.createElement('div');
    div.className = 'category-card';
    div.innerHTML = `<h4>${cat}</h4><p class="muted">Shop ${cat}</p>`;
    div.onclick = () => {
      document.getElementById('categoryFilter').value = cat;
      navigateTo('products');
      applyFilters();
    };
    catGrid.appendChild(div);
  });

  // featured: pick first 4 products
  const feat = PRODUCTS.slice(0,4);
  const featGrid = document.getElementById('featuredGrid');
  featGrid.innerHTML = '';
  feat.forEach(p => {
    const card = document.createElement('article');
    card.className = 'product';
    card.innerHTML = `
      <img src="${p.img}" alt="${escapeHtml(p.name)}">
      <h4>${escapeHtml(p.name)}</h4>
      <p class="price">$${p.price.toFixed(2)}</p>
      <div style="margin-top:auto;">
        <button class="btn" onclick="openProduct(${p.id})">View</button>
        <button class="btn-outline" onclick="addToCart(${p.id},1)">Add</button>
      </div>
    `;
    featGrid.appendChild(card);
  });
}

/* =========================
   Products / Filters / Search
   ========================= */
function renderProducts(products = PRODUCTS) {
  // populate category filter options
  const categoryFilter = document.getElementById('categoryFilter');
  categoryFilter.innerHTML = '<option value="all">All Categories</option>';
  getCategories().forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat; opt.textContent = cat;
    categoryFilter.appendChild(opt);
  });

  const grid = document.getElementById('productGrid');
  grid.innerHTML = '';
  products.forEach(p => {
    const el = document.createElement('article');
    el.className = 'product';
    el.innerHTML = `
      <img src="${p.img}" alt="${escapeHtml(p.name)}">
      <h4>${escapeHtml(p.name)}</h4>
      <p class="price">$${p.price.toFixed(2)}</p>
      <div style="margin-top:auto;display:flex;gap:8px;">
        <button class="btn" onclick="openProduct(${p.id})">View</button>
        <button class="btn-outline" onclick="addToCart(${p.id},1)">Add</button>
      </div>
    `;
    grid.appendChild(el);
  });
}

/* filter function */
function applyFilters() {
  const cat = document.getElementById('categoryFilter').value;
  const price = document.getElementById('priceFilter').value;
  let results = PRODUCTS.slice();

  if (cat && cat !== 'all') results = results.filter(p => p.category === cat);
  if (price && price !== 'all') {
    const [min,max] = price.split('-').map(Number);
    results = results.filter(p => p.price >= min && p.price <= max);
  }
  renderProducts(results);
}

/* search */
function applySearch(q) {
  if (!q) {
    navigateTo('products');
    renderProducts();
    return;
  }
  const results = PRODUCTS.filter(p => (p.name + ' ' + p.desc + ' ' + p.category).toLowerCase().includes(q.toLowerCase()));
  navigateTo('products');
  renderProducts(results);
}
function resetFilters() {
  document.getElementById('categoryFilter').value = 'all';
  document.getElementById('priceFilter').value = 'all';
  renderProducts();
}

/* =========================
   Product Detail & Cart
   ========================= */
let currentProduct = null;
function openProduct(id) {
  const p = PRODUCTS.find(x => x.id === id);
  if (!p) return alert('Product not found');
  currentProduct = p;
  // fill detail page
  document.getElementById('detailImage').src = p.img;
  document.getElementById('detailName').textContent = p.name;
  document.getElementById('detailDesc').textContent = p.desc;
  document.getElementById('detailPrice').textContent = `$${p.price.toFixed(2)}`;
  document.getElementById('detailQty').value = 1;
  navigateTo('productDetail');
}

function addCurrentToCart() {
  const qty = parseInt(document.getElementById('detailQty').value) || 1;
  if (!currentProduct) return;
  addToCart(currentProduct.id, qty);
}

/* add to cart (id, qty) */
function addToCart(id, qty = 1) {
  const cart = lsRead(LS_CART, []);
  const existing = cart.find(i => i.id === id);
  if (existing) existing.qty += qty;
  else cart.push({id, qty});
  lsWrite(LS_CART, cart);
  updateCartCount();
  alert('Added to cart');
}

/* render cart page */
function renderCart() {
  const cart = lsRead(LS_CART, []);
  const container = document.getElementById('cartContainer');
  container.innerHTML = '';
  if (!cart.length) {
    container.innerHTML = '<p>Your cart is empty.</p>';
    document.getElementById('cartSummary').innerHTML = '';
    return;
  }

  cart.forEach(item => {
    const p = PRODUCTS.find(x => x.id === item.id);
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <img src="${p.img}" alt="${escapeHtml(p.name)}">
      <div class="meta">
        <h4>${escapeHtml(p.name)}</h4>
        <p class="price">$${p.price.toFixed(2)}</p>
        <div style="display:flex;gap:8px;align-items:center;margin-top:8px">
          <label>Qty <input type="number" min="1" value="${item.qty}" data-id="${item.id}" class="cart-qty" style="width:70px;padding:6px;border-radius:6px;border:1px solid #e6eefb"></label>
          <button class="btn-outline small" data-id="${item.id}" onclick="removeFromCart(${item.id})">Remove</button>
        </div>
      </div>
      <div style="text-align:right">
        <p>Item total</p>
        <p class="price">$${(p.price * item.qty).toFixed(2)}</p>
      </div>
    `;
    container.appendChild(div);
  });

  // attach quantity change listeners
  Array.from(document.querySelectorAll('.cart-qty')).forEach(input => {
    input.addEventListener('change', e => {
      const id = parseInt(e.target.dataset.id);
      const newQty = Math.max(1, parseInt(e.target.value) || 1);
      updateCartItem(id, newQty);
    });
  });

  renderCartSummary();
}

/* update cart item qty */
function updateCartItem(id, qty) {
  const cart = lsRead(LS_CART, []);
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty = qty;
  lsWrite(LS_CART, cart);
  renderCart();
  updateCartCount();
}

/* remove from cart */
function removeFromCart(id) {
  let cart = lsRead(LS_CART, []);
  cart = cart.filter(i => i.id !== id);
  lsWrite(LS_CART, cart);
  renderCart();
  updateCartCount();
}

/* clear cart */
function clearCart() {
  if (!confirm('Clear cart?')) return;
  lsWrite(LS_CART, []);
  renderCart();
  updateCartCount();
}

/* cart summary */
function renderCartSummary() {
  const cart = lsRead(LS_CART, []);
  const summary = document.getElementById('cartSummary');
  let subtotal = 0;
  cart.forEach(item => {
    const p = PRODUCTS.find(x => x.id === item.id);
    subtotal += item.qty * p.price;
  });
  const shipping = subtotal > 100 ? 0 : 6.99;
  const tax = subtotal * 0.07;
  const total = subtotal + shipping + tax;
  summary.innerHTML = `
    <div class="cart-summary">
      <p>Subtotal: $${subtotal.toFixed(2)}</p>
      <p>Shipping: $${shipping.toFixed(2)}</p>
      <p>Tax: $${tax.toFixed(2)}</p>
      <hr>
      <h3>Total: $${total.toFixed(2)}</h3>
    </div>
  `;
}

/* =========================
   Checkout & Orders
   ========================= */
function renderCheckout() {
  // fill order summary aside
  const cart = lsRead(LS_CART, []);
  const summaryEl = document.getElementById('orderSummary');
  if (!cart.length) {
    summaryEl.innerHTML = '<p>Your cart is empty. Add items before checkout.</p>';
    return;
  }
  let subtotal = 0;
  const listHtml = cart.map(item => {
    const p = PRODUCTS.find(x => x.id === item.id);
    subtotal += item.qty * p.price;
    return `<div style="display:flex;justify-content:space-between"><span>${escapeHtml(p.name)} x ${item.qty}</span><strong>$${(p.price*item.qty).toFixed(2)}</strong></div>`;
  }).join('');
  const shipping = subtotal > 100 ? 0 : 6.99;
  const tax = subtotal * 0.07;
  const total = subtotal + shipping + tax;
  summaryEl.innerHTML = `
    <div style="background:#fff;padding:12px;border-radius:10px">
      <h4>Order Summary</h4>
      ${listHtml}
      <hr>
      <p>Subtotal: $${subtotal.toFixed(2)}</p>
      <p>Shipping: $${shipping.toFixed(2)}</p>
      <p>Tax: $${tax.toFixed(2)}</p>
      <h3>Total: $${total.toFixed(2)}</h3>
    </div>
  `;
}

/* handle checkout form submit */
document.getElementById('checkoutForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const cart = lsRead(LS_CART, []);
  if (!cart.length) return alert('Your cart is empty.');

  // gather order data
  const form = e.target;
  const data = {
    id: 'ORD' + Date.now(),
    date: new Date().toISOString(),
    fullname: form.fullname.value,
    email: form.email.value,
    address: form.address.value,
    city: form.city.value,
    postal: form.postal.value,
    payment: form.payment.value,
    items: cart,
  };

  // save order to localStorage (order history)
  const orders = lsRead(LS_ORDERS, []);
  orders.push(data);
  lsWrite(LS_ORDERS, orders);

  // clear cart and show confirmation
  lsWrite(LS_CART, []);
  updateCartCount();

  // save last order id to show in confirmation page
  sessionStorage.setItem('lastOrderId', data.id);
  navigateTo('orderConfirmation');
});

/* show confirmation */
function renderOrderConfirmation() {
  const id = sessionStorage.getItem('lastOrderId') || ('ORD' + Date.now());
  document.getElementById('orderNumber').textContent = id;
}

/* show orders list */
function renderOrders() {
  const orders = lsRead(LS_ORDERS, []);
  const container = document.getElementById('ordersList');
  container.innerHTML = '';
  if (!orders.length) { container.innerHTML = '<p>No orders yet.</p>'; return; }

  orders.slice().reverse().forEach(o => {
    const el = document.createElement('div');
    el.style.background = '#fff'; el.style.padding = '12px'; el.style.borderRadius = '10px'; el.style.marginBottom = '12px';
    el.innerHTML = `
      <h4>Order ${o.id}</h4>
      <p>${new Date(o.date).toLocaleString()}</p>
      <p>${escapeHtml(o.fullname)} — ${escapeHtml(o.email)}</p>
      <div>${o.items.map(it => {
        const p = PRODUCTS.find(x => x.id === it.id);
        return `<div style="display:flex;justify-content:space-between"><span>${escapeHtml(p.name)} x ${it.qty}</span><strong>$${(p.price*it.qty).toFixed(2)}</strong></div>`;
      }).join('')}</div>
    `;
    container.appendChild(el);
  });
}

/* =========================
   Auth: Signup / Login / Logout
   ========================= */
let authMode = 'login'; // or 'signup'
const authTitle = document.getElementById('authTitle');
const signupExtras = document.getElementById('signupExtras');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const toggleAuthBtn = document.getElementById('toggleAuth');

toggleAuthBtn.addEventListener('click', () => {
  authMode = (authMode === 'login') ? 'signup' : 'login';
  updateAuthUI();
});
function updateAuthUI() {
  if (authMode === 'login') {
    authTitle.textContent = 'Login';
    signupExtras.classList.add('hidden');
    authSubmitBtn.textContent = 'Login';
    toggleAuthBtn.textContent = 'Switch to Signup';
  } else {
    authTitle.textContent = 'Signup';
    signupExtras.classList.remove('hidden');
    authSubmitBtn.textContent = 'Create Account';
    toggleAuthBtn.textContent = 'Switch to Login';
  }
}
updateAuthUI();

/* handle auth form submit */
document.getElementById('authForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const email = document.getElementById('authEmail').value.trim().toLowerCase();
  const password = document.getElementById('authPassword').value;
  if (!email || !password) return alert('Please enter email and password.');

  const users = lsRead(LS_USERS, []);
  if (authMode === 'login') {
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) return alert('Invalid credentials. Try demo@demo.com / password');
    // set current user
    lsWrite(LS_CURRENT_USER, { email: user.email, name: user.name || user.email, role: user.role });
    alert('Logged in successfully');
    renderAccount();
    navigateTo('account');
  } else {
    // signup flow
    const name = document.getElementById('signupName').value.trim() || 'Customer';
    const roleInputs = document.getElementsByName('role');
    const role = Array.from(roleInputs).find(r=>r.checked).value;
    if (users.some(u => u.email === email)) return alert('Email already registered.');
    users.push({email, password, name, role});
    lsWrite(LS_USERS, users);
    // log the user in immediately
    lsWrite(LS_CURRENT_USER, { email, name, role });
    alert('Account created and logged in.');
    renderAccount();
    navigateTo('account');
  }
});

/* render account/profile card */
function renderAccount() {
  const current = lsRead(LS_CURRENT_USER, null);
  const profile = document.getElementById('profileCard');
  if (!current) {
    profile.classList.remove('show');
    document.getElementById('accountLink').textContent = 'Login';
    return;
  }
  document.getElementById('profileName').textContent = current.name || current.email;
  document.getElementById('profileRole').textContent = current.role || 'customer';
  document.getElementById('profileEmail').textContent = current.email;
  profile.classList.add('show');
  document.getElementById('accountLink').textContent = 'Account';
}

/* logout */
function logout() {
  localStorage.removeItem(LS_CURRENT_USER);
  alert('Logged out.');
  renderAccount();
  navigateTo('home');
}

/* initialize account on load */
renderAccount();

/* =========================
   Contact form (simple)
   ========================= */
document.getElementById('contactForm').addEventListener('submit', function(e) {
  e.preventDefault();
  alert('Thanks! Your message has been received (demo).');
  e.target.reset();
});

/* =========================
   Utility functions
   ========================= */
function escapeHtml(text) {
  if (typeof text !== 'string') return text;
  return text.replace(/[&<>"'`=\/]/g, function(s){ return ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','`':'&#x60;','=':'&#x3D;'
  })[s];});
}

/* initial render */
document.addEventListener('DOMContentLoaded', () => {
  renderHome();
  renderProducts();
  updateCartCount();
  // default page
  navigateTo('home');
});

/* Expose some functions to global for inline onclick handlers */
window.navigateTo = navigateTo;
window.openProduct = openProduct;
window.addToCart = addToCart;
window.addCurrentToCart = addCurrentToCart;
window.removeFromCart = removeFromCart;
window.clearCart = clearCart;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.logout = logout;
window.navigateTo = navigateTo;
