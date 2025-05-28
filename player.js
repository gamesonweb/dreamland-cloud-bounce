/**
 * Gestion du joueur dans le jeu Cloud Bounce
 * Contrôle les mouvements, les sauts et les interactions du joueur
 * Gère la caméra et les contrôles du joueur
 * 
 * @file player.js
 * @description Classe qui gère toutes les fonctionnalités liées au joueur, y compris les mouvements, les sauts et les interactions avec l'environnement
 */

// 玩家控制类
class Player {
    constructor(scene, position) {
        this.scene = scene;
        this.game = scene.game;  // 保存对game实例的引用
        this.moveSpeed = 0.15;
        this.sprintSpeed = 0.3; // 加速时的速度
        this.jumpForce = 0.3;
        this.gravity = 0.01;
        this.isJumping = false;
        this.playerRotation = 0;
        this.playerVerticalRotation = 0; // 添加垂直旋转角度
        this.playerVelocity = new BABYLON.Vector3(0, 0, 0);
        this.keys = {};
        this.isPointerLocked = false;
        this.eyeHeight = 1.7; // 眼睛高度
        this.isOnPlatform = false;
        this.isFirstPerson = true; // 添加视角模式标志
        this.cameraHeight = 3; // 增加相机高度
        this.cameraDistance = 8; // 增加基础相机距离
        this.maxPullBack = 5; // 增加最大拉远距离
        this.cameraTargetHeight = 1.5; // 增加目标点高度
        this.cameraSmoothFactor = 0.1; // 添加相机平滑因子
        this.cameraOffset = new BABYLON.Vector3(0, 0, 0); // 添加相机偏移量
        this.firstPersonViewDistance = 40; // 第一人称视角距离
        this.bullets = []; // 存储所有子弹
        this.bulletSpeed = 0.2; // 降低箭矢速度 (原来0.5)
        this.bulletSize = 0.2; // 子弹大小
        this.bulletLifetime = 300;    // 增加箭矢生命周期
        this.swordRange = 6.0;      // 增加到6.0（原来是4.5）
        this.swordDamage = 50;      // 剑的伤害保持不变
        this.bowDamage = 35;        // 增加弓箭伤害

        // 修改蓄力相关属性
        this.isCharging = false;
        this.chargeStartTime = 0;
        this.maxChargeTime = 2000;    // 增加最大蓄力时间到2秒
        this.minBowDamage = 25;       // 最小伤害
        this.maxBowDamage = 75;       // 增加最大伤害
        this.minBowSpeed = 20;        // 降低最小速度
        this.maxBowSpeed = 100;       // 显著增加最大速度

        // 修改箭矢相关属性
        this.maxArrows = 10;        // 最大箭矢数量
        this.currentArrows = 10;    // 当前箭矢数量

        // 创建UI纹理
        this.advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("playerUI");

        // 创建玩家模型
        this.mesh = BABYLON.MeshBuilder.CreateBox("player", {
            size: 1
        }, scene);
        this.mesh.position = position;
        this.mesh.checkCollisions = true;
        this.mesh.ellipsoid = new BABYLON.Vector3(0.5, 0.5, 0.5);
        this.mesh.ellipsoidOffset = new BABYLON.Vector3(0, 0.5, 0); // 添加碰撞体积偏移
        this.mesh.isPickable = true; // 使模型可被选中/碰撞

        // 设置摄像机
        this.camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(0, this.eyeHeight, 0), scene);
        this.camera.setTarget(new BABYLON.Vector3(0, this.eyeHeight, 1));
        this.camera.attachControl(scene.getEngine().getRenderingCanvas(), true);
        this.camera.speed = 0.5;
        this.camera.angularSensibility = 1000;
        this.camera.minZ = 0.05;
        this.camera.checkCollisions = true;
        this.camera.applyGravity = true;
        this.camera.ellipsoid = new BABYLON.Vector3(0.5, 0.5, 0.5);
        this.camera.ellipsoidOffset = new BABYLON.Vector3(0, 0.5, 0); // 添加相机碰撞体积偏移

        // 添加准星GUI
        this.createCrosshair();

        // 创建箭矢数量UI
        this.createArrowCountUI();

        // 初始化控制
        this.initializeControls();

        // 添加鼠标点击事件监听
        scene.onPointerDown = (evt) => {
            if (evt.button === 0) { // 左键点击
                this.shoot();
            }
        };

