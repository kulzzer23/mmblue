import { escapeHtml } from '../lib/dom.js';

// Храним состояние экзамена
let isExamStarted = false;

// Храним ссылки на функции анти-чита
let examVisibilityHandler = null;
let examTabCheatHandler = null;

function createQuestionMarkup(question, index, currentAnswer, currentUserName = '') {
  const options = question.options ?? [];

  // ЕСЛИ ЭТО ОБЫЧНЫЙ ТЕСТ С ВАРИАНТАМИ ОТВЕТОВ (Кружочки или Галочки)
  if (question.kind === 'single' || question.kind === 'multi') {
    const optionsMarkup = question.kind === 'single'
      ? `<div class="options">
          ${options.map((option) => `
            <label class="option-row">
              <input type="radio" name="exam-${question.id}" value="${escapeHtml(option)}" ${currentAnswer === option ? 'checked' : ''} />
              <span>${escapeHtml(option)}</span>
            </label>
          `).join('')}
        </div>`
      : `<div class="options">
          ${options.map((option) => `
            <label class="option-row">
              <input type="checkbox" data-option="${escapeHtml(option)}" ${Array.isArray(currentAnswer) && currentAnswer.includes(option) ? 'checked' : ''} />
              <span>${escapeHtml(option)}</span>
            </label>
          `).join('')}
        </div>`;

    return `
      <article class="question-card" data-question-id="${escapeHtml(question.id)}" data-original-index="${index}">
        <div class="question-meta">
          <span class="q-number">Вопрос ${index + 1}</span>
        </div>
        <h3>${escapeHtml(question.title)}</h3>
        <p>${escapeHtml(question.prompt)}</p>
        ${optionsMarkup}
      </article>
    `;
  } 

  // === ЕСЛИ ЭТО ТЕСТ С КАРТИНКАМИ ===
  // === ЕСЛИ ЭТО ТЕСТ С КАРТИНКАМИ (ОТОБРАЖАЕМ СВЕРХУ ВНИЗ) ===
  else if (question.kind === 'single-image') {
    const optionsMarkup = `
      <div class="options" style="display: flex; flex-direction: column; gap: 15px; margin-top: 15px;">
        ${options.map((option) => {
          const isChecked = currentAnswer === option;
          return `
            <label class="option-row ${isChecked ? 'selected-option' : ''}" style="flex-direction: column; padding: 12px; align-items: flex-start; transition: all 0.2s ease;">
              <img src="${escapeHtml(option)}" style="width: 100%; height: auto; max-height: 400px; object-fit: contain; border-radius: 8px; margin-bottom: 12px; border: 2px solid ${isChecked ? '#7fe3ff' : 'transparent'}; box-shadow: 0 4px 6px rgba(0,0,0,0.3);" />
              <div style="display: flex; align-items: center; gap: 10px;">
                <input type="radio" name="exam-${question.id}" value="${escapeHtml(option)}" ${isChecked ? 'checked' : ''} style="accent-color: #7fe3ff; width: 20px; height: 20px; cursor: pointer;" />
                <span style="font-size: 1rem;">Выбрать этот вариант</span>
              </div>
            </label>
          `;
        }).join('')}
      </div>
    `;

    return `
      <article class="question-card" data-question-id="${escapeHtml(question.id)}" data-original-index="${index}">
        <div class="question-meta">
          <span class="q-number">Вопрос ${index + 1}</span>
        </div>
        <h3>${escapeHtml(question.title)}</h3>
        <p>${escapeHtml(question.prompt)}</p>
        ${optionsMarkup}
      </article>
    `;
  }
  
  // === ЕСЛИ ЭТО ТЕКСТОВЫЙ ВОПРОС (ОТРИСОВЫВАЕМ ИНТЕРФЕЙС SAMP) ===
  else {
    const senders = ['Haruki_Tanigawa', 'John_Doe', 'Carl_Johnson', 'Tommy_Vercetti', 'Leonard_Jemison'];
    const randomSender = senders[index % senders.length];
    const randomPhone = 100000 + ((index + 1) * 74321) % 899999;
    const editorName = currentUserName && currentUserName.trim() ? currentUserName.trim() : 'Неизвестно';

    const isRejected = currentAnswer && (currentAnswer.toUpperCase().includes('ПРО') || currentAnswer.toUpperCase().includes('ОТКАЗ') || currentAnswer.toUpperCase().includes('LS |'));

    const adHtml = isRejected 
      ? `<div style="color: #ff4757;">Объявление отклонено. Проверил сотрудник СМИ <span class="ad-editor-name">${escapeHtml(editorName)}</span></div>
         <div style="color: #ff4757;">Отклонено объявление: <span style="color: #ffaa00;">${escapeHtml(question.title)}</span></div>
         <div style="color: #ff4757;">Причина: <span class="ad-result-text">${escapeHtml(currentAnswer)}</span></div>`
      : `<div style="color: #00e500;"LS | <span class="ad-result-text">${escapeHtml(currentAnswer ?? '')}</span> | Отправил ${randomSender}[${10 + index}] (тел. ${randomPhone})</div>
         <div style="color: #00e500;">Объявление проверил сотрудник СМИ <span class="ad-editor-name">${escapeHtml(editorName)}</span></div>`;

    return `
      <article class="question-card samp-card-override" data-question-id="${escapeHtml(question.id)}" data-original-index="${index}" style="background: transparent; border: none; box-shadow: none; padding: 0;">
        <div class="question-meta" style="margin-bottom: 10px;">
          <span class="q-number" style="background: rgba(127, 227, 255, 0.1); color: #7fe3ff; padding: 4px 8px; border-radius: 4px; font-size: 0.85rem; font-weight: bold; border: 1px solid rgba(127, 227, 255, 0.2);">Вопрос ${index + 1}</span>
        </div>
        
        <div class="samp-text-container">
          
          <div class="samp-dialog-wrapper edit-mode" style="${currentAnswer ? 'display: none;' : 'display: block;'}">
            <div class="samp-dialog-header">Отредактируйте объявления</div>
            
            <div class="samp-dialog-row">
              <div class="samp-dialog-label">Отправитель:</div>
              <div class="samp-dialog-value">${randomSender}</div>
            </div>
            
            <div class="samp-dialog-row">
              <div class="samp-dialog-label">Текст:</div>
              <div class="samp-dialog-value samp-dialog-text-yellow">${escapeHtml(question.title)}</div>
            </div>
            
            <div class="samp-dialog-instructions">
              Введите новый текст для этого объявления или оставьте поле пустым если редактирование не нужно.<br>
              Вы можете пропустить это объявление с помощью команды <b>/adskip</b> или указав знак <b>"="</b> без кавычек одним символом и нажать "Принять".<br>
            </div>

            <div class="samp-dialog-input-container">
              <input type="text" 
                     class="samp-dialog-input" 
                     data-question-id="${escapeHtml(question.id)}" 
                     value="${escapeHtml(currentAnswer ?? '')}" 
                     autocomplete="off">
            </div>

            <div class="samp-dialog-buttons">
              <button type="button" class="samp-btn btn-accept" onclick="
                const container = this.closest('.samp-text-container');
                const inp = container.querySelector('input');
                const val = inp.value.trim();
                if(!val) return;
                
                inp.dispatchEvent(new Event('input', {bubbles: true})); 
                
                const nameField = document.getElementById('exam-name');
                const edName = nameField && nameField.value.trim() ? nameField.value.trim() : 'Неизвестно';
                const escapeStr = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                
                container.querySelector('.samp-published-ad').innerHTML = 
                  '<div style=\\'color: #00e500;\\'<span class=\\'ad-result-text\\'>' + escapeStr(val) + '</span> | Отправил ${randomSender}[${10 + index}] (тел. ${randomPhone})</div>' +
                  '<div style=\\'color: #00e500;\\'>Объявление проверил сотрудник СМИ <span class=\\'ad-editor-name\\'>' + escapeStr(edName) + '</span></div>';
                
                container.querySelector('.edit-mode').style.display = 'none';
                container.querySelector('.view-mode').style.display = 'block';
              ">Принять</button>
              
              <button type="button" class="samp-btn btn-reject" onclick="
                const container = this.closest('.samp-text-container');
                const inp = container.querySelector('input');
                let val = inp.value.trim();
                if (!val) {
                  val = 'LS | ПРО';
                  inp.value = val;
                }
                
                inp.dispatchEvent(new Event('input', {bubbles: true})); 
                
                const nameField = document.getElementById('exam-name');
                const edName = nameField && nameField.value.trim() ? nameField.value.trim() : 'Неизвестно';
                const origText = container.querySelector('.samp-dialog-text-yellow').textContent;
                const escapeStr = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                
                container.querySelector('.samp-published-ad').innerHTML = 
                  '<div style=\\'color: #ff4757;\\'>Объявление отклонено. Проверил сотрудник СМИ <span class=\\'ad-editor-name\\'>' + escapeStr(edName) + '</span></div>' +
                  '<div style=\\'color: #ff4757;\\'>Отклонено объявление: <span style=\\'color: #ffaa00;\\'>' + escapeStr(origText) + '</span></div>' +
                  '<div style=\\'color: #ff4757;\\'>Причина: <span class=\\'ad-result-text\\'>' + escapeStr(val) + '</span></div>';
                
                container.querySelector('.edit-mode').style.display = 'none';
                container.querySelector('.view-mode').style.display = 'block';
              ">Отклонить</button>
            </div>
          </div>

          <div class="view-mode" style="${currentAnswer ? 'display: block;' : 'display: none;'} margin-bottom: 25px;">
            <div class="samp-published-ad">
              ${adHtml}
            </div>
            <button type="button" class="samp-btn" style="margin-top: 12px; border-color: #ffaa00; color: #ffaa00; background: rgba(0,0,0,0.4);" onclick="
              const container = this.closest('.samp-text-container');
              container.querySelector('.view-mode').style.display = 'none';
              container.querySelector('.edit-mode').style.display = 'block';
              container.querySelector('input').focus();
            ">Изменить</button>
          </div>

        </div>
      </article>
    `;
  }
}

