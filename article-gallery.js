(()=>{
  if(typeof HTMLDialogElement==='undefined')return;

  let links=[];
  let currentIndex=0;
  let touchStartX=null;

  const dialog=document.createElement('dialog');
  dialog.className='article-gallery-dialog';

  dialog.innerHTML=`
    <div class="article-gallery-dialog-inner">
      <button
        type="button"
        class="article-gallery-dialog-close"
        aria-label="Zamknij"
      >×</button>

      <button
        type="button"
        class="article-gallery-dialog-nav article-gallery-dialog-prev"
        aria-label="Poprzednie zdjęcie"
      >‹</button>

      <img alt="">

      <button
        type="button"
        class="article-gallery-dialog-nav article-gallery-dialog-next"
        aria-label="Następne zdjęcie"
      >›</button>

      <div class="article-gallery-dialog-text">
        <div data-dialog-caption></div>
        <div
          class="article-gallery-dialog-credit"
          data-dialog-credit
        ></div>
        <div
          class="article-gallery-dialog-counter"
          data-dialog-counter
        ></div>
      </div>
    </div>`;

  document.body.appendChild(dialog);

  const image=dialog.querySelector('img');
  const caption=dialog.querySelector('[data-dialog-caption]');
  const credit=dialog.querySelector('[data-dialog-credit]');
  const counter=dialog.querySelector('[data-dialog-counter]');
  const close=dialog.querySelector('.article-gallery-dialog-close');
  const prev=dialog.querySelector('.article-gallery-dialog-prev');
  const next=dialog.querySelector('.article-gallery-dialog-next');

  const refreshLinks=()=>{
    links=[...document.querySelectorAll('[data-gallery-image]')];
    return links;
  };

  const render=index=>{
    refreshLinks();
    if(!links.length)return;

    currentIndex=(index+links.length)%links.length;

    const link=links[currentIndex];

    image.src=link.href;
    image.alt=link.dataset.galleryAlt||'';

    caption.textContent=link.dataset.galleryCaption||'';
    credit.textContent=link.dataset.galleryCredit||'';
    counter.textContent=`${currentIndex+1} / ${links.length}`;

    caption.hidden=!caption.textContent;
    credit.hidden=!credit.textContent;

    const hideNavigation=links.length<2;
    prev.hidden=hideNavigation;
    next.hidden=hideNavigation;
  };

  const showLink=link=>{
    refreshLinks();
    const index=links.indexOf(link);
    if(index<0)return;

    render(index);

    if(!dialog.open)dialog.showModal();
  };

  const hide=()=>{
    if(dialog.open)dialog.close();
  };

  const previous=()=>render(currentIndex-1);
  const nextImage=()=>render(currentIndex+1);

  document.addEventListener('click',event=>{
    const link=event.target.closest?.('[data-gallery-image]');
    if(!link)return;

    event.preventDefault();
    showLink(link);
  });

  prev.addEventListener('click',event=>{
    event.stopPropagation();
    previous();
  });

  next.addEventListener('click',event=>{
    event.stopPropagation();
    nextImage();
  });

  close.addEventListener('click',event=>{
    event.stopPropagation();
    hide();
  });

  dialog.addEventListener('click',event=>{
    if(event.target===dialog)hide();
  });

  document.addEventListener('keydown',event=>{
    if(!dialog.open)return;

    if(event.key==='ArrowLeft'){
      event.preventDefault();
      previous();
    }

    if(event.key==='ArrowRight'){
      event.preventDefault();
      nextImage();
    }
  });

  dialog.addEventListener('touchstart',event=>{
    touchStartX=event.changedTouches[0]?.clientX??null;
  },{passive:true});

  dialog.addEventListener('touchend',event=>{
    if(touchStartX===null)return;

    const touchEndX=event.changedTouches[0]?.clientX??touchStartX;
    const distance=touchEndX-touchStartX;

    touchStartX=null;

    if(Math.abs(distance)<50)return;

    if(distance<0)nextImage();
    else previous();
  },{passive:true});
})();
