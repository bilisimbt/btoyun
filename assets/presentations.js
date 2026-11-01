'use strict';

(() => {
  const materials = [
    { grade: '6', week: 8, title: 'Video Planlama ve Senaryo', description: 'Ders sunumu', format: 'PPTX', bytes: 15900965, path: 'assets/presentations/grade6/week8/video-planlama-ve-senaryo.pptx', download: 'Video_Planlama_ve_Senaryo.pptx' },
    { grade: '6', week: 8, title: 'Video Senaryosu Örnekleri', description: 'Senaryo çalışmaları · 4 sayfa', format: 'PDF', bytes: 4039455, path: 'assets/presentations/grade6/week8/video-senaryosu-ornekleri.pdf', download: 'Video_Senaryosu_Ornekleri.pdf' }
  ];
  const board = document.createElement('section');
  board.id = 'sunumlar';
  board.className = 'presentations';
  board.hidden = true;
  board.setAttribute('aria-labelledby', 'presentationsTitle');
  const anchor = document.getElementById('grade6Materials') || document.querySelector('#activities > .week-controls') || document.querySelector('.library-controls');
  if (anchor) anchor.before(board);
  else document.getElementById('grid').before(board);
  let renderedGrade;
  function renderBoard() {
    const grade = String(gradeFilter);
    board.hidden = !['5', '6', '7', '8'].includes(grade);
    if (board.hidden || renderedGrade === grade) return;
    renderedGrade = grade;
    const files = materials.filter(file => file.grade === grade);
    const weeks = [...new Set(files.map(file => file.week))].sort((a, b) => b - a);
    board.innerHTML = `
      <div class="presentations-heading">
        <div><span class="presentations-label">${esc(grade)}. SINIF</span><h2 id="presentationsTitle">Sunumlar</h2><p>Ders sunumlarını ve PDF dosyalarını haftalarına göre bulabilirsin.</p></div>
        <span class="presentations-count">${files.length} dosya</span>
      </div>
      ${files.length ? weeks.map(week => `
        <div class="presentations-week"><h3>${week}. hafta</h3>
          <div class="presentations-grid">${files.filter(file => file.week === week).map(file => `
            <article class="presentation-card">
              <span class="presentation-format">${file.format}</span>
              <h4>${esc(file.title)}</h4>
              <p>${esc(file.description)}</p>
              <span class="presentation-size">${(file.bytes / 1000000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} MB</span>
              <div class="presentation-actions">
                ${file.format === 'PDF' ? `<a class="btn" href="${file.path}" target="_blank" rel="noopener" aria-label="${esc(file.title)} PDF aç">PDF aç ↗</a>` : ''}
                <a class="btn primary" href="${file.path}" download="${esc(file.download)}" aria-label="${esc(file.title)} indir">${file.format} indir ↓</a>
              </div>
            </article>`).join('')}</div>
        </div>`).join('') : '<p class="presentations-empty">Bu sınıf için henüz sunum eklenmedi.</p>'}`;
  }
  const previousRender = render;
  render = function () {
    previousRender();
    renderBoard();
  };
  render();
})();
