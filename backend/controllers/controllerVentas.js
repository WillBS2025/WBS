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
    // Acepta nombres con y sin guion bajo
    var idxId   = __V_idxOfAny__(head,['iddescuento','id','id_descuento']);
    var idxNom  = __V_idxOfAny__(head,['nombredescuento','nombre','nombre_descuento']);
    var idxFec  = __V_idxOfAny__(head,['fechacreacion','fecha_creacion','fechacrecion']);
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
    try{ out.sort(function(a,b){ var ta=(a._createdAt||Date.parse(a.fecha)||0); var tb=(b._createdAt||Date.parse(b.fecha)||0); var d=tb-ta; if(d!==0) return d; return Number(b.id_factura||0)-Number(a.id_factura||0); }); }catch(_){ }
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
    var next = __V_nextIdGeneric__(sh, ['iddescuento','id','id_descuento']);
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
      if (key==='iddescuento' || key==='id' || key==='id_descuento') return obj.id_descuento;
      if (key==='nombredescuento' || key==='nombre' || key==='nombre_descuento') return obj.nombre_descuento;
      if (key==='fechacreacion' || key==='fecha_creacion' || key==='fechacrecion') return obj.fecha_creacion;
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
    var idxId   = __V_idxOfAny__(head,['iddescuento','id','id_descuento']);
    var idxNom  = __V_idxOfAny__(head,['nombredescuento','nombre','nombre_descuento']);
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
        return JSON.stringify({ ok:true }); // RESTORE_STOCK_ON_DELETE
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
    if (!data || data.length < 2) {
      return JSON.stringify({ ok:false, message:'No hay datos' });
    }

    var head  = data[0].map(String);
    var idxId = __V_idxOfAny__(head, ['iddescuento','id','id_descuento']);
    var sid   = String(id || '').trim();

    for (var r = 1; r < data.length; r++){
      var row = data[r];
      var rid = String(idxId >= 0 ? row[idxId] : '').trim();

      if (rid === sid){
        sh.deleteRow(r + 1);
        return JSON.stringify({ ok:true });
      }
    }

    return JSON.stringify({ ok:false, message:'No encontrado' });
  } catch (err){
    return JSON.stringify({ ok:false, message:'Error al eliminar descuento: ' + err });
  }
}

/** Solo descuentos ACTIVO(s) para el formulario de ventas */
function listarDescuentosActivosVenta(){
  try{
    var sh = _getSheetDescuentos_();
    var data = sh.getDataRange().getValues();
    if (!data || data.length < 2) return JSON.stringify({ ok:true, data: [] });
    var head = data[0].map(String);
    var idxId   = __V_idxOfAny__(head, ['iddescuento','id','id_descuento']);
    var idxNom  = __V_idxOfAny__(head, ['nombredescuento','nombre','nombre_descuento']);
    var idxPor  = __V_idxOfAny__(head, ['porcentaje']);
    var idxEst  = __V_idxOfAny__(head, ['estado']);
    var out = [];
    for (var r=1;r<data.length;r++){
      var row = data[r];
      var est = String(idxEst>=0?row[idxEst]:'Activo').toLowerCase();
      if (est !== 'activo') continue;
      var p = Number((idxPor>=0?row[idxPor]:0) || 0);
      var factor = (p > 1) ? (p/100) : p; // normaliza 15 -> 0.15
      out.push({
        id_descuento: (idxId>=0?row[idxId]:r) || r,
        nombre_descuento: (idxNom>=0?row[idxNom]:'') || '',
        porcentaje: p,
        factor: factor
      });
    }
    return JSON.stringify({ ok:true, data: out });
  }catch(err){
    return JSON.stringify({ ok:false, message:'Error al listar descuentos activos: '+err });
  }
}

