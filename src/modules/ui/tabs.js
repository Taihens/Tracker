export function showTab(id,btn){
  document.querySelectorAll('.tc').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(b=>b.classList.remove('active'));
  document.getElementById('tab-'+id)?.classList.add('active');
  if(btn) btn.classList.add('active');
  if(id==='log') window.renderLog();
  if(id==='fiches') window.renderFiche();
  if(id==='etats') window.renderEtats();
  if(id==='recap'){window.renderRecap();window.renderChart();}
  if(id==='roster') window.renderRoster();
  if(id==='dice') window.initDiceSVG();
  if(id==='settings'){window.renderSettings();window.renderLayoutGrid();}
  if(id==='assistant') window.initAssistantTab();
  if(id==='messages') window.renderMessages();
}

export function refreshActiveTab(){
  const active=document.querySelector('.tc.active');
  if(!active)return;
  const id=active.id.replace('tab-','');
  showTab(id, document.querySelector(`nav button.active`));
}
