const staticPaths = new Set(["/31.png","/32.png","/33.png","/_headers","/_redirects","/breakfast.mp3","/favicon.ico","/favicon.svg","/fonts/poppins-400.woff2","/fonts/poppins-500.woff2","/fonts/poppins-700.woff2","/future.mp3","/manifest.json","/prs_alice.idle.mp4","/q-manifest.json","/qwik-prefetch-service-worker.js","/robots.txt","/screenshot.png","/service-worker.js","/sitemap.xml","/tech.mp3"]);
function isStaticPath(method, url) {
  if (method.toUpperCase() !== 'GET') {
    return false;
  }
  const p = url.pathname;
  if (p.startsWith("/build/")) {
    return true;
  }
  if (p.startsWith("/assets/")) {
    return true;
  }
  if (staticPaths.has(p)) {
    return true;
  }
  if (p.endsWith('/q-data.json')) {
    const pWithoutQdata = p.replace(/\/q-data.json$/, '');
    if (staticPaths.has(pWithoutQdata + '/')) {
      return true;
    }
    if (staticPaths.has(pWithoutQdata)) {
      return true;
    }
  }
  return false;
}
export { isStaticPath };