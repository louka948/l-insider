// ---------------------------------------------------------------------------
// Écran : ScoreboardScreen — extrait de imposteurfoot_11.html (Étape 5 du plan de
// remise en ordre de l'architecture). Contenu inchangé, seulement déplacé.
// Assemblé automatiquement par build/assemble.js — voir ce fichier pour
// comprendre comment ce fichier se retrouve dans le jeu final.
// ---------------------------------------------------------------------------

function ScoreboardScreen({ scores, history, onReset, onClose }) {
  const ranked = Object.entries(scores)
    .map(([name, s]) => ({ name, ...s }))
    .sort((a, b) => b.points - a.points);

  return (
    <div style={styles.rulesOverlay}>
      <div style={styles.rulesPanel}>
        <div style={styles.rulesHeader}>
          <h2 style={styles.discussTitle}>Classement</h2>
          <button onClick={onClose} style={styles.iconBtn} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>

        <div style={styles.rulesBody}>
          {ranked.length === 0 ? (
            <p style={styles.rulesText}>
              Aucune manche jouée pour l'instant. Le classement se remplit automatiquement à la fin de chaque partie.
            </p>
          ) : (
            <>
              <SectionLabel icon={<Trophy size={14} />} text="Score cumulé" />
              <div style={styles.scoreList}>
                {ranked.map((p, i) => (
                  <div key={p.name} style={styles.scoreRow}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={styles.scoreRank}>{i + 1}</span>
                      <span>{p.name}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={styles.scoreSub}>{p.wins}/{p.games} manches gagnées</span>
                      <span style={styles.scorePoints}>{p.points} pts</span>
                    </div>
                  </div>
                ))}
              </div>

              <SectionLabel icon={<History size={14} />} text="Historique des manches" />
              <div style={styles.scoreList}>
                {history.map((h, i) => (
                  <div key={i} style={styles.historyRow}>
                    <span style={styles.scoreRank}>{history.length - i}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>
                        {h.winner === "civils" ? "Civils vainqueurs" : h.winner === "infiltres" ? "Infiltrés vainqueurs" : "Carte blanche vainqueure"}
                      </div>
                      <div style={styles.scoreSub}>Civils : {h.civil} · Infiltrés : {h.undercover}</div>
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={onReset} style={styles.resetScoreBtn}>
                <RotateCcw size={14} /> Réinitialiser le classement
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Confirmation avant d'abandonner la manche en cours, pour éviter de tout
// perdre sur un simple mistouch — accessible à tout moment pendant une
// partie via la croix en haut à gauche.
