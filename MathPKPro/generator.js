/**
 * Math PK Pro - Question Generation Logic
 */

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function generateQuestion() {
    let a, b, answer, text;
    let cat = gameState.category;
    let isPlus;

    if (cat === 2) {
        isPlus = Math.random() > 0.5;
        cat = isPlus ? 0 : 1;
    } else if (cat === 5) {
        isPlus = Math.random() > 0.5;
        cat = isPlus ? 3 : 4;
    } else {
        isPlus = (cat === 0 || cat === 3);
    }

    switch(cat) {
        case 0:
            answer = Math.floor(Math.random() * 11);
            a = Math.floor(Math.random() * (answer + 1));
            b = answer - a;
            text = `${a} + ${b} = ?`;
            break;
        case 1:
            a = Math.floor(Math.random() * 11);
            b = Math.floor(Math.random() * (a + 1));
            answer = a - b;
            text = `${a} - ${b} = ?`;
            break;
        case 3:
            answer = Math.floor(Math.random() * 8) + 11;
            let maxAForPlus = Math.min(9, answer - 2); 
            let minAForPlus = Math.max(2, answer - 9);
            a = Math.floor(Math.random() * (maxAForPlus - minAForPlus + 1)) + minAForPlus;
            b = answer - a;
            text = `${a} + ${b} = ?`;
            break;
        case 4:
            a = Math.floor(Math.random() * 8) + 11;
            let maxBForMinus = Math.min(9, a - 2);
            let minBForMinus = Math.max(2, a - 9);
            if (minBForMinus > maxBForMinus) {
                b = Math.floor(Math.random() * 8) + 2;
                a = b + Math.floor(Math.random() * 8) + 2; 
            } else {
                b = Math.floor(Math.random() * (maxBForMinus - minBForMinus + 1)) + minBForMinus;
            }
            answer = a - b;
            text = `${a} - ${b} = ?`;
            break;
        case 6:
            a = Math.floor(Math.random() * 10) + 1;
            b = Math.floor(Math.random() * 10) + 1;
            answer = a * b;
            text = `${a} x ${b} = ?`;
            break;
        case 7:
            a = Math.floor(Math.random() * 21);
            let op1 = Math.random() > 0.5 ? '+' : '-';
            let possB = [];
            for(let i=0; i<=20; i++) {
                let r = (op1 === '+') ? (a + i) : (a - i);
                if(r >= 0 && r <= 20) possB.push(i);
            }
            b = possB[Math.floor(Math.random() * possB.length)];
            let r1 = (op1 === '+') ? (a + b) : (a - b);
            let op2 = Math.random() > 0.5 ? '+' : '-';
            let possC = [];
            for(let i=0; i<=20; i++) {
                let r = (op2 === '+') ? (r1 + i) : (r1 - i);
                if(r >= 0 && r <= 20) possC.push(i);
            }
            let c = possC[Math.floor(Math.random() * possC.length)];
            answer = (op2 === '+') ? (r1 + c) : (r1 - c);
            text = `${a} ${op1} ${b} ${op2} ${c} = ?`;
            break;
        case 8:
            b = Math.floor(Math.random() * 10) + 1;
            if (b === 0) b = 1;
            answer = Math.floor(Math.random() * 10) + 1;
            a = b * answer;
            text = `${a} ÷ ${b} = ?`;
            break;
    }
    return { text, answer, catType: cat };
}

