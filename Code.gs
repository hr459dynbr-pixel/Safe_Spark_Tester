const CONFIG = {
  APP_NAME: 'Safe Spark',
  RESPONSE_SHEET: 'Safe Spark Responses',
  SESSION_SHEET: 'Safe Spark Sessions',
  DASHBOARD_PASSWORD: 'CHANGE-ME-1234',
  DASHBOARD_ENABLED: true,
  DATE_DURATION_SECONDS: 180,
  DATE_VIDEO_URL: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/ElephantsDream.mp4'
};

function doGet(e) {
  const page = e && e.parameter && e.parameter.page ? e.parameter.page : 'tester';
  if (page === 'dashboard') {
    if (!CONFIG.DASHBOARD_ENABLED) return HtmlService.createHtmlOutput('Dashboard disabled.');
    return HtmlService.createHtmlOutput(getDashboardHTML()).setTitle(CONFIG.APP_NAME + ' — Dashboard');
  }
  return HtmlService.createHtmlOutput(getTesterHTML()).setTitle(CONFIG.APP_NAME + ' — Tester');
}

function getSpreadsheet() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty('SAFE_SPARK_SPREADSHEET_ID');
  let ss = null;
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) {} }
  if (!ss) {
    ss = SpreadsheetApp.create(CONFIG.APP_NAME + ' — Tester Results');
    props.setProperty('SAFE_SPARK_SPREADSHEET_ID', ss.getId());
  }
  setupSheets_(ss);
  return ss;
}

function setupSheets_(ss) {
  let r = ss.getSheetByName(CONFIG.RESPONSE_SHEET);
  if (!r) r = ss.insertSheet(CONFIG.RESPONSE_SHEET);
  const rh = ['Tester ID','Session ID','Created At','Completed At','Activity','Prototype Duration Seconds','Continuation Choice','Date Outcome','Age Group','Dating App Usage','Comfort Meeting In Person','Difficulties With Conventional First Dates','Initial Appeal','Naturalness','Activity Helped Conversation','Pressure Compared With Normal Date','Continuation Confidence','Real Date Continue Likelihood','Experience Rating','Would Use','Would Use Within 30 Days','Prefer Safe Spark','Second Date Likelihood','Recommend','Reasonable Price Per Date','One Thing To Change','What Safe Spark Solves','Liked Most','Other Feedback','Email','Submitted At'];
  if (r.getLastRow() === 0) { r.appendRow(rh); formatHeader_(r, rh.length); }
  let s = ss.getSheetByName(CONFIG.SESSION_SHEET);
  if (!s) s = ss.insertSheet(CONFIG.SESSION_SHEET);
  const sh = ['Session ID','Started At','Completed At','Completed','Activity','Last Updated'];
  if (s.getLastRow() === 0) { s.appendRow(sh); formatHeader_(s, sh.length); }
}

function formatHeader_(sheet,n) { 
  sheet.getRange(1,1,1,n).setFontWeight('bold'); 
  sheet.setFrozenRows(1); 
}

function newId_(p) { 
  return p+'-'+Utilities.getUuid().replace(/-/g,'').slice(0,10).toUpperCase(); 
}

function safeCell_(v) { 
  if(v===null||v===undefined)return ''; 
  let s=String(v); 
  return /^[=+\-@]/.test(s)?"'"+s:s; 
}

function num_(v) { 
  if(v===null||v===undefined||v==='')return ''; 
  const n=Number(v); 
  return isNaN(n)?'':n; 
}

function startSession(activity) {
  const ss=getSpreadsheet(), sh=ss.getSheetByName(CONFIG.SESSION_SHEET), id=newId_('SS'), now=new Date();
  const lock=LockService.getScriptLock(); 
  lock.waitLock(10000);
  try { 
    sh.appendRow([id,now,'',false,safeCell_(activity||''),now]); 
  } finally { 
    lock.releaseLock(); 
  }
  return {ok:true,sessionId:id};
}

