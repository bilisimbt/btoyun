'use strict';

(() => {
  const files = [
    { title: '1. Sahne', path: 'assets/materials/grade6/week9/1-sahne.mp4', download: '1.sahne.mp4', type: 'Video', format: 'MP4', bytes: 1500553 },
    { title: '2. Sahne', path: 'assets/materials/grade6/week9/2-sahne.mp4', download: '2.sahne.mp4', type: 'Video', format: 'MP4', bytes: 1355113 },
    { title: '3. Sahne', path: 'assets/materials/grade6/week9/3-sahne.mp4', download: '3.sahne.mp4', type: 'Video', format: 'MP4', bytes: 1657451 },
    { title: '4. Sahne', path: 'assets/materials/grade6/week9/4-sahne.mp4', download: '4.sahne.mp4', type: 'Video', format: 'MP4', bytes: 1705172 },
    { title: '5. Sahne', path: 'assets/materials/grade6/week9/5-sahne.mp4', download: '5.sahne.mp4', type: 'Video', format: 'MP4', bytes: 1461806 },
    { title: 'Okul Yolunda Bir İyilik', path: 'assets/materials/grade6/week9/okul-yolunda-bir-iyilik.mp4', download: 'Okul Yolunda Bir İyilik - Hadisli.mp4', type: 'Video', format: 'MP4', bytes: 6787602 }
  ];
  const section = document.createElement('section');
  section.id = 'grade6Materials';
  section.className = 'materials6';
  section.hidden = true;
  section.setAttribute('aria-labelledby', 'grade6MaterialsTitle');
  section.innerHTML = `
    <div class="materials6-heading">
      <div><span class="materials6-label">6. SINIF</span><h2 id="grade6MaterialsTitle">9. hafta video materyalleri</h2><p>Etkinlik videolarını indir.</p></div>
      <span class="materials6-count">${files.length} video</span>
    </div>
    <blockquote class="materials6-quote">“İmanın yetmiş küsur şubesi vardır. Bunların en üstünü ‘Lâ ilâhe illallah’ sözüdür. En alt derecesi ise yoldaki eziyet veren şeyleri kaldırmaktır. Hayâ da imanın bir şubesidir.”</blockquote>
    <div class="materials6-grid">${files.map(file => `
      <article class="materials6-card">
        <span class="materials6-icon" aria-hidden="true">${file.type === 'Video' ? '🎬' : '🎧'}</span>
        <span class="materials6-type">${file.type}</span>
        <h3>${esc(file.title)}</h3>
        <p>${file.format} · ${(file.bytes / 1000000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} MB</p>
        <a class="btn primary materials6-download" href="${file.path}" download="${esc(file.download)}" aria-label="${esc(file.title)} indir">İndir <span aria-hidden="true">↓</span></a>
      </article>`).join('')}
    </div>`;
  const weekControls = document.querySelector('.week-controls');
  if (weekControls) weekControls.insertAdjacentElement('afterend', section);
  else document.getElementById('grid').before(section);
  const previousRender = render;
  render = function () {
    previousRender();
    section.hidden = gradeFilter !== '6';
  };
  render();
})();