function generateSharedQuestion() {
    if(gameState.ended) return;
    if(gameState.gameGlobalQuestionIndex >= appData.settings.questionCount) {
        ['p1', 'p2'].forEach(p => {
            gameState[p].finished = true;
            document.getElementById(`${p}QuestionText`).innerText = "完成！等待結算...";
            document.getElementById(`${p}Options`).innerHTML = '';
        });
        checkGlobalGameOver();
        return;
    }

    gameState.p1.currentWrongAttempts = 0;
    gameState.p2.currentWrongAttempts = 0;
    let qBase = generateQuestion();
    
    let options = [qBase.answer];
    let maxLimit = 10, minLimit = 0;
    if (qBase.catType === 0 || qBase.catType === 1) { maxLimit = 10; minLimit = 0; }
    else if (qBase.catType === 3) { maxLimit = 18; minLimit = 11; }
    else if (qBase.catType === 4) { maxLimit = 9; minLimit = 2; }
    else if (qBase.catType === 6) { maxLimit = 100; minLimit = 1; }
    else if (qBase.catType === 7) { maxLimit = 20; minLimit = 0; }
    else if (qBase.catType === 8) { maxLimit = 10; minLimit = 1; }

    while(options.length < appData.settings.answerCount) {
        let wrg = Math.floor(Math.random() * (maxLimit - minLimit + 1)) + minLimit;
        if(wrg !== qBase.answer && !options.includes(wrg)) options.push(wrg);
        if(options.length >= (maxLimit - minLimit + 1)) break; 
    }
    while(options.length < appData.settings.answerCount) {
        let randExt = Math.floor(Math.random() * 100); 
        if(!options.includes(randExt)) options.push(randExt);
    }
    shuffleArray(options);
    
    gameState.p1.currentQuestion = { text: qBase.text, answer: qBase.answer };
    gameState.p2.currentQuestion = { text: qBase.text, answer: qBase.answer };
    
    ['p1', 'p2'].forEach(player => {
        startQuestionTimer(player);
        document.getElementById(`${player}QuestionText`).innerText = qBase.text;
        let optsContainer = document.getElementById(`${player}Options`);
        optsContainer.innerHTML = '';
        options.forEach(opt => {
            let btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.innerTextOrigin = opt;
            if (appData.settings.moleInterval > 0) {
                btn.classList.add('mole-hidden');
            } else {
                btn.innerText = opt;
            }
            btn.onpointerdown = (e) => {
                e.preventDefault();
                if (btn.classList.contains('mole-hidden')) return;
                handleAnswer(player, opt, e.target);
            };
            optsContainer.appendChild(btn);
        });
        if (appData.settings.moleInterval > 0) startMoleCycle(player);
    });
}

function generateNextQuestion(player) {
    if(gameState.ended) return;
    let state = gameState[player];
    if(state.questionsDone >= appData.settings.questionCount) {
        state.finished = true;
        document.getElementById(`${player}QuestionText`).innerText = "完成！等待結算...";
        document.getElementById(`${player}Options`).innerHTML = '';
        checkGlobalGameOver();
        return;
    }

    state.currentWrongAttempts = 0;
    let qBase = generateQuestion();
    let options = [qBase.answer];
    let maxLimit = 10, minLimit = 0;
    if (qBase.catType === 0 || qBase.catType === 1) { maxLimit = 10; minLimit = 0; }
    else if (qBase.catType === 3) { maxLimit = 18; minLimit = 11; }
    else if (qBase.catType === 4) { maxLimit = 9; minLimit = 2; }
    else if (qBase.catType === 6) { maxLimit = 100; minLimit = 1; }
    else if (qBase.catType === 7) { maxLimit = 20; minLimit = 0; }
    else if (qBase.catType === 8) { maxLimit = 10; minLimit = 1; }

    while(options.length < appData.settings.answerCount) {
        let wrg = Math.floor(Math.random() * (maxLimit - minLimit + 1)) + minLimit;
        if(wrg !== qBase.answer && !options.includes(wrg)) options.push(wrg);
        if(options.length >= (maxLimit - minLimit + 1)) break; 
    }
    while(options.length < appData.settings.answerCount) {
        let randExt = Math.floor(Math.random() * 100); 
        if(!options.includes(randExt)) options.push(randExt);
    }
    shuffleArray(options);
    
    state.currentQuestion = { text: qBase.text, answer: qBase.answer };
    document.getElementById(`${player}QuestionText`).innerText = qBase.text;
    startQuestionTimer(player);
    
    let optsContainer = document.getElementById(`${player}Options`);
    optsContainer.innerHTML = '';
    options.forEach(opt => {
        let btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerTextOrigin = opt;
        if (appData.settings.moleInterval > 0) btn.classList.add('mole-hidden');
        else btn.innerText = opt;
        btn.onpointerdown = (e) => {
            e.preventDefault();
            if (btn.classList.contains('mole-hidden')) return;
            handleAnswer(player, opt, e.target);
        };
        optsContainer.appendChild(btn);
    });
    if (appData.settings.moleInterval > 0) startMoleCycle(player);
}
