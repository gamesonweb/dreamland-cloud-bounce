/**
 * 武器选择界面
 * 管理玩家的武器选择和切换
 */
class WeaponUI {
    constructor(scene, game) {
        this.scene = scene;
        this.game = game;
        this.advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("weaponUI");
        
        // 当前选择的武器
        this.currentWeapon = "bow"; // 默认为弓箭
        
        // 武器配置
        this.weapons = {
            sword: {
                name: "剑",
                icon: "textures/sword-icon.png",
                damage: 50,
                range: 2,
                attackSpeed: 1
            },
            bow: {
                name: "弓箭",
                icon: "textures/bow-icon.png",
                damage: 25,
                range: 20,
                attackSpeed: 0.8
            }
        };

        // 存储武器类型数组，用于循环切换
        this.weaponTypes = Object.keys(this.weapons);

        // 添加语言配置
        this.languages = {
            fr: {
                sword: "Épée",
                bow: "Arc",
                damage: "Dégâts",
                range: "Portée",
                attackSpeed: "Vitesse d'attaque"
            },
            en: {
                sword: "Sword",
                bow: "Bow",
                damage: "Damage",
                range: "Range",
                attackSpeed: "Attack Speed"
            }
        };

        // 从游戏设置中获取初始语言
        this.currentLanguage = window.gameSettings?.language || 'fr';

        // 添加语言变更监听器
        this.setupLanguageListener();

        this.createWeaponUI();
    }

    setupLanguageListener() {
        // 监听语言变化
        window.addEventListener('languageChanged', (event) => {
            const newLanguage = event.detail.language;
            if (newLanguage !== this.currentLanguage) {
                this.currentLanguage = newLanguage;
                this.updateAllText();
            }
        });
    }

    updateAllText() {
        const panel = this.advancedTexture.getControlByName("weaponPanel");
        if (!panel) return;

        panel.children.forEach((buttonContainer, index) => {
            if (!buttonContainer || !buttonContainer.children) return;

            const weaponType = this.weaponTypes[index];
            if (!weaponType) return;

            const weapon = this.weapons[weaponType];
            if (!weapon) return;

            // 更新武器名称
            weapon.name = this.languages[this.currentLanguage][weaponType];

            // 查找并更新提示文本
            const tooltips = this.advancedTexture.getControlsByType("Rectangle")
                .filter(control => control.name === "tooltip");
            
            tooltips.forEach(tooltip => {
                if (tooltip && tooltip.children && tooltip.children[0]) {
                    const tooltipText = tooltip.children[0];
                    tooltipText.text = 
                        `${this.languages[this.currentLanguage][weaponType]}\n` +
                        `${this.languages[this.currentLanguage].damage}: ${weapon.damage}\n` +
                        `${this.languages[this.currentLanguage].range}: ${weapon.range}\n` +
                        `${this.languages[this.currentLanguage].attackSpeed}: ${weapon.attackSpeed}`;
                }
            });
        });
    }

    createWeaponUI() {
        // 创建武器选择面板
        const panel = new BABYLON.GUI.StackPanel();
        panel.name = "weaponPanel";  // 添加名称以便后续查找
        panel.width = "100px";
        panel.height = "200px";
        panel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        panel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
        panel.left = "20px";
        this.advancedTexture.addControl(panel);

        // 创建武器按钮
        Object.keys(this.weapons).forEach((weaponType, index) => {
            const weapon = this.weapons[weaponType];
            
            // 创建按钮容器
            const buttonContainer = new BABYLON.GUI.Rectangle();
            buttonContainer.width = "80px";
            buttonContainer.height = "80px";
            buttonContainer.thickness = 2;
            buttonContainer.cornerRadius = 10;
            buttonContainer.color = "white";
            buttonContainer.background = "rgba(0, 0, 0, 0.5)";
            buttonContainer.paddingBottom = "10px";
            panel.addControl(buttonContainer);

            // 创建武器图标
            const weaponIcon = new BABYLON.GUI.Image("weaponIcon", weapon.icon);
            weaponIcon.width = "60px";
            weaponIcon.height = "60px";
            buttonContainer.addControl(weaponIcon);

            // 添加选中效果
            if (weaponType === this.currentWeapon) {
                buttonContainer.background = "rgba(0, 100, 255, 0.5)";
            }

            // 添加点击事件
            buttonContainer.isPointerBlocker = true;
            buttonContainer.onPointerUpObservable.add(() => {
                this.selectWeapon(weaponType);
                
                // 更新所有按钮的背景
                panel.children.forEach(child => {
                    child.background = "rgba(0, 0, 0, 0.5)";
                });
                buttonContainer.background = "rgba(0, 100, 255, 0.5)";
            });

            // 添加悬停提示
            const tooltip = new BABYLON.GUI.Rectangle("tooltip");
            tooltip.width = "150px";
            tooltip.height = "80px";
            tooltip.cornerRadius = 5;
            tooltip.color = "white";
            tooltip.thickness = 1;
            tooltip.background = "black";
            tooltip.alpha = 0.7;
            tooltip.isVisible = false;
            this.advancedTexture.addControl(tooltip);

            const tooltipText = new BABYLON.GUI.TextBlock();
            tooltipText.text = 
                `${weapon.name}\n` +
                `伤害: ${weapon.damage}\n` +
                `范围: ${weapon.range}\n` +
                `攻速: ${weapon.attackSpeed}`;
            tooltipText.color = "white";
            tooltipText.fontSize = 14;
            tooltip.addControl(tooltipText);

            // 添加悬停事件
            buttonContainer.onPointerEnterObservable.add(() => {
                tooltip.isVisible = true;
                tooltip.linkOffsetX = buttonContainer.centerX + 100;
                tooltip.linkOffsetY = buttonContainer.centerY;
            });
            buttonContainer.onPointerOutObservable.add(() => {
                tooltip.isVisible = false;
            });
        });
    }

    selectWeapon(weaponType) {
        if (this.weapons[weaponType]) {
            this.currentWeapon = weaponType;
            this.game.player.setWeapon(weaponType); // 需要在Player类中实现这个方法
            console.log(`Selected weapon: ${this.weapons[weaponType].name}`);
        }
    }

    getCurrentWeapon() {
        return this.currentWeapon;
    }

    getWeaponConfig(weaponType) {
        return this.weapons[weaponType];
    }

    // 切换到下一个武器
    switchToNextWeapon() {
        const currentIndex = this.weaponTypes.indexOf(this.currentWeapon);
        const nextIndex = (currentIndex + 1) % this.weaponTypes.length;
        this.selectWeapon(this.weaponTypes[nextIndex]);
        this.updateButtonHighlight();
    }

    // 切换到上一个武器
    switchToPreviousWeapon() {
        const currentIndex = this.weaponTypes.indexOf(this.currentWeapon);
        const prevIndex = (currentIndex - 1 + this.weaponTypes.length) % this.weaponTypes.length;
        this.selectWeapon(this.weaponTypes[prevIndex]);
        this.updateButtonHighlight();
    }

    // 更新按钮高亮
    updateButtonHighlight() {
        const panel = this.advancedTexture.getControlByName("weaponPanel");
        if (panel) {
            panel.children.forEach(child => {
                child.background = "rgba(0, 0, 0, 0.5)";
            });
            const currentIndex = this.weaponTypes.indexOf(this.currentWeapon);
            if (panel.children[currentIndex]) {
                panel.children[currentIndex].background = "rgba(0, 100, 255, 0.5)";
            }
        }
    }
}

export default WeaponUI; 