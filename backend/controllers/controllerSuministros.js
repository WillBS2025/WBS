/************************************************************
 * CONTROLLER SUMINISTROS – Apps Script (GS/JS)
 * Lee nombres de hoja y Spreadsheet ID desde env_()
 * Devuelve JSON siempre. Maneja errores con {ok:false,message}
 ************************************************************/

// ====== CONFIG DESDE env_() ======
var SHEET_SUMINISTROS         = (typeof env_ === 'function' && env_().SH_SUMINISTROS)           || 'Suministros';
var SHEET_COMPRAS_SUMINISTROS = (typeof env_ === 'function' && env_().SH_COMPRAS_SUMINISTROS)   || 'ComprasSuministros';
var DB_ID = (typeof env_ === 'function' && env_().ID_DATABASE) || '';

// ====== HELPERS ======
function getDB_() {
  if (!DB_ID) throw new Error('ID_DATABASE vacío en env.js');
  try {
    return SpreadsheetApp.openById(DB_ID);
  } catch (e) {
    throw new Error('No se pudo abrir Spreadsheet con ID ' + DB_ID + '. ' + e.message);
  }
}
function getSheet_(name) {
  var ss = getDB_();
  var sh = ss.getSheetByName(name);
  if (!sh) throw new Error('No existe la hoja "' + name + '" en el archivo ' + ss.getName());
  return sh;
}
function headersIndex_(headers, name) {
  var i = headers.indexOf(name);
  return (i >= 0 ? i : -1);
}

/** === PATCH FECHAS: helpers seguros de zona horaria === */
function _scriptTZ_() {
  try {
    return (Session && Session.getScriptTimeZone && Session.getScriptTimeZone()) || 'America/Tegucigalpa';
  } catch (e) {
    return 'America/Tegucigalpa';
  }
}
/** Si ya es 'YYYY-MM-DD' devuelve tal cual; si es Date u otro, formatea en TZ del script. */
function toYMD_(dateOrString, tz) {
  if (!dateOrString) return '';
  if (typeof dateOrString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateOrString)) return dateOrString;
  var d = (dateOrString instanceof Date) ? dateOrString : new Date(dateOrString);
  if (isNaN(d)) return String(dateOrString);
  var zone = tz || _scriptTZ_();
  return Utilities.formatDate(d, zone, 'yyyy-MM-dd');
}
/** Parse seguro: 'YYYY-MM-DD' => Date local (sin shift UTC). */
function parseYMD_(val) {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val)) return new Date(val.getFullYear(), val.getMonth(), val.getDate());
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
    var p = val.split('-'); return new Date(+p[0], +p[1]-1, +p[2]);
  }
  var d = new Date(val);
  return isNaN(d) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function todayYMD_() {
  return Utilities.formatDate(new Date(), _scriptTZ_(), 'yyyy-MM-dd');
}
function diffDaysInclusive_(a, b) {
  if (!a || !b) return null;
  var da = parseYMD_(a), db = parseYMD_(b);
  if (!da || !db) return null;
  return Math.floor((db - da) / 86400000) + 1;
}

/************************************************************
 * LISTAR SUMINISTROS (CATÁLOGO)
 * Retorna: JSON.stringify(Array<Object>) o {ok:false,message}
 ************************************************************/
function listarSuministros() {
  try {
    var sh = getSheet_(SHEET_SUMINISTROS);
    var values = sh.getDataRange().getValues();
    if (!values || values.length < 2) return JSON.stringify([]); // sin datos

    var headers = values[0].map(function (x) { return String(x); });
    var iId     = headersIndex_(headers, 'idSuministro');
    var iNombre = headersIndex_(headers, 'nombreSuministro');
    var iUni    = headersIndex_(headers, 'unidadBase');
    var iCat    = headersIndex_(headers, 'categoria');
    var iMin    = headersIndex_(headers, 'minStock');
    var iEst    = headersIndex_(headers, 'estado');
    var iNotas  = headersIndex_(headers, 'notas');

    var out = [];
    for (var r = 1; r < values.length; r++) {
      var row = values[r];
      if (String(row[iId]).trim() === '') continue;
      out.push({
        idSuministro: row[iId],
        nombreSuministro: row[iNombre],
        unidadBase: row[iUni],
        categoria: row[iCat],
        minStock: row[iMin],
        estado: row[iEst],
        notas: row[iNotas]
      });
    }
    return JSON.stringify(out);
  } catch (e) {
    return JSON.stringify({ ok: false, message: e.message });
  }
}

