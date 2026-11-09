'use strict';

(() => {
  const files = [
    { title: 'Zemin Fırçası: Ekle · Boya · Sil', path: 'assets/materials/grade8/kodu-game-lab/zemin-fircasi.png', download: 'Kodu_Game_Lab_Zemin_Fircasi.png', bytes: 2073344 },
    { title: 'Tepe, Çukur ve Düzgün Zemin', path: 'assets/materials/grade8/kodu-game-lab/tepe-cukur-duzgun-zemin.png', download: 'Kodu_Game_Lab_Tepe_Cukur_Duzgun_Zemin.png', bytes: 2003835 },
    { title: 'Havuz, Su ve Balık Ekleme', path: 'assets/materials/grade8/kodu-game-lab/havuz-su-balik.png', download: 'Kodu_Game_Lab_Havuz_Su_Balik.png', bytes: 2129620 }
  ];
  const board = document.createElement('section');
  board.id = 'grade8Materials';
  board.className = 'presentations materials8';
  board.hidden = true;
  board.setAttribute('aria-labelledby', 'grade8MaterialsTitle');
  board.innerHTML = `
    <div class="presentations-heading">
      <div><span class="presentations-label">8. SINIF</span><h2 id="grade8MaterialsTitle">8. sınıf materyalleri</h2><p>Ders sırasında kullanabileceğin görsel rehberleri açabilir veya indirebilirsin.</p></div>
      <span class="presentations-count">3 görsel</span>
    </div>
    <h3 class="materials8-topic">Kodu Game Lab</h3>
    <div class="materials8-grid">${files.map(file => `
      <article class="presentation-card materials8-card">
        <a class="materials8-preview" href="${file.path}" target="_blank" rel="noopener" aria-label="${esc(file.title)} görselini büyüt">
          <img src="${file.path}" alt="Kodu Game Lab — ${esc(file.title)} ders rehberi" width="1024" height="1536" loading="lazy" decoding="async">
        </a>
        <div class="materials8-details">
          <h4>${esc(file.title)}</h4>
          <span class="presentation-size">PNG · ${(file.bytes / 1000000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} MB</span>
          <div class="presentation-actions">
            <a class="btn" href="${file.path}" target="_blank" rel="noopener" aria-label="${esc(file.title)} görselini aç">Görseli aç ↗</a>
            <a class="btn primary" href="${file.path}" download="${file.download}" aria-label="${esc(file.title)} indir">İndir ↓</a>
          </div>
        </div>
      </article>`).join('')}
    </div>
    <div id="grade8Week9" hidden>
      <h3 class="materials8-topic" style="margin-top:24px">9. hafta · Kodu Game Lab</h3>
      <div class="materials8-grid">
        <article class="presentation-card materials8-card">
          <a class="materials8-preview" href="assets/materials/grade8/kodu-game-lab/fuzeli-hedef-atisi.png" target="_blank" rel="noopener" aria-label="Füzeli Hedef Atışı görselini büyüt">
            <img src="assets/materials/grade8/kodu-game-lab/fuzeli-hedef-atisi.png" alt="Füzeli Hedef Atışı ders rehberi" width="1024" height="1536" loading="lazy" decoding="async">
          </a>
          <div class="materials8-details"><h4>Füzeli Hedef Atışı</h4><span class="presentation-size">PNG · 1,9 MB</span><div class="presentation-actions">
            <a class="btn" href="assets/materials/grade8/kodu-game-lab/fuzeli-hedef-atisi.png" target="_blank" rel="noopener">Görseli aç ↗</a>
            <a class="btn primary" href="assets/materials/grade8/kodu-game-lab/fuzeli-hedef-atisi.png" download="Kodu_Game_Lab_Fuzeli_Hedef_Atisi.png">İndir ↓</a>
          </div></div>
        </article>
      </div>
    </div>`;
  const presentations = document.getElementById('sunumlar');
  if (presentations) presentations.after(board);
  else document.getElementById('grid').before(board);
  const previousRender = render;
  render = function () {
    previousRender();
    board.hidden = !['7', '8'].includes(gradeFilter);
    if (!board.hidden) {
      board.querySelector('.presentations-label').textContent = `${gradeFilter}. SINIF`;
      board.querySelector('#grade8MaterialsTitle').textContent = gradeFilter === '7' ? '7. sınıf · 9. hafta materyalleri' : '8. sınıf materyalleri';
      board.querySelector('#grade8Week9').hidden = gradeFilter !== '8';
      board.querySelector('.presentations-count').textContent = gradeFilter === '8' ? '4 görsel' : '3 görsel';
    }
  };
  render();
})();
