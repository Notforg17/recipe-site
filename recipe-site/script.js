const input = document.getElementById('ingredientsInput');
const searchBtn = document.getElementById('searchBtn');
const resultsDiv = document.getElementById('results');
const tags = document.querySelectorAll('.tag');

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

function findRecipes(userItems) {
  const found = [];

  for (const recipe of RECIPES) {
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
        Попробуй добавить больше продуктов или используй один из примеров выше.
      </div>`;
    return;
  }

  recipes.forEach(recipe => {
    const card = document.createElement('div');
    card.className = 'recipe-card';

    const matchPercent = Math.round(recipe.matchPercent * 100);
    const badgeColor = recipe.missing.length === 0 ? '#4caf50' : '#ff9800';

    let html = `
      <span class="match-badge" style="background:${badgeColor}">
        ${recipe.missing.length === 0 ? '✓ Всё есть' : `Совпадение ${matchPercent}%`}
      </span>
      <h3>${recipe.name}</h3>
      <div class="recipe-time">⏱ ${recipe.time}</div>
    `;

    if (recipe.missing.length > 0) {
      html += `<div class="missing">Нужно докупить: ${recipe.missing.join(', ')}</div>`;
    }

    html += `<ol>${recipe.steps.map(s => `<li>${s}</li>`).join('')}</ol>`;

    card.innerHTML = html;
    resultsDiv.appendChild(card);
  });
}

function search() {
  const text = input.value.trim();

  if (!text) {
    resultsDiv.innerHTML = `<div class="empty">Введи хотя бы один продукт 🍎</div>`;
    return;
  }

  const userItems = parseInput(text);
  const recipes = findRecipes(userItems);
  renderResults(recipes);
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