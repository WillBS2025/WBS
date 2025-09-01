/**
 * @fileoverview Archivo principal del servidor para la aplicación web de Apps Script.
 * Contiene las funciones que manejan las peticiones GET y los archivos HTML.
 */

/**
 * Función principal que se ejecuta cuando la aplicación recibe una petición HTTP GET.
 * Es el punto de entrada para mostrar la interfaz de usuario.
 * @return {GoogleAppsScript.HTML.HtmlOutput} Un objeto de salida HTML que representa la página web.
 */
const doGet = () => {
  // Crea un objeto de plantilla HTML a partir del archivo "frontend/index.html".
  // Este archivo contendrá el código HTML de nuestra aplicación React.
  return HtmlService.createTemplateFromFile("frontend/index")
    // Evalúa la plantilla para renderizar su contenido.
    .evaluate()
    // Configura las opciones del iframe para permitir que la aplicación se incruste
    // en otros sitios web sin restricciones de seguridad.
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    // Establece el modo de sandbox en "IFRAME", lo que aísla el contenido de la
    // página de cualquier otra parte de la aplicación, mejorando la seguridad.
    .setSandboxMode(HtmlService.SandboxMode.IFRAME)
    // Agrega una meta etiqueta para controlar el viewport del navegador, asegurando
    // que la aplicación se vea correctamente en dispositivos móviles.
    .addMetaTag(
      "viewport",
      'width=device-width,user-scalable=no,initial-scale=1,maximum-scale=1,minimum-scale=1"'
    )
    // Establece el título de la página web que aparecerá en la pestaña del navegador.
    .setTitle("WillitoBarberShop")
};

/**
 * Función auxiliar para incluir el contenido de otros archivos HTML en una plantilla.
 * Por ejemplo, se usa en la plantilla principal (`index.html`) para incluir archivos
 * como CSS o JavaScript.
 * @param {string} ruta La ruta del archivo HTML a incluir, relativa a la carpeta del proyecto.
 * @return {string} El contenido del archivo HTML como una cadena de texto.
 */
const include = (ruta) => {
  // Crea una salida HTML a partir del archivo en la ruta especificada
  // y obtiene su contenido como una cadena de texto.
  return HtmlService.createHtmlOutputFromFile(ruta).getContent();
};

/** ===== Logo Login (rápido + cacheado, con redimensionado) ===== */
const LOGIN_LOGO_IDS = {
  "1x": "105QrdgSXruSKu0Pr8xONzFK9feMuQ6p2", // mismo ID para 1x
  "2x": "105QrdgSXruSKu0Pr8xONzFK9feMuQ6p2"  // y 2x
};

// Helper: genera data URL desde Drive y opcionalmente redimensiona a un ancho dado
function _logoDataUrlFor(fileId, targetWidth) {
  if (!fileId) return "";
  var blob = DriveApp.getFileById(fileId).getBlob();
  var outBlob = blob;

  // Si se indica targetWidth, reducimos tamaño para que el base64 sea chico
  if (targetWidth && targetWidth > 0) {
    try {
      var img = ImagesService.open(blob);
      outBlob = img.resize(targetWidth, 0).getBlob(); // alto proporcional
      outBlob.setContentTypeFromExtension(); // intenta conservar tipo
    } catch (e) {
      // Si por algún motivo falla ImagesService, seguimos con el blob original
      outBlob = blob;
    }
  }

  var mime = outBlob.getContentType() || "image/png";
  var b64 = Utilities.base64Encode(outBlob.getBytes());
  return "data:" + mime + ";base64," + b64;
}

// Lee de Drive, hace base64 y cachea 6 horas (solo si no excede el límite)
function _getLoginLogoData() {
  var cache = CacheService.getScriptCache();
  var key = "login_logo_json_v3"; // bump de versión para evitar cache viejo
  var cached = cache.get(key);
  if (cached) return JSON.parse(cached);

  // Generamos versiones ligeras:
  // - 1x a ~120 px  (para render a 120–135 en Login)
  // - 2x a ~240 px  (retina)
  var src1x = _logoDataUrlFor(LOGIN_LOGO_IDS["1x"] || LOGIN_LOGO_IDS["2x"], 120);
  var src2x = _logoDataUrlFor(LOGIN_LOGO_IDS["2x"], 240);

  var obj = {
    // usamos la 2x como fuente principal (nítido en pantallas retina)
    src: src2x || src1x,
    srcSet: (src1x ? (src1x + " 1x, ") : "") + (src2x ? (src2x + " 2x") : "")
  };

  // Cachea solo si no excede el límite de CacheService (~100 KB por item)
  var payload = JSON.stringify(obj);
  if (payload.length < 95000) {
    cache.put(key, payload, 21600); // 6 h
  } // si no, lo devolvemos sin cachear (pero igual funciona)

  return obj;
}

// API que ya tenías
function getLoginLogo() {
  return _getLoginLogoData();
}

// Inyecta el logo *en línea* al HTML (ultra-rápido)
function getLoginLogoInline() {
  var o = _getLoginLogoData();
  return HtmlService.createHtmlOutput(
    "<script>window.APP_LOGO_LOGIN=" + JSON.stringify(o) + ";</script>"
  ).getContent();
}

