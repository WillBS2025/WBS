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
