/**
 * controllerVentas.js
 * Funciones de Sucursales y Descuentos usadas por la vista Ventas.
 * Nota: se asume que existen helpers globales como `obtenerSheet` y `env_`.
 */

/** ==== Helpers locales seguros ==== */
function __V_normKey__(s){
  return String(s||'').toLowerCase().replace(/\s+/g,'').replace(/\./g,'');
}
function __V_head__(sh){ 
  return sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String); 
}
function __V_idxOfAny__(head, names){
  var h = head.map(__V_normKey__);
  for (var i=0;i<h.length;i++){
    for (var j=0;j<names.length;j++){ if (h[i] === names[j]) return i; }
  }
  return -1;
}
function __V_nextIdGeneric__(sh, idCandidates){
  var head = __V_head__(sh);
  var idx = __V_idxOfAny__(head, idCandidates);
  var last = sh.getLastRow();
  if (last < 2 || idx < 0) return 1;
  var col = idx + 1;
  var vals = sh.getRange(2, col, last-1, 1).getValues();
  var max = 0;
  for (var i=0;i<vals.length;i++){
    var v = Number(vals[i][0] || 0);
    if (v > max) max = v;
  }
  return (max||0)+1;
}

/** ==== Sucursales ==== */
/** Listado simple de sucursales (nombreSucursal) */
function listarSucursales(){
  try{
    var sh = obtenerSheet((typeof env_==='function' && env_().SH_SUCURSALES) || 'sucursales');
    var data = sh.getDataRange().getValues();
    if (!data || data.length < 2) return JSON.stringify({ ok:true, sucursales: [] });
    var head = data[0].map(String);
    var nameIdx = __V_idxOfAny__(head, ['nombresucursal','sucursal','nombresucursales','nombresucursale']);
    var out = [];
    for (var r=1;r<data.length;r++){
      var row = data[r];
      var nom = (nameIdx>=0 ? row[nameIdx] : row[1]) || '';
      if (String(nom).trim()) out.push(String(nom).trim());
    }
    return JSON.stringify({ ok:true, sucursales: out });
  }catch(err){
    return JSON.stringify({ ok:false, message: 'Error al listar sucursales: ' + err });
  }
}

/** ==== Descuentos (flex headers, con estado) ==== */
function _getSheetDescuentos_(){
  var name = (typeof env_==='function' && env_().SH_DESCUENTOS) || 'descuentos';
  return obtenerSheet(name);
}

function listarDescuentos(){
  try{
    var sh = _getSheetDescuentos_();
    var data = sh.getDataRange().getValues();
    if (!data || data.length<2) return JSON.stringify({ ok:true, data: [] });
    var head = data[0].map(String);
    var idxId   = __V_idxOfAny__(head,['iddescuento','id']);
    var idxNom  = __V_idxOfAny__(head,['nombredescuento','nombre']);
    var idxFec  = __V_idxOfAny__(head,['fechacreacion','fechacrecion']);
    var idxPor  = __V_idxOfAny__(head,['porcentaje']);
    var idxEst  = __V_idxOfAny__(head,['estado']);
    var out=[];
    for (var r=1;r<data.length;r++){
      var row=data[r];
      out.push({
        id_descuento: (idxId>=0?row[idxId]:r) || r,
        nombre_descuento: (idxNom>=0?row[idxNom]:'') || '',
        fecha_creacion: (idxFec>=0?row[idxFec]:'') || '',
        porcentaje: Number((idxPor>=0?row[idxPor]:0) || 0),
        estado: (idxEst>=0?row[idxEst]:'Activo') || 'Activo'
      });
    }
    return JSON.stringify({ ok:true, data: out });
  }catch(err){
    return JSON.stringify({ ok:false, message: 'Error al listar descuentos: ' + err });
  }
}

