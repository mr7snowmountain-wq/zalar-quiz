# Zalar Farms Challenge

Quiz live multijoueur pour événement — jusqu'à **200+ joueurs**.
Web app (aucune installation) : les joueurs scannent un **QR code**, entrent un
pseudo et jouent en temps réel. L'animateur pilote depuis un **écran projeté**
(questions, timer, classement top 10, podium).

Stack : **HTML / CSS / JavaScript vanilla** + **Supabase** (Postgres + Realtime) + **GitHub Pages**.
Design : bleu nuit premium, dégradés, glow, typographie Geist.

---

## Structure

```
zalar-farms-challenge/
├── index.html            → écran JOUEUR (mobile)
├── admin.html            → écran ANIMATEUR (projeté) + QR
├── style.css             → design system
├── game.js               → moteur temps réel (joueur + animateur)
├── supabase-config.js    → 🔑 TES 2 clés Supabase (à remplir)
├── supabase-setup.sql    → script à coller UNE fois dans Supabase
├── questions.js          → ✏️ questions + mapping vidéos (facile à éditer)
└── assets/
    ├── logo.png          → 🖼️ ton logo (sinon fallback texte auto)
    ├── fonts/            → Geist (embarquées)
    ├── vendor/           → supabase-js + qrcode (embarqués, aucune dépendance CDN)
    └── videos/           → 🎬 intro.mp4, video_1.mp4 … outro.mp4
```

---

## Mise en route

### 1. Créer le projet Supabase
1. https://supabase.com → **New project** (région **Europe**, ex. *Frankfurt* — RGPD).
2. Attends que le projet soit prêt (~2 min).

### 2. Lancer le script SQL (une seule fois)
1. Dans Supabase : menu **SQL Editor** → **New query**.
2. Colle **tout** le contenu de `supabase-setup.sql` → **Run**.
   (Crée les tables, le temps réel et les fonctions. Relançable sans risque.)

### 3. Renseigner les 2 clés
Supabase → ⚙️ **Project Settings → API** :
- **Project URL** → `SUPABASE_URL`
- **anon public** → `SUPABASE_ANON_KEY`

Colle-les dans **`supabase-config.js`**. *(Ces clés sont publiques, aucun risque.)*

### 4. Ajouter tes contenus
- `questions.js` → valide/corrige les questions + le mapping vidéos.
- `assets/logo.png` → ton logo (sinon logo texte auto).
- `assets/videos/` → tes MP4 (`intro.mp4`, `video_1.mp4`, …, `outro.mp4`).

### 5. Tester en local
Sers le dossier (les pages doivent être servies en `http://`, pas ouvertes en `file://`) :
```bash
python -m http.server 8000        # puis ouvre http://localhost:8000/admin.html
```
Ouvre `admin.html` sur le PC et `index.html` sur des téléphones/onglets pour simuler des joueurs.

### 6. Déployer sur GitHub Pages
1. Crée un dépôt GitHub, mets-y le contenu de ce dossier (glisser-déposer via github.com marche).
2. **Settings → Pages** → Source : branche `main`, dossier `/root` → **Save**.
3. GitHub te donne l'URL `https://<user>.github.io/<repo>/`.
   - Joueurs : `…/index.html` (c'est ce QR qu'affiche l'admin).
   - Animateur : `…/admin.html` sur l'écran projeté.

---

## Déroulé d'une partie (animateur)

1. **Lobby** — le QR s'affiche, les joueurs rejoignent (visibles en direct). **Démarrer**.
2. **Intro** — vidéo plein écran.
3. **Question** — énoncé + grand timer. Auto-révélation à la fin du chrono, ou **Révéler**.
4. **Révélation** — répartition des réponses + bonne réponse + **classement top 10**.
5. **Question suivante** → vidéo de transition → question suivante.
6. Dernière question → **Voir le podium** → vidéo outro → **podium top 3**.
   **Terminer** disponible à tout moment ; **Rejouer** remet les scores à zéro.

**Scoring** : bonne réponse = 500 pts + jusqu'à 500 pts de bonus vitesse (max 1000/question).

---

## À valider avant l'événement

- **Questions** : le QCM de `questions.js` a été **reconstruit depuis l'Excel fourni** (brut/incomplet). Vérifie tout ce qui est marqué `À CONFIRMER` (Q2 effectifs, Q3 % femmes, Q11 audits, Q12 référentiel — valeurs manquantes).
- **Vidéos** : ajoute les MP4 (sinon fallback écran noir + logo, sans plantage).
- **Logo** : `assets/logo.png`.
- **Répétition** : tester à ~200 connexions simulées avant le jour J.

## Réglages (`game.js`, objet `CONFIG`)

| Réglage | Défaut | Effet |
|---|---|---|
| `defaultDuration` | 30 | Secondes par question (surchargeable par `q.duration`) |
| `basePoints` / `speedBonus` | 500 / 500 | Barème du scoring |
| `topN` | 10 | Taille du classement |
| `pollMs` | 1200 | Fréquence de lecture de l'état côté joueur (ms) |
| `playVideoOnPlayers` | `false` | `false` = les joueurs voient « Regarde l'écran » (vidéo au projecteur). `true` = vidéo aussi sur les téléphones. |

## Pourquoi ça tient 200 joueurs (offre gratuite)

Les téléphones **n'ouvrent pas 200 connexions temps réel permanentes** (ce qui saturerait
l'offre gratuite) : ils **lisent l'état du jeu toutes les ~1,2 s** via l'API. Seul l'écran
animateur utilise le temps réel. Résultat : que vous soyez 50 ou 220, ça ne sature pas.
