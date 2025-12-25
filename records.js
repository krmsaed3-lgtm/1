(function(){
const KEY='app_records_v1';

function getAll(){
 try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){return[]}
}

function save(rows){
 localStorage.setItem(KEY,JSON.stringify(rows));
}

function add(type,amount,currency){
 const rows=getAll();
 rows.push({
   type:type,
   amount:amount,
   currency:currency,
   date:new Date().toISOString().slice(0,10)
 });
 save(rows);
}

function render(){
 const list=document.getElementById('recordsList');
 const empty=document.getElementById('emptyState');
 list.innerHTML='';

 let rows=getAll();

 const f=document.getElementById('fromDate').value;
 const t=document.getElementById('toDate').value;
 const ty=document.getElementById('typeFilter').value;
 const cu=document.getElementById('currencyFilter').value;

 rows=rows.filter(r=>{
   if(ty!=='all'&&r.type!==ty)return false;
   if(cu!=='all'&&r.currency!==cu)return false;
   if(f&&r.date<f)return false;
   if(t&&r.date>t)return false;
   return true;
 });

 if(!rows.length){
   empty.style.display='block';
   return;
 }
 empty.style.display='none';

 rows.reverse().forEach(r=>{
   const d=document.createElement('div');
   d.className='record';
   d.innerHTML=`<div class="row">
     <span class="type ${r.type}">${r.type.toUpperCase()}</span>
     <span>${r.amount} ${r.currency}</span>
   </div>
   <div class="date">${r.date}</div>`;
   list.appendChild(d);
 });
}

document.getElementById('confirmBtn').onclick=render;
render();

window.RecordLogger={
 deposit:(amt,cur)=>add('deposit',amt,cur),
 withdraw:(amt,cur)=>add('withdraw',amt,cur),
 profit:(amt,cur)=>add('profit',amt,cur)
};
})();