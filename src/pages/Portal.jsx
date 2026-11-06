import React, { useMemo, useState } from "react";
import {
  Package,
  MapPin,
  Clock,
  Search,
  Phone,
  Mail,
  Building2,
  CheckCircle2,
  Truck,
  Star,
  Headphones,
  Download,
  Eye,
  Navigation,
  Euro,
} from "lucide-react";
import { useStore } from "../store/StoreContext";
import { normalizeRole, useAuth } from "../store/AuthContext";
import {
  Badge,
  SectionCard,
  StatusBadge,
  Bar,
  Modal,
  Empty,
  Kpi,
} from "../components/ui";
import {
  fmtEUR,
  fmtDate,
  fmtDateTime,
  timeAgo,
  STATUS_META,
} from "../lib/helpers";

export default function Portal() {
  const { state } = useStore();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState(null);
  const role = normalizeRole(user?.role);

  /* Livraisons du client connecté (ou toutes en démo admin) */
  const myDeliveries = useMemo(() => {
    let rows = state.deliveries;
    if (role === "client" && user?.client_id)
      rows = rows.filter((d) => d.clientId === user.client_id);
    const term = q.trim().toLowerCase();
    if (term)
      rows = rows.filter((d) =>
        `${d.id} ${d.clientName} ${d.pickupCity} ${d.dropoffCity}`
          .toLowerCase()
          .includes(term),
      );
    return rows;
  }, [state.deliveries, user, q, role]);

  const myInvoices = useMemo(() => {
    let rows = state.invoices;
    if (role === "client" && user?.client_id)
      rows = rows.filter((i) => i.clientId === user.client_id);
    return rows;
  }, [state.invoices, user, role]);

  const client = state.clients.find(
    (c) => c.id === (user?.client_id || "CLI-1001"),
  );
  const stats = {
    total: myDeliveries.length,
    active: myDeliveries.filter((d) =>
      ["En cours", "Confirmée"].includes(d.status),
    ).length,
    delivered: myDeliveries.filter((d) => d.status === "Livrée").length,
    spend: myDeliveries
      .filter((d) => d.status !== "Annulée")
      .reduce((a, d) => a + (d.price || 0), 0),
  };

  const track = detail?.progress ?? null;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Espace client</div>
          <h1>Bonjour, {client?.name || user?.name} 👋</h1>
          <p>
            Suivez vos livraisons en temps réel, consultez vos factures et
            contactez votre interlocuteur dédié.
          </p>
        </div>
        <div className="page-head-actions">
          <Badge tone="blue">
            <Building2 size={10} /> {client?.sector || "Client"}
          </Badge>
        </div>
      </div>

      <div className="grid grid-kpi mb-3 stagger">
        <Kpi
          icon={<Package size={18} />}
          label="Commandes totales"
          value={stats.total}
          foot="Historique complet"
          tint="var(--orange-100)"
          color="var(--orange-600)"
        />
        <Kpi
          icon={<Truck size={18} />}
          label="En cours"
          value={stats.active}
          foot="Livraisons actives maintenant"
          tint="var(--blue-100)"
          color="var(--blue-500)"
        />
        <Kpi
          icon={<CheckCircle2 size={18} />}
          label="Livrées"
          value={stats.delivered}
          foot="Missions terminées"
          tint="var(--green-100)"
          color="var(--green-500)"
        />
        <Kpi
          icon={<Euro size={18} />}
          label="Total dépensé"
          value={fmtEUR(stats.spend, true)}
          foot="Cumul des prestations"
          tint="var(--amber-100)"
          color="var(--amber-500)"
        />
      </div>

      {/* Suivi de la livraison active la plus avancée */}
      {(() => {
        const live =
          myDeliveries.find((d) => d.status === "En cours") ||
          myDeliveries.find((d) => d.status === "Confirmée");
        if (!live) return null;
        return (
          <section className="card mb-3" style={{ overflow: "hidden" }}>
            <div className="card-head">
              <div>
                <h3>
                  <Navigation
                    size={13}
                    style={{
                      display: "inline",
                      verticalAlign: -2,
                      color: "var(--orange-500)",
                    }}
                  />{" "}
                  Suivi en direct · {live.id}
                </h3>
                <div className="sub">
                  {live.pickupCity} → {live.dropoffCity} · {live.distance} km
                </div>
              </div>
              <div className="card-head-actions">
                <Badge tone="green" className="live">
                  TEMPS RÉEL
                </Badge>
              </div>
            </div>
            <div className="card-pad">
              <div
                style={{
                  fontSize: "1.6rem",
                  fontWeight: 800,
                  letterSpacing: "-.03em",
                }}
              >
                {live.progress} %
              </div>
              <div className="mt-1">
                <Bar value={live.progress} tone="blue" />
              </div>
              <div
                className="row mt-1"
                style={{ justifyContent: "space-between" }}
              >
                <span className="muted small">{live.pickupCity}</span>
                <span className="muted small">
                  Arrivée estimée : {fmtDate(live.scheduledAt)}
                </span>
                <span className="muted small">{live.dropoffCity}</span>
              </div>
              <div className="row mt-2" style={{ gap: 14, flexWrap: "wrap" }}>
                {[
                  "Commande confirmée",
                  "Chargement",
                  "En route",
                  "Livraison",
                ].map((s, i) => {
                  const done = live.progress >= [0, 15, 40, 95][i];
                  return (
                    <div key={s} className="row" style={{ gap: 6 }}>
                      <CheckCircle2
                        size={14}
                        style={{
                          color: done
                            ? "var(--green-500)"
                            : "var(--border-strong)",
                        }}
                      />
                      <span
                        className="small"
                        style={{
                          color: done ? "var(--text)" : "var(--text-3)",
                        }}
                      >
                        {s}
                      </span>
                    </div>
                  );
                })}
              </div>
              <button
                className="btn btn-ghost btn-sm mt-2"
                onClick={() => setDetail(live)}
              >
                <Eye size={14} /> Voir le détail complet
              </button>
            </div>
          </section>
        );
      })()}

      <div className="split-2 mb-3">
        <section className="card">
          <div className="card-head">
            <div>
              <h3>Mes livraisons</h3>
              <div className="sub">Historique et suivi</div>
            </div>
            <div className="card-head-actions">
              <label className="search-inline" style={{ flex: "0 1 220px" }}>
                <Search size={14} />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Référence, ville…"
                />
              </label>
            </div>
          </div>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Réf.</th>
                  <th>Trajet</th>
                  <th>Statut</th>
                  <th>Date</th>
                  <th>Montant</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {myDeliveries.slice(0, 10).map((d) => (
                  <tr key={d.id}>
                    <td className="mono td-strong">{d.id}</td>
                    <td className="small truncate" style={{ maxWidth: 160 }}>
                      <MapPin
                        size={10}
                        style={{
                          display: "inline",
                          verticalAlign: -1,
                          color: "var(--text-3)",
                        }}
                      />{" "}
                      {d.pickupCity} → {d.dropoffCity}
                    </td>
                    <td>
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="small muted">{fmtDate(d.createdAt)}</td>
                    <td className="mono td-strong">
                      {fmtEUR(d.price || 0, true)}
                    </td>
                    <td>
                      <button
                        className="icon-btn"
                        style={{ width: 30, height: 30 }}
                        onClick={() => setDetail(d)}
                        title="Suivre"
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!myDeliveries.length && (
              <Empty
                title="Aucune livraison"
                message="Vos commandes apparaîtront ici."
                icon={<Package size={22} />}
              />
            )}
          </div>
        </section>

        <div className="stack">
          <SectionCard
            title="Mes factures"
            subtitle="Documents disponibles"
            action={<Badge tone="navy">{myInvoices.length}</Badge>}
          >
            <div className="stack" style={{ gap: 4 }}>
              {myInvoices.slice(0, 5).map((i) => (
                <div key={i.id} className="list-row">
                  <div
                    className={`icon-tile ${i.status === "Payée" ? "green" : "amber"}`}
                  >
                    <Euro size={14} />
                  </div>
                  <div className="lr-main">
                    <div
                      className="lr-title mono"
                      style={{ fontSize: ".79rem" }}
                    >
                      {i.number}
                    </div>
                    <div className="lr-sub">
                      {fmtDate(i.date)} · échéance {fmtDate(i.dueDate)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="mono small td-strong">
                      {fmtEUR(i.totals?.total || 0, true)}
                    </div>
                    <StatusBadge status={i.status} />
                  </div>
                </div>
              ))}
              {!myInvoices.length && (
                <p className="small muted">Aucune facture pour le moment.</p>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Votre interlocuteur dédié"
            subtitle="Assistance commerciale"
          >
            {(() => {
              const rep = state.drivers[0];
              return (
                <div className="stack" style={{ gap: 10 }}>
                  <div className="row" style={{ gap: 11 }}>
                    <div
                      className="icon-tile orange"
                      style={{ width: 42, height: 42 }}
                    >
                      <Headphones size={19} />
                    </div>
                    <div>
                      <div className="td-strong">Support E-TOURÉ</div>
                      <div className="muted small">
                        Réponse sous 2 h ouvrées
                      </div>
                    </div>
                  </div>
                  <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                    <a href="tel:+33145782210" className="btn btn-ghost btn-sm">
                      <Phone size={13} /> 07 46 26 86 98
                    </a>
                    <a
                      href="mailto:etoureservice@gmail.com"
                      className="btn btn-ghost btn-sm"
                    >
                      <Mail size={13} /> E-mail
                    </a>
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    <Star
                      size={13}
                      style={{
                        color: "var(--amber-500)",
                        fill: "currentColor",
                      }}
                    />
                    <span className="small">
                      Note moyenne de vos livraisons : <strong>4,8 / 5</strong>
                    </span>
                  </div>
                </div>
              );
            })()}
          </SectionCard>
        </div>
      </div>

      {/* Modal détail livraison */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        wide
        title={detail ? `Livraison ${detail.id}` : ""}
        subtitle={detail ? `${detail.pickupCity} → ${detail.dropoffCity}` : ""}
      >
        {detail && (
          <div className="stack" style={{ gap: 14 }}>
            <div>
              <div
                className="row"
                style={{ justifyContent: "space-between", marginBottom: 6 }}
              >
                <span className="td-strong">Progression</span>
                <span className="mono td-strong">{detail.progress} %</span>
              </div>
              <Bar value={detail.progress} tone="blue" />
            </div>

            <div className="split-even" style={{ gap: 14 }}>
              <SectionCard title="Informations mission">
                <div className="stack" style={{ gap: 8 }}>
                  {[
                    ["Client", detail.clientName],
                    ["Marchandise", detail.cargoType || "Standard"],
                    ["Poids", `${detail.weight} kg`],
                    ["Distance", `${detail.distance} km`],
                    ["Montant", fmtEUR(detail.price || 0)],
                    ["Priorité", detail.priority || "Normale"],
                  ].map(([k, v]) => (
                    <div
                      key={k}
                      className="row"
                      style={{
                        justifyContent: "space-between",
                        fontSize: ".79rem",
                      }}
                    >
                      <span className="muted">{k}</span>
                      <span style={{ fontWeight: 650 }}>{v}</span>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="Chronologie">
                <div className="timeline">
                  {[
                    [
                      "Commande enregistrée",
                      fmtDateTime(detail.createdAt),
                      true,
                    ],
                    [
                      "Chargement effectué",
                      detail.progress > 15 ? "Effectué" : "En attente",
                      detail.progress > 15,
                    ],
                    [
                      "En route vers destination",
                      detail.progress > 40 ? "En cours" : "En attente",
                      detail.progress > 40,
                    ],
                    [
                      "Livraison & signature",
                      detail.deliveredAt
                        ? fmtDateTime(detail.deliveredAt)
                        : "À venir",
                      detail.status === "Livrée",
                    ],
                  ].map(([label, v, done]) => (
                    <div
                      key={label}
                      className={`tl-item ${done ? "done" : ""}`}
                    >
                      <div className="small" style={{ fontWeight: 620 }}>
                        {label}
                      </div>
                      <div className="muted" style={{ fontSize: ".72rem" }}>
                        {v}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
