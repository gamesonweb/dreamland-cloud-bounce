/**
 * Gestion des objets du jeu dans Cloud Bounce
 * Gère les objets interactifs comme les pièces et les plateformes mobiles
 * Contrôle les collisions et les interactions avec ces objets
 * 
 * @file gameObjects.js
 * @description Classe qui gère tous les objets interactifs du jeu, y compris les collectibles et les plateformes mobiles
 */

// 游戏对象管理类
class GameObjects {
    constructor(scene, game) {
        this.scene = scene;
        this.game = game;
        this.collectibles = [];
        this.movingPlatforms = [];
        this.targets = [];
        this.fragments = []; // 添加碎片数组
        this.score = 0;
        this.createCollectibles();
        this.createMovingPlatforms();
        this.createTargets();
    }

    // 创建可收集物
    createCollectibles() {
        // 创建一些随机位置的金币
        for (let i = 0; i < 10; i++) {
            const x = Math.random() * 40 - 20;
            const y = Math.random() * 10 + 2;
            const z = Math.random() * 40 - 20;
            
            const collectible = BABYLON.MeshBuilder.CreateSphere("collectible" + i, {
                diameter: 0.5,
                segments: 16
            }, this.scene);
            
            collectible.position = new BABYLON.Vector3(x, y, z);
            collectible.checkCollisions = true;
            
            // 添加旋转动画
            const rotationAnimation = new BABYLON.Animation(
                "rotationAnimation",
                "rotation.y",
                30,
                BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
            );
            
            const keyFrames = [];
            keyFrames.push({
                frame: 0,
                value: 0
            });
            keyFrames.push({
                frame: 30,
                value: 2 * Math.PI
            });
            
            rotationAnimation.setKeys(keyFrames);
            collectible.animations.push(rotationAnimation);
            this.scene.beginAnimation(collectible, 0, 30, true);
            
            // 添加材质
            const material = new BABYLON.StandardMaterial("collectibleMaterial", this.scene);
            material.diffuseColor = new BABYLON.Color3(1, 0.8, 0);
            material.emissiveColor = new BABYLON.Color3(0.5, 0.4, 0);
            collectible.material = material;
            
            this.collectibles.push(collectible);
        }
    }

    // 创建移动平台
    createMovingPlatforms() {
        // 创建一个测试用的移动平台
        const platform = BABYLON.MeshBuilder.CreateBox("movingPlatform", {
            width: 4,
            height: 0.5,
            depth: 4,
            updatable: true
        }, this.scene);
        
        platform.position = new BABYLON.Vector3(5, 3, 0);
        
        // 设置精确的碰撞盒
        platform.computeWorldMatrix(true);
        platform.refreshBoundingInfo();
        
        // 设置碰撞检测
        platform.checkCollisions = true;
        platform.isPickable = true;
        
        // 存储平台的实际尺寸
        platform.metadata = {
            width: 4,
            height: 0.5,
            depth: 4
        };
        
        // 添加材质
        const material = new BABYLON.StandardMaterial("platformMaterial", this.scene);
        material.diffuseColor = new BABYLON.Color3(0.4, 0.6, 0.8);
        platform.material = material;
        
        // 创建上下移动动画
        const animation = new BABYLON.Animation(
            "platformAnimation",
            "position.y",
            30,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
        );
        
        const keyFrames = [];
        keyFrames.push({
            frame: 0,
            value: 3
        });
        keyFrames.push({
            frame: 30,
            value: 5
        });
        keyFrames.push({
            frame: 60,
            value: 3
        });
        
        animation.setKeys(keyFrames);
        platform.animations.push(animation);
        this.scene.beginAnimation(platform, 0, 60, true);
        
        this.movingPlatforms.push(platform);
    }

