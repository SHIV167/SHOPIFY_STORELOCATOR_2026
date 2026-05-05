import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const shop = searchParams.get('shop') || '';

  const host = process.env.HOST || '';
  const api = `${host.replace(/\/$/, '')}/api/public/locations?shop=${encodeURIComponent(shop)}`;

  const js = `(function(){
  var SHOP = ${JSON.stringify(shop)};
  var API = ${JSON.stringify(api)};

  function el(tag, attrs, children){
    var n = document.createElement(tag);
    if(attrs){
      Object.keys(attrs).forEach(function(k){
        if(k==='style') Object.assign(n.style, attrs[k]);
        else if(k==='className') n.className = attrs[k];
        else n.setAttribute(k, attrs[k]);
      });
    }
    (children||[]).forEach(function(c){
      if(typeof c==='string') n.appendChild(document.createTextNode(c));
      else if(c) n.appendChild(c);
    });
    return n;
  }

  function ensureContainer(){
    var id='sl-store-locator-root';
    var root=document.getElementById(id);
    if(root) return root;

    root=el('div',{id:id});

    var mount = document.querySelector('[data-store-locator]') || document.querySelector('main') || document.body;
    mount.insertBefore(root, mount.firstChild);
    return root;
  }

  function injectStyles(){
    if(document.getElementById('sl-store-locator-style')) return;
    var css = 
      '.sl-wrap{padding:2rem 0;max-width:1200px;margin:0 auto;font-family:system-ui, sans-serif;}' +
      '.sl-title{text-align:center;margin-bottom:2rem;font-size:28px;}' +
      '.sl-grid{display:flex;flex-wrap:wrap;justify-content:center;gap:1.5rem;}' +
      '.sl-card{background:#fff;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;width:calc(33.33% - 1rem);min-width:280px;box-shadow:0 2px 4px rgba(0,0,0,0.1);display:flex;flex-direction:column;}' +
      '.sl-img{width:100%;height:auto;overflow:hidden;}' +
      '.sl-img img{width:100%;height:100%;object-fit:cover;display:block;}' +
      '.sl-info{padding:1rem;flex-grow:1;display:flex;flex-direction:column;}' +
      '.sl-info h3{margin:0 0 .5rem 0;}' +
      '.sl-info p{margin:.15rem 0;color:#111;}' +
      '.sl-actions{display:flex;justify-content:space-between;margin-top:auto;gap:.5rem;}' +
      '.sl-btn{display:inline-block;padding:.75rem 1rem;background:#4CAF50;color:#fff;text-decoration:none;border-radius:4px;font-size:.9rem;transition:background-color .3s ease;text-align:center;flex:1;}' +
      '.sl-btn:hover{background:#45a049;}' +
      '@media (max-width:768px){.sl-card{width:calc(50% - .75rem);}}' +
      '@media (max-width:480px){.sl-card{width:100%;}.sl-actions{flex-direction:column;}}';

    var style = document.createElement('style');
    style.id='sl-store-locator-style';
    style.textContent=css;
    document.head.appendChild(style);
  }

  function render(locations){
    var root=ensureContainer();
    injectStyles();

    root.innerHTML='';

    var wrap=el('div',{className:'sl-wrap'},[]);
    wrap.appendChild(el('h2',{className:'sl-title'},['Our Stores']));

    var grid=el('div',{className:'sl-grid'},[]);

    locations.forEach(function(loc){
      var card=el('div',{className:'sl-card'},[]);

      if(loc.imageUrl){
        var imgWrap=el('div',{className:'sl-img'},[]);
        var img=el('img',{src:loc.imageUrl,alt:loc.name || 'Store',loading:'lazy'},[]);
        imgWrap.appendChild(img);
        card.appendChild(imgWrap);
      }

      var info=el('div',{className:'sl-info'},[]);
      info.appendChild(el('h3',null,[loc.name || 'Store']));
      info.appendChild(el('p',null,[loc.address || '']));
      if(loc.phone) info.appendChild(el('p',null,[loc.phone]));

      var actions=el('div',{className:'sl-actions'},[]);

      if(loc.mapUrl){
        actions.appendChild(el('a',{className:'sl-btn',href:loc.mapUrl,target:'_blank',rel:'noopener noreferrer'},['View on Map']));
      }

      if(loc.latitude && loc.longitude){
        var dir='https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(loc.latitude+','+loc.longitude);
        actions.appendChild(el('a',{className:'sl-btn',href:dir,target:'_blank',rel:'noopener noreferrer'},['Get Directions']));
      }

      if(actions.childNodes.length) info.appendChild(actions);
      card.appendChild(info);
      grid.appendChild(card);
    });

    wrap.appendChild(grid);
    root.appendChild(wrap);
  }

  function boot(){
    var path = window.location.pathname || '';
    if(path !== '/pages/store-locator' && path !== '/pages/store-locator/' && !document.querySelector('[data-store-locator]')){
      return;
    }

    fetch(API).then(function(r){
      if(!r.ok) throw new Error('Failed to load locations');
      return r.json();
    }).then(function(data){
      var locations = (data && data.locations) ? data.locations : [];
      render(locations);
    }).catch(function(err){
      var root=ensureContainer();
      root.innerHTML = '<div class="sl-wrap"><h2 class="sl-title">Our Stores</h2><p>Failed to load store locations.</p></div>';
    });
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();`;

  const res = new NextResponse(js, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });

  return res;
}
