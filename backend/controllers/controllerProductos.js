/** 
 * controllerProductos.js
 * CRUD de Productos sobre la hoja definida en env_().SH_PRODUCTOS
 * Columnas esperadas:
 *   id | nombreProducto | categoria | precio | stock | fechaEntrada | descripcion | nombreSucursal
 *
 * Requiere helpers existentes:
 *   - env_() -> con SH_PRODUCTOS y SH_SUCURSALES
 *   - obtenerSheet(nombreHoja)
 *   - _read(sheet) -> array de objetos por encabezados
 * 
 */

// Nombre de hoja tomado del env (si no existe, usa fallback "productos")
var SHEET_PRODUCTOS = (env_().SH_PRODUCTOS || "productos");

/** Asegura que exista la columna 'categoria' en la hoja de productos (si no, la agrega al final). */
function ensureProductoCategoriaCol_(sheet) {
  try {
    var lastCol = sheet.getLastColumn();
    if (lastCol < 1) return;
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0] || [];
    if (headers.indexOf('categoria') === -1) {
      // Agregar encabezado 'categoria' al final
      sheet.getRange(1, lastCol + 1).setValue('categoria');
    }
  } catch (e) {
    // Si algo falla, no bloquear el resto del flujo
  }
}

/** =========================
 *  LISTAR
 *  ========================= */
function listarProductos() {
  try {
    var sheet = obtenerSheet(env_().SH_PRODUCTOS);
    ensureProductoCategoriaCol_(sheet); // asegura la columna 'categoria'
    var data = _read(sheet) || [];
    return JSON.stringify(data);
  } catch (err) {
    return JSON.stringify({ ok: false, message: 'Error al listar: ' + err });
  }
}

/** =========================
 *  CREAR (ID automático + valida sucursal activa)
 *  ========================= */
function crearProducto(producto) {
  var lock = LockService.getScriptLock();
  lock.tryLock(30000);
  try {
    var sheet = obtenerSheet(env_().SH_PRODUCTOS);
    ensureProductoCategoriaCol_(sheet); // asegura la columna 'categoria'
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    var arr = _read(sheet) || [];
    var nextId = firstFreeId_(arr); // primer hueco libre 1..N

    // VALIDAR sucursal activa
    var suc = (producto && producto.nombreSucursal) ? String(producto.nombreSucursal).trim() : '';
    if (!isSucursalActiva_(suc)) {
      return JSON.stringify({ ok: false, message: 'Sucursal inválida o inactiva. Seleccione una sucursal activa.' });
    }

    var rowObj = {
      id: nextId,
      nombreProducto: (producto && producto.nombreProducto) || '',
      categoria: (producto && producto.categoria) || '', // <-- agregado
      precio: Number((producto && producto.precio) || 0),
      stock: Number((producto && producto.stock) || 0),
      fechaEntrada: parseFechaProducto_(producto && producto.fechaEntrada),
      descripcion: (producto && producto.descripcion) || '',
      nombreSucursal: suc
    };

    var row = [];
    for (var h = 0; h < headers.length; h++) {
      var key = headers[h];
      var val = rowObj[key];
      row.push(key === 'fechaEntrada' ? (val || '') : val);
    }

    sheet.appendRow(row);
    return JSON.stringify({ ok: true, id: rowObj.id });
  } catch (err) {
    return JSON.stringify({ ok: false, message: 'Error al crear: ' + err });
  } finally {
    lock.releaseLock();
  }
}

/** =========================
 *  ACTUALIZAR (mantiene ID + valida sucursal activa)
 *  ========================= */
