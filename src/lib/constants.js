export const TODOS_LOS_MODULOS = [
  "CRM-uRoutes-ClientPortal",
  "TMS-uRoutes-Delivery",
  "TMS-uRoutes-DocAudit",
  "TMS-uRoutes-MobilityApp",
  "TMS-uRoutes-RouterEngine",
  "WMS-uRoutes-ControlTower",
  "WMS-uRoutes-CyclicCounts",
  "WMS-uRoutes-SmartPutaway3D",
  "WMS-uRoutes-StoreInventory",
  "ConteosTransferenciasApp",
  "MobilityApp",
];

/** Etiquetas exactas para UI (checkboxes, tablas); los IDs en Firestore siguen siendo los técnicos. */
export const ETIQUETA_MODULO = {
  MobilityApp: "Admin - Administración Web - Web",
  "TMS-uRoutes-DocAudit": "Admin - Auditoría de Documentos - Web",
  "CRM-uRoutes-ClientPortal": "CRM - Cliente Portal de Entregas - Web",
  "TMS-uRoutes-MobilityApp": "TMS - Mobility Entregas - App",
  "TMS-uRoutes-RouterEngine": "TMS - Motor de Rutas - Web",
  "TMS-uRoutes-Delivery": "TMS - Portal de Entregas - Web",
  "WMS-uRoutes-StoreInventory": "WMS - Mobility Inventario en Tienda - App",
  ConteosTransferenciasApp: "WMS - Mobility Conteos Transferencias - App",
  "WMS-uRoutes-CyclicCounts": "WMS - Cliente Portal de Almacén - Web",
  "WMS-uRoutes-SmartPutaway3D": "WMS - Putaway Inteligente 3D - Web",
  "WMS-uRoutes-ControlTower": "WMS - Torre de Control - Web",
};

export function etiquetaModulo(moduloId) {
  if (moduloId == null || moduloId === "") return "";
  return ETIQUETA_MODULO[moduloId] ?? moduloId;
}
