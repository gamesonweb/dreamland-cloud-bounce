/**
 * 敌人管理类
 * 负责创建和管理游戏中的敌人
 */
class Enemies {
    constructor(scene, game) {
        this.scene = scene;
        this.game = game;
        this.enemies = [];
        this.enemySpeed = 0.05;
        this.advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("enemyUI");
        this.damageCooldown = 1000; // 伤害冷却时间（毫秒）
        this.attackRange = 1.5;     // 攻击范围
        this.enemyRadius = 0.5;  // 敌人碰撞半径
        this.playerRadius = 0.5; // 玩家碰撞半径
        this.knockbackForce = 0.3; // 击退力度
        this.detectionRange = 15;    // 敌人检测玩家的范围
        this.chaseSpeed = 0.08;      // 追踪速度（比普通移动快）
        this.createEnemies();
    }

    createEnemies() {
        // 创建5个基础敌人
        for (let i = 0; i < 5; i++) {
            this.createBasicEnemy();
        }
    }

    createBasicEnemy() {
        // 创建敌人模型
        const enemy = BABYLON.MeshBuilder.CreateBox("enemy", {
            height: 1,
            width: 1,
            depth: 1
        }, this.scene);

        // 随机位置（确保在地面以上）
        enemy.position = new BABYLON.Vector3(
            (Math.random() - 0.5) * 40,  // x: -20 到 20
            1,                           // y: 在地面上方
            (Math.random() - 0.5) * 40   // z: -20 到 20
        );

        // 设置材质
        const material = new BABYLON.StandardMaterial("enemyMaterial", this.scene);
        material.diffuseColor = new BABYLON.Color3(0.8, 0.2, 0.2); // 红色
        material.emissiveColor = new BABYLON.Color3(0.4, 0.1, 0.1);
        enemy.material = material;

        // 添加敌人属性
        enemy.metadata = {
            type: 'basic',
            health: 100,
            moveDirection: new BABYLON.Vector3(
                Math.random() - 0.5,
                0,
                Math.random() - 0.5
            ).normalize(),
            movementTimer: 0,
            changeDirectionInterval: 100 + Math.random() * 100,
            lastDamageTime: 0 // 上次造成伤害的时间
        };

        // 创建血条容器
        const healthBarContainer = new BABYLON.GUI.Rectangle();
        healthBarContainer.width = "100px";
        healthBarContainer.height = "30px";  // 增加高度以容纳名称标签
        healthBarContainer.cornerRadius = 2;
        healthBarContainer.color = "transparent";
        healthBarContainer.thickness = 0;
        healthBarContainer.background = "transparent";
        healthBarContainer.linkOffsetY = -50;
        healthBarContainer.isVisible = true;
        this.advancedTexture.addControl(healthBarContainer);
        healthBarContainer.linkWithMesh(enemy);

        // 创建名称标签
        const nameLabel = new BABYLON.GUI.TextBlock();
        nameLabel.text = "Slime";
        nameLabel.color = "white";
        nameLabel.fontSize = 12;
        nameLabel.fontFamily = "Microsoft YaHei"; // 使用中文字体
        nameLabel.top = "10px";  // 将名称放在血条上方
        healthBarContainer.addControl(nameLabel);

        // 创建血条背景
        const healthBarBackground = new BABYLON.GUI.Rectangle();
        healthBarBackground.width = "100px";
        healthBarBackground.height = "5px";
        healthBarBackground.cornerRadius = 2;
        healthBarBackground.color = "black";
        healthBarBackground.thickness = 1;
        healthBarBackground.background = "gray";
        healthBarBackground.top = "-5px";  // 将血条放在名称下方
        healthBarContainer.addControl(healthBarBackground);

        // 创建血条
        const healthBar = new BABYLON.GUI.Rectangle();
        healthBar.width = "100px";
        healthBar.height = "5px";
        healthBar.cornerRadius = 2;
        healthBar.color = "transparent";
        healthBar.background = "red";
        healthBar.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        healthBarBackground.addControl(healthBar);

        // 将血条添加到敌人的metadata中
        enemy.metadata.healthBar = healthBar;
        enemy.metadata.healthBarContainer = healthBarContainer;
        enemy.metadata.nameLabel = nameLabel;  // 保存名称标签引用

        this.enemies.push(enemy);
    }

