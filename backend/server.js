/**
 * @fileoverview Archivo principal del servidor para la aplicación web de Apps Script.
 * Contiene las funciones que manejan las peticiones GET y los archivos HTML.
 */

/**
 * Función principal que se ejecuta cuando la aplicación recibe una petición HTTP GET.
 * Es el punto de entrada para mostrar la interfaz de usuario.
 * @return {GoogleAppsScript.HTML.HtmlOutput} Un objeto de salida HTML que representa la página web.
 */
const doGet = () => {
  // Crea un objeto de plantilla HTML a partir del archivo "frontend/index.html".
  // Este archivo contendrá el código HTML de nuestra aplicación React.
  return HtmlService.createTemplateFromFile("frontend/index")
    // Evalúa la plantilla para renderizar su contenido.
    .evaluate()
    // Configura las opciones del iframe para permitir que la aplicación se incruste
    // en otros sitios web sin restricciones de seguridad.
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    // Establece el modo de sandbox en "IFRAME", lo que aísla el contenido de la
    // página de cualquier otra parte de la aplicación, mejorando la seguridad.
    .setSandboxMode(HtmlService.SandboxMode.IFRAME)
    // Agrega una meta etiqueta para controlar el viewport del navegador, asegurando
    // que la aplicación se vea correctamente en dispositivos móviles.
    .addMetaTag(
      "viewport",
      'width=device-width,user-scalable=no,initial-scale=1,maximum-scale=1,minimum-scale=1"'
    )
    // Establece el título de la página web que aparecerá en la pestaña del navegador.
    .setTitle("WillitoBarberShop")
};

/**
 * Función auxiliar para incluir el contenido de otros archivos HTML en una plantilla.
 * Por ejemplo, se usa en la plantilla principal (`index.html`) para incluir archivos
 * como CSS o JavaScript.
 * @param {string} ruta La ruta del archivo HTML a incluir, relativa a la carpeta del proyecto.
 * @return {string} El contenido del archivo HTML como una cadena de texto.
 */
const include = (ruta) => {
  // Crea una salida HTML a partir del archivo en la ruta especificada
  // y obtiene su contenido como una cadena de texto.
  return HtmlService.createHtmlOutputFromFile(ruta).getContent();
};

function listarProductos() {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("productos");
  const rango = hoja.getDataRange();
  const valores = rango.getValues();
  if (valores.length <= 1) {
    return JSON.stringify([]);
  }
  const cabeceras = valores.shift();

  const productos = valores.map(fila => {
    let obj = {};
    cabeceras.forEach((cabecera, i) => {
      obj[cabecera] = fila[i];
    });
    return obj;
  });

  return JSON.stringify(productos);
} // <--- ¡Esta llave de cierre faltaba!

/**
 * Función para eliminar un producto
 */
function eliminarProducto(id) {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("productos");
  const valores = hoja.getDataRange().getValues();

  for (let i = 1; i < valores.length; i++) {
    if (valores[i][0] == id) {
      hoja.deleteRow(i + 1);
      return { titulo: "Éxito", descripcion: "Producto eliminado correctamente" };
    }
  }

  return { titulo: "Error", descripcion: "No se encontró el producto para eliminar" };
}

function crearProducto(producto) {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("productos");
  const ultimaFila = hoja.getLastRow();
  const nuevoId = ultimaFila; // O usar Date.now() si quieres IDs únicos
  hoja.appendRow([
    nuevoId,
    producto.nombreProducto,
    producto.precio,
    producto.stock,
    producto.fechaEntrada,
    producto.descripcion,
    producto.nombreSucursal
  ]);
  return { titulo: "Éxito", descripcion: "Producto creado correctamente" };
}

function actualizarProducto(producto) {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("productos");
  const valores = hoja.getDataRange().getValues();
  
  for (let i = 1; i < valores.length; i++) {
    if (valores[i][0] == producto.id) {
      hoja.getRange(i + 1, 2).setValue(producto.nombreProducto);
      hoja.getRange(i + 1, 3).setValue(producto.precio);
      hoja.getRange(i + 1, 4).setValue(producto.stock);
      hoja.getRange(i + 1, 5).setValue(producto.fechaEntrada);
      hoja.getRange(i + 1, 6).setValue(producto.descripcion);
      hoja.getRange(i + 1, 7).setValue(producto.nombreSucursal);
      return { titulo: "Éxito", descripcion: "Producto actualizado correctamente" };
    }
  }
  return { titulo: "Error", descripcion: "No se encontró el producto para actualizar" };
}
