const fs = require("fs"), vm = require("vm"), assert = require("assert");
function storage() {
  const map = new Map();
  return {getItem:key=>map.get(key)||null,setItem:(key,value)=>map.set(key,String(value)),removeItem:key=>map.delete(key),key:i=>[...map.keys()][i],get length(){return map.size;}};
}
function load(local=storage(),session=storage(),page="opportunities.html",reload=false) {
  const w={localStorage:local,sessionStorage:session,location:{pathname:"/pages/"+page,search:"",href:"/pages/"+page},performance:{getEntriesByType:()=>[{type:reload?"reload":"navigate"}]},AppCurrentUser:{name:"李明远",role:"管理员"},URL,URLSearchParams,setTimeout:()=>0};
  w.window=w; w.clearTimeout=()=>{}; vm.createContext(w);
  for(const name of ["project-data","knowledge-data","opportunity-evidence","opportunity-store"])vm.runInContext(fs.readFileSync("assets/js/"+name+".js","utf8"),w);
  return w;
}
function updateRule(s,patch){const current=s.copy(s.get().rules[0]);return s.saveRule(Object.assign(current,patch),current.revision);}
function fresh(){const w=load();return {w,s:w.OpportunityStore};}
{
  const {s}=fresh(), item=s.get().opportunities.find(i=>i.review==="approved"&&!i.recheck), id=item.id;
  const score=s.assessment(item).result.score, history=item.history.length;
  for(const patch of [{hours:3},{lookback:9},{sources:["S1","S2"]}]) {
    const expected=s.actionContext(id);
    updateRule(s,patch);
    assert.equal(s.find(id).recheck,false);
    assert.equal(s.assessment(s.find(id)).stale,false);
    assert.equal(s.contextMessage(id,expected),"");
    assert.equal(s.find(id).history.length,history);
  }
  assert.equal(s.assessment(s.find(id)).result.score,score);
  s.reassess(id);assert.equal(s.find(id).recheck,false);
  const expected=s.actionContext(id);
  updateRule(s,{threshold:61});
  assert(s.find(id).recheck && s.assessment(s.find(id)).stale);
  assert.throws(()=>s.review(id,"approved","",expected),/筛选要求已更新/);
  assert.equal(s.find(id).history[0].ruleSnapshot.revision,s.get().rules[0].revision);
  const newExpected=s.actionContext(id);updateRule(s,{hours:4});
  assert(s.find(id).recheck);assert.equal(s.contextMessage(id,newExpected),"");
  s.review(id,"approved","按最新要求确认",newExpected);
  assert.equal(s.find(id).history[0].action,"重新确认投标");assert(!s.find(id).recheck);
}
{
  const {s}=fresh(), item=s.get().opportunities.find(i=>i.review==="pending"&&!s.status(i).blocked), id=item.id;
  const expected=s.actionContext(id), history=item.history.length;
  s.change(next=>{const x=next.opportunities.find(i=>i.id===id);x.revision++;x.summary="新的采购范围";});
  assert.throws(()=>s.review(id,"approved","旧弹窗",expected),/公告内容已更新/);
  assert.equal(s.find(id).review,"pending");assert.equal(s.find(id).history.length,history);
  s.review(id,"approved","最新内容",s.actionContext(id));assert.equal(s.find(id).approvedRevision,s.find(id).revision);
  const oldState=s.actionContext(id);s.review(id,"rejected","暂不参与",oldState);
  assert.throws(()=>s.review(id,"approved","旧决定",oldState),/处理状态已变化/);
  s.review(id,"approved","重新参与",s.actionContext(id));
  assert.equal(s.find(id).history[0].action,"重新确认投标");
  assert(s.find(id).history.some(i=>i.action==="放弃机会"));
  const expectedScore=s.actionContext(id);
  s.change(next=>{const x=next.opportunities.find(i=>i.id===id);x.assessmentSnapshot.result.score--;});
  assert.throws(()=>s.review(id,"rejected","",expectedScore),/初评结果已更新/);
}
{
  const {w,s}=fresh(), blocked=s.get().opportunities.find(i=>s.status(i).blocked&&!i.projectId);
  assert.throws(()=>s.review(blocked.id,"approved","",s.actionContext(blocked.id)),/暂不能确认投标/);
  s.review(blocked.id,"rejected","",s.actionContext(blocked.id));assert.equal(s.find(blocked.id).review,"rejected");
  const item=s.get().opportunities.find(i=>i.review==="approved"&&!i.recheck&&!s.status(i).blocked), id=item.id;
  const expected=s.actionContext(id);
  assert.throws(()=>s.transfer(id,"李明远",[],expected),/主招标文件/);
  assert.throws(()=>s.transfer(id,"李明远",[{name:"清单.xlsx",main:true}],expected),/主招标文件/);
  assert.throws(()=>s.transfer(id,"李明远",[{name:"1.pdf",main:true},{name:"2.docx",main:true}],expected),/主招标文件/);
  const input=[{name:"本次补传采购文件.pdf",size:"2 MB",main:true},{name:"报价清单.xlsx",size:"10 KB",main:false}];
  const project=s.transfer(id,"周晓雯",input,expected), record=s.find(id).transferRecord;
  assert.equal(record.mainFileName,input[0].name);assert.equal(record.owner,"周晓雯");assert.equal(record.files.length,2);
  assert.equal(s.find(id).history[0].transferSnapshot.mainFileName,input[0].name);
  assert(s.find(id).history[0].note.includes(input[0].name));
  assert.equal(s.transfer(id,"李明远",input,expected).id,project.id);
  assert.equal(s.get().projects.filter(p=>p.opportunityId===id).length,1);
  s.updateProject(project.id,{fileName:"项目中后续更换的文件.pdf",files:[{name:"项目中后续更换的文件.pdf",main:true}]});
  assert.equal(s.find(id).transferRecord.mainFileName,input[0].name);
  const old=s.actionContext("OP003"), round=s.get().opportunitySampleRound.id, runs=JSON.stringify(s.get().runs), rules=JSON.stringify(s.get().rules);
  const ordinary=w.BiddingProjectStore.create([{name:"独立上传项目.docx",main:true}]);
  const reset=load(w.localStorage,w.sessionStorage,"opportunities.html",true);
  assert.notEqual(reset.OpportunityStore.get().opportunitySampleRound.id,round);
  assert(reset.OpportunityStore.contextMessage("OP003",old).includes("机会记录已变化"));
  assert.equal(JSON.stringify(reset.OpportunityStore.get().runs),runs);
  assert.equal(JSON.stringify(reset.OpportunityStore.get().rules),rules);
  assert(reset.BiddingProjectStore.get(ordinary.id));
}
// Invoke the real action/render functions with a small DOM stub. No service or browser.
function uiContext(id="",detail=false) {
  const w=load();w.location.search=id?"?id="+id:"";
  w._events={};w._intervals=[];
  w.addEventListener=(name,handler)=>{(w._events[name]||=[]).push(handler);};
  w.setInterval=(handler,ms)=>{w._intervals.push({handler,ms});return w._intervals.length;};
  const nodes=new Map();
  function node(key) {
    if(!nodes.has(key))nodes.set(key,{innerHTML:"",textContent:"",hidden:false,disabled:false,title:"",value:"",events:{},focus(){},remove(){},removeAttribute(){},setAttribute(name,value){this[name]=value;},addEventListener(name,handler){this.events[name]=handler;},insertAdjacentHTML(position,html){this.innerHTML+=html;},querySelectorAll(){return [node("#opReviewConfirm"),node('#opModalForm button[type="submit"]')];}});
    return nodes.get(key);
  }
  w.document={body:{hasAttribute:()=>detail},contains:()=>false,activeElement:null,_events:{},addEventListener(name,handler){(this._events[name]||=[]).push(handler);},querySelector(selector){
    if(selector==="#opModal.open" || selector===".prototype-modal.open")return w._modalOpen?node(selector):null;
    if(selector==="#opReloadAction")return (node("#opFeedback").innerHTML+node("#opModalFooter").innerHTML).includes("opReloadAction")?node(selector):null;
    if(selector==='textarea[name="note"]')return null;
    return node(selector);
  },querySelectorAll:()=>[],readyState:"loading"};
  w.projectPrototype={closeLayers(){w._modalOpen=false;}};
  w.BiddingFileIcons={markup:name=>'<span class="file-type-icon">'+name.replace(/</g,"&lt;")+"</span>"};
  w.showToast=message=>{w._toast=message;};
  let source=fs.readFileSync("assets/js/opportunities.js","utf8");
  const modalStart=source.indexOf("  function modal("), modalEnd=source.indexOf("  function syncOpportunityView()",modalStart);
  source=source.slice(0,modalStart)+'  function modal(title, description, body, submitLabel, onSubmit, customFooter) { activeAction=null; activeSourceEdit=null; window._modalOpen=true; window._modal={title,description,body,submitLabel,onSubmit,customFooter}; document.querySelector("#opFeedback").innerHTML=""; document.querySelector("#opModalFooter").innerHTML=customFooter||""; }\n'+source.slice(modalEnd);
  const renderStart=source.indexOf("  function render() {"),renderEnd=source.indexOf("  function readListFilters()",renderStart);
  source=source.slice(0,renderStart)+'  function render() { window._rendered=true; if (window._onRender) window._onRender(); }\n'+source.slice(renderEnd);
  source=source.replace('if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();','window.OpportunityActionsTest={reviewModal,transferModal,onAction,opportunityAction,renderDetail,renderRows,renderListShell,readListFilters,query,currentRisks,mergeTransferDraft,isUrgent,renderMetrics,assessmentJudgments,assessmentRows,materialPeriod,ruleSnapshotView,nextText,reviewConcerns,opportunitySourceOptions,sourcesFor,guard,reloadSource,collect,fileEntry,openOpportunityFile,ruleFieldsMarkup,websiteRecords,collectionSourceOptions,resolveRunSource,sourceCollectionView,renderRuns,queryRuns,scoreMarkup,moneyMarkup,assessmentUnknowns,sourceModal,sourceLoginFields,bindSourceLoginForm,sourceCollectionBlock,renderSources,checkContent,ui,close,syncActionTiming,tickOpportunityTiming,init,active:()=>activeAction};');
  vm.runInContext(source,w);
  return {w,s:w.OpportunityStore,u:w.OpportunityActionsTest,node};
}
function selectReview(node,outcome) {
  const input=node(outcome==="approved"?"#opReviewApproved":"#opReviewRejected");
  if(!input.disabled)node("#opModalForm").events.change({target:{name:"outcome",value:outcome,disabled:false}});
}
// Choosing an outcome never writes a decision; only the final confirmation does.
for(const sample of [
  {id:"OP015",approve:false,reject:false},
  {id:"OP022",approve:false,reject:false},
  {id:"OP018",approve:false,reject:true},
  {id:"OP021",approve:true,reject:true},
  {id:"OP016",approve:true,reject:false}
]) {
  const {w,s,u,node}=uiContext();const before=JSON.stringify(s.find(sample.id));
  u.reviewModal(sample.id);
  assert.equal(node("#opReviewApproved").disabled,sample.approve);
  assert.equal(node("#opReviewRejected").disabled,sample.reject);
  assert(node("#opReviewConfirm").disabled);
  assert.equal((w._modal.customFooter.match(/<button\b/g)||[]).length,2);
  assert(!w._modal.body.includes(" checked"));
  assert.equal(w._modal.title,s.find(sample.id).review==="pending"?"人工确认":"重新确认");
  if(s.find(sample.id).review!=="pending")assert(w._modal.body.includes("当前决定："));
  if(!sample.approve)selectReview(node,"approved");
  else if(!sample.reject)selectReview(node,"rejected");
  assert.equal(JSON.stringify(s.find(sample.id)),before);
  u.close();assert(!w._modalOpen);assert.equal(JSON.stringify(s.find(sample.id)),before);
}
{
  const {w,s,u,node}=uiContext();u.reviewModal("OP018");
  const history=s.find("OP018").history.length;
  selectReview(node,"rejected");assert(node("#opReviewConfirm").disabled);
  selectReview(node,"approved");assert(!node("#opReviewConfirm").disabled);
  w._modal.onSubmit({get:key=>key==="outcome"?"approved":""});
  assert.equal(s.find("OP018").review,"approved");assert.equal(s.find("OP018").history.length,history+1);
  assert.equal(s.find("OP018").history[0].action,"重新确认投标");
}
{
  const {w,s,u,node}=uiContext();
  for(const item of s.get().opportunities) {
    const buttons=u.opportunityAction(item,"text-btn compact-btn op-list-main-action");
    if(item.projectId)assert(buttons.includes("查看项目")&&!buttons.includes('data-op-action="review"'));
    else if(item.review==="approved"){
      assert(buttons.includes(">重新确认<")&&!buttons.includes("放弃机会"));
      assert.equal(buttons.includes(">转入投标项目<"),!item.recheck);
      assert.equal((buttons.match(/data-op-action="review"/g)||[]).length,1);
    }
    else if(item.review==="rejected")assert(buttons.includes(">重新确认<")&&!buttons.includes("转入投标项目"));
    else assert(buttons.includes("人工确认"));
    assert(!buttons.includes('data-op-action="abandon"'));
    if(item.review==="approved"||item.review==="rejected")assert(!buttons.includes('data-op-action="review" data-id="'+item.id+'" disabled'));
  }
  const pending=s.get().opportunities.find(i=>i.review==="pending"&&!s.status(i).blocked),id=pending.id;
  u.ui.filters.review="pending";u.reviewModal(id);
  assert(w._modal.body.includes("当前公告 V")&&w._modal.body.includes("采购需求"));
  assert.equal((w._modal.customFooter.match(/<button\b/g)||[]).length,2);
  assert(w._modal.customFooter.includes(">取消<")&&w._modal.customFooter.includes(">确认<"));
  assert(!w._modal.customFooter.includes(">放弃机会<")&&!w._modal.customFooter.includes(">确认投标<"));
  assert(node("#opReviewConfirm").disabled);
  assert.throws(()=>w._modal.onSubmit({get:()=>""}),/请先选择处理结果/);
  selectReview(node,"approved");assert(!node("#opReviewConfirm").disabled);
  assert.equal(s.find(id).review,"pending");
  w._modal.onSubmit({get:key=>key==="outcome"?"approved":"确认参与"});
  assert.equal(s.find(id).review,"approved");assert(w._toast.includes("“已确认投标”"));
  assert.equal(s.find(id).history[0].note,"确认参与");
  s.change(next=>{const item=next.opportunities.find(i=>i.id===id);item.recheck=true;});
  u.reviewModal(id);assert(w._modal.body.includes(">确认投标<"));
  selectReview(node,"approved");
  s.change(next=>{const item=next.opportunities.find(i=>i.id===id);item.revision++;});
  w._modal.onSubmit({get:key=>key==="outcome"?"approved":""});
  assert(u.active().invalid);assert(node("#opFeedback").textContent.includes("公告内容已更新"));
  assert(node("#opFeedback").innerHTML.includes("查看最新内容"));
  assert(!node("#opModalFooter").innerHTML.includes("查看最新内容"));
  assert(node("#opReviewConfirm").disabled);
  u.onAction("reloadAction","");assert(!u.active().invalid);
  assert(w._modal.body.includes("当前公告 V"+s.find(id).revision));
}
{
  const {w,s,u,node}=uiContext();
  const item=s.get().opportunities.find(i=>i.review==="approved"&&!i.recheck&&i.files.some(f=>f.main)),id=item.id;
  u.transferModal(id);
  const submit=node('#opModalForm button[type="submit"]');
  assert(!submit.disabled);assert(node("#opTransferFiles").innerHTML.includes("已选主招标文件"));
  node("#opTransferFiles").events.change({target:{dataset:{fileIndex:"0"},type:"checkbox",checked:false}});
  assert(submit.disabled);assert(node("#opTransferFiles").innerHTML.includes("请选择一份"));
  node("#opTransferUpload").events.change({target:{files:[{name:item.files[0].name,size:2000},{name:"不支持的文件.exe",size:100}]}});
  assert(node("#opTransferFileFeedback").textContent.includes("同名文件")&&node("#opTransferFileFeedback").textContent.includes("暂不支持"));
  node("#opTransferUpload").events.change({target:{files:[{name:"补传主文件.docx",size:2000},{name:"补充清单.xlsx",size:2000}]}});
  assert(!submit.disabled);assert(node("#opTransferFiles").innerHTML.includes("补传主文件.docx"));
  assert(!node("#opTransferFiles").innerHTML.includes("0.00 MB"));
  w._modal.onSubmit({get:()=>"周晓雯"});
  assert.equal(s.find(id).review,"transferred");assert.equal(s.find(id).transferRecord.mainFileName,"补传主文件.docx");
  const projectId=s.find(id).projectId; s.updateProject(projectId,{stage:"标书编制",status:"ongoing"});
  u.transferModal(id);assert(w.location.href.startsWith("project-writing.html?id="));
}
{
  const {s,u,node}=uiContext("OP016",true);
  const originalRisks=JSON.stringify(s.find("OP016").risks);
  const files=[{name:"详情补传文件.pdf",main:true,size:"1 MB"}];
  s.transfer("OP016","周晓雯",files,s.actionContext("OP016"));u.renderDetail();
  const html=node("#opportunityDetail").innerHTML;
  assert(html.includes("转入主文件：详情补传文件.pdf")&&html.includes("附件 0 份"));
  assert(html.includes("查看项目")&&!html.includes('data-op-action="review"'));
  assert(!html.includes("缺少主招标文件")&&!html.includes("尚未取得主招标文件"));
  u.ui.filters={query:s.find("OP016").name};u.ui.page=1;u.renderRows();
  const list=node("#opListResults").innerHTML;
  assert(!list.includes("缺少主招标文件")&&!list.includes("尚未取得主招标文件"));
  assert(list.includes("查看项目")&&!list.includes('data-op-action="transfer"'));
  assert.equal(JSON.stringify(s.find("OP016").risks),originalRisks);
}
{
  const {s,u,node}=uiContext();
  u.ui.filters={query:s.find("OP022").name};u.renderRows();
  assert(node("#opListResults").innerHTML.includes("驻场服务延长，需重排人员"));
  assert(node("#opListResults").innerHTML.includes("需要重新确认人员安排"));
  s.change(next=>{next.opportunities.find(item=>item.id==="OP022").risks=["交付安排发生调整，需要确认新增驻场人员及履约范围。"];});
  u.renderRows();
  assert(node("#opListResults").innerHTML.includes(">交付安排发生调整，需要确认新增驻场人员及履约范围。</div>"));
}
// All close routes must redraw stale data without changing applied filters or drafts.
for(const detail of [false,true])for(const route of ["cancel","header","escape","backdrop"]) {
  const {w,s,u,node}=uiContext("OP015",detail);u.init();
  u.ui.filters={query:"已应用查询",review:"pending"};u.ui.page=2;w.scrollY=418;
  node("#opFilters").elements={query:{value:"尚未提交的查询"},review:{value:"pending"}};
  w.FormData=class{constructor(form){this.values=Object.entries(form.elements).map(([key,input])=>[key,input.value]);}[Symbol.iterator](){return this.values[Symbol.iterator]();}};
  w._onRender=()=>{node("#opFilters").elements.query.value="已应用查询";};
  u.reviewModal("OP015");
  s.review("OP015","approved","另一页面已确认",s.actionContext("OP015"));
  for(const handler of w._events.storage||[])handler({key:s.key});
  assert(u.active().invalid);w._rendered=false;
  const callbacks=[];w.setTimeout=fn=>{callbacks.push(fn);};w.scrollTo=(x,y)=>{w._scroll=[x,y];};
  if(route==="cancel")u.onAction("close","");
  else {
    // Common layer handlers run first; the module still needs the old action context.
    w.projectPrototype.closeLayers();
    if(route==="escape")for(const handler of w.document._events.keydown||[])handler({key:"Escape",preventDefault(){},stopImmediatePropagation(){}});
    else for(const handler of w.document._events.click||[])handler({target:{id:route==="backdrop"?"prototypeBackdrop":"",closest:selector=>route==="header"&&selector==="[data-close-layer]"?{}:null}});
  }
  callbacks.forEach(fn=>fn());
  assert(w._rendered && !w._modalOpen && !u.active(),route);
  assert.equal(u.ui.page,2);assert.equal(u.ui.filters.query,"已应用查询");
  assert.equal(node("#opFilters").elements.query.value,"尚未提交的查询");assert.deepEqual(w._scroll,[0,418]);
  assert.equal(s.find("OP015").review,"approved");
}
// Reloading a stale review shows the current decision and cannot repeat abandonment.
{
  const {w,s,u,node}=uiContext();u.reviewModal("OP015");
  s.review("OP015","rejected","另一页面已放弃",s.actionContext("OP015"));
  w._modal.onSubmit({get:key=>key==="outcome"?"rejected":""});
  const history=s.find("OP015").history.length;
  u.onAction("reloadAction","");
  assert(w._modalOpen && u.active());assert.equal(w._modal.title,"重新确认");
  assert(w._modal.body.includes("当前决定：已放弃"));
  assert(node("#opReviewRejected").disabled&&node("#opReviewConfirm").disabled);
  assert.equal(s.find("OP015").history.length,history);
  assert.throws(()=>w._modal.onSubmit({get:key=>key==="outcome"?"rejected":""}),/当前已放弃/);
  assert.equal(s.find("OP015").history.length,history);
}
// Crossing the deadline updates the existing controls, without losing the draft.
for(const detail of [false,true]) {
  const {w,s,u,node}=uiContext("OP016",detail);
  s.change(next=>{next.opportunities.find(item=>item.id==="OP016").deadline=s.stamp(Date.now()-3600000);});
  const item=s.find("OP016"),buttons=u.opportunityAction(item,"primary-btn");
  const controls=Array.from(buttons.matchAll(/<button\b[^>]*>/g),match=>match[0]);
  assert(controls.find(button=>button.includes('data-op-action="transfer"')).includes(" disabled"));
  assert(!controls.find(button=>button.includes('data-op-action="review"')).includes(" disabled"));
  if(detail){u.renderDetail();assert(node("#opportunityDetail").innerHTML.includes(">重新确认<"));assert(!node("#opportunityDetail").innerHTML.includes('data-op-action="abandon"'));}
  u.reviewModal(item.id);assert.equal(w._modal.title,"重新确认");
  assert(node("#opReviewApproved").disabled&&!node("#opReviewRejected").disabled);
  selectReview(node,"rejected");assert(!node("#opReviewConfirm").disabled);
  w._modal.onSubmit({get:key=>key==="outcome"?"rejected":"期限已截止"});
  assert.equal(s.find(item.id).review,"rejected");assert.equal(s.find(item.id).history[0].action,"放弃机会");
}
for(const type of ["review","transfer"]) {
  const {w,s,u,node}=uiContext();u.init();
  const item=s.find(type==="review"?"OP015":"OP003");
  if(type==="review"){u.reviewModal(item.id);selectReview(node,"approved");assert(!node("#opReviewConfirm").disabled);}else u.transferModal(item.id);
  const before=s.find(item.id).review, fileCount=u.ui.files.length, history=item.history.length, score=s.assessment(item).result.score;
  const expire=new Date(item.deadline).getTime()+1000;
  vm.runInContext("Date.now=function(){return "+expire+";}",w);
  w._intervals.find(timer=>timer.ms===1000).handler();
  const submit=node(type==="review"?"#opReviewConfirm":'#opModalForm button[type="submit"]');
  assert(submit.disabled);assert(node("#opFeedback").textContent.includes("投标已截止"));
  assert.equal(s.find(item.id).review,before);assert.equal(s.find(item.id).history.length,history);assert.equal(s.assessment(item).result.score,score);
  assert.equal(u.ui.files.length,fileCount);assert(!u.active().invalid);
  if(type==="review") {
    assert(node("#opReviewApproved").disabled);assert.equal(node("#opReviewRejected").disabled,false);
    selectReview(node,"rejected");assert(!submit.disabled);
    w._modal.onSubmit({get:key=>key==="outcome"?"rejected":""});assert.equal(s.find(item.id).review,"rejected");
  } else {
    node("#opTransferFiles").events.change({target:{dataset:{fileIndex:"0"},type:"checkbox",checked:false}});
    node("#opTransferFiles").events.change({target:{dataset:{fileIndex:"0"},type:"radio"}});
    assert(submit.disabled);
    w._modal.onSubmit({get:()=>"李明远"});assert.equal(s.find(item.id).review,"approved");
    assert(!s.get().projects.some(project=>project.opportunityId===item.id));
  }
}
{
  const {w,s,u}=uiContext();u.init();w._rendered=false;
  const before=s.find("OP015").review, score=s.assessment(s.find("OP015")).result.score;
  vm.runInContext("Date.now=function(){return "+(new Date(s.find("OP015").deadline).getTime()+1000)+";}",w);
  u.tickOpportunityTiming();assert(w._rendered);
  assert.equal(s.find("OP015").review,before);assert.equal(s.assessment(s.find("OP015")).result.score,score);
  w._rendered=false;u.tickOpportunityTiming();assert(!w._rendered);
}
assert(fs.readFileSync("assets/js/opportunities.js","utf8").includes("72 小时内获取、报名或投标截止"));
{
  const {w,s,u,node}=uiContext("OP016",true);
  for(const [score,band] of [[0,"low"],[59,"low"],[60,"medium"],[79,"medium"],[80,"high"],[100,"high"]]) {
    for(const variant of [undefined,"detail","inline"]) {
      const markup=u.scoreMarkup(score,variant);
      assert(markup.includes("op-score-"+band));assert(markup.includes('aria-label="机会初评分 '+score+' 分'));
      assert(!markup.includes("/100")&&!markup.includes("/ 100"));
    }
  }
  assert(u.scoreMarkup(null).includes("op-score-unknown"));
  for(const variant of ["list","hero","inline"]) {
    const markup=u.moneyMarkup(1234.5,variant);
    assert(markup.includes("1,234.5"));assert(markup.includes("op-money-unit"));
    assert(markup.includes("op-money-"+variant));
    assert.equal(markup.includes("table-amount"),variant==="list");
  }
  assert(u.moneyMarkup(0,"list").includes(">0<"));
  assert(u.moneyMarkup(null,"list").includes("公告未明确")&&!u.moneyMarkup(null,"list").includes("amount-text"));
  s.change(next=>{const item=next.opportunities.find(i=>i.id==="OP016");item.revision++;item.recheck=true;});
  u.renderDetail();
  const detail=node("#opportunityDetail").innerHTML;
  assert(detail.includes("op-detail-saved-score")&&detail.includes("op-money-hero")&&detail.includes("op-money-inline"));
  assert(detail.includes("待重新确认")&&!detail.includes("依据已更新"));
  assert(!detail.includes("查看依据")&&detail.includes("评估时间")&&detail.includes("处理记录"));
  u.reviewModal("OP016");
  assert(w._modal.body.includes("op-score-inline")&&w._modal.body.includes("op-money-inline"));
  s.review("OP016","approved","",s.actionContext("OP016"));u.transferModal("OP016");
  assert(w._modal.body.includes("op-money-inline"));
  assert.equal(s.find("OP016").review,"approved");
  u.ui.filters={};u.renderRows();
  const list=node("#opListResults").innerHTML;
  assert(list.includes("<th>本包预算</th>")&&list.includes("op-money-list")&&list.includes("table-amount"));
  assert(!list.includes("op-list-region")&&!list.includes("依据已更新"));
  const rows=Array.from(list.matchAll(/<tr>(.*?)<\/tr>/g),match=>match[1]).filter(row=>row.includes("<td>"));
  rows.forEach(row=>{
    const cells=Array.from(row.matchAll(/<td(?:\s[^>]*)?>(.*?)<\/td>/g),match=>match[1]);
    assert.equal(cells.length,7);
    assert.equal((cells[0].match(/<small\b/g)||[]).length,2);
    assert(cells[0].includes(" · 采购包"));
    assert(cells[1].includes("op-money-list")||cells[1].includes("op-money-missing"));
    assert(!cells[1].includes("<small"));
  });
  assert.equal((list.match(/<td(?:\s|>)/g)||[]).length,((list.match(/<tr>/g)||[]).length-1)*7);
  for(const [filter,band] of [["80","high"],["60","medium"],["low","low"]]) {
    u.ui.filters={score:filter};u.renderRows();assert(node("#opListResults").innerHTML.includes("op-score-"+band));
  }
}
// Read and edit layouts retain the same fields, pairs and exact raw text.
{
  const {s,u}=uiContext(),before=JSON.stringify(s.get().rules[0]);
  const rule=s.copy(s.get().rules[0]);
  rule.keywords="数据治理, BI 报表、系统集成\n文档处理 & 报告生成";
  rule.excludes="复杂算法自研，前沿技术研究\n专业财务核算";
  const view=u.ruleFieldsMarkup(rule,false),edit=u.ruleFieldsMarkup(rule,true);
  const structure=html=>Array.from(html.matchAll(/<div class="([^"]+)" data-rule-field="([^"]+)">/g),match=>[match[2],match[1].split(" ").includes("wide")]);
  const expected=["description","keywords","excludes","regions","min","max","minDays","threshold","hours","lookback","remarks"];
  assert.deepEqual(structure(view),structure(edit));assert.deepEqual(structure(view).map(row=>row[0]),expected);
  assert(!view.includes("采集来源")&&!edit.includes('name="sources"')&&!edit.includes("全选"));
  assert.deepEqual(structure(view).filter(row=>!row[1]).map(row=>row[0]),["min","max","minDays","threshold","hours","lookback"]);
  for(const markup of [view,edit]){
    assert(markup.includes("数据治理, BI 报表、系统集成\n文档处理 &amp; 报告生成"));
    assert(markup.includes(rule.excludes));
    assert(markup.includes("最低包预算（万元）")&&markup.includes("初评入库标准（分）"));
  }
  assert(view.includes("op-rule-value-number")&&view.includes("op-rule-value-muted"));
  assert.equal(JSON.stringify(s.get().rules[0]),before);
}
// The single rule covers all sources, including those excluded by legacy selections.
{
  const {w,s}=fresh(),previous=s.copy(s.get());
  previous.rules[0].sources=["S1"];
  w.localStorage.setItem(s.key,JSON.stringify(previous));
  const current=load(w.localStorage).OpportunityStore,rule=current.get().rules[0];
  assert(!Object.hasOwn(rule,"sources"));assert.equal(JSON.stringify(rule.legacySources),'["S1"]');
  const revision=rule.revision,basis=current.ruleBasis(rule);
  const unchanged=current.saveRule(Object.assign({},rule,{sources:[]}),revision);
  assert.equal(unchanged.revision,revision);assert.equal(current.ruleBasis(unchanged),basis);
  const single=current.collect("S3");assert.equal(single.rows.length,1);assert.equal(single.rows[0].id,"S3");
  assert.equal(single.ruleSources.length,3);
  const added=current.saveSource({name:"某采购信息发布平台",type:"企业采购",collectionUrl:"https://procurement.example.org/notices",column:"公开招标公告"}).source;
  assert.equal(current.get().rules[0].revision,revision);
  current.change(next=>{next.sources.find(item=>item.id==="S1").enabled=false;next.sources.find(item=>item.id==="S2").status="pending";});
  const all=current.collect();
  assert.equal(all.ruleSources.length,4);assert.equal(all.rows.length,1);assert.equal(all.rows[0].id,"S3");
  assert(all.skippedSources.some(item=>item.id===added.id));assert(all.skippedSources.some(item=>item.id==="S1"&&item.reason.includes("停用")));
  all.rows.forEach(row=>assert.equal(row.collectedCount,row.newCount+row.updatedCount+row.duplicateCount+row.excludedCount));
  current.change(next=>{next.collection.lastRun=Date.now()-3*3600000;});
  assert.equal(current.dueRules().length,1);
  assert.equal(JSON.stringify(current.get().rules[0].legacySources),'["S1"]');
}
{
  const {s}=fresh();s.change(next=>{next.sources=[];});
  assert.equal(updateRule(s,{hours:3}).hours,3);
}
// Website summaries and history resolve the same stable identity, even after renames.
{
  const {w,s,u,node}=uiContext();
  const initial=s.copy(s.get().runs),records=u.websiteRecords();
  assert.equal(records.length,7);assert(records.some(row=>row.state==="failed"));
  records.forEach(record=>{
    assert.equal(record.source,s.get().sources.find(source=>source.id===record.sourceId).name);
    assert(record.sourceSnapshot.collectionUrl);
    assert.equal(record.collectedCount,record.newCount+record.updatedCount+record.duplicateCount+record.excludedCount);
  });
  s.get().sources.forEach(source=>{
    const latest=records.find(record=>record.sourceId===source.id);
    assert(u.sourceCollectionView(source).includes(latest.at));assert.equal(source.lastSuccess,latest.at);
  });
  const local=w.localStorage;
  const reloaded=load(local,storage(),"opportunities.html",true).OpportunityStore;
  assert.equal(JSON.stringify(reloaded.get().runs),JSON.stringify(initial));
  const oldName=s.get().sources[1].name;
  s.saveSource(Object.assign({},s.get().sources[1],{name:"深圳政府采购公告平台"}),"S2");
  const renamed=u.websiteRecords().filter(record=>record.sourceId==="S2");
  assert(renamed.length>0&&renamed.every(record=>record.source==="深圳政府采购公告平台"&&record.sourceSnapshot.name===oldName));
  assert.equal(u.resolveRunSource(oldName,u.collectionSourceOptions(),false).source,"S2");
  node("#opRunFilters").elements={from:{},to:{}};
  u.ui.runFilters={source:"S2",result:"",from:"",to:""};u.renderRuns();
  assert.equal(u.ui.runFilters.source,"S2");assert(node("#opportunityContent").innerHTML.includes('value="S2" selected'));
  assert.equal((node("#opportunityContent").innerHTML.split("<tbody>")[1].split("</tbody>")[0].match(/<tr>/g)||[]).length,renamed.length);
  const commonName=s.get().sources[2].name;
  s.saveSource(Object.assign({},s.get().sources[0],{name:commonName}),"S1");
  const options=u.collectionSourceOptions();assert.equal(options.length,3);
  assert.notEqual(options.find(source=>source.id==="S1").label,options.find(source=>source.id==="S3").label);
  const s1Latest=u.websiteRecords().find(record=>record.sourceId==="S1").at;
  s.collect("S3");assert(u.sourceCollectionView(s.get().sources[0]).includes(s1Latest));
  u.ui.runFilters={source:"S1",result:"",from:"",to:""};u.renderRuns();
  assert.equal((node("#opportunityContent").innerHTML.split("<tbody>")[1].split("</tbody>")[0].match(/<tr>/g)||[]).length,2);
  s.change(next=>{for(let index=0;index<8;index++)next.sources.push({id:"EXTRA-"+index,name:"公告来源"+index,collectionUrl:"https://source"+index+".example.org/",enabled:false,status:"pending"});});
  u.ui.runFilters={source:"S2",result:"",from:"",to:""};u.renderRuns();
  assert(node("#opportunityContent").innerHTML.includes('type="search"'));
  const label=u.collectionSourceOptions().find(option=>option.id==="S2").label;
  assert.equal(u.resolveRunSource(label,u.collectionSourceOptions(),true).source,"S2");
  assert.equal(u.resolveRunSource("采购",u.collectionSourceOptions(),true).sourceQuery,"采购");
  const form=node("#opRunFilters");
  form.elements={source:{value:label},result:{value:""},from:{value:""},to:{value:"",setCustomValidity(){}}};form.reportValidity=()=>true;
  w.FormData=class{constructor(target){this.entries=Object.entries(target.elements).map(([key,input])=>[key,input.value]);}[Symbol.iterator](){return this.entries[Symbol.iterator]();}};
  u.queryRuns();assert.equal(u.ui.runFilters.source,"S2");assert.equal(u.ui.runFilters.sourceQuery,"");
  form.elements.source.value="采购";u.queryRuns();assert.equal(u.ui.runFilters.source,"");assert.equal(u.ui.runFilters.sourceQuery,"采购");
  form.elements.source.value="";u.queryRuns();assert.equal(u.ui.runFilters.source,"");assert.equal(u.ui.runFilters.sourceQuery,"");
}
{
  const {s,u}=uiContext();
  function run(id,rows,results){return {id:id,at:"2026-10-20 10:00",state:"success",newCount:5,updated:1,duplicate:2,excluded:0,rows:rows,results:results||[]};}
  const counts={newCount:5,updatedCount:1,duplicateCount:2,excludedCount:0,collectedCount:8};
  const oldName=s.get().sources[1].name;
  const old=run("LEGACY-NAME",[Object.assign({source:oldName,ok:true,state:"completed"},counts)]);
  old.ruleSources=[{id:"S2",name:oldName,collectionUrl:s.get().sources[1].collectionUrl}];
  s.change(next=>{next.runs=[old];});
  assert.equal(s.get().runs[0].rows[0].sourceId,"S2");
  assert(s.get().runs[0].sourceStatisticsBackup.rows[0].id===undefined);
  const unknown=run("UNKNOWN",[Object.assign({id:"UNKNOWN-SOURCE",source:"",ok:true},counts)]);
  s.change(next=>{next.runs=[unknown];});
  assert.equal(s.get().runs[0].rows.length,0);assert.equal(s.get().runs[0].unresolvedRows[0].original.id,"UNKNOWN-SOURCE");
  assert.equal(u.websiteRecords().length,0);
  s.change(()=>{});assert.equal(s.get().runs[0].unresolvedRows.length,1);
  const missing=run("MISSING",[{id:"S1",source:"来源一",ok:true},{id:"S2",source:"来源二",ok:true}]);
  s.change(next=>{next.runs=[missing];});
  assert.equal(s.get().runs[0].rows.length,0);assert.equal(s.get().runs[0].unresolvedRows.length,2);
  assert.equal(s.get().runs[0].newCount,5);assert.equal(s.get().runs[0].sourceStatisticsBackup.rows.length,2);
  const results=[];
  for(let index=0;index<4;index++)results.push({sourceId:"S1",noticeId:"ADD-"+index,kind:"added"});
  results.push({sourceId:"S1",noticeId:"UPDATE",kind:"updated"},{sourceId:"S1",noticeId:"DUP1",kind:"duplicate"},{sourceId:"S2",noticeId:"ADD-S2",kind:"added"},{sourceId:"S2",noticeId:"DUP2",kind:"duplicate"});
  const proven=run("PROVEN",[{id:"S1",source:"来源一",ok:true},{id:"S2",source:"来源二",ok:true}],results);
  s.change(next=>{next.runs=[proven];});
  assert.equal(s.get().runs[0].rows[0].collectedCount,6);assert.equal(s.get().runs[0].rows[1].collectedCount,2);
  s.change(next=>{next.runs=[run("ORPHAN",[Object.assign({id:"REMOVED",source:"原采购信息网",ok:true},counts)])];});
  assert.equal(u.websiteRecords()[0].sourceId,"REMOVED");assert(u.websiteRecords()[0].historical);
  assert(u.collectionSourceOptions().some(option=>option.id==="REMOVED"&&option.label.includes("历史来源")));
  s.change(next=>{next.sources[0].name=next.sources[2].name;next.runs=[run("AMBIGUOUS",[Object.assign({source:next.sources[0].name,ok:true},counts)])];});
  assert(s.get().runs[0].rows[0].sourceId.startsWith("legacy-record:"));assert(u.websiteRecords()[0].historical);
}
// Source authentication keeps only fixture markers, preserving checks, history and counting rules.
{
  const {w,s}=fresh();
  const checked=s.checkSource("S2",s.sourceConfig(s.get().sources[1]));
  assert(checked.checkResult.ok);
  assert(checked.checkResult.steps.find(step=>step.label==="附件权限").limited);
  assert.equal(s.sourceAccess(checked).state,"public");
  const config=s.sourceConfig(checked),saved=s.saveSource(Object.assign({},checked,{name:"深圳政府采购公告入口"}),"S2");
  assert(!saved.needsCheck&&saved.source.status==="ready");assert.equal(s.sourceConfig(saved.source),config);
  const source=s.get().sources[0],secret="Fixture-Only-Password-4921",initialRuns=s.get().runs.length;
  const login=s.saveSource(Object.assign({},source,{accessMode:"login",loginMethod:"password",loginAccount:"supplier_ops_01",loginPassword:secret}),source.id).source;
  assert(login.passwordSet&&login.status==="pending");assert.equal(s.sourceAccess(login).state,"pending");
  assert(!JSON.stringify(s.get()).includes(secret));assert(!w.localStorage.getItem(s.key).includes(secret));
  assert(!Object.hasOwn(login,"loginPassword"));
  assert.throws(()=>s.collect("S1"),/来源/);assert.equal(s.get().runs.length,initialRuns);
  const authenticated=s.checkSource("S1",s.sourceConfig(login));
  assert(authenticated.checkResult.ok&&s.sourceAccess(authenticated).state==="active");
  const revision=authenticated.credentialRevision;
  const retained=s.saveSource(Object.assign({},authenticated,{loginPassword:""}),"S1");
  assert(!retained.needsCheck&&retained.source.passwordSet);assert.equal(retained.source.credentialRevision,revision);
  assert.throws(()=>s.saveSource(Object.assign({},retained.source,{loginAccount:"supplier_ops_02",loginPassword:""}),"S1"),/更换账号/);
  const changed=s.saveSource(Object.assign({},retained.source,{loginPassword:"Fixture-New-Password"}),"S1");
  assert(changed.needsCheck&&changed.source.credentialRevision===revision+1);assert.equal(s.sourceAccess(changed.source).state,"pending");
  const ready=s.checkSource("S1",s.sourceConfig(changed.source));
  const execution=[{id:ready.id,config:s.sourceConfig(ready)}],lastSuccess=ready.lastSuccess;
  vm.runInContext("Date.now=function(){return "+(ready.loginExpiresAt+1000)+";}",w);
  assert.equal(s.sourceAccess(ready).state,"expired");
  assert.throws(()=>s.collect("S1"),/来源/);assert.equal(s.get().runs.length,initialRuns);
  const failure=s.collect("S1",null,execution);
  assert.equal(failure.rows[0].state,"failed");assert(failure.rows[0].message.includes("登录已失效"));
  assert.equal(failure.rows[0].collectedCount,0);assert.equal(s.get().sources[0].lastSuccess,lastSuccess);
  const mixed=s.collect();assert(mixed.skippedSources.some(row=>row.id==="S1"&&row.reason.includes("登录已失效")));
  mixed.rows.forEach(row=>assert.equal(row.collectedCount,row.newCount+row.updatedCount+row.duplicateCount+row.excludedCount));
  assert(s.checkSource("S1",s.sourceConfig(s.get().sources[0])).checkResult.ok);
}
{
  const {w,s}=fresh();const previous=s.copy(s.get());
  Object.assign(previous.sources[2],{accessMode:"login",loginMethod:"manual",loginState:"active",loginExpiresAt:Date.now()+3600000,status:"ready"});
  w.localStorage.setItem(s.key,JSON.stringify(previous));
  const migrated=load(w.localStorage).OpportunityStore,source=migrated.get().sources[2];
  assert.equal(source.loginMethod,"password");assert.equal(source.loginState,"pending");assert.equal(source.status,"pending");
  assert(!source.passwordSet&&source.loginExpiresAt===0);assert.equal(source.previousLoginSetup.method,"manual");
  assert.equal(migrated.sourceAccess(source).state,"pending");assert.equal(migrated.get().runs.length,previous.runs.length);
  assert.equal(migrated.authorizeSource,undefined);
  assert.throws(()=>migrated.saveSource(Object.assign({},source,{loginMethod:"manual"}),source.id),/仅支持账号密码/);
  assert(!w.localStorage.getItem(s.key).includes('"loginPassword"'));
}
{
  const {w,s,u,node}=uiContext();
  const original=s.get().sources[0];
  const source=s.saveSource(Object.assign({},original,{accessMode:"login",loginMethod:"password",loginAccount:"supplier_ops_01",loginPassword:"Fixture-UI-Password"}),original.id).source;
  s.checkSource(source.id,s.sourceConfig(source));
  node("#opSourceAccessMode").value="login";node("#opSourceLoginAccount").value="supplier_ops_01";node("#opSourceLoginPassword").type="password";node("#opRuleField-source-entry").value=source.collectionUrl;
  u.sourceModal(source.id);
  assert(w._modal.body.includes("登录配置")&&w._modal.body.includes("已设置")&&w._modal.body.includes("留空保留原密码"));
  assert(!w._modal.body.includes("Fixture-UI-Password"));
  assert(!w._modal.body.includes("人工登录授权")&&!w._modal.body.includes("opSourceLoginMethod")&&!w._modal.body.includes("保存并授权"));
  assert(!node("#opSourceCredentials").hidden&&!node("#opSourceLoginPassword").required);
  assert.equal(node("#opSourceLoginState").textContent,"已登录");
  node("#opSourceLoginAccount").value="supplier_ops_02";node("#opSourceLoginAccount").events.input();
  assert(node("#opSourceLoginPassword").required);assert.equal(node("#opSourceLoginPassword").placeholder,"填写登录密码");
  node("#opSourceLoginAccount").value="supplier_ops_01";node("#opSourceLoginAccount").events.input();
  node("#opSourcePasswordToggle").events.click();assert.equal(node("#opSourceLoginPassword").type,"text");assert.equal(node("#opSourcePasswordToggleText").textContent,"隐藏");
  node("#opSourceAccessMode").value="public";node("#opSourceAccessMode").events.change();
  assert(node("#opSourceCredentials").hidden&&node("#opSourceLoginPassword").disabled);assert.equal(node("#opSourceLoginState").textContent,"无需登录");
  assert(node("#opSourceLoginHelp").hidden);assert.equal(node("#opSourceSaveText").textContent,"保存");
  node("#opSourceAccessMode").value="login";node("#opSourceAccessMode").events.change();
  assert(!node("#opSourceCredentials").hidden&&!node("#opSourceLoginHelp").hidden);
  assert.equal(s.get().sources[0].accessMode,"login");
  const checked=s.checkSource("S2",s.sourceConfig(s.get().sources[1]));
  const content=u.checkContent(checked);assert(content.includes("检查通过")&&content.includes("附件权限")&&content.includes("按权限获取"));
  s.change(next=>{const entry=next.sources[0];entry.loginExpiresAt=Date.now()-1000;});
  u.close();u.renderSources();assert(node("#opportunityContent").innerHTML.includes("登录已失效"));
  assert(u.sourceCollectionBlock(s.get().sources[0]).includes("登录已失效"));
}

