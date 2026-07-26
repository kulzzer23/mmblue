import { escapeHtml } from '../lib/dom.js';

export function renderLearningSection(container, learningContent) {
  const sections = learningContent.sections ?? [];
  const loadError = learningContent.loadError || false;

  // Показываем предупреждение о VPN если не загрузился контент
  if (loadError && sections.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; background: rgba(7, 13, 28, 0.5); border-radius: 16px; border: 1px solid rgba(127, 227, 255, 0.2); max-width: 800px; margin: 0 auto;">
        <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
        <h2 style="margin-bottom: 15px; color: #fff;">Не удалось загрузить материалы обучения</h2>
        
        <div style="background: rgba(255, 193, 7, 0.1); border: 2px solid #ffc107; border-radius: 12px; padding: 1.5rem; margin: 1.5rem auto; max-width: 600px; text-align: left;">
          <div style="display: flex; align-items: start; gap: 1rem;">
            <div style="font-size: 2rem; flex-shrink: 0;">🔒</div>
            <div>
              <h4 style="color: #ffc107; margin: 0 0 0.5rem 0; font-size: 1.1rem;">Возможно, Supabase заблокирован в вашей стране</h4>
              <p style="margin: 0; line-height: 1.6; color: #cbd5e1;">
                Если материалы обучения не загружаются, попробуйте использовать <strong style="color: #fff;">VPN</strong> для доступа к сайту. 
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

  // --- ВАЖНО: Память статуса (должна быть здесь, снаружи renderLine) ---
  let exampleMode = 'default';

  const renderLine = (line) => {
    // --- ПАРСИНГ КАРТИНОК И КНОПОК ---
    if (line.startsWith('[IMG:')) {
      const url = line.replace('[IMG:', '').replace(']', '').trim();
      return `<img src="${escapeHtml(url)}" class="learning-image" alt="Иллюстрация" />`;
    }
    
    if (line.startsWith('[BTN:')) {
      const match = line.match(/\[BTN:(.+?)\|(.+?)\]/);
      if (match) {
        return `
          <a href="${escapeHtml(match[1])}" target="_blank" class="primary-button download-btn" download>
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            ${escapeHtml(match[2])}
          </a>
        `;
      }
    }

    // --- ПАРСИНГ ТАБЛИЦ ---
    if (line.startsWith('[TABLE:')) {
      const match = line.match(/\[TABLE:(.+?)\|(.+?)\]/);
      if (match) {
        return `
          <div class="learning-table-row">
            <div class="table-key">${escapeHtml(match[1].trim())}</div>
            <div class="table-value">${escapeHtml(match[2].trim())}</div>
          </div>
        `;
      }
    }

    // Твой код выше...
    
    let cleanLine = escapeHtml(line); // <-- Обрати внимание, я заменил const на let, чтобы строку можно было изменить

    // --- НОВАЯ ФИШКА: Автоматическая красная плашка для ТЭГ | ПРО ---
    cleanLine = cleanLine.replace(/ТЭГ \| ПРО/g, '<span class="tag-pro-badge">ТЭГ | ПРО</span>');

    // --- СБРОС ЦВЕТА ПРИ НОВОМ ПРАВИЛЕ ---
    if (/^\d+\.\s/.test(line) || /^\d+\.\d+\.\s/.test(line) || /^\d+\.\d+\.\d+\.\s/.test(line)) {
      exampleMode = 'default';
    }
    
    // Твой код ниже...

    // --- СБРОС ЦВЕТА ПРИ НОВОМ ПРАВИЛЕ ---
    if (/^\d+\.\s/.test(line) || /^\d+\.\d+\.\s/.test(line) || /^\d+\.\d+\.\d+\.\s/.test(line)) {
      exampleMode = 'default';
    }

    // Отрисовка правил
    if (/^\d+\.\s/.test(line)) return `<p class="rule-lvl-1">${cleanLine}</p>`;
    if (/^\d+\.\d+\.\s/.test(line)) return `<p class="rule-lvl-2">${cleanLine}</p>`;
    if (/^\d+\.\d+\.\d+\.\s/.test(line)) return `<p class="rule-lvl-3">${cleanLine}</p>`;

    // --- ЛОВИМ СТАТУС, ЗАПОМИНАЕМ И РИСУЕМ ПЛАШКУ ---
    if (line.trim() === 'Верно:') {
      exampleMode = 'success';
      return `<div class="rule-badge success"><span>✓</span> Верно</div>`;
    }
    if (line.trim() === 'Неверно:') {
      exampleMode = 'error';
      return `<div class="rule-badge error"><span>✕</span> Неверно</div>`;
    }
    if (line.trim() === 'Примеры:') {
      exampleMode = 'info';
      return `<div class="rule-badge info">Примеры:</div>`;
    }

    // --- РИСУЕМ ПРИМЕР С ЗАПОМНЕННЫМ ЦВЕТОМ ---
    if (line.includes('ТЭГ |') || line.includes('Отправитель:') || line.startsWith('Номер ')) {
      return `<div class="rule-example example-${exampleMode}">${cleanLine}</div>`;
    }

    // Примечания
    if (line.includes('(!) ПРИМЕЧАНИЕ:') || line.includes('Примечание:')) {
      return `<div class="rule-note">${cleanLine}</div>`;
    }

    return `<p class="rule-default">${cleanLine}</p>`;
  };

  // ... дальше твой старый код: container.innerHTML = `...`
  container.innerHTML = `
    <style>
      /* Стили для премиального оглавления */
      .premium-toc-container {
        background: rgba(15, 23, 42, 0.4);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(127, 227, 255, 0.1);
        border-radius: 24px;
        padding: 30px;
        margin-bottom: 40px;
        box-shadow: 0 15px 35px rgba(0,0,0,0.2), inset 0 0 20px rgba(127, 227, 255, 0.02);
      }
      
      .premium-toc-btn {
        display: flex;
        align-items: center;
        gap: 16px;
        width: 100%;
        text-align: left;
        padding: 16px 20px;
        background: rgba(0, 0, 0, 0.25);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 16px;
        color: #eaf0ff;
        font-weight: 600;
        font-size: 1.05rem;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
      }
      
      .premium-toc-btn:hover {
        background: rgba(127, 227, 255, 0.08);
        border-color: rgba(127, 227, 255, 0.3);
        color: #fff;
        transform: translateX(8px);
        box-shadow: 0 4px 20px rgba(127, 227, 255, 0.15);
      }
      
      .premium-toc-icon {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.2rem;
        transition: all 0.3s;
        border: 1px solid rgba(255,255,255,0.05);
        flex-shrink: 0;
      }
      
      .premium-toc-btn:hover .premium-toc-icon {
        background: rgba(127, 227, 255, 0.15);
        border-color: rgba(127, 227, 255, 0.3);
        transform: scale(1.1) rotate(5deg);
      }

      /* Стили для кнопок под-разделов */
      .premium-sub-nav {
        background: rgba(0, 0, 0, 0.2);
        padding: 20px 24px;
        border-radius: 16px;
        border: 1px dashed rgba(255, 255, 255, 0.1);
        margin: 24px 0;
      }
      
      .premium-sub-btn {
        padding: 10px 18px;
        font-size: 0.9rem;
        font-weight: 600;
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 12px;
        color: #94a3b8;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
      }
      
      .premium-sub-btn:hover {
        background: rgba(127, 227, 255, 0.1);
        color: #7fe3ff;
        border-color: rgba(127, 227, 255, 0.3);
        transform: translateY(-3px);
        box-shadow: 0 4px 12px rgba(127, 227, 255, 0.15);
      }
    </style>

    <div class="learning-reader">
      
      <!-- ПРЕМИАЛЬНОЕ ОГЛАВЛЕНИЕ -->
      <aside class="learning-toc premium-toc-container">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
          <span style="font-size: 1.5rem;">📚</span>
          <span class="eyebrow" style="margin: 0;">Оглавление курса</span>
        </div>
        <h3 style="font-size: 1.8rem; margin: 0 0 10px 0; color: #fff;">${escapeHtml(learningContent.title)}</h3>
        <p style="color: #94a3b8; font-size: 1rem; line-height: 1.6; margin-bottom: 24px;">${escapeHtml(learningContent.intro)}</p>
        
        <div style="display: flex; flex-direction: column; gap: 12px;">
          ${sections
            .map(
              (section, index) => `
                <button 
                  type="button" 
                  class="premium-toc-btn"
                  onclick="document.getElementById('learning-${escapeHtml(section.id)}').scrollIntoView({behavior: 'smooth'})"
                >
                  <div class="premium-toc-icon">${index === 0 ? '📖' : index === 1 ? '⚖️' : index === 2 ? '🏢' : index === 3 ? '🎙️' : '📋'}</div>
                  <div style="display: flex; flex-direction: column; gap: 4px;">
                    <span style="font-size: 0.75rem; color: #7fe3ff; text-transform: uppercase; letter-spacing: 1px;">Раздел ${index + 1}</span>
                    <span>${escapeHtml(section.title)}</span>
                  </div>
                </button>
              `,
            )
            .join('')}
        </div>
      </aside>

      <!-- КОНТЕНТ ОБУЧЕНИЯ -->
      <div class="learning-content">
        ${sections
          .map((section, index) => {
            const hasSubsections = section.subsections && section.subsections.length > 0;

            return `
              <article class="lesson-card learning-section-card" id="learning-${escapeHtml(section.id)}" style="background: rgba(15, 23, 42, 0.4); border: 1px solid rgba(255,255,255,0.05); padding: 40px; border-radius: 24px;">
                <div class="section-title">
                  <span style="color: #7fe3ff;">Раздел ${index + 1}</span>
                  <strong style="font-size: 2rem; color: #fff;">${escapeHtml(section.title)}</strong>
                </div>
                <p style="font-size: 1.1rem; color: #cbd5e1; line-height: 1.6; margin-bottom: 24px;">${escapeHtml(section.summary)}</p>
                
                ${(section.paragraphs || []).map((paragraph) => `<p style="line-height: 1.7; color: #eaf0ff;">${escapeHtml(paragraph)}</p>`).join('')}
                
                ${hasSubsections ? `
                  <div class="premium-sub-nav">
                    <span style="display: block; font-size: 0.8rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; margin-bottom: 16px;">📑 Главы в этом разделе:</span>
                    <div style="display: flex; flex-wrap: wrap; gap: 12px;">
                      ${section.subsections.map((sub, subIndex) => `
                        <button 
                          type="button" 
                          class="premium-sub-btn"
                          onclick="document.getElementById('learning-${escapeHtml(section.id)}-sub-${subIndex}').scrollIntoView({behavior: 'smooth'})"
                        >
                          ${escapeHtml(sub.title)}
                        </button>
                      `).join('')}
                    </div>
                  </div>
                ` : ''}

                <div class="learning-subsections">
                  ${(section.subsections ?? [])
                    .map(
                      (subsection, subIndex) => `
                        <article class="subsection-card" id="learning-${escapeHtml(section.id)}-sub-${subIndex}" style="margin-top: 40px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.05);">
                          <h4 style="font-size: 1.4rem; color: #f8fafc; margin-bottom: 20px;">${escapeHtml(subsection.title)}</h4>
                          <div class="subsection-text-rules">
                            ${subsection.text.map(renderLine).join('')}
                          </div>
                        </article>
                      `,
                    )
                    .join('')}
                </div>
              </article>
            `;
          })
          .join('')}
      </div>
    </div>
  `;
  // --- ЛОГИКА ПЛАВАЮЩЕЙ ПАНЕЛИ ---
  // Ищем оригинальный блок, где лежат твои кнопки (Замени '.learning-toc', если у тебя другой класс/ID)
  const originalToc = container.querySelector('.learning-toc') || document.querySelector('.learning-toc');
   
  
  if (originalToc) {
    let floatingMenu = document.getElementById('floating-glass-menu');
    if (!floatingMenu) {
      floatingMenu = document.createElement('div');
      floatingMenu.id = 'floating-glass-menu';
      floatingMenu.className = 'floating-glass-menu';
      document.body.appendChild(floatingMenu);
    }

  floatingMenu.innerHTML = '';
    
    // 1. ЖЕСТКО ВЕШАЕМ СВОЙ КЛАСС НА КОНТЕЙНЕР
    floatingMenu.classList.add('lsfm-float-box');

    if (!document.getElementById('floating-menu-styles')) {
      const style = document.createElement('style');
      style.id = 'floating-menu-styles';
      style.textContent = `
        /* Теперь стили обращаются именно к нашему классу */
        .lsfm-float-box.collapsed .nav-link-btn { display: none !important; }
        .lsfm-float-box.collapsed .toggle-btn { display: block !important; width: 100%; margin-bottom: 0; }
        .lsfm-float-box.collapsed { padding: 10px !important; min-width: 150px; }
      `;
      document.head.appendChild(style);
    }

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'toggle-btn';
    toggleBtn.innerHTML = floatingMenu.classList.contains('collapsed') ? '≡ Раскрыть' : '✖ Скрыть';
    
    toggleBtn.onclick = () => {
      floatingMenu.classList.toggle('collapsed');
      toggleBtn.innerHTML = floatingMenu.classList.contains('collapsed') ? '≡ Раскрыть' : '✖ Скрыть';
    };
    floatingMenu.appendChild(toggleBtn);

    const originalButtons = originalToc.querySelectorAll('button');
    originalButtons.forEach(originalBtn => {
      const cloneBtn = originalBtn.cloneNode(true);
      cloneBtn.classList.add('nav-link-btn'); // Класс для кнопок навигации
      
      cloneBtn.addEventListener('click', () => {
        originalBtn.click();
        floatingMenu.querySelectorAll('button.active').forEach(b => b.classList.remove('active'));
        cloneBtn.classList.add('active');
      });
      floatingMenu.appendChild(cloneBtn);
    });

    window.onscroll = () => {
      const rect = originalToc.getBoundingClientRect();
      if (rect.bottom < 0) {
        floatingMenu.classList.add('visible');
      } else {
        floatingMenu.classList.remove('visible');
      }
    };
  }
}