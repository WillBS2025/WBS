/**
 * controllerSucursales.js
 * Lista sucursales ACTivas para usarse en el frontend (Select).
 * Hoja esperada en env_().SH_SUCURSALES o 'sucursales' por defecto.
 * Encabezados: id | nombreSucursal | fechaInauguracion | telefono | direccion | correoElectronico | estado
 */
function listarSucursalesActivas() {
  try {
    var nombreHoja = (env_ && typeof env_ === 'function' && env_().SH_SUCURSALES) || 'sucursales';
    var sheet = obtenerSheet(nombreHoja);
    var rows = _read(sheet) || [];

    var out = [];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i] || {};
      var estado = (r.estado || '').toString().toLowerCase().trim();
      if (estado === 'activo' || estado === 'activa') {
        out.push({ id: r.id, nombreSucursal: r.nombreSucursal });
      }
    }

    out.sort(function (a, b) {
      return String(a.nombreSucursal || '').localeCompare(String(b.nombreSucursal || ''), 'es');
    });

    return JSON.stringify({ ok: true, sucursales: out });
  } catch (err) {
    return JSON.stringify({ ok: false, message: 'Error al listar sucursales: ' + err });
  }
}
