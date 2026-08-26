// ---------------------------------------------------------------------------
// Écran : SetupScreen — extrait de imposteurfoot_11.html (Étape 5 du plan de
// remise en ordre de l'architecture). Contenu inchangé, seulement déplacé.
// Assemblé automatiquement par build/assemble.js — voir ce fichier pour
// comprendre comment ce fichier se retrouve dans le jeu final.
// ---------------------------------------------------------------------------

function SetupScreen({ count, resizeNames, names, setNames, photos, setPhotos, numUndercover, setNumUndercover, numBlanc, setNumBlanc, category, setCategory, selectedClub, setSelectedClub, era, setEra, mode, setMode, hardMode, setHardMode, timerEnabled, setTimerEnabled, timerDuration, setTimerDuration, onStart, blocked, anonRemaining, isPremium, hasAccount, onRequireAccount }) {
  // Décision produit (revue une deuxième fois avec l'utilisateur) : pendant
  // les 5 parties gratuites, TOUTES les options sont débloquées — plus de
  // palier intermédiaire "restricted" limitant au mode classique brut. Le
  // seul vrai palier qui reste est "blocked" : une fois les 5 parties
  // gratuites épuisées, il faut passer premium (ou rentrer le code bêta)
  // pour continuer à jouer, quelle que soit l'option choisie.
  // Règle demandée par l'utilisateur le 26 août 2026 : plus aucun plafond
  // arbitraire (ni moitié, ni tiers de l'effectif) — "c'est à l'utilisateur
  // de décider de sa propre partie". Infiltrés et carte blanche partagent
  // seulement une contrainte incompressible : il doit rester au moins 1
  // civil (sans quoi personne ne porte le mot commun autour duquel tourne
  // la partie). Chaque compteur est donc seulement plafonné par ce qu'il
  // reste une fois l'autre compteur déduit. (Avant cette date, une règle du
  // 24 août 2026 plafonnait en plus chaque compteur à la moitié de
  // l'effectif — retirée ici sur retour explicite de l'utilisateur.) Voir
  // aussi resizeNames dans imposteurfoot_11.html, qui applique la même
  // logique en cascade quand l'effectif change.
  const maxUndercover = Math.max(1, count - numBlanc - 1);
  const maxBlanc = Math.max(0, count - numUndercover - 1);
  const noClubSelected = category === "CLUB" && !selectedClub;
  const noRoleSelected = numUndercover === 0 && numBlanc === 0;
  const disableStart = !blocked && (noRoleSelected || noClubSelected);
  const [activeIndex, setActiveIndex] = useState(null);
  const fileInputRef = useRef(null);

  function triggerUpload(i) {
    setActiveIndex(i);
    if (fileInputRef.current) fileInputRef.current.click();
  }

  function handleFileChange(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file || activeIndex === null) return;
    const reader = new FileReader();
    reader.onload = () => {
      const next = [...photos];
      next[activeIndex] = reader.result;
      setPhotos(next);
    };
    reader.readAsDataURL(file);
  }

  const [openSection, setOpenSection] = useState(null);
  function toggleSection(key) {
    setOpenSection((prev) => (prev === key ? null : key));
  }

  // Résumés affichés sur la ligne repliée de chaque carte-accordéon, pour
  // qu'on sache d'un coup d'œil ce qui est sélectionné sans avoir à ouvrir.
  const categoryLabel = (CATEGORIES.find((c) => c.id === category) || {}).label || "";
  const eraLabel = (ERA_OPTIONS.find((e) => e.id === era) || {}).label || "";
  const modeLabel = (GAME_MODES.find((m) => m.id === mode) || {}).label || "";

  const categorySummaryParts = [categoryLabel];
  if (category === "CLUB") categorySummaryParts.push(selectedClub || "aucun championnat");
  if (era !== "ALL") categorySummaryParts.push(eraLabel);
  const categorySummary = categorySummaryParts.join(" · ");

  const modeSummary = hardMode ? `${modeLabel} · Difficile` : modeLabel;
  const effectifSummary = `${count} joueur${count > 1 ? "s" : ""}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <input type="file" accept="image/*" ref={fileInputRef} style={{ display: "none" }} onChange={handleFileChange} />

      {/* Bannière purement informative (n'importe quelle option reste
          accessible pendant les parties gratuites) — indique juste où on en
          est du compteur, et invite à débloquer l'illimité une fois épuisé. */}
      {!isPremium && (
        <button onClick={onRequireAccount} style={styles.anonBanner}>
          <AccountIcon size={18} color={COLORS.gold} />
          <div style={{ textAlign: "left", flex: 1, minWidth: 0 }}>
            <div style={styles.anonBannerTitle}>
              {blocked
                ? "Parties gratuites épuisées"
                : `${anonRemaining} partie${anonRemaining > 1 ? "s" : ""} gratuite${anonRemaining > 1 ? "s" : ""} restante${anonRemaining > 1 ? "s" : ""}`}
            </div>
            <div style={styles.anonBannerSub}>
              {blocked
                ? hasAccount
                  ? "Passe premium (abonnement ou accès à vie) pour continuer à jouer, sans limite."
                  : "Crée un compte et passe premium pour continuer à jouer, sans limite."
                : "Toutes les options sont débloquées pendant tes parties gratuites."}
            </div>
          </div>
          <ChevronRight size={16} style={{ opacity: 0.6, flexShrink: 0 }} />
        </button>
      )}

      {/* Effectif — carte-accordéon repliée par défaut : les prénoms sont
          optionnels (le placeholder "Joueur N" suffit), donc pas besoin
          d'occuper de l'espace en permanence pour ce réglage. */}
      <div style={styles.card}>
        <button style={styles.sectionRow} onClick={() => toggleSection("effectif")}>
          <span style={styles.sectionRowLeft}>
            <Users size={14} />
            <span>Effectif</span>
          </span>
          <span style={styles.sectionRowRight}>
            <span style={styles.sectionRowValue}>{effectifSummary}</span>
            <ChevronRight size={16} style={{ ...styles.sectionRowChevron, transform: openSection === "effectif" ? "rotate(90deg)" : "rotate(0deg)" }} />
          </span>
        </button>
        {openSection === "effectif" && (
          <div style={{ animation: "dossierRise 0.25s ease-out" }}>
            <div style={{ ...styles.stepperRow, marginTop: 16 }}>
              <StepperBtn onClick={() => count > 3 && resizeNames(count - 1)} disabled={count <= 3}>
                <Minus size={16} />
              </StepperBtn>
              <div style={styles.stepperValue}>{count} joueurs</div>
              <StepperBtn onClick={() => count < 12 && resizeNames(count + 1)} disabled={count >= 12}>
                <Plus size={16} />
              </StepperBtn>
            </div>

            <div style={styles.playerSetupList}>
              {names.map((n, i) => (
                <div key={i} style={styles.playerSetupRow}>
                  <button onClick={() => triggerUpload(i)} style={styles.photoBtn} aria-label="Ajouter une photo">
                    {photos[i] ? (
                      <img src={photos[i]} alt="" style={styles.photoImg} />
                    ) : (
                      <Camera size={16} color="rgba(255,255,255,0.5)" />
                    )}
                  </button>
                  <input
                    value={n}
                    onChange={(e) => {
                      const next = [...names];
                      next[i] = e.target.value;
                      setNames(next);
                    }}
                    placeholder={`Joueur ${i + 1}`}
                    style={styles.nameInputFlex}
                    maxLength={16}
                  />
                </div>
              ))}
            </div>
            <p style={{ ...styles.tipText, marginBottom: 0 }}>Ajoute une photo de profil par joueur (optionnel) — elle apparaîtra pendant la partie.</p>
          </div>
        )}
      </div>

      {/* Catégorie — regroupe catégorie, club (par championnat) et période
          dans une seule carte-accordéon, repliée par défaut. */}
      <div style={styles.card}>
        <button style={styles.sectionRow} onClick={() => toggleSection("categorie")}>
          <span style={styles.sectionRowLeft}>
            <Sparkles size={14} />
            <span>Catégorie</span>
          </span>
          <span style={styles.sectionRowRight}>
            <span style={styles.sectionRowValue}>{categorySummary}</span>
            <ChevronRight size={16} style={{ ...styles.sectionRowChevron, transform: openSection === "categorie" ? "rotate(90deg)" : "rotate(0deg)" }} />
          </span>
        </button>
        {openSection === "categorie" && (
          <div style={{ animation: "dossierRise 0.25s ease-out" }}>
            <div style={{ ...styles.chipGrid, marginTop: 16, marginBottom: category === "CLUB" ? 4 : 18 }}>
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  style={{
                    ...styles.chip,
                    borderColor: category === c.id ? COLORS.gold : "rgba(255,255,255,0.15)",
                    background: category === c.id ? "rgba(232,185,35,0.15)" : "rgba(255,255,255,0.045)",
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {category === "CLUB" && (
              <>
                <div style={styles.clubLeagueScroll}>
                  {LEAGUES.map((league) => (
                    <button
                      key={league.name}
                      onClick={() => setSelectedClub(league.name)}
                      style={{
                        ...styles.modeRow,
                        marginBottom: 8,
                        position: "relative",
                        overflow: "hidden",
                        borderColor: selectedClub === league.name ? COLORS.gold : "rgba(255,255,255,0.15)",
                        background: selectedClub === league.name ? "rgba(232,185,35,0.15)" : "rgba(255,255,255,0.045)",
                      }}
                    >
                      <span style={styles.leagueFlagWatermark}>
                        <LeagueFlagIcon league={league.name} />
                      </span>
                      <div style={{ position: "relative", zIndex: 1 }}>
                        <div style={styles.toggleTitle}>{league.name}</div>
                        <div style={styles.toggleSub}>{league.clubs.join(" · ")}</div>
                      </div>
                    </button>
                  ))}
                </div>
                {noClubSelected && <p style={styles.warnText}>Choisis un championnat pour continuer.</p>}
              </>
            )}

            <div style={styles.leagueLabel}>Génération</div>
            <div style={{ ...styles.chipGrid, marginBottom: 0 }}>
              {ERA_OPTIONS.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setEra(e.id)}
                  style={{
                    ...styles.chip,
                    borderColor: era === e.id ? COLORS.gold : "rgba(255,255,255,0.15)",
                    background: era === e.id ? "rgba(232,185,35,0.15)" : "rgba(255,255,255,0.045)",
                  }}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mode de jeu — carte-accordéon repliée par défaut. */}
      <div style={styles.card}>
        <button style={styles.sectionRow} onClick={() => toggleSection("mode")}>
          <span style={styles.sectionRowLeft}>
            <MessageCircleQuestion size={14} />
            <span>Mode de jeu</span>
          </span>
          <span style={styles.sectionRowRight}>
            <span style={styles.sectionRowValue}>{modeSummary}</span>
            <ChevronRight size={16} style={{ ...styles.sectionRowChevron, transform: openSection === "mode" ? "rotate(90deg)" : "rotate(0deg)" }} />
          </span>
        </button>
        {openSection === "mode" && (
          <div style={{ animation: "dossierRise 0.25s ease-out" }}>
            <div style={{ ...styles.modeStack, marginTop: 16, marginBottom: mode !== "clue" ? 8 : 0 }}>
              {GAME_MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  style={{
                    ...styles.modeRow,
                    borderColor: mode === m.id ? COLORS.gold : "rgba(255,255,255,0.15)",
                    background: mode === m.id ? "rgba(232,185,35,0.15)" : "rgba(255,255,255,0.045)",
                  }}
                >
                  <div>
                    <div style={styles.toggleTitle}>{m.label}</div>
                    <div style={styles.toggleSub}>{m.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            {mode !== "clue" && (
              <button
                onClick={() => setHardMode(!hardMode)}
                style={{ ...styles.toggleRow, borderColor: hardMode ? COLORS.danger : "rgba(255,255,255,0.15)", marginBottom: 0 }}
              >
                <div>
                  <div style={styles.toggleTitle}>Mode difficile</div>
                  <div style={styles.toggleSub}>Interdit les questions sur le physique — réponses en oui/non uniquement</div>
                </div>
                <div style={{ ...styles.toggleTrack, background: hardMode ? COLORS.danger : "rgba(255,255,255,0.18)", justifyContent: hardMode ? "flex-end" : "flex-start" }}>
                  <div style={styles.toggleKnob} />
                </div>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Chrono de discussion — carte compacte toujours visible (peu de
          hauteur), pas besoin de la replier. */}
      <div style={styles.card}>
        <button
          onClick={() => setTimerEnabled(!timerEnabled)}
          style={{ ...styles.toggleRow, borderColor: timerEnabled ? COLORS.gold : "rgba(255,255,255,0.15)", marginBottom: timerEnabled ? 10 : 0 }}
        >
          <div>
            <div style={styles.toggleTitle}>Chrono de discussion</div>
            <div style={styles.toggleSub}>Limite le temps de discussion pour ne pas s'éterniser</div>
          </div>
          <div style={{ ...styles.toggleTrack, background: timerEnabled ? COLORS.gold : "rgba(255,255,255,0.18)", justifyContent: timerEnabled ? "flex-end" : "flex-start" }}>
            <div style={styles.toggleKnob} />
          </div>
        </button>

        {timerEnabled && (
          <div style={{ ...styles.chipGrid, marginBottom: 0 }}>
            {TIMER_OPTIONS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTimerDuration(t.id)}
                style={{
                  ...styles.chip,
                  borderColor: timerDuration === t.id ? COLORS.gold : "rgba(255,255,255,0.15)",
                  background: timerDuration === t.id ? "rgba(232,185,35,0.15)" : "rgba(255,255,255,0.045)",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Infiltrés — carte compacte toujours visible. */}
      <div style={styles.card}>
        <SectionLabel icon={<ShieldAlert size={14} />} text="Infiltrés" />
        <div style={styles.stepperRow}>
          <StepperBtn onClick={() => numUndercover > 0 && setNumUndercover(numUndercover - 1)} disabled={numUndercover <= 0}>
            <Minus size={16} />
          </StepperBtn>
          <div style={styles.stepperValue}>{numUndercover}</div>
          <StepperBtn
            onClick={() => {
              if (numUndercover >= maxUndercover) return;
              // On ne fait avancer que ce compteur ; si la carte blanche
              // occupait la place qu'on vient de prendre dans le budget
              // partagé, on la réduit d'autant pour ne jamais tomber à
              // 0 civil (voir le commentaire sur maxUndercover/maxBlanc
              // plus haut).
              const nextUndercover = numUndercover + 1;
              setNumUndercover(nextUndercover);
              const nextMaxBlanc = Math.max(0, count - nextUndercover - 1);
              if (numBlanc > nextMaxBlanc) setNumBlanc(nextMaxBlanc);
            }}
            disabled={numUndercover >= maxUndercover}
          >
            <Plus size={16} />
          </StepperBtn>
        </div>

        <div style={{ marginTop: 4 }}>
          <div style={styles.toggleTitle}>Carte blanche</div>
          <div style={{ ...styles.toggleSub, marginBottom: 10 }}>
            Un ou plusieurs joueurs sans carte du tout, qui doivent bluffer à l'aveugle
          </div>
          <div style={{ ...styles.stepperRow, marginBottom: 0 }}>
            <StepperBtn onClick={() => numBlanc > 0 && setNumBlanc(numBlanc - 1)} disabled={numBlanc <= 0}>
              <Minus size={16} />
            </StepperBtn>
            <div style={styles.stepperValue}>{numBlanc}</div>
            <StepperBtn
              onClick={() => {
                if (numBlanc >= maxBlanc) return;
                setNumBlanc(numBlanc + 1);
              }}
              disabled={numBlanc >= maxBlanc}
            >
              <Plus size={16} />
            </StepperBtn>
          </div>
        </div>

        {noRoleSelected && <p style={{ ...styles.warnText, marginTop: 10, marginBottom: 0 }}>Choisis au moins 1 infiltré ou 1 carte blanche.</p>}
      </div>

      <button style={{ ...styles.primaryBtn, opacity: disableStart ? 0.4 : 1 }} disabled={disableStart} onClick={onStart}>
        {blocked ? (hasAccount ? "Passer premium pour continuer" : "Créer un compte pour continuer") : "Lancer la partie"} <ChevronRight size={18} />
      </button>
    </div>
  );
}
