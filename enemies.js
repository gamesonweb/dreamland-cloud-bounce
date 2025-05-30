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
        this.targets = [];
        this.spawnInterval = 5000; // Spawn une nouvelle cible toutes les 5 secondes
        this.lastSpawnTime = 0;
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

        // Spawn de nouvelles cibles
        if (currentTime - this.lastSpawnTime > this.spawnInterval) {
            this.createTarget();
            this.lastSpawnTime = currentTime;
        }

        // Mettre à jour les cibles existantes
        this.targets = this.targets.filter(target => {
            if (target.hit) {
                // Animation de disparition
                target.mesh.scaling.scaleInPlace(0.95);
                if (target.mesh.scaling.x < 0.1) {
                    target.mesh.dispose();
                    target.heart.dispose();
                    return false;
                }
            }
            return true;
        });
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

        bullets.forEach((bullet, bulletIndex) => {
            this.targets.forEach(target => {
                if (!target.hit && BABYLON.Vector3.Distance(bullet.mesh.position, target.mesh.position) < 1) {
                    // Cible touchée
                    target.hit = true;
                    bullet.mesh.dispose();
                    bullets.splice(bulletIndex, 1);
                    
                    // Effet de particules
                    this.createHitEffect(target.mesh.position);
                    
                    // Ajouter des points
                    this.game.gainExperience(50);
                }
            });
        });
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

    createTarget() {
        // Créer une personne cible
        const target = BABYLON.MeshBuilder.CreateBox("target", { height: 1.8, width: 0.6, depth: 0.6 }, this.scene);
        
        // Position aléatoire devant le joueur
        const playerPos = this.game.player.mesh.position;
        const randomAngle = Math.random() * Math.PI * 2;
        const distance = 10 + Math.random() * 10; // Entre 10 et 20 unités devant
        target.position = new BABYLON.Vector3(
            playerPos.x + Math.cos(randomAngle) * distance,
            1, // Hauteur du sol
            playerPos.z + Math.sin(randomAngle) * distance
        );

        // Matériau de la cible
        const targetMaterial = new BABYLON.StandardMaterial("targetMaterial", this.scene);
        targetMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.6, 1);
        target.material = targetMaterial;

        // Ajouter un cœur au-dessus de la cible
        const heart = BABYLON.MeshBuilder.CreateSphere("heart", { diameter: 0.3 }, this.scene);
        heart.position = new BABYLON.Vector3(0, 1.2, 0);
        heart.parent = target;
        
        const heartMaterial = new BABYLON.StandardMaterial("heartMaterial", this.scene);
        heartMaterial.diffuseColor = new BABYLON.Color3(1, 0.2, 0.3);
        heart.material = heartMaterial;

        // Animation du cœur
        this.scene.registerBeforeRender(() => {
            if (!this.scene.game.gameState.isPaused) {
                heart.scaling.y = 1 + Math.sin(this.scene.getEngine().getDeltaTime() * 0.005) * 0.1;
            }
        });

        this.targets.push({
            mesh: target,
            heart: heart,
            hit: false
        });
    }

    createHitEffect(position) {
        // Créer des particules de cœur
        const particleSystem = new BABYLON.ParticleSystem("particles", 50, this.scene);
        particleSystem.particleTexture = new BABYLON.Texture("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYwIDYxLjEzNDc3NywgMjAxMC8wMi8xMi0xNzozMjowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNSBNYWNpbnRvc2giIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6QUM2OEZDQTQ4RTU0MTFFMDg3Q0ZBRDg5RjY5QjM5MDQiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6QUM2OEZDQTU4RTU0MTFFMDg3Q0ZBRDg5RjY5QjM5MDQiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpBQzY4RkNBMjhFNTQxMUUwODdDRkFEODlGNjlCMzkwNCIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDpBQzY4RkNBMzhFNTQxMUUwODdDRkFEODlGNjlCMzkwNCIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PgH//v38+/r5+Pf29fTz8vHw7+7t7Ovq6ejn5uXk4+Lh4N/e3dzb2tnY19bV1NPS0dDPzs3My8rJyMfGxcTDwsHAv769vLu6ubi3trW0s7KxsK+urayrqqmop6alpKOioaCfnp2cm5qZmJeWlZSTkpGQj46NjIuKiYiHhoWEg4KBgH9+fXx7enl4d3Z1dHNycXBvbm1sa2ppaGdmZWRjYmFgX15dXFtaWVhXVlVUU1JRUE9OTUxLSklIR0ZFRENCQUA/Pj08Ozo5ODc2NTQzMjEwLy4tLCsqKSgnJiUkIyIhIB8eHRwbGhkYFxYVFBMSERAPDg0MCwoJCAcGBQQDAgEAACH5BAAAAAAALAAAAAAgACAAAAIxjI+py+0Po5y02ouz3rz7D4biSJbmiabqyrbuC8fyTNf2jef6zvf+DwwKh8Si8YhMKicAADs=");
        
        particleSystem.emitter = position;
        particleSystem.minEmitBox = new BABYLON.Vector3(-0.5, -0.5, -0.5);
        particleSystem.maxEmitBox = new BABYLON.Vector3(0.5, 0.5, 0.5);
        
        particleSystem.color1 = new BABYLON.Color4(1, 0.2, 0.3, 1.0);
        particleSystem.color2 = new BABYLON.Color4(1, 0.5, 0.5, 1.0);
        particleSystem.colorDead = new BABYLON.Color4(0, 0, 0, 0.0);
        
        particleSystem.minSize = 0.1;
        particleSystem.maxSize = 0.3;
        
        particleSystem.minLifeTime = 0.3;
        particleSystem.maxLifeTime = 1.5;
        
        particleSystem.emitRate = 50;
        
        particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE;
        
        particleSystem.gravity = new BABYLON.Vector3(0, 9.81, 0);
        
        particleSystem.direction1 = new BABYLON.Vector3(-2, 8, 2);
        particleSystem.direction2 = new BABYLON.Vector3(2, 8, -2);
        
        particleSystem.minAngularSpeed = 0;
        particleSystem.maxAngularSpeed = Math.PI;
        
        particleSystem.minEmitPower = 1;
        particleSystem.maxEmitPower = 3;
        particleSystem.updateSpeed = 0.01;
        
        particleSystem.start();
        
        // Arrêter les particules après 1 seconde
        setTimeout(() => {
            particleSystem.stop();
        }, 1000);
    }
}

export default Enemies; 