function saveResponse(data) {
  data=data||{}; 
  const ss=getSpreadsheet(), sh=ss.getSheetByName(CONFIG.RESPONSE_SHEET);
  const row=[
    data.testerId||newId_('TEST'),
    safeCell_(data.sessionId),
    safeCell_(data.createdAt||new Date().toISOString()),
    safeCell_(data.completedAt||new Date().toISOString()),
    safeCell_(data.activity),
    num_(data.dateDurationSeconds),
    safeCell_(data.continuationChoice),
    safeCell_(data.dateOutcome),
    safeCell_(data.ageGroup),
    safeCell_(data.datingAppUsage),
    safeCell_(data.comfortMeeting),
    safeCell_(data.difficulties),
    num_(data.initialAppeal),
    num_(data.naturalness),
    safeCell_(data.activityHelped),
    safeCell_(data.pressureCompared),
    num_(data.continuationConfidence),
    num_(data.realDateContinueLikelihood),
    num_(data.experienceRating),
    safeCell_(data.wouldUse),
    safeCell_(data.wouldUseWithin30Days),
    safeCell_(data.preferSafeSpark),
    num_(data.secondDateLikelihood),
    safeCell_(data.recommend),
    safeCell_(data.reasonablePrice),
    safeCell_(data.oneThingToChange),
    safeCell_(data.whatSafeSparkSolves),
    safeCell_(data.likedMost),
    safeCell_(data.otherFeedback),
    safeCell_(data.email),
    new Date()
  ];
  const lock=LockService.getScriptLock(); 
  lock.waitLock(10000);
  try { 
    sh.appendRow(row); 
    markSessionComplete_(ss,data.sessionId,data.activity); 
  } finally { 
    lock.releaseLock(); 
  }
  return {ok:true};
}

function markSessionComplete_(ss,id,activity) {
  if(!id)return; 
  const sh=ss.getSheetByName(CONFIG.SESSION_SHEET); 
  if(sh.getLastRow()<2)return;
  const vals=sh.getRange(2,1,sh.getLastRow()-1,6).getValues();
  for(let i=0;i<vals.length;i++) {
    if(String(vals[i][0])===String(id)){ 
      const now=new Date(); 
      sh.getRange(i+2,3,1,4).setValues([[now,true,safeCell_(activity||vals[i][4]),now]]); 
      return; 
    }
  }
}

function readObjects_(sh){ 
  if(!sh||sh.getLastRow()<2)return []; 
  const v=sh.getDataRange().getValues(),h=v[0].map(String); 
  return v.slice(1).filter(r=>r.some(x=>x!==''&&x!==null)).map(r=>{
    const o={};
    h.forEach((x,i)=>o[x]=r[i]);
    return o;
  }); 
}

function countField_(rows,f){
  const o={};
  rows.forEach(r=>{
    const v=String(r[f]||'').trim();
    if(v)o[v]=(o[v]||0)+1;
  });
  return o;
}

function countMulti_(rows,f){
  const o={};
  rows.forEach(r=>String(r[f]||'').split(',').map(x=>x.trim()).filter(Boolean).forEach(v=>o[v]=(o[v]||0)+1));
  return o;
}

function average_(rows,f){
  const a=rows.map(r=>Number(r[f])).filter(n=>!isNaN(n)&&n>0);
  return a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
}

function pct_(rows,f,re){
  return rows.length?rows.filter(r=>re.test(String(r[f]||'').trim())).length/rows.length*100:0;
}

