// Fonction Supabase Edge Function : supprime définitivement le compte de
// l'utilisateur authentifié (auth.users + toutes les données dérivées).
//
// Ajoutée suite à l'audit de sécurité du 23 août 2026 (voir
// audit-securite-imposteur-foot.md, section 23, 🟠 ÉLEVÉ) : c'est une
// exigence obligatoire d'Apple pour la publication sur l'App Store (App
// Store Review Guidelines 5.1.1(v), "offer account deletion") et le droit
// à l'effacement du RGPD (article 17).
//
// Appelée par le client avec :
//   POST /functions/v1/delete-account
//   Authorization: Bearer <access_token de la session Supabase du joueur>
//
// Sécurité : comme create-checkout-session/create-portal-session, on ne
// fait JAMAIS confiance à un identifiant envoyé par le client — on
// revérifie le token d'accès auprès de Supabase Auth pour retrouver le
// vrai utilisateur connecté, PUIS on supprime CE compte-là (jamais un ID
// pris dans le corps de la requête). La suppression elle-même utilise
// l'API admin de Supabase Auth (DELETE /auth/v1/admin/users/{id}), qui
// exige la Service Role Key — jamais exposée au client, jamais
// contournable depuis le navigateur.
//
// Effet en cascade : public.users, public.purchases et public.game_history
// ont toutes un "on delete cascade" sur leur clé étrangère vers
// auth.users(id) (voir docs/schema-comptes-premium.sql) — supprimer la
// ligne auth.users suffit donc à faire disparaître proprement toutes les
// données dérivées de ce compte, sans requête supplémentaire à écrire ici.
//
// Secret nécessaire : SUPABASE_URL, SUPABASE_ANON_KEY et
// SUPABASE_SERVICE_ROLE_KEY sont fournis automatiquement par Supabase à
// chaque fonction Edge — rien à configurer manuellement.

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
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
    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return jsonResponse({ error: "Configuration serveur incomplète." }, 500);
    }

    // Vérifie le token et retrouve le vrai utilisateur connecté — jamais un
    // ID fourni par le client. C'est ce qui garantit qu'un utilisateur ne
    // peut supprimer QUE son propre compte, pas celui d'un autre.
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

    // Suppression admin — nécessite la Service Role Key, contourne RLS par
    // design (c'est le seul endroit où ça a du sens : effacer TOUTES les
    // données du compte, pas juste ce que RLS laisserait lire/écrire).
    const deleteRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${user.id}`, {
      method: "DELETE",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });

    if (!deleteRes.ok) {
      const errBody = await deleteRes.json().catch(() => ({}));
      console.error("Erreur suppression compte:", errBody);
      return jsonResponse({ error: "Suppression impossible, réessaie dans un instant." }, 502);
    }

    return jsonResponse({ success: true });
  } catch (e) {
    console.error(e);
    return jsonResponse({ error: "Erreur serveur inattendue." }, 500);
  }
}

export default { fetch: handler };