function _getSheetProductos_(){
  var name = (typeof env_==='function' && (env_().SH_PRODUCTOS || env_().SH_PRODUCTOS2)) || 'productos';
  try{
    var sh = obtenerSheet((typeof env_==='function' && env_().SH_PRODUCTOS) || 'productos');
    if (sh) return sh;
  }catch(e){}
  return obtenerSheet((typeof env_==='function' && env_().SH_PRODUCTOS2) || 'productos2');
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
function __V_updateProductoStock__(nombre, sucursal, delta){
  try{
    var sh = _getSheetProductos_();
    var head = __V_head__(sh);
    var m = __V_headerIndexMap__(head);
    var idxNom = (m['nombreproducto']!=null) ? m['nombreproducto']
               : (m['nombre']!=null) ? m['nombre']
               : (m['producto']!=null) ? m['producto']
               : (m['descripcion']!=null) ? m['descripcion'] : -1;
    var idxStock = (m['stock']!=null) ? m['stock']
                 : (m['existencia']!=null) ? m['existencia'] : -1;
    var idxSuc = (m['nombresucursal']!=null) ? m['nombresucursal']
               : (m['sucursal']!=null) ? m['sucursal']
               : (m['nombre_sucursal']!=null) ? m['nombre_sucursal'] : -1;
    if (idxNom<0 || idxStock<0) return false;
    var last = sh.getLastRow();
    for (var r=2; r<=last; r++){
      var row = sh.getRange(r,1,1,head.length).getValues()[0];
      var n = String(row[idxNom]||'').trim();
      var s = (idxSuc>=0 ? String(row[idxSuc]||'').trim() : '');
      if (n === String(nombre||'').trim() && (!sucursal || (idxSuc<0) || s === String(sucursal||'').trim())){
        var cur = Number(row[idxStock]||0);
        var nxt = cur + Number(delta||0);
        if (!isFinite(nxt)) nxt = cur;
        if (nxt < 0) nxt = 0;
        row[idxStock] = nxt;
        sh.getRange(r,1,1,head.length).setValues([row]);
        return true;
      }
    }
    return false;
  }catch(e){ return false; }
}


/** Devuelve el stock actual (número) de un producto por sucursal. */
function __V_getProductoStock__(nombre, sucursal){
  try{
    var sh = _getSheetProductos_();
    var head = __V_head__(sh);
    var m = __V_headerIndexMap__(head);
    var idxNom = (m['nombreproducto']!=null) ? m['nombreproducto']
               : (m['nombre']!=null) ? m['nombre']
               : (m['producto']!=null) ? m['producto']
               : (m['descripcion']!=null) ? m['descripcion'] : -1;
    var idxStock = (m['stock']!=null) ? m['stock']
                 : (m['existencia']!=null) ? m['existencia'] : -1;
    var idxSuc = (m['nombresucursal']!=null) ? m['nombresucursal']
               : (m['sucursal']!=null) ? m['sucursal']
               : (m['nombre_sucursal']!=null) ? m['nombre_sucursal'] : -1;
    if (idxNom<0 || idxStock<0) return 0;
    var last = sh.getLastRow();
    var nom = String(nombre||'').trim();
    var suc = String(sucursal||'').trim();
    for (var r=2; r<=last; r++){
      var row = sh.getRange(r,1,1,head.length).getValues()[0];
      var n = String(row[idxNom]||'').trim();
      var s = (idxSuc>=0 ? String(row[idxSuc]||'').trim() : '');
      if (n === nom && (!suc || (idxSuc<0) || s === suc)){
        var cur = Number(row[idxStock]||0);
        return isFinite(cur) ? cur : 0;
      }
    }
    return 0;
  }catch(e){ return 0; }
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
        empleado: __V_get(m, row, ['empleado'], ''),
        sub_total: Number(__V_get(m, row, ['subtotal','sub_total','sub total'], 0) || 0),
        descuento: Number(__V_get(m, row, ['descuento'], 0) || 0),
        total: Number(__V_get(m, row, ['total'], 0) || 0),
        metodo_pago: __V_get(m, row, ['metododepago','metodopago','metodo_pago','pago'], ''),
      };
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
    var id = Number(obj.id_factura||0) || __V_nextIdFacturas__();

    // === Validación de stock por producto (bloquea si no hay suficiente) ===
    try{
      var req = {};
      var itemsChk = (obj.items || []);
      for (var ii=0; ii<itemsChk.length; ii++){
        var itv = itemsChk[ii] || {};
        if (String(itv.tipo||'').toLowerCase() === 'producto'){
          var desc = String(itv.descripcion||'').trim();
          if (desc){
            req[desc] = (req[desc]||0) + Number(itv.cantidad||0);
          }
        }
      }
      var insuf = [];
      for (var nombreP in req){
        if (!req.hasOwnProperty(nombreP)) continue;
        var disp = __V_getProductoStock__(nombreP, __resolveSucursal__(obj.usuario)||obj.sucursal||'');
        var sol  = Number(req[nombreP]||0);
        if (!isFinite(disp)) disp = 0;
        if (disp <= 0){
          insuf.push({ descripcion: nombreP, solicitado: sol, disponible: 0 });
        }else if (disp < sol){
          insuf.push({ descripcion: nombreP, solicitado: sol, disponible: disp });
        }
      }
      if (insuf.length){
        var code = insuf.some(function(d){ return Number(d.disponible||0) <= 0; }) ? 'AGOTADO' : 'STOCK_INSUF';
        return JSON.stringify({ ok:false, code: code, message: (code==='AGOTADO' ? 'Producto agotado' : 'Stock insuficiente'), details: insuf });
      }
    }catch(_){}


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

    var items = obj.items || [];
    if (items && items.length){
      var rowsD = [];
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

    try{
      for (var k=0;k<items.length;k++){
        var it2 = items[k]||{};
        if (String(it2.tipo||'').toLowerCase()==='producto'){
          __V_updateProductoStock__(String(it2.descripcion||''), String(obj.sucursal||''), -Number(it2.cantidad||0));
        }
      }
    }catch(e){}

    return JSON.stringify({ ok:true, id_factura: id });
  } catch(err){
    return JSON.stringify({ ok:false, message: 'Error al crear venta: '+err });
  }
}


