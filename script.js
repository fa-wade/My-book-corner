/* =========================================================
   NAVIGATION : on affiche/cache les sections selon le clic
   ========================================================= */
const navButtons = document.querySelectorAll('#mainNav button');
function goTo(viewName){
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + viewName).classList.add('active');
  navButtons.forEach(b => b.classList.toggle('active', b.dataset.view === viewName));
  window.scrollTo({top:0, behavior:'smooth'});
}
navButtons.forEach(btn => btn.addEventListener('click', () => goTo(btn.dataset.view)));

/* =========================================================
   OBJECTIFS (liste statique pour l'instant, coché = terminé)
   ========================================================= */
const goals = [
  {label:"Terminer mon premier chapitre", done:true},
  {label:"Développer mes personnages", done:true},
  {label:"Écrire 1000 mots par semaine", done:false},
  {label:"Créer une belle couverture", done:false},
  {label:"Publier un jour ! ♥", done:false},
];
const goalListEl = document.getElementById('goalList');
goals.forEach(g => {
  const li = document.createElement('li');
  if(g.done) li.classList.add('done');
  li.innerHTML = `<input type="checkbox" ${g.done?'checked':''} disabled> ${g.label}`;
  goalListEl.appendChild(li);
});

/* =========================================================
   MES IDEES : sauvegarde réelle avec la base de données
   de l'artifact (les idées restent là quand tu reviens)
   ========================================================= */
let db = null;
const ideaListEl = document.getElementById('ideaList');
const ideaForm = document.getElementById('ideaForm');

function renderIdeas(ideas){
  if(!ideas || ideas.length === 0){
    ideaListEl.innerHTML = '<p class="empty">Aucune idée pour le moment. Écris la première ! ✎</p>';
    return;
  }
  // les plus récentes en premier
  ideas.sort((a,b) => (b.createdAt||0) - (a.createdAt||0));
  ideaListEl.innerHTML = '';
  ideas.forEach(idea => {
    const div = document.createElement('div');
    div.className = 'idea';
    const date = idea.createdAt ? new Date(idea.createdAt).toLocaleDateString('fr-FR', {day:'numeric', month:'long', year:'numeric'}) : '';
    div.innerHTML = `
      <div class="txt">
        <h3>${escapeHtml(idea.titre)}</h3>
        <span class="tag">${escapeHtml(idea.tag||'Autre')}</span>
        <p>${escapeHtml(idea.contenu)}</p>
        <div class="date">${date}</div>
      </div>
      <button class="del" title="Supprimer" data-id="${idea.id}">✕</button>
    `;
    ideaListEl.appendChild(div);
  });
  ideaListEl.querySelectorAll('.del').forEach(btn => {
    btn.addEventListener('click', () => deleteIdea(btn.dataset.id));
  });
}

function escapeHtml(str){
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

async function initDb(){
  db = await claude.use('db');
  if(!db){
    ideaListEl.innerHTML = '<p class="empty">La sauvegarde n\'est pas disponible dans cet aperçu. Ouvre la page publiée pour que tes idées soient gardées.</p>';
    return;
  }
  // on écoute la collection "idees" en direct : dès qu'on ajoute
  // ou supprime une idée, la liste se met à jour automatiquement.
  db.collection('idees').onSnapshot((docs) => {
    const ideas = docs.map(d => ({...d.data, id: d.id}));
    renderIdeas(ideas);
  });
}
initDb();

ideaForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const titre = document.getElementById('ideaTitre').value.trim();
  const contenu = document.getElementById('ideaContenu').value.trim();
  const tag = document.getElementById('ideaTag').value;
  if(!titre || !contenu) return;

  if(!db){
    alert("La sauvegarde n'est pas disponible ici. Ouvre la version publiée du site.");
    return;
  }

  const id = 'idea_' + Date.now();
  await db.doc('idees/' + id).set({ titre, contenu, tag, createdAt: Date.now() });
  ideaForm.reset();
});

async function deleteIdea(id){
  if(!db) return;
  await db.doc('idees/' + id).delete();
}
