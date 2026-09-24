const input = document.getElementById('ingredientsInput');
const searchBtn = document.getElementById('searchBtn');
const resultsDiv = document.getElementById('results');
const tags = document.querySelectorAll('.tag');
const filterBtns = document.querySelectorAll('.filter-btn');
const randomBtn = document.getElementById('randomBtn');

let currentFilter = 'all';

function normalize(word) {
  return word
    .toLowerCase()
    .trim()
    .replace(/[.,!?]/g, '')
    .replace(/(ы|и|а|я|у|ю|е|о|ей|ов|ам|ами|ах)$/i, '');
}

function parseInput(text) {
  return text
    .split(',')
    .map(w => normalize(w))
    .filter(w => w.length > 1);
}

function getMinutes(timeStr) {
  // "1 час 30 минут" → 90
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

function findRecipes(userItems) {
  const found = [];

  for (const recipe of RECIPES) {
    if (!matchesFilter(recipe)) continue;

    const recipeIngs = recipe.ingredients.map(i => normalize(i));
    const have = recipeIngs.filter(i => userItems.includes(i));
    const missing = recipe.ingredients.filter(
      (orig, idx) => !userItems.includes(recipeIngs[idx])
    );

    const matchPercent = have.length / recipeIngs.length;

    if (matchPercent >= 0.6) {
      found.push({ ...recipe, missing, matchPercent });
    }
  }

  found.sort((a, b) => b.matchPercent - a.matchPercent);
  return found;
}

function renderResults(recipes) {
  resultsDiv.innerHTML = '';

  if (recipes.length === 0) {
    resultsDiv.innerHTML = `
      <div class="empty">
        😔 Ничего не нашли.<br>
        Попробуй добавить больше продуктов или сменить фильтр.
      </div>`;
    return;
  }

  recipes.forEach(recipe => {
    resultsDiv.appendChild(createCard(recipe));
  });
}

function createCard(recipe) {
  const card = document.createElement('div');
  card.className = 'recipe-card';

  const matchPercent = Math.round((recipe.matchPercent || 1) * 100);
  const badgeColor = !recipe.missing || recipe.missing.length === 0 ? '#4caf50' : '#ff9800';

  let html = '';
  if (recipe.matchPercent !== undefined) {
    html += `
      <span class="match-badge" style="background:${badgeColor}">
        ${recipe.missing.length === 0 ? '✓ Всё есть' : `${matchPercent}%`}
      </span>`;
  }
  html += `<h3>${recipe.name}</h3>`;
  html += `<div class="recipe-time">⏱ ${recipe.time}</div>`;

  if (recipe.missing && recipe.missing.length > 0) {
    html += `<div class="missing">Нужно докупить: ${recipe.missing.join(', ')}</div>`;
  }

  html += `<ol>${recipe.steps.map(s => `<li>${s}</li>`).join('')}</ol>`;
  html += `<button class="copy-btn" data-recipe="${recipe.name}">📋 Скопировать</button>`;

  card.innerHTML = html;

  const copyBtn = card.querySelector('.copy-btn');
  copyBtn.addEventListener('click', () => copyRecipe(recipe, copyBtn));

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

function search() {
  const text = input.value.trim();

  if (!text && currentFilter === 'all') {
    resultsDiv.innerHTML = `<div class="empty">Введи хотя бы один продукт 🍎<br>Или выбери фильтр и нажми «Случайный рецепт»</div>`;
    return;
  }

  const userItems = text ? parseInput(text) : [];
  
  // Если есть фильтр но нет ингредиентов — показываем все рецепты фильтра
  const recipes = userItems.length > 0 
    ? findRecipes(userItems)
    : RECIPES.filter(matchesFilter).map(r => ({ ...r, matchPercent: 1, missing: [] }));

  renderResults(recipes);
}

function showRandom() {
  const pool = RECIPES.filter(matchesFilter);
  if (pool.length === 0) {
    resultsDiv.innerHTML = `<div class="empty">В этой категории нет рецептов</div>`;
    return;
  }
  const random = pool[Math.floor(Math.random() * pool.length)];
  renderResults([{ ...random, matchPercent: 1, missing: [] }]);
}

searchBtn.addEventListener('click', search);

input.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') search();
});

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