    // 创建可击毁的目标
    createTargets() {
        // 清除可能存在的旧目标
        this.targets.forEach(target => target.dispose());
        this.targets = [];
        
        // 创建一些随机位置的目标
        for (let i = 0; i < 5; i++) {
            const target = BABYLON.MeshBuilder.CreateBox("target" + i, {
                width: 2,
                height: 2,
                depth: 0.5
            }, this.scene);
            
            // 随机位置（确保不会生成在玩家附近）
            let position;
            let tooClose;
            do {
                tooClose = false;
                position = new BABYLON.Vector3(
                    Math.random() * 40 - 20,
                    Math.random() * 10 + 2,
                    Math.random() * 40 - 20
                );
                
                // 检查是否太靠近玩家
                if (this.scene.getMeshByName("player")) {
                    const playerPosition = this.scene.getMeshByName("player").position;
                    const distance = BABYLON.Vector3.Distance(position, playerPosition);
                    if (distance < 5) {
                        tooClose = true;
                    }
                }
            } while (tooClose);
            
            target.position = position;
            
            // 设置碰撞检测
            target.checkCollisions = true;
            target.isPickable = true;
            
            // 添加材质
            const material = new BABYLON.StandardMaterial("targetMaterial", this.scene);
            material.diffuseColor = new BABYLON.Color3(0.8, 0.2, 0.2); // 红色
            material.emissiveColor = new BABYLON.Color3(0.4, 0.1, 0.1);
            target.material = material;
            
            // 添加旋转动画
            const rotationAnimation = new BABYLON.Animation(
                "targetRotation",
                "rotation.y",
                30,
                BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
            );
            
            const keyFrames = [];
            keyFrames.push({
                frame: 0,
                value: 0
            });
            keyFrames.push({
                frame: 30,
                value: Math.PI * 2
            });
            
            rotationAnimation.setKeys(keyFrames);
            target.animations.push(rotationAnimation);
            this.scene.beginAnimation(target, 0, 30, true);
            
            this.targets.push(target);
        }
    }

    // 创建目标碎片
    createTargetFragments(position) {
        const fragmentCount = 8; // 碎片数量
        
        for (let i = 0; i < fragmentCount; i++) {
            // 创建碎片
            const fragment = BABYLON.MeshBuilder.CreateBox("fragment" + i, {
                width: 0.5,
                height: 0.5,
                depth: 0.5
            }, this.scene);
            
            // 设置碎片位置（从目标中心向外扩散）
            fragment.position = position.clone();
            
            // 设置碎片材质
            const material = new BABYLON.StandardMaterial("fragmentMaterial", this.scene);
            material.diffuseColor = new BABYLON.Color3(0.8, 0.2, 0.2);
            material.emissiveColor = new BABYLON.Color3(0.4, 0.1, 0.1);
            fragment.material = material;
            
            // 设置碎片初始速度（随机方向）
            const velocity = new BABYLON.Vector3(
                (Math.random() - 0.5) * 0.3, // 增加水平速度
                Math.random() * 0.4 + 0.2,   // 增加垂直速度
                (Math.random() - 0.5) * 0.3  // 增加水平速度
            );
            
            // 设置碎片旋转
            const rotation = new BABYLON.Vector3(
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2
            );
            
            // 设置碎片旋转速度
            const rotationSpeed = new BABYLON.Vector3(
                (Math.random() - 0.5) * 0.2, // 增加旋转速度
                (Math.random() - 0.5) * 0.2,
                (Math.random() - 0.5) * 0.2
            );
            
            this.fragments.push({
                mesh: fragment,
                velocity: velocity,
                rotation: rotation,
                rotationSpeed: rotationSpeed,
                lifetime: 120 // 增加生命周期
            });
        }
    }

    // 更新碎片
    updateFragments() {
        for (let i = this.fragments.length - 1; i >= 0; i--) {
            const fragment = this.fragments[i];
            
            // 更新位置
            fragment.mesh.position.addInPlace(fragment.velocity);
            
            // 更新旋转
            fragment.rotation.addInPlace(fragment.rotationSpeed);
            fragment.mesh.rotation = fragment.rotation;
            
            // 应用重力
            fragment.velocity.y -= 0.02; // 增加重力
            
            // 减少生命周期
            fragment.lifetime--;
            
            // 如果碎片生命周期结束或碰到地面，移除碎片
            if (fragment.lifetime <= 0 || fragment.mesh.position.y <= 0.5) {
                fragment.mesh.dispose();
                this.fragments.splice(i, 1);
            }
        }
    }

    // 检查子弹碰撞
    checkBulletCollisions(bullets) {
        if (!bullets || bullets.length === 0) return;

        for (let i = bullets.length - 1; i >= 0; i--) {
            const bullet = bullets[i];
            if (!bullet || !bullet.mesh) continue;

            for (let j = this.targets.length - 1; j >= 0; j--) {
                const target = this.targets[j];
                const distance = BABYLON.Vector3.Distance(
                    bullet.mesh.position,
                    target.position
                );

                if (distance < 1.5) {
                    // 创建破碎效果
                    this.createDestroyEffect(target.position);
                    
                    // 移除目标和子弹
                    target.dispose();
                    this.targets.splice(j, 1);
                    bullet.mesh.dispose();
                    bullets.splice(i, 1);
                    
                    // 增加分数和经验
                    this.score += 20;
                    this.game.gainExperience(30);  // 击碎目标获得30经验
                    console.log(`Score: ${this.score}, Experience gained: 30`);
                    break;
                }
            }
        }
    }

