import { writeFileSync } from "node:fs";
import { join } from "node:path";

const outDir = join(import.meta.dirname, "..", "out");
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "/beatsync-p2p").replace(/\/$/, "");

const redirectScript = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>beatsync-p2p</title>
  <script>
    (function () {
      var base = ${JSON.stringify(basePath)};
      var path = location.pathname;
      // Fix accidental double basePath (e.g. /beatsync-p2p/beatsync-p2p/...)
      if (path.indexOf(base + base) === 0) {
        location.replace(base + path.slice(base.length) + location.search + location.hash);
        return;
      }
      var roomMatch = path.match(/room\\/(\\d{6})\\/?$/);
      if (roomMatch) {
        location.replace(base + "/?room=" + roomMatch[1]);
        return;
      }
      location.replace(base + "/");
    })();
  </script>
</head>
<body></body>
</html>
`;

writeFileSync(join(outDir, "404.html"), redirectScript);
console.log(`[pages:404] Wrote ${join(outDir, "404.html")} (basePath=${basePath})`);
