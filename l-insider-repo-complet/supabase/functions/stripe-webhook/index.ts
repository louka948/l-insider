// Fonction Supabase Edge Function : reçoit les webhooks envoyés par Stripe
// et met à jour la table purchases en conséquence. C'est la SEULE façon
// dont purchases est écrite — jamais depuis le client (voir les policies
// RLS dans docs/schema-comptes-premium.sql : volontairement aucune policy
// insert/update côté client, pour qu'un joueur ne puisse pas se donner le
// statut premium lui-même).
//
// ⚠️ Stripe appelle cette URL directement, sans jeton Supabase — si le
// dashboard impose une authentification par défaut sur cette fonction (à
// vérifier dans ses réglages une fois déployée), il faut la désactiver ici.
// C'est la signature Stripe (vérifiée manuellement ci-dessous) qui protège
// cette fonction, pas un jeton Supabase.
//
// Secret à ajouter (Edge Functions → Secrets) :
//   STRIPE_WEBHOOK_SECRET  (whsec_..., donné par Stripe à la création du
//                           endpoint webhook — voir Développeurs → Webhooks)
// STRIPE_SECRET_KEY n'est PAS nécessaire ici (seulement dans
// create-checkout-session). SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont
// déjà fournis automatiquement par Supabase à chaque fonction.

const encoder = new TextEncoder();

async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Méthode non autorisée.", { status: 405 });
  }

  const signatureHeader = req.headers.get("Stripe-Signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const rawBody = await req.text();

  if (!signatureHeader || !webhookSecret) {
    console.error("Signature ou secret webhook manquant.");
    return new Response("Configuration webhook incomplète.", { status: 500 });
  }

  const valid = await verifyStripeSignature(rawBody, signatureHeader, webhookSecret);
  if (!valid) {
    return new Response("Signature invalide.", { status: 400 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Corps JSON invalide.", { status: 400 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.client_reference_id;
        if (!userId) {
          console.warn("checkout.session.completed sans client_reference_id, ignoré.");
          break;
        }
        const plan = (session.metadata && session.metadata.plan) || (session.mode === "subscription" ? "subscription" : "lifetime");
        // Idempotence (audit du 23 août 2026, section 23, 🟡 MOYEN) : Stripe
        // peut renvoyer le même événement checkout.session.completed
        // plusieurs fois (retry réseau de leur côté si notre réponse tarde
        // ou échoue) — sans ça, on insérait une deuxième ligne purchases
        // pour le même achat à chaque renvoi. On upsert maintenant sur la
        // colonne qui identifie l'achat de façon unique selon le type de
        // plan (voir contrainte unique ajoutée dans
        // docs/migration-idempotence-webhook.sql), avec
        // resolution=ignore-duplicates : si une ligne avec le même
        // identifiant Stripe existe déjà, PostgREST ne fait rien plutôt que
        // d'échouer ou de dupliquer.
        const conflictColumn = plan === "subscription" ? "stripe_subscription_id" : "stripe_payment_intent_id";
        await supabaseUpsertIgnore(supabaseUrl, serviceRoleKey, "purchases", conflictColumn, {
          user_id: userId,
          type: plan === "subscription" ? "subscription" : "lifetime",
          status: session.mode === "subscription" ? "trialing" : "active",
          stripe_customer_id: session.customer || null,
          stripe_subscription_id: session.subscription || null,
          stripe_payment_intent_id: session.payment_intent || null,
          price_cents: session.amount_total ?? null,
        });
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        await supabasePatch(supabaseUrl, serviceRoleKey, "purchases", `stripe_subscription_id=eq.${sub.id}`, {
          status: sub.status,
          current_period_start: sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : null,
          current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
          updated_at: new Date().toISOString(),
        });
        break;
      }
      // Ajouté suite à l'audit de sécurité du 23 août 2026 (voir
      // audit-securite-imposteur-foot.md, section 23, 🟠 ÉLEVÉ) : sans ce
      // cas, rembourser un accès à vie ne changeait RIEN côté app — la ligne
      // purchases restait "status: active" pour toujours, donc isPremium
      // restait vrai après remboursement (voir hasLifetimeAccess dans
      // imposteurfoot_11.html, qui ne regarde QUE le statut, jamais Stripe
      // en direct).
      //
      // Un remboursement d'abonnement (rare — Stripe gère normalement ça via
      // l'annulation de l'abonnement lui-même, déjà couvert par
      // customer.subscription.deleted ci-dessus) est traité de la même façon
      // si jamais Stripe rembourse la charge sans annuler l'abonnement : la
      // ligne purchases correspondante passe aussi en "refunded", isPremium
      // la rejette de toute façon car elle ne cherche que "active"/"trialing".
      //
      // On ne réagit qu'aux remboursements COMPLETS (charge.refunded === true
      // — Stripe envoie aussi cet événement pour un remboursement partiel,
      // où amount_refunded < amount et refunded reste false) : un
      // remboursement partiel ne doit pas couper l'accès.
      case "charge.refunded": {
        const charge = event.data.object;
        if (charge.refunded && charge.payment_intent) {
          await supabasePatch(
            supabaseUrl,
            serviceRoleKey,
            "purchases",
            `stripe_payment_intent_id=eq.${charge.payment_intent}`,
            {
              status: "refunded",
              updated_at: new Date().toISOString(),
            }
          );
        }
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("Erreur traitement webhook:", e);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export default { fetch: handler };

// Vérifie la signature Stripe manuellement (algorithme documenté par
// Stripe : https://stripe.com/docs/webhooks#verify-manually) plutôt que de
// dépendre du SDK Stripe complet pour cette seule vérification.
async function verifyStripeSignature(payload: string, header: string, secret: string): Promise<boolean> {
  const parts: Record<string, string> = {};
  for (const part of header.split(",")) {
    const [k, v] = part.split("=");
    if (k && v) parts[k] = v;
  }
  const timestamp = parts["t"];
  const signature = parts["v1"];
  if (!timestamp || !signature) return false;

  const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(ageSeconds) || ageSeconds > 5 * 60) return false;

  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signedPayload = `${timestamp}.${payload}`;
  const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));
  const expected = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return expected === signature;
}

// Insertion idempotente : si une ligne existe déjà avec la même valeur sur
// `conflictColumn` (contrainte unique requise en base, voir
// docs/migration-idempotence-webhook.sql), PostgREST l'ignore silencieusement
// au lieu de renvoyer une erreur de contrainte ou d'insérer un doublon.
// `conflictColumn` doit correspondre exactement au nom de colonne d'une
// contrainte unique existante côté Postgres — sinon PostgREST renvoie une
// erreur 400.
async function supabaseUpsertIgnore(
  url: string | undefined,
  key: string | undefined,
  table: string,
  conflictColumn: string,
  row: Record<string, unknown>
) {
  if (!url || !key) throw new Error("Configuration Supabase manquante (SUPABASE_SERVICE_ROLE_KEY).");
  const res = await fetch(`${url}/rest/v1/${table}?on_conflict=${conflictColumn}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "resolution=ignore-duplicates,return=minimal",
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`Upsert ${table} échoué : ${await res.text()}`);
}

async function supabasePatch(url: string | undefined, key: string | undefined, table: string, filter: string, patch: Record<string, unknown>) {
  if (!url || !key) throw new Error("Configuration Supabase manquante (SUPABASE_SERVICE_ROLE_KEY).");
  const res = await fetch(`${url}/rest/v1/${table}?${filter}`, {
    method: "PATCH",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`Mise à jour ${table} échouée : ${await res.text()}`);
}
