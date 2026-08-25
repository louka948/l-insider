// ---------------------------------------------------------------------------
// Écran : HappyMascot — extrait de imposteurfoot_11.html (Étape 5 du plan de
// remise en ordre de l'architecture). Contenu inchangé, seulement déplacé.
// Assemblé automatiquement par build/assemble.js — voir ce fichier pour
// comprendre comment ce fichier se retrouve dans le jeu final.
// ---------------------------------------------------------------------------

function HappyMascot({ color, size = 64 }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={styles.mascotBounce}>
      <circle cx="50" cy="32" r="14" fill={color} />
      <path d="M50 12 a10 10 0 0 1 0 -2" stroke={color} strokeWidth="0" />
      <path d="M28 92 C28 66 37 55 50 55 C63 55 72 66 72 92 Z" fill={color} />
      <path d="M28 60 L14 40" stroke={color} strokeWidth="7" strokeLinecap="round" />
      <path d="M72 60 L86 40" stroke={color} strokeWidth="7" strokeLinecap="round" />
      <circle cx="44" cy="30" r="2.2" fill={COLORS.white} />
      <circle cx="56" cy="30" r="2.2" fill={COLORS.white} />
      <path d="M43 37 Q50 42 57 37" stroke={COLORS.white} strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}