/************************************************************
 * LISTAR COMPRAS (LOTES)
 * Retorna: JSON.stringify(Array<Object>) o {ok:false,message}
 ************************************************************/
function listarComprasSuministros() {
  try {
    var sh = getSheet_(SHEET_COMPRAS_SUMINISTROS);
    var values = sh.getDataRange().getValues();
    if (!values || values.length < 2) return JSON.stringify([]);

    var headers = values[0].map(function (x) { return String(x); });
    var iIdCompra   = headersIndex_(headers, 'idCompra');
    var iIdSum      = headersIndex_(headers, 'idSuministro');
    var iSucursal   = headersIndex_(headers, 'sucursal');
    var iFechaComp  = headersIndex_(headers, 'fechaCompra');
    var iCant       = headersIndex_(headers, 'cantidadUnidades');
    var iCosto      = headersIndex_(headers, 'costoTotal');
    var iIni        = headersIndex_(headers, 'fechaInicioUso');
    var iFin        = headersIndex_(headers, 'fechaFinUso');
    var iObs        = headersIndex_(headers, 'observaciones');

    var out = [];
    for (var r = 1; r < values.length; r++) {
      var row = values[r];
      if (String(row[iIdCompra]).trim() === '') continue;
      var inicio = row[iIni] ? toYMD_(row[iIni]) : '';
      var fin    = row[iFin] ? toYMD_(row[iFin]) : '';
      var dur    = diffDaysInclusive_(inicio, fin);
      var cons   = (dur && Number(row[iCant])) ? (Number(row[iCant]) / dur) : null;

      out.push({
        idCompra: row[iIdCompra],
        idSuministro: row[iIdSum],
        sucursal: row[iSucursal],
        fechaCompra: toYMD_(row[iFechaComp]),
        cantidadUnidades: row[iCant],
        costoTotal: row[iCosto],
        fechaInicioUso: inicio,
        fechaFinUso: fin,
        observaciones: row[iObs],
        duracionDias: dur,
        consumoDiario: cons,
        estado: (inicio && !fin) ? 'EN_USO' : (inicio && fin) ? 'COMPLETADO' : 'NUEVO'
      });
    }
    return JSON.stringify(out);
  } catch (e) {
    return JSON.stringify({ ok: false, message: e.message });
  }
}

/************************************************************
 * CREAR COMPRA (LOTE)
 * payloadStr: JSON con:
 * { idSuministro, sucursal, fechaCompra, cantidadUnidades, costoTotal,
 *   fechaInicioUso?, observaciones? }
 ************************************************************/
