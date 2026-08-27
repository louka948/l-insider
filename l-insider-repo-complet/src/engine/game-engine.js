// ---------------------------------------------------------------------------
// Moteur de jeu — extrait de imposteurfoot_11.html (Étape 4 du plan de
// remise en ordre de l'architecture). Contenu inchangé, seulement déplacé :
// aucune règle ni logique n'a été modifiée pendant cette extraction.
//
// JS classique, pas de JSX, ZÉRO dépendance à React : catégories/époques/
// modes/questions (config), algorithme d'appariement (scorePair/pickPair),
// filtrage par catégorie (playersForCategory), calcul des points, chrono,
// mélange aléatoire. Dépend seulement des données de data/players.js
// (PLAYERS, LEAGUES), chargé juste avant dans le <head>.
//
// Testable indépendamment de React/du DOM (aucune fonction ici ne lit ni
// n'écrit un état de composant) — bon candidat pour de vrais tests unitaires
// si le projet en a besoin un jour.
// ---------------------------------------------------------------------------

const CATEGORIES = [
  { id: "LIBRE", label: "Libre" },
  { id: "GK", label: "Gardiens" },
  { id: "DEF", label: "Défenseurs" },
  { id: "MID", label: "Milieux" },
  { id: "ATT", label: "Attaquants" },
  { id: "BO", label: "Ballon d'Or" },
  { id: "LEGEND", label: "Légendes" },
  { id: "COACH", label: "Coach" },
  { id: "CLUB", label: "Championnat" },
];

// Tranches de 20 ans — un joueur est inclus s'il a joué au moins une
// décennie à l'intérieur de la tranche.
const ERA_OPTIONS = [
  { id: "ALL", label: "Toutes époques", from: 0, to: 9999 },
  { id: "1960", label: "1960-1980", from: 1960, to: 1980 },
  { id: "1980", label: "1980-2000", from: 1980, to: 2000 },
  { id: "2000", label: "2000-2020", from: 2000, to: 2020 },
  { id: "2020", label: "2020+", from: 2020, to: 9999 },
];

function playerInEra(p, era) {
  if (era.id === "ALL") return true;
  return p.e.some((decade) => decade >= era.from && decade < era.to);
}

// Filtre par époque spécifique à la catégorie "Ballon d'Or" : contrairement
// à playerInEra() (basé sur les décennies d'ACTIVITÉ, champ `e`), celui-ci
// se base sur l'année réelle du sacre (champ `bo`, voir BALLON_DOR_YEARS
// dans data/players.js). Sans ça, un joueur encore en activité pendant une
// décennie donnée remontait dans le filtre "Ballon d'Or" de cette décennie
// même s'il avait gagné le trophée bien avant (ex. Zidane 1998 et Weah
// 1995 remontaient dans "2000-2020" juste parce que leur carrière
// débordait sur les années 2000).
function playerBOInEra(p, era) {
  if (era.id === "ALL") return true;
  if (!p.bo) return false;
  return p.bo.some((year) => year >= era.from && year < era.to);
}

function playersForCategory(cat, club) {
  if (cat === "GK" || cat === "DEF" || cat === "MID" || cat === "ATT") return PLAYERS.filter((p) => p.p === cat);
  if (cat === "BO") return PLAYERS.filter((p) => p.b);
  if (cat === "LEGEND") return PLAYERS.filter((p) => p.l && p.p !== "COACH");
  if (cat === "COACH") return PLAYERS.filter((p) => p.co);
  // On exclut les purs entraîneurs (jamais joueurs pro suivis dans nos
  // données) : sinon un coach associé à un club sans avoir jamais joué là
  // se retrouvait mélangé aux vrais joueurs.
  // Le paramètre "club" contient en réalité un nom de CHAMPIONNAT (La Liga,
  // Premier League, etc.) — le pool mélange tous les clubs de ce championnat
  // plutôt qu'un seul club précis, pour élargir le pool de joueurs.
  if (cat === "CLUB") {
    if (!club) return [];
    const league = LEAGUES.find((l) => l.name === club);
    if (!league) return [];
    return PLAYERS.filter((p) => league.clubs.includes(p.cl) && p.p !== "COACH");
  }
  return PLAYERS.filter((p) => p.p !== "COACH");
}

function eraOverlap(e1, e2) {
  return e1.filter((x) => e2.includes(x)).length;
}

