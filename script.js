const input = document.getElementById('ingredientsInput');
const searchBtn = document.getElementById('searchBtn');
const resultsDiv = document.getElementById('results');
const tags = document.querySelectorAll('.tag');
const filterBtns = document.querySelectorAll('.filter-btn');
const randomBtn = document.getElementById('randomBtn');
const favoritesBtn = document.getElementById('favoritesBtn');
const favCountSpan = document.getElementById('favCount');
const shoppingBtn = document.getElementById('shoppingBtn');
const shopCountSpan = document.getElementById('shopCount');
const shoppingModal = document.getElementById('shoppingModal');
const shoppingListDiv = document.getElementById('shoppingList');
const closeShopping = document.getElementById('closeShopping');
const clearShopping = document.getElementById('clearShopping');
const themeToggle = document.getElementById('themeToggle');

// 🤖 AI
const aiBtn = document.getElementById('aiBtn');
const aiModal = document.getElementById('aiModal');
const closeAi = document.getElementById('closeAi');
const aiMessages = document.getElementById('aiMessages');
const aiInput = document.getElementById('aiInput');
const aiSend = document.getElementById('aiSend');

const WORKER_URL = 'https://lingering-tooth-00dc.jaroslav-dg.workers.dev/';

let currentFilter = 'all';

// ===== PWA =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js')
      .then((reg) => console.log('✅ SW:', reg.scope))
      .catch((err) => console.log('❌ SW:', err));
  });
}

// ===== ТЁМНАЯ ТЕМА =====
function loadTheme() {
  const saved = localStorage.getItem('recipeTheme');
  if (saved === 'dark') {
    document.body.classList.add('dark');
    themeToggle.textContent = '☀️';
  } else {
    themeToggle.textContent = '🌙';
  }
}

function toggleTheme() {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  themeToggle.textContent = isDark ? '☀️' : '🌙';
  localStorage.setItem('recipeTheme', isDark ? 'dark' : 'light');
}

// ===== ЭМОДЗИ =====
function getCategoryEmoji(category) {
  const emojis = {
    'завтрак': '🍳', 'суп': '🍲', 'второе': '🍝',
    'салат': '🥗', 'десерт': '🍰'
  };
  return emojis[category] || '🍽';
}

// ===== ИЗБРАННОЕ =====
function getFavorites() {
  try { return JSON.parse(localStorage.getItem('recipeFavorites') || '[]'); }
  catch { return []; }
}

function saveFavorites(favs) {
  localStorage.setItem('recipeFavorites', JSON.stringify(favs));
  updateFavCount();
}

function isFavorite(name) { return getFavorites().includes(name); }

function toggleFavorite(name) {
  let favs = getFavorites();
  if (favs.includes(name)) favs = favs.filter(f => f !== name);
  else favs.push(name);
  saveFavorites(favs);
}

function updateFavCount() { favCountSpan.textContent = getFavorites().length; }

// ===== ПОКУПКИ =====
function getShopping() {
  try { return JSON.parse(localStorage.getItem('recipeShopping') || '[]'); }
  catch { return []; }
}

function saveShopping(items) {
  localStorage.setItem('recipeShopping', JSON.stringify(items));
  updateShopCount();
}

function addToShopping(items) {
  const current = getShopping();
  items.forEach(item => {
    const normalized = item.toLowerCase().trim();
    if (!current.some(i => i.name.toLowerCase() === normalized)) {
      current.push({ name: item, done: false });
    }
  });
  saveShopping(current);
}

function toggleShoppingItem(index) {
  const items = getShopping();
  items[index].done = !items[index].done;
  saveShopping(items);
  renderShoppingList();
}

function removeShoppingItem(index) {
  const items = getShopping();
  items.splice(index, 1);
  saveShopping(items);
  renderShoppingList();
}

function clearAllShopping() {
  if (confirm('Очистить весь список покупок?')) {
    saveShopping([]);
    renderShoppingList();
  }
}

function updateShopCount() { shopCountSpan.textContent = getShopping().length; }

function renderShoppingList() {
  const items = getShopping();
  if (items.length === 0) {
    shoppingListDiv.innerHTML = `<div class="empty" style="padding: 20px; font-size: 15px;">Список пуст.<br>Добавляй ингредиенты кнопкой 🛒 на рецептах.</div>`;
    return;
  }
  shoppingListDiv.innerHTML = '';
  items.forEach((item, index) => {
    const div = document.createElement('div');
    div.className = 'shopping-item' + (item.done ? ' done' : '');
    div.innerHTML = `
      <input type="checkbox" ${item.done ? 'checked' : ''}>
      <span class="item-name">${item.name}</span>
      <button class="remove-item">✕</button>
    `;
    div.querySelector('input').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleShoppingItem(index);
    });
    div.querySelector('.remove-item').addEventListener('click', (e) => {
      e.stopPropagation();
      removeShoppingItem(index);
    });
    shoppingListDiv.appendChild(div);
  });
}