    // 检查碰撞
    checkCollisions(playerPosition, playerVelocity) {
        // 检查与金币的碰撞
        for (let i = this.collectibles.length - 1; i >= 0; i--) {
            const collectible = this.collectibles[i];
            const distance = BABYLON.Vector3.Distance(playerPosition, collectible.position);
            
            if (distance < 1) {
                collectible.dispose();
                this.collectibles.splice(i, 1);
                this.score += 10;
                this.game.gainExperience(10);
                console.log("Collected coin! Score:", this.score);
                this.createCollectEffect(collectible.position);
            }
        }

        // 检查目标碰撞
        for (let i = this.targets.length - 1; i >= 0; i--) {
            const target = this.targets[i];
            const distance = BABYLON.Vector3.Distance(playerPosition, target.position);
            
            if (distance < 2) {
                target.dispose();
                this.targets.splice(i, 1);
                this.score += 20;
                this.game.gainExperience(20);
                console.log("Target destroyed! Score:", this.score);
                this.createDestroyEffect(target.position);
            }
        }

        // 检查地面碰撞
        const playerBottom = playerPosition.y - 0.5;
        if (playerBottom <= 0.1) {
            playerPosition.y = 0.5;
            return true;
        }

        // 检查与所有平台的碰撞
        const allPlatforms = [
            ...this.movingPlatforms, 
            ...this.scene.meshes.filter(mesh => 
                mesh.metadata?.isGround ||
                mesh.id.startsWith("platform_") || 
                mesh.id.startsWith("bridge_") || 
                mesh.id.startsWith("ramp_") ||
                mesh.id.startsWith("cloud_") ||
                mesh.id.startsWith("obstacle_") ||  // 添加对新平台的检测
                mesh.id === "ground"  // 添加对基础地面的检测
            )
        ];

        console.log("Found platforms:", allPlatforms.map(p => p.id));

        for (const platform of allPlatforms) {
            if (!platform.metadata) {
                console.warn("Platform missing metadata:", platform.id);
                continue;
            }

            const platformPos = platform.position;
            const width = platform.metadata.width;
            const height = platform.metadata.height;
            const depth = platform.metadata.depth;
            const isGround = platform.metadata.isGround;

            // 玩家碰撞体积参数
            const playerHalfWidth = 0.4;
            const playerHeight = 1.0;
            const playerBottom = playerPosition.y - playerHeight/2;
            const playerTop = playerPosition.y + playerHeight/2;

            // 计算平台表面高度
            let surfaceY = isGround ? 0 : platformPos.y + height/2;
            
            // 计算平台边界（考虑旋转）
            let minX, maxX, minZ, maxZ;
            if (platform.rotation && platform.rotation.y !== 0) {
                // 对于旋转的平台，使用更大的碰撞盒
                const maxDim = Math.max(width, depth);
                minX = platformPos.x - maxDim/2;
                maxX = platformPos.x + maxDim/2;
                minZ = platformPos.z - maxDim/2;
                maxZ = platformPos.z + maxDim/2;
            } else {
                minX = platformPos.x - width/2;
                maxX = platformPos.x + width/2;
                minZ = platformPos.z - depth/2;
                maxZ = platformPos.z + depth/2;
            }

            // 检查水平碰撞
            const isOverlappingHorizontally = 
                playerPosition.x + playerHalfWidth > minX && 
                playerPosition.x - playerHalfWidth < maxX &&
                playerPosition.z + playerHalfWidth > minZ && 
                playerPosition.z - playerHalfWidth < maxZ;

            // 检查垂直碰撞
            const isOnSurface = 
                playerBottom <= surfaceY + 0.1 && // 增加一点向上的容差
                playerBottom >= surfaceY - 0.1 && // 增加一点向下的容差
                playerVelocity.y <= 0;            // 确保玩家在下落

            // 在检测到与平台碰撞时
            if (isOverlappingHorizontally && isOnSurface) {
                playerPosition.y = surfaceY + playerHeight/2;
                return true;
            }
        }
        
        return false;
    }

