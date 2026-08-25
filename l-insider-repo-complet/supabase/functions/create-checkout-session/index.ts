// Fonction Supabase Edge Function : crée une session Stripe Checkout et
// renvoie son URL, pour que le navigateur y soit redirigé (voir
// AccountScreen.jsx, fonction handleSubscribe).
//
// Appelée par le client avec :
//   POST /functions/v1/create-checkout-session
//   Authorization: Bearer <access_token de la session Supabase du joueur>
//   Content-Type: application/json
//   Body: { "plan": "subscription" | "lifetime", "origin": "https://..." }
//
// Sécurité : on ne fait JAMAIS confiance à un user_id envoyé par le client.
// On vérifie le token d'accès auprès de Supabase Auth pour retrouver le
// vrai utilisateur connecté, et c'est SON id qu'on grave dans
// client_reference_id de la session Stripe — c'est ce champ que la fonction
// stripe-webhook relit ensuite pour savoir à qui attribuer l'achat.
//
// Secret à ajouter (Edge Functions → Secrets) : STRIPE_SECRET_KEY
// (sk_test_... en mode test). SUPABASE_URL et SUPABASE_ANON_KEY sont déjà
// fournis automatiquement par Supabase à chaque fonction, rien à faire.

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Garder synchronisé avec src/data/stripe-config.js (les deux valeurs sont
// publiques, donc pas de risque à les dupliquer ici).
// Passage en mode LIVE le 24 août 2026 — voir claude/etat-imposteur-foot.md.
// Anciennes valeurs test : subscription price_1U6p1IFdm0xu8jUT1RtO0Ozg,
// lifetime price_1U6p3sFdm0xu8jUTO5LY2ksq
const PRICE_IDS: Record<string, string> = {
  subscription: "price_1U7u66CT6PMXywo9RCj04gzw",
  lifetime: "price_1U7u63CT6PMXywo9F4aS8faL",
};

// Utilisé seulement si le client n'a pas pu fournir une origine valide
// (ex. test en ouverture locale file://, où window.location.origin vaut
// "null"). À mettre à jour si le sous-domaine Netlify change.
const FALLBACK_ORIGIN = "https://imposteur-foot.netlify.app";

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function isHttpUrl(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\//.test(value);
}

async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Méthode non autorisée." }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const accessToken = authHeader.replace(/^Bearer\s+/i, "");
    if (!accessToken) {
      return jsonResponse({ error: "Non authentifié." }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!supabaseUrl || !supabaseAnonKey || !stripeSecretKey) {
      return jsonResponse({ error: "Configuration serveur incomplète (secret STRIPE_SECRET_KEY manquant ?)." }, 500);
    }

    // Vérifie le token et retrouve le vrai utilisateur connecté — jamais
    // celui que le client prétendrait être.
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${accessToken}`, apikey: supabaseAnonKey },
    });
    if (!userRes.ok) {
      return jsonResponse({ error: "Session invalide." }, 401);
    }
    const user = await userRes.json();
    if (!user || !user.id || !user.email) {
      return jsonResponse({ error: "Session invalide." }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const plan = body.plan;
    const priceId = PRICE_IDS[plan];
    if (!priceId) {
      return jsonResponse({ error: "Plan inconnu (attendu : subscription ou lifetime)." }, 400);
    }

    const reqOrigin = req.headers.get("Origin");
    const origin = isHttpUrl(body.origin) ? body.origin : isHttpUrl(reqOrigin) ? reqOrigin : FALLBACK_ORIGIN;
    const mode = plan === "subscription" ? "subscription" : "payment";

    const params = new URLSearchParams();
    params.set("mode", mode);
    params.set("line_items[0][price]", priceId);
    params.set("line_items[0][quantity]", "1");
    params.set("client_reference_id", user.id);
    params.set("customer_email", user.email);
    params.set("success_url", `${origin}?paiement=succes`);
    params.set("cancel_url", `${origin}?paiement=annule`);
    params.set("metadata[plan]", plan);
    if (mode === "subscription") {
      // Essai gratuit de 7 jours — configuré ici plutôt que sur le prix
      // Stripe lui-même (voir docs/checklist-stripe.md).
      params.set("subscription_data[trial_period_days]", "7");
    }

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const session = await stripeRes.json();
    if (!stripeRes.ok) {
      console.error("Erreur Stripe:", session);
      return jsonResponse({ error: (session.error && session.error.message) || "Erreur Stripe." }, 502);
    }

    return jsonResponse({ url: session.url });
  } catch (e) {
    console.error(e);
    return jsonResponse({ error: "Erreur serveur inattendue." }, 500);
  }
}

export default { fetch: handler };
