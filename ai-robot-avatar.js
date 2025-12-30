/* ai-robot-avatar.js - Lottie Avatar Mount (external lottie-web) */
(function(){
  'use strict';

  function ensureStyle(){
    if(document.getElementById('aiRobotLottieStyle')) return;
    var css = `
.avatar{ position:relative; overflow:hidden !important; border-radius:999px; }
.avatar img{ opacity:0 !important; pointer-events:none; }
.ai-robot-lottie{
  position:absolute; inset:0;
  border-radius:999px;
  overflow:hidden;
  pointer-events:none;
  z-index: 9999;
}
`;
    var s=document.createElement('style');
    s.id='aiRobotLottieStyle';
    s.textContent=css;
    document.head.appendChild(s);
  }

  function mount(imgId){
    var img=document.getElementById(imgId);
    if(!img) return;
    var avatar=img.closest('.avatar');
    if(!avatar) return;

    ensureStyle();
    if(avatar.querySelector('.ai-robot-lottie')) return;

    // keep existing avatar logic but hide visual
    img.style.opacity='0';

    var host=document.createElement('div');
    host.className='ai-robot-lottie';
    avatar.appendChild(host);

    function start(){
      if(!window.lottie) return;
      // destroy previous if any
      try{ if(host.__anim){ host.__anim.destroy(); } }catch(e){}
      host.__anim = window.lottie.loadAnimation({
        container: host,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: 'ai-robot-avatar.json'
      });
    }

    // if lottie already loaded
    if(window.lottie){ start(); return; }

    // else wait a bit (script tag should load it)
    var tries=0;
    var t=setInterval(function(){
      tries++;
      if(window.lottie){ clearInterval(t); start(); }
      if(tries>40){ clearInterval(t); }
    }, 250);
  }

  document.addEventListener('DOMContentLoaded', function(){
    mount('mine-avatar');
    mount('account-avatar');
  });
})();