// ===== ПОИСК =====
function normalize(word) {
  return word.toLowerCase().trim().replace(/[.,!?]/g, '')
    .replace(/(ы|и|а|я|у|ю|е|о|ей|ов|ам|ами|ах)$/i, '');
}

function parseInput(text) {
  return text.split(',').map(w => normalize(w)).filter(w => w.length > 1);
}

function getMinutes(timeStr) {
  let total = 0;
  const hours = timeStr.match(/(\d+)\s*час/);
  const mins = timeStr.match(/(\d+)\s*мин/);
  if (hours) total += parseInt(hours[1]) * 60;
  if (mins) total += parseInt(mins[1]);
  return total;
}

function matchesFilter(recipe) {
  if (currentFilter === 'all') return true;
  if (currentFilter === 'быстрое') return getMinutes(recipe.time) <= 20;
  return recipe.category === currentFilter;
}

function findByName(query) {
  const q = query.toLowerCase().trim();
  if (q.length < 2) return [];
  return RECIPES.filter(r => r.name.toLowerCase().includes(q))
    .map(r => ({ ...r, matchPercent: 1, missing: [], byName: true }));
}

function findRecipes(userItems) {
  const found = [];
  for (const recipe of RECIPES) {
    if (!matchesFilter(recipe)) continue;
    const recipeIngs = recipe.ingredients.map(i => normalize(i));
    const have = recipeIngs.filter(i => userItems.includes(i));
    const missing = recipe.ingredients.filter((orig, idx) => !userItems.includes(recipeIngs[idx]));
    const matchPercent = have.length / recipeIngs.length;
    if (matchPercent >= 0.6) found.push({ ...recipe, missing, matchPercent });
  }
  found.sort((a, b) => b.matchPercent - a.matchPercent);
  return found;
}

// ===== ОТРИСОВКА =====
function renderResults(recipes) {
  resultsDiv.innerHTML = '';
  if (recipes.length === 0) {
    resultsDiv.innerHTML = `<div class="empty">😔 Ничего не нашли.<br>Попробуй другие продукты или название блюда.</div>`;
    return;
  }
  recipes.forEach((recipe, i) => {
    const card = createCard(recipe);
    card.style.animationDelay = `${i * 0.05}s`;
    resultsDiv.appendChild(card);
  });
}

function createCard(recipe) {
  const card = document.createElement('div');
  card.className = 'recipe-card';
  if (recipe.category) card.dataset.category = recipe.category;

  const matchPercent = Math.round((recipe.matchPercent || 1) * 100);
  let html = '';

  if (!recipe.byName && recipe.matchPercent !== undefined) {
    const badgeColor = !recipe.missing || recipe.missing.length === 0 ? '#4caf50' : '#ff9800';
    html += `<span class="match-badge" style="background:${badgeColor}">${recipe.missing.length === 0 ? '✓ Всё есть' : `${matchPercent}%`}</span>`;
  } else if (recipe.byName) {
    html += `<span class="match-badge" style="background:#667eea">🔍 По названию</span>`;
  }

  const emoji = getCategoryEmoji(recipe.category);
  html += `<h3>${emoji} ${recipe.name}</h3>`;
  html += `<div class="recipe-time">⏱ ${recipe.time}</div>`;

  if (recipe.missing && recipe.missing.length > 0) {
    html += `<div class="missing">Нужно докупить: ${recipe.missing.join(', ')}</div>`;
  }

  html += `<ol>${recipe.steps.map(s => `<li>${s}</li>`).join('')}</ol>`;

  const favActive = isFavorite(recipe.name) ? 'active' : '';
  const favText = isFavorite(recipe.name) ? '❤️ В избранном' : '🤍 В избранное';
  const missingForShopping = recipe.missing && recipe.missing.length > 0
    ? recipe.missing.join(',')
    : recipe.ingredients.join(',');

  html += `
    <div class="card-actions">
      <button class="copy-btn" data-recipe="${recipe.name}">📋 Скопировать</button>
      <button class="fav-btn ${favActive}" data-fav="${recipe.name}">${favText}</button>
      <button class="shop-btn" data-shop="${missingForShopping}">🛒 В покупки</button>
    </div>
  `;

  card.innerHTML = html;

  card.querySelector('.copy-btn').addEventListener('click', (e) => copyRecipe(recipe, e.target));
  card.querySelector('.fav-btn').addEventListener('click', (e) => {
    toggleFavorite(recipe.name);
    const btn = e.target;
    const active = isFavorite(recipe.name);
    btn.classList.toggle('active', active);
    btn.textContent = active ? '❤️ В избранном' : '🤍 В избранное';
  });
  card.querySelector('.shop-btn').addEventListener('click', (e) => {
    const items = e.target.dataset.shop.split(',').map(s => s.trim()).filter(Boolean);
    addToShopping(items);
    e.target.textContent = '✓ Добавлено!';
    setTimeout(() => { e.target.textContent = '🛒 В покупки'; }, 1500);
  });

  return card;
}

