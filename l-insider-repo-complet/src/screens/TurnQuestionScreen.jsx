// ---------------------------------------------------------------------------
// Écran : TurnQuestionScreen — extrait de imposteurfoot_11.html (Étape 5 du plan de
// remise en ordre de l'architecture). Contenu inchangé, seulement déplacé.
// Assemblé automatiquement par build/assemble.js — voir ce fichier pour
// comprendre comment ce fichier se retrouve dans le jeu final.
// ---------------------------------------------------------------------------

function TurnQuestionScreen({ round, alivePlayers, turnIndex, questions, hardMode, timerEnabled, timerDuration, onNextTurn, onVote }) {
  const done = turnIndex >= alivePlayers.length;
  const current = alivePlayers[turnIndex];
  // Chaque joueur interroge le suivant dans l'ordre (le dernier boucle sur le
  // premier), pour que ce soit le jeu qui désigne la cible plutôt que de
  // laisser un choix libre.
  const target = !done ? alivePlayers[(turnIndex + 1) % alivePlayers.length] : null;

  return (
    <div style={styles.card}>
      <SectionLabel icon={<MessageCircleQuestion size={14} />} text={`Manche ${round} — Questions par tour`} />
      {timerEnabled && <DiscussTimer key={round} duration={timerDuration} />}
      {hardMode && (
        <div style={styles.hardModeBanner}>Mode difficile — réponses en oui/non uniquement, questions sur le physique interdites</div>
      )}

      {!done ? (
        <>
          <div style={styles.passLabel}>C'est au tour de</div>
          <div style={styles.passName}>{current.name}</div>
          <div style={styles.turnTargetRow}>
            <span>pose sa question à</span>
            <ChevronRight size={14} />
            <span style={styles.turnTargetName}>{target.name}</span>
          </div>
          <p style={styles.discussSub}>
            {current.name} pose une question fermée (oui/non) à {target.name} sur son joueur — sans jamais en dire le nom. Voici quelques idées :
          </p>
          <div style={styles.questionList}>
            {questions.map((q, i) => (
              <div key={i} style={styles.questionRow}>{q}</div>
            ))}
          </div>
          <button style={styles.primaryBtn} onClick={onNextTurn}>
            Question posée, joueur suivant <ChevronRight size={18} />
          </button>
        </>
      ) : (
        <>
          <h2 style={styles.discussTitle}>Tout le monde a posé sa question</h2>
          <p style={styles.discussSub}>Discutez librement des réponses avant de voter.</p>
          <button style={styles.primaryBtn} onClick={onVote}>
            Passer au vote <ChevronRight size={18} />
          </button>
        </>
      )}
    </div>
  );
}
