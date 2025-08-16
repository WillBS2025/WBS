// ... (código existente)

function verificarCredenciales(correo, contrasenia) {
    try {
        const sheetUsuarios = obtenerSheet(env_().SH_REGISTRO_USUARIOS);
        const datosUsuarios = sheetUsuarios.getDataRange().getDisplayValues();

        // Asumiendo que las columnas son: ID, Nombre Completo, Correo, Contraseña
        // y que el correo está en la columna 2 (índice 2) y la contraseña en la columna 3 (índice 3)
        // (ajusta estos índices si tu estructura es diferente)
        const columnaCorreo = 2; // Ajusta según tu hoja: 0-ID, 1-Nombre, 2-Correo, 3-Contraseña
        const columnaContrasenia = 3; // Ajusta según tu hoja

        for (let i = 1; i < datosUsuarios.length; i++) { // Empezamos en 1 para omitir la fila de encabezados
            const usuarioRegistrado = datosUsuarios[i][columnaCorreo];
            const contraseniaRegistrada = datosUsuarios[i][columnaContrasenia];

            if (usuarioRegistrado === correo && contraseniaRegistrada === contrasenia) {
                return { success: true, message: "Inicio de sesión exitoso" };
            }
        }
        return { success: false, message: "Correo o contraseña incorrectos" };
    } catch (error) {
        return { success: false, message: "Error al verificar credenciales: " + error.message };
    }
}
function guardarUsuario(usuario) {
    try {
        const { id, nombreCompleto, correo, contrasenia } = usuario;
        const sheetUsuarios = obtenerSheet(env_().SH_REGISTRO_USUARIOS);
        sheetUsuarios.appendRow([id, nombreCompleto, correo, contrasenia]);
        return {
        titulo: "Registro exitoso",
        descripcion: "Ya se encuentra el usuario en la base de datos.",
        };
    } catch (error) {
        return {
        titulo: "Ops ha ocurrido un error! " + error,
        descripcion: "Por favor contacte a soporte.",
        };
    }
}

function listarUsuarios(id = undefined) {
  // return obtenerDatos(env_().SH_REGISTRO_USUARIOS);
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