// Judgment text reflects the frozen assessment, never just the presence of fields.
{
  const {s,u,node}=uiContext("OP001",true);
  updateRule(s,{max:1,regions:"江苏",minDays:365});
  s.reassess("OP001");
  const saved=s.copy(s.find("OP001").assessmentSnapshot), rows=u.assessmentJudgments(s.find("OP001"));
  assert.equal(rows[2].label,"超出预算范围");assert.equal(rows[2].tone,"red");
  assert.equal(rows[3].label,"实施地区不符");assert.equal(rows[4].label,"准备时间不足");
  assert(u.assessmentRows(s.find("OP001")).includes("筛选范围：0～1 万元"));
  updateRule(s,{max:1000,regions:"广东",minDays:3});s.reassess("OP001");
  const passing=u.assessmentJudgments(s.find("OP001"));
  assert.equal(passing[2].label,"符合预算范围");assert.equal(passing[3].label,"符合实施地区");assert.equal(passing[4].label,"准备时间充足");
  assert.notEqual(passing[1].label,"已满足资格");
  const current=JSON.stringify(s.find("OP001").assessmentSnapshot);
  u.renderDetail();assert(node("#opportunityDetail").innerHTML.includes("机会初评分"));
  updateRule(s,{max:2});u.renderDetail();
  assert(node("#opportunityDetail").innerHTML.includes("上次初评分"));assert(node("#opportunityDetail").innerHTML.includes("评估时间"));
  assert.equal(JSON.stringify(s.find("OP001").assessmentSnapshot),current);
  const snapshot=u.ruleSnapshotView(s.get().rules[0]);
  for(const key of ["description","keywords","excludes","regions","min","max","minDays","threshold","remarks"])assert(snapshot.includes('data-rule-field="'+key+'"'));
  assert(!snapshot.includes('data-rule-field="hours"')&&!snapshot.includes('data-rule-field="lookback"'));
  s.change(next=>{const x=next.opportunities.find(i=>i.id==="OP001");x.amount=null;x.region="";x.deadline="";x.qualification="";x.revision++;});s.reassess("OP001");
  const unknown=u.assessmentJudgments(s.find("OP001"));
  assert.equal(unknown[1].label,"依据不足");assert.equal(unknown[2].label,"预算未披露");assert.equal(unknown[3].label,"实施地未披露");assert.equal(unknown[4].label,"截止时间未明确");
  assert.equal(saved.notice.amount,680);
}
// Only untransferred pending/approved opportunities count as urgent.
{
  const {s,u}=uiContext(),item=s.get().opportunities.find(i=>u.isUrgent(i)), id=item.id;
  s.review(id,"approved","",s.actionContext(id));assert(u.isUrgent(s.find(id)));
  s.review(id,"rejected","",s.actionContext(id));assert(!u.isUrgent(s.find(id)));
  s.review(id,"approved","",s.actionContext(id));assert(u.isUrgent(s.find(id)));
  s.transfer(id,"李明远",[{name:"采购文件.pdf",main:true}],s.actionContext(id));assert(!u.isUrgent(s.find(id)));
}
// List source selection uses IDs, resolves unique old names, and separates duplicate names.
{
  const {w,s,u,node}=uiContext();
  const old=s.get().sources[1].name;
  s.saveSource(Object.assign({},s.get().sources[1],{name:"政府采购新名称"}),"S2");
  s.saveSource(Object.assign({},s.get().sources[2],{name:s.get().sources[0].name}),"S3");
  const options=u.opportunitySourceOptions();
  assert.notEqual(options.find(x=>x.id==="S1").label,options.find(x=>x.id==="S3").label);
  const form=node("#opFilters");form.elements={query:{},review:{},region:{},source:{},score:{}};
  u.ui.filters={source:old};u.renderListShell();assert.equal(u.ui.filters.source,"S2");assert.equal(form.elements.source.value,"S2");
  assert(node("#opportunityContent").innerHTML.includes('<select name="source"'));
  for(const id of ["S1","S2","S3"]){
    u.ui.filters={source:id};u.ui.page=1;u.renderRows();
    const html=node("#opListResults").innerHTML;
    const ids=Array.from(html.matchAll(/data-op-detail-link="([^"]+)"/g),m=>m[1]);
    ids.forEach(key=>assert(s.find(key).sourceIds.includes(id)));
  }
  const historicalId=s.get().opportunities.find(item=>item.sourceIds.includes("S2")).id;
  s.change(next=>{next.sources=next.sources.filter(source=>source.id!=="S2");});
  assert(u.sourcesFor(s.find(historicalId)).includes("深圳政府采购智慧平台")||u.sourcesFor(s.find(historicalId)).includes("政府采购新名称"));
  assert(!u.sourcesFor(s.find(historicalId)).includes("来源已停用"));
  for(let i=0;i<10;i++)s.saveSource({name:"采购来源"+i,type:"企业采购",collectionUrl:"https://source"+i+".example/list",column:"招标公告"});
  let values={query:"",review:"",region:"",source:"",score:""};
  w.FormData=class{constructor(){return new Map(Object.entries(values));}};
  u.ui.filters={};u.renderListShell();assert(node("#opportunityContent").innerHTML.includes('list="opSourceOptions"'));
  const selected=u.opportunitySourceOptions().find(x=>x.id==="S3");
  values.source=selected.label;u.query();assert.equal(u.ui.filters.source,"S3");assert.equal(u.ui.filters.sourceQuery,"");
  values.source="采购来源";const before=JSON.stringify(u.ui.filters);
  form.events.change({target:{name:"source",value:values.source}});assert.equal(JSON.stringify(u.ui.filters),before);
  u.query();assert.equal(u.ui.filters.source,"");assert.equal(u.ui.filters.sourceQuery,"采购来源");
  values.source="";form.events.change({target:{name:"source",value:""}});assert.equal(u.ui.filters.sourceQuery,"");
}
// Source form concurrency rejects stale writes and rebases only fields edited by this form.
{
  const {w,s,u,node}=uiContext();
  const original=s.copy(s.get().sources[0]),expected=s.sourceEditContext(original);
  u.sourceModal("S1");
  const newer=s.saveSource(Object.assign({},original,{name:"另一页面更新的网站名称"}),"S1",expected).source;
  const draft=Object.assign({},original,{column:"本次调整的采集栏目"});
  assert.throws(()=>s.saveSource(draft,"S1",expected),error=>error.code==="OP_SOURCE_CONTEXT_CHANGED");
  assert.equal(s.get().sources[0].name,newer.name);
  u.guard(()=>w._modal.onSubmit(new Map(Object.entries(draft))));
  assert(node("#opFeedback").innerHTML.includes("载入最新配置"));assert(w._modalOpen);
  w.FormData=class{constructor(){return new Map(Object.entries(draft));}};
  u.reloadSource();
  assert(w._modal.body.includes("另一页面更新的网站名称")&&w._modal.body.includes("本次调整的采集栏目"));
  const rebased=Object.assign({},newer,{column:draft.column});
  w._modal.onSubmit(new Map(Object.entries(rebased)));
  assert.equal(s.get().sources[0].name,newer.name);assert.equal(s.get().sources[0].column,draft.column);
  const stable=s.sourceEditContext(s.get().sources[0]);
  s.checkSource("S1",s.sourceConfig(s.get().sources[0]));
  assert.equal(s.sourceEditContext(s.get().sources[0]),stable);
}
// Scheduled collection stays outside dialogs; even a newly opened review is left in place.
for(const openReview of [false,true]) {
  const {w,s,u,node}=uiContext(),tasks=[],before=s.get().runs.length;
  w.setTimeout=callback=>{tasks.push(callback);return tasks.length;};
  u.collect("",true);
  assert(u.ui.busy&&u.ui.scheduledCollecting);assert(!w._modalOpen);
  assert(!node("#opCollectionStatus").hidden&&node("#opCollectionStatus").innerHTML.includes("计划采集中"));
  let modalBefore;
  if(openReview){u.reviewModal("OP015");modalBefore=w._modal;}
  let guard=0;while(tasks.length){assert(++guard<30);tasks.shift()();}
  assert.equal(s.get().runs.length,before+1);assert(!u.ui.busy&&!u.ui.scheduledCollecting);assert(node("#opCollectionStatus").hidden);
  if(openReview){assert.strictEqual(w._modal,modalBefore);assert(w._modalOpen);}else assert(!w._modalOpen);
}
{
  const {s,u}=uiContext();
  s.change(next=>{next.sources.forEach(source=>{source.enabled=false;});});
  assert.equal(u.nextText(s.get().collection),"暂无可采集来源");
}
// Review context is compact but no longer silently hides all but the first concern.
{
  const {w,s,u}=uiContext();
  s.change(next=>{const x=next.opportunities.find(i=>i.id==="OP015");x.amount=null;x.region="";x.risks=["缺少主招标文件，转入投标项目时需补传。","团队资源需协调"];});
  u.reviewModal("OP015");assert(w._modal.body.includes("关键关注"));
  const concerns=u.reviewConcerns(s.find("OP015"));assert(concerns.length>1&&concerns.length<=3);
  const id="OP003";
  w.AppCurrentUser.name="周晓雯";u.transferModal(id);assert(w._modal.body.includes('value="周晓雯" selected'));
  u.close();w.AppCurrentUser.name="未列入的成员";u.transferModal(id);assert(w._modal.body.includes('value="" selected'));
  const item=s.find(id);
  assert(u.fileEntry(item,0).includes("预览")&&u.fileEntry(item,0).includes('target="_blank"'));
  item.files[0].sourceUrl="https://procurement.example/file.pdf";assert(u.fileEntry(item,0).includes("file-preview.html"));
  item.files[0].previewText="采购文件正文";assert(u.fileEntry(item,0).includes("预览"));
}


