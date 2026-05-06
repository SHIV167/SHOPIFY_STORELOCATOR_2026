import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const shop = searchParams.get('shop') || '';

  const host = process.env.HOST || '';
  const api = `${host.replace(/\/$/, '')}/api/public/locations?shop=${encodeURIComponent(shop)}`;
  const sliderApi = `${host.replace(/\/$/, '')}/api/public/slider-images?shop=${encodeURIComponent(shop)}`;

  const js = `(function(){
  var SHOP = ${JSON.stringify(shop)};
  var API = ${JSON.stringify(api)};
  var SLIDER_API = ${JSON.stringify(sliderApi)};

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
      '@media (max-width:480px){.sl-card{width:100%;}.sl-actions{flex-direction:column;}}' +

      /* Slider styles */ +
      '.sl-slider{position:relative;width:100%;max-width:1200px;margin:0 auto 2rem auto;overflow:hidden;border-radius:12px;}' +
      '.sl-slider-track{display:flex;transition:transform .5s ease;}' +
      '.sl-slide{min-width:100%;position:relative;}' +
      '.sl-slide picture,.sl-slide img{width:100%;height:auto;display:block;}' +
      '.sl-slide a{display:block;}' +
      '.sl-slider-nav{position:absolute;top:50%;transform:translateY(-50%);width:40px;height:40px;border-radius:50%;border:none;background:rgba(255,255,255,.85);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 6px rgba(0,0,0,.2);z-index:10;}' +
      '.sl-slider-nav:hover{background:#fff;}' +
      '.sl-slider-prev{left:12px;}' +
      '.sl-slider-next{right:12px;}' +
      '.sl-slider-dots{position:absolute;bottom:12px;left:50%;transform:translateX(-50%);display:flex;gap:8px;z-index:10;}' +
      '.sl-slider-dot{width:10px;height:10px;border-radius:50%;border:none;background:rgba(255,255,255,.6);cursor:pointer;}' +
      '.sl-slider-dot.active{background:#fff;}' +
      '@media (max-width:768px){.sl-slider{border-radius:8px;}.sl-slider-nav{width:32px;height:32px;font-size:14px;}}';

    var style = document.createElement('style');
    style.id='sl-store-locator-style';
    style.textContent=css;
    document.head.appendChild(style);
  }

  function createSlider(images){
    if(!images || !images.length) return null;
    var current = 0;
    var autoplayTimer = null;

    var slider = el('div',{className:'sl-slider'},[]);
    var track = el('div',{className:'sl-slider-track'},[]);

    images.forEach(function(img, idx){
      var slide = el('div',{className:'sl-slide'},[]);
      var link = img.linkUrl ? el('a',{href:img.linkUrl,target:'_blank'},[]) : null;
      var picture = el('picture',{},[]);
      var sourceDesktop = el('source',{media:'(min-width:769px)',srcset:img.desktopImageUrl},[]);
      var sourceMobile = el('source',{media:'(max-width:768px)',srcset:img.mobileImageUrl},[]);
      var imgEl = el('img',{src:img.desktopImageUrl,alt:img.altText || 'Store slider',loading: idx===0 ? 'eager' : 'lazy'},[]);
      picture.appendChild(sourceDesktop);
      picture.appendChild(sourceMobile);
      picture.appendChild(imgEl);
      if(link){ link.appendChild(picture); slide.appendChild(link); }
      else{ slide.appendChild(picture); }
      track.appendChild(slide);
    });

    slider.appendChild(track);

    var dots = el('div',{className:'sl-slider-dots'},[]);
    var dotEls = [];
    images.forEach(function(_, idx){
      var dot = el('button',{className:'sl-slider-dot'+(idx===0?' active':'')},[]);
      dot.addEventListener('click',function(){ goTo(idx); });
      dots.appendChild(dot);
      dotEls.push(dot);
    });
    slider.appendChild(dots);

    var prevBtn = el('button',{className:'sl-slider-nav sl-slider-prev'},['<']);
    var nextBtn = el('button',{className:'sl-slider-nav sl-slider-next'},['>']);
    prevBtn.addEventListener('click',function(){ goTo(current-1); });
    nextBtn.addEventListener('click',function(){ goTo(current+1); });
    slider.appendChild(prevBtn);
    slider.appendChild(nextBtn);

    function goTo(idx){
      current = ((idx % images.length) + images.length) % images.length;
      track.style.transform = 'translateX(-' + (current * 100) + '%)';
      dotEls.forEach(function(d,i){ d.classList.toggle('active', i===current); });
      resetAutoplay();
    }

    function resetAutoplay(){
      if(autoplayTimer) clearInterval(autoplayTimer);
      autoplayTimer = setInterval(function(){ goTo(current+1); }, 5000);
    }

    // Touch swipe
    var startX = 0;
    var isDragging = false;
    slider.addEventListener('touchstart',function(e){ startX = e.touches[0].clientX; isDragging = true; },{passive:true});
    slider.addEventListener('touchend',function(e){
      if(!isDragging) return;
      isDragging = false;
      var diff = startX - e.changedTouches[0].clientX;
      if(Math.abs(diff) > 40) goTo(diff > 0 ? current+1 : current-1);
    },{passive:true});

    resetAutoplay();
    return slider;
  }

  function render(locations, sliderImages){
    var root=ensureContainer();
    injectStyles();

    root.innerHTML='';

    var wrap=el('div',{className:'sl-wrap'},[]);

    // Slider
    if(sliderImages && sliderImages.length){
      var slider = createSlider(sliderImages);
      if(slider) wrap.appendChild(slider);
    }

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

    Promise.all([
      fetch(API).then(function(r){ return r.ok ? r.json() : null; }),
      fetch(SLIDER_API).then(function(r){ return r.ok ? r.json() : null; })
    ]).then(function(results){
      var locations = (results[0] && results[0].locations) ? results[0].locations : [];
      var sliderImages = (results[1] && results[1].images) ? results[1].images : [];
      render(locations, sliderImages);
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
