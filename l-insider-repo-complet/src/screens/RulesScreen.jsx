// ---------------------------------------------------------------------------
// Écran : RulesScreen — extrait de imposteurfoot_11.html (Étape 5 du plan de
// remise en ordre de l'architecture). Contenu inchangé, seulement déplacé.
// Assemblé automatiquement par build/assemble.js — voir ce fichier pour
// comprendre comment ce fichier se retrouve dans le jeu final.
// ---------------------------------------------------------------------------

function RulesScreen({ onClose }) {
  return (
    <div style={styles.rulesOverlay}>
      <div style={styles.rulesPanel}>
        <div style={styles.rulesHeader}>
          <h2 style={styles.discussTitle}>Règles du jeu</h2>
          <button onClick={onClose} style={styles.iconBtn} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>

        <div style={styles.rulesBody}>
          <SectionLabel icon={<Sparkles size={14} />} text="Comment les duos sont formés" />
          <p style={styles.rulesText}>
            Chaque partie, le jeu choisit un joueur au hasard dans la catégorie sélectionnée, puis cherche parmi les
            autres joueurs ceux dont le profil est le plus proche : même poste, génération qui se chevauche,
            même nationalité, palmarès comparable (Ballon d'Or). Il tire ensuite au hasard parmi les meilleurs
            candidats — jamais toujours le même — pour composer le duo civils / infiltré. Un même joueur peut
            donc se retrouver associé à des partenaires différents d'une partie à l'autre, et ce n'est jamais
            systématiquement lui qui est l'infiltré : les rôles sont retirés au hasard à chaque partie.
          </p>

          <SectionLabel icon={<ShieldAlert size={14} />} text="Les rôles" />
          <p style={styles.rulesText}>
            Les <b>civils</b> reçoivent tous le même joueur. Le ou les <b>infiltrés</b> reçoivent un joueur différent
            mais proche, sans savoir qui a le même mot qu'eux. La <b>Carte blanche</b> (optionnelle) ne reçoit aucun
            joueur : elle doit bluffer à l'aveugle en écoutant les autres.
          </p>

          <SectionLabel icon={<MessageCircleQuestion size={14} />} text="Déroulé d'une manche" />
          <p style={styles.rulesText}>
            Selon le mode choisi, chacun donne un indice sur son joueur, ou pose/répond à des questions — sans
            jamais citer de nom. Puis tout le monde vote pour éliminer un joueur suspect. Le joueur éliminé révèle
            son rôle et son mot.
          </p>

          <SectionLabel icon={<Trophy size={14} />} text="Fin de partie" />
          <p style={styles.rulesText}>
            Les civils gagnent quand tous les infiltrés (et la Carte blanche) sont éliminés. Les infiltrés gagnent
            dès qu'ils sont à égalité ou en supériorité numérique face aux civils encore en jeu. Si la Carte blanche
            est éliminée, elle a une dernière chance : deviner le mot des civils pour gagner seule, sur-le-champ.
          </p>

          <SectionLabel icon={<MessageCircleQuestion size={14} />} text="Les modes de jeu" />
          <p style={styles.rulesText}>
            <b>Indices classiques</b> : chacun décrit son joueur en un mot ou une phrase.<br />
            <b>Questions par tour</b> : dans un ordre défini, chacun pose une question fermée au joueur suivant, désigné automatiquement par le jeu.<br />
            <b>Mode libre</b> : tout le monde questionne qui il veut, sans ordre imposé.<br />
            <b>Mode difficile</b> (en plus des modes questions) : interdit les questions sur le physique et impose
            des réponses en oui/non uniquement.
          </p>

          <SectionLabel icon={<Timer size={14} />} text="Chrono de discussion" />
          <p style={styles.rulesText}>
            En option (activable dans la configuration de la partie), un chrono s'affiche pendant la discussion pour
            éviter que les débats ne s'éternisent. Il ne coupe jamais la partie : une fois écoulé, il l'indique
            simplement et les joueurs restent libres de passer au vote quand ils le souhaitent.
          </p>

          <SectionLabel icon={<Trophy size={14} />} text="Classement cumulé" />
          <p style={styles.rulesText}>
            À la fin de chaque manche, des points sont attribués selon le camp vainqueur : 1 point pour chaque civil
            si les civils gagnent, 2 points pour chaque infiltré (et Carte blanche encore en jeu) si les infiltrés
            gagnent, ou 3 points pour la Carte blanche seule si elle devine juste et gagne en solo. Le classement
            (icône trophée en haut) cumule les scores et l'historique des manches tant que l'onglet reste ouvert —
            "Nouvelle partie" ne le réinitialise pas, il faut le faire manuellement depuis le classement.
          </p>

          <p style={{ ...styles.rulesText, opacity: 0.5, fontSize: 11.5, marginTop: 4 }}>
            Musique : "Relaxing In The Hammock" par Glaciaère (steviasphere.bandcamp.com), sous licence Creative
            Commons Attribution 3.0.
          </p>

          {/* Lien obligatoire (Apple/RGPD) : accessible depuis l'app, pas seulement
              depuis la fiche store. Fichier statique déployé à côté de index.html
              (voir politique-confidentialite.html à la racine du dépôt), MAIS on pointe
              ici vers l'URL absolue de production (pas un chemin relatif) : en app
              native (Capacitor), le WebView ne contient que index.html — un lien
              relatif ne résout vers rien. Une URL http(s) absolue, elle, est ouverte
              par Capacitor dans le navigateur système, donc fonctionne à la fois en
              PWA web et en app native. */}
          <p style={{ ...styles.rulesText, opacity: 0.85, fontSize: 12.5, marginTop: 8 }}>
            <a href="https://astonishing-gaufre-e894c1.netlify.app/politique-confidentialite.html" target="_blank" rel="noopener" style={{ color: COLORS.gold, fontWeight: 700 }}>
              Politique de confidentialité
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
