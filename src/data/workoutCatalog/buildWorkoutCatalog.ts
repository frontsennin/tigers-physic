import type { AnalysisCategory, PrescriptionMode } from '../../types/models'
import type { WorkoutPreset } from './types'

let _seq = 0
const nid = (slug: string) => `${slug}_${++_seq}`

function w(
  slug: string,
  name: string,
  group: string,
  suggestedWeekdays: number[],
  prescriptionMode: PrescriptionMode,
  sets: number | string,
  repsOrDuration: string,
  loadNote: string | null,
  objective: string,
  linkedCategories: AnalysisCategory[],
  coachCue?: string,
): WorkoutPreset {
  return {
    id: nid(slug),
    name,
    group,
    suggestedWeekdays,
    prescriptionMode,
    sets,
    repsOrDuration,
    loadNote,
    objective,
    linkedCategories,
    coachCue,
  }
}

/** Blocos fixos — flag, campo, técnica */
function flagFootballAndField(): WorkoutPreset[] {
  const daysAgility = [1, 3, 5]
  const daysSpeed = [2, 4, 6]
  const daysSkill = [1, 2, 3, 4, 5]
  const dCond = [1, 3, 5, 6]

  return [
    w('pro_shuttle', 'Pro agility shuttle (5-10-5)', 'Flag — agilidade', daysAgility, 'time', 6, 'Melhor tempo possível — repouso 2–3 min entre séries', null, 'Mudança de direção e aceleração lateral', ['velocidade', 'reflexo', 'explosao']),
    w('l_drill', 'L-drill (3 cones)', 'Flag — agilidade', daysAgility, 'time', 5, 'Completa o L o mais rápido possível — 3 min repouso', null, 'Frenagem, giro e aceleração', ['velocidade', 'mobilidade', 'explosao']),
    w('three_cone', '3-cone drill', 'Flag — agilidade', daysAgility, 'time', 5, 'Tempo total do percurso — foco em baixo centro de gravidade', null, 'Agilidade em curvas fechadas', ['velocidade', 'mobilidade']),
    w('t_drill', 'T-drill', 'Flag — agilidade', daysAgility, 'time', 4, '5 repetições com qualidade — descanso caminhando de volta', null, 'Transições multiplanares', ['velocidade', 'reflexo']),
    w('zigzag', 'Slalom entre cones (5–8 m)', 'Flag — agilidade', daysAgility, 'time', 6, 'Distância total 40–60 m por série — máxima velocidade técnica', null, 'Controle em alta velocidade', ['velocidade', 'mobilidade']),
    w('w_drill', 'W-drill (weave)', 'Flag — agilidade', daysAgility, 'time', 5, 'Cones a cada 2 m — mínimo toque no chão', null, 'Pés rápidos e coordenação', ['reflexo', 'velocidade']),
    w('mirror_shuffle', 'Espelho / mirror shuffle com par', 'Flag — reação', [2, 4], 'time', 8, '20–30 s trabalho / 40 s fácil — troca de quem lidera', null, 'Leitura e reação defensiva', ['reflexo', 'velocidade']),
    w('sprint_10', 'Sprint linear 10 m', 'Flag — velocidade', daysSpeed, 'time', 8, 'Saida em 2–3 passos + máx. 10 m — 2 min repouso', null, 'Primeiros passos e explosão', ['explosao', 'velocidade']),
    w('sprint_20', 'Sprint linear 20 m', 'Flag — velocidade', daysSpeed, 'time', 6, 'Partida de pé ou 3-point — repouso completo', null, 'Aceleração máxima', ['velocidade', 'explosao']),
    w('sprint_40yd', 'Sprint 40 jardas (36,5 m)', 'Flag — velocidade', daysSpeed, 'time', 5, 'Cronometrar — repouso 3–5 min', null, 'Velocidade máxima e transição', ['velocidade', 'explosao']),
    w('flying_20', 'Flying sprint 20 m (área de arranque)', 'Flag — velocidade', daysSpeed, 'time', 5, '10 m fácil + 20 m máximo — 3 min repouso', null, 'Velocidade máxima sem fadiga da saída', ['velocidade', 'explosao']),
    w('hill_sprint', 'Sprint em leve inclinação 15–25 m', 'Flag — potência', [2, 6], 'time', 6, 'Subida forte — caminhada de volta', null, 'Força específica de corrida', ['explosao', 'forca', 'velocidade']),
    w('tempo_run', 'Corrida em ritmo (tempo)', 'Flag — condicionamento', dCond, 'time', 1, '20–30 min zona confortável conversando', null, 'Base aeróbia sem impacto máximo', ['velocidade']),
    w('interval_15_15', 'Intervalos 15 s / 15 s no campo', 'Flag — condicionamento', dCond, 'time', 12, '15 s forte (≈85%) / 15 s trote — 8–12 min bloco', null, 'Capacidade anaeróbia repetida', ['velocidade', 'explosao']),
    w('gassers', 'Gassers (largura do campo)', 'Flag — condicionamento', dCond, 'time', 4, '4× ida e volta — repouso proporcional à condição', null, 'Condicionamento específico de jogo', ['velocidade', 'explosao']),
    w('route_tree', 'Árvore de rotas (WR) — técnica', 'Flag — WR', daysSkill, 'skill', 4, '10–12 rotas curtas com foco em quebra de quadril', null, 'Precisão de rota e explosão na saída', ['explosao', 'mobilidade']),
    w('release_drill', 'Releases vs press (somente movimento)', 'Flag — WR', daysSkill, 'skill', 5, '3 repetições de 4 tipos de release — qualidade', null, 'Livrar da marcação inicial', ['reflexo', 'mobilidade']),
    w('qb_footwork', 'Footwork de drops (QB)', 'Flag — QB', daysSkill, 'skill', 6, '3–5 drops por série — cronômetro opcional 20 s/série', null, 'Base e transferência de peso', ['mobilidade', 'explosao']),
    w('qb_throw_move', 'Arremesso em movimento (curto)', 'Flag — QB', daysSkill, 'reps_bodyweight', 4, '8–10 arremessos leves — distância 10–15 m', null, 'Estabilidade no throw on run', ['mobilidade', 'forca']),
    w('rip_swim', 'Rip / swim bag (DL)', 'Flag — DL', daysSkill, 'skill', 5, '8 repetições alternando técnica — sem contato duro', null, 'Pass rush técnico', ['mobilidade', 'explosao']),
    w('get_off', 'Get-off da linha (explosão)', 'Flag — DL/OL', daysSkill, 'time', 8, 'Saida em 1–2 s simulada × 6 — descanso 45 s', null, 'Primeiro passo explosivo', ['explosao', 'reflexo']),
    w('pass_pro_sets', 'Pass pro sets (OL — somente postura)', 'Flag — OL', daysSkill, 'reps_bodyweight', 5, '10 repetições de kick-slide controlado', null, 'Proteção de passe — mecânica', ['mobilidade', 'forca']),
    w('rb_jump_cut', 'Jump cuts e plantões (RB)', 'Flag — RB', daysSkill, 'skill', 5, '6–8 cones — mudança de direção suave', null, 'Corte e aceleração após plant', ['explosao', 'mobilidade']),
    w('catch_tennis', 'Reações com bola de tênis (hands)', 'Flag — skills', [1, 4], 'skill', 6, '30–40 bolas — parceiro arremessa imprevisível', null, 'Coordenação mão-olho', ['reflexo']),
    w('tackle_form', 'Form tackling / tracking (sem contato pleno)', 'Flag — tackling form', [3, 6], 'skill', 4, '10 aproximações em velocidade submáxima', null, 'Ângulo e aproximação segura', ['velocidade', 'mobilidade']),
    w('backpedal_flip', 'Backpedal + virada e corrida', 'Flag — DB skill', daysAgility, 'time', 6, '20 m total — cronometrar sensação', null, 'Transição defensiva', ['velocidade', 'reflexo']),
    w('broad_jump', 'Salto em distância (impulso)', 'Flag — teste', [2, 5], 'distance', 5, '5 saltos com descanso — medir melhor marca', null, 'Potência horizontal', ['impulso', 'explosao']),
    w('vert_jump', 'Salto vertical (toque na tabela ou chalk)', 'Flag — teste', [2, 5], 'reps_bodyweight', 4, '4–6 saltos — máximo esforço com técnica', null, 'Explosão vertical', ['explosao', 'impulso']),
    w('farmers_walk', 'Farmer walk (pegada)', 'Flag — força específica', [1, 4], 'reps_load', 4, '30–40 m por série', 'Halteres pesados — RPE 8', 'Resistência de pegada e core', ['pegada', 'forca']),
    w('sled_push', 'Sled push (se disponível)', 'Flag — força específica', [2, 6], 'time', 6, '15–25 m por empurrão — 2 min repouso', 'Carga moderada a alta', 'Força horizontal de corrida', ['forca', 'explosao']),
    w('band_sprint', 'Sprint resistido com elástico (10–15 m)', 'Flag — velocidade', daysSpeed, 'time', 6, 'Libera e acelera mais 10 m — efeito post-ativação', 'Elástico leve a médio', 'Aceleração', ['velocidade', 'explosao']),
    w('plyo_box', 'Saltos em caixa (baixo risco)', 'Flag — pliometria', [2, 5], 'reps_bodyweight', 4, '3–5 rep × 4 séries — altura conservadora', null, 'Reatividade (evitar fadiga)', ['explosao', 'impulso']),
    w('side_shuffle', 'Shuffle lateral com cones', 'Flag — agilidade', daysAgility, 'time', 5, '10 m ida e volta × 5 — cronômetro opcional', null, 'Movimento lateral defensivo', ['velocidade', 'mobilidade']),
    w('karaoke', 'Carioca (karaoke) técnica', 'Flag — mobilidade/campo', [1, 3], 'time', 4, '2× 20 m cada lado — amplitude controlada', null, 'Quadris e coordenação cruzada', ['mobilidade', 'velocidade']),
    w('high_knees', 'High knees + butt kicks', 'Flag — aquecimento', [0, 6], 'time', 1, '2× 20 m cada exercício', null, 'Ativação neuromuscular', ['velocidade', 'mobilidade']),
    w('deceleration', 'Frenagens progressivas 15–20 m', 'Flag — contato com chão', daysSpeed, 'time', 6, '6–8 frenagens controladas — repouso longo', null, 'Reduzir lesão e melhorar freio', ['velocidade', 'mobilidade']),
  ]
}

