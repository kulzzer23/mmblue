import { config } from './config.js';
import { getLearningContent } from './data/learning.js';
import { practiceQuestions } from './data/practice.js';
import { renderLearningSection } from './sections/learning.js';
import { renderPracticeResult, renderPracticeSection } from './sections/practice.js';
import { renderExamSection } from './sections/exam.js';
import { createSubmissionStore, normalizeSubmissionRecord } from './lib/submissions.js';
import { renderApplicationSection } from './sections/application.js';
import { escapeHtml } from './lib/dom.js';

// Пытаемся загрузить Supabase, но не падаем если не получится
let createClient = null;
let supabaseImportError = false;

try {
  const module = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  createClient = module.createClient;
} catch (err) {
  console.error('Не удалось загрузить Supabase SDK:', err);
  supabaseImportError = true;
}

export let supabaseClient = null;
export let examQuestions = []; 
const store = createSubmissionStore();

// ... дальше пошел твой код (функции и т.д.)

function createBlankAnswers(questions) {
  return questions.reduce((accumulator, question) => {
    accumulator[question.id] = question.kind === 'multi' ? [] : '';
    return accumulator;
  }, {});
}

function normalize(text) {
  if (!text) return '';
  // Удаляем вообще ВСЕ пробелы, табы и невидимые символы, приводим к нижнему регистру
  // 'LS | ПРО', 'ls|про', ' LS  |  ПРО ' -> всё превратится строго в 'ls|про'
  return String(text).toLowerCase().replace(/[\s\u200B-\u200D\uFEFF]/g, '');
}

function scorePracticeQuestion(question, answer) {
  if (question.kind === 'single' || question.kind === 'single-image') {
    const isCorrect = normalize(answer) === normalize(question.correctAnswer ?? '');
    return { score: isCorrect ? 1 : 0, note: isCorrect ? 'Верно' : 'Неверно' };
  }

  if (question.kind === 'multi') {
    const correct = [...(question.correctAnswer ?? [])].map(normalize).sort();
    const selected = [...(Array.isArray(answer) ? answer : [answer])].map(normalize).filter(Boolean).sort();
    const isCorrect = correct.length === selected.length && correct.every((item, index) => item === selected[index]);
    return { score: isCorrect ? 1 : 0, note: isCorrect ? 'Все пункты найдены' : 'Частичный или неверный ответ' };
  }

  const text = normalize(answer);
  const hits = (question.keywords ?? []).filter((keyword) => text.includes(normalize(keyword)));
  const score = hits.length > 0 ? 1 : 0;
  return { score, note: hits.length > 0 ? `Найдено ключевых идей: ${hits.length}` : 'Нужны факты и ключевые слова' };
}

function formatDate(value) {
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

let dom = {};

const state = {
  activeSection: 'learn',
  isAdmin: false,
  submissions: [],
  selectedSubmissionId: null,
  applications: [], // НОВОЕ: массив заявлений
  selectedAppId: null, // НОВОЕ: выбранное заявление
  adminViewMode: 'exams', // НОВОЕ: 'exams' или 'apps'
  adminStatusFilter: 'all',
  practiceAnswers: {}, 
  practiceResult: null,
  examAnswers: {}, 
  examMeta: { name: '', squad: '', contact: '' },
};

function getReviewStatusLabel(status) {
  if (status === 'passed') return 'Сдал';
  if (status === 'failed') return 'Не сдал';
  return 'Не проверено';
}

function getReviewStatusClass(status) {
  if (status === 'passed') return 'status-passed';
  if (status === 'failed') return 'status-failed';
  return 'status-unchecked';
}

function getFilteredSubmissions() {
  const query = normalize(dom.adminSearch?.value ?? '');
  const filter = state.adminStatusFilter;
  const squadFilter = state.adminSquad; // null = суперадмин видит всё

  return [...state.submissions]
    .filter((submission) => !squadFilter || normalize(submission.squad) === normalize(squadFilter))
    .filter((submission) => !filter || filter === 'all' || submission.reviewStatus === filter)
    .filter((submission) => !query || [submission.name, submission.squad, submission.contact, submission.id].some((value) => normalize(value).includes(query)))
    .sort((left, right) => right.submittedAt.localeCompare(left.submittedAt));
}

function setSection(section) {
  state.activeSection = section;
  dom.learnSection.classList.toggle('hidden', section !== 'learn');
  dom.practiceSection.classList.toggle('hidden', section !== 'practice');
  dom.examSection.classList.toggle('hidden', section !== 'exam');
  dom.applySection.classList.toggle('hidden', section !== 'apply'); // НОВОЕ
  dom.tabButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.section === section);
  });

  // Плавное появление активного раздела при переключении вкладки
  const activeMap = { learn: dom.learnSection, practice: dom.practiceSection, exam: dom.examSection, apply: dom.applySection };
  const activeEl = activeMap[section];
  if (activeEl) {
    activeEl.classList.remove('section-fade-in');
    // Перезапускаем анимацию на следующем кадре
    requestAnimationFrame(() => activeEl.classList.add('section-fade-in'));
  }
}


function updateHeroStats() {
  if (dom.questionsCount) {
    dom.questionsCount.textContent = String(practiceQuestions.length + examQuestions.length);
  }
  if (dom.lessonsCount) {
    dom.lessonsCount.textContent = String((window.__learningContent?.sections ?? []).length);
  }
  if (dom.savedCount) {
    dom.savedCount.textContent = String(state.submissions.length);
  }

  const pending = state.submissions.filter((submission) => submission.reviewStatus === 'unchecked').length;
  const reviewed = state.submissions.length - pending;

  if (dom.pendingCount) dom.pendingCount.textContent = String(pending);
  if (dom.reviewedCount) dom.reviewedCount.textContent = String(reviewed);
  if (dom.adminCountText) {
    dom.adminCountText.textContent = `${state.submissions.length} сохраненных экзаменов, поиск, фильтр и ручная проверка.`;
  }
  if (dom.submittedNote) {
    dom.submittedNote.classList.toggle('hidden', !state.submissions.some((submission) => submission.id === state.selectedSubmissionId));
  }
}

async function loadLearningSection() {
  const learningContent = await getLearningContent();
  window.__learningContent = learningContent;

  const learningContainer =
    dom.learningGrid ||
    dom.learnSection?.querySelector('[data-learning-root]') ||
    dom.learnSection?.querySelector('#learning-grid');

  if (learningContainer) {
    renderLearningSection(learningContainer, learningContent);
  } else {
    console.warn('Learning section container not found. Expected #learning-grid or [data-learning-root].');
  }

  updateHeroStats();
}

