/**
 * Elimina una fila de la hoja de cálculo por su ID.
 * @param {string} id El ID del registro a eliminar.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet El objeto de la hoja de cálculo.
 */
function Delete(id, sheet) {
  const datosEncontrados = _read(sheet, id); // Usa tu función `_read` para encontrar la fila por ID.
  if (datosEncontrados && datosEncontrados.row) {
    sheet.deleteRow(datosEncontrados.row);
  }
}