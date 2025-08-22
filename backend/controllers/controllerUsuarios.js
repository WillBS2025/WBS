
/**
 * controllerUsuarios.js – CRUD Usuarios (unificado)
 * Hoja: env_().SH_REGISTRO_USUARIOS ("registro usuarios")
 * Columnas esperadas: id | nombreCompleto | nombre_usuario | contrasenia | rol | estado | (opcional) sucursal
 * Este archivo reemplaza/agrupa la lógica dispersa en controllersUsuarios.js y controllerUsuariosSafe.js
 */

// Helpers locales sobre helpers globales
function __U_sheet__(){ return obtenerSheet(env_().SH_REGISTRO_USUARIOS); }
function __U_empleados__(){ return obtenerSheet(env_().SH_EMPLEADOS || 'empleados'); }

function __U_headMap__(sh){
    var head = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
    var idx = {}; for (var i=0;i<head.length;i++) idx[head[i]] = i;
    return { head: head, idx: idx };
}
function __U_findById__(sh, id){
    var m = __U_headMap__(sh), head=m.head, idx=m.idx;
    var idCol = (idx.id!=null? idx.id+1 : -1); if (idCol < 1) return {rowIndex:-1, idx:idx, head:head};
    var values = sh.getRange(2,idCol, Math.max(0, sh.getLastRow()-1), 1).getValues();
    var needle = String(id||'').trim();
    for (var i=0;i<values.length;i++){ if (String(values[i][0]) === needle) return {rowIndex: i+2, idx:idx, head:head}; }
    return {rowIndex:-1, idx:idx, head:head};
}
function __U_existsUsernameExceptId__(nombre_usuario, exceptId){
    if (!nombre_usuario) return false;
    var sh = __U_sheet__();
    var m = __U_headMap__(sh), head=m.head, idx=m.idx;
    var nombre_usuarioCol = (idx.nombre_usuario!=null? idx.nombre_usuario+1 : -1); if (nombre_usuarioCol<1) return false;
    var idCol = (idx.id!=null? idx.id+1 : -1);
    var values = sh.getRange(2,1, Math.max(0, sh.getLastRow()-1), sh.getLastColumn()).getValues();
    var needle = String(nombre_usuario).trim().toLowerCase();
    var except = String(exceptId||'').trim();
    for (var i=0;i<values.length;i++){
        var row = values[i];
        var c = String(row[nombre_usuarioCol-1]||'').trim().toLowerCase();
        var id = (idCol>0? String(row[idCol-1]||'').trim() : '');
        if (c === needle && (!except || id !== except)) return true;
    }
    return false;
}

function __U_sucursalFromEmpleadoNombre__(nombre){
    try{
        var sh = __U_empleados__();
        var data = sh.getDataRange().getDisplayValues();
        if (!data.length) return '';
        var head = data.shift();
        var idxNom = head.indexOf('nombre_empleado');
        var idxSuc = head.indexOf('nombreSucursal');
        if (idxNom < 0 || idxSuc < 0) return '';

        nombre = String(nombre || '').trim().toLowerCase();
        for (var i = 0; i < data.length; i++){
        var nom = String(data[i][idxNom] || '').trim().toLowerCase();
        if (nom === nombre) return data[i][idxSuc] || '';
        }
    } catch (err) {}
    return '';
}

// ===== CRUD =====

/** Crear */
function guardarUsuarioSeguro(usuarioJson){
    try{
        var sh = __U_sheet__();
        var map = __U_headMap__(sh), head = map.head, idx = map.idx;
        var u = (typeof usuarioJson === 'string') ? JSON.parse(usuarioJson) : (usuarioJson || {});

        if (__U_existsUsernameExceptId__(u.nombre_usuario, null)){
            return { ok:false, titulo:'Usuario duplicado', descripcion:'Ya existe un usuario con ese nombre.' };
        }

        var row = new Array(head.length);
        if (idx.id != null) row[idx.id] = Utilities.getUuid();
        if (idx.nombreCompleto != null) row[idx.nombreCompleto] = u.nombreCompleto || '';
        if (idx.nombre_usuario != null) row[idx.nombre_usuario] = u.nombre_usuario || '';
        if (idx.contrasenia != null) row[idx.contrasenia] = u.contrasenia || '';
        if (idx.rol != null) row[idx.rol] = u.rol || 'admin';
        if (idx.estado != null) row[idx.estado] = u.estado || 'activo';
        if (idx.nombreSucursal != null) row[idx.nombreSucursal] = (__U_sucursalFromEmpleadoNombre__(u.nombreCompleto) || '');

        sh.appendRow(row);
        return { ok:true, titulo:'Usuario creado', descripcion:'Creado correctamente' };
    }catch(error){
        return { ok:false, titulo:'Ocurrió un error: '+error, descripcion:'Contacte a soporte.' };
    }
}

