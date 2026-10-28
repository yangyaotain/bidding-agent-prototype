from pathlib import Path
from html.parser import HTMLParser
import re
import subprocess
from lxml import html

root = Path(__file__).resolve().parents[1]
node = Path(r"C:\Users\Yangy\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe")
js_files = list((root / "assets/js").glob("*.js"))
for path in js_files:
    subprocess.run([str(node), "--check", str(path)], check=True, capture_output=True)

class References(HTMLParser):
    def __init__(self):
        super().__init__()
        self.references = []
    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag == "script" and values.get("src"):
            self.references.append(values["src"])
        if tag == "link" and values.get("rel") == "stylesheet":
            self.references.append(values["href"])

pages = list(root.glob("pages/*.html")) + [root / "index.html"]
for path in pages:
    source = path.read_text(encoding="utf-8")
    assert "\ufffd" not in source, path
    refs = References()
    refs.feed(source)
    for value in refs.references:
        if not re.match(r"^(https?:|data:|//)", value):
            target = path.parent / value.split("?")[0]
            assert target.exists(), (path, value)
    tree = html.fromstring(source)
    ids = tree.xpath("//*[@id]/@id")
    assert len(ids) == len(set(ids)), f"Duplicate ids: {path}"

for path in root.glob("assets/css/*.css"):
    source = path.read_text(encoding="utf-8")
    clean = re.sub(r"/\*.*?\*/", "", source, flags=re.S)
    clean = re.sub(r"""(["'])(?:\\.|(?!\1).)*?\1""", "", clean, flags=re.S)
    assert clean.count("{") == clean.count("}"), path

for phase in ["files", "analysis", "writing", "quality", "delivery"]:
    path = root / f"pages/project-{phase}.html"
    tree = html.fromstring(path.read_text(encoding="utf-8"))
    assert tree.xpath("//*[@id='projectWorkspaceHeader']"), path
    scripts = tree.xpath("//script[@src]/@src")
    assert scripts.index("../assets/js/project-data.js") < scripts.index("../assets/js/project-common.js"), path
    assert scripts.index("../assets/js/opportunity-project-bridge.js") < scripts.index("../assets/js/project-common.js"), path
    assert tree.xpath("//*[contains(concat(' ',normalize-space(@class),' '),' workspace-content ')]"), path

file_tree = html.fromstring((root/"pages/project-files.html").read_text(encoding="utf-8"))
assert len(file_tree.xpath("//*[@id='projectFileTableBody']/tr[1]/td")) == 5
assert file_tree.xpath("//*[@id='confirmProjectReparse']")
assert file_tree.xpath("//*[@id='confirmDeleteProjectFile']")
analysis_tree = html.fromstring((root/"pages/project-analysis.html").read_text(encoding="utf-8"))
assert analysis_tree.xpath("//*[@id='resultMatterBody']/tr[@data-result-category]")
assert analysis_tree.xpath("//*[@id='confirmGenerateBid']")
delivery_tree = html.fromstring((root/"pages/project-delivery.html").read_text(encoding="utf-8"))
assert delivery_tree.xpath("//*[@id='deliveryArchiveFileList']/*[@data-archive-shared]")
assert delivery_tree.xpath("//*[@id='downloadWordPackage']")
print(f"PASS: {len(js_files)} JS syntax checks, {len(pages)} HTML resource/id checks, CSS braces and shared-workbench structure.")
