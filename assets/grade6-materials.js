'use strict';

(() => {
  const files = [
    { title: 'Deniz Dalgaları', path: 'assets/materials/grade6/deniz-dalgalari.mp4', download: 'Deniz Dalgaları.mp4', type: 'Video', format: 'MP4', bytes: 2497123 },
    { title: 'Orman 1', path: 'assets/materials/grade6/orman-1.mp4', download: 'Orman 1.mp4', type: 'Video', format: 'MP4', bytes: 47544193 },
    { title: 'Orman 2', path: 'assets/materials/grade6/orman-2.mp4', download: 'Orman 2.mp4', type: 'Video', format: 'MP4', bytes: 8716703 },
    { title: 'Ormanda yürüme', path: 'assets/materials/grade6/ormanda-yurume.mp4', download: 'Ormanda yürüme video.mp4', type: 'Video', format: 'MP4', bytes: 13362036 },
    { title: 'Deniz dalga sesi', path: 'assets/materials/grade6/deniz-dalga-sesi.mp3', download: 'Deniz dalga sesi.mp3', type: 'Ses', format: 'MP3', bytes: 789942 },
    { title: 'Kuş sesi', path: 'assets/materials/grade6/kus-sesi.mp3', download: 'Kuş sesi.mp3', type: 'Ses', format: 'MP3', bytes: 1603584 },
    { title: 'Doğada yürüme sesi', path: 'assets/materials/grade6/dogada-yurume-sesi.mp3', download: 'Doğada yürüme sesi.mp3', type: 'Ses', format: 'MP3', bytes: 586752 }
  ];
  const section = document.createElement('section');
  section.id = 'grade6Materials';
  section.className = 'materials6';
  section.hidden = true;
  section.setAttribute('aria-labelledby', 'grade6MaterialsTitle');
  section.innerHTML = `
    <div class="materials6-heading">
      <div><span class="materials6-label">6. SINIF</span><h2 id="grade6MaterialsTitle">Video materyalleri</h2><p>Video düzenleme etkinliklerinde kullanmak için videoları ve sesleri indir.</p></div>
      <span class="materials6-count">${files.filter(file => file.type === 'Video').length} video · ${files.filter(file => file.type === 'Ses').length} ses</span>
    </div>
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