function crearDescuento(payload){
  try{
    var p = (typeof payload==='string') ? JSON.parse(payload||'{}') : (payload||{});
    var sh = _getSheetDescuentos_();
    var head = __V_head__(sh);
    var next = __V_nextIdGeneric__(sh, ['iddescuento','id']);
    var tz = Session.getScriptTimeZone && Session.getScriptTimeZone() || 'America/Guatemala';
    var fecha = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm');
    var obj = {
      id_descuento: next,
      nombre_descuento: p.nombre_descuento || '',
      fecha_creacion: fecha,
      porcentaje: Number(p.porcentaje || 0),
      estado: p.estado || 'Activo'
    };
    var row = head.map(function(h){ 
      var key=__V_normKey__(h);
      if (key==='iddescuento' || key==='id') return obj.id_descuento;
      if (key==='nombredescuento' || key==='nombre') return obj.nombre_descuento;
      if (key==='fechacreacion' || key==='fechacrecion') return obj.fecha_creacion;
      if (key==='porcentaje') return obj.porcentaje;
      if (key==='estado') return obj.estado;
      return '';
    });
    sh.appendRow(row);
    return JSON.stringify({ ok:true, id_descuento: next });
  }catch(err){
    return JSON.stringify({ ok:false, message:'Error al crear descuento: '+err });
  }
}

function actualizarDescuento(payload){
  try{
    var p = (typeof payload==='string') ? JSON.parse(payload||'{}') : (payload||{});
    var sh = _getSheetDescuentos_();
    var data = sh.getDataRange().getValues();
    if (!data || data.length<2) return JSON.stringify({ ok:false, message:'No hay datos' });
    var head = data[0].map(String);
    var idxId   = __V_idxOfAny__(head,['iddescuento','id']);
    var idxNom  = __V_idxOfAny__(head,['nombredescuento','nombre']);
    var idxPor  = __V_idxOfAny__(head,['porcentaje']);
    var idxEst  = __V_idxOfAny__(head,['estado']);
    var id = String(p.id_descuento||'').trim();
    if (!id) return JSON.stringify({ ok:false, message:'ID requerido' });
    for (var r=1;r<data.length;r++){
      var row=data[r]; var rid=String(idxId>=0?row[idxId]:'').trim();
      if (rid===id){
        if (idxNom>=0) row[idxNom] = p.nombre_descuento || row[idxNom];
        if (idxPor>=0) row[idxPor] = Number(p.porcentaje || row[idxPor] || 0);
        if (idxEst>=0) row[idxEst] = p.estado || row[idxEst] || 'Activo';
        sh.getRange(r+1,1,1,head.length).setValues([row]);
        return JSON.stringify({ ok:true });
      }
    }
    return JSON.stringify({ ok:false, message:'No encontrado' });
  }catch(err){
    return JSON.stringify({ ok:false, message:'Error al actualizar descuento: '+err });
  }
}

function eliminarDescuento(id){
  try{
    var sh = _getSheetDescuentos_();
    var data = sh.getDataRange().getValues();
    if (!data || data.length<2) return JSON.stringify({ ok:false, message:'No hay datos' });
    var head = data[0].map(String);
    var idxId = __V_idxOfAny__(head,['iddescuento','id']);
    var sid = String(id||'').trim();
    for (var r=1;r<data.length;r++){
      var row=data[r]; var rid=String(idxId>=0?row[idxId]:'').trim();
      if (rid===sid){ sh.deleteRow(r+1); return JSON.stringify({ ok:true }); }
    }
    return JSON.stringify({ ok:false, message:'No encontrado' });
  }catch(err){
    return JSON.stringify({ ok:false, message:'Error al eliminar descuento: '+err });
  }
}


/** ==== Ventas / Facturas ==== */
function _getSheetFacturas_(){
  var name = (typeof env_==='function' && env_().SH_FACTURAS) || 'facturas';
  return obtenerSheet(name);
}
function _getSheetDetalle_(){
  var name = (typeof env_==='function' && env_().SH_DETALLE_FACTURA) || 'detalle_factura';
  return obtenerSheet(name);
}
function _getSheetUsuarios_(){
  var name = (typeof env_==='function' && env_().SH_REGISTRO_USUARIOS) || 'usuarios';
  return obtenerSheet(name);
}
function __V_normalizeHeader__(s){
  return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,'').replace(/[^a-z0-9_]/g,'');
}
function __V_headerIndexMap__(head){
  var map = {};
  for (var i=0;i<head.length;i++){
    map[ __V_normalizeHeader__(head[i]) ] = i;
  }
  return map;
}
function __V_get(headerMap, row, names, def){
  for (var i=0;i<names.length;i++){
    var idx = headerMap[ __V_normalizeHeader__(names[i]) ];
    if (typeof idx === 'number' && idx >= 0) return row[idx];
  }
  return def;
}
function __V_nextIdFacturas__(){
  var sh = _getSheetFacturas_();
  var head = __V_head__(sh);
  var idx = __V_idxOfAny__(head, ['id_factura','id','factura']);
  var last = sh.getLastRow();
  if (last < 2 || idx < 0) return 1;
  var col = idx + 1;
  var vals = sh.getRange(2, col, last-1, 1).getValues();
  var max = 0;
  for (var i=0;i<vals.length;i++){ var v = Number(vals[i][0]||0); if (v>max) max=v; }
  return max+1;
}
/**
 * Devuelve {usuario, sucursal} para el nombre de usuario dado.
 */
