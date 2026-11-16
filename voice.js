/* JARVIS OS speech sessions. Separate from command parsing and UI.
   iPadOS WebKit can keep an audio session alive without any recognition callbacks.
   We try a short speechSynthesis preamble between one-shot recognition sessions
   in compatibility mode, and NEVER force-stop a successful session before onend.
   This is best-effort for WebKit bug 321436, not a platform-level fix. */
export function createVoiceController({
  Speech=globalThis.SpeechRecognition||globalThis.webkitSpeechRecognition,
  speechSynthesis=globalThis.speechSynthesis,
  Utterance=globalThis.SpeechSynthesisUtterance,
  onStatus=()=>{},
  onCommand=()=>{},
  setTimer=(fn,ms)=>setTimeout(fn,ms),
  clearTimer=id=>clearTimeout(id),
}={}){
  let stage='idle', message='Нажмите микрофон и произнесите команду';
  let recognizer=null, epoch=0, result='', recognitionError='';
  let timeoutId=null, preambleId=null, speaking=null;
  const active=()=>stage!=='idle';
  const report=(next,text)=>{stage=next;message=text;onStatus({stage,message});};
  const clearTimers=()=>{if(timeoutId!==null){clearTimer(timeoutId);timeoutId=null;}if(preambleId!==null){clearTimer(preambleId);preambleId=null;}};
  const detach=rec=>{if(!rec)return;rec.onresult=null;rec.onend=null;rec.onerror=null;rec.onstart=null;};
  // abort() is only for explicit cancellation or a stalled recognizer.
  // Calling it after every successful recognition can trigger WebKit's repeated-session bug.
  function cancel(){
    epoch++;clearTimers();
    if(speaking){speaking.onend=null;speaking.onerror=null;speaking=null;try{speechSynthesis?.cancel()}catch{}}
    const old=recognizer;recognizer=null;
    if(old){detach(old);try{old.abort()}catch{}}
    report('idle','Ожидание команды');
  }
  function fail(token,text){if(token!==epoch)return;cancel();report('idle',text);}
  function beginRecognition(token){
    if(token!==epoch)return;
    if(!Speech){fail(token,'Голосовой ввод недоступен. Используйте клавиатуру.');return;}
    let rec;
    try{
      rec=new Speech();rec.lang='ru-RU';rec.continuous=false;rec.interimResults=false;
      rec.maxAlternatives=1;recognizer=rec;result='';recognitionError='';
      rec.onstart=()=>{if(token===epoch)report('listening','Слушаю. Произнесите одну команду.');};
      rec.onresult=event=>{
        if(token!==epoch)return;
        const values=event.results||[];
        for(let i=event.resultIndex||0;i<values.length;i++){
          const phrase=values[i]?.[0]?.transcript?.trim();
          if(phrase && (values[i].isFinal!==false || !result))result=phrase;
        }
        if(result){
          report('heard','Распознано: «'+result+'». Завершаю сеанс…');
          // If WebKit loses onend after returning the transcript, still execute
          // the command instead of dropping the user's successful dictation.
          if(timeoutId!==null)clearTimer(timeoutId);
          timeoutId=setTimer(()=>{
            if(token!==epoch)return;
            const recovered=result;
            fail(token,'Safari не завершил голосовой сеанс. Микрофон сброшен. При повторном зависании перезапустите веб-приложение.');
            if(recovered)onCommand(recovered);
          },7000);
        }
      };
      rec.onerror=event=>{
        if(token!==epoch)return;
        recognitionError=String(event.error||'unknown');
        const reasons={
          'not-allowed':'Микрофон запрещён в настройках Safari.',
          'service-not-allowed':'Служба распознавания недоступна.',
          'network':'Для голосового распознавания требуется интернет.',
          'audio-capture':'Микрофон занят или недоступен.',
          'no-speech':'Речь не обнаружена. Попробуйте снова.',
          'aborted':'Сеанс распознавания прерван.'
        };
        report('listening',reasons[recognitionError]||'Ошибка распознавания: '+recognitionError);
      };
      rec.onend=()=>{
        if(token!==epoch)return;
        clearTimers();detach(rec);recognizer=null;epoch++;
        const transcript=result;result='';
        if(transcript){report('idle','Распознано: «'+transcript+'»');onCommand(transcript);}
        else report('idle',recognitionError ? 'Распознавание завершено: '+recognitionError : 'Речь не распознана. Попробуйте снова.');
      };
      report('listening','Запрашиваю доступ к микрофону…');
      rec.start();
      // WebKit sometimes fires no onend/onerror after the microphone gets stuck.
      // Last-resort cleanup is intentionally much later than normal end-of-speech.
      timeoutId=setTimer(()=>fail(token,'Safari не завершил распознавание за 20 секунд. Микрофон сброшен. При повторном зависании полностью закройте и откройте JARVIS.'),20000);
    }catch(e){
      if(rec){detach(rec);if(recognizer===rec)recognizer=null;}
      fail(token,'Не удалось запустить микрофон: '+(e?.message||'ошибка Safari'));
    }
  }
  function start({compatibility=false}={}){
    if(active())return false;
    if(!Speech){report('idle','Голосовое распознавание недоступно в этом браузере.');return false;}
    epoch++;const token=epoch;result='';recognitionError='';clearTimers();
    if(compatibility && speechSynthesis && Utterance){
      report('preparing','Подготовка микрофона iPadOS…');
      try{
        // Confirmed experimental WebKit workaround: short speechSynthesis
        // BEFORE each non-continuous session, then let recognition end naturally.
        const utterance=new Utterance('Слушаю');utterance.lang='ru-RU';utterance.rate=1.12;
        speaking=utterance;
        const done=()=>{
          if(token!==epoch)return;
          if(preambleId!==null){clearTimer(preambleId);preambleId=null;}
          utterance.onend=null;utterance.onerror=null;speaking=null;
          beginRecognition(token);
        };
        utterance.onend=done;
        utterance.onerror=()=>{if(token===epoch){report('preparing','Голосовая подготовка недоступна. Запускаю микрофон напрямую.');done();}};
        preambleId=setTimer(()=>{if(token!==epoch)return;try{speechSynthesis.cancel()}catch{}done();},4500);
        speechSynthesis.speak(utterance);
      }catch{beginRecognition(token);}
    }else beginRecognition(token);
    return true;
  }
  return {start,cancel,isActive:active,getStatus:()=>({stage,message})};
}
