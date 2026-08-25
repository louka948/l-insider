// Fonction Supabase Edge Function : crée une session Stripe Billing Portal
// et renvoie son URL, pour qu'un abonné puisse gérer/annuler lui-même son
// abonnement (voir AccountScreen.jsx, bouton "Gérer mon abonnement").
//
// Appelée par le client avec :
//   POST /functions/v1/create-portal-session
//   Authorization: Bearer <access_token de la session Supabase du joueur>
//   Content-Type: application/json
//   Body: { "origin": "https://..." }
//
// Sécurité : comme create-checkout-session, on ne fait JAMAIS confiance à un
// identifiant envoyé par le client. On vérifie le token d'accès auprès de
// Supabase Auth pour retrouver le vrai utilisateur connecté, puis on va
// chercher SON stripe_customer_id dans la table purchases avec la Service
// role key (lecture serveur, RLS ignorée par design pour ce contexte de
// confiance — même table que stripe-webhook écrit).
//
// Secret nécessaire (déjà présent si create-checkout-session est déployée) :
// STRIPE_SECRET_KEY. SUPABASE_URL, SUPABASE_ANON_KEY et
// SUPABASE_SERVICE_ROLE_KEY sont fournis automatiquement par Supabase.
//
// ⚠️ Le Customer Portal Stripe doit être activé une fois côté dashboard
// avant le premier appel : Stripe (mode test) → Réglages → Billing →
// Customer portal → Activer. Sans ça, Stripe renvoie une erreur du type
// "no configuration provided".

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Même valeur que dans create-checkout-session/index.ts — utilisée
// seulement si le client n'a pas pu fournir une origine valide.
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
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey || !stripeSecretKey) {
      return jsonResponse({ error: "Configuration serveur incomplète." }, 500);
    }

    // Vérifie le token et retrouve le vrai utilisateur connecté.
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${accessToken}`, apikey: supabaseAnonKey },
    });
    if (!userRes.ok) {
      return jsonResponse({ error: "Session invalide." }, 401);
    }
    const user = await userRes.json();
    if (!user || !user.id) {
      return jsonResponse({ error: "Session invalide." }, 401);
    }

    // Cherche le dernier stripe_customer_id connu pour cet utilisateur
    // (lecture serveur avec la Service role key — jamais exposée au
    // client — RLS n'autorise de toute façon que le select de sa propre
    // ligne, mais on passe par ce contexte serveur de confiance pour
    // rester cohérent avec le reste de l'intégration Stripe).
    const purchasesRes = await fetch(
      `${supabaseUrl}/rest/v1/purchases?user_id=eq.${user.id}&stripe_customer_id=not.is.null&select=stripe_customer_id&order=created_at.desc&limit=1`,
      { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } }
    );
    if (!purchasesRes.ok) {
      return jsonResponse({ error: "Impossible de retrouver ton compte de facturation." }, 500);
    }
    const rows = await purchasesRes.json();
    const customerId = rows && rows[0] && rows[0].stripe_customer_id;
    if (!customerId) {
      return jsonResponse({ error: "Aucun abonnement Stripe trouvé pour ce compte." }, 404);
    }

    const body = await req.json().catch(() => ({}));
    const reqOrigin = req.headers.get("Origin");
    const origin = isHttpUrl(body.origin) ? body.origin : isHttpUrl(reqOrigin) ? reqOrigin : FALLBACK_ORIGIN;

    const params = new URLSearchParams();
    params.set("customer", customerId);
    params.set("return_url", origin);

    const stripeRes = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const session = await stripeRes.json();
    if (!stripeRes.ok) {
      console.error("Erreur Stripe (portal):", session);
      return jsonResponse({ error: (session.error && session.error.message) || "Erreur Stripe." }, 502);
    }

    return jsonResponse({ url: session.url });
  } catch (e) {
    console.error(e);
    return jsonResponse({ error: "Erreur serveur inattendue." }, 500);
  }
}

export default { fetch: handler };
