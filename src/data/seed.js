import { addDays, estimateCost, uid } from '../lib/helpers';

/* Seeded PRNG for reproducible demo data */
let seed = 20261103;
const rnd = () => {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
};
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const int = (min, max) => Math.floor(rnd() * (max - min + 1)) + min;
const flt = (min, max, d = 1) => +(rnd() * (max - min) + min).toFixed(d);

export const COMPANY = {
  name: 'E-TOURÉ LOGISTICS',
  legal: 'E-TOURÉ LOGISTICS SAS',
  address: '1 rue pierre et marie curie, Méru 60110',
  city: 'Méru, France',
  email: 'etoureservice@gmail.com',
  phone: '+33 7 46 26 86 98',
  vat: 'FR 07 46 26 86 98',
  iban: 'FR76 3000 4008 2800 0125 4789 741',
  bank: 'BNP Paribas — Paris Opéra',
  siret: '892 145 703 00027',
  website: 'www.etoure-logistics.eu',
};

export const CITIES = {
  Paris: { lat: 48.8566, lng: 2.3522, cp: '75012' },
  Lyon: { lat: 45.764, lng: 4.8357, cp: '69003' },
  Marseille: { lat: 43.2965, lng: 5.3698, cp: '13008' },
  Toulouse: { lat: 43.6047, lng: 1.4442, cp: '31000' },
  Bordeaux: { lat: 44.8378, lng: -0.5792, cp: '33000' },
  Nantes: { lat: 47.2184, lng: -1.5536, cp: '44000' },
  Lille: { lat: 50.6292, lng: 3.0573, cp: '59000' },
  Strasbourg: { lat: 48.5734, lng: 7.7521, cp: '67000' },
  Rennes: { lat: 48.1173, lng: -1.6778, cp: '35000' },
  Nice: { lat: 43.7102, lng: 7.262, cp: '06000' },
  Montpellier: { lat: 43.6108, lng: 3.8767, cp: '34000' },
  Dijon: { lat: 47.322, lng: 5.0415, cp: '21000' },
  Rouen: { lat: 49.4432, lng: 1.0999, cp: '76000' },
  Tours: { lat: 47.3941, lng: 0.6848, cp: '37000' },
};

const DISTANCES = {
  'Paris-Lyon': 465, 'Paris-Marseille': 775, 'Paris-Toulouse': 680, 'Paris-Bordeaux': 585,
  'Paris-Nantes': 385, 'Paris-Lille': 225, 'Paris-Strasbourg': 490, 'Paris-Rennes': 350,
  'Paris-Nice': 930, 'Paris-Montpellier': 750, 'Paris-Dijon': 315, 'Paris-Rouen': 135,
  'Paris-Tours': 235, 'Lyon-Marseille': 315, 'Lyon-Toulouse': 540, 'Lyon-Bordeaux': 555,
  'Lyon-Nantes': 685, 'Lyon-Lille': 690, 'Lyon-Strasbourg': 495, 'Lyon-Rennes': 745,
  'Lyon-Nice': 470, 'Lyon-Montpellier': 305, 'Lyon-Dijon': 195, 'Bordeaux-Toulouse': 245,
  'Bordeaux-Nantes': 345, 'Nantes-Rennes': 105, 'Lille-Strasbourg': 520, 'Marseille-Nice': 200,
  'Marseille-Montpellier': 170, 'Toulouse-Montpellier': 245, 'Dijon-Strasbourg': 335,
  'Rouen-Lille': 235, 'Tours-Bordeaux': 350, 'Rennes-Nantes': 105,
};
const distOf = (a, b) => DISTANCES[`${a}-${b}`] || DISTANCES[`${b}-${a}`] || int(120, 620);

