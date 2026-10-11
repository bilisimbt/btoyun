(() => {
  'use strict';
  const entry = document.getElementById('gradeEntry');
  const shell = document.getElementById('activityShell');
  const select = document.getElementById('gradeSelect');
  const choices = [...entry.querySelectorAll('[data-entry-grade]')];
  // Retain the existing select for activity modules; selection lives on the entry screen.
  select.closest('label').hidden = true;
  const welcome = shell.querySelector('.hero h1');
  welcome.tabIndex = -1;
  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'pill';
  back.id = 'changeGrade';
  back.textContent = '← Sınıf seçimi';
  shell.querySelector('.top-actions').prepend(back);

  const previousRender = render;
  render = function () {
    previousRender();
    if (gradeFilter === 'all') return;
    const activities = all().filter(a => (a.grades || [a.grade]).map(String).includes(gradeFilter));
    const done = loadStored('bilisimCompleted');
    document.getElementById('libraryProgress').textContent = `${activities.filter(a => done.includes(a.id)).length} / ${activities.length} görev tamamlandı`;
  };

  choices.forEach(button => button.addEventListener('click', () => {
    const grade = button.dataset.entryGrade;
    activeFilter = 'all';
    weekOnly = false;
    document.querySelectorAll('[data-filter]').forEach(b => b.classList.toggle('on', b.dataset.filter === 'all'));
    document.getElementById('allWeeks').classList.add('on');
    document.getElementById('fourthWeek').classList.remove('on');
    select.value = grade;
    select.dispatchEvent(new Event('change', {bubbles: true}));
    document.getElementById('studentMode').click();
    shell.querySelector('.hero .eyebrow').textContent = `${grade}. sınıf · Bilişim oyun atölyesi`;
    shell.querySelector('.toolbar h2').textContent = `${grade}. sınıf etkinlikleri`;
    entry.hidden = true;
    shell.hidden = false;
    window.scrollTo({top: 0, behavior: 'instant'});
    welcome.focus({preventScroll: true});
  }));

  back.addEventListener('click', () => {
    document.getElementById('studentMode').click();
    shell.hidden = true;
    entry.hidden = false;
    window.scrollTo({top: 0, behavior: 'instant'});
    (choices.find(b => b.dataset.entryGrade === gradeFilter) || choices[0]).focus({preventScroll: true});
  });
})();