// --- ФУНКЦИИ АНТИ-ЧИТА ---
function enableAntiCheat(formEl) {
  disableAntiCheat(); 

  examVisibilityHandler = () => {
    const isExamVisible = formEl.offsetParent !== null;
    if (document.hidden && isExamVisible && isExamStarted) {
      alert("Внимание! Вы покинули вкладку во время экзамена. Страница будет перезагружена.");
      window.location.reload();
    }
  };
  document.addEventListener("visibilitychange", examVisibilityHandler);

  examTabCheatHandler = (event) => {
    const clickedTab = event.target.closest('.tab-button');
    if (clickedTab && clickedTab.dataset.section !== 'exam') {
      const isExamVisible = formEl.offsetParent !== null;
      if (isExamVisible && isExamStarted) {
        alert("Внимание! Вы попытались открыть другой раздел сайта во время экзамена. Экзамен аннулирован.");
        window.location.reload();
      }
    }
  };
  document.addEventListener("click", examTabCheatHandler, true);
}

function disableAntiCheat() {
  if (examVisibilityHandler) {
    document.removeEventListener("visibilitychange", examVisibilityHandler);
    examVisibilityHandler = null;
  }
  if (examTabCheatHandler) {
    document.removeEventListener("click", examTabCheatHandler, true);
    examTabCheatHandler = null;
  }
}

