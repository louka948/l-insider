// ---------------------------------------------------------------------------
// Écran : DiscussTimer — extrait de imposteurfoot_11.html (Étape 5 du plan de
// remise en ordre de l'architecture). Contenu inchangé, seulement déplacé.
// Assemblé automatiquement par build/assemble.js — voir ce fichier pour
// comprendre comment ce fichier se retrouve dans le jeu final.
// ---------------------------------------------------------------------------

function DiscussTimer({ duration }) {
  const [remaining, setRemaining] = useState(duration);

  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => {
      setRemaining((r) => (r > 0 ? r - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [remaining]);

  const expired = remaining <= 0;
  const low = !expired && remaining <= 10;

  return (
    <div
      style={{
        ...styles.timerBadge,
        borderColor: expired ? COLORS.danger : low ? COLORS.gold : "rgba(255,255,255,0.18)",
        background: expired ? "rgba(200,30,58,0.15)" : low ? "rgba(232,185,35,0.12)" : "rgba(255,255,255,0.05)",
      }}
    >
      <Timer size={16} color={expired ? COLORS.dangerText : low ? COLORS.gold : COLORS.textPrimary} />
      {expired ? (
        <span style={{ color: COLORS.dangerText, fontWeight: 700 }}>Temps écoulé ! Passez au vote quand vous voulez</span>
      ) : (
        <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>{formatClock(remaining)}</span>
      )}
    </div>
  );
}