const CLIENT_NAMES = [
  ['Maison Laurent', 'Jean-Baptiste Laurent', 'contact@maisonlaurent.fr', 'Paris', 'Distribution · Épicerie fine'],
  ['TechnoStore SARL', 'Amélie Rousseau', 'logistique@technostore.fr', 'Lyon', 'E-commerce · High-tech'],
  ['Groupe Vinatis', 'Karim Bensalah', 'achats@vinatis.fr', 'Bordeaux', 'Négoce de vins'],
  ['Pharma Nord', 'Dr. Sophie Marchand', 'supply@pharmanord.eu', 'Lille', 'Santé · Pharmaceutique'],
  ['Mobilier Déco Plus', 'Vincent Girard', 'transport@mobilierdeco.fr', 'Nantes', 'Ameublement'],
  ['Atelier Sud Création', 'Camille Fontan', 'hello@ateliersud.fr', 'Marseille', 'Artisanat · Décoration'],
  ['FreshBox Market', 'Yanis Toure', 'ops@freshboxmarket.fr', 'Toulouse', 'Frais · Alimentaire'],
  ['Studio Graphik', 'Emma Lemoine', 'admin@studiographik.fr', 'Strasbourg', 'Imprimerie · Communication'],
  ['AutoPièces Express', 'Hugo Mercier', 'compta@autopieces-express.fr', 'Dijon', 'Pièces automobiles'],
  ['Nordic Home', 'Léa Andersen', 'orders@nordichome.eu', 'Rennes', 'Mobilier scandinave'],
  ['Clinique Vita', 'Dr. Nadia Cherif', 'achats@cliniquevita.fr', 'Nice', 'Santé · Clinique'],
  ['Bistrot du Marché', 'Thomas Perrin', 'gerant@bistrotdumarche.fr', 'Montpellier', 'Restauration'],
  ['Solaire Occitanie', 'Pierre Vasseur', 'logistique@solaire-occitanie.fr', 'Toulouse', 'Énergie · Panneaux'],
  ['Belle Étoffe', 'Sarah Kone', 'contact@belleetoffe.fr', 'Paris', 'Textile · Prêt-à-porter'],
  ['Rouen Méca Services', 'Alexandre Dupuis', 'contact@rouenmeca.fr', 'Rouen', 'Industrie'],
  ['Loïc Transport & Cie', 'Loïc Ndiaye', 'info@loic-transport.fr', 'Tours', 'Sous-traitance transport'],
];

const DRIVER_NAMES = [
  'Kouassi Yao', 'Mamadou Diallo', 'Julien Ferrand', 'Ahmed Benali',
  'Serge Amani', 'Élodie Rivière', 'Ibrahim Sow', 'Nicolas Lecourt',
  'Fatou Camara', 'Pierre Mendy',
];

const VEHICLE_MODELS = [
  { type: 'Camion', model: 'Mercedes Actros 1840', plate: 'ET-418-KM', cap: 12000, fuel: 'Diesel' },
  { type: 'Camion', model: 'Volvo FH 16', plate: 'ET-672-QR', cap: 18000, fuel: 'Diesel' },
  { type: 'Camion', model: 'Renault T High', plate: 'ET-905-XV', cap: 15000, fuel: 'Diesel' },
  { type: 'Fourgonnette', model: 'Ford Transit 350 L3', plate: 'ET-217-BD', cap: 1400, fuel: 'Diesel' },
  { type: 'Fourgonnette', model: 'Renault Master L2H2', plate: 'ET-334-LM', cap: 1200, fuel: 'Diesel' },
  { type: 'Fourgonnette', model: 'VW Crafter 35', plate: 'ET-780-HZ', cap: 1350, fuel: 'Diesel' },
  { type: 'Fourgonnette', model: 'Peugeot Boxer L3', plate: 'ET-129-PT', cap: 1150, fuel: 'Diesel' },
  { type: 'Moto', model: 'Honda PCX 125', plate: 'MT-441-AC', cap: 25, fuel: 'Essence' },
  { type: 'Moto', model: 'Yamaha MT-03 Cargo', plate: 'MT-583-FD', cap: 20, fuel: 'Essence' },
  { type: 'Moto', model: 'Piaggio Liberty Cargo', plate: 'MT-619-GK', cap: 18, fuel: 'Essence' },
];

const GOODS = [
  'Palettes agroalimentaires', 'Colis e-commerce', 'Mobilier de bureau', 'Équipements médicaux',
  'Cartons déménagement', 'Pièces détachées', 'Produits frais sous température', 'Matériel informatique',
  'Marchandise fragile', 'Textile conditionné', 'Documents confidentiels', 'Matériel solaire',
];

