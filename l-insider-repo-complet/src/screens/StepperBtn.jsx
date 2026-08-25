// ---------------------------------------------------------------------------
// Écran : StepperBtn — extrait de imposteurfoot_11.html (Étape 5 du plan de
// remise en ordre de l'architecture). Contenu inchangé, seulement déplacé.
// Assemblé automatiquement par build/assemble.js — voir ce fichier pour
// comprendre comment ce fichier se retrouve dans le jeu final.
// ---------------------------------------------------------------------------

function StepperBtn({ children, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...styles.stepperBtn, opacity: disabled ? 0.35 : 1 }}>
      {children}
    </button>
  );
}
