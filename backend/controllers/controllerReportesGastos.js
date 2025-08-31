/**
 * controllerReportesGastos.js
 * Reportes de GASTOS, autónomo al controller de reportes de ventas.
 * Lee la hoja env_().SH_GASTOS y entrega lista + agregados.
 * Retorna JSON.stringify({ ok:true, data: { list:[...], resumen:{...} } })
 */

var SHEET_GASTOS_RG = (typeof env_ === 'function' && env_().SH_GASTOS) || 'Gastos';

/** ===== Helpers genéricos ===== */
function RG_head_(sh){
  return sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
}
function RG_norm_(s){
  return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().trim();
}

/** Fecha: soporta Date, ISO (YYYY-MM-DD), dd/mm/yyyy, mm/dd/yyyy, y números seriales */
function RG_parseFecha_(v){
  try{
    if (v instanceof Date && !isNaN(v)) return v;
    if (typeof v === 'number') {
      // serial a epoch (compat Excel/Sheets)
      var ms = Math.round((v - 25569) * 86400 * 1000);
      var d = new Date(ms);
      if (!isNaN(d)) return d;
    }
    var s = String(v||'').trim();
    if (!s) return null;
    // ISO
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(Number(m[1]), Number(m[2])-1, Number(m[3]));
    // dd/mm/yyyy
    m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (m) return new Date(Number(m[3]), Number(m[2])-1, Number(m[1]));
    // mm/dd/yyyy
    m = s.match(/^(\d{2})-(\d{2})-(\d{4})/);
    if (m) return new Date(Number(m[3]), Number(m[1])-1, Number(m[2]));
    var d2 = new Date(s);
    return isNaN(d2) ? null : d2;
  }catch(e){ return null; }
}

/** Lee filas de Gastos como objetos (usa _read existente si está, si no mapea por headers) */
function RG_leerGastos_(){
  var sh = obtenerSheet(SHEET_GASTOS_RG);
  if (!sh) return [];
  if (typeof _read === 'function') return _read(sh) || [];

  var data = sh.getDataRange().getValues();
  if (!data || data.length <= 1) return [];
  var head = data.shift().map(String);
  var out = [];
  for (var i=0;i<data.length;i++){
    var row = data[i], o = {};
    for (var c=0;c<head.length;c++){
      o[head[c]] = row[c];
    }
    o.row = i + 2;
    out.push(o);
  }
  return out;
}

/** Filtrado flexible por filtros: { anio, mes, desde, hasta, categoria, metodoPago, nombreSucursal, q } */
function RG_filtrar_(rows, filtros){
  filtros = (typeof filtros === 'string') ? (filtros ? JSON.parse(filtros): {}) : (filtros || {});
  var anio = Number(filtros.anio || 0) || 0;
  var mes  = Number(filtros.mes  || 0) || 0;
  var desde = filtros.desde ? RG_parseFecha_(filtros.desde) : null;
  var hasta = filtros.hasta ? RG_parseFecha_(filtros.hasta) : null;
  var cat = RG_norm_(filtros.categoria);
  var mp  = RG_norm_(filtros.metodoPago);
  var suc = RG_norm_(filtros.nombreSucursal);
  var q   = RG_norm_(filtros.q);

  var out = [];
  for (var i=0;i<rows.length;i++){
    var r = rows[i] || {};
    var d = RG_parseFecha_(r.fecha);
    if (!d) continue;

    // rango/año/mes
    if (anio && d.getFullYear() !== anio) continue;
    if (mes  && (d.getMonth()+1) !== mes) continue;
    if (desde && d < desde) continue;
    if (hasta && d > hasta) continue;

    // exactos
    if (cat && RG_norm_(r.categoria) !== cat) continue;
    if (mp  && RG_norm_(r.metodoPago) !== mp) continue;
    if (suc && RG_norm_(r.nombreSucursal) !== suc) continue;

    // búsqueda libre
    if (q){
      var blob = [
        r.categoria, r.descripcion, r.metodoPago, r.proveedor,
        r.nombreSucursal, r.comprobanteURL, r.creadoPor
      ].join(' ').toLowerCase();
      if (blob.indexOf(String(filtros.q||'').toLowerCase()) === -1) continue;
    }
    out.push(r);
  }
  return out;
}

/** Ordena desc por fecha, luego id desc */
function RG_ordenar_(rows){
  return rows.sort(function(a,b){
    var da = RG_parseFecha_(a.fecha), db = RG_parseFecha_(b.fecha);
    var ta = da ? da.getTime() : 0, tb = db ? db.getTime() : 0;
    if (tb !== ta) return tb - ta;
    var ia = Number(a.id||0) || 0, ib = Number(b.id||0) || 0;
    return ib - ia;
  });
}