// New assessments use the bid deadline; legacy snapshots are read without rewriting.
{
  const {w,s,u}=uiContext(),now=Date.now();
  s.change(next=>{const item=next.opportunities.find(x=>x.id==="OP001");item.deadline=s.stamp(now+10*86400000);item.acquisitionEnd=s.stamp(now+86400000);item.acquired=false;item.unknown[4]=0;item.revision++;});
  const item=s.find("OP001"),rule=s.get().rules[0],result=s.evaluate(item,rule,now);
  assert.equal(result.preparationBasis,"bidDeadline");assert.equal(result.details[4].score,15);
  assert.equal(s.projectConditions(item,rule,now).warnings.length,0);
  s.reassess(item.id);assert.equal(u.assessmentJudgments(s.find(item.id))[4].label,"准备时间充足");
  const legacy=s.copy(s.find(item.id).assessmentSnapshot);
  delete legacy.result.preparationBasis;legacy.result.score-=legacy.result.details[4].score;legacy.result.details[4].score=0;legacy.result.details[4].evidence="历史获取与投标窗口判断";
  s.change(next=>{next.opportunities.find(x=>x.id===item.id).assessmentSnapshot=legacy;});
  const old=JSON.stringify(legacy);
  assert.equal(u.assessmentJudgments(s.find(item.id))[4].label,"准备时间不足");
  assert(u.assessmentJudgments(s.find(item.id))[4].reason.includes("历史判断"));
  const loaded=load(w.localStorage,w.sessionStorage);
  assert.equal(JSON.stringify(loaded.OpportunityStore.find(item.id).assessmentSnapshot),old);
  s.reassess(item.id);assert.equal(JSON.stringify(s.find(item.id).history[0].previousAssessmentSnapshot),old);
  assert.equal(s.find(item.id).assessmentSnapshot.result.preparationBasis,"bidDeadline");
  assert.equal(u.assessmentJudgments(s.find(item.id))[4].label,"准备时间充足");
  s.change(next=>{next.opportunities.find(x=>x.id===item.id).acquisitionEnd=s.stamp(now-86400000);});
  s.reassess(item.id);assert.equal(u.assessmentJudgments(s.find(item.id))[4].label,"准备时间充足");
  assert(s.participationChecks(s.find(item.id)).some(text=>text.includes("文件获取已截止")));
  s.change(next=>{const x=next.opportunities.find(x=>x.id===item.id);x.acquisitionEnd="";x.deadline="";});s.reassess(item.id);
  assert.equal(s.assessment(s.find(item.id)).result.details[4].score,0);
  assert.equal(u.assessmentJudgments(s.find(item.id))[4].label,"截止时间未明确");
}
// Urgent and incompatible main-status filters never cancel each other out.
{
  const {w,s,u,node}=uiContext();
  u.ui.tab="sources";u.ui.filters={review:"rejected",query:"",region:"广东",source:"S1",score:"80"};
  u.onAction("metric","urgent");assert.equal(u.ui.filters.review,"");
  assert.equal(u.ui.filters.region,"广东");assert.equal(u.ui.filters.source,"S1");assert.equal(u.ui.filters.score,"80");
  let form={query:"",review:"transferred",region:"",source:"",score:""};
  w.FormData=class{constructor(){return new Map(Object.entries(form));}};
  u.query();assert.equal(u.ui.metric,"");assert.equal(u.ui.filters.review,"transferred");
  u.ui.tab="sources";u.onAction("metric","urgent");assert.equal(u.ui.filters.review,"");
  u.ui.filters={};u.renderRows();assert(node("#opListResults").innerHTML.includes("<td>"));
  u.renderMetrics();const html=node("#opportunityMetrics").innerHTML;
  assert(html.includes("72 小时内关键期限到期")&&html.includes('data-rule-help="metric-urgent"'));
  assert(!html.includes("待确认或已确认未转项目，72"));
}
// Reloading a stale transfer retains owner, uploaded files and deliberate deselection.
{
  const {w,s,u,node}=uiContext();u.transferModal("OP003");
  node("#opModalForm").elements={owner:{value:"周晓雯"}};
  u.ui.files[0].selected=false;u.ui.files[0].main=false;
  u.ui.files.push({name:"本次补传采购文件.pdf",size:"3 MB",kind:"uploaded",main:true,selected:true});
  s.change(next=>{const x=next.opportunities.find(x=>x.id==="OP003");x.revision++;});
  u.onAction("reloadAction");
  assert(w._modal.body.includes('value="周晓雯" selected'));
  assert(u.ui.files.some(file=>file.name==="本次补传采购文件.pdf"&&file.main&&file.selected));
  assert.equal(u.ui.files[0].selected,false);
  assert(!node('#opModalForm button[type="submit"]').disabled);
  const current=s.find("OP003");assert.equal(current.files.length,1);assert(!current.files.some(file=>file.kind==="uploaded"));
}
{
  const {s,u,node}=uiContext();u.transferModal("OP003");
  node("#opModalForm").elements={owner:{value:"周晓雯"}};
  const oldName=u.ui.files[0].name;
  u.ui.files.push({name:"补充清单.xlsx",size:"5 KB",kind:"uploaded",main:false,selected:true});
  s.change(next=>{const x=next.opportunities.find(x=>x.id==="OP003");x.revision++;x.files[0].version=2;});
  u.onAction("reloadAction");
  assert(u.ui.files.some(file=>file.name==="补充清单.xlsx"));
  assert(u.ui.files.find(file=>file.name===oldName).selected===false);
  assert(!u.ui.files.some(file=>file.main));
  assert(node("#opTransferFileFeedback").textContent.includes("公告文件已更新"));
  assert(node('#opModalForm button[type="submit"]').disabled);
}
{
  const {u}=uiContext();
  const before=[{id:"A",name:"原文件.pdf",size:"1 MB",main:true}];
  const upload={name:"同名采购文件.pdf",size:"2 MB",kind:"uploaded",main:true,selected:true};
  const draft={baseline:before,files:[Object.assign({},before[0],{main:false}),upload,{name:"保留附件.xlsx",kind:"uploaded",selected:false}]};
  const merged=u.mergeTransferDraft({files:[{id:"B",name:upload.name,size:"4 MB",version:2,main:true}]},draft);
  assert.equal(merged.files.filter(file=>file.name===upload.name).length,1);
  assert(merged.conflicts.some(text=>text.includes("同名")));assert(merged.conflicts.some(text=>text.includes("已不在最新")));
  assert(!merged.files.some(file=>file.main));assert.equal(merged.files.find(file=>file.name==="保留附件.xlsx").selected,false);
}
// Acquisition and registration cutoff warnings update without changing scores or decisions.
for(const field of ["acquisitionEnd","registrationEnd"]){
  const {w,s,u,node}=uiContext(),now=Date.now();
  s.change(next=>{const x=next.opportunities.find(x=>x.id==="OP001");x.deadline=s.stamp(now+10*86400000);x.acquisitionEnd=s.stamp(now+5*86400000);x[field]=s.stamp(now+60000);x.acquired=false;x.registered=false;});
  u.reviewModal("OP001");const before=JSON.stringify(s.find("OP001").assessmentSnapshot),review=s.find("OP001").review;
  vm.runInContext("Date.now=function(){return "+(now+120000)+";}",w);u.syncActionTiming();
  assert(node("#opReviewConcerns").innerHTML.includes(field==="acquisitionEnd"?"文件获取已截止":"报名已截止"));
  assert(!node("#opReviewApproved").disabled);assert.equal(s.find("OP001").review,review);
  assert.equal(JSON.stringify(s.find("OP001").assessmentSnapshot),before);
}
// Source checks are distinct from enablement and login availability.
{
  const {s,u,node}=uiContext();
  s.change(next=>{next.sources[0].enabled=false;next.sources[1].status="error";next.sources[1].checkError="公告列表读取失败";next.sources[2].status="pending";});
  u.renderSources();const rows=Array.from(node("#opportunityContent").innerHTML.matchAll(/<tr>(.*?)<\/tr>/g),m=>m[1]).filter(row=>row.includes("<td>"));
  assert(rows[0].includes("已停用")&&rows[0].includes('status-tag green">检查通过'));
  assert(!rows[0].includes(">可采集<"));assert(u.sourceCollectionBlock(s.get().sources[0]).includes("已停用"));
  assert(rows[1].includes('status-tag red">检查失败'));assert(rows[2].includes('status-tag orange">待检查'));
}
// Collection copy distinguishes complete failure from partial failure, without implying reassessment.
for(const allFailed of [true,false]){
  const {w,s,u,node}=uiContext(),tasks=[],now=Date.now();
  const ids=allFailed?["S1"]:["S1","S2"];
  s.change(next=>{ids.forEach(id=>{const x=next.sources.find(x=>x.id===id);Object.assign(x,{accessMode:"login",loginMethod:"password",loginAccount:"fixture",passwordSet:true,loginState:"active",loginExpiresAt:now+(id==="S1"?1000:3600000),status:"ready"});});});
  node("#opModal").classList={contains:()=>Boolean(w._modalOpen)};
  w.setTimeout=handler=>{tasks.push(handler);return tasks.length;};
  u.collect(allFailed?"S1":"");vm.runInContext("Date.now=function(){return "+(now+2000)+";}",w);
  let count=0;while(tasks.length){assert(++count<30);tasks.shift()();}
  assert(w._toast.includes(allFailed?"本次采集失败":"1 个网站采集失败"));
  assert(!w._toast.includes("部分网站采集失败"));
  node("#opRunFilters").elements={from:{},to:{}};u.renderRuns();
  assert(!node("#opportunityContent").innerHTML.includes("采集及初评处理完成"));
}