        // 添加武器相关属性
        this.currentWeapon = "bow";
        this.weaponCooldown = 0;
    }

    initializeControls() {
        const canvas = this.scene.getEngine().getRenderingCanvas();

        // 键盘控制
        window.addEventListener("keydown", (evt) => {
            this.keys[evt.key.toLowerCase()] = true;
            
            // Q键切换到上一个武器
            if (evt.key.toLowerCase() === 'q') {
                this.game.weaponUI.switchToPreviousWeapon();
            }
            // E键切换到下一个武器
            if (evt.key.toLowerCase() === 'e') {
                this.game.weaponUI.switchToNextWeapon();
            }
        });
        window.addEventListener("keyup", (evt) => {
            this.keys[evt.key.toLowerCase()] = false;
        });

        // 鼠标控制
        canvas.addEventListener("click", () => {
            if (!this.isPointerLocked) {
                canvas.requestPointerLock = canvas.requestPointerLock ||
                                          canvas.mozRequestPointerLock ||
                                          canvas.webkitRequestPointerLock;
                canvas.requestPointerLock();
            }
        });

        // 监听指针锁定状态变化
        document.addEventListener("pointerlockchange", () => {
            this.isPointerLocked = document.pointerLockElement === canvas;
        });
        document.addEventListener("mozpointerlockchange", () => {
            this.isPointerLocked = document.mozPointerLockElement === canvas;
        });
        document.addEventListener("webkitpointerlockchange", () => {
            this.isPointerLocked = document.webkitPointerLockElement === canvas;
        });

        // 处理鼠标移动
        this.scene.onPointerMove = (evt) => {
            if (this.isPointerLocked) {
                // 水平旋转
                this.playerRotation += evt.movementX * 0.005;
                this.mesh.rotation.y = this.playerRotation;

                // 垂直旋转（根据视角模式设置不同的限制）
                const verticalRotationFactor = this.isFirstPerson ? -1 : 1;
                this.playerVerticalRotation += evt.movementY * 0.005 * verticalRotationFactor;
                
                // 第一人称视角限制在-85到85度之间
                // 第三人称视角限制在-30到60度之间，防止转到物体底部
                const minAngle = this.isFirstPerson ? -Math.PI/2.1 : -Math.PI/6;
                const maxAngle = this.isFirstPerson ? Math.PI/2.1 : Math.PI/3;
                this.playerVerticalRotation = Math.max(minAngle, Math.min(maxAngle, this.playerVerticalRotation));
            }
        };

        // 处理鼠标离开画布
        canvas.addEventListener("mouseout", () => {
            if (this.isPointerLocked) {
                document.exitPointerLock = document.exitPointerLock ||
                                         document.mozExitPointerLock ||
                                         document.webkitExitPointerLock;
                document.exitPointerLock();
            }
        });

        // 游戏循环更新
        this.scene.registerBeforeRender(() => this.update());
    }

    update() {
        // 更新子弹/箭矢
        this.updateBullets();

        // 更新玩家位置
        if (this.isPointerLocked) {
            // 计算移动方向
            const forward = new BABYLON.Vector3(
                Math.sin(this.playerRotation),
                0,
                Math.cos(this.playerRotation)
            );
            const right = new BABYLON.Vector3(
                Math.sin(this.playerRotation + Math.PI/2),
                0,
                Math.cos(this.playerRotation + Math.PI/2)
            );
            
            // 重置水平速度
            this.playerVelocity.x = 0;
            this.playerVelocity.z = 0;

            // 获取当前移动速度（是否按住shift键）
            const currentSpeed = this.keys["shift"] ? this.sprintSpeed : this.moveSpeed;

            // 处理移动
            if (this.keys["z"]) {
                this.playerVelocity.addInPlace(forward.scale(currentSpeed));
            }
            if (this.keys["s"]) {
                this.playerVelocity.addInPlace(forward.scale(-currentSpeed));
            }
            if (this.keys["q"]) {
                this.playerVelocity.addInPlace(right.scale(-currentSpeed));
            }
            if (this.keys["d"]) {
                this.playerVelocity.addInPlace(right.scale(currentSpeed));
            }

            // 处理跳跃
            if (this.keys[" "]) {
                // 当在地面或平台上时都可以跳跃
                if (!this.isJumping || this.isOnPlatform) {
                    this.playerVelocity.y = this.jumpForce;
                    this.isJumping = true;
                    this.isOnPlatform = false;
                }
            }

            // 处理视角切换
            if (this.keys["v"] && !this.keys["v_prev"]) {
                this.isFirstPerson = !this.isFirstPerson;
                this.updateCrosshairVisibility();
            }
            this.keys["v_prev"] = this.keys["v"];

            // 应用重力
            if (!this.isOnPlatform) {
                this.playerVelocity.y -= this.gravity;
            }

            // 计算新位置
            const newPosition = this.mesh.position.add(this.playerVelocity);
            
            // 地面碰撞检测
            if (newPosition.y <= 1) {
                newPosition.y = 1;
                this.playerVelocity.y = 0;
                this.isJumping = false;
                this.isOnPlatform = false;
            }

            // 更新位置
            this.mesh.position = newPosition;
        }

        // 更新相机位置和旋转
        if (this.isFirstPerson) {
            // 第一人称视角 - 直接设置相机位置和旋转
            this.camera.position = new BABYLON.Vector3(
                this.mesh.position.x,
                this.mesh.position.y + this.eyeHeight,
                this.mesh.position.z
            );
            
            // 计算相机目标点
            const forward = new BABYLON.Vector3(
                Math.sin(this.playerRotation) * Math.cos(this.playerVerticalRotation),
                Math.sin(this.playerVerticalRotation),
                Math.cos(this.playerRotation) * Math.cos(this.playerVerticalRotation)
            );
            
            // 设置相机朝向
            const target = this.camera.position.add(forward);
            this.camera.setTarget(target);
        } else {
            // 第三人称视角（吃鸡风格）
            // 根据垂直旋转角度计算相机距离
            const baseDistance = this.cameraDistance;
            const pullBackFactor = Math.max(0, this.playerVerticalRotation) / (Math.PI/3); // 根据向上角度计算拉远系数
            const currentDistance = baseDistance + (this.maxPullBack * pullBackFactor);

            // 计算理想的相机位置，加入垂直旋转的影响
            const idealOffset = new BABYLON.Vector3(
                -Math.sin(this.playerRotation) * Math.cos(this.playerVerticalRotation) * currentDistance,
                this.cameraHeight + Math.sin(this.playerVerticalRotation) * currentDistance,
                -Math.cos(this.playerRotation) * Math.cos(this.playerVerticalRotation) * currentDistance
            );

            // 平滑相机移动
            this.cameraOffset = BABYLON.Vector3.Lerp(
                this.cameraOffset,
                idealOffset,
                this.cameraSmoothFactor
            );

            // 设置相机位置
            const cameraPosition = this.mesh.position.add(this.cameraOffset);
            this.camera.position = cameraPosition;

            // 设置相机目标点（考虑垂直旋转）
            const targetPosition = this.mesh.position.clone();
            targetPosition.y += this.cameraTargetHeight;
            this.camera.setTarget(targetPosition);
        }
    }

    // 设置是否在平台上
    setOnPlatform(isOnPlatform) {
        if (isOnPlatform) {
            // 站在平台上时重置跳跃状态
            this.isJumping = false;
            this.playerVelocity.y = 0;
            this.isOnPlatform = true;
        } else if (this.isOnPlatform) {
            // 刚离开平台
            this.isOnPlatform = false;
            // 不要立即设置isJumping为true，让玩家有机会在离开平台边缘时跳跃
            if (this.playerVelocity.y < 0) {
                this.isJumping = true;
            }
        }
    }

    // 发射子弹
    shoot() {
        // 创建子弹
        const bullet = BABYLON.MeshBuilder.CreateSphere("bullet", {
            diameter: this.bulletSize,
            segments: 16
        }, this.scene);
        
        // 设置子弹位置（从玩家前方发射）
        const forward = new BABYLON.Vector3(
            Math.sin(this.playerRotation) * Math.cos(this.playerVerticalRotation),
            Math.sin(this.playerVerticalRotation),
            Math.cos(this.playerRotation) * Math.cos(this.playerVerticalRotation)
        );
        
        // 从玩家眼睛位置发射
        bullet.position = this.mesh.position.clone();
        bullet.position.y += this.eyeHeight; // 从眼睛高度发射
        bullet.position.addInPlace(forward.scale(1.5)); // 从前方1.5单位处发射
        
        // 设置子弹材质
        const bulletMaterial = new BABYLON.StandardMaterial("bulletMaterial", this.scene);
        bulletMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0);
        bulletMaterial.emissiveColor = new BABYLON.Color3(0.5, 0, 0);
        bullet.material = bulletMaterial;
        
        // 设置子弹速度和方向（跟随视角）
        const bulletVelocity = forward.scale(this.bulletSpeed);
        
        // 添加子弹到列表
        this.bullets.push({
            mesh: bullet,
            velocity: bulletVelocity,
            lifetime: this.bulletLifetime
        });
    }

    // 修改子弹更新方法
    updateBullets() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            
            // 检查子弹是否有效
            if (!bullet || !bullet.mesh || !bullet.physics) {
                if (bullet && bullet.mesh) {
                    bullet.mesh.dispose();
                }
                this.bullets.splice(i, 1);
                continue;
            }

            // 更新位置
            bullet.mesh.position.addInPlace(bullet.physics.velocity);
            
            // 更新速度（添加重力）
            bullet.physics.velocity.addInPlace(bullet.physics.gravity);

            // 更新箭矢旋转以跟随轨迹
            if (bullet.physics.velocity.length() > 0) {
                // 计算箭矢朝向
                const forward = bullet.physics.velocity.normalize();
                
                // 创建旋转矩阵
                const rotationMatrix = BABYLON.Matrix.LookAtLH(
                    BABYLON.Vector3.Zero(),
                    forward,
                    BABYLON.Vector3.Up()
                ).invert();
                
                // 应用旋转
                bullet.mesh.rotationQuaternion = BABYLON.Quaternion.FromRotationMatrix(rotationMatrix);
            }

            // 检查碰撞
            for (const enemy of this.game.enemies.enemies) {
                if (!enemy.position) continue;
                
                const distance = BABYLON.Vector3.Distance(bullet.mesh.position, enemy.position);
                if (distance < 1.5) {
                    // 造成伤害
                    if (enemy.metadata) {
                        enemy.metadata.health -= bullet.damage;
                        
                        // 更新敌人血条
                        const healthPercent = Math.max(0, enemy.metadata.health) / 100;
                        enemy.metadata.healthBar.width = (healthPercent * 100) + "px";

                        // 如果敌人死亡
                        if (enemy.metadata.health <= 0) {
                            enemy.metadata.healthBarContainer.dispose();
                            enemy.dispose();
                            this.game.enemies.enemies = this.game.enemies.enemies.filter(e => e !== enemy);
                            this.game.gainExperience(50);
                            this.game.enemies.createBasicEnemy();
                        }
                    }

                    // 移除箭矢
                    bullet.mesh.dispose();
                    this.bullets.splice(i, 1);
                    break;
                }
            }

            // 更新生命周期
            bullet.physics.lifetime++;
            if (bullet.physics.lifetime > this.bulletLifetime) {
                bullet.mesh.dispose();
                this.bullets.splice(i, 1);
            }
        }
    }

    // 在Player类中添加新方法
    createCrosshair() {
        // 创建GUI
        const guiTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
        
        // 创建准星容器
        const crosshairContainer = new BABYLON.GUI.Rectangle();
        crosshairContainer.width = "64px";
        crosshairContainer.height = "64px";
        crosshairContainer.thickness = 0;
        guiTexture.addControl(crosshairContainer);

        // 创建弓箭准星
        const bowCrosshair = new BABYLON.GUI.Ellipse();
        bowCrosshair.width = "32px";
        bowCrosshair.height = "32px";
        bowCrosshair.color = "white";
        bowCrosshair.thickness = 2;
        bowCrosshair.alpha = 0.8;
        crosshairContainer.addControl(bowCrosshair);

        // 创建中心点
        const centerDot = new BABYLON.GUI.Ellipse();
        centerDot.width = "4px";
        centerDot.height = "4px";
        centerDot.background = "white";
        centerDot.alpha = 0.8;
        crosshairContainer.addControl(centerDot);

        // 创建四个方向标记
        const markers = [];
        const markerPositions = [
            { x: "0px", y: "-16px" },  // 上
            { x: "16px", y: "0px" },   // 右
            { x: "0px", y: "16px" },   // 下
            { x: "-16px", y: "0px" }   // 左
        ];

        markerPositions.forEach(pos => {
            const marker = new BABYLON.GUI.Rectangle();
            marker.width = "2px";
            marker.height = "8px";
            marker.background = "white";
            marker.alpha = 0.6;
            marker.left = pos.x;
            marker.top = pos.y;
            crosshairContainer.addControl(marker);
            markers.push(marker);
        });

        // 旋转右和左标记
        markers[1].rotation = Math.PI / 2;
        markers[3].rotation = Math.PI / 2;

        // 创建蓄力进度条容器
        const chargeBarContainer = new BABYLON.GUI.Rectangle();
        chargeBarContainer.width = "6px";  // 交换宽高，使进度条垂直显示
        chargeBarContainer.height = "100px";
        chargeBarContainer.left = "50px";  // 放在准星右侧
        chargeBarContainer.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
        chargeBarContainer.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        chargeBarContainer.background = "rgba(0, 0, 0, 0.5)";
        chargeBarContainer.thickness = 1;
        chargeBarContainer.zIndex = 1;
        chargeBarContainer.isVisible = false;
        guiTexture.addControl(chargeBarContainer);

        // 创建进度条
        const chargeBar = new BABYLON.GUI.Rectangle();
        chargeBar.width = "4px";
        chargeBar.height = "0px";  // 初始高度为0
        chargeBar.top = "50px";    // 从底部开始增长
        chargeBar.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        chargeBar.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        chargeBar.background = "white";
        chargeBar.alpha = 0.8;
        chargeBarContainer.addControl(chargeBar);

        // 保存引用
        this.crosshairContainer = crosshairContainer;
        this.bowCrosshair = bowCrosshair;
        this.crosshairMarkers = markers;
        this.centerDot = centerDot;
        this.chargeBarContainer = chargeBarContainer;
        this.chargeBar = chargeBar;

        // 更新可见性
        this.updateCrosshairVisibility();
    }

    // 修改 updateCrosshairVisibility 方法
    updateCrosshairVisibility() {
        const isVisible = this.isFirstPerson;
        const isBow = this.currentWeapon === "bow";
        
        if (this.crosshairContainer) {
            this.crosshairContainer.isVisible = isVisible;
        }
        if (this.bowCrosshair) {
            this.bowCrosshair.isVisible = isVisible && isBow;
        }
        if (this.crosshairMarkers) {
            this.crosshairMarkers.forEach(marker => {
                marker.isVisible = isVisible && isBow;
            });
        }
        if (this.centerDot) {
            this.centerDot.isVisible = isVisible;
        }
        if (this.chargeBarContainer) {
            this.chargeBarContainer.isVisible = isVisible && isBow;
        }
    }

    // 修改武器切换方法
    setWeapon(weaponType) {
        this.currentWeapon = weaponType;
        console.log(`Player weapon changed to: ${weaponType}`);
        
        // 根据武器类型修改攻击行为
        if (weaponType === "sword") {
            // 重置鼠标事件
            this.scene.onPointerDown = (evt) => {
                if (evt.button === 0) { // 左键
                    if (this.weaponCooldown > 0) return;
                    
                    // 剑的攻击逻辑
                    this.swordAttack();
                    
                    this.weaponCooldown = 1000; // 1秒冷却
                    setTimeout(() => {
                        this.weaponCooldown = 0;
                    }, 1000);
                }
            };
            
            // 清除弓箭的鼠标抬起事件
            this.scene.onPointerUp = null;
            
            // 确保重置蓄力状态
            this.isCharging = false;
            if (this.chargeBar) {
                this.chargeBar.height = "0px";
                this.chargeBar.background = "white";
            }
            if (this.chargeBarContainer) {
                this.chargeBarContainer.isVisible = false;
            }
            
        } else if (weaponType === "bow") {
            // 鼠标按下开始蓄力
            this.scene.onPointerDown = (evt) => {
                if (evt.button === 0) { // 左键
                    if (this.weaponCooldown > 0) return;
                    
                    this.isCharging = true;
                    this.chargeStartTime = Date.now();
                    
                    // 可以在这里添加蓄力特效
                    this.createChargingEffect();
                }
            };
            
            // 鼠标松开发射
            this.scene.onPointerUp = (evt) => {
                if (evt.button === 0 && this.isCharging) { // 左键
                    this.shootArrow();
                    
                    this.weaponCooldown = 800;
                    setTimeout(() => {
                        this.weaponCooldown = 0;
                    }, 800);
                }
            };
        }
        
        // 更新准星显示
        this.updateCrosshairVisibility();

        // 更新箭矢数量显示
        this.updateArrowCountVisibility();
    }

    // 添加剑的攻击方法
    swordAttack() {
        // 创建剑光特效
        this.createSwordSlashEffect();

        // 获取玩家前方的方向向量
        const forward = new BABYLON.Vector3(
            Math.sin(this.playerRotation),
            0,
            Math.cos(this.playerRotation)
        );

        // 检查所有敌人
        for (const enemy of this.game.enemies.enemies) {
            const toEnemy = enemy.position.subtract(this.mesh.position);
            const distance = toEnemy.length();

            if (distance <= this.swordRange) {
                const dot = BABYLON.Vector3.Dot(forward, toEnemy.normalize());
                if (dot > 0.3) { // 修改为0.3，大约对应144度的攻击角度（原来是0.5）
                    // 造成伤害
                    enemy.metadata.health -= this.swordDamage;
                    
                    // 更新敌人血条
                    const healthPercent = enemy.metadata.health / 100;
                    enemy.metadata.healthBar.width = (healthPercent * 100) + "px";

                    // 如果敌人死亡
                    if (enemy.metadata.health <= 0) {
                        enemy.metadata.healthBarContainer.dispose();
                        enemy.dispose();
                        this.game.enemies.enemies = this.game.enemies.enemies.filter(e => e !== enemy);
                        this.game.gainExperience(50);
                        this.game.enemies.createBasicEnemy();
                    }

                    // 添加击中特效
                    this.createSwordHitEffect(enemy.position);
                }
            }
        }
    }

    // 修改剑光特效
    createSwordSlashEffect() {
        // 创建一个平面作为剑光
        const slash = BABYLON.MeshBuilder.CreatePlane("slash", {
            width: 6,     // 增加宽度（原来是4）
            height: 10,   // 增加高度（原来是8）
            sideOrientation: BABYLON.Mesh.DOUBLESIDE
        }, this.scene);
        
        // 初始位置在玩家位置
        slash.position = new BABYLON.Vector3(
            this.mesh.position.x,
            this.mesh.position.y + 1.5,
            this.mesh.position.z
        );

        // 设置旋转
        slash.rotation.y = this.playerRotation;
        
        // 创建材质
        const slashMaterial = new BABYLON.StandardMaterial("slashMat", this.scene);
        slashMaterial.diffuseTexture = new BABYLON.Texture("textures/sword_slash.png", this.scene);
        slashMaterial.diffuseTexture.hasAlpha = true;
        slashMaterial.useAlphaFromDiffuseTexture = true;
        slashMaterial.emissiveTexture = slashMaterial.diffuseTexture; // 使用相同的纹理作为发光
        slashMaterial.emissiveColor = new BABYLON.Color3(0.3, 0.7, 1);
        slashMaterial.backFaceCulling = false;
        slash.material = slashMaterial;

        // 添加动画
        const positionAnimation = new BABYLON.Animation(
            "positionAnim",
            "position",
            60,
            BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );

        const scaleAnimation = new BABYLON.Animation(
            "scaleAnim",
            "scaling",
            60,
            BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );

        const alphaAnimation = new BABYLON.Animation(
            "alphaAnim",
            "material.alpha",
            60,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );

        // 获取前方向量
        const forward = new BABYLON.Vector3(
            Math.sin(this.playerRotation),
            0,
            Math.cos(this.playerRotation)
        );

        // 设置关键帧
        const endPos = new BABYLON.Vector3(
            this.mesh.position.x + forward.x * 6.0,  // 增加到6.0（匹配攻击范围）
            this.mesh.position.y + 1.5,
            this.mesh.position.z + forward.z * 6.0   // 增加到6.0
        );

        positionAnimation.setKeys([
            { 
                frame: 0, 
                value: slash.position.clone()
            },
            { 
                frame: 12, 
                value: endPos
            }
        ]);

        scaleAnimation.setKeys([
            { 
                frame: 0, 
                value: new BABYLON.Vector3(0.3, 0.3, 1)
            },
            { 
                frame: 4, 
                value: new BABYLON.Vector3(1, 1, 1)
            },
            { 
                frame: 12, 
                value: new BABYLON.Vector3(1.2, 1.2, 1)
            }
        ]);

        alphaAnimation.setKeys([
            { frame: 0, value: 1 },
            { frame: 8, value: 1 },
            { frame: 12, value: 0 }
        ]);

        // 应用动画
        slash.animations = [positionAnimation, scaleAnimation, alphaAnimation];

        // 播放动画并在结束后删除
        this.scene.beginAnimation(slash, 0, 12, false, 1.5, () => {
            slash.dispose();
        });
    }

    // 添加剑的击中特效
    createSwordHitEffect(position) {
        // 创建粒子系统
        const particleSystem = new BABYLON.ParticleSystem("swordHit", 50, this.scene);
        particleSystem.particleTexture = new BABYLON.Texture("textures/spark.png", this.scene);
        
        // 设置粒子发射点
        particleSystem.emitter = position;
        
        // 设置粒子属性
        particleSystem.minEmitBox = new BABYLON.Vector3(-0.2, -0.2, -0.2);
        particleSystem.maxEmitBox = new BABYLON.Vector3(0.2, 0.2, 0.2);
        particleSystem.color1 = new BABYLON.Color4(1, 1, 1, 1);
        particleSystem.color2 = new BABYLON.Color4(1, 0.5, 0, 1);
        particleSystem.colorDead = new BABYLON.Color4(0, 0, 0, 0);
        particleSystem.minSize = 0.1;
        particleSystem.maxSize = 0.3;
        particleSystem.minLifeTime = 0.1;
        particleSystem.maxLifeTime = 0.3;
        particleSystem.emitRate = 100;
        particleSystem.gravity = new BABYLON.Vector3(0, -9.81, 0);
        
        // 启动粒子系统
        particleSystem.start();
        
        // 0.3秒后停止并销毁
        setTimeout(() => {
            particleSystem.stop();
            setTimeout(() => particleSystem.dispose(), 1000);
        }, 300);
    }

    // 修改箭矢创建方法
    createArrow() {
        // 创建箭矢容器
        const arrow = new BABYLON.TransformNode("arrow", this.scene);

        // 创建箭杆（细长圆柱体）- 增加尺寸
        const shaft = BABYLON.MeshBuilder.CreateCylinder("shaft", {
            height: 3.0,  // 增加长度 (原来1.5)
            diameter: 0.15, // 增加直径 (原来0.05)
        }, this.scene);
        shaft.parent = arrow;
        shaft.position.z = 1.0; // 调整位置

        // 创建箭头（锥体）- 增加尺寸
        const head = BABYLON.MeshBuilder.CreateCylinder("head", {
            height: 0.6,  // 增加长度 (原来0.3)
            diameterTop: 0,
            diameterBottom: 0.4, // 增加底部直径 (原来0.15)
        }, this.scene);
        head.parent = arrow;
        head.position.z = 2.8; // 调整位置

        // 创建尾羽（三个平面）- 增加尺寸
        const featherMaterial = new BABYLON.StandardMaterial("featherMat", this.scene);
        featherMaterial.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.7);
        featherMaterial.backFaceCulling = false;

        for (let i = 0; i < 3; i++) {
            const feather = BABYLON.MeshBuilder.CreatePlane("feather", {
                height: 0.8,  // 增加高度 (原来0.3)
                width: 0.4,   // 增加宽度 (原来0.15)
            }, this.scene);
            feather.parent = arrow;
            feather.position.z = -0.5; // 调整位置
            feather.rotation.z = (Math.PI * 2 / 3) * i;
            feather.material = featherMaterial;
        }

        // 修改材质颜色使箭矢更明显
        const arrowMaterial = new BABYLON.StandardMaterial("arrowMat", this.scene);
        arrowMaterial.diffuseColor = new BABYLON.Color3(0.6, 0.4, 0.1); // 更亮的木色
        shaft.material = arrowMaterial;

        const headMaterial = new BABYLON.StandardMaterial("headMat", this.scene);
        headMaterial.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.8); // 更亮的金属色
        head.material = headMaterial;

        return arrow;
    }

    // 修改射箭方法
    shootArrow() {
        // 检查箭矢数量
        if (this.currentArrows <= 0) {
            console.log("No arrows left!");
            return;
        }

        // 计算蓄力时间和比例
        const chargeTime = this.isCharging ? Date.now() - this.chargeStartTime : 0;
        const chargeRatio = Math.min(chargeTime / this.maxChargeTime, 1.0);
        
        // 创建箭矢
        const arrow = this.createArrow();
        
        // 根据蓄力调整箭矢大小
        const scale = 1 + (chargeRatio * 0.5); // 最大可以变大50%
        arrow.scaling = new BABYLON.Vector3(scale, scale, scale);
        
        // 从准星位置发射箭矢
        const forward = this.camera.getTarget().subtract(this.camera.position).normalize();
        const right = BABYLON.Vector3.Cross(forward, BABYLON.Vector3.Up()).normalize();
        const up = BABYLON.Vector3.Cross(right, forward).normalize();

        // 设置箭矢位置（从摄像机位置稍微向前）
        arrow.position = this.camera.position.add(forward.scale(2));

        // 设置箭矢朝向
        arrow.rotation.y = this.playerRotation;
        arrow.rotation.x = this.playerVerticalRotation;

        // 计算射击方向
        const direction = new BABYLON.Vector3(
            Math.sin(this.playerRotation) * Math.cos(this.playerVerticalRotation),
            Math.sin(this.playerVerticalRotation),
            Math.cos(this.playerRotation) * Math.cos(this.playerVerticalRotation)
        ).normalize();

        // 根据蓄力调整速度和伤害
        const speed = this.minBowSpeed + (this.maxBowSpeed - this.minBowSpeed) * chargeRatio;
        const damage = this.minBowDamage + (this.maxBowDamage - this.minBowDamage) * chargeRatio;

        // 修改箭矢物理属性
        const arrowPhysics = {
            velocity: direction.scale(this.bulletSpeed * speed),
            gravity: new BABYLON.Vector3(0, -0.015 * (1 - chargeRatio * 0.7), 0), // 蓄力减少重力影响
            lifetime: 0
        };

        // 将箭矢添加到数组中
        this.bullets.push({
            mesh: arrow,
            physics: arrowPhysics,
            damage: damage
        });

        // 重置蓄力状态和进度条
        this.isCharging = false;
        this.chargeStartTime = 0;
        if (this.chargeBar) {
            this.chargeBar.height = "0px";
            this.chargeBar.top = "50px";
            this.chargeBar.background = "white";
        }

        // 减少箭矢数量
        this.currentArrows--;
        this.updateArrowCount();
    }

    // 修改蓄力特效方法
    createChargingEffect() {
        // 创建蓄力粒子效果
        const particleSystem = new BABYLON.ParticleSystem("charge", 100, this.scene);
        particleSystem.particleTexture = new BABYLON.Texture("textures/spark.png", this.scene);
        
        // 设置发射位置（玩家手部位置）
        const emitterPosition = new BABYLON.Vector3(
            this.mesh.position.x,
            this.mesh.position.y + 1.5,
            this.mesh.position.z
        );
        particleSystem.emitter = emitterPosition;
        
        // 设置粒子属性
        particleSystem.color1 = new BABYLON.Color4(0.7, 0.8, 1.0, 1.0);
        particleSystem.color2 = new BABYLON.Color4(0.2, 0.5, 1.0, 1.0);
        particleSystem.colorDead = new BABYLON.Color4(0, 0, 0.2, 0.0);
        
        particleSystem.minSize = 0.1;
        particleSystem.maxSize = 0.3;
        particleSystem.minLifeTime = 0.2;
        particleSystem.maxLifeTime = 0.4;
        particleSystem.emitRate = 50;
        
        // 开始粒子系统
        particleSystem.start();
        
        // 在蓄力结束或取消时停止粒子
        const checkCharging = setInterval(() => {
            if (!this.isCharging) {
                particleSystem.stop();
                setTimeout(() => {
                    particleSystem.dispose();
                    clearInterval(checkCharging);
                }, 500);
            }
        }, 100);

        // 添加准星动画
        const startTime = Date.now();
        const animate = () => {
            if (!this.isCharging) {
                if (this.chargeBar) {
                    this.chargeBar.height = "0px";
                    this.chargeBar.top = "50px";
                    this.chargeBar.background = "white";
                }
                if (this.chargeBarContainer) {
                    this.chargeBarContainer.isVisible = false;
                }
                return;
            }

            if (this.chargeBarContainer) {
                this.chargeBarContainer.isVisible = true;
            }

            const chargeTime = Date.now() - startTime;
            const chargeRatio = Math.min(chargeTime / this.maxChargeTime, 1.0);
            
            // 更新进度条
            if (this.chargeBar) {
                const height = chargeRatio * 100;
                this.chargeBar.height = `${height}px`;
                this.chargeBar.top = `${50 - height/2}px`;  // 居中增长
                
                // 根据蓄力程度改变颜色
                if (chargeRatio < 0.3) {
                    this.chargeBar.background = "white";
                } else if (chargeRatio < 0.6) {
                    this.chargeBar.background = "#ffcc00";  // 黄色
                } else if (chargeRatio < 0.9) {
                    this.chargeBar.background = "#ff6600";  // 橙色
                } else {
                    this.chargeBar.background = "#ff0000";  // 红色
                }
            }

            // 修改准星大小
            if (this.bowCrosshair) {
                const baseSize = 32;
                const maxExpand = 64;  // 增加最大扩展尺寸
                const currentSize = baseSize + (maxExpand - baseSize) * chargeRatio;
                this.bowCrosshair.width = `${currentSize}px`;
                this.bowCrosshair.height = `${currentSize}px`;
            }

            // 修改标记位置的变化范围
            if (this.crosshairMarkers) {
                const baseOffset = 16;
                const maxOffset = 32;  // 增加最大偏移距离
                const currentOffset = baseOffset + (maxOffset - baseOffset) * chargeRatio;
                
                const positions = [
                    { x: "0px", y: `-${currentOffset}px` },  // 上
                    { x: `${currentOffset}px`, y: "0px" },   // 右
                    { x: "0px", y: `${currentOffset}px` },   // 下
                    { x: `-${currentOffset}px`, y: "0px" }   // 左
                ];

                this.crosshairMarkers.forEach((marker, index) => {
                    marker.left = positions[index].x;
                    marker.top = positions[index].y;
                });
            }

            // 根据蓄力程度改变准星颜色
            if (this.bowCrosshair && this.crosshairMarkers) {
                const startColor = new BABYLON.Color3(1, 1, 1);  // 白色
                const endColor = new BABYLON.Color3(1, 0.6, 0);  // 金色
                
                const currentColor = BABYLON.Color3.Lerp(startColor, endColor, chargeRatio);
                const colorHex = currentColor.toHexString();
                
                this.bowCrosshair.color = colorHex;
                this.crosshairMarkers.forEach(marker => {
                    marker.background = colorHex;
                });
            }

            requestAnimationFrame(animate);
        };

        animate();
    }

    // 修改箭矢数量UI方法
    createArrowCountUI() {
        // 创建容器
        const arrowCountContainer = new BABYLON.GUI.Rectangle();
        arrowCountContainer.width = "80px";
        arrowCountContainer.height = "30px";
        arrowCountContainer.cornerRadius = 5;
        arrowCountContainer.color = "white";
        arrowCountContainer.thickness = 1;
        arrowCountContainer.background = "rgba(0, 0, 0, 0.5)";
        arrowCountContainer.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        arrowCountContainer.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        arrowCountContainer.top = "-50px";
        arrowCountContainer.left = "-20px";
        this.advancedTexture.addControl(arrowCountContainer);

        // 创建箭矢图标
        const arrowIcon = new BABYLON.GUI.Image("arrowIcon", "textures/arrow_icon.png");
        arrowIcon.width = "20px";
        arrowIcon.height = "20px";
        arrowIcon.left = "-25px";
        arrowCountContainer.addControl(arrowIcon);

        // 创建数量文本
        const arrowCountText = new BABYLON.GUI.TextBlock();
        arrowCountText.text = `${this.currentArrows}/${this.maxArrows}`;
        arrowCountText.color = "white";
        arrowCountText.fontSize = 16;
        arrowCountText.left = "10px";
        arrowCountContainer.addControl(arrowCountText);

        // 保存引用
        this.arrowCountText = arrowCountText;
        this.arrowCountContainer = arrowCountContainer;

        // 初始设置可见性
        this.updateArrowCountVisibility();
    }

    // 更新箭矢数量显示
    updateArrowCount() {
        if (this.arrowCountText) {
            this.arrowCountText.text = `${this.currentArrows}/${this.maxArrows}`;
        }
    }

    // 修改箭矢数量显示可见性
    updateArrowCountVisibility() {
        if (this.arrowCountContainer) {
            this.arrowCountContainer.isVisible = this.currentWeapon === "bow";
        }
    }
}

// 导出Player类
export default Player; 