function gymUpper(): WorkoutPreset[] {
  const d = [1, 3, 5]
  const d2 = [2, 4, 6]
  const exercises: [string, string, number[], PrescriptionMode, number | string, string, string | null, string, AnalysisCategory[]][] = [
    ['Supino reto', 'Academia — peito', d, 'reps_load', 4, '6–10 rep', 'RPE 7–9', 'Força máxima / hipertrofia', ['forca']],
    ['Supino inclinado halter', 'Academia — peito', d, 'reps_load', 4, '8–12 rep', 'Peso moderado', 'Peito superior', ['forca']],
    ['Supino declinado', 'Academia — peito', d, 'reps_load', 3, '10–12 rep', null, 'Variação angular', ['forca']],
    ['Crucifixo máquina', 'Academia — peito', d, 'reps_load', 3, '12–15 rep', 'Isolamento', 'Metabolismo peitoral', ['forca']],
    ['Flexão de braços', 'Academia — peito', d2, 'reps_bodyweight', 4, 'até a falha técnica ou 12–25 rep', null, 'Força relativa', ['forca']],
    ['Desenvolvimento com barra', 'Academia — ombro', d, 'reps_load', 4, '6–10 rep', 'RPE 8', 'Deltoide e tronco', ['forca']],
    ['Elevação lateral', 'Academia — ombro', d, 'reps_load', 4, '12–20 rep', 'Pesos leves a médios', 'Deltoide médio', ['forca']],
    ['Elevação frontal', 'Academia — ombro', d, 'reps_load', 3, '10–15 rep', null, 'Deltoide anterior', ['forca']],
    ['Remada curvada', 'Academia — costas', d, 'reps_load', 4, '6–10 rep', 'Barra ou halteres', 'Espessura dorsal', ['forca']],
    ['Remada unilateral', 'Academia — costas', d, 'reps_load', 3, '10–12 rep cada lado', null, 'Simetria e core', ['forca']],
    ['Puxada alta (lat pulldown)', 'Academia — costas', d, 'reps_load', 4, '10–14 rep', null, 'Latíssimo', ['forca']],
    ['Puxada supinada', 'Academia — costas', d, 'reps_load', 3, '8–12 rep', null, 'Bíceps + costas', ['forca']],
    ['Remada baixa (cabo)', 'Academia — costas', d, 'reps_load', 4, '12–15 rep', null, 'Médio das costas', ['forca']],
    ['Barra fixa assistida', 'Academia — costas', d2, 'reps_bodyweight', 4, '6–12 rep', null, 'Dominante de puxada', ['forca']],
    ['Rosca direta barra', 'Academia — bíceps', d2, 'reps_load', 3, '10–14 rep', null, 'Hipertrofia braço', ['forca']],
    ['Rosca martelo', 'Academia — bíceps', d2, 'reps_load', 3, '12–15 rep', null, 'Braquiorradial', ['forca']],
    ['Tríceps testa', 'Academia — tríceps', d2, 'reps_load', 3, '10–12 rep', null, 'Massa braço', ['forca']],
    ['Tríceps corda', 'Academia — tríceps', d2, 'reps_load', 3, '12–18 rep', null, 'Definição', ['forca']],
    ['Paralelas (mergulho)', 'Academia — tríceps/peito', d2, 'reps_bodyweight', 4, '8–15 rep', 'Assistência se precisar', 'Empurrar', ['forca']],
    ['Face pull', 'Academia — postura', d, 'reps_load', 3, '15–20 rep', 'Carga leve', 'Ombro saudável', ['forca', 'mobilidade']],
    ['Crucifixo inverso máquina', 'Academia — ombro posterior', d, 'reps_load', 3, '12–15 rep', null, 'Postura', ['forca']],
    ['Supino fechado', 'Academia — tríceps', d2, 'reps_load', 4, '8–12 rep', null, 'Tríceps + peito', ['forca']],
    ['Arnold press', 'Academia — ombro', d, 'reps_load', 3, '10–12 rep', 'Halteres', 'Deltoide completo', ['forca']],
    ['Encolhimento (trapézio)', 'Academia — trapézio', d2, 'reps_load', 4, '12–15 rep', 'Barra ou halteres', 'Estabilidade escapular', ['forca']],
    ['Remada T', 'Academia — postura', d, 'reps_load', 3, '12–15 rep', 'Leve', 'Posterior de ombro', ['forca', 'mobilidade']],
    ['Cross over (cabo)', 'Academia — peito', d, 'reps_load', 3, '12–18 rep', null, 'Alongamento ativo peitoral', ['forca']],
    ['Pullover halter', 'Academia — peito/costas', d2, 'reps_load', 3, '12–15 rep', null, 'Expansão torácica', ['forca', 'mobilidade']],
  ]
  return exercises.map(([name, group, days, mode, sets, reps, load, obj, cats], i) =>
    w(
      `up_${i}`,
      name,
      group,
      days,
      mode,
      sets,
      reps,
      load,
      obj,
      cats,
    ),
  )
}

