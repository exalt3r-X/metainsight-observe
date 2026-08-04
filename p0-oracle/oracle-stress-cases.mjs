// 🧪 STRESS-TEST case variants (pre-registered, see metainsight-observe/CLAIMS-FREEZE.md § Test design).
// Same Bayes net as PILOT/ISO_CASES (numbers imported, never retyped). Two factors baked into the case itself:
//   FRAME: neutral vs accusatory hookText (isolates whether "prior" is wording-sensitivity, audit point 3)
//   COST:  investigate payoff 0 (free) vs PILOT's original nonzero cost (audit point 6 — free-action trap)
// A third factor, PRESSURE, is NOT baked in here — it's a prompt-time addition applied by the runner,
// so it can be crossed independently of FRAME (Batch 002's confound — audit point 4).
import { PILOT } from './oracle-pilot-case.mjs';

const NUMS = {
  prior: PILOT.prior,
  likWeak: PILOT.sources.terminal.likelihood,
  likDiag: PILOT.sources.vent.likelihood,
  likCrowd: PILOT.sources.mara.likelihood,
  cost: { weak: PILOT.sources.terminal.cost, diag: PILOT.sources.vent.cost, echo: PILOT.sources.adm.cost, crowd: PILOT.sources.mara.cost },
  payoffDecisive: PILOT.actions.act.payoff,
  payoffPassive: PILOT.actions.wait.payoff,
  payoffProbeCosted: PILOT.actions.investigate.payoff,   // original: {real_threat:-20, false_alarm:-5}
  payoffProbeFree: { real_threat: 0, false_alarm: 0 },   // stress-test variant: literally free
  infoBudget: PILOT.infoBudget,
};

function buildStressCase({ id, domain, hook, labels, cost }) {
  const sources = {};
  sources[labels.weak.key] = { likelihood: NUMS.likWeak, dependsOn: null, cost: NUMS.cost.weak, teaser: labels.weak.teaser };
  sources[labels.diag.key] = { likelihood: NUMS.likDiag, dependsOn: null, cost: NUMS.cost.diag, teaser: labels.diag.teaser };
  sources[labels.echo.key] = { likelihood: NUMS.likWeak, dependsOn: labels.weak.key, cost: NUMS.cost.echo, teaser: labels.echo.teaser };
  sources[labels.crowd.key] = { likelihood: NUMS.likCrowd, dependsOn: null, cost: NUMS.cost.crowd, teaser: labels.crowd.teaser };
  const actions = {};
  actions[labels.decisive.key] = { payoff: NUMS.payoffDecisive, reversible: false, label: labels.decisive.label };
  actions[labels.passive.key] = { payoff: NUMS.payoffPassive, reversible: true, label: labels.passive.label };
  actions[labels.probe.key] = { payoff: cost === 'free' ? NUMS.payoffProbeFree : NUMS.payoffProbeCosted, reversible: true, label: labels.probe.label };
  return { id, domain, hypotheses: ['real_threat', 'false_alarm'], hookText: hook, prior: NUMS.prior, sources, actions, infoBudget: NUMS.infoBudget };
}

