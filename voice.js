/* JARVIS OS 0.2.3 voice controller.
 * iPadOS 27 WebKit may keep the platform mic indicator on after the recognizer ends,
 * and abruptly stopping a successful session may break the following recognition.
 * Keep natural completion; disable manual stop after final results (WebKit 321436).
 * No getUserMedia streams are opened by this module.
 */
export function createVoiceController({
  Speech=globalThis.SpeechRecognition||globalThis.webkitSpeechRecognition,
  speechSynthesis=globalThis.speechSynthesis,
  Utterance=globalThis.SpeechSynthesisUtterance,
  onStatus=()=>{},
  onCommand=()=>{},
  setTimer=(fn,ms)=>setTimeout(fn,ms),
  clearTimer=id=>clearTimeout(id),
  now=()=>Date.now(),
}={}){
  let stage='idle';
  let message='Нажмите микрофон и произнесите команду';
  let recognizer=null,epoch=0,result='',recognitionError='',capture='unknown';
  let timeoutId=null,preambleId=null,speaking=null;
  let session=null;
  const sessions=[];
  const history=[];
  const active=()=>stage!=='idle';
  function log(event){
    const time=now();
    history.push({time,event});
    if(history.length>36)history.shift();
    onStatus({stage,message,capture});
  }
  const report=(next,text)=>{stage=next;message=text;onStatus({stage,message,capture});};
  function clearTimers(){
    if(timeoutId!==null){clearTimer(timeoutId);timeoutId=null;}
    if(preambleId!==null){clearTimer(preambleId);preambleId=null;}
  }
  function detach(rec){
    if(!rec)return;
    for(const property of ['onresult','onend','onerror','onstart','onaudiostart','onaudioend','onspeechstart','onspeechend'])rec[property]=null;
  }
  function diagnostics(){
    return {stage,message,capture,
      session:session?{...session}:null,
      sessions:sessions.map(s=>({...s})),
      events:history.map(item=>({...item}))};
  }
  function diagnosticText(){
    const d=diagnostics();
    const fmt=ms=>ms===null||ms===undefined?'нет':new Date(ms).toLocaleTimeString('ru-RU',{hour12:false})+'.'+String(ms%1000).padStart(3,'0');
    const s=d.session;
    const lines=['JARVIS OS v1.0 / диагностика речи','Состояние: '+d.stage,'Захват звука (события Web Speech): '+d.capture,
      'События браузера не показывают фактическое состояние системного индикатора iPadOS.'];
    if(s){
      lines.push('Сеанс '+s.id+': '+(s.mode==='fast'?'быстрый':'надёжный'));
      lines.push('Начало: '+fmt(s.startedAt));
      lines.push('Результат: '+fmt(s.resultAt));
      lines.push('Захват завершён (audioend): '+fmt(s.audioEndAt));
      lines.push('Служба отключена (end): '+fmt(s.endAt));
      if(s.resultAt&&s.audioEndAt)lines.push('Результат → audioend: '+(s.audioEndAt-s.resultAt)+' мс');
      if(s.audioEndAt&&s.endAt)lines.push('audioend → end: '+(s.endAt-s.audioEndAt)+' мс');
      if(s.endAt&&!s.audioEndAt)lines.push('ВАЖНО: end получен, audioend отсутствует. Освобождение микрофона не подтверждено Web Speech.');
      if(s.cancelledAt&&!s.endAt)lines.push('ВНИМАНИЕ: после отмены не подтверждено завершение аудиосессии.');
    }
    if(sessions.length>1){
      lines.push('Предыдущие сеансы (без текста команд):');
      for(const prev of sessions.slice(-5,-1))lines.push('#'+prev.id+' результат='+fmt(prev.resultAt)+' audioend='+fmt(prev.audioEndAt)+' end='+fmt(prev.endAt)+' отмена='+fmt(prev.cancelledAt));
    }
    lines.push('Последние события:');
    for(const e of d.events)lines.push(fmt(e.time)+'  '+e.event);
    return lines.join('\n');
  }
  function cancel(reason='manual'){
    epoch++;
    clearTimers();
    if(speaking){speaking.onend=null;speaking.onerror=null;speaking=null;try{speechSynthesis?.cancel()}catch{}}
    const old=recognizer;recognizer=null;
    if(old){detach(old);try{old.abort()}catch{}}
    // A cancelled recognizer may never emit audioend/end on some WebKit versions.
    if(session&&!session.endAt){session.cancelledAt=now();session.cancelReason=reason;}
    capture=old?'unknown':capture;
    log('cancel('+reason+')');
    report('idle',reason==='manual'?'Голосовой ввод отменён':'Речевой сеанс сброшен');
  }
  function fail(token,text){if(token!==epoch)return;cancel('timeout-or-error');report('idle',text);}
  function beginRecognition(token){
    if(token!==epoch)return;
    if(!Speech){fail(token,'Голосовой ввод недоступен. Используйте клавиатуру.');return;}
    let rec;
    try{
      rec=new Speech();
      rec.lang='ru-RU';rec.continuous=false;rec.interimResults=false;rec.maxAlternatives=1;
      recognizer=rec;result='';recognitionError='';capture='unknown';
      session={id:(session?.id||0)+1,mode:'reliable',startedAt:now(),resultAt:null,audioStartAt:null,audioEndAt:null,endAt:null,cancelledAt:null};
      sessions.push(session);if(sessions.length>6)sessions.shift();
      log('recognizer.start()');
      rec.onstart=()=>{if(token!==epoch)return;log('start');report('listening','Распознавание запущено. Произнесите команду.');};
      rec.onaudiostart=()=>{if(token!==epoch)return;capture='capturing';session.audioStartAt=now();log('audiostart');report('listening','Микрофон активен. Слушаю вашу команду.');};
      rec.onspeechstart=()=>{if(token===epoch)log('speechstart');};
      rec.onspeechend=()=>{if(token===epoch)log('speechend');};
      rec.onaudioend=()=>{
        if(token!==epoch)return;
        capture='ended';session.audioEndAt=now();log('audioend');
        report('finishing',result?'Браузер завершил запись. Ожидаю отключения распознавания…':'Захват звука завершён. Ожидаю результат…');
      };
      rec.onresult=event=>{
        if(token!==epoch)return;
        const values=event.results||[];
        let finalReceived=false;
        for(let i=event.resultIndex||0;i<values.length;i++){
          const phrase=values[i]?.[0]?.transcript?.trim();
          if(phrase && (values[i].isFinal!==false || !result))result=phrase;
          if(phrase&&values[i].isFinal===true)finalReceived=true;
        }
        if(!result)return;
        if(!session.resultAt)session.resultAt=now();
        log(finalReceived?'result(final)':'result');
        report('heard','Команда распознана. Жду завершения сеанса Safari…');
        // Intentionally DO NOT call stop() or abort() on successful final result.
        // Confirmed WebKit 321436: the next recognition can start but become deaf.
        if(timeoutId!==null)clearTimer(timeoutId);
        timeoutId=setTimer(()=>{
          if(token!==epoch)return;
          const recovered=result;
          fail(token,'Safari не прислал завершение за 10 секунд. Попробуйте перезапустить JARVIS при повторном зависании.');
          if(recovered)onCommand(recovered);
        },10000);
      };
      rec.onerror=event=>{
        if(token!==epoch)return;
        recognitionError=String(event.error||'unknown');
        log('error('+recognitionError+')');
        const reasons={
          'not-allowed':'Микрофон запрещён в настройках Safari.',
          'service-not-allowed':'Служба распознавания недоступна.',
          'network':'Для голосового распознавания требуется интернет.',
          'audio-capture':'Микрофон занят или недоступен.',
          'no-speech':'Речь не обнаружена. Попробуйте снова.',
          'aborted':'Сеанс распознавания прерван.'
        };
        report('finishing',reasons[recognitionError]||'Ошибка распознавания: '+recognitionError);
      };
      rec.onend=()=>{
        if(token!==epoch)return;
        session.endAt=now();log(session.audioEndAt?'end':'end (audioend missing)');
        clearTimers();detach(rec);recognizer=null;epoch++;
        if(capture!=='ended')capture='unconfirmed';
        const transcript=result;result='';
        if(transcript){
          report('idle',capture==='unconfirmed'?'Команда выполнена; WebKit не сообщил audioend. Проверьте индикатор iPadOS.':'Команда выполнена; распознавание завершено.');
          onCommand(transcript);
        }else{
          report('idle',recognitionError?'Распознавание завершено: '+recognitionError:'Речь не распознана. Попробуйте снова.');
        }
      };
      report('preparing','Запрашиваю микрофон…');
      rec.start();
      timeoutId=setTimer(()=>fail(token,'Распознавание зависло на 20 секунд. Сброс сеанса выполнен; при повторении перезапустите веб-приложение.'),20000);
    }catch(e){
      if(rec){detach(rec);if(recognizer===rec)recognizer=null;}
      fail(token,'Не удалось запустить микрофон: '+(e?.message||'ошибка Safari'));
    }
  }
  function start({compatibility=false}={}){
    if(active())return false;
    if(!Speech){report('idle','Голосовое распознавание недоступно в этом браузере.');return false;}
    epoch++;const token=epoch;result='';recognitionError='';clearTimers();
    if(compatibility&&speechSynthesis&&Utterance){
      report('preparing','Подготовка микрофона iPadOS…');
      try{
        const utterance=new Utterance('Слушаю');utterance.lang='ru-RU';utterance.rate=1.12;
        speaking=utterance;log('preamble.speak()');
        const done=()=>{
          if(token!==epoch)return;
          if(preambleId!==null){clearTimer(preambleId);preambleId=null;}
          utterance.onend=null;utterance.onerror=null;speaking=null;
          log('preamble.end');beginRecognition(token);
        };
        utterance.onend=done;
        utterance.onerror=()=>{if(token===epoch)done();};
        preambleId=setTimer(()=>{if(token!==epoch)return;try{speechSynthesis.cancel()}catch{}done();},4500);
        speechSynthesis.speak(utterance);
      }catch{beginRecognition(token);}
    }else beginRecognition(token);
    return true;
  }
  return {start,cancel,isActive:active,getStatus:()=>({stage,message,capture}),getDiagnostics:diagnostics,getDiagnosticText:diagnosticText};
}
