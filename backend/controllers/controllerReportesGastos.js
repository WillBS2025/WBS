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
    // Normaliza campos esperados
    for (var i=0;i<rows.length;i++){
      var r = rows[i] || {};
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

/** Lista sucursales distintas desde la hoja de GASTOS. */
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

/** ===== Usuario actual (para auditoría del reporte) ===== */
function obtenerUsuarioActual(){
  try{
    var email = (Session && Session.getActiveUser) ? (Session.getActiveUser().getEmail() || '') : '';
    return JSON.stringify({ ok:true, email: email || 'N/D' });
  }catch(e){
    return JSON.stringify({ ok:false, email:'N/D' });
  }
}

/** ===== Helpers de reporte PDF ===== */
function RG_resolverDatos_(filtros){
  try{
    var rows = RG_leerGastos_();
    var filtrados = RG_filtrar_(rows, filtros);
    var ordenados = RG_ordenar_(filtrados);
    var resumen = RG_agregar_(ordenados);
    return { list: ordenados, resumen: resumen };
  }catch(e){
    return { list: [], resumen: { total:0, registros:0, promedioMensual:0, porMes:[], porCategoria:[], porMetodoPago:[], topProveedores:[] } };
  }
}

function RG_fmtMoney_(n){ n = Number(n||0)||0; return 'L. ' + Utilities.formatString('%,.2f', n).replace(/,/g, '_').replace(/\./g, ',').replace(/_/g, '.'); }
function RG_esc_(s){ return String(s||'').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

function RG_renderReporteHTML_(payload){
  var list = payload.list || [];
  var resumen = payload.resumen || {};
  var meta = payload.meta || {};
  var filtros = payload.filtros || {};

  var now = new Date();
  var fechaRep = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
  var titulo = RG_esc_(meta.tituloBarberia || 'Reporte de Gastos');
  var usuario = RG_esc_(meta.usuario || 'N/D');
  var periodoTxt = (function(){
    if (filtros.anio && filtros.mes){ return 'Mensual ' + filtros.anio + '-' + String(filtros.mes).padStart(2,'0'); }
    if (filtros.desde || filtros.hasta){ return 'Rango ' + (filtros.desde||'') + ' — ' + (filtros.hasta||''); }
    if (filtros.anio){ return 'Anual ' + filtros.anio; }
    return 'Sin periodo específico';
  })();
  var sucTxt = filtros.nombreSucursal ? ('Sucursal: ' + RG_esc_(filtros.nombreSucursal)) : 'Todas las sucursales';

  var head = '<!doctype html><html><head><meta charset="utf-8"><style>'
    + 'body{font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#222;margin:24px}'
    + 'h1{font-size:18px;margin:0 0 4px 0} h2{font-size:14px;margin:14px 0 6px 0}'
    + '.meta{font-size:11px;color:#555;margin-bottom:10px}'
    + '.kpis{display:flex;gap:12px;margin:10px 0}'
    + '.kpi{border:1px solid #ddd;border-radius:8px;padding:8px 10px}'
    + 'table{width:100%;border-collapse:collapse;margin-top:10px}'
    + 'th,td{border:1px solid #ddd;padding:6px 8px} th{background:#f5f5f5;text-align:left}'
    + 'tfoot td{font-weight:bold}'
    + '</style></head><body>';
  var header = ''
    + '<h1>' + titulo + '</h1>'
    + '<div class="meta">Generado: ' + fechaRep + ' · Usuario: ' + usuario + ' · ' + periodoTxt + ' · ' + sucTxt + '</div>';
  var kpis = '<div class="kpis">'
    + '<div class="kpi">Total: <b>' + RG_fmtMoney_(resumen.total||0) + '</b></div>'
    + '<div class="kpi">Registros: <b>' + (resumen.registros||0) + '</b></div>'
    + '<div class="kpi">Prom. mensual: <b>' + RG_fmtMoney_(resumen.promedioMensual||0) + '</b></div>'
    + '</div>';

  var thead = '<thead><tr>'
    + '<th>Fecha</th><th>Categoría</th><th>Descripción</th><th>Método de pago</th><th>Proveedor</th><th>Sucursal</th><th style="text-align:right">Monto</th>'
    + '</tr></thead>';
  var tbody = '<tbody>';
  for (var i=0;i<list.length;i++){
    var r = list[i]||{};
    tbody += '<tr>'
      + '<td>' + RG_esc_(r.fecha||'') + '</td>'
      + '<td>' + RG_esc_(r.categoria||'') + '</td>'
      + '<td>' + RG_esc_(r.descripcion||'') + '</td>'
      + '<td>' + RG_esc_(r.metodoPago||'') + '</td>'
      + '<td>' + RG_esc_(r.proveedor||'') + '</td>'
      + '<td>' + RG_esc_(r.nombreSucursal||'') + '</td>'
      + '<td style="text-align:right">' + RG_fmtMoney_(r.monto||0) + '</td>'
      + '</tr>';
  }
  tbody += '</tbody>';
  var tfoot = '<tfoot><tr><td colspan="6" style="text-align:right">TOTAL</td><td style="text-align:right">' + RG_fmtMoney_(resumen.total||0) + '</td></tr></tfoot>';
  var tabla = '<table>' + thead + tbody + tfoot + '</table>';

  var secciones = '';
  function secTabla(titulo, arr, kLab){
    if (!arr || !arr.length) return '';
    var rows = arr.map(function(x){ return '<tr><td>'+RG_esc_(x[kLab]||'')+'</td><td style="text-align:right">'+RG_fmtMoney_(x.total||0)+'</td></tr>'; }).join('');
    return '<h2>'+titulo+'</h2><table><thead><tr><th>'+kLab+'</th><th style="text-align:right">Total</th></tr></thead><tbody>'+rows+'</tbody></table>';
  }
  secciones += secTabla('Por mes', resumen.porMes, 'mes');
  secciones += secTabla('Por categoría', resumen.porCategoria, 'categoria');
  secciones += secTabla('Por método de pago', resumen.porMetodoPago, 'metodoPago');
  secciones += secTabla('Top proveedores', resumen.topProveedores, 'proveedor');

  var foot = '</body></html>';
  return head + header + kpis + tabla + secciones + foot;
}

/** ====== VERSIÓN LITE (sin DriveApp ni GmailApp) ====== */

/** ================= PDF LITE: helpers de formato ================= */
function RG_htmlEsc_(s){ return String(s==null?'':s).replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }
function RG_fmtL_(n){
  var v = Number(n||0);
  var s = Utilities.formatString("%,.2f", v);
  return "L. " + s;
}
function RG_fmtFechaES_(d){
  try{
    if (!(d instanceof Date)) d = RG_parseFecha_(d);
    if (!d || isNaN(d)) return '';
    var meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    return d.getDate() + ' de ' + meses[d.getMonth()] + ' de ' + d.getFullYear();
  }catch(e){ return ''; }
}
function RG_periodoEtiqueta_(f){
  f = f || {};
  if (f.desde && f.hasta) return 'Del ' + RG_fmtFechaES_(f.desde) + ' al ' + RG_fmtFechaES_(f.hasta);
  if (f.anio && f.mes){
    var m = ('0'+f.mes).slice(-2);
    return 'Mensual ' + f.anio + '-' + m;
  }
  if (f.anio) return 'Anual ' + f.anio;
  return 'Todos';
}

/* Opcionalmente soporta logo si en un futuro se incluye en meta.logoUrl */
function RG_fmtNum2_(n){
  n = Number(n || 0);
  var sign = n < 0 ? '-' : '';
  n = Math.abs(n);
  var s = n.toFixed(2);
  var parts = s.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return sign + parts[0] + '.' + parts[1];
}
function RG_fmtL_Seguro_(n){ return 'L. ' + RG_fmtNum2_(n); }
function RG_logoDataUrl_(meta){
  try{
    meta = meta || {};
    var u = String(meta.logoUrl || '').trim();
    if (!u) return '';
    if (u.indexOf('data:') === 0) return u;
    var resp = UrlFetchApp.fetch(u, { muteHttpExceptions: true });
    if (resp.getResponseCode() >= 200 && resp.getResponseCode() < 400){
      var ctype = resp.getHeaders()['Content-Type'] || 'image/png';
      var b64 = Utilities.base64Encode(resp.getContent());
      return 'data:' + ctype + ';base64,' + b64;
    }
  }catch(e){}
  return '';
}

/** ================= PDF LITE: render HTML ================= */
function RG_renderReporteHTML_Lite(payload){
  var list    = (payload && payload.list)    || [];
  var resumen = (payload && payload.resumen) || {};
  var meta    = (payload && payload.meta)    || {};
  var filtros = (payload && payload.filtros) || {};

  var titulo   = RG_htmlEsc_(meta.tituloBarberia || 'Reporte de Gastos');
  var usuario  = RG_htmlEsc_(meta.usuario || '');
  var generado = RG_fmtFechaES_(new Date());
  var etiqueta = RG_htmlEsc_(RG_periodoEtiqueta_(filtros));
  var sucTxt   = RG_htmlEsc_( (filtros.nombreSucursal ? filtros.nombreSucursal : 'Todas las sucursales') );

  var h = [];
  h.push('<!doctype html><html><head><meta charset="utf-8"/>');
  h.push('<style>');
  h.push('body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:28px;}');
  h.push('h1{font-size:20px;margin:0 0 4px 0} .meta{color:#555;margin:2px 0 14px 0;font-size:12px}');
  h.push('.logo{margin-bottom:8px}');
  h.push('.kpis{display:flex;gap:12px;margin:8px 0 16px 0}');
  h.push('.kpi{border:1px solid #ddd;border-radius:8px;padding:10px 12px;min-width:160px}');
  h.push('.kpi .lbl{color:#666;font-size:12px} .kpi .val{font-size:18px;font-weight:600;margin-top:2px}');
  h.push('table{width:100%;border-collapse:collapse;margin-top:12px;font-size:12px}');
  h.push('th,td{border:1px solid #ddd;padding:6px 8px;vertical-align:top}');
  h.push('th{background:#f5f5f5;text-align:left}');
  h.push('tfoot td{font-weight:600}');
  h.push('.section{margin-top:18px}');
  h.push('</style></head><body>');

  // Logo (solo si meta.logoUrl existe; en la UI ya no se muestra el campo)
  var _logo = RG_logoDataUrl_(meta);
  if (_logo) h.push('<div class="logo"><img src="'+_logo+'" style="height:64px;object-fit:contain;display:block"/></div>');

  h.push('<h1>'+titulo+'</h1>');
  h.push('<div class="meta">Generado: '+RG_htmlEsc_(generado)+' · Usuario: '+usuario+' · '+RG_htmlEsc_(etiqueta)+' · '+sucTxt+'</div>');

  h.push('<div class="kpis">');
  h.push('<div class="kpi"><div class="lbl">Total</div><div class="val">'+RG_fmtL_Seguro_(resumen.total||0)+'</div></div>');
  h.push('<div class="kpi"><div class="lbl">Registros</div><div class="val">'+(resumen.registros||0)+'</div></div>');
  h.push('<div class="kpi"><div class="lbl">Prom. mensual</div><div class="val">'+RG_fmtL_Seguro_(resumen.promedioMensual||0)+'</div></div>');
  h.push('</div>');

  h.push('<table>');
  h.push('<thead><tr><th>Fecha</th><th>Categoría</th><th>Descripción</th><th>Método de pago</th><th>Proveedor</th><th>Sucursal</th><th style="text-align:right">Monto</th></tr></thead>');
  h.push('<tbody>');
  for (var i=0;i<list.length;i++){
    var r = list[i]||{};
    var fecha = RG_fmtFechaES_(r.fecha);
    h.push('<tr>');
    h.push('<td>'+RG_htmlEsc_(fecha)+'</td>');
    h.push('<td>'+RG_htmlEsc_(r.categoria||'')+'</td>');
    h.push('<td>'+RG_htmlEsc_(r.descripcion||'')+'</td>');
    h.push('<td>'+RG_htmlEsc_(r.metodoPago||'')+'</td>');
    h.push('<td>'+RG_htmlEsc_(r.proveedor||'')+'</td>');
    h.push('<td>'+RG_htmlEsc_(r.nombreSucursal||'')+'</td>');
    h.push('<td style="text-align:right">'+RG_fmtL_Seguro_(r.monto||0)+'</td>');
    h.push('</tr>');
  }
  h.push('</tbody>');
  h.push('<tfoot><tr><td colspan="6" style="text-align:right">TOTAL</td><td style="text-align:right">'+RG_fmtL_Seguro_(resumen.total||0)+'</td></tr></tfoot>');
  h.push('</table>');

  function smallTable(title, rows, kLab, vLab){
    if (!rows || !rows.length) return;
    h.push('<div class="section"><h3>'+RG_htmlEsc_(title)+'</h3>');
    h.push('<table><thead><tr><th>'+RG_htmlEsc_(kLab)+'</th><th style="text-align:right">Total</th></tr></thead><tbody>');
    for (var j=0;j<rows.length;j++){
      var rr = rows[j]||{};
      h.push('<tr><td>'+RG_htmlEsc_(rr[kLab]||'')+'</td><td style="text-align:right">'+RG_fmtL_Seguro_(rr[vLab]||0)+'</td></tr>');
    }
    h.push('</tbody></table></div>');
  }
  smallTable('Por mes', resumen.porMes, 'mes', 'total');
  smallTable('Por categoría', resumen.porCategoria, 'categoria', 'total');
  smallTable('Por método de pago', resumen.porMetodoPago, 'metodoPago', 'total');
  smallTable('Top proveedores', resumen.topProveedores, 'proveedor', 'total');

  h.push('</body></html>');
  return h.join('');
}

/** ================= PDF LITE: usa el nuevo render ================= */
function generarReporteGastosPDF_Lite(filtros, meta){
  try{
    filtros = (typeof filtros === 'string') ? (filtros ? JSON.parse(filtros): {}) : (filtros || {});
    meta    = (typeof meta    === 'string') ? (meta    ? JSON.parse(meta)   : {}) : (meta    || {});

    var rows = RG_leerGastos_();
    var filtrados = RG_filtrar_(rows, filtros);
    var ordenados = RG_ordenar_(filtrados);
    var resumen = RG_agregar_(ordenados);

    var data = { list: ordenados.map(function(r){
      return {
        fecha: r.fecha,
        categoria: String(r.categoria||''),
        descripcion: String(r.descripcion||''),
        metodoPago: String(r.metodoPago||''),
        proveedor: String(r.proveedor||''),
        nombreSucursal: String(r.nombreSucursal||''),
        monto: Number(r.monto||0)||0
      };
    }), resumen: resumen, meta: meta, filtros: filtros };

    var html = RG_renderReporteHTML_Lite(data) || RG_renderReporteHTML_(data);
    if (!html) throw new Error('No se pudo renderizar HTML del reporte.');
    var pdfBlob = Utilities.newBlob(html, 'text/html', 'reporte.html').getAs('application/pdf').setName('Reporte_Gastos.pdf');
    var base64 = Utilities.base64Encode(pdfBlob.getBytes());
    return JSON.stringify({ ok:true, base64: base64, fileUrl: null });
  }catch(err){
    return JSON.stringify({ ok:false, message: 'Error al generar PDF (Lite): ' + err });
  }
}