function scorePair(a, b) {
  let s = 0;
  if (a.p === b.p) s += 3;
  // Sous-poste (rôle réel : latéral/axial, milieu défensif/relayeur/meneur,
  // ailier/avant-centre...) — voir data/players.js pour le détail des
  // valeurs. Pesé plus lourd que le poste large : un latéral doit
  // ressembler d'abord à un autre latéral, pas juste à "un défenseur".
  // Condition sur sp truthy des deux côtés : évite un faux match si jamais
  // l'un des deux profils n'a pas de sp défini (ne devrait pas arriver,
  // mais on ne veut pas que deux undefined comptent comme "pareils").
  if (a.sp && b.sp && a.sp === b.sp) s += 4;
  s += eraOverlap(a.e, b.e);
  // Pénalité de longueur de carrière : sert de repère (imparfait mais
  // objectif) de "calibre"/expérience — un jeune espoir tagué sur une
  // seule décennie (ex. Endrick) n'a pas le même vécu qu'un vétéran
  // couvrant 3 décennies (ex. Cavani), même quand leur décennie commune
  // matche. Sans ça, un jeune loup pouvait finir apparié à un cadre
  // confirmé juste parce que les deux jouent avant-centre à la même
  // période récente.
  s -= 0.6 * Math.abs(a.e.length - b.e.length);
  if (a.c === b.c) s += 1;
  // Statut Ballon d'Or : signal de calibre le plus fiable qu'on ait dans
  // les données (contrairement à `l`/légende, trop appliqué en pratique
  // pour distinguer un GOAT généraliste — voir ci-dessous). Repassé de
  // 0.5 à 3 : l'ancien poids était noyé par poste/sous-poste/époque et ne
  // faisait aucune différence dans le classement (ex. Messi/Ribéry
  // scorait pareil que Messi/Ronaldinho malgré l'écart de calibre).
  if (a.b === b.b) s += 3;
  // Statut légende : signal plus grossier que Ballon d'Or (un joueur peut
  // être une légende de club sans avoir jamais été sacré, ex. Ribéry) —
  // pondéré plus léger, en complément plutôt qu'en remplacement.
  if (a.l === b.l) s += 1.5;
  // Palier "GOAT" (voir GOAT_TIER dans data/players.js) : un tout petit
  // groupe de joueurs considérés au-dessus de tous les autres (Messi,
  // Ronaldo, Maradona, Pelé, Cruyff, Zidane, Ronaldinho...). Bonus énorme,
  // volontairement disproportionné par rapport au reste du score : deux
  // GOAT doivent finir appariés entre eux même quand ils ne partagent ni
  // époque ni sous-poste (ex. Messi/Maradona), et jamais avec un joueur
  // hors de ce palier tant qu'un partenaire GOAT est disponible dans le
  // pool. Demande explicite utilisateur : "Messi devrait apparaître
  // seulement avec les goat type Ronaldo Maradona Pelé".
  if (a.g && b.g) s += 20;
  return s;
}

// Compose un duo à la volée : on choisit un joueur au hasard dans la
// catégorie, on cherche des partenaires au profil proche, puis on tire
// parmi les meilleurs candidats — jamais toujours le même partenaire.
// On évite aussi de retomber sur un duo déjà tiré cette session.
function pickPair(pool, usedKeys) {
  for (let attempt = 0; attempt < 30; attempt++) {
    const anchor = pool[Math.floor(Math.random() * pool.length)];
    let candidates = pool.filter((p) => p.n !== anchor.n);
    // Palier "GOAT" (voir GOAT_TIER dans data/players.js / le bonus dans
    // scorePair ci-dessus) : le gros bonus de score suffit presque
    // toujours à faire remonter un autre GOAT en tête, mais pour garantir
    // "jamais avec un non-GOAT tant qu'un GOAT est disponible" (demande
    // explicite utilisateur) on restreint aussi le pool de candidats en
    // dur, dans les deux sens — sinon un non-GOAT pourrait occasionnellement
    // "remonter" un GOAT comme partenaire depuis son propre point de vue.
    if (anchor.g) {
      const goatCandidates = candidates.filter((p) => p.g);
      if (goatCandidates.length > 0) candidates = goatCandidates;
    } else {
      const nonGoatCandidates = candidates.filter((p) => !p.g);
      if (nonGoatCandidates.length > 0) candidates = nonGoatCandidates;
    }
    const scored = candidates
      .map((p) => ({ p, s: scorePair(anchor, p) }))
      .sort((a, b) => b.s - a.s);
    if (scored.length === 0) continue;
    const topN = scored.slice(0, Math.min(8, scored.length));
    const partner = topN[Math.floor(Math.random() * topN.length)].p;
    const key = [anchor.n, partner.n].sort().join("|");
    if (!usedKeys.has(key)) return { a: anchor, b: partner, key };
  }
  const anchor = pool[Math.floor(Math.random() * pool.length)];
  const others = pool.filter((p) => p.n !== anchor.n);
  const partner = others[Math.floor(Math.random() * others.length)];
  return { a: anchor, b: partner, key: [anchor.n, partner.n].sort().join("|") };
}