const NOTE_TEXTS = [
  'Livraison au 3ᵉ étage avec monte-charge. Prévoir créneau 9h-11h.',
  'Client absent l\'après-midi, prévoir rappel 30 min avant.',
  'Marchandise sous température dirigée, ne pas rompre la chaîne du froid.',
  'Code portail 1847A. Gardien présent jusqu\'à 18h.',
  'Déchargement côté rue arrière, accès camion limité à 15 m.',
];

const now = new Date();
const iso = (d) => (d instanceof Date ? d.toISOString() : d);

/* ---------------------------- CLIENTS ---------------------------- */
export const clients = CLIENT_NAMES.map(([name, contact, email, city, sector], i) => ({
  id: `CLI-${String(1001 + i)}`,
  name,
  contact,
  email,
  phone: `+33 ${int(1, 9)} ${int(10, 99)} ${int(10, 99)} ${int(10, 99)} ${int(10, 99)}`,
  address: `${int(2, 180)} ${pick(['rue des Lilas', 'avenue Victor Hugo', 'boulevard de la République', 'rue du Commerce', 'place du Marché', 'rue Pasteur', 'chemin des Vignes'])}`,
  city,
  cp: CITIES[city]?.cp || '75001',
  sector,
  type: pick(['Entreprise', 'Entreprise', 'PME', 'Grand compte', 'Particulier']),
  siret: `${int(100, 999)} ${int(100, 999)} ${int(100, 999)} ${int(10000, 99999)}`,
  createdAt: iso(addDays(now, -int(120, 900))),
  status: i === 12 ? 'Inactif' : 'Actif',
  paymentTerms: pick(['Comptant', '15 jours', '30 jours', '30 jours', '45 jours']),
  rating: flt(3.6, 5, 1),
  notes: '',
}));

/* ---------------------------- DRIVERS ---------------------------- */
export const drivers = DRIVER_NAMES.map((name, i) => {
  const statuses = ['Disponible', 'En mission', 'En mission', 'Disponible', 'Repos', 'Congé'];
  return {
    id: `DRV-${String(201 + i)}`,
    name,
    phone: `+33 6 ${int(10, 99)} ${int(10, 99)} ${int(10, 99)} ${int(10, 99)}`,
    email: `${name.toLowerCase().replace(/[éè]/g, 'e').replace(/[^a-z ]/g, '').split(' ').join('.')}@etoure-logistics.eu`,
    licenseNumber: `${int(10, 99)}${String.fromCharCode(65 + int(0, 25))}${int(10000, 99999)}`,
    licenseType: pick(['C + CE', 'C + CE', 'B', 'C', 'CE']),
    licenseExpiry: iso(addDays(now, int(30, 900))),
    medicalExpiry: iso(addDays(now, int(-5, 400))),
    hireDate: iso(addDays(now, -int(60, 1800))),
    status: i === 8 ? 'Congé' : statuses[i % statuses.length],
    rating: flt(3.7, 5, 1),
    deliveriesDone: int(28, 340),
    onTimeRate: flt(84, 99.4, 1),
    kmTotal: int(4200, 68000),
    city: pick(Object.keys(CITIES)),
    emergencyContact: `+33 7 ${int(10, 99)} ${int(10, 99)} ${int(10, 99)} ${int(10, 99)}`,
    notes: '',
    avatarColor: pick(['#FF7A1A', '#1E3D63', '#12B76A', '#3B82F6', '#8B5CF6']),
  };
});

/* ---------------------------- VEHICLES ---------------------------- */
export const vehicles = VEHICLE_MODELS.map((v, i) => ({
  id: `VEH-${String(301 + i)}`,
  ...v,
  brand: v.model.split(' ')[0],
  year: int(2018, 2025),
  driverId: i < drivers.length ? drivers[i].id : null,
  status: i === 6 ? 'Maintenance' : i === 9 ? 'Hors service' : pick(['Disponible', 'En mission', 'En mission', 'Disponible']),
  mileage: int(18000, 320000),
  insuranceExpiry: iso(addDays(now, i === 2 ? 12 : i === 5 ? 21 : int(45, 620))),
  insuranceProvider: pick(['AXA Pro', 'Allianz Fleet', 'MAIF Entreprise', 'GMF Flotte']),
  technicalVisitExpiry: iso(addDays(now, i === 1 ? 8 : i === 4 ? 27 : int(40, 540))),
  nextMaintenanceKm: 0,
  maintenanceCost: int(320, 4200),
  fuelConsumption: flt(4.2, 32, 1),
  co2: int(0, 890),
  gpsActive: i !== 9,
  createdAt: iso(addDays(now, -int(200, 1500))),
}));
vehicles.forEach((v) => { v.nextMaintenanceKm = v.mileage + int(1500, 12000); });