function obtenerContextoVenta(nombreUsuario){
  try{
    nombreUsuario = String(nombreUsuario||'').trim();
    var sh = _getSheetUsuarios_();
    var data = sh.getDataRange().getValues();
    if (!data || data.length < 2){
      return JSON.stringify({ usuario: nombreUsuario, sucursal: '' });
    }
    var head = data[0];
    var m = __V_headerIndexMap__(head);
    var idxUser = (m['nombreusuario'] != null) ? m['nombreusuario']
                : (m['nombre_usuario'] != null) ? m['nombre_usuario']
                : (m['usuario'] != null) ? m['usuario']
                : -1;
    var idxSuc  = (m['nombresucursal'] != null) ? m['nombresucursal']
                : (m['sucursal'] != null) ? m['sucursal']
                : (m['nombresede'] != null) ? m['nombresede']
                : (m['nombre_sucursal'] != null) ? m['nombre_sucursal']
                : -1;
    var out = { usuario: nombreUsuario, sucursal: '' };
    if (idxUser >= 0){
      for (var r=1;r<data.length;r++){
        var row = data[r];
        if (String(row[idxUser]).trim() === nombreUsuario){
          out.sucursal = (idxSuc >= 0 ? String(row[idxSuc]||'') : '');
          break;
        }
      }
    }
    return JSON.stringify(out);
  }catch(err){
    return JSON.stringify({ usuario: nombreUsuario, sucursal: '', message: String(err) });
  }
}

/**
 * Lee hoja facturas con columnas flexibles y devuelve arreglo para frontend.
 */
function listarFacturasFront(){
  try{
    var sh = _getSheetFacturas_();
    var data = sh.getDataRange().getValues();
    if (!data || data.length < 2) return JSON.stringify({ ok:true, data: [] });
    var head = data[0];
    var m = __V_headerIndexMap__(head);
    var out = [];
    for (var r=1;r<data.length;r++){
      var row = data[r];
      var obj = {
        id_factura: __V_get(m, row, ['id_factura','id','factura'], ''),
        fecha: __V_get(m, row, ['fecha','fecharegistro','createdat','creado'], ''),
        sucursal: __V_get(m, row, ['sucursal','nombresucursal','nombre_sucursal'], ''),
        usuario: __V_get(m, row, ['usuario','user'], ''),
        cliente: __V_get(m, row, ['cliente'], ''),
        empleado: __V_get(m, row, ['empleado'], ''),
        sub_total: Number(__V_get(m, row, ['subtotal','sub_total','sub total'], 0) || 0),
        descuento: Number(__V_get(m, row, ['descuento'], 0) || 0),
        total: Number(__V_get(m, row, ['total'], 0) || 0),
        metodo_pago: __V_get(m, row, ['metododepago','metodopago','metodo_pago','pago'], ''),
      };
      // timestamp para controlar ventana de edición (5 minutos)
      var t = obj.fecha;
      var ms = (t && Object.prototype.toString.call(t)==='[object Date]' && !isNaN(t)) ? t.getTime() : Date.parse(t);
      obj._createdAt = isNaN(ms) ? Date.now() : ms;
      out.push(obj);
    }
    return JSON.stringify({ ok:true, data: out });
  }catch(err){
    return JSON.stringify({ ok:false, message: 'Error al listar facturas: '+err });
  }
}

/**
 * Crea una venta en 'facturas' y sus líneas en 'detalle_factura'.
 * payload: { id_factura?, usuario, sucursal, cliente, empleado, metodo_pago, descuento, items:[{tipo,descripcion,cantidad,precio}] }
 */
