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
        // 创建画布
        this.canvas = document.getElementById("renderCanvas");
        this.engine = new BABYLON.Engine(this.canvas, true);
        this.scene = new BABYLON.Scene(this.engine);
        
        // 在创建其他对象之前保存game引用
        this.scene.game = this;
        
        // 创建地形
        this.terrain = new Terrain(this.scene);
        
        // 创建游戏对象
        this.gameObjects = new GameObjects(this.scene, this);
        
        // 创建玩家
        this.player = new Player(this.scene, new BABYLON.Vector3(0, 2, 0));
        
        // 初始化玩家状态
        this.playerStats = {
            health: 100,
            maxHealth: 100,
            exp: 0,
            level: 1,
            expToNextLevel: 100,  // 升级所需经验
            healthIncreasePerLevel: 20  // 每级增加的血量
        };
        
        // 创建敌人系统
        this.enemies = new Enemies(this.scene, this);
        
        // 创建武器UI
        this.weaponUI = new WeaponUI(this.scene, this);
        
        // 设置场景
        this.setupScene();
        
        // 创建UI
        this.createUI();
        
        // 创建经验条UI
        this.createExpUI();
        
        // 开始渲染循环
        this.engine.runRenderLoop(() => {
            this.player.update();
            this.update();
            this.scene.render();
        });
        
        // 处理窗口大小变化
        window.addEventListener("resize", () => {
            this.engine.resize();
        });
        
        this.experience = 0;
        this.level = 1;
        this.levelDisplay = document.getElementById('levelDisplay');
    }

    setupScene() {
        // 设置环境光
        const ambientLight = new BABYLON.HemisphericLight(
            "ambientLight",
            new BABYLON.Vector3(0, 1, 0),
            this.scene
        );
        ambientLight.intensity = 0.7;

        // 设置平行光（模拟太阳光）
        const directionalLight = new BABYLON.DirectionalLight(
            "directionalLight",
            new BABYLON.Vector3(0, -1, 0),
            this.scene
        );
        directionalLight.intensity = 0.5;

        // 设置雾效果
        this.scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
        this.scene.fogColor = new BABYLON.Color3(0.9, 0.9, 0.9);
        this.scene.fogDensity = 0.01;
    }

    update() {
        // 检查碰撞
        const isOnPlatform = this.gameObjects.checkCollisions(
            this.player.mesh.position,
            this.player.playerVelocity
        );
        
        // 更新玩家平台状态
        this.player.setOnPlatform(isOnPlatform);
        
        // 更新游戏对象，传递子弹信息
        this.gameObjects.update(this.player.bullets);
        
        // 更新敌人（敌人的攻击和碰撞检测现在在enemies.update中处理）
        this.enemies.update();
        
        // 检查子弹碰撞
        this.enemies.checkBulletCollisions(this.player.bullets);
        
        // 检查是否到达终点
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

    // 导入新的地形模型
    async loadNewTerrain(modelUrl) {
        // 清除现有地形
        this.scene.meshes.forEach(mesh => {
            if (mesh !== this.player.mesh && mesh !== this.player.camera) {
                mesh.dispose();
            }
        });

        // 加载新地形
        await this.terrain.importTerrainModel(modelUrl);
        
        // 重新创建游戏对象
        this.gameObjects = new GameObjects(this.scene, this);
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
    
    // 显示伤害数字
    showDamageNumber(damage) {
        const damageText = new BABYLON.GUI.TextBlock();
        damageText.text = `-${damage}`;
        damageText.color = "red";
        damageText.fontSize = 24;
        damageText.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        damageText.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
        damageText.top = "-100px";  // 让数字从头顶上方开始
        this.advancedTexture.addControl(damageText);

        // 创建上升和淡出动画
        const animation = new BABYLON.Animation(
            "damageAnim",
            "top",
            60,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );

        const keys = [];
        keys.push({ frame: 0, value: -100 });
        keys.push({ frame: 60, value: -150 });
        animation.setKeys(keys);

        damageText.animations = [];
        damageText.animations.push(animation);

        // 开始动画并在结束后移除文本
        this.scene.beginAnimation(damageText, 0, 60, false, 1, () => {
            setTimeout(() => {
                this.advancedTexture.removeControl(damageText);
            }, 500);
        });
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
    
    takeDamage(damage) {
        // 确保伤害是正数
        if (damage <= 0) return;

        // 计算新的血量
        const oldHealth = this.playerStats.health;
        this.playerStats.health = Math.max(0, oldHealth - damage);
        
        console.log("Player took damage:", damage, "Health:", this.playerStats.health);
        
        // 显示伤害数字
        this.showDamageNumber(damage);
        
        // 更新UI
        this.updatePlayerStats();
        
        // 检查是否死亡
        if (this.playerStats.health <= 0) {
            this.gameOver();
        }
    }
    
    gainExperience(amount) {
        this.playerStats.exp += amount;
        
        // 检查是否升级
        while (this.playerStats.exp >= this.playerStats.expToNextLevel) {
            // 升级
            this.playerStats.level++;
            this.playerStats.exp -= this.playerStats.expToNextLevel;
            
            // 增加最大血量和恢复满血
            this.playerStats.maxHealth += this.playerStats.healthIncreasePerLevel;
            this.playerStats.health = this.playerStats.maxHealth;
            
            // 增加下一级所需经验
            this.playerStats.expToNextLevel = Math.floor(this.playerStats.expToNextLevel * 1.2);
            
            // 显示升级效果
            this.showLevelUpEffect();
            
            // 更新血条
            this.updateHealthBar();
            
            console.log(`Level up! Now level ${this.playerStats.level}`);
            console.log(`Max Health increased to ${this.playerStats.maxHealth}`);
        }
        
        // 更新经验条
        this.updateExpBar();
        
        // 显示获得经验的飘字效果
        this.showExpGain(amount);
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
    
    gameOver() {
        // 游戏结束逻辑
        const gameOverText = new BABYLON.GUI.TextBlock();
        gameOverText.text = "GAME OVER";
        gameOverText.color = "red";
        gameOverText.fontSize = 72;
        gameOverText.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        gameOverText.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
        this.advancedTexture.addControl(gameOverText);
        
        // 重新开始按钮
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
        // 创建胜利UI
        const victoryText = new BABYLON.GUI.TextBlock();
        victoryText.text = "Victory!";
        victoryText.color = "gold";
        victoryText.fontSize = 72;
        victoryText.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        victoryText.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
        this.advancedTexture.addControl(victoryText);
        
        // 重新开始按钮
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

    createExpUI() {
        // 创建经验条容器
        const expBarContainer = new BABYLON.GUI.Rectangle();
        expBarContainer.width = "300px";
        expBarContainer.height = "20px";
        expBarContainer.cornerRadius = 5;
        expBarContainer.color = "white";
        expBarContainer.thickness = 1;
        expBarContainer.background = "rgba(0, 0, 0, 0.5)";
        expBarContainer.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        expBarContainer.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        expBarContainer.top = "-30px";
        this.advancedTexture.addControl(expBarContainer);

        // 创建经验条
        const expBar = new BABYLON.GUI.Rectangle();
        expBar.width = "0%";
        expBar.height = "100%";
        expBar.cornerRadius = 5;
        expBar.background = "yellow";
        expBar.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        expBarContainer.addControl(expBar);

        // 保存引用
        this.expBar = expBar;
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

// 创建游戏实例
const game = new Game();

// 导出游戏实例，以便在控制台中使用
window.game = game; 