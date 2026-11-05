import React, { useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Pencil,
  Eye,
  Car,
  Truck,
  Bike,
  Gauge,
  Fuel,
  Wrench,
  FileCheck,
  AlertTriangle,
  Calendar,
  Download,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { useStore } from "../store/StoreContext";
import { useAuth } from "../store/AuthContext";
import {
  Avatar,
  Badge,
  Bar,
  ConfirmDialog,
  Empty,
  Modal,
  Pagination,
  SearchInput,
  SectionCard,
  StatusBadge,
  usePaged,
  Kpi,
} from "../components/ui";
import {
  fmtDate,
  fmtEUR,
  fmtNum,
  daysUntil,
  exportXLSX,
  todayISO,
} from "../lib/helpers";
import { CITIES } from "../data/seed";

const emptyVehicle = {
  plate: "",
  model: "",
  type: "Camion",
  cap: 1200,
  status: "Disponible",
  city: "Paris",
  km: 0,
  lastService: todayISO(),
  nextService: todayISO(),
  insuranceExpiry: todayISO(),
  controlExpiry: todayISO(),
  driverId: "",
  notes: "",
};

const TYPE_ICON = { Camion: Truck, Fourgonnette: Car, Moto: Bike };

export default function Vehicles() {
  const { state, add, update, remove, toast } = useStore();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [form, setForm] = useState(emptyVehicle);

  const enriched = useMemo(
    () =>
      state.vehicles.map((v) => {
        const mission = state.deliveries.find(
          (d) =>
            d.vehicleId === v.id &&
            ["En cours", "Confirmée"].includes(d.status),
        );
        const driver = state.drivers.find((d) => d.id === v.driverId);
        return {
          ...v,
          mission,
          driverName: driver?.name || "Non affecté",
          missionCount: state.deliveries.filter((d) => d.vehicleId === v.id)
            .length,
        };
      }),
    [state.vehicles, state.deliveries, state.drivers],
  );

  const filtered = useMemo(() => {
    let rows = [...enriched];
    const term = q.trim().toLowerCase();
    if (term)
      rows = rows.filter((v) =>
        `${v.plate} ${v.model} ${v.city} ${v.driverName}`
          .toLowerCase()
          .includes(term),
      );
    if (status) rows = rows.filter((v) => v.status === status);
    if (type) rows = rows.filter((v) => v.type === type);
    return rows;
  }, [enriched, q, status, type]);

  const { page, setPage, pages, slice, total } = usePaged(filtered, 8);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyVehicle);
    setModal(true);
  };
  const openEdit = (v) => {
    setEditing(v);
    setForm({
      ...emptyVehicle,
      ...v,
      lastService: v.lastService?.slice(0, 10),
      nextService: v.nextService?.slice(0, 10),
      insuranceExpiry: v.insuranceExpiry?.slice(0, 10),
      controlExpiry: v.controlExpiry?.slice(0, 10),
    });
    setModal(true);
  };

  const save = () => {
    if (!form.plate.trim())
      return toast("L'immatriculation est obligatoire", "err");
    const payload = {
      ...form,
      cap: Number(form.cap) || 0,
      km: Number(form.km) || 0,
      lastService: new Date(form.lastService).toISOString(),
      nextService: new Date(form.nextService).toISOString(),
      insuranceExpiry: new Date(form.insuranceExpiry).toISOString(),
      controlExpiry: new Date(form.controlExpiry).toISOString(),
    };
    if (editing) {
      update("vehicles", { ...payload, id: editing.id }, user?.name);
      toast("Véhicule mis à jour");
    } else {
      add("vehicles", payload, user?.name);
      toast(`Véhicule ${form.plate} ajouté à la flotte`);
    }
    setModal(false);
  };

  const exportFleet = async () => {
    try {
      await exportXLSX(
        [
          {
            name: "Véhicules",
            rows: filtered,
            columns: [
              { label: "Immatriculation", key: "plate" },
              { label: "Modèle", key: "model" },
              { label: "Type", key: "type" },
              { label: "Capacité (kg)", key: "cap" },
              { label: "Kilométrage", key: "km" },
              { label: "Ville", key: "city" },
              { label: "Chauffeur", key: "driverName" },
              { label: "Statut", key: "status" },
              {
                label: "Prochain entretien",
                value: (r) => fmtDate(r.nextService),
              },
              {
                label: "Contrôle technique",
                value: (r) => fmtDate(r.controlExpiry),
              },
              { label: "Assurance", value: (r) => fmtDate(r.insuranceExpiry) },
            ],
          },
        ],
        `etoure-flotte-${todayISO()}.xlsx`,
      );
      toast("Export Excel de la flotte généré");
    } catch {
      toast("Erreur d'export Excel", "err");
    }
  };

  const alerts = state.vehicles.filter(
    (v) =>
      daysUntil(v.insuranceExpiry) < 45 ||
      daysUntil(v.controlExpiry) < 45 ||
      daysUntil(v.nextService) < 30,
  );
  const onMission = state.vehicles.filter(
    (v) => v.status === "En mission",
  ).length;
  const totalKm = state.vehicles.reduce((a, v) => a + (v.km || 0), 0);
  const totalCap = state.vehicles.reduce((a, v) => a + (v.cap || 0), 0);

  const detailMissions = useMemo(
    () =>
      detail
        ? state.deliveries.filter((d) => d.vehicleId === detail.id).slice(0, 5)
        : [],
    [detail, state.deliveries],
  );

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Flotte</div>
          <h1>Gestion des véhicules</h1>
          <p>
            {total} véhicules · {onMission} en mission · entretien, contrôle
            technique et assurance surveillés automatiquement.
          </p>
        </div>
        <div className="page-head-actions">
          <button className="btn btn-ghost" onClick={exportFleet}>
            <Download size={15} /> Excel
          </button>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> Ajouter un véhicule
          </button>
        </div>
      </div>

      <div className="grid grid-kpi mb-3 stagger">
        <Kpi
          icon={<Truck size={18} />}
          label="Flotte totale"
          value={state.vehicles.length}
          foot={`${onMission} en mission · ${state.vehicles.length - onMission} disponibles`}
          tint="var(--orange-100)"
          color="var(--orange-600)"
        />
        <Kpi
          icon={<Gauge size={18} />}
          label="Kilométrage cumulé"
          value={fmtNum(totalKm)}
          foot="Tous véhicules confondus"
          tint="var(--blue-100)"
          color="var(--blue-500)"
        />
        <Kpi
          icon={<Fuel size={18} />}
          label="Capacité totale"
          value={`${fmtNum(totalCap)} kg`}
          foot="Charge utile disponible"
          tint="var(--green-100)"
          color="var(--green-500)"
        />
        <Kpi
          icon={<AlertTriangle size={18} />}
          label="Échéances proches"
          value={alerts.length}
          footer="Assurance, contrôle ou entretien < 45 j"
          tint="var(--red-100)"
          color="var(--red-500)"
        />
      </div>

      <div className="split-2 mb-3">
        <section className="card">
          <div className="card-head">
            <div>
              <h3>Parc de véhicules</h3>
              <div className="sub">Recherche et filtres multi-critères</div>
            </div>
            <div className="card-head-actions">
              <Badge tone="orange">{filtered.length}</Badge>
            </div>
          </div>
          <div className="filters">
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder="Immatriculation, modèle, chauffeur, ville…"
            />
            <select
              className="select"
              style={{ flex: "0 1 150px" }}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Tous les statuts</option>
              {["Disponible", "En mission", "Maintenance", "Hors service"].map(
                (s) => (
                  <option key={s}>{s}</option>
                ),
              )}
            </select>
            <select
              className="select"
              style={{ flex: "0 1 160px" }}
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="">Tous les types</option>
              {["Camion", "Fourgonnette", "Moto"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Véhicule</th>
                  <th>Statut</th>
                  <th>Chauffeur</th>
                  <th>Km</th>
                  <th>Contrôle tech.</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {slice.map((v) => {
                  const ct = daysUntil(v.controlExpiry);
                  const Icon = TYPE_ICON[v.type] || Car;
                  return (
                    <tr key={v.id}>
                      <td>
                        <div className="row" style={{ gap: 9 }}>
                          <div
                            className="icon-tile orange"
                            style={{ width: 32, height: 32, flex: "0 0 32px" }}
                          >
                            <Icon size={15} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div className="td-strong truncate mono">
                              {v.plate}
                            </div>
                            <div
                              className="muted"
                              style={{ fontSize: ".7rem" }}
                            >
                              {v.model} · {v.cap} kg
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={v.status} />
                      </td>
                      <td>
                        <div className="row" style={{ gap: 7 }}>
                          <Avatar
                            name={v.driverName}
                            size={24}
                            color="#1E3D63"
                          />
                          <span
                            className="small truncate"
                            style={{ maxWidth: 110 }}
                          >
                            {v.driverName}
                          </span>
                        </div>
                      </td>
                      <td className="mono">{fmtNum(v.km)}</td>
                      <td>
                        <span
                          className={`badge ${ct < 0 ? "red" : ct < 45 ? "amber" : "green"}`}
                          style={{ fontSize: ".68rem" }}
                        >
                          {ct < 0 ? "Expiré" : `J+${ct}`}
                        </span>
                      </td>
                      <td>
                        <div className="td-actions">
                          <button
                            className="icon-btn"
                            style={{ width: 30, height: 30 }}
                            onClick={() => setDetail(v)}
                            title="Détails"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            className="icon-btn"
                            style={{ width: 30, height: 30 }}
                            onClick={() => openEdit(v)}
                            title="Modifier"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            className="icon-btn"
                            style={{
                              width: 30,
                              height: 30,
                              color: "var(--red-500)",
                            }}
                            onClick={() => setConfirmId(v.id)}
                            title="Supprimer"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!slice.length && (
              <Empty title="Aucun véhicule" icon={<Car size={22} />} />
            )}
          </div>
          <Pagination
            page={page}
            pages={pages}
            onChange={setPage}
            total={total}
            shown={slice.length}
          />
        </section>

        <div className="stack">
          <SectionCard
            title="Alertes de conformité"
            subtitle="Contrôles & assurances"
            action={
              <Badge tone={alerts.length ? "red" : "green"}>
                {alerts.length}
              </Badge>
            }
          >
            <div className="stack" style={{ gap: 4 }}>
              {alerts.slice(0, 4).map((v) => {
                const days = Math.min(
                  daysUntil(v.insuranceExpiry),
                  daysUntil(v.controlExpiry),
                  daysUntil(v.nextService),
                );
                return (
                  <div key={v.id} className="list-row">
                    <div
                      className={`icon-tile ${days < 0 ? "red" : days < 30 ? "amber" : ""}`}
                    >
                      <AlertTriangle size={14} />
                    </div>
                    <div className="lr-main">
                      <div className="lr-title mono">{v.plate}</div>
                      <div className="lr-sub">
                        {days < 0
                          ? "Échéance dépassée"
                          : `Échéance dans ${days} jours`}
                      </div>
                    </div>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => openEdit(v)}
                    >
                      Gérer
                    </button>
                  </div>
                );
              })}
              {!alerts.length && (
                <p className="small muted">
                  Toute la flotte est conforme. Aucune action requise.
                </p>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Répartition de la flotte"
            subtitle="Par type de véhicule"
          >
            <div className="stack" style={{ gap: 10 }}>
              {["Camion", "Fourgonnette", "Moto"].map((t) => {
                const n = state.vehicles.filter((v) => v.type === t).length;
                const pct = state.vehicles.length
                  ? (n / state.vehicles.length) * 100
                  : 0;
                const Icon = TYPE_ICON[t];
                return (
                  <div key={t}>
                    <div
                      className="row"
                      style={{
                        justifyContent: "space-between",
                        fontSize: ".78rem",
                        marginBottom: 4,
                      }}
                    >
                      <span className="row" style={{ gap: 6 }}>
                        <Icon size={13} /> {t}
                      </span>
                      <span className="mono td-strong">{n}</span>
                    </div>
                    <Bar
                      value={pct}
                      tone={
                        t === "Camion"
                          ? ""
                          : t === "Fourgonnette"
                            ? "blue"
                            : "green"
                      }
                    />
                  </div>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard
            title="Charge en cours"
            subtitle="Missions actives par véhicule"
          >
            <div className="stack" style={{ gap: 4 }}>
              {enriched
                .filter((v) => v.mission)
                .slice(0, 4)
                .map((v) => (
                  <div key={v.id} className="list-row">
                    <div className="icon-tile orange">
                      <Truck size={14} />
                    </div>
                    <div className="lr-main">
                      <div className="lr-title mono">{v.plate}</div>
                      <div className="lr-sub">
                        {v.mission.pickupCity} → {v.mission.dropoffCity} ·{" "}
                        {v.mission.progress}%
                      </div>
                    </div>
                    <Badge tone="blue">{v.mission.id}</Badge>
                  </div>
                ))}
              {!enriched.some((v) => v.mission) && (
                <p className="small muted">
                  Aucun véhicule en mission actuellement.
                </p>
              )}
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Modal formulaire */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? `Modifier ${editing.plate}` : "Ajouter un véhicule"}
        subtitle="Caractéristiques, entretien et documents administratifs."
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModal(false)}>
              Annuler
            </button>
            <button className="btn btn-primary" onClick={save}>
              {editing ? "Enregistrer" : "Ajouter à la flotte"}
            </button>
          </>
        }
      >
        <div className="form-grid">
          <div className="field">
            <label>Immatriculation *</label>
            <input
              className="input"
              value={form.plate}
              onChange={(e) =>
                setForm({ ...form, plate: e.target.value.toUpperCase() })
              }
              placeholder="AB-123-CD"
            />
          </div>
          <div className="field">
            <label>Modèle</label>
            <input
              className="input"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              placeholder="Mercedes Sprinter"
            />
          </div>
          <div className="field">
            <label>Type</label>
            <select
              className="select"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              {["Camion", "Fourgonnette", "Moto"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Capacité (kg)</label>
            <input
              className="input"
              type="number"
              min="0"
              value={form.cap}
              onChange={(e) => setForm({ ...form, cap: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Statut</label>
            <select
              className="select"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {["Disponible", "En mission", "Maintenance", "Hors service"].map(
                (s) => (
                  <option key={s}>{s}</option>
                ),
              )}
            </select>
          </div>
          <div className="field">
            <label>Ville de rattachement</label>
            <select
              className="select"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            >
              {Object.keys(CITIES).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Kilométrage</label>
            <input
              className="input"
              type="number"
              min="0"
              value={form.km}
              onChange={(e) => setForm({ ...form, km: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Chauffeur attitré</label>
            <select
              className="select"
              value={form.driverId}
              onChange={(e) => setForm({ ...form, driverId: e.target.value })}
            >
              <option value="">Non affecté</option>
              {state.drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Dernier entretien</label>
            <input
              className="input"
              type="date"
              value={form.lastService}
              onChange={(e) =>
                setForm({ ...form, lastService: e.target.value })
              }
            />
          </div>
          <div className="field">
            <label>Prochain entretien</label>
            <input
              className="input"
              type="date"
              value={form.nextService}
              onChange={(e) =>
                setForm({ ...form, nextService: e.target.value })
              }
            />
          </div>
          <div className="field">
            <label>Contrôle technique</label>
            <input
              className="input"
              type="date"
              value={form.controlExpiry}
              onChange={(e) =>
                setForm({ ...form, controlExpiry: e.target.value })
              }
            />
          </div>
          <div className="field">
            <label>Expiration assurance</label>
            <input
              className="input"
              type="date"
              value={form.insuranceExpiry}
              onChange={(e) =>
                setForm({ ...form, insuranceExpiry: e.target.value })
              }
            />
          </div>
          <div className="field full">
            <label>Notes</label>
            <textarea
              className="textarea"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Équipements, remarques techniques…"
            />
          </div>
        </div>
      </Modal>

      {/* Modal fiche véhicule */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        wide
        title={detail?.plate}
        subtitle={`${detail?.model} · ${detail?.type} · ${fmtNum(detail?.km)} km`}
      >
        {detail && (
          <div className="split-even" style={{ gap: 20 }}>
            <div className="stack" style={{ gap: 14 }}>
              <div className="card card-pad">
                <div className="row" style={{ gap: 12 }}>
                  <div
                    className="icon-tile orange"
                    style={{ width: 46, height: 46 }}
                  >
                    <Car size={22} />
                  </div>
                  <div>
                    <div
                      style={{ fontWeight: 750, fontSize: ".98rem" }}
                      className="mono"
                    >
                      {detail.plate}
                    </div>
                    <div className="muted small">
                      {detail.model} · {detail.city}
                    </div>
                    <div className="row" style={{ gap: 8, marginTop: 6 }}>
                      <StatusBadge status={detail.status} />
                      <Badge tone="navy">{detail.cap} kg</Badge>
                    </div>
                  </div>
                </div>
              </div>

              <SectionCard title="Documents & échéances">
                <div className="stack" style={{ gap: 9 }}>
                  {[
                    ["Contrôle technique", detail.controlExpiry, 45],
                    ["Assurance", detail.insuranceExpiry, 45],
                    ["Prochain entretien", detail.nextService, 30],
                    ["Dernier entretien", detail.lastService, null],
                  ].map(([label, date, warn]) => {
                    const d = warn != null ? daysUntil(date) : null;
                    return (
                      <div
                        key={label}
                        className="row"
                        style={{
                          justifyContent: "space-between",
                          fontSize: ".79rem",
                        }}
                      >
                        <span className="muted">{label}</span>
                        {warn != null ? (
                          <span
                            className={`badge ${d < 0 ? "red" : d < warn ? "amber" : "green"}`}
                          >
                            {fmtDate(date)}
                          </span>
                        ) : (
                          <span>{fmtDate(date)}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
            </div>

            <div className="stack" style={{ gap: 14 }}>
              <SectionCard title="Chauffeur attitré">
                {(() => {
                  const dr = state.drivers.find(
                    (x) => x.id === detail.driverId,
                  );
                  return dr ? (
                    <div className="row" style={{ gap: 10 }}>
                      <Avatar name={dr.name} color={dr.avatarColor} size={40} />
                      <div>
                        <div className="td-strong">{dr.name}</div>
                        <div className="muted small">
                          {dr.phone} · {dr.city}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="small muted">Aucun chauffeur affecté.</p>
                  );
                })()}
              </SectionCard>

              <SectionCard
                title="Dernières missions"
                subtitle={`${detailMissions.length} livraisons enregistrées`}
                noPad
              >
                <div style={{ maxHeight: 220, overflowY: "auto" }}>
                  {detailMissions.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        padding: "10px 16px",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      <div
                        className="row"
                        style={{ justifyContent: "space-between" }}
                      >
                        <span className="mono small td-strong">{m.id}</span>
                        <StatusBadge status={m.status} />
                      </div>
                      <div
                        className="muted"
                        style={{ fontSize: ".71rem", marginTop: 2 }}
                      >
                        {m.pickupCity} → {m.dropoffCity} · {m.distance} km
                      </div>
                    </div>
                  ))}
                  {!detailMissions.length && (
                    <p className="small muted" style={{ padding: 16 }}>
                      Aucune mission enregistrée pour ce véhicule.
                    </p>
                  )}
                </div>
              </SectionCard>

              {detail.notes && (
                <SectionCard title="Notes">
                  <p
                    className="small"
                    style={{ color: "var(--text-2)", lineHeight: 1.6 }}
                  >
                    {detail.notes}
                  </p>
                </SectionCard>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={() => {
          remove("vehicles", confirmId, user?.name);
          toast("Véhicule supprimé");
        }}
        title="Supprimer ce véhicule ?"
        message="Le véhicule sera retiré de la flotte définitivement."
      />
    </>
  );
}
