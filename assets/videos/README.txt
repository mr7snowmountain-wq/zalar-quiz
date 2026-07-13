VIDÉOS D'ANIMATION — Zalar Farms Challenge
==========================================

Dépose ici tes vidéos MP4 (H.264, 1080p, muettes de préférence).

Fichiers attendus (le nom exact est configurable dans ../../questions.js) :

  intro.mp4        → jouée AVANT la 1re question
  video_1.mp4      → jouée APRÈS la question 1 (avant la 2)
  video_2.mp4      → jouée APRÈS la question 2 (avant la 3)
  ...              → une par transition
  outro.mp4        → jouée AVANT le podium final

Notes :
- Si un fichier manque → écran noir + logo (aucun plantage), l'animateur
  clique simplement sur "Passer la vidéo".
- object-fit: cover + muted autoplay pour la compatibilité mobile.
- Tu peux réutiliser une seule vidéo de transition pour toutes les questions :
  laisse un seul chemin dans le tableau VIDEOS.transitions de questions.js.
