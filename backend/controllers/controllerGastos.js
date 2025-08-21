/**
 * CONTROLLERGASTOS.JS
 * CRUD Y CONSULTAS DEL MÓDULO DE GASTOS
 * HOJA USADA: env_().SH_GASTOS (POR DEFECTO "Gastos")
 * COLUMNAS ESPERADAS (EN ESTE ORDEN):
 * id | fecha | categoria | descripcion | monto | metodoPago | proveedor | nombreSucursal | comprobanteURL | creadoPor | fechaCreacion | fechaActualizacion | estado
 */

var SHEET_GASTOS = (typeof env_ === 'function' && env_().SH_GASTOS) || 'Gastos';

/** =========================
 *  UTILIDADES GENERALES
 *  =======================*/

/** OBTIENE O CREA LA HOJA DE GASTOS CON ENCABEZADOS SI NO EXISTE */
function ensureGastosSheet_() {
  var ss = conexion();
  var sh = ss.getSheetByName(SHEET_GASTOS);
  if (!sh) {
    sh = ss.insertSheet(SHEET_GASTOS);
    sh.getRange(1,1,1,13).setValues([[
      'id','fecha','categoria','descripcion','monto','metodoPago','proveedor','nombreSucursal','comprobanteURL','creadoPor','fechaCreacion','fechaActualizacion','estado'
    ]]);
    sh.autoResizeColumns(1, 13);
  }
  return sh;
}

/** LEE ENCABEZADOS DE UNA HOJA */
function _headersG_(sheet){
  return sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
}

/** PRIMER ENTERO POSITIVO LIBRE (1..N) A PARTIR DE _read() */
function _firstFreeIdFromRows_(rows){
  var seen = {};
  for (var i=0; i<rows.length; i++){
    var n = Number(rows[i] && rows[i].id);
    if (isFinite(n) && n>0) seen[n] = true;
  }
  var k = 1;
  while (seen[k]) k++;
  return k;
}

/** NORMALIZA FECHA: ACEPTA DATE O STRING (YYYY-MM-DD / DD-MM-YYYY / DD/MM/YYYY) */
function _parseFechaG_(v){
  if (!v) return '';
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v)) {
    return new Date(v.getFullYear(), v.getMonth(), v.getDate());
  }
  if (typeof v === 'string'){
    var s = v.trim();
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m){
      var d = new Date(Number(m[1]), Number(m[2])-1, Number(m[3]));
      return isNaN(d) ? '' : d;
    }
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

/** CONJUNTO DE SUCURSALES ACTIVAS PARA VALIDACIÓN */
function _getActiveSucursalSet_(){
  var nombreHoja = (env_ && typeof env_ === 'function' && env_().SH_SUCURSALES) || 'sucursales';
  var sheet = obtenerSheet(nombreHoja);
  if (!sheet) return {};
  var rows = _read(sheet) || {};
  var set = {};
  for (var i=0; i<rows.length; i++){
    var r = rows[i] || {};
    var estado = (r.estado || '').toString().toLowerCase().trim();
    var nom = (r.nombreSucursal || '').toString().trim();
    if ((estado === 'activo' || estado === 'activa') && nom) set[nom] = true;
  }
  return set;
}
function _isSucursalActiva_(nombre){
  if (!nombre) return false;
  var set = _getActiveSucursalSet_();
  return !!set[String(nombre).trim()];
}

/** ===========================================
 *  UTILIDADES ESPECÍFICAS PARA UPDATE/DELETE
 *  (ROBUSTAS Y COMPATIBLES)
 *  ===========================================*/

