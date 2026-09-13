/* GEJFA Rules — single source of truth for the app version.
   Bump GEJFA_VERSION on every deploy. index.html loads this and app.js shows
   "vN" in the footer credit line; sw.js importScripts() it to name the offline
   cache ("gejfa-rules-vN"), so one bump both labels the build and makes every
   installed phone fetch the new files. Plain script, no modules, so the page
   and the service worker can both load it. */
var GEJFA_VERSION = 37;

if (typeof module !== "undefined") module.exports = { GEJFA_VERSION };