// Attachment-only changes invalidate transfers without changing review state or frozen scores.
for(const mutation of ["version","add","remove"]){
  const {w,s,u,node}=uiContext();u.transferModal("OP003");
  node("#opModalForm").elements={owner:{value:"周晓雯"}};
  u.ui.files.push({name:"仍需保留的补充清单.xlsx",size:"3 KB",kind:"uploaded",selected:true,main:false});
  const expected=u.active().expected,noticeRevision=s.find("OP003").revision,snapshot=JSON.stringify(s.find("OP003").assessmentSnapshot);
  s.change(next=>{const item=next.opportunities.find(x=>x.id==="OP003");
    if(mutation==="version"){item.files[0].version=2;item.files[0].size="5 MB";}
    if(mutation==="add")item.files.push({name:"新增公告附件.xlsx",size:"4 KB",kind:"demo"});
    if(mutation==="remove")item.files=[];
  });
  assert.equal(s.find("OP003").revision,noticeRevision);
  assert(s.contextMessage("OP003",expected).includes("公告附件已更新"));u.syncActionTiming();
  assert(u.active().invalid);assert(node('#opModalForm button[type="submit"]').disabled);
  w._modal.onSubmit({get:()=> "周晓雯"});
  assert.equal(s.find("OP003").review,"approved");assert(!s.get().projects.some(p=>p.opportunityId==="OP003"));
  assert.equal(JSON.stringify(s.find("OP003").assessmentSnapshot),snapshot);
  u.onAction("reloadAction");
  assert(!u.active().invalid&&w._modal.body.includes('value="周晓雯" selected'));
  assert(u.ui.files.some(file=>file.name==="仍需保留的补充清单.xlsx"));
  if(mutation==="version"){
    assert(node("#opTransferFileFeedback").textContent.includes("公告文件已更新"));
    assert(!u.ui.files.some(file=>file.main));assert(node('#opModalForm button[type="submit"]').disabled);
  }
  if(mutation==="remove")assert(!u.ui.files.some(file=>file.name==="智能体应用采购文件.pdf"));
}
{
  const {s}=fresh(),item=s.find("OP003"),expected=s.actionContext(item.id),transfer=s.actionContext(item.id,null,"transfer");
  s.change(next=>{const x=next.opportunities.find(x=>x.id===item.id);x.files[0].version=2;});
  assert.equal(s.contextMessage(item.id,expected),"");
  assert.throws(()=>s.transfer(item.id,"周晓雯",[{name:"旧文件.pdf",main:true}],transfer),error=>error.code==="OPPORTUNITY_CONTEXT_CHANGED");
  assert.equal(s.find(item.id).review,"approved");
}
// Current temporal warnings expire independently from immutable source risks and assessments.
{
  const {w,s,u,node}=uiContext("OP015",true);
  const item=s.find("OP015"),original=JSON.stringify(item.risks),snapshot=JSON.stringify(item.assessmentSnapshot);
  const before=u.currentRisks(item);assert(before.some(text=>text.includes("文件获取临近截止")));
  assert(!before.some(text=>text.includes("30 小时")));
  vm.runInContext("Date.now=function(){return "+(s.time(item.acquisitionEnd)+60000)+";}",w);
  u.renderDetail();u.reviewModal(item.id);
  const concerns=u.reviewConcerns(s.find(item.id));assert(concerns.some(text=>text.includes("文件获取已截止")));
  assert(!concerns.some(text=>text.includes("文件获取临近截止")||text.includes("30 小时")));
  assert(!node("#opportunityDetail").innerHTML.includes("文件获取将在 30 小时内截止"));
  assert.equal(JSON.stringify(s.find(item.id).risks),original);
  assert.equal(JSON.stringify(s.find(item.id).assessmentSnapshot),snapshot);
}
{
  const {w,s,u}=uiContext(),id="OP019",start=s.time(s.find(id).acquisitionStart);
  assert(u.currentRisks(s.find(id)).some(text=>text.includes("尚未开始")));
  vm.runInContext("Date.now=function(){return "+(start+60000)+";}",w);
  assert(!u.currentRisks(s.find(id)).some(text=>text.includes("尚未开始")));
  s.change(next=>{next.opportunities.find(x=>x.id===id).risks.push("投标将在两天后截止，请准备专项资质证明。");});
  assert(u.currentRisks(s.find(id)).some(text=>text.includes("请准备专项资质证明")));
  assert(!u.currentRisks(s.find(id)).some(text=>text.includes("两天后")));
}
// Deferred collection refresh runs on every tab after any generic dialog is closed.
for(const tab of ["rules","sources","runs"]){
  for(const closeKind of ["cancel","escape","backdrop"]){
    const {w,s,u,node}=uiContext(),tasks=[];
    u.ui.tab=tab;u.init();w._onRender=()=>u.renderMetrics();u.renderMetrics();
    const before=node("#opportunityMetrics").innerHTML;
    w.setTimeout=fn=>{tasks.push(fn);return tasks.length;};
    u.collect("",true);w._modalOpen=true;
    let n=0;while(tasks.length){assert(++n<30);tasks.shift()();}
    assert.equal(node("#opportunityMetrics").innerHTML,before);
    w._rendered=false;
    if(closeKind==="cancel")u.close();
    else {
      // Shared layer handlers close Escape/backdrop before the module's next timing tick.
      w.projectPrototype.closeLayers();u.tickOpportunityTiming();
    }
    assert(w._rendered);assert.notEqual(node("#opportunityMetrics").innerHTML,before);
    const current=s.get().opportunities.filter(item=>item.review==="pending").length;
    assert(node("#opportunityMetrics").innerHTML.includes("<strong>"+current+"</strong>"));
    assert.equal(u.ui.tab,tab);
  }
}
// Expired login is visually distinct while the historical check outcome stays independent.
{
  const {s,u,node}=uiContext();
  s.change(next=>{Object.assign(next.sources[0],{accessMode:"login",loginMethod:"password",loginAccount:"fixture",passwordSet:true,loginState:"active",loginExpiresAt:Date.now()-1000,status:"ready"});});
  u.renderSources();const html=node("#opportunityContent").innerHTML;
  assert(html.includes('status-tag green">检查通过'));
  assert(/class="op-source-truncate op-source-access-expired"[^>]*>登录已失效/.test(html));
  assert(u.sourceCollectionBlock(s.get().sources[0]).includes("登录已失效"));
}


