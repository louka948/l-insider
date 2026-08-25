// ---------------------------------------------------------------------------
// Écran : RevealScreen — extrait de imposteurfoot_11.html (Étape 5 du plan de
// remise en ordre de l'architecture). Contenu inchangé, seulement déplacé.
// Assemblé automatiquement par build/assemble.js — voir ce fichier pour
// comprendre comment ce fichier se retrouve dans le jeu final.
// ---------------------------------------------------------------------------

// Bande de données façon feuille de match, affichée sous la photo du
// joueur assigné (POSTE / NATION / ÉPOQUE) — c'est le geste qui fait
// basculer une simple carte-photo vers une vraie fiche de scouting.
// Volontairement absente pour la Carte Blanche (rien à documenter).
function DossierDataStrip({ name }) {
  const meta = PLAYERS.find((p) => p.n === name);
  if (!meta) return null;
  const eras = meta.e && meta.e.length ? `${meta.e[0]}'s` : "—";
  return (
    <div style={styles.dossierDataStrip}>
      <div style={styles.dossierDataCell}>
        <div style={styles.dossierDataLabel}>Poste</div>
        <div style={styles.dossierDataValue}>{POSITION_LABELS[meta.p] || meta.p}</div>
      </div>
      <div style={styles.dossierDataCell}>
        <div style={styles.dossierDataLabel}>Nation</div>
        <div style={styles.dossierDataValue}>{meta.c}</div>
      </div>
      <div style={{ ...styles.dossierDataCell, borderRight: "none" }}>
        <div style={styles.dossierDataLabel}>Époque</div>
        <div style={styles.dossierDataValue}>{eras}</div>
      </div>
    </div>
  );
}

function RevealScreen({ player, index, total, flipped, onFlip, onNext }) {
  return (
    <div style={styles.card}>
      <div style={styles.passLabel}>Passe le téléphone à</div>
      {player.photo ? (
        <img src={player.photo} alt="" style={styles.passPhoto} />
      ) : (
        <div style={styles.passPhotoPlaceholder}>
          <UserRound size={22} color="rgba(255,255,255,0.5)" />
        </div>
      )}
      <div style={styles.passName}>{player.name}</div>
      <div style={styles.progressDots}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{ ...styles.dot, background: i < index ? COLORS.gold : i === index ? COLORS.white : "rgba(255,255,255,0.2)" }} />
        ))}
      </div>

      <div style={styles.flipZone} onClick={!flipped ? onFlip : undefined}>
        <div style={{ ...styles.flipCard, transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}>
          <div style={styles.flipFront}>
            <div style={styles.flipFrontSeal}>
              <ShieldAlert size={26} color={COLORS.gold} />
            </div>
            <div style={styles.flipFrontText}>Touche pour ouvrir<br />le dossier</div>
          </div>
          <div style={styles.flipBack}>
            {flipped && <div style={styles.dossierStampTab}>Confidentiel</div>}
            {flipped && <div style={styles.scanOverlay} />}
            {player.role === "blanc" ? (
              <div style={styles.blancWrap}>
                <ShieldAlert size={26} color={COLORS.cardTextDark} style={{ opacity: 0.35 }} />
                <div style={styles.blancText}>Dossier vide. Tu n'as pas de joueur — écoute les indices et bluffe.</div>
              </div>
            ) : (
              <>
                <div style={styles.photoFillWrap}>
                  <PlayerPhotoFill name={player.word} />
                </div>
                <div style={styles.photoNameBar}>{player.word}</div>
                <DossierDataStrip name={player.word} />
              </>
            )}
          </div>
        </div>
      </div>

      {flipped ? (
        <button style={styles.primaryBtn} onClick={onNext}>
          J'ai vu, carte suivante
        </button>
      ) : (
        <div style={styles.hintRow}>
          <Eye size={14} /> Assure-toi que les autres ne regardent pas
        </div>
      )}
    </div>
  );
}

// Chrono de discussion optionnel : se relance tout seul à chaque manche
// grâce au key={round} posé par l'appelant. Ne force jamais le passage au
// vote quand le temps est écoulé — il ne fait que le signaler visuellement,
// la décision reste aux joueurs.