    update() {
        const currentTime = Date.now();
        const playerPosition = this.game.player.mesh.position;

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            // 计算与玩家的距离
            const toPlayer = playerPosition.subtract(enemy.position);
            const distance = toPlayer.length();

            // 根据与玩家的距离决定行为
            if (distance < this.detectionRange) {
                // 在检测范围内，追踪玩家
                const chaseDirection = toPlayer.normalize();
                const movement = chaseDirection.scale(this.chaseSpeed);
                movement.y = 0; // 保持水平移动
                enemy.position.addInPlace(movement);
                
                // 更新敌人的移动方向（用于动画等）
                enemy.metadata.moveDirection = chaseDirection;
            } else {
                // 正常的随机移动逻辑
                enemy.metadata.movementTimer++;

                if (enemy.metadata.movementTimer >= enemy.metadata.changeDirectionInterval) {
                    enemy.metadata.moveDirection = new BABYLON.Vector3(
                        Math.random() - 0.5,
                        0,
                        Math.random() - 0.5
                    ).normalize();
                    enemy.metadata.movementTimer = 0;
                }

                // 使用普通速度移动
                const movement = enemy.metadata.moveDirection.scale(this.enemySpeed);
                enemy.position.addInPlace(movement);
            }

            // 检查碰撞和伤害
            const collisionDistance = this.enemyRadius + this.playerRadius;
            if (distance < collisionDistance && 
                currentTime - enemy.metadata.lastDamageTime >= this.damageCooldown) {
                
                enemy.metadata.lastDamageTime = currentTime;
                this.game.takeDamage(10);

                const knockbackDirection = toPlayer.normalize();
                
                // 应用击退
                this.game.player.mesh.position.x += knockbackDirection.x * this.knockbackForce;
                this.game.player.mesh.position.z += knockbackDirection.z * this.knockbackForce;

                enemy.position.x -= knockbackDirection.x * this.knockbackForce * 0.5;
                enemy.position.z -= knockbackDirection.z * this.knockbackForce * 0.5;
            }

            // 边界检查
            const maxDistance = 40;
            if (Math.abs(enemy.position.x) > maxDistance || 
                Math.abs(enemy.position.z) > maxDistance) {
                const toCenter = new BABYLON.Vector3(
                    -enemy.position.x,
                    0,
                    -enemy.position.z
                ).normalize();
                enemy.metadata.moveDirection = toCenter;
            }

            // 上下浮动动画
            enemy.position.y = 1 + Math.sin(enemy.metadata.movementTimer * 0.05) * 0.2;
        }
    }

    // 检查与子弹的碰撞
    checkBulletCollisions(bullets) {
        if (!bullets || bullets.length === 0) return;

        for (let i = bullets.length - 1; i >= 0; i--) {
            const bullet = bullets[i];
            if (!bullet || !bullet.mesh) continue;

            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const enemy = this.enemies[j];
                const distance = BABYLON.Vector3.Distance(
                    bullet.mesh.position,
                    enemy.position
                );

                if (distance < 1) {
                    // 敌人受到伤害
                    enemy.metadata.health -= 25;

                    // 更新血条
                    const healthPercent = enemy.metadata.health / 100;
                    enemy.metadata.healthBar.width = (healthPercent * 100) + "px";
                    
                    // 如果敌人死亡
                    if (enemy.metadata.health <= 0) {
                        // 移除血条
                        enemy.metadata.healthBarContainer.dispose();
                        enemy.dispose();
                        this.enemies.splice(j, 1);
                        this.game.gainExperience(50);
                    }
                    
                    // 移除子弹
                    bullet.mesh.dispose();
                    bullets.splice(i, 1);
                    break;
                }
            }
        }
    }

    // 在敌人被销毁时清理血条
    cleanup() {
        for (const enemy of this.enemies) {
            if (enemy.metadata.healthBarContainer) {
                enemy.metadata.healthBarContainer.dispose();
            }
            enemy.dispose();
        }
        this.enemies = [];
    }

    // 可以添加一个方法来可视化碰撞体积（调试用）
    showCollisionVolumes() {
        for (const enemy of this.enemies) {
            const sphere = BABYLON.MeshBuilder.CreateSphere("collider", {
                diameter: this.enemyRadius * 2
            }, this.scene);
            sphere.position = enemy.position;
            sphere.material = new BABYLON.StandardMaterial("colliderMat", this.scene);
            sphere.material.wireframe = true;
            sphere.material.alpha = 0.3;
        }
    }
}

export default Enemies; 