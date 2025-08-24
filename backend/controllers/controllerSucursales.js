/**
 * controllerSucursales.js – CRUD de sucursales
 * Hoja: env_().SH_SUCURSALES (por defecto "sucursales")
 * Columnas tolerantes a encabezados:
 *  id | nombreSucursal | fechaInauguracion (alias: fechainauguracion/fechalnauguracion/fechainaguracion) |
 *  telefono | direccion | correoElectronico (alias: correo/email) | estado
 */
var SHEET_SUCURSALES = (typeof env_ === 'function' && env_().SH_SUCURSALES) || 'sucursales';

/* ========== Helpers base ========== */
function _getSheetSuc_() {
  if (typeof obtenerSheet === 'function') return obtenerSheet(SHEET_SUCURSALES);
  return SpreadsheetApp.getActive().getSheetByName(SHEET_SUCURSALES);
}
function _getValues_(sh) {
  return sh.getDataRange().getValues();
}
function _normKey_(s) {
  s = String(s || "").trim();
  var k = s.replace(/\s+/g, "").toLowerCase();
  if (k === "id") return "id";
  if (k === "nombresucursal" || k === "sucursal") return "nombreSucursal";
  if (k === "fechainauguracion" || k === "fechalnauguracion" || k === "fechainaguracion") return "fechaInauguracion";
  if (k === "telefono" || k === "tel") return "telefono";
  if (k === "direccion" || k === "dirección") return "direccion";
  if (k === "correoelectronico" || k === "correo" || k === "email") return "correoElectronico";
  if (k === "estado") return "estado";
  return s; // devuelve original si no se reconoce
}
function _headers_(sh) {
  var values = _getValues_(sh);
  if (!values || values.length === 0) return [];
  return values[0].map(function (h) { return String(h || ""); });
}
function _indexMap_(headers) {
  var m = {};
  for (var i = 0; i < headers.length; i++) {
    m[_normKey_(headers[i])] = i;
  }
  return m;
}
function _nextId_(rows, idx) {
  var max = 0;
  for (var i = 0; i < rows.length; i++) {
    var v = Number(rows[i][idx]);
    if (!isNaN(v) && v > max) max = v;
  }
  return (max + 1);
}
function _safeJSON_(x) {
  try { return (typeof x === "string") ? JSON.parse(x) : x; } catch (e) { return x; }
}

/* ========== Listar ========== */
function listarSucursales() {
  try {
    var sh = _getSheetSuc_();
    var values = _getValues_(sh);
    if (!values || values.length < 2) return JSON.stringify([]);
    var headers = _headers_(sh);
    var map = _indexMap_(headers);
    var out = [];
    for (var r = 1; r < values.length; r++) {
      var row = values[r];
      if (row.join("") === "") continue; // fila vacía
      out.push({
        id: row[map.id],
        nombreSucursal: row[map.nombreSucursal],
        fechaInauguracion: row[map.fechaInauguracion],
        telefono: row[map.telefono],
        direccion: row[map.direccion],
        correoElectronico: row[map.correoElectronico],
        estado: row[map.estado],
      });
    }
    return JSON.stringify(out);
  } catch (e) {
    return JSON.stringify({ ok: false, message: "Error al listar sucursales: " + e });
  }
}
function listarSucursalesActivas() {
  var raw = listarSucursales();
  try {
    var arr = (typeof raw === "string") ? JSON.parse(raw) : raw;
    if (!Array.isArray(arr)) return [];
    return arr.filter(function (x) {
      return String(x.estado || "").toLowerCase().indexOf("activo") !== -1;
    });
  } catch (e) {
    return raw;
  }
}

/* =========== Crear =========== */
function crearSucursal(sucursal) {
  try {
    var sh = _getSheetSuc_();
    var headers = _headers_(sh);
    if (!headers.length) throw new Error("La hoja de sucursales no tiene encabezados");
    var map = _indexMap_(headers);
    var data = _getValues_(sh);
    var body = data.slice(1);
    var obj = _safeJSON_(sucursal) || {};

    // calcular id si no viene
    if (!obj.id) {
      obj.id = _nextId_(body, map.id);
    }
    if (!obj.estado) obj.estado = "Activo";

    // preparar fila en el orden de headers
    var row = new Array(headers.length);
    for (var c = 0; c < headers.length; c++) {
      var key = _normKey_(headers[c]);
      row[c] = (obj[key] != null ? obj[key] : "");
    }
    sh.appendRow(row);
    return JSON.stringify({ ok: true, id: obj.id });
  } catch (e) {
    return JSON.stringify({ ok: false, message: "No se pudo crear: " + e });
  }
}

/* ========== Actualizar ========== */
function actualizarSucursal(sucursal) {
  try {
    var sh = _getSheetSuc_();
    var headers = _headers_(sh);
    var map = _indexMap_(headers);
    var obj = _safeJSON_(sucursal) || {};
    if (!obj || !obj.id) return JSON.stringify({ ok: false, message: "Falta id" });

    var values = _getValues_(sh);
    var targetRow = -1;
    for (var r = 1; r < values.length; r++) {
      if (String(values[r][map.id]) === String(obj.id)) { targetRow = r + 1; break; }
    }
    if (targetRow === -1) return JSON.stringify({ ok: false, message: "Sucursal no encontrada" });

    for (var k in obj) {
      if (!obj.hasOwnProperty(k)) continue;
      var nk = _normKey_(k);
      var col = map[nk];
      if (col == null || col < 0) continue;
      sh.getRange(targetRow, col + 1).setValue(obj[k]);
    }
    return JSON.stringify({ ok: true });
  } catch (e) {
    return JSON.stringify({ ok: false, message: "No se pudo actualizar: " + e });
  }
}

/* ========== Eliminar ========== */
function eliminarSucursal(id) {
  try {
    var sh = _getSheetSuc_();
    var headers = _headers_(sh);
    var map = _indexMap_(headers);
    var values = _getValues_(sh);
    var targetRow = -1;
    for (var r = 1; r < values.length; r++) {
      if (String(values[r][map.id]) === String(id)) { targetRow = r + 1; break; }
    }
    if (targetRow === -1) return JSON.stringify({ ok: false, message: "Sucursal no encontrada" });
    sh.deleteRow(targetRow);
    return JSON.stringify({ ok: true });
  } catch (e) {
    return JSON.stringify({ ok: false, message: "No se pudo eliminar: " + e });
  }
}

