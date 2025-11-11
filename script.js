class Match3Game {
    constructor() {
        this.config = configManager;
        this.boardSize = this.config.config.boardSize;
        this.cellTypes = this.config.config.cellTypes;
        this.score = 0;
        this.moves = this.config.getDifficultySettings().moves;
        this.selectedCells = [];
        this.board = [];
        this.isSwiping = false;
        this.swipePath = [];

        this.userData = null;
        this.leaderboard = [];
        this.bestScore = 0;
        this.currentGameId = null;

        this.initTelegramWebApp();
    }

    async initTelegramWebApp() {
        if (window.Telegram && Telegram.WebApp) {
            try {
                Telegram.WebApp.ready();
                Telegram.WebApp.expand();

                this.userData = Telegram.WebApp.initDataUnsafe?.user;

                if (this.userData) {
                    console.log('User data:', this.userData);
                    await this.loadUserData();
                }
                this.init();

            } catch (error) {
                console.error('Telegram Web App error:', error);
                this.userData = this.createGuestUser();
                await this.loadUserData();
                this.init();
            }
        } else {
            console.log('Запущено в браузере');
            this.userData = this.createGuestUser();
            await this.loadUserData();
            this.init();
        }

        await this.loadLeaderboard();
        await this.loadCurrentGame();
        this.setupSettingsModal();
        
        // Предзагрузка изображений
        this.config.preloadCrystalImages();
    }

    createGuestUser() {
        return {
            id: 'guest_' + Math.random().toString(36).substr(2, 9),
            first_name: 'Гость',
            last_name: '',
            username: '',
            photo_url: ''
        };
    }

    setupSettingsModal() {
        const settingsBtn = document.getElementById('settings-btn');
        const settingsModal = document.getElementById('settings-modal');
        const closeSettings = document.getElementById('close-settings');
        const saveSettings = document.getElementById('save-settings');

        // Заполняем настройки текущими значениями
        document.getElementById('theme-select').value = this.config.settings.theme;
        document.getElementById('crystal-style').value = this.config.settings.crystalStyle;
        document.getElementById('sound-toggle').checked = this.config.settings.sound;
        document.getElementById('difficulty').value = this.config.settings.difficulty;
        document.getElementById('background-toggle').checked = this.config.settings.useCustomBackground;

        settingsBtn.addEventListener('click', () => {
            settingsModal.style.display = 'flex';
        });

        closeSettings.addEventListener('click', () => {
            settingsModal.style.display = 'none';
        });

        saveSettings.addEventListener('click', () => {
            this.saveSettings();
            settingsModal.style.display = 'none';
        });

        // Закрытие модального окна по клику вне его
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                settingsModal.style.display = 'none';
            }
        });
    }

    saveSettings() {
        const newSettings = {
            theme: document.getElementById('theme-select').value,
            crystalStyle: document.getElementById('crystal-style').value,
            sound: document.getElementById('sound-toggle').checked,
            difficulty: document.getElementById('difficulty').value,
            useCustomBackground: document.getElementById('background-toggle').checked
        };

        this.config.settings = newSettings;
        this.config.saveSettings();

        // Перезагружаем игру с новыми настройками
        this.moves = this.config.getDifficultySettings().moves;
        this.renderBoard();
        this.updateUI();

        // Показываем уведомление
        this.showNotification('Настройки сохранены!');
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 20px;
            border: 2px solid var(--primary-color);
            z-index: 4000;
            animation: fadeInDown 0.5s ease;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 2000);
    }

    async loadUserData() {
        if (!this.userData) return;

        const savedData = localStorage.getItem(`user_${this.userData.id}`);
        if (savedData) {
            const data = JSON.parse(savedData);
            this.bestScore = data.bestScore || 0;
        }
        document.getElementById('best-score').textContent = this.bestScore;
    }

    async loadLeaderboard() {
        const globalLeaderboard = localStorage.getItem('global_leaderboard');

        if (globalLeaderboard) {
            this.leaderboard = JSON.parse(globalLeaderboard);
            console.log('Загружен глобальный лидерборд:', this.leaderboard);
        } else {
            this.leaderboard = [];
            localStorage.setItem('global_leaderboard', JSON.stringify(this.leaderboard));
            console.log('Создан новый пустой лидерборд');
        }

        this.renderLeaderboard();
    }

    async saveScoreToGlobalLeaderboard() {
        if (!this.userData) return;

        console.log('Сохранение счета в лидерборд:', this.score, 'Лучший счет:', this.bestScore);

        if (this.score > this.bestScore) {
            this.bestScore = this.score;

            localStorage.setItem(`user_${this.userData.id}`, JSON.stringify({
                bestScore: this.bestScore
            }));

            await this.updateGlobalLeaderboard();
        }

        document.getElementById('best-score').textContent = this.bestScore;
    }

    async updateGlobalLeaderboard() {
        const globalLeaderboard = localStorage.getItem('global_leaderboard');
        let leaderboard = globalLeaderboard ? JSON.parse(globalLeaderboard) : [];

        const currentUserData = {
            user_id: this.userData.id,
            first_name: this.userData.first_name,
            last_name: this.userData.last_name || '',
            username: this.userData.username || '',
            photo_url: this.userData.photo_url || '',
            best_score: this.bestScore,
            last_played: new Date().toISOString()
        };

        console.log('Обновление лидерборда для пользователя:', currentUserData);

        const existingUserIndex = leaderboard.findIndex(item => item.user_id === this.userData.id);

        if (existingUserIndex !== -1) {
            if (this.bestScore > leaderboard[existingUserIndex].best_score) {
                leaderboard[existingUserIndex] = currentUserData;
                console.log('Обновлена существующая запись');
            }
        } else {
            leaderboard.push(currentUserData);
            console.log('Добавлена новая запись');
        }

        leaderboard.sort((a, b) => b.best_score - a.best_score);
        leaderboard = leaderboard.slice(0, 10);

        localStorage.setItem('global_leaderboard', JSON.stringify(leaderboard));

        this.leaderboard = leaderboard;
        this.renderLeaderboard();

        console.log('Глобальный лидерборд обновлен!', leaderboard);
    }

    renderLeaderboard() {
        const leaderboardList = document.getElementById('leaderboard-list');
        if (!leaderboardList) return;

        leaderboardList.innerHTML = '';

        if (this.leaderboard.length === 0) {
            leaderboardList.innerHTML = '<div class="leaderboard-item">Пока нет рекордов</div>';
            return;
        }

        this.leaderboard.forEach((user, index) => {
            const item = document.createElement('div');
            item.className = `leaderboard-item ${user.user_id === this.userData?.id ? 'current-user' : ''}`;

            const position = document.createElement('div');
            position.className = 'leaderboard-position';
            position.textContent = index + 1;

            const avatar = document.createElement('img');
            avatar.className = 'leaderboard-avatar';
            avatar.src = user.photo_url || `https://via.placeholder.com/24/667eea/ffffff?text=${user.first_name ? user.first_name[0] : '?'}`;
            avatar.alt = 'Avatar';
            avatar.onclick = () => this.showProfileModal(user);

            const info = document.createElement('div');
            info.className = 'leaderboard-info';

            const name = document.createElement('div');
            name.className = 'leaderboard-name';
            name.textContent = user.first_name + (user.last_name ? ' ' + user.last_name : '');

            const score = document.createElement('div');
            score.className = 'leaderboard-score';
            score.textContent = user.best_score;

            info.appendChild(name);
            info.appendChild(score);

            item.appendChild(position);
            item.appendChild(avatar);
            item.appendChild(info);

            leaderboardList.appendChild(item);
        });
    }

    showProfileModal(user) {
        const modal = document.getElementById('profile-modal');
        const content = modal.querySelector('.profile-modal-content');
        
        content.innerHTML = `
            <img src="${user.photo_url || 'https://via.placeholder.com/64/667eea/ffffff?text=' + (user.first_name ? user.first_name[0] : '?')}"
                 alt="Avatar" style="width: 64px; height: 64px; border-radius: 50%; margin-bottom: 10px; border: 2px solid var(--primary-color)">
            <h3>${user.first_name} ${user.last_name || ''}</h3>
            <p>Лучший счет: <strong style="color: gold;">${user.best_score}</strong></p>
            <p style="font-size: 12px; opacity: 0.7;">Игрок #${user.user_id}</p>
            ${user.username ? `<button onclick="window.open('https://t.me/${user.username}', '_blank')" class="btn" style="margin: 5px;">📱 Профиль Telegram</button>` : ''}
            <button id="close-profile-btn" class="btn btn-danger" style="margin-top: 10px;">✖ Закрыть</button>
        `;

        modal.style.display = 'flex';

        document.getElementById('close-profile-btn').onclick = () => {
            modal.style.display = 'none';
        };

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    init() {
        if (this.board.length === 0) {
            this.createBoard();
        }
        this.renderBoard();
        this.setupEventListeners();
        this.updateUI();
    }

    createBoard() {
        this.board = [];
        for (let i = 0; i < this.boardSize; i++) {
            this.board[i] = [];
            for (let j = 0; j < this.boardSize; j++) {
                this.board[i][j] = this.getRandomType();
            }
        }

        while (this.findMatches().length > 0) {
            this.createBoard();
        }

        this.currentGameId = Date.now().toString();
    }

    getRandomType() {
        return Math.floor(Math.random() * this.cellTypes) + 1;
    }

    renderBoard() {
        const boardElement = document.getElementById('game-board');
        boardElement.innerHTML = '';

        for (let i = 0; i < this.boardSize; i++) {
            for (let j = 0; j < this.boardSize; j++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.type = this.board[i][j];
                cell.dataset.row = i;
                cell.dataset.col = j;
                cell.innerHTML = this.config.getCrystalDisplay(this.board[i][j]);
                boardElement.appendChild(cell);
            }
        }
    }

    setupEventListeners() {
        const boardElement = document.getElementById('game-board');
        const restartBtn = document.getElementById('restart-btn');
        const saveBtn = document.getElementById('save-btn');
        const playAgainBtn = document.getElementById('play-again-btn');

        // Touch events
        boardElement.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleTouchStart(e);
        });

        boardElement.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.handleTouchMove(e);
        });

        boardElement.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.handleTouchEnd(e);
        });

        // Mouse events
        boardElement.addEventListener('mousedown', (e) => {
            this.handleMouseDown(e);
        });

        boardElement.addEventListener('mousemove', (e) => {
            this.handleMouseMove(e);
        });

        boardElement.addEventListener('mouseup', (e) => {
            this.handleMouseUp(e);
        });

        boardElement.addEventListener('mouseleave', (e) => {
            this.handleMouseLeave(e);
        });

        restartBtn.addEventListener('click', () => {
            if (confirm('Начать новую игру? Текущий прогресс будет потерян.')) {
                this.restartGame();
            }
        });

        saveBtn.addEventListener('click', () => {
            this.saveCurrentGame();
            this.showNotification('Игра сохранена!');
        });

        playAgainBtn.addEventListener('click', () => {
            document.getElementById('game-over').style.display = 'none';
            this.restartGame();
        });

        // Автосохранение при выходе
        window.addEventListener('beforeunload', () => {
            if (this.moves > 0) {
                this.saveCurrentGame();
            }
        });
    }

    getCellFromEvent(e) {
        let clientX, clientY;

        if (e.type.includes('touch')) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const element = document.elementFromPoint(clientX, clientY);
        if (element && element.classList.contains('cell')) {
            return {
                element: element,
                row: parseInt(element.dataset.row),
                col: parseInt(element.dataset.col),
                type: parseInt(element.dataset.type)
            };
        }
        return null;
    }

    handleTouchStart(e) {
        if (this.moves <= 0) return;

        const cell = this.getCellFromEvent(e);
        if (cell && cell.type !== 0) {
            this.startSwipe(cell);
        }
    }

    handleTouchMove(e) {
        if (!this.isSwiping) return;

        const cell = this.getCellFromEvent(e);
        if (cell) {
            this.continueSwipe(cell);
        }
    }

    handleTouchEnd(e) {
        if (this.isSwiping) {
            this.endSwipe();
        }
    }

    handleMouseDown(e) {
        if (this.moves <= 0) return;

        const cell = this.getCellFromEvent(e);
        if (cell && cell.type !== 0) {
            this.startSwipe(cell);
        }
    }

    handleMouseMove(e) {
        if (!this.isSwiping) return;

        const cell = this.getCellFromEvent(e);
        if (cell) {
            this.continueSwipe(cell);
        }
    }

    handleMouseUp(e) {
        if (this.isSwiping) {
            this.endSwipe();
        }
    }

    handleMouseLeave(e) {
        if (this.isSwiping) {
            this.endSwipe();
        }
    }

    startSwipe(startCell) {
        this.isSwiping = true;
        this.selectedCells = [startCell];
        this.swipePath = [startCell];

        this.highlightCell(startCell, true);
    }

    continueSwipe(currentCell) {
        const lastCell = this.selectedCells[this.selectedCells.length - 1];

        if (this.isNeighbor(lastCell, currentCell) &&
            currentCell.type === this.selectedCells[0].type &&
            !this.isCellSelected(currentCell)) {

            this.selectedCells.push(currentCell);
            this.swipePath.push(currentCell);
            this.highlightCell(currentCell, true);
        }
    }

    async endSwipe() {
        this.isSwiping = false;

        if (this.selectedCells.length >= 3) {
            this.moves--;
            await this.processSwipeMatch();
            this.updateUI();

            if (this.moves > 0) {
                await this.saveCurrentGame();
            }

            if (this.moves <= 0) {
                await this.saveScoreToGlobalLeaderboard();
            }
        }

        this.selectedCells.forEach(cell => {
            this.highlightCell(cell, false);
        });

        this.selectedCells = [];
        this.swipePath = [];
    }

    isNeighbor(cell1, cell2) {
        const rowDiff = Math.abs(cell1.row - cell2.row);
        const colDiff = Math.abs(cell1.col - cell2.col);
        return (rowDiff <= 1 && colDiff <= 1) && !(rowDiff === 0 && colDiff === 0);
    }

    isCellSelected(cell) {
        return this.selectedCells.some(selected =>
            selected.row === cell.row && selected.col === cell.col
        );
    }

    highlightCell(cell, selected) {
        if (cell.element) {
            cell.element.classList.toggle('selected', selected);
        }
    }

    async processSwipeMatch() {
        const positions = this.selectedCells.map(cell => ({
            row: cell.row,
            col: cell.col
        }));

        this.createParticlesForSwipe(this.selectedCells);
        this.showComboText(this.selectedCells.length);

        positions.forEach(pos => {
            this.board[pos.row][pos.col] = 0;
            const cell = document.querySelector(`.cell[data-row="${pos.row}"][data-col="${pos.col}"]`);
            if (cell) {
                cell.classList.add('matched');
            }
        });

        const difficultyMultiplier = this.config.getDifficultySettings().multiplier;
        const bonus = this.selectedCells.length - 2;
        this.score += this.selectedCells.length * 10 * (1 + bonus * 0.5) * difficultyMultiplier;

        await this.delay(400);

        this.applyGravity();
        this.fillEmptyCells();
        this.renderBoard();

        await this.delay(500);

        const newMatches = this.findMatches();
        if (newMatches.length > 0) {
            await this.processMatches(newMatches);
        }
    }

    createParticlesForSwipe(cells) {
        cells.forEach(cell => {
            this.spawnParticles(cell.element);
        });
    }

    spawnParticles(cellElement) {
        const rect = cellElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        for (let i = 0; i < 12; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';

            const type = cellElement.dataset.type;
            const colors = ['', '#ff00ff', '#00ffff', '#ffff00', '#00ff00', '#ff0000'];
            particle.style.background = colors[type];

            const angle = (i / 12) * Math.PI * 2;
            const distance = 60 + Math.random() * 80;
            const particleX = Math.cos(angle) * distance;
            const particleY = Math.sin(angle) * distance;

            particle.style.setProperty('--particle-x', `${particleX}px`);
            particle.style.setProperty('--particle-y', `${particleY}px`);

            particle.style.left = `${centerX}px`;
            particle.style.top = `${centerY}px`;

            document.body.appendChild(particle);

            setTimeout(() => {
                if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                }
            }, 1000);
        }
    }

    showComboText(comboCount) {
        const boardElement = document.getElementById('game-board');
        const rect = boardElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const comboText = document.createElement('div');
        comboText.className = 'combo-text';

        let text = 'Хорошо!';
        if (comboCount >= 4) text = 'Отлично!';
        if (comboCount >= 5) text = 'Восхитительно!';
        if (comboCount >= 6) text = 'Невероятно!';

        comboText.textContent = text + ' x' + comboCount;
        comboText.style.left = `${centerX}px`;
        comboText.style.top = `${centerY}px`;

        document.body.appendChild(comboText);

        setTimeout(() => {
            if (comboText.parentNode) {
                comboText.parentNode.removeChild(comboText);
            }
        }, 1500);
    }

    findMatches() {
        const matches = [];

        for (let i = 0; i < this.boardSize; i++) {
            for (let j = 0; j < this.boardSize - 2; j++) {
                if (this.board[i][j] !== 0 &&
                    this.board[i][j] === this.board[i][j + 1] &&
                    this.board[i][j] === this.board[i][j + 2]) {
                    matches.push({ row: i, col: j, direction: 'horizontal', length: 3 });
                }
            }
        }

        for (let i = 0; i < this.boardSize - 2; i++) {
            for (let j = 0; j < this.boardSize; j++) {
                if (this.board[i][j] !== 0 &&
                    this.board[i][j] === this.board[i + 1][j] &&
                    this.board[i][j] === this.board[i + 2][j]) {
                    matches.push({ row: i, col: j, direction: 'vertical', length: 3 });
                }
            }
        }

        return matches;
    }

    async processMatches(matches) {
        this.createParticlesForMatches(matches);

        matches.forEach(match => {
            if (match.direction === 'horizontal') {
                for (let k = 0; k < match.length; k++) {
                    const cell = document.querySelector(`.cell[data-row="${match.row}"][data-col="${match.col + k}"]`);
                    if (cell) {
                        cell.classList.add('matched');
                    }
                    this.board[match.row][match.col + k] = 0;
                }
            } else {
                for (let k = 0; k < match.length; k++) {
                    const cell = document.querySelector(`.cell[data-row="${match.row + k}"][data-col="${match.col}"]`);
                    if (cell) {
                        cell.classList.add('matched');
                    }
                    this.board[match.row + k][match.col] = 0;
                }
            }
        });

        await this.delay(400);

        this.applyGravity();
        this.fillEmptyCells();
        this.renderBoard();

        await this.delay(500);

        const newMatches = this.findMatches();
        if (newMatches.length > 0) {
            await this.processMatches(newMatches);
        }
    }

    createParticlesForMatches(matches) {
        matches.forEach(match => {
            const positions = [];

            if (match.direction === 'horizontal') {
                for (let k = 0; k < match.length; k++) {
                    positions.push({ row: match.row, col: match.col + k });
                }
            } else {
                for (let k = 0; k < match.length; k++) {
                    positions.push({ row: match.row + k, col: match.col });
                }
            }

            positions.forEach(pos => {
                const cell = document.querySelector(`.cell[data-row="${pos.row}"][data-col="${pos.col}"]`);
                if (cell) {
                    this.spawnParticles(cell);
                }
            });
        });
    }

    applyGravity() {
        for (let j = 0; j < this.boardSize; j++) {
            for (let i = this.boardSize - 1; i >= 0; i--) {
                if (this.board[i][j] === 0) {
                    for (let k = i - 1; k >= 0; k--) {
                        if (this.board[k][j] !== 0) {
                            this.board[i][j] = this.board[k][j];
                            this.board[k][j] = 0;
                            break;
                        }
                    }
                }
            }
        }
    }

    fillEmptyCells() {
        for (let i = 0; i < this.boardSize; i++) {
            for (let j = 0; j < this.boardSize; j++) {
                if (this.board[i][j] === 0) {
                    this.board[i][j] = this.getRandomType();
                }
            }
        }
    }

    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('moves').textContent = this.moves;

        if (this.moves <= 0) {
            setTimeout(() => {
                document.getElementById('final-score').textContent = this.score;
                document.getElementById('game-over').style.display = 'flex';

                this.saveScoreToGlobalLeaderboard();
            }, 1000);
        }
    }

    async loadCurrentGame() {
        if (!this.userData) return;

        const savedGame = localStorage.getItem(`current_game_${this.userData.id}`);
        if (savedGame) {
            const gameData = JSON.parse(savedGame);
            this.score = gameData.score || 0;
            this.moves = gameData.moves || 15;
            this.board = gameData.board || [];
            this.currentGameId = gameData.gameId;

            console.log('Загружена сохраненная игра:', gameData);

            if (this.board.length > 0) {
                document.getElementById('score').textContent = this.score;
                document.getElementById('moves').textContent = this.moves;
                this.renderBoard();
                return true;
            }
        }
        return false;
    }

    async saveCurrentGame() {
        if (!this.userData) return;

        const gameData = {
            gameId: this.currentGameId || Date.now().toString(),
            score: this.score,
            moves: this.moves,
            board: this.board,
            timestamp: new Date().toISOString()
        };

        localStorage.setItem(`current_game_${this.userData.id}`, JSON.stringify(gameData));
        console.log('Игра сохранена:', gameData);
    }

    restartGame() {
        if (this.userData) {
            localStorage.removeItem(`current_game_${this.userData.id}`);
        }

        this.score = 0;
        this.moves = this.config.getDifficultySettings().moves;
        this.selectedCells = [];
        this.isSwiping = false;
        this.swipePath = [];
        this.createBoard();
        this.renderBoard();
        this.updateUI();
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new Match3Game();
});