function gymLower(): WorkoutPreset[] {
  const d = [1, 3, 5]
  const d2 = [2, 4, 6]
  const exercises: [string, string, number[], PrescriptionMode, number | string, string, string | null, string, AnalysisCategory[]][] = [
    ['Agachamento livre', 'Academia — pernas', d, 'reps_load', 4, '5–8 rep', 'RPE 8–9', 'Força máxima', ['forca']],
    ['Agachamento frontal', 'Academia — pernas', d, 'reps_load', 4, '6–10 rep', null, 'Quadríceps e postura', ['forca']],
    ['Agachamento búlgaro', 'Academia — pernas', d, 'reps_load', 3, '8–12 rep perna', 'Halteres', 'Unilateral + estabilidade', ['forca', 'mobilidade']],
    ['Leg press 45°', 'Academia — pernas', d, 'reps_load', 4, '10–15 rep', 'Amplitude completa', 'Volume seguro', ['forca']],
    ['Cadeira extensora', 'Academia — quadríceps', d2, 'reps_load', 3, '12–18 rep', null, 'Metabolismo quadríceps', ['forca']],
    ['Mesa flexora', 'Academia — isquio', d2, 'reps_load', 3, '10–15 rep', null, 'Isquiotibiais', ['forca']],
    ['Stiff / RDL', 'Academia — posterior', d, 'reps_load', 4, '6–10 rep', 'Barra ou halteres', 'Posterior de coxa', ['forca', 'mobilidade']],
    ['Levantamento terra romeno halter', 'Academia — posterior', d, 'reps_load', 3, '8–12 rep', null, 'Cadência controlada', ['forca']],
    ['Avanço andando', 'Academia — pernas', d, 'reps_load', 3, '12–16 passos totais', 'Halteres', 'Unilateral', ['forca', 'mobilidade']],
    ['Avanço reverso', 'Academia — pernas', d, 'reps_load', 3, '10–12 rep perna', null, 'Joelho amigável', ['forca']],
    ['Passada lateral', 'Academia — pernas', d2, 'reps_load', 3, '10 cada lado', null, 'Adutores e glúteo', ['forca', 'mobilidade']],
    ['Elevação pélvica (hip thrust)', 'Academia — glúteo', d, 'reps_load', 4, '8–12 rep', 'Barra ou halter', 'Extensão de quadril', ['forca', 'explosao']],
    ['Abdução máquina', 'Academia — glúteo', d2, 'reps_load', 3, '15–20 rep', null, 'Glúteo médio', ['forca']],
    ['Cadira abdutora', 'Academia — glúteo', d2, 'reps_load', 3, '15–20 rep', null, 'Estabilidade quadril', ['forca']],
    ['Calf em pé', 'Academia — panturrilha', d2, 'reps_load', 4, '15–25 rep', null, 'Impulso e tornozelo', ['forca']],
    ['Calf sentado', 'Academia — panturrilha', d2, 'reps_load', 3, '15–20 rep', null, 'Sóleo', ['forca']],
    ['Hack squat', 'Academia — quadríceps', d, 'reps_load', 4, '8–12 rep', null, 'Volume quadríceps', ['forca']],
    ['Afundo no Smith', 'Academia — pernas', d, 'reps_load', 3, '10–12 rep perna', null, 'Controle', ['forca']],
    ['Step-up alto', 'Academia — pernas', d, 'reps_load', 3, '8–12 rep perna', 'Halteres', 'Unilateral + coordenação', ['forca', 'mobilidade']],
    ['Good morning leve', 'Academia — posterior', d2, 'reps_load', 3, '10–12 rep', 'Carga leve a moderada', 'Posterior + lombar estável', ['forca', 'mobilidade']],
    ['Agachamento sumô', 'Academia — pernas', d, 'reps_load', 4, '8–12 rep', null, 'Adutores + glúteo', ['forca']],
    ['Leg press unilateral', 'Academia — pernas', d2, 'reps_load', 3, '10–14 rep perna', null, 'Simetria', ['forca']],
    ['Extensão de quadril (cabo)', 'Academia — glúteo', d2, 'reps_load', 3, '12–18 rep', null, 'Ativação glúteo', ['forca']],
    ['Mobilidade quadril 90/90', 'Academia — mobilidade', [0, 6], 'time', 1, '2× 45 s cada lado', null, 'Preparação quadril', ['mobilidade']],
  ]
  return exercises.map(([name, group, days, mode, sets, reps, load, obj, cats], i) =>
    w(`lo_${i}`, name, group, days, mode, sets, reps, load, obj, cats),
  )
}

