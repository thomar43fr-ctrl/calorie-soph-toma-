// ============================================================
//  APP.JS — Logique principale
// ============================================================

// ── État global ──────────────────────────────────────────────
const STATE = {
  currentTab: 'dashboard',
  currentDate: getTodayStr(),
  profiles: {
    toma: { name: 'Toma', weight: 75, height: 178, age: 28, activity: 1.55, gender: 'male' },
    soph: { name: 'Soph', weight: 60, height: 165, age: 26, activity: 1.375, gender: 'female' }
  },
  todayData: { toma: null, soph: null },
  meals: { toma: [], soph: [] },
  customIngredients: [],
  allRecipes: [],
  mealDraft: { person: 'both', name: '', ingredients: [], photo: null, recipe: '' },
  activityDraft: { person: 'toma', name: '', kcal: 0, steps: 0 },
};

// ── Utilitaires ──────────────────────────────────────────────
function getTodayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function generateId() {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function formatDate(str) {
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

// ── Calcul calories (Mifflin-St Jeor) ───────────────────────
function calcBMR(profile) {
  const { weight, height, age, gender } = profile;
  if (gender === 'male') {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    return 10 * weight + 6.25 * height - 5 * age - 161;
  }
}

function calcTDEE(profile) {
  return Math.round(calcBMR(profile) * profile.activity);
}

// ── Firebase helpers ─────────────────────────────────────────
async function loadProfiles() {
  try {
    const doc = await db.collection('app').doc('profiles').get();
    if (doc.exists) {
      const data = doc.data();
      if (data.toma) STATE.profiles.toma = { ...STATE.profiles.toma, ...data.toma };
      if (data.soph) STATE.profiles.soph = { ...STATE.profiles.soph, ...data.soph };
    }
  } catch (e) { console.warn('Profils non chargés:', e); }
}

async function saveProfiles() {
  try {
    await db.collection('app').doc('profiles').set({
      toma: STATE.profiles.toma,
      soph: STATE.profiles.soph
    });
  } catch (e) { console.error('Erreur sauvegarde profils:', e); }
}

async function loadDayData(person, date) {
  try {
    const doc = await db.collection('days').doc(`${person}_${date}`).get();
    if (doc.exists) return doc.data();
    return { meals: [], activities: [], steps: 0, water: 0 };
  } catch (e) {
    return { meals: [], activities: [], steps: 0, water: 0 };
  }
}

async function saveDayData(person, date, data) {
  try {
    await db.collection('days').doc(`${person}_${date}`).set(data);
  } catch (e) { console.error('Erreur sauvegarde journée:', e); }
}

async function loadRecipes() {
  try {
    const snap = await db.collection('recipes').get();
    const userRecipes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    STATE.allRecipes = [
      ...SUGGESTED_RECIPES.map(r => ({ ...r, source: 'suggested' })),
      ...userRecipes.map(r => ({ ...r, source: 'user' }))
    ];
  } catch (e) {
    STATE.allRecipes = SUGGESTED_RECIPES.map(r => ({ ...r, source: 'suggested' }));
  }
}

async function saveRecipe(recipe) {
  try {
    await db.collection('recipes').doc(recipe.id).set(recipe);
  } catch (e) { console.error('Erreur sauvegarde recette:', e); }
}

async function loadCustomIngredients() {
  try {
    const doc = await db.collection('app').doc('ingredients').get();
    if (doc.exists) STATE.customIngredients = doc.data().list || [];
  } catch (e) { STATE.customIngredients = []; }
}

async function saveCustomIngredients() {
  try {
    await db.collection('app').doc('ingredients').set({ list: STATE.customIngredients });
  } catch (e) { console.error('Erreur sauvegarde ingrédients:', e); }
}

function getAllIngredients() {
  return [...INGREDIENTS_DB, ...STATE.customIngredients];
}

// ── Upload photo Firebase Storage ────────────────────────────
async function uploadPhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const base64 = e.target.result;
        const ref = storage.ref(`photos/${generateId()}`);
        await ref.putString(base64, 'data_url');
        const url = await ref.getDownloadURL();
        resolve(url);
      } catch (err) {
        // Fallback: stocker en base64 directement
        resolve(e.target.result);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Chargement données du jour ───────────────────────────────
async function loadTodayForBoth() {
  const date = STATE.currentDate;
  STATE.todayData.toma = await loadDayData('toma', date);
  STATE.todayData.soph = await loadDayData('soph', date);
}

function getPersonCaloriesEaten(person) {
  const data = STATE.todayData[person];
  if (!data || !data.meals) return 0;
  return data.meals.reduce((sum, m) => sum + (m.totalKcal || 0), 0);
}

function getPersonCaloriesBurned(person) {
  const data = STATE.todayData[person];
  if (!data) return 0;
  const tdee = calcTDEE(STATE.profiles[person]);
  const activityKcal = (data.activities || []).reduce((s, a) => s + (a.kcal || 0), 0);
  const stepsKcal = Math.round((data.steps || 0) * 0.04);
  return tdee + activityKcal + stepsKcal;
}

// ── Rendu Dashboard ──────────────────────────────────────────
function renderDashboard() {
  const container = document.getElementById('tab-dashboard');
  const date = formatDate(STATE.currentDate);

  const personHTML = (person) => {
    const profile = STATE.profiles[person];
    const eaten = getPersonCaloriesEaten(person);
    const allowed = getPersonCaloriesBurned(person);
    const pct = Math.min(100, Math.round((eaten / allowed) * 100));
    const remaining = allowed - eaten;
    const data = STATE.todayData[person] || {};
    const water = data.water || 0;
    const steps = data.steps || 0;
    const waterPct = Math.min(100, Math.round((water / 2500) * 100));
    const color = person === 'toma' ? 'var(--accent-toma)' : 'var(--accent-soph)';
    const statusColor = pct > 100 ? '#ff6b6b' : pct > 85 ? '#ffa94d' : 'var(--success)';

    return `
      <div class="profile-card" data-person="${person}">
        <div class="profile-card-header">
          <div class="profile-avatar" style="background:${color}">${profile.name[0]}</div>
          <div class="profile-card-info">
            <h2>${profile.name}</h2>
            <span class="profile-stats-inline">${profile.weight}kg · ${profile.height}cm · ${profile.age}ans</span>
          </div>
          <button class="btn-icon" onclick="openEditProfile('${person}')" title="Modifier profil">✏️</button>
        </div>

        <div class="calorie-gauge-wrap">
          <div class="gauge-label">
            <span>Calories</span>
            <span style="color:${statusColor}">${eaten} / ${allowed} kcal</span>
          </div>
          <div class="gauge-bar">
            <div class="gauge-fill" style="width:${pct}%;background:${statusColor}"></div>
          </div>
          <div class="gauge-sub">
            <span>${pct}% consommé</span>
            <span>${remaining > 0 ? remaining + ' kcal restantes' : Math.abs(remaining) + ' kcal dépassées'}</span>
          </div>
        </div>

        <div class="stats-row">
          <div class="stat-box">
            <span class="stat-icon">💧</span>
            <div class="stat-value">${water} ml</div>
            <div class="gauge-bar mini"><div class="gauge-fill" style="width:${waterPct}%;background:#4dabf7"></div></div>
            <div class="stat-label">Eau / 2500ml</div>
            <div class="stat-actions">
              <button class="btn-sm" onclick="addWater('${person}', 500)">+500ml</button>
              <button class="btn-sm outline" onclick="openAddWater('${person}')">Autre</button>
            </div>
          </div>
          <div class="stat-box">
            <span class="stat-icon">👟</span>
            <div class="stat-value">${steps.toLocaleString('fr-FR')}</div>
            <div class="stat-label">Pas aujourd'hui</div>
            <div class="stat-actions">
              <button class="btn-sm outline" onclick="openAddSteps('${person}')">Mettre à jour</button>
            </div>
          </div>
        </div>

        <div class="meals-today">
          <div class="section-label">Repas du jour</div>
          ${(data.meals || []).length === 0
            ? '<p class="empty-hint">Aucun repas enregistré</p>'
            : (data.meals || []).map(m => `
              <div class="meal-chip">
                ${m.photo ? `<img src="${m.photo}" class="meal-thumb" alt="">` : '<span class="meal-thumb-placeholder">🍽</span>'}
                <div class="meal-chip-info">
                  <span class="meal-chip-name">${m.name}</span>
                  <span class="meal-chip-kcal">${m.totalKcal} kcal</span>
                </div>
                <button class="btn-icon-sm" onclick="deleteMeal('${person}', '${m.id}')">🗑</button>
              </div>`).join('')
          }
        </div>

        <div class="activities-today">
          <div class="section-label">Activité du jour</div>
          ${(data.activities || []).length === 0
            ? '<p class="empty-hint">Aucune activité enregistrée</p>'
            : (data.activities || []).map(a => `
              <div class="activity-chip">
                <span>🏃 ${a.name}</span>
                <span class="chip-kcal">-${a.kcal} kcal</span>
                <button class="btn-icon-sm" onclick="deleteActivity('${person}', '${a.id}')">🗑</button>
              </div>`).join('')
          }
        </div>

        <div class="quick-actions">
          <button class="btn-primary" onclick="openAddMeal('${person}')">+ Repas</button>
          <button class="btn-secondary" onclick="openAddActivity('${person}')">+ Activité</button>
        </div>
      </div>`;
  };

  container.innerHTML = `
    <div class="dashboard-date">
      <button class="btn-nav" onclick="changeDate(-1)">‹</button>
      <span>${date}</span>
      <button class="btn-nav" onclick="changeDate(1)" ${STATE.currentDate === getTodayStr() ? 'disabled' : ''}>›</button>
      ${STATE.currentDate !== getTodayStr() ? `<button class="btn-today" onclick="goToToday()">Aujourd'hui</button>` : ''}
    </div>
    <div class="profiles-grid">
      ${personHTML('toma')}
      ${personHTML('soph')}
    </div>`;
}

// ── Rendu Ingrédients ────────────────────────────────────────
function renderIngredients() {
  const container = document.getElementById('tab-ingredients');
  const existingSearch = document.getElementById('ing-search');

  // Si la page n'est pas encore construite, on la construit complètement
  if (!existingSearch) {
    container.innerHTML = `
      <div class="section-header">
        <h2>Ingrédients</h2>
        <button class="btn-primary" onclick="openAddIngredient()">+ Ajouter</button>
      </div>
      <div class="search-filter-row">
        <input id="ing-search" type="text" placeholder="Rechercher un ingrédient..." class="input-search">
        <select id="ing-filter" class="input-select">
          <option value="all">Toutes catégories</option>
          ${INGREDIENT_CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
      </div>
      <div id="ing-list" class="ing-list"></div>`;

    document.getElementById('ing-search').addEventListener('input', renderIngList);
    document.getElementById('ing-filter').addEventListener('change', renderIngList);
  }

  renderIngList();
}

function renderIngList() {
  const search = document.getElementById('ing-search')?.value?.toLowerCase() || '';
  const filterCat = document.getElementById('ing-filter')?.value || 'all';
  const all = getAllIngredients();

  const filtered = all.filter(i => {
    const matchSearch = i.name.toLowerCase().includes(search);
    const matchCat = filterCat === 'all' || i.category === filterCat;
    return matchSearch && matchCat;
  });

  const byCategory = {};
  filtered.forEach(i => {
    if (!byCategory[i.category]) byCategory[i.category] = [];
    byCategory[i.category].push(i);
  });

  const categoriesHTML = Object.entries(byCategory).map(([cat, items]) => `
    <div class="ing-category-group">
      <div class="ing-category-title">${cat}</div>
      ${items.map(i => `
        <div class="ing-row">
          <span class="ing-name">${i.name}</span>
          <span class="ing-kcal">${i.kcal} kcal/100g</span>
          ${STATE.customIngredients.find(ci => ci.id === i.id)
            ? `<button class="btn-icon-sm danger" onclick="deleteCustomIngredient('${i.id}')">🗑</button>`
            : ''}
        </div>`).join('')}
    </div>`).join('');

  const listEl = document.getElementById('ing-list');
  if (listEl) listEl.innerHTML = filtered.length === 0 ? '<p class="empty-hint">Aucun ingrédient trouvé</p>' : categoriesHTML;
}

// ── Rendu Recettes ───────────────────────────────────────────
function renderRecipes() {
  const container = document.getElementById('tab-recipes');
  const activeTab = container.dataset.subtab || 'mine';
  const myRecipes = STATE.allRecipes.filter(r => r.source === 'user');
  const suggested = STATE.allRecipes.filter(r => r.source === 'suggested');
  const list = activeTab === 'mine' ? myRecipes : suggested;

  const recipeCard = (r) => {
    const stars = Array.from({ length: 5 }, (_, i) =>
      `<span class="star ${i < (r.rating || 0) ? 'filled' : ''}" onclick="rateRecipe('${r.id}', ${i + 1})">★</span>`
    ).join('');
    return `
      <div class="recipe-card">
        ${r.photo ? `<img src="${r.photo}" class="recipe-img" alt="${r.name}">` : '<div class="recipe-img-placeholder">🍳</div>'}
        <div class="recipe-body">
          <div class="recipe-title">${r.name}</div>
          <div class="recipe-meta">${r.category || ''} · ${r.kcalPerServing || '?'} kcal/pers · ${r.prepTime || '?'} prep</div>
          <div class="recipe-stars">${stars}</div>
          ${r.tags ? `<div class="recipe-tags">${r.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>` : ''}
          <div class="recipe-actions">
            <button class="btn-sm" onclick="openRecipeDetail('${r.id}')">Voir</button>
            ${r.source === 'user' ? `<button class="btn-sm danger" onclick="deleteRecipe('${r.id}')">Supprimer</button>` : ''}
          </div>
        </div>
      </div>`;
  };

  container.innerHTML = `
    <div class="section-header">
      <h2>Recettes</h2>
      <button class="btn-primary" onclick="openAddRecipe()">+ Créer</button>
    </div>
    <div class="subtab-row">
      <button class="subtab-btn ${activeTab === 'mine' ? 'active' : ''}" onclick="switchRecipeTab('mine')">Mes recettes (${myRecipes.length})</button>
      <button class="subtab-btn ${activeTab === 'suggested' ? 'active' : ''}" onclick="switchRecipeTab('suggested')">Proposées (${suggested.length})</button>
    </div>
    <div class="recipes-grid">
      ${list.length === 0 ? '<p class="empty-hint">Aucune recette ici</p>' : list.map(recipeCard).join('')}
    </div>`;
}

// ── Rendu Historique ─────────────────────────────────────────
async function renderHistory() {
  const container = document.getElementById('tab-history');
  container.innerHTML = '<p class="loading">Chargement...</p>';

  try {
    const snap = await db.collection('days').get();
    const days = {};
    snap.docs.forEach(doc => {
      const [person, date] = doc.id.split('_');
      if (!days[date]) days[date] = {};
      days[date][person] = doc.data();
    });

    const sortedDates = Object.keys(days).sort((a, b) => b.localeCompare(a));

    if (sortedDates.length === 0) {
      container.innerHTML = '<p class="empty-hint" style="padding:2rem">Aucun historique disponible</p>';
      return;
    }

    const html = sortedDates.map(date => {
      const dayData = days[date];
      const personRow = (person) => {
        const data = dayData[person];
        if (!data) return '';
        const meals = data.meals || [];
        const kcal = meals.reduce((s, m) => s + (m.totalKcal || 0), 0);
        const activities = data.activities || [];
        const actKcal = activities.reduce((s, a) => s + (a.kcal || 0), 0);
        const profile = STATE.profiles[person];
        const color = person === 'toma' ? 'var(--accent-toma)' : 'var(--accent-soph)';
        return `
          <div class="history-person-row">
            <span class="history-avatar" style="background:${color}">${profile.name[0]}</span>
            <div class="history-person-data">
              <span class="history-person-name">${profile.name}</span>
              <div class="history-chips">
                <span class="hchip">🍽 ${kcal} kcal</span>
                <span class="hchip">🏃 ${actKcal} kcal brûlées</span>
                <span class="hchip">👟 ${(data.steps || 0).toLocaleString('fr-FR')} pas</span>
                <span class="hchip">💧 ${data.water || 0} ml</span>
              </div>
            </div>
          </div>`;
      };
      return `
        <div class="history-day-card">
          <div class="history-day-title">${formatDate(date)}</div>
          ${personRow('toma')}
          ${personRow('soph')}
        </div>`;
    }).join('');

    container.innerHTML = `<div class="section-header"><h2>Historique</h2></div><div class="history-list">${html}</div>`;
  } catch (e) {
    container.innerHTML = '<p class="empty-hint">Erreur chargement historique</p>';
  }
}

async function goToToday() {
  STATE.currentDate = getTodayStr();
  await loadTodayForBoth();
  renderDashboard();
}

// ── Navigation ───────────────────────────────────────────────
function switchTab(tab) {
  STATE.currentTab = tab;
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
  document.getElementById(`tab-${tab}`)?.classList.add('active');
  document.querySelector(`.nav-btn[data-tab="${tab}"]`)?.classList.add('active');

  if (tab === 'dashboard') renderDashboard();
  else if (tab === 'ingredients') renderIngredients();
  else if (tab === 'recipes') renderRecipes();
  else if (tab === 'history') renderHistory();
}

function switchRecipeTab(subtab) {
  const container = document.getElementById('tab-recipes');
  container.dataset.subtab = subtab;
  renderRecipes();
}

async function changeDate(delta) {
  const [y, m, d] = STATE.currentDate.split('-').map(Number);
  const date = new Date(y, m - 1, d + delta);
  const newY = date.getFullYear();
  const newM = String(date.getMonth() + 1).padStart(2, '0');
  const newD = String(date.getDate()).padStart(2, '0');
  const newDate = `${newY}-${newM}-${newD}`;
  if (newDate > getTodayStr()) return;
  STATE.currentDate = newDate;
  await loadTodayForBoth();
  renderDashboard();
}

// ── Modals ───────────────────────────────────────────────────
function showModal(html) {
  const overlay = document.getElementById('modal-overlay');
  overlay.innerHTML = `<div class="modal">${html}</div>`;
  overlay.classList.add('active');
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  }, { once: true });
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('active');
}

// ── Modal : Modifier profil ──────────────────────────────────
function openEditProfile(person) {
  const p = STATE.profiles[person];
  const color = person === 'toma' ? 'var(--accent-toma)' : 'var(--accent-soph)';
  showModal(`
    <div class="modal-header" style="border-color:${color}">
      <h3>Modifier le profil de ${p.name}</h3>
      <button class="btn-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <label>Prénom</label>
      <input id="p-name" type="text" value="${p.name}" class="input-field">
      <label>Poids (kg)</label>
      <input id="p-weight" type="number" value="${p.weight}" min="30" max="300" class="input-field">
      <label>Taille (cm)</label>
      <input id="p-height" type="number" value="${p.height}" min="100" max="250" class="input-field">
      <label>Âge</label>
      <input id="p-age" type="number" value="${p.age}" min="10" max="100" class="input-field">
      <label>Genre</label>
      <select id="p-gender" class="input-select">
        <option value="male" ${p.gender === 'male' ? 'selected' : ''}>Homme</option>
        <option value="female" ${p.gender === 'female' ? 'selected' : ''}>Femme</option>
      </select>
      <label>Niveau d'activité</label>
      <select id="p-activity" class="input-select">
        <option value="1.2" ${p.activity == 1.2 ? 'selected' : ''}>Sédentaire (peu/pas de sport)</option>
        <option value="1.375" ${p.activity == 1.375 ? 'selected' : ''}>Légèrement actif (1-3j/semaine)</option>
        <option value="1.55" ${p.activity == 1.55 ? 'selected' : ''}>Modérément actif (3-5j/semaine)</option>
        <option value="1.725" ${p.activity == 1.725 ? 'selected' : ''}>Très actif (6-7j/semaine)</option>
        <option value="1.9" ${p.activity == 1.9 ? 'selected' : ''}>Extrêmement actif</option>
      </select>
      <div class="tdee-preview" id="tdee-preview">
        Calories journalières estimées : <strong>${calcTDEE(p)} kcal</strong>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn-primary" onclick="saveProfile('${person}')">Enregistrer</button>
    </div>`);

  // Mise à jour en direct du TDEE
  ['p-weight', 'p-height', 'p-age', 'p-gender', 'p-activity'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => {
      const preview = {
        weight: +document.getElementById('p-weight').value,
        height: +document.getElementById('p-height').value,
        age: +document.getElementById('p-age').value,
        gender: document.getElementById('p-gender').value,
        activity: +document.getElementById('p-activity').value,
      };
      document.getElementById('tdee-preview').innerHTML =
        `Calories journalières estimées : <strong>${calcTDEE(preview)} kcal</strong>`;
    });
  });
}

async function saveProfile(person) {
  STATE.profiles[person] = {
    ...STATE.profiles[person],
    name: document.getElementById('p-name').value.trim() || STATE.profiles[person].name,
    weight: +document.getElementById('p-weight').value,
    height: +document.getElementById('p-height').value,
    age: +document.getElementById('p-age').value,
    gender: document.getElementById('p-gender').value,
    activity: +document.getElementById('p-activity').value,
  };
  await saveProfiles();
  closeModal();
  renderDashboard();
}

// ── Modal : Ajouter repas ────────────────────────────────────
function openAddMeal(personPreset = 'both') {
  STATE.mealDraft = { person: personPreset, name: '', ingredients: [], photo: null, recipe: '' };
  renderMealModal();
}

function renderMealModal() {
  const d = STATE.mealDraft;
  const ingredientRows = d.ingredients.map((ing, idx) => `
    <div class="ing-meal-row">
      <span class="ing-meal-name">${ing.name}</span>
      <span class="ing-meal-kcal">${Math.round(ing.kcal * ing.grams / 100)} kcal</span>
      <input type="number" value="${ing.grams}" min="1" max="2000" class="input-grams"
        onchange="updateIngredientGrams(${idx}, this.value)">g
      <button class="btn-icon-sm danger" onclick="removeIngredient(${idx})">✕</button>
    </div>`).join('');

  const totalKcal = d.ingredients.reduce((s, i) => s + Math.round(i.kcal * i.grams / 100), 0);

  showModal(`
    <div class="modal-header">
      <h3>Ajouter un repas</h3>
      <button class="btn-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <label>Pour qui ?</label>
      <div class="person-toggle">
        <button class="toggle-btn ${d.person === 'toma' ? 'active' : ''}" onclick="setMealPerson('toma')">Toma</button>
        <button class="toggle-btn ${d.person === 'soph' ? 'active' : ''}" onclick="setMealPerson('soph')">Soph</button>
        <button class="toggle-btn ${d.person === 'both' ? 'active' : ''}" onclick="setMealPerson('both')">Les deux ÷2</button>
      </div>

      <label>Nom du plat</label>
      <input id="meal-name" type="text" placeholder="Ex: Pâtes bolognaise" value="${d.name}" class="input-field"
        oninput="STATE.mealDraft.name = this.value">

      <label>Photo du plat (optionnelle)</label>
      <div class="photo-upload-area" onclick="document.getElementById('meal-photo-input').click()">
        ${d.photo
          ? `<img src="${d.photo}" class="photo-preview" alt="photo plat">`
          : '<span>📷 Ajouter une photo</span>'}
      </div>
      <input id="meal-photo-input" type="file" accept="image/*" capture="environment" style="display:none"
        onchange="handleMealPhoto(this)">

      <label>Ingrédients</label>
      <div class="ing-search-meal">
        <input id="ing-search-meal" type="text" placeholder="Rechercher un ingrédient..." class="input-search"
          oninput="renderIngSearchResults()">
        <div id="ing-search-results" class="ing-search-dropdown"></div>
      </div>
      <div id="meal-ingredients-list" class="meal-ing-list">
        ${ingredientRows}
      </div>
      ${d.ingredients.length > 0
        ? `<div class="meal-total">Total : <strong>${totalKcal} kcal</strong>${d.person === 'both' ? ` (${Math.round(totalKcal / 2)} kcal chacun)` : ''}</div>`
        : ''}

      <label>Recette (optionnelle)</label>
      <textarea id="meal-recipe" class="input-textarea" placeholder="Étapes de la recette..."
        oninput="STATE.mealDraft.recipe = this.value">${d.recipe}</textarea>
    </div>
    <div class="modal-footer">
      <button class="btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn-primary" onclick="saveMeal()">Enregistrer</button>
    </div>`);

  renderIngSearchResults();
}

function renderIngSearchResults() {
  const query = document.getElementById('ing-search-meal')?.value?.toLowerCase() || '';
  const resultsEl = document.getElementById('ing-search-results');
  if (!resultsEl) return;
  if (!query) { resultsEl.innerHTML = ''; return; }

  const matches = getAllIngredients()
    .filter(i => i.name.toLowerCase().includes(query))
    .slice(0, 8);

  resultsEl.innerHTML = matches.map(i => `
    <div class="ing-result-item" onclick="addIngredientToMeal('${i.id}')">
      <span>${i.name}</span>
      <span class="ing-kcal-hint">${i.kcal} kcal/100g</span>
    </div>`).join('') || '<div class="ing-result-item muted">Aucun résultat</div>';
}

function addIngredientToMeal(ingId) {
  const ing = getAllIngredients().find(i => i.id === ingId);
  if (!ing) return;
  STATE.mealDraft.ingredients.push({ ...ing, grams: 100 });
  document.getElementById('ing-search-meal').value = '';
  renderMealModal();
}

function updateIngredientGrams(idx, val) {
  STATE.mealDraft.ingredients[idx].grams = Math.max(1, parseInt(val) || 1);
}

function removeIngredient(idx) {
  STATE.mealDraft.ingredients.splice(idx, 1);
  renderMealModal();
}

function setMealPerson(person) {
  STATE.mealDraft.person = person;
  renderMealModal();
}

async function handleMealPhoto(input) {
  if (!input.files[0]) return;
  showToast('Upload en cours...');
  const url = await uploadPhoto(input.files[0]);
  STATE.mealDraft.photo = url;
  renderMealModal();
}

async function saveMeal() {
  const d = STATE.mealDraft;
  if (!d.name.trim()) { showToast('Donne un nom au repas !'); return; }
  if (d.ingredients.length === 0) { showToast('Ajoute au moins un ingrédient'); return; }

  const totalKcal = d.ingredients.reduce((s, i) => s + Math.round(i.kcal * i.grams / 100), 0);
  const meal = {
    id: generateId(),
    name: d.name.trim(),
    ingredients: d.ingredients,
    totalKcal,
    photo: d.photo || null,
    recipe: d.recipe,
    time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  };

  const savePerson = async (person, kcalOverride) => {
    const data = STATE.todayData[person] || { meals: [], activities: [], steps: 0, water: 0 };
    data.meals = data.meals || [];
    const mealToSave = kcalOverride !== undefined ? { ...meal, totalKcal: kcalOverride } : meal;
    data.meals.push(mealToSave);
    STATE.todayData[person] = data;
    await saveDayData(person, STATE.currentDate, data);
  };

  if (d.person === 'both') {
    await savePerson('toma', Math.round(totalKcal / 2));
    await savePerson('soph', Math.round(totalKcal / 2));
  } else {
    await savePerson(d.person);
  }

  // Sauvegarder comme recette si elle a une recette écrite
  if (d.recipe.trim()) {
    const newRecipe = {
      id: generateId(),
      name: d.name.trim(),
      category: 'Plat principal',
      servings: d.person === 'both' ? 2 : 1,
      kcalPerServing: d.person === 'both' ? Math.round(totalKcal / 2) : totalKcal,
      photo: d.photo || null,
      ingredients: d.ingredients.map(i => ({ name: i.name, quantity: i.grams, unit: 'g' })),
      steps: d.recipe.split('\n').filter(l => l.trim()),
      tags: [],
      rating: 0,
      source: 'user',
    };
    STATE.allRecipes.push(newRecipe);
    await saveRecipe(newRecipe);
  }

  closeModal();
  renderDashboard();
  showToast('Repas enregistré ✓');
}

async function deleteMeal(person, mealId) {
  const data = STATE.todayData[person];
  if (!data) return;
  data.meals = data.meals.filter(m => m.id !== mealId);
  await saveDayData(person, STATE.currentDate, data);
  renderDashboard();
}

// ── Modal : Ajouter activité ─────────────────────────────────
function openAddActivity(personPreset = 'toma') {
  showModal(`
    <div class="modal-header">
      <h3>Ajouter une activité</h3>
      <button class="btn-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <label>Pour qui ?</label>
      <div class="person-toggle">
        <button class="toggle-btn active" id="act-btn-toma" onclick="selectActivityPerson('toma')">Toma</button>
        <button class="toggle-btn" id="act-btn-soph" onclick="selectActivityPerson('soph')">Soph</button>
        <button class="toggle-btn" id="act-btn-both" onclick="selectActivityPerson('both')">Les deux</button>
      </div>
      <label>Type d'activité</label>
      <input id="act-name" type="text" placeholder="Ex: Natation, Vélo, Yoga..." class="input-field">
      <label>Calories brûlées (kcal)</label>
      <input id="act-kcal" type="number" placeholder="Ex: 300" min="0" max="3000" class="input-field">
      <div class="quick-activities">
        <span class="label-small">Rapide :</span>
        <button class="tag" onclick="fillActivity('Course à pied', 300)">Course 300</button>
        <button class="tag" onclick="fillActivity('Vélo', 250)">Vélo 250</button>
        <button class="tag" onclick="fillActivity('Natation', 350)">Natation 350</button>
        <button class="tag" onclick="fillActivity('Muscu', 200)">Muscu 200</button>
        <button class="tag" onclick="fillActivity('Yoga', 150)">Yoga 150</button>
        <button class="tag" onclick="fillActivity('Marche', 150)">Marche 150</button>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn-primary" onclick="saveActivity()">Enregistrer</button>
    </div>`);

  selectActivityPerson(personPreset);
}

function selectActivityPerson(person) {
  STATE.activityDraft.person = person;
  ['toma', 'soph', 'both'].forEach(p => {
    document.getElementById(`act-btn-${p}`)?.classList.toggle('active', p === person);
  });
}

function fillActivity(name, kcal) {
  document.getElementById('act-name').value = name;
  document.getElementById('act-kcal').value = kcal;
}

async function saveActivity() {
  const name = document.getElementById('act-name').value.trim();
  const kcal = parseInt(document.getElementById('act-kcal').value) || 0;
  const person = STATE.activityDraft.person;
  if (!name) { showToast('Indique le type d\'activité'); return; }

  const activity = { id: generateId(), name, kcal };
  const addTo = async (p) => {
    const data = STATE.todayData[p] || { meals: [], activities: [], steps: 0, water: 0 };
    data.activities = [...(data.activities || []), activity];
    STATE.todayData[p] = data;
    await saveDayData(p, STATE.currentDate, data);
  };

  if (person === 'both') { await addTo('toma'); await addTo('soph'); }
  else await addTo(person);

  closeModal();
  renderDashboard();
  showToast('Activité enregistrée ✓');
}

async function deleteActivity(person, actId) {
  const data = STATE.todayData[person];
  if (!data) return;
  data.activities = data.activities.filter(a => a.id !== actId);
  await saveDayData(person, STATE.currentDate, data);
  renderDashboard();
}

// ── Eau ──────────────────────────────────────────────────────
async function addWater(person, ml) {
  const data = STATE.todayData[person] || { meals: [], activities: [], steps: 0, water: 0 };
  data.water = (data.water || 0) + ml;
  STATE.todayData[person] = data;
  await saveDayData(person, STATE.currentDate, data);
  renderDashboard();
}

function openAddWater(person) {
  showModal(`
    <div class="modal-header">
      <h3>Ajouter de l'eau — ${STATE.profiles[person].name}</h3>
      <button class="btn-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <label>Quantité (ml)</label>
      <input id="water-amount" type="number" placeholder="Ex: 250" min="1" max="5000" class="input-field">
      <div class="quick-activities">
        <button class="tag" onclick="document.getElementById('water-amount').value=150">Expresso 150</button>
        <button class="tag" onclick="document.getElementById('water-amount').value=250">Verre 250</button>
        <button class="tag" onclick="document.getElementById('water-amount').value=330">Canette 330</button>
        <button class="tag" onclick="document.getElementById('water-amount').value=500">Bouteille 500</button>
        <button class="tag" onclick="document.getElementById('water-amount').value=750">Grande 750</button>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn-primary" onclick="confirmAddWater('${person}')">Ajouter</button>
    </div>`);
}

async function confirmAddWater(person) {
  const ml = parseInt(document.getElementById('water-amount').value) || 0;
  if (ml <= 0) { showToast('Entre une quantité valide'); return; }
  closeModal();
  await addWater(person, ml);
  showToast(`+${ml} ml ajoutés ✓`);
}

// ── Pas ──────────────────────────────────────────────────────
function openAddSteps(person) {
  const current = STATE.todayData[person]?.steps || 0;
  showModal(`
    <div class="modal-header">
      <h3>Nombre de pas — ${STATE.profiles[person].name}</h3>
      <button class="btn-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <label>Total de pas aujourd'hui</label>
      <input id="steps-input" type="number" value="${current}" min="0" max="100000" class="input-field">
      <p class="hint-text">Environ ${Math.round(current * 0.04)} kcal supplémentaires brûlées</p>
    </div>
    <div class="modal-footer">
      <button class="btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn-primary" onclick="saveSteps('${person}')">Enregistrer</button>
    </div>`);

  document.getElementById('steps-input').addEventListener('input', function () {
    const hint = document.querySelector('.hint-text');
    if (hint) hint.textContent = `Environ ${Math.round(+this.value * 0.04)} kcal supplémentaires brûlées`;
  });
}

async function saveSteps(person) {
  const steps = parseInt(document.getElementById('steps-input').value) || 0;
  const data = STATE.todayData[person] || { meals: [], activities: [], steps: 0, water: 0 };
  data.steps = steps;
  STATE.todayData[person] = data;
  await saveDayData(person, STATE.currentDate, data);
  closeModal();
  renderDashboard();
  showToast('Pas mis à jour ✓');
}

// ── Modal : Ajouter ingrédient ───────────────────────────────
function openAddIngredient() {
  showModal(`
    <div class="modal-header">
      <h3>Ajouter un ingrédient</h3>
      <button class="btn-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <label>Nom</label>
      <input id="new-ing-name" type="text" placeholder="Ex: Tempeh" class="input-field">
      <label>Calories (kcal pour 100g)</label>
      <input id="new-ing-kcal" type="number" placeholder="Ex: 192" min="0" max="1000" class="input-field">
      <label>Catégorie</label>
      <select id="new-ing-cat" class="input-select">
        ${INGREDIENT_CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}
      </select>
    </div>
    <div class="modal-footer">
      <button class="btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn-primary" onclick="saveCustomIngredient()">Ajouter</button>
    </div>`);
}

async function saveCustomIngredient() {
  const name = document.getElementById('new-ing-name').value.trim();
  const kcal = parseInt(document.getElementById('new-ing-kcal').value);
  const category = document.getElementById('new-ing-cat').value;
  if (!name || isNaN(kcal)) { showToast('Remplis tous les champs'); return; }

  const newIng = { id: 'custom_' + generateId(), name, kcal, category };
  STATE.customIngredients.push(newIng);
  await saveCustomIngredients();
  closeModal();
  renderIngredients();
  showToast('Ingrédient ajouté ✓');
}

async function deleteCustomIngredient(id) {
  STATE.customIngredients = STATE.customIngredients.filter(i => i.id !== id);
  await saveCustomIngredients();
  renderIngredients();
}

// ── Modal : Créer recette ────────────────────────────────────
function openAddRecipe() {
  showModal(`
    <div class="modal-header">
      <h3>Créer une recette</h3>
      <button class="btn-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <label>Nom de la recette</label>
      <input id="rec-name" type="text" placeholder="Ex: Gratin dauphinois" class="input-field">
      <label>Catégorie</label>
      <select id="rec-cat" class="input-select">
        <option>Petit-déjeuner</option>
        <option>Entrée</option>
        <option selected>Plat principal</option>
        <option>Dessert</option>
        <option>Collation</option>
        <option>Autre</option>
      </select>
      <label>Nombre de portions</label>
      <input id="rec-servings" type="number" value="2" min="1" max="20" class="input-field">
      <label>Temps de préparation</label>
      <input id="rec-prep" type="text" placeholder="Ex: 15 min" class="input-field">
      <label>Temps de cuisson</label>
      <input id="rec-cook" type="text" placeholder="Ex: 30 min" class="input-field">
      <label>Calories par portion (kcal)</label>
      <input id="rec-kcal" type="number" placeholder="Ex: 450" min="0" class="input-field">
      <label>Étapes / recette</label>
      <textarea id="rec-steps" class="input-textarea" placeholder="1. Préchauffer le four...&#10;2. Mélanger..."></textarea>
      <label>Tags (séparés par des virgules)</label>
      <input id="rec-tags" type="text" placeholder="Ex: végétarien, rapide, sans gluten" class="input-field">
    </div>
    <div class="modal-footer">
      <button class="btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn-primary" onclick="saveNewRecipe()">Créer</button>
    </div>`);
}

async function saveNewRecipe() {
  const name = document.getElementById('rec-name').value.trim();
  if (!name) { showToast('Donne un nom à la recette'); return; }

  const recipe = {
    id: generateId(),
    name,
    category: document.getElementById('rec-cat').value,
    servings: +document.getElementById('rec-servings').value || 2,
    prepTime: document.getElementById('rec-prep').value.trim(),
    cookTime: document.getElementById('rec-cook').value.trim(),
    kcalPerServing: +document.getElementById('rec-kcal').value || 0,
    steps: document.getElementById('rec-steps').value.split('\n').filter(l => l.trim()),
    tags: document.getElementById('rec-tags').value.split(',').map(t => t.trim()).filter(Boolean),
    rating: 0,
    photo: null,
    source: 'user',
  };

  STATE.allRecipes.push(recipe);
  await saveRecipe(recipe);
  closeModal();
  renderRecipes();
  showToast('Recette créée ✓');
}

// ── Détail recette ───────────────────────────────────────────
function openRecipeDetail(recipeId) {
  const r = STATE.allRecipes.find(rec => rec.id === recipeId);
  if (!r) return;
  const stars = Array.from({ length: 5 }, (_, i) =>
    `<span class="star ${i < (r.rating || 0) ? 'filled' : ''}" onclick="rateRecipeInDetail('${r.id}', ${i + 1})" style="font-size:1.5rem">★</span>`
  ).join('');

  showModal(`
    <div class="modal-header">
      <h3>${r.name}</h3>
      <button class="btn-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      ${r.photo ? `<img src="${r.photo}" style="width:100%;border-radius:8px;margin-bottom:1rem">` : ''}
      <div class="recipe-detail-meta">
        <span>🍽 ${r.servings || 1} portions</span>
        <span>⏱ ${r.prepTime || '?'} + ${r.cookTime || '?'}</span>
        <span>🔥 ${r.kcalPerServing || '?'} kcal/pers</span>
      </div>
      <div class="recipe-stars" style="margin:0.75rem 0">${stars}</div>
      ${r.ingredients ? `
        <h4>Ingrédients</h4>
        <ul class="recipe-ing-list">
          ${r.ingredients.map(i => `<li>${i.name} — ${i.quantity}${i.unit || 'g'}</li>`).join('')}
        </ul>` : ''}
      ${r.steps && r.steps.length ? `
        <h4>Préparation</h4>
        <ol class="recipe-steps-list">
          ${r.steps.map(s => `<li>${s}</li>`).join('')}
        </ol>` : ''}
      ${r.tags ? `<div class="recipe-tags" style="margin-top:0.75rem">${r.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>` : ''}
    </div>
    <div class="modal-footer">
      <button class="btn-secondary" onclick="closeModal()">Fermer</button>
      <button class="btn-primary" onclick="closeModal(); openAddMeal('both')">Ajouter comme repas</button>
    </div>`);
}

function rateRecipeInDetail(id, rating) {
  rateRecipe(id, rating);
  openRecipeDetail(id);
}

async function rateRecipe(id, rating) {
  const recipe = STATE.allRecipes.find(r => r.id === id);
  if (!recipe) return;
  recipe.rating = rating;
  if (recipe.source === 'user') await saveRecipe(recipe);
  if (STATE.currentTab === 'recipes') renderRecipes();
}

async function deleteRecipe(id) {
  try {
    await db.collection('recipes').doc(id).delete();
  } catch (e) { console.warn('Erreur suppression:', e); }
  STATE.allRecipes = STATE.allRecipes.filter(r => r.id !== id);
  renderRecipes();
  showToast('Recette supprimée');
}

// ── Toast ────────────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('visible');
  setTimeout(() => t.classList.remove('visible'), 2500);
}

// ── Init ─────────────────────────────────────────────────────
async function init() {
  document.getElementById('loading-screen').classList.remove('hidden');
  try {
    await loadProfiles();
    await loadTodayForBoth();
    await loadRecipes();
    await loadCustomIngredients();
  } catch (e) {
    console.error('Erreur init:', e);
  }
  document.getElementById('loading-screen').classList.add('hidden');
  switchTab('dashboard');

  // Navigation
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

window.addEventListener('DOMContentLoaded', init);
