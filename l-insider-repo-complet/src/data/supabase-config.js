// ---------------------------------------------------------------------------
// Configuration Supabase — JS classique, zéro JSX, chargé après la librairie
// Supabase (build/supabase-js.min.js, vendored — voir CLAUDE.md) et avant le
// script applicatif. Même mécanisme de chargement que src/data/players.js :
// un <script src="..."> classique, qui fonctionne même en ouverture directe
// file:// (contrairement à fetch()), et qui partage le scope global avec les
// autres scripts classiques (donc SUPABASE_URL, SUPABASE_ANON_KEY et
// supabaseClient sont visibles depuis n'importe quel écran).
//
// Pourquoi la librairie Supabase est vendored (build/supabase-js.min.js)
// plutôt que chargée depuis un CDN : le projet a pour règle qu'aucun fichier
// externe n'est nécessaire pour jouer (voir CLAUDE.md, "un seul fichier HTML
// autonome"). build/supabase-js.min.js est une copie du bundle UMD officiel
// (node_modules/@supabase/supabase-js/dist/umd/supabase.js), qui expose un
// global `window.supabase` avec `.createClient(url, anonKey)`.
//
// ⚠️ SUPABASE_ANON_KEY (la clé "Publishable key" côté Supabase) est un
// identifiant PUBLIC, prévu pour être visible dans le code front-end — ce
// n'est pas un secret. Ne jamais mettre ici la "Secret key" (accès total à
// la base sans restriction), qui ne doit exister que côté serveur.

const SUPABASE_URL = "https://pcsvgtpvccpozxsnixux.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_K87Uf3-5ZAZ9p8ZYbKujkA_Hv3B1POU";

const SUPABASE_CONFIGURED = !SUPABASE_URL.includes("REMPLACER") && !SUPABASE_ANON_KEY.includes("REMPLACER");

// supabaseClient reste `null` tant que la config n'a pas été renseignée, pour
// que le jeu continue de fonctionner (mode anonyme) même sans backend prêt —
// chaque appel côté écran doit vérifier `supabaseClient` avant de s'en servir.
const supabaseClient = SUPABASE_CONFIGURED && window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

if (!SUPABASE_CONFIGURED) {
  console.warn("[L'Insider] Supabase non configuré (src/data/supabase-config.js) — mode compte désactivé.");
}
