/* Andrea Agudelo · v3 · motion · Sorabyte */
(function(){
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* pausa CSS animations cuando el elemento sale del viewport
     (ahorra GPU/CPU sin alterar el comportamiento visible) */
  if(!reduce && 'IntersectionObserver' in window){
    var pauseObs = new IntersectionObserver(function(es){
      es.forEach(function(e){
        e.target.dataset.paused = e.isIntersecting ? '' : 'true';
      });
    },{rootMargin:'120px 0px'});
    /* selectores con animations continuas e infinitas */
    document.querySelectorAll('.hero,.marquee,.testi-panel,.testi-marquee').forEach(function(el){
      pauseObs.observe(el);
    });
  }

  /* hero */
  var hero = document.querySelector('.hero');
  if (hero){
    /* lettres qui respirent */
    var h1 = hero.querySelector('h1');
    if (h1){
      var gi = 0;
      h1.querySelectorAll('.hero-line').forEach(function(line){
        var isClay = line.classList.contains('clay');
        var text = line.textContent.replace(/\s+/g,' ').trim();
        line.textContent = '';
        text.split('').forEach(function(ch){
          if (ch===' '){ line.appendChild(document.createTextNode(' ')); return; }
          var g = document.createElement('span');
          g.className = 'gly'; g.textContent = ch;
          if (!reduce) g.style.animationDelay = (gi*0.10)+'s'; else g.style.animation='none';
          line.appendChild(g);
          gi++;
        });
      });
    }
    /* crossfade fond */
    var bgImgs = hero.querySelectorAll('.hero-bg img');
    if (bgImgs.length>1 && !reduce){
      var bi=0;
      setInterval(function(){
        bgImgs[bi].classList.remove('active');
        bi=(bi+1)%bgImgs.length;
        bgImgs[bi].classList.add('active');
      },5000);
    }
    requestAnimationFrame(function(){ hero.classList.add('in'); });

    /* fond du hero : brume 100% CSS (sans three.js ni WebGL) */
  }

  /* header + progress */
  var header = document.querySelector('header.head-bar');
  var progress = document.getElementById('progress');
  function onScroll(){
    if (header) header.classList.toggle('scrolled', window.scrollY>40);
    if (progress){
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var p = h>0 ? (window.scrollY/h) : 0;
      progress.style.transform = 'scaleX('+p+')';
    }
  }
  var scrTk=false;
  window.addEventListener('scroll', function(){
    if(scrTk) return; scrTk=true;
    requestAnimationFrame(function(){ onScroll(); scrTk=false; });
  },{passive:true});
  onScroll();

  /* hamburger */
  var burger=document.getElementById('burger'), overlay=document.getElementById('menu'),
      closeBtn=document.getElementById('menuClose');
  if(burger) burger.addEventListener('click',function(){overlay.classList.add('open');document.body.classList.add('menu-open');});
  if(closeBtn) closeBtn.addEventListener('click',function(){overlay.classList.remove('open');document.body.classList.remove('menu-open');});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&overlay){overlay.classList.remove('open');document.body.classList.remove('menu-open');}});

  /* reveal */
  if (reduce){
    document.querySelectorAll('.reveal').forEach(function(el){el.classList.add('in');});
  } else {
    var ro = new IntersectionObserver(function(es){
      es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); ro.unobserve(e.target); } });
    },{threshold:0.12,rootMargin:'0px 0px -50px 0px'});
    document.querySelectorAll('.reveal').forEach(function(el){ro.observe(el);});
  }

  /* count-up */
  if(!reduce){
    var co=new IntersectionObserver(function(es){
      es.forEach(function(e){
        if(!e.isIntersecting) return;
        var el=e.target,target=parseInt(el.dataset.target,10),suffix=el.dataset.suffix||'';
        if(isNaN(target)) return;
        var start=performance.now();
        function tick(now){
          var t=Math.min(1,(now-start)/1300),k=1-Math.pow(1-t,3);
          el.textContent=Math.round(target*k)+suffix;
          if(t<1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick); co.unobserve(el);
      });
    },{threshold:0.6});
    document.querySelectorAll('[data-target]').forEach(function(el){co.observe(el);});
  }

  /* before / after slider */
  document.querySelectorAll('.ba').forEach(function(ba){
    var after=ba.querySelector('.after'), handle=ba.querySelector('.handle');
    function set(x){
      var r=ba.getBoundingClientRect();
      var p=Math.max(4,Math.min(96,((x-r.left)/r.width)*100));
      after.style.clipPath='inset(0 0 0 '+p+'%)';
      handle.style.left=p+'%';
    }
    var drag=false;
    ba.addEventListener('pointerdown',function(e){drag=true;set(e.clientX);});
    window.addEventListener('pointermove',function(e){if(drag)set(e.clientX);});
    window.addEventListener('pointerup',function(){drag=false;});
    ba.addEventListener('pointermove',function(e){if(e.pressure>0||drag)set(e.clientX);});
  });

  /* magnetic */
  if(!reduce && !window.matchMedia('(pointer:coarse)').matches){
    document.querySelectorAll('.magnetic').forEach(function(btn){
      btn.addEventListener('mousemove',function(e){
        var r=btn.getBoundingClientRect();
        btn.style.transform='translate('+((e.clientX-(r.left+r.width/2))*0.22)+'px,'+((e.clientY-(r.top+r.height/2))*0.32)+'px)';
      },{passive:true});
      btn.addEventListener('mouseleave',function(){btn.style.transform='';});
    });
  }

  /* cursor */
  if(!reduce && !window.matchMedia('(pointer:coarse)').matches && window.innerWidth>900){
    var cur=document.createElement('div'); cur.className='cursor'; document.body.appendChild(cur);
    var mx=0,my=0,cx=0,cy=0,on=false;
    document.addEventListener('mousemove',function(e){mx=e.clientX;my=e.clientY;if(!on){on=true;cur.classList.add('on');}},{passive:true});
    document.addEventListener('mouseleave',function(){on=false;cur.classList.remove('on');});
    (function loop(){cx+=(mx-cx)*0.2;cy+=(my-cy)*0.2;
      cur.style.transform='translate('+cx+'px,'+cy+'px) translate(-50%,-50%)';
      requestAnimationFrame(loop);})();
    document.querySelectorAll('a,button,.svc-card,.dept-card,.t-card,.step,.book-lieu').forEach(function(el){
      el.addEventListener('mouseenter',function(){cur.classList.add('hov');});
      el.addEventListener('mouseleave',function(){cur.classList.remove('hov');});
    });
  }

  /* ===== capa premium ===== */

  /* escalonado: cada hijo de una rejilla revela con su retardo */
  ['.dept-grid','.trust-grid','.testi-grid','.book-lieux','.svc-grid','.steps']
  .forEach(function(sel){
    document.querySelectorAll(sel).forEach(function(box){
      var k=box.children,i;
      for(i=0;i<k.length;i++) k[i].style.setProperty('--d',(i*0.08)+'s');
    });
  });

  /* parallax suave del texto del hero (sale al hacer scroll).
     SOLO desktop: en móvil el scroll natural ya da el efecto y este handler
     añade coste por frame innecesario. */
  if(!reduce && window.innerWidth>900){
    var hText=document.querySelector('.hero-text'), tk=false;
    function pframe(){
      var y=window.scrollY, vh=window.innerHeight;
      if(hText&&y<vh){
        hText.style.transform='translate3d(0,'+(y*0.2)+'px,0)';
        hText.style.opacity=Math.max(0,1-y/(vh*0.8));
      }
      tk=false;
    }
    window.addEventListener('scroll',function(){
      if(!tk){requestAnimationFrame(pframe);tk=true;}
    },{passive:true});
  }

  /* spotlight que sigue al cursor en las tarjetas (catálogo) */
  if(!reduce && !window.matchMedia('(pointer:coarse)').matches){
    document.querySelectorAll('.svc-card,.book-lieu').forEach(function(c){
      c.addEventListener('pointermove',function(e){
        var r=c.getBoundingClientRect();
        c.style.setProperty('--mx',((e.clientX-r.left)/r.width*100)+'%');
        c.style.setProperty('--my',((e.clientY-r.top)/r.height*100)+'%');
      });
    });
  }

  /* Cartas apiladas (estilo Jack, horizontal). Funciona en CUALQUIER
     sección con clase .hpin: si no trae la estructura .hpin-sticky, el
     JS la construye a partir de su rejilla (.dept-grid / .svc-grid).
     La sección se fija; al hacer scroll las cartas se apilan. Si la
     sección tiene un .hpin-parking, una fase final lo hace subir. */
  (function(){
    var sections=[].slice.call(document.querySelectorAll('.hpin'));
    if(!sections.length||reduce) return;

    sections.forEach(function(sec){
      var track=sec.querySelector('.hpin-track');
      /* construir la estructura si la sección no la trae (no contact) */
      if(!sec.querySelector('.hpin-sticky')){
        var wrap=sec.querySelector('.wrap');
        var grid=sec.querySelector('.dept-grid,.svc-grid,.hpin-track');
        if(!grid) return;
        grid.classList.add('hpin-track');
        var sticky=document.createElement('div'); sticky.className='hpin-sticky';
        if(wrap) sticky.appendChild(wrap);
        sticky.appendChild(grid);
        sec.appendChild(sticky);
        track=grid;
      }
      if(!track) return;
      var cards=[].slice.call(track.children);
      cards.forEach(function(c){ c.classList.add('hpin-card'); c.classList.remove('reveal'); });
      var n=cards.length;
      if(n<2) return;
      var parking=sec.querySelector('.hpin-parking');

      /* botón "Tout voir": pop-up con todas las cartas en rejilla, sin
         tener que apilarlas una a una */
      var head=sec.querySelector('.section-head');
      if(head && n>=3 && !parking){
        var vt=document.createElement('button');
        vt.type='button'; vt.className='see-all-btn';
        vt.textContent='Tout voir d’un coup';
        head.appendChild(vt);
        var am=document.createElement('div'); am.className='all-modal';
        var amBox=document.createElement('div'); amBox.className='all-modal-box';
        var amX=document.createElement('button'); amX.className='all-modal-x';
        amX.setAttribute('aria-label','Fermer'); amX.textContent='✕';
        var amG=document.createElement('div'); amG.className='all-modal-grid';
        cards.forEach(function(c){
          var cl=c.cloneNode(true);
          cl.classList.remove('hpin-card');
          cl.style.transform=''; cl.style.zIndex='';
          amG.appendChild(cl);
        });
        amBox.appendChild(amX); amBox.appendChild(amG);
        am.appendChild(amBox); document.body.appendChild(am);
        function closeAm(){ am.classList.remove('open'); document.body.classList.remove('menu-open'); }
        vt.addEventListener('click',function(){
          am.classList.add('open'); document.body.classList.add('menu-open');
        });
        amX.addEventListener('click',closeAm);
        am.addEventListener('click',function(e){ if(e.target===am) closeAm(); });
        document.addEventListener('keydown',function(e){ if(e.key==='Escape') closeAm(); });
      }

      var PER=0.88, HOLD=0.4, EDGE=Math.min(18,Math.round(34/(n-1)));
      var phases=(n-1)+(parking?1:0);
      var push=0, vh0=0, active=false, target=0, cur=0, rafId=null;

      function setup(){
        push=window.innerWidth;
        vh0=window.innerHeight;
        sec.style.height=(vh0*(1+phases*PER))+'px';
        cards.forEach(function(c,i){ c.style.zIndex=i+1; });
      }
      function ease(t){ return t<0.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2; }
      function apply(prog){
        var cardEnd=parking?(n-1)/phases:1;
        var cardProg=Math.min(1,prog/cardEnd);
        for(var i=0;i<n;i++){
          if(i===0){ cards[i].style.transform='translate3d(0,0,0)'; continue; }
          var raw=cardProg*(n-1)-(i-1);
          var li=Math.min(1,Math.max(0,(raw-HOLD)/(1-HOLD)));
          var x=i*EDGE+(1-ease(li))*push;
          cards[i].style.transform='translate3d('+x.toFixed(1)+'px,0,0)';
        }
        if(parking){
          var pk=Math.max(0,Math.min(1,(prog-cardEnd)/(1-cardEnd)));
          var pe=ease(pk);
          parking.style.transform='translate3d(0,calc(-50% + '+((1-pe)*vh0*0.82).toFixed(1)+'px),0)';
          parking.style.opacity=Math.min(1,pk*4).toFixed(3);
          track.style.transform='scale('+(1-pe*0.16).toFixed(3)+')';
          track.style.opacity=(1-pe*0.9).toFixed(3);
        }
      }
      function computeTarget(){
        var rect=sec.getBoundingClientRect();
        var dist=sec.offsetHeight-vh0;
        target=dist>0?Math.min(1,Math.max(0,-rect.top/dist)):0;
      }
      function loop(){
        cur+=(target-cur)*0.11;
        var done=Math.abs(target-cur)<0.0005;
        if(done) cur=target;
        apply(cur);
        rafId = done ? null : requestAnimationFrame(loop);
      }
      function kick(){ if(active&&!rafId) rafId=requestAnimationFrame(loop); }
      function evaluate(){
        var mob=window.innerWidth<=900;
        if(mob&&!active){active=true;sec.classList.add('hpin--on');setup();
          computeTarget();cur=target;apply(cur);}
        else if(!mob&&active){active=false;
          if(rafId){cancelAnimationFrame(rafId);rafId=null;}
          sec.classList.remove('hpin--on');sec.style.height='';
          cards.forEach(function(c){c.style.transform='';c.style.zIndex='';});
          track.style.transform='';track.style.opacity='';
          if(parking){parking.style.transform='';parking.style.opacity='';}}
        else if(active){setup();computeTarget();kick();}
      }
      window.addEventListener('scroll',function(){
        if(active){computeTarget();kick();}
      },{passive:true});
      window.addEventListener('resize',evaluate);
      window.addEventListener('load',evaluate);
      evaluate();
    });
  })();

  /* Testimonios: banda de reseñas. 1 reseña = estática (mismo diseño);
     2+ = bucle infinito. El botón "+ avis" añade reseñas de ejemplo y,
     en cuanto hay más de 1, arranca el movimiento. Tocar una reseña
     abre un popup deslizable. */
  (function(){
    if(reduce) return;
    var AV=['6766741','16779595','8560805'];
    var SAMPLES=[
      {q:'Accueil très chaleureux et soin impeccable. Je reviendrai sans hésiter.',n:'Camille D.',m:'Marly'},
      {q:'Andrea prend le temps d\'expliquer chaque étape. On se sent en confiance.',n:'Marc V.',m:'Granges-Paccot'},
      {q:'Des années de gêne réglées en quelques séances. Un grand merci.',n:'Nadia K.',m:'Fribourg'},
      {q:'Professionnelle, ponctuelle et vraiment à l\'écoute. Je recommande.',n:'Élise P.',m:'Villars-sur-Glâne'},
      {q:'Un soin sur mesure, sans jamais se sentir pressé. Parfait.',n:'Thomas R.',m:'Marly'}
    ];
    document.querySelectorAll('.testi-grid').forEach(function(grid){
      if(!grid.parentNode) return;
      var reviews=[].slice.call(grid.children);
      if(!reviews.length) return;
      reviews.forEach(function(c){ c.classList.remove('reveal'); });
      grid.classList.add('testi-track');

      var panel=document.createElement('div'); panel.className='testi-panel';
      var band=document.createElement('div'); band.className='testi-marquee';
      grid.parentNode.insertBefore(panel,grid);
      panel.appendChild(band); band.appendChild(grid);

      var addWrap=document.createElement('div'); addWrap.className='testi-add';
      var addBtn=document.createElement('button'); addBtn.type='button';
      addBtn.className='testi-add-btn'; addBtn.textContent='+ Ajouter un avis';
      addWrap.appendChild(addBtn);
      panel.parentNode.insertBefore(addWrap,panel.nextSibling);

      /* popup deslizable */
      var modal=document.createElement('div'); modal.className='testi-modal';
      modal.innerHTML='<div class="testi-modal-in">'+
        '<button class="testi-modal-x" aria-label="Fermer">✕</button>'+
        '<div class="testi-modal-track"></div><div class="testi-modal-dots"></div></div>';
      document.body.appendChild(modal);
      var mtrack=modal.querySelector('.testi-modal-track'),
          mdots=modal.querySelector('.testi-modal-dots');
      function openModal(i){
        modal.classList.add('open'); document.body.classList.add('menu-open');
        requestAnimationFrame(function(){ mtrack.scrollLeft=(i||0)*mtrack.clientWidth; });
      }
      function closeModal(){ modal.classList.remove('open'); document.body.classList.remove('menu-open'); }
      modal.querySelector('.testi-modal-x').addEventListener('click',closeModal);
      modal.addEventListener('click',function(e){ if(e.target===modal) closeModal(); });
      document.addEventListener('keydown',function(e){ if(e.key==='Escape') closeModal(); });
      var dtk=false;
      mtrack.addEventListener('scroll',function(){
        if(dtk) return; dtk=true;
        requestAnimationFrame(function(){
          var i=Math.round(mtrack.scrollLeft/mtrack.clientWidth);
          [].forEach.call(mdots.children,function(d,j){ d.classList.toggle('on',j===i); });
          dtk=false;
        });
      },{passive:true});

      var si=0;
      function buildSet(ariaHidden){
        var set=document.createElement('div'); set.className='testi-set';
        if(ariaHidden) set.setAttribute('aria-hidden','true');
        reviews.forEach(function(c){ set.appendChild(c.cloneNode(true)); });
        return set;
      }
      function render(){
        grid.innerHTML='';
        mtrack.innerHTML=''; mdots.innerHTML='';
        reviews.forEach(function(c,idx){
          var rc=c.cloneNode(true); rc.removeAttribute('aria-hidden');
          mtrack.appendChild(rc);
          var d=document.createElement('b'); if(idx===0) d.className='on'; mdots.appendChild(d);
        });
        if(reviews.length>=2){
          /* relleno hasta que el track tenga >= 2.2x el viewport, en pares
             para que translate(-50%) loop sin huecos */
          grid.appendChild(buildSet(false));
          grid.appendChild(buildSet(true));
          var pairs=1, vw=window.innerWidth||1400, safety=8;
          while(grid.scrollWidth < vw*2.2 && pairs<safety){
            grid.appendChild(buildSet(true));
            grid.appendChild(buildSet(true));
            pairs++;
          }
          /* velocidad constante ~70px/s, escala con el ancho total */
          var dur=Math.max(22, Math.round((grid.scrollWidth/2)/70));
          grid.style.animation='testiSlide '+dur+'s linear infinite';
          grid.classList.remove('testi-static');
        }else{
          reviews.forEach(function(c){ grid.appendChild(c); });
          grid.style.animation='none';
          grid.classList.add('testi-static');
        }
        [].forEach.call(grid.querySelectorAll('.t-card'),function(c,idx){
          c.onclick=function(){ openModal(idx%reviews.length); };
        });
      }
      window.addEventListener('resize',function(){
        clearTimeout(window.__testiRz);
        window.__testiRz=setTimeout(render,200);
      });
      addBtn.addEventListener('click',function(){
        var s=SAMPLES[si%SAMPLES.length], a=AV[si%AV.length]; si++;
        var card=document.createElement('div'); card.className='t-card';
        card.innerHTML='<div class="stars">★★★★★</div><p class="quote">'+s.q+'</p>'+
          '<div class="who"><img src="https://images.pexels.com/photos/'+a+
          '/pexels-photo-'+a+'.jpeg?auto=compress&cs=tinysrgb&w=160" alt="">'+
          '<div><div class="name">'+s.n+'</div><div class="meta">'+s.m+'</div></div></div>';
        reviews.push(card);
        render();
      });
      render();
    });
  })();

  /* ===== Sistema de reserva por pop-ups (compartido en todas las páginas) =====
     Cualquier elemento [data-book][data-soin] abre el flujo:
     prestación concreta -> calendario -> horario -> formulario.
     Si la página tiene #bookGrid, se rellena con las tarjetas de soins. */
  (function(){
    var P='https://images.pexels.com/photos/';
    var px=function(id){return P+id+'/pexels-photo-'+id+'.jpeg?auto=compress&cs=tinysrgb&w=600';};
    var SOINS=[
      {sl:'podologie',nm:'Podologie',lu:'Cabinet MIC · Marly',pr:'dès 40 CHF',
        ph:P+'17056219/pexels-photo-17056219.jpeg?auto=compress&cs=tinysrgb&w=600'},
      {sl:'laser',nm:'Épilation laser',lu:'Cabinet MIC · Marly',pr:'dès 20 CHF',
        ph:P+'5619456/pexels-photo-5619456.jpeg?auto=compress&cs=tinysrgb&w=600'},
      {sl:'massages',nm:'Massages thérapeutiques',lu:'CrossFit Poya · Granges-Paccot',pr:'dès 60 CHF',
        ph:P+'6628611/pexels-photo-6628611.jpeg?auto=compress&cs=tinysrgb&w=600'}
    ];
    var TREAT={
      'Podologie':[
        {nm:'Soin partiel',sub:'30 min · ongle incarné, cor',pr:'80 CHF',ph:px('4960359'),
          de:'Traitement ciblé d\'un problème précis : ongle incarné, cor ou durillon. Idéal pour une gêne localisée.'},
        {nm:'Soin complet',sub:'45 min · soin global du pied',pr:'110 CHF',ph:px('4963837'),
          de:'Soin global des deux pieds : ongles, cors, callosités et hydratation, pour des pieds nets et sains.'},
        {nm:'Ortonyxie',sub:'Bride pour ongle incarné',pr:'80 CHF',ph:px('4963822'),
          de:'Pose d\'une petite bride sur l\'ongle pour corriger en douceur un ongle incarné, sans chirurgie.'},
        {nm:'Prothèse unguéale',sub:'Reconstruction en résine',pr:'60 CHF',ph:px('7755554'),
          de:'Reconstruction d\'un ongle abîmé ou manquant avec une résine, pour un résultat naturel.'},
        {nm:'Silicones orthoplastiques',sub:'Orthèse sur mesure',pr:'40 CHF',ph:px('13059141'),
          de:'Petite orthèse en silicone fabriquée sur mesure pour protéger ou repositionner un orteil.'}],
      'Épilation laser':[
        {nm:'Lèvre supérieure',sub:'Femme',pr:'20 CHF',ph:px('29746584'),
          de:'Épilation laser progressive de la lèvre supérieure. Plusieurs séances pour un résultat durable.'},
        {nm:'Menton',sub:'Femme',pr:'30 CHF',ph:px('7321548'),
          de:'Épilation laser du menton, séance courte et précise.'},
        {nm:'Visage complet',sub:'Femme',pr:'50 CHF',ph:px('4046570'),
          de:'Épilation laser de l\'ensemble du visage, zones du duvet incluses.'},
        {nm:'Contour de barbe',sub:'Homme',pr:'40 CHF',ph:px('11024140'),
          de:'Dessin et entretien net de la ligne de barbe au laser.'},
        {nm:'Nuque · cou',sub:'Homme',pr:'40 CHF',ph:px('9486651'),
          de:'Épilation laser de la nuque et du cou, zones difficiles à entretenir soi-même.'},
        {nm:'Nez · oreilles',sub:'Homme',pr:'dès 20 CHF',ph:px('5069506'),
          de:'Épilation laser des poils du nez et des oreilles, en toute sécurité.'}],
      'Massages thérapeutiques':[
        {nm:'Massage classique',sub:'30 / 60 / 90 min',pr:'dès 60 CHF',ph:px('6628649'),
          de:'Détente musculaire profonde, reconnue ASCA. Réservation sur OneDoc.'},
        {nm:'Massage sportif',sub:'30 / 60 / 90 min',pr:'dès 60 CHF',ph:px('6628611'),
          de:'Récupération musculaire pour sportifs et actifs. Réservation sur OneDoc.'},
        {nm:'Pierres chaudes',sub:'1 h 15',pr:'150 CHF',ph:px('6628701'),
          de:'Chaleur volcanique pour un relâchement total. Réservation sur OneDoc.'},
        {nm:'Massage relaxant',sub:'1 h 15',pr:'120 CHF',ph:px('6628596'),
          de:'Apaisement nerveux profond. Réservation sur OneDoc.'},
        {nm:'Anti-cellulite',sub:'45 min',pr:'100 CHF',ph:px('6628649'),
          de:'Drainage et fermeté sur zones ciblées. Réservation sur OneDoc.'}]
    };
    var SLOTS=['09:00','10:00','11:00','14:00','15:00','16:00','17:00'];
    var MONTHS=['janvier','février','mars','avril','mai','juin','juillet','août',
                'septembre','octobre','novembre','décembre'];
    var WD=['L','M','M','J','V','S','D'];
    var st={soin:null,treat:null,date:null,dateLabel:null,time:null};

    /* construir los pop-ups una sola vez */
    var root=document.createElement('div');
    root.innerHTML=
      '<div class="rm" id="rmSoin"><div class="rm-box">'+
        '<button class="rm-x" data-rmclose>✕</button>'+
        '<div class="rm-eye">Étape 1 sur 4</div><div class="rm-title" id="rmSoinT">Soin</div>'+
        '<div class="rm-recap">Choisissez la prestation exacte</div>'+
        '<div class="rm-body"><div class="soin-pick" id="rmSoinList"></div></div></div></div>'+
      '<div class="rm" id="rmInfo"><div class="rm-box">'+
        '<button class="rm-x" data-rmclose>✕</button>'+
        '<button class="rm-back" id="rmInfoBack">‹ Retour aux soins</button>'+
        '<img class="rm-info-ph" id="rmInfoPh" alt="">'+
        '<div class="rm-title" id="rmInfoT">Soin</div>'+
        '<div class="rm-recap" id="rmInfoPr">—</div>'+
        '<p class="rm-info-desc" id="rmInfoD"></p>'+
        '<button type="button" class="rm-btn" id="rmInfoGo">Réserver ce soin →</button>'+
        '</div></div>'+
      '<div class="rm" id="rmCal"><div class="rm-box">'+
        '<button class="rm-x" data-rmclose>✕</button>'+
        '<button class="rm-back" id="rmCalBack">‹ Changer de soin</button>'+
        '<div class="rm-eye">Étape 2 sur 4</div><div class="rm-title" id="rmCalT">Soin</div>'+
        '<div class="rm-recap">Choisissez le jour</div>'+
        '<div class="rm-body"><div class="cal-top">'+
        '<button class="cal-nav" id="rmCalPrev">‹</button><h4 id="rmCalLabel"></h4>'+
        '<button class="cal-nav" id="rmCalNext">›</button></div>'+
        '<div class="cal-grid" id="rmCalGrid"></div>'+
        '<p class="cal-hint">Andrea reçoit sur rendez-vous. Dimanche fermé.</p></div></div></div>'+
      '<div class="rm" id="rmTime"><div class="rm-box">'+
        '<button class="rm-x" data-rmclose>✕</button>'+
        '<button class="rm-back" id="rmTimeBack">‹ Changer de jour</button>'+
        '<div class="rm-eye">Étape 3 sur 4</div><div class="rm-title">Choisissez l\'heure</div>'+
        '<div class="rm-recap" id="rmTimeR">—</div>'+
        '<div class="rm-body"><div class="slot-grid" id="rmSlots"></div></div></div></div>'+
      '<div class="rm" id="rmForm"><div class="rm-box">'+
        '<button class="rm-x" data-rmclose>✕</button>'+
        '<button class="rm-back" id="rmFormBack">‹ Changer d\'heure</button>'+
        '<div class="rm-eye">Étape 4 sur 4</div><div class="rm-title">Vos coordonnées</div>'+
        '<div class="rm-recap" id="rmFormR">—</div>'+
        '<form class="rm-form rm-body" id="rmFormEl" novalidate>'+
        '<div><label>Nom complet</label><input type="text" id="rmNom" required></div>'+
        '<div><label>Téléphone</label><input type="tel" id="rmTel" required></div>'+
        '<span class="rm-err" id="rmErr">Indiquez votre nom et votre téléphone.</span>'+
        '<label class="rm-check"><input type="checkbox" id="rmRgpd" required>'+
        '<span>J\'accepte d\'être contacté·e par Andrea pour confirmer le rendez-vous.</span></label>'+
        '<button type="submit" class="rm-btn">Envoyer la demande →</button>'+
        '<p class="rm-mini">Annulation gratuite jusqu\'à 24 h avant le rendez-vous.</p>'+
        '</form></div></div>'+
      '<div class="rm" id="rmDone"><div class="rm-box"><div class="rm-done">'+
        '<div class="ic">✓</div><h3>Demande envoyée</h3>'+
        '<p>Andrea a reçu votre demande et vous confirme le créneau sous 24 heures.</p>'+
        '<div class="acts"><a href="index.html" class="a1">Accueil</a>'+
        '<a class="a2" data-rmclose href="#">Fermer</a></div></div></div></div>';
    document.body.appendChild(root);

    var M={soin:I('rmSoin'),info:I('rmInfo'),cal:I('rmCal'),time:I('rmTime'),
           form:I('rmForm'),done:I('rmDone')};
    function I(id){return document.getElementById(id);}
    function closeAll(){for(var k in M)M[k].classList.remove('open');
      document.body.classList.remove('menu-open');}
    function show(n){for(var k in M)M[k].classList.remove('open');
      M[n].classList.add('open');document.body.classList.add('menu-open');}
    root.querySelectorAll('[data-rmclose]').forEach(function(b){
      b.addEventListener('click',function(e){e.preventDefault();closeAll();});});
    for(var k in M)(function(m){
      m.addEventListener('click',function(e){if(e.target===m)closeAll();});})(M[k]);
    document.addEventListener('keydown',function(e){if(e.key==='Escape')closeAll();});

    /* paso 1 · prestación */
    function openBooking(slug){
      var s=null,i;
      for(i=0;i<SOINS.length;i++) if(SOINS[i].sl===slug) s=SOINS[i];
      if(!s) s=SOINS[0];
      st.soin=s;st.treat=null;st.date=null;st.time=null;
      var list=TREAT[s.nm]||[];
      if(list.length<=1){ chooseTreat(list[0]||{nm:s.nm,sub:'',pr:s.pr}); return; }
      I('rmSoinT').textContent=s.nm;
      var box=I('rmSoinList');box.innerHTML='';
      list.forEach(function(t){
        var b=document.createElement('div');
        b.className='pick-row';
        b.innerHTML='<img class="pph" src="'+(t.ph||s.ph)+'" alt="" loading="lazy">'+
          '<span class="ptx"><span class="pn">'+t.nm+'</span>'+
          '<span class="ps">'+t.sub+'</span></span><span class="pp">'+t.pr+'</span>'+
          '<button type="button" class="pick-info" aria-label="En savoir plus">i</button>';
        b.addEventListener('click',function(){chooseTreat(t);});
        b.querySelector('.pick-info').addEventListener('click',function(e){
          e.stopPropagation(); openInfo(t);
        });
        box.appendChild(b);
      });
      show('soin');
    }
    /* pop-up "en savoir plus" de una prestación */
    var infoT=null;
    function openInfo(t){
      infoT=t;
      I('rmInfoPh').src=t.ph||st.soin.ph;
      I('rmInfoT').textContent=t.nm;
      I('rmInfoPr').textContent=t.sub+' · '+t.pr;
      I('rmInfoD').textContent=t.de||'';
      show('info');
    }
    I('rmInfoBack').addEventListener('click',function(){ show('soin'); });
    I('rmInfoGo').addEventListener('click',function(){ if(infoT) chooseTreat(infoT); });
    function chooseTreat(t){
      st.treat=t;I('rmCalT').textContent=t.nm;renderCal();show('cal');
    }
    I('rmCalBack').addEventListener('click',function(){
      var list=TREAT[st.soin.nm]||[];
      if(list.length>1) show('soin'); else closeAll();
    });

    /* paso 2 · calendario */
    var view=new Date();view.setDate(1);
    var today=new Date();today.setHours(0,0,0,0);
    function renderCal(){
      I('rmCalLabel').textContent=MONTHS[view.getMonth()]+' '+view.getFullYear();
      var g=I('rmCalGrid');g.innerHTML='';
      WD.forEach(function(d){var h=document.createElement('div');h.className='cal-wd';
        h.textContent=d;g.appendChild(h);});
      var first=(new Date(view.getFullYear(),view.getMonth(),1).getDay()+6)%7;
      var days=new Date(view.getFullYear(),view.getMonth()+1,0).getDate(),i;
      for(i=0;i<first;i++){var e=document.createElement('div');
        e.className='cal-day empty';g.appendChild(e);}
      for(i=1;i<=days;i++){
        var d=new Date(view.getFullYear(),view.getMonth(),i);
        var btn=document.createElement('button');
        btn.type='button';btn.className='cal-day';btn.textContent=i;
        if(d<today||d.getDay()===0){btn.disabled=true;}
        else{(function(d){btn.addEventListener('click',function(){
          st.date=d;st.dateLabel=d.getDate()+' '+MONTHS[d.getMonth()]+' '+d.getFullYear();
          openTime();});})(d);}
        g.appendChild(btn);
      }
      var mn=new Date();mn.setDate(1);
      I('rmCalPrev').disabled=(view.getFullYear()===mn.getFullYear()&&view.getMonth()===mn.getMonth());
    }
    I('rmCalPrev').addEventListener('click',function(){view.setMonth(view.getMonth()-1);renderCal();});
    I('rmCalNext').addEventListener('click',function(){view.setMonth(view.getMonth()+1);renderCal();});

    /* paso 3 · horario */
    function openTime(){
      I('rmTimeR').textContent=st.treat.nm+' · '+st.dateLabel;
      var box=I('rmSlots');box.innerHTML='';
      SLOTS.forEach(function(t){
        var b=document.createElement('button');
        b.type='button';b.className='slot';b.textContent=t;
        b.addEventListener('click',function(){st.time=t;openForm();});
        box.appendChild(b);
      });
      show('time');
    }
    I('rmTimeBack').addEventListener('click',function(){show('cal');});

    /* paso 4 · formulario */
    function openForm(){
      I('rmFormR').textContent=st.treat.nm+' · '+st.dateLabel+' · '+st.time;
      show('form');
    }
    I('rmFormBack').addEventListener('click',openTime);
    I('rmFormEl').addEventListener('submit',function(e){
      e.preventDefault();
      var nom=I('rmNom').value.trim(),tel=I('rmTel').value.trim(),rg=I('rmRgpd').checked;
      var ok=nom.length>=2&&tel.length>=4&&rg;
      I('rmErr').classList.toggle('on',!ok);
      if(!ok) return;
      var txt='Bonjour Andrea, je souhaite prendre rendez-vous.\n\n'+
        'Spécialité : '+st.soin.nm+'\nPrestation : '+st.treat.nm+'\n'+
        'Lieu : '+st.soin.lu+'\nDate : '+st.dateLabel+'\nHeure : '+st.time+'\n'+
        'Tarif : '+st.treat.pr+'\n\nNom : '+nom+'\nTéléphone : '+tel;
      var subj='Demande de rendez-vous · '+st.soin.nm;
      window.open('mailto:andrea.isabel.agudelo@gmail.com?subject='+encodeURIComponent(subj)+'&body='+encodeURIComponent(txt),'_blank');
      show('done');
      /* redirige a la página d'agradecimiento con info "comment venir" */
      setTimeout(function(){ window.location.href='merci.html'; }, 700);
    });

    /* rejilla de soins (página reservas) */
    var bg=document.getElementById('bookGrid');
    if(bg){
      SOINS.forEach(function(s){
        var b=document.createElement('button');
        b.type='button';b.className='book-card';
        b.innerHTML='<div class="ph"><img src="'+s.ph+'" alt="" loading="lazy"></div>'+
          '<div class="bd"><div class="nm">'+s.nm+'</div><div class="lu">'+s.lu+'</div>'+
          '<div class="pr">'+s.pr+'<span class="go">Réserver →</span></div></div>';
        b.addEventListener('click',function(){openBooking(s.sl);});
        bg.appendChild(b);
      });
    }

    /* disparadores [data-book] en cualquier página */
    document.querySelectorAll('[data-book]').forEach(function(el){
      el.addEventListener('click',function(e){
        e.preventDefault();
        openBooking(el.getAttribute('data-soin')||'podologie');
      });
    });

    /* foto en las tarjetas de tarifs de las páginas de soin (la misma
       del servicio en el popup) */
    var allT=[];
    for(var sp in TREAT) TREAT[sp].forEach(function(t){ allT.push(t); });
    document.querySelectorAll('.svc-card').forEach(function(card){
      if(card.querySelector('.svc-photo')) return;
      var h=card.querySelector('h3'); if(!h) return;
      var nm=h.textContent.trim(),hit=null;
      allT.forEach(function(t){
        if(hit) return;
        if(t.nm===nm||t.nm.indexOf(nm)===0||nm.indexOf(t.nm)===0) hit=t;
      });
      if(hit&&hit.ph){
        var im=document.createElement('img');
        im.className='svc-photo';im.src=hit.ph;im.alt='';im.loading='lazy';
        card.insertBefore(im,card.firstChild);
      }
    });

    /* entrada directa reservas.html?soin=podologie */
    var q=new URLSearchParams(location.search).get('soin');
    if(q) openBooking(q);
  })();
})();

