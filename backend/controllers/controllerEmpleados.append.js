/**
 * Añadir en controllerEmpleados.js o en un archivo nuevo que se cargue:
 * Retorna [{ nombreCompleto, sucursal }] desde 'empleados' con estado 'Activo'.
 */
function listarEmpleadosParaUsuarios(){
  try{
    var sh = obtenerSheet(env_().SH_EMPLEADOS || 'empleados');
    var data = sh.getDataRange().getDisplayValues();
    if (!data || data.length === 0) return [];
    var head = data.shift();
    var iNom = head.indexOf('nombre_empleado');
    var iSuc = head.indexOf('nombreSucursal');
    var iEst = head.indexOf('estado');
    var out = [];
    for (var r=0;r<data.length;r++){
      if (iEst >= 0 && String(data[r][iEst]).toLowerCase() !== 'activo') continue;
      out.push({ nombreCompleto: data[r][iNom], sucursal: (iSuc>=0? data[r][iSuc] : '') });
    }
    return out;
  }catch(e){
    return [];
  }
}