function renderSubmissionList() {
  if (!dom.submissionList || !dom.adminSearch) return;

  const filtered = getFilteredSubmissions();

  dom.submissionList.innerHTML = filtered.length
    ? filtered
        .map(
          (submission) => {
            // --- ОПРЕДЕЛЯЕМ ЦВЕТА ДЛЯ ЛЕВОЙ ПАНЕЛИ ---
            const isPassed = submission.reviewStatus === 'passed';
            const isFailed = submission.reviewStatus === 'failed';
            
            let statusStyle = 'color: #94a3b8; background: rgba(148,163,184,0.1); border: 1px solid rgba(148,163,184,0.2);'; // Не проверено
            if (isPassed) statusStyle = 'color: #2ecc71; background: rgba(46,204,113,0.1); border: 1px solid rgba(46,204,113,0.2);'; // Сдал
            if (isFailed) statusStyle = 'color: #ff4757; background: rgba(255,71,87,0.1); border: 1px solid rgba(255,71,87,0.2);'; // Не сдал

            return `
              <button type="button" class="submission-item ${getReviewStatusClass(submission.reviewStatus)} ${state.selectedSubmissionId === submission.id ? 'active' : ''}" data-id="${submission.id}">
                <strong style="font-size: 1rem; color: #fff;">${submission.name}</strong>
                <span style="color: #97a7c6; font-size: 0.85rem; margin-top: 2px; display: block;">${submission.squad}</span>
                
                <div style="margin-top: 10px; display: flex; align-items: center; flex-wrap: wrap; gap: 8px; font-size: 0.8rem; color: #64748b;">
                  <span style="padding: 2px 6px; border-radius: 4px; font-weight: bold; ${statusStyle}">
                    ${getReviewStatusLabel(submission.reviewStatus)}
                  </span>
                  <span style="color: #7fe3ff; font-weight: bold;">${submission.score ?? 0}/${submission.maxScore ?? 0}</span>
                  <span>${formatDate(submission.submittedAt)}</span>
                </div>
              </button>
            `;
          }
        )
        .join('')
    : '<div class="empty-state">Пока нет сохраненных попыток.</div>';

  dom.submissionList.querySelectorAll('[data-id]').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedSubmissionId = button.dataset.id;
      renderAdminDetail();
      renderSubmissionList();
    });
  });
}
function renderAdminDetail() {
  if (!dom.adminDetail) return;

  const filtered = getFilteredSubmissions();
  const selected = filtered.find((submission) => submission.id === state.selectedSubmissionId) ?? filtered[0] ?? null;

  if (!selected) {
    dom.adminDetail.innerHTML = `
      <div class="empty-state" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 200px; color: #64748b; font-size: 1.1rem; background: rgba(255,255,255,0.02); border-radius: 12px; border: 1px dashed rgba(255,255,255,0.1);">
        <span style="font-size: 2.5rem; margin-bottom: 15px;">👈</span>
        Выбери попытку слева, чтобы увидеть ответы
      </div>`;
    return;
  }

  state.selectedSubmissionId = selected.id;
  const breakdownArray = selected.breakdown ?? selected.responses ?? [];

  const isPassed = selected.reviewStatus === 'passed';
  const isFailed = selected.reviewStatus === 'failed';
  const isUnchecked = selected.reviewStatus === 'unchecked' || !selected.reviewStatus;

  // Стиль кнопок сброса/решения
  const btnStyleBase = `padding: 12px 20px; border-radius: 10px; cursor: pointer; transition: all 0.2s ease; font-weight: bold; font-family: inherit; font-size: 0.95rem; display: flex; align-items: center; justify-content: center; gap: 8px; flex: 1;`;
  const btnPassedStyle = `${btnStyleBase} ${isPassed ? 'background: #2ecc71; color: #000; border: 1px solid #2ecc71; box-shadow: 0 4px 15px rgba(46,204,113,0.3); transform: translateY(-2px);' : 'background: rgba(46,204,113,0.1); color: #2ecc71; border: 1px solid rgba(46,204,113,0.3);'}`;
  const btnFailedStyle = `${btnStyleBase} ${isFailed ? 'background: #ff4757; color: #fff; border: 1px solid #ff4757; box-shadow: 0 4px 15px rgba(255,71,87,0.3); transform: translateY(-2px);' : 'background: rgba(255,71,87,0.1); color: #ff4757; border: 1px solid rgba(255,71,87,0.3);'}`;
  const btnUncheckedStyle = `${btnStyleBase} ${isUnchecked ? 'background: #94a3b8; color: #000; border: 1px solid #94a3b8;' : 'background: rgba(148,163,184,0.1); color: #94a3b8; border: 1px solid rgba(148,163,184,0.3);'}`;

  // Блок с кнопками
  const reviewButtonsHtml = `
    <div class="admin-actions admin-review-actions" style="display: flex; gap: 12px; flex-wrap: wrap; margin-top: 20px; width: 100%;">
      <button type="button" data-review="passed" style="${btnPassedStyle}">✅ Сдал</button>
      <button type="button" data-review="failed" style="${btnFailedStyle}">❌ Не сдал</button>
      <button type="button" data-review="unchecked" style="${btnUncheckedStyle}">⏳ Сбросить</button>
      <button type="button" id="delete-submission-btn" style="padding: 12px 20px; border-radius: 10px; cursor: pointer; transition: 0.2s; font-weight: bold; font-family: inherit; font-size: 0.95rem; background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.4); margin-left: auto; display: flex; align-items: center; gap: 8px;">🗑️ Удалить</button>
    </div>
  `;

  dom.adminDetail.innerHTML = `
    <!-- Шапка попытки -->
    <div class="detail-header" style="background: #1e293b; padding: 24px; border-radius: 16px; margin-bottom: 25px; border: 1px solid #334155; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 20px;">
        <div style="flex: 1; min-width: 250px;">
          <span style="font-size: 0.8rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; font-weight: bold;">Экзамен / Тест</span>
          <h3 style="margin: 8px 0 0 0; font-size: 1.6rem; color: #f8fafc;">${selected.name}</h3>
          
          <div class="detail-meta" style="display: flex; flex-wrap: wrap; gap: 16px; margin-top: 16px; color: #cbd5e1; font-size: 0.95rem;">
            <span style="display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.05); padding: 4px 10px; border-radius: 6px;">🏢 ${selected.squad}</span>
            <span style="display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.05); padding: 4px 10px; border-radius: 6px;">📱 ${selected.contact || 'Нет контакта'}</span>
            <span style="display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.05); padding: 4px 10px; border-radius: 6px;">📅 ${formatDate(selected.submittedAt)}</span>
          </div>
        </div>
        
        <div style="text-align: right; background: rgba(0,0,0,0.2); padding: 16px 24px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
          <strong class="status-pill ${getReviewStatusClass(selected.reviewStatus)}" style="margin-bottom: 8px; display: inline-block; font-size: 0.9rem;">${getReviewStatusLabel(selected.reviewStatus)}</strong>
          <div style="color: #38bdf8; font-size: 1.8rem; font-weight: 900; margin-top: 4px;">
            ${selected.score ?? 0} <span style="font-size: 1.1rem; color: #64748b;">/ ${selected.maxScore ?? breakdownArray.length}</span>
          </div>
          <div style="font-size: 0.8rem; color: #64748b; text-transform: uppercase; margin-top: 4px; font-weight: bold;">Баллов набрано</div>
        </div>
      </div>
      
      ${reviewButtonsHtml}
    </div>

    <!-- Список ответов -->
    <div class="breakdown-list" style="display: flex; flex-direction: column; gap: 24px;">
      ${breakdownArray
        .map(
          (response, index) => {
            let hint = '';
            let correctAnswersText = '';
            let isImageKind = false;
            
            // --- Логика Снапшотов или Фолбэк ---
            if (response.snapshotKind) {
              if (response.snapshotHint) hint = response.snapshotHint;
              isImageKind = response.snapshotKind === 'single-image';
              
              if (response.snapshotKind === 'single') {
                correctAnswersText = response.snapshotCorrect;
              } else if (response.snapshotKind === 'single-image') {
                correctAnswersText = `<img src="${escapeHtml(response.snapshotCorrect)}" style="max-height: 180px; max-width: 100%; object-fit: contain; border-radius: 8px; margin-top: 10px; border: 2px solid #2ecc71; box-shadow: 0 4px 12px rgba(46,204,113,0.15); display: block;">`;
              } else if (response.snapshotKind === 'multi') {
                const arr = Array.isArray(response.snapshotCorrect) ? response.snapshotCorrect : response.snapshotCorrect.split(',');
                correctAnswersText = `<ul style="margin: 5px 0 0 0; padding-left: 20px; color: #e2e8f0;"><li>${arr.join('</li><li>')}</li></ul>`;
              } else if (response.snapshotKind === 'text' && response.snapshotCorrect) {
                correctAnswersText = response.snapshotCorrect;
              }
            } else {
              try {
                const targetArray = typeof examQuestions !== 'undefined' ? examQuestions : [];
                const qId = response.questionId || response.id;
                const question = targetArray.find(q => q.id === qId);
                
                if (question) {
                  if (question.reviewHint) hint = question.reviewHint;
                  isImageKind = question.kind === 'single-image';
                  
                  if (question.kind === 'single') {
                    correctAnswersText = question.correctAnswer;
                  } else if (question.kind === 'single-image') {
                    correctAnswersText = `<img src="${escapeHtml(question.correctAnswer)}" style="max-height: 180px; max-width: 100%; object-fit: contain; border-radius: 8px; margin-top: 10px; border: 2px solid #2ecc71; box-shadow: 0 4px 12px rgba(46,204,113,0.15); display: block;">`;
                  } else if (question.kind === 'multi') {
                    const arr = Array.isArray(question.correctAnswer) ? question.correctAnswer : question.correctAnswer.split(',');
                    correctAnswersText = `<ul style="margin: 5px 0 0 0; padding-left: 20px; color: #e2e8f0;"><li>${arr.join('</li><li>')}</li></ul>`;
                  } else if (question.kind === 'text' && question.keywords && question.keywords.length > 0) {
                    correctAnswersText = question.keywords.join(', ');
                  } else if (question.kind === 'text' && question.correctAnswer) {
                    correctAnswersText = question.correctAnswer;
                  }
                }
              } catch (e) {
                console.error("Данные вопроса не найдены", e);
              }
            }

            const isCorrect = response.score > 0;
            
            // --- Рендерим ответ стажёра ---
            let userAnswerHtml = response.answer ? escapeHtml(response.answer) : '<span style="color: #ff4757; font-style: italic;">Ответ не предоставлен</span>';
            
            if (isImageKind && response.answer) {
              userAnswerHtml = `<img src="${escapeHtml(response.answer)}" style="max-height: 180px; max-width: 100%; object-fit: contain; border-radius: 8px; margin-top: 10px; border: 2px solid ${isCorrect ? '#2ecc71' : '#ff4757'}; box-shadow: 0 4px 12px ${isCorrect ? 'rgba(46,204,113,0.15)' : 'rgba(255,71,87,0.15)'}; display: block;">`;
            } else if (typeof response.answer === 'string' && response.answer.includes(',')) {
               const splitAnswer = response.answer.split(',').map(s => s.trim()).filter(Boolean);
               if(splitAnswer.length > 1) {
                   userAnswerHtml = `<ul style="margin: 5px 0 0 0; padding-left: 20px; color: #e2e8f0;"><li>${splitAnswer.join('</li><li>')}</li></ul>`;
               }
            }

            return `
              <article class="breakdown-item" style="background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 24px; position: relative; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <!-- Левый цветовой индикатор -->
                <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 6px; background: ${isCorrect ? '#2ecc71' : '#ff4757'}; transition: background 0.3s; border-radius: 12px 0 0 12px;"></div>
                
                <div style="width: 100%; padding-left: 12px;">
                  <h4 style="margin: 0 0 20px 0; font-size: 1.15rem; color: #f8fafc; line-height: 1.5; font-weight: 600;">
                    <span style="color: #94a3b8; font-weight: bold; margin-right: 8px;">Вопрос ${index + 1}:</span> 
                    ${response.label ?? response.title ?? response.questionId}
                  </h4>
                  
                  <!-- ВАЖНО: align-items: start не даёт панелям растягиваться, позволяя sticky работать -->
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; align-items: start;">
                    
                    <!-- ЛЕВАЯ КОЛОНКА (ДЛИННАЯ): Ответ стажёра -->
                    <div style="background: rgba(0, 0, 0, 0.2); padding: 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.05);">
                      <div style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; font-weight: bold; display: flex; align-items: center; gap: 6px;">
                        <span>👤</span> Ответ стажёра
                      </div>
                      <div style="font-size: 1.05rem; color: #f1f5f9; line-height: 1.6; word-wrap: break-word;">${userAnswerHtml}</div>
                    </div>
                    
                    <!-- ПРАВАЯ КОЛОНКА (ПЛАВАЮЩАЯ): Эталон, Шпаргалка, Вердикт -->
                    <div style="position: sticky; top: 24px; display: flex; flex-direction: column; gap: 16px;">
                      
                      ${correctAnswersText ? `
                        <div style="background: rgba(46, 204, 113, 0.05); padding: 16px; border-radius: 10px; border: 1px dashed rgba(46, 204, 113, 0.3);">
                          <div style="font-size: 0.75rem; color: #2ecc71; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; font-weight: bold; display: flex; align-items: center; gap: 6px;">
                            <span>🎯</span> Эталон
                          </div>
                          <div style="font-size: 1.05rem; color: #f1f5f9; line-height: 1.6; word-wrap: break-word;">${correctAnswersText}</div>
                        </div>
                      ` : ''}
                      
                      ${hint ? `
                        <div style="padding: 14px 18px; background: rgba(234, 179, 8, 0.08); border-left: 4px solid #eab308; border-radius: 0 10px 10px 0; font-size: 0.95rem; color: #fef08a; line-height: 1.6;">
                          <b style="color: #eab308; display: flex; align-items: center; gap: 6px; margin-bottom: 6px; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 1px;">
                            <span>💡</span> Шпаргалка проверяющему
                          </b> 
                          ${hint}
                        </div>
                      ` : ''}
                      
                      <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer; background: ${isCorrect ? 'rgba(46, 204, 113, 0.1)' : 'rgba(255, 255, 255, 0.03)'}; padding: 16px 20px; border-radius: 10px; width: 100%; border: 1px solid ${isCorrect ? 'rgba(46, 204, 113, 0.4)' : 'rgba(255, 255, 255, 0.1)'}; transition: all 0.2s ease; margin: 0;">
                        <div style="display: flex; align-items: center; gap: 14px;">
                          <input type="checkbox" class="review-answer-cb" data-index="${index}" ${isCorrect ? 'checked' : ''} style="width: 24px; height: 24px; cursor: pointer; accent-color: #2ecc71; margin: 0;" />
                          <span style="color: ${isCorrect ? '#2ecc71' : '#cbd5e1'}; font-weight: bold; font-size: 1.1rem; user-select: none;">
                            ${isCorrect ? 'Ответ засчитан (1 балл)' : 'Засчитать ответ (1 балл)'}
                          </span>
                        </div>
                        ${response.note ? `<span style="color: #64748b; font-size: 0.9rem; background: rgba(0,0,0,0.2); padding: 4px 10px; border-radius: 6px;">${response.note}</span>` : ''}
                      </label>

                    </div>
                  </div>
                </div>
              </article>
            `;
          }
        )
        .join('')}
    </div>
    
    <!-- Дублируем кнопки внизу -->
    ${breakdownArray.length > 2 ? `
      <div style="margin-top: 40px; border-top: 1px solid #334155; padding-top: 30px; padding-bottom: 20px;">
        <h4 style="color: #f8fafc; margin: 0 0 15px 0; font-size: 1.2rem;">Завершить проверку:</h4>
        ${reviewButtonsHtml}
      </div>
    ` : ''}
  `;

  // --- ОБРАБОТЧИКИ СОБЫТИЙ ---
  dom.adminDetail.querySelectorAll('.review-answer-cb').forEach((checkbox) => {
    checkbox.addEventListener('change', async (event) => {
      const index = parseInt(event.target.dataset.index, 10);
      const isChecked = event.target.checked;

      breakdownArray[index].score = isChecked ? 1 : 0;
      selected.score = breakdownArray.reduce((sum, item) => sum + (item.score || 0), 0);

      try {
        state.submissions = await store.save(selected, state.submissions);
        renderSubmissionList();
        renderAdminDetail(); 
      } catch (error) {
        console.error("Ошибка сохранения балла:", error);
        alert('Не удалось сохранить баллы в базу!');
        event.target.checked = !isChecked; 
      }
    });
  });
  
  dom.adminDetail.querySelectorAll('[data-review]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        state.submissions = await store.updateReview(
          selected.id,
          button.dataset.review,
          state.isAdmin ? 'admin' : 'checker',
          state.submissions,
        );
        renderSubmissionList();
        renderAdminDetail();
        updateHeroStats();
      } catch (error) {
        window.alert(
          error instanceof Error
            ? `Не удалось сохранить статус: ${error.message}`
            : 'Не удалось сохранить статус в Supabase.',
        );
      }
    });
  });

  const deleteBtnList = dom.adminDetail.querySelectorAll('#delete-submission-btn');
  deleteBtnList.forEach(deleteBtn => {
    deleteBtn.addEventListener('click', async () => {
      if (!confirm('Вы уверены, что хотите навсегда удалить этот экзамен?')) return;
      
      deleteBtn.innerHTML = '⏳ Удаление...';
      
      const { error } = await supabaseClient.from('submissions').delete().eq('id', selected.id);
      
      if (error) {
        alert('Ошибка при удалении: ' + error.message);
        deleteBtn.innerHTML = '🗑️ Удалить';
      } else {
        state.submissions = state.submissions.filter(sub => sub.id !== selected.id);
        state.selectedSubmissionId = state.submissions[0]?.id ?? null;
        renderSubmissionList();
        renderAdminDetail();
        updateHeroStats();
      }
    });
  });
}

