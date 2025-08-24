/************************************************************
 * CONTROLLER CLIENTES – Hoja: "clientes"
 * Columnas esperadas: id_cliente | nombre
 ************************************************************/
var SHEET_CLIENTES = (typeof env_==='function' && env_().SH_CLIENTES) || 'clientes';

function listarClientes(){
  try{
    var sh = obtenerSheet(SHEET_CLIENTES);
    var values = sh.getDataRange().getValues();
    if (!values || values.length < 2) return JSON.stringify([]);
    var headers = values[0].map(String);
    var out = [];
    for (var i=1;i<values.length;i++){
      var row = values[i];
      var obj = {};
      for (var c=0;c<headers.length;c++){ obj[headers[c]] = row[c]; }
      obj.id = obj.id_cliente || i;
      out.push(obj);
    }
    return JSON.stringify(out);
  }catch(e){ return JSON.stringify({ok:false, message:e.message}); }
}

function crearCliente(cliente){
  try{
    var sh = obtenerSheet(SHEET_CLIENTES);
    var headers = sh.getDataRange().getValues()[0].map(String);
    var obj = (typeof cliente==='string')? JSON.parse(cliente): (cliente||{});
    if (!obj.id_cliente){
      var col = headers.indexOf('id_cliente') + 1;
      var last = sh.getLastRow();
      var next = 1;
      if (last>1){
        var vals = sh.getRange(2,col,last-1,1).getDisplayValues().map(String).filter(Boolean);
        var nums = vals.map(function(v){ var n=parseInt(v,10); return isNaN(n)?0:n; });
        next = (nums.length? Math.max.apply(null, nums):0) + 1;
      }
      obj.id_cliente = next;
    }
    var row = headers.map(function(h){ return obj[h] != null ? obj[h] : ''; });
    sh.appendRow(row);
    return JSON.stringify({ok:true, id: obj.id_cliente});
  }catch(e){ return JSON.stringify({ok:false, message:e.message}); }
}

function actualizarCliente(cliente){
  try{
    var sh = obtenerSheet(SHEET_CLIENTES);
    var headers = sh.getDataRange().getValues()[0].map(String);
    var obj = (typeof cliente==='string')? JSON.parse(cliente): (cliente||{});
    if (!obj || !obj.id_cliente) return JSON.stringify({ok:false, message:'Falta id_cliente'});
    var data = sh.getDataRange().getValues(); data.shift();
    var idxId = headers.indexOf('id_cliente');
    var target = null;
    for (var r=0;r<data.length;r++){ if (String(data[r][idxId])===String(obj.id_cliente)){ target=r+2; break; } }
    if (!target) return JSON.stringify({ok:false, message:'No encontrado'});
    for (var k in obj){ if (!obj.hasOwnProperty(k)) continue; var c=headers.indexOf(k); if (c===-1) continue; sh.getRange(target,c+1).setValue(obj[k]); }
    return JSON.stringify({ok:true});
  }catch(e){ return JSON.stringify({ok:false, message:e.message}); }
}

function eliminarCliente(id_cliente){
  try{
    var sh = obtenerSheet(SHEET_CLIENTES);
    var headers = sh.getDataRange().getValues()[0].map(String);
    var idxId = headers.indexOf('id_cliente');
    var data = sh.getDataRange().getValues(); data.shift();
    var target = null;
    for (var r=0;r<data.length;r++){ if (String(data[r][idxId])===String(id_cliente)){ target=r+2; break; } }
    if (!target) return JSON.stringify({ok:false, message:'No encontrado'});
    sh.deleteRow(target);
    return JSON.stringify({ok:true});
  }catch(e){ return JSON.stringify({ok:false, message:e.message}); }
}


/**
 * Lista sólo clientes activos si existe la columna 'estado'. Devuelve { ok:true, data:[{ nombre }] }.
 * Si no existe 'estado', devuelve todos como activos.
 */
function listarClientesActivos(){
  try{
    var sh = obtenerSheet(SHEET_CLIENTES);
    var data = sh.getDataRange().getValues();
    if (!data || data.length < 2) return JSON.stringify({ ok:true, data: [] });
    var head = data[0].map(String);
    var idxNombre = head.indexOf('nombre');
    var idxEstado = head.indexOf('estado');
    var out = [];
    for (var r=1;r<data.length;r++){
      var row = data[r];
      var estadoOk = true;
      if (idxEstado >= 0){
        var estado = String(row[idxEstado]||'').toLowerCase();
        estadoOk = (estado === 'activo');
      }
      if (estadoOk){
        var nom = (idxNombre>=0 ? row[idxNombre] : row[1]);
        out.push({ nombre: String(nom||'') });
      }
    }
    return JSON.stringify({ ok:true, data: out });
  }catch(err){
    return JSON.stringify({ ok:false, message: 'Error al listar clientes: '+err });
  }
}
