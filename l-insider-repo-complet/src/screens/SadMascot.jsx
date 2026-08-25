// ---------------------------------------------------------------------------
// Écran : SadMascot — extrait de imposteurfoot_11.html (Étape 5 du plan de
// remise en ordre de l'architecture). Contenu inchangé, seulement déplacé.
// Assemblé automatiquement par build/assemble.js — voir ce fichier pour
// comprendre comment ce fichier se retrouve dans le jeu final.
// ---------------------------------------------------------------------------

function SadMascot({ color, size = 64 }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={styles.mascotDroop}>
      <g transform="rotate(-6 50 55)">
        <circle cx="50" cy="36" r="14" fill={color} opacity="0.7" />
        <path d="M30 92 C30 70 38 60 50 60 C62 60 70 70 70 92 Z" fill={color} opacity="0.7" />
        <path d="M32 66 L22 78" stroke={color} strokeWidth="6" strokeLinecap="round" opacity="0.7" />
        <path d="M68 66 L78 78" stroke={color} strokeWidth="6" strokeLinecap="round" opacity="0.7" />
        <circle cx="45" cy="34" r="2" fill={COLORS.white} />
        <circle cx="55" cy="34" r="2" fill={COLORS.white} />
        <path d="M44 44 Q50 40 56 44" stroke={COLORS.white} strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}
