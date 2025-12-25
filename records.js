(function(){
  const KEY = 'app_records_v1';

  function getAll(){
    try{ return JSON.parse(localStorage.getItem(KEY)||'[]'); }
    catch(e){ return []; }
  }

  function render(){
    const list = document.getElementById('recordsList');
    const empty = document.getElementById('emptyState');
    list.innerHTML = '';

    const from = document.getElementById('fromDate').value;
    const to = document.getElementById('toDate').value;
    const type = document.getElementById('typeFilter').value;
    const cur = document.getElementById('currencyFilter').value;

    let rows = getAll();

    rows = rows.filter(r=>{
      if(type!=='all' && r.type!==type) return false;
      if(cur!=='all' && r.currency!==cur) return false;
      if(from && r.date < from) return false;
      if(to && r.date > to) return false;
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
        <span class="amount">${r.amount} ${r.currency}</span>
      </div>
      <div class="date">${r.date}</div>`;
      list.appendChild(d);
    });
  }

  document.getElementById('confirmBtn').onclick = render;
  render();

  window.RecordLogger = {
    add(type, amount, currency){
      const rows = getAll();
      rows.push({
        type,
        amount,
        currency,
        date: new Date().toISOString().slice(0,10)
      });
      localStorage.setItem(KEY, JSON.stringify(rows));
    }
  };
})();