;(function(){
  'use strict';

  if (window.egModal) return;

  var stylesAdded = false;
  function ensureStyles(){
    if(stylesAdded) return;
    stylesAdded = true;
    var css = `
#egModalRoot{position:fixed;inset:0;z-index:99999;font-family:system-ui,-apple-system}
#egModalRoot.eg-hidden{display:none}
#egModalRoot .eg-overlay{position:absolute;inset:0;background:rgba(0,0,0,.62);backdrop-filter:blur(2px)}
#egModalRoot .eg-card{position:relative;width:min(420px,92vw);margin:28vh auto 0;background:rgba(11,31,42,.96);color:#fff;border:1px solid rgba(255,255,255,.10);border-radius:18px;box-shadow:0 18px 50px rgba(0,0,0,.45);padding:18px}
#egModalRoot .eg-title{font-size:16px;font-weight:800;margin:0 0 8px}
#egModalRoot .eg-msg{font-size:14px;opacity:.9;margin:0 0 12px;line-height:1.45;white-space:pre-line}
#egModalRoot .eg-actions{display:flex;gap:10px;margin-top:14px}
#egModalRoot .eg-btn{flex:1;padding:12px 12px;border-radius:14px;border:1px solid rgba(255,255,255,.14);background:transparent;color:#fff;font-size:14px;cursor:pointer}
#egModalRoot .eg-ok{border:none;color:#003b32;font-weight:800;background-image:linear-gradient(90deg,#18c1ff,#22e1a5)}
#egModalRoot .eg-input{width:100%;padding:12px 12px;border-radius:14px;border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.18);color:#fff;font-size:16px;outline:none}
#egModalRoot .eg-hint{font-size:12px;opacity:.75;margin-top:8px}
    `.trim();
    var s=document.createElement('style');
    s.textContent=css;
    document.head.appendChild(s);
  }

  function ensureRoot(){
    ensureStyles();
    var root=document.getElementById('egModalRoot');
    if(root) return root;

    root=document.createElement('div');
    root.id='egModalRoot';
    root.className='eg-hidden';
    root.innerHTML=`
      <div class="eg-overlay"></div>
      <div class="eg-card" role="dialog" aria-modal="true">
        <div class="eg-title" id="egTitle"></div>
        <div class="eg-msg" id="egMsg"></div>
        <div id="egBody"></div>
        <div class="eg-actions">
          <button class="eg-btn" id="egCancel"></button>
          <button class="eg-btn eg-ok" id="egOk"></button>
        </div>
      </div>
    `;
    document.body.appendChild(root);

    root.querySelector('.eg-overlay').addEventListener('click', function(){
      var c=document.getElementById('egCancel'); c && c.click();
    });

    return root;
  }

  function openBase(opts){
    var root=ensureRoot();
    document.getElementById('egTitle').textContent=opts.title||'Notice';
    document.getElementById('egMsg').textContent=opts.msg||'';
    document.getElementById('egOk').textContent=opts.okText||'OK';
    document.getElementById('egCancel').textContent=opts.cancelText||'Cancel';
    var body=document.getElementById('egBody');
    body.innerHTML='';
    root.classList.remove('eg-hidden');
    return { root: root, body: body };
  }

  async function alertBox(msg, opts){
    opts = opts || {};
    var base=openBase({ title: opts.title||'Notice', msg: msg, okText: opts.okText||'OK', cancelText: '' });
    document.getElementById('egCancel').style.display='none';
    return new Promise(function(resolve){
      var ok=document.getElementById('egOk');
      ok.onclick=function(){
        base.root.classList.add('eg-hidden');
        document.getElementById('egCancel').style.display='';
        resolve(true);
      };
    });
  }

  async function confirmBox(opts){
    opts = opts || {};
    var base=openBase(opts);
    document.getElementById('egCancel').style.display='';
    return new Promise(function(resolve){
      var ok=document.getElementById('egOk');
      var cancel=document.getElementById('egCancel');
      ok.onclick=function(){ base.root.classList.add('eg-hidden'); resolve(true); };
      cancel.onclick=function(){ base.root.classList.add('eg-hidden'); resolve(false); };
    });
  }

  async function promptBox(opts){
    opts = opts || {};
    var base=openBase(opts);
    var input=document.createElement('input');
    input.className='eg-input';
    input.type='text';
    input.placeholder=opts.placeholder||'';
    if(opts.inputMode) input.inputMode=opts.inputMode;
    if(opts.maxLength) input.maxLength=opts.maxLength;
    base.body.appendChild(input);
    if(opts.hint){
      var hint=document.createElement('div');
      hint.className='eg-hint';
      hint.textContent=opts.hint;
      base.body.appendChild(hint);
    }
    setTimeout(function(){ try{input.focus();}catch(e){} },0);

    return new Promise(function(resolve){
      var ok=document.getElementById('egOk');
      var cancel=document.getElementById('egCancel');
      ok.onclick=function(){
        var v=String(input.value||'').trim();
        base.root.classList.add('eg-hidden');
        resolve(v);
      };
      cancel.onclick=function(){
        base.root.classList.add('eg-hidden');
        resolve(null);
      };
    });
  }

  window.egModal = { alert: alertBox, confirm: confirmBox, prompt: promptBox };
})();