function gymCore(): WorkoutPreset[] {
  const d = [1, 2, 3, 4, 5, 6]
  return [
    w('plank', 'Prancha isométrica', 'Academia — core', d, 'time', 4, '40–60 s', null, 'Anti-extensão', ['forca', 'mobilidade']),
    w('side_plank', 'Prancha lateral', 'Academia — core', d, 'time', 3, '30–45 s cada lado', null, 'Estabilidade lateral', ['forca', 'mobilidade']),
    w('dead_bug', 'Dead bug', 'Academia — core', d, 'reps_bodyweight', 3, '10–12 rep cada lado', null, 'Controle lombar', ['mobilidade', 'forca']),
    w('pallof', 'Pallof press (cabo)', 'Academia — core', d, 'reps_load', 3, '12–15 rep cada lado', 'Carga leve', 'Anti-rotação', ['forca']),
    w('ab_wheel', 'Roda abdominal', 'Academia — core', d, 'reps_bodyweight', 3, '6–12 rep', null, 'Core completo', ['forca']),
    w('hanging_knee', 'Suspensão — joelho ao peito', 'Academia — core', d, 'reps_bodyweight', 3, '10–15 rep', null, 'Flexores + pegada', ['forca', 'pegada']),
    w('russian_twist', 'Russian twist com medicine ball', 'Academia — core', d, 'reps_load', 3, '20–30 rep total', 'Bola leve', 'Rotação controlada', ['forca', 'mobilidade']),
    w('cable_crunch', 'Abdominal polia alta', 'Academia — core', d, 'reps_load', 4, '12–18 rep', null, 'Reto abdominal', ['forca']),
    w('v_ups', 'V-ups / jackknife', 'Academia — core', d, 'reps_bodyweight', 3, '10–20 rep', null, 'Dinâmico', ['forca']),
    w('bird_dog', 'Bird dog', 'Academia — core', d, 'reps_bodyweight', 3, '10 rep cada lado', null, 'Estabilidade', ['mobilidade', 'forca']),
    w('copenhagen', 'Copenhagen addução (isquio)', 'Academia — core/lateral', [2, 5], 'time', 3, '20–40 s cada lado', null, 'Previne lesões adutores', ['forca', 'mobilidade']),
    w('l_sit_hold', 'L-sit parcial (paralelas)', 'Academia — core', [2, 4, 6], 'time', 4, '10–20 s', null, 'Compressão', ['forca']),
    w('woodchop', 'Woodchop (cabo)', 'Academia — core', d, 'reps_load', 3, '12 cada lado', 'Moderado', 'Rotação atlética', ['forca', 'mobilidade']),
  ]
}

