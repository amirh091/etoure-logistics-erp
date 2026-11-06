import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  MapPin,
  Zap,
  Check,
  Building2,
  Crosshair,
} from "lucide-react";
import { useAuth } from "../store/AuthContext";
import { useStore } from "../store/StoreContext";
import { USE_SUPABASE } from "../lib/supabase";

const ROLES = [
  {
    key: "Administrateur",
    label: "Administrateur",
    desc: "Accès complet",
    email: USE_SUPABASE ? "cheikdev7@gmail.com" : "admin@etoure-logistics.eu",
  },
  {
    key: "Manager",
    label: "Manager",
    desc: "Pilotage & reporting",
    email: "manager@etoure-logistics.eu",
  },
  {
    key: "Exploitant",
    label: "Exploitant",
    desc: "Tournées & affectations",
    email: "dispatcher@etoure-logistics.eu",
  },
  {
    key: "Client",
    label: "Portail client",
    desc: "Suivi commandes",
    email: "client@maisonlaurent.fr",
  },
];

export default function Login() {
  const { login, loginAs } = useAuth();
  const { log } = useStore();
  const nav = useNavigate();
  const [role, setRole] = useState("Administrateur");
  const [email, setEmail] = useState(ROLES[0].email);
  const [password, setPassword] = useState(USE_SUPABASE ? "" : "demo1234");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [remember, setRemember] = useState(true);

  const pickRole = (r) => {
    setRole(r.key);
    setEmail(r.email);
    setPassword(USE_SUPABASE ? "" : "demo1234");
    setError("");
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await login({ email, password, role });
      if (!res.ok) {
        setError(res.error);
        return;
      }

      log({
        user: res.user.name,
        action: "Connexion réussie",
        target: `Session ${role}`,
        type: "auth",
      });
      nav(String(res.user.role).toLowerCase() === "client" ? "/portail" : "/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "La connexion a échoué.");
    } finally {
      setBusy(false);
    }
  };

  const quickDemo = () => {
    try {
      const u = loginAs(role);
      log({
        user: u.name,
        action: "Connexion démo",
        target: `Rôle ${u.role}`,
        type: "auth",
      });
      nav(String(u.role).toLowerCase() === "client" ? "/portail" : "/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "L’accès démo a échoué.");
    }
  };

  return (
    <div className="auth-wrap">
      <aside className="auth-aside">
        <div style={{ position: "relative", zIndex: 1 }}>
          <div className="auth-brand-lockup">
            <img src="/icons/web-app-manifest-192x192.png" alt="E-TOURÉ ERP" className="auth-brand-logo" />
            <div className="auth-brand-copy">
              <div className="brand-title">E-TOURÉ LOGISTICS</div>
              <div className="brand-sub">Transport · Livraison · Logistique</div>
            </div>
          </div>

          <h1
            style={{
              color: "#fff",
              fontSize: "clamp(1.6rem, 3.2vw, 2.35rem)",
              marginTop: 46,
              lineHeight: 1.14,
              letterSpacing: "-.035em",
            }}
          >
            Toute votre logistique,
            <br />
            <span style={{ color: "#FF9A4A" }}>pilotée en temps réel.</span>
          </h1>
          <p
            style={{
              color: "#A9BBD4",
              fontSize: ".94rem",
              marginTop: 14,
              maxWidth: "44ch",
              lineHeight: 1.6,
            }}
          >
            Livraisons, chauffeurs, flotte, facturation et géolocalisation dans
            une seule plateforme premium. Conçue pour les transporteurs
            exigeants.
          </p>

          <div style={{ marginTop: 30 }}>
            <div className="auth-feature">
              <div className="af-ic">
                <Sparkles size={15} />
              </div>
              <div>
                <b>Intelligence artificielle intégrée</b>
                <span>
                  Estimation automatique des coûts et prévision des dépenses.
                </span>
              </div>
            </div>
            <div className="auth-feature">
              <div className="af-ic">
                <MapPin size={15} />
              </div>
              <div>
                <b>Suivi GPS temps réel</b>
                <span>Localisation des véhicules et trajets optimisés.</span>
              </div>
            </div>
            <div className="auth-feature">
              <div className="af-ic">
                <Zap size={15} />
              </div>
              <div>
                <b>Installable & hors-ligne</b>
                <span>
                  Application PWA rapide sur mobile, tablette et desktop.
                </span>
              </div>
            </div>
          </div>

          <div className="sp-stats">
            <div className="sp-stat">
              <b>12 480</b>
              <span>Livraisons / an</span>
            </div>
            <div className="sp-stat">
              <b>98,2 %</b>
              <span>Ponctualité</span>
            </div>
            <div className="sp-stat">
              <b>EU</b>
              <span>Multi-pays</span>
            </div>
          </div>
        </div>

        <div className="social-proof">
          <p style={{ fontSize: ".72rem", color: "#7F94B3" }}>
            © 2026 E-TOURÉ LOGISTICS SAS · RGPD · ISO 27001 · Chiffrement
            AES-256
          </p>
        </div>
      </aside>

      <main className="auth-panel">
        <div className="auth-card">
          <div className="auth-panel-brand">
            <img src="/icons/web-app-manifest-192x192.png" alt="" className="auth-panel-logo" />
            <div>
              <div className="auth-panel-brand-title">E-TOURÉ ERP</div>
              <div className="auth-panel-brand-sub">ESPACE SÉCURISÉ</div>
            </div>
          </div>

<h1 style={{ fontSize: '2.4rem', lineHeight: 1.1, letterSpacing: '-0.03em' }}>
  Toute votre logistique,<br />
  <span style={{ color: 'var(--orange-500)' }}>pilotée en temps réel.</span>
</h1>
<p style={{ marginTop: 20, fontSize: '1.05rem', color: '#A9BBD4', maxWidth: 400 }}>
  <strong>Chaque livraison compte. Chaque franc aussi.</strong><br/>
  Livraisons, chauffeurs, flotte, facturation et géolocalisation dans une seule plateforme premium.
</p>

          <form onSubmit={submit} style={{ marginTop: 24 }}>
            {!USE_SUPABASE && (
              <div className="field mb-2">
                <label>Type de compte</label>
                <div className="role-pick">
                  {ROLES.map((r) => (
                    <button
                      type="button"
                      key={r.key}
                      className={`role-btn ${role === r.key ? "on" : ""}`}
                      onClick={() => pickRole(r)}
                    >
                      <b>{r.label}</b>
                      <span>{r.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="field mb-2">
              <label htmlFor="email">Adresse e-mail</label>
              <div style={{ position: "relative" }}>
                <Mail
                  size={15}
                  style={{
                    position: "absolute",
                    left: 12,
                    top: 13,
                    color: "var(--text-3)",
                  }}
                />
                <input
                  id="email"
                  className="input"
                  style={{ paddingLeft: 35 }}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="field mb-2">
              <label htmlFor="password">Mot de passe</label>
              <div style={{ position: "relative" }}>
                <Lock
                  size={15}
                  style={{
                    position: "absolute",
                    left: 12,
                    top: 13,
                    color: "var(--text-3)",
                  }}
                />
                <input
                  id="password"
                  className="input"
                  style={{ paddingLeft: 35, paddingRight: 40 }}
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="icon-btn"
                  style={{
                    position: "absolute",
                    right: 4,
                    top: 3,
                    width: 32,
                    height: 32,
                  }}
                  onClick={() => setShow((s) => !s)}
                  aria-label="Afficher le mot de passe"
                >
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div
              className="row"
              style={{ justifyContent: "space-between", marginBottom: 16 }}
            >
              <label
                className="row small"
                style={{ gap: 7, color: "var(--text-2)", cursor: "pointer" }}
              >
                <button
                  type="button"
                  onClick={() => setRemember((r) => !r)}
                  className={`switch ${remember ? "on" : ""}`}
                  style={{ width: 34, height: 20, flex: "0 0 34px" }}
                  aria-label="Se souvenir"
                />
                Se souvenir de moi
              </label>
              <button
                type="button"
                className="small"
                style={{ color: "var(--orange-600)", fontWeight: 650 }}
              >
                Mot de passe oublié ?
              </button>
            </div>

            {error && (
              <div
                className="badge red"
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  marginBottom: 12,
                  justifyContent: "flex-start",
                }}
              >
                {error}
              </div>
            )}

            <button
              className="btn btn-primary btn-block"
              type="submit"
              disabled={busy}
              style={{ height: 44 }}
            >
              {busy ? (
                "Connexion sécurisée…"
              ) : (
                <>
                  Se connecter <ArrowRight size={16} />
                </>
              )}
            </button>

            {!USE_SUPABASE && (
              <button
                className="btn btn-ghost btn-block mt-1"
                type="button"
                onClick={quickDemo}
              >
                <Zap size={15} /> Accès démo instantané ({role})
              </button>
            )}

            {!USE_SUPABASE && (
              <div className="demo-hint">
                <div className="row" style={{ gap: 6, marginBottom: 5 }}>
                  <ShieldCheck size={13} style={{ color: "var(--green-500)" }} />
                  <strong style={{ fontSize: ".76rem" }}>
                    Mode de démonstration local
                  </strong>
                </div>
                Mot de passe démo :{" "}
                <code style={{ fontWeight: 700 }}>demo1234</code> — n'importe
                quel e-mail de la liste fonctionne.
                <div
                  style={{
                    marginTop: 6,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 4,
                  }}
                >
                  {ROLES.map((r) => (
                    <span
                      key={r.key}
                      className="badge navy"
                      style={{ fontSize: ".64rem" }}
                    >
                      <Check size={9} /> {r.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </form>

          <p
            className="small"
            style={{
              textAlign: "center",
              color: "var(--text-3)",
              marginTop: 18,
            }}
          >
            <Building2
              size={12}
              style={{ display: "inline", verticalAlign: -1 }}
            />{" "}
            Solution SaaS multi-entreprises · Europe
          </p>
          <p
            className="small"
            style={{
              textAlign: "center",
              color: "var(--text-3)",
              marginTop: 6,
              fontSize: ".7rem",
            }}
          >
            <Crosshair
              size={11}
              style={{ display: "inline", verticalAlign: -1 }}
            />{" "}
            {USE_SUPABASE
              ? "Connexion sécurisée via Supabase"
              : "Mode démo · données enregistrées dans ce navigateur"}
          </p>
        </div>
      </main>
    </div>
  );
}
