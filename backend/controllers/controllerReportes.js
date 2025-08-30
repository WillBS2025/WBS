/**
 * controllerReportes.js
 * Une 'detalle_factura' con 'facturas' para agregar Método de pago.
 * Devuelve JSON.stringify({ ok:true, data:[...] })
 */

function __R_norm__(s){
  return String(s||'')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/\s+/g,'')
    .replace(/[^a-z0-9_]/g,'');
}
function __R_head__(sh){
  return sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
}
function __R_map__(head){
  var m={};
  for (var i=0;i<head.length;i++){ m[__R_norm__(head[i])] = i; }
  return m;
}
function __R_get__(m,row,cands,def){
  for (var i=0;i<cands.length;i++){
    var idx = m[__R_norm__(cands[i])];
    if (typeof idx === 'number' && idx >= 0) return row[idx];
  }
  return def;
}

function bootstrapReportesVentas(){
  try{
    var shDet = (typeof obtenerSheet==='function') ? obtenerSheet((env_ && env_().SH_DETALLE_FACTURA) || 'detalle_factura') : null;
    var shFac = (typeof obtenerSheet==='function') ? obtenerSheet((env_ && env_().SH_FACTURAS) || 'facturas') : null;
    if (!shDet || !shFac){
      try{
        var ss = SpreadsheetApp.getActive();
        if (ss){
          shDet = shDet || ss.getSheetByName('detalle_factura');
          shFac = shFac || ss.getSheetByName('facturas');
        }
      }catch(e){}
    }
    if (!shDet || !shFac){
      return JSON.stringify({ ok:false, message:'No se pudieron abrir las hojas detalle_factura o facturas' });
    }

    var detVals = shDet.getDataRange().getValues();
    var facVals = shFac.getDataRange().getValues();
    if (!detVals || detVals.length < 2){
      return JSON.stringify({ ok:true, data: [] });
    }

    var dH = __R_head__(shDet);
    var fH = __R_head__(shFac);
    var dM = __R_map__(dH);
    var fM = __R_map__(fH);

    var idxIdDetalle = (dM['id_detalle']!=null) ? dM['id_detalle'] : ((dM['iddetalle']!=null)?dM['iddetalle']:-1);
    var idxIdFacturaD = (dM['id_factura']!=null) ? dM['id_factura'] : ((dM['idfactura']!=null)?dM['idfactura']:-1);
    var idxDesc = dM['descripcion'];
    var idxCant = dM['cantidad'];
    var idxPrecio = dM['precio'];
    var idxTotal = (dM['total']!=null) ? dM['total'] : ((dM['sub_total']!=null)?dM['sub_total']:-1);

    var idxIdFacturaF = (fM['id_factura']!=null)?fM['id_factura']:-1;
    var idxMetodo = (fM['metododepago']!=null)?fM['metododepago'] : ((fM['metodopago']!=null)?fM['metodopago'] : ((fM['metodo_pago']!=null)?fM['metodo_pago']:-1));

    var facturasMap = {};
    if (idxIdFacturaF >= 0){
      for (var i=1;i<facVals.length;i++){
        var fr = facVals[i];
        var idf = fr[idxIdFacturaF];
        var mp = (idxMetodo>=0) ? fr[idxMetodo] : '';
        facturasMap[String(idf)] = mp;
      }
    }

    var out = [];
    for (var r=1;r<detVals.length;r++){
      var row = detVals[r];
      var n = (idxIdDetalle>=0 ? row[idxIdDetalle] : r);
      var idf = (idxIdFacturaD>=0 ? row[idxIdFacturaD] : '');
      var desc = (idxDesc>=0 ? row[idxDesc] : '');
      var cant = Number(idxCant>=0 ? row[idxCant] : 0) || 0;
      var pre  = Number(idxPrecio>=0 ? row[idxPrecio] : 0) || 0;
      var tot  = (idxTotal>=0 ? Number(row[idxTotal]||0) : (cant*pre));
      var mp   = facturasMap[String(idf)] || '';
      out.push({ n:n, descripcion:String(desc||''), cantidad:cant, precio:pre, total_linea:tot, metodo_pago:String(mp||'') });
    }
    return JSON.stringify({ ok:true, data: out });
  }catch(err){
    return JSON.stringify({ ok:false, message: 'Error en bootstrapReportesVentas: '+err });
  }
}