function renderPracticeSummary() {
  renderPracticeResult(dom.practiceResult, state.practiceResult);
}
// Вспомогательная функция для генерации превьюшек Imgur
// --- УПРОЩЕННАЯ ВЕРСИЯ БЕЗ API IMGUR ---
async function fetchImgurAlbumImages(albumUrl, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div style="background: rgba(15, 23, 42, 0.4); border: 1px dashed rgba(100, 116, 139, 0.4); padding: 15px; border-radius: 12px; text-align: center;">
      <span style="font-size: 1.5rem; display: block; margin-bottom: 8px;">🖼️</span>
      <span style="color: #94a3b8; font-size: 0.9rem;">Предпросмотр отключен.<br>Нажмите на синюю кнопку выше, чтобы просмотреть альбом на Imgur.</span>
    </div>
  `;
}

// Рендер деталей заявления (с новой анимацией и кнопкой)
// Полностью заменяем функцию renderAdminAppDetail в файле main.js
async function renderAdminAppDetail() {
  if (!dom.adminDetail) return;
  
  const selected = state.applications.find(app => app.id === state.selectedAppId);

  if (!selected) {
    dom.adminDetail.innerHTML = '<div class="empty-state">Выбери заявление слева, чтобы увидеть подробности.</div>';
    return;
  }

  const linkedExam = state.submissions.find(sub => sub.id === selected.exam_id);
  const finalAlbumUrl = selected.album_url || selected.passport_url || selected.licenses_url;

  // Генерируем подпись из имени
  const n = selected.applicant_name || 'АНОНИМ';
  const parts = n.split('_');
  const signature = parts.length > 1 ? `${parts[0][0]}. ${parts[1]}` : n;

  // Статус экзамена
  const examText = linkedExam ? `ДА (${linkedExam.score}/${linkedExam.maxScore})` : `НЕ НАЙДЕН`;
  const examColor = linkedExam ? '#10b981' : '#ef4444';

  // Печать вердикта (появляется, если статус уже изменен)
  let stampHtml = '';
  if (selected.status === 'approved') {
    stampHtml = `<div style="position: absolute; bottom: 30px; right: 30px; border: 4px solid #10b981; color: #10b981; font-family: 'PT Sans', sans-serif; font-size: 1.8rem; font-weight: 900; padding: 10px 20px; transform: rotate(-10deg); border-radius: 8px; opacity: 0.8; pointer-events: none; box-shadow: inset 0 0 10px rgba(16,185,129,0.2);">ОДОБРЕНО</div>`;
  } else if (selected.status === 'rejected') {
    stampHtml = `<div style="position: absolute; bottom: 30px; right: 30px; border: 4px solid #ef4444; color: #ef4444; font-family: 'PT Sans', sans-serif; font-size: 1.8rem; font-weight: 900; padding: 10px 20px; transform: rotate(-10deg); border-radius: 8px; opacity: 0.8; pointer-events: none; box-shadow: inset 0 0 10px rgba(239,68,68,0.2);">ОТКЛОНЕНО</div>`;
  }

  dom.adminDetail.innerHTML = `
    <style>
      .admin-doc-paper { background: #fdfdfd; color: #1e293b; padding: 40px; border-radius: 4px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); position: relative; display: flex; flex-direction: column; overflow: hidden; margin-top: 15px; }
      .admin-doc-watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 12rem; font-weight: 900; color: rgba(0,0,0,0.03); pointer-events: none; font-family: Arial, sans-serif; }
      .admin-doc-header { text-align: right; font-family: 'Times New Roman', serif; font-size: 1.05rem; margin-bottom: 25px; line-height: 1.5; }
      .admin-doc-title { text-align: center; font-family: 'Times New Roman', serif; font-size: 1.6rem; font-weight: bold; letter-spacing: 2px; margin-bottom: 25px; }
      .admin-doc-body { font-family: 'Times New Roman', serif; font-size: 1.15rem; line-height: 1.8; text-align: justify; flex: 1; margin-bottom: 40px; }
      .admin-doc-field { font-weight: bold; color: #2563eb; border-bottom: 1px dashed #2563eb; padding: 0 4px; text-decoration: none; transition: 0.2s; }
      .admin-doc-field:hover { background: rgba(37,99,235,0.1); }
      .admin-doc-footer { display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #cbd5e1; padding-top: 15px; font-family: 'Times New Roman', serif; font-size: 1.05rem; }
      .admin-doc-sign { font-family: 'Brush Script MT', cursive; font-size: 2rem; color: #0f172a; transform: rotate(-5deg); display: inline-block; }
    </style>

    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
      <div>
        <span style="color: #94a3b8; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px;">Личное дело кандидата</span>
        <h2 style="margin: 0; color: #fff; font-size: 1.4rem;">${n}</h2>
      </div>
      ${linkedExam ? `<button id="view-linked-exam" class="secondary-button" style="margin: 0; border-color: #3b82f6; color: #3b82f6; padding: 8px 16px;">👀 Открыть тест ПРО</button>` : ''}
    </div>

    <!-- КРАСИВЫЙ БЛАНК ДОКУМЕНТА В АДМИНКЕ -->
    <div class="admin-doc-paper">
      <div class="admin-doc-watermark">LSFM</div>
      <div class="admin-doc-header">
        Директору радиоцентра<br>
        От гражданина: <span class="admin-doc-field" style="color: #0f172a; border-color: #0f172a;">${n}</span>
      </div>
      <div class="admin-doc-title">ЗАЯВЛЕНИЕ</div>
      <div class="admin-doc-body">
        Прошу принять меня на работу в ваш радиоцентр  на должность радиотехника с испытательным сроком один месяц (( 1 день )). 
        К заявлению прикладываю копии паспорта и лицензий (( /pass, /lic + /c 60 )): 
        <a href="${finalAlbumUrl}" target="_blank" class="admin-doc-field">ОТКРЫТЬ ДОКУМЕНТЫ ↗</a>.<br><br>
        Так же подтверждаю, что успешно прошёл квалификационный онлайн-тест ПРО: <span class="admin-doc-field" style="color: ${examColor}; border-color: ${examColor};">${examText}</span>.
      </div>
      <div class="admin-doc-footer">
        <div>Дата: <strong>${new Date(selected.created_at).toLocaleDateString('ru-RU')}</strong></div>
        <div>Подпись: <span class="admin-doc-sign">${signature}</span></div>
      </div>
      
      ${stampHtml}
    </div>

    <!-- КНОПКИ ВЕРДИКТА -->
    <div style="display: flex; gap: 12px; margin-top: 24px;">
      <button class="save-btn app-status-btn" data-status="approved" style="background: #10b981; flex: 1; padding: 14px; font-size: 1rem; border-radius: 8px; font-weight: bold; color: #000; border: none; box-shadow: 0 4px 15px rgba(16,185,129,0.2); cursor: pointer;">✅ Одобрить</button>
      <button class="save-btn app-status-btn" data-status="rejected" style="background: #ef4444; flex: 1; padding: 14px; font-size: 1rem; border-radius: 8px; font-weight: bold; color: #fff; border: none; box-shadow: 0 4px 15px rgba(239,68,68,0.2); cursor: pointer;">❌ Отклонить</button>
    </div>
  `;

  const viewExamBtn = dom.adminDetail.querySelector('#view-linked-exam');
  if (viewExamBtn && linkedExam) {
    viewExamBtn.addEventListener('click', () => {
      state.adminViewMode = 'exams';
      state.selectedSubmissionId = linkedExam.id;
      dom.adminModeExams.click(); 
    });
  }

  dom.adminDetail.querySelectorAll('.app-status-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const newStatus = btn.dataset.status;
      btn.textContent = 'Сохранение...';
      const { error } = await supabaseClient.from('applications').update({ status: newStatus }).eq('id', selected.id);
      if (!error) {
        selected.status = newStatus;
        renderAdminListSwitcher();
      } else {
        alert('Ошибка изменения статуса: ' + error.message);
        btn.textContent = newStatus === 'approved' ? '✅ Одобрить' : '❌ Отклонить';
      }
    });
  });
}

// Главный свитчер списков (Экзамены <-> Заявления)
function renderAdminListSwitcher() {
  if (state.adminViewMode === 'exams') {
    dom.adminModeExams.className = 'save-btn';
    dom.adminModeExams.style.background = '#3b82f6';
    dom.adminModeExams.style.color = '#fff';
    
    dom.adminModeApps.className = 'secondary-button';
    dom.adminModeApps.style.background = 'transparent';
    
    renderSubmissionList(); 
    renderAdminDetail();    
  } else {
    dom.adminModeApps.className = 'save-btn';
    dom.adminModeApps.style.background = '#8b5cf6';
    dom.adminModeApps.style.color = '#fff';
    
    dom.adminModeExams.className = 'secondary-button';
    dom.adminModeExams.style.background = 'transparent';

    // --- СОРТИРОВКА И ГРУППИРОВКА ЗАЯВЛЕНИЙ ПО ПОДРАЗДЕЛЕНИЮ ---
    if (!state.applications.length) {
      dom.submissionList.innerHTML = '<div class="empty-state">Нет поданных заявлений.</div>';
    } else {
      const SQUAD_ORDER = ['LSFM', 'SFFM', 'LVFM', 'TVC'];
      const SQUAD_LABELS = {
        'LSFM': '🔵 LSFM — Лос-Сантос',
        'SFFM': '🟢 SFFM — Сан-Фиерро',
        'LVFM': '🟡 LVFM — Лас-Вентурас',
        'TVC':  '🟣 TVC — Телецентр',
      };
      const SQUAD_HEADER_COLORS = {
        'LSFM': '#3b82f6',
        'SFFM': '#22c55e',
        'LVFM': '#eab308',
        'TVC':  '#a855f7',
      };

      // Группируем по squad (case-insensitive)
      const groups = {};
      state.applications.forEach(app => {
        const key = (app.squad || '').toUpperCase();
        if (!groups[key]) groups[key] = [];
        groups[key].push(app);
      });

      // Порядок: сначала известные подразделения, потом остальные
      const orderedKeys = [
        ...SQUAD_ORDER.filter(k => groups[k]),
        ...Object.keys(groups).filter(k => !SQUAD_ORDER.includes(k))
      ];

      const renderAppBtn = (app) => {
        const isApproved = app.status === 'approved';
        const isRejected = app.status === 'rejected';
        let statusStyle = 'color: #94a3b8; background: rgba(148,163,184,0.1); border: 1px solid rgba(148,163,184,0.2);';
        let statusText = 'Ожидает';
        if (isApproved) { statusStyle = 'color: #10b981; background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.3);'; statusText = 'Одобрено'; }
        if (isRejected) { statusStyle = 'color: #ef4444; background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3);'; statusText = 'Отклонено'; }
        return `
          <button type="button" class="submission-item ${state.selectedAppId === app.id ? 'active' : ''}" data-appid="${app.id}">
            <strong style="font-size: 1rem; color: #fff;">${app.applicant_name}</strong>
            <div style="margin-top: 8px; display: flex; align-items: center; gap: 8px; font-size: 0.8rem;">
              <span style="padding: 2px 6px; border-radius: 4px; font-weight: bold; ${statusStyle}">${statusText}</span>
              <span style="color: #64748b;">${formatDate(app.created_at)}</span>
            </div>
          </button>`;
      };

      dom.submissionList.innerHTML = orderedKeys.map(key => {
        const label = SQUAD_LABELS[key] || `❓ ${key || 'Без подразделения'}`;
        const color = SQUAD_HEADER_COLORS[key] || '#64748b';
        const apps = groups[key];
        return `
          <div style="margin-bottom: 4px;">
            <div style="padding: 6px 10px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase;
                        letter-spacing: 1px; color: ${color}; border-left: 3px solid ${color};
                        background: rgba(0,0,0,0.2); margin-bottom: 4px;">
              ${label} <span style="color: #475569; font-weight: 600;">(${apps.length})</span>
            </div>
            ${apps.map(renderAppBtn).join('')}
          </div>`;
      }).join('');
    }

    dom.submissionList.querySelectorAll('[data-appid]').forEach((button) => {
      button.addEventListener('click', () => {
        state.selectedAppId = button.dataset.appid;
        renderAdminListSwitcher();
      });
    });

    renderAdminAppDetail();
  }
}
function renderAdminShell() {
  if (dom.adminStatusOff) dom.adminStatusOff.classList.toggle('hidden', state.isAdmin);
  if (dom.adminStatusOn) dom.adminStatusOn.classList.toggle('hidden', !state.isAdmin);
  if (dom.adminSection) dom.adminSection.classList.toggle('hidden', !state.isAdmin);
}

function setPracticeAnswer(questionId, value, kind) {
  if (kind === 'multi') {
    const current = Array.isArray(state.practiceAnswers[questionId]) ? [...state.practiceAnswers[questionId]] : [];
    if (current.includes(value)) {
      state.practiceAnswers[questionId] = current.filter((item) => item !== value);
    } else {
      current.push(value);
      state.practiceAnswers[questionId] = current;
    }
    return;
  }
  state.practiceAnswers[questionId] = value;
}

function setExamAnswer(questionId, value, kind) {
  if (kind === 'multi') {
    const current = Array.isArray(state.examAnswers[questionId]) ? [...state.examAnswers[questionId]] : [];
    if (current.includes(value)) {
      state.examAnswers[questionId] = current.filter((item) => item !== value);
    } else {
      current.push(value);
      state.examAnswers[questionId] = current;
    }
    return;
  }
  state.examAnswers[questionId] = value;
}

async function submitPractice(event) {
  event.preventDefault();

  const details = practiceQuestions.map((question) => {
    const userAnswer = state.practiceAnswers[question.id];
    const result = scorePracticeQuestion(question, userAnswer);
    
    return {
      id: question.id,
      title: question.title,
      score: result.score,
      maxScore: 1,
      note: result.note,
      userAnswer: Array.isArray(userAnswer) ? userAnswer.join(', ') : (userAnswer || '—'),
      correctAnswer:
        question.kind === 'multi'
          ? Array.isArray(question.correctAnswer)
            ? question.correctAnswer.join(', ')
            : String(question.correctAnswer ?? '—')
          : question.kind === 'text'
            ? `Ожидаемые идеи: ${(question.keywords ?? []).join(', ') || '—'}`
            : String(question.correctAnswer ?? '—'),
    };
  });

  const score = details.reduce((sum, item) => sum + item.score, 0);
  state.practiceResult = { score, maxQuestions: practiceQuestions.length, details };
  
  renderPracticeSummary(); 
  
  renderPracticeSection({
    formEl: dom.practiceForm,
    resultEl: dom.practiceResult,
    questions: practiceQuestions,
    state: { answers: state.practiceAnswers },
    onAnswerChange: setPracticeAnswer,
    onSubmit: submitPractice,
    result: state.practiceResult 
  });

  window.scrollTo({ 
    top: dom.practiceSection.offsetTop - 20, 
    behavior: 'smooth' 
  });
}

async function submitExam(event) {
  event.preventDefault();

  const name = state.examMeta.name.trim();
  const squad = state.examMeta.squad.trim();
  if (!name || !squad) return;

  const breakdown = examQuestions.map((question) => {
    const answer = state.examAnswers[question.id];
    const normalizedAnswer = Array.isArray(answer) ? answer.join(', ') : String(answer ?? '');
    const hasAnswer = normalizedAnswer.trim().length > 0;
    
    // --- НОВАЯ СИСТЕМА ОЦЕНКИ ---
    let score = 0;
    let note = 'Нет ответа';

    if (hasAnswer) {
      // ИЗМЕНЕНИЕ ЗДЕСЬ: картинки проверяются так же как обычный single-выбор
      if (question.kind === 'single' || question.kind === 'single-image') {
        const isCorrect = normalize(answer) === normalize(question.correctAnswer ?? '');
        score = isCorrect ? 1 : 0;
        note = isCorrect ? 'Авто-проверка: Верно' : 'Авто-проверка: Ошибка';
      } else if (question.kind === 'multi') {
        const correct = [...(question.correctAnswer ?? [])].map(normalize).sort();
        const selected = [...(Array.isArray(answer) ? answer : [answer])].map(normalize).filter(Boolean).sort();
        const isCorrect = correct.length > 0 && correct.length === selected.length && correct.every((item, index) => item === selected[index]);
        score = isCorrect ? 1 : 0;
        note = isCorrect ? 'Авто-проверка: Верно' : 'Авто-проверка: Ошибка';
      } else {
        // Автопроверка для текста: проверяем и эталон, и шпаргалку
        const normAnswer = normalize(answer);
        const normCorrect = normalize(question.correctAnswer);
        const normHint = normalize(question.reviewHint);
        
        // Сравниваем очищенный ответ стажёра с очищенным эталоном или подсказкой
        const isExactMatch = (normCorrect && normAnswer === normCorrect) || (normHint && normAnswer === normHint);
        
        if (isExactMatch) {
          score = 1;
          note = 'Авто-проверка: Верно';
        } else {
          score = 0; 
          note = 'Ожидает ручной проверки';
        }
      }
    }

    return {
      questionId: question.id,
      label: question.title,
      score: score, 
      maxScore: 1,
      note: note,
      answer: normalizedAnswer,
      snapshotCorrect: question.correctAnswer,
      snapshotHint: question.reviewHint,
      snapshotKind: question.kind
    };
  });

  // --- ТОЧЕЧНАЯ ПРОВЕРКА НА ЛИМИТ ОШИБОК ---
// --- ТОЧЕЧНАЯ ПРОВЕРКА НА ЛИМИТ ОШИБОК ---
  const totalErrors = breakdown.filter(item => item.note === 'Авто-проверка: Ошибка' || item.note === 'Нет ответа').length;

  // Если ошибок >= 4 И при этом человек НЕ админ - выкидываем его
  if (totalErrors >= 4 && !state.isAdmin) {
    dom.examForm.innerHTML = `
      <div style="background: rgba(239, 68, 68, 0.05); border: 2px solid #ef4444; padding: 40px; border-radius: 12px; text-align: center; max-width: 600px; margin: 40px auto; box-shadow: 0 0 30px rgba(239, 68, 68, 0.2); animation: fadeInUp 0.4s ease;">
        <span style="font-size: 4rem; display: block; margin-bottom: 20px;">🛑</span>
        <h2 style="color: #ef4444; font-family: 'PT Sans', sans-serif; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Экзамен провален</h2>
        <p style="color: #94a3b8; font-size: 1.1rem; line-height: 1.6; margin-bottom: 25px;">
          Вы допустили <strong style="color: #fff; font-size: 1.2rem;">${totalErrors} ошибки(ок)</strong>.<br>
          Максимально допустимый лимит для сдачи экзамена по ПРО, ППЭ, Уставу — <strong style="color: #10b981;">4 ошибки</strong>.<br>
          Данная попытка аннулирована и не пойдет в отчет старшему составу.
        </p>
        <button onclick="window.location.reload()" style="background: #ef4444; color: #fff; border: none; padding: 14px 30px; font-size: 1rem; font-weight: bold; border-radius: 6px; cursor: pointer; transition: 0.2s; box-shadow: 0 5px 15px rgba(239, 68, 68, 0.3);">
          🔄 Начать пересдачу
        </button>
      </div>
    `;
    
    state.examAnswers = createBlankAnswers(examQuestions);
    state.examMeta = { name: '', squad: '', contact: '' };
    return;
  }

  // --- ЕСЛИ ВСЁ ОК, ИДЕТ СТАРЫЙ ФУНКЦИОНАЛ ОТПРАВКИ ---
  const answers = breakdown.reduce((accumulator, item) => {
    accumulator[item.questionId] = item.answer;
    return accumulator;
  }, {});

  const score = breakdown.reduce((sum, item) => sum + item.score, 0);
  const maxScore = breakdown.length;

  const submission = normalizeSubmissionRecord({
    id: crypto.randomUUID(),
    name,
    squad,
    contact: state.examMeta.contact.trim(),
    submittedAt: new Date().toISOString(),
    score,
    maxScore,
    answers,
    breakdown,
  });

  state.submissions = await store.save(submission, state.submissions);

  // --- ОТПРАВКА В DISCORD ---
  const discordWebhookUrl = 'ТВОЙ_СКОПИРОВАННЫЙ_URL_ВЕБХУКА'; 

  if (discordWebhookUrl) {
    const answerBlocks = breakdown.map((item, i) => {
      const statusIcon = item.score > 0 ? '✅' : (item.note.includes('Ожидает ручной') ? '⏳' : '❌');
      let text = `**${i + 1}. ${item.label}**\n👤 Ответ: \`${item.answer || 'Нет ответа'}\``;
      
      if (item.score === 0) {
        text += `\n*${statusIcon} ${item.note}*`;
      } else {
        text += `\n*${statusIcon} Верно (+1 балл)*`;
      }
      return text;
    });

    const chunks = [];
    let currentChunk = "";
    
    for (const block of answerBlocks) {
      if (currentChunk.length + block.length > 3500) {
        chunks.push(currentChunk);
        currentChunk = block;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + block;
      }
    }
    if (currentChunk) chunks.push(currentChunk);

    const sendToDiscord = async () => {
      for (let i = 0; i < chunks.length; i++) {
        const isFirst = i === 0;
        const isLast = i === chunks.length - 1;
        
        const embed = {
          color: 3447003,
          description: chunks[i]
        };

        if (isFirst) {
          embed.title = `📝 Экзамен сдан: ${submission.name}`;
          embed.fields = [
            { name: "Организация", value: submission.squad || "Не указано", inline: true },
            { name: "Связь", value: submission.contact || "Не указано", inline: true },
            { name: "Предварительные баллы", value: `${submission.score} из ${submission.maxScore}`, inline: false }
          ];
        } else {
          embed.title = `📝 Продолжение ответов: ${submission.name} (Часть ${i + 1})`;
        }

        if (isLast) {
          embed.footer = { text: "LSFM Academy System" };
          embed.timestamp = new Date().toISOString();
        }

        try {
          await fetch(discordWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ embeds: [embed] })
          });
          await new Promise(res => setTimeout(res, 500)); 
        } catch (err) {
          console.error("Ошибка отправки части в Discord:", err);
        }
      }
    };

    sendToDiscord();
  }

  state.selectedSubmissionId = submission.id;
  state.examAnswers = createBlankAnswers(examQuestions);
  state.examMeta = { name: '', squad: '', contact: '' };

  renderExamSection({
    formEl: dom.examForm,
    questions: examQuestions,
    state: { answers: state.examAnswers, meta: state.examMeta },
    onAnswerChange: setExamAnswer,
    onMetaChange: (field, value) => {
      state.examMeta[field] = value;
    },
    onSubmit: submitExam,
  });
  renderAdminShell();
  renderSubmissionList();
  renderAdminDetail();
  updateHeroStats();
}