/** ========== NUEVAS FUNCIONES EXPUESTAS PARA LA VISTA VENTAS ========== */

function listarDetalleFactura(id){
  try{
    var mapaTipos = {};
    try{
      var shS = obtenerSheet((env_().SH_SERVICIOS||'servicios'));
      var arrS = (typeof _read==='function' ? _read(shS) : []);
      for (var s=0; s<arrS.length; s++){
        var rs = arrS[s] || {};
        var nomS = String(rs.nombre_servicio||rs.nombreServicio||rs.nombre||rs.descripcion||'').trim();
        if (nomS) mapaTipos[nomS] = 'servicio';
      }
    }catch(e){}
    try{
      var hojaProductos = (env_().SH_PRODUCTOS || env_().SH_PRODUCTOS2 || 'productos');
      var shP = obtenerSheet(hojaProductos);
      var arrP = (typeof _read==='function' ? _read(shP) : []);
      for (var p=0; p<arrP.length; p++){
        var rp = arrP[p] || {};
        var nomP = String(rp.nombreProducto||rp.nombre||rp.descripcion||'').trim();
        if (nomP) mapaTipos[nomP] = 'producto';
      }
    }catch(e){}
  }catch(e){ var mapaTipos = {}; }

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
        out.push({ tipo: mapaTipos[desc]||'', descripcion: desc, cantidad: cant, precio: pre, total: tot });
      }
    }
    return JSON.stringify({ ok:true, data: out });
  }catch(err){
    return JSON.stringify({ ok:false, message: 'Error al listar detalle: '+err });
  }
}


