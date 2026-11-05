import React, { useMemo, useState } from "react";
import {
  Bell,
  Mail,
  MessageCircle,
  Smartphone,
  Send,
  CheckCheck,
  Trash2,
  Settings2,
  Package,
  Wallet,
  IdCard,
  AlertTriangle,
  ShieldCheck,
  Zap,
  Sparkles,
} from "lucide-react";
import { useStore } from "../store/StoreContext";
import { useAuth } from "../store/AuthContext";
import { Badge, SectionCard, Switch, Tabs, Empty } from "../components/ui";
import { fmtDateTime, timeAgo } from "../lib/helpers";

const CHANNEL_META = {
  email: { label: "E-mail", icon: Mail, tone: "blue" },
  sms: { label: "SMS", icon: Smartphone, tone: "amber" },
  whatsapp: { label: "WhatsApp", icon: MessageCircle, tone: "green" },
  app: { label: "Application", icon: Bell, tone: "navy" },
};

const TYPE_META = {
  delivery: { icon: Package, tone: "orange", label: "Livraison" },
  finance: { icon: Wallet, tone: "green", label: "Finance" },
  driver: { icon: IdCard, tone: "blue", label: "Chauffeur" },
  alert: { icon: AlertTriangle, tone: "amber", label: "Alerte" },
  system: { icon: ShieldCheck, tone: "navy", label: "Système" },
};