/** BUSCA EL NÚMERO DE FILA (2-BASED) POR ID EN LA HOJA DE GASTOS (STRING O NÚMERO) */
function _findRowByIdG_(sheet, id){
  // COMPARA TANTO COMO STRING COMO NÚMERO PARA EVITAR DESAJUSTES
  var last = sheet.getLastRow();
  if (last < 2) return -1;
  var headers = _headersG_(sheet);
  var numCols = headers.length;

  var values = sheet.getRange(2, 1, last-1, numCols).getValues();

  var targetStr = String(id).trim();
  var targetNum = Number(id);
  var hasNum = isFinite(targetNum);

  for (var i=0; i<values.length; i++){
    var cell = values[i][0]; // COLUMNA 'id'
    var cellStr = String(cell).trim();
    var cellNum = Number(cell);
    var match = (cellStr === targetStr) || (hasNum && isFinite(cellNum) && cellNum === targetNum);
    if (match) return i + 2; // FILA REAL
  }
  return -1;
}

/** ESCRIBE UN OBJETO EN UNA FILA EXISTENTE, RESPETANDO EL ORDEN DE ENCABEZADOS */
function _writeObjectToRowG_(sheet, rowIndex, obj){
  var headers = _headersG_(sheet);
  var out = [];
  for (var j=0; j<headers.length; j++){
    var key = headers[j];
    var val = (obj.hasOwnProperty(key) ? obj[key] : '');
    if (key === 'monto') val = Number(val || 0); // NORMALIZAR MONTO
    if (key === 'fecha' || key === 'fechaCreacion' || key === 'fechaActualizacion') {
      val = _parseFechaG_(val) || '';
    }
    out.push(val);
  }
  sheet.getRange(rowIndex, 1, 1, headers.length).setValues([out]);
}

/** ACTUALIZA POR ID SIN USAR EL HELPER (FALLBACK) */
function _updateRowByIdG_(sheet, obj){
  var idStr = String(obj.id).trim();
  var rowIndex = _findRowByIdG_(sheet, idStr);
  if (rowIndex === -1) throw new Error('NO SE ENCONTRÓ FILA PARA ID ' + idStr);

  // LEEMOS LA FILA ACTUAL PARA CONSERVAR CAMPOS NO ENVIADOS
  var headers = _headersG_(sheet);
  var current = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
  var base = {};
  for (var j=0; j<headers.length; j++) base[headers[j]] = current[j];

  var merged = Object.assign({}, base, obj, {
    fecha: _parseFechaG_(obj.fecha) || base.fecha,
    fechaActualizacion: new Date()
  });

  _writeObjectToRowG_(sheet, rowIndex, merged);
}

/** =========================
 *  LISTAR / FILTRAR
 *  =======================*/
function listarGastos(filtros){
  try{
    var sheet = ensureGastosSheet_();
    var rows = _read(sheet) || [];

    var obj = (typeof filtros === 'string') ? (filtros ? JSON.parse(filtros) : {}) : (filtros || {});
    var mes = Number(obj.mes || 0);
    var anio = Number(obj.anio || 0);
    var cat = (obj.categoria || '').toString().trim().toLowerCase();
    var suc = (obj.nombreSucursal || '').toString().trim().toLowerCase();
    var q   = (obj.q || '').toString().trim().toLowerCase();

    var filtered = rows.filter(function(r){
      // FECHA
      if (mes || anio){
        var d = _parseFechaG_(r.fecha);
        if (!d) return false;
        if (anio && d.getFullYear() !== anio) return false;
        if (mes && (d.getMonth()+1) !== mes) return false;
      }
      // CATEGORIA
      if (cat && String(r.categoria || '').toLowerCase().trim() !== cat) return false;
      // SUCURSAL
      if (suc && String(r.nombreSucursal || '').toLowerCase().trim() !== suc) return false;
      // BUSCADOR
      if (q){
        var blob = [
          r.categoria, r.descripcion, r.metodoPago,
          r.proveedor, r.nombreSucursal, r.comprobanteURL
        ].join(' ').toLowerCase();
        if (blob.indexOf(q) === -1) return false;
      }
      return true;
    });

    // ORDENAR POR FECHA DESC, LUEGO ID DESC
    filtered.sort(function(a,b){
      var da = _parseFechaG_(a.fecha); var db = _parseFechaG_(b.fecha);
      var ta = da ? da.getTime() : 0, tb = db ? db.getTime() : 0;
      if (tb !== ta) return tb - ta;
      return Number(b.id||0) - Number(a.id||0);
    });

    return JSON.stringify(filtered);
  }catch(err){
    return JSON.stringify({ ok:false, message:'Error al listar: '+err });
  }
}

