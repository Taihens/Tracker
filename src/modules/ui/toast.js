export function toast(msg,cls){
  const c=document.getElementById('toasts');
  const el=document.createElement('div');el.className='toast '+cls;el.textContent=msg;
  c.appendChild(el);setTimeout(()=>el.remove(),3200);
}
