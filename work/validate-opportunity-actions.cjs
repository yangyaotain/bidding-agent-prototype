const fs = require("fs"), vm = require("vm"), assert = require("assert");
function storage() {
  const map = new Map();
  return {getItem:key=>map.get(key)||null,setItem:(key,value)=>map.set(key,String(value)),removeItem:key=>map.delete(key),key:i=>[...map.keys()][i],get length(){return map.size;}};
}
function load(local=storage(),session=storage(),page="opportunities.html",reload=false) {
  const w={localStorage:local,sessionStorage:session,location:{pathname:"/pages/"+page,search:"",href:"/pages/"+page},performance:{getEntriesByType:()=>[{type:reload?"reload":"navigate"}]},AppCurrentUser:{name:"李明远",role:"管理员"},URL,URLSearchParams,setTimeout:()=>0};
  w.window=w; w.clearTimeout=()=>{}; vm.createContext(w);
  for(const name of ["project-data","opportunity-store"])vm.runInContext(fs.readFileSync("assets/js/"+name+".js","utf8"),w);
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
  source=source.slice(0,modalStart)+'  function modal(title, description, body, submitLabel, onSubmit, customFooter) { activeAction=null; window._modalOpen=true; window._modal={title,description,body,submitLabel,onSubmit,customFooter}; document.querySelector("#opFeedback").innerHTML=""; document.querySelector("#opModalFooter").innerHTML=customFooter||""; }\n'+source.slice(modalEnd);
  const renderStart=source.indexOf("  function render() {"),renderEnd=source.indexOf("  function renderListShell()",renderStart);
  source=source.slice(0,renderStart)+'  function render() { window._rendered=true; if (window._onRender) window._onRender(); }\n'+source.slice(renderEnd);
  source=source.replace('if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();','window.OpportunityActionsTest={reviewModal,transferModal,onAction,opportunityAction,renderDetail,renderRows,ruleFieldsMarkup,websiteRecords,collectionSourceOptions,resolveRunSource,sourceCollectionView,renderRuns,queryRuns,scoreMarkup,moneyMarkup,assessmentUnknowns,sourceModal,sourceLoginFields,bindSourceLoginForm,sourceCollectionBlock,renderSources,checkContent,ui,close,syncActionTiming,tickOpportunityTiming,init,active:()=>activeAction};');
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
  assert(detail.includes("查看依据")&&detail.includes("评估时间")&&detail.includes("处理记录"));
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
console.log("PASS: opportunity actions, password-only source login, credential redaction, legacy migration, session expiry, collection counting and reset isolation.");