// Undisclosed deadlines use the same business copy in the transfer summary.
{
  const {w,s,u}=uiContext();s.review("OP020","approved","",s.actionContext("OP020"));u.transferModal("OP020");
  assert(w._modal.body.includes("投标截止：公告未明确"));
  assert.equal(s.find("OP020").deadline,"");
}
// Collection refresh and pagination preserve unsubmitted source search without applying it.
{
  const {w,s,u,node}=uiContext(),tasks=[];
  for(let index=0;index<10;index++)s.saveSource({name:"补充来源"+index,type:"企业采购",collectionUrl:"https://draft"+index+".example/list",column:""});
  u.ui.tab="runs";u.ui.runFilters={source:"",sourceQuery:"",result:"",from:"",to:""};
  const input={type:"search",value:"新的未提交草稿",selectionStart:2,selectionEnd:5,focus(){this.focused=true;},setSelectionRange(start,end){this.restoredSelection=[start,end];}};
  const form=node("#opRunFilters");form.elements={source:input,from:{setCustomValidity(){}},to:{setCustomValidity(){}},result:{value:""}};
  form.reportValidity=()=>true;
  let markup="";
  Object.defineProperty(node("#opportunityContent"),"innerHTML",{configurable:true,get(){return markup;},set(value){
    markup=value;const field=value.match(/<input name="source"[^>]*value="([^"]*)"/);
    input.value=field?field[1]:""; // Replacing HTML resets the newly rendered control, as in the real DOM.
  }});
  w.document.activeElement=input;
  w._onRender=()=>u.renderRuns(true);w.setTimeout=callback=>{tasks.push(callback);return tasks.length;};
  const filters=JSON.stringify(u.ui.runFilters);
  u.collect("",true);let guard=0;while(tasks.length){assert(++guard<30);tasks.shift()();}
  assert.equal(input.value,"新的未提交草稿");assert(input.focused);assert.deepEqual(input.restoredSelection,[2,5]);
  assert.equal(JSON.stringify(u.ui.runFilters),filters);assert(u.websiteRecords().length>8);
  u.onAction("runPage","2");assert.equal(input.value,"新的未提交草稿");assert.equal(u.ui.runPage,2);
  assert.equal(JSON.stringify(u.ui.runFilters),filters);
  w.FormData=class{constructor(){return new Map([["source",input.value],["result",""],["from",""],["to",""]]);}};
  u.queryRuns();assert.equal(u.ui.runFilters.sourceQuery,"新的未提交草稿");assert.equal(u.ui.runPage,1);
  u.onAction("runReset");assert.equal(input.value,"");assert.equal(u.ui.runFilters.sourceQuery||"","");
  u.renderRuns(true);assert.equal(input.value,"");
}

// Each notice/file resolves to this opportunity; the shared viewer never borrows unrelated documents.
{
  const {w,s,u,node}=uiContext("OP001",true), e=w.OpportunityEvidence;
  for(const item of s.get().opportunities){
    const specific=uiContext(item.id,true);specific.u.renderDetail();
    assert(specific.node("#opportunityDetail").innerHTML.includes(item.name));
    assert(specific.node("#opportunityDetail").innerHTML.includes("知识库"));
    for(const id of item.sourceIds){
      const source=s.get().sources.find(x=>x.id===id), href=e.noticeHref(item,id,source);
      assert.equal(href,"");assert.notEqual(href,source.collectionUrl);
    }
    for(const [index,file] of item.files.entries()){
      const payload=e.documentPayload(item,file), href=e.previewHref(payload);
      const preview=e.previewProfile(href.slice(href.indexOf("#")),file.name);
      assert.equal(preview.name,file.name);assert.equal(preview.projectNumber,item.number);
      const content=preview.pageData.map(x=>x.html).join("");
      assert(content.includes(item.name));assert(content.includes(item.summary));assert(content.includes(item.qualification));
      assert(!content.includes("智慧园区综合管理平台建设项目"));
      const link=u.fileEntry(item,index);assert(link.includes('target="_blank"'));assert(link.includes("profile=opportunity-evidence"));
    }
  }
  const item=s.copy(s.find("OP001"));item.sourceIds=["S1","S2"];item.noticeUrl="https://bids.example/notices/123.html";
  assert.equal(e.noticeHref(item,"S1"),item.noticeUrl);assert.equal(e.noticeHref(item,"S2"),"");
  item.noticeUrl="https://bids.example/index.html";assert.equal(e.noticeHref(item,"S1"),"");
  item.noticeUrls={S2:"https://other.example/notices/456.html"};assert.equal(e.noticeHref(item,"S2"),item.noticeUrls.S2);
  const textFile=e.documentPayload(item,{name:"更正附件.docx",content:"只属于本附件的正文 <script>wrong()</script>"});
  const preview=e.previewProfile("#evidence="+encodeURIComponent(JSON.stringify(textFile)),textFile.name);
  assert(preview.pageData[0].html.includes("只属于本附件的正文"));assert(!preview.pageData[0].html.includes("<script>"));
  assert(e.previewProfile("#evidence=bad","未取得文件.pdf").pageData[0].html.includes("文件暂不可预览"));
  w.location.href="file:///E:/Cursor/bidding-agent-prototype/pages/file-preview.html";
  const raw=e.previewProfile("#evidence="+encodeURIComponent(JSON.stringify({name:"采购文件.pdf",sections:[],sourceUrl:"https://bids.example/download/opaque"})),"");
  assert(raw.pageData[0].html.includes('src="https://bids.example/download/opaque"'));
  const rejected=e.previewProfile("#evidence="+encodeURIComponent(JSON.stringify({name:"采购文件.pdf",sections:[],sourceUrl:"javascript:alert(1)"})),"");
  assert(!rejected.pageData[0].html.includes("<iframe"));
}
// Qualification conclusions use actual KB records and preserve the exact evidence used by each assessment.
{
  const {w,s,u,node}=uiContext("OP001",true), e=w.OpportunityEvidence, at=Date.parse("2026-10-29T12:00:00+08:00");
  const item=Object.assign(s.copy(s.find("OP001")),{qualification:"具有独立法人资格；具有 ISO 9001 认证；具有 ISO 27001 认证；近三年不少于2项类似项目业绩；项目经理提供近三个月社保证明。",deadline:"2026-11-20 09:30"});
  const match=e.matchQualification(item,at), row=kind=>match.rows.find(x=>x.kind===kind);
  assert.equal(row("company").materials[0].id,"KB-COMP-001");
  assert.equal(match.rows.find(x=>x.code==="9001").state,"supported");
  assert.equal(match.rows.find(x=>x.code==="27001").state,"expired");
  assert.notEqual(row("cases").state,"supported");assert.notEqual(row("people").state,"supported");
  const cert=e.records().find(x=>x.id==="KB-CERT-003");
  assert.equal(e.availability(Object.assign({},cert,{lifecycleState:"archived"}),at).key,"unavailable");
  assert.equal(e.availability(Object.assign({},cert,{parseStatus:"processing"}),at).key,"unavailable");
  assert.equal(e.availability(Object.assign({},cert,{description:"证明材料待补"}),at).key,"partial");
  assert.equal(e.matchQualification(Object.assign({},item,{qualification:""}),at).rows[0].state,"unclear");
  const missing=e.matchQualification(Object.assign({},item,{qualification:"具备未公开专项许可"}),at).rows[0];
  assert.equal(missing.state,"missing");assert(missing.reason.includes("不代表企业不具备资格"));
  const profile=e.previewProfile("#evidence="+encodeURIComponent(JSON.stringify(e.materialPayload(match.rows.find(x=>x.code==="9001").materials[0]))),"");
  assert(profile.pageData.map(x=>x.html).join("").includes("QMS-90******57"));
  assert(!JSON.stringify(profile).includes("technical.pdf"));
  const old=JSON.stringify(s.find("OP001").assessmentSnapshot);
  s.change(next=>{next.opportunities.find(x=>x.id==="OP001").qualification="具有 ISO 9001 认证";});s.reassess("OP001");
  assert.equal(JSON.stringify(s.find("OP001").history[0].previousAssessmentSnapshot),old);
  s.review("OP001","approved","",s.actionContext("OP001"));s.reassess("OP001");assert(!s.find("OP001").recheck);
  const frozen=JSON.stringify(s.find("OP001").assessmentSnapshot), version=cert.version;
  cert.version="V9.0";cert.description="更新后的认证说明";
  assert.equal(JSON.stringify(s.find("OP001").assessmentSnapshot),frozen);
  s.reassess("OP001");assert(s.find("OP001").recheck);
  assert.equal(s.find("OP001").assessmentSnapshot.result.qualificationMatch.rows[0].materials[0].version,"V9.0");
  assert.equal(s.find("OP001").history[0].previousAssessmentSnapshot.result.qualificationMatch.rows[0].materials[0].version,version);
  u.renderDetail();assert(node("#opportunityDetail").innerHTML.includes("查看当时的资格与材料依据"));
}
// Exercise the actual common viewer branch; existing document profiles remain unchanged.
{
  const source=fs.readFileSync("assets/js/file-preview.js","utf8").replace(/  if \(document.readyState === "loading"\) document.addEventListener\("DOMContentLoaded", init\);\s*else init\(\);/,"  window.PreviewTest={file,renderDocument};");
  const {w,s,u,node}=uiContext(),e=w.OpportunityEvidence,item=s.find("OP001"),href=e.previewHref(e.documentPayload(item,item.files[0]));
  w.BiddingFileIcons.meta=()=>({label:"PDF 文档"});
  w.location.search=href.slice(href.indexOf("?"),href.indexOf("#"));w.location.hash=href.slice(href.indexOf("#"));
  vm.runInContext(source,w);assert.equal(w.PreviewTest.file.name,item.files[0].name);
  w.PreviewTest.renderDocument();assert(node("#previewDocumentPages").innerHTML.includes(item.name));
  assert(!node("#previewDocumentPages").innerHTML.includes("智慧园区综合管理平台建设项目"));
  w.location.search="?file=procurement";w.location.hash="";
  vm.runInContext(source,w);assert.equal(w.PreviewTest.file.name,"采购文件.doc");assert.equal(w.PreviewTest.file.pages,34);
  const opened=[];w.open=(...args)=>opened.push(args);u.openOpportunityFile("OP001:0");
  assert.equal(opened[0][1],"_blank");assert(opened[0][0].includes("opportunity-evidence"));
}

