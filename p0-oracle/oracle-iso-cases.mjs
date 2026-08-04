// Изоморфные варианты (P0, анти-контаминация): ОДНА И ТА ЖЕ байесова сеть, три обёртки-сюжета.
// Числа импортируются напрямую из PILOT — гарантия идентичности (не перепечатываю руками, не даю LLM их придумать).
// Проверяет: считает ли модель СТРУКТУРУ (роли/зависимости/цены) или узнаёт СЮЖЕТ (слова).
import { PILOT } from './oracle-pilot-case.mjs';

const NUMS = {
  prior: PILOT.prior,
  likWeak: PILOT.sources.terminal.likelihood,
  likDiag: PILOT.sources.vent.likelihood,
  likCrowd: PILOT.sources.mara.likelihood,
  cost: { weak: PILOT.sources.terminal.cost, diag: PILOT.sources.vent.cost, echo: PILOT.sources.adm.cost, crowd: PILOT.sources.mara.cost },
  payoffDecisive: PILOT.actions.act.payoff,
  payoffPassive: PILOT.actions.wait.payoff,
  payoffProbe: PILOT.actions.investigate.payoff,
  infoBudget: PILOT.infoBudget,
};

// роли ВСЕГДА в порядке weak(бесплатн.слабый) → diag(дорогой ключ) → echo(зависимый от weak) → crowd(слух)
// — это порядок вставки, важно для структурного теста изоморфности (topoOrder/итерация по ключам).
function buildCase(id, domain, hook, labels) {
  const sources = {};
  sources[labels.weak.key] = { likelihood: NUMS.likWeak, dependsOn: null, cost: NUMS.cost.weak, teaser: labels.weak.teaser };
  sources[labels.diag.key] = { likelihood: NUMS.likDiag, dependsOn: null, cost: NUMS.cost.diag, teaser: labels.diag.teaser };
  sources[labels.echo.key] = { likelihood: NUMS.likWeak, dependsOn: labels.weak.key, cost: NUMS.cost.echo, teaser: labels.echo.teaser };
  sources[labels.crowd.key] = { likelihood: NUMS.likCrowd, dependsOn: null, cost: NUMS.cost.crowd, teaser: labels.crowd.teaser };
  const actions = {};
  actions[labels.decisive.key] = { payoff: NUMS.payoffDecisive, reversible: false, label: labels.decisive.label };
  actions[labels.passive.key] = { payoff: NUMS.payoffPassive, reversible: true, label: labels.passive.label };
  actions[labels.probe.key] = { payoff: NUMS.payoffProbe, reversible: true, label: labels.probe.label };
  return { id, domain, hypotheses: ['real_threat', 'false_alarm'], hookText: hook, prior: NUMS.prior, sources, actions, infoBudget: NUMS.infoBudget };
}

export const ISO_CLINICAL = buildCase('iso_clinical', 'Медицина',
  'Пациент жалуется на острую боль в груди. Дежурный врач торопится закрыть смену.',
  {
    weak: { key: 'triage_note', teaser: 'краткая запись при поступлении (первое впечатление медсестры)' },
    diag: { key: 'ecg_reading', teaser: 'полная расшифровка ЭКГ и тропонина (занимает время лаборатории)' },
    echo: { key: 'colleague_opinion', teaser: 'мнение коллеги, который заглянул в ту же запись при поступлении' },
    crowd: { key: 'department_chatter', teaser: 'разговоры в ординаторской о похожих случаях на этой неделе' },
    decisive: { key: 'act', label: 'экстренное вмешательство сейчас' },
    passive: { key: 'wait', label: 'отпустить пациента домой' },
    probe: { key: 'investigate', label: 'назначить дополнительные анализы, подождать результата' },
  });

export const ISO_WORKPLACE = buildCase('iso_workplace', 'Работа',
  'Крупный клиент внезапно расторг контракт на следующий день после встречи с твоим коллегой.',
  {
    weak: { key: 'meeting_notes', teaser: 'твои беглые заметки со вчерашней встречи' },
    diag: { key: 'email_thread_audit', teaser: 'полная переписка с клиентом за месяц (юридический отдел должен поднять архив)' },
    echo: { key: 'manager_recap', teaser: 'пересказ ситуации от менеджера, который узнал из тех же твоих заметок' },
    crowd: { key: 'office_rumors', teaser: 'слухи в курилке о том, кто виноват' },
    decisive: { key: 'act', label: 'публично обвинить коллегу перед руководством' },
    passive: { key: 'wait', label: 'ничего не предпринимать, дать ситуации остыть' },
    probe: { key: 'investigate', label: 'запросить у юротдела официальную историю переписки' },
  });

export const ISO_SUPPLY = buildCase('iso_supply', 'Цепочка поставок',
  'Партия компонентов от нового поставщика прошла таможню быстрее обычного — подозрительно гладко.',
  {
    weak: { key: 'invoice_glance', teaser: 'беглый просмотр инвойса приёмщиком на складе' },
    diag: { key: 'lab_certification', teaser: 'полная лабораторная сертификация партии (независимая аккредитованная лаборатория)' },
    echo: { key: 'shift_supervisor_note', teaser: 'заметка сменного супервайзера, составленная по тому же беглому просмотру' },
    crowd: { key: 'supplier_forum_chatter', teaser: 'обсуждения этого поставщика на закрытом отраслевом форуме' },
    decisive: { key: 'act', label: 'немедленно остановить производственную линию и отозвать партию' },
    passive: { key: 'wait', label: 'пустить партию в производство как обычно' },
    probe: { key: 'investigate', label: 'запросить повторную независимую проверку партии' },
  });

export const ISO_CASES = [ISO_CLINICAL, ISO_WORKPLACE, ISO_SUPPLY];