export default function Notifications() {
  const {
    state,
    dispatch,
    toast,
    updateNotifSettings,
    toggleRule,
    markRead,
    markAllRead,
    log,
  } = useStore();
  const { user } = useAuth();
  const [tab, setTab] = useState("all");
  const [channel, setChannel] = useState("");
  const [composer, setComposer] = useState({
    channel: "email",
    recipient: "",
    subject: "",
    message: "",
  });
  const [sending, setSending] = useState(false);

  const filtered = useMemo(() => {
    let rows = [...state.notifications];
    if (tab === "unread") rows = rows.filter((n) => !n.read);
    if (tab !== "all" && tab !== "unread")
      rows = rows.filter((n) => n.type === tab);
    if (channel) rows = rows.filter((n) => n.channel === channel);
    return rows;
  }, [state.notifications, tab, channel]);

  const unread = state.notifications.filter((n) => !n.read).length;

  const send = () => {
    if (!composer.recipient || !composer.message)
      return toast("Destinataire et message requis", "err");
    setSending(true);
    setTimeout(() => {
      dispatch({
        type: "ADD",
        collection: "notifications",
        payload: {
          id: `NTF-${Date.now()}`,
          type: "system",
          channel: composer.channel,
          title:
            composer.subject ||
            `Message ${CHANNEL_META[composer.channel].label}`,
          body: `${composer.message} — envoyé à ${composer.recipient}`,
          time: new Date().toISOString(),
          read: false,
          target: "/notifications",
        },
      });
      log({
        user: user?.name,
        action: `Notification ${CHANNEL_META[composer.channel].label}`,
        target: composer.recipient,
        type: "create",
      });
      setSending(false);
      setComposer({
        channel: composer.channel,
        recipient: "",
        subject: "",
        message: "",
      });
      toast(
        `Notification ${CHANNEL_META[composer.channel].label} envoyée à ${composer.recipient}`,
      );
    }, 700);
  };

  const stats = {
    total: state.notifications.length,
    unread,
    email: state.notifications.filter((n) => n.channel === "email").length,
    sms: state.notifications.filter((n) => n.channel === "sms").length,
    whatsapp: state.notifications.filter((n) => n.channel === "whatsapp")
      .length,
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Communication</div>
          <h1>Centre de notifications</h1>
          <p>
            Alertes automatiques multi-canaux : SMS, e-mail, WhatsApp et
            notifications push.
          </p>
        </div>
        <div className="page-head-actions">
          <button
            className="btn btn-ghost"
            onClick={() => {
              markAllRead();
              toast("Toutes les notifications sont lues");
            }}
          >
            <CheckCheck size={15} /> Tout marquer comme lu
          </button>
        </div>
      </div>

      <div className="grid grid-kpi mb-3 stagger">
        {[
          {
            l: "Total notifications",
            v: stats.total,
            i: <Bell size={18} />,
            t: "var(--orange-100)",
            c: "var(--orange-600)",
          },
          {
            l: "Non lues",
            v: unread,
            i: <Zap size={18} />,
            t: "var(--amber-100)",
            c: "var(--amber-500)",
          },
          {
            l: "E-mail",
            v: stats.email,
            i: <Mail size={18} />,
            t: "var(--blue-100)",
            c: "var(--blue-500)",
          },
          {
            l: "WhatsApp + SMS",
            v: stats.whatsapp + stats.sms,
            i: <MessageCircle size={18} />,
            t: "var(--green-100)",
            c: "var(--green-500)",
          },
        ].map((k) => (
          <div
            key={k.l}
            className="card kpi card-hover"
            style={{ "--kpi-tint": k.t, "--kpi-color": k.c }}
          >
            <div className="kpi-top">
              <div className="kpi-icon">{k.i}</div>
              <div className="kpi-label">{k.l}</div>
            </div>
            <div className="kpi-value">{k.v}</div>
          </div>
        ))}
      </div>

      <div className="split-2">
        <section className="card">
          <Tabs
            tabs={[
              { key: "all", label: "Toutes", count: stats.total },
              { key: "unread", label: "Non lues", count: unread },
              { key: "delivery", label: "Livraisons" },
              { key: "finance", label: "Finance" },
              { key: "alert", label: "Alertes" },
            ]}
            value={tab}
            onChange={setTab}
          />
          <div className="filters">
            <div className="seg">
              {[
                ["", "Tous canaux"],
                ["email", "E-mail"],
                ["sms", "SMS"],
                ["whatsapp", "WhatsApp"],
                ["app", "App"],
              ].map(([k, l]) => (
                <button
                  key={k}
                  className={channel === k ? "on" : ""}
                  onClick={() => setChannel(k)}
                >
                  {l}
                </button>
              ))}
            </div>
            <button
              className="btn btn-ghost btn-sm"
              style={{ marginLeft: "auto" }}
              onClick={() => {
                dispatch({ type: "CLEAR_NOTIFS" });
                toast("Notifications effacées");
              }}
            >
              <Trash2 size={13} /> Vider
            </button>
          </div>
          <div>
            {filtered.map((n) => {
              const TM = TYPE_META[n.type] || TYPE_META.system;
              const CM = CHANNEL_META[n.channel] || CHANNEL_META.app;
              const TIcon = TM.icon;
              const CIcon = CM.icon;
              return (
                <div
                  key={n.id}
                  className={`notif-row ${n.read ? "" : "unread"}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => !n.read && markRead(n.id)}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && !n.read) {
                      e.preventDefault();
                      markRead(n.id);
                    }
                  }}
                >
                  <div className={`icon-tile ${TM.tone} notif-ic`}>
                    <TIcon size={15} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row" style={{ gap: 7, flexWrap: "wrap" }}>
                      <strong
                        style={{
                          fontSize: ".84rem",
                          fontWeight: n.read ? 550 : 750,
                        }}
                      >
                        {n.title}
                      </strong>
                      {!n.read && (
                        <span
                          className="badge live orange"
                          style={{ fontSize: ".6rem", padding: "1px 7px" }}
                        >
                          Non lu
                        </span>
                      )}
                    </div>
                    <p
                      className="muted"
                      style={{
                        fontSize: ".77rem",
                        marginTop: 3,
                        lineHeight: 1.5,
                      }}
                    >
                      {n.body}
                    </p>
                    <div className="row mt-1" style={{ gap: 8 }}>
                      <Badge tone={CM.tone}>
                        <CIcon size={10} /> {CM.label}
                      </Badge>
                      <span className="muted" style={{ fontSize: ".69rem" }}>
                        {timeAgo(n.time)} · {fmtDateTime(n.time)}
                      </span>
                    </div>
                  </div>
                  <div className="notif-actions row" style={{ gap: 4 }}>
                    {!n.read && (
                      <button
                        className="icon-btn"
                        style={{ width: 28, height: 28 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          markRead(n.id);
                        }}
                        title="Marquer comme lu"
                      >
                        <CheckCheck size={14} />
                      </button>
                    )}
                    <button
                      className="icon-btn"
                      style={{ width: 28, height: 28, color: "var(--red-500)" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        dispatch({ type: "REMOVE_NOTIF", id: n.id });
                        toast("Notification supprimée");
                      }}
                      title="Supprimer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
            {!filtered.length && (
              <Empty
                title="Aucune notification"
                message="Vous êtes à jour !"
                icon={<Bell size={22} />}
              />
            )}
          </div>
        </section>

        <div className="stack">
          <SectionCard
            title="Envoyer une notification"
            subtitle="SMS · E-mail · WhatsApp"
            action={
              <Badge tone="orange">
                <Send size={10} /> Manuel
              </Badge>
            }
          >
            <div className="stack" style={{ gap: 11 }}>
              <div className="field">
                <label>Canal d'envoi</label>
                <div className="seg" style={{ width: "100%" }}>
                  {Object.entries(CHANNEL_META).map(([k, m]) => (
                    <button
                      key={k}
                      className={composer.channel === k ? "on" : ""}
                      style={{ flex: 1 }}
                      onClick={() => setComposer({ ...composer, channel: k })}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                <label>Destinataire</label>
                <input
                  className="input"
                  value={composer.recipient}
                  onChange={(e) =>
                    setComposer({ ...composer, recipient: e.target.value })
                  }
                  placeholder="E-mail ou numéro de téléphone"
                />
              </div>
              <div className="field">
                <label>Objet</label>
                <input
                  className="input"
                  value={composer.subject}
                  onChange={(e) =>
                    setComposer({ ...composer, subject: e.target.value })
                  }
                  placeholder="Ex. Votre livraison arrive"
                />
              </div>
              <div className="field">
                <label>Message</label>
                <textarea
                  className="textarea"
                  value={composer.message}
                  onChange={(e) =>
                    setComposer({ ...composer, message: e.target.value })
                  }
                  placeholder="Votre commande LIV-20261003 sera livrée aujourd'hui entre 14h et 16h."
                />
              </div>
              <button
                className="btn btn-primary btn-block"
                onClick={send}
                disabled={sending}
              >
                <Send size={14} />{" "}
                {sending
                  ? "Envoi en cours…"
                  : `Envoyer par ${CHANNEL_META[composer.channel].label}`}
              </button>
              <p className="hint">
                Les envois sont simulés en mode démonstration. En production,
                l'API s'appuie sur Twilio (SMS/WhatsApp) et SendGrid (e-mail).
              </p>
            </div>
          </SectionCard>

          <SectionCard
            title="Canaux activés"
            subtitle="Préférences de diffusion"
            action={<Settings2 size={14} style={{ color: "var(--text-3)" }} />}
          >
            <div className="stack" style={{ gap: 14 }}>
              {[
                ["email", "E-mail", "SendGrid · relances et confirmations"],
                ["sms", "SMS", "Twilio · alertes urgentes"],
                [
                  "whatsapp",
                  "WhatsApp Business",
                  "Suivi client et preuves de livraison",
                ],
                ["push", "Notifications push", "Application installée (PWA)"],
              ].map(([k, label, desc]) => (
                <div
                  key={k}
                  className="row"
                  style={{ justifyContent: "space-between", gap: 10 }}
                >
                  <div>
                    <div className="small" style={{ fontWeight: 620 }}>
                      {label}
                    </div>
                    <div className="muted" style={{ fontSize: ".7rem" }}>
                      {desc}
                    </div>
                  </div>
                  <Switch
                    on={state.notificationSettings[k]}
                    onChange={(v) => {
                      updateNotifSettings({ [k]: v });
                      toast(`${label} ${v ? "activé" : "désactivé"}`);
                    }}
                    label={label}
                  />
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Règles automatiques"
            subtitle="Déclencheurs"
            action={
              <Badge tone="orange">
                <Sparkles size={10} /> Auto
              </Badge>
            }
          >
            <div className="stack" style={{ gap: 13 }}>
              {state.notificationSettings.rules.map((r) => (
                <div
                  key={r.id}
                  className="row"
                  style={{ justifyContent: "space-between", gap: 10 }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div className="small" style={{ fontWeight: 600 }}>
                      {r.label}
                    </div>
                    <div className="muted" style={{ fontSize: ".69rem" }}>
                      Canal : {r.channel}
                    </div>
                  </div>
                  <Switch
                    on={r.enabled}
                    onChange={() => toggleRule(r.id)}
                    label={r.label}
                  />
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </>
  );
}