function cardioMachines(): WorkoutPreset[] {
  const d = [1, 3, 5, 6]
  return [
    w('bike_hiit', 'Bicicleta — intervalos', 'Academia — cardio', d, 'time', 8, '30 s forte / 90 s leve', 'Resistência moderada', 'Condicionamento', ['velocidade', 'explosao']),
    w('bike_steady', 'Bicicleta — contínuo', 'Academia — cardio', d, 'time', 1, '35–50 min zona 2', null, 'Base aeróbia', ['velocidade']),
    w('row_hiit', 'Remo — intervalos', 'Academia — cardio', d, 'time', 6, '250 m forte / 2 min leve', null, 'Corpo inteiro', ['velocidade', 'forca']),
    w('row_steady', 'Remo — ritmo constante', 'Academia — cardio', d, 'time', 1, '5 km leve a moderado', null, 'Resistência', ['velocidade']),
    w('elliptical', 'Elíptico — contínuo', 'Academia — cardio', [2, 4], 'time', 1, '30–45 min', null, 'Impacto reduzido', ['velocidade']),
    w('stair_climber', 'Simulador de escada', 'Academia — cardio', d, 'time', 1, '15–25 min', null, 'Posterior + cardio', ['velocidade', 'forca']),
    w('treadmill_incline', 'Esteira inclinada caminhada rápida', 'Academia — cardio', d, 'time', 1, '20–35 min inclinação 8–12%', null, 'Metabolismo sem sprint', ['velocidade', 'forca']),
    w('assault_bike', 'Air bike — calorias', 'Academia — cardio', d, 'time', 6, '10 cal rápido / 45 s leve × rounds', null, 'Potência anaeróbia', ['explosao', 'velocidade']),
  ]
}

function mobilityYoga(): WorkoutPreset[] {
  const d = [0, 3, 6]
  return [
    w('wgs', "World's greatest stretch", 'Mobilidade', d, 'time', 2, '45 s cada lado × 2', null, 'Quadril e torácico', ['mobilidade']),
    w('9090', 'Quadril 90/90', 'Mobilidade', d, 'time', 2, '60 s cada lado', null, 'Rotação interna/externa', ['mobilidade']),
    w('thoracic', 'Mobilidade torácica foam roller', 'Mobilidade', d, 'time', 1, '8–10 min', null, 'Extensão torácica', ['mobilidade']),
    w('ankle_mob', 'Mobilidade tornozelo na parede', 'Mobilidade', d, 'time', 2, '12–15 rep cada pé', null, 'Dorsiflexão', ['mobilidade']),
    w('shoulder_disloc', 'Dislocations com bastão/banda', 'Mobilidade', d, 'reps_bodyweight', 3, '12–15 rep', 'Banda leve', 'Ombro', ['mobilidade']),
    w('cat_cow', 'Gato-vaca', 'Mobilidade', d, 'time', 2, '10 rep lento', null, 'Coluna', ['mobilidade']),
    w('pigeon', 'Pigeon stretch', 'Mobilidade', d, 'time', 2, '60–90 s cada lado', null, 'Glúteo / piriforme', ['mobilidade']),
    w('couch_stretch', 'Couch stretch (quadríceps/iliopsoas)', 'Mobilidade', d, 'time', 2, '45 s cada lado', null, 'Extensores de quadril', ['mobilidade']),
    w('neck_mob', 'Mobilidade cervical controlada', 'Mobilidade', d, 'time', 1, '5 min', null, 'Relaxamento', ['mobilidade']),
    w('wrist_flow', 'Fluxo de punhos (antebraço)', 'Mobilidade', [1, 4], 'time', 1, '5–8 min', null, 'QB / linha — prevenção', ['mobilidade', 'pegada']),
  ]
}

/** Gera muitas variações por combinação séries × rep */
function expandStrengthTemplates(
  base: string,
  slug: string,
  group: string,
  days: number[],
  schemes: [number | string, string, string | null][],
  cats: AnalysisCategory[],
): WorkoutPreset[] {
  return schemes.map(([sets, reps, load], i) =>
    w(
      `${slug}_${i}`,
      base,
      group,
      days,
      'reps_load',
      sets,
      reps,
      load,
      'Progressão quando a técnica estiver sólida',
      cats,
    ),
  )
}