/** =========================
 *  CREAR
 *  =======================*/
function crearGasto(gasto){
  var lock = LockService.getScriptLock();
  lock.tryLock(30000);
  try{
    var sheet = ensureGastosSheet_();
    var rows = _read(sheet) || [];
    var nextId = _firstFreeIdFromRows_(rows);

    var obj = (typeof gasto === 'string') ? JSON.parse(gasto) : (gasto || {});
    var suc = (obj && obj.nombreSucursal) ? String(obj.nombreSucursal).trim() : '';
    if (suc && !_isSucursalActiva_(suc)){
      return JSON.stringify({ ok:false, message:'Sucursal inválida o inactiva.' });
    }

    var now = new Date();
    var rowObj = {
      id: nextId,
      fecha: _parseFechaG_(obj.fecha) || now,
      categoria: (obj.categoria || '').toString().trim(),
      descripcion: (obj.descripcion || '').toString().trim(),
      monto: Number(obj.monto || 0),
      metodoPago: (obj.metodoPago || '').toString().trim(),
      proveedor: (obj.proveedor || '').toString().trim(),
      nombreSucursal: suc,
      comprobanteURL: (obj.comprobanteURL || '').toString().trim(),
      creadoPor: (obj.creadoPor || Session.getActiveUser().getEmail() || ''),
      fechaCreacion: now,
      fechaActualizacion: now,
      estado: (obj.estado || 'activo')
    };

    Insert(rowObj, sheet);
    return JSON.stringify({ ok:true, id: nextId });
  }catch(err){
    return JSON.stringify({ ok:false, message:'Error al crear: '+err });
  }finally{
    lock.releaseLock();
  }
}

/** =========================
 *  ACTUALIZAR
 *  =======================*/
function actualizarGasto(gasto){
  var lock = LockService.getScriptLock();
  lock.tryLock(30000);
  try{
    var sheet = ensureGastosSheet_();

    var obj = (typeof gasto === 'string') ? JSON.parse(gasto) : (gasto || {});
    if (obj == null || obj.id == null || String(obj.id).trim() === ''){
      return JSON.stringify({ ok:false, message:'Falta id para actualizar.' });
    }

    // AJUSTES: NORMALIZAR FECHA Y MARCAR FECHA DE ACTUALIZACIÓN
    var payload = Object.assign({}, obj, {
      fecha: _parseFechaG_(obj.fecha),
      fechaActualizacion: new Date()
    });

    // INTENTO 1: USO DEL HELPER UPDATE (CONSISTENTE CON OTROS CONTROLLERS)
    try {
      Update(String(payload.id), payload, sheet);
    } catch(e) {
      // FALLBACK: ACTUALIZAR DIRECTO POR ID EN LA HOJA
      _updateRowByIdG_(sheet, payload);
    }

    // LÍNEA ANTIGUA (SE DEJA COMENTADA)
    // Update(String(payload.id), JSON.stringify(payload), sheet);

    return JSON.stringify({ ok:true, id: payload.id });
  }catch(err){
    return JSON.stringify({ ok:false, message:'Error al actualizar: '+err });
  }finally{
    lock.releaseLock();
  }
}

/** =========================
 *  ELIMINAR
 *  =======================*/
