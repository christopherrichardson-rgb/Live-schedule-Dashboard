(function(root){
  const GIST_API_ORIGIN='https://api.github.com/gists/';
  const SCHEDULE_FILE_NAME='live-schedule.json';
  const GIST_ID_PATTERN=/^[0-9a-f]{20,64}$/i;

  function backendApiBaseUrl(value){
    const reference=String(value||'').trim();
    if(!reference)return '';
    let url;
    try{
      url=new URL(reference);
    }catch(error){
      throw Error('Enter a valid HTTPS backend API base URL.');
    }
    if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/'&&url.pathname!==''){
      throw Error('Enter a backend API base URL without credentials, a path, query parameters, or a fragment.');
    }
    return url.origin;
  }

  function backendUrl(baseUrl,path){
    const base=backendApiBaseUrl(baseUrl);
    if(!base)throw Error('Enter a backend API base URL first.');
    return base+path;
  }

  function backendScheduleUrl(baseUrl){
    return backendUrl(baseUrl,'/api/schedule');
  }

  function backendLoginUrl(baseUrl){
    return backendUrl(baseUrl,'/api/admin/login');
  }

  function backendAdminScheduleUrl(baseUrl){
    return backendUrl(baseUrl,'/api/admin/schedule');
  }

  function backendSafetyBadgesUrl(baseUrl){
    return backendUrl(baseUrl,'/api/safety-badges');
  }

  function backendAdminSafetyBadgesUrl(baseUrl){
    return backendUrl(baseUrl,'/api/admin/safety-badges');
  }

  function gistIdFromReference(value){
    const reference=String(value||'').trim();
    if(GIST_ID_PATTERN.test(reference))return reference;
    try{
      const url=new URL(reference);
      const match=url.origin==='https://api.github.com'&&url.pathname.match(/^\/gists\/([0-9a-f]{20,64})\/?$/i);
      return match?match[1]:'';
    }catch(error){
      return '';
    }
  }

  function gistApiUrl(reference){
    const id=gistIdFromReference(reference);
    if(!id)throw Error('The shared schedule reference must be a GitHub Gist ID or GitHub Gist API URL.');
    return GIST_API_ORIGIN+id;
  }

  function scheduleFile(gist){
    if(!gist||typeof gist!=='object'||!gist.files||typeof gist.files!=='object')throw Error('GitHub returned an invalid Gist response.');
    const preferred=gist.files[SCHEDULE_FILE_NAME]||gist.files['schedule.json'];
    if(preferred&&typeof preferred==='object')return preferred;
    const jsonFiles=Object.entries(gist.files).filter(([name,file])=>name.toLowerCase().endsWith('.json')&&file&&typeof file==='object');
    if(jsonFiles.length===1)return jsonFiles[0][1];
    throw Error('The shared Gist does not contain '+SCHEDULE_FILE_NAME+'.');
  }

  function rawFileUrl(file){
    const url=new URL(String(file.raw_url||''));
    if(url.protocol!=='https:'||!/(^|\.)githubusercontent\.com$/i.test(url.hostname))throw Error('The shared Gist returned an unsafe schedule file URL.');
    return url.href;
  }

  async function responseJson(response,label){
    if(!response||!response.ok)throw Error(label+' (HTTP '+(response&&response.status||'unknown')+').');
    return response.json();
  }

  async function responseText(response,label){
    if(!response||!response.ok)throw Error(label+' (HTTP '+(response&&response.status||'unknown')+').');
    return response.text();
  }

  async function fetchGistSchedule(reference,fetchFn){
    const request=fetchFn||root.fetch;
    if(typeof request!=='function')throw Error('This browser cannot request the shared schedule.');
    const gist=await responseJson(await request(gistApiUrl(reference),{headers:{Accept:'application/vnd.github+json'},cache:'no-store'}),'GitHub could not load the shared schedule'),file=scheduleFile(gist);
    let content=file.content;
    if(file.truncated||typeof content!=='string')content=await responseText(await request(rawFileUrl(file),{cache:'no-store'}),'GitHub could not load the shared schedule file');
    try{
      const rows=JSON.parse(content);
      if(!Array.isArray(rows))throw Error('not an array');
      return rows;
    }catch(error){
      throw Error('The shared Gist schedule file is not valid JSON shift data.');
    }
  }

  async function fetchBackendSchedule(baseUrl,fetchFn){
    const request=fetchFn||root.fetch;
    if(typeof request!=='function')throw Error('This browser cannot request the shared schedule.');
    const payload=await responseJson(await request(backendScheduleUrl(baseUrl),{headers:{Accept:'application/json'},cache:'no-store'}),'The schedule backend could not load the shared schedule');
    if(!payload||typeof payload!=='object'||!Array.isArray(payload.rows))throw Error('The schedule backend returned an invalid schedule response.');
    return payload.rows;
  }

  function normaliseSafetyBadges(value){
    if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Safety badges must be an object.');
    const normaliseNames=(names,label)=>{
      if(!Array.isArray(names))throw Error('Safety badges must include a '+label+' list.');
      return [...new Set(names.map(name=>String(name||'').trim()).filter(Boolean))];
    };
    return {
      firstAid:normaliseNames(value.firstAid,'first aid'),
      fireMarshal:normaliseNames(value.fireMarshal,'fire marshal'),
      workingAtHeight:normaliseNames(value.workingAtHeight,'working at height')
    };
  }

  function safetyNameKeys(value){
    const tokens=[...new Set(String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(' ').filter(Boolean))],keys=[];
    for(let left=0;left<tokens.length;left++)for(let right=left+1;right<tokens.length;right++)keys.push([tokens[left],tokens[right]].sort().join('|'));
    return keys;
  }

  function safetyBadgesFor(badges,name){
    const normalised=normaliseSafetyBadges(badges),keys=new Set(safetyNameKeys(name));
    return [
      ['firstAid','first-aid','First aider','✚'],
      ['fireMarshal','fire-marshal','Fire marshal','🔥'],
      ['workingAtHeight','working-at-height','Working at height (scissor lift)','↕']
    ].filter(([property])=>normalised[property].some(safetyName=>safetyNameKeys(safetyName).some(key=>keys.has(key)))).map(([,className,label,symbol])=>({className,label,symbol}));
  }

  async function fetchBackendSafetyBadges(baseUrl,fetchFn){
    const request=fetchFn||root.fetch;
    if(typeof request!=='function')throw Error('This browser cannot request the shared safety badges.');
    const payload=await responseJson(await request(backendSafetyBadgesUrl(baseUrl),{headers:{Accept:'application/json'},cache:'no-store'}),'The schedule backend could not load the shared safety badges');
    if(!payload||typeof payload!=='object'||!payload.badges)throw Error('The schedule backend returned an invalid safety badge response.');
    return normaliseSafetyBadges(payload.badges);
  }

  function cardViewUrl(path,options){
    const settings=options||{},query=new URLSearchParams({team:settings.team});
    if(settings.search)query.set('search',settings.search);
    (settings.roles||[]).forEach(role=>query.append('role',role));
    if(settings.api)query.set('api',backendApiBaseUrl(settings.api));
    if(settings.api&&!query.get('api'))throw Error('The saved backend API base URL is invalid.');
    if(settings.gist)query.set('gist',gistIdFromReference(settings.gist));
    if(settings.gist&&!query.get('gist'))throw Error('The saved shared schedule reference is invalid.');
    return path+'?'+query.toString();
  }

  root.SharedSchedule={GIST_API_ORIGIN,SCHEDULE_FILE_NAME,backendApiBaseUrl,backendScheduleUrl,backendLoginUrl,backendAdminScheduleUrl,backendSafetyBadgesUrl,backendAdminSafetyBadgesUrl,gistIdFromReference,gistApiUrl,fetchBackendSchedule,fetchBackendSafetyBadges,fetchGistSchedule,normaliseSafetyBadges,safetyBadgesFor,cardViewUrl};
})(typeof window!=='undefined'?window:globalThis);
