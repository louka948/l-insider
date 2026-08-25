// ---------------------------------------------------------------------------
// Écran : QuitConfirmModal — extrait de imposteurfoot_11.html (Étape 5 du plan de
// remise en ordre de l'architecture). Contenu inchangé, seulement déplacé.
// Assemblé automatiquement par build/assemble.js — voir ce fichier pour
// comprendre comment ce fichier se retrouve dans le jeu final.
// ---------------------------------------------------------------------------

function QuitConfirmModal({ onCancel, onConfirm }) {
  return (
    <div style={styles.confirmOverlay}>
      <div style={styles.confirmPanel}>
        <div style={styles.confirmTitle}>Quitter la partie ?</div>
        <p style={styles.confirmText}>
          Tu vas perdre la progression de cette manche en cours. Le classement cumulé, lui, sera conservé.
        </p>
        <div style={styles.confirmButtonRow}>
          <button style={styles.ghostBtn} onClick={onCancel}>Annuler</button>
          <button style={styles.dangerBtn} onClick={onConfirm}>Quitter</button>
        </div>
      </div>
    </div>
  );
}
