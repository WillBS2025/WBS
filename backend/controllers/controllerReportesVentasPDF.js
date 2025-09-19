
/**
 * controllerReportesVentasPDF.js
 * Genera PDF (base64) para Reporte de Ventas (LITE) y envía por Gmail API (Advanced Service).
 * Depende de: bootstrapReportesVentas() de controllerReportes.js
 * Reusa helpers de controllerReportesGastos.js: RG_fmtFechaES_, RG_htmlEsc_, RG_fmtL_Seguro_, RG_periodoEtiqueta_ (si existen)
 */

// --- Helpers locales ---
function RV_norm_(s){ return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(); }
function RV_parseYmd_(s){ try{ var p=String(s||'').split('-').map(function(x){return Number(x)||0;}); return new Date(p[0],p[1]-1,p[2]); }catch(e){ return null; } }
function RV_fmtMoney_(n){ n = Number(n||0)||0; var s = n.toFixed(2); s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ','); return 'L. ' + s; }
function RV_fmtFechaES_(s){ if (typeof RG_fmtFechaES_ === 'function') return RG_fmtFechaES_(s); try{ var d = RV_parseYmd_(s); if(!d) return String(s||''); var y=d.getFullYear(), m=('0'+(d.getMonth()+1)).slice(-2), day=('0'+d.getDate()).slice(-2); return y+'-'+m+'-'+day; }catch(e){ return String(s||''); } }
function RV_htmlEsc_(s){ if (typeof RG_htmlEsc_ === 'function') return RG_htmlEsc_(s); return String(s||'').replace(/[&<>"']/g, function(m){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]); }); }
function RV_fmtL_Seguro_(n){ if (typeof RG_fmtL_Seguro_ === 'function') return RG_fmtL_Seguro_(n); return RV_fmtMoney_(n); }
function RV_periodoEtiqueta_(f){ if (typeof RG_periodoEtiqueta_ === 'function') return RG_periodoEtiqueta_(f); f=f||{}; if (f.anio && f.mes){ var m=('0'+f.mes).slice(-2); return 'Mensual '+f.anio+'-'+m; } if (f.anio){ return 'Anual '+f.anio; } return 'Todos'; }


function RV_filtrar_(rows, filtros){
  filtros = (typeof filtros === 'string') ? (filtros ? JSON.parse(filtros): {}) : (filtros || {});
  var p = String(filtros.periodo||'anual');
  var y = Number(filtros.anio||0) || (new Date().getFullYear());
  var m = Number(filtros.mes||0)  || (new Date().getMonth()+1);
  var q = Number(filtros.quincena||1)===2 ? 2 : 1;
  var ref = filtros.fechaRef ? RV_parseYmd_(filtros.fechaRef) : new Date();

  // Preferir ventana explícita si viene desde/hasta
  var desde = filtros.desde ? RV_parseYmd_(filtros.desde) : null;
  var hasta = filtros.hasta ? RV_parseYmd_(filtros.hasta) : null;
  if (!(desde && hasta)){
    if (p==='anual'){ desde = new Date(y,0,1,0,0,0); hasta = new Date(y,11,31,23,59,59); }
    else if (p==='mensual'){ var last = new Date(y, m, 0).getDate(); desde=new Date(y,m-1,1,0,0,0); hasta=new Date(y,m-1,last,23,59,59); }
    else if (p==='quincenal'){ var startDay=(q===1)?1:16; var endDay=(q===1)?15:(new Date(y,m,0).getDate()); desde=new Date(y,m-1,startDay,0,0,0); hasta=new Date(y,m-1,endDay,23,59,59); }
    else if (p==='semanal'){ var start=new Date(ref.getFullYear(),ref.getMonth(),ref.getDate(),0,0,0); var end=new Date(start); end.setDate(start.getDate()+6); end.setHours(23,59,59,0); desde=start; hasta=end; }
    else if (p==='diario'){ desde=new Date(ref.getFullYear(),ref.getMonth(),ref.getDate(),0,0,0); hasta=new Date(ref.getFullYear(),ref.getMonth(),ref.getDate(),23,59,59); }
  } else {
    hasta.setHours(23,59,59,0);
  }

  var qtxt = RV_norm_(filtros.q||'');
  var sucSel = String(filtros.nombreSucursal||'').trim();

  var out = [];
  for (var i=0;i<(rows||[]).length;i++){
    var it = rows[i] || {};
    var f = RV_parseYmd_(it.fecha);
    if (!f) continue;
    if (desde && f < desde) continue;
    if (hasta && f > hasta) continue;
    if (sucSel && String(it.sucursal||'').trim() !== sucSel) continue;
    if (qtxt){
      var blob = RV_norm_(it.descripcion||'');
      if (blob.indexOf(qtxt) === -1) continue;
    }
    out.push(it);
  }
  return out;
}


function RV_resumen_(rows){
  var total = 0, cantidad = 0;
  var porMetodoPago = {};
  for (var i=0;i<(rows||[]).length;i++){
    var r = rows[i] || {};
    var m = String(r.metodo_pago||'').trim();

    total += Number(r.total_linea||0) || 0;
    cantidad += Number(r.cantidad||0) || 0;
    porMetodoPago[m] = (porMetodoPago[m]||0) + (Number(r.total_linea||0)||0);
  }
  function _toArr(obj){ var a=[]; for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj,k)){ a.push({ metodoPago: k||'(sin dato)', total: obj[k] }); } a.sort(function(a,b){ return (b.total||0)-(a.total||0); }); return a; }
  return { total: total, registros: (rows||[]).length, cantidad: cantidad, porMetodoPago: _toArr(porMetodoPago) };
}

function RV_renderReporteVentasHTML_Lite(payload){
  var list    = (payload && payload.list)    || [];
  var resumen = (payload && payload.resumen) || {};
  var meta    = (payload && payload.meta)    || {};
  var filtros = (payload && payload.filtros) || {};

  var titulo = RV_htmlEsc_('Reporte de ventas');
  var usuario  = RV_htmlEsc_(meta.usuario || '');
  var generado = RV_fmtFechaES_((new Date().getFullYear())+'-'+('0'+(new Date().getMonth()+1)).slice(-2)+'-'+('0'+new Date().getDate()).slice(-2));
  var etiqueta = RV_htmlEsc_(RV_periodoEtiqueta_(filtros));
  var sucTxt   = RV_htmlEsc_( (filtros.nombreSucursal ? filtros.nombreSucursal : 'Todas las sucursales') );

  var h = [];
  h.push('<!doctype html><html><head><meta charset="utf-8"/>');
  h.push('<style>');
  h.push('body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:28px;}');
  h.push('h1{font-size:20px;margin:0 0 4px 0} .meta{color:#555;margin:2px 0 14px 0;font-size:12px}');
  h.push('.kpis{display:flex;gap:12px;margin:8px 0 16px 0}');
  h.push('.kpi{border:1px solid #ddd;border-radius:8px;padding:10px 12px;min-width:160px}');
  h.push('.kpi .lbl{color:#666;font-size:12px} .kpi .val{font-size:18px;font-weight:600;margin-top:2px}');
  h.push('table{width:100%;border-collapse:collapse;margin-top:12px;font-size:12px}');
  h.push('th,td{border:1px solid #ddd;padding:6px 8px;vertical-align:top}');
  h.push('th{background:#f5f5f5;text-align:left}');
  h.push('tfoot td{font-weight:600}.section{margin-top:18px}');
  h.push('</style></head><body>');

  h.push('<h1>'+titulo+'</h1>');
  h.push('<div class="meta">Generado por: '+usuario+' · '+etiqueta+' · '+sucTxt+'</div>');

  h.push('<div class="kpis">');
  h.push('<div class="kpi"><div class="lbl">Total</div><div class="val">'+RV_fmtL_Seguro_(resumen.total||0)+'</div></div>');
  h.push('<div class="kpi"><div class="lbl">Registros</div><div class="val">'+(resumen.registros||0)+'</div></div>');
  h.push('<div class="kpi"><div class="lbl">Unidades</div><div class="val">'+(resumen.cantidad||0)+'</div></div>');
  h.push('</div>');

  h.push('<table>');
  h.push('<thead><tr><th>Fecha</th><th>Descripción</th><th style="text-align:right">Cant.</th><th style="text-align:right">Precio</th><th style="text-align:right">Sub Total</th><th style="text-align:right">Descuento</th><th style="text-align:right">Total línea</th><th>Método de pago</th><th>Sucursal</th></tr></thead>');
  h.push('<tbody>');
  for (var i=0;i<list.length;i++){
    var r = list[i]||{};
    h.push('<tr>');
    h.push('<td>'+RV_htmlEsc_(RV_fmtFechaES_(r.fecha))+'</td>');
    h.push('<td>'+RV_htmlEsc_(String(r.descripcion||''))+'</td>');
    h.push('<td style="text-align:right">'+(Number(r.cantidad||0)||0)+'</td>');
    h.push('<td style="text-align:right">'+RV_fmtL_Seguro_(Number(r.precio||0)||0)+'</td>');
  var _sub = (typeof r.sub_total!=='undefined') ? Number(r.sub_total||0) : (Number(r.cantidad||0)*Number(r.precio||0));
  var _des = (typeof r.descuento!=='undefined') ? Number(r.descuento||0) : Math.max(0, _sub - Number(r.total_linea||0));
  h.push('<td style="text-align:right">'+RV_fmtL_Seguro_(_sub)+'</td>');
  h.push('<td style="text-align:right">'+RV_fmtL_Seguro_(_des)+'</td>');
  h.push('<td style="text-align:right">'+RV_fmtL_Seguro_(Number(r.total_linea||0)||0)+'</td>');
h.push('<td>'+RV_htmlEsc_(String(r.metodo_pago||''))+'</td>');
    h.push('<td>'+RV_htmlEsc_(String(r.sucursal||''))+'</td>');
    h.push('</tr>');
  }
  h.push('</tbody>');
  h.push('<tfoot><tr><td colSpan="6" style="text-align:right">Total</td><td style="text-align:right">'+RV_fmtL_Seguro_(resumen.total||0)+'</td><td colSpan="2"></td></tr></tfoot>');
  h.push('</table>');
  h.push('<div class="section">');
  h.push('<h2>Por método de pago</h2>');
  (function(arr){
    arr = Array.isArray(arr) ? arr : [];
    if (!arr.length){ h.push('<p style="color:#666">(sin datos)</p>'); }
    else {
      h.push('<table><thead><tr><th>metodoPago</th><th style="text-align:right">Total</th></tr></thead><tbody>');
      for (var i=0;i<arr.length;i++){
        var it = arr[i] || {};
        h.push('<tr><td>'+RV_htmlEsc_(String(it.metodoPago||''))+'</td><td style="text-align:right">'+RV_fmtMoney_(it.total||0)+'</td></tr>');
      }
      h.push('</tbody></table>');
    }
  })(resumen.porMetodoPago);
  h.push('</div>');


  h.push('</body></html>');
  return h.join('');
}

function generarReporteVentasPDF_Lite(filtros, meta){
  try{
    filtros = (typeof filtros === 'string') ? (filtros ? JSON.parse(filtros): {}) : (filtros || {});
    meta    = (typeof meta    === 'string') ? (meta    ? JSON.parse(meta)   : {}) : (meta    || {});

    var res = bootstrapReportesVentas();
    res = (typeof res === 'string') ? JSON.parse(res) : (res || {});
    var rows = Array.isArray(res.data) ? res.data : [];

    var filtrados = RV_filtrar_(rows, filtros);
    var resumen = RV_resumen_(filtrados);

    var payload = { list: filtrados, resumen: resumen, meta: meta, filtros: filtros };
    var html = RV_renderReporteVentasHTML_Lite(payload);
    var output = HtmlService.createHtmlOutput(html).setWidth(1024).setHeight(768);
    var blob = output.getBlob().setName('Reporte_Ventas.html');
    var pdf  = blob.getAs('application/pdf').setName('Reporte_Ventas.pdf');

    return JSON.stringify({ ok:true, base64: Utilities.base64Encode(pdf.getBytes()), fileName: pdf.getName() });
  }catch(err){
    return JSON.stringify({ ok:false, message: 'Error en generarReporteVentasPDF_Lite: '+err });
  }
}

/** ===== Envío por Gmail API (Advanced Gmail) ===== */

function sendReportEmailGmail(payload){
  try{
    payload = (typeof payload === 'string') ? (payload ? JSON.parse(payload) : {}) : (payload || {});
    var to = String(payload.to||'').trim();
    var subject = String(payload.subject||'').trim() || 'Reporte';
    var htmlBody = String(payload.htmlBody||'');
    var filename = String(payload.filename||'Reporte.pdf');
    var base64 = String(payload.base64||'').replace(/^data:application\/pdf;base64,/, '');

    if (!to) throw new Error('Falta destinatario');

    // Prefer Gmail Advanced Service if available
    try{
      if (typeof Gmail !== 'undefined' && Gmail.Users && Gmail.Users.Messages && Gmail.Users.Messages.send){
        var nl = "\r\n";
        var boundary = "foo_bar_"+(new Date().getTime());
        var parts = [];
        parts.push('MIME-Version: 1.0');
        parts.push('To: ' + to);
        parts.push('Subject: ' + subject);
        parts.push('Content-Type: multipart/mixed; boundary="' + boundary + '"');
        parts.push('');
        parts.push('--'+boundary);
        parts.push('Content-Type: text/html; charset="UTF-8"');
        parts.push('Content-Transfer-Encoding: 7bit');
        parts.push('');
        parts.push(htmlBody);
        parts.push('');
        parts.push('--'+boundary);
        parts.push('Content-Type: application/pdf; name="'+filename+'"');
        parts.push('Content-Transfer-Encoding: base64');
        parts.push('Content-Disposition: attachment; filename="'+filename+'"');
        parts.push('');
        parts.push(base64);
        parts.push('');
        parts.push('--'+boundary+'--');

        var raw = Utilities.base64EncodeWebSafe(parts.join('\r\n'));
        var sent = Gmail.Users.Messages.send({ raw: raw }, 'me');
        return JSON.stringify({ ok:true, id: (sent && sent.id) });
      }
    }catch(inner){ /* fall back to MailApp below */ }

    // Fallback using MailApp
    var bytes = Utilities.base64Decode(base64);
    var blob = Utilities.newBlob(bytes, 'application/pdf', filename);
    MailApp.sendEmail({ to: to, subject: subject, htmlBody: htmlBody, attachments: [blob] });
    return JSON.stringify({ ok:true, via: 'MailApp' });
  }catch(err){
    return JSON.stringify({ ok:false, message: 'Error en sendReportEmailGmail: '+err });
  }
}
