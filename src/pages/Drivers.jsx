import React, { useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Pencil,
  Eye,
  IdCard,
  Star,
  Phone,
  Mail,
  MapPin,
  Truck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Award,
  Gauge,
  Calendar,
  ShieldCheck,
  Users,
  History,
  Camera,
  Upload,
} from "lucide-react";
import { useStore } from "../store/StoreContext";
import { useAuth } from "../store/AuthContext";
import { USE_SUPABASE, supabase } from "../lib/supabase";
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
import { BarChart, RankBars } from "../components/Charts";
import {
  fmtDate,
  fmtEUR,
  fmtNum,
  daysUntil,
  exportXLSX,
  todayISO,
  timeAgo,
} from "../lib/helpers";
import { driverPerformance } from "../data/analytics";
import { CITIES } from "../data/seed";

const emptyDriver = {
  name: "",
  phone: "",
  email: "",
  licenseNumber: "",
  licenseType: "C + CE",
  licenseExpiry: todayISO(),
  medicalExpiry: todayISO(),
  status: "Disponible",
  city: "Paris",
  emergencyContact: "",
  notes: "",
  avatarColor: "#FF7A1A",
  photo_url: "",
  id_card_url: "",
};

export default function Drivers() {
  const { state, add, update, remove, toast } = useStore();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("perf");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [form, setForm] = useState(emptyDriver);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingId, setUploadingId] = useState(false);

  const perf = useMemo(
    () => driverPerformance(state.deliveries, state.drivers),
    [state],
  );

  const filtered = useMemo(() => {
    let rows = [...perf];
    const term = q.trim().toLowerCase();
    if (term)
      rows = rows.filter((d) =>
        `${d.name} ${d.phone} ${d.email} ${d.city} ${d.licenseNumber}`
          .toLowerCase()
          .includes(term),
      );
    if (status) rows = rows.filter((d) => d.status === status);
    if (sort === "perf") rows.sort((a, b) => b.completed - a.completed);
    if (sort === "rating") rows.sort((a, b) => b.rating - a.rating);
    if (sort === "name") rows.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "revenue") rows.sort((a, b) => b.revenue - a.revenue);
    return rows;
  }, [perf, q, status, sort]);

  const { page, setPage, pages, slice, total } = usePaged(filtered, 8);

  const monthly = useMemo(() => {
    const labels = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
    return {
      labels,
      series: [
        {
          name: "Courses terminées",
          data: labels.map((_, i) => 6 + ((i * 7 + state.drivers.length) % 9)),
          color: "#FF7A1A",
        },
        { name: "Objectif", data: labels.map(() => 10), color: "#1E3D63" },
      ],
    };
  }, [state.drivers.length]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyDriver);
    setModal(true);
  };
  const openEdit = (d) => {
    setEditing(d);
    setForm({
      ...emptyDriver,
      ...d,
      licenseExpiry: d.licenseExpiry?.slice(0, 10),
      medicalExpiry: d.medicalExpiry?.slice(0, 10),
    });
    setModal(true);
  };

  /* Upload : Supabase Storage si actif, sinon lecture locale (mode démo) */
  const handleUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024)
      return toast("Fichier trop volumineux (max 5 Mo)", "err");
    const key = type === "photo" ? "photo_url" : "id_card_url";
    const setBusy = type === "photo" ? setUploadingPhoto : setUploadingId;
    setBusy(true);
    try {
      let url;
      if (USE_SUPABASE) {
        const fileName = `drivers/${Date.now()}-${Math.random().toString(36).slice(2)}.${file.name.split(".").pop()}`;
        const { error } = await supabase.storage
          .from("documents")
          .upload(fileName, file);
        if (error) throw error;
        ({
          data: { publicUrl: url },
        } = supabase.storage.from("documents").getPublicUrl(fileName));
      } else {
        url = URL.createObjectURL(file);
      }
      setForm((prev) => ({ ...prev, [key]: url }));
      toast("Fichier ajouté avec succès");
    } catch (error) {
      toast(error.message || "Échec de l'envoi", "err");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  const save = () => {
    if (!form.name.trim())
      return toast("Le nom du chauffeur est obligatoire", "err");
    const payload = {
      ...form,
      licenseExpiry: new Date(form.licenseExpiry).toISOString(),
      medicalExpiry: new Date(form.medicalExpiry).toISOString(),
    };
    if (editing) {
      update("drivers", { ...payload, id: editing.id }, user?.name);
      toast("Profil chauffeur mis à jour");
    } else {
      add(
        "drivers",
        {
          ...payload,
          id: `DRV-${Math.floor(230 + Math.random() * 120)}`,
          hireDate: new Date().toISOString(),
          rating: 4.5,
          deliveriesDone: 0,
          onTimeRate: 95,
          kmTotal: 0,
        },
        user?.name,
      );
      toast(`Chauffeur ${form.name} ajouté à l'équipe`);
    }
    setModal(false);
  };

  const exportTeam = async () => {
    try {
      await exportXLSX(
        [
          {
            name: "Chauffeurs",
            rows: filtered,
            columns: [
              { label: "ID", key: "id" },
              { label: "Nom", key: "name" },
              { label: "Téléphone", key: "phone" },
              { label: "E-mail", key: "email" },
              { label: "Ville", key: "city" },
              { label: "Permis", key: "licenseType" },
              {
                label: "Expiration permis",
                value: (r) => fmtDate(r.licenseExpiry),
              },
              {
                label: "Visite médicale",
                value: (r) => fmtDate(r.medicalExpiry),
              },
              { label: "Statut", key: "status" },
              { label: "Courses", key: "completed" },
              { label: "Ponctualité (%)", key: "onTime" },
              { label: "Note", key: "rating" },
              { label: "CA généré", key: "revenue" },
            ],
          },
        ],
        `etoure-chauffeurs-${todayISO()}.xlsx`,
      );
      toast("Export Excel de l'équipe généré");
    } catch {
      toast("Erreur d'export Excel", "err");
    }
  };

  const expiring = state.drivers.filter(
    (d) => daysUntil(d.licenseExpiry) < 60 || daysUntil(d.medicalExpiry) < 30,
  );
  const onMission = state.drivers.filter(
    (d) => d.status === "En mission",
  ).length;
  const avgRating = state.drivers.length
    ? state.drivers.reduce((a, d) => a + (d.rating || 4), 0) /
      state.drivers.length
    : 0;
  const teamRevenue = perf.reduce((a, d) => a + (d.revenue || 0), 0);

  const detailMissions = useMemo(
    () =>
      detail
        ? state.deliveries.filter((d) => d.driverId === detail.id).slice(0, 5)
        : [],
    [detail, state.deliveries],
  );
  const detailVehicle = useMemo(
    () =>
      detail ? state.vehicles.find((v) => v.driverId === detail.id) : null,
    [detail, state.vehicles],
  );

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Ressources humaines</div>
          <h1>Gestion des chauffeurs</h1>
          <p>
            {total} chauffeurs · {onMission} en mission · documents et
            performances suivis en temps réel.
          </p>
        </div>
        <div className="page-head-actions">
          <button className="btn btn-ghost" onClick={exportTeam}>
            <FileText size={15} /> Excel
          </button>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> Ajouter un chauffeur
          </button>
        </div>
      </div>

      <div className="grid grid-kpi mb-3 stagger">
        <Kpi
          icon={<Users size={18} />}
          label="Effectif total"
          value={state.drivers.length}
          foot={`${onMission} en mission actuellement`}
          tint="var(--orange-100)"
          color="var(--orange-600)"
        />
        <Kpi
          icon={<CheckCircle2 size={18} />}
          label="Courses réalisées"
          value={fmtNum(perf.reduce((a, d) => a + d.completed, 0))}
          foot="Cumul de toute l'équipe"
          tint="var(--green-100)"
          color="var(--green-500)"
        />
        <Kpi
          icon={<Award size={18} />}
          label="Note moyenne"
          value={`${avgRating.toFixed(1)} / 5`}
          foot="Satisfaction clients transportés"
          tint="var(--amber-100)"
          color="var(--amber-500)"
        />
        <Kpi
          icon={<AlertTriangle size={18} />}
          label="Documents à surveiller"
          value={expiring.length}
          foot="Permis < 60 j ou visite médicale < 30 j"
          tint="var(--red-100)"
          color="var(--red-500)"
        />
      </div>

      <div className="split-2 mb-3">
        <section className="card">
          <div className="card-head">
            <div>
              <h3>Équipe de conduite</h3>
              <div className="sub">Tri par performance</div>
            </div>
            <div className="card-head-actions">
              <Badge tone="orange">{filtered.length}</Badge>
            </div>
          </div>
          <div className="filters">
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder="Nom, téléphone, permis, ville…"
            />
            <select
              className="select"
              style={{ flex: "0 1 150px" }}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Tous les statuts</option>
              {["Disponible", "En mission", "Repos", "Congé"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <select
              className="select"
              style={{ flex: "0 1 160px" }}
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="perf">Courses réalisées</option>
              <option value="rating">Meilleures notes</option>
              <option value="revenue">CA généré</option>
              <option value="name">Nom A→Z</option>
            </select>
          </div>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Chauffeur</th>
                  <th>Statut</th>
                  <th>Courses</th>
                  <th>Ponctualité</th>
                  <th>Note</th>
                  <th>Permis</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {slice.map((d) => {
                  const exp = daysUntil(d.licenseExpiry);
                  return (
                    <tr key={d.id}>
                      <td>
                        <div className="row" style={{ gap: 9 }}>
                          {d.photo_url ? (
                            <img
                              src={d.photo_url}
                              alt={d.name}
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: "50%",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            <Avatar
                              name={d.name}
                              color={d.avatarColor}
                              size={32}
                            />
                          )}
                          <div style={{ minWidth: 0 }}>
                            <div className="td-strong truncate">{d.name}</div>
                            <div
                              className="muted"
                              style={{ fontSize: ".7rem" }}
                            >
                              {d.city} · {d.licenseType}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={d.status} />
                      </td>
                      <td className="mono td-strong">{d.completed}</td>
                      <td style={{ minWidth: 100 }}>
                        <div className="row" style={{ gap: 6 }}>
                          <span
                            className="mono small"
                            style={{ fontWeight: 700, minWidth: 36 }}
                          >
                            {d.onTime}%
                          </span>
                        </div>
                        <div style={{ marginTop: 3 }}>
                          <Bar
                            value={d.onTime}
                            tone={
                              d.onTime > 95
                                ? "green"
                                : d.onTime > 90
                                  ? ""
                                  : "red"
                            }
                          />
                        </div>
                      </td>
                      <td>
                        <span className="rating">
                          <Star size={11} fill="currentColor" />{" "}
                          {d.rating.toFixed(1)}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge ${exp < 0 ? "red" : exp < 45 ? "amber" : "green"}`}
                          style={{ fontSize: ".68rem" }}
                        >
                          {exp < 0 ? "Expiré" : `J+${exp}`}
                        </span>
                      </td>
                      <td>
                        <div className="td-actions">
                          <button
                            className="icon-btn"
                            style={{ width: 30, height: 30 }}
                            onClick={() => setDetail(d)}
                            title="Profil"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            className="icon-btn"
                            style={{ width: 30, height: 30 }}
                            onClick={() => openEdit(d)}
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
                            onClick={() => setConfirmId(d.id)}
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
              <Empty title="Aucun chauffeur" icon={<IdCard size={22} />} />
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
            title="Performance hebdomadaire"
            subtitle="Courses vs objectif"
            action={
              <Badge tone="orange">
                <Gauge size={11} /> Semaine
              </Badge>
            }
          >
            <BarChart labels={monthly.labels} series={monthly.series} height={190} />
          </SectionCard>

          <SectionCard
            title="Classement interne"
            subtitle="Top chauffeurs par CA"
            action={<Badge tone="navy">Top 5</Badge>}
          >
            <RankBars
              items={perf.slice().sort((a, b) => b.revenue - a.revenue).slice(0, 5).map((d) => ({ label: d.name, value: d.revenue }))} />
          </SectionCard>

          <SectionCard
            title="Alertes documents"
            subtitle="Permis & visites médicales"
            action={
              <Badge tone={expiring.length ? "red" : "green"}>
                {expiring.length}
              </Badge>
            }
          >
            <div className="stack" style={{ gap: 4 }}>
              {expiring.slice(0, 4).map((d) => {
                const days = Math.min(
                  daysUntil(d.licenseExpiry),
                  daysUntil(d.medicalExpiry),
                );
                return (
                  <div key={d.id} className="list-row">
                    <div
                      className={`icon-tile ${days < 0 ? "red" : days < 30 ? "amber" : ""}`}
                    >
                      <AlertTriangle size={14} />
                    </div>
                    <div className="lr-main">
                      <div className="lr-title">{d.name}</div>
                      <div className="lr-sub">
                        {days < 0
                          ? "Document expiré"
                          : `Échéance dans ${days} jours`}
                      </div>
                    </div>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => openEdit(d)}
                    >
                      Gérer
                    </button>
                  </div>
                );
              })}
              {!expiring.length && (
                <p className="small muted">
                  Tous les documents sont valides. Aucune action requise.
                </p>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="CA généré par l'équipe"
            subtitle="Cumul des missions livrées"
          >
            <div
              style={{
                fontSize: "1.5rem",
                fontWeight: 800,
                letterSpacing: "-.03em",
              }}
            >
              {fmtEUR(teamRevenue, true)}
            </div>
            <p className="muted small mt-1">
              Chiffre d'affaires transport attribué aux chauffeurs de l'équipe.
            </p>
          </SectionCard>
        </div>
      </div>

      {/* Modal formulaire */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? `Modifier ${editing.name}` : "Ajouter un chauffeur"}
        subtitle="Profil, permis et documents administratifs."
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModal(false)}>
              Annuler
            </button>
            <button className="btn btn-primary" onClick={save}>
              {editing ? "Enregistrer" : "Ajouter à l'équipe"}
            </button>
          </>
        }
      >
        <div className="form-grid">
          <div className="field full">
            <label>Photo d'identité *</label>
            <div className="row" style={{ gap: 12 }}>
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 8,
                  background: "var(--surface-3)",
                  display: "grid",
                  placeItems: "center",
                  border: "1px dashed var(--border)",
                  overflow: "hidden",
                }}
              >
                {form.photo_url ? (
                  <img
                    src={form.photo_url}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: 8,
                    }}
                  />
                ) : (
                  <Camera size={24} color="var(--text-3)" />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <input
                  type="file"
                  id="photo-upload"
                  hidden
                  accept="image/*"
                  onChange={(e) => handleUpload(e, "photo")}
                />
                <label
                  htmlFor="photo-upload"
                  className="btn btn-ghost"
                  style={{ cursor: "pointer", display: "inline-flex" }}
                >
                  {uploadingPhoto ? (
                    "Envoi…"
                  ) : (
                    <>
                      <Upload size={14} /> Choisir une photo
                    </>
                  )}
                </label>
                <div className="hint">Format JPG ou PNG. Max 5 Mo.</div>
              </div>
            </div>
          </div>

          <div className="field full">
            <label>Pièce d'identité (Recto/Verso)</label>
            <div className="row" style={{ gap: 12 }}>
              <div
                style={{
                  width: 90,
                  height: 50,
                  borderRadius: 8,
                  background: "var(--surface-3)",
                  display: "grid",
                  placeItems: "center",
                  border: "1px dashed var(--border)",
                  overflow: "hidden",
                }}
              >
                {form.id_card_url ? (
                  <img
                    src={form.id_card_url}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: 8,
                    }}
                  />
                ) : (
                  <IdCard size={24} color="var(--text-3)" />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <input
                  type="file"
                  id="id-upload"
                  hidden
                  accept="image/*,.pdf"
                  onChange={(e) => handleUpload(e, "id")}
                />
                <label
                  htmlFor="id-upload"
                  className="btn btn-ghost"
                  style={{ cursor: "pointer", display: "inline-flex" }}
                >
                  {uploadingId ? (
                    "Envoi…"
                  ) : (
                    <>
                      <Upload size={14} /> Choisir un fichier
                    </>
                  )}
                </label>
                <div className="hint">Format JPG, PNG ou PDF.</div>
              </div>
            </div>
          </div>

          <div className="field full">
            <label>Nom complet *</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Prénom Nom"
            />
          </div>
          <div className="field">
            <label>Téléphone</label>
            <input
              className="input"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="field">
            <label>E-mail</label>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="field">
            <label>N° de permis</label>
            <input
              className="input"
              value={form.licenseNumber}
              onChange={(e) =>
                setForm({ ...form, licenseNumber: e.target.value })
              }
            />
          </div>
          <div className="field">
            <label>Catégorie de permis</label>
            <select
              className="select"
              value={form.licenseType}
              onChange={(e) =>
                setForm({ ...form, licenseType: e.target.value })
              }
            >
              {["B", "C", "CE", "C + CE", "D"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Expiration du permis</label>
            <input
              className="input"
              type="date"
              value={form.licenseExpiry}
              onChange={(e) =>
                setForm({ ...form, licenseExpiry: e.target.value })
              }
            />
          </div>
          <div className="field">
            <label>Visite médicale</label>
            <input
              className="input"
              type="date"
              value={form.medicalExpiry}
              onChange={(e) =>
                setForm({ ...form, medicalExpiry: e.target.value })
              }
            />
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
            <label>Disponibilité</label>
            <select
              className="select"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {["Disponible", "En mission", "Repos", "Congé"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="field full">
            <label>Contact d'urgence</label>
            <input
              className="input"
              value={form.emergencyContact}
              onChange={(e) =>
                setForm({ ...form, emergencyContact: e.target.value })
              }
            />
          </div>
          <div className="field full">
            <label>Notes</label>
            <textarea
              className="textarea"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Habilitations, formations, remarques…"
            />
          </div>
        </div>
      </Modal>

      {/* Modal profil (fiche détaillée) */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        wide
        title={detail?.name}
        subtitle={`${detail?.id} · ${detail?.licenseType} · Embauché le ${fmtDate(detail?.hireDate)}`}
      >
        {detail && (
          <div className="split-even" style={{ gap: 20 }}>
            <div className="stack" style={{ gap: 14 }}>
              <div className="card card-pad">
                <div className="row" style={{ gap: 12 }}>
                  {detail.photo_url ? (
                    <img
                      src={detail.photo_url}
                      alt={detail.name}
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: "50%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <Avatar
                      name={detail.name}
                      color={detail.avatarColor}
                      size={52}
                    />
                  )}
                  <div>
                    <div style={{ fontWeight: 750, fontSize: ".98rem" }}>
                      {detail.name}
                    </div>
                    <div className="muted small">
                      {detail.city} · {detail.status}
                    </div>
                    <div className="row" style={{ gap: 8, marginTop: 6 }}>
                      <StatusBadge status={detail.status} />
                      <span className="rating">
                        <Star size={11} fill="currentColor" />{" "}
                        {detail.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="stack mt-2" style={{ gap: 8 }}>
                  <div className="row" style={{ gap: 8, fontSize: ".79rem" }}>
                    <Phone size={13} style={{ color: "var(--text-3)" }} />{" "}
                    {detail.phone || "—"}
                  </div>
                  <div className="row" style={{ gap: 8, fontSize: ".79rem" }}>
                    <Mail size={13} style={{ color: "var(--text-3)" }} />{" "}
                    {detail.email || "—"}
                  </div>
                  <div className="row" style={{ gap: 8, fontSize: ".79rem" }}>
                    <MapPin size={13} style={{ color: "var(--text-3)" }} />{" "}
                    {detail.city}
                  </div>
                </div>
              </div>

              <SectionCard title="Documents administratifs">
                <div className="stack" style={{ gap: 9 }}>
                  <div
                    className="row"
                    style={{
                      justifyContent: "space-between",
                      fontSize: ".79rem",
                    }}
                  >
                    <span className="muted">Permis {detail.licenseType}</span>
                    <span
                      className={`badge ${daysUntil(detail.licenseExpiry) < 0 ? "red" : daysUntil(detail.licenseExpiry) < 45 ? "amber" : "green"}`}
                    >
                      {fmtDate(detail.licenseExpiry)}
                    </span>
                  </div>
                  <div
                    className="row"
                    style={{
                      justifyContent: "space-between",
                      fontSize: ".79rem",
                    }}
                  >
                    <span className="muted">Visite médicale</span>
                    <span
                      className={`badge ${daysUntil(detail.medicalExpiry) < 0 ? "red" : daysUntil(detail.medicalExpiry) < 30 ? "amber" : "green"}`}
                    >
                      {fmtDate(detail.medicalExpiry)}
                    </span>
                  </div>
                  <div
                    className="row"
                    style={{
                      justifyContent: "space-between",
                      fontSize: ".79rem",
                    }}
                  >
                    <span className="muted">Contact d'urgence</span>
                    <span>{detail.emergencyContact || "—"}</span>
                  </div>
                </div>
                {detail.id_card_url && (
                  <div style={{ textAlign: "center", marginTop: 10 }}>
                    <img
                      src={detail.id_card_url}
                      alt="Pièce d'identité"
                      style={{
                        maxWidth: "100%",
                        borderRadius: 8,
                        border: "1px solid var(--border)",
                      }}
                    />
                    <a
                      href={detail.id_card_url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-ghost btn-sm"
                      style={{ marginTop: 8 }}
                    >
                      <Eye size={14} /> Voir en grand
                    </a>
                  </div>
                )}
              </SectionCard>

              <SectionCard
                title="Contact d'urgence"
                subtitle="Personne à prévenir"
              >
                <p className="small">
                  {detail.emergencyContact || "Non renseigné."}
                </p>
              </SectionCard>
            </div>

            <div className="stack" style={{ gap: 14 }}>
              <SectionCard
                title="Performance"
                subtitle="Indicateurs de conduite"
              >
                <div className="stack" style={{ gap: 10 }}>
                  <div>
                    <div
                      className="row"
                      style={{
                        justifyContent: "space-between",
                        fontSize: ".78rem",
                        marginBottom: 4,
                      }}
                    >
                      <span className="muted">Ponctualité</span>
                      <span className="mono td-strong">{detail.onTime}%</span>
                    </div>
                    <Bar
                      value={detail.onTime}
                      tone={detail.onTime > 95 ? "green" : ""}
                    />
                  </div>
                  <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
                    <span className="badge orange">
                      <Truck size={10} /> {detail.completed} courses
                    </span>
                    <span className="badge green">
                      <Star size={10} /> {detail.rating.toFixed(1)} / 5
                    </span>
                    <span className="badge blue">
                      <FileText size={10} /> {fmtEUR(detail.revenue || 0, true)}{" "}
                      CA
                    </span>
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Véhicule attitré"
                subtitle="Affectation actuelle"
              >
                {detailVehicle ? (
                  <div className="row" style={{ gap: 10 }}>
                    <div className="icon-tile orange">
                      <Truck size={16} />
                    </div>
                    <div>
                      <div className="td-strong">{detailVehicle.model}</div>
                      <div className="muted small">
                        {detailVehicle.plate} · {detailVehicle.type}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="small muted">
                    Aucun véhicule affecté à ce chauffeur.
                  </p>
                )}
              </SectionCard>

              <SectionCard
                title="Dernières missions"
                subtitle={`${detailMissions.length} livraisons récentes`}
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
                        {m.pickupCity} → {m.dropoffCity} ·{" "}
                        {fmtEUR(m.price || 0, true)} · {timeAgo(m.createdAt)}
                      </div>
                    </div>
                  ))}
                  {!detailMissions.length && (
                    <p className="small muted" style={{ padding: 16 }}>
                      Aucune mission enregistrée pour ce chauffeur.
                    </p>
                  )}
                </div>
              </SectionCard>

              {detail.notes && (
                <SectionCard title="Notes internes">
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
          remove("drivers", confirmId, user?.name);
          toast("Chauffeur supprimé");
        }}
        title="Supprimer ce chauffeur ?"
        message="Le profil et les documents seront supprimés définitivement."
      />
    </>
  );
}
