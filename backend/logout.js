// logout.js (Google Apps Script)
function logout() {
  try {
    PropertiesService.getUserProperties().deleteProperty('WBS_AUTH_TOKEN');
    CacheService.getUserCache().remove('WBS_AUTH_TOKEN');
  } catch (e) {}
  return true;
}
