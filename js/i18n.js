// English and French UI strings. Layer, class and zone names come from the data files
// (label_en / label_fr, name_en / name_fr), not from here.

const DICT = {
  en: {
    'brand.tag': 'Halifax Harbour prototype',
    'map.label': 'Map of Halifax Harbour with forecast pixels',
    'sample.badge': 'Sample data',
    'sample.note': 'Synthetic values for testing the interface. Not for operational decisions.',
    'status.updated': '{layers}: updated {time}',
    'status.allLayers': 'All layers',
    'nav.layers': 'Layers',
    'nav.alerts': 'Alerts',
    'nav.about': 'About this prototype',
    'nav.language': 'Passer en français',
    'nav.close': 'Close',
    'basemap.title': 'Basemap',
    'basemap.satellite': 'Satellite',
    'basemap.plain': 'Plain',
    'dates.label': 'Forecast date',
    'dates.today': 'Today',
    'dates.day': 'Day +{n}',
    'legend.noData': 'No data',
    'legend.source': 'Pixel source',
    'type.OBS': 'Observed',
    'type.MOD': 'Modelled',
    'type.INT': 'Interpolated',
    'type.KRI': 'Kriged',
    'type.OBS.info': 'Measured by satellite on this date.',
    'type.MOD.info': 'Forecast from the prediction model.',
    'type.INT.info': 'Filled in from nearby observed pixels.',
    'type.KRI.info': 'Filled in by kriging where gaps are large.',
    'zones.title': 'Zones',
    'zones.hint': 'Select a zone for pixel-by-pixel detail.',
    'zone.all': 'All zones',
    'zone.select': 'Select area',
    'zone.selectOn': 'Drag on the map to select pixels',
    'zone.pixelsArea': '{n} pixels, {area} km²',
    'zone.lowest': 'Lowest',
    'zone.average': 'Average',
    'zone.highest': 'Highest',
    'zone.share': 'Share of pixels by class',
    'zone.empty': 'No pixels match the selected pixel sources.',
    'trend.title': '{layer} trend',
    'trend.pixels': '{n} pixels selected',
    'trend.empty': 'No pixels in that selection. Drag a larger area.',
    'trend.avg': 'Ø {value}',
    'closures.title': 'Shellfish closures',
    'closures.species': 'Species',
    'closures.severity': 'HAB severity',
    'closures.open': 'Open',
    'closures.closed': 'Closed',
    'closures.pick': 'Select a zone to see its shellfish status.',
    'closures.count': '{closed} of {total} closed',
    'closures.none': 'No shellfish species are tracked in this zone.',
    'closures.note': 'Sample data. Real closures come from the regulator.',
    'alerts.title': 'Alerts',
    'alerts.level.very_high': 'Very high',
    'alerts.level.high': 'High',
    'alerts.msg': 'The probability of a harmful algal bloom is {level} from {date}. Peak {peak} on {peakDate}.',
    'alerts.action': 'Consider harvesting early and reducing feeding.',
    'alerts.view': 'View zone',
    'alerts.none': 'No alerts for the next 3 days.',
    'alerts.quiet': 'No alert for: {zones}.',
    'alerts.sample': 'Sample alerts, worked out from the sample HABtrail layer.',
    'about.title': 'About this prototype',
    'about.lead': 'This shows how a HABTRAIL-style forecast dashboard could work for Halifax Harbour. The interface is real. The numbers are not: every value on the map is synthetic until a data pipeline replaces the files in the data folder.',
    'about.real.title': 'What is real',
    'about.real.body': 'The coastline, the 300 m pixel grid, the layout and the behaviour. The six zones are hand-drawn for this prototype and are not an official scheme.',
    'about.sample.title': 'What is sample',
    'about.sample.body': 'All layer values, shellfish closures and alerts. Colour thresholds are placeholders to be set with domain input.',
    'about.types.title': 'Pixel sources',
    'about.sources.title': 'Where real data could come from',
    'about.src.habtrail': 'A trained model, plus bloom or toxin observations for Nova Scotia.',
    'about.src.satellite': 'Satellite ocean colour or open ocean data. To be confirmed in the data audit.',
    'about.src.insitu': 'In-situ sensors from open ocean data partners. To be confirmed in the data audit.',
    'about.src.closures': 'Regulator closure notices. Source to be confirmed.',
    'about.credits.title': 'Credits',
    'about.credits.body': 'Coastline: GSHHG. Map engine: MapLibre GL JS. Satellite imagery: Esri. Font: Poppins.',
    'error.load': 'Could not load the data files. Check your connection and reload the page.',
    'error.reload': 'Reload',
  },
  fr: {
    'brand.tag': 'Prototype du port de Halifax',
    'map.label': 'Carte du port de Halifax avec pixels de prévision',
    'sample.badge': "Données d'exemple",
    'sample.note': "Valeurs synthétiques pour tester l'interface. À ne pas utiliser pour des décisions opérationnelles.",
    'status.updated': '{layers} : mis à jour {time}',
    'status.allLayers': 'Toutes les couches',
    'nav.layers': 'Couches',
    'nav.alerts': 'Alertes',
    'nav.about': 'À propos de ce prototype',
    'nav.language': 'Switch to English',
    'nav.close': 'Fermer',
    'basemap.title': 'Fond de carte',
    'basemap.satellite': 'Satellite',
    'basemap.plain': 'Simple',
    'dates.label': 'Date de prévision',
    'dates.today': "Aujourd'hui",
    'dates.day': 'Jour +{n}',
    'legend.noData': 'Aucune donnée',
    'legend.source': 'Source des pixels',
    'type.OBS': 'Observé',
    'type.MOD': 'Modélisé',
    'type.INT': 'Interpolé',
    'type.KRI': 'Krigé',
    'type.OBS.info': 'Mesuré par satellite à cette date.',
    'type.MOD.info': 'Prévision du modèle.',
    'type.INT.info': 'Estimé à partir de pixels observés voisins.',
    'type.KRI.info': 'Estimé par krigeage là où les lacunes sont grandes.',
    'zones.title': 'Zones',
    'zones.hint': 'Choisissez une zone pour voir le détail pixel par pixel.',
    'zone.all': 'Toutes les zones',
    'zone.select': 'Sélectionner une région',
    'zone.selectOn': 'Faites glisser sur la carte pour choisir des pixels',
    'zone.pixelsArea': '{n} pixels, {area} km²',
    'zone.lowest': 'Minimum',
    'zone.average': 'Moyenne',
    'zone.highest': 'Maximum',
    'zone.share': 'Part des pixels par classe',
    'zone.empty': 'Aucun pixel ne correspond aux sources choisies.',
    'trend.title': 'Tendance : {layer}',
    'trend.pixels': '{n} pixels sélectionnés',
    'trend.empty': 'Aucun pixel dans cette sélection. Tracez une région plus grande.',
    'trend.avg': 'Ø {value}',
    'closures.title': 'Fermetures de mollusques',
    'closures.species': 'Espèce',
    'closures.severity': 'Gravité des PAN',
    'closures.open': 'Ouverte',
    'closures.closed': 'Fermée',
    'closures.pick': "Choisissez une zone pour voir l'état de ses mollusques.",
    'closures.count': '{closed} sur {total} fermées',
    'closures.none': "Aucune espèce de mollusque n'est suivie dans cette zone.",
    'closures.note': "Données d'exemple. Les vraies fermetures viennent de l'autorité réglementaire.",
    'alerts.title': 'Alertes',
    'alerts.level.very_high': 'Très élevée',
    'alerts.level.high': 'Élevée',
    'alerts.msg': "La probabilité de prolifération d'algues nuisibles est {level} à partir du {date}. Pic de {peak} le {peakDate}.",
    'alerts.action': "Envisagez de récolter plus tôt et de réduire l'alimentation.",
    'alerts.view': 'Voir la zone',
    'alerts.none': 'Aucune alerte pour les 3 prochains jours.',
    'alerts.quiet': 'Aucune alerte pour : {zones}.',
    'alerts.sample': "Alertes d'exemple, calculées à partir de la couche HABtrail d'exemple.",
    'about.title': 'À propos de ce prototype',
    'about.lead': "Voici comment un tableau de bord de prévision de type HABTRAIL pourrait fonctionner pour le port de Halifax. L'interface est réelle. Les chiffres ne le sont pas : toutes les valeurs de la carte sont synthétiques tant qu'un pipeline de données ne remplace pas les fichiers du dossier data.",
    'about.real.title': 'Ce qui est réel',
    'about.real.body': "Le trait de côte, la grille de pixels de 300 m, la mise en page et le comportement. Les six zones sont tracées à la main pour ce prototype et ne forment pas un découpage officiel.",
    'about.sample.title': "Ce qui est un exemple",
    'about.sample.body': "Toutes les valeurs des couches, les fermetures de mollusques et les alertes. Les seuils de couleur sont provisoires et seront fixés avec l'avis d'experts.",
    'about.types.title': 'Sources des pixels',
    'about.sources.title': "D'où pourraient venir les vraies données",
    'about.src.habtrail': "Un modèle entraîné, avec des observations de proliférations ou de toxines pour la Nouvelle-Écosse.",
    'about.src.satellite': "Couleur de l'océan par satellite ou données océaniques ouvertes. À confirmer lors de l'audit des données.",
    'about.src.insitu': "Capteurs in situ de partenaires de données océaniques ouvertes. À confirmer lors de l'audit des données.",
    'about.src.closures': "Avis de fermeture de l'autorité réglementaire. Source à confirmer.",
    'about.credits.title': 'Crédits',
    'about.credits.body': "Trait de côte : GSHHG. Moteur cartographique : MapLibre GL JS. Imagerie satellite : Esri. Police : Poppins.",
    'error.load': 'Impossible de charger les fichiers de données. Vérifiez votre connexion et rechargez la page.',
    'error.reload': 'Recharger',
  },
};