function copyRecipe(recipe, btn) {
  const text = `🍽 ${recipe.name}\n⏱ ${recipe.time}\n\nИнгредиенты:\n${recipe.ingredients.map(i => '• ' + i).join('\n')}\n\nПриготовление:\n${recipe.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = '✓ Скопировано!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = '📋 Скопировать';
      btn.classList.remove('copied');
    }, 2000);
  });
}

// ===== ЛОГИКА =====
function search() {
  const text = input.value.trim();
  if (!text && currentFilter === 'all') {
    resultsDiv.innerHTML = `<div class="empty">Введи продукты или название блюда 🍎<br>Например: «яйца, молоко» или «борщ»</div>`;
    return;
  }
  if (text) {
    const byName = findByName(text);
    if (byName.length > 0) { renderResults(byName); return; }
  }
  if (text) {
    const userItems = parseInput(text);
    if (userItems.length > 0) {
      const recipes = findRecipes(userItems);
      if (recipes.length > 0) { renderResults(recipes); return; }
    }
  }
  const fallback = RECIPES.filter(matchesFilter).map(r => ({ ...r, matchPercent: 1, missing: [] }));
  renderResults(fallback);
}

function showRandom() {
  const pool = RECIPES.filter(matchesFilter);
  if (pool.length === 0) { resultsDiv.innerHTML = `<div class="empty">В этой категории нет рецептов</div>`; return; }
  const random = pool[Math.floor(Math.random() * pool.length)];
  renderResults([{ ...random, matchPercent: 1, missing: [] }]);
}

function showFavorites() {
  const favs = getFavorites();
  if (favs.length === 0) {
    resultsDiv.innerHTML = `<div class="empty">❤️ У тебя пока нет избранных рецептов.<br><br>Нажми «🤍 В избранное» на любом рецепте.</div>`;
    return;
  }
  const recipes = RECIPES.filter(r => favs.includes(r.name)).map(r => ({ ...r, matchPercent: 1, missing: [] }));
  renderResults(recipes);
}

function openShopping() { renderShoppingList(); shoppingModal.classList.add('open'); }
function closeShoppingModal() { shoppingModal.classList.remove('open'); }

// ===== 🤖 AI-ПОМОЩНИК =====
function openAi() {
  aiModal.classList.add('open');
  setTimeout(() => aiInput.focus(), 300);
}

function closeAiModal() { aiModal.classList.remove('open'); }

function addAiMessage(text, sender) {
  const div = document.createElement('div');
  div.className = `ai-message ai-message-${sender}`;
  div.innerHTML = `<div class="ai-message-content">${text}</div>`;
  aiMessages.appendChild(div);
  aiMessages.scrollTop = aiMessages.scrollHeight;
  return div;
}

async function sendAiMessage() {
  const text = aiInput.value.trim();
  if (!text) return;

  aiInput.value = '';
  aiSend.disabled = true;

  addAiMessage(text, 'user');

  const typingDiv = addAiMessage('Думаю', 'bot');
  const typingContent = typingDiv.querySelector('.ai-message-content');
  typingContent.classList.add('typing');

  try {
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: text })
    });

    const data = await response.json();
    typingContent.classList.remove('typing');

    if (data.answer) {
      typingContent.textContent = data.answer;
    } else {
      typingContent.textContent = '😔 Ошибка: ' + (data.error || 'Не удалось получить ответ');
    }
  } catch (err) {
    typingContent.classList.remove('typing');
    typingContent.textContent = '😔 Не удалось подключиться к AI. Проверь интернет.';
  }

  aiSend.disabled = false;
  aiInput.focus();
}

// ===== СОБЫТИЯ =====
searchBtn.addEventListener('click', search);
input.addEventListener('keypress', (e) => { if (e.key === 'Enter') search(); });

tags.forEach(tag => {
  tag.addEventListener('click', () => {
    input.value = tag.dataset.items;
    search();
  });
});

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    search();
  });
});

randomBtn.addEventListener('click', showRandom);
favoritesBtn.addEventListener('click', showFavorites);
shoppingBtn.addEventListener('click', openShopping);
closeShopping.addEventListener('click', closeShoppingModal);
clearShopping.addEventListener('click', clearAllShopping);
themeToggle.addEventListener('click', toggleTheme);

shoppingModal.addEventListener('click', (e) => {
  if (e.target === shoppingModal) closeShoppingModal();
});

// 🤖 AI события
aiBtn.addEventListener('click', openAi);
closeAi.addEventListener('click', closeAiModal);
aiSend.addEventListener('click', sendAiMessage);
aiInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendAiMessage();
  }
});
aiModal.addEventListener('click', (e) => {
  if (e.target === aiModal) closeAiModal();
});

// Инициализация
loadTheme();
updateFavCount();
updateShopCount();