/* ---------------------------- DELIVERIES ---------------------------- */
const STATUS_FLOW = ['En attente', 'Confirmée', 'En cours', 'Livrée', 'Annulée'];

export const deliveries = (() => {
  const list = [];
  const cityList = Object.keys(CITIES);

  for (let i = 0; i < 84; i++) {
    const daysAgo = i < 14 ? int(0, 3) : int(4, 175);
    const created = addDays(now, -daysAgo);
    let pickup = pick(cityList);
    let dropoff = pick(cityList.filter((c) => c !== pickup));
    if (pickup === 'Paris' && rnd() > 0.5) pickup = pick(cityList.filter((c) => c !== 'Paris'));
    const distance = distOf(pickup, dropoff);
    const vehicle = pick(vehicles);
    const weight = vehicle.type === 'Camion' ? int(2000, 11000) : vehicle.type === 'Fourgonnette' ? int(80, 1300) : int(2, 22);
    const urgency = pick(['standard', 'standard', 'standard', 'express', 'urgent']);
    const est = estimateCost({ distance, weight, vehicleType: vehicle.type, urgency, fragile: rnd() > 0.78, night: rnd() > 0.9 });
    const status = daysAgo > 20 ? (rnd() > 0.93 ? 'Annulée' : 'Livrée') : daysAgo > 6 ? pick(['Livrée', 'Livrée', 'Livrée', 'En cours', 'Annulée']) : pick(STATUS_FLOW);
    const driver = pick(drivers);
    const client = pick(clients);
    list.push({
      id: `LIV-${2026}${String(1000 + i)}`,
      clientId: client.id,
      clientName: client.name,
      pickupCity: pickup,
      pickupAddress: `${int(2, 160)} ${pick(['rue', 'avenue', 'boulevard'])} ${pick(['des Docks', 'de la Gare', 'Nationale', 'du Port', 'des Artisans'])}, ${CITIES[pickup].cp} ${pickup}`,
      dropoffCity: dropoff,
      dropoffAddress: `${int(2, 160)} ${pick(['rue', 'avenue', 'boulevard'])} ${pick(['des Acacias', 'du Centre', 'de Verdun', 'des Écoles', 'Pasteur'])}, ${CITIES[dropoff].cp} ${dropoff}`,
      distance,
      weight,
      goods: pick(GOODS),
      vehicleId: vehicle.id,
      vehicleType: vehicle.type,
      driverId: driver.id,
      driverName: driver.name,
      status,
      priority: urgency === 'urgent' ? 'Urgente' : urgency === 'express' ? 'Haute' : 'Normale',
      urgency,
      /* tarification professionnelle : marge brute cible ~22 % */
      price: Math.round(est.price * 2.2 / 10) * 10,
      cost: Math.round(est.cost * 2.13 / 10) * 10,
      createdAt: iso(created),
      scheduledAt: iso(addDays(created, int(0, 2))),
      deliveredAt: status === 'Livrée' ? iso(addDays(created, int(0, 2))) : null,
      progress: status === 'Livrée' ? 100 : status === 'En cours' ? int(18, 88) : status === 'Confirmée' ? 6 : 0,
      notes: rnd() > 0.7 ? pick(NOTE_TEXTS) : '',
      signature: status === 'Livrée' ? driver.name : null,
      trackingCode: `ET${int(100000, 999999)}`,
      fragile: rnd() > 0.8,
      temperatureControlled: rnd() > 0.85,
    });
  }
  return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
})();

