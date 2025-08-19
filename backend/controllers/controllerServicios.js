/**
 * controllerServicios.js – CRUD Servicios
 * Hoja: env_().SH_SERVICIOS (por defecto "servicios")
 * Columnas esperadas (en este orden):
 * id_servicios | nombre_servicio | descripcion | precio | nombre_sucursal | estado
 */

var SHEET_SERVICIOS = (typeof env_ === 'function' && env_().SH_SERVICIOS) || 'servicios';

/** ===== Utilidades base ===== */
function _headersServicios_(sheet){
  return sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
}
function _nextIdServicios_(sheet, headers){
  var idxId = headers.indexOf('id_servicios');
  if (idxId === -1) throw new Error('No se encontró la columna id_servicios en la hoja "servicios".');
  var lastRow = sheet.getLastRow();
  var nextId = 1;
  if (lastRow >= 2){
    var vals = sheet.getRange(2, idxId+1, lastRow-1, 1).getDisplayValues().map(String).filter(Boolean);
    var nums = vals.map(function(v){ var n = parseInt(v,10); return isNaN(n)?0:n; });
    nextId = (nums.length? Math.max.apply(null, nums):0) + 1;
  }
  return nextId;
}

function _toNum_(v){ var n = Number(v); return isNaN(n) ? 0 : n; }

/** ===== LISTAR ===== */
function listarServicios(){
  try{
    var sheet = obtenerSheet(SHEET_SERVICIOS);
    var rows = _read(sheet) || [];
    // Normalizar clave de ID 'id' para el frontend (además de id_servicios)
    var out = rows.map(function(r, i){
      var obj = Object.assign({}, r);
      obj.id = (r.id_servicios != null ? r.id_servicios : (i+1));
      return obj;
    });
    return JSON.stringify(out);
  }catch(err){
    return JSON.stringify({ ok:false, message: 'Error al listar: ' + err });
  }
}

/** ===== CREAR ===== */
function crearServicio(servicio){
  try{
    var sheet = obtenerSheet(SHEET_SERVICIOS);
    var headers = _headersServicios_(sheet);
    var obj = (typeof servicio === 'string') ? JSON.parse(servicio) : (servicio || {});

    // ID autoincremental si no viene
    if (obj.id_servicios == null || String(obj.id_servicios).trim() === ''){
      obj.id_servicios = _nextIdServicios_(sheet, headers);
    }

    // Normalizaciones
    obj.nombre_servicio = (obj.nombre_servicio == null ? '' : String(obj.nombre_servicio));
    obj.descripcion = (obj.descripcion == null ? '' : String(obj.descripcion));
    obj.precio = _toNum_(obj.precio);
    obj.nombre_sucursal = (obj.nombre_sucursal == null ? '' : String(obj.nombre_sucursal));
    obj.estado = (obj.estado == null || String(obj.estado).trim() === '') ? 'Activo' : String(obj.estado).trim();

    // Construir fila en el orden de headers
    var row = headers.map(function(h){ var v = obj[h]; return (v == null ? '' : v); });
    sheet.appendRow(row);

    return JSON.stringify({ ok:true, id: obj.id_servicios });
  }catch(err){
    return JSON.stringify({ ok:false, message: 'Error al crear: ' + err });
  }
}

/** ===== ACTUALIZAR ===== */
function actualizarServicio(servicio){
  try{
    var sheet = obtenerSheet(SHEET_SERVICIOS);
    var headers = _headersServicios_(sheet);
    var obj = (typeof servicio === 'string') ? JSON.parse(servicio) : (servicio || {});

    if (obj == null || obj.id_servicios == null || String(obj.id_servicios).trim() === '')
      return JSON.stringify({ ok:false, message:'Falta id_servicios' });

    var data = sheet.getDataRange().getValues();
    var head = data.shift();
    var idxId = headers.indexOf('id_servicios'); if (idxId === -1) throw new Error('Falta columna id_servicios');
    var targetRow = null;

    for (var i=0; i<data.length; i++){
      if (String(data[i][idxId]) === String(obj.id_servicios)){ targetRow = i+2; break; }
    }
    if (!targetRow) return JSON.stringify({ ok:false, message:'No encontrado' });

    // Aplicar valores campo por campo
    for (var k in obj){
      if (!obj.hasOwnProperty(k)) continue;
      var col = headers.indexOf(k);
      if (col === -1) continue;
      sheet.getRange(targetRow, col+1).setValue(obj[k]);
    }
    return JSON.stringify({ ok:true });
  }catch(err){
    return JSON.stringify({ ok:false, message: 'Error al actualizar: ' + err });
  }
}

/** ===== ELIMINAR ===== */
function eliminarServicio(id_servicios){
  try{
    var sheet = obtenerSheet(SHEET_SERVICIOS);
    var headers = _headersServicios_(sheet);
    var idxId = headers.indexOf('id_servicios'); if (idxId === -1) throw new Error('Falta columna id_servicios');
    var data = sheet.getDataRange().getValues();
    data.shift();
    var targetRow = null;
    for (var i=0;i<data.length;i++){
      if (String(data[i][idxId]) === String(id_servicios)){ targetRow = i+2; break; }
    }
    if (!targetRow) return JSON.stringify({ ok:false, message:'No encontrado' });

    sheet.deleteRow(targetRow);
    return JSON.stringify({ ok:true });
  }catch(err){
    return JSON.stringify({ ok:false, message: 'Error al eliminar: ' + err });
  }
}