function generatedVariations(): WorkoutPreset[] {
  const schemes: [number | string, string, string | null][] = [
    [3, '12–15 rep', 'RPE 7'],
    [4, '8–12 rep', 'RPE 8'],
    [5, '5–8 rep', 'RPE 8–9'],
    [4, '6–8 rep', '80–85% esforço percebido'],
    [3, '15–20 rep', 'Carga leve'],
  ]
  const daysPush = [1, 4]
  const daysPull = [2, 5]
  const daysLeg = [3, 6]

  const bases: [string, string, number[], AnalysisCategory[][]][] = [
    ['Supino máquina', 'Academia — máquinas', daysPush, [['forca']]],
    ['Peck deck', 'Academia — máquinas', daysPush, [['forca']]],
    ['Desenvolvimento máquina', 'Academia — máquinas', daysPush, [['forca']]],
    ['Tríceps pulley barra reta', 'Academia — máquinas', daysPush, [['forca']]],
    ['Puxada máquina neutra', 'Academia — máquinas', daysPull, [['forca']]],
    ['Remada máquina (pegada neutra)', 'Academia — máquinas', daysPull, [['forca']]],
    ['Rosca scott máquina', 'Academia — máquinas', daysPull, [['forca']]],
    ['Leg press horizontal', 'Academia — máquinas', daysLeg, [['forca']]],
    ['Cadeira adutora', 'Academia — máquinas', daysLeg, [['forca']]],
    ['Extensora unilateral', 'Academia — máquinas', daysLeg, [['forca']]],
    ['Flexora unilateral', 'Academia — máquinas', daysLeg, [['forca']]],
    ['Glúteo máquina (coice)', 'Academia — máquinas', daysLeg, [['forca']]],
    ['Panturrilha máquina em pé', 'Academia — máquinas', daysLeg, [['forca']]],
    ['Abdominal máquina', 'Academia — máquinas', [1, 3, 5], [['forca']]],
    ['Back extension (hiperextensão)', 'Academia — máquinas', daysPull, [['forca', 'mobilidade']]],
    ['Trapézio máquina (shrug)', 'Academia — máquinas', daysPull, [['forca']]],
    ['Crucifixo máquina convergente', 'Academia — máquinas', daysPush, [['forca']]],
    ['Supino articulado', 'Academia — máquinas', daysPush, [['forca']]],
    ['Remada T-bar', 'Academia — máquinas', daysPull, [['forca']]],
    ['Agachamento hack', 'Academia — máquinas', daysLeg, [['forca']]],
    ['Elevação lateral máquina', 'Academia — máquinas', daysPush, [['forca']]],
  ]

  return bases.flatMap(([name, group, days, catArr], idx) =>
    expandStrengthTemplates(
      name,
      `mach_${idx}`,
      group,
      days,
      schemes,
      catArr.flat(),
    ),
  )
}

function kettlebellAndFunctional(): WorkoutPreset[] {
  const d = [2, 4, 6]
  return [
    w('kb_swing', 'Kettlebell swing', 'Funcional — KB', d, 'reps_load', 5, '15–25 rep', 'KB moderado', 'Potência de quadril', ['explosao', 'forca']),
    w('kb_goblet', 'Agachamento goblet', 'Funcional — KB', d, 'reps_load', 4, '10–15 rep', 'KB', 'Profundidade e postura', ['forca', 'mobilidade']),
    w('kb_clean', 'Clean com kettlebell (técnica)', 'Funcional — KB', d, 'skill', 6, '5 rep leves × séries — qualidade', 'KB leve', 'Potência e coordenação', ['explosao', 'forca']),
    w('kb_snatch', 'Snatch KB (unilateral)', 'Funcional — KB', d, 'skill', 5, '4–6 rep cada braço', 'Leve a médio', 'Potência overhead', ['explosao', 'mobilidade']),
    w('kb_tgu', 'Turkish get-up', 'Funcional — KB', d, 'skill', 3, '2–3 rep cada lado', 'KB leve', 'Estabilidade global', ['forca', 'mobilidade']),
    w('battle_ropes', 'Corda naval — ondas', 'Funcional', d, 'time', 6, '20 s onda rápida / 40 s leve', null, 'Metabolismo braço/core', ['explosao', 'forca']),
    w('sled_drag', 'Arraste de trenó (se houver)', 'Funcional', d, 'time', 6, '20 m ida e volta', 'Carga moderada', 'Força horizontal', ['forca', 'explosao']),
    w('med_ball_slam', 'Arremesso de bola ao chão', 'Funcional', d, 'reps_load', 4, '10–15 rep', 'Bola moderada', 'Potência total', ['explosao', 'forca']),
    w('wall_ball', 'Wall ball', 'Funcional', d, 'reps_load', 4, '12–20 rep', 'Bola', 'Condicionamento + pernas', ['explosao', 'forca']),
    w('box_jump_low', 'Salto em caixa baixa', 'Funcional — plio', d, 'reps_bodyweight', 5, '3–5 rep', null, 'Reatividade', ['explosao', 'impulso']),
    w('burpee', 'Burpee controlado', 'Funcional — metabolismo', d, 'time', 5, '30 s trabalho / 60 s fácil', null, 'Metabolismo total', ['velocidade', 'explosao']),
    w('mountain_climber', 'Mountain climber', 'Funcional — core', d, 'time', 4, '30–45 s', null, 'Core dinâmico', ['forca', 'velocidade']),
    w('jump_rope', 'Corda de pular — intervalos', 'Funcional — coordenação', d, 'time', 6, '45 s / 45 s leve', null, 'Pés e tornozelo', ['velocidade', 'reflexo']),
    w('sprint_in_place', 'Corrida no lugar alta', 'Funcional — aquecimento', [0, 6], 'time', 4, '4× 15 s', null, 'Ativação', ['velocidade', 'explosao']),
  ]
}

function circuits(): WorkoutPreset[] {
  const d = [1, 3, 6]
  return [
    w('circuit_a', 'Circuito A — corpo inteiro (6 estações)', 'Circuito', d, 'circuit', 3, '45 s cada estação / 15 s troca — 2–3 voltas', 'Cargas leves a moderadas', 'Condicionamento geral', ['velocidade', 'forca']),
    w('circuit_b', 'Circuito B — core + mobilidade', 'Circuito', d, 'circuit', 3, '40 s por exercício — 2 voltas', null, 'Recuperação ativa', ['mobilidade', 'forca']),
    w('circuit_c', 'Circuito C — pernas metabolismo', 'Circuito', d, 'circuit', 4, '12 agachamento + 12 avanço + 30 s prancha — 4 rounds', 'Peso corporal ou halter leve', 'Metabolismo pernas', ['forca', 'velocidade']),
    w('circuit_d', 'Circuito D — empurrar/puxar', 'Circuito', [2, 5], 'circuit', 3, 'Supino máquina + remada máquina alternados — 12 rep cada', 'Moderado', 'Volume upper', ['forca']),
  ]
}