/** Prefetch de servicios y productos por sucursal con cache (5 min). */
function bootstrapVentas(sucursal){
  try{
    sucursal = String(sucursal||'').trim();
    var cache = (CacheService && CacheService.getScriptCache && CacheService.getScriptCache()) || null;
    var key = 'VENTAS_BOOTSTRAP_'+(env_().ID_DATABASE||'')+'_'+sucursal;
    if (cache){
      var hit = cache.get(key);
      if (hit) return hit;
    }
    var out = { ok:true, servicios:[], productos:[] };

    try{
      var shS = obtenerSheet((env_().SH_SERVICIOS||'servicios'));
      var arrS = (typeof _read==='function' ? _read(shS) : []);
      for (var i=0;i<arrS.length;i++){
        var r = arrS[i]||{};
        var est = String(r.estado||'').toLowerCase().trim();
        if (est && est!=='activo') continue;
        var suc = String(r.nombre_sucursal||r.sucursal||'').trim();
        var nom = String(r.nombre_servicio||r.nombre||r.descripcion||'').trim();
        if (sucursal && suc && suc !== sucursal) continue;
        out.servicios.push({ tipo:'servicio', descripcion: nom, precio: Number(r.precio||0) });
      }
    }catch(e){}

    try{
      var hojaProductos = (env_().SH_PRODUCTOS || env_().SH_PRODUCTOS2 || 'productos');
      var shP = obtenerSheet(hojaProductos);
      var arrP = (typeof _read==='function' ? _read(shP) : []);
      for (var j=0;j<arrP.length;j++){
        var p = arrP[j]||{};
        var sucP = String(p.nombreSucursal||p.sucursal||p.nombre_sucursal||'').trim();
        var nomP = String(p.nombreProducto||p.nombre||p.descripcion||'').trim();
        if (sucursal && sucP && sucP !== sucursal) continue;
        var precio = Number(p.precio || p.precio_venta || p.precioVenta || p.precio_compra || p.costo || 0);
        out.productos.push({ tipo:'producto', descripcion: nomP, precio: precio, stock: Number(p.stock||0) });
      }
    }catch(e){}

    try{
      out.servicios.sort(function(a,b){ return String(a.descripcion).localeCompare(String(b.descripcion)); });
      out.productos.sort(function(a,b){ return String(a.descripcion).localeCompare(String(b.descripcion)); });
    }catch(e){}

    var resp = JSON.stringify(out);
    if (cache){ cache.put(key, resp, 300); }
    return resp;
  }catch(err){
    return JSON.stringify({ ok:false, message:'Error en bootstrapVentas: '+err });
  }
}

