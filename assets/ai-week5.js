/* 5. sınıf / 5. hafta. Öğretmenin sağladığı Ortak Kavram Panosu etkinliğinin dijital uyarlaması. */
(() => {
  'use strict';
  const activity = {
    id: 'ai-concept-board', title: 'Ortak Kavram Panosu', grade: 5, week: 5,
    type: 'ai-board', label: '5. hafta · Yapay zekâ · Sürükle–bırak', duration: '15 dk',
    group: 'Grup etkinliği', symbol: '✦', cover: 'Yapay zekâyı keşfet',
    description: '12 kavram kartını yerleştir, çalışma bilgilerini incele ve sınıfın ortak yapay zekâ tanımını oluştur.',
    outcome: 'Yapay zekâ örneklerini çalışma bilgilerine göre ayırt etme, kararını gerekçelendirme ve ortak bir tanım oluşturma.'
  };
  const bins = [
    {id: 'yes', icon: '✓', title: 'Yapay zekâ örneği', hint: 'Tanıma, tahmin, öneri gibi görevlerde çıkarım yapıyor.'},
    {id: 'no', icon: '×', title: 'Örnek olmayan', hint: 'Bu örnekte yapay zekâ kullanılmıyor.'},
    {id: 'unsure', icon: '?', title: 'Emin Değilim', hint: 'Karar vermek için hangi bilgiye ihtiyacımız var?'}
  ];
  // Ambiguous names deliberately lack enough information in the first round.
  // Answers apply to the described system, not every product with the same name.
  const cards = [
    {id: 'assistant', icon: '♫', title: 'Sesli asistan', text: 'Eğitilmiş bir model, söylediğin soruyu tanıyıp ne istediğini yorumluyor.', answer: 'yes', why: 'Konuşmayı tanıma ve isteği yorumlama için model kullanılıyor.'},
    {id: 'face', icon: '◎', title: 'Yüz tanıma sistemi', text: 'Görüntülerle eğitilmiş model, fotoğraftaki yüzü kayıtlı yüzlerle karşılaştırıyor.', answer: 'yes', why: 'Model, görüntüdeki yüz özelliklerinden çıkarım yapıyor.'},
    {id: 'recommend', icon: '★', title: 'Öneri sistemi', text: 'Model, izleme tercihlerindeki örüntülerden beğenebileceğin videoları tahmin ediyor.', answer: 'yes', why: 'Verilerden örüntü bulup kişiye uygun öneri üretiyor.'},
    {id: 'plant', icon: '❋', title: 'Bitki tanıma uygulaması', text: 'Bitki fotoğraflarıyla eğitilmiş model, yeni bir fotoğrafın hangi bitki olduğunu tahmin ediyor.', answer: 'yes', why: 'Yeni görüntüyü tanımak için öğrenilmiş örüntüler kullanılıyor; tahmin hatalı olabilir.'},
    {id: 'bike', icon: '↗', title: 'Bisiklet', text: 'Pedal, zincir ve tekerleklerle hareket eden sıradan bir bisiklet.', answer: 'no', why: 'Mekanik hareket var; bilgileri yorumlayan bir yapay zekâ sistemi yok.'},
    {id: 'book', icon: '▤', title: 'Basılı kitap', text: 'Kâğıt sayfalardaki yazıları okuyorsun; kitap yeni bilgiye göre karar üretmiyor.', answer: 'no', why: 'Bilgi içermesi, kitabı yapay zekâ sistemi yapmaz.'},
    {id: 'calculator', icon: '+', title: 'Temel hesap makinesi', text: 'Yalnızca girdiğin sayılara seçtiğin dört işlemi uyguluyor.', answer: 'no', why: 'Bu temel araç, seçilen sabit aritmetik işlemi yapıyor; yapay zekâ kullanmıyor.'},
    {id: 'human', icon: '♡', title: 'İnsan zekâsı', text: 'Bir insan düşünüyor, öğreniyor ve deneyimlerinden yararlanıyor.', answer: 'no', why: 'İnsan zekâsı doğal zekâdır. Yapay zekâ, makinelerdeki sistemlerle ilgilidir.'},
    {id: 'vacuum', icon: '◉', title: 'Robot süpürge', answer: 'yes', clue: 'Bu model, kamera görüntülerinden oyuncak ve kablo gibi engelleri tanıyan eğitilmiş bir model kullanıyor.', why: 'Bu süpürgede görüntüden engel tanıyan yapay zekâ var. Her robot süpürge aynı şekilde çalışmaz.'},
    {id: 'weather', icon: '☂', title: 'Hava durumu uygulaması', answer: 'no', clue: 'Burada incelediğimiz ekran yalnızca bir servisten gelen hazır tahmini gösteriyor. Ekranda tahmin yapan bir model yok.', why: 'İncelediğimiz gösterim ekranı yapay zekâ kullanmıyor. Tahmini üreten başka bir sistem kullanabilir; onu ayrıca incelemek gerekir.'},
    {id: 'arm', icon: '⚙', title: 'Fabrika robot kolu', answer: 'no', clue: 'Bu kol, kaydedilmiş aynı hareketleri tekrar ediyor. Görüntü tanımıyor, yeni durumları yorumlamıyor.', why: 'Bu robotta sabit hareketlerin otomasyonu var. Robot olmak tek başına yapay zekâ kullanmak anlamına gelmez.'},
    {id: 'chess', icon: '♟', title: 'Satranç programı', answer: 'yes', clue: 'Bu programda geçmiş oyunlarla eğitilmiş bir model, tahtayı değerlendirip uygun hamleler öneriyor.', why: 'Bu program, tahtadaki durumdan çıkarım yapıp hamle öneriyor.'}
  ];
  const exitQuestions = [
    {text: 'Bir uygulama, örnek atık fotoğraflarıyla eğitilmiş model kullanarak yeni bir fotoğraftaki atığın türünü tahmin ediyor. Hangi alan?', options: ['Yapay zekâ örneği', 'Örnek olmayan', 'Bilgi yetersiz'], answer: 0, why: 'Nasıl çalıştığı açıklanmış: model, görüntüden atık türünü tahmin ediyor.'},
    {text: 'Bir kutunun üzerinde yalnızca “Akıllı lamba” yazıyor. Yapay zekâ kullandığına karar verebilir miyiz?', options: ['Evet, elektrikle çalışıyor', 'Hayır, hiçbir lamba kullanamaz', 'Henüz değil; nasıl çalıştığını öğrenmeliyiz'], answer: 2, why: '“Akıllı” adı yeterli kanıt değildir. Sabit zamanlayıcı mı, bilgileri yorumlayan bir sistem mi olduğunu sormalıyız.'}
  ];
  let state;
  const teacherNote = () => `<details class="ai-teacher"><summary>Öğretmen için · 15 dakikalık uygulama</summary>
    <p><b>Akış:</b> Hazırlık 2 dk → ilk pano 5 dk → kanıt ve tartışma 4 dk → ortak tanım 3 dk → çıkış soruları 1 dk. Süreler öneridir; otomatik süre sınırı yoktur.</p>
    <p><b>Roller:</b> Okuyucu kartı seslendirir, uygulayıcı taşır, sorgulayıcı “Hangi bilgiye dayandık?” diye sorar, sözcü gerekçeyi paylaşır. Kartlar ilerledikçe rolleri değiştirin. Tek tahtada gruplar sırayla karar önerebilir.</p>
    <p><b>Hedef ve kanıt:</b> Öğrenci, yapay zekâ örneğini çalışma bilgisiyle ayırt eder; en az bir kararını gerekçelendirir. İlk ve son panoyu karşılaştırın, ortak tanımı ve her öğrencinin çıkış yanıtını dinleyin.</p>
    <p><b>Sorular:</b> Elektrikle çalışan her şey yapay zekâ mıdır? Robotun ne yaptığı ve nasıl yaptığı neden önemlidir? İnsan zekâsı neden bu yeşil alanda değil? Kararımızı değiştiren bilgi neydi? Yapay zekâ her zaman doğru sonuç verir mi?</p>
    <p>Gri alana yerleştirmek ilk turda hata sayılmaz. Bilgi eksikliğini fark etmek değerlidir. İlk turda doğru cevapları söylemeyin; öğrenciler çalışma bilgilerini inceleyip panoyu düzeltsin. Çıkış sorularında herkes önce kendi yanıtını düşünsün, sonra bir gerekçe söylesin.</p>
    <p><b>Ortak tanım:</b> Amaç, yöntem ve örnek içermeli. Yapay zekâ için insan gibi hissetmek veya sürekli öğrenmek şart değildir. Örnekler temsili sistemleri anlatır; aynı adlı ürünler farklı çalışabilir.</p>
    <p><b>Erişim:</b> Kartlar sürüklenebilir veya dokunarak seçilip alan düğmesiyle taşınabilir. Klavyede Tab ve Enter/Boşluk kullanılır. Alanlar renk yanında simge ve metinle de ayrılır. Çevrim dışı uyarlamada aynı kartları üç başlık altında kâğıtla gruplayın.</p>
    <p>Kaynak: Öğretmenin paylaştığı “Ortak Kavram Panosu Sürükle–Bırak Oyunu”. Tanım çerçevesi: <a href="https://www.oecd.org/en/publications/explanatory-memorandum-on-the-updated-oecd-definition-of-an-ai-system_623da898-en.html" target="_blank" rel="noopener noreferrer">OECD yapay zekâ sistemi açıklaması</a>.</p></details>`;
  function start() {
    state = {step: 0, order: shuffle(cards.slice()), places: {}, initial: {}, revealed: new Set(), selected: null, checked: false, definition: '', exitIndex: 0, exitCorrect: false};
    openModal('Ortak Kavram Panosu · Sürükle–Bırak Oyunu', '5. sınıf · 5. hafta · Grup etkinliği · 15 dk', '<div id="aiGame" class="ai-game"></div>');
    $('.dialog').classList.add('ai-dialog');
    paint();
  }
  const cardHTML = c => `<button type="button" class="ai-card${state.selected === c.id ? ' selected' : ''}" draggable="true" data-ai-card="${c.id}" aria-pressed="${state.selected === c.id}"><span class="ai-card-icon" aria-hidden="true">${c.icon}</span><span><b>${esc(c.title)}</b><small>${esc(c.text || (state.revealed.has(c.id) ? c.clue : 'Nasıl çalıştığı henüz belli değil.'))}</small>${state.checked && state.places[c.id] !== c.answer ? `<em>${esc(c.why)} Hangi alan uygun?</em>` : ''}</span></button>`;
  function boardHTML() {
    const review = state.step === 2;
    const count = Object.keys(state.places).length;
    return `<div class="ai-stage-heading"><span>${review ? '2 · KANIT VE TARTIŞMA' : '1 · İLK FİKRİMİZ'}</span><h3 tabindex="-1" id="aiStageTitle">${review ? 'Bilgi değişirse kararımız değişir mi?' : 'Yapay zekâ nerede?'}</h3><p>${review ? 'Dört çalışma bilgisini açın. Gerekçelerinizi paylaşın; gerekirse kartları başka alana taşıyın.' : 'Kartı okuyun, grubunuzla tartışın ve bir alana sürükleyin. Ya da karta dokunup alanın “Buraya yerleştir” düğmesine basın.'}</p></div>
      ${review ? `<div class="ai-evidence"><b>Çalışma bilgileri · ${state.revealed.size} / 4 açıldı</b><div>${cards.filter(c => c.clue).map(c => `<button class="btn" data-ai-clue="${c.id}" aria-expanded="${state.revealed.has(c.id)}">${state.revealed.has(c.id) ? '✓' : '+'} ${esc(c.title)}</button>`).join('')}</div><p>Bilgiler açıldığında ilgili kartın üzerinde görünür. Bir öğrenci bilgiyi okusun, diğeri neyin değiştiğini açıklasın.</p></div>` : ''}
      <div class="ai-quick-board" aria-label="Hızlı yerleştirme alanları">${bins.map(bin => `<div class="ai-${bin.id}" data-ai-bin="${bin.id}"><button type="button" data-ai-place="${bin.id}" aria-label="Hızlı yerleştir: ${bin.title}" ${state.selected ? '' : 'disabled'}>${bin.icon} ${bin.title}</button></div>`).join('')}</div>
      <div class="ai-pool"><div class="ai-pool-heading"><b>Kavram kartları</b><span>${count} / ${cards.length} yerleştirildi</span></div><div class="ai-pool-cards">${state.order.filter(c => !state.places[c.id]).map(cardHTML).join('') || '<p class="ai-empty">Bütün kartlar panoda. İstediğiniz kartı yeniden taşıyabilirsiniz.</p>'}</div></div>
      <div class="ai-selection" role="status" aria-live="polite" id="aiSelection">${state.selected ? `${esc(cards.find(c => c.id === state.selected).title)} seçildi. Bir alanın düğmesine basın.` : 'Kart seçip taşıyabilir; panodaki kararınızı değiştirebilirsiniz.'}</div>
      <div class="ai-board">${bins.map(bin => `<section class="ai-bin ai-${bin.id}" data-ai-bin="${bin.id}" aria-labelledby="aiBin-${bin.id}"><h4 id="aiBin-${bin.id}"><span aria-hidden="true">${bin.icon}</span> ${bin.title}</h4><p>${bin.hint}</p><button type="button" class="ai-place" data-ai-place="${bin.id}" aria-label="${bin.title} alanına yerleştir" ${state.selected ? '' : 'disabled'}>Buraya yerleştir</button><div class="ai-bin-cards">${state.order.filter(c => state.places[c.id] === bin.id).map(cardHTML).join('')}</div></section>`).join('')}</div>
      <div id="aiFeedback" class="ai-feedback" role="status" aria-live="polite"></div>
      <div class="ai-actions">${review ? '<button class="btn" id="aiCheck">Panoyu birlikte kontrol et</button><button class="btn primary" id="aiNext">Ortak tanıma geç →</button>' : `<span>Gri alan, konuşmak için bir başlangıçtır.</span><button class="btn primary" id="aiNext" ${count < cards.length ? 'disabled' : ''}>Çalışma bilgilerini incele →</button>`}</div>`;
  }
  function paint(focusSelector) {
    let body;
    if (state.step === 0) body = `<div class="ai-welcome"><span class="ai-orbit" aria-hidden="true">✦</span><span class="eyebrow">Birlikte düşün · Kanıta bak · Fikrini geliştir</span><h3 id="aiStageTitle" tabindex="-1">Her “akıllı” araç yapay zekâ mı?</h3><p>12 kart, üç alan, bir ortak tanım. Önce fikrinizi söyleyin; yeni bilgi geldiğinde panonuzu güncelleyin.</p><div class="ai-preview">${bins.map(b => `<div class="ai-${b.id}"><b>${b.icon}</b><span>${b.title}</span></div>`).join('')}</div><div class="ai-route"><span><b>1</b> Kartları yerleştir</span><span><b>2</b> Bilgiyi incele</span><span><b>3</b> Tanımı kur</span><span><b>4</b> Kendini kontrol et</span></div><p class="ai-role-note">Grup rolleri: okuyucu · uygulayıcı · sorgulayıcı · sözcü.<br>Her birkaç kartta rolleri değiştirin.</p><button class="btn primary" id="aiStart">Ortak panoyu başlat →</button></div>`;
    else if (state.step <= 2) body = boardHTML();
    else if (state.step === 3) body = definitionHTML();
    else if (state.step === 4) body = exitHTML();
    else body = resultHTML();
    $('#aiGame').innerHTML = `<ol class="ai-steps" aria-label="Etkinlik aşamaları">${['Pano', 'Kanıt', 'Tanım', 'Kontrol'].map((name, i) => `<li${state.step === i + 1 ? ' aria-current="step"' : ''} class="${state.step > i + 1 ? 'done' : ''}">${state.step > i + 1 ? '✓' : i + 1} ${name}</li>`).join('')}</ol>${body}${teacherNote()}`;
    wire();
    if (focusSelector) $(focusSelector)?.focus({preventScroll: true});
  }
  function message(text) { $('#aiFeedback').textContent = text; }
  function transition(step) { state.step = step; paint('#aiStageTitle'); $('.dialog').scrollTop = 0; }
  function place(id, bin) {
    if (!cards.some(c => c.id === id) || !bins.some(b => b.id === bin)) return;
    state.places[id] = bin;
    state.selected = null;
    state.checked = false;
    paint(`[data-ai-card="${id}"]`);
    $('#aiSelection').textContent = `${cards.find(c => c.id === id).title}, ${bins.find(b => b.id === bin).title} alanına taşındı.`;
  }
  function check() {
    if (state.revealed.size < 4) { message('Önce dört çalışma bilgisini de açın. Her bilgiden sonra hangi kararınızın değişebileceğini konuşun.'); return false; }
    const missing = cards.filter(c => state.places[c.id] !== c.answer);
    state.checked = true;
    paint('#aiCheck');
    if (missing.length) {
      message(`${missing.length} kart üzerinde yeniden düşünelim. Kartların açıklamalarını ve yeni ipuçlarını okuyup yerlerini değiştirin. Gri alandaki kartlarda artık hangi çalışma bilgisine sahibiz?`);
      return false;
    }
    message('✓ Pano çalışma bilgileriyle uyumlu. Grubunuz bir yapay zekâ örneğinin gerekçesini ve bir kararınızı değiştiren bilgiyi söylesin.');
    return true;
  }
  function definitionHTML() {
    return `<div class="ai-stage-heading"><span>3 · SINIFIN ORTAK TANIMI</span><h3 id="aiStageTitle" tabindex="-1">Amaç + yöntem + örnek</h3><p>Her başlık için uygun ifadeyi birlikte seçin. Oluşan tanımı okuyup kendi cümlenizle geliştirin.</p></div><div class="ai-definition-fields">
      <label>Ne için kullanılır?<select id="aiPurpose"><option value="">Bir amaç seçin</option><option value="infer">Tanıma, tahmin, öneri gibi görevler için</option><option value="feel">Her zaman insan gibi hissetmek için</option></select></label>
      <label>Nasıl çalışır?<select id="aiMethod"><option value="">Bir yöntem seçin</option><option value="power">Yalnız elektrikle çalışması yeterlidir</option><option value="data">Veri veya bilgi ve kurallardan çıkarım yaparak</option></select></label>
      <label>Panomuzdan bir örnek<select id="aiExample"><option value="">Bir örnek seçin</option>${cards.filter(c => c.answer === 'yes').map(c => `<option value="${c.id}">${esc(c.title)}</option>`).join('')}</select></label></div>
      <div id="aiDefinitionPreview" class="ai-definition-preview" role="status" aria-live="polite">Üç seçiminiz tamamlandığında ortak tanım burada oluşacak.</div>
      <label class="ai-own-definition" for="aiOwnDefinition">Sınıfın kendi cümlesi <span>(isteğe bağlı)</span></label><textarea id="aiOwnDefinition" rows="3" maxlength="600" placeholder="Amaç, yöntem ve bir örnek içeren tanımımız…">${esc(state.definition)}</textarea><p class="ai-small">Gerçek kişi bilgisi yazmayın. Bu metin yalnız açık oyun içinde kalır.</p>
      <div id="aiFeedback" class="ai-feedback" role="status" aria-live="polite"></div><div class="ai-actions"><button class="btn primary" id="aiDefinitionNext">Kısa kontrol sorularına geç →</button></div>`;
  }
  function definitionChoices() {
    const purpose = $('#aiPurpose').value, method = $('#aiMethod').value, example = cards.find(c => c.id === $('#aiExample').value);
    if (purpose !== 'infer' || method !== 'data' || !example) return null;
    return `Yapay zekâ, makinelerin veri veya bilgi ve kurallardan çıkarım yaparak tanıma, tahmin ve öneri gibi görevleri yerine getirmesini sağlayan sistemlerdir. Örneğin: ${example.title.toLocaleLowerCase('tr-TR')}.`;
  }
  function exitHTML() {
    const q = exitQuestions[state.exitIndex];
    return `<div class="ai-stage-heading"><span>4 · KENDİMİ KONTROL EDİYORUM · ${state.exitIndex + 1} / 2</span><h3 id="aiStageTitle" tabindex="-1">${esc(q.text)}</h3><p>Herkes önce kendi kararını düşünsün. Sonra seçin ve nedenini bir cümleyle açıklayın.</p></div><div class="ai-exit-options">${q.options.map((o, i) => `<button class="btn" data-ai-answer="${i}">${esc(o)}</button>`).join('')}</div><div id="aiFeedback" class="ai-feedback" role="status" aria-live="polite"></div><div class="ai-actions"><button class="btn primary" id="aiExitNext" hidden>${state.exitIndex === 0 ? 'Sonraki soru →' : 'Panomuzu tamamla ✓'}</button></div>`;
  }
  function resultHTML() {
    const changes = cards.filter(c => state.initial[c.id] !== state.places[c.id]).length;
    return `<div class="ai-result"><span class="ai-orbit" aria-hidden="true">✓</span><h3 id="aiStageTitle" tabindex="-1">Ortak kavram panosu tamamlandı!</h3><p>12 kartı çalışma bilgileriyle değerlendirdiniz; iki kontrol sorusunu çözdünüz.</p><div class="ai-result-stats"><span><b>6</b> Yapay zekâ örneği</span><span><b>6</b> Örnek olmayan</span><span><b>${changes}</b> Geliştirilen karar</span></div><p>Fikrimizi yeni bilgiyle değiştirmek öğrenmenin bir parçasıdır.</p><div class="ai-definition-preview"><b>Sınıfımızın ortak tanımı</b><p>${esc(state.definition)}</p></div><details><summary>Son panoyu ve gerekçeleri incele</summary>${bins.slice(0, 2).map(b => `<h4>${b.icon} ${b.title}</h4>${cards.filter(c => c.answer === b.id).map(c => `<p><b>${esc(c.title)}:</b> ${esc(c.why)}</p>`).join('')}`).join('')}</details><p class="ai-role-note">Son söz: Eşine bir yapay zekâ örneği söyle ve hangi çalışma bilgisine dayandığını açıkla.</p><div class="ai-actions"><button class="btn" id="aiAgain">Yeniden oyna</button><button class="btn primary" id="aiClose">Etkinliklere dön</button></div></div>`;
  }
  function wire() {
    if ($('#aiStart')) $('#aiStart').onclick = () => transition(1);
    document.querySelectorAll('[data-ai-card]').forEach(b => {
      b.onclick = () => {
        state.selected = state.selected === b.dataset.aiCard ? null : b.dataset.aiCard;
        paint(`[data-ai-card="${b.dataset.aiCard}"]`);
      };
      b.ondragstart = e => { e.dataTransfer.setData('text/plain', b.dataset.aiCard); e.dataTransfer.effectAllowed = 'move'; };
    });
    document.querySelectorAll('[data-ai-place]').forEach(b => b.onclick = () => { if (state.selected) place(state.selected, b.dataset.aiPlace); });
    document.querySelectorAll('[data-ai-bin]').forEach(b => {
      b.ondragover = e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; b.classList.add('drag-over'); };
      b.ondragleave = e => { if (!b.contains(e.relatedTarget)) b.classList.remove('drag-over'); };
      b.ondrop = e => { e.preventDefault(); b.classList.remove('drag-over'); place(e.dataTransfer.getData('text/plain'), b.dataset.aiBin); };
    });
    document.querySelectorAll('[data-ai-clue]').forEach(b => b.onclick = () => {
      state.revealed.add(b.dataset.aiClue); state.checked = false;
      paint(`[data-ai-clue="${b.dataset.aiClue}"]`);
      message(cards.find(c => c.id === b.dataset.aiClue).clue);
    });
    if ($('#aiCheck')) $('#aiCheck').onclick = check;
    if ($('#aiNext')) $('#aiNext').onclick = () => {
      if (state.step === 1 && Object.keys(state.places).length === cards.length) { state.initial = {...state.places}; transition(2); }
      else if (state.step === 2 && check()) transition(3);
    };
    if ($('#aiPurpose')) {
      ['#aiPurpose', '#aiMethod', '#aiExample'].forEach(selector => $(selector).onchange = () => {
        $('#aiDefinitionPreview').textContent = definitionChoices() || 'Amaç ve yöntemi tekrar tartışın. Her elektrikli araç yapay zekâ değildir; insan gibi hissetmek şart değildir.';
      });
      $('#aiOwnDefinition').oninput = e => { state.definition = e.target.value; };
      $('#aiDefinitionNext').onclick = () => {
        const generated = definitionChoices();
        if (!generated) { message('Önce uygun amaç ve yöntemi, ardından panodan bir örneği seçin. Yapay zekâ, aldığı bilgilerden çıkarım yaparak görevleri yerine getirir.'); return; }
        state.definition = $('#aiOwnDefinition').value.trim() || generated;
        transition(4);
      };
    }
    document.querySelectorAll('[data-ai-answer]').forEach(b => b.onclick = () => {
      if (state.exitCorrect) return;
      const q = exitQuestions[state.exitIndex];
      if (Number(b.dataset.aiAnswer) !== q.answer) { message('Birlikte yeniden düşünelim: ' + q.why); b.disabled = true; return; }
      state.exitCorrect = true;
      message('✓ ' + q.why + ' Kararının gerekçesini eşinle paylaş.');
      document.querySelectorAll('[data-ai-answer]').forEach(x => x.disabled = true);
      $('#aiExitNext').hidden = false;
      $('#aiExitNext').focus();
    });
    if ($('#aiExitNext')) $('#aiExitNext').onclick = () => {
      if (!state.exitCorrect) return;
      if (state.exitIndex === 0) { state.exitIndex++; state.exitCorrect = false; paint('#aiStageTitle'); }
      else { completeActivity(activity.id); transition(5); }
    };
    if ($('#aiAgain')) $('#aiAgain').onclick = start;
    if ($('#aiClose')) $('#aiClose').onclick = closeModal;
  }
  defaultActivities.push(activity);
  const previousOpen = openActivity;
  openActivity = function (id) {
    if (id === activity.id) { currentActivity = activity; start(); }
    else { $('.dialog').classList.remove('ai-dialog'); previousOpen(id); }
  };
  const previousClose = closeModal;
  closeModal = function () { $('.dialog').classList.remove('ai-dialog'); previousClose(); };
  $('#closeModal').onclick = closeModal;
  $('#fourthWeek').insertAdjacentHTML('afterend', '<button class="chip" id="fifthWeek">5. hafta görevleri</button>');
  const controls = $('#allWeeks').parentElement;
  controls.querySelector('span').textContent = 'Haftana göre keşfet';
  const previousRender = render;
  render = function () {
    previousRender();
    const fifth = activeFilter === 'ai-board' && !weekOnly;
    $('#fifthWeek').classList.toggle('on', fifth);
    $('#fifthWeek').hidden = !['all', '5'].includes(gradeFilter);
    $('#allWeeks').classList.toggle('on', !weekOnly && !fifth);
    $('#fourthWeek').classList.toggle('on', weekOnly);
    const button = document.querySelector(`[data-play="${activity.id}"]`);
    if (!button) return;
    const card = button.closest('.card'), visual = card.querySelector('.card-visual');
    visual.className = 'card-visual ai-library-art';
    visual.innerHTML = '<span class="card-number">5. SINIF · 5. HAFTA</span><span class="ai-library-symbol" aria-hidden="true">✦</span><strong>Yapay zekâ nerede?</strong><div class="ai-library-bins" aria-hidden="true"><span>✓</span><span>×</span><span>?</span></div>';
    card.querySelector('h3').insertAdjacentHTML('beforebegin', '<span class="week-tag">5. hafta · Yeni etkinlik</span>');
    $('#grid').prepend(card);
  };
  const resetType = () => { activeFilter = 'all'; document.querySelectorAll('[data-filter]').forEach(b => b.classList.toggle('on', b.dataset.filter === 'all')); };
  const previousAllWeeks = $('#allWeeks').onclick;
  $('#allWeeks').onclick = () => { if (activeFilter === 'ai-board') resetType(); previousAllWeeks(); };
  $('#fifthWeek').onclick = () => {
    weekOnly = false; activeFilter = 'ai-board';
    document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('on'));
    render();
  };
  render();
})();
