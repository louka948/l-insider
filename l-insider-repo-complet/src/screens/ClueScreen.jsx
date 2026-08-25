// ---------------------------------------------------------------------------
// Écran : ClueScreen — extrait de imposteurfoot_11.html (Étape 5 du plan de
// remise en ordre de l'architecture). Contenu inchangé, seulement déplacé.
// Assemblé automatiquement par build/assemble.js — voir ce fichier pour
// comprendre comment ce fichier se retrouve dans le jeu final.
// ---------------------------------------------------------------------------

function ClueScreen({ round, alivePlayers, timerEnabled, timerDuration, onVote }) {
  return (
    <div style={styles.card}>
      <SectionLabel icon={<Radar size={14} />} text={`Manche ${round} — Indices`} />
      {timerEnabled && <DiscussTimer key={round} duration={timerDuration} />}
      <h2 style={styles.discussTitle}>Chacun donne un indice</h2>
      <p style={styles.discussSub}>
        À tour de rôle, chaque joueur encore en jeu dit un mot ou une courte phrase sur son joueur — sans jamais citer son nom. Puis discutez librement pour repérer les infiltrés.
      </p>
      <div style={styles.playerList}>
        {alivePlayers.map((p, i) => (
          <HumanRosterRow key={p.id} index={i} player={p} />
        ))}
      </div>
      <button style={styles.primaryBtn} onClick={onVote}>
        Passer au vote <ChevronRight size={18} />
      </button>
    </div>
  );
}