function getDashboardData(password){
  if(password!==CONFIG.DASHBOARD_PASSWORD)return {ok:false,error:'Incorrect dashboard password.'};
  const ss=getSpreadsheet(),r=readObjects_(ss.getSheetByName(CONFIG.RESPONSE_SHEET)),s=readObjects_(ss.getSheetByName(CONFIG.SESSION_SHEET));
  return {
    ok:true,
    spreadsheetUrl:ss.getUrl(),
    stats:{
      started:s.length,
      completed:r.length,
      completionRate:s.length?r.length/s.length*100:0,
      continuationRate:pct_(r,'Continuation Choice',/^continue$/i),
      wouldUseRate:pct_(r,'Would Use',/^(yes|definitely|probably)$/i),
      use30Rate:pct_(r,'Would Use Within 30 Days',/^(definitely|probably)$/i),
      recommendationRate:pct_(r,'Recommend',/^(definitely|probably)$/i),
      avgAppeal:average_(r,'Initial Appeal'),
      avgNaturalness:average_(r,'Naturalness'),
      avgExperience:average_(r,'Experience Rating'),
      avgContinueLikelihood:average_(r,'Real Date Continue Likelihood'),
      avgSecondDate:average_(r,'Second Date Likelihood')
    },
    breakdowns:{
      activity:countField_(r,'Activity'),
      continuation:countField_(r,'Continuation Choice'),
      age:countField_(r,'Age Group'),
      appUsage:countField_(r,'Dating App Usage'),
      comfort:countField_(r,'Comfort Meeting In Person'),
      difficulties:countMulti_(r,'Difficulties With Conventional First Dates'),
      activityHelped:countField_(r,'Activity Helped Conversation'),
      pressure:countField_(r,'Pressure Compared With Normal Date'),
      use30:countField_(r,'Would Use Within 30 Days'),
      price:countField_(r,'Reasonable Price Per Date'),
      recommend:countField_(r,'Recommend')
    },
    feedback:r.slice(-100).reverse().map(x=>({tester:x['Tester ID'],activity:x['Activity'],liked:x['Liked Most'],solves:x['What Safe Spark Solves'],change:x['One Thing To Change'],other:x['Other Feedback']})),
    responses:r.slice(-250).reverse().map(x=>({tester:x['Tester ID'],activity:x['Activity'],duration:x['Prototype Duration Seconds'],continuation:x['Continuation Choice'],naturalness:x['Naturalness'],experience:x['Experience Rating'],use30:x['Would Use Within 30 Days'],recommend:x['Recommend'],price:x['Reasonable Price Per Date']}))
  };
}

