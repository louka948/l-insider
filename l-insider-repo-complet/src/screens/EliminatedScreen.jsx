// ---------------------------------------------------------------------------
// Écran : EliminatedScreen — extrait de imposteurfoot_11.html (Étape 5 du plan de
// remise en ordre de l'architecture). Contenu inchangé, seulement déplacé.
// Assemblé automatiquement par build/assemble.js — voir ce fichier pour
// comprendre comment ce fichier se retrouve dans le jeu final.
// ---------------------------------------------------------------------------

function EliminatedScreen({ player, onContinue, round }) {
  const style = ROLE_STYLE[player.role];
  return (
    <div style={styles.card}>
      <div style={styles.passLabel}>Sorti du dossier</div>
      {player.photo && <img src={player.photo} alt="" style={styles.passPhoto} />}
      <div style={styles.passName}>{player.name}</div>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div style={{ ...styles.roleChip, background: style.chip, color: style.color, margin: "10px auto 0" }}>{style.label}</div>
      </div>
      <div style={styles.eliminatedTag}>Le mot reste secret jusqu'à la fin</div>
      <button style={{ ...styles.primaryBtn, marginTop: 18 }} onClick={onContinue}>
        Manche {round + 1} <ChevronRight size={18} />
      </button>
    </div>
  );
}