function buscarItemsVenta(query, sucursal, tipo){
  try{
    var boot = JSON.parse(bootstrapVentas(sucursal)||'{}');
    if (boot && boot.ok){
      var base=[];
      if (!tipo || String(tipo).toLowerCase()==='servicio') base=base.concat(boot.servicios||[]);
      if (!tipo || String(tipo).toLowerCase()==='producto') base=base.concat(boot.productos||[]);
      if (query){ var q=String(query||'').toLowerCase(); base = base.filter(function(it){return String(it.descripcion||'').toLowerCase().indexOf(q)!==-1;}); }
      if (base.length){ return JSON.stringify({ ok:true, items: base }); }
    }
  }catch(_){ }

  try{
    query = String(query||'').toLowerCase().trim();
    sucursal = String(sucursal||'').trim();
    tipo = (tipo ? String(tipo).toLowerCase() : '');
    var items = [];

    try{
      if (!tipo || tipo === 'servicio') {
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
      }
    }catch(e){}

    try{
      if (!tipo || tipo === 'producto') {
        var hojaProductos = (env_().SH_PRODUCTOS || env_().SH_PRODUCTOS2 || 'productos');
        var shP = obtenerSheet(hojaProductos);
        var arrP = (typeof _read==='function' ? _read(shP) : []);
        for (var j=0;j<arrP.length;j++){
          var p = arrP[j] || {};
          var sucP = String(p.nombreSucursal||p.sucursal||p.nombre_sucursal||'').trim();
          var nomP = String(p.nombreProducto||p.nombre||p.descripcion||'').trim();
          if (sucursal && sucP && sucP !== sucursal) continue;
          if (query && nomP.toLowerCase().indexOf(query) === -1) continue;
          var precio = Number(p.precio || p.precio_venta || p.precioVenta || p.precio_compra || p.costo || 0);
          items.push({ tipo:'producto', descripcion: nomP, precio: precio });
        }
      }
    }catch(e){}

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

function __V_puedeEditarFactura__(fecha, rol){
  try{
    rol = String(rol||'').toLowerCase();
    if (rol === 'super_admin') return true;
    var t = (fecha && Object.prototype.toString.call(fecha)==='[object Date]' && !isNaN(fecha)) ? fecha.getTime() : Date.parse(fecha);
    var ms = isNaN(t) ? NaN : t;
    if (!isFinite(ms)) return false;
    var now = Date.now();
    return (now - ms) < (5*60*1000);
  }catch(_){ return false; }
}

function eliminarVenta(id_factura, rol){
  try{
    id_factura = String(id_factura||'').trim();
    if (!id_factura) return JSON.stringify({ ok:false, message:'ID requerido' });
    var shF = _getSheetFacturas_();
    var data = shF.getDataRange().getValues();
    if (!data || data.length<2) return JSON.stringify({ ok:false, message:'No hay datos' });
    var head = data[0];
    var m = __V_headerIndexMap__(head);
    var idxId = (m['id_factura']!=null) ? m['id_factura'] :
                (m['id']!=null) ? m['id'] :
                (m['factura']!=null) ? m['factura'] : -1;
    var idxFecha = (m['fecha']!=null) ? m['fecha'] :
                   (m['fecharegistro']!=null) ? m['fecharegistro'] :
                   (m['createdat']!=null) ? m['createdat'] : -1;
    var rowIndex = -1;
    var fechaVal = '';
    for (var r=1; r<data.length; r++){
      if (String(data[r][idxId]) === id_factura){
        rowIndex = r+1;
        fechaVal = (idxFecha>=0 ? data[r][idxFecha] : '');
        break;
      }
    }
    if (rowIndex < 0) return JSON.stringify({ ok:false, message:'No encontrado' });
    if (!__V_puedeEditarFactura__(fechaVal, rol)){
      return JSON.stringify({ ok:false, message:'Fuera de ventana de edición (5 min) para rol '+rol });
    }
    try{
      var shD = _getSheetDetalle_();
      var headD = __V_head__(shD);
      var mapD = __V_headerIndexMap__(headD);
      var idxIdF = (mapD['id_factura']!=null)?mapD['id_factura']:((mapD['id']!=null)?mapD['id']:(mapD['factura']!=null?mapD['factura']:-1));
      var idxDesc = (mapD['descripcion']!=null)?mapD['descripcion']:((mapD['producto_servicio']!=null)?mapD['producto_servicio']:-1);
      var idxCant = (mapD['cantidad']!=null)?mapD['cantidad']:-1;
      var sucFac = (m['sucursal']!=null? data[rowIndex-1][m['sucursal']] : (m['nombresucursal']!=null? data[rowIndex-1][m['nombresucursal']] : ''));
      var last = shD.getLastRow();
      var productosSet = {};
      try{
        var hojaProductos = (env_().SH_PRODUCTOS || env_().SH_PRODUCTOS2 || 'productos');
        var shP = obtenerSheet(hojaProductos);
        var arrP = (typeof _read==='function' ? _read(shP) : []);
        for (var p=0;p<arrP.length;p++){ var rp=arrP[p]||{}; var nom=String(rp.nombreProducto||rp.nombre||rp.descripcion||'').trim(); if(nom) productosSet[nom]=true; }
      }catch(e){}
      for (var rr=2; rr<=last; rr++){
        var rowD = shD.getRange(rr,1,1,headD.length).getValues()[0];
        if (String(rowD[idxIdF]) === id_factura){
          var desc = (idxDesc>=0?rowD[idxDesc]:'');
          var cant = Number(idxCant>=0?rowD[idxCant]:0);
          if (productosSet[desc]){ __V_updateProductoStock__(String(desc||''), String(sucFac||''), Number(cant||0)); }
        }
      }
    }catch(e){}

    var shD = _getSheetDetalle_();
    var headD = __V_head__(shD);
    var idxIdF = __V_idxOfAny__(headD, ['id_factura','id','factura']);
    var last = shD.getLastRow();
    for (var rr=last; rr>=2; rr--){
      var val = shD.getRange(rr,1,1,headD.length).getValues()[0];
      if (String(val[idxIdF]) === id_factura){
        shD.deleteRow(rr);
      }
    }
    shF.deleteRow(rowIndex);
    return JSON.stringify({ ok:true }); 
  }catch(err){
    return JSON.stringify({ ok:false, message:'Error al eliminar venta: '+err });
  }
}

function actualizarVenta(payload, rol){
  try{
    var obj = (typeof payload==='string') ? JSON.parse(payload) : (payload||{});
    var id = String(obj.id_factura||obj.id||'').trim();
    if (!id) return JSON.stringify({ ok:false, message:'id_factura requerido' });
    var shF = _getSheetFacturas_();
    var shD = _getSheetDetalle_();
    var headF = __V_head__(shF);
    var headD = __V_head__(shD);
    var mapF = __V_headerIndexMap__(headF);

    var idxIdF = (mapF['id_factura']!=null) ? mapF['id_factura'] :
                 (mapF['id']!=null) ? mapF['id'] :
                 (mapF['factura']!=null) ? mapF['factura'] : -1;
    var idxFechaF = (mapF['fecha']!=null) ? mapF['fecha'] :
                    (mapF['fecharegistro']!=null) ? mapF['fecharegistro'] :
                    (mapF['createdat']!=null) ? mapF['createdat'] : -1;
    var lastF = shF.getLastRow();
    var rowIndex = -1; var fechaVal = '';
    for (var r=2; r<=lastF; r++){
      var row = shF.getRange(r,1,1,headF.length).getValues()[0];
      if (String(row[idxIdF]) === id){
        rowIndex = r; fechaVal = (idxFechaF>=0 ? row[idxFechaF] : '');
        break;
      }
    }
    if (rowIndex < 0) return JSON.stringify({ ok:false, message:'No encontrado' });
    if (!__V_puedeEditarFactura__(fechaVal, rol)){
      return JSON.stringify({ ok:false, message:'Fuera de ventana de edición (5 min) para rol '+rol });
    }

    var rowF = shF.getRange(rowIndex,1,1,headF.length).getValues()[0];
    for (var c=0;c<headF.length;c++){
      var k = __V_normalizeHeader__(headF[c]);
      if (k==='empleado') rowF[c] = obj.empleado || rowF[c];
      else if (k==='metodo_pago' || k==='metododepago' || k==='metodopago') rowF[c] = obj.metodo_pago || rowF[c];
      else if (k==='descuento') rowF[c] = Number(obj.descuento||0);
      else if (k==='sub_total' || k==='subtotal') rowF[c] = Number(obj.sub_total||0);
      else if (k==='total') rowF[c] = Number(obj.total||0);
    }
    shF.getRange(rowIndex,1,1,headF.length).setValues([rowF]);

    var mapD = __V_headerIndexMap__(headD);
    var idxIdFacturaD = (mapD['id_factura']!=null) ? mapD['id_factura'] :
                        (mapD['id']!=null) ? mapD['id'] :
                        (mapD['factura']!=null) ? mapD['factura'] : -1;

    var lastD = shD.getLastRow();
    for (var rr=lastD; rr>=2; rr--){
      var rowD = shD.getRange(rr,1,1,headD.length).getValues()[0];
      if (String(rowD[idxIdFacturaD]) === id){
        var mapOld = __V_headerIndexMap__(headD);
        var idxDescOld = (mapOld['descripcion']!=null)?mapOld['descripcion']:(mapOld['producto_servicio']!=null?mapOld['producto_servicio']:-1);
        var idxCantOld = (mapOld['cantidad']!=null)?mapOld['cantidad']:-1;
        var descOld = (idxDescOld>=0?rowD[idxDescOld]:'');
        var cantOld = Number(idxCantOld>=0?rowD[idxCantOld]:0);
        __V_updateProductoStock__(String(descOld||''), String(rowF[(mapF['sucursal']!=null?mapF['sucursal']:(mapF['nombresucursal']!=null?mapF['nombresucursal']:-1))]||''), Number(cantOld||0));
        shD.deleteRow(rr);
      }
    }

    var items = obj.items || [];
    if (items && items.length){
      var nextDetId = __V_nextIdGeneric__(shD, ['id_detalle','iddetalle']);
      var rowsD = [];
      for (var i=0;i<items.length;i++){
        var it = items[i];
        var rowN = new Array(headD.length);
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
          rowN[c2] = vd;
        }
        rowsD.push(rowN);
      }
      if (rowsD.length) shD.getRange(shD.getLastRow()+1,1,rowsD.length,headD.length).setValues(rowsD);
    }
    try{
      for (var k=0;k<items.length;k++){
        var it2 = items[k]||{};
        if (String(it2.tipo||'').toLowerCase()==='producto'){
          __V_updateProductoStock__(String(it2.descripcion||''), String(rowF[(mapF['sucursal']!=null?mapF['sucursal']:(mapF['nombresucursal']!=null?mapF['nombresucursal']:-1))]||''), -Number(it2.cantidad||0));
        }
      }
    }catch(e){}
    return JSON.stringify({ ok:true }); 
  }catch(err){
    return JSON.stringify({ ok:false, message:'Error al actualizar venta: '+err });
  }
}

function listarEmpleadosActivos(sucursal){
  try{
    sucursal = String(sucursal||'').trim();
    var sh = obtenerSheet((typeof env_==='function' && env_().SH_EMPLEADOS) || 'empleados');
    var data = sh.getDataRange().getValues();
    if (!data || data.length < 2) return JSON.stringify({ ok:true, data: [] });
    var head = data[0];
    var m = __V_headerIndexMap__(head);
    var idxNom = (m['nombre_empleado']!=null) ? m['nombre_empleado']
               : (m['nombre']!=null) ? m['nombre'] : -1;
    var idxSuc = (m['nombresucursal']!=null) ? m['nombresucursal']
               : (m['sucursal']!=null) ? m['sucursal']
               : (m['nombre_sucursal']!=null) ? m['nombre_sucursal'] : -1;
    var idxEst = (m['estado']!=null) ? m['estado'] : -1;
    var out = [];
    for (var r=1;r<data.length;r++){
      var row = data[r];
      var est = String(idxEst>=0 ? row[idxEst] : 'Activo').toLowerCase().trim();
      if (est !== 'activo') continue;
      var nom = String(idxNom>=0 ? row[idxNom] : '').trim();
      var suc = String(idxSuc>=0 ? row[idxSuc] : '').trim();
      if (sucursal && suc && suc !== sucursal) continue;
      if (nom) out.push({ nombre: nom, sucursal: suc });
    }
    return JSON.stringify({ ok:true, data: out });
  }catch(err){
    return JSON.stringify({ ok:false, message: 'Error al listar empleados: '+err });
  }
}
