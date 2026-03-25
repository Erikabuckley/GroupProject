import fs from "fs";
import path from "path";

export function generateSitemap() {

    // Establish a base url for all pages
    const baseUrl = "https://groupproject-e980.onrender.com/";
    const publicDir = path.join(process.cwd(), "public");
    const output = path.join(publicDir, "sitemap.xml");

    function getHtmlFiles(dir, list = []) {
        const files = fs.readdirSync(dir);
        // Go through all files in the system
        for (const file of files) {

            const full = path.join(dir, file);
            const stat = fs.statSync(full);

            if (stat.isDirectory()) {
                getHtmlFiles(full, list);
            }
            // If it is an html file then add it to site map
            else if (file.endsWith(".html")) {
                list.push(full);
            }
        }

        return list;
    }

    const files = getHtmlFiles(publicDir);

    const urls = files.map(file => {

        const relative = path
            .relative(publicDir, file)
            .replace(/\\/g, "/");
        // Concatinate base url with file
        const loc = `${baseUrl}/${relative}`;

        const lastmod = new Date().toISOString().split("T")[0];

        return `
  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
  </url>`;

    }).join("");
    // Format site map propely to be displayed using xml
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

    fs.writeFileSync(output, sitemap);

    console.log("Sitemap generated");
}
