const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const context={URL,URLSearchParams,console};
vm.createContext(context);
vm.runInContext(fs.readFileSync('shared_schedule.js','utf8'),context);
const shared=context.SharedSchedule;
const gistId='0123456789abcdef0123456789abcdef';
const backendBase='https://schedule.example.test';

assert.equal(shared.gistIdFromReference(gistId),gistId);
assert.equal(shared.gistIdFromReference('https://api.github.com/gists/'+gistId),gistId);
assert.equal(shared.gistIdFromReference('https://example.test/gists/'+gistId),'');
assert.equal(shared.backendApiBaseUrl(backendBase+'/'),backendBase);
assert.equal(shared.backendScheduleUrl(backendBase),backendBase+'/api/schedule');
assert.equal(shared.backendLoginUrl(backendBase),backendBase+'/api/admin/login');
assert.equal(shared.backendAdminScheduleUrl(backendBase),backendBase+'/api/admin/schedule');
assert.throws(()=>shared.backendApiBaseUrl('http://schedule.example.test'),/without credentials/);
assert.throws(()=>shared.backendApiBaseUrl('https://admin:secret@schedule.example.test'),/without credentials/);
assert.throws(()=>shared.backendApiBaseUrl('https://schedule.example.test/api'),/without credentials/);

const link=shared.cardViewUrl('card_view.html',{team:'CDC',search:'Alex',roles:['Cycles','Picking'],api:backendBase,gist:gistId});
const params=new URL(link,'https://dashboard.test/').searchParams;
assert.equal(params.get('team'),'CDC');
assert.equal(params.get('search'),'Alex');
assert.deepEqual(params.getAll('role'),['Cycles','Picking']);
assert.equal(params.get('api'),backendBase);
assert.equal(params.get('gist'),gistId);
assert.equal(params.has('date'),false);
assert.equal(params.has('token'),false);

(async()=>{
  const backendRows=await shared.fetchBackendSchedule(backendBase,async(url,options)=>{
    assert.equal(url,backendBase+'/api/schedule');
    assert.equal(options.cache,'no-store');
    assert.equal(options.headers.Accept,'application/json');
    return {ok:true,status:200,json:async()=>({version:3,updated_at:'2026-09-24T09:00:00Z',rows:[{name:'Alex',date:'2026-09-07'}]})};
  });
  assert.equal(backendRows[0].name,'Alex');

  const rows=await shared.fetchGistSchedule(gistId,async url=>{
    assert.equal(url,'https://api.github.com/gists/'+gistId);
    return {ok:true,status:200,json:async()=>({files:{'live-schedule.json':{content:'[{"name":"Alex","date":"2026-09-07"}]'}}})};
  });
  assert.equal(rows[0].name,'Alex');
  assert.equal(rows[0].date,'2026-09-07');
  assert.deepEqual(JSON.parse(JSON.stringify(rows)),[{name:'Alex',date:'2026-09-07'}]);

  const rawRows=await shared.fetchGistSchedule(gistId,async url=>{
    if(url==='https://api.github.com/gists/'+gistId)return {ok:true,status:200,json:async()=>({files:{'live-schedule.json':{truncated:true,raw_url:'https://gist.githubusercontent.com/example/'+gistId+'/raw/live-schedule.json'}}})};
    assert.equal(url,'https://gist.githubusercontent.com/example/'+gistId+'/raw/live-schedule.json');
    return {ok:true,status:200,text:async()=>'[{"name":"Sam","date":"2026-09-08"}]'};
  });
  assert.equal(rawRows[0].name,'Sam');

  const cardView=fs.readFileSync('card_view.html','utf8');
  const unattendedDisplay=fs.readFileSync('index_display.html','utf8');
  assert.match(cardView,/SharedSchedule\.fetchBackendSchedule\(backendSource\)/);
  assert.match(cardView,/SharedSchedule\.fetchGistSchedule\(sharedSource\)/);
  assert.match(unattendedDisplay,/SharedSchedule\.fetchBackendSchedule\(backendSource\)/);
  assert.match(unattendedDisplay,/SharedSchedule\.fetchGistSchedule\(sharedSource\)/);
  assert.doesNotMatch(cardView,/params\.get\('token'\)/);
  assert.doesNotMatch(unattendedDisplay,/params\.get\('token'\)/);
  assert.doesNotMatch(cardView,/Authorization/);
  assert.doesNotMatch(unattendedDisplay,/Authorization/);

  const source=new Date(2026,8,8,2,30);
  const shiftDate=new Date(source);
  if(source.getHours()<5)shiftDate.setDate(shiftDate.getDate()-1);
  assert.equal(shiftDate.toISOString().slice(0,10),'2026-09-07');
  console.log('shared_schedule tests passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