/* ---------------------------- EXPENSES ---------------------------- */
const EXP_CATS = [
  ['Carburant', 'Diesel / Essence flotte'],
  ['Maintenance', 'Entretien & réparations'],
  ['Salaires', 'Masse salariale chauffeurs'],
  ['Assurance', 'Flotte & responsabilité civile'],
  ['Péages', 'Autoroutes & tunnels'],
  ['Leasing', 'Loyers véhicules'],
  ['Fournitures', 'Emballage & consommables'],
  ['Sous-traitance', 'Transport affrété'],
  ['Loyer', 'Entrepôt & bureaux'],
  ['Marketing', 'Acquisition & publicité'],
];

export const expenses = (() => {
  const list = [];
  for (let i = 0; i < 96; i++) {
    const [category, label] = pick(EXP_CATS);
    const daysAgo = int(0, 175);
    const base0 = category === 'Salaires' ? int(4800, 12500)
      : category === 'Leasing' ? int(900, 2600)
      : category === 'Loyer' ? 4200
      : category === 'Carburant' ? int(180, 1450)
      : category === 'Sous-traitance' ? int(600, 3800)
      : category === 'Assurance' ? int(450, 1900)
      : int(45, 900);
    const base = Math.round(base0 * 0.23 / 10) * 10;
    list.push({
      id: `EXP-${String(4000 + i)}`,
      category,
      label,
      amount: base,
      date: iso(addDays(now, -daysAgo)),
      supplier: pick(['Total Énergies', 'Garage Central', 'AXA Pro', 'Vinci Autoroutes', 'ALD Automotive', 'Bruneau', 'Geodis', 'EDF Pro', 'Google Ads', 'Manutan']),
      vehicleId: ['Carburant', 'Maintenance', 'Péages', 'Assurance'].includes(category) ? pick(vehicles).id : null,
      method: pick(['Carte entreprise', 'Virement', 'Prélèvement', 'Espèces']),
      status: rnd() > 0.08 ? 'Payée' : 'En attente',
      recurring: ['Loyer', 'Leasing', 'Assurance', 'Salaires'].includes(category),
      invoiceRef: `F${int(10000, 99999)}`,
    });
  }
  return list.sort((a, b) => new Date(b.date) - new Date(a.date));
})();

/* ---------------------------- INVOICES / QUOTES ---------------------------- */
const docItems = (d) => [
  { label: `Transport ${d.pickupCity} → ${d.dropoffCity}`, qty: 1, unitPrice: Math.round(d.price * 0.82) },
  { label: 'Manutention & chargement', qty: 1, unitPrice: Math.round(d.price * 0.11) },
  { label: d.fragile ? 'Assurance marchandise fragile' : 'Suivi GPS temps réel', qty: 1, unitPrice: Math.round(d.price * 0.07) },
];

const buildDoc = (d, i, kind) => {
  const items = docItems(d);
  const subtotal = items.reduce((a, it) => a + it.qty * it.unitPrice, 0);
  const vatRate = 20;
  const vat = Math.round(subtotal * vatRate) / 100;
  const created = new Date(d.createdAt);
  return {
    id: `${kind === 'facture' ? 'FAC' : 'DEV'}-2026-${String(1000 + i)}`,
    number: `${kind === 'facture' ? 'FAC' : 'DEV'}-2026-${String(1000 + i)}`,
    kind,
    deliveryId: d.id,
    deliveries: [d.id],
    clientId: d.clientId,
    clientName: d.clientName,
    date: d.createdAt,
    dueDate: addDays(created, kind === 'facture' ? 30 : 21),
    items,
    totals: { subtotal, vatRate, vat, total: subtotal + vat },
    status: kind === 'facture'
      ? (d.status === 'Livrée' ? (rnd() > 0.28 ? 'Payée' : 'En attente') : d.status === 'Annulée' ? 'Annulée' : 'En attente')
      : (rnd() > 0.45 ? 'Accepté' : rnd() > 0.5 ? 'Envoyé' : 'Brouillon'),
    paymentMethod: pick(['Virement bancaire', 'Carte bancaire', 'Prélèvement SEPA']),
    notes: 'Paiement à réception de facture. TVA acquittée sur les prestations de transport.',
    paidAt: null,
  };
};

const deliveredOrOthers = deliveries.filter((d) => d.status !== 'Annulée');
export const invoices = deliveredOrOthers.slice(0, 52).map((d, i) => {
  const doc = buildDoc(d, i, 'facture');
  if (doc.status === 'Payée') doc.paidAt = addDays(new Date(doc.date), int(3, 28));
  return doc;
});

