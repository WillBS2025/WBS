// ... (Códido de verificacion de credenciales)

function verificarCredenciales(correo, contrasenia) {
  try {
    const sheetUsuarios = obtenerSheet(env_().SH_REGISTRO_USUARIOS);
    const datosUsuarios = sheetUsuarios.getDataRange().getDisplayValues();
    // Columnas: id | nombreCompleto | correo | contrasenia | rol | estado
    const COL_NOMBRE = 1, COL_CORREO = 2, COL_CONTRA = 3, COL_ROL = 4, COL_ESTADO = 5;
    for (let i = 1; i < datosUsuarios.length; i++) {
      const row = datosUsuarios[i];
      if (row[COL_CORREO] === correo && row[COL_CONTRA] === contrasenia) {
        const rol = (row[COL_ROL] || '').toString().trim();
        const estado = (row[COL_ESTADO] || '').toString().trim();
        if (estado && estado.toLowerCase() !== 'activo') {
          return { success: false, message: "Usuario inactivo" };
        }
        return {
          success: true,
          message: "Inicio de sesión exitoso",
          role: rol || 'admin',
          user: {
            id: row[0],
            nombreCompleto: row[COL_NOMBRE],
            correo: row[COL_CORREO],
            rol: rol || 'admin',
            estado: estado || ''
          }
        };
      }
    }
    return { success: false, message: "Correo o contraseña incorrectos" };
  } catch (error) {
    return { success: false, message: "Error al verificar credenciales: " + error.message };
  }
}

function guardarUsuario(usuario){

    try {
        const sheetUsuarios= obtenerSheet(env_().SH_REGISTRO_USUARIOS);
        Insert(JSON.parse(usuario), sheetUsuarios);
        return {
            titulo: "Registro Exitoso!! ",
            descripcion: "Ya se encuentra el usuario en la Base de Datos",
        };
    } catch (error) {
        return {
            titulo: "Ocurrio un Error!! " + error,
            descripcion: "Por Favor, Contactar a Soporte Técnico",
        };
    }

}

/**
 * Elimina un usuario de la base de datos por su ID.
 * @param {string} id El ID del usuario a eliminar.
 * @return {object} Un objeto con un mensaje de éxito o error.
 */
function eliminarUsuario(id) {
  try {
    const sheetUsuarios = obtenerSheet(env_().SH_REGISTRO_USUARIOS);
    Delete(id, sheetUsuarios); // Llama a la nueva función de eliminación.
    return {
      titulo: "Eliminado correctamente",
      descripcion: "El usuario ha sido eliminado de la base de datos.",
    };
  } catch (error) {
    return {
      titulo: "Ops ha ocurrido un error! " + error,
      descripcion: "Por favor contacte a soporte.",
    };
  }
}

function listarUsuarios(id = undefined) {
  //return obtenerDatos(env_().SH_REGISTRO_USUARIOS);
    return JSON.stringify(_read(obtenerSheet(env_().SH_REGISTRO_USUARIOS), id));
}

