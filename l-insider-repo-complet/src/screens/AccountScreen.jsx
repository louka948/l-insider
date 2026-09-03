// ---------------------------------------------------------------------------
// Écran : AccountScreen — inscription / connexion / profil (comptes Supabase).
// Nouveau (pas un extrait de imposteurfoot_11.html) — première brique du
// chantier "comptes + premium" (voir doc projet
// modele-economique-comptes-premium.md pour le raisonnement complet).
//
// Phase actuelle : juste le compte (email/mot de passe + nom affiché).
// Rien sur le premium/paiement ici — ça viendra avec Stripe, à part.
//
// S'appuie sur `supabaseClient` et `SUPABASE_CONFIGURED`, définis dans
// src/data/supabase-config.js (chargé avant ce script, scope global partagé
// — même mécanisme que PLAYERS/LEAGUES). `session` est géré par
// ImposteurFoot() (onAuthStateChange) et passé en prop ici : cet écran ne
// fait que déclencher les actions (signUp/signIn/signOut), jamais gérer sa
// propre copie de la session.
// ---------------------------------------------------------------------------

function AccountScreen({
  session,
  onClose,
  betaAccess,
  onActivateBetaAccess,
  passwordRecovery,
  onPasswordRecoveryHandled,
  intendedPlan, // 'subscription' | 'lifetime' | null — voir imposteurfoot_11.html (?plan= dans l'URL, déclenché depuis les cartes de prix de la landing page). Sert à afficher un rappel clair de l'offre visée tant qu'on n'est pas connecté, ET à déclencher automatiquement le paiement Stripe une fois le compte prêt (voir l'effet plus bas).
  onIntendedPlanConsumed, // Callback pour oublier intendedPlan (state + localStorage, côté imposteurfoot_11.html) une fois qu'il n'a plus lieu d'être : paiement lancé, offre déjà débloquée, ou écran fermé manuellement.
}) {
  // Si on arrive avec une offre déjà en tête, autant ouvrir directement sur
  // "Créer un compte" plutôt que sur "Se connecter" — c'est le cas le plus
  // probable pour quelqu'un qui clique une carte de prix.
  const [tab, setTab] = useState(intendedPlan ? "signup" : "signin"); // 'signin' | 'signup' | 'forgot'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [profile, setProfile] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState(null);
  const avatarInputRef = useRef(null);
  const [purchases, setPurchases] = useState(null); // null = pas encore chargé, [] = chargé, vide
  const [checkoutLoading, setCheckoutLoading] = useState(null); // 'subscription' | 'lifetime' | null
  const [checkoutError, setCheckoutError] = useState(null);
  const [paymentNotice, setPaymentNotice] = useState(null); // 'succes' | 'annule' | null
  const [showBetaForm, setShowBetaForm] = useState(false);
  const [betaCode, setBetaCode] = useState("");
  const [betaError, setBetaError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Code d'accès bêta (voir src/data/beta-access.js) : débloque tout comme
  // le premium, sans compte ni paiement. Volontairement indépendant de
  // session/user ci-dessous — utilisable même sans être connecté, c'est
  // tout l'intérêt (distribuer un accès de test sans faire créer de compte).
  function handleBetaSubmit(e) {
    e.preventDefault();
    setBetaError(null);
    // Distingue le cas "bêta fermée" (voir BETA_ACCESS_EXPIRES_AT dans
    // src/data/beta-access.js) d'un simple code mal tapé, pour ne pas
    // laisser croire à quelqu'un qu'il a une faute de frappe alors que
    // l'accès bêta n'est tout simplement plus disponible.
    if (!isBetaAccessWindowOpen()) {
      setBetaError("L'accès bêta n'est plus disponible.");
      return;
    }
    if (onActivateBetaAccess(betaCode)) {
      setBetaCode("");
      setShowBetaForm(false);
    } else {
      setBetaError("Code invalide.");
    }
  }

  const user = session && session.user;

  // Récupère le nom affiché / la photo depuis public.users (rempli
  // automatiquement à l'inscription par le trigger SQL) dès qu'une session
  // existe — pas besoin pour l'instant si on n'est pas connecté.
  useEffect(() => {
    if (!user || !supabaseClient) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    supabaseClient
      .from("users")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (!cancelled) setProfile(data || null);
      });
    return () => {
      cancelled = true;
    };
  }, [user && user.id]);

  // Récupère les achats de l'utilisateur (table purchases, écrite
  // uniquement par la fonction serveur stripe-webhook — voir
  // docs/schema-comptes-premium.sql) pour savoir s'il a un abonnement actif
  // ou un accès à vie.
  useEffect(() => {
    if (!user || !supabaseClient) {
      setPurchases(null);
      return;
    }
    let cancelled = false;
    supabaseClient
      .from("purchases")
      .select("type, status, current_period_end")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (!cancelled) setPurchases(data || []);
      });
    return () => {
      cancelled = true;
    };
  }, [user && user.id]);

  // Retour depuis Stripe Checkout (success_url/cancel_url pointent vers
  // cette même page avec ?paiement=succes ou ?paiement=annule — voir
  // supabase/functions/create-checkout-session). On nettoie l'URL tout de
  // suite pour ne pas réafficher le message à un simple rafraîchissement.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paiement = params.get("paiement");
    if (paiement === "succes" || paiement === "annule") {
      setPaymentNotice(paiement);
      params.delete("paiement");
      const rest = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (rest ? `?${rest}` : ""));
    }
  }, []);

  const hasLifetime = !!(purchases || []).find((p) => p.type === "lifetime" && p.status === "active");
  const activeSub = (purchases || []).find(
    (p) => p.type === "subscription" && (p.status === "active" || p.status === "trialing") && (!p.current_period_end || new Date(p.current_period_end) > new Date())
  );
  const hasPremium = betaAccess || hasLifetime || !!activeSub;
  const planLabel = betaAccess
    ? "Accès bêta"
    : hasLifetime
    ? "Accès à vie"
    : activeSub
    ? (activeSub.status === "trialing" ? "Abonnement (essai gratuit)" : "Abonnement actif")
    : "Compte gratuit";

  // Gestion de l'abonnement (résiliation, moyen de paiement...) via le
  // Customer Portal hébergé par Stripe — voir
  // supabase/functions/create-portal-session/. Uniquement pertinent pour
  // un abonnement (l'accès à vie est un paiement unique, rien à gérer).
  async function handleManageSubscription() {
    if (!supabaseClient || !session) return;
    setCheckoutError(null);
    setCheckoutLoading("portal");
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-portal-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ origin: window.location.origin }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        setCheckoutLoading(null);
        setCheckoutError(data.error || "Impossible d'ouvrir la gestion d'abonnement, réessaie dans un instant.");
        return;
      }
      window.location.href = data.url;
    } catch (e) {
      setCheckoutLoading(null);
      setCheckoutError("Impossible d'ouvrir la gestion d'abonnement, réessaie dans un instant.");
    }
  }

  async function handleSubscribe(plan) {
    if (!supabaseClient || !session) return;
    setCheckoutError(null);
    setCheckoutLoading(plan);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plan, origin: window.location.origin }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        setCheckoutLoading(null);
        setCheckoutError(data.error || "Impossible de démarrer le paiement, réessaie dans un instant.");
        return;
      }
      window.location.href = data.url;
    } catch (e) {
      setCheckoutLoading(null);
      setCheckoutError("Impossible de démarrer le paiement, réessaie dans un instant.");
    }
  }

  // Déclenche automatiquement le paiement dès qu'un compte est prêt pour
  // l'offre visée (intendedPlan, voir imposteurfoot_11.html) — sinon créer
  // un compte depuis une carte de prix ramenait juste sur l'écran "Mon
  // compte" sans jamais lancer Stripe, ce qui n'a aucun sens pour
  // quelqu'un venu payer. Attend que purchases soit chargé (pas juste
  // `user`) pour ne pas relancer un paiement si la personne a en fait déjà
  // l'offre (ex. reconnexion sur un compte existant déjà abonné). Le ref
  // empêche un second déclenchement si l'effet se rejoue (ex. purchases
  // qui se recharge) — un seul essai automatique, ensuite les boutons
  // manuels plus bas prennent le relais.
  const autoCheckoutTriggered = useRef(false);
  useEffect(() => {
    if (!intendedPlan || !user || !STRIPE_CONFIGURED || purchases === null) return;
    if (betaAccess || hasLifetime || (intendedPlan === "subscription" && activeSub)) {
      // Offre déjà débloquée d'une façon ou d'une autre (bêta, achat
      // existant...) — rien à payer, juste oublier l'offre visée.
      onIntendedPlanConsumed && onIntendedPlanConsumed();
      return;
    }
    if (autoCheckoutTriggered.current) return;
    autoCheckoutTriggered.current = true;
    handleSubscribe(intendedPlan);
    onIntendedPlanConsumed && onIntendedPlanConsumed();
  }, [intendedPlan, user, betaAccess, purchases, hasLifetime, activeSub]);

  function switchTab(next) {
    setTab(next);
    setError(null);
    setInfo(null);
  }

  async function handleSignUp(e) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!email.trim() || !password) {
      setError("Email et mot de passe obligatoires.");
      return;
    }
    if (password.length < 6) {
      setError("Le mot de passe doit faire au moins 6 caractères.");
      return;
    }
    setLoading(true);
    const { data: signUpData, error: signUpError } = await supabaseClient.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { display_name: displayName.trim() || undefined },
        // Sans ça, Supabase renvoie le lien de confirmation vers le "Site
        // URL" configuré une fois pour toutes côté dashboard — qui peut se
        // désynchroniser du domaine réellement utilisé (ex. renommage
        // Netlify) sans que personne ne s'en rende compte avant qu'un
        // utilisateur clique un lien de confirmation qui atterrit au
        // mauvais endroit et perd sa session au passage. En le précisant
        // ici, le lien pointe toujours vers l'origine EXACTE d'où
        // l'inscription a eu lieu, quel que soit le domaine du jour.
        // ⚠️ Ce domaine doit quand même figurer dans la liste "Redirect
        // URLs" côté Supabase (Authentication → URL Configuration), sinon
        // Supabase refuse la redirection même avec ce paramètre.
        //
        // ⚠️ Bug trouvé et corrigé le 3 sept. 2026 : window.location.origin
        // SEUL (sans le chemin) renvoie vers la racine du site
        // (linsider.netlify.app/), qui est la page de présentation/landing
        // — un fichier totalement différent de jouer/index.html, sans
        // aucune trace de Supabase dedans (voir CLAUDE.md, deux fichiers
        // HTML autonomes générés séparément). Le jeton de la redirection
        // atterrissait donc sur une page qui ne sait pas le lire : lien
        // cliqué "avec succès" mais utilisateur jamais reconnecté, remis
        // sur la page d'accueil comme s'il n'avait rien fait. En ajoutant
        // window.location.pathname (ex. "/jouer/"), la redirection revient
        // sur la bonne page, celle qui contient réellement supabaseClient.
        emailRedirectTo: window.location.origin + window.location.pathname,
      },
    });
    setLoading(false);
    if (signUpError) {
      setError(traduireErreur(signUpError.message));
      return;
    }
    // Si Supabase renvoie déjà une session, c'est que la confirmation
    // d'email n'est pas exigée sur ce projet (réglage "Confirm email") —
    // le compte est donc immédiatement utilisable, pas besoin d'aller
    // checker sa boîte mail. `session` (prop, tenue à jour par
    // onAuthStateChange dans ImposteurFoot()) va se mettre à jour tout
    // seul dans l'instant qui suit, ce qui bascule automatiquement cet
    // écran vers la vue "connecté" — pas besoin de faire quoi que ce soit
    // de plus ici.
    if (signUpData && signUpData.session) {
      setEmail("");
      setPassword("");
      return;
    }
    // Cas piège : un email déjà enregistré ne renvoie PAS forcément une
    // erreur explicite. Pour éviter qu'un attaquant devine quels emails
    // existent déjà (énumération de comptes), Supabase répond dans ce cas
    // avec un objet "user" qui a l'air normal mais dont `identities` est un
    // tableau VIDE, et sans session — exactement le même signal que le cas
    // "vrai nouveau compte en attente de confirmation" si on ne regarde que
    // signUpError/session. On distingue les deux ici : identities vide (et
    // défini) = déjà inscrit, on avertit et on bascule sur "Se connecter"
    // plutôt que d'afficher "Compte créé !" à tort.
    const identities = signUpData && signUpData.user && signUpData.user.identities;
    if (identities && identities.length === 0) {
      setError("Un compte existe déjà avec cet email — connecte-toi plutôt.");
      setTab("signin");
      return;
    }
    setInfo("Compte créé ! Vérifie ta boîte mail pour confirmer ton adresse, puis connecte-toi.");
    setTab("signin");
  }

  async function handleSignIn(e) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!email.trim() || !password) {
      setError("Email et mot de passe obligatoires.");
      return;
    }
    setLoading(true);
    const { error: signInError } = await supabaseClient.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (signInError) {
      setError(traduireErreur(signInError.message));
      return;
    }
    setEmail("");
    setPassword("");
  }

  // Connexion via Google (OAuth), en alternative à email/mot de passe.
  // supabaseClient.auth.signInWithOAuth() ne renvoie pas de session — il
  // redirige tout de suite le navigateur vers l'écran de consentement
  // Google (l'utilisateur QUITTE l'app un instant), puis Google renvoie
  // vers `redirectTo` avec un jeton dans l'URL que supabase-js détecte tout
  // seul au chargement (detectSessionInUrl, actif par défaut — même
  // mécanisme que le lien de réinitialisation de mot de passe plus bas) et
  // transforme en session. `session` (prop, tenue à jour par
  // onAuthStateChange dans ImposteurFoot()) se met alors à jour tout seul,
  // ce qui bascule cet écran vers la vue "connecté" — rien à faire ici
  // après la redirection.
  //
  // ⚠️ Ça suppose que le provider "Google" est activé côté Supabase
  // (Authentication → Sign In / Providers) avec un Client ID/Secret Google
  // Cloud valides, ET que `redirectTo` figure dans les "Redirect URLs"
  // autorisées côté Supabase (Authentication → URL Configuration) — sinon
  // Supabase refuse la redirection même si le provider est actif.
  //
  // ⚠️ window.location.origin SEUL (sans window.location.pathname) renvoie
  // à la racine du site (la page de présentation/landing, un fichier HTML
  // totalement différent sans Supabase dedans) plutôt que sur cette page
  // (jouer/index.html) — bug constaté juste après la mise en prod : le
  // retour de Google réussissait bien, mais atterrissait sur la landing
  // page qui ne sait pas lire le jeton, donc jamais reconnecté. Voir le
  // même correctif sur emailRedirectTo (handleSignUp) et redirectTo
  // (handleForgotPassword) plus bas, touchés par exactement le même bug.
  async function handleGoogleSignIn() {
    setError(null);
    setInfo(null);
    setLoading(true);
    const { error: oauthError } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + window.location.pathname },
    });
    // En cas de succès, le navigateur a déjà quitté la page à ce stade —
    // ce setLoading(false) ne sert que pour le cas d'erreur (ex. provider
    // mal configuré), où on reste sur place.
    setLoading(false);
    if (oauthError) {
      setError(traduireErreur(oauthError.message));
    }
  }

  // Demande d'un lien de réinitialisation de mot de passe — Supabase envoie
  // un email avec un lien qui pointe vers cette même page (redirectTo, même
  // logique que emailRedirectTo dans handleSignUp ci-dessus) contenant un
  // jeton dans l'URL. Au chargement, supabase-js le détecte tout seul
  // (detectSessionInUrl, activé par défaut) et déclenche l'événement
  // PASSWORD_RECOVERY, écouté dans imposteurfoot_11.html — c'est lui qui
  // bascule automatiquement `passwordRecovery` à true et ouvre cet écran.
  //
  // Message de succès volontairement identique que l'email corresponde ou
  // non à un compte existant (Supabase ne le révèle pas non plus côté API) —
  // même logique anti-énumération que le message d'erreur "déjà inscrit" de
  // handleSignUp plus haut, pour ne jamais laisser deviner quels emails ont
  // un compte.
  async function handleForgotPassword(e) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!email.trim()) {
      setError("Entre ton email.");
      return;
    }
    setLoading(true);
    const { error: resetError } = await supabaseClient.auth.resetPasswordForEmail(email.trim(), {
      // + window.location.pathname : voir le commentaire du même bug sur
      // emailRedirectTo (handleSignUp) et redirectTo (handleGoogleSignIn)
      // plus haut — sans le chemin, ce lien renvoyait vers la landing page.
      redirectTo: window.location.origin + window.location.pathname,
    });
    setLoading(false);
    if (resetError) {
      setError(traduireErreur(resetError.message));
      return;
    }
    setInfo("Si un compte existe avec cet email, tu vas recevoir un lien pour choisir un nouveau mot de passe.");
  }

  // Choix du nouveau mot de passe, une fois arrivé depuis le lien de
  // l'email (session temporaire "recovery" déjà ouverte par supabase-js à ce
  // stade — updateUser() s'applique donc bien au bon compte). Ne referme pas
  // l'écran tout seul après succès : on laisse l'utilisateur voir le message
  // de confirmation et cliquer "Continuer" lui-même (onPasswordRecoveryHandled).
  async function handleResetPassword(e) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!newPassword || newPassword.length < 6) {
      setError("Le mot de passe doit faire au moins 6 caractères.");
      return;
    }
    setLoading(true);
    const { error: updateError } = await supabaseClient.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (updateError) {
      setError(traduireErreur(updateError.message));
      return;
    }
    setNewPassword("");
    setInfo("Mot de passe mis à jour !");
  }

  async function handleSignOut() {
    setLoading(true);
    await supabaseClient.auth.signOut();
    setLoading(false);
  }

  // Suppression définitive du compte — exigence Apple (App Store Review
  // Guidelines 5.1.1(v)) et droit à l'effacement RGPD (article 17). Appelle
  // la fonction Edge delete-account (voir
  // supabase/functions/delete-account/index.ts), qui revérifie le jeton
  // côté serveur puis utilise la Service Role Key pour supprimer le compte
  // via auth.admin.deleteUser — jamais accessible depuis le client
  // directement. Le schéma SQL (docs/schema-comptes-premium.sql) a déjà
  // `on delete cascade` sur purchases/game_history référençant
  // public.users, qui référence auth.users : la suppression de
  // auth.users entraîne donc la suppression propre de toutes les données
  // dérivées de ce compte.
  //
  // Confirmation en deux temps (clic "Supprimer mon compte" → affiche
  // l'avertissement + bouton "Confirmer" → seul ce second clic déclenche
  // vraiment l'appel réseau) plutôt qu'un window.confirm(), pour rester
  // cohérent avec le reste de l'UI et permettre un message plus clair.
  async function handleDeleteAccount() {
    if (!supabaseClient || !session) return;
    setDeleteError(null);
    setDeleteLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/delete-account`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeleteLoading(false);
        setDeleteError(data.error || "Suppression impossible, réessaie dans un instant.");
        return;
      }
      // Le compte n'existe plus côté serveur : on nettoie la session locale
      // (le jeton en localStorage n'a plus aucun compte auquel se
      // rattacher) puis on referme l'écran.
      await supabaseClient.auth.signOut();
      setDeleteLoading(false);
      onClose();
    } catch (e) {
      setDeleteLoading(false);
      setDeleteError("Suppression impossible, réessaie dans un instant.");
    }
  }

  // Upload photo de profil (Supabase Storage, bucket "avatars" — voir
  // docs/schema-avatars-storage.sql). Convention de chemin
  // "<id utilisateur>/avatar.<extension>" : c'est ce que les policies RLS du
  // bucket vérifient pour n'autoriser chacun à écrire que dans son propre
  // dossier. upsert:true pour que reprendre une photo remplace l'ancienne
  // plutôt que d'en accumuler.
  async function handleAvatarChange(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      setAvatarError("Choisis une image (JPG, PNG...).");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setAvatarError("Image trop lourde (3 Mo max).");
      return;
    }
    setAvatarError(null);
    setAvatarUploading(true);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabaseClient.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) {
      setAvatarUploading(false);
      setAvatarError("Envoi impossible : " + uploadError.message);
      return;
    }
    const { data: publicUrlData } = supabaseClient.storage.from("avatars").getPublicUrl(path);
    // Paramètre anti-cache : sans ça, remplacer sa photo garde l'ancienne
    // affichée (même URL, navigateur sert la version en cache).
    const avatarUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;
    const { error: updateError } = await supabaseClient.from("users").update({ avatar_url: avatarUrl }).eq("id", user.id);
    setAvatarUploading(false);
    if (updateError) {
      setAvatarError("Photo envoyée mais profil non mis à jour : " + updateError.message);
      return;
    }
    setProfile((prev) => ({ ...(prev || {}), avatar_url: avatarUrl }));
  }

  // Supprime la photo de profil : on liste le dossier de l'utilisateur
  // plutôt que de reconstruire un chemin (l'extension peut varier d'un
  // upload à l'autre — jpg puis png par exemple — upsert ne remplace que si
  // le nom de fichier est identique, donc plusieurs fichiers peuvent
  // s'être accumulés). On les supprime tous, puis on vide avatar_url.
  async function handleAvatarRemove() {
    if (!user) return;
    setAvatarError(null);
    setAvatarUploading(true);
    const { data: files, error: listError } = await supabaseClient.storage.from("avatars").list(user.id);
    if (listError) {
      setAvatarUploading(false);
      setAvatarError("Suppression impossible : " + listError.message);
      return;
    }
    if (files && files.length) {
      const paths = files.map((f) => `${user.id}/${f.name}`);
      const { error: removeError } = await supabaseClient.storage.from("avatars").remove(paths);
      if (removeError) {
        setAvatarUploading(false);
        setAvatarError("Suppression impossible : " + removeError.message);
        return;
      }
    }
    const { error: updateError } = await supabaseClient.from("users").update({ avatar_url: null }).eq("id", user.id);
    setAvatarUploading(false);
    if (updateError) {
      setAvatarError("Photo supprimée mais profil non mis à jour : " + updateError.message);
      return;
    }
    setProfile((prev) => ({ ...(prev || {}), avatar_url: null }));
  }

  const displayNameShown = (profile && profile.display_name) || (user && user.email && user.email.split("@")[0]) || "";
  const initial = displayNameShown ? displayNameShown[0].toUpperCase() : "?";

  return (
    <div style={styles.rulesOverlay}>
      <div style={styles.rulesPanel}>
        <div style={styles.rulesHeader}>
          <h2 style={styles.discussTitle}>Mon compte</h2>
          <button onClick={onClose} style={styles.iconBtn} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>

        <div style={styles.rulesBody}>
          {!SUPABASE_CONFIGURED && (
            <p style={styles.discussSub}>Les comptes ne sont pas encore disponibles sur cette version — reviens bientôt !</p>
          )}

          {SUPABASE_CONFIGURED && session === undefined && (
            <p style={styles.discussSub}>Chargement…</p>
          )}

          {SUPABASE_CONFIGURED && passwordRecovery && (
            <>
              <p style={styles.discussSub}>Choisis un nouveau mot de passe pour ton compte.</p>
              {error && <p style={styles.errorText}>{error}</p>}
              {info ? (
                <>
                  <p style={styles.successText}>{info}</p>
                  <button onClick={onPasswordRecoveryHandled} style={styles.primaryBtn}>
                    Continuer
                  </button>
                </>
              ) : (
                <form onSubmit={handleResetPassword}>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Nouveau mot de passe (6 caractères min.)</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      style={styles.nameInput}
                      autoComplete="new-password"
                      autoFocus
                    />
                  </div>
                  <button type="submit" style={{ ...styles.primaryBtn, opacity: loading ? 0.6 : 1 }} disabled={loading}>
                    {loading ? "Mise à jour…" : "Valider le nouveau mot de passe"}
                  </button>
                </form>
              )}
            </>
          )}

          {SUPABASE_CONFIGURED && !passwordRecovery && session === null && (
            <>
              {intendedPlan && (
                <div style={{ ...styles.anonBanner, cursor: "default", marginBottom: 16 }}>
                  <AccountIcon size={18} color={COLORS.gold} />
                  <div style={{ textAlign: "left", flex: 1, minWidth: 0 }}>
                    <div style={styles.anonBannerTitle}>
                      Offre choisie : {intendedPlan === "lifetime" ? "Accès à vie (9,99€)" : "Abonnement (3,99€/mois)"}
                    </div>
                    <div style={styles.anonBannerSub}>
                      Un compte est obligatoire pour payer — crée-en un ci-dessous, tu seras redirigé vers le paiement juste après.
                    </div>
                  </div>
                </div>
              )}

              <p style={styles.discussSub}>
                Un compte garde ton historique de parties et ta photo de profil. Un abonnement ou l'accès à vie débloque en plus toutes les options avancées de partie, sans limite.
              </p>
              <p style={styles.discussSub}>Un code d'accès bêta ? Crée d'abord un compte ci-dessous, tu pourras le saisir juste après.</p>

              {tab !== "forgot" && (
                <>
                  <button type="button" onClick={handleGoogleSignIn} style={{ ...styles.googleBtn, opacity: loading ? 0.6 : 1 }} disabled={loading}>
                    <GoogleIcon size={18} />
                    Continuer avec Google
                  </button>

                  <div style={styles.orDivider}>
                    <span style={styles.orDividerLine} />
                    <span style={styles.orDividerText}>ou</span>
                    <span style={styles.orDividerLine} />
                  </div>

                  <div style={styles.accountTabs}>
                    <button style={tab === "signin" ? styles.accountTabActive : styles.accountTab} onClick={() => switchTab("signin")}>
                      Se connecter
                    </button>
                    <button style={tab === "signup" ? styles.accountTabActive : styles.accountTab} onClick={() => switchTab("signup")}>
                      Créer un compte
                    </button>
                  </div>
                </>
              )}

              {error && <p style={styles.errorText}>{error}</p>}
              {info && <p style={styles.successText}>{info}</p>}

              {tab === "signin" && (
                <>
                  <form onSubmit={handleSignIn}>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="toi@exemple.com"
                        style={styles.nameInput}
                        autoComplete="email"
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Mot de passe</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        style={styles.nameInput}
                        autoComplete="current-password"
                      />
                    </div>
                    <button type="submit" style={{ ...styles.primaryBtn, opacity: loading ? 0.6 : 1 }} disabled={loading}>
                      {loading ? "Connexion…" : "Se connecter"}
                    </button>
                  </form>
                  <button type="button" onClick={() => switchTab("forgot")} style={styles.betaAccessLink}>
                    Mot de passe oublié ?
                  </button>
                </>
              )}

              {tab === "signup" && (
                <form onSubmit={handleSignUp}>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Nom affiché (optionnel)</label>
                    <input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Ton pseudo"
                      style={styles.nameInput}
                      autoComplete="nickname"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="toi@exemple.com"
                      style={styles.nameInput}
                      autoComplete="email"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Mot de passe (6 caractères min.)</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      style={styles.nameInput}
                      autoComplete="new-password"
                    />
                  </div>
                  <button type="submit" style={{ ...styles.primaryBtn, opacity: loading ? 0.6 : 1 }} disabled={loading}>
                    {loading ? "Création…" : "Créer un compte"}
                  </button>
                </form>
              )}

              {tab === "forgot" && (
                <form onSubmit={handleForgotPassword}>
                  <p style={styles.discussSub}>Entre ton email, on t'envoie un lien pour choisir un nouveau mot de passe.</p>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="toi@exemple.com"
                      style={styles.nameInput}
                      autoComplete="email"
                      autoFocus
                    />
                  </div>
                  <button type="submit" style={{ ...styles.primaryBtn, opacity: loading ? 0.6 : 1 }} disabled={loading}>
                    {loading ? "Envoi…" : "Envoyer le lien"}
                  </button>
                  <button type="button" onClick={() => switchTab("signin")} style={{ ...styles.secondaryBtn, opacity: loading ? 0.6 : 1 }} disabled={loading}>
                    Retour
                  </button>
                </form>
              )}
            </>
          )}

          {SUPABASE_CONFIGURED && !passwordRecovery && user && (
            <>
              <input
                type="file"
                accept="image/*"
                ref={avatarInputRef}
                style={{ display: "none" }}
                onChange={handleAvatarChange}
              />
              <div style={styles.profileHead}>
                <button
                  onClick={() => avatarInputRef.current && avatarInputRef.current.click()}
                  style={{ ...styles.photoBtn, width: 56, height: 56, border: "none", background: "transparent", opacity: avatarUploading ? 0.5 : 1 }}
                  aria-label="Changer la photo de profil"
                  disabled={avatarUploading}
                >
                  {profile && profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="" style={styles.profileAvatar} />
                  ) : (
                    <div style={styles.profileAvatarPlaceholder}>{initial}</div>
                  )}
                </button>
                <div>
                  <div style={styles.profileName}>{displayNameShown}</div>
                  <div style={styles.profileEmail}>{user.email}</div>
                  <div style={hasPremium ? styles.planBadgePremium : styles.planBadge}>{planLabel}</div>
                </div>
              </div>
              {profile && profile.avatar_url && !avatarUploading && (
                <button onClick={handleAvatarRemove} style={styles.avatarRemoveLink} disabled={avatarUploading}>
                  Supprimer la photo
                </button>
              )}
              {avatarUploading && <p style={styles.discussSub}>Envoi en cours…</p>}
              {avatarError && <p style={styles.errorText}>{avatarError}</p>}

              {paymentNotice === "succes" && (
                <p style={styles.successText}>Paiement enregistré, merci ! Ça peut prendre quelques secondes à s'activer ci-dessous.</p>
              )}
              {paymentNotice === "annule" && <p style={styles.discussSub}>Paiement annulé, tu peux réessayer quand tu veux.</p>}

              {/* Code d'accès bêta — réservé aux comptes connectés (donc avec
                  un email vérifié) : c'est ce qui force à créer un compte
                  avant de pouvoir jouer gratuitement en entier, tout en
                  gardant le paiement comme voie normale pour le grand
                  public. Voir src/data/beta-access.js pour la nuance sur le
                  niveau de protection réel de ce code. */}
              {betaAccess ? (
                <p style={styles.successText}>🎟️ Accès bêta activé — tout est débloqué, merci de tester !</p>
              ) : showBetaForm ? (
                <form onSubmit={handleBetaSubmit} style={styles.betaAccessForm}>
                  <div style={{ flex: 1 }}>
                    <label style={styles.formLabel}>Code d'accès bêta</label>
                    <input
                      value={betaCode}
                      onChange={(e) => setBetaCode(e.target.value)}
                      placeholder="Code fourni"
                      style={styles.nameInput}
                      autoComplete="off"
                      autoFocus
                    />
                  </div>
                  <button type="submit" style={{ ...styles.secondaryBtn, width: "auto", marginTop: 0, padding: "13px 18px" }}>
                    Valider
                  </button>
                </form>
              ) : (
                <button onClick={() => setShowBetaForm(true)} style={styles.betaAccessLink}>
                  J'ai un code d'accès bêta
                </button>
              )}
              {!betaAccess && betaError && <p style={styles.errorText}>{betaError}</p>}

              {!betaAccess && !STRIPE_CONFIGURED && <p style={styles.discussSub}>Le paiement n'est pas encore disponible sur cette version.</p>}

              {!betaAccess && STRIPE_CONFIGURED && purchases === null && <p style={styles.discussSub}>Chargement de ton offre…</p>}

              {!betaAccess && STRIPE_CONFIGURED && purchases !== null && hasLifetime && (
                <p style={styles.discussSub}>Tu as l'accès à vie — merci ! Toutes les options sont débloquées, pour toujours.</p>
              )}

              {!betaAccess && STRIPE_CONFIGURED && purchases !== null && activeSub && (
                <button
                  onClick={handleManageSubscription}
                  style={{ ...styles.secondaryBtn, opacity: checkoutLoading ? 0.6 : 1 }}
                  disabled={!!checkoutLoading}
                >
                  {checkoutLoading === "portal" ? "Ouverture…" : "Gérer mon abonnement"}
                </button>
              )}

              {!betaAccess && STRIPE_CONFIGURED && purchases !== null && !hasLifetime && (
                <div style={styles.planSection}>
                  {checkoutError && <p style={styles.errorText}>{checkoutError}</p>}

                  {!activeSub && (
                    <div style={styles.planOption}>
                      <div style={styles.planOptionTitle}>Abonnement</div>
                      <div style={styles.planOptionPrice}>3,99€/mois — essai gratuit 7 jours</div>
                      <div style={styles.planOptionDesc}>Résiliable à tout moment.</div>
                      <button
                        onClick={() => handleSubscribe("subscription")}
                        style={{ ...styles.primaryBtn, opacity: checkoutLoading ? 0.6 : 1 }}
                        disabled={!!checkoutLoading}
                      >
                        {checkoutLoading === "subscription" ? "Redirection…" : "S'abonner"}
                      </button>
                    </div>
                  )}

                  <div style={styles.planOption}>
                    <div style={styles.planOptionTitle}>Accès à vie</div>
                    <div style={styles.planOptionPrice}>9,99€ — paiement unique</div>
                    <div style={styles.planOptionDesc}>Débloqué pour toujours, aucun renouvellement.</div>
                    <button
                      onClick={() => handleSubscribe("lifetime")}
                      style={{ ...styles.primaryBtn, opacity: checkoutLoading ? 0.6 : 1 }}
                      disabled={!!checkoutLoading}
                    >
                      {checkoutLoading === "lifetime" ? "Redirection…" : "Débloquer à vie"}
                    </button>
                  </div>
                </div>
              )}

              <button onClick={handleSignOut} style={{ ...styles.secondaryBtn, opacity: loading ? 0.6 : 1 }} disabled={loading}>
                Se déconnecter
              </button>

              {!deleteConfirm ? (
                <button
                  onClick={() => {
                    setDeleteError(null);
                    setDeleteConfirm(true);
                  }}
                  style={styles.avatarRemoveLink}
                >
                  Supprimer mon compte
                </button>
              ) : (
                <div style={styles.planSection}>
                  <p style={styles.errorText}>
                    Cette action est définitive : ton profil, ton historique de parties et tes achats seront
                    supprimés. Elle ne peut pas être annulée.
                  </p>
                  {deleteError && <p style={styles.errorText}>{deleteError}</p>}
                  <button
                    onClick={handleDeleteAccount}
                    style={{ ...styles.resetScoreBtn, opacity: deleteLoading ? 0.6 : 1 }}
                    disabled={deleteLoading}
                  >
                    {deleteLoading ? "Suppression…" : "Confirmer la suppression définitive"}
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    style={{ ...styles.secondaryBtn, opacity: deleteLoading ? 0.6 : 1 }}
                    disabled={deleteLoading}
                  >
                    Annuler
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Supabase renvoie ses messages d'erreur en anglais — on traduit les cas les
// plus courants pour rester cohérent avec le reste de l'app (100% en
// français), et on retombe sur le message original sinon plutôt que de le
// masquer (mieux vaut un message en anglais qu'aucune info en cas d'erreur
// imprévue).
function traduireErreur(message) {
  const table = {
    "Invalid login credentials": "Email ou mot de passe incorrect.",
    "User already registered": "Un compte existe déjà avec cet email.",
    "Email not confirmed": "Confirme d'abord ton email (lien envoyé à l'inscription).",
    "Password should be at least 6 characters": "Le mot de passe doit faire au moins 6 caractères.",
  };
  return table[message] || message;
}