// Notice changes cannot silently revise an unchanged attachment or overwrite preserved snapshots.
{
  const {s}=fresh();
  const id="OP001",old=s.copy(s.find(id).assessmentSnapshot),body=JSON.stringify(s.find(id).files[0]);
  s.change(next=>{const item=next.opportunities.find(x=>x.id===id);item.summary="更正后仅采购数据质量核查服务";item.revision=2;});
  assert.equal(JSON.stringify(s.find(id).files[0]),body);
  s.reassess(id);assert.equal(JSON.stringify(s.find(id).history[0].previousAssessmentSnapshot),JSON.stringify(old));
  s.change(next=>{const item=next.opportunities.find(x=>x.id===id);item.files[0].version=2;item.files[0].sections=[{title:"补充采购文件",text:"文件独立更新后的正文"}];item.revision=3;});s.reassess(id);
  const original=s.find(id).history.find(x=>x.previousAssessmentSnapshot&&x.previousAssessmentSnapshot.noticeRevision===1).previousAssessmentSnapshot;
  assert.equal(original.notice.summary,old.notice.summary);assert.equal(original.noticeFiles[0].version,1);assert.equal(s.find(id).files[0].version,2);
}
// Only the lower notice entry opens the exact stored external notice URL.
{
  const {s,u,node}=uiContext("OP001",true);u.renderDetail();
  assert(node("#opportunityDetail").innerHTML.includes("查看公告原文"));
  assert(!node("#opportunityDetail").innerHTML.includes("未提供公告原文链接"));
  assert(node("#opportunityDetail").innerHTML.includes('href="https://www.szecp.com.cn/first_zbgg/2026-09-16/2867158.html" target="_blank"'));
  const url="https://bids.example/notices/unique-123.html";
  s.change(next=>{next.opportunities.find(x=>x.id==="OP001").noticeUrl=url;});u.renderDetail();
  const html=node("#opportunityDetail").innerHTML;
  assert(!html.includes("查看公告要求"));assert(!html.includes("opportunity-notice.html"));
  assert.equal((html.match(/查看公告原文/g)||[]).length,1);
  assert(html.includes('href="'+url+'" target="_blank"'));assert(html.indexOf('href="'+url+'"')>html.indexOf("公告与附件"));
  assert(!fs.existsSync("pages/opportunity-notice.html"));assert(!fs.existsSync("assets/js/opportunity-notice.js"));
  for(const id of ["OP016","OP017","OP018"]){
    const view=uiContext(id,true);view.u.renderDetail();const rendered=view.node("#opportunityDetail").innerHTML;
    assert(!rendered.includes("未提供公告原文链接"));
    assert.equal((rendered.match(/查看公告原文/g)||[]).length,view.s.find(id).sourceIds.length);
    assert(!rendered.includes('aria-disabled="true"'));assert(!rendered.includes('href="opportunity-notice.html'));
  }
}
// Missing, empty and self-referencing file addresses never embed the viewer itself.
{
  const {w,s}=fresh(),e=w.OpportunityEvidence;
  w.location.href="file:///E:/Cursor/bidding-agent-prototype/pages/file-preview.html?profile=opportunity-evidence";
  for(const address of [undefined,null,"","   ","#evidence=wrong",w.location.href]){
    const payload={name:"缺失内容.pdf",sections:[],sourceUrl:address};
    const result=e.previewProfile("#evidence="+encodeURIComponent(JSON.stringify(payload)),payload.name);
    assert(!result.pageData[0].html.includes("<iframe"));assert(result.pageData[0].html.includes("文件暂不可预览"));
  }
  const material=e.materialPayload({id:"KB-NO-BODY",name:"仅有资料摘要",file:"资质.pdf",version:"V1",summary:"不能作为文件正文的资料摘要"});
  assert.equal(material.sections.length,0);
  const preview=e.previewProfile("#evidence="+encodeURIComponent(JSON.stringify(material)),material.name);
  assert(!preview.pageData[0].html.includes("不能作为文件正文的资料摘要"));assert(preview.pageData[0].html.includes("在知识库核对对应文件"));
}
// A participation clause is not missing evidence. A business licence never proves a specialist permit.
{
  const {w,s}=fresh(),e=w.OpportunityEvidence,item=s.copy(s.find("OP001"));
  const company=e.matchQualification(Object.assign({},item,{qualification:"提供有效营业执照"}));
  const union=e.matchQualification(Object.assign({},item,{qualification:"提供有效营业执照；不接受联合体"}));
  assert.equal(union.score,company.score);assert.equal(union.rows.find(x=>x.kind==="participation").state,"participation");
  assert(!union.rows.find(x=>x.kind==="participation").scored);
  const combined=e.matchQualification(Object.assign({},item,{qualification:"提供有效营业执照，且须具备增值电信业务经营许可证"}));
  assert(combined.rows.some(x=>x.kind==="company"&&x.state==="supported"));
  assert(combined.rows.some(x=>x.kind==="special-certificate"&&x.state==="missing"));assert.notEqual(combined.label,"已有材料支持");
  const match=e.matchQualification(Object.assign({},item,{qualification:"提供类似项目业绩；项目经理须提供近三个月社保证明"}));
  const cases=match.rows.find(x=>x.kind==="cases"),person=match.rows.find(x=>x.kind==="people");
  assert.notEqual(cases.state,"supported");assert(!cases.materials.some(x=>x.id==="KB-CASE-021"));
  assert(person.materials.length);assert(person.materials.every(x=>x.parentId&&x.name.includes("社保")&&x.id!==x.parentId));
  assert(person.materials.every(x=>x.lifecycleState!=="archived"));
  const all=e.records();assert(all.some(x=>x.parentId==="KB-PEO-038"&&x.recordType==="certificate"));
}
// Summary, versions and detailed evidence share one meaning and one visible main table.
{
  const {w,s,u,node}=uiContext("OP001",true);
  const clause="提供有效营业执照，且须具备增值电信业务经营许可证";
  s.change(next=>{next.opportunities.find(x=>x.id==="OP001").qualification=clause;});s.reassess("OP001");u.renderDetail();
  let html=node("#opportunityDetail").innerHTML;
  const table=html.slice(html.indexOf('<table class="op-table op-assessment-table"'),html.indexOf('</table>',html.indexOf('<table class="op-table op-assessment-table"')));
  assert.equal((table.match(/<th\b/g)||[]).length,4);
  assert.equal((table.match(/class="op-qualification-overview"/g)||[]).length,1);
  assert.equal((table.match(/class="op-qualification-detail"/g)||[]).length,2);
  assert(table.includes("共 2 项材料要求"));assert(!table.includes("rowspan="));
  assert(table.includes("营业执照"));assert(table.includes("依据不足"));assert(table.includes("知识库未找到对应证明"));assert(!table.includes("查看依据"));
  assert(!html.includes('id="opQualificationBasis"'));assert(!w._modalOpen);
  s.change(next=>{const item=next.opportunities.find(x=>x.id==="OP001");item.revision++;});u.renderDetail();html=node("#opportunityDetail").innerHTML;
  assert(html.includes("上次初评分"));assert(html.includes("上次初评依据"));
  const transferred=uiContext("OP017",true);transferred.s.change(next=>{delete next.opportunities.find(x=>x.id==="OP017").assessmentSnapshot.result.qualificationMatch;});transferred.u.renderDetail();const text=transferred.node("#opportunityDetail").innerHTML;
  assert(text.includes("当前参考对照"));assert(!text.includes("重新初评后"));assert(!text.includes('data-op="evaluate"'));
}

// Every state uses the same three-column table, with no evidence actions or nested current-material table.
{
  for(const item of fresh().s.get().opportunities){
    const {s,u,node}=uiContext(item.id,true),before=JSON.stringify(s.find(item.id).assessmentSnapshot);
    u.renderDetail();const html=node("#opportunityDetail").innerHTML;
    const start=html.indexOf('<table class="op-table op-assessment-table"'),end=html.indexOf('</table>',start),table=html.slice(start,end);
    assert(start>=0&&end>start);assert.equal((table.match(/<th\b/g)||[]).length,4);
    assert(table.includes('<th>判断项</th><th>判断结果</th><th class="op-assessment-score-cell">得分</th><th>主要依据</th>'));
    assert.equal((table.match(/<table/g)||[]).length,1);
    assert(!html.includes('data-op="basis"'));assert(!html.includes("查看依据"));
    assert(!html.includes("op-qualification-panel"));assert(!html.includes('id="opQualificationBasis"'));
    for(const name of s.dimensions)assert(table.includes(name));
    assert(table.includes('data-assessment-item="1"'));assert(html.includes("查看公告原文"));
    assert.equal(JSON.stringify(s.find(item.id).assessmentSnapshot),before);
  }
  assert(!fs.readFileSync("assets/js/opportunities.js","utf8").includes("function basisModal("));
}
// Inline evidence uses the frozen material version; opening its preview never substitutes current KB data.
{
  const {w,s,u,node}=uiContext("OP001",true),e=w.OpportunityEvidence;
  s.change(next=>{next.opportunities.find(x=>x.id==="OP001").qualification="提供 ISO 9001 认证";});s.reassess("OP001");
  const snapshot=JSON.stringify(s.find("OP001").assessmentSnapshot);
  w.KnowledgePrototypeData.certificates.find(x=>x.id==="KB-CERT-003").version="V9.8";
  u.renderDetail();const html=node("#opportunityDetail").innerHTML;
  const start=html.indexOf('<table class="op-table op-assessment-table"'),table=html.slice(start,html.indexOf('</table>',start));
  const link=table.match(/href="([^"]*profile=opportunity-evidence[^"]*)"/);
  assert(link);assert(table.includes("V1.2"));assert(!table.includes("V9.8"));
  const preview=e.previewProfile(link[1].slice(link[1].indexOf("#")),"");
  assert(preview.pageData.map(x=>x.html).join("").includes("QMS-90******57"));
  assert.equal(JSON.stringify(s.find("OP001").assessmentSnapshot),snapshot);
}

// Qualification layout aligns each requirement with its own result; participation stays only in the notice text.
{
  const {s,u,node}=uiContext("OP001",true);
  const before=JSON.stringify(s.find("OP001").assessmentSnapshot);u.renderDetail();
  const html=node("#opportunityDetail").innerHTML,start=html.indexOf('<table class="op-table op-assessment-table"'),table=html.slice(start,html.indexOf('</table>',start));
  assert(table.includes("共 2 项材料要求"));assert(!table.includes("联合体"));assert(!table.includes("参与方式"));
  assert(!table.includes("rowspan="));assert(html.includes("不接受联合体"));
  const children=table.match(/<tr class="op-qualification-detail"[^>]*>[\s\S]*?<\/tr>/g)||[];
  assert.equal(children.length,2);
  for(const child of children){
    const cells=child.match(/<td\b[^>]*>[\s\S]*?<\/td>/g)||[];assert.equal(cells.length,4);
    assert(cells[0].includes("op-assessment-subitem"));assert(cells[1].includes("op-judgment"));
    assert(cells[2].includes("data-qualification-score"));assert(cells[3].includes("公告要求"));assert(cells[3].includes("对应材料"));assert(!cells[3].includes("op-qualification-check-head"));
  }
  assert.equal(JSON.stringify(s.find("OP001").assessmentSnapshot),before);
  s.change(next=>{const x=next.opportunities.find(i=>i.id==="OP001");x.qualification="不接受联合体";x.revision++;});s.reassess("OP001");u.renderDetail();
  const updated=node("#opportunityDetail").innerHTML,newStart=updated.indexOf('<table class="op-table op-assessment-table"'),empty=updated.slice(newStart,updated.indexOf('</table>',newStart));
  assert(empty.includes("未列明需知识库证明的资格要求"));assert(!empty.includes("op-qualification-detail"));
  assert(!empty.includes("仅列明参与条件"));assert(!empty.includes("联合体"));assert(updated.includes("不接受联合体"));
}

// Full source conditions remain readable without changing the captured scoring data.
{
  const {s,u,node}=uiContext("OP001",true);
  const conditions=["须具有覆盖软件开发范围的 ISO 9001 认证","具备 CMMI 三级及以上资质","近三年内提供至少2项合同金额不低于300万元的类似项目业绩","项目经理须提供覆盖2026年8月至10月的近三个月社保证明"];
  s.change(next=>{next.opportunities.find(x=>x.id==="OP001").qualification=conditions.join("；")+"；不接受联合体";});s.reassess("OP001");
  const before=JSON.stringify(s.find("OP001").assessmentSnapshot);u.renderDetail();
  const html=node("#opportunityDetail").innerHTML,start=html.indexOf('<table class="op-table op-assessment-table"'),table=html.slice(start,html.indexOf('</table>',start));
  for(const condition of conditions)assert(table.includes(condition),condition);
  assert(!table.includes("联合体"));assert.equal(JSON.stringify(s.find("OP001").assessmentSnapshot),before);
  assert(!html.includes("查看分项得分"));assert.equal((table.match(/data-assessment-score="\d"/g)||[]).length,5);
  const children=[...table.matchAll(/<tr class="op-qualification-detail"[^>]*>[\s\S]*?<\/tr>/g)].map(x=>x[0]);
  assert(children.every(row=>!row.includes("data-assessment-score=")));
}
// Current-reference context sits in the overview evidence cell, without an extra full-width table row.
{
  const {s,u,node}=uiContext("OP017",true);
  s.change(next=>{const result=next.opportunities.find(x=>x.id==="OP017").assessmentSnapshot.result;delete result.qualificationMatch;delete result.scoringBasis;});
  const before=JSON.stringify(s.find("OP017").assessmentSnapshot);
  u.renderDetail();const html=node("#opportunityDetail").innerHTML;
  const overview=html.match(/<tr class="op-qualification-overview"[^>]*>[\s\S]*?<\/tr>/)[0];
  assert(overview.includes('data-evidence-mode="historical"'));assert(overview.includes("历史初评未留存材料对照"));
  const cells=overview.match(/<td\b[^>]*>[\s\S]*?<\/td>/g);assert.equal(cells.length,4);
  assert(cells[3].includes("当前参考对照"));assert(cells[3].includes("不计入留存初评分"));assert(cells[3].includes("当前对照"));
  assert.equal((cells[3].match(/共 \d+ 项材料要求/g)||[]).length,1);assert(cells[3].includes("留存初评 · 公告 V"));
  assert(!html.includes("op-qualification-reference-heading"));assert(!html.includes("op-qualification-reference-title"));
  assert(html.indexOf(overview)<html.indexOf('class="op-qualification-detail"'));
  assert.equal(JSON.stringify(s.find("OP017").assessmentSnapshot),before);
}
// Historical material tables use the same item/result/evidence order and frozen document versions.
{
  const {w,s,u,node}=uiContext("OP001",true),clause="须具有覆盖软件开发范围的 ISO 9001 认证";
  s.change(next=>{next.opportunities.find(x=>x.id==="OP001").qualification=clause;});s.reassess("OP001");
  const history=JSON.stringify(s.find("OP001").history),snapshot=JSON.stringify(s.find("OP001").assessmentSnapshot);
  w.KnowledgePrototypeData.certificates.find(x=>x.id==="KB-CERT-003").version="V9.9";
  u.renderDetail();const html=node("#opportunityDetail").innerHTML,start=html.indexOf('<table class="op-table op-qualification-table"'),table=html.slice(start,html.indexOf('</table>',start));
  assert(start>=0);assert(table.includes('<th>具体要求</th><th>判断结果</th><th class="op-assessment-score-cell">得分</th><th>主要依据</th>'));
  assert(table.includes(clause));assert(!table.includes("rowspan="));assert(table.includes("V1.2"));assert(!table.includes("V9.9"));
  assert(table.includes("profile=opportunity-evidence"));assert.equal(JSON.stringify(s.find("OP001").history),history);
  assert.equal(JSON.stringify(s.find("OP001").assessmentSnapshot),snapshot);
}
// Geography and preparation evidence avoid repeated values; old acquisition-based calculations stay explicit.
{
  const {s,u,node}=uiContext("OP001",true);s.reassess("OP001");u.renderDetail();
  const html=node("#opportunityDetail").innerHTML;
  const region=html.match(/<tr data-assessment-item="3">[\s\S]*?<\/tr>/)[0];
  assert.equal((region.match(/实施地：/g)||[]).length,1);assert.equal((region.match(/履约期限：/g)||[]).length,1);assert(region.includes("筛选要求"));
  const timing=html.match(/<tr data-assessment-item="4">[\s\S]*?<\/tr>/)[0];
  assert.equal((timing.match(/投标截止：/g)||[]).length,2); // One actual date and one distance label.
  assert(!timing.includes("报名"));assert(!timing.includes("开标"));assert(!timing.includes("文件获取截止"));assert(timing.includes("建议至少准备"));
  s.change(next=>{const saved=next.opportunities.find(x=>x.id==="OP001").assessmentSnapshot;delete saved.result.preparationBasis;saved.notice.acquired=false;});
  const before=JSON.stringify(s.find("OP001").assessmentSnapshot);u.renderDetail();
  const old=node("#opportunityDetail").innerHTML.match(/<tr data-assessment-item="4">[\s\S]*?<\/tr>/)[0];
  assert(old.includes("文件获取截止"));assert(old.includes("较早截止"));assert(old.includes("历史口径"));
  assert.equal(JSON.stringify(s.find("OP001").assessmentSnapshot),before);
}

