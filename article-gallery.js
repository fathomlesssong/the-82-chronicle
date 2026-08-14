(()=>{
  const links=[...document.querySelectorAll('[data-gallery-image]')];
  if(!links.length||typeof HTMLDialogElement==='undefined')return;

  const dialog=document.createElement('dialog');
  dialog.className='article-gallery-dialog';
  dialog.innerHTML=`
    <div class="article-gallery-dialog-inner">
      <button type="button" class="article-gallery-dialog-close" aria-label="Zamknij">×</button>
      <img alt="">
      <div class="article-gallery-dialog-text">
        <div data-dialog-caption></div>
        <div class="article-gallery-dialog-credit" data-dialog-credit></div>
      </div>
    </div>`;

  document.body.appendChild(dialog);

  const image=dialog.querySelector('img');
  const caption=dialog.querySelector('[data-dialog-caption]');
  const credit=dialog.querySelector('[data-dialog-credit]');
  const close=dialog.querySelector('.article-gallery-dialog-close');

  const hide=()=>{
    if(dialog.open)dialog.close();
  };

  links.forEach(link=>link.addEventListener('click',event=>{
    event.preventDefault();

    image.src=link.href;
    image.alt=link.dataset.galleryAlt||'';
    caption.textContent=link.dataset.galleryCaption||'';
    credit.textContent=link.dataset.galleryCredit||'';

    caption.hidden=!caption.textContent;
    credit.hidden=!credit.textContent;

    dialog.showModal();
  }));

  close.addEventListener('click',hide);

  dialog.addEventListener('click',event=>{
    if(event.target===dialog)hide();
  });
})();
