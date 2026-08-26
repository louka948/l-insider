// ---------------------------------------------------------------------------
// Écran : EndScreen — extrait de imposteurfoot_11.html (Étape 5 du plan de
// remise en ordre de l'architecture). Contenu inchangé, seulement déplacé.
// Assemblé automatiquement par build/assemble.js — voir ce fichier pour
// comprendre comment ce fichier se retrouve dans le jeu final.
// ---------------------------------------------------------------------------

function EndScreen({ winner, players, pairWords, lastRoundPoints, onReset, onShowScoreboard }) {
  // Bouton "Partager avec tes potes" — ajouté le 26 août 2026 (recommandation
  // marketing) : la fin de partie est le moment le plus naturel pour partager
  // le jeu, puisque tout le groupe qui vient d'y jouer est déjà réuni autour
  // du même téléphone. Web Share API quand disponible (partage natif vers
  // WhatsApp/Messages/etc.), sinon copie du lien dans le presse-papiers avec
  // une confirmation brève "Lien copié !".
  const [shareState, setShareState] = useState("idle"); // idle | copied
  async function handleShare() {
    const shareData = {
      title: "L'Insider",
      text: "On vient de jouer à L'Insider, le jeu d'imposteur foot entre potes — essaie !",
      url: SHARE_URL,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (e) {
        // Annulation du partage par l'utilisateur (ou API indisponible en
        // pratique malgré sa présence) : on ne fait rien, ce n'est pas une erreur.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(SHARE_URL);
      setShareState("copied");
      setTimeout(() => setShareState("idle"), 2000);
    } catch (e) {
      // Presse-papiers indisponible (contexte non sécurisé, permission refusée…) :
      // on échoue silencieusement plutôt que de casser l'écran de fin.
    }
  }
  const label = winner === "civils" ? "Les civils gagnent" : winner === "infiltres" ? "Les infiltrés gagnent" : "La carte blanche gagne";
  const colorMap = {
    civils: { win: COLORS.civilGreenBright, lose: COLORS.danger },
    infiltres: { win: COLORS.danger, lose: COLORS.civilGreenBright },
    blanc: { win: COLORS.neutralGray, lose: COLORS.civilGreenBright },
  };
  const { win: color, lose: loseColor } = colorMap[winner] || colorMap.civils;
  return (
    <div style={{ ...styles.card, position: "relative", overflow: "hidden" }}>
      <div style={styles.flashOverlay} />
      <Confetti />
      {/* Tampon d'ouverture du dossier final — même geste que la révélation
          de rôle, mais à l'échelle de toute la partie : "RÉVÉLÉ" claque
          avant que le reste du contenu (mots, rôles) n'apparaisse. */}
      <div style={styles.endStampWrap}>
        <div style={{ ...styles.endStamp, color, borderColor: color }}>Révélé</div>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 18, marginBottom: 6, position: "relative", zIndex: 1 }}>
        <HappyMascot color={color} />
        <SadMascot color={loseColor} />
      </div>
      <div style={{ ...styles.endBanner, color, position: "relative", zIndex: 1 }}>
        {label}
        <div style={{ ...styles.endBannerRule, background: color }} />
      </div>

      <div style={styles.wordPairRow}>
        <div style={styles.wordPairBox}>
          <div style={styles.wordPairLabel}>Civils</div>
          <div style={styles.wordPairValue}>{pairWords.civil}</div>
        </div>
        <div style={{ ...styles.wordPairBox, borderTopColor: COLORS.danger }}>
          <div style={styles.wordPairLabel}>Infiltrés</div>
          <div style={styles.wordPairValue}>{pairWords.undercover}</div>
        </div>
      </div>

      <div style={styles.finalList}>
        {players.map((p, i) => {
          const style = ROLE_STYLE[p.role];
          const gained = lastRoundPoints ? lastRoundPoints[p.id] || 0 : 0;
          return (
            <div key={p.id} style={{ ...styles.finalRow, animationDelay: `${i * 0.05}s` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: p.alive ? 1 : 0.5 }}>
                {p.photo ? (
                  <img src={p.photo} alt="" style={styles.finalRowPhoto} />
                ) : (
                  p.word && <PlayerAvatar name={p.word} size={40} />
                )}
                <span>{p.name}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {gained > 0 && <span style={styles.pointsGainChip}>+{gained} pts</span>}
                <span style={{ ...styles.roleChipSmall, background: style.chip, color: style.color }}>{style.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      <button style={styles.primaryBtn} onClick={onReset}>
        <RotateCcw size={16} /> Nouvelle partie
      </button>
      {onShowScoreboard && (
        <button style={styles.secondaryBtn} onClick={onShowScoreboard}>
          <Trophy size={16} /> Voir le classement
        </button>
      )}
      <button style={styles.secondaryBtn} onClick={handleShare}>
        <Share2 size={16} /> {shareState === "copied" ? "Lien copié !" : "Partager avec tes potes"}
      </button>

      {NEWSLETTER_URL && <NewsletterPrompt />}
    </div>
  );
}

// Petit encart facultatif proposé en fin de partie, jamais bloquant :
// renvoie vers un formulaire externe (ex: Tally) via un simple lien, plutôt
// que de gérer nous-mêmes l'envoi d'email (pas de backend ici). Ne s'affiche
// que si NEWSLETTER_URL est configuré, et reste refermable.
