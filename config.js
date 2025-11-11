// Конфигурация игры - легко настраивается!
const GameConfig = {
    // Основные настройки
    boardSize: 8,
    cellTypes: 5,
    initialMoves: 15,
    
    // Настройки тем
    themes: {
        default: {
            name: "Космическая",
            primary: "#ff00ff",
            secondary: "#00ffff",
            background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)"
        },
        forest: {
            name: "Лесная",
            primary: "#00ff00",
            secondary: "#ffff00",
            background: "linear-gradient(135deg, #0c2910 0%, #2b6332 50%, #243e24 100%)"
        },
        ocean: {
            name: "Океан",
            primary: "#00ffff",
            secondary: "#0066ff",
            background: "linear-gradient(135deg, #0c2429 0%, #2b4d63 50%, #24343e 100%)"
        },
        candy: {
            name: "Конфетная",
            primary: "#ff66cc",
            secondary: "#66ffcc",
            background: "linear-gradient(135deg, #290c1f 0%, #632b5d 50%, #3e2438 100%)"
        }
    },
    
    // Стили кристаллов
    crystalStyles: {
        emoji: {
            types: ['', '💎', '🔷', '💠', '🔶', '💖']
        },
        images: {
            types: ['', 'crystal1.png', 'crystal2.png', 'crystal3.png', 'crystal4.png', 'crystal5.png']
        },
        shapes: {
            types: ['', '🔴', '🟢', '🔵', '🟡', '🟣']
        }
    },
    
    // Настройки сложности
    difficulties: {
        easy: { moves: 20, multiplier: 1 },
        normal: { moves: 15, multiplier: 1.5 },
        hard: { moves: 10, multiplier: 2 }
    },
    
    // Пути к ресурсам
    assets: {
        crystals: {
            basePath: 'assets/crystals/',
            types: ['crystal1.png', 'crystal2.png', 'crystal3.png', 'crystal4.png', 'crystal5.png']
        },
        sounds: {
            basePath: 'assets/sounds/',
            match: 'match.mp3',
            win: 'win.mp3',
            move: 'move.mp3'
        },
        ui: {
            basePath: 'assets/ui/',
            button: 'button.png',
            panel: 'panel.png'
        },
        background: 'assets/background.jpg'
    },
    
    // Настройки анимаций
    animations: {
        enable: true,
        duration: 400,
        particleCount: 12
    }
};

// Утилиты для работы с конфигурацией
class ConfigManager {
    constructor() {
        this.config = GameConfig;
        this.loadSettings();
    }
    
    loadSettings() {
        const saved = localStorage.getItem('gameSettings');
        if (saved) {
            this.settings = JSON.parse(saved);
        } else {
            this.settings = {
                theme: 'default',
                crystalStyle: 'emoji',
                sound: true,
                difficulty: 'normal',
                useCustomBackground: false
            };
        }
        this.applySettings();
    }
    
    saveSettings() {
        localStorage.setItem('gameSettings', JSON.stringify(this.settings));
        this.applySettings();
    }
    
    applySettings() {
        // Применяем тему
        document.body.className = `theme-${this.settings.theme}`;
        
        // Обновляем CSS переменные
        const theme = this.config.themes[this.settings.theme];
        document.documentElement.style.setProperty('--primary-color', theme.primary);
        document.documentElement.style.setProperty('--secondary-color', theme.secondary);
        document.documentElement.style.setProperty('--background-gradient', theme.background);
        
        // Применяем кастомный фон
        if (this.settings.useCustomBackground) {
            document.body.classList.add('custom-background');
        } else {
            document.body.classList.remove('custom-background');
        }
    }
    
    getCrystalDisplay(type) {
        if (type === 0) return '';
        
        const style = this.settings.crystalStyle;
        const crystal = this.config.crystalStyles[style].types[type];
        
        if (style === 'images') {
            return `<img src="${this.config.assets.crystals.basePath}${crystal}" alt="Crystal ${type}" onerror="this.parentNode.innerHTML='${this.config.crystalStyles.emoji.types[type]}'">`;
        }
        
        return crystal;
    }
    
    getDifficultySettings() {
        return this.config.difficulties[this.settings.difficulty];
    }
    
    preloadCrystalImages() {
        console.log('Предзагрузка изображений кристаллов...');
        const crystalTypes = this.config.assets.crystals.types;
        
        crystalTypes.forEach((crystal, index) => {
            if (index > 0) { // пропускаем пустой элемент
                const img = new Image();
                img.src = this.config.assets.crystals.basePath + crystal;
                img.onload = () => console.log(`✅ Картинка загружена: ${crystal}`);
                img.onerror = () => {
                    console.error(`❌ Ошибка загрузки: ${crystal}`);
                    // Если картинка не загрузилась, переключаем на эмодзи
                    if (this.settings.crystalStyle === 'images') {
                        this.settings.crystalStyle = 'emoji';
                        this.saveSettings();
                    }
                };
            }
        });
    }
}

// Создаем глобальный экземпляр менеджера конфигурации
const configManager = new ConfigManager();
