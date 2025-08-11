function guardarUsuario(usuario){

    try {
        const sheetUsuarios= obtenerSheet(env_().SH_REGISTRO_USUARIOS);
        Insert(JSON.parse(usuario), sheetUsuarios);
        return {
            titulo: "Registro Exitoso!! ",
            descripcion: "Ya se encuentra el usuario guardado en la base de datos.",
        };
    } catch (error) {
        return {
            titulo: "Ocurrio un Error!! " + error,
            descripcion: "Por favor contacte a soporte.",
        };
    }

}

function listarUsuarios(id = undefined) {
  //return obtenerDatos(env_().SH_REGISTRO_USUARIOS);
  return JSON.stringify(_read(obtenerSheet(env_().SH_REGISTRO_USUARIOS), id));
}


function actualizarUsuario(id, datos) {
  try {
    const sheetUsuarios = obtenerSheet(env_().SH_REGISTRO_USUARIOS);
    Update(id, datos, sheetUsuarios);
    return {
      titulo: "Actualizado correctamente",
      descripcion: "Ya se encuentra el usuario actualizado en la base de datos.",
    };
  } catch (error) {
    return {
      titulo: "Ops ha ocurrido un error! " + error,
      descripcion: "Por favor contacte a soporte.",
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