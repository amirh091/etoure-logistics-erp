import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  MapPin,
  Truck,
  Navigation,
  Play,
  Pause,
  Route,
  Clock,
  Fuel,
  Sparkles,
  Radio,
  Crosshair,
  CircleDot,
  Bike,
  Car,
  Zap,
} from "lucide-react";
import { useStore } from "../store/StoreContext";
import { Badge, SectionCard, StatusBadge, Bar } from "../components/ui";
import { fmtNum, timeAgo } from "../lib/helpers";
import { CITIES } from "../data/seed";

/* ---------- projection geo → % position sur canvas ---------- */
const BOUNDS = { latMin: 42.8, latMax: 51.2, lngMin: -2.2, lngMax: 8.3 };
const project = (lat, lng) => ({
  x: ((lng - BOUNDS.lngMin) / (BOUNDS.lngMax - BOUNDS.lngMin)) * 100,
  y: (1 - (lat - BOUNDS.latMin) / (BOUNDS.latMax - BOUNDS.latMin)) * 100,
});

const TYPE_ICON = { Camion: Truck, Fourgonnette: Car, Moto: Bike };

/* contour simplifié du territoire métropolitain (lat, lng) */
const FRANCE_OUTLINE = [
  [51.05, 2.37],
  [50.7, 1.85],
  [50.15, 1.6],
  [49.85, 0.6],
  [49.7, 0.15],
  [49.45, -0.3],
  [49.7, -1.25],
  [49.65, -1.62],
  [49.1, -1.5],
  [48.65, -1.62],
  [48.6, -2.8],
  [48.4, -4.78],
  [48.05, -4.6],
  [47.8, -4.35],
  [47.6, -3.1],
  [47.5, -2.5],
  [47.0, -2.05],
  [46.4, -1.6],
  [45.7, -1.15],
  [45.0, -1.15],
  [44.6, -1.25],
  [43.9, -1.35],
  [43.4, -1.8],
  [43.1, -1.4],
  [42.9, -0.5],
  [42.8, 0.6],
  [42.7, 1.4],
  [42.5, 2.0],
  [42.4, 2.7],
  [42.7, 3.0],
  [43.1, 3.2],
  [43.4, 4.0],
  [43.3, 4.7],
  [43.25, 5.4],
  [43.1, 6.1],
  [43.15, 6.6],
  [43.4, 7.1],
  [43.7, 7.5],
  [44.1, 7.2],
  [44.5, 6.9],
  [45.1, 6.9],
  [45.7, 6.9],
  [46.2, 6.1],
  [46.4, 5.9],
  [47.0, 6.1],
  [47.5, 7.0],
  [47.9, 7.6],
  [48.5, 8.1],
  [49.0, 8.2],
  [49.4, 8.0],
  [49.4, 6.3],
  [49.8, 6.0],
  [50.1, 5.7],
  [50.5, 4.6],
  [50.6, 4.2],
  [50.8, 3.7],
  [51.05, 2.37],
];