/* Vanta FOG · solo se carga e inicializa en DESKTOP no-touch con suficiente
   CPU/RAM. En móvil/touch ni se descargan Three+Vanta (~250 KB gzip menos)
   y se queda el gradient CSS animado (fogA/fogB) como fondo. */
(function(){
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  /* solo desktop no-tactil: en movil/tactil queda la brume CSS y NO se descargan Three+Vanta */
  if (!window.matchMedia('(min-width: 901px)').matches) return;
  if (window.matchMedia('(pointer: coarse)').matches) return;
  var el = document.getElementById('hero-glow');
  if (!el) return;

  function loadScript(src){
    return new Promise(function(res, rej){
      var s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  function initVanta(){
    loadScript('assets/three.min.js')
    .then(function(){ return loadScript('assets/vanta.fog.min.js'); })
    .then(function(){
      if (typeof VANTA === 'undefined' || !VANTA.FOG) return;
      try {
        var fog = VANTA.FOG({
          el: el,
          mouseControls: false,
          touchControls: false,
          gyroControls: false,
          minHeight: 200,
          minWidth: 200,
          scale: 1,
          scaleMobile: 1,
          highlightColor: 0xc9b687,
          midtoneColor: 0x9c8c6a,
          lowlightColor: 0x6e7463,
          baseColor: 0x352a1f,
          blurFactor: 0.4,
          speed: 0.7,
          zoom: 1.4
        });
        if (!fog) return;
        /* única optimización: pixelRatio=1 evita que en pantallas con DPR>1
           el canvas físico se multiplique. */
        try {
          if (fog.renderer && fog.renderer.setPixelRatio) {
            fog.renderer.setPixelRatio(1);
            if (fog.onResize) fog.onResize();
          }
        } catch(e){}
        el.classList.add('has-vanta');

        function pauseFog(){
          if (fog.req){ cancelAnimationFrame(fog.req); fog.req = null; }
        }
        function resumeFog(){
          if (!fog.req && fog.animate){ fog.animate(); }
        }
        if ('IntersectionObserver' in window){
          var io = new IntersectionObserver(function(es){
            es.forEach(function(e){ e.isIntersecting ? resumeFog() : pauseFog(); });
          });
          io.observe(el);
        }
        document.addEventListener('visibilitychange', function(){
          if (document.hidden) pauseFog();
          else resumeFog();
        });
      } catch(e){}
    })
    .catch(function(){});
  }

  /* diferido: el fog arranca tras el render (idle), nunca bloquea el primer pintado */
  var startFog = function(){
    if (document.readyState !== 'loading') initVanta();
    else document.addEventListener('DOMContentLoaded', initVanta);
  };
  if ('requestIdleCallback' in window) requestIdleCallback(startFog, { timeout: 2500 });
  else setTimeout(startFog, 1200);
})();
