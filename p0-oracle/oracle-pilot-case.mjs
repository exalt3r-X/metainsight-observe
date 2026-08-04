// Пилотный кейс v0.3 P0 — числа заданы ВРУЧНУЮ (не сгенерены LLM), чтобы проверить движок на понятной математике
// до масштабирования на прозу-обёртки. Медицинский скелет: терминал(слабый)→vent(диагн.ключ)→adm(эхо terminal)→mara(слух).
export const PILOT = {
  id: 'pilot_med',
  hypotheses: ['real_threat', 'false_alarm'],
  prior: { real_threat: 0.3, false_alarm: 0.7 },
  sources: {
    terminal: { likelihood: { real_threat: 0.6, false_alarm: 0.5 }, dependsOn: null, cost: 0 },   // бесплатный стартовый, слабый сигнал
    vent:     { likelihood: { real_threat: 0.95, false_alarm: 0.05 }, dependsOn: null, cost: 5 },  // диагностический ключ, дорогой
    adm:      { likelihood: { real_threat: 0.6, false_alarm: 0.5 }, dependsOn: 'terminal', cost: 2 }, // ЭХО terminal (та же likelihood — тот же наблюдаемый факт)
    mara:     { likelihood: { real_threat: 0.55, false_alarm: 0.45 }, dependsOn: null, cost: 1 },  // толпа/слух, шумный слабый сигнал
  },
  actions: {
    act:         { payoff: { real_threat: 100, false_alarm: -80 }, reversible: false },
    wait:        { payoff: { real_threat: -100, false_alarm: 0 }, reversible: true },
    investigate: { payoff: { real_threat: -20, false_alarm: -5 }, reversible: true },
  },
  infoBudget: 3,
};
