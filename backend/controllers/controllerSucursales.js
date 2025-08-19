/**
 * controllerSucursales.js – CRUD completo Sucursales
 * Hoja: env_().SH_SUCURSALES (por defecto "sucursales")
 * Columnas esperadas (en este orden):
 * id | nombreSucursal | fechaInauguracion | telefono | direccion | correoElectronico | estado
 */

var SHEET_SUCURSALES = (typeof env_ === 'function' && env_().SH_SUCURSALES) || 'sucursales';

/** =========================
 *  UTILIDADES
 *  =======================*/
function _headers_(sheet){
  return sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
}
function _firstFreeId_(sheet, headers){
  var idCol = headers.indexOf('id') + 1;
  if (idCol <= 0) throw new Error('No existe columna id.');
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return 1;
  var ids = sheet.getRange(2, idCol, lastRow - 1, 1).getValues();
  var max = 0;
  for (var i=0;i<ids.length;i++){
    var n = Number(ids[i][0]);
    if (isFinite(n) && n > max) max = n;
  }
  return max + 1;
}
function _parseFecha_(v){
  if (!v) return '';
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v)) {
    return new Date(v.getFullYear(), v.getMonth(), v.getDate());
  }
  if (typeof v === 'string'){
    var s = v.trim();
    // yyyy-mm-dd
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m){
      var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
      return isNaN(d) ? '' : d;
    }
    // dd/mm/yyyy o dd-mm-yyyy
    var m2 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (m2){
      var dd = Number(m2[1]), mm = Number(m2[2]) - 1, yy = Number(m2[3]);
      if (yy < 100) yy += 2000;
      var d2 = new Date(yy, mm, dd);
      return isNaN(d2) ? '' : d2;
    }
  }
  var d0 = new Date(v);
  return isNaN(d0) ? '' : d0;
}

/** =========================
 *  LISTAR (todo)
 *  =======================*/
function listarSucursales(){
  try{
    var sheet = obtenerSheet(SHEET_SUCURSALES);
    var data = _read(sheet) || [];
    return JSON.stringify(data);
  }catch(err){
    return JSON.stringify({ ok:false, message: 'Error al listar: ' + err });
  }
}

/** =========================
 *  CREAR
 *  =======================*/
function crearSucursal(sucursal){
  try{
    var sheet = obtenerSheet(SHEET_SUCURSALES);
    var headers = _headers_(sheet);
    var obj = (typeof sucursal === 'string') ? JSON.parse(sucursal) : (sucursal || {});

    if (!obj || !obj.nombreSucursal) return JSON.stringify({ ok:false, message:'Falta nombreSucursal' });

    var nextId = _firstFreeId_(sheet, headers);
    obj.id = nextId;

    // Normalizaciones
    obj.telefono = (obj.telefono == null ? '' : String(obj.telefono));
    obj.correoElectronico = (obj.correoElectronico == null ? '' : String(obj.correoElectronico));
    obj.direccion = (obj.direccion == null ? '' : String(obj.direccion));
    obj.estado = (obj.estado == null || String(obj.estado).trim() === '') ? 'Activo' : String(obj.estado).trim();
    obj.fechaInauguracion = _parseFecha_(obj.fechaInauguracion);

    // Construir fila en orden de encabezados
    var row = headers.map(function(h){ var v = obj[h]; return (v == null ? '' : v); });
    sheet.appendRow(row);

    return JSON.stringify({ ok:true, id: nextId });
  }catch(err){
    return JSON.stringify({ ok:false, message: 'Error al crear: ' + err });
  }
}

/** =========================
 *  ACTUALIZAR (por id)
 *  =======================*/
function actualizarSucursal(sucursal){
  try{
    var sheet = obtenerSheet(SHEET_SUCURSALES);
    var headers = _headers_(sheet);
    var obj = (typeof sucursal === 'string') ? JSON.parse(sucursal) : (sucursal || {});

    if (obj == null || obj.id == null || String(obj.id).trim() === '')
      return JSON.stringify({ ok:false, message:'Falta id' });

    var idCol = headers.indexOf('id') + 1; if (idCol <= 0) return JSON.stringify({ ok:false, message:'No existe columna id.'});

    var lastRow = sheet.getLastRow(); if (lastRow < 2) return JSON.stringify({ ok:false, message:'No hay datos.' });
    var ids = sheet.getRange(2, idCol, lastRow - 1, 1).getValues();
    var targetRow = -1; var needle = String(obj.id);
    for (var i=0;i<ids.length;i++){ if (String(ids[i][0]) === needle){ targetRow = i+2; break; } }
    if (targetRow === -1) return JSON.stringify({ ok:false, message:'Id no encontrado.' });

    // Normalizaciones
    obj.fechaInauguracion = _parseFecha_(obj.fechaInauguracion);

    var currentId = sheet.getRange(targetRow, idCol).getValue();
    var out = headers.map(function(h){
      var v = obj[h];
      if (h === 'id') v = currentId; // no permitir cambiar id
      return (v == null ? '' : v);
    });
    sheet.getRange(targetRow, 1, 1, headers.length).setValues([out]);

    return JSON.stringify({ ok:true, id: currentId });
  }catch(err){
    return JSON.stringify({ ok:false, message: 'Error al actualizar: ' + err });
  }
}

/** =========================
 *  ELIMINAR (por id)
 *  =======================*/
function eliminarSucursal(id){
  try{
    var sheet = obtenerSheet(SHEET_SUCURSALES);
    Delete(id, sheet); // usa tu helper deleteRow.js existente
    return JSON.stringify({ ok:true });
  }catch(err){
    return JSON.stringify({ ok:false, message: 'Error al eliminar: ' + err });
  }
}

/** =========================
 *  LISTAR SOLO ACTIVAS (para selects de Productos)
 *  =======================*/
function listarSucursalesActivas() {
  try {
    var nombreHoja = (env_ && typeof env_ === 'function' && env_().SH_SUCURSALES) || 'sucursales';
    var sheet = obtenerSheet(nombreHoja);
    var rows = _read(sheet) || [];

    var out = [];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i] || {};
      var estado = (r.estado || '').toString().toLowerCase().trim();
      if (estado === 'activo' || estado === 'activa') {
        out.push({ id: r.id, nombreSucursal: r.nombreSucursal });
      }
    }
    out.sort(function (a, b) {
      return String(a.nombreSucursal || '').localeCompare(String(b.nombreSucursal || ''), 'es');
    });
    return JSON.stringify({ ok: true, sucursales: out });
  } catch (err) {
    return JSON.stringify({ ok: false, message: 'Error al listar sucursales: ' + err });
  }
}