// Supplemental quantity/amount/year conditions belong to one requirement and one assessment entry.
{
  const {w,s,u,node}=uiContext("OP001",true),e=w.OpportunityEvidence;
  const original="近三年内，提供不少于2项类似项目业绩，单项合同金额不低于300万元";
  const requirements=e.requirements({qualification:original});
  assert.equal(requirements.length,1);assert.equal(requirements[0].kind,"cases");
  for(const text of ["近三年内","不少于2项","单项合同金额不低于300万元"])assert(requirements[0].requirementText.includes(text));
  assert.equal(e.requirements({qualification:original+"；具有有效营业执照"}).length,2);
  assert.equal(e.requirements({qualification:"提供类似项目业绩，注册资本不少于500万元"}).length,2);
  assert.equal(e.requirements({qualification:"提供类似项目业绩；项目经理工作经验不少于5年"}).length,2);
  s.change(next=>{next.opportunities.find(x=>x.id==="OP001").qualification=original;});s.reassess("OP001");
  const match=s.find("OP001").assessmentSnapshot.result.qualificationMatch;
  assert.equal(match.rows.length,1);assert(match.summary.includes("共 1 项要求")||match.summary.includes("共 1 项材料要求"));
  const before=JSON.stringify(s.find("OP001").assessmentSnapshot);u.renderDetail();
  const html=node("#opportunityDetail").innerHTML,start=html.indexOf('<table class="op-table op-assessment-table"'),table=html.slice(start,html.indexOf('</table>',start));
  assert(table.includes("共 1 项材料要求"));assert.equal((table.match(/class="op-qualification-detail"/g)||[]).length,1);
  assert.equal(table.split("单项合同金额不低于300万元").length-1,1);assert(table.includes("近三年内"));
  assert.equal(JSON.stringify(s.find("OP001").assessmentSnapshot),before);
}
// Merged supplemental limits must be verified before a candidate can receive full qualification credit.
{
  const {w,s,u}=uiContext("OP001",true),e=w.OpportunityEvidence;
  const item=s.copy(s.find("OP001")),before=JSON.stringify(s.find("OP001"));
  item.deadline="2026-11-20 09:30";
  item.qualification="持有 ISO 9001 认证";
  const basic=e.matchQualification(item,Date.parse("2026-10-29T12:00:00+08:00"));
  assert.equal(basic.rows[0].state,"supported");assert.equal(basic.score,25);
  item.qualification="持有 ISO 9001 认证，投标截止日剩余有效期不少于3年";
  const limited=e.matchQualification(item,Date.parse("2026-10-29T12:00:00+08:00"));
  assert.equal(limited.rows.length,1);assert.equal(limited.rows[0].state,"partial");
  assert.equal(limited.rows[0].label,"部分符合");assert(limited.rows[0].reason.includes("剩余有效期"));
  assert.equal(limited.score,12.5);assert.equal(limited.unknown,0);
  assert(limited.rows[0].requirementText.includes("剩余有效期不少于3年"));
  for(const qualification of [
    "持有 ISO 9001 认证且投标截止日剩余有效期不少于3年",
    "持有 ISO 9001 认证（投标截止日剩余有效期不少于3年）",
    "持有 ISO 9001 认证(投标截止日剩余有效期不少于3年)",
    "持有 ISO 9001 认证，剩余有效期至少三年"
  ]) {
    const match=e.matchQualification(Object.assign({},item,{qualification}));
    assert.equal(match.rows.length,1,qualification);assert.equal(match.rows[0].state,"partial",qualification);
    assert.equal(match.score,limited.score);assert.equal(match.unknown,limited.unknown);
    assert(e.requirementText(match.rows[0]).includes("有效期"));
  }
  const independent=e.matchQualification(Object.assign({},item,{qualification:"持有 ISO 9001 认证，注册资本不少于500万元"}));
  assert.equal(independent.rows.length,2);assert.equal(independent.rows[0].state,"supported");
  const cert=w.KnowledgePrototypeData.certificates.find(x=>x.id==="KB-CERT-003");
  cert.validityDueDate="2026-11-01";cert.endDate="2026-11-01";
  const expired=e.matchQualification(item);assert.equal(expired.rows[0].state,"expired");assert.equal(expired.score,0);
  cert.lifecycleState="archived";
  assert.equal(e.matchQualification(item).rows[0].state,"unavailable");
  w.KnowledgePrototypeData.certificates=w.KnowledgePrototypeData.certificates.filter(x=>x.id!==cert.id);
  const missing=e.matchQualification(item);assert.equal(missing.rows[0].state,"missing");assert.equal(missing.score,0);
  u.renderDetail();assert.equal(JSON.stringify(s.find("OP001")),before);
}
// Explicit reassessment creates the new limited result and retains the exact old score/material snapshot.
{
  const {s}=fresh(),original=s.copy(s.find("OP001").assessmentSnapshot);
  s.change(next=>{const item=next.opportunities.find(x=>x.id==="OP001");item.qualification="持有 ISO 9001 认证，投标截止日剩余有效期不少于3年";item.deadline="2026-11-20 09:30";});
  s.reassess("OP001");
  assert.equal(s.find("OP001").assessmentSnapshot.result.qualificationMatch.rows[0].state,"partial");
  assert.equal(JSON.stringify(s.find("OP001").history[0].previousAssessmentSnapshot),JSON.stringify(original));
}
// Merging keeps the full primary clause, including scope, beside the complete supplemental conditions.
{
  const {w,s,u,node}=uiContext("OP001",true),e=w.OpportunityEvidence;
  const scope="持有适用范围包含软件开发的 ISO 9001 认证",limit="投标截止日剩余有效期不少于3年";
  s.change(next=>{next.opportunities.find(x=>x.id==="OP001").qualification=scope+"，"+limit;});s.reassess("OP001");
  const row=s.find("OP001").assessmentSnapshot.result.qualificationMatch.rows[0];
  assert(row.requirementText.includes(scope));assert(row.requirementText.includes(limit));
  assert.equal(e.requirementText(row).split(scope).length-1,1);
  assert.equal(e.requirementText(row).split(limit).length-1,1);
  // A previously saved abbreviated display value must not hide the original full scope.
  s.change(next=>{next.opportunities.find(x=>x.id==="OP001").assessmentSnapshot.result.qualificationMatch.rows[0].requirementText="ISO 9001 认证；"+limit;});
  const before=JSON.stringify(s.find("OP001"));u.renderDetail();
  const html=node("#opportunityDetail").innerHTML,start=html.indexOf('<table class="op-table op-assessment-table"'),table=html.slice(start,html.indexOf('</table>',start));
  assert.equal(table.split(scope).length-1,1);assert.equal(table.split(limit).length-1,1);
  assert.equal(JSON.stringify(s.find("OP001")),before);
}
// Existing fragmented snapshots are consolidated only for display; their score, rows and history stay byte-for-byte intact.
{
  const {w,s,u,node}=uiContext("OP001",true),e=w.OpportunityEvidence;
  const original="提供不少于2项类似项目业绩，单项合同金额不低于300万元";
  s.change(next=>{next.opportunities.find(x=>x.id==="OP001").qualification=original;});s.reassess("OP001");
  s.change(next=>{
    const item=next.opportunities.find(x=>x.id==="OP001"),saved=item.assessmentSnapshot,host=saved.result.qualificationMatch.rows[0];
    delete host.requirementText;delete host.requirementClauses;
    saved.result.qualificationMatch.rows.push({id:"OLD-CONDITION",kind:"other",groupId:host.groupId,original:host.original,clause:"单项合同金额不低于300万元",state:"missing",label:"未找到对应材料",reason:"旧记录未匹配到材料",materials:[],scored:true});
    item.history.unshift({action:"重新初评",user:"李明远",at:saved.at,revision:item.revision,score:saved.result.score,assessmentSnapshot:s.copy(saved)});
  });
  const before=JSON.stringify(s.find("OP001"));u.renderDetail();
  const html=node("#opportunityDetail").innerHTML,start=html.indexOf('<table class="op-table op-assessment-table"'),table=html.slice(start,html.indexOf('</table>',start));
  assert(table.includes("共 1 项材料要求"));assert.equal((table.match(/class="op-qualification-detail"/g)||[]).length,1);
  assert.equal(table.split("单项合同金额不低于300万元").length-1,1);assert.equal(JSON.stringify(s.find("OP001")),before);
  const input=s.copy(s.find("OP001").assessmentSnapshot.result.qualificationMatch.rows),raw=JSON.stringify(input),merged=e.mergeRequirementConditions(input);
  assert.equal(merged.length,1);assert.equal(JSON.stringify(input),raw);assert.equal(JSON.stringify(e.mergeRequirementConditions(merged)),JSON.stringify(merged));
}
// Legacy child judgments contribute to the merged result/count; stored scores and material snapshots are never rewritten.
{
  const {w,s,u,node}=uiContext("OP001",true),e=w.OpportunityEvidence;
  const original="持有 ISO 9001 认证，投标截止日剩余有效期不少于3年";
  const probe=s.copy(s.find("OP001"));probe.qualification="持有 ISO 9001 认证";probe.deadline="2026-11-20 09:30";
  const host=e.matchQualification(probe).rows[0];host.original=original;delete host.conclusion;delete host.checks;delete host.credit;delete host.unknownCredit;delete host.score;
  const condition={id:"LEGACY-LIMIT",kind:"other",groupId:host.groupId,original,clause:"投标截止日剩余有效期不少于3年",scored:true,state:"missing",label:"未找到对应材料",reason:"附加条件未找到对应证明",materials:[]};
  for(const [first,second,expected] of [["supported","missing","partial"],["missing","supported","partial"],["partial","missing","partial"],["expired","missing","expired"],["unavailable","missing","unavailable"],["supported","supported","supported"]]) {
    const input=[Object.assign({},host,{state:first}),Object.assign({},condition,{state:second})],before=JSON.stringify(input),merged=e.mergeRequirementConditions(input);
    assert.equal(merged.length,1);assert.equal(merged[0].state,expected);assert.equal(JSON.stringify(input),before);
    assert.equal(JSON.stringify(e.mergeRequirementConditions(merged)),JSON.stringify(merged));
  }
  s.change(next=>{
    const item=next.opportunities.find(x=>x.id==="OP001"),saved=item.assessmentSnapshot;
    saved.result.qualificationMatch={noticeRevision:saved.noticeRevision,rows:[host,condition],score:12.5,unknown:12.5,label:"部分材料待确认",summary:"共 2 项材料要求，1 项已有材料支持"};
    saved.result.details[1].score=12.5;saved.result.details[1].unknown=12.5;
    saved.result.score=Math.round(saved.result.details.reduce((sum,row)=>sum+row.score,0));
    item.history.unshift({action:"重新初评",user:"李明远",at:saved.at,revision:item.revision,score:saved.result.score,assessmentSnapshot:s.copy(saved)});
  });
  const before=JSON.stringify(s.find("OP001"));u.renderDetail();
  const html=node("#opportunityDetail").innerHTML,overview=html.match(/<tr class="op-qualification-overview"[^>]*>[\s\S]*?<\/tr>/)[0];
  assert(overview.includes("依据不足"));assert(overview.includes("共 1 项材料要求：1 项依据不足"));assert(!overview.includes("1 项已有材料支持"));
  const start=html.indexOf('<table class="op-table op-qualification-table"'),history=html.slice(start,html.indexOf('</table>',start));
  assert(history.includes("依据不足"));assert(history.includes("附加条件未找到对应证明"));
  assert(history.includes(host.materials[0].version));assert.equal(s.find("OP001").assessmentSnapshot.result.details[1].score,12.5);
  assert.equal(JSON.stringify(s.find("OP001")),before);
}
// Material time metadata keeps type and original meaning; no archive/update dates are inferred as performance periods.
{
  const {w,s,u,node}=uiContext("OP001",true);
  assert.equal(u.materialPeriod({category:"certificates",startDate:"2024-05-19",endDate:"2027-05-18"}),"证书有效期：2024-05-19 至 2027-05-18");
  assert.equal(u.materialPeriod({category:"certificates",validityMode:"longterm"}),"证书有效期：长期有效");
  assert.equal(u.materialPeriod({category:"certificates"}),"证书有效期：未记录");
  assert.equal(u.materialPeriod({name:"社保证明",period:"需覆盖 2026-05 至 2026-07"}),"社保覆盖月份：需覆盖 2026-05 至 2026-07");
  assert.equal(u.materialPeriod({name:"社保证明",summary:"待补充；需覆盖 2026-05 至 2026-07"}),"社保覆盖月份：需覆盖 2026-05 至 2026-07");
  assert.equal(u.materialPeriod({name:"社保证明",summary:"已核验；2026-05 至 2026-07"}),"社保覆盖月份：2026-05 至 2026-07");
  for(const period of ["2026-05-01 至 2026-07-31","2026/05/01 至 2026/07/31","2026年5月1日至2026年7月31日","2026.05.01～2026.07.31"]) {
    assert.equal(u.materialPeriod({name:"社保证明",period}),"社保覆盖月份："+period);
    assert.equal(u.materialPeriod({name:"社保证明",dateRange:period}),"社保覆盖月份："+period);
    assert.equal(u.materialPeriod({name:"社保证明",summary:"已核验；"+period}),"社保覆盖月份："+period);
  }
  assert.equal(u.materialPeriod({name:"社保证明",period:"2026-07-25"}),"社保覆盖月份：未记录具体月份");
  assert.equal(u.materialPeriod({name:"社保证明",period:"更新于2026-05-01 至 2026-07-31"}),"社保覆盖月份：未记录具体月份");
  assert.equal(u.materialPeriod({name:"社保证明",period:"计划补充 2026-07-25"}),"社保覆盖月份：未记录具体月份");
  assert.equal(u.materialPeriod({name:"社保证明",dateRange:"归档日期 2026-07-25"}),"社保覆盖月份：未记录具体月份");
  assert.equal(u.materialPeriod({name:"社保证明",dateRange:"需覆盖 2026-05-01 至 2026-07-31"}),"社保覆盖月份：需覆盖 2026-05-01 至 2026-07-31");
  assert.equal(u.materialPeriod({name:"社保证明",period:"2026-05 至 2026-07",dateRange:"2026-08 至 2026-10"}),"社保覆盖月份：2026-05 至 2026-07");
  assert.equal(u.materialPeriod({category:"cases",dateRange:"履约期 2023-2025"}),"履约期间：2023-2025");
  assert.equal(u.materialPeriod({category:"cases",dateRange:"归档日期 2025-09-16"}),"合同/履约期间：未记录");
  assert.equal(u.materialPeriod({category:"cases",dateRange:"计划补充 2026-07-25"}),"合同/履约期间：未记录");
  assert.equal(u.materialPeriod({category:"cases",dateRange:"合同签订日期 2023-03-18"}),"合同签订日期：2023-03-18");
  s.change(next=>{next.opportunities.find(x=>x.id==="OP001").qualification="项目经理须提供覆盖2026年8月至10月的近三个月社保证明";});s.reassess("OP001");
  const saved=s.find("OP001").assessmentSnapshot;assert(saved.result.qualificationMatch.rows[0].materials[0].period);
  s.change(next=>{const saved=next.opportunities.find(x=>x.id==="OP001").assessmentSnapshot;delete saved.result.qualificationMatch.rows[0].materials[0].period;});
  const before=JSON.stringify(s.find("OP001").assessmentSnapshot);
  w.KnowledgePrototypeData.peopleProfiles.find(x=>x.id==="KB-PEO-038").materials.find(x=>/社保/.test(x.name)).period="已覆盖 2026-08 至 2026-10";
  u.renderDetail();const html=node("#opportunityDetail").innerHTML,start=html.indexOf('<table class="op-table op-assessment-table"'),table=html.slice(start,html.indexOf('</table>',start));
  assert(table.includes("社保覆盖月份：需覆盖 2026-05 至 2026-07"));assert(!table.includes("已覆盖 2026-08 至 2026-10"));
  assert(!table.includes("有效期按材料记载"));assert.equal(JSON.stringify(s.find("OP001").assessmentSnapshot),before);
}
// Legacy social-insurance dateRange is rendered from the snapshot in both main and historical evidence.
{
  const {w,s,u,node}=uiContext("OP001",true);
  s.change(next=>{next.opportunities.find(x=>x.id==="OP001").qualification="项目经理提供社保证明";});s.reassess("OP001");
  s.change(next=>{
    const item=next.opportunities.find(x=>x.id==="OP001"),saved=item.assessmentSnapshot,record=saved.result.qualificationMatch.rows[0].materials[0];
    delete record.period;record.summary="已核验";record.dateRange="2026-05-01 至 2026-07-31";
    item.history.unshift({action:"人工确认",user:"李明远",at:saved.at,revision:item.revision,score:saved.result.score,assessmentSnapshot:s.copy(saved)});
  });
  const before=JSON.stringify(s.find("OP001"));
  const live=w.KnowledgePrototypeData.peopleProfiles.find(x=>x.id==="KB-PEO-038").materials.find(x=>/社保/.test(x.name));
  live.period="2026-08-01 至 2026-10-31";live.dateRange=live.period;
  u.renderDetail();const html=node("#opportunityDetail").innerHTML;
  for(const className of ["op-assessment-table","op-qualification-table"]) {
    const start=html.indexOf('<table class="op-table '+className+'"'),table=html.slice(start,html.indexOf('</table>',start));
    assert(table.includes("社保覆盖月份：2026-05-01 至 2026-07-31"));assert(!table.includes("2026-08-01 至 2026-10-31"));
  }
  assert.equal(JSON.stringify(s.find("OP001")),before);
}

