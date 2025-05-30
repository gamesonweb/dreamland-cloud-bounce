/**
 * Fichier principal du jeu Cloud Bounce
 * Gère l'initialisation et la boucle principale du jeu
 * Contrôle les interactions entre les différents composants du jeu
 * 
 * @file game.js
 * @description Classe principale du jeu qui initialise et gère la scène, le joueur, le terrain et les objets du jeu
 */

import Player from './player.js';
import Terrain from './terrain.js';
import GameObjects from './gameObjects.js';
import Enemies from './enemies.js';
import WeaponUI from './weaponUI.js';

class Game {
    constructor() {
        // Initialisation du canvas et du moteur
        this.canvas = document.getElementById("renderCanvas");
        this.engine = new BABYLON.Engine(this.canvas, true, {
            preserveDrawingBuffer: true,
            stencil: true,
            powerPreference: "high-performance",
            antialias: false, // Désactive l'antialiasing pour de meilleures performances
            depth: true,
            alpha: false
        });
        
        // Création de la scène avec optimisations
        this.scene = new BABYLON.Scene(this.engine);
        this.scene.clearColor = new BABYLON.Color4(0.5, 0.8, 0.9, 1);
        
        // Optimisations de performance avancées
        this.scene.skipPointerMovePicking = true;
        this.scene.skipFrustumClipping = true;
        this.scene.autoClear = true;
        this.scene.autoClearDepthAndStencil = true;
        this.scene.blockMaterialDirtyMechanism = true;
        this.scene.useRightHandedSystem = true;
        this.scene.autoClear = true;
        this.scene.autoClearDepthAndStencil = true;
        
        // Optimisation des ombres
        this.scene.shadowsEnabled = false;
        
        // Référence au jeu
        this.scene.game = this;
        
        // Initialisation des composants
        this.initializeComponents();
        
        // Configuration de la scène
        this.setupScene();
        
        // Création de l'UI
        this.createUI();
        
        // Gestion des événements
        this.setupEventListeners();
        
        // Démarrage de la boucle de jeu
        this.startGameLoop();
        
        // Gestion du redimensionnement optimisée
        let resizeTimeout;
        window.addEventListener("resize", () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.engine.resize();
            }, 250);
        });
    }

    initializeComponents() {
        // Création du terrain
        this.terrain = new Terrain(this.scene);
        
        // Création des objets du jeu
        this.gameObjects = new GameObjects(this.scene, this);
        
        // Création du joueur
        this.player = new Player(this.scene, new BABYLON.Vector3(0, 2, 0));
        
        // Initialisation des statistiques du joueur
        this.playerStats = {
            health: 100,
            maxHealth: 100,
            exp: 0,
            level: 1,
            expToNextLevel: 100,
            healthIncreasePerLevel: 20
        };
        
        // Création du système d'ennemis
        this.enemies = new Enemies(this.scene, this);
        
        // Création de l'UI des armes
        this.weaponUI = new WeaponUI(this.scene, this);
        
        // Récupération du gestionnaire d'état du jeu
        this.gameState = window.gameState;
        this.gameState.setScene(this.scene);
        
        // Initialisation du menu pause
        this.pauseMenu = document.getElementById('pauseMenu');
    }

    setupScene() {
        // Configuration de l'éclairage optimisé
        const ambientLight = new BABYLON.HemisphericLight(
            "ambientLight",
            new BABYLON.Vector3(0, 1, 0),
            this.scene
        );
        ambientLight.intensity = 0.7;
        ambientLight.specular = new BABYLON.Color3(0, 0, 0);
        ambientLight.groundColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        ambientLight.diffuse = new BABYLON.Color3(0.7, 0.7, 0.7);

        const directionalLight = new BABYLON.DirectionalLight(
            "directionalLight",
            new BABYLON.Vector3(0, -1, 0),
            this.scene
        );
        directionalLight.intensity = 0.5;
        directionalLight.specular = new BABYLON.Color3(0, 0, 0);
        directionalLight.diffuse = new BABYLON.Color3(0.5, 0.5, 0.5);

        // Configuration du brouillard optimisé
        this.scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
        this.scene.fogColor = new BABYLON.Color3(0.9, 0.9, 0.9);
        this.scene.fogDensity = 0.01;

        // Optimisations supplémentaires
        this.scene.autoClear = true;
        this.scene.autoClearDepthAndStencil = true;
        this.scene.skipPointerMovePicking = true;
        this.scene.skipFrustumClipping = true;
    }

    setupEventListeners() {
        // Gestion de la pause
        window.addEventListener('keydown', (event) => {
            if (event.key.toLowerCase() === 'p') {
                this.togglePause();
            }
        });

        // Gestion des boutons du menu pause
        document.querySelector('.pause-button.resume').addEventListener('click', () => {
            this.togglePause();
        });

        document.querySelector('.pause-button.settings').addEventListener('click', () => {
            this.pauseMenu.classList.remove('active');
            const settingsOverlay = document.querySelector('.settings-overlay');
            const settingsContainer = document.querySelector('.settings-container');
            settingsOverlay.style.display = 'flex';
            setTimeout(() => {
                settingsOverlay.style.opacity = '1';
                settingsContainer.classList.add('active');
            }, 10);
        });

        document.querySelector('.pause-button.quit').addEventListener('click', () => {
            if (confirm('Voulez-vous vraiment quitter le jeu ?')) {
                window.location.reload();
            }
        });
    }

    togglePause() {
        if (!this.gameState.isPaused) {
            this.gameState.pause();
            this.pauseMenu.style.display = 'flex';
            setTimeout(() => {
                this.pauseMenu.classList.add('active');
            }, 10);
            document.exitPointerLock();
        } else {
            this.gameState.resume();
            this.pauseMenu.classList.remove('active');
            setTimeout(() => {
                this.pauseMenu.style.display = 'none';
            }, 300);
            this.canvas.requestPointerLock();
        }
    }

    startGameLoop() {
        let lastTime = performance.now();
        const targetFPS = 60;
        const frameTime = 1000 / targetFPS;
        let accumulator = 0;

        this.engine.runRenderLoop(() => {
            const currentTime = performance.now();
            const deltaTime = currentTime - lastTime;
            lastTime = currentTime;

            // Accumulation du temps pour des mises à jour fixes
            accumulator += deltaTime;

            // Mise à jour à intervalles fixes
            while (accumulator >= frameTime) {
                if (!this.gameState.isPaused) {
                    this.update(frameTime);
                }
                accumulator -= frameTime;
            }

            // Rendu à chaque frame
            this.scene.render();
        });
    }

    update(deltaTime) {
        // Mise à jour du joueur
        this.player.update();

        // Vérification des collisions
        const isOnPlatform = this.gameObjects.checkCollisions(
            this.player.mesh.position,
            this.player.playerVelocity
        );
        this.player.setOnPlatform(isOnPlatform);

        // Mise à jour des objets du jeu
        this.gameObjects.update(this.player.bullets);

        // Mise à jour des ennemis
        this.enemies.update();

        // Vérification de la victoire
        this.checkVictory();
    }

    checkVictory() {
        const finishGate = this.scene.getMeshByName("finishGate");
        if (finishGate) {
            const distance = BABYLON.Vector3.Distance(
                this.player.mesh.position,
                finishGate.position
            );
            
            if (distance < 3) {
                this.showVictory();
            }
        }
    }

    showDamageNumber(damage) {
        const damageText = new BABYLON.GUI.TextBlock();
        damageText.text = `-${damage}`;
        damageText.color = "red";
        damageText.fontSize = 24;
        damageText.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        damageText.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
        damageText.top = "-100px";
        this.advancedTexture.addControl(damageText);

        const animation = new BABYLON.Animation(
            "damageAnim",
            "top",
            60,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );

        animation.setKeys([
            { frame: 0, value: -100 },
            { frame: 60, value: -150 }
        ]);

        damageText.animations = [animation];

        this.scene.beginAnimation(damageText, 0, 60, false, 1, () => {
            setTimeout(() => {
                this.advancedTexture.removeControl(damageText);
            }, 500);
        });
    }

    takeDamage(damage) {
        if (damage <= 0) return;

        const oldHealth = this.playerStats.health;
        this.playerStats.health = Math.max(0, oldHealth - damage);
        
        this.showDamageNumber(damage);
        this.updatePlayerStats();
        
        if (this.playerStats.health <= 0) {
            this.gameOver();
        }
    }

    gainExperience(amount) {
        this.playerStats.exp += amount;
        
        while (this.playerStats.exp >= this.playerStats.expToNextLevel) {
            this.playerStats.level++;
            this.playerStats.exp -= this.playerStats.expToNextLevel;
            this.playerStats.maxHealth += this.playerStats.healthIncreasePerLevel;
            this.playerStats.health = this.playerStats.maxHealth;
            this.playerStats.expToNextLevel = Math.floor(this.playerStats.expToNextLevel * 1.2);
            
            this.showLevelUpEffect();
            this.updateHealthBar();
        }
        
        this.updateExpBar();
        this.showExpGain(amount);
    }

    gameOver() {
        const gameOverText = new BABYLON.GUI.TextBlock();
        gameOverText.text = "GAME OVER";
        gameOverText.color = "red";
        gameOverText.fontSize = 72;
        gameOverText.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        gameOverText.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
        this.advancedTexture.addControl(gameOverText);
        
        const restartButton = BABYLON.GUI.Button.CreateSimpleButton("restart", "Restart");
        restartButton.width = "150px";
        restartButton.height = "40px";
        restartButton.color = "white";
        restartButton.cornerRadius = 20;
        restartButton.background = "green";
        restartButton.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
        restartButton.top = "50px";
        this.advancedTexture.addControl(restartButton);
        
        restartButton.onPointerClickObservable.add(() => {
            window.location.reload();
        });
    }

    showVictory() {
        const victoryText = new BABYLON.GUI.TextBlock();
        victoryText.text = "Victory!";
        victoryText.color = "gold";
        victoryText.fontSize = 72;
        victoryText.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        victoryText.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
        this.advancedTexture.addControl(victoryText);
        
        const restartButton = BABYLON.GUI.Button.CreateSimpleButton("restart", "Play Again");
        restartButton.width = "150px";
        restartButton.height = "40px";
        restartButton.color = "white";
        restartButton.cornerRadius = 20;
        restartButton.background = "green";
        restartButton.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
        restartButton.top = "50px";
        this.advancedTexture.addControl(restartButton);
        
        restartButton.onPointerClickObservable.add(() => {
            window.location.reload();
        });
    }

    createUI() {
        // 创建状态UI
        this.advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
        
        // 血量条容器
        const healthContainer = new BABYLON.GUI.Rectangle("healthContainer");
        healthContainer.width = "220px";
        healthContainer.height = "30px";
        healthContainer.cornerRadius = 10;
        healthContainer.color = "white";
        healthContainer.thickness = 2;
        healthContainer.background = "#300000";
        healthContainer.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        healthContainer.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        healthContainer.left = "20px";
        healthContainer.top = "20px";
        this.advancedTexture.addControl(healthContainer);
        
        // 血量条
        this.healthBar = new BABYLON.GUI.Rectangle("healthBar");
        this.healthBar.width = "200px";
        this.healthBar.height = "20px";
        this.healthBar.cornerRadius = 10;
        this.healthBar.color = "transparent";
        this.healthBar.background = "red";
        this.healthBar.left = "-8px";
        healthContainer.addControl(this.healthBar);
        
        // 血量文本
        this.healthText = new BABYLON.GUI.TextBlock("healthText");
        this.healthText.text = "HP: 100/100";
        this.healthText.color = "white";
        this.healthText.fontSize = 16;
        this.healthText.left = "5px";
        healthContainer.addControl(this.healthText);
        
        // 经验条容器
        const expContainer = new BABYLON.GUI.Rectangle("expContainer");
        expContainer.width = "220px";
        expContainer.height = "30px";
        expContainer.cornerRadius = 10;
        expContainer.color = "white";
        expContainer.thickness = 2;
        expContainer.background = "#000030";
        expContainer.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        expContainer.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        expContainer.left = "20px";
        expContainer.top = "60px";
        this.advancedTexture.addControl(expContainer);
        
        // 经验条
        this.expBar = new BABYLON.GUI.Rectangle("expBar");
        this.expBar.width = "200px";
        this.expBar.height = "20px";
        this.expBar.cornerRadius = 10;
        this.expBar.color = "transparent";
        this.expBar.background = "blue";
        this.expBar.left = "-8px";
        expContainer.addControl(this.expBar);
        
        // 经验文本
        this.expText = new BABYLON.GUI.TextBlock("expText");
        this.expText.text = "EXP: 0/100";
        this.expText.color = "white";
        this.expText.fontSize = 16;
        this.expText.left = "5px";
        expContainer.addControl(this.expText);
        
        // 等级文本
        this.levelText = new BABYLON.GUI.TextBlock("levelText");
        this.levelText.text = "Level 1";
        this.levelText.color = "white";
        this.levelText.fontSize = 24;
        this.levelText.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        this.levelText.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        this.levelText.left = "250px";
        this.levelText.top = "20px";
        this.advancedTexture.addControl(this.levelText);
    }
    
    updatePlayerStats() {
        // 确保血量在有效范围内
        this.playerStats.health = Math.max(0, Math.min(this.playerStats.health, this.playerStats.maxHealth));
        
        // 更新UI显示
        const healthPercent = (this.playerStats.health / this.playerStats.maxHealth * 100).toFixed(1);
        this.healthBar.width = `${healthPercent}%`;
        this.healthText.text = `HP: ${Math.floor(this.playerStats.health)}/${this.playerStats.maxHealth}`;
        
        // 计算新的宽度
        const newExpWidth = (this.playerStats.exp / this.playerStats.expToNextLevel * 200);
        
        // 创建动画
        BABYLON.Animation.CreateAndStartAnimation("healthAnim", this.healthBar, "width", 30, 10, 
            parseFloat(this.healthBar.width), healthPercent + "%", 0);
        BABYLON.Animation.CreateAndStartAnimation("expAnim", this.expBar, "width", 30, 10, 
            parseFloat(this.expBar.width), newExpWidth + "px", 0);
        
        // 检查升级
        if (this.playerStats.exp >= this.playerStats.expToNextLevel) {
            this.levelUp();
        }
    }
    
    levelUp() {
        this.playerStats.level++;
        this.playerStats.exp -= this.playerStats.expToNextLevel;
        this.playerStats.expToNextLevel = Math.floor(this.playerStats.expToNextLevel * 1.5);
        this.playerStats.maxHealth += 20;
        this.playerStats.health = this.playerStats.maxHealth;
        
        // 显示升级效果
        const levelUpText = new BABYLON.GUI.TextBlock("levelUpText");
        levelUpText.text = "LEVEL UP!";
        levelUpText.color = "yellow";
        levelUpText.fontSize = 36;
        levelUpText.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        levelUpText.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
        this.advancedTexture.addControl(levelUpText);
        
        setTimeout(() => {
            this.advancedTexture.removeControl(levelUpText);
        }, 2000);
    }
    
    // 显示经验获得数字
    showExpGain(exp) {
        const expText = new BABYLON.GUI.TextBlock();
        expText.text = `+${exp} EXP`;
        expText.color = "yellow";
        expText.fontSize = 20;
        expText.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        expText.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
        this.advancedTexture.addControl(expText);

        // 创建上升和淡出动画
        let startPos = 0;
        let animation = new BABYLON.Animation(
            "expAnim",
            "top",
            30,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );

        let keys = [];
        keys.push({ frame: 0, value: startPos });
        keys.push({ frame: 30, value: startPos - 50 });
        animation.setKeys(keys);

        expText.animations = [];
        expText.animations.push(animation);

        this.scene.beginAnimation(expText, 0, 30, false, 1, () => {
            this.advancedTexture.removeControl(expText);
        });
    }
    
    updateExpBar() {
        if (this.expBar) {
            const expPercentage = (this.playerStats.exp / this.playerStats.expToNextLevel) * 100;
            this.expBar.width = expPercentage + "%";
        }
    }

    showLevelUpEffect() {
        // 创建升级文本
        const levelUpText = new BABYLON.GUI.TextBlock();
        levelUpText.text = `Level Up!\nLevel ${this.playerStats.level}\nMax Health +${this.playerStats.healthIncreasePerLevel}`;
        levelUpText.color = "gold";
        levelUpText.fontSize = 36;
        levelUpText.outlineWidth = 2;
        levelUpText.outlineColor = "black";
        levelUpText.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        levelUpText.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
        this.advancedTexture.addControl(levelUpText);

        // 添加动画效果
        levelUpText.scaleX = 0;
        levelUpText.scaleY = 0;

        const animation = new BABYLON.Animation(
            "levelUpAnim",
            "scaleX",
            60,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );

        const keys = [];
        keys.push({ frame: 0, value: 0 });
        keys.push({ frame: 30, value: 1.2 });
        keys.push({ frame: 45, value: 1 });
        animation.setKeys(keys);

        levelUpText.animations = [];
        levelUpText.animations.push(animation);

        // 开始动画并在结束后移除文本
        this.scene.beginAnimation(levelUpText, 0, 45, false, 1, () => {
            setTimeout(() => {
                this.advancedTexture.removeControl(levelUpText);
            }, 1000);
        });
    }
    
    updateLevelDisplay() {
        if (this.levelDisplay) {
            this.levelDisplay.textContent = `Level: ${this.level}`;
            
            // 添加动画效果
            this.levelDisplay.style.transform = 'scale(1.2)';
            this.levelDisplay.style.transition = 'transform 0.2s';
            
            setTimeout(() => {
                this.levelDisplay.style.transform = 'scale(1)';
            }, 200);
        }
    }

    updateHealthBar() {
        if (this.healthBar) {
            const healthPercent = (this.playerStats.health / this.playerStats.maxHealth) * 100;
            this.healthBar.width = healthPercent + "%";
            // 更新血量文本
            if (this.healthText) {
                this.healthText.text = `${Math.ceil(this.playerStats.health)}/${this.playerStats.maxHealth}`;
            }
        }
    }
}

// Création de l'instance du jeu
const game = new Game();

// Export de l'instance pour le débogage
window.game = game; 