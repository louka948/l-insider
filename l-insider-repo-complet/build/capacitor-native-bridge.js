// ---------------------------------------------------------------------------
// Pont Capacitor Browser + App — vendored (mêmes principes que
// build/supabase-js.min.js : un fichier JS classique inliné dans le build,
// aucune dépendance externe à uploader séparément — voir CLAUDE.md).
//
// À quoi ça sert : Google refuse le flux OAuth dans une WebView embarquée
// (erreur "disallowed_useragent"), donc dans l'appli native (iOS/Android)
// la connexion Google (voir handleGoogleSignIn, AccountScreen.jsx) doit
// ouvrir le navigateur SYSTÈME plutôt que de naviguer dans la WebView de
// l'app elle-même. C'est le rôle du plugin Capacitor "Browser". Une fois
// Google/Supabase redirigés vers le schéma d'URL personnalisé de l'app
// (com.imposteurfoot.app://..., enregistré dans ios/App/App/Info.plist et
// android/.../AndroidManifest.xml), l'OS relance l'app avec ce lien — c'est
// le rôle du plugin Capacitor "App" (évènement "appUrlOpen", écouté dans
// imposteurfoot_11.html / ImposteurFoot()) de le remonter côté JS.
//
// Pourquoi ce fichier existe plutôt que d'installer @capacitor/browser et
// @capacitor/app "normalement" : ce projet n'utilise AUCUN bundler pour le
// site/l'app (Babel Standalone transpile le JSX directement dans le
// navigateur, voir CLAUDE.md) — un simple `npm install` ne rend donc pas
// ces plugins utilisables depuis un <script src="..."> classique. Leurs
// paquets npm exposent malgré tout un build UMD prêt à l'emploi
// (node_modules/@capacitor/{browser,app}/dist/plugin.js, champ "unpkg" du
// package.json) : c'est exactement ce code, copié ici tel quel (source à
// resynchroniser à la main si @capacitor/browser ou @capacitor/app changent
// de version — comparer avec node_modules/@capacitor/*/dist/plugin.js).
//
// ⚠️ Tout est enveloppé dans `if (window.Capacitor)` : ce global n'existe
// QUE dans la coquille native (le runtime Capacitor l'injecte, avec la
// variable soeur `capacitorExports` dont ce code dépend, AVANT le
// chargement de la page) — jamais sur le site web classique (Netlify,
// npm run dev, npm test). Sans cette garde, charger ce fichier sur le site
// web ferait planter le script avec "capacitorExports is not defined" dès
// le chargement de la page — d'où le if, qui rend ce fichier inoffensif à
// inclure partout, y compris là où Capacitor.Plugins.Browser/App ne servent
// jamais (voir handleGoogleSignIn, qui vérifie window.Capacitor avant de
// s'en servir).
if (window.Capacitor) {
  // === @capacitor/browser (vendored depuis node_modules/@capacitor/browser/dist/plugin.js) ===
  (function (exports, core) {
    "use strict";

    const Browser = core.registerPlugin("Browser", {
      web: () => Promise.resolve().then(function () { return web; }).then((m) => new m.BrowserWeb()),
    });

    class BrowserWeb extends core.WebPlugin {
      constructor() {
        super();
        this._lastWindow = null;
      }
      async open(options) {
        this._lastWindow = window.open(options.url, options.windowName || "_blank");
      }
      async close() {
        return new Promise((resolve, reject) => {
          if (this._lastWindow != null) {
            this._lastWindow.close();
            this._lastWindow = null;
            resolve();
          } else {
            reject("No active window to close!");
          }
        });
      }
    }
    new BrowserWeb();

    var web = /*#__PURE__*/ Object.freeze({
      __proto__: null,
      BrowserWeb: BrowserWeb,
    });

    exports.Browser = Browser;
  })({}, capacitorExports);

  // === @capacitor/app (vendored depuis node_modules/@capacitor/app/dist/plugin.js) ===
  (function (exports, core) {
    "use strict";

    const App = core.registerPlugin("App", {
      web: () => Promise.resolve().then(function () { return web; }).then((m) => new m.AppWeb()),
    });

    class AppWeb extends core.WebPlugin {
      constructor() {
        super();
        this.handleVisibilityChange = () => {
          const data = { isActive: document.hidden !== true };
          this.notifyListeners("appStateChange", data);
          if (document.hidden) {
            this.notifyListeners("pause", null);
          } else {
            this.notifyListeners("resume", null);
          }
        };
        document.addEventListener("visibilitychange", this.handleVisibilityChange, false);
      }
      exitApp() {
        throw this.unimplemented("Not implemented on web.");
      }
      async getInfo() {
        throw this.unimplemented("Not implemented on web.");
      }
      async getLaunchUrl() {
        return { url: "" };
      }
      async getState() {
        return { isActive: document.hidden !== true };
      }
      async minimizeApp() {
        throw this.unimplemented("Not implemented on web.");
      }
      async toggleBackButtonHandler() {
        throw this.unimplemented("Not implemented on web.");
      }
      async getAppLanguage() {
        return { value: navigator.language.split("-")[0].toLowerCase() };
      }
    }

    var web = /*#__PURE__*/ Object.freeze({
      __proto__: null,
      AppWeb: AppWeb,
    });

    exports.App = App;
  })({}, capacitorExports);
}
