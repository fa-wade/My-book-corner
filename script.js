/* =========================================================
   FIREBASE : connexion à ton projet + à ta base Firestore
   ========================================================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, deleteDoc, doc,
  onSnapshot, serverTimestamp, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

// Ta config, copiée depuis la console Firebase.
const firebaseConfig = {
  apiKey: "AIzaSyDuC15nHzKcdIPOXiFFgaktSjyKbIRlXEI",
  authDomain: "my-book-corner.firebaseapp.com",
  projectId: "my-book-corner",
  storageBucket: "my-book-corner.firebasestorage.app",
  messagingSenderId: "158160979946",
  appId: "1:158160979946:web:84f786026038b16e60d493"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

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
window.goTo = goTo; // pour les onclick="goTo(...)" dans le HTML

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
   AUTHENTIFICATION : seule la personne connectée voit "Mes idées"
   ========================================================= */
const authGateEl = document.getElementById('authGate');
const ideasAreaEl = document.getElementById('ideasArea');
const authErrorEl = document.getElementById('authError');
let unsubscribeIdeas = null; // pour arrêter d'écouter Firestore à la déconnexion

document.getElementById('authLoginBtn').addEventListener('click', async () => {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  authErrorEl.textContent = '';
  try{
    await signInWithEmailAndPassword(auth, email, password);
  }catch(err){
    authErrorEl.textContent = "E-mail ou mot de passe incorrect.";
  }
});

document.getElementById('authLogoutBtn').addEventListener('click', () => {
  signOut(auth);
});

// onAuthStateChanged : Firebase nous prévient à chaque connexion/déconnexion
onAuthStateChanged(auth, (user) => {
  if(user){
    authGateEl.style.display = 'none';
    ideasAreaEl.style.display = 'block';
    startListeningIdeas();
  }else{
    authGateEl.style.display = 'grid';
    ideasAreaEl.style.display = 'none';
    if(unsubscribeIdeas){ unsubscribeIdeas(); unsubscribeIdeas = null; }
  }
});

/* =========================================================
   MES IDEES : sauvegarde réelle avec Firestore (protégée)
   ========================================================= */
const ideaListEl = document.getElementById('ideaList');
const ideaForm = document.getElementById('ideaForm');
const ideasCollection = collection(db, 'idees');

function escapeHtml(str){
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

function renderIdeas(ideas){
  if(!ideas || ideas.length === 0){
    ideaListEl.innerHTML = '<p class="empty">Aucune idée pour le moment. Écris la première ! ✎</p>';
    return;
  }
  ideaListEl.innerHTML = '';
  ideas.forEach(idea => {
    const div = document.createElement('div');
    div.className = 'idea';
    const date = idea.createdAt ? idea.createdAt.toDate().toLocaleDateString('fr-FR', {day:'numeric', month:'long', year:'numeric'}) : "à l'instant";
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

function startListeningIdeas(){
  const ideasQuery = query(ideasCollection, orderBy('createdAt', 'desc'));
  unsubscribeIdeas = onSnapshot(ideasQuery, (snapshot) => {
    const ideas = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
    renderIdeas(ideas);
  }, (error) => {
    console.error(error);
    ideaListEl.innerHTML = '<p class="empty">Erreur de connexion à la base de données.</p>';
  });
}

ideaForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const titre = document.getElementById('ideaTitre').value.trim();
  const contenu = document.getElementById('ideaContenu').value.trim();
  const tag = document.getElementById('ideaTag').value;
  if(!titre || !contenu) return;

  await addDoc(ideasCollection, {
    titre, contenu, tag,
    createdAt: serverTimestamp()
  });
  ideaForm.reset();
});

async function deleteIdea(id){
  await deleteDoc(doc(db, 'idees', id));
}