    // 添加销毁效果
    createDestroyEffect(position) {
        const particleSystem = new BABYLON.ParticleSystem("particles", 2000, this.scene);
        particleSystem.particleTexture = new BABYLON.Texture("textures/flare.png", this.scene);
        particleSystem.emitter = position;
        particleSystem.minEmitBox = new BABYLON.Vector3(-0.5, -0.5, -0.5);
        particleSystem.maxEmitBox = new BABYLON.Vector3(0.5, 0.5, 0.5);
        particleSystem.color1 = new BABYLON.Color4(1, 0.5, 0, 1.0);
        particleSystem.color2 = new BABYLON.Color4(1, 0.5, 0, 1.0);
        particleSystem.colorDead = new BABYLON.Color4(0, 0, 0, 0.0);
        particleSystem.minSize = 0.1;
        particleSystem.maxSize = 0.5;
        particleSystem.minLifeTime = 0.3;
        particleSystem.maxLifeTime = 1.5;
        particleSystem.emitRate = 300;
        particleSystem.gravity = new BABYLON.Vector3(0, -9.81, 0);
        particleSystem.direction1 = new BABYLON.Vector3(-1, 1, -1);
        particleSystem.direction2 = new BABYLON.Vector3(1, 1, 1);
        particleSystem.minEmitPower = 1;
        particleSystem.maxEmitPower = 3;
        particleSystem.start();

        // 一段时间后停止并销毁粒子系统
        setTimeout(() => {
            particleSystem.stop();
            setTimeout(() => particleSystem.dispose(), 2000);
        }, 300);
    }

    // 添加收集效果
    createCollectEffect(position) {
        const particleSystem = new BABYLON.ParticleSystem("collectParticles", 50, this.scene);
        particleSystem.particleTexture = new BABYLON.Texture("textures/sparkle.png", this.scene);
        particleSystem.emitter = position;
        particleSystem.minEmitBox = new BABYLON.Vector3(-0.2, -0.2, -0.2);
        particleSystem.maxEmitBox = new BABYLON.Vector3(0.2, 0.2, 0.2);
        particleSystem.color1 = new BABYLON.Color4(1, 0.8, 0, 1.0);
        particleSystem.color2 = new BABYLON.Color4(1, 0.5, 0, 1.0);
        particleSystem.colorDead = new BABYLON.Color4(0, 0, 0, 0.0);
        particleSystem.minSize = 0.1;
        particleSystem.maxSize = 0.3;
        particleSystem.minLifeTime = 0.2;
        particleSystem.maxLifeTime = 0.8;
        particleSystem.emitRate = 100;
        particleSystem.gravity = new BABYLON.Vector3(0, 5, 0);
        particleSystem.direction1 = new BABYLON.Vector3(-1, 8, -1);
        particleSystem.direction2 = new BABYLON.Vector3(1, 8, 1);
        particleSystem.minEmitPower = 1;
        particleSystem.maxEmitPower = 2;
        particleSystem.start();

        setTimeout(() => {
            particleSystem.stop();
            setTimeout(() => particleSystem.dispose(), 1000);
        }, 200);
    }

    update(bullets) {
        // 检查金币碰撞
        for (let i = this.collectibles.length - 1; i >= 0; i--) {
            const collectible = this.collectibles[i];
            const distance = BABYLON.Vector3.Distance(
                this.game.player.mesh.position,
                collectible.position
            );

            // 如果玩家靠近金币
            if (distance < 1.5) {
                // 播放收集效果
                this.createCollectEffect(collectible.position.clone());
                
                // 移除金币
                collectible.dispose();
                this.collectibles.splice(i, 1);
                
                // 增加分数和经验
                this.score += 10;
                this.game.gainExperience(10);  // 收集金币获得10经验
                console.log(`Score: ${this.score}, Experience gained: 10`);
            }
        }

        // 检查子弹与目标的碰撞
        this.checkBulletCollisions(bullets);

        // 更新碎片
        this.updateFragments();

        // 更新移动平台
        for (const platform of this.movingPlatforms) {
            // 平台移动逻辑保持不变
        }

        // 检查是否需要刷新目标
        if (this.targets.length === 0) {
            console.log("所有目标已被消灭！创建新的目标...");
            this.createTargets();
        }
    }
}

// 导出GameObjects类
export default GameObjects; 