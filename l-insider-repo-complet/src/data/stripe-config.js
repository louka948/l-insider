// ---------------------------------------------------------------------------
// Configuration Stripe — mêmes conventions que src/data/supabase-config.js :
// script classique, chargé avant le script applicatif, partage le scope
// global. Valeurs PUBLIQUES par design (Publishable key + Price ID ne sont
// pas des secrets — voir docs/checklist-stripe.md pour le détail). La
// Secret key Stripe n'existe QUE côté serveur, dans les secrets de la
// fonction Supabase Edge Function create-checkout-session/stripe-webhook —
// jamais ici, jamais dans un fichier versionné.
//
// Le paiement passe par Stripe Checkout en mode "redirection hébergée" : le
// navigateur appelle la fonction serveur create-checkout-session (voir
// supabase/functions/create-checkout-session/), qui renvoie une URL Stripe,
// et le navigateur y est redirigé directement (window.location.href = url).
// Pas besoin de charger la librairie Stripe.js côté client pour ce flux —
// STRIPE_PUBLISHABLE_KEY n'est donc pas utilisée dans le code actuel, gardée
// ici pour référence/usage futur (ex. si on passe un jour à Stripe Elements
// pour un formulaire de carte intégré plutôt qu'une redirection).
// ---------------------------------------------------------------------------

// Passage en mode LIVE le 24 août 2026 — voir claude/etat-imposteur-foot.md.
// Les valeurs de test précédentes sont conservées en commentaire juste en
// dessous de chaque ligne pour référence/rollback rapide si besoin.
const STRIPE_PUBLISHABLE_KEY = "pk_live_51U6owpCT6PMXywo9cNmJYLNesQJhjOe8wrXq53vlL5ptTMw48XWtvycqgPCDtfq7qRGzhApjub9EIDdNW73Kqnc800wrSvMJHU";
// Ancienne valeur test : pk_test_51U6ox7Fdm0xu8jUT1rigAJerhmxAvCw9hQf2RgoGqNLVmLZyxu79q76MCwftWL8CkIOfhRY1p72S4hqRtJF22EbO0084tpcqZI

// Price ID du produit "L'Insider — Abonnement" (3,99€/mois, essai 7
// jours géré côté code — voir supabase/functions/create-checkout-session).
// Renommé de "Imposteur Foot — Abonnement" le 23 août 2026 (voir
// claude/etat-imposteur-foot.md) — le Price ID lui-même ne change pas,
// seul le nom affiché du produit côté Stripe a été renommé.
const STRIPE_PRICE_SUBSCRIPTION = "price_1U7u66CT6PMXywo9RCj04gzw";
// Ancienne valeur test : price_1U6p1IFdm0xu8jUT1RtO0Ozg

// Price ID du produit "L'Insider — Accès à vie" (9,99€, paiement unique).
// Renommé de "Imposteur Foot — Accès à vie" le 23 août 2026, même remarque.
const STRIPE_PRICE_LIFETIME = "price_1U7u63CT6PMXywo9F4aS8faL";
// Ancienne valeur test : price_1U6p3sFdm0xu8jUTO5LY2ksq

const STRIPE_CONFIGURED =
  !STRIPE_PRICE_SUBSCRIPTION.includes("REMPLACER") && !STRIPE_PRICE_LIFETIME.includes("REMPLACER");

if (!STRIPE_CONFIGURED) {
  console.warn("[L'Insider] Stripe non configuré (src/data/stripe-config.js) — paiement désactivé.");
}
