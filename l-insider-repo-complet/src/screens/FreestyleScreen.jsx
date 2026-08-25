// ---------------------------------------------------------------------------
// Écran : FreestyleScreen — extrait de imposteurfoot_11.html (Étape 5 du plan de
// remise en ordre de l'architecture). Contenu inchangé, seulement déplacé.
// Assemblé automatiquement par build/assemble.js — voir ce fichier pour
// comprendre comment ce fichier se retrouve dans le jeu final.
// ---------------------------------------------------------------------------

function FreestyleScreen({ round, alivePlayers, questions, hardMode, timerEnabled, timerDuration, onVote }) {
  return (
    <div style={styles.card}>
      <SectionLabel icon={<MessageCircleQuestion size={14} />} text={`Manche ${round} — Mode libre`} />
      {timerEnabled && <DiscussTimer key={round} duration={timerDuration} />}
      {hardMode && (
        <div style={styles.hardModeBanner}>Mode difficile — réponses en oui/non uniquement, questions sur le physique interdites</div>
      )}
      <h2 style={styles.discussTitle}>Posez vos questions librement</h2>
      <p style={styles.discussSub}>
        Chacun interroge qui il veut, dans l'ordre qu'il veut. Restez sur des questions fermées (oui/non) et ne citez jamais un nom de joueur. Quelques idées si besoin :
      </p>
      <div style={styles.questionList}>
        {questions.map((q, i) => (
          <div key={i} style={styles.questionRow}>{q}</div>
        ))}
      </div>
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