function crearVenta(payload){
  try{
    var obj = (typeof payload==='string') ? JSON.parse(payload) : (payload||{});
    var shF = _getSheetFacturas_();
    var shD = _getSheetDetalle_();
    var headF = __V_head__(shF);
    var headD = __V_head__(shD);
    // id correlativo de la factura
    var id = Number(obj.id_factura||0) || __V_nextIdFacturas__();

    // Helper para obtener la sucursal desde la tabla usuarios cuando no viene en el payload
    function __resolveSucursal__(usuario){
      try{
        var shU = _getSheetUsuarios_();
        var headU = __V_head__(shU);
        var mapU  = __V_headerIndexMap__(headU);
        var idxUser = (mapU['nombreusuario'] != null) ? mapU['nombreusuario']
                    : (mapU['nombre_usuario'] != null) ? mapU['nombre_usuario']
                    : (mapU['usuario'] != null) ? mapU['usuario']
                    : -1;
        var idxSuc  = (mapU['nombresucursal'] != null) ? mapU['nombresucursal']
                    : (mapU['sucursal'] != null) ? mapU['sucursal']
                    : (mapU['nombresede'] != null) ? mapU['nombresede']
                    : (mapU['nombre_sucursal'] != null) ? mapU['nombre_sucursal']
                    : -1;
        if (idxUser < 0 || idxSuc < 0) return '';
        var last = shU.getLastRow();
        if (last < 2) return '';
        var data = shU.getRange(2,1,last-1, shU.getLastColumn()).getValues();
        var user = String(usuario||'').trim();
        for (var i=0; i<data.length; i++){
          var row = data[i];
          if (String(row[idxUser]).trim() === user){
            return String(row[idxSuc]||'');
          }
        }
        return '';
      }catch(e){ return ''; }
    }

    // construir fila de facturas respetando encabezados
    var mapF = __V_headerIndexMap__(headF);
    var rowF = new Array(headF.length);
    function pickF(key, fallback){ return (obj[key] != null ? obj[key] : fallback); }

    for (var c=0;c<headF.length;c++){
      var k = __V_normalizeHeader__(headF[c]);
      var val = '';
      if (k==='id_factura' || k==='idfactura' || k==='id') val = id;
      else if (k==='fecha' || k==='fecharegistro' || k==='createdat') val = new Date();
      else if (k==='sucursal' || k==='nombresucursal'){
        var suc = pickF('sucursal','');
        if (!suc) suc = __resolveSucursal__(pickF('usuario',''));
        val = suc;
      }
      else if (k==='usuario' || k==='nombreusuario' || k==='nombre_usuario') val = pickF('usuario','');
      else if (k==='cliente') val = pickF('cliente','');
      else if (k==='empleado') val = pickF('empleado','');
      else if (k==='subtotal' || k==='sub_total') val = Number(pickF('sub_total', 0) || 0);
      else if (k==='descuento') val = Number(pickF('descuento', 0) || 0);
      else if (k==='total') {
        var totalCalc = Number(pickF('total', 0) || 0);
        if (!totalCalc){
          var sum = 0;
          var items = obj.items || [];
          for (var i=0;i<items.length;i++){
            var it = items[i]; sum += Number(it.cantidad||0) * Number(it.precio||0);
          }
          totalCalc = sum - Number(obj.descuento||0);
        }
        val = totalCalc;
      }
      else if (k==='metododepago' || k==='metodopago' || k==='metodo_pago') {
        val = pickF('metodo_pago','') || pickF('metodopago','') || pickF('metodo','');
      }
      else val = '';
      rowF[c] = val;
    }
    shF.appendRow(rowF);

    // detalle
    var items = obj.items || [];
    if (items && items.length){
      var rowsD = [];
      // id_detalle correlativo global en la hoja detalle
      var nextDetId = __V_nextIdGeneric__(shD, ['id_detalle','iddetalle']);
      for (var i=0;i<items.length;i++){
        var it = items[i];
        var rowD = new Array(headD.length);
        for (var c2=0;c2<headD.length;c2++){
          var kd = __V_normalizeHeader__(headD[c2]);
          var vd = '';
          if (kd==='id_detalle' || kd==='iddetalle') vd = nextDetId++;
          else if (kd==='id_factura' || kd==='idfactura' || kd==='idventa') vd = id;
          else if (kd==='descripcion' || kd==='producto_servicio') vd = it.descripcion || '';
          else if (kd==='cantidad') vd = Number(it.cantidad||0);
          else if (kd==='precio') vd = Number(it.precio||0);
          else if (kd==='sub_total' || kd==='subtotal') vd = Number((it.cantidad||0)*(it.precio||0));
          else if (kd==='total' || kd==='totallinea' || kd==='total_linea') vd = Number((it.cantidad||0)*(it.precio||0));
          else vd = '';
          rowD[c2] = vd;
        }
        rowsD.push(rowD);
      }
      if (rowsD.length) shD.getRange(shD.getLastRow()+1,1,rowsD.length,headD.length).setValues(rowsD);
    }

    return JSON.stringify({ ok:true, id_factura: id });
  }catch(err){
    return JSON.stringify({ ok:false, message: 'Error al crear venta: '+err });
  }
}