function olympicAndPower(): WorkoutPreset[] {
  const d = [2, 5]
  return [
    w('power_clean', 'Power clean (técnica)', 'Força — OL', d, 'skill', 6, '2–3 rep técnica', 'Barra vazia a leve', 'Potência (somente com supervisão)', ['explosao', 'forca']),
    w('hang_clean', 'Hang clean (bloco joelho)', 'Força — OL', d, 'skill', 5, '2–4 rep', 'Leve', 'Extensão de quadril', ['explosao', 'forca']),
    w('push_press', 'Push press', 'Força — OL', d, 'reps_load', 5, '3–6 rep', 'Moderado', 'Impulso overhead', ['explosao', 'forca']),
    w('high_pull', 'High pull (arranque alto)', 'Força — OL', d, 'reps_load', 5, '4–6 rep', 'Leve a médio', 'Tração explosiva', ['explosao', 'forca']),
    w('jump_shrug', 'Jump shrug com barra leve', 'Força — potência', d, 'reps_load', 4, '5–8 rep', 'Barra leve', 'Extensão vertical', ['explosao', 'impulso']),
  ]
}

function gripAndNeck(): WorkoutPreset[] {
  const d = [2, 4, 6]
  return [
    w('dead_hang', 'Dead hang na barra', 'Pegada — isométrico', d, 'time', 4, '20–40 s', null, 'Resistência de preensão', ['pegada', 'forca']),
    w('plate_pinch', 'Pinch grip com anilhas', 'Pegada', d, 'time', 4, '20–30 s cada mão', 'Anilhas lisas', 'Força de pinça', ['pegada']),
    w('towel_pullup', 'Barra fixa com toalha', 'Pegada', d, 'reps_bodyweight', 4, '4–8 rep', null, 'Pegada desafiadora', ['pegada', 'forca']),
    w('wrist_curl', 'Rosca punhal', 'Antebraço', d, 'reps_load', 3, '15–20 rep', 'Barra W', 'Extensores/flexores', ['forca', 'pegada']),
    w('reverse_curl', 'Rosca inversa', 'Antebraço', d, 'reps_load', 3, '12–15 rep', 'Barra', 'Braquiorradial', ['forca']),
    w('neck_isometric', 'Isométrico cervical (cinto/manual)', 'Pescoço — PRE', [3, 6], 'time', 4, '6–10 s cada direção', 'Pressão leve', 'Estabilidade — evitar hiperextensão', ['forca', 'mobilidade']),
  ]
}

function moreConditioning(): WorkoutPreset[] {
  const d = [1, 3, 5]
  return [
    w('aerobic_play', 'Jogos reduzidos (flag 5v5 curto)', 'Flag — jogo', [6], 'time', 4, '4× 6 min com 2 min entre', null, 'Especificidade', ['velocidade', 'reflexo']),
    w('shadow_defense', 'Sombras defensivas (sem bola)', 'Flag — condicionamento', d, 'time', 6, '30 s intenso / 30 s fácil', null, 'Pés e leitura', ['velocidade', 'reflexo']),
    w('cone_weave_sprint', 'Weave + sprint 20 m', 'Flag — campo', d, 'time', 6, '6 repetições — repouso completo', null, 'Transição para linha reta', ['velocidade', 'explosao']),
    w('figure8', 'Oito entre cones', 'Flag — agilidade', d, 'time', 5, '5 voltas — cronometrar', null, 'Curvas contínuas', ['velocidade', 'mobilidade']),
    w('defensive_slide', 'Slides defensivos 10 m', 'Flag — lateral', [2, 4], 'time', 6, '4× ida e volta', null, 'Base baixa', ['mobilidade', 'velocidade']),
    w('sprint_curve', 'Sprint em curva leve', 'Flag — velocidade', [6], 'time', 4, '4× 30–40 m', null, 'Mecânica em curva', ['velocidade', 'mobilidade']),
    w('pool_recovery', 'Natação leve ou caminhada na piscina', 'Recuperação', [0], 'time', 1, '20–40 min muito fácil', null, 'Recuperação ativa', ['mobilidade']),
    w('walk_incline', 'Caminhada inclinada', 'Cardio leve', [0, 6], 'time', 1, '30–45 min', null, 'Base sem impacto', ['velocidade']),
  ]
}

/** Centenas de entradas: explosão de combinações nome × esquema */
function massHypertrophyVariations(): WorkoutPreset[] {
  const names = [
    'Cross over baixo',
    'Cross over médio',
    'Supino declinado halter',
    'Supino reto halter',
    'Crucifixo reto halter',
    'Desenvolvimento Arnold halter',
    'Elevação lateral polia',
    'Elevação Y no banco inclinado',
    'Remada serrote',
    'Remada cavalinho',
    'Pull-down pegada fechada',
    'Pull-down pegada aberta',
    'Remada baixa triângulo',
    'Rosca concentrada',
    'Rosca Zottman',
    'Rosca na polia alta',
    'Tríceps francês',
    'Tríceps coice',
    'Tríceps mergulho entre bancos',
    'Extensão de ombros (cabo)',
    'Encolhimento com halteres',
    'Encolhimento barra por trás',
    'Remada invertida (inverted row)',
    'Flexão arqueira',
    'Flexão diamante',
    'Flexão declive',
    'Flexão pés elevados',
    'Desenvolvimento sentado máquina',
    'Crucifixo inverso halter',
    'Puxada com rotação neutra',
    'Remada unilateral no banco',
    'Rosca direta halter',
    'Rosca alternada sentado',
    'Tríceps pulley corda',
    'Tríceps unilateral polia',
    'Supino neutro halter',
    'Peitoral máquina convergente',
    'Costas máquina pegada pronada',
    'Costas máquina pegada supinada',
  ]
  const schemes: [number | string, string, string | null][] = [
    [3, '12–15', 'RPE 7'],
    [4, '8–12', 'RPE 8'],
    [4, '10–12', 'RPE 7–8'],
    [5, '6–10', 'RPE 8–9'],
    [3, '15–20', 'Leve'],
  ]
  const days = [1, 2, 3, 4, 5, 6]
  return names.flatMap((name, ni) =>
    schemes.map(([sets, repRange, load], si) =>
      w(
        `hy_${ni}_${si}`,
        `${name} — ${repRange} rep`,
        'Academia — hipertrofia / força',
        days,
        'reps_load',
        sets,
        `${repRange} repetições — controle excêntrico 2–3 s`,
        load,
        'Volume e tensão mecânica',
        ['forca'],
      ),
    ),
  )
}