function eliminarGasto(id){
  var lock = LockService.getScriptLock();
  lock.tryLock(30000);
  try{
    var sheet = ensureGastosSheet_();
    var idStr = String(id).trim();
    if (!idStr) return JSON.stringify({ ok:false, message:'FALTA ID PARA ELIMINAR.' });

    // ELIMINACIÓN DIRECTA POR FILA (SIEMPRE), PARA EVITAR FALLOS SILENCIOSOS DEL HELPER
    var rowIndex = _findRowByIdG_(sheet, idStr);
    if (rowIndex === -1){
      // LÍNEA DE TU HELPER (SE DEJA COMENTADA PARA NO ELIMINAR CÓDIGO EXISTENTE)
      // Delete(idStr, sheet);
      return JSON.stringify({ ok:false, message:'NO SE ENCONTRÓ EL REGISTRO CON ID '+idStr });
    }

    sheet.deleteRow(rowIndex); // BORRADO FÍSICO DE LA FILA

    return JSON.stringify({ ok:true, id:idStr, row: rowIndex });
  }catch(err){
    return JSON.stringify({ ok:false, message:'Error al eliminar: '+err });
  }finally{
    lock.releaseLock();
  }
}

/** =========================
 *  RESUMEN MENSUAL (PARA REPORTES)
 *  =======================*/
function resumenGastosPorMes(filtros){
  try{
    var sheet = ensureGastosSheet_();
    var rows = _read(sheet) || [];
    var obj = (typeof filtros === 'string') ? (filtros ? JSON.parse(filtros) : {}) : (filtros || {});
    var anio = Number(obj.anio || 0);
    var suc = (obj.nombreSucursal || '').toString().trim().toLowerCase();

    var outMap = {}; // KEY: YYYY-MM -> { anio, mes, total, porCategoria: {CAT: TOTAL}, registros: N }
    for (var i=0; i<rows.length; i++){
      var r = rows[i] || {};
      if (suc && String(r.nombreSucursal || '').toLowerCase().trim() !== suc) continue;

      var d = _parseFechaG_(r.fecha); if (!d) continue;
      var y = d.getFullYear(), m = d.getMonth()+1;
      if (anio && y !== anio) continue;

      var key = y + '-' + String(m).padStart(2,'0');
      if (!outMap[key]) outMap[key] = { anio: y, mes: m, total: 0, registros: 0, porCategoria: {} };

      var monto = Number(r.monto || 0);
      outMap[key].total += monto;
      outMap[key].registros += 1;

      var cat = (r.categoria || '').toString().trim();
      if (!outMap[key].porCategoria[cat]) outMap[key].porCategoria[cat] = 0;
      outMap[key].porCategoria[cat] += monto;
    }

    var out = Object.keys(outMap).sort().map(function(k){ return outMap[k]; });
    return JSON.stringify({ ok:true, resumen: out });
  }catch(err){
    return JSON.stringify({ ok:false, message:'Error en resumen: '+err });
  }
}

/** LISTA SUCURSALES ACTIVAS PARA SELECT EN FRONTEND */
function listarSucursalesActivas(){
  try{
    var nombreHoja = (env_ && typeof env_ === 'function' && env_().SH_SUCURSALES) || 'sucursales';
    var sheet = obtenerSheet(nombreHoja);
    if (!sheet) return JSON.stringify({ ok:true, sucursales: [] });

    var rows = _read(sheet) || [];
    var out = [];
    for (var i=0; i<rows.length; i++){
      var r = rows[i] || {};
      var estado = String(r.estado || '').toLowerCase().trim();
      var nom = String(r.nombreSucursal || '').trim();
      if ((estado === 'activo' || estado === 'activa') && nom){
        out.push({ nombreSucursal: nom });
      }
    }
    // DEDUPLICAR POR NOMBRE DE SUCURSAL
    var seen = {}, unique = [];
    for (var j=0; j<out.length; j++){
      var n = out[j].nombreSucursal;
      if (!seen[n]){ seen[n] = true; unique.push(out[j]); }
    }
    return JSON.stringify({ ok:true, sucursales: unique });
  }catch(err){
    return JSON.stringify({ ok:false, message: 'Error al listar sucursales: ' + err });
  }
}
