/** JARVIS OS 0.2 — deterministic, entirely local command interpreter.
 * Commands are matched explicitly; this module is NOT an LLM.
 */
const canonical = input => String(input ?? '')
  .toLocaleLowerCase('ru-RU')
  .replace(/ё/g,'е')
  .replace(/[!?.,:;]+/g,' ')
  .replace(/\s+/g,' ')
  .trim();

const targets = {
  spatial:['пространство','пространственную среду','спатиал фордж','spatial forge','инженерную лабораторию','инженерия','трехмерную среду','3d лабораторию','умное пространство','smart space','базу знаний'],
  apphub:['app hub','мои приложения','каталог сайтов','веб приложения','веб-приложения','сайты','веб каталог'],
  cortex:['джарвис','ассистент','интеллект','cortex'],
  routines:['сценарии','автоматизации','сценарий','макросы'],
  atlas:['атлас','атлас данных','карта данных','data atlas'],
  bridge:['миссия','мостик','командный мостик','миссионный центр','режим полета','гиперпрыжок','mission control','flight deck','планета'],
  holodeck:['голограмму','голограмма','голографический центр','холо дек','холодек','holo deck','holodeck','космос','планетарий','звездную карту','солнечную систему','музыкальный реактор'],
  calendar:['календарь','календаря','события','встречи','расписание'],
  projects:['проекты','проект','доска','канбан'],
  focus:['фокус','помодоро','таймер концентрации','концентрация'],
  search:['поиск','найди','искать','глобальный поиск'],
  notes:['заметки','заметку','записи','блокнот','notes'],
  tasks:['задачи','задачу','дела','список дел','tasks'],
  vault:['файлы','файл','хранилище','проводник','документы','vault'],
  audio:['аудио','звук','аудиолабораторию','звуковую лабораторию','audio','sound lab'],
  calculator:['калькулятор','счеты','посчитать','calculator'],
  clock:['часы','хронометр','время','clock'],
  diagnostics:['диагностику','состояние системы','диагностика'],
  settings:['настройки','параметры','settings'],
  apps:['приложения','программы','модули','каталог']
};

export function interpretCommand(input, modules=[]){
 const q=canonical(input);
 if(!q)return {type:'empty'};
 if(/^(домой|главная|на главный экран|на рабочий стол|вернись домой)/.test(q))return {type:'home'};
 if(/^(помощь|что ты умеешь|список команд|команды)$/.test(q))return {type:'help'};
 if(/(две панели|два окна|раздели экран|разделить экран|многозадачность|split screen)/.test(q))return {type:'split'};
 if(/(сколько времени|который час|сколько сейчас времени)/.test(q))return {type:'time'};
 if(/^найди\s+/.test(q))return {type:'search',query:input.trim().replace(/^найди\s+/i,'')};
 if(/(?:^|\s)(?:новая|новую|создай|создать|добавь)(?:\s+мне)?\s+заметк/.test(q))return {type:'new-note'};
 const task=q.match(/^(?:добавь\s+)?(?:задача|задачу|задачи|запиши задачу|добавь задачу|создай задачу|поставь задачу)(?:\s+|$)(.*)$/);
 if(task)return {type:'task',text:input.trim().slice(q.length-task[1].length).trim()};
 if(/(?:тема|цвет|оформление)/.test(q)){
   if(/(янтар|золот|оранж)/.test(q))return {type:'theme',theme:'amber'};
   if(/(мятн|зелен)/.test(q))return {type:'theme',theme:'mint'};
   if(/(син|голуб|бирюз)/.test(q))return {type:'theme',theme:'blue'};
 }
 let candidate=q.replace(/^(открой|открыть|запусти|запуск|покажи|показать|перейди в|включи|открывай)\s+/,'').trim();
 for(const [id,aliases] of Object.entries(targets)){
   if(aliases.some(a=>candidate===a||candidate.startsWith(a+' ')||(q.startsWith('открой ')&&candidate.includes(a))))return {type:'open',id};
 }
 for(const m of modules){
   const name=canonical(m.name);
   if(candidate===name || candidate===m.id)return {type:'open',id:m.id};
 }
 return {type:'unknown',query:q};
}
