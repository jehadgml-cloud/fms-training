const fs = require('fs');

function run() {
  let p1 = fs.readFileSync('part2.html', 'utf8');

  // Fix fetchAllEmployees
  const oldEmp = `async function fetchAllEmployees(){
  if(STATE.gasUrl){
    try{
      const res = await fetch(STATE.gasUrl+'?action=employees&_=' + Date.now());
      if(res.ok){
        const rows = await res.json();
        return rows.map(row=>({
          id: row['Employee ID'], name: row['Name'], department: row['Department'],
          email: row['Email']||'', createdAt: row['Registered At']||''
        }));
      }
    }catch(e){ console.error('Sheet employee fetch failed, falling back to local cache', e); }
  }
  const out=[];
  try{
    const list = await Store.list('emp:', true);
    for(const k of (list.keys||[])){
      try{ const r=await Store.get(k, true); if(r && r.value) out.push(JSON.parse(r.value)); }catch(e){}
    }
  }catch(e){ console.error(e); }
  return out;
}`;

  const newEmp = `async function fetchAllEmployees(){
  let combined = [];
  if(STATE.gasUrl){
    try{
      const res = await fetch(STATE.gasUrl+'?action=employees&_=' + Date.now());
      if(res.ok){
        const rows = await res.json();
        const gasE = rows.map(row=>({
          id: row['Employee ID'], name: row['Name'], department: row['Department'],
          email: row['Email']||'', createdAt: row['Registered At']||''
        }));
        combined = combined.concat(gasE);
      }
    }catch(e){ console.error('Sheet employee fetch failed', e); }
  }
  try{
    const list = await Store.list('emp:', true);
    for(const k of (list.keys||[])){
      try{ const r=await Store.get(k, true); if(r && r.value) combined.push(JSON.parse(r.value)); }catch(e){}
    }
  }catch(e){}
  const unique = []; const seen = new Set();
  for(const r of combined){ if(!seen.has(r.id)){ seen.add(r.id); unique.push(r); } }
  return unique;
}`;

  p1 = p1.replace(oldEmp, newEmp);

  // Fix fetchAllEvaluations
  const oldEval = `async function fetchAllEvaluations(){
  if(STATE.gasUrl){
    try{
      const res = await fetch(STATE.gasUrl+'?action=evaluations&_=' + Date.now());
      if(res.ok){
        const rows = await res.json();
        return rows.map(row=>({
          id: row['Employee ID'], name: row['Name'], department: row['Department'], date: row['Date'],
          certId: row['Certificate ID']||'', comments: row['Comments']||'',
          ratings: {
            clarity:Number(row['Clarity']), materials:Number(row['Materials']), relevance:Number(row['Relevance']),
            examFair:Number(row['Exam Fair']), platform:Number(row['Platform']), overall:Number(row['Overall'])
          }
        }));
      }
    }catch(e){ console.error('Sheet evaluation fetch failed, falling back to local cache', e); }
  }
  const out=[];
  try{
    const list = await Store.list('eval:', true);
    for(const k of (list.keys||[])){
      try{ const r=await Store.get(k, true); if(r && r.value) out.push(JSON.parse(r.value)); }catch(e){}
    }
  }catch(e){ console.error(e); }
  return out;
}`;

  const newEval = `async function fetchAllEvaluations(){
  let combined = [];
  if(STATE.gasUrl){
    try{
      const res = await fetch(STATE.gasUrl+'?action=evaluations&_=' + Date.now());
      if(res.ok){
        const rows = await res.json();
        const gasE = rows.map(row=>({
          id: row['Employee ID'], name: row['Name'], department: row['Department'], date: row['Date'],
          certId: row['Certificate ID']||'', comments: row['Comments']||'',
          ratings: {
            clarity:Number(row['Clarity']), materials:Number(row['Materials']), relevance:Number(row['Relevance']),
            examFair:Number(row['Exam Fair']), platform:Number(row['Platform']), overall:Number(row['Overall'])
          }
        }));
        combined = combined.concat(gasE);
      }
    }catch(e){ console.error('Sheet evaluation fetch failed', e); }
  }
  try{
    const list = await Store.list('eval:', true);
    for(const k of (list.keys||[])){
      try{ const r=await Store.get(k, true); if(r && r.value) combined.push(JSON.parse(r.value)); }catch(e){}
    }
  }catch(e){}
  const unique = []; const seen = new Set();
  for(const r of combined){ const key = r.id+'|'+(r.date||''); if(!seen.has(key)){ seen.add(key); unique.push(r); } }
  return unique;
}`;
  
  p1 = p1.replace(oldEval, newEval);
  fs.writeFileSync('part2.html', p1, 'utf8');
}
run();