// ---------------------------------------------------------------------------
// Banque de questions pour les modes "Questions par tour" et "Mode libre"
// ---------------------------------------------------------------------------
const QUESTION_BANK = [
  { t: "Est-ce que ton joueur a déjà gagné un Ballon d'Or ?", phys: false },
  { t: "Est-ce que ton joueur a été champion du monde en équipe nationale ?", phys: false },
  { t: "Est-ce que ton joueur a joué dans plus de 3 grands championnats européens ?", phys: false },
  { t: "Est-ce que ton joueur a déjà porté le brassard de capitaine ?", phys: false },
  { t: "Est-ce que ton joueur a remporté la Ligue des Champions ?", phys: false },
  { t: "Est-ce que ton joueur joue (ou jouait) à un poste offensif ?", phys: false },
  { t: "Est-ce que ton joueur a joué pour un club français ?", phys: false },
  { t: "Est-ce que ton joueur est toujours en activité aujourd'hui ?", phys: false },
  { t: "Est-ce que ton joueur a porté un numéro emblématique (7, 9, 10...) ?", phys: false },
  { t: "Est-ce que ton joueur a déjà joué en Premier League ?", phys: false },
  { t: "Est-ce que ton joueur est considéré comme une légende de son club ?", phys: false },
  { t: "Est-ce que ton joueur est originaire d'Amérique du Sud ?", phys: false },
  { t: "Est-ce que ton joueur a marqué en finale d'une grande compétition ?", phys: false },
  { t: "Est-ce que ton joueur a évolué dans un seul grand club toute sa carrière ?", phys: false },
  { t: "Est-ce que ton joueur a déjà été élu meilleur joueur d'un tournoi ?", phys: false },
  { t: "Est-ce que ton joueur a un style de jeu plutôt physique sur le terrain ?", phys: false },
  { t: "Est-ce que ton joueur mesure plus d'1m85 ?", phys: true },
  { t: "Est-ce que ton joueur a une silhouette plutôt fine ?", phys: true },
];

const GAME_MODES = [
  { id: "clue", label: "Indices classiques", desc: "Chacun donne un indice sur son joueur" },
  { id: "turns", label: "Questions par tour", desc: "Ordre défini, une question chacun" },
  { id: "freestyle", label: "Mode libre", desc: "Chacun questionne qui il veut" },
];

// Lien vers un formulaire externe (ex: Tally, tally.so) pour recueillir les
// emails de ceux qui veulent être prévenus des nouveautés — proposé de façon
// optionnelle en fin de partie, jamais bloquant. Laisser vide ("") masque
// complètement le bloc tant qu'aucun formulaire n'est configuré.
const NEWSLETTER_URL = "";

// URL partagée par le bouton "Partager avec tes potes" en fin de partie (voir
// EndScreen.jsx). Contrairement à NEWSLETTER_URL, celle-ci est déjà
// renseignée par défaut : le jeu est jouable directement depuis cette page
// (single-file HTML), donc c'est un lien de partage prêt à l'emploi, sans
// dépendre d'une publication sur les stores. Recommandation marketing du
// 26 août 2026 : exploiter la viralité de groupe déjà intégrée au jeu (un
// seul téléphone qui circule entre amis pendant une soirée) plutôt que
// d'attendre la publication store pour avoir un mécanisme de partage.
const SHARE_URL = "https://astonishing-gaufre-e894c1.netlify.app";

// Durées proposées pour le chrono de discussion (en secondes).
const TIMER_OPTIONS = [
  { id: 60, label: "1 min" },
  { id: 90, label: "1 min 30" },
  { id: 120, label: "2 min" },
  { id: 180, label: "3 min" },
  { id: 300, label: "5 min" },
];

function formatClock(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

// Barème du classement cumulé : les civils marquent 1 point chacun quand
// leur camp l'emporte, les infiltrés (undercover + carte blanche encore en
// jeu) 2 points chacun, et la carte blanche qui devine juste et gagne seule
// empoche un bonus de 3 points, elle seule — pas les autres cartes blanches
// encore en jeu s'il y en a plusieurs dans la manche (blancGuesserId permet
// de distinguer LAQUELLE a deviné juste ; sans lui, toutes les cartes
// blanches recevraient le bonus, ce qui n'aurait de sens que tant qu'il ne
// pouvait y en avoir qu'une seule — plus vrai depuis le 25 août 2026).
function computeRoundPoints(playersList, winnerSide, blancGuesserId) {
  const points = {};
  playersList.forEach((p) => {
    if (winnerSide === "blanc") {
      points[p.id] = p.id === blancGuesserId ? 3 : 0;
    } else if (winnerSide === "civils") {
      points[p.id] = p.role === "civil" ? 1 : 0;
    } else if (winnerSide === "infiltres") {
      points[p.id] = p.role === "undercover" || p.role === "blanc" ? 2 : 0;
    } else {
      points[p.id] = 0;
    }
  });
  return points;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