function bindAdminControls() {
  if (dom.adminLogin) {
    dom.adminLogin.addEventListener('click', async () => {
      // Проверяем супер-пароль (все подразделения)
      const inputCode = dom.adminCodeInput.value.trim();
      let adminSquad = null; // null = суперадмин (видит всё)

      if (normalize(inputCode) === normalize(config.adminCode)) {
        adminSquad = null;
      } else {
        // Проверяем пароли подразделений из Supabase
        const { data: pwRows } = await supabaseClient
          .from(config.adminPasswordsTable)
          .select('squad, password')
          .eq('password', inputCode)
          .limit(1);
        if (pwRows && pwRows.length > 0) {
          adminSquad = pwRows[0].squad;
        } else {
          alert('Неверный ключ доступа');
          return;
        }
      }

      state.isAdmin = true;
      state.adminSquad = adminSquad ? adminSquad.toUpperCase() : null;
      dom.adminCodeInput.value = '';
      renderAdminShell();
      renderSubmissionList();
      renderAdminDetail();
    });
  }

  if (dom.adminLogout) {
    dom.adminLogout.addEventListener('click', () => {
      state.isAdmin = false;
      state.adminSquad = null;
      renderAdminShell();
    });
  }

  if (dom.adminSearch) {
    dom.adminSearch.addEventListener('input', () => {
      renderSubmissionList();
      renderAdminDetail();
    });
  }

  if (dom.adminStatusFilter) {
    dom.adminStatusFilter.addEventListener('change', () => {
      state.adminStatusFilter = dom.adminStatusFilter.value;
      renderSubmissionList();
      renderAdminDetail();
    });
  }

  if (dom.exportJson) {
    dom.exportJson.addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(state.submissions, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'lsfm-pro-exam-submissions.json';
      link.click();
      URL.revokeObjectURL(url);
    });
  }
  if (dom.adminModeExams && dom.adminModeApps) {
    dom.adminModeExams.addEventListener('click', () => {
      state.adminViewMode = 'exams';
      renderAdminListSwitcher();
    });
    
    dom.adminModeApps.addEventListener('click', async () => {
      state.adminViewMode = 'apps';
      let query = supabaseClient.from('applications').select('*').order('created_at', { ascending: false });
      // Фильтруем по подразделению (если не суперадмин) - case-insensitive
      if (state.adminSquad) {
        query = query.ilike('squad', state.adminSquad);
      }
      const { data } = await query;
      if (data) {
        state.applications = data;
        if (!state.selectedAppId && data.length > 0) state.selectedAppId = data[0].id;
      }
      renderAdminListSwitcher();
    });
  }
  if (dom.exportCsv) {
    dom.exportCsv.addEventListener('click', () => {
      const header = ['id', 'name', 'squad', 'contact', 'submittedAt', 'score', 'maxScore'];
      const rows = state.submissions.map((submission) => [
        submission.id,
        submission.name,
        submission.squad,
        submission.contact,
        submission.submittedAt,
        submission.score ?? '',
        submission.maxScore ?? '',
      ]);
      const csv = [header, ...rows]
        .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
        .join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'lsfm-pro-exam-submissions.csv';
      link.click();
      URL.revokeObjectURL(url);
    });
  }
}