/** Agregados: total, registros, promedio mensual, porMes, porCategoria, porMetodoPago, topProveedores */
function RG_agregar_(rows){
  var total = 0, regs = rows.length;
  var porMes = {}, porCategoria = {}, porMetodoPago = {}, porProveedor = {};
  for (var i=0;i<rows.length;i++){
    var r = rows[i] || {};
    var monto = Number(r.monto || 0) || 0;
    total += monto;

    var d = RG_parseFecha_(r.fecha);
    if (d){
      var key = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
      porMes[key] = (porMes[key] || 0) + monto;
    }
    var c = String(r.categoria || '').trim();           porCategoria[c] = (porCategoria[c] || 0) + monto;
    var m = String(r.metodoPago || '').trim();          porMetodoPago[m] = (porMetodoPago[m] || 0) + monto;
    var p = String(r.proveedor || '').trim();           porProveedor[p]  = (porProveedor[p]  || 0) + monto;
  }
  var mesesUsados = Object.keys(porMes).length || 1;
  var promMensual = total / mesesUsados;

  function toArr(obj, kLab, vLab){
    var arr = [];
    for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj,k)){
      arr.push({ [kLab]: k || '(sin dato)', [vLab]: obj[k] });
    }
    arr.sort(function(a,b){ return (b[vLab]||0) - (a[vLab]||0); });
    return arr;
  }

  return {
    total: total,
    registros: regs,
    promedioMensual: promMensual,
    porMes: toArr(porMes, 'mes', 'total'),
    porCategoria: toArr(porCategoria, 'categoria', 'total'),
    porMetodoPago: toArr(porMetodoPago, 'metodoPago', 'total'),
    topProveedores: toArr(porProveedor, 'proveedor', 'total').slice(0, 10)
  };
}

/**
 * Endpoint principal: devuelve { list, resumen }
 * filtros: { anio, mes, desde, hasta, categoria, metodoPago, nombreSucursal, q }
 */
function bootstrapReportesGastos(filtros){
  try{
    var rows = RG_leerGastos_();
    // Normaliza campos esperados (por si falta alguno)
    for (var i=0;i<rows.length;i++){
      var r = rows[i] || {};
      // aseguremos nombres típicos usados en UI
      r.id = r.id != null ? r.id : '';
      r.fecha = r.fecha != null ? r.fecha : '';
      r.categoria = r.categoria != null ? r.categoria : '';
      r.descripcion = r.descripcion != null ? r.descripcion : '';
      r.monto = Number(r.monto || 0) || 0;
      r.metodoPago = r.metodoPago != null ? r.metodoPago : '';
      r.proveedor = r.proveedor != null ? r.proveedor : '';
      r.nombreSucursal = r.nombreSucursal != null ? r.nombreSucursal : '';
      r.comprobanteURL = r.comprobanteURL != null ? r.comprobanteURL : '';
    }

    var filtrados = RG_filtrar_(rows, filtros);
    var ordenados = RG_ordenar_(filtrados);
    var resumen = RG_agregar_(ordenados);

    // Mapea a un shape estable para tabla
    var list = ordenados.map(function(r){
      var d = RG_parseFecha_(r.fecha);
      var fechaStr = d ? (d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')) : String(r.fecha || '');
      return {
        id: r.id,
        fecha: fechaStr,
        categoria: String(r.categoria || ''),
        descripcion: String(r.descripcion || ''),
        monto: Number(r.monto || 0) || 0,
        metodoPago: String(r.metodoPago || ''),
        proveedor: String(r.proveedor || ''),
        nombreSucursal: String(r.nombreSucursal || ''),
        comprobanteURL: String(r.comprobanteURL || '')
      };
    });

    return JSON.stringify({ ok:true, data: { list: list, resumen: resumen } });
  }catch(err){
    return JSON.stringify({ ok:false, message: 'Error en bootstrapReportesGastos: ' + err });
  }
}

/** 
 * Lista sucursales distintas desde la hoja de GASTOS.
 * Retorna: { ok:true, sucursales: ["Sucursal A","Sucursal B", ...] }
 */
function listarSucursalesGastos(){
  try{
    var rows = RG_leerGastos_();
    var set = {};
    for (var i=0;i<rows.length;i++){
      var r = rows[i] || {};
      var s = String(r.nombreSucursal || r.sucursal || r.Sucursal || '').trim();
      if (s) set[s] = true;
    }
    var list = Object.keys(set).sort(function(a,b){ return a.localeCompare(b, 'es', { sensitivity: 'base' }); });
    return JSON.stringify({ ok:true, sucursales: list });
  }catch(err){
    return JSON.stringify({ ok:false, message: 'Error en listarSucursalesGastos: ' + err });
  }
}

