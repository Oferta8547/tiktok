/* ReformaMax — depoimentos: foto e vídeo em tela cheia.
   Porte do mecanismo usado na loja de capacetes (nrskVideoModal + lightbox de imagem).
   Vanilla JS com delegação de evento: funciona no HTML pré-renderizado e depois do hydrate. */
(function () {
  'use strict';
  if (window.__rmxMediaInit) return;
  window.__rmxMediaInit = true;

  var videoModal, modalVideo, modalSource, modalAvatar, modalName, modalText;
  var imgModal, imgEl, imgAvatar, imgName, imgText;

  function el(tag, css, html) {
    var n = document.createElement(tag);
    if (css) n.style.cssText = css;
    if (html != null) n.innerHTML = html;
    return n;
  }

  var CLOSE_CSS = 'position:fixed;top:16px;right:16px;background:none;border:none;color:#fff;' +
    'font-size:32px;cursor:pointer;width:44px;height:44px;display:flex;align-items:center;' +
    'justify-content:center;z-index:100000;line-height:1;text-shadow:0 1px 6px rgba(0,0,0,.9);';

  function build() {
    /* ---------- modal de vídeo ---------- */
    videoModal = el('div', 'display:none;position:fixed;top:0;left:0;width:100%;height:100%;' +
      'background:rgba(0,0,0,.95);z-index:99999;justify-content:center;align-items:center;' +
      'padding:70px 16px 20px;overflow-y:auto;');
    videoModal.id = 'rmxVideoModal';
    videoModal.innerHTML =
      '<button type="button" data-rmx-close style="' + CLOSE_CSS + '" aria-label="Fechar">\u2715</button>' +
      '<div style="position:relative;max-width:420px;width:100%;margin:auto;">' +
        '<div style="width:100%;aspect-ratio:9/16;background:#000;border-radius:10px;overflow:hidden;">' +
          '<video id="rmxModalVideo" style="width:100%;height:100%;display:block;object-fit:contain;" playsinline controls>' +
            '<source src="" type="video/mp4">' +
          '</video>' +
        '</div>' +
        '<div style="background:#111;padding:14px;border-radius:0 0 10px 10px;margin-top:-2px;">' +
          '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">' +
            '<img id="rmxModalAvatar" src="" alt="" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0;">' +
            '<span id="rmxModalName" style="color:#fff;font-weight:600;font-size:14px;"></span>' +
          '</div>' +
          '<p id="rmxModalText" style="color:rgba(255,255,255,.85);font-size:13px;line-height:1.5;margin:0;"></p>' +
        '</div>' +
      '</div>';
    document.body.appendChild(videoModal);

    modalVideo  = videoModal.querySelector('#rmxModalVideo');
    modalSource = videoModal.querySelector('source');
    modalAvatar = videoModal.querySelector('#rmxModalAvatar');
    modalName   = videoModal.querySelector('#rmxModalName');
    modalText   = videoModal.querySelector('#rmxModalText');

    /* ---------- lightbox de imagem ---------- */
    imgModal = el('div', 'display:none;position:fixed;top:0;left:0;width:100%;height:100%;' +
      'background:rgba(0,0,0,.95);z-index:99999;justify-content:center;align-items:center;' +
      'padding:70px 16px 20px;overflow-y:auto;');
    imgModal.id = 'rmxImgModal';
    imgModal.innerHTML =
      '<button type="button" data-rmx-close style="' + CLOSE_CSS + '" aria-label="Fechar">\u2715</button>' +
      '<div style="position:relative;max-width:420px;width:100%;margin:auto;">' +
        '<div style="width:100%;background:#000;border-radius:10px 10px 0 0;overflow:hidden;' +
        'display:flex;align-items:center;justify-content:center;">' +
          '<img id="rmxModalImg" src="" alt="Foto ampliada" style="width:100%;max-height:70vh;' +
          'object-fit:contain;display:block;">' +
        '</div>' +
        '<div style="background:#111;padding:14px;border-radius:0 0 10px 10px;margin-top:-2px;">' +
          '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">' +
            '<img id="rmxImgAvatar" src="" alt="" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0;">' +
            '<span id="rmxImgName" style="color:#fff;font-weight:600;font-size:14px;"></span>' +
          '</div>' +
          '<p id="rmxImgText" style="color:rgba(255,255,255,.85);font-size:13px;line-height:1.5;margin:0;"></p>' +
        '</div>' +
      '</div>';
    document.body.appendChild(imgModal);
    imgEl      = imgModal.querySelector('#rmxModalImg');
    imgAvatar  = imgModal.querySelector('#rmxImgAvatar');
    imgName    = imgModal.querySelector('#rmxImgName');
    imgText    = imgModal.querySelector('#rmxImgText');
  }

  var built = false;
  function ensureBuilt() { if (!built) { built = true; build(); } }

  function openVideo(src, avatar, name, text) {
    ensureBuilt();
    modalSource.src = src;
    modalVideo.load();
    if (avatar) { modalAvatar.src = avatar; modalAvatar.style.display = ''; }
    else { modalAvatar.removeAttribute('src'); modalAvatar.style.display = 'none'; }
    modalName.textContent = name || '';
    modalText.textContent = text || '';
    videoModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    var p = modalVideo.play(); if (p && p.catch) p.catch(function () {});
  }

  function openImage(src, avatar, name, text) {
    ensureBuilt();
    imgEl.src = src;
    if (avatar) { imgAvatar.src = avatar; imgAvatar.style.display = ''; }
    else { imgAvatar.removeAttribute('src'); imgAvatar.style.display = 'none'; }
    imgName.textContent = name || '';
    imgText.textContent = text || '';
    imgModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeAll() {
    if (videoModal && videoModal.style.display !== 'none') {
      videoModal.style.display = 'none';
      modalVideo.pause();
      try { modalVideo.currentTime = 0; } catch (e) {}
    }
    if (imgModal) imgModal.style.display = 'none';
    document.body.style.overflow = '';
  }

  function onClick(ev) {
    var t = ev.target;

    if (t.closest && t.closest('[data-rmx-close]')) { ev.stopPropagation(); closeAll(); return; }
    if (t === videoModal || t === imgModal) { closeAll(); return; }
    if (imgModal && imgModal.contains(t)) return;
    if (videoModal && videoModal.contains(t)) return;

    var v = t.closest && t.closest('.rmx-video-wrapper');
    if (v) {
      ev.preventDefault();
      openVideo(v.getAttribute('data-src'), v.getAttribute('data-avatar'),
                v.getAttribute('data-name'), v.getAttribute('data-text'));
      return;
    }
    var i = t.closest && t.closest('.rmx-img-thumb');
    if (i) {
      ev.preventDefault();
      openImage(i.getAttribute('data-src'), i.getAttribute('data-avatar'),
                i.getAttribute('data-name'), i.getAttribute('data-text'));
    }
  }

  function init() {
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