export const quotes = deliveredOrOthers.slice(20, 44).map((d, i) => buildDoc(d, 500 + i, 'devis'));

/* ---------------------------- NOTIFICATIONS ---------------------------- */
export const notifications = [
  { id: 'NTF-1', type: 'alert', channel: 'email', title: 'Assurance véhicule ET-672-QR expire dans 12 jours', body: 'Anticipez le renouvellement de la police Allianz Fleet pour éviter l\'immobilisation.', time: iso(addDays(now, 0)), read: false, target: '/vehicules' },
  { id: 'NTF-2', type: 'delivery', channel: 'whatsapp', title: 'LIV-20261003 est en cours de livraison', body: 'Le chauffeur Mamadou Diallo est à 24 km du point de livraison.', time: iso(addDays(now, 0)), read: false, target: '/carte' },
  { id: 'NTF-3', type: 'finance', channel: 'email', title: '3 factures en retard de paiement', body: 'Montant total concerné : 12 480 €. Relance automatique programmée.', time: iso(addDays(now, -1)), read: false, target: '/factures' },
  { id: 'NTF-4', type: 'driver', channel: 'sms', title: 'Permis de Serge Amani à renouveler', body: 'Le permis C+CE arrive à expiration dans 45 jours.', time: iso(addDays(now, -2)), read: true, target: '/chauffeurs' },
  { id: 'NTF-5', type: 'delivery', channel: 'email', title: 'Preuve de livraison reçue — LIV-20261047', body: 'Signature électronique et photo de chargement disponibles.', time: iso(addDays(now, -2)), read: true, target: '/livraisons' },
  { id: 'NTF-6', type: 'system', channel: 'app', title: 'Sauvegarde automatique réussie', body: 'Snapshot quotidien chiffré terminé en 42 secondes.', time: iso(addDays(now, -3)), read: true, target: '/administration' },
];

/* ---------------------------- USERS & ROLES ---------------------------- */
export const users = [
  { id: 'USR-1', name: 'Souleymane Touré', email: 'admin@etoure-logistics.eu', role: 'Administrateur', password: 'demo1234', active: true, lastLogin: iso(addDays(now, 0)), avatarColor: '#FF7A1A', phone: '+33 6 11 22 33 44' },
  { id: 'USR-2', name: 'Claire Dubois', email: 'manager@etoure-logistics.eu', role: 'Manager', password: 'demo1234', active: true, lastLogin: iso(addDays(now, -1)), avatarColor: '#1E3D63', phone: '+33 6 22 33 44 55' },
  { id: 'USR-3', name: 'Yann Kofi', email: 'dispatcher@etoure-logistics.eu', role: 'Exploitant', password: 'demo1234', active: true, lastLogin: iso(addDays(now, 0)), avatarColor: '#12B76A', phone: '+33 6 33 44 55 66' },
  { id: 'USR-4', name: 'Nadia Berri', email: 'compta@etoure-logistics.eu', role: 'Comptable', password: 'demo1234', active: true, lastLogin: iso(addDays(now, -2)), avatarColor: '#8B5CF6', phone: '+33 6 44 55 66 77' },
  { id: 'USR-5', name: 'Jean-Baptiste Laurent', email: 'client@maisonlaurent.fr', role: 'Client', password: 'demo1234', active: true, lastLogin: iso(addDays(now, -1)), avatarColor: '#3B82F6', phone: '+33 1 45 78 22 10', clientId: 'CLI-1001' },
  { id: 'USR-6', name: 'Amélie Rousseau', email: 'client2@technostore.fr', role: 'Client', password: 'demo1234', active: false, lastLogin: iso(addDays(now, -30)), avatarColor: '#F59E0B', phone: '+33 4 72 11 88 90', clientId: 'CLI-1002' },
  { id: 'USR-7', name: 'Cheik Dev', email: 'cheikdev7@gmail.com', role: 'Administrateur', password: 'Amynath.00', active: true, lastLogin: iso(addDays(now, 0)), avatarColor: '#0EA5E9', phone: '+33 6 00 00 00 00' },
];

