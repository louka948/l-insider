// ---------------------------------------------------------------------------
// Écran : VoteScreen — extrait de imposteurfoot_11.html (Étape 5 du plan de
// remise en ordre de l'architecture). Contenu inchangé, seulement déplacé.
// Assemblé automatiquement par build/assemble.js — voir ce fichier pour
// comprendre comment ce fichier se retrouve dans le jeu final.
// ---------------------------------------------------------------------------

function VoteScreen({ alivePlayers, selected, setSelected, onConfirm }) {
  return (
    <div style={styles.card}>
      <SectionLabel icon={<ShieldAlert size={14} />} text="Vote · Accusation" />
      <h2 style={styles.discussTitle}>Qui éliminez-vous ?</h2>
      <div style={styles.voteGrid}>
        {alivePlayers.map((p, i) => {
          const isTarget = selected === p.id;
          return (
            <div key={p.id} style={styles.voteCardWrap}>
              {isTarget && <div style={styles.voteRingPulse} />}
              <button
                onClick={() => setSelected(p.id)}
                style={{
                  ...styles.voteCard,
                  borderColor: isTarget ? COLORS.danger : "rgba(255,255,255,0.15)",
                  background: isTarget ? "rgba(200,30,58,0.14)" : "rgba(255,255,255,0.045)",
                }}
              >
                <span style={styles.voteIndex}>N°{String(i + 1).padStart(2, "0")}</span>
                {p.photo ? (
                  <img src={p.photo} alt="" style={styles.votePhoto} />
                ) : (
                  <div style={styles.votePhotoPlaceholder}>
                    <UserRound size={20} color="rgba(255,255,255,0.5)" />
                  </div>
                )}
                {p.name}
                {isTarget && (
                  <span style={styles.voteTargetMark}>
                    <ShieldAlert size={18} color={COLORS.dangerText} />
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>
      <button
        style={{ ...styles.primaryBtn, opacity: selected === null ? 0.4 : 1, background: selected === null ? COLORS.gold : COLORS.danger, color: COLORS.white }}
        disabled={selected === null}
        onClick={onConfirm}
      >
        Confirmer l'élimination
      </button>
    </div>
  );
}
