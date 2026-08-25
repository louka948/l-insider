// ---------------------------------------------------------------------------
// Code d'accès bêta — débloque tout le jeu (comme le premium) sans créer de
// compte ni payer, juste en tapant ce mot de passe partagé dans l'écran
// "Mon compte". Pensé pour distribuer un accès de test à des proches/
// bêta-testeurs sans avoir à créer un compte pour chacun.
//
// ⚠️ CE N'EST PAS UNE VRAIE PROTECTION. Ce fichier est inliné en clair dans
// index.html (comme players.js, game-engine.js...) : n'importe qui peut
// l'y retrouver via "Afficher le code source" ou les outils de
// développeur du navigateur. C'est une simple friction pour distribuer un
// accès de bêta-test à qui tu donnes le code, pas un mécanisme de sécurité
// — ne jamais s'en servir pour protéger un contenu qui doit rester
// vraiment privé.
//
// Pour changer le code : modifie juste la valeur ci-dessous, puis
// régénère index.html (npm run build) et redéploie.
const BETA_ACCESS_CODE = "IMPOSTEURFOOT2026";

// Stocké en clair dans localStorage (juste un booléen, pas le code
// lui-même) une fois validé — persiste d'une visite à l'autre sur le même
// navigateur, comme le compteur de parties anonymes.
const BETA_ACCESS_KEY = "imposteurfoot_beta_access";

function checkBetaAccessCode(input) {
  return typeof input === "string" && input.trim().toUpperCase() === BETA_ACCESS_CODE.toUpperCase();
}

// Date de coupure automatique de l'accès bêta (format ISO 8601, ex.
// "2026-11-01T00:00:00+02:00"). Sert à fermer la bêta d'un coup une fois
// l'app vraiment publiée (App Store / Play Store) : à partir de cette
// date/heure, l'accès bêta redevient bloqué pour TOUT LE MONDE, y compris
// les personnes qui ont déjà entré le code par le passé — leur booléen
// dans localStorage reste posé, mais isBetaAccessWindowOpen() ci-dessous le
// rend caduc. Vérifié à chaque chargement de l'app, dans le navigateur de
// chaque visiteur, contre l'heure de son propre appareil : aucune action
// manuelle n'est nécessaire le jour J, ni redéploiement à ce moment-là.
//
// null = pas de coupure programmée, l'accès bêta reste valide
// indéfiniment (comportement actuel, inchangé tant que cette valeur n'est
// pas fixée). Pour programmer une coupure : remplace null par une date
// ISO ci-dessous, régénère index.html (npm run build), redéploie une
// seule fois — la coupure se déclenchera ensuite toute seule le jour venu.
const BETA_ACCESS_EXPIRES_AT = null;

function isBetaAccessWindowOpen() {
  if (!BETA_ACCESS_EXPIRES_AT) return true;
  return Date.now() < new Date(BETA_ACCESS_EXPIRES_AT).getTime();
}