export const ROLES = {
  Administrateur: { description: 'Accès complet à toutes les fonctionnalités', permissions: ['dashboard', 'clients', 'livraisons', 'chauffeurs', 'vehicules', 'finance', 'carte', 'notifications', 'administration'], color: 'orange' },
  Manager: { description: 'Pilotage opérationnel et reporting', permissions: ['dashboard', 'clients', 'livraisons', 'chauffeurs', 'vehicules', 'finance', 'carte', 'notifications'], color: 'blue' },
  Exploitant: { description: 'Gestion des tournées et affectations', permissions: ['dashboard', 'clients', 'livraisons', 'chauffeurs', 'vehicules', 'carte', 'notifications'], color: 'green' },
  Comptable: { description: 'Facturation, dépenses et rapports', permissions: ['dashboard', 'finance', 'clients', 'notifications'], color: 'amber' },
  Client: { description: 'Portail client : commandes & factures', permissions: ['portail'], color: 'navy' },
};

/* ---------------------------- ACTIVITY LOG ---------------------------- */
export const activityLog = [
  { id: 'LOG-1', user: 'Souleymane Touré', action: 'Création livraison', target: 'LIV-20261083', type: 'create', time: iso(addDays(now, 0)) },
  { id: 'LOG-2', user: 'Yann Kofi', action: 'Affectation chauffeur', target: 'LIV-20261081 → Kouassi Yao', type: 'update', time: iso(addDays(now, 0)) },
  { id: 'LOG-3', user: 'Nadia Berri', action: 'Émission facture', target: 'FAC-2026-1051', type: 'create', time: iso(addDays(now, 0)) },
  { id: 'LOG-4', user: 'Claire Dubois', action: 'Modification client', target: 'Groupe Vinatis', type: 'update', time: iso(addDays(now, -1)) },
  { id: 'LOG-5', user: 'Souleymane Touré', action: 'Ajout véhicule', target: 'VEH-310 · Renault T High', type: 'create', time: iso(addDays(now, -1)) },
  { id: 'LOG-6', user: 'Yann Kofi', action: 'Annulation livraison', target: 'LIV-20261062', type: 'delete', time: iso(addDays(now, -2)) },
  { id: 'LOG-7', user: 'Nadia Berri', action: 'Export comptable Excel', target: 'Rapport Q3 2026', type: 'export', time: iso(addDays(now, -2)) },
  { id: 'LOG-8', user: 'Souleymane Touré', action: 'Connexion réussie', target: 'Session Paris · Chrome', type: 'auth', time: iso(addDays(now, -2)) },
  { id: 'LOG-9', user: 'Claire Dubois', action: 'Mise à jour tarifs', target: 'Grille Camion 2026', type: 'update', time: iso(addDays(now, -3)) },
  { id: 'LOG-10', user: 'Système', action: 'Sauvegarde chiffrée', target: 'Snapshot quotidien 42s', type: 'system', time: iso(addDays(now, -3)) },
  { id: 'LOG-11', user: 'Yann Kofi', action: 'Statut livraison', target: 'LIV-20261058 → Livrée', type: 'update', time: iso(addDays(now, -4)) },
  { id: 'LOG-12', user: 'Nadia Berri', action: 'Saisie dépense', target: 'Carburant 1 240 €', type: 'create', time: iso(addDays(now, -4)) },
];

/* ---------------------------- NOTIFICATION SETTINGS ---------------------------- */
export const notificationSettings = {
  email: true,
  sms: true,
  whatsapp: true,
  push: true,
  rules: [
    { id: 'r1', label: 'Livraison en cours de route', channel: 'WhatsApp', enabled: true },
    { id: 'r2', label: 'Livraison terminée', channel: 'E-mail + SMS', enabled: true },
    { id: 'r3', label: 'Facture impayée à 7 jours', channel: 'E-mail', enabled: true },
    { id: 'r4', label: 'Assurance / visite technique < 30 j', channel: 'E-mail + push', enabled: true },
    { id: 'r5', label: 'Retard estimé > 30 min', channel: 'SMS', enabled: true },
    { id: 'r6', label: 'Nouveau devis accepté', channel: 'WhatsApp', enabled: false },
  ],
};

export const TEAM_TARGETS = { monthlyRevenue: 16000, monthlyDeliveries: 16, onTimeRate: 96 };