// Функция проверки объявления
async function checkGlobalAnnouncement() {
  const { data, error } = await supabaseClient.from('global_announcements').select('*').single();
  if (error || !data.active) return;

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:99999; display:flex; align-items:center; justify-content:center; padding:20px;';
  
  overlay.innerHTML = `
    <div style="background:#0f172a; padding:30px; border-radius:20px; border:1px solid #3b82f6; max-width:500px; width:100%; text-align:center; color:#fff;">
      <h2 style="margin-top:0; color:#3b82f6;">📢 ВАЖНОЕ ОБЪЯВЛЕНИЕ</h2>
      <p style="font-size:1.1rem; margin:20px 0;">${escapeHtml(data.text)}</p>
      ${data.link ? `<a href="${data.link}" target="_blank" class="primary-button" style="display:block; margin-bottom:15px; text-decoration:none;">Перейти по ссылке</a>` : ''}
      <button id="close-announcement" class="secondary-button" style="width:100%;">Принять и закрыть</button>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('#close-announcement').onclick = () => overlay.remove();
}
// Добавь вызов checkGlobalAnnouncement() в конце функции init()


async function init() {
  let examLoadError = false;
  
  // Если Supabase SDK не загрузился, сразу помечаем ошибку
  if (supabaseImportError || !createClient) {
    console.error('Supabase SDK недоступен');
    examLoadError = true;
  } else {
    try {
      const url = config.supabaseUrl;
      const key = config.supabaseAnonKey; 
      
      if (!url || !key) {
        throw new Error("Ключи Supabase не найдены в конфиге!");
      }
      
      supabaseClient = createClient(url, key);
      const { data, error } = await supabaseClient.from('questions').select('*');
      
      if (error) throw error;
      
      examQuestions = data.sort((a, b) => {
        const numA = parseInt(a.id.replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(b.id.replace(/\D/g, ''), 10) || 0;
        return numA - numB;
      });
    } catch (err) {
      console.error('Ошибка загрузки БД (Экзамен будет пуст):', err.message);
      examLoadError = true;
    }
  }

  state.practiceAnswers = createBlankAnswers(practiceQuestions);
  state.examAnswers = createBlankAnswers(examQuestions);

  dom = {
    learnSection: document.getElementById('learn-section'),
    practiceSection: document.getElementById('practice-section'),
    examSection: document.getElementById('exam-section'),
    adminSection: document.getElementById('admin-section'),
    learningGrid: document.getElementById('learning-grid'),
    practiceForm: document.getElementById('practice-form'),
    practiceResult: document.getElementById('practice-result'),
    examForm: document.getElementById('exam-form'),
    submissionList: document.getElementById('submission-list'),
    adminDetail: document.getElementById('admin-detail'),
    adminSearch: document.getElementById('admin-search'),
    adminStatusFilter: document.getElementById('admin-status-filter'),
    adminCodeInput: document.getElementById('admin-code'),
    adminStatusOff: document.getElementById('admin-status-off'),
    adminStatusOn: document.getElementById('admin-status-on'),
    adminCountText: document.getElementById('admin-count-text'),
    submittedNote: document.getElementById('submitted-note'),
    pendingCount: document.getElementById('pending-count'),
    reviewedCount: document.getElementById('reviewed-count'),
    savedCount: document.getElementById('saved-count'),
    lessonsCount: document.getElementById('lessons-count'),
    questionsCount: document.getElementById('questions-count'),
    scoreList: document.getElementById('score-list'),
    tabButtons: document.querySelectorAll('.tab-button'),
    adminLogin: document.getElementById('admin-login'),
    adminLogout: document.getElementById('admin-logout'),
    exportCsv: document.getElementById('export-csv'),
    exportJson: document.getElementById('export-json'),
    applySection: document.getElementById('apply-section'),
    applicationContainer: document.getElementById('application-container'),
    adminModeExams: document.getElementById('admin-mode-exams'),
    adminModeApps: document.getElementById('admin-mode-apps'),
  };

  await loadLearningSection();

  renderApplicationSection(dom.applicationContainer, supabaseClient);
  
  const btnTop = document.getElementById('scroll-to-top');
  const btnBottom = document.getElementById('scroll-to-bottom');
  const btnAdminUpast = document.getElementById('admin-upast');
  const btnAdminEnter = document.getElementById('admin-enter');
  const adminSection = document.getElementById('admin-section');

  if (btnAdminUpast && adminSection) {
    btnAdminUpast.addEventListener('click', () => {
      adminSection.classList.remove('hidden');
      adminSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  if (btnAdminEnter) {
  btnAdminEnter.addEventListener('click', () => {
    window.open('https://kulzzer23.github.io/mmblue/admin.html', '_blank');
  });
}
  if (btnTop) {
    btnTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  if (btnBottom) {
    btnBottom.addEventListener('click', () => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    });
  }

  renderPracticeSection({
    formEl: dom.practiceForm,
    resultEl: dom.practiceResult,
    questions: practiceQuestions,
    state: { answers: state.practiceAnswers },
    onAnswerChange: setPracticeAnswer,
    onSubmit: submitPractice,
  });

  renderExamSection({
    formEl: dom.examForm,
    questions: examQuestions, 
    state: { answers: state.examAnswers, meta: state.examMeta },
    onAnswerChange: setExamAnswer,
    onMetaChange: (field, value) => {
      state.examMeta[field] = value;
    },
    onSubmit: submitExam,
    loadError: examLoadError,
  });

  dom.tabButtons.forEach((button) => {
    button.addEventListener('click', () => setSection(button.dataset.section));
  });

  bindAdminControls();

  state.submissions = (await store.load()).map(normalizeSubmissionRecord);
  state.selectedSubmissionId = state.submissions[0]?.id ?? null;

  renderAdminShell();
  renderSubmissionList();
  renderAdminDetail();
  updateHeroStats();
  setSection(state.activeSection);
  checkGlobalAnnouncement();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}