function massLowerVariations(): WorkoutPreset[] {
  const names = [
    'Agachamento sumô halter',
    'Agachamento goblet profundo',
    'Leg press unilateral 45°',
    'Extensora + flexora superset',
    'Cadeira extensora rest-pause',
    'Mesa flexora uma perna',
    'Stiff halter',
    'RDL unilateral',
    'Good morning halter',
    'Passada com halteres',
    'Passada com barra',
    'Avanço reverso deficit',
    'Step down (controle excêntrico)',
    'Elevação pélvica unilateral',
    'Glúteo polia (puxada)',
    'Abdução de quadril lateral',
    'Monster walk com miniband',
    'Clamshell com miniband',
    'Panturrilha leg press',
    'Panturrilha unilateral halter',
    'Agachamento isométrico na parede',
    'Wall sit',
    'Sissy squat assistido',
    'Hack squat reverso',
    'Smith agachamento atrás',
    'Zercher squat leve',
    'Overhead squat leve (mobilidade)',
    'Curtsy lunge',
    'Lateral lunge',
    'Split squat isométrico',
    'Bulgarian split squat',
    'Walking lunge halter',
    'Reverse hyperextension',
    'Back extension isométrico',
    'Nordic curl excêntrico (assistido)',
    'Leg curl em pé (se máquina)',
  ]
  const schemes: [number | string, string, string | null][] = [
    [4, '8–12', 'RPE 8'],
    [3, '10–15', 'RPE 7–8'],
    [5, '5–8', 'RPE 9'],
    [4, '12–18', 'Leve a moderado'],
  ]
  const days = [1, 2, 3, 4, 5, 6]
  return names.flatMap((name, ni) =>
    schemes.map(([sets, repRange, load], si) =>
      w(
        `hyleg_${ni}_${si}`,
        `${name} — ${repRange} rep`,
        'Academia — pernas / glúteo',
        days,
        'reps_load',
        sets,
        `${repRange} repetições — amplitude completa quando seguro`,
        load,
        'Força e volume de membros inferiores',
        ['forca', 'mobilidade'],
      ),
    ),
  )
}

function speedTimeBlocks(): WorkoutPreset[] {
  const d = [2, 4, 6]
  const blocks: [string, string, number, string, string][] = [
    ['Bloco 10 m — saídas', 'Velocidade — bloco', 8, '6 saídas × 10 m — repouso 90 s', 'Máxima intenidade na janela curta'],
    ['Bloco 20 m — aceleração', 'Velocidade — bloco', 6, '5 × 20 m — 2 min repouso', 'Construir velocidade sem fadiga'],
    ['Bloco 30-30 campo', 'Condicionamento — tempo', 10, '30 m forte / caminhada de volta', 'Volume de alta velocidade'],
    ['Bloco Tabata leve', 'Metabolismo — tempo', 8, '20 s / 10 s × 8 (exercício escolhido)', 'Intensidade submáxima técnica'],
    ['Bloco 1-2-3', 'Condicionamento — tempo', 6, '1 min forte / 2 min fácil / 3 min moderado × 2 rounds', 'Variação de zona'],
    ['Bloco tempo limite 12 min', 'AMRAP técnico', 1, 'AMRAP rounds leves em 12 min', 'Manter qualidade'],
    ['Bloco 400 m ritmo', 'Pista / campo', 4, '4 × 400 m ritmo controlado — 2 min trote', 'Resistência especial'],
    ['Bloco 200 m', 'Pista / campo', 6, '6 × 200 m — ritmo forte', 'Velocidade especial'],
    ['Bloco fartlek 25 min', 'Campo contínuo', 1, '25 min fartlek livre', 'Leitura de esforço'],
    ['Bloco strides 100 m', 'Pós-treino', 6, '6 × 100 m progressivo 70→90%', 'Engraxar mecânica'],
  ]
  return blocks.map(([name, group, sets, reps, obj], i) =>
    w(`spd_${i}`, name, group, d, 'time', sets, reps, null, obj, ['velocidade', 'explosao']),
  )
}

export function buildAllWorkoutPresets(): WorkoutPreset[] {
  _seq = 0
  return [
    ...flagFootballAndField(),
    ...gymUpper(),
    ...gymLower(),
    ...gymCore(),
    ...cardioMachines(),
    ...mobilityYoga(),
    ...generatedVariations(),
    ...kettlebellAndFunctional(),
    ...circuits(),
    ...olympicAndPower(),
    ...gripAndNeck(),
    ...moreConditioning(),
    ...massHypertrophyVariations(),
    ...massLowerVariations(),
    ...speedTimeBlocks(),
  ]
}
