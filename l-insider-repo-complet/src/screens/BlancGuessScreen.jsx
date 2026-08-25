// ---------------------------------------------------------------------------
// Écran : BlancGuessScreen — extrait de imposteurfoot_11.html (Étape 5 du plan de
// remise en ordre de l'architecture). Contenu inchangé, seulement déplacé.
// Assemblé automatiquement par build/assemble.js — voir ce fichier pour
// comprendre comment ce fichier se retrouve dans le jeu final.
// ---------------------------------------------------------------------------

function BlancGuessScreen({ guess, setGuess, onSubmit, result, civilWord, onContinue }) {
  return (
    <div style={styles.card}>
      <div style={{ ...styles.roleChip, background: ROLE_STYLE.blanc.chip, color: ROLE_STYLE.blanc.color, margin: "0 auto 12px" }}>
        CARTE BLANCHE ÉLIMINÉE
      </div>
      <h2 style={styles.discussTitle}>Dernière chance</h2>
      <p style={styles.discussSub}>Le joueur éliminé peut tenter de deviner le mot des civils pour gagner seul.</p>

      {result === null ? (
        <>
          <input
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            placeholder="Nom du joueur des civils…"
            style={styles.nameInput}
          />
          <button style={{ ...styles.primaryBtn, opacity: guess.trim() ? 1 : 0.4 }} disabled={!guess.trim()} onClick={onSubmit}>
            Valider la réponse
          </button>
        </>
      ) : (
        <>
          <div style={{ textAlign: "center", margin: "14px 0", fontFamily: "'Big Shoulders Display', sans-serif", fontSize: 20, color: result ? COLORS.gold : COLORS.white }}>
            {result ? "Bien joué, la carte blanche gagne !" : `Raté — c'était ${civilWord}`}
          </div>
          {!result && (
            <button style={styles.primaryBtn} onClick={onContinue}>
              Continuer <ChevronRight size={18} />
            </button>
          )}
        </>
      )}
    </div>
  );
}
