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
        this.fragments = [];
        this.score = 0;
        this.lastUpdateTime = 0;
        this.updateInterval = 16; // ~60 FPS
        this.cleanupInterval = 3000; // Nettoyage toutes les 3 secondes
        this.lastCleanupTime = 0;
        
        // Limites d'objets pour optimiser les performances
        this.maxCollectibles = 5; // Réduit de 10 à 5
        this.maxPlatforms = 3;    // Réduit de 5 à 3
        this.maxTargets = 3;      // Réduit de 5 à 3
        this.maxFragments = 4;    // Réduit de 6 à 4
        
        // Initialisation des objets
        this.createCollectibles();
        this.createMovingPlatforms();
        this.createTargets();
    }

    // 创建可收集物
    createCollectibles() {
        // Nettoyer les collectibles existants
        this.collectibles.forEach(collectible => collectible.dispose());
        this.collectibles = [];

        // Créer de nouveaux collectibles avec moins de segments
        for (let i = 0; i < this.maxCollectibles; i++) {
            const x = Math.random() * 40 - 20;
            const y = Math.random() * 10 + 2;
            const z = Math.random() * 40 - 20;
            
            const collectible = BABYLON.MeshBuilder.CreateSphere("collectible" + i, {
                diameter: 0.5,
                segments: 4 // Réduit de 8 à 4 pour de meilleures performances
            }, this.scene);
            
            collectible.position = new BABYLON.Vector3(x, y, z);
            collectible.checkCollisions = true;
            
            // Animation optimisée
            const rotationAnimation = new BABYLON.Animation(
                "rotationAnimation",
                "rotation.y",
                30,
                BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
            );
            
            rotationAnimation.setKeys([
                { frame: 0, value: 0 },
                { frame: 30, value: 2 * Math.PI }
            ]);
            
            collectible.animations = [rotationAnimation];
            this.scene.beginAnimation(collectible, 0, 30, true);
            
            // Matériau optimisé
            const material = new BABYLON.StandardMaterial("collectibleMaterial", this.scene);
            material.diffuseColor = new BABYLON.Color3(1, 0.8, 0);
            material.emissiveColor = new BABYLON.Color3(0.5, 0.4, 0);
            material.specularColor = new BABYLON.Color3(0, 0, 0);
            collectible.material = material;
            
            this.collectibles.push(collectible);
        }
    }

    // 创建移动平台
    createMovingPlatforms() {
        // Nettoyer les plateformes existantes
        this.movingPlatforms.forEach(platform => platform.dispose());
        this.movingPlatforms = [];

        // Créer de nouvelles plateformes mobiles
        for (let i = 0; i < this.maxPlatforms; i++) {
            const platform = BABYLON.MeshBuilder.CreateBox("platform" + i, {
                width: 3,
                height: 0.5,
                depth: 3
            }, this.scene);
            
            platform.position = new BABYLON.Vector3(
                Math.random() * 40 - 20,
                2 + i * 2,
                Math.random() * 40 - 20
            );
            
            // Animation optimisée
            const animation = new BABYLON.Animation(
                "platformAnimation",
                "position",
                30,
                BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
                BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
            );
            
            const startPos = platform.position.clone();
            const endPos = startPos.add(new BABYLON.Vector3(0, 2, 0));
            
            animation.setKeys([
                { frame: 0, value: startPos },
                { frame: 30, value: endPos },
                { frame: 60, value: startPos }
            ]);
            
            platform.animations = [animation];
            this.scene.beginAnimation(platform, 0, 60, true);
            
            // Matériau optimisé
            const material = new BABYLON.StandardMaterial("platformMaterial", this.scene);
            material.diffuseColor = new BABYLON.Color3(0.2, 0.6, 1);
            material.emissiveColor = new BABYLON.Color3(0.1, 0.3, 0.5);
            material.specularColor = new BABYLON.Color3(0, 0, 0);
            platform.material = material;
            
            this.movingPlatforms.push(platform);
        }
    }

    // 创建可击毁的目标
    createTargets() {
        // Nettoyer les cibles existantes
        this.targets.forEach(target => target.dispose());
        this.targets = [];
        
        // Créer de nouvelles cibles
        for (let i = 0; i < this.maxTargets; i++) {
            const target = BABYLON.MeshBuilder.CreateBox("target" + i, {
                width: 2,
                height: 2,
                depth: 0.5
            }, this.scene);
            
            // Position optimisée
            let position;
            let tooClose;
            do {
                tooClose = false;
                position = new BABYLON.Vector3(
                    Math.random() * 40 - 20,
                    Math.random() * 10 + 2,
                    Math.random() * 40 - 20
                );
                
                if (this.scene.getMeshByName("player")) {
                    const playerPosition = this.scene.getMeshByName("player").position;
                    const distance = BABYLON.Vector3.Distance(position, playerPosition);
                    if (distance < 5) {
                        tooClose = true;
                    }
                }
            } while (tooClose);
            
            target.position = position;
            target.checkCollisions = true;
            target.isPickable = true;
            
            // Matériau optimisé
            const material = new BABYLON.StandardMaterial("targetMaterial", this.scene);
            material.diffuseColor = new BABYLON.Color3(0.8, 0.2, 0.2);
            material.emissiveColor = new BABYLON.Color3(0.4, 0.1, 0.1);
            material.specularColor = new BABYLON.Color3(0, 0, 0);
            target.material = material;
            
            this.targets.push(target);
        }
    }

    // 创建目标碎片
    createTargetFragments(position) {
        // Limiter le nombre de fragments
        if (this.fragments.length >= this.maxFragments) {
            // Supprimer les plus anciens fragments
            const oldestFragment = this.fragments.shift();
            if (oldestFragment && oldestFragment.mesh) {
                oldestFragment.mesh.dispose();
            }
        }
        
        for (let i = 0; i < 2; i++) { // Réduit de 6 à 2 fragments par cible
            const fragment = BABYLON.MeshBuilder.CreateBox("fragment" + i, {
                width: 0.5,
                height: 0.5,
                depth: 0.5
            }, this.scene);
            
            fragment.position = position.clone();
            
            // Matériau optimisé
            const material = new BABYLON.StandardMaterial("fragmentMaterial", this.scene);
            material.diffuseColor = new BABYLON.Color3(0.8, 0.2, 0.2);
            material.emissiveColor = new BABYLON.Color3(0.4, 0.1, 0.1);
            material.specularColor = new BABYLON.Color3(0, 0, 0);
            fragment.material = material;
            
            // Vitesse optimisée
            const velocity = new BABYLON.Vector3(
                (Math.random() - 0.5) * 0.2,
                Math.random() * 0.3 + 0.1,
                (Math.random() - 0.5) * 0.2
            );
            
            const rotation = new BABYLON.Vector3(
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2
            );
            
            const rotationSpeed = new BABYLON.Vector3(
                (Math.random() - 0.5) * 0.1,
                (Math.random() - 0.5) * 0.1,
                (Math.random() - 0.5) * 0.1
            );
            
            this.fragments.push({
                mesh: fragment,
                velocity: velocity,
                rotation: rotation,
                rotationSpeed: rotationSpeed,
                lifetime: 30 // Réduit de 60 à 30 frames
            });
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
                    this.createTargetFragments(target.position);
                    target.dispose();
                    this.targets.splice(j, 1);
                    bullet.mesh.dispose();
                    bullets.splice(i, 1);
                    
                    this.score += 20;
                    this.game.gainExperience(30);
                    break;
                }
            }
        }
    }

    // 检查碰撞
    checkCollisions(playerPosition, playerVelocity) {
        const currentTime = Date.now();
        
        // Optimisation : mise à jour limitée
        if (currentTime - this.lastUpdateTime < this.updateInterval) {
            return this.isOnPlatform;
        }
        this.lastUpdateTime = currentTime;

        // Nettoyage périodique
        if (currentTime - this.lastCleanupTime > this.cleanupInterval) {
            this.cleanup();
            this.lastCleanupTime = currentTime;
        }

        let isOnPlatform = false;

        // Vérification des collisions avec les collectibles
        for (let i = this.collectibles.length - 1; i >= 0; i--) {
            const collectible = this.collectibles[i];
            const distance = BABYLON.Vector3.Distance(playerPosition, collectible.position);
            
            if (distance < 1) {
                collectible.dispose();
                this.collectibles.splice(i, 1);
                this.score += 10;
                this.game.gainExperience(10);
            }
        }

        // Vérification des collisions avec les cibles
        for (let i = this.targets.length - 1; i >= 0; i--) {
            const target = this.targets[i];
            const distance = BABYLON.Vector3.Distance(playerPosition, target.position);
            
            if (distance < 2) {
                target.dispose();
                this.targets.splice(i, 1);
                this.score += 20;
                this.game.gainExperience(20);
                this.createTargetFragments(target.position);
            }
        }

        // Vérification des collisions avec le sol
        if (playerPosition.y <= 0.5) {
            playerPosition.y = 0.5;
            isOnPlatform = true;
        }

        // Vérification des collisions avec les plateformes
        const allPlatforms = [
            ...this.movingPlatforms,
            ...this.scene.meshes.filter(mesh => 
                mesh.metadata?.isGround ||
                mesh.id.startsWith("platform_") ||
                mesh.id.startsWith("bridge_") ||
                mesh.id.startsWith("ramp_") ||
                mesh.id.startsWith("cloud_") ||
                mesh.id.startsWith("obstacle_") ||
                mesh.id === "ground"
            )
        ];

        for (const platform of allPlatforms) {
            if (this.checkPlatformCollision(playerPosition, platform)) {
                isOnPlatform = true;
                break;
            }
        }

        return isOnPlatform;
    }

    checkPlatformCollision(playerPosition, platform) {
        const platformBounds = platform.getBoundingInfo().boundingBox;
        const playerBottom = playerPosition.y - 0.5;
        
        if (playerBottom <= platformBounds.maximumWorld.y &&
            playerBottom >= platformBounds.minimumWorld.y &&
            playerPosition.x >= platformBounds.minimumWorld.x &&
            playerPosition.x <= platformBounds.maximumWorld.x &&
            playerPosition.z >= platformBounds.minimumWorld.z &&
            playerPosition.z <= platformBounds.maximumWorld.z) {
            
            playerPosition.y = platformBounds.maximumWorld.y + 0.5;
            return true;
        }
        
        return false;
    }

    update(bullets) {
        const currentTime = Date.now();
        
        // Optimisation : mise à jour limitée
        if (currentTime - this.lastUpdateTime < this.updateInterval) {
            return;
        }
        this.lastUpdateTime = currentTime;

        // Mise à jour des fragments
        this.updateFragments();

        // Vérification des collisions avec les collectibles
        for (let i = this.collectibles.length - 1; i >= 0; i--) {
            const collectible = this.collectibles[i];
            const distance = BABYLON.Vector3.Distance(
                this.game.player.mesh.position,
                collectible.position
            );

            if (distance < 1.5) {
                collectible.dispose();
                this.collectibles.splice(i, 1);
                this.score += 10;
                this.game.gainExperience(10);
            }
        }

        // Vérification des collisions avec les balles
        this.checkBulletCollisions(bullets);

        // Recréation des cibles si nécessaire
        if (this.targets.length === 0) {
            this.createTargets();
        }
    }

    updateFragments() {
        for (let i = this.fragments.length - 1; i >= 0; i--) {
            const fragment = this.fragments[i];
            fragment.lifetime--;
            
            if (fragment.lifetime <= 0) {
                fragment.mesh.dispose();
                this.fragments.splice(i, 1);
                continue;
            }
            
            // Mise à jour de la position
            fragment.mesh.position.addInPlace(fragment.velocity);
            
            // Mise à jour de la rotation
            fragment.mesh.rotation.addInPlace(fragment.rotationSpeed);
            
            // Application de la gravité
            fragment.velocity.y -= 0.01;
        }
    }

    cleanup() {
        // Nettoyage des fragments
        this.fragments = this.fragments.filter(fragment => {
            if (fragment.lifetime <= 0) {
                fragment.mesh.dispose();
                return false;
            }
            return true;
        });

        // Nettoyage des matériaux non utilisés
        this.scene.materials.forEach(material => {
            let isUsed = false;
            this.scene.meshes.forEach(mesh => {
                if (mesh.material === material) {
                    isUsed = true;
                }
            });
            if (!isUsed) {
                material.dispose();
            }
        });
    }
}

// 导出GameObjects类
export default GameObjects; 