// ---------------------------------------------------------------------------
// Écran : NewsletterPrompt — extrait de imposteurfoot_11.html (Étape 5 du plan de
// remise en ordre de l'architecture). Contenu inchangé, seulement déplacé.
// Assemblé automatiquement par build/assemble.js — voir ce fichier pour
// comprendre comment ce fichier se retrouve dans le jeu final.
// ---------------------------------------------------------------------------

function NewsletterPrompt() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div style={styles.newsletterCard}>
      <button style={styles.newsletterClose} onClick={() => setDismissed(true)} aria-label="Fermer">
        <X size={14} />
      </button>
      <div style={styles.newsletterTitle}>Envie d'être prévenu des nouveautés ?</div>
      <div style={styles.newsletterSub}>Nouveaux joueurs, nouveaux modes... laisse ton email si ça t'intéresse, c'est facultatif.</div>
      <a href={NEWSLETTER_URL} target="_blank" rel="noopener noreferrer" style={styles.newsletterBtn}>
        Je laisse mon email
      </a>
    </div>
  );
}
