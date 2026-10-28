(function () {
  "use strict";
  // Existing delivery actions export the selected project's approved snapshot.
  const encode = function (value) { return new TextEncoder().encode(value); };
  function xml(value) { return String(value).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function concat(parts) { const out = new Uint8Array(parts.reduce(function (n, part) { return n + part.length; }, 0)); let offset = 0; parts.forEach(function (part) { out.set(part, offset); offset += part.length; }); return out; }
  function numbers(values) { const out = new Uint8Array(values.reduce(function (n, pair) { return n + pair[1]; }, 0)), view = new DataView(out.buffer); let offset = 0; values.forEach(function (pair) { if (pair[1] === 2) view.setUint16(offset, pair[0], true); else view.setUint32(offset, pair[0], true); offset += pair[1]; }); return out; }
  function crc(bytes) { let value = 0xffffffff; bytes.forEach(function (byte) { value ^= byte; for (let i = 0; i < 8; i += 1) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0); }); return (value ^ 0xffffffff) >>> 0; }
  function zip(entries) {
    const bodies = [], directory = []; let offset = 0;
    entries.forEach(function (entry) {
      const name = encode(entry.name), bytes = typeof entry.bytes === "string" ? encode(entry.bytes) : entry.bytes, checksum = crc(bytes);
      const header = numbers([[0x04034b50,4],[20,2],[0x800,2],[0,2],[0,2],[0x21,2],[checksum,4],[bytes.length,4],[bytes.length,4],[name.length,2],[0,2]]);
      bodies.push(header, name, bytes);
      directory.push(numbers([[0x02014b50,4],[20,2],[20,2],[0x800,2],[0,2],[0,2],[0x21,2],[checksum,4],[bytes.length,4],[bytes.length,4],[name.length,2],[0,2],[0,2],[0,2],[0,2],[0,4],[offset,4]]), name);
      offset += header.length + name.length + bytes.length;
    });
    const central = concat(directory);
    return concat(bodies.concat([central, numbers([[0x06054b50,4],[0,2],[0,2],[entries.length,2],[entries.length,2],[central.length,4],[offset,4],[0,2]])]));
  }
  function pageText(html) {
    const root = document.createElement("div"); root.innerHTML = html;
    root.querySelectorAll("script,style").forEach(function (node) { node.remove(); });
    root.querySelectorAll("h1,h2,h3,p,tr").forEach(function (node) { node.appendChild(document.createTextNode("\n")); });
    return root.textContent.trim();
  }
  function docx(pages) {
    const paragraphs = pages.map(function (page, index) { return pageText(page).split(/\n+/).map(function (line) { return '<w:p><w:r><w:t xml:space="preserve">' + xml(line) + '</w:t></w:r></w:p>'; }).join("") + (index < pages.length - 1 ? '<w:p><w:r><w:br w:type="page"/></w:r></w:p>' : ""); }).join("");
    return zip([
      { name: "[Content_Types].xml", bytes: '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>' },
      { name: "_rels/.rels", bytes: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>' },
      { name: "word/document.xml", bytes: '<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + paragraphs + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>' }
    ]);
  }
  function hex(value) { return Array.from(value).map(function (c) { const code = c.charCodeAt(0); return code.toString(16).padStart(4,"0"); }).join(""); }
  function pdf(pages) {
    const objects = [
      "<< /Type /Catalog /Pages 2 0 R >>", "",
      "<< /Type /Font /Subtype /Type0 /BaseFont /STSong-Light /Encoding /UniGB-UCS2-H /DescendantFonts [4 0 R] >>",
      "<< /Type /Font /Subtype /CIDFontType0 /BaseFont /STSong-Light /CIDSystemInfo << /Registry (Adobe) /Ordering (GB1) /Supplement 4 >> >>"
    ], kids = [];
    pages.forEach(function (page, index) {
      const id = objects.length + 1; kids.push(id + " 0 R");
      const lines = [];
      pageText(page).split(/\n+/).forEach(function (line) { const chars = Array.from(line); while (chars.length) lines.push(chars.splice(0,38).join("")); });
      const stream = "BT /F1 12 Tf 48 790 Td 20 TL " + lines.slice(0,35).map(function (line) { return "<" + hex(line) + "> Tj T*"; }).join("\n") + " ET\nBT /F1 10 Tf 280 30 Td <" + hex(String(index + 1)) + "> Tj ET";
      objects.push("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents " + (id + 1) + " 0 R >>", "<< /Length " + encode(stream).length + " >>\nstream\n" + stream + "\nendstream");
    });
    objects[1] = "<< /Type /Pages /Count " + pages.length + " /Kids [" + kids.join(" ") + "] >>";
    let body = "%PDF-1.4\n"; const offsets = [0];
    objects.forEach(function (object, index) { offsets.push(encode(body).length); body += (index + 1) + " 0 obj\n" + object + "\nendobj\n"; });
    const xref = encode(body).length;
    body += "xref\n0 " + (objects.length + 1) + "\n0000000000 65535 f \n" + offsets.slice(1).map(function (offset) { return String(offset).padStart(10, "0") + " 00000 n \n"; }).join("") + "trailer\n<< /Size " + (objects.length + 1) + " /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF";
    return encode(body);
  }
  function contents(project, version, id) {
    const snapshot = window.BiddingBidVersions.loadSnapshot(project, version.id, id);
    return snapshot || window.ProjectWorkspaceData.documents(project)[id].pages.map(function (page) { return page.html; });
  }
  function download(bytes, name, type) {
    const url = URL.createObjectURL(new Blob([bytes], { type: type || "application/zip" }));
    const link = document.createElement("a"); link.href = url; link.download = name; document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
  }
  function file(project, version, id, format) { return (format === "pdf" ? pdf : docx)(contents(project, version, id)); }
  function packageDownload(project, version, format) {
    const entries = ["technical", "business"].map(function (id) { return { name: (id === "technical" ? "技术标" : "商务标") + "_" + version.number + "." + format, bytes: file(project, version, id, format) }; });
    download(zip(entries), project.name + "_" + version.number + "_" + (format === "pdf" ? "PDF" : "Word") + "文件套.zip");
  }
  window.BiddingProjectExport = { file: file, download: download, packageDownload: packageDownload };
})();
