# 🎵 Suivi Musical

PWA (Progressive Web App) en TypeScript pour suivre son temps de travail et d'entraînement musical — chronomètre de séance, calendrier mensuel, statistiques et objectifs hebdomadaires, pour un ou plusieurs instruments.

Toutes les données restent **stockées localement sur l'appareil** (localStorage) — aucune connexion, aucun compte, fonctionne hors-ligne une fois installée.

## Fonctionnalités

- ⏱️ **Chronomètre** : démarrer / mettre en pause / reprendre / terminer une séance, avec sélection de l'instrument et note optionnelle. La séance en cours résiste à un rafraîchissement de page.
- 📅 **Calendrier** : vue mensuelle avec un indicateur coloré par instrument sur les jours travaillés ; clique sur un jour pour voir/supprimer le détail des séances.
- 📊 **Statistiques** : graphique des 7 derniers jours, suivi des objectifs hebdomadaires par instrument, totaux tout-temps.
- ⚙️ **Réglages** : gestion des instruments (nom, couleur, objectif hebdo en minutes), export des données en JSON ou CSV, réinitialisation.
- 📱 **PWA installable** : fonctionne hors-ligne, installable sur mobile (Android/iOS) et sur ordinateur.

## Stack technique

- [Vite](https://vitejs.dev/) + TypeScript (vanilla, sans framework)
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) (manifest + service worker générés automatiquement, mise en cache offline)
- Aucune dépendance runtime : tout est en TypeScript/CSS natif

## Démarrer en local

```bash
npm install
npm run dev
```

L'application est disponible sur `http://localhost:5173`.

## Build de production

```bash
npm run build
npm run preview   # pour tester le build localement
```

Le résultat est généré dans `dist/`.

## Déploiement sur Vercel

Aucune configuration particulière n'est nécessaire : Vercel détecte automatiquement un projet Vite.

**Via l'interface Vercel :**
1. Pousse ce dossier sur un dépôt GitHub (ou GitLab/Bitbucket).
2. Sur [vercel.com](https://vercel.com), clique sur "Add New Project" et importe le dépôt.
3. Framework Preset : **Vite** (auto-détecté). Build Command : `npm run build`. Output Directory : `dist`.
4. Déploie — c'est tout.

**Via la CLI Vercel :**
```bash
npm i -g vercel
vercel        # déploiement de preview
vercel --prod # déploiement en production
```

## Structure du projet

```
src/
  main.ts            → point d'entrée, routage par onglets (hash routing)
  style.css           → thème sombre, mobile-first
  types.ts            → types partagés (Instrument, Session, ActiveTimer)
  storage.ts           → couche de persistance (localStorage)
  ui.ts                → modales/dialogues réutilisables
  views/
    timer.ts           → écran Chronomètre
    calendar.ts         → écran Calendrier
    stats.ts            → écran Statistiques
    settings.ts          → écran Réglages
public/
  icons/               → icônes PWA (192, 512, 512 maskable)
  favicon.svg
```

## Pistes d'évolution possibles

- Import de données (JSON) en plus de l'export
- Historique/série de jours consécutifs travaillés ("streak")
- Rappels/notifications de séance (nécessite un Service Worker avec permission de notification)
- Types de séance (gammes, répertoire, déchiffrage...) en plus de la note libre
- Synchronisation multi-appareils (nécessiterait un backend + compte)
