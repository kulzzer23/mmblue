export function renderApplicationSection(containerElement, supabase) {
  if (!document.getElementById('app-laptop-os-styles')) {
    const style = document.createElement('style');
    style.id = 'app-laptop-os-styles';
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=PT+Sans:wght@400;700&family=Times+New+Roman&display=swap');

      /* === БРОНЕБОЙНЫЙ КОНТЕЙНЕР === */
      .laptop-scroll-wrapper {
        width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch;
        padding-bottom: 20px; display: flex; justify-content: center;
      }
      
      .mobile-rotate-hint {
        display: none; text-align: center; color: #3b82f6; font-family: 'PT Sans', sans-serif;
        font-weight: bold; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3);
        padding: 10px; border-radius: 8px; margin-bottom: 15px;
      }

      /* === 3D КОРПУС === */
      .laptop-perspective {
        perspective: 1800px; width: 1100px; min-width: 1100px; margin: 10px auto;
        position: relative; z-index: 10; flex-shrink: 0;
      }
      
      .laptop-lid {
        width: 100%; height: 75vh; min-height: 550px; background: #020617;
        border: 12px solid #111827; border-bottom: 22px solid #111827; border-radius: 14px 14px 0 0;
        box-shadow: 0 -5px 20px rgba(0,0,0,0.6), inset 0 0 12px #000, 0 0 60px rgba(59, 130, 246, 0.05);
        position: relative; transform-origin: bottom center; transform: rotateX(-90deg);
        transition: transform 1.5s cubic-bezier(0.25, 1, 0.2, 1); transform-style: preserve-3d;
        display: flex; flex-direction: column; overflow: hidden;
      }
      .laptop-lid.open { transform: rotateX(0deg); box-shadow: 0 -5px 20px rgba(0,0,0,0.6), inset 0 0 12px #000, 0 0 80px rgba(59, 130, 246, 0.12); }
      .laptop-base { 
        width: 106%; height: 34px; margin-left: -3%; border-radius: 0 0 18px 22px; position: relative; z-index: 11;
        background: linear-gradient(to bottom, #1e293b 0%, #111827 40%, #0f172a 100%);
        box-shadow: 0 22px 50px rgba(0,0,0,0.75), 0 5px 15px rgba(0,0,0,0.4);
      }
      .laptop-base::before {
        content: ''; position: absolute; top: 0; left: 50%; transform: translateX(-50%);
        width: 120px; height: 4px; background: linear-gradient(90deg, transparent, #334155, transparent); border-radius: 0 0 4px 4px;
      }
      .laptop-camera { position: absolute; top: 5px; left: 50%; transform: translateX(-50%); width: 7px; height: 7px; background: radial-gradient(circle, #1a1a2e 40%, #000 100%); border-radius: 50%; box-shadow: 0 0 3px rgba(59,130,246,0.4); }

      .btn-open-laptop { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(15, 23, 42, 0.95); border: 2px solid #3b82f6; color: #3b82f6; padding: 15px 35px; font-family: 'PT Sans', sans-serif; font-size: 1.1rem; font-weight: bold; text-transform: uppercase; cursor: pointer; border-radius: 6px; box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); transition: 0.3s; z-index: 100; }
      .btn-open-laptop:hover { background: #3b82f6; color: #fff; box-shadow: 0 0 35px rgba(59, 130, 246, 0.6); }

      /* === ИНТЕРФЕЙС LSFM OS === */
      .os-screen { flex: 1; position: relative; background: #000; overflow: hidden; display: flex; flex-direction: column; }
      .os-bios { position: absolute; inset: 0; background: #000; color: #10b981; font-family: 'Share Tech Mono', monospace; padding: 30px; font-size: 1.1rem; line-height: 1.6; display: none; z-index: 50; text-align: left; }
      
      .os-workspace { 
        flex: 1; display: none; flex-direction: column; 
        background: radial-gradient(circle at center, #1e293b 0%, #020617 100%); 
        position: relative; overflow: hidden;
      }

      /* ЖИРНЫЙ АЛЕРТ (ПЕРЕКРЫВАЕТ ВЕСЬ ЭКРАН) */
      .os-critical-alert {
        position: absolute; inset: 0; background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(8px);
        z-index: 999; display: flex; justify-content: center; align-items: center; padding: 20px;
        transition: opacity 0.3s ease;
      }
      .os-alert-box {
        background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%); border: 3px solid #ef4444;
        box-shadow: 0 0 50px rgba(239, 68, 68, 0.4), inset 0 0 20px rgba(239, 68, 68, 0.1);
        border-radius: 12px; padding: 40px; text-align: center; max-width: 700px; width: 100%;
        animation: alertPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
      }
      @keyframes alertPop { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
      .os-alert-title { color: #ef4444; font-family: 'Share Tech Mono', monospace; font-size: 2.5rem; font-weight: bold; margin-bottom: 20px; animation: blinker 1.5s infinite; text-shadow: 0 0 10px rgba(239,68,68,0.5); }
      .os-alert-text { color: #f8fafc; font-family: 'PT Sans', sans-serif; font-size: 1.2rem; line-height: 1.6; margin-bottom: 30px; }
      .os-alert-text b { color: #fca5a5; font-size: 1.3rem; }
      .btn-understand { background: #ef4444; color: #fff; border: none; padding: 20px 40px; font-size: 1.3rem; font-family: 'PT Sans', sans-serif; font-weight: bold; border-radius: 8px; cursor: pointer; text-transform: uppercase; transition: 0.2s; box-shadow: 0 10px 20px rgba(239,68,68,0.3); width: 100%; }
      .btn-understand:hover { background: #dc2626; transform: translateY(-3px); box-shadow: 0 15px 30px rgba(239,68,68,0.5); }

      /* Панель задач */
      .os-taskbar { height: 40px; background: #0f172a; border-top: 1px solid #1e293b; display: flex; justify-content: space-between; align-items: center; padding: 0 15px; z-index: 45; }
      .os-start-btn { background: #3b82f6; color: #fff; border: none; border-radius: 4px; padding: 5px 12px; font-family: 'PT Sans', sans-serif; font-weight: bold; font-size: 0.9rem; cursor: pointer; }
      .os-tray { display: flex; gap: 15px; color: #cbd5e1; font-size: 0.9rem; font-family: 'PT Sans', sans-serif; }

      /* КОНТЕЙНЕР ДЛЯ ОКОН */
      .os-windows-container { 
        flex: 1; padding: 15px; display: flex; gap: 20px; 
        height: calc(100% - 40px); position: relative;
      }
      
      .os-window { 
        flex: 1; background: rgba(15, 23, 42, 0.95); border: 1px solid #334155; border-radius: 8px; 
        display: flex; flex-direction: column; opacity: 0; transform: translateY(10px); overflow: hidden;
      }
      .window-animate { animation: windowPop 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      @keyframes windowPop { to { opacity: 1; transform: translateY(0); } }

      .os-window-header { background: #1e293b; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #0f172a; }
      .os-window-title { color: #f8fafc; font-family: 'PT Sans', sans-serif; font-size: 0.9rem; }
      .os-window-controls span { display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #ef4444; margin-left: 5px; }
      .os-window-controls span:nth-child(2) { background: #f59e0b; }
      .os-window-controls span:nth-child(3) { background: #10b981; }
      
      .os-window-body { flex: 1; padding: 25px 25px; display: flex; flex-direction: column; overflow: hidden; }

      /* ФОРМА (ЛЕВОЕ ОКНО) */
      .app-label { color: #94a3b8; font-family: 'PT Sans', sans-serif; font-size: 0.85rem; font-weight: bold; margin-bottom: 8px; display: block; text-transform: uppercase; }
      .app-input { width: 100%; background: #000 !important; border: 1px solid #3b82f6 !important; color: #fff !important; padding: 14px 15px !important; margin-bottom: 20px; border-radius: 6px !important; font-size: 0.95rem; outline: none; }
      
      .db-scan-box { flex: 1; border: 1px dashed #334155; background: #000; border-radius: 6px; padding: 15px; color: #64748b; font-family: 'Share Tech Mono', monospace; font-size: 0.9rem; margin-bottom: 20px; overflow-y: auto; }
      .db-item { background: rgba(255,255,255,0.02); border: 1px solid #232936; padding: 10px; border-radius: 4px; margin-bottom: 6px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: 0.2s; }
      .db-item:hover { border-color: #3b82f6; }
      .db-item.selected { border-color: #10b981; background: rgba(16,185,129,0.1); }

      .btn-submit { width: 100%; background: #3b82f6; color: #fff; border: none; padding: 16px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 1.1rem; text-transform: uppercase; transition: 0.3s; }
      .btn-submit:disabled { background: #232936; color: #475569; cursor: not-allowed; }
      .btn-submit:not(:disabled):hover { background: #2563eb; transform: translateY(-2px); }

      /* ФИЗИЧЕСКИЙ БЛАНК (ПРАВОЕ ОКНО) */
      .document-paper { background: #fdfdfd; color: #1e293b; padding: 35px 40px; border-radius: 2px; height: 100%; display: flex; flex-direction: column; position: relative; box-shadow: inset 0 0 20px rgba(0,0,0,0.02); }
      .doc-watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 9rem; font-weight: 900; color: rgba(0,0,0,0.02); pointer-events: none; }
      .doc-header { text-align: right; font-family: 'Times New Roman', serif; font-size: 1.1rem; margin-bottom: 25px; line-height: 1.4; }
      .doc-title { text-align: center; font-family: 'Times New Roman', serif; font-size: 1.4rem; font-weight: bold; margin-bottom: 25px; letter-spacing: 2px; }
      .doc-body { font-family: 'Times New Roman', serif; font-size: 1.15rem; line-height: 1.6; text-align: justify; flex: 1; }
      .doc-field { font-weight: bold; color: #2563eb; border-bottom: 1px dashed #2563eb; padding: 0 4px; }
      .doc-footer { display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #cbd5e1; margin-top: auto; padding-top: 15px; font-family: 'Times New Roman', serif; font-size: 1.1rem; }
      .doc-sign { font-family: 'Brush Script MT', cursive; font-size: 2rem; color: #0f172a; transform: rotate(-5deg); display: inline-block; }

      .stamp-final { position: absolute; bottom: 50px; right: 30px; border: 4px solid #dc2626; color: #dc2626; font-size: 1.5rem; font-weight: 900; padding: 10px 15px; transform: rotate(-12deg); opacity: 0; border-radius: 6px; }
      .stamp-final.visible { opacity: 0.9; }

      .doc-processed { 
        margin-top: 15px; padding: 12px 16px; border: 2px solid #10b981; border-radius: 6px;
        background: rgba(16, 185, 129, 0.05); font-family: 'Times New Roman', serif; font-size: 1.1rem;
      }
      .doc-processed-label { color: #374151; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; font-size: 0.85rem; margin-bottom: 4px; }
      .doc-processed-value { color: #10b981; font-weight: bold; font-size: 1.2rem; }
      .doc-processed-value.empty { color: #9ca3af; font-style: italic; font-weight: normal; font-size: 1rem; }

      @media (max-width: 1100px) {
        .mobile-rotate-hint { display: block; }
        .laptop-scroll-wrapper { justify-content: flex-start; }
      }

      .blink { animation: blinker 1s linear infinite; }
      @keyframes blinker { 50% { opacity: 0; } }
    `;
    document.head.appendChild(style);
  }

  containerElement.innerHTML = `
    <div class="mobile-rotate-hint">
      🔄 Для удобства переверните телефон горизонтально<br>или свайпайте по ноутбуку влево-вправо
    </div>

    <div class="laptop-scroll-wrapper">
      <div class="laptop-perspective">
        <button id="btn-open-laptop" class="btn-open-laptop">ВКЛЮЧИТЬ БОРТОВОЙ ПК LSFM</button>
        
        <div class="laptop-lid" id="laptop-lid">
          <div class="laptop-camera"></div>
          <div class="os-screen">
            
            <div class="os-bios" id="os-bios"></div>

            <div class="os-workspace" id="os-workspace">
              
              <!-- === ТОТ САМЫЙ ОГРОМНЫЙ АЛЕРТ === -->
              <div class="os-critical-alert" id="os-disclaimer-modal">
                <div class="os-alert-box">
                  <div class="os-alert-title">ВНИМАНИЕ!</div>
                  <div class="os-alert-text">
                    ЭТОТ РАЗДЕЛ ТОЛЬКО ДЛЯ ТЕХ, КТО <b>НЕ СОСТОИТ</b> В РАДИОЦЕНТРЕ! ДЛЯ КАНДИДАТОВ ТРЕБУЕТСЯ ПЕРЕД ПОДАЧЕЙ ЗАЯВЛЕНИЯ НУЖНО ПРОЙТИ ЭКЗАМЕН<br><br>
                    Если вы уже состоите в нашей организации на 2-ой порядковой должности и вам нужно просто сдать экзамен, <b>закройте эту вкладку</b> и перейдите в раздел «Экзамен».
                  </div>
                  <button class="btn-understand" id="btn-understand">Я понял.</button>
                </div>
              </div>
              <!-- ================================== -->

              <div class="os-windows-container">
                
                <div class="os-window" id="window-form">
                  <div class="os-window-header">
                    <div class="os-window-title">🎙️ LSFM_MDT.exe - Регистратура</div>
                    <div class="os-window-controls"><span></span><span></span><span></span></div>
                  </div>
                  <div class="os-window-body">

                    <label class="app-label">Идентификатор (Имя_Фамилия)</label>
                    <input type="text" id="app-name" class="app-input" placeholder="Leonardo_Jemison" autocomplete="off">

                    <label class="app-label">Подразделение</label>
                    <select id="app-squad" class="app-input" style="cursor: pointer;">
                      <option value="" disabled selected>Выберите подразделение</option>
                      <option value="TVC">TVC (Телецентр)</option>
                      <option value="LSFM">LSFM (Лос-Сантос)</option>
                      <option value="SFFM">SFFM (Сан-Фиерро)</option>
                      <option value="LVFM">LVFM (Лас-Вентурас)</option>
                    </select>

                    <label class="app-label">Пакет документов (Imgur Link)</label>
                    <input type="text" id="app-album" class="app-input" placeholder="https://imgur.com/..." autocomplete="off">

                    <label class="app-label">Синхронизация базы тестов ПРО</label>
                    <div class="db-scan-box" id="app-exam-list">
                      Введите корректный идентификатор...
                    </div>

                    <button id="app-submit-btn" class="btn-submit" disabled>Передать контракт</button>
                  </div>
                </div>

                <div class="os-window" id="window-doc" style="max-width: 48%;">
                  <div class="os-window-header">
                    <div class="os-window-title">👁️ DocViewer.app</div>
                    <div class="os-window-controls"><span></span><span></span><span></span></div>
                  </div>
                  <div class="os-window-body" style="background: #cbd5e1; padding: 15px;">
                    
                    <div class="document-paper">
                      <div class="doc-watermark">LSFM</div>
                      <div class="doc-header">
                        Министру связи и коммуникаций Vincent_Stefano<br>
                        От гражданина: <span class="doc-field" id="paper-name" style="color: #0f172a; border-color: #0f172a;">...</span>
                      </div>
                      <div class="doc-title">ЗАЯВЛЕНИЕ</div>
                      <div class="doc-body">
                        Прошу принять меня на работу в Mass Media в организацию — <span class="doc-field" id="paper-org" style="color: #ef4444; border-color: #ef4444;">не выбрано</span> на должность радиотехника с испытательным сроком один месяц (( 1 день )). 
                        К заявлению прикладываю копии паспорта и лицензий (( /pass, /lic + /c 60 )): <span class="doc-field" id="paper-link" style="color: #ef4444; border-color: #ef4444;">НЕТ</span>.<br><br>
                        Так же подтверждаю, что успешно прошёл квалификационный онлайн-тест ПРО: <span class="doc-field" id="paper-test" style="color: #ef4444; border-color: #ef4444;">НЕТ</span>.
                      </div>
                      <div class="doc-processed" id="paper-processed-block">
                        <div class="doc-processed-label">Обработан (радиоцентр):</div>
                        <div class="doc-processed-value empty" id="paper-squad">не выбран</div>
                      </div>
                      <div class="doc-footer">
                        <div>Дата: <strong id="paper-date"></strong></div>
                        <div>Подпись: <span class="doc-sign" id="paper-signature"></span></div>
                      </div>
                      <div class="stamp-final" id="official-stamp">ОБРАБОТАНО</div>
                    </div>

                  </div>
                </div>

              </div>

              <div class="os-taskbar">
                <button class="os-start-btn">LSFM OS</button>
                <div class="os-tray">
                  <span>🔋 100%</span>
                  <span class="os-clock" id="os-clock">00:00</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="laptop-base"></div>
      </div>
    </div>
  `;

  const btnOpenLaptop = document.getElementById('btn-open-laptop');
  const laptopLid = document.getElementById('laptop-lid');
  const osBios = document.getElementById('os-bios');
  const osWorkspace = document.getElementById('os-workspace');
  const windowForm = document.getElementById('window-form');
  const windowDoc = document.getElementById('window-doc');
  const osClock = document.getElementById('os-clock');
  const modalAlert = document.getElementById('os-disclaimer-modal');
  const btnUnderstand = document.getElementById('btn-understand');

  setInterval(() => {
    osClock.textContent = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }, 1000);

  // Логика закрытия алерта
  btnUnderstand.addEventListener('click', () => {
    modalAlert.style.opacity = '0';
    setTimeout(() => {
      modalAlert.style.display = 'none';
    }, 300);
  });

  btnOpenLaptop.addEventListener('click', () => {
    btnOpenLaptop.style.display = 'none';
    laptopLid.classList.add('open');

    setTimeout(() => {
      osBios.style.display = 'block';
      const biosText = [
        "ЗАГРУЗКА СИСТЕМЫ LSFM OS v4.5...",
        "ОПЕРАТИВНАЯ ПАМЯТЬ... ОК",
        "ПОДКЛЮЧЕНИЕ К БАЗЕ SUPABASE... ОК",
        "ЗАПУСК ИНТЕРФЕЙСА ТЕРМИНАЛА..."
      ];
      let lineIdx = 0;
      const typeLine = () => {
        if (lineIdx < biosText.length) {
          osBios.innerHTML += biosText[lineIdx] + '<br>';
          lineIdx++;
          setTimeout(typeLine, 150);
        } else {
          setTimeout(() => {
            osBios.style.display = 'none';
            osWorkspace.style.display = 'flex';
            windowForm.classList.add('window-animate');
            windowDoc.classList.add('window-animate');
          }, 300);
        }
      };
      typeLine();
    }, 1000);
  });

  const nameInput = document.getElementById('app-name');
  const albumInput = document.getElementById('app-album');
  const examListContainer = document.getElementById('app-exam-list');
  const submitBtn = document.getElementById('app-submit-btn');

  const paperName = document.getElementById('paper-name');
  const paperLink = document.getElementById('paper-link');
  const paperTest = document.getElementById('paper-test');
  const paperDate = document.getElementById('paper-date');
  const paperSignature = document.getElementById('paper-signature');
  const officialStamp = document.getElementById('official-stamp');

  paperDate.textContent = new Date().toLocaleDateString('ru-RU');

  // Привязка дропдауна подразделения к бланку
  const squadSelect = document.getElementById('app-squad');
  const paperSquad = document.getElementById('paper-squad');

  const squadFullNames = {
    'TVC': 'TVC — Телецентр г. Los Santos',
    'LSFM': 'LSFM — Радиоцентр г. Los Santos',
    'SFFM': 'SFFM — Радиоцентр г. San Fierro',
    'LVFM': 'LVFM — Радиоцентр г. Las Venturas'
  };

  const paperOrg = document.getElementById('paper-org');

  squadSelect.addEventListener('change', () => {
    const val = squadSelect.value;
    if (val && squadFullNames[val]) {
      paperSquad.textContent = squadFullNames[val];
      paperSquad.classList.remove('empty');
      // Обновляем название организации в тексте заявления
      if (paperOrg) {
        paperOrg.textContent = squadFullNames[val];
        paperOrg.style.color = '#10b981';
        paperOrg.style.borderColor = '#10b981';
      }
    } else {
      paperSquad.textContent = 'не выбран';
      paperSquad.classList.add('empty');
      if (paperOrg) {
        paperOrg.textContent = 'не выбрано';
        paperOrg.style.color = '#ef4444';
        paperOrg.style.borderColor = '#ef4444';
      }
    }
  });

  let selectedExamId = null;
  let debounceTimer;

  const updateBlank = () => {
    const n = nameInput.value.trim();
    const l = albumInput.value.trim();

    paperName.textContent = n || '...';
    if (n) {
      const parts = n.split('_');
      paperSignature.textContent = parts.length > 1 ? `${parts[0][0]}. ${parts[1]}` : n;
    } else {
      paperSignature.textContent = '';
    }

    if (l.length > 5) {
      paperLink.innerHTML = `<a href="${l}" target="_blank" style="color: #2563eb; text-decoration: none;">ПРИКРЕПЛЕНЫ ↗</a>`;
      paperLink.style.borderColor = '#2563eb';
    } else {
      paperLink.textContent = 'НЕТ';
      paperLink.style.borderColor = '#ef4444';
    }

    if (n.length >= 3 && l.length > 5 && selectedExamId) {
      submitBtn.disabled = false;
    } else {
      submitBtn.disabled = true;
    }
  };

  albumInput.addEventListener('input', updateBlank);

  nameInput.addEventListener('input', (e) => {
    updateBlank();
    clearTimeout(debounceTimer);
    selectedExamId = null;
    paperTest.textContent = 'НЕТ';
    paperTest.style.color = '#ef4444';
    paperTest.style.borderColor = '#ef4444';
    updateBlank();

    const name = e.target.value.trim();
    if (name.length < 3) {
      examListContainer.innerHTML = 'Введите корректный идентификатор...';
      return;
    }

    examListContainer.innerHTML = '<span class="blink" style="color: #3b82f6;">ПОИСК В БАЗЕ ДАННЫХ...</span>';

    debounceTimer = setTimeout(async () => {
      const { data, error } = await supabase.from('submissions').select('*').ilike('name', `%${name}%`).limit(4);

      if (error) {
        examListContainer.innerHTML = `
          <div style="padding: 12px; background: rgba(255, 193, 7, 0.1); border: 1px solid #ffc107; border-radius: 8px;">
            <div style="display: flex; align-items: start; gap: 8px; margin-bottom: 8px;">
              <span style="font-size: 1.2rem;">🔒</span>
              <div>
                <div style="color: #ffc107; font-weight: bold; margin-bottom: 4px;">Ошибка подключения к базе данных</div>
                <div style="color: #94a3b8; font-size: 0.85rem; line-height: 1.4;">
                  Возможно, Supabase заблокирован. Попробуйте использовать <strong style="color: #fff;">VPN</strong>.
                </div>
              </div>
            </div>
          </div>`;
      } else if (!data || data.length === 0) {
        examListContainer.innerHTML = '<span style="color: #ef4444;">ЗАПИСИ ОТСУТСТВУЮТ</span>';
      } else {
        const sorted = data.sort((a, b) => new Date(b.submittedAt || b.created_at || 0) - new Date(a.submittedAt || a.created_at || 0));

        examListContainer.innerHTML = sorted.map((ex) => {
          const rawDate = ex.submittedAt || ex.created_at;
          const dateStr = rawDate ? new Date(rawDate).toLocaleDateString('ru-RU', {month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'}) : '??';
          const score = ex.score || 0;
          const max = ex.maxScore || (ex.breakdown ? ex.breakdown.length : '23');
          return `
            <div class="db-item" data-id="${ex.id}" data-score="${score}/${max}">
              <div><strong>${ex.name}</strong><br><small style="color:#64748b;">Дата: ${dateStr}</small></div>
              <div style="color:#3b82f6; font-family:monospace; font-weight:bold;">[ ${score}/${max} ]</div>
            </div>
          `;
        }).join('');

        const items = examListContainer.querySelectorAll('.db-item');
        items.forEach(item => {
          item.addEventListener('click', () => {
            items.forEach(c => c.classList.remove('selected'));
            item.classList.add('selected');
            selectedExamId = item.dataset.id;
            paperTest.textContent = `ДА (${item.dataset.score})`;
            paperTest.style.color = '#10b981';
            paperTest.style.borderColor = '#10b981';
            updateBlank();
          });
        });
      }
    }, 600);
  });

  submitBtn.addEventListener('click', async () => {
    if (!selectedExamId) return;
    submitBtn.innerHTML = '<span class="blink">ОТПРАВКА СИСТЕМНОГО ПАКЕТА...</span>';
    submitBtn.disabled = true;

    const { error } = await supabase.from('applications').insert([{
      applicant_name: nameInput.value.trim(),
      squad: squadSelect ? squadSelect.value : '',
      passport_url: albumInput.value.trim(),
      licenses_url: albumInput.value.trim(),
      exam_id: selectedExamId,
      status: 'pending'
    }]);

    if (error) {
      alert('ОШИБКА ПЕРЕДАЧИ: ' + error.message);
      submitBtn.textContent = 'Передать контракт';
      submitBtn.disabled = false;
    } else {
      submitBtn.textContent = 'УСПЕШНО ЗАПИСАНО';
      submitBtn.style.background = '#10b981';
      nameInput.disabled = true;
      albumInput.disabled = true;
      examListContainer.style.opacity = '0.5';
      examListContainer.style.pointerEvents = 'none';
      officialStamp.classList.add('visible');
    }
  });
}