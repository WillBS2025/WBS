/************************************************************
 * CONTROLLER EMPLEADOS – Hoja: "empleados"
 * Columnas esperadas:
 * id_empleado | nombre_empleado | fecha_nacimiento | fecha_contratacion | genero | telefono | nombreSucursal | estado
 ************************************************************/
var SHEET_EMPLEADOS = (typeof env_==='function' && env_().SH_EMPLEADOS) || 'empleados';

function listarEmpleados(){
  try{
    var sh = obtenerSheet(SHEET_EMPLEADOS);
    var values = sh.getDataRange().getValues();
    if (!values || values.length < 2) return JSON.stringify([]);
    var headers = values[0].map(String);
    var out = [];
    for (var i=1;i<values.length;i++){
      var row = values[i];
      var obj = {};
      for (var c=0;c<headers.length;c++){ obj[headers[c]] = row[c]; }
      // id genérico para AntD
      obj.id = obj.id_empleado || i;
      out.push(obj);
    }
    return JSON.stringify(out);
  }catch(e){ return JSON.stringify({ok:false, message:e.message}); }
}

function crearEmpleado(empleado){
  try{
    var sh = obtenerSheet(SHEET_EMPLEADOS);
    var headers = sh.getDataRange().getValues()[0].map(String);
    var obj = (typeof empleado==='string')? JSON.parse(empleado): (empleado||{});
    // autoincremento simple si viene vacío
    if (!obj.id_empleado){
      // obtener máximo id numérico
      var col = headers.indexOf('id_empleado') + 1;
      var last = sh.getLastRow();
      var next = 1;
      if (last>1){
        var vals = sh.getRange(2,col,last-1,1).getDisplayValues().map(String).filter(Boolean);
        var nums = vals.map(function(v){ var n=parseInt(v,10); return isNaN(n)?0:n; });
        next = (nums.length? Math.max.apply(null, nums):0) + 1;
      }
      obj.id_empleado = next;
    }
    // construir fila respetando headers
    var row = headers.map(function(h){ return obj[h] != null ? obj[h] : ''; });
    sh.appendRow(row);
    return JSON.stringify({ok:true, id: obj.id_empleado});
  }catch(e){ return JSON.stringify({ok:false, message:e.message}); }
}

function actualizarEmpleado(empleado){
  try{
    var sh = obtenerSheet(SHEET_EMPLEADOS);
    var headers = sh.getDataRange().getValues()[0].map(String);
    var obj = (typeof empleado==='string')? JSON.parse(empleado): (empleado||{});
    if (!obj || !obj.id_empleado) return JSON.stringify({ok:false, message:'Falta id_empleado'});
    var data = sh.getDataRange().getValues(); data.shift();
    var idxId = headers.indexOf('id_empleado');
    var target = null;
    for (var r=0;r<data.length;r++){ if (String(data[r][idxId])===String(obj.id_empleado)){ target=r+2; break; } }
    if (!target) return JSON.stringify({ok:false, message:'No encontrado'});
    for (var k in obj){ if (!obj.hasOwnProperty(k)) continue; var c=headers.indexOf(k); if (c===-1) continue; sh.getRange(target,c+1).setValue(obj[k]); }
    return JSON.stringify({ok:true});
  }catch(e){ return JSON.stringify({ok:false, message:e.message}); }
}

function eliminarEmpleado(id_empleado){
  try{
    var shEmp = obtenerSheet(SHEET_EMPLEADOS);
    var values = shEmp.getDataRange().getValues();
    if (!values || values.length < 2) return JSON.stringify({ok:false, message:'No encontrado'});
    var head = values[0].map(String);
    var idxId = head.indexOf('id_empleado');
    var idxNom = head.indexOf('nombre_empleado');
    var targetRow = -1;
    var nombreEmpleado = '';

    for (var i=1;i<values.length;i++){
      if (String(values[i][idxId]) === String(id_empleado)){
        targetRow = i + 1; // 1-based row index
        nombreEmpleado = String(idxNom>=0 ? values[i][idxNom] : '');
        break;
      }
    }
    if (targetRow < 0) return JSON.stringify({ok:false, message:'No encontrado'});

    // 1) Eliminar empleado
    shEmp.deleteRow(targetRow);

    // 2) Eliminar usuario donde nombreCompleto === nombre_empleado
    try{
      var shUser = obtenerSheet(env_().SH_REGISTRO_USUARIOS);
      var userData = shUser.getDataRange().getValues();
      if (userData && userData.length > 1){
        var headU = userData[0].map(String);
        var idxNombreCompleto = headU.indexOf('nombreCompleto');
        if (idxNombreCompleto >= 0 && nombreEmpleado){
          var toDelete = [];
          for (var r=1;r<userData.length;r++){
            var nombreCompleto = String(userData[r][idxNombreCompleto] || '');
            if (nombreCompleto.trim().toLowerCase() === String(nombreEmpleado).trim().toLowerCase()){
              toDelete.push(r+1); // convert to 1-based row index
            }
          }
          // borrar de abajo hacia arriba para evitar desfasar índices
          toDelete.sort(function(a,b){ return b-a; });
          for (var j=0;j<toDelete.length;j++){ shUser.deleteRow(toDelete[j]); }
        }
      }
    }catch(ignore){ /* No bloquear si falla el borrado del usuario */ }

    return JSON.stringify({ok:true});
  }catch(e){
    return JSON.stringify({ok:false, message:e.message});
  }
}


/**
 * Lista sólo empleados con estado "Activo". Devuelve { ok:true, data:[{ nombre, sucursal? }] }
 */
function listarEmpleadosActivos(){
  try{
    var sh = obtenerSheet(SHEET_EMPLEADOS);
    var data = sh.getDataRange().getValues();
    if (!data || data.length < 2) return JSON.stringify({ ok:true, data: [] });
    var head = data[0].map(String);
    var idxNombre = head.indexOf('nombre_empleado');
    var idxEstado = head.indexOf('estado');
    var idxSuc = head.indexOf('nombreSucursal');
    var out = [];
    for (var r=1;r<data.length;r++){
      var row = data[r];
      var estado = String(idxEstado>=0? row[idxEstado] : '').toLowerCase();
      if (estado === 'activo'){
        var nombre = (idxNombre>=0? row[idxNombre] : (row[1]||''));
        var suc = (idxSuc>=0? row[idxSuc] : '');
        out.push({ nombre: String(nombre||''), sucursal: String(suc||'') });
      }
    }
    return JSON.stringify({ ok:true, data: out });
  }catch(err){
    return JSON.stringify({ ok:false, message: 'Error al listar empleados: '+err });
  }
}