export function renderExamSection({ formEl, questions, state, onAnswerChange, onMetaChange, onSubmit, loadError }) {
  
  // Внедряем стили SAMP Диалога автоматически при первом открытии
  if (!document.getElementById('samp-dialog-css')) {
    const style = document.createElement('style');
    style.id = 'samp-dialog-css';
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Arimo:wght@400;700&display=swap');

      .samp-dialog-wrapper { background-color: rgba(0, 0, 0, 0.85); border-radius: 6px; padding: 15px 20px; font-family: 'Arimo', Arial, sans-serif; color: #ffffff; max-width: 700px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5); user-select: none; transition: box-shadow 0.2s ease; }

      .samp-dialog-header { color: #33cc33; font-weight: bold; font-size: 15px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
      .samp-dialog-row { display: flex; margin-bottom: 4px; font-size: 14px; }
      .samp-dialog-label { width: 110px; font-weight: bold; }
      .samp-dialog-value { flex: 1; }
      .samp-dialog-text-yellow { color: #ffaa00; font-weight: bold; }
      .samp-dialog-instructions { font-size: 13px; margin-top: 15px; margin-bottom: 15px; line-height: 1.4; color: #ffffff; }
      .samp-dialog-instructions b { color: #a9c4e2; font-weight: normal; }
      .samp-dialog-input-container { margin-bottom: 15px; }
      .samp-dialog-input { width: 100%; background-color: #000000; border: 2px solid #ffffff; border-radius: 6px; color: #ffffff; padding: 8px 12px; font-family: 'Arimo', Arial, sans-serif; font-size: 14px; outline: none; transition: border-color 0.2s; }
      .samp-dialog-input:focus { border-color: #a9c4e2; }
      .samp-dialog-buttons { display: flex; justify-content: center; gap: 15px; }
      .samp-btn { background: transparent; border: 2px solid #ffffff; color: #ffffff; padding: 5px 20px; border-radius: 20px; cursor: pointer; font-family: 'Arimo', Arial, sans-serif; font-size: 14px; transition: 0.2s; font-weight: bold; }
      .samp-btn:hover { background: rgba(255, 255, 255, 0.15); transform: translateY(-1px); }
      .samp-btn:active { transform: translateY(0) scale(0.96); }
      .btn-reject:hover { border-color: #ff4757; color: #ff4757; }
      .btn-accept:hover { border-color: #33cc33; color: #33cc33; }
      .btn-reject:active { border-color: #ff4757; color: #ff4757; }
      .btn-accept:active { border-color: #33cc33; color: #33cc33; }

      .samp-published-ad { 
        background: rgba(0, 0, 0, 0.55); 
        padding: 14px 18px; 
        border-radius: 6px; 
        font-family: 'Arial', sans-serif; 
        font-weight: 900; 
        font-size: 15px; 
        text-shadow: 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 2px 2px 2px rgba(0,0,0,0.8);
        line-height: 1.5; 
        letter-spacing: 0.3px;
        box-shadow: inset 0 0 10px rgba(0,0,0,0.5);
        animation: samp-ad-appear 0.35s cubic-bezier(0.25, 0.8, 0.25, 1);
      }

      @keyframes samp-ad-appear {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: translateY(0); }
      }

    `;
    document.head.appendChild(style);
  }

  // Показываем предупреждение о VPN если не загрузились вопросы
  if (loadError || questions.length === 0) {
    disableAntiCheat();
    formEl.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; background: rgba(7, 13, 28, 0.5); border-radius: 16px; border: 1px solid rgba(127, 227, 255, 0.2);">
        <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
        <h2 style="margin-bottom: 15px; color: #fff;">Не удалось загрузить вопросы экзамена</h2>
        
        <div style="background: rgba(255, 193, 7, 0.1); border: 2px solid #ffc107; border-radius: 12px; padding: 1.5rem; margin: 1.5rem auto; max-width: 600px; text-align: left;">
          <div style="display: flex; align-items: start; gap: 1rem;">
            <div style="font-size: 2rem; flex-shrink: 0;">🔒</div>
            <div>
              <h4 style="color: #ffc107; margin: 0 0 0.5rem 0; font-size: 1.1rem;">Возможно, Supabase заблокирован в вашей стране</h4>
              <p style="margin: 0; line-height: 1.6; color: #cbd5e1;">
                Если вопросы экзамена не загружаются, попробуйте использовать <strong style="color: #fff;">VPN</strong> для доступа к сайту. 
                Рекомендуем подключиться к серверам в <strong>США</strong> или <strong>Европе</strong>.
              </p>
            </div>
          </div>
        </div>
        
        <button onclick="window.location.reload()" class="primary-button" style="margin-top: 1rem;">
          🔄 Обновить страницу
        </button>
      </div>
    `;
    return;
  }

  if (!isExamStarted) {
    disableAntiCheat(); 
    
   formEl.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; background: rgba(7, 13, 28, 0.5); border-radius: 16px; border: 1px solid rgba(127, 227, 255, 0.2);">
        <h2 style="margin-bottom: 15px; color: #fff;">Готов сдать экзамен?</h2>
        
        <!-- БЛОК АНТИ-ЧИТА -->
        <div style="margin-bottom: 25px; max-width: 550px; margin-left: auto; margin-right: auto; background: rgba(255, 218, 117, 0.05); border: 1px solid rgba(255, 218, 117, 0.3); padding: 16px 20px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
          <p style="margin: 0 0 8px 0; color: #ffda75; font-weight: 800; font-size: 1.1rem; letter-spacing: 0.5px;">
            🚨 ЗАПУСТИТСЯ АНТИ-ЧИТ СИСТЕМА
          </p>
          <p style="margin: 0; color: #cbd5e1; line-height: 1.5; font-size: 0.95rem;">
            Сворачивать браузер, переключать вкладки или подглядывать в «Обучение» строго <b style="color: #ff4757;">запрещено</b>. Любое из этих действий приведет к <b style="color: #ff4757;">аннулированию</b>.
          </p>
        </div>
        <!-- КОНЕЦ БЛОКА АНТИ-ЧИТА -->

        <div style="background: rgba(255, 71, 87, 0.04); border-left: 4px solid #ff4757; padding: 22px 28px; border-radius: 0 16px 16px 0; margin: 25px auto; font-family: sans-serif; line-height: 1.6; max-width: 600px; text-align: left; box-shadow: inset 0 0 20px rgba(255, 71, 87, 0.02);">
    
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 15px;">
      <span style="font-size: 1.6rem; filter: drop-shadow(0 0 8px rgba(255, 71, 87, 0.6));">⚠️</span>
      <h3 style="color: #ff4757; margin: 0; font-size: 1.15rem; text-transform: uppercase; letter-spacing: 1px; font-weight: 800;">Внимание, стажёры!</h3>
    </div>
    
    <p style="color: #cbd5e1; margin: 0; font-size: 1.05rem;">
      Старший состав будет <b style="color: #fff;">тщательно проверять</b> не только ваше понимание 
      <span style="color: #7fe3ff; font-weight: 600; border-bottom: 1px dashed rgba(127, 227, 255, 0.5); cursor: default;">ПРО</span>, 
      <span style="color: #7fe3ff; font-weight: 600; border-bottom: 1px dashed rgba(127, 227, 255, 0.5); cursor: default;">устава</span> и 
      <span style="color: #7fe3ff; font-weight: 600; border-bottom: 1px dashed rgba(127, 227, 255, 0.5); cursor: default;">ППЭ</span>, 
      но и практическую <span style="color: #ffda75; font-weight: 700; text-decoration: underline; text-underline-offset: 4px; text-decoration-color: rgba(255, 218, 117, 0.5);">правильность редактирования</span> объявлений.
    </p>
    
    <div style="margin-top: 18px; padding-top: 16px; border-top: 1px solid rgba(255, 71, 87, 0.15);">
      <div style="display: inline-block; background: rgba(255, 71, 87, 0.1); color: #ff6b81; padding: 4px 12px; border-radius: 6px; font-size: 0.85rem; font-weight: bold; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;">
        Особый контроль
      </div>
      <p style="color: #97a7c6; margin: 0; font-size: 0.95rem;">
        Критически важно строгое соблюдение <b style="color: #fff;">орфографии</b> и <b style="color: #fff;">пунктуации</b> <i style="color: #64748b;">(правильной расстановки знаков препинания)</i>. За ошибки в тексте объявлений экзамен может быть аннулирован.
      </p>
    </div>
    
  </div>
        <button id="btn-start-exam" class="primary-button" type="button" style="font-size: 1.1rem; padding: 12px 30px;">Начать экзамен</button>
      </div>
    `;

    formEl.querySelector('#btn-start-exam').addEventListener('click', () => {
      isExamStarted = true; 
      renderExamSection({ formEl, questions, state, onAnswerChange, onMetaChange, onSubmit });
    });
    return; 
  }


  // --- ЭКЗАМЕН НАЧАЛСЯ ---
  enableAntiCheat(formEl); 

  formEl.innerHTML = `
    <div class="grid-3">
      <label>
        Имя
        <input id="exam-name" class="text-input" value="${escapeHtml(state.meta.name)}" placeholder="Имя_Фамилия" />
      </label>
      <label>
        Подразделение
        <select id="exam-squad" class="text-input">
          <option value="" disabled ${!state.meta.squad ? 'selected' : ''}>Выберите подразделение</option>
          <option value="TVC" ${state.meta.squad === 'TVC' ? 'selected' : ''}>TVC (Телецентр)</option>
          <option value="LSFM" ${state.meta.squad === 'LSFM' ? 'selected' : ''}>LSFM (Лос-Сантос)</option>
          <option value="SFFM" ${state.meta.squad === 'SFFM' ? 'selected' : ''}>SFFM (Сан-Фиерро)</option>
          <option value="LVFM" ${state.meta.squad === 'LVFM' ? 'selected' : ''}>LVFM (Лас-Вентурас)</option>
        </select>
      </label>
    </div>
    
    <div id="exam-questions-container">
      ${questions.map((question, index) => createQuestionMarkup(question, index, state.answers[question.id], state.meta.name)).join('')}
    </div>
    
    <div class="form-footer">
      <button class="primary-button" type="submit">Сдать экзамен</button>
      <p>Система не знает правильные ответы. Проверяющий позже пометит экзамен как «сдал» или «не сдал».</p>
    </div>
  `;

  // --- ПЕРЕХВАТ ОТПРАВКИ ---
  formEl.addEventListener('submit', (event) => {
    event.preventDefault(); 
    disableAntiCheat(); 
    isExamStarted = false; 

    onSubmit(event); 
  });


  // Слушатели данных
  formEl.querySelector('#exam-name').addEventListener('input', (event) => onMetaChange('name', event.currentTarget.value));
  formEl.querySelector('#exam-squad').addEventListener('change', (event) => onMetaChange('squad', event.currentTarget.value));

  // --- ОБРАБОТКА ПОДСВЕТКИ ОБЫЧНЫХ И ГРАФИЧЕСКИХ ТЕСТОВ ---
  const handleOptionSelect = (input) => {
    const qCard = input.closest('.question-card');
    const isMulti = input.type === 'checkbox';
    const label = input.closest('.option-row');

    if (!isMulti) {
      qCard.querySelectorAll('.option-row').forEach(row => {
        row.classList.remove('selected-option');
        const img = row.querySelector('img');
        if (img) img.style.borderColor = 'transparent';
      });
      if (input.checked) {
        label.classList.add('selected-option');
        const img = label.querySelector('img');
        if (img) img.style.borderColor = '#7fe3ff';
      }
    } else {
      label.classList.toggle('selected-option', input.checked);
    }
  };

  formEl.querySelectorAll('input[type="radio"]').forEach((input) => {
    input.addEventListener('change', (event) => {
      handleOptionSelect(event.currentTarget);
      // ВАЖНО: передаем 'single', чтобы submitExam (в main.js) правильно начислил авто-баллы
      const questionId = input.closest('[data-question-id]').dataset.questionId;
      onAnswerChange(questionId, event.currentTarget.value, 'single');
    });
  });

  formEl.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.addEventListener('change', (event) => {
      handleOptionSelect(event.currentTarget);
      const questionId = input.closest('[data-question-id]').dataset.questionId;
      onAnswerChange(questionId, input.dataset.option, 'multi');
    });
  });

  // Захватываем ввод из SAMP-инпутов
  formEl.querySelectorAll('input.samp-dialog-input').forEach((inputField) => {
    inputField.addEventListener('input', () => {
      onAnswerChange(inputField.dataset.questionId, inputField.value, 'text');
    });
  });
}