function crearCompraSuministro(payloadStr) {
  try {
    var p = (typeof payloadStr === 'string') ? JSON.parse(payloadStr) : payloadStr;
    if (!p) throw new Error('Payload vacío');
    if (!p.idSuministro) throw new Error('idSuministro requerido');
    if (!p.sucursal) throw new Error('sucursal requerida');
    if (!p.fechaCompra) throw new Error('fechaCompra requerida');

    var sh = getSheet_(SHEET_COMPRAS_SUMINISTROS);

    // BUSCAR PRÓXIMO ID (columna A: idCompra)
    var lastRow = sh.getLastRow();
    var nextId = 1;
    if (lastRow >= 2) {
      var idCol = sh.getRange(2, 1, lastRow - 1, 1).getValues(); // col A
      for (var i = 0; i < idCol.length; i++) {
        var v = Number(idCol[i][0]);
        if (isFinite(v) && v >= nextId) nextId = v + 1;
      }
    }

    // === NORMALIZACIÓN FECHAS SIN SHIFT ===
    var fCompra = (typeof p.fechaCompra === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.fechaCompra))
      ? p.fechaCompra : toYMD_(p.fechaCompra);
    var fInicio = (p.fechaInicioUso && typeof p.fechaInicioUso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.fechaInicioUso))
      ? p.fechaInicioUso : (p.fechaInicioUso ? toYMD_(p.fechaInicioUso) : '');

    var row = [
      nextId,
      Number(p.idSuministro),
      p.sucursal,
      fCompra,
      Number(p.cantidadUnidades || 0),
      Number(p.costoTotal || 0),
      fInicio,
      '', // fechaFinUso (vacío al crear)
      p.observaciones || ''
    ];
    sh.appendRow(row);
    return JSON.stringify({ ok: true, idCompra: nextId });
  } catch (e) {
    return JSON.stringify({ ok: false, message: e.message });
  }
}

/************************************************************
 * MARCAR COMPRA COMO AGOTADA
 * idCompra: número/texto de la col A
 ************************************************************/
function marcarCompraAgotada(idCompra) {
  try {
    if (!idCompra && idCompra !== 0) throw new Error('idCompra requerido');

    var sh = getSheet_(SHEET_COMPRAS_SUMINISTROS);
    var lastRow = sh.getLastRow();
    if (lastRow < 2) throw new Error('No hay compras registradas');

    var range = sh.getRange(2, 1, lastRow - 1, 9); // A2:I
    var data = range.getValues();
    var today = todayYMD_(); // *** usar TZ del script ***
    var found = false;

    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      var id = String(row[0]);
      if (String(idCompra) === id) {
        // Columna H (8) es fechaFinUso → índice 7
        row[7] = today;
        data[i] = row;
        found = true;
        break;
      }
    }
    if (!found) throw new Error('No se encontró idCompra ' + idCompra);

    range.setValues(data);
    return JSON.stringify({ ok: true, fechaFinUso: today });
  } catch (e) {
    return JSON.stringify({ ok: false, message: e.message });
  }
}

/****************** NUEVO: EDITAR COMPRA ******************/
function actualizarCompraSuministro(payloadStr) {
  try {
    var p = (typeof payloadStr === 'string') ? JSON.parse(payloadStr) : payloadStr;
    if (!p || (!p.idCompra && p.idCompra !== 0)) throw new Error('idCompra requerido');

    var sh = getSheet_(SHEET_COMPRAS_SUMINISTROS);
    var last = sh.getLastRow();
    if (last < 2) throw new Error('No hay compras registradas');

    var range = sh.getRange(2, 1, last - 1, 9); // A..I
    var data = range.getValues();
    var rowIndex = -1;

    for (var i = 0; i < data.length; i++) {
      if (String(data[i][0]) === String(p.idCompra)) { rowIndex = i; break; }
    }
    if (rowIndex < 0) throw new Error('No se encontró idCompra ' + p.idCompra);

    // === NORMALIZACIÓN FECHAS SIN SHIFT ===
    var fCompra = (typeof p.fechaCompra === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.fechaCompra))
      ? p.fechaCompra : toYMD_(p.fechaCompra);
    var fInicio = (p.fechaInicioUso && typeof p.fechaInicioUso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.fechaInicioUso))
      ? p.fechaInicioUso : (p.fechaInicioUso ? toYMD_(p.fechaInicioUso) : '');
    var fFin = (p.fechaFinUso && typeof p.fechaFinUso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.fechaFinUso))
      ? p.fechaFinUso : (p.fechaFinUso ? toYMD_(p.fechaFinUso) : '');

    var newRow = [
      Number(p.idCompra),
      Number(p.idSuministro),
      p.sucursal || '',
      fCompra,
      Number(p.cantidadUnidades || 0),
      Number(p.costoTotal || 0),
      fInicio,
      fFin,
      p.observaciones || ''
    ];

    data[rowIndex] = newRow;
    range.setValues(data);
    return JSON.stringify({ ok: true });
  } catch (e) {
    return JSON.stringify({ ok: false, message: e.message });
  }
}