/** ========== NUEVAS FUNCIONES EXPUESTAS PARA LA VISTA VENTAS ========== */

/** Lista el detalle de una factura en la hoja detalle_factura por id_factura. */
function listarDetalleFactura(id){
  try{
    var sh = obtenerSheet((env_().SH_DETALLE_FACTURA||'detalle_factura'));
    var head = __V_head__(sh);
    var idxId = __V_idxOfAny__(head, ['id_factura','id','factura']);
    var idxDesc = __V_idxOfAny__(head, ['descripcion','producto_servicio','producto','servicio','concepto']);
    var idxCant = __V_idxOfAny__(head, ['cantidad','cant']);
    var idxPre  = __V_idxOfAny__(head, ['precio','precio_unitario']);
    var idxTot  = __V_idxOfAny__(head, ['total','total_linea','totallinea']);
    var out = [];
    var last = sh.getLastRow();
    id = String(id||'').trim();
    if (!id) return JSON.stringify({ ok:true, data: [] });
    for (var r=2; r<=last; r++){
      var row = sh.getRange(r,1,1,head.length).getValues()[0];
      if (String(row[idxId]) === id){
        var desc = (idxDesc>=0 ? row[idxDesc] : '');
        var cant = Number(idxCant>=0 ? row[idxCant] : 0);
        var pre  = Number(idxPre>=0  ? row[idxPre]  : 0);
        var tot  = (idxTot>=0 ? Number(row[idxTot]||0) : (cant*pre));
        out.push({ descripcion: desc, cantidad: cant, precio: pre, total: tot });
      }
    }
    return JSON.stringify({ ok:true, data: out });
  }catch(err){
    return JSON.stringify({ ok:false, message: 'Error al listar detalle: '+err });
  }
}

/** Busca items (servicios + productos) para el autocompletar del modal Nueva venta. */
function buscarItemsVenta(query, sucursal){
  try{
    query = String(query||'').toLowerCase().trim();
    sucursal = String(sucursal||'').trim();
    var items = [];

    // Servicios
    try{
      var shS = obtenerSheet((env_().SH_SERVICIOS||'servicios'));
      var arrS = (typeof _read==='function' ? _read(shS) : []);
      for (var i=0;i<arrS.length;i++){
        var r = arrS[i] || {};
        var estado = String(r.estado||'').toLowerCase();
        if (estado && estado!=='activo') continue;
        var suc = String(r.nombre_sucursal||r.sucursal||'').trim();
        var nom = String(r.nombre_servicio||r.nombre||r.descripcion||'').trim();
        if (sucursal && suc && suc !== sucursal) continue;
        if (query && nom.toLowerCase().indexOf(query) === -1) continue;
        items.push({ tipo:'servicio', descripcion: nom, precio: Number(r.precio||0) });
      }
    }catch(e){}

    // Productos
    try{
      var shP = obtenerSheet((env_().SH_PRODUCTOS||'productos'));
      var arrP = (typeof _read==='function' ? _read(shP) : []);
      for (var j=0;j<arrP.length;j++){
        var p = arrP[j] || {};
        var sucP = String(p.nombreSucursal||p.sucursal||'').trim();
        var nomP = String(p.nombreProducto||p.nombre||p.descripcion||'').trim();
        if (sucursal && sucP && sucP !== sucursal) continue;
        if (query && nomP.toLowerCase().indexOf(query) === -1) continue;
        items.push({ tipo:'producto', descripcion: nomP, precio: Number(p.precio||0) });
      }
    }catch(e){}

    // Ordenar (simple por longitud/alfabético)
    items.sort(function(a,b){
      var A=a.descripcion.length, B=b.descripcion.length;
      if (A!==B) return A-B;
      return String(a.tipo).localeCompare(String(b.tipo));
    });
    return JSON.stringify({ ok:true, items: items });
  }catch(err){
    return JSON.stringify({ ok:false, message: 'Error al buscar ítems: '+err });
  }
}