let lang = 'en';
export const getLang = () => lang;
export function setLang(next) {
  lang = next === 'fr' ? 'fr' : 'en';
  document.documentElement.lang = lang;
}

export function t(key, vars) {
  let s = DICT[lang][key] ?? DICT.en[key] ?? key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
  return s;
}

/** pick(obj, 'label') -> obj.label_fr or obj.label_en depending on language */
export const pick = (obj, base) => obj[`${base}_${lang}`] ?? obj[`${base}_en`] ?? '';

const locale = () => (lang === 'fr' ? 'fr-CA' : 'en-CA');

export function fmtDate(iso, opts = { month: 'short', day: 'numeric' }) {
  return new Intl.DateTimeFormat(locale(), { ...opts, timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`));
}

export function fmtDateTime(isoWithOffset) {
  return new Intl.DateTimeFormat(locale(), {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    timeZone: 'America/Halifax', timeZoneName: 'short',
  }).format(new Date(isoWithOffset));
}

export function fmtNumber(v, decimals = 0) {
  return new Intl.NumberFormat(locale(), { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(v);
}

/** 36 + layer(unit "%") -> "36 %" ; 8.89 + "mg/m³" -> "8.89 mg/m³" ; no unit -> "54" */
export function fmtValue(layer, v) {
  if (v == null) return '–';
  const n = fmtNumber(v, layer.decimals ?? 0);
  return layer.unit ? `${n} ${layer.unit}` : n;
}