/************** NUEVO: INICIAR USO (fechaInicioUso = hoy) **************/
function iniciarUsoCompra(idCompra, fechaYMD) {
  try {
    if (!idCompra && idCompra !== 0) throw new Error('idCompra requerido');
    var sh = getSheet_(SHEET_COMPRAS_SUMINISTROS);
    var last = sh.getLastRow();
    if (last < 2) throw new Error('No hay compras registradas');

    var range = sh.getRange(2, 1, last - 1, 9); // A..I
    var data = range.getValues();
    var found = false;

    // Si viene 'YYYY-MM-DD', úsala tal cual; si no, hoy (TZ script)
    var fecha = (typeof fechaYMD === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fechaYMD))
      ? fechaYMD
      : todayYMD_();

    for (var i = 0; i < data.length; i++) {
      if (String(data[i][0]) === String(idCompra)) {
        data[i][6] = fecha; // G = fechaInicioUso
        found = true; break;
      }
    }
    if (!found) throw new Error('No se encontró idCompra ' + idCompra);

    range.setValues(data);
    return JSON.stringify({ ok: true, fechaInicioUso: fecha });
  } catch (e) {
    return JSON.stringify({ ok: false, message: e.message });
  }
}

/****************** NUEVO: REABRIR (limpia fechaFinUso) ******************/
function reabrirCompra(idCompra) {
  try {
    if (!idCompra && idCompra !== 0) throw new Error('idCompra requerido');
    var sh = getSheet_(SHEET_COMPRAS_SUMINISTROS);
    var last = sh.getLastRow();
    if (last < 2) throw new Error('No hay compras registradas');

    var range = sh.getRange(2, 1, last - 1, 9); // A..I
    var data = range.getValues();
    var found = false;

    for (var i = 0; i < data.length; i++) {
      if (String(data[i][0]) === String(idCompra)) {
        data[i][7] = ''; // H = fechaFinUso
        found = true; break;
      }
    }
    if (!found) throw new Error('No se encontró idCompra ' + idCompra);

    range.setValues(data);
    return JSON.stringify({ ok: true });
  } catch (e) {
    return JSON.stringify({ ok: false, message: e.message });
  }
}

/****************** NUEVO: CREAR SUMINISTRO (CATÁLOGO) ******************/
/*
 * payloadStr: JSON con:
 * { nombreSuministro, unidadBase?, categoria?, minStock?, notas?, estado? }
 * - idSuministro se asigna automáticamente (siguiente correlativo).
 * - estado por defecto: "Activo".
 * Devuelve: {ok:true, idSuministro} o {ok:false, message}
 */
function crearSuministro(payloadStr) {
  try {
    var p = (typeof payloadStr === 'string') ? JSON.parse(payloadStr) : payloadStr;
    if (!p || !p.nombreSuministro) throw new Error('nombreSuministro requerido');

    var sh = getSheet_(SHEET_SUMINISTROS);
    var lastRow = sh.getLastRow();

    // Siguiente ID en col A (idSuministro)
    var nextId = 1;
    if (lastRow >= 2) {
      var idCol = sh.getRange(2, 1, lastRow - 1, 1).getValues(); // A
      for (var i = 0; i < idCol.length; i++) {
        var v = Number(idCol[i][0]);
        if (isFinite(v) && v >= nextId) nextId = v + 1;
      }
    }

    var row = [
      nextId,
      String(p.nombreSuministro),
      p.unidadBase || '',
      p.categoria || '',
      Number(p.minStock || 0),
      p.estado || 'Activo',
      p.notas || ''
    ]; // Columnas esperadas: A..G

    sh.appendRow(row);
    return JSON.stringify({ ok: true, idSuministro: nextId });
  } catch (e) {
    return JSON.stringify({ ok:false, message: e.message });
  }
}

