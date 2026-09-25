(function () {
  var dataEl = document.getElementById("practice-data");
  if (!dataEl) return;
  var DATA = JSON.parse(dataEl.textContent);

  function normalize(text) {
    return String(text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function fmt(seconds) {
    return String(Math.floor(seconds / 60)).padStart(2, "0") + ":" + String(seconds % 60).padStart(2, "0");
  }

  function hits(text, terms) {
    return (terms || []).filter(function (term) { return text.indexOf(normalize(term)) !== -1; });
  }

  function scoreAnswer(answer, question, role) {
    var text = normalize(answer);
    var words = text.split(/\s+/).filter(Boolean);
    var termHits = hits(text, question.terms);
    var jdHits = hits(text, role.jdSignals);
    var proofHits = hits(text, role.proofSignals);
    var structureSignals = hits(text, ["first", "because", "example", "result", "metric", "donc", "parce", "exemple", "resultat", "kpi", "90"]);
    var lengthScore = words.length >= 85 ? 20 : words.length >= 55 ? 16 : words.length >= 30 ? 10 : 4;
    var jdScore = Math.min(25, (termHits.length * 5) + (jdHits.length * 3));
    var proofScore = Math.min(30, proofHits.length * 6);
    var structureScore = Math.min(15, structureSignals.length * 4);
    var conciseScore = words.length <= 210 ? 10 : words.length <= 280 ? 6 : 3;
    return {
      total: Math.min(100, lengthScore + jdScore + proofScore + structureScore + conciseScore),
      words: words.length,
      jdScore: jdScore,
      proofScore: proofScore,
      structureScore: structureScore,
      conciseScore: conciseScore,
      termHits: termHits,
      jdHits: jdHits,
      proofHits: proofHits,
      missing: (question.terms || []).filter(function (term) { return termHits.indexOf(term) === -1; })
    };
  }

  function frenchAnalysis(answer, words) {
    var text = normalize(answer);
    var fillerTerms = ["euh", "um", "like", "basically", "actually", "genre", "tu sais", "je pense que je", "un peu"];
    var fillerHits = fillerTerms.filter(function (term) { return text.indexOf(normalize(term)) !== -1; });
    var sentences = (answer.match(/[^.!?;:]+[.!?;:]?/g) || [answer]).map(function (s) { return s.trim(); }).filter(Boolean);
    var longSentences = sentences.filter(function (sentence) { return sentence.split(/\s+/).filter(Boolean).length > 28; }).length;
    var anchors = hits(text, ["je", "vous", "nous", "avec", "pour", "dans", "parce", "donc", "concretement", "exemple", "resultat", "role", "poste"]);
    var score = Math.max(0, Math.min(100, 58 + (anchors.length * 4) - (fillerHits.length * 6) - (longSentences * 8) - (words > 170 ? 8 : 0)));
    var level = score >= 82 ? "B2 solide" : score >= 68 ? "B1+/B2, niveau professionnel de travail" : "B1 à renforcer";
    return {
      score: score,
      level: level,
      fillerCount: fillerHits.length,
      longSentences: longSentences,
      bullets: [
        "Français: " + level + ". Garde des phrases de 12 à 18 mots.",
        fillerHits.length ? "Ramble: coupe les fillers (" + fillerHits.slice(0, 4).join(", ") + ")." : "Fluidité: assez clair. Ajoute une pause après le chiffre.",
        "Verbing: au lieu de « je peux aider », dis « je peux clarifier, prioriser et livrer ».",
        "Partenaires: au lieu de « travailler avec », dis « aligner les partenaires autour d'un KPI ».",
        "Growth: au lieu de « faire de la croissance », dis « qualifier le pipeline, connecter les bons partenaires, accélérer la conversion ».",
        "Phrase modèle: « Je clarifie le problème, je priorise les actions, puis je livre un résultat mesurable. »"
      ]
    };
  }

  function feedback(lang, result, question, role, answer) {
    var band = result.total >= 80 ? (lang === "fr" ? "Fort" : "Strong") : result.total >= 60 ? (lang === "fr" ? "Solide, à sharper" : "Solid, sharpen it") : (lang === "fr" ? "À reprendre" : "Needs another rep");
    var proof = result.proofHits.length ? result.proofHits.join(", ") : (lang === "fr" ? "aucune preuve claire" : "no clear proof");
    var bullets = lang === "fr" ? [
      "Fit JD: " + result.jdScore + "/25. Signaux: " + result.termHits.concat(result.jdHits).join(", ") + ".",
      "Preuves: " + result.proofScore + "/30. Détecté: " + proof + ".",
      "Structure: " + result.structureScore + "/15. Vise point direct, exemple chiffré, lien rôle.",
      result.missing.length ? "À ajouter: " + result.missing.slice(0, 4).join(", ") + "." : "Mots clés couverts. Rends l'exemple plus spécifique.",
      "Meilleure amélioration: " + question.improve,
      "Écart à gérer: " + role.gap
    ] : [
      "JD fit: " + result.jdScore + "/25. Signals: " + result.termHits.concat(result.jdHits).join(", ") + ".",
      "Proof: " + result.proofScore + "/30. Detected: " + proof + ".",
      "Structure: " + result.structureScore + "/15. Aim for direct point, quantified example, role link.",
      result.missing.length ? "Add next: " + result.missing.slice(0, 4).join(", ") + "." : "Key terms covered. Make the example more specific.",
      "Best upgrade: " + question.improve,
      "Gap to manage: " + role.gap
    ];
    if (lang === "fr") bullets = bullets.concat(frenchAnalysis(answer, result.words).bullets);
    return { summary: band + ": " + result.total + "/100. " + (lang === "fr" ? "Mots: " : "Words: ") + result.words + ".", bullets: bullets };
  }

  function speak(text, lang, onEnd) {
    if (!("speechSynthesis" in window)) {
      if (onEnd) onEnd();
      return;
    }
    try {
      window.speechSynthesis.cancel();
      var utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === "fr" ? "fr-CA" : "en-CA";
      utterance.rate = lang === "fr" ? 0.92 : 0.98;
      if (onEnd) utterance.onend = onEnd;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      if (onEnd) onEnd();
    }
  }

  document.querySelectorAll("[data-practice-root]").forEach(function (root) {
    var lang = root.getAttribute("data-practice-lang") || "en";
    var roleSelect = root.querySelector("[data-practice-role]");
    var durationSelect = root.querySelector("[data-practice-duration]");
    var startBtn = root.querySelector("[data-practice-start]");
    var voiceStart = root.querySelector("[data-voice-start]");
    var voiceRepeat = root.querySelector("[data-voice-repeat]");
    var voiceNext = root.querySelector("[data-voice-next]");
    var voiceStop = root.querySelector("[data-voice-stop]");
    var voiceStatus = root.querySelector("[data-voice-status]");
    var voiceStep = root.querySelector("[data-voice-step]");
    var prevBtn = root.querySelector("[data-practice-prev]");
    var nextBtn = root.querySelector("[data-practice-next]");
    var coachBtn = root.querySelector("[data-practice-coach]");
    var scoreBtn = root.querySelector("[data-practice-score]");
    var agentBtn = root.querySelector("[data-practice-agent]");
    var clearBtn = root.querySelector("[data-practice-clear]");
    var dictateBtn = root.querySelector("[data-practice-dictate]");
    var titleEl = root.querySelector("[data-practice-role-title]");
    var timerEl = root.querySelector("[data-practice-timer]");
    var questionEl = root.querySelector("[data-practice-question]");
    var coachPanel = root.querySelector("[data-practice-coach-panel]");
    var coachText = root.querySelector("[data-practice-coach-text]");
    var jdText = root.querySelector("[data-practice-jd]");
    var proofEl = root.querySelector("[data-practice-proof]");
    var answerEl = root.querySelector("[data-practice-answer]");
    var scoreText = root.querySelector("[data-practice-score-text]");
    var scoreList = root.querySelector("[data-practice-score-list]");
    var agentText = root.querySelector("[data-practice-agent-text]");
    var historySummary = root.querySelector("[data-practice-history-summary]");
    var historyList = root.querySelector("[data-practice-history-list]");
    var historyClear = root.querySelector("[data-practice-history-clear]");
    var idx = 0;
    var remaining = Number(durationSelect.value || 120);
    var interval = null;
    var voiceState = "idle";
    var voiceRecognition = null;

    function roleData() { return DATA[lang][roleSelect.value]; }
    function question() { return roleData().questions[idx]; }
    function answerKey() { return "fitcheck-answer-" + lang + "-" + roleSelect.value + "-" + idx; }
    function historyKey() { return "fitcheck-history-" + lang + "-" + roleSelect.value + "-" + idx; }
    function sessionKey() { return "fitcheck-session-" + lang + "-" + roleSelect.value; }
    function getHistory() {
      try { return JSON.parse(localStorage.getItem(historyKey()) || "[]"); } catch (e) { return []; }
    }
    function setHistory(items) {
      try { localStorage.setItem(historyKey(), JSON.stringify(items.slice(-20))); } catch (e) {}
    }
    function renderHistory() {
      var items = getHistory();
      historyList.innerHTML = "";
      if (!items.length) {
        historySummary.textContent = lang === "fr" ? "Score une réponse pour créer ton historique." : "Score an answer to start your history.";
        return;
      }
      var latest = items[items.length - 1];
      var best = items.reduce(function (top, item) { return item.score > top.score ? item : top; }, items[0]);
      var delta = latest.score - items[0].score;
      historySummary.textContent = (lang === "fr" ? "Dernier: " : "Latest: ") + latest.score + "/100. " + (lang === "fr" ? "Meilleur: " : "Best: ") + best.score + "/100. " + (delta >= 0 ? "+" : "") + delta + (lang === "fr" ? " depuis le début." : " since first try.");
      items.slice(-6).reverse().forEach(function (item) {
        var li = document.createElement("li");
        var fr = lang === "fr" && item.french ? " · FR " + item.french.score + "/100 · " + item.french.level + " · fillers " + item.french.fillerCount : "";
        li.textContent = new Date(item.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " · " + item.score + "/100 · " + item.words + (lang === "fr" ? " mots" : " words") + fr;
        historyList.appendChild(li);
      });
    }
    function record(result, answer) {
      var items = getHistory();
      var french = lang === "fr" ? frenchAnalysis(answer, result.words) : null;
      items.push({ at: Date.now(), score: result.total, words: result.words, french: french ? { score: french.score, level: french.level, fillerCount: french.fillerCount } : null });
      setHistory(items);
      renderHistory();
    }
    function recordSession(result) {
      try {
        var items = JSON.parse(localStorage.getItem(sessionKey()) || "[]");
        items.push({ at: Date.now(), question: idx, score: result.total, words: result.words });
        localStorage.setItem(sessionKey(), JSON.stringify(items.slice(-50)));
      } catch (e) {}
    }
    function setVoiceState(state, message) {
      voiceState = state;
      voiceStep.textContent = state.charAt(0).toUpperCase() + state.slice(1);
      voiceStatus.textContent = message;
    }
    function saveAnswer() {
      try { localStorage.setItem(answerKey(), answerEl.value); } catch (e) {}
    }
    function loadAnswer() {
      try { answerEl.value = localStorage.getItem(answerKey()) || ""; } catch (e) { answerEl.value = ""; }
    }
    function render() {
      var role = roleData();
      var q = question();
      titleEl.textContent = role.title;
      questionEl.textContent = q.q;
      coachText.textContent = q.coach;
      jdText.textContent = q.jd;
      proofEl.innerHTML = "";
      role.proof.forEach(function (item) {
        var li = document.createElement("li");
        li.textContent = item;
        proofEl.appendChild(li);
      });
      timerEl.textContent = fmt(remaining);
      coachPanel.hidden = true;
      renderHistory();
    }
    function resetTimer() {
      clearInterval(interval);
      interval = null;
      remaining = Number(durationSelect.value || 120);
      timerEl.textContent = fmt(remaining);
    }
    function move(delta) {
      saveAnswer();
      idx = (idx + delta + roleData().questions.length) % roleData().questions.length;
      resetTimer();
      render();
      loadAnswer();
    }
    function renderScore(answer, source) {
      var result = scoreAnswer(answer, question(), roleData());
      var note = feedback(lang, result, question(), roleData(), answer);
      record(result, answer);
      if (source === "voice") recordSession(result);
      scoreText.textContent = note.summary;
      scoreList.innerHTML = "";
      note.bullets.forEach(function (item) {
        var li = document.createElement("li");
        li.textContent = item;
        scoreList.appendChild(li);
      });
      return { result: result, note: note };
    }
    function currentPrompt() {
      return (lang === "fr" ? "Question. " : "Question. ") + question().q;
    }
    function stopVoiceRecognition() {
      if (voiceRecognition) {
        try { voiceRecognition.stop(); } catch (e) {}
        voiceRecognition = null;
      }
    }
    function startVoiceListening() {
      var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setVoiceState("listening", lang === "fr" ? "Dictée non supportée ici. Réponds dans la zone de texte, puis clique Score local." : "Speech recognition is not available here. Type the answer, then click Local score.");
        return;
      }
      stopVoiceRecognition();
      answerEl.value = "";
      saveAnswer();
      voiceRecognition = new SpeechRecognition();
      voiceRecognition.lang = lang === "fr" ? "fr-CA" : "en-CA";
      voiceRecognition.continuous = true;
      voiceRecognition.interimResults = true;
      setVoiceState("listening", lang === "fr" ? "Je t'écoute. Réponds comme en entrevue." : "Listening. Answer like you are in the interview.");
      voiceRecognition.onresult = function (event) {
        var text = "";
        for (var i = 0; i < event.results.length; i += 1) text += event.results[i][0].transcript;
        answerEl.value = text;
        saveAnswer();
      };
      voiceRecognition.onend = function () {
        voiceRecognition = null;
        if (!answerEl.value.trim()) {
          setVoiceState("feedback", lang === "fr" ? "Je n'ai pas capté de réponse. Répète la question ou tape ta réponse." : "I did not catch an answer. Repeat the question or type your response.");
          return;
        }
        setVoiceState("scoring", lang === "fr" ? "Je score ta réponse." : "Scoring your answer.");
        var scored = renderScore(answerEl.value, "voice");
        var spoken = lang === "fr"
          ? "Score " + scored.result.total + " sur 100. " + scored.note.bullets.slice(0, 3).join(" ")
          : "Score " + scored.result.total + " out of 100. " + scored.note.bullets.slice(0, 3).join(" ");
        setVoiceState("feedback", lang === "fr" ? "Feedback prêt. Tu peux passer à la question suivante." : "Feedback ready. You can move to the next question.");
        speak(spoken, lang);
      };
      try { voiceRecognition.start(); } catch (e) {
        setVoiceState("feedback", lang === "fr" ? "Le micro n'a pas démarré. Essaie encore ou tape ta réponse." : "The microphone did not start. Try again or type your answer.");
      }
    }
    function askOutLoud() {
      stopVoiceRecognition();
      setVoiceState("asking", lang === "fr" ? "Je pose la question à voix haute." : "Asking the question out loud.");
      speak(currentPrompt(), lang, startVoiceListening);
    }

    startBtn.addEventListener("click", function () {
      resetTimer();
      interval = setInterval(function () {
        remaining -= 1;
        timerEl.textContent = fmt(Math.max(remaining, 0));
        if (remaining <= 0) clearInterval(interval);
      }, 1000);
    });
    prevBtn.addEventListener("click", function () { move(-1); });
    nextBtn.addEventListener("click", function () { move(1); });
    coachBtn.addEventListener("click", function () { coachPanel.hidden = !coachPanel.hidden; });
    roleSelect.addEventListener("change", function () { saveAnswer(); idx = 0; resetTimer(); render(); loadAnswer(); });
    durationSelect.addEventListener("change", resetTimer);
    answerEl.addEventListener("input", saveAnswer);
    clearBtn.addEventListener("click", function () {
      answerEl.value = "";
      saveAnswer();
      scoreText.textContent = lang === "fr" ? "Le feedback apparaîtra ici." : "Feedback will appear here.";
      scoreList.innerHTML = "";
    });
    scoreBtn.addEventListener("click", function () {
      if (!answerEl.value.trim()) {
        scoreText.textContent = lang === "fr" ? "Réponds d'abord, puis score la réponse." : "Answer first, then score the response.";
        return;
      }
      var result = scoreAnswer(answerEl.value, question(), roleData());
      renderScore(answerEl.value, "manual");
    });
    agentBtn.addEventListener("click", function () {
      var answer = answerEl.value.trim();
      if (!answer) {
        var empty = lang === "fr" ? "Donne une réponse d'abord." : "Give an answer first.";
        agentText.textContent = empty;
        speak(empty, lang);
        return;
      }
      var q = question();
      var role = roleData();
      record(scoreAnswer(answer, q, role), answer);
      agentText.textContent = lang === "fr" ? "Je réfléchis..." : "Thinking...";
      fetch("/api/interview-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang: lang, roleTitle: role.title, roleProof: role.proof, jd: q.jd, improve: q.improve, answer: answer })
      }).then(function (res) { return res.json(); }).then(function (payload) {
        agentText.textContent = payload.reply;
        speak(payload.reply, lang);
      }).catch(function () {
        var reply = lang === "fr" ? "Garde trois phrases: point direct, preuve chiffrée, lien au rôle." : "Use three beats: direct point, quantified proof, role link.";
        agentText.textContent = reply;
        speak(reply, lang);
      });
    });
    voiceStart.addEventListener("click", function () {
      idx = 0;
      resetTimer();
      render();
      loadAnswer();
      askOutLoud();
    });
    voiceRepeat.addEventListener("click", askOutLoud);
    voiceNext.addEventListener("click", function () {
      stopVoiceRecognition();
      if (idx >= roleData().questions.length - 1) {
        setVoiceState("complete", lang === "fr" ? "Session terminée. Revois ton historique de progrès." : "Session complete. Review your progress history.");
        speak(lang === "fr" ? "Session terminée. Bon travail." : "Session complete. Good work.", lang);
        return;
      }
      move(1);
      askOutLoud();
    });
    voiceStop.addEventListener("click", function () {
      stopVoiceRecognition();
      try { window.speechSynthesis.cancel(); } catch (e) {}
      setVoiceState("idle", lang === "fr" ? "Session arrêtée. Tu peux redémarrer quand tu veux." : "Session stopped. You can restart anytime.");
    });
    historyClear.addEventListener("click", function () { setHistory([]); renderHistory(); });

    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      dictateBtn.disabled = true;
      dictateBtn.textContent = lang === "fr" ? "Dictée non supportée" : "Dictation unavailable";
    } else {
      var recognition = new SpeechRecognition();
      recognition.lang = lang === "fr" ? "fr-CA" : "en-CA";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = function (event) {
        var text = "";
        for (var i = 0; i < event.results.length; i += 1) text += event.results[i][0].transcript;
        answerEl.value = text;
        saveAnswer();
      };
      dictateBtn.addEventListener("click", function () {
        try { recognition.start(); dictateBtn.textContent = lang === "fr" ? "Écoute..." : "Listening..."; }
        catch (e) { recognition.stop(); }
      });
      recognition.onend = function () { dictateBtn.textContent = lang === "fr" ? "Dicter" : "Dictate"; };
    }
    render();
    loadAnswer();
  });
})();