export default function MapLive() {
  const { state, update, toast } = useStore();
  const [playing, setPlaying] = useState(true);
  const [selected, setSelected] = useState(null);
  const [layer, setLayer] = useState({
    vehicles: true,
    routes: true,
    cities: true,
  });
  const [tick, setTick] = useState(0);
  const timer = useRef(null);

  const activeDeliveries = useMemo(
    () =>
      state.deliveries.filter((d) =>
        ["En cours", "Confirmée"].includes(d.status),
      ),
    [state.deliveries],
  );

  /* simulation du déplacement temps réel */
  useEffect(() => {
    if (!playing) return undefined;
    timer.current = setInterval(() => setTick((t) => t + 1), 2600);
    return () => clearInterval(timer.current);
  }, [playing]);

  useEffect(() => {
    if (!playing || !activeDeliveries.length) return;
    const target = activeDeliveries[tick % activeDeliveries.length];
    if (!target) return;
    const next = Math.min(
      99,
      target.progress + Math.floor(1 + Math.random() * 4),
    );
    if (next !== target.progress)
      update("deliveries", { id: target.id, progress: next });
  }, [tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const positions = useMemo(
    () =>
      state.vehicles.map((v, i) => {
        const mission =
          activeDeliveries.find((d) => d.vehicleId === v.id) ||
          activeDeliveries[i % (activeDeliveries.length || 1)];
        const from = CITIES[mission?.pickupCity || "Paris"];
        const to = CITIES[mission?.dropoffCity || "Lyon"];
        const p =
          (mission?.progress || (v.status === "En mission" ? 35 : 0)) / 100;
        const lat = from.lat + (to.lat - from.lat) * p;
        const lng = from.lng + (to.lng - from.lng) * p;
        const pos = project(lat, lng);
        // léger décalage déterministe pour éviter la superposition des marqueurs
        const jx = ((i * 7) % 9) - 4.5;
        const jy = ((i * 13) % 11) - 5.5;
        return {
          vehicle: v,
          mission,
          pos: { x: pos.x + jx, y: pos.y + jy },
          lat,
          lng,
          speed: v.status === "En mission" ? 48 + ((i * 13) % 42) : 0,
        };
      }),
    [state.vehicles, activeDeliveries],
  );

  const selectedItem = positions.find((p) => p.vehicle.id === selected);
  const routes = useMemo(
    () => positions.filter((p) => p.mission).slice(0, 6),
    [positions],
  );

  const totals = {
    moving: positions.filter((p) => p.vehicle.status === "En mission").length,
    idle: positions.filter((p) => p.vehicle.status !== "En mission").length,
    km: positions.reduce((a, p) => a + (p.mission?.distance || 0), 0),
    fuel: Math.round(
      positions.reduce((a, p) => a + (p.mission?.distance || 0), 0) * 0.28,
    ),
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Géolocalisation</div>
          <h1>Suivi temps réel de la flotte</h1>
          <p>
            {totals.moving} véhicules en mouvement · {activeDeliveries.length}{" "}
            missions actives · trajets optimisés par IA.
          </p>
        </div>
        <div className="page-head-actions">
          <button
            className="btn btn-ghost"
            onClick={() => setPlaying((p) => !p)}
          >
            {playing ? <Pause size={15} /> : <Play size={15} />}{" "}
            {playing ? "Pause live" : "Reprendre"}
          </button>
          <button
            className="btn btn-primary"
            onClick={() =>
              toast(
                "Optimisation IA appliquée : -8,4 % de coûts carburant sur les tournées actives",
              )
            }
          >
            <Sparkles size={15} /> Optimiser les trajets
          </button>
        </div>
      </div>

      <div className="grid grid-kpi mb-3 stagger">
        {[
          {
            l: "Véhicules suivis",
            v: positions.length,
            i: <Truck size={18} />,
            t: "var(--orange-100)",
            c: "var(--orange-600)",
          },
          {
            l: "En mouvement",
            v: totals.moving,
            i: <Radio size={18} />,
            t: "var(--green-100)",
            c: "var(--green-500)",
          },
          {
            l: "Km en cours",
            v: fmtNum(totals.km),
            i: <Route size={18} />,
            t: "var(--blue-100)",
            c: "var(--blue-500)",
          },
          {
            l: "Carburant estimé",
            v: `${fmtNum(totals.fuel)} L`,
            i: <Fuel size={18} />,
            t: "var(--amber-100)",
            c: "var(--amber-500)",
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

      {/* Carte plein écran mobile-first : la carte reste visible, la liste passe dessous */}
      <div className="split-wide">
        <section className="card" style={{ overflow: "hidden" }}>
          <div className="card-head">
            <div>
              <h3>France · Europe de l'Ouest</h3>
              <div className="sub">
                Mise à jour toutes les 2,6 s{" "}
                {playing && (
                  <Badge tone="green" className="live">
                    LIVE
                  </Badge>
                )}
              </div>
            </div>
            <div className="card-head-actions">
              {[
                ["vehicles", "Véhicules"],
                ["routes", "Trajets"],
                ["cities", "Villes"],
              ].map(([k, l]) => (
                <button
                  key={k}
                  className={`btn btn-sm ${layer[k] ? "btn-soft" : "btn-ghost"}`}
                  onClick={() => setLayer({ ...layer, [k]: !layer[k] })}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div
            className="map-canvas"
            style={{ borderRadius: 0, border: "none", minHeight: 480 }}
          >
            <div className="map-grid" />
            {/* Territoire */}
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
              }}
            >
              <defs>
                <linearGradient id="landFill" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#16304f" stopOpacity=".95" />
                  <stop offset="100%" stopColor="#0f2540" stopOpacity=".95" />
                </linearGradient>
              </defs>
              <polygon
                points={FRANCE_OUTLINE.map(([lat, lng]) => {
                  const p = project(lat, lng);
                  return `${p.x},${p.y}`;
                }).join(" ")}
                fill="url(#landFill)"
                stroke="rgba(255,255,255,.22)"
                strokeWidth="0.28"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            {/* Routes */}
            <div className="map-road h" style={{ top: "32%", opacity: 0.5 }} />
            <div className="map-road h" style={{ top: "58%", opacity: 0.5 }} />
            <div className="map-road h" style={{ top: "76%", opacity: 0.4 }} />
            <div className="map-road v" style={{ left: "38%", opacity: 0.5 }} />
            <div
              className="map-road v"
              style={{ left: "62%", opacity: 0.45 }}
            />
            <div className="map-road v" style={{ left: "78%", opacity: 0.4 }} />

            {/* Villes */}
            {layer.cities &&
              Object.entries(CITIES).map(([name, c]) => {
                const p = project(c.lat, c.lng);
                return (
                  <div
                    key={name}
                    style={{
                      position: "absolute",
                      left: `${p.x}%`,
                      top: `${p.y}%`,
                      transform: "translate(-50%,-50%)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 3,
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          background: "rgba(255,255,255,.45)",
                        }}
                      />
                      <span
                        className="map-label"
                        style={{ fontSize: ".6rem", padding: "2px 6px" }}
                      >
                        {name}
                      </span>
                    </div>
                  </div>
                );
              })}

            {/* Trajets */}
            {layer.routes &&
              routes.map((r, i) => {
                const from = project(
                  CITIES[r.mission.pickupCity].lat,
                  CITIES[r.mission.pickupCity].lng,
                );
                const to = project(
                  CITIES[r.mission.dropoffCity].lat,
                  CITIES[r.mission.dropoffCity].lng,
                );
                return (
                  <svg
                    key={i}
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      pointerEvents: "none",
                    }}
                  >
                    <line
                      x1={`${from.x}%`}
                      y1={`${from.y}%`}
                      x2={`${to.x}%`}
                      y2={`${to.y}%`}
                      stroke="rgba(255,122,26,.45)"
                      strokeWidth="1.6"
                      strokeDasharray="5 5"
                      style={{ animation: "dash 30s linear infinite" }}
                    />
                  </svg>
                );
              })}

            {/* Véhicules */}
            {layer.vehicles &&
              positions.map((p) => {
                const Icon = TYPE_ICON[p.vehicle.type] || Truck;
                const isSelected = selected === p.vehicle.id;
                return (
                  <div
                    key={p.vehicle.id}
                    className={`vehicle-pin ${p.vehicle.status === "En mission" ? "moving" : "idle"}`}
                    style={{
                      left: `${p.pos.x}%`,
                      top: `${p.pos.y}%`,
                      zIndex: isSelected ? 9 : 4,
                    }}
                    onClick={() => setSelected(p.vehicle.id)}
                  >
                    {p.vehicle.status === "En mission" && (
                      <span className="pulse" />
                    )}
                    <div
                      className="pin"
                      style={{
                        transform: isSelected ? "scale(1.2)" : undefined,
                        borderColor: isSelected ? "#fff" : undefined,
                      }}
                    >
                      <Icon size={15} />
                    </div>
                    {isSelected && (
                      <div
                        className="map-label"
                        style={{
                          position: "absolute",
                          left: "50%",
                          top: -26,
                          transform: "translateX(-50%)",
                        }}
                      >
                        {p.vehicle.plate} · {p.speed} km/h
                      </div>
                    )}
                  </div>
                );
              })}

            <div className="map-overlay tl">
              <span className="map-chip">
                <CircleDot size={11} style={{ color: "#12B76A" }} />{" "}
                {totals.moving} en mouvement
              </span>
              <span className="map-chip">
                <CircleDot size={11} style={{ color: "#64748B" }} />{" "}
                {totals.idle} à l'arrêt
              </span>
            </div>
            <div className="map-overlay tr">
              <span className="map-chip">
                <Crosshair size={11} /> GPS actif · précision ±8 m
              </span>
              <span className="map-chip">
                <Clock size={11} /> {new Date().toLocaleTimeString("fr-FR")}
              </span>
            </div>
          </div>
        </section>

        <div className="stack">
          {selectedItem ? (
            <SectionCard
              title="Véhicule sélectionné"
              subtitle={selectedItem.vehicle.plate}
              action={
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setSelected(null)}
                >
                  Fermer
                </button>
              }
            >
              <div className="row" style={{ gap: 10 }}>
                <div className="icon-tile orange">
                  <Truck size={16} />
                </div>
                <div>
                  <div style={{ fontWeight: 750, fontSize: ".88rem" }}>
                    {selectedItem.vehicle.model}
                  </div>
                  <div className="muted small">
                    {selectedItem.vehicle.type} · {selectedItem.vehicle.cap} kg
                  </div>
                </div>
              </div>
              <div className="stack mt-2" style={{ gap: 9 }}>
                {[
                  [
                    "Position",
                    `${selectedItem.lat.toFixed(3)}, ${selectedItem.lng.toFixed(3)}`,
                  ],
                  [
                    "Vitesse",
                    selectedItem.speed
                      ? `${selectedItem.speed} km/h`
                      : "À l'arrêt",
                  ],
                  ["Mission", selectedItem.mission?.id || "—"],
                  [
                    "Trajet",
                    selectedItem.mission
                      ? `${selectedItem.mission.pickupCity} → ${selectedItem.mission.dropoffCity}`
                      : "—",
                  ],
                  ["Avancement", `${selectedItem.mission?.progress || 0} %`],
                  [
                    "Chauffeur",
                    state.drivers.find(
                      (d) => d.id === selectedItem.vehicle.driverId,
                    )?.name || "—",
                  ],
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
                    <span style={{ fontWeight: 650 }} className="mono">
                      {v}
                    </span>
                  </div>
                ))}
              </div>
              {selectedItem.mission && (
                <>
                  <div className="mt-2">
                    <Bar value={selectedItem.mission.progress} tone="blue" />
                  </div>
                  <div
                    className="row"
                    style={{
                      justifyContent: "space-between",
                      fontSize: ".72rem",
                      marginTop: 5,
                    }}
                  >
                    <span className="muted">
                      {selectedItem.mission.pickupCity}
                    </span>
                    <span className="muted">
                      {selectedItem.mission.dropoffCity}
                    </span>
                  </div>
                </>
              )}
            </SectionCard>
          ) : (
            <SectionCard
              title="Flotte en direct"
              subtitle="Cliquez sur un véhicule"
            >
              <div
                className="stack"
                style={{ gap: 4, maxHeight: 300, overflowY: "auto" }}
              >
                {positions.map((p) => {
                  const Icon = TYPE_ICON[p.vehicle.type] || Truck;
                  return (
                    <button
                      key={p.vehicle.id}
                      className="list-row"
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "8px 0",
                      }}
                      onClick={() => setSelected(p.vehicle.id)}
                    >
                      <div
                        className={`icon-tile ${p.vehicle.status === "En mission" ? "orange" : ""}`}
                        style={{ width: 30, height: 30, flex: "0 0 30px" }}
                      >
                        <Icon size={14} />
                      </div>
                      <div className="lr-main">
                        <div
                          className="lr-title mono"
                          style={{ fontSize: ".79rem" }}
                        >
                          {p.vehicle.plate}
                        </div>
                        <div className="lr-sub">
                          {p.mission
                            ? `${p.mission.pickupCity} → ${p.mission.dropoffCity}`
                            : "Non affecté"}
                        </div>
                      </div>
                      <span
                        className="badge"
                        style={{
                          background:
                            p.vehicle.status === "En mission"
                              ? "var(--green-100)"
                              : "var(--bg-soft)",
                          color:
                            p.vehicle.status === "En mission"
                              ? "var(--green-500)"
                              : "var(--text-3)",
                        }}
                      >
                        {p.speed ? `${p.speed} km/h` : "arrêt"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </SectionCard>
          )}

          <SectionCard
            title="Trajets optimisés IA"
            subtitle="Gains estimés"
            action={
              <Badge tone="orange">
                <Sparkles size={11} /> IA
              </Badge>
            }
          >
            <div className="stack" style={{ gap: 11 }}>
              {[
                {
                  label: "Regroupement Lyon → Marseille",
                  gain: "-14 %",
                  detail: "2 livraisons fusionnées",
                },
                {
                  label: "Évitement axe Paris-Bordeaux",
                  gain: "-9 %",
                  detail: "Travaux détectés",
                },
                {
                  label: "Optimisation tournée Lille",
                  gain: "-11 %",
                  detail: "Ordre des arrêts revu",
                },
              ].map((o) => (
                <div key={o.label} className="row" style={{ gap: 9 }}>
                  <div
                    className="icon-tile green"
                    style={{ width: 28, height: 28, flex: "0 0 28px" }}
                  >
                    <Zap size={13} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="small" style={{ fontWeight: 620 }}>
                      {o.label}
                    </div>
                    <div className="muted" style={{ fontSize: ".7rem" }}>
                      {o.detail}
                    </div>
                  </div>
                  <Badge tone="green">{o.gain}</Badge>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Historique des déplacements"
            subtitle="Derniers mouvements"
            noPad
          >
            <div style={{ maxHeight: 240, overflowY: "auto" }}>
              {state.deliveries.slice(0, 8).map((d) => (
                <div
                  key={d.id}
                  style={{
                    padding: "9px 16px",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div
                    className="row"
                    style={{ justifyContent: "space-between" }}
                  >
                    <span className="mono small" style={{ fontWeight: 700 }}>
                      {d.id}
                    </span>
                    <StatusBadge status={d.status} />
                  </div>
                  <div
                    className="row"
                    style={{ justifyContent: "space-between", marginTop: 2 }}
                  >
                    <span className="muted" style={{ fontSize: ".71rem" }}>
                      <Navigation
                        size={9}
                        style={{ display: "inline", verticalAlign: -1 }}
                      />{" "}
                      {d.pickupCity} → {d.dropoffCity}
                    </span>
                    <span className="muted" style={{ fontSize: ".68rem" }}>
                      {timeAgo(d.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </>
  );
}
