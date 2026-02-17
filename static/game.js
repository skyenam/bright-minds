const question = document.getElementById('question');
const choices = Array.from(document.getElementsByClassName('choice-text'));
const progressText = document.getElementById('progressText');
const scoreText = document.getElementById('score');
const progressBarFull = document.getElementById('progressBarFull');
const loader = document.getElementById('loader');
const game = document.getElementById('game');
const lobby = document.getElementById('lobby');
const lobbyRoomCode = document.getElementById('lobbyRoomCode');
const playerList = document.getElementById('playerList');
const startGameBtn = document.getElementById('startGameBtn');
const waitingMessage = document.getElementById('waitingMessage');
const qrcodeContainer = document.getElementById('qrcode');
const endScreen = document.getElementById('endScreen');
const finalScoreText = document.getElementById('finalScoreText');
const finalLeaderboard = document.getElementById('finalLeaderboard');
let currentQuestion = {};
let acceptingAnswers = false;
let score = 0;
let questionCounter = 0;
let availableQuesions = [];

let questions = [];
let socket;

// Check for URL parameters (Multiplayer)
const urlParams = new URLSearchParams(window.location.search);
const rawRoomCode = urlParams.get('room');
const roomCode = rawRoomCode ? rawRoomCode.toUpperCase() : null;
const isHost = urlParams.get('host');

if (roomCode) {
    // --- MULTIPLAYER LOGIC ---
    loader.classList.add('hidden');
    lobby.classList.remove('hidden');
    lobbyRoomCode.innerText = `Room Code: ${roomCode}`;

    socket = io();
    let username = localStorage.getItem('username');
    
    if (isHost) {
        username = "Host";
        startGameBtn.classList.remove('hidden');

        // Generate QR Code
        // The URL should be the current URL without the 'host' parameter
        const url = new URL(window.location.href);
        url.searchParams.delete('host');
        const joinUrl = url.toString();
        
        new QRCode(qrcodeContainer, {
            text: joinUrl,
            width: 256,
            height: 256
        });

        // If Host: Fetch questions and wait for start click
        fetchQuestions().then((loadedQuestions) => {
            questions = loadedQuestions;
            startGameBtn.addEventListener('click', () => {
                socket.emit('start_game', { room: roomCode, questions: questions });
            });
        });
    } else {
        // If Joiner: Always prompt for name
        username = prompt("Enter your name to join:", username || "");
        if (!username) username = "Guest";
        localStorage.setItem('username', username);
        
        waitingMessage.classList.remove('hidden');
    }

    // Listen for player updates
    socket.on('update_player_list', (players) => {
        playerList.innerHTML = players.map(p => `<li>${p}</li>`).join('');
    });

    // Listen for game start
    socket.on('start_game', (data) => {
        console.log("Game started! Questions received:", data.questions);
        lobby.classList.add('hidden');
        questions = data.questions;
        startGame();
    });

    // Listen for leaderboard updates
    socket.on('update_leaderboard', (leaderboard) => {
        finalLeaderboard.innerHTML = leaderboard
            .map(p => `<li>${p.username}: ${p.score}</li>`)
            .join('');
    });

    // Join the room
    socket.emit('join', { room: roomCode, username: username || 'Guest' });

} else {
    // --- SINGLE PLAYER LOGIC ---
    fetchQuestions().then((loadedQuestions) => {
        questions = loadedQuestions;
        startGame();
    });
}

// Helper function to fetch and format questions
function fetchQuestions() {
    return fetch(
        'https://opentdb.com/api.php?amount=10&category=9&difficulty=easy&type=multiple'
    )
        .then((res) => {
            return res.json();
        })
        .then((loadedQuestions) => {
            return loadedQuestions.results.map((loadedQuestion) => {
                const formattedQuestion = {
                    question: loadedQuestion.question,
                };

                const answerChoices = [...loadedQuestion.incorrect_answers];
                formattedQuestion.answer = Math.floor(Math.random() * 4) + 1;
                answerChoices.splice(
                    formattedQuestion.answer - 1,
                    0,
                    loadedQuestion.correct_answer
                );

                answerChoices.forEach((choice, index) => {
                    formattedQuestion['choice' + (index + 1)] = choice;
                });

                return formattedQuestion;
            });
        })
        .catch((err) => console.error(err));
}

//CONSTANTS
const CORRECT_BONUS = 10;
const MAX_QUESTIONS = 3;

startGame = () => {
    questionCounter = 0;
    score = 0;
    availableQuesions = [...questions];
    getNewQuestion();
    game.classList.remove('hidden');
    loader.classList.add('hidden');
};

getNewQuestion = () => {
    if (availableQuesions.length === 0 || questionCounter >= MAX_QUESTIONS) {
        localStorage.setItem('mostRecentScore', score);
        
        if (roomCode) {
            game.classList.add('hidden');
            endScreen.classList.remove('hidden');
            finalScoreText.innerText = `Your Score: ${score}`;
            
            socket.emit('submit_score', {
                room: roomCode,
                username: localStorage.getItem('username') || 'Guest',
                score: score
            });
        } else {
            //go to the end page (Single Player)
            return window.location.assign('/end');
        }
        return;
    }
    questionCounter++;
    progressText.innerText = `Question ${questionCounter}/${MAX_QUESTIONS}`;
    //Update the progress bar
    progressBarFull.style.width = `${(questionCounter / MAX_QUESTIONS) * 100}%`;

    const questionIndex = 0;
    currentQuestion = availableQuesions[questionIndex];
    question.innerHTML = currentQuestion.question;

    choices.forEach((choice) => {
        const number = choice.dataset['number'];
        choice.innerHTML = currentQuestion['choice' + number];
    });

    availableQuesions.splice(questionIndex, 1);
    acceptingAnswers = true;
};

choices.forEach((choice) => {
    choice.addEventListener('click', (e) => {
        if (!acceptingAnswers) return;

        acceptingAnswers = false;
        const selectedChoice = e.target;
        const selectedAnswer = selectedChoice.dataset['number'];

        const classToApply =
            selectedAnswer == currentQuestion.answer ? 'correct' : 'incorrect';

        if (classToApply === 'correct') {
            incrementScore(CORRECT_BONUS);
        }

        selectedChoice.parentElement.classList.add(classToApply);

        setTimeout(() => {
            selectedChoice.parentElement.classList.remove(classToApply);
            getNewQuestion();
        }, 1000);
    });
});

incrementScore = (num) => {
    score += num;
    scoreText.innerText = score;
};