function getTesterHTML(){
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Safe Spark — Tester</title><style>
*{box-sizing:border-box}body{margin:0;background:#1a1a1a;color:#fff;font-family:Arial,sans-serif}
.wrap{max-width:900px;margin:auto;padding:20px}
.card{background:#2a2a2a;border-radius:16px;padding:24px;margin-bottom:20px;box-shadow:0 10px 40px rgba(0,0,0,.5)}
h1{font-size:32px;margin:0 0 8px}h2{font-size:24px;margin:16px 0 12px}.sub{color:#aaa;line-height:1.5}
.intro-card{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:40px;border-radius:20px;text-align:center}
.intro-card h1{color:#fff;font-size:48px}.intro-card p{color:rgba(255,255,255,.9);font-size:18px;max-width:600px;margin:16px auto}
button{border:0;border-radius:10px;padding:12px 24px;font-size:16px;font-weight:700;cursor:pointer;background:#667eea;color:#fff;transition:all .2s}
button:hover{background:#764ba2;transform:translateY(-2px)}button:disabled{opacity:.5;cursor:not-allowed;transform:none}
button.secondary{background:#444;color:#fff}button.secondary:hover{background:#555}
.choices{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin:16px 0}
.choice{border:2px solid #444;border-radius:12px;padding:16px;cursor:pointer;background:#333;transition:all .2s;text-align:center}
.choice:hover{border-color:#667eea;transform:translateY(-2px)}.choice.selected{border-color:#667eea;background:#667eea;color:#fff}
.choice-emoji{font-size:36px;margin-bottom:8px}
.video-container{position:relative;background:#000;border-radius:16px;overflow:hidden;margin:20px 0;aspect-ratio:16/9}
.date-video{width:100%;height:100%;object-fit:cover}
.user-video{position:absolute;bottom:16px;right:16px;width:160px;height:120px;border-radius:10px;border:3px solid #667eea;background:#000;object-fit:cover;z-index:10}
.user-video-placeholder{position:absolute;bottom:16px;right:16px;width:160px;height:120px;border-radius:10px;border:3px solid #667eea;background:#333;display:flex;align-items:center;justify-content:center;font-size:48px;z-index:10}
.activity-display{background:#667eea;border-radius:14px;padding:20px;margin:16px 0;text-align:center}
.activity-display h3{margin:0;font-size:28px;color:#fff}
.timer{font-size:72px;font-weight:900;text-align:center;font-variant-numeric:tabular-nums;margin:20px 0;color:#667eea;font-family:'Courier New',monospace}
.prompt{background:rgba(102,126,234,.2);border-left:4px solid #667eea;border-radius:8px;padding:16px;margin:16px 0;font-size:18px;line-height:1.5}
.progress{height:6px;background:#444;border-radius:99px;overflow:hidden;margin:16px 0}.bar{height:100%;width:0;background:#667eea;transition:.3s}
.controls{display:flex;gap:10px;justify-content:center;margin:20px 0;flex-wrap:wrap}
.control-btn{display:flex;align-items:center;gap:6px;padding:10px 14px;font-size:14px}
.field{margin:18px 0 8px;font-weight:700;display:block}
textarea,input{width:100%;padding:12px;border:1px solid #444;border-radius:10px;font-size:16px;background:#333;color:#fff;font-family:inherit}
textarea:focus,input:focus{outline:0;border-color:#667eea;box-shadow:0 0 0 2px rgba(102,126,234,.2)}
.small{font-size:13px;color:#999}.error{color:#ff6b6b;padding:12px;background:rgba(255,107,107,.1);border-radius:8px;border-left:3px solid #ff6b6b;margin:12px 0}
.success{padding:20px;background:rgba(102,200,107,.1);border-radius:12px;border-left:4px solid #66c86b}.success h2{color:#66c86b;margin-top:0}
.scale{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:16px 0}.scale .choice{padding:12px 8px;font-weight:700}
.decision-box{background:rgba(102,126,234,.1);border:2px solid #667eea;border-radius:14px;padding:20px;margin:20px 0;text-align:center}.decision-box p{margin:12px 0}
.hidden{display:none!important}
@media(max-width:768px){.video-container{aspect-ratio:auto}.user-video{width:120px;height:90px;bottom:10px;right:10px}.timer{font-size:48px}.choices{grid-template-columns:1fr}.activity-display h3{font-size:20px}}
</style></head><body><div class="wrap"><div id="app"></div></div><script>
const CONFIG={DATE_DURATION_SECONDS:180,VIDEO_URL:'https://commondatastorage.googleapis.com/gtv-videos-library/sample/ElephantsDream.mp4'};
const activities={"Draw something together":["📐 Draw something you think your date would like.","🎨 Show your drawing and explain one detail.","✨ Find one thing you both chose or imagined."],"Solve a puzzle":["🧩 Work out the answer together rather than competing.","💡 Explain how you approached the problem.","🎯 Find one thing you agree on about the solution."],"Music challenge":["🎵 Choose a song you could happily hear on a road trip.","🎸 Explain why you picked it.","🎤 Find an artist or song you both know."],"Question challenge":["🤔 Tell your date something you could talk about for hours.","📚 Choose: adventure, food, travel, animals or music.","💭 Find one unexpected thing you have in common."],"Quiz / guessing game":["❓ Make a guess about your date.","🎲 Explain the reasoning behind your guess.","✓ Find one surprising shared interest."],"Random challenge":["🎪 Take the next prompt as it comes.","🎯 Tell your date your first instinctive answer.","🤝 Find one thing you would both be willing to try."]};
let stage='intro',activity='',sessionId='',testerId='TEST-'+Math.random().toString(36).slice(2,10).toUpperCase(),createdAt=new Date().toISOString(),startTime=0,dateSeconds=CONFIG.DATE_DURATION_SECONDS,dateTimer=null,dateEnded=false,continuationChoice='',userStream=null;
const app=document.getElementById('app');
function render(html){app.innerHTML=html}
function renderIntro(){render('<div class="intro-card"><h1>Safe Spark</h1><p>Experience a different kind of first date</p><p class="sub">Meet someone online through a shared activity, then decide privately whether you want to continue.</p></div><div class="card"><h2>How it works</h2><ul style="font-size:16px;line-height:1.8"><li>✅ Choose a date activity</li><li>📹 Experience a 3-minute simulated date (with real camera access)</li><li>🤔 Make a private decision to continue or end</li><li>📋 Answer 20 research questions</li><li>⏱️ Total time: 8–10 minutes</li></ul><p class="small">This is a prototype for research. Video is simulated. Your responses help shape the product.</p><button onclick="renderActivitySelect()">Start the test</button></div>');}
function renderActivitySelect(){let html='<div class="card"><h2>Choose your date activity</h2><p class="sub">Pick the one you\'d naturally choose for a first date.</p><div class="choices">';Object.keys(activities).forEach(a=>{const emoji=a.split(' ')[0];html+='<div class="choice" data-activity="'+a+'" onclick="pickActivity(\''+a+'\')"><div class="choice-emoji">'+emoji+'</div><strong>'+a+'</strong></div>';});html+='</div></div>';render(html);}
function pickActivity(a){activity=a;document.querySelectorAll('.choice').forEach(x=>x.classList.remove('selected'));event.target.closest('.choice').classList.add('selected');google.script.run.withSuccessHandler(r=>{if(r&&r.sessionId)sessionId=r.sessionId}).startSession(a);setTimeout(requestCameraAccess,300);}
function requestCameraAccess(){navigator.mediaDevices.getUserMedia({audio:true,video:{width:1280,height:720}}).then(stream=>{userStream=stream;startDate()}).catch(()=>{alert('Camera access required. Please allow and try again.');});}
function startDate(){stage='date';startTime=Date.now();dateSeconds=CONFIG.DATE_DURATION_SECONDS;dateEnded=false;let p=activities[activity];render('<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"><h2 style="margin:0">'+activity+'</h2><div class="timer" id="timer">3:00</div></div><div class="progress"><div id="bar" class="bar"></div></div><div class="video-container"><video id="dateVideo" class="date-video" autoplay muted playsinline></video><div id="userVideoContainer" class="user-video-placeholder">🎥</div></div><div class="activity-display"><h3 id="currentPrompt">'+p[0]+'</h3></div><div class="controls"><button class="control-btn secondary" onclick="toggleMute()"><span id="muteBtn">🔊</span> Mute</button><button class="control-btn secondary" onclick="toggleFullscreen()">⛶ Fullscreen</button><button class="control-btn secondary" onclick="endDateEarly()">End date</button></div><div id="decisionArea"></div></div>');const videoEl=document.getElementById('dateVideo');videoEl.src=CONFIG.VIDEO_URL;videoEl.play().catch(()=>{});const userVideoContainer=document.getElementById('userVideoContainer');if(userStream){let video=document.createElement('video');video.id='userVideo';video.className='user-video';video.autoplay=true;video.muted=true;video.playsinline=true;video.srcObject=userStream;userVideoContainer.replaceWith(video);}dateTimer=setInterval(()=>{dateSeconds--;updateDateUI();if(dateSeconds<=0){clearInterval(dateTimer);if(!dateEnded)endDate()}},1000);}
function updateDateUI(){let m=Math.floor(dateSeconds/60),s=dateSeconds%60;document.getElementById('timer').textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');document.getElementById('bar').style.width=((CONFIG.DATE_DURATION_SECONDS-dateSeconds)/CONFIG.DATE_DURATION_SECONDS*100)+'%';let p=activities[activity];let elapsed=CONFIG.DATE_DURATION_SECONDS-dateSeconds;let promptIdx=-1;if(elapsed>=60&&elapsed<120)promptIdx=1;else if(elapsed>=120)promptIdx=2;else promptIdx=0;document.getElementById('currentPrompt').textContent=p[promptIdx];}
function endDateEarly(){clearInterval(dateTimer);dateEnded=true;endDate()}
function endDate(){if(userStream)userStream.getTracks().forEach(t=>t.stop());renderDecision();}
function toggleMute(){let videoEl=document.getElementById('dateVideo');videoEl.muted=!videoEl.muted;document.getElementById('muteBtn').textContent=videoEl.muted?'🔇':'🔊';}
function toggleFullscreen(){let container=document.querySelector('.video-container');if(document.fullscreenElement)document.exitFullscreen();else container.requestFullscreen?.();}
function renderDecision(){render('<div class="card"><h2>Your private decision</h2><p class="sub">Imagine this was a real date. What would you choose?</p><div class="decision-box"><p>In Safe Spark, this choice is completely private. The other person makes their own decision, and you only know if you both choose to continue.</p></div><div class="choices" style="grid-template-columns:1fr"><button onclick="makeDecision(\'continue\')" style="padding:20px;font-size:18px">❤️ I would like to continue</button><button class="secondary" onclick="makeDecision(\'end\')" style="padding:20px;font-size:18px">👋 I would end the date</button><button class="secondary" onclick="makeDecision(\'unsure\')" style="padding:20px;font-size:18px">🤷 I\'m genuinely unsure</button></div></div>');}
function makeDecision(choice){continuationChoice=choice;renderQuestionnaire();}
const choice=(t,k,o)=>'<label class="field">'+t+'</label><div class="choices" data-key="'+k+'">'+o.map(x=>'<div class="choice" data-value="'+x+'">'+x+'</div>').join('')+'</div>';
const multi=(t,k,o)=>choice(t,k,o).replace('class="choices"','class="choices" data-multi="1"');
const scale=(t,k)=>choice(t,k,['1','2','3','4','5'])+'<p class="small">1 = strongly disagree | 5 = strongly agree</p>';
const text=(t,k)=>'<label class="field">'+t+'</label><textarea id="'+k+'" rows="3" placeholder="Your honest thoughts..."></textarea>';
function renderQuestionnaire(){render('<form id="qform"><div class="card"><h2>About you</h2><p class="sub">These help us understand what segments respond to Safe Spark.</p>'+choice('Age group','ageGroup',['18–24','25–34','35–44','45–54','55–64','65+','Prefer not to say'])+choice('How often do you use dating apps?','datingAppUsage',['Never','Rarely','Sometimes','Often','Very often'])+choice('Comfort meeting in person?','comfortMeeting',['Very comfortable','Somewhat comfortable','Neutral','Somewhat uncomfortable','Very uncomfortable'])+'</div><div class="card"><h2>The problem</h2>'+multi('What makes conventional first dates difficult?','difficulties',['Conversation running out','Awkward silences','Pressure to impress','Safety concerns','Choosing what to do','Fear of rejection','Cost','None of these'])+scale('How appealing was Safe Spark before trying it?','initialAppeal')+'</div><div class="card"><h2>Your experience</h2>'+scale('How natural did this feel?','naturalness')+choice('Did the activity help?','activityHelped',['Much easier','Somewhat easier','No difference','Somewhat harder','Much harder'])+choice('Pressure vs real date?','pressureCompared',['Much less','Less','Same','More','Much more'])+scale('Confidence in your decision?','continuationConfidence')+'</div><div class="card"><h2>If this were real</h2>'+scale('Continue for another 30 min?','realDateContinueLikelihood')+scale('Rate the experience','experienceRating')+scale('Second date likelihood','secondDateLikelihood')+'</div><div class="card"><h2>Safe Spark adoption</h2>'+choice('Would you use it?','wouldUse',['Definitely yes','Probably yes','Not sure','Probably not','Definitely not'])+choice('Use within 30 days?','wouldUseWithin30Days',['Definitely','Probably','Not sure','Probably not','Definitely not'])+choice('Prefer to conventional?','preferSafeSpark',['Yes','Probably','Not sure','Probably not','No'])+choice('Recommend it?','recommend',['Definitely','Probably','Not sure','Probably not','Definitely not'])+choice('Reasonable price?','reasonablePrice',['Free','Under £5','£5–10','£10–20','£20+','Unsure'])+'</div><div class="card"><h2>Your feedback</h2>'+text('One thing to change','oneThingToChange')+text('What problem does it solve?','whatSafeSparkSolves')+text('What did you like?','likedMost')+text('Anything else?','otherFeedback')+'<label class="field">Email (optional)</label><input id="email" type="email" placeholder="Only if you want contact"><p class="small">Leave blank. Responses are anonymized.</p></div><button type="button" onclick="submitTest()" style="width:100%;padding:16px;font-size:18px">Submit feedback</button><p id="qmsg" class="error hidden"></p></form>');bindChoices();}
function bindChoices(){document.querySelectorAll('.choices,.scale').forEach(g=>{g.addEventListener('click',e=>{let c=e.target.closest('.choice');if(!c)return;if(g.dataset.multi){c.classList.toggle('selected');}else{g.querySelectorAll('.choice').forEach(x=>x.classList.remove('selected'));c.classList.add('selected');}});});}
function get(k,m=false){let g=document.querySelector('[data-key="'+k+'"]');let a=[...g.querySelectorAll('.choice.selected')].map(x=>x.dataset.value);return m?a.join(', '):(a[0]||'');}
function submitTest(){let req=['ageGroup','datingAppUsage','comfortMeeting','difficulties','initialAppeal','naturalness','activityHelped','pressureCompared','continuationConfidence','realDateContinueLikelihood','experienceRating','wouldUse','wouldUseWithin30Days','preferSafeSpark','secondDateLikelihood','recommend','reasonablePrice'];for(let k of req){if(!get(k,k==='difficulties')){document.getElementById('qmsg').classList.remove('hidden');document.getElementById('qmsg').textContent='Please answer every question.';return}}let data={testerId,sessionId,createdAt,completedAt:new Date().toISOString(),activity,dateDurationSeconds:CONFIG.DATE_DURATION_SECONDS-(dateSeconds||0),continuationChoice,dateOutcome:continuationChoice,ageGroup:get('ageGroup'),datingAppUsage:get('datingAppUsage'),comfortMeeting:get('comfortMeeting'),difficulties:get('difficulties',true),initialAppeal:+get('initialAppeal'),naturalness:+get('naturalness'),activityHelped:get('activityHelped'),pressureCompared:get('pressureCompared'),continuationConfidence:+get('continuationConfidence'),realDateContinueLikelihood:+get('realDateContinueLikelihood'),experienceRating:+get('experienceRating'),wouldUse:get('wouldUse'),wouldUseWithin30Days:get('wouldUseWithin30Days'),preferSafeSpark:get('preferSafeSpark'),secondDateLikelihood:+get('secondDateLikelihood'),recommend:get('recommend'),reasonablePrice:get('reasonablePrice'),oneThingToChange:document.getElementById('oneThingToChange').value,whatSafeSparkSolves:document.getElementById('whatSafeSparkSolves').value,likedMost:document.getElementById('likedMost').value,otherFeedback:document.getElementById('otherFeedback').value,email:document.getElementById('email').value};google.script.run.withSuccessHandler(()=>{render('<div class="card"><div class="success"><h2>Thank you! 💜</h2><p>Your feedback has been recorded and will help shape Safe Spark.</p><p class="small">Tester ID: '+data.testerId+'</p></div></div>');}).withFailureHandler(()=>{document.getElementById('qmsg').classList.remove('hidden');document.getElementById('qmsg').textContent='Submission failed. Try again.';}).saveResponse(data);}
renderIntro();
</script></body></html>`;
}

function getDashboardHTML(){
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
body{font-family:Arial,sans-serif;background:#1a1a1a;color:#fff;margin:0}
.wrap{max-width:1200px;margin:auto;padding:25px}
.card{background:#2a2a2a;border-radius:16px;padding:20px;margin:15px 0;box-shadow:0 10px 40px rgba(0,0,0,.5)}
h1{margin-top:0}
.metrics{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}
.metric{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:17px;border-radius:12px}
.metric b{font-size:27px;display:block;margin-top:6px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:15px}
.barrow{margin:9px 0}.barlabel{display:flex;justify-content:space-between;font-size:13px}
.bar{height:9px;background:#667eea;border-radius:20px}
.login{max-width:420px;margin:100px auto}
input{width:100%;padding:13px;border:1px solid #444;border-radius:9px;font-size:16px;background:#333;color:#fff;margin:8px 0 12px}
button{background:#667eea;color:#fff;border:0;border-radius:9px;padding:12px 18px;font-weight:bold;cursor:pointer;margin-top:10px}
button:hover{background:#764ba2}
a{color:#667eea;text-decoration:none}a:hover{text-decoration:underline}
@media(max-width:800px){.metrics{grid-template-columns:repeat(2,1fr)}.grid{grid-template-columns:1fr}}
</style></head><body><div class="wrap"><div id="app"></div></div><script>
const app=document.getElementById('app');
app.innerHTML='<div class="card login"><h1>Safe Spark Dashboard</h1><p>Enter password to view results.</p><input id="pw" type="password" placeholder="Password"><button onclick="load()">Open</button><p id="err"></p></div>';
function load(){google.script.run.withSuccessHandler(render).getDashboardData(document.getElementById('pw').value)}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function pct(n){return (n||0).toFixed(1)+'%'}
function avg(n){return n==null?'—':n.toFixed(2)}
function bars(o){const ks=Object.keys(o||{}),m=ks.length?Math.max(...ks.map(k=>o[k])):1;return ks.sort((a,b)=>o[b]-o[a]).map(k=>'<div class="barrow"><div class="barlabel"><span>'+esc(k)+'</span><span>'+o[k]+'</span></div><div style="background:#444;border-radius:20px"><div class="bar" style="width:'+(o[k]/m*100)+'%"></div></div></div>').join('')||'<p style="color:#999">No data yet.</p>'}
function render(d){if(!d.ok){app.innerHTML='<div class="card login"><h2 style="color:#ff6b6b">'+esc(d.error)+'</h2></div>';return}const s=d.stats;let h='<h1>Safe Spark Dashboard</h1><p><a href="'+d.spreadsheetUrl+'" target="_blank">→ Open Google Sheet</a></p><div class="metrics">';[['Started',s.started],['Completed',s.completed],['Completion',pct(s.completionRate)],['Avg Experience',avg(s.avgExperience)+'/5'],['Recommend',pct(s.recommendationRate)]].forEach(x=>h+='<div class="metric">'+x[0]+'<b>'+x[1]+'</b></div>');h+='</div><div class="grid">';[['Activities',d.breakdowns.activity],['Decisions',d.breakdowns.continuation],['Dating App Usage',d.breakdowns.appUsage],['First-Date Difficulties',d.breakdowns.difficulties]].forEach(x=>h+='<div class="card"><h2>'+x[0]+'</h2>'+bars(x[1])+'</div>');h+='</div><div class="card"><h2>Tester Feedback</h2>';d.feedback.forEach(f=>{if(f.liked||f.solves||f.change)h+='<div style="border-top:1px solid #444;padding:12px 0"><b>'+esc(f.activity)+'</b>'+(f.liked?'<p><b>Liked:</b> '+esc(f.liked)+'</p>':'')+(f.solves?'<p><b>Solves:</b> '+esc(f.solves)+'</p>':'')+(f.change?'<p><b>Change:</b> '+esc(f.change)+'</p>':'')+'</div>'});h+='</div><div class="card"><h2>Recent</h2><table style="width:100%;border-collapse:collapse;font-size:12px"><tr><th style="text-align:left;padding:8px;border-bottom:1px solid #444">Activity</th><th style="text-align:left;padding:8px;border-bottom:1px solid #444">Decision</th><th style="text-align:left;padding:8px;border-bottom:1px solid #444">Experience</th><th style="text-align:left;padding:8px;border-bottom:1px solid #444">Recommend</th></tr>';d.responses.forEach(r=>h+='<tr><td style="padding:8px;border-bottom:1px solid #444">'+esc(r.activity)+'</td><td style="padding:8px;border-bottom:1px solid #444">'+esc(r.continuation)+'</td><td style="padding:8px;border-bottom:1px solid #444">'+esc(r.experience)+'</td><td style="padding:8px;border-bottom:1px solid #444">'+esc(r.recommend)+'</td></tr>');h+='</table></div>';app.innerHTML=h;}
</script></body></html>`;
}
