/* =============================================================================
   ZALAR FARMS CHALLENGE — Questions & médias
   -----------------------------------------------------------------------------
   ✏️  CE FICHIER EST FAIT POUR ÊTRE ÉDITÉ FACILEMENT.
   Pour chaque question :
     - question : l'énoncé affiché
     - answers  : EXACTEMENT 4 propositions
     - correct  : index (0,1,2,3) de la bonne réponse dans `answers`
     - duration : (optionnel) durée en secondes, sinon 30s par défaut

   ⚠️  QCM RECONSTRUIT À PARTIR DU FICHIER EXCEL FOURNI (brut/incomplet).
       Les réponses marquées « À CONFIRMER » sont des hypothèses ou des valeurs
       manquantes dans le fichier source — À VALIDER PAR ZALAR avant l'événement.
   ============================================================================= */

const QUESTIONS = [
  {
    // Excel Q1 — 8 produits étaient listés (Agrumes, Amandes, Myrtille, Avocat,
    // Datte, Pomme, Caroube, Asperges) → réponse déduite = 8.
    question: "Combien de produits Zalar Farms produit-il ?",
    answers: ["6", "7", "8", "9"],
    correct: 2, // 8 (confirmé)
    note: "Les 8 produits : Agrumes, Amandes, Myrtille, Avocat, Datte, Pomme, Caroube, Asperges.",
    waitVideo: "https://pub-2bdca0e0bf5a48ef98bdf868a8e77139.r2.dev/VIDEO%20Q1.mp4",
  },
  {
    // Excel Q2 — valeur ABSENTE du fichier source.
    question: "Quelle est la moyenne mensuelle des effectifs du Groupe ?",
    answers: ["Environ 3 000", "Environ 5 000", "Environ 7 000", "Environ 10 000"],
    correct: 0, // ⚠️ À CONFIRMER — valeur manquante dans le fichier source
  },
  {
    // Excel Q3 — valeur ABSENTE du fichier source.
    question: "Quel est le pourcentage de femmes dans l'effectif du Groupe ?",
    answers: ["73 %", "83 %", "93 %"],
    correct: 1, // 83 % (confirmé)
    waitVideo: "https://pub-2bdca0e0bf5a48ef98bdf868a8e77139.r2.dev/VIDEO%20Q4.mp4",
  },
  {
    // Excel Q4 — 7 produits commercialisés listés → réponse déduite = 7.
    question: "Combien de produits Zalar Farms commercialise-t-il ?",
    answers: ["5", "6", "7", "8"],
    correct: 2, // 7 (confirmé)
    note: "Les 7 produits commercialisés : Agrumes, Amandes, Myrtille, Avocat, Datte, Pomme, Asperges.",
    waitVideo: "https://pub-2bdca0e0bf5a48ef98bdf868a8e77139.r2.dev/VIDEO%20Q4%20VRAI.mp4",
  },
  {
    // Excel Q5 — réponse "4" (marchés : Brésil, Maldives, Nigéria, Indonésie).
    question: "Combien de nouveaux marchés Zalar Farms a-t-il développés ?",
    answers: ["2", "3", "4", "5"],
    correct: 2, // 4
  },
  {
    // Excel Q6 — réponse "7".
    question: "À combien de salons Zalar Farms a-t-il participé la saison précédente ?",
    answers: ["5", "6", "7", "8"],
    correct: 2, // 7
  },
  {
    // Excel Q7 — réponse "3" (3ᵉ place).
    question: "Quelle est la place de Zalar Farms dans l'exportation des dattes ?",
    answers: ["1ʳᵉ", "2ᵉ", "3ᵉ", "4ᵉ"],
    correct: 2, // 3e
  },
  {
    // Excel Q8 — réponse "Excellence".
    question: "Le « E » de OSER correspond à…",
    answers: ["Excellence", "Engagement", "Esprit d'équipe", "Éthique"],
    correct: 0, // Excellence
  },
  {
    // Excel Q9 — réponse "8".
    question: "Combien de managers ont participé au cycle de Management ?",
    answers: ["6", "8", "10", "12"],
    correct: 1, // 8
  },
  {
    // Excel Q10 — réponse "15".
    question: "Sur combien de référentiels les sites du Groupe sont-ils audités ?",
    answers: ["10", "12", "15", "18"],
    correct: 2, // 15
  },
  {
    // Excel Q11 — valeur ABSENTE du fichier source.
    question: "Combien d'audits sont réalisés sur une saison ?",
    answers: ["48", "56", "64", "72"],
    correct: 2, // 64 (confirmé)
  },
  {
    // Excel Q12 — options : Halal / IFS Food / Bio. Bonne réponse ambiguë.
    question: "Quel est le dernier référentiel selon lequel un site a été audité ?",
    answers: ["Halal", "IFS Food", "Bio", "GlobalG.A.P."],
    correct: 0, // Halal (confirmé)
    note: "Les référentiels cités : Halal, IFS Food, Bio.",
  },
  {
    // Question d'ambiance — placée à la fin.
    question: "Combien de Soukaina y a-t-il dans la salle ?",
    answers: ["2", "3", "4", "5"],
    correct: 2, // 4
  },
];

/* =============================================================================
   VIDÉOS — placées dans assets/videos/
   -----------------------------------------------------------------------------
   - intro        : jouée UNE fois avant la 1ʳᵉ question
   - transitions  : jouée APRÈS chaque question (entre la question i et i+1).
                    L'app prend transitions[i]. S'il n'y en a pas assez, la
                    dernière est réutilisée. Si le fichier n'existe pas →
                    écran noir + logo (fallback automatique).
   - outro        : jouée avant le podium final

   Nomme tes fichiers comme tu veux, mets juste le bon chemin ici.
   ============================================================================= */

// URL publique du bucket Cloudflare R2 — change UNIQUEMENT cette ligne si le bucket bouge.
const VIDEO_BASE = "https://pub-2bdca0e0bf5a48ef98bdf868a8e77139.r2.dev";

const VIDEOS = {
  intro: `${VIDEO_BASE}/intro.mp4`,
  outro: `${VIDEO_BASE}/outro.mp4`,
  transitions: [
    `${VIDEO_BASE}/video_1.mp4`,
    `${VIDEO_BASE}/video_2.mp4`,
    `${VIDEO_BASE}/video_3.mp4`,
    `${VIDEO_BASE}/video_4.mp4`,
    `${VIDEO_BASE}/video_5.mp4`,
    `${VIDEO_BASE}/video_6.mp4`,
    `${VIDEO_BASE}/video_7.mp4`,
    `${VIDEO_BASE}/video_8.mp4`,
    `${VIDEO_BASE}/video_9.mp4`,
    `${VIDEO_BASE}/video_10.mp4`,
    `${VIDEO_BASE}/video_11.mp4`,
  ],
};

// Intro : PNG transparent animé en CSS (pas une vidéo).
const INTRO_IMAGE = `${VIDEO_BASE}/ZALAR%20intro%201.png`;

// Exposé globalement (chargé via <script>, pas de modules ES).
window.QUESTIONS = QUESTIONS;
window.VIDEOS = VIDEOS;
window.INTRO_IMAGE = INTRO_IMAGE;
