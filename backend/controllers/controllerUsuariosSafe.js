/**
 * controllerUsuariosSafe.js – Utilidades de creación segura (anti-duplicados por correo)
 * Hoja: env_().SH_REGISTRO_USUARIOS
 */
function _sheetUsuarios_(){
  return obtenerSheet(env_().SH_REGISTRO_USUARIOS);
}
function usuarioExistePorCorreo(correo){
  var sh = _sheetUsuarios_();
  var data = sh.getDataRange().getDisplayValues();
  var head = data.shift() || [];
  var idxCorreo = head.indexOf('correo');
  if (idxCorreo < 0) return false;
  for (var i=0;i<data.length;i++){
    if (String(data[i][idxCorreo]).trim().toLowerCase() === String(correo||'').trim().toLowerCase()) return true;
  }
  return false;
}
function guardarUsuarioSiNoExiste(json){
  var u = (typeof json==='string')? JSON.parse(json): json;
  if (!u || !u.correo) throw new Error('Falta correo');
  if (usuarioExistePorCorreo(u.correo)) throw new Error('El correo ya está registrado');
  var sh = _sheetUsuarios_();
  var head = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
  var row = new Array(head.length);
  var map = {}; head.forEach(function(h,i){ map[h]=i; });
  if (map.id!=null) row[map.id] = Utilities.getUuid();
  if (map.nombreCompleto!=null) row[map.nombreCompleto] = u.nombreCompleto || '';
  if (map.correo!=null) row[map.correo] = u.correo || '';
  if (map.contrasenia!=null) row[map.contrasenia] = u.contrasenia || '';
  if (map.rol!=null) row[map.rol] = u.rol || 'admin';
  if (map.estado!=null) row[map.estado] = u.estado || 'activo';
  sh.appendRow(row);
  return JSON.stringify({ ok:true });
}
