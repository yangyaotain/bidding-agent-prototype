const fs = require("fs"), vm = require("vm"), assert = require("assert");
const JSZip = require("C:/Users/Yangy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/jszip");
function storage() {
  const map = new Map();
  return { getItem: key => map.has(key) ? map.get(key) : null, setItem: (key,value) => map.set(key,String(value)), removeItem: key => map.delete(key), key: i => [...map.keys()][i], get length() { return map.size; } };
}
const localStorage = storage(), sessionStorage = storage();
function context(path="project-files.html", type="navigate") {
  const win = { localStorage, sessionStorage, location: { pathname: "/pages/" + path, search: "", href: "file:///pages/" + path }, performance: { getEntriesByType: () => [{type}] }, setTimeout: () => 0 };
  win.window = win; win.URLSearchParams = URLSearchParams; win.TextEncoder = TextEncoder; win.Uint8Array = Uint8Array; win.DataView = DataView;
  const c = vm.createContext(win);
  for (const file of ["project-data", "opportunity-store", "opportunity-project-bridge"]) vm.runInContext(fs.readFileSync("assets/js/" + file + ".js","utf8"), c, { filename: file });
  return c;
}
function reload(c, path, type) { return context(path,type); }
(async function () {
  let c = context("opportunities.html"), s = c.BiddingProjectStore, o = c.OpportunityStore;
  const defaults = o.get().opportunities.map(item => item.id);
  assert.equal(defaults.length,16);
  const input = [{name:"共享数据平台采购文件.pdf",size:"2 MB",main:true,version:1},{name:"报价清单.xlsx",size:"45 KB",main:false,version:1}];
  const a = s.create(input), b = s.create([{name:"知识服务采购文件.docx",size:"1 MB",main:true}]);
  assert.notEqual(a.id,b.id);
  assert.equal(a.files.length,2);
  assert.notEqual(a.name,b.name);
  assert.equal(s.allowed(a,"writing"),false);
  assert.equal(s.get("missing-project"),null);
  assert.throws(()=>s.create([{name:"报价.xlsx",main:true}]));
  const opportunity = o.get().opportunities.find(item=>item.review==="approved" && !item.recheck && item.files.some(file=>file.main));
  assert(opportunity);
  const transferred = o.transfer(opportunity.id,"周晓雯",opportunity.files);
  const projectId = transferred.id;
  assert(transferred.sourceOpportunity.assessment);
  assert.equal(transferred.sourceOpportunity.assessment.noticeRevision,opportunity.revision);
  assert.equal(o.find(opportunity.id).review,"transferred");
  assert.equal(o.transfer(opportunity.id,"周晓雯",opportunity.files).id,projectId);
  const originalSnapshot = JSON.stringify(s.get(projectId).sourceOpportunity);
  for (const stage of ["解析结果","标书编制","质量审核","交付归档"]) {
    for (const project of [a,transferred]) s.save(project.id,{status:"ongoing",stage,progress:stage==="解析结果"?38:stage==="标书编制"?64:stage==="质量审核"?92:96});
    c = reload(c,"project-writing.html"); s=c.BiddingProjectStore; o=c.OpportunityStore;
    assert.equal(s.get(a.id).stage,stage);
    assert.equal(s.get(projectId).stage,stage);
    assert.equal(o.find(opportunity.id).review,"transferred");
    assert.equal(s.all().find(item=>item.id===projectId).stage,stage);
  }
  assert.equal(s.entry(s.get(projectId)),"project-delivery.html");
  o.change(next=>{const item=next.opportunities.find(item=>item.id===opportunity.id); item.summary="更正后的范围";item.revision+=1;});
  assert.equal(JSON.stringify(s.get(projectId).sourceOpportunity),originalSnapshot);
  s.save(projectId,{files:input,filesChanged:true});
  assert.equal(s.allowed(s.get(projectId),"delivery"),false);
  assert.equal(s.entry(s.get(projectId)),"project-files.html");
  s.save(projectId,{filesChanged:false,status:"ongoing",stage:"解析结果",analysis:c.ProjectWorkspaceData.analysis(s.get(projectId))});
  assert.equal(s.get(projectId).files.length,2);
  const docs = c.ProjectWorkspaceData.documents(s.get(projectId));
  assert.equal(docs.technical.pageCount,8);
  assert.equal(docs.business.pages.length,8);
  assert(docs.technical.pages.every(page=>page.html.includes(transferred.name) && !page.html.includes("港口")));
  const marker = "biddingWordFlow:v1:" + projectId + ":technical";
  sessionStorage.setItem(marker,JSON.stringify({pages:["保留的编辑内容"]}));
  sessionStorage.setItem("biddingManualQualityReview:v1:"+projectId,"审核记录");
  sessionStorage.setItem("biddingWordFlow:v1:"+a.id+":technical","独立项目正文");
  c=reload(c,"project-quality.html","reload");s=c.BiddingProjectStore;
  assert(sessionStorage.getItem(marker));
  assert(s.get(projectId));
  c=reload(c,"opportunities.html","navigate"); assert(c.BiddingProjectStore.get(projectId));
  const historyCount=c.OpportunityStore.get().runs.length;
  const rules=JSON.stringify(c.OpportunityStore.get().rules);
  c=reload(c,"opportunities.html","reload");s=c.BiddingProjectStore;o=c.OpportunityStore;
  assert.equal(o.find(opportunity.id).review,"approved");
  assert.equal(s.get(projectId),null);
  assert.equal(sessionStorage.getItem(marker),null);
  assert.equal(sessionStorage.getItem("biddingManualQualityReview:v1:"+projectId),null);
  assert.equal(sessionStorage.getItem("biddingWordFlow:v1:"+a.id+":technical"),"独立项目正文");
  assert(s.get(a.id) && s.get(b.id));
  assert.equal(JSON.stringify(o.get().rules),rules);
  assert.equal(o.get().runs.length,historyCount);
  const archivedRound=o.get().previousOpportunityRound || o.get().beforeOpportunitySamples;
  assert(archivedRound.projectWorkspace[marker]);
  const baseline=s.get("BID-OP-OP023");
  assert.equal(baseline.opportunityScore,97);
  assert.equal(baseline.sourceOpportunity.assessment.result.score,97);
  // Deleting a converted archived project retains the human bidding decision.
  s.save("BID-OP-OP017",{stage:"交付归档",status:"archived"});
  s.remove("BID-OP-OP017");
  assert.equal(o.find("OP017").review,"approved");
  assert.equal(s.get("BID-OP-OP017"),null);
  s.remove(b.id);assert.equal(reload(c).BiddingProjectStore.get(b.id),null);
  // Inspect actual generated DOCX/PDF bytes in memory, without a browser or service.
  c.document = { createElement: () => { let value=""; return {set innerHTML(html){value=html;},querySelectorAll:()=>[],get textContent(){return value.replace(/<[^>]*>/g," ");}}; } };
  vm.runInContext(fs.readFileSync("assets/js/bid-versioning.js","utf8"),c);
  vm.runInContext(fs.readFileSync("assets/js/project-document-export.js","utf8"),c);
  const project=s.get(a.id), version=c.BiddingBidVersions.load(project)[0];
  c.BiddingBidVersions.saveSnapshot(project,version.id,"technical",["<h1>当前版本独立正文</h1><p>不使用其他项目内容</p>"]);
  const word=c.BiddingProjectExport.file(project,version,"technical","docx");
  const zip=await JSZip.loadAsync(Buffer.from(word));
  const body=await zip.file("word/document.xml").async("string");
  assert(body.includes("当前版本独立正文") && !body.includes("某港口"));
  const pdf=c.BiddingProjectExport.file(project,version,"technical","pdf");
  assert(Buffer.from(pdf).toString("utf8").startsWith("%PDF-1.4"));
  const { PDFDocument } = require("C:/Users/Yangy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pdf-lib");
  const parsed=await PDFDocument.load(pdf);assert.equal(parsed.getPageCount(),1);
  console.log("PASS: both creation paths, phase updates, file persistence, frozen source assessment, reset isolation, deletion, own DOCX/PDF snapshots.");
})().catch(error=>{console.error(error);process.exitCode=1;});