function actualizarProducto(producto) {
  var lock = LockService.getScriptLock();
  lock.tryLock(30000);
  try {
    if (!producto || producto.id == null || String(producto.id).trim() === '') {
      return JSON.stringify({ ok: false, message: 'Falta id para actualizar.' });
    }

    // VALIDAR sucursal activa:
    var suc = (producto && producto.nombreSucursal) ? String(producto.nombreSucursal).trim() : '';
    if (!isSucursalActiva_(suc)) {
      return JSON.stringify({ ok: false, message: 'Sucursal inválida o inactiva. Seleccione una sucursal activa.' });
    }

    var sheet = obtenerSheet(env_().SH_PRODUCTOS);
    ensureProductoCategoriaCol_(sheet); // asegura la columna 'categoria'
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return JSON.stringify({ ok: false, message: 'No hay datos.' });

    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var idCol = headers.indexOf('id') + 1;
    if (idCol <= 0) return JSON.stringify({ ok: false, message: 'No existe columna id.' });

    var ids = sheet.getRange(2, idCol, lastRow - 1, 1).getValues();
    var targetRow = -1;
    var needle = String(producto.id);
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === needle) { targetRow = i + 2; break; }
    }
    if (targetRow === -1) return JSON.stringify({ ok: false, message: 'Id no encontrado.' });

    var currentId = sheet.getRange(targetRow, idCol).getValue();

    var row = [];
    for (var h = 0; h < headers.length; h++) {
      var k = headers[h];
      var v = producto[k];
      if (k === 'id') v = currentId; // no se permite cambiar ID
      if (k === 'precio') v = Number(v || 0);
      if (k === 'stock') v = Number(v || 0);
      if (k === 'fechaEntrada') v = parseFechaProducto_(v);
      if (k === 'nombreSucursal') v = suc; // ya validado
      // k === 'categoria' -> tal cual (string)
      row.push(v == null ? '' : v);
    }

    sheet.getRange(targetRow, 1, 1, headers.length).setValues([row]);
    return JSON.stringify({ ok: true, id: currentId });
  } catch (err) {
    return JSON.stringify({ ok: false, message: 'Error al actualizar: ' + err });
  } finally {
    lock.releaseLock();
  }
}

/** =========================
 *  ELIMINAR (borra y reindexa IDs 1..N)
 *  ========================= */
function eliminarProducto(id) {
  var lock = LockService.getScriptLock();
  lock.tryLock(30000);
  try {
    if (id == null || String(id).trim() === '') {
      return JSON.stringify({ ok: false, message: 'Falta id para eliminar.' });
    }

    var sheet = obtenerSheet(env_().SH_PRODUCTOS);
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return JSON.stringify({ ok: false, message: 'No hay datos.' });

    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var idCol = headers.indexOf('id') + 1;
    if (idCol <= 0) return JSON.stringify({ ok: false, message: 'No existe columna id.' });

    var ids = sheet.getRange(2, idCol, lastRow - 1, 1).getValues();
    var targetRow = -1;
    var needle = String(id);
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === needle) { targetRow = i + 2; break; }
    }
    if (targetRow === -1) return JSON.stringify({ ok: false, message: 'Id no encontrado.' });

    sheet.deleteRow(targetRow);

    var total = reindexProductoIds_(sheet);
    return JSON.stringify({ ok: true, id: id, total: total });
  } catch (err) {
    return JSON.stringify({ ok: false, message: 'Error al eliminar: ' + err });
  } finally {
    lock.releaseLock();
  }
}

/** =========================
 *  Helpers
 *  ========================= */

/** Primer entero positivo libre (1..N) dado un arreglo con {id} */
function firstFreeId_(arr) {
  var seen = {};
  for (var i = 0; i < arr.length; i++) {
    var n = Number(arr[i] && arr[i].id);
    if (isFinite(n) && n > 0) seen[n] = true;
  }
  var k = 1;
  while (seen[k]) k++;
  return k;
}

/** Reescribe la columna id como 1..N según el orden actual de filas */
function reindexProductoIds_(sheet) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var idCol = headers.indexOf('id') + 1;
  var lastRow = sheet.getLastRow();
  if (lastRow < 2 || idCol <= 0) return 0;

  var count = lastRow - 1; // filas de datos
  var values = [];
  for (var i = 1; i <= count; i++) values.push([i]);
  sheet.getRange(2, idCol, count, 1).setValues(values);
  return count;
}

/** Normaliza fechas a Date para Sheets (acepta yyyy-mm-dd / yyyy/mm/dd / Date / number) */
function parseFechaProducto_(v) {
  if (!v) return '';
  if (Object.prototype.toString.call(v) === '[object Date]') return v;
  if (typeof v === 'number') return new Date(v);
  if (typeof v === 'string') {
    var m = v.match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})$/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    var d2 = new Date(v);
    if (!isNaN(d2)) return d2;
  }
  return '';
}

/** ========== Validación de sucursal activa (servidor) ========== */
function getActiveSucursalSet_() {
  var nombreHoja = (env_ && typeof env_ === 'function' && env_().SH_SUCURSALES) || 'sucursales';
  var sheet = obtenerSheet(nombreHoja);
  var rows = _read(sheet) || [];
  var set = {};
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i] || {};
    var estado = (r.estado || '').toString().toLowerCase().trim();
    var nom = (r.nombreSucursal || '').toString().trim();
    if ((estado === 'activo' || estado === 'activa') && nom) {
      set[nom] = true;
    }
  }
  return set;
}

function isSucursalActiva_(nombre) {
  if (!nombre) return false;
  var set = getActiveSucursalSet_();
  return !!set[String(nombre).trim()];
}