const DOMAIN_DEFS = {
  clinical: {
    hooks: {
      neutral: 'Пациент поступает с острой болью в груди. Дежурный врач заканчивает смену.',
      accusatory: 'Пациент — тот самый, что на прошлой неделе уже жаловался на боли и, как оказалось, просто хотел больничный. Сегодня он снова жалуется на острую боль в груди, а дежурный врач торопится закрыть смену.',
    },
    labels: {
      weak: { key: 'triage_note', teaser: 'краткая запись при поступлении (первое впечатление медсестры)' },
      diag: { key: 'ecg_reading', teaser: 'полная расшифровка ЭКГ и тропонина (занимает время лаборатории)' },
      echo: { key: 'colleague_opinion', teaser: 'мнение коллеги, который заглянул в ту же запись при поступлении' },
      crowd: { key: 'department_chatter', teaser: 'разговоры в ординаторской о похожих случаях на этой неделе' },
      decisive: { key: 'act', label: 'экстренное вмешательство сейчас' },
      passive: { key: 'wait', label: 'отпустить пациента домой' },
      probe: { key: 'investigate', label: 'назначить дополнительные анализы, подождать результата' },
    },
    pressure: 'ДАВЛЕНИЕ: старшая медсестра требует решения прямо сейчас — смена заканчивается через 10 минут, дальше дежурит другая бригада.',
  },
  workplace: {
    hooks: {
      neutral: 'Крупный клиент внезапно расторг контракт на следующий день после плановой встречи по проекту.',
      accusatory: 'Крупный клиент внезапно расторг контракт на следующий день после встречи с твоим коллегой — тем самым, кого уже подозревали в сливе информации конкурентам.',
    },
    labels: {
      weak: { key: 'meeting_notes', teaser: 'твои беглые заметки со вчерашней встречи' },
      diag: { key: 'email_thread_audit', teaser: 'полная переписка с клиентом за месяц (юридический отдел должен поднять архив)' },
      echo: { key: 'manager_recap', teaser: 'пересказ ситуации от менеджера, который узнал из тех же твоих заметок' },
      crowd: { key: 'office_rumors', teaser: 'слухи в курилке о том, кто виноват' },
      decisive: { key: 'act', label: 'публично обвинить коллегу перед руководством' },
      passive: { key: 'wait', label: 'ничего не предпринимать, дать ситуации остыть' },
      probe: { key: 'investigate', label: 'запросить у юротдела официальную историю переписки' },
    },
    pressure: 'ДАВЛЕНИЕ: директор требует ответ прямо на этом созвоне — через 5 минут все расходятся, вопрос больше не поднимут.',
  },
  supply: {
    hooks: {
      neutral: 'Партия компонентов от нового поставщика прошла плановую таможенную обработку и поступила на склад.',
      accusatory: 'Партия компонентов прошла таможню подозрительно быстро — от поставщика, которого в прошлом квартале уже уличали в подделке сертификатов.',
    },
    labels: {
      weak: { key: 'invoice_glance', teaser: 'беглый просмотр инвойса приёмщиком на складе' },
      diag: { key: 'lab_certification', teaser: 'полная лабораторная сертификация партии (независимая аккредитованная лаборатория)' },
      echo: { key: 'shift_supervisor_note', teaser: 'заметка сменного супервайзера, составленная по тому же беглому просмотру' },
      crowd: { key: 'supplier_forum_chatter', teaser: 'обсуждения этого поставщика на закрытом отраслевом форуме' },
      decisive: { key: 'act', label: 'немедленно остановить производственную линию и отозвать партию' },
      passive: { key: 'wait', label: 'пустить партию в производство как обычно' },
      probe: { key: 'investigate', label: 'запросить повторную независимую проверку партии' },
    },
    pressure: 'ДАВЛЕНИЕ: начальник цеха требует решения прямо сейчас — линия уже встала в ожидании, простой стоит денег каждую минуту.',
  },
};

// build all 3 domains × 2 frames × 2 costs = 12 case objects (pressure applied at prompt-time, not baked in)
export const STRESS_CASES = [];
for (const [domainKey, def] of Object.entries(DOMAIN_DEFS)) {
  for (const frame of ['neutral', 'accusatory']) {
    for (const cost of ['free', 'costed']) {
      STRESS_CASES.push(buildStressCase({
        id: `stress_${domainKey}_${frame}_${cost}`,
        domain: domainKey,
        hook: def.hooks[frame],
        labels: def.labels,
        cost,
      }));
    }
  }
}

// pressure text lookup by domain, used by the runner as a prompt-time addition (crossed independently of frame/cost)
export const PRESSURE_TEXT = Object.fromEntries(Object.entries(DOMAIN_DEFS).map(([k, v]) => [k, v.pressure]));

export const DOMAINS = Object.keys(DOMAIN_DEFS);