// AI qualification conclusions use proven conditions, with no human material-confirmation tasks or blanket half credit.
{
  const {w,s,u,node}=uiContext("OP001",true),e=w.OpportunityEvidence,item=s.copy(s.find("OP001")),at=Date.parse("2026-10-29T12:00:00+08:00");
  item.deadline="2026-11-20 09:30";
  const assess=qualification=>e.matchQualification(Object.assign({},item,{qualification}),at);
  const full=assess("持有 ISO 9001 认证");assert.equal(full.label,"符合");assert.equal(full.score,25);assert.equal(full.unknown,0);
  const partial=assess("持有覆盖软件开发范围的 ISO 9001 认证，投标截止日剩余有效期不少于3年");
  assert.equal(partial.label,"部分符合");assert.equal(partial.rows[0].checks.length,3);assert.equal(partial.score,16.7);assert.equal(partial.unknown,0);
  assert(partial.rows[0].reason.includes("未达到该期限"));
  const bad=assess("持有 ISO 27001 认证");assert.equal(bad.label,"不符合");assert.equal(bad.score,0);assert.equal(bad.unknown,0);
  const insufficient=assess("提供类似项目业绩");assert.equal(insufficient.label,"依据不足");assert.equal(insufficient.score,0);assert.equal(insufficient.unknown,25);
  const ability=assess("具备履约所需专业技术能力");assert.equal(ability.label,"依据不足");assert.equal(ability.score,0);
  const combined=assess("持有 ISO 9001 认证；持有 ISO 27001 认证；提供类似项目业绩");
  assert(combined.summary.includes("1 项符合"));assert(combined.summary.includes("1 项不符合"));assert(combined.summary.includes("1 项依据不足"));
  assert.equal(combined.score,8.3);assert.equal(combined.unknown,8.3);
  for(const result of [full,partial,bad,insufficient,ability,combined]) {
    for(const row of result.rows){assert(!/待确认|仍需确认|仍需.*核对/.test(row.label+row.reason));assert.equal(row.credit,row.checks.filter(x=>x.result==="passed").length/row.checks.length);}
    assert.equal(result.score,Math.round(25*result.rows.reduce((sum,row)=>sum+row.credit,0)/result.rows.length*10)/10);
  }
  s.change(next=>{next.opportunities.find(x=>x.id==="OP001").qualification="持有 ISO 9001 认证；持有 ISO 27001 认证；提供类似项目业绩";});
  const old=s.copy(s.find("OP001").assessmentSnapshot);s.reassess("OP001");const current=s.find("OP001").assessmentSnapshot;
  assert.equal(current.result.details[1].score,current.result.qualificationMatch.score);assert.equal(JSON.stringify(s.find("OP001").history[0].previousAssessmentSnapshot),JSON.stringify(old));
  const before=JSON.stringify(s.find("OP001"));u.renderDetail();const html=node("#opportunityDetail").innerHTML;
  for(const name of ["op-assessment-table","op-qualification-table"]) {
    const start=html.indexOf('<table class="op-table '+name+'"'),table=html.slice(start,html.indexOf('</table>',start));
    assert(!/部分材料待确认|项待确认|>待确认<|仍需逐项核对|仍需确认/.test(table));assert(!table.includes("查看依据"));
  }
  assert.equal(JSON.stringify(s.find("OP001")),before);
}
// Complete evidence can satisfy a case requirement; shared keywords and missing quantitative facts cannot.
{
  const {w,s}=fresh(),e=w.OpportunityEvidence,item=s.copy(s.find("OP001"));
  item.name="信息系统运行维护服务";item.summary="系统运维与服务管理";item.deadline="2026-11-20 09:30";
  const assess=qualification=>e.matchQualification(Object.assign({},item,{qualification}));
  assert.equal(assess("提供类似项目业绩").label,"符合");
  const unknown=assess("近三年内，提供不少于2项类似项目业绩，单项合同金额不低于300万元");
  assert.equal(unknown.label,"依据不足");assert.equal(unknown.score,0);assert(unknown.rows[0].reason.includes("未记载"));
  const proof=w.KnowledgePrototypeData.caseRecords.find(x=>x.id==="KB-CASE-021");
  w.KnowledgePrototypeData.caseRecords=[Object.assign({},proof,{contractAmount:450,contractDate:"2025-06-01"})];
  const verified=assess("近三年内，提供至少1项类似项目业绩，单项合同金额不低于300万元");assert.equal(verified.label,"符合");assert.equal(verified.score,25);
  const insufficientCount=assess("提供至少2项类似项目业绩");assert.equal(insufficientCount.label,"不符合");assert.equal(insufficientCount.score,0);
}
// Social-insurance periods are judged automatically from existing facts; desired coverage is never treated as delivered proof.
{
  const {w,s}=fresh(),e=w.OpportunityEvidence,item=s.copy(s.find("OP001")),record=w.KnowledgePrototypeData.peopleProfiles.find(x=>x.id==="KB-PEO-038").materials.find(x=>/社保/.test(x.name));
  item.deadline="2026-11-20 09:30";item.qualification="项目经理须提供覆盖2026年8月至10月的社保证明";
  record.status="已核验";record.period="2026-08-01 至 2026-10-31";
  assert.equal(e.matchQualification(item).label,"符合");assert.equal(e.matchQualification(item).score,25);
  record.period="2026-05-01 至 2026-07-31";assert.equal(e.matchQualification(item).label,"不符合");assert.equal(e.matchQualification(item).score,0);
  record.period="需覆盖2026-08-01 至 2026-10-31";assert.equal(e.matchQualification(item).label,"依据不足");assert.equal(e.matchQualification(item).score,0);
}
// Each new dimension's score follows its judgment, ignores preset factors and sums exactly to the displayed total.
{
  const {s,u,node}=uiContext("OP001",true),at=Date.parse("2026-10-29T12:00:00+08:00"),item=s.copy(s.find("OP001"));
  item.deadline="2026-11-20 09:30";item.qualification="持有覆盖软件开发范围的 ISO 9001 认证，投标截止日剩余有效期不少于3年";
  let rule=s.copy(s.get().rules[0]);rule.max=100;rule.regions="上海";
  const blocked=s.evaluate(item,rule,at);assert.equal(blocked.details[2].score,0);assert.equal(blocked.details[3].score,0);
  assert.equal(blocked.details[2].judgment.label,"超出预算范围");assert.equal(blocked.details[3].judgment.label,"实施地区不符");
  rule.max=1000;rule.regions="广东";
  const full=s.evaluate(item,rule,at);assert.equal(full.details[0].score,35);assert.equal(full.details[2].score,15);assert.equal(full.details[3].score,10);
  assert.equal(full.details[1].score,16.7);assert.equal(full.score,91.7);
  assert.equal(full.score,Math.round(full.details.reduce((sum,row)=>sum+row.score,0)*10)/10);
  const legacyInputs=Object.assign({},item,{factors:[0,0,0,0,0],unknown:[35,25,15,10,15]});
  assert.equal(JSON.stringify(s.evaluate(legacyInputs,rule,at).details),JSON.stringify(full.details));
  const unknown=s.evaluate(Object.assign({},item,{amount:null,region:"",deadline:""}),rule,at);
  for(const index of [2,3,4]){assert.equal(unknown.details[index].score,0);assert.equal(unknown.details[index].unknown,unknown.details[index].weight);}
  const short=s.evaluate(Object.assign({},item,{deadline:"2026-10-31 12:00"}),rule,at);assert.equal(short.details[4].score,10);assert.equal(short.details[4].judgment.label,"准备时间不足");
  assert(short.details[4].evidence.includes("比例计分"));
  updateRule(s,{max:1000,regions:"广东"});s.change(next=>{const current=next.opportunities.find(x=>x.id==="OP001");current.qualification=item.qualification;current.deadline=item.deadline;});s.reassess("OP001");
  const saved=s.find("OP001").assessmentSnapshot,before=JSON.stringify(saved);
  assert.equal(JSON.stringify(u.assessmentJudgments(s.find("OP001"))),JSON.stringify(saved.result.details.map(row=>row.judgment)));
  u.renderDetail();const html=node("#opportunityDetail").innerHTML,start=html.indexOf('<table class="op-table op-assessment-table"'),table=html.slice(start,html.indexOf('</table>',start));
  for(const [index,part] of saved.result.details.entries())assert(table.includes('data-assessment-score="'+index+'" title="评估时留存的分项得分">'+part.score+'<small>分</small>'));
  assert.equal((table.match(/data-assessment-score=/g)||[]).length,5);assert(!html.includes("查看分项得分"));
  assert(table.includes("共 3 项条件：2 项符合，1 项不符合"));assert.equal(JSON.stringify(s.find("OP001").assessmentSnapshot),before);
}
// Historical totals and exact saved parts remain unchanged; absent parts are not filled from the current reference.
{
  const {s,u,node}=uiContext("OP001",true);
  s.change(next=>{const current=next.opportunities.find(x=>x.id==="OP001");current.qualification="持有覆盖软件开发范围的 ISO 9001 认证，投标截止日剩余有效期不少于3年";current.deadline="2026-11-20 09:30";});s.reassess("OP001");
  s.change(next=>{const saved=next.opportunities.find(x=>x.id==="OP001").assessmentSnapshot;delete saved.result.scoringBasis;saved.result.details.forEach(row=>delete row.judgment);saved.result.score=92;});
  const old=s.copy(s.find("OP001").assessmentSnapshot);u.renderDetail();
  assert(node("#opportunityDetail").innerHTML.includes("历史总分按留存结果保留"));assert.equal(JSON.stringify(s.find("OP001").assessmentSnapshot),JSON.stringify(old));
  s.reassess("OP001");assert.equal(JSON.stringify(s.find("OP001").history[0].previousAssessmentSnapshot),JSON.stringify(old));
  const missing=uiContext("OP016",true);
  missing.s.change(next=>{const saved=next.opportunities.find(x=>x.id==="OP016").assessmentSnapshot;saved.result.details=[];saved.result.score=95;delete saved.result.qualificationMatch;});
  const before=JSON.stringify(missing.s.find("OP016"));missing.u.renderDetail();
  const html=missing.node("#opportunityDetail").innerHTML,start=html.indexOf('<table class="op-table op-assessment-table"'),table=html.slice(start,html.indexOf('</table>',start));
  assert.equal((table.match(/class="op-assessment-points-missing"/g)||[]).length,5);assert(!/<strong[^>]*data-assessment-score=/.test(table));
  assert(table.includes("当前参考"));
  assert(table.includes("当前对照"));assert(table.includes("不计入留存初评分"));assert.equal(missing.s.find("OP016").assessmentSnapshot.result.score,95);assert.equal(JSON.stringify(missing.s.find("OP016")),before);
}
// Every default detail has complete current scores in a dedicated column; old total-only snapshots remain separate.
{
  const ids=fresh().s.get().opportunities.map(x=>x.id);
  for(const id of ids){
    const {s,u,node}=uiContext(id,true),item=s.find(id),saved=item.assessmentSnapshot,before=JSON.stringify(item);
    assert.equal(saved.result.details.length,5);assert(saved.result.qualificationMatch);
    assert.equal(saved.result.score,Math.round(saved.result.details.reduce((sum,part)=>sum+part.score,0)*10)/10);
    u.renderDetail();const html=node("#opportunityDetail").innerHTML,start=html.indexOf('<table class="op-table op-assessment-table"'),table=html.slice(start,html.indexOf('</table>',start));
    assert.equal((table.match(/<th\b/g)||[]).length,4);assert(table.includes('class="op-assessment-score-cell">得分</th>'));
    assert.equal((table.match(/data-assessment-score=/g)||[]).length,5);assert(!table.includes("op-assessment-points-missing"));
    const children=[...table.matchAll(/data-qualification-score="[^"]+">([\d.]+)<small>/g)].map(m=>+m[1]);
    assert.equal(children.length,(table.match(/class="op-qualification-detail"/g)||[]).length);
    if(children.length)assert.equal(Math.round(children.reduce((sum,value)=>sum+value,0)*10)/10,saved.result.details[1].score);
    assert.equal(JSON.stringify(s.find(id)),before);
  }
  const {s}=fresh(),current=s.find("OP016");assert(current.history.some(row=>row.previousAssessmentSnapshot&&row.previousAssessmentSnapshot.result.score===95));
  assert(current.history.some(row=>row.action==="采集入库"&&row.score===95));
}
// Refreshing an existing total-only example rebuilds a complete current sample and archives the untouched prior round.
{
  const {w,s}=fresh();s.change(next=>{const saved=next.opportunities.find(x=>x.id==="OP016").assessmentSnapshot;saved.result.details=[];saved.result.score=95;delete saved.result.qualificationMatch;});
  const old=s.copy(s.find("OP016").assessmentSnapshot),runs=JSON.stringify(s.get().runs),rules=JSON.stringify(s.get().rules);
  const loaded=load(w.localStorage,w.sessionStorage,"opportunity-detail.html",true).OpportunityStore;
  assert.equal(loaded.find("OP016").assessmentSnapshot.result.details.length,5);
  assert.equal(JSON.stringify(loaded.get().previousOpportunityRound.opportunities.find(x=>x.id==="OP016").assessmentSnapshot),JSON.stringify(old));
  assert.equal(JSON.stringify(loaded.get().runs),runs);assert.equal(JSON.stringify(loaded.get().rules),rules);
}
// Existing merged sources normalize to the original intake site without touching saved scores or history.
{
  const {w,s}=fresh(),stored=s.copy(s.get()),item=stored.opportunities.find(x=>x.id==="OP016");
  assert(stored.opportunities.every(x=>x.sourceIds.length===1));
  item.sourceIds=["S2","S1","S3"];
  item.noticeUrl="https://first.example/notices/old-entry.html";
  item.noticeUrls={S2:"https://first.example/notices/original.html",S1:"https://second.example/notices/repost.html",S3:"https://third.example/notices/repost.html"};
  const score=JSON.stringify(item.assessmentSnapshot),history=JSON.stringify(item.history),changes=JSON.stringify(item.changes),runs=JSON.stringify(stored.runs),projects=JSON.stringify(stored.projects);
  w.localStorage.setItem(s.key,JSON.stringify(stored));
  const restored=load(w.localStorage,w.sessionStorage),current=restored.OpportunityStore.find(item.id);
  assert.equal(current.sourceIds.join(","),"S2");assert.equal(current.noticeUrl,item.noticeUrls.S2);
  assert.equal(Object.keys(current.noticeUrls).join(","),"S2");
  assert.equal(JSON.stringify(current.assessmentSnapshot),score);assert.equal(JSON.stringify(current.history),history);assert.equal(JSON.stringify(current.changes),changes);
  assert.equal(JSON.stringify(restored.OpportunityStore.get().runs),runs);assert.equal(JSON.stringify(restored.OpportunityStore.get().projects),projects);
  assert.equal(restored.OpportunityEvidence.noticeHref(current,"S2"),item.noticeUrls.S2);
}
// The first successful source wins, irrespective of website order; reposts only increment deduplication.
{
  const id="OP-FIRST-SOURCE",{w,s,u,node}=uiContext(id,true),name="首次入库来源回归项目";
  updateRule(s,{threshold:0});
  s.change(next=>{
    const candidate=s.copy(next.opportunities.find(x=>x.id==="OP001"));
    candidate.id=id;candidate.number="CG-FIRST-SOURCE";candidate.name=name;candidate.review="pending";candidate.projectId="";candidate.history=[];candidate.changes=[];
    candidate.sourceIds=["S1","S2"];candidate.noticeUrl="https://source-one.example/notices/111.html";
    candidate.noticeUrls={S1:candidate.noticeUrl,S2:"https://source-two.example/notices/222.html"};
    delete candidate.assessmentSnapshot;next.candidates.push(candidate);
  });
  s.collect("S2");
  assert.equal(s.find(id).sourceIds.join(","),"S2");assert.equal(s.find(id).noticeUrl,"https://source-two.example/notices/222.html");
  const before=JSON.stringify(s.find(id)),run=s.collect("S1");
  assert(run.results.some(x=>x.opportunityId===id&&x.kind==="duplicate"));assert.equal(JSON.stringify(s.find(id)),before);
  assert(run.rows.every(x=>x.collectedCount===x.newCount+x.updatedCount+x.duplicateCount+x.excludedCount));
  const row=run.results.find(x=>x.opportunityId===id);assert(!row.assessmentNote.includes("合并来源"));
  assert.equal(u.sourcesFor(s.find(id)),s.get().sources.find(x=>x.id==="S2").name);
  u.ui.filters={query:name,source:"S1"};u.ui.page=1;u.renderRows();assert(!node("#opListResults").innerHTML.includes('data-op-detail-link="'+id+'"'));
  u.ui.filters={query:name,source:"S2"};u.renderRows();assert(node("#opListResults").innerHTML.includes('data-op-detail-link="'+id+'"'));
  u.renderDetail();const html=node("#opportunityDetail").innerHTML,start=html.indexOf('id="opNotice"'),notice=html.slice(start,html.indexOf('<details',start));
  assert.equal((notice.match(/class="op-notice-source"/g)||[]).length,1);assert(notice.includes("深圳政府采购智慧平台"));
  assert(notice.includes("https://source-two.example/notices/222.html"));assert(!notice.includes("source-one.example"));assert(notice.includes('target="_blank"'));
}
// Amendment association still works across a repost, while the original source/link and score remain fixed.
{
  const {s}=fresh();
  s.change(next=>{next.opportunities.find(x=>x.id==="OP001").noticeUrl="https://original.example/notices/123.html";});
  const previous=s.copy(s.find("OP001")),score=JSON.stringify(previous.assessmentSnapshot);
  const run=s.collect("S2"),current=s.find("OP001");
  assert.equal(current.sourceIds.join(","),"S1");assert.equal(current.noticeUrl,previous.noticeUrl);
  assert.equal(current.revision,previous.revision+1);assert.equal(current.changes.length,previous.changes.length+1);
  assert.equal(JSON.stringify(current.assessmentSnapshot),score);
  previous.history.forEach(record=>assert(current.history.some(x=>JSON.stringify(x)===JSON.stringify(record))));
  assert(run.results.some(x=>x.opportunityId==="OP001"&&x.kind==="updated"));
  assert(run.rows.every(x=>x.collectedCount===x.newCount+x.updatedCount+x.duplicateCount+x.excludedCount));
  const changes=JSON.stringify(current.changes),repeat=s.collect("S2");assert.equal(JSON.stringify(s.find("OP001").changes),changes);
  assert(!repeat.results.some(x=>x.opportunityId==="OP001"&&x.kind==="updated"));
}

console.log("PASS: primary-source retention and deduplication, qualification evidence, frozen snapshots and existing opportunity workflows.");