/** Actualizar
 * Admite (id, datosJson) o (jsonConId)
 */

function actualizarUsuarioSeguro(a, b){
    try{
        var sh = __U_sheet__();
        var map = __U_headMap__(sh), head = map.head, idx = map.idx;

        var id, d;
        if (b == null && a != null){
            // recibido un único JSON o string
            d = (typeof a === 'string') ? JSON.parse(a) : a;
            id = d && d.id;
        } else {
            id = a;
            d = (typeof b === 'string') ? JSON.parse(b) : b;
        }

        if (d && d.nombre_usuario && __U_existsUsernameExceptId__(d.nombre_usuario, id)){
            return { ok:false, titulo:'Usuario duplicado', descripcion:'Ya existe un usuario con ese nombre.' };
        }

        var found = __U_findById__(sh, id);
        if (found.rowIndex < 0) return { ok:false, titulo:'No encontrado', descripcion:'No existe el registro.' };

        for (var k in d){
            if (!d.hasOwnProperty(k) || idx[k]==null) continue;
            var val = d[k];
            sh.getRange(found.rowIndex, idx[k]+1).setValue(val);
        }

        // sincronizar sucursal según nombreCompleto
        try{
            if (idx.nombreSucursal != null){
                var nom = (d && d.nombreCompleto) ? d.nombreCompleto :
                          sh.getRange(found.rowIndex, (idx.nombreCompleto!=null? idx.nombreCompleto+1 : 1)).getDisplayValue();
                var suc = __U_sucursalFromEmpleadoNombre__(nom);
                sh.getRange(found.rowIndex, idx.nombreSucursal+1).setValue(suc || '');
            }
        }catch(e){}

        return { ok:true, titulo:'Actualizado correctamente', descripcion:'Usuario actualizado' };
    }catch(error){
        return { ok:false, titulo:'Ocurrió un error: '+error, descripcion:'Contacte a soporte.' };
    }
}


/** Eliminar por id (usado por la UI) */
function eliminarUsuario(id){
    try{
        var sh = __U_sheet__();
        var found = __U_findById__(sh, id);
        if (found.rowIndex < 0) return { ok:false, titulo:'No encontrado', descripcion:'No existe el registro.' };
        sh.deleteRow(found.rowIndex);
        return { ok:true, titulo:'Usuario eliminado' };
    }catch(error){
        return { ok:false, titulo:'Ocurrió un error: '+error };
    }
}

/** Listar para la vista */
function listarUsuarios(){
    var sh = __U_sheet__();
    var values = sh.getDataRange().getDisplayValues();
    if (!values || values.length===0) return [];
    var head = values.shift();
    return values.map(function(r){
        var o = {}; for (var i=0;i<head.length;i++) o[head[i]] = r[i];
        return o;
    });
}


/** Login: verificar credenciales en hoja de usuarios */

function verificarCredenciales(nombre_usuario, contrasenia){
    try{
        var sh = __U_sheet__();
        var map = __U_headMap__(sh), head = map.head, idx = map.idx;
        var values = sh.getDataRange().getDisplayValues(); if (!values || values.length < 2) return { success:false, message:'Sin usuarios' };
        values.shift();
        var norm = function(s){ return String(s||'').trim(); };
        var userNeedle = norm(nombre_usuario).toLowerCase();
        for (var i=0;i<values.length;i++){
        var row = values[i];
        var obj = {};
        for (var k in idx){ obj[k] = row[idx[k]]; }
        var userRow = norm(obj.nombre_usuario).toLowerCase();
        var contrRow = norm(obj.contrasenia);
        var estado = norm(obj.estado).toLowerCase();
        if (userRow === userNeedle && contrRow === norm(contrasenia)){
            if (estado && estado !== 'activo') return { success:false, message:'Usuario inactivo' };
            return { success:true, message:'Acceso permitido', role: obj.rol || 'admin', user: obj };
        }
        }
        return { success:false, message:'Credenciales incorrectas' };
    }catch(err){
        return { success:false, message: 'Error: '+err };
    }
}

