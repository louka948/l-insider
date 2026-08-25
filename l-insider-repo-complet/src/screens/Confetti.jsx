// ---------------------------------------------------------------------------
// Écran : Confetti — extrait de imposteurfoot_11.html (Étape 5 du plan de
// remise en ordre de l'architecture). Contenu inchangé, seulement déplacé.
// Assemblé automatiquement par build/assemble.js — voir ce fichier pour
// comprendre comment ce fichier se retrouve dans le jeu final.
// ---------------------------------------------------------------------------

function Confetti() {
  const pieces = Array.from({ length: 22 }).map((_, i) => ({
    left: (i * 37) % 100,
    delay: (i % 7) * 0.3,
    dur: 2.5 + (i % 5) * 0.4,
    color: [COLORS.gold, COLORS.civilGreenBright, COLORS.danger, COLORS.white][i % 4],
  }));
  return (
    <div style={styles.confettiWrap} aria-hidden="true">
      {pieces.map((p, i) => (
        <div
          key={i}
          style={{
            ...styles.confettiPiece,
            left: `${p.left}%`,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
          }}
        />
      ))}
    </div>
  );
}
