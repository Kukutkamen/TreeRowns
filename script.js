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
    }

    saveSettings() {
        const newSettings = {
            theme: document.getElementById('theme-select').value,
            crystalStyle: document.getElementById('crystal-style').value,
            sound: document.getElementById('sound-toggle').checked,
            difficulty: document.getElementById('difficulty').value
        };

        this.config.settings = newSettings;
        this.config.saveSettings();

        // Перезагружаем игру с новыми настройками
        this.moves = this.config.getDifficultySettings().moves;
        this.renderBoard();
        this.updateUI();

        alert('Настройки сохранены!');
    }

    // Остальные методы класса остаются аналогичными, но с использованием configManager
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
                
                // Используем configManager для отображения кристаллов
                cell.innerHTML = this.config.getCrystalDisplay(this.board[i][j]);
                
                boardElement.appendChild(cell);
            }
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

    // ... остальные методы аналогичны вашему коду, но используют конфигурацию
}

// Инициализация игры
document.addEventListener('DOMContentLoaded', () => {
    new Match3Game();
});
