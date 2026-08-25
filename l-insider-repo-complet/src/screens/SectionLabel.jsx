// ---------------------------------------------------------------------------
// Écran : SectionLabel — extrait de imposteurfoot_11.html (Étape 5 du plan de
// remise en ordre de l'architecture). Contenu inchangé, seulement déplacé.
// Assemblé automatiquement par build/assemble.js — voir ce fichier pour
// comprendre comment ce fichier se retrouve dans le jeu final.
// ---------------------------------------------------------------------------

function SectionLabel({ icon, text }) {
  return (
    <div style={styles.sectionLabel}>
      {icon}
      <span>{text}</span>
    </div>
  );
}