/****************** NUEVO: ACTUALIZAR SUMINISTRO (CATÁLOGO) ******************/
function actualizarSuministro(payloadStr) {
  try {
    // ===== PARSEO DE ENTRADA =====
    var p = (typeof payloadStr === 'string') ? JSON.parse(payloadStr) : payloadStr;
    if (!p || p.idSuministro == null || String(p.idSuministro).trim() === '') {
      return JSON.stringify({ ok:false, message:'idSuministro requerido' });
    }

    // ===== OBTENER HOJA Y DATOS =====
    var sh = getSheet_(SHEET_SUMINISTROS);
    var values = sh.getDataRange().getValues();
    if (!values || values.length < 2) {
      return JSON.stringify({ ok:false, message:'No hay datos en la hoja' });
    }

    // ===== MAPEO DE ENCABEZADOS (EXACTOS SEGÚN TU HOJA) =====
    var headers = values[0].map(function(x){ return String(x); });
    var iId     = headersIndex_(headers, 'idSuministro');
    var iNombre = headersIndex_(headers, 'nombreSuministro');
    var iUni    = headersIndex_(headers, 'unidadBase');
    var iCat    = headersIndex_(headers, 'categoria');
    var iMin    = headersIndex_(headers, 'minStock');
    var iEst    = headersIndex_(headers, 'estado');
    var iNotas  = headersIndex_(headers, 'notas');

    if (iId < 0) return JSON.stringify({ ok:false, message:'No se encontró la columna "idSuministro"' });

    // ===== BUSCAR FILA POR ID =====
    var searchId = String(p.idSuministro).trim();
    var targetRow = -1; // ÍNDICE 0-BASED EN "values"
    for (var r = 1; r < values.length; r++) {
      if (String(values[r][iId]).trim() === searchId) { targetRow = r; break; }
    }
    if (targetRow < 0) return JSON.stringify({ ok:false, message:'No existe el idSuministro: ' + searchId });

    // ===== PREPARAR NUEVOS VALORES SIN ROMPER OTRAS COLUMNAS =====
    var rowArr = values[targetRow].slice(); // COPIA DE LA FILA
    if (iNombre >= 0 && p.hasOwnProperty('nombreSuministro')) rowArr[iNombre] = p.nombreSuministro;
    if (iUni    >= 0 && p.hasOwnProperty('unidadBase'))       rowArr[iUni]    = p.unidadBase;
    if (iCat    >= 0 && p.hasOwnProperty('categoria'))        rowArr[iCat]    = p.categoria;

    if (iMin >= 0 && p.hasOwnProperty('minStock')) {
      var n = Number(p.minStock);
      rowArr[iMin] = isFinite(n) ? n : rowArr[iMin]; // SOLO SI ES NÚMERO VÁLIDO
    }

    if (iEst   >= 0 && p.hasOwnProperty('estado')) rowArr[iEst]   = p.estado;
    if (iNotas >= 0 && p.hasOwnProperty('notas'))  rowArr[iNotas] = p.notas;

    // ===== ESCRIBIR LA FILA COMPLETA (UNA SOLA OPERACIÓN) =====
    sh.getRange(targetRow + 1, 1, 1, values[0].length).setValues([rowArr]);

    // ===== OPCIONAL: TIMESTAMP SI EXISTE COLUMNA "actualizadoEn" O "updatedAt" =====
    var iUpd = headersIndex_(headers, 'actualizadoEn');
    if (iUpd < 0) iUpd = headersIndex_(headers, 'updatedAt');
    if (iUpd >= 0) {
      sh.getRange(targetRow + 1, iUpd + 1).setValue(new Date());
    }

    return JSON.stringify({ ok:true });
  } catch (e) {
    return JSON.stringify({ ok:false, message:'Error en actualizarSuministro: ' + (e && e.message ? e.message : String(e)) });
  }
}
