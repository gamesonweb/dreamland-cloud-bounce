/**
 * Gestion du terrain dans le jeu Cloud Bounce
 * Crée et gère l'environnement 3D du jeu
 * Gère les collisions avec le terrain
 * 
 * @file terrain.js
 * @description Classe qui gère la création et la gestion du terrain de jeu, y compris les collisions et l'interaction avec le joueur
 */

// 地形管理类
class Terrain {
    constructor(scene) {
        this.scene = scene;
        this.grounds = [];
        this.platforms = [];
        this.obstacles = [];
        this.createComplexTerrain();
        this.createFinishGate();
    }

    // 导入3D模型作为地形
    async importTerrainModel(modelUrl) {
        try {
            // 显示加载进度
            const loadingScreen = new BABYLON.LoadingScreen(this.scene.getEngine().getRenderingCanvas());
            loadingScreen.displayLoadingUI();

            // 加载模型
            const result = await BABYLON.SceneLoader.ImportMeshAsync(
                "", // 加载所有网格
                modelUrl, // 模型URL
                "", // 场景文件名（如果URL中已包含则留空）
                this.scene
            );

            // 设置碰撞检测
            result.meshes.forEach(mesh => {
                mesh.checkCollisions = true;
                // 如果模型没有材质，添加默认材质
                if (!mesh.material) {
                    const material = new BABYLON.StandardMaterial("importedMaterial", this.scene);
                    material.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
                    mesh.material = material;
                }
            });

            // 隐藏加载界面
            loadingScreen.hideLoadingUI();

            return result.meshes;
        } catch (error) {
            console.error("Error loading terrain model:", error);
            // 如果加载失败，创建默认地形
            this.createComplexTerrain();
        }
    }

    createComplexTerrain() {
        // Créer le sol avec des textures plus sophistiquées
        const groundSize = 100;
        const cubeSize = 1;
        
        // Créer les matériaux avec des textures procédurales
        const grassMaterials = this.createGrassMaterials();
        const dirtMaterials = this.createDirtMaterials();
        const stoneMaterials = this.createStoneMaterials();

        // Créer un système de particules pour l'herbe
        const grassParticles = new BABYLON.ParticleSystem("grassParticles", 2000, this.scene);
        grassParticles.particleTexture = new BABYLON.Texture("textures/grass_particle.png", this.scene);
        grassParticles.emitter = new BABYLON.Vector3(0, 0.1, 0);
        grassParticles.minEmitBox = new BABYLON.Vector3(-groundSize/2, 0, -groundSize/2);
        grassParticles.maxEmitBox = new BABYLON.Vector3(groundSize/2, 0, groundSize/2);
        grassParticles.color1 = new BABYLON.Color4(0.4, 0.8, 0.4, 1.0);
        grassParticles.color2 = new BABYLON.Color4(0.3, 0.7, 0.3, 1.0);
        grassParticles.colorDead = new BABYLON.Color4(0.2, 0.5, 0.2, 0.0);
        grassParticles.minSize = 0.1;
        grassParticles.maxSize = 0.3;
        grassParticles.minLifeTime = 0.3;
        grassParticles.maxLifeTime = 1.5;
        grassParticles.emitRate = 100;
        grassParticles.gravity = new BABYLON.Vector3(0, 0.1, 0);
        grassParticles.direction1 = new BABYLON.Vector3(-0.1, 1, -0.1);
        grassParticles.direction2 = new BABYLON.Vector3(0.1, 1, 0.1);
        grassParticles.start();

        // Créer le terrain avec des variations de hauteur
        for (let x = -groundSize/2; x < groundSize/2; x += cubeSize) {
            for (let z = -groundSize/2; z < groundSize/2; z += cubeSize) {
                // Calculer la hauteur avec du bruit de Perlin
                const height = this.getNoiseHeight(x, z);
                
                // Créer le cube avec la hauteur calculée
                const ground = BABYLON.MeshBuilder.CreateBox("ground_" + x + "_" + z, {
                    height: height,
                    width: cubeSize,
                    depth: cubeSize
                }, this.scene);
                
                ground.position = new BABYLON.Vector3(x, height/2, z);
                
                // Appliquer une texture avec variation
                const random = Math.random();
                if (random < 0.7) {
                    ground.material = grassMaterials[Math.floor(Math.random() * grassMaterials.length)];
                } else if (random < 0.9) {
                    ground.material = dirtMaterials[Math.floor(Math.random() * dirtMaterials.length)];
                } else {
                    ground.material = stoneMaterials[Math.floor(Math.random() * stoneMaterials.length)];
                }
                
                // Ajouter des effets de brillance
                ground.material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
                ground.material.specularPower = 32;
                
                ground.checkCollisions = true;
                this.grounds.push(ground);
            }
        }

        // Créer des plateformes avec des effets visuels améliorés
        this.createEnhancedPlatforms();
    }

    getNoiseHeight(x, z) {
        // Utiliser du bruit de Perlin pour créer des variations de hauteur naturelles
        const scale = 0.1;
        const height = (Math.sin(x * scale) * Math.cos(z * scale) + 1) * 0.5;
        return 1 + height * 0.5; // Hauteur entre 1 et 1.5
    }

    createGrassMaterials() {
        const materials = [];
        const baseColors = [
            new BABYLON.Color3(0.4, 0.8, 0.4),
            new BABYLON.Color3(0.3, 0.7, 0.3),
            new BABYLON.Color3(0.5, 0.9, 0.5),
            new BABYLON.Color3(0.35, 0.75, 0.35)
        ];

        baseColors.forEach((baseColor, index) => {
            const material = new BABYLON.StandardMaterial("grassMaterial_" + index, this.scene);
            material.diffuseColor = baseColor;
            
            // Ajouter des variations de texture avec du bruit
            const noise = Math.random() * 0.1;
            material.diffuseColor.r += noise;
            material.diffuseColor.g += noise;
            material.diffuseColor.b += noise;
            
            // Effet de brillance amélioré
            material.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
            material.specularPower = 64;
            
            // Ajouter un effet de fresnel pour plus de profondeur
            material.emissiveColor = baseColor.scale(0.1);
            material.useEmissiveAsIllumination = true;
            
            materials.push(material);
        });

        return materials;
    }

    createDirtMaterials() {
        const materials = [];
        const baseColors = [
            new BABYLON.Color3(0.6, 0.4, 0.2),  // Marron clair
            new BABYLON.Color3(0.5, 0.3, 0.1),  // Marron moyen
            new BABYLON.Color3(0.7, 0.5, 0.3),  // Marron sable
            new BABYLON.Color3(0.4, 0.2, 0.1)   // Marron foncé
        ];

        baseColors.forEach((baseColor, index) => {
            const material = new BABYLON.StandardMaterial("dirtMaterial_" + index, this.scene);
            material.diffuseColor = baseColor;
            
            // Ajouter des variations de texture
            const noise = Math.random() * 0.15;
            material.diffuseColor.r += noise;
            material.diffuseColor.g += noise;
            material.diffuseColor.b += noise;
            
            // Texture rugueuse
            material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
            material.specularPower = 16;
            
            materials.push(material);
        });

        return materials;
    }

    createStoneMaterials() {
        const materials = [];
        const baseColors = [
            new BABYLON.Color3(0.7, 0.7, 0.7),  // Gris clair
            new BABYLON.Color3(0.6, 0.6, 0.6),  // Gris moyen
            new BABYLON.Color3(0.5, 0.5, 0.5),  // Gris foncé
            new BABYLON.Color3(0.8, 0.8, 0.8)   // Gris très clair
        ];

        baseColors.forEach((baseColor, index) => {
            const material = new BABYLON.StandardMaterial("stoneMaterial_" + index, this.scene);
            material.diffuseColor = baseColor;
            
            // Ajouter des variations de texture
            const noise = Math.random() * 0.2;
            material.diffuseColor.r += noise;
            material.diffuseColor.g += noise;
            material.diffuseColor.b += noise;
            
            // Texture lisse
            material.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
            material.specularPower = 64;
            
            materials.push(material);
        });

        return materials;
    }

    createEnhancedPlatforms() {
        const platformPositions = [
            { x: 10, y: 8, z: 10, size: 4 },
            { x: -8, y: 12, z: -8, size: 4 },
            { x: 5, y: 16, z: -12, size: 4 },
            { x: -10, y: 20, z: 5, size: 4 },
            { x: 12, y: 24, z: -5, size: 4 },
            { x: -5, y: 28, z: 12, size: 4 },
            { x: 8, y: 32, z: 8, size: 4 },
            { x: -12, y: 36, z: -10, size: 4 },
            { x: 0, y: 40, z: 0, size: 5 }
        ];

        // Créer des matériaux de plateforme améliorés
        const platformMaterials = this.createEnhancedPlatformMaterials();

        platformPositions.forEach((pos, index) => {
            // Créer une plateforme avec des effets visuels
            const platform = this.createPlatformWithEffects(pos, platformMaterials);
            
            // Ajouter des effets de particules pour les plateformes
            this.addPlatformParticles(platform);
        });
    }

    createPlatformWithEffects(position, materials) {
        const platform = BABYLON.MeshBuilder.CreateBox(`platform_${position.x}_${position.y}_${position.z}`, {
            size: position.size
        }, this.scene);
        
        platform.position = new BABYLON.Vector3(position.x, position.y, position.z);
        
        // Appliquer un matériau avec des effets
        platform.material = materials[Math.floor(Math.random() * materials.length)];
        
        // Ajouter des effets de brillance
        platform.material.specularColor = new BABYLON.Color3(0.4, 0.4, 0.4);
        platform.material.specularPower = 128;
        
        // Ajouter un effet de fresnel
        platform.material.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        platform.material.useEmissiveAsIllumination = true;
        
        platform.checkCollisions = true;
        this.platforms.push(platform);
        
        return platform;
    }

    addPlatformParticles(platform) {
        const particles = new BABYLON.ParticleSystem("platformParticles", 100, this.scene);
        particles.particleTexture = new BABYLON.Texture("textures/sparkle.png", this.scene);
        particles.emitter = platform.position;
        particles.minEmitBox = new BABYLON.Vector3(-0.5, -0.5, -0.5);
        particles.maxEmitBox = new BABYLON.Vector3(0.5, 0.5, 0.5);
        particles.color1 = new BABYLON.Color4(1, 1, 1, 1);
        particles.color2 = new BABYLON.Color4(1, 0.8, 0.2, 1);
        particles.colorDead = new BABYLON.Color4(0, 0, 0, 0);
        particles.minSize = 0.1;
        particles.maxSize = 0.3;
        particles.minLifeTime = 0.3;
        particles.maxLifeTime = 1.5;
        particles.emitRate = 10;
        particles.gravity = new BABYLON.Vector3(0, 0.1, 0);
        particles.start();
    }

    createEnhancedPlatformMaterials() {
        const materials = [];
        const baseColors = [
            new BABYLON.Color3(0.8, 0.6, 0.4),
            new BABYLON.Color3(0.7, 0.5, 0.3),
            new BABYLON.Color3(0.6, 0.4, 0.2),
            new BABYLON.Color3(0.9, 0.7, 0.5)
        ];

        baseColors.forEach((baseColor, index) => {
            const material = new BABYLON.StandardMaterial("platformMaterial_" + index, this.scene);
            material.diffuseColor = baseColor;
            
            // Ajouter des variations de texture
            const noise = Math.random() * 0.1;
            material.diffuseColor.r += noise;
            material.diffuseColor.g += noise;
            material.diffuseColor.b += noise;
            
            // Effet de brillance amélioré
            material.specularColor = new BABYLON.Color3(0.4, 0.4, 0.4);
            material.specularPower = 128;
            
            // Ajouter un effet de fresnel
            material.emissiveColor = baseColor.scale(0.2);
            material.useEmissiveAsIllumination = true;
            
            materials.push(material);
        });

        return materials;
    }

    createPlatform(x, y, z, width, height, depth, r, g, b) {
        const platform = BABYLON.MeshBuilder.CreateBox("platform_" + this.platforms.length, {
            width: width,
            height: height,
            depth: depth,
            updatable: true
        }, this.scene);
        
        platform.position = new BABYLON.Vector3(x, y, z);
        
        // 设置精确的碰撞盒
        platform.computeWorldMatrix(true);
        platform.refreshBoundingInfo();
        
        const material = new BABYLON.StandardMaterial("platformMaterial", this.scene);
        material.diffuseColor = new BABYLON.Color3(r, g, b);
        platform.material = material;
        
        // 设置碰撞检测
        platform.checkCollisions = true;
        platform.isPickable = true;
        
        // 存储平台的实际尺寸
        platform.metadata = {
            width: width,
            height: height,
            depth: depth
        };
        
        this.platforms.push(platform);
        platform.showBoundingBox = true;
        return platform;
    }

    createRamp(x, y, z, width, height, depth, rotation, r, g, b) {
        const ramp = BABYLON.MeshBuilder.CreateBox("ramp_" + this.platforms.length, {
            width: width,
            height: height,
            depth: depth,
            updatable: true
        }, this.scene);
        
        ramp.position = new BABYLON.Vector3(x, y, z);
        ramp.rotation.y = rotation;
        
        // 设置精确的碰撞盒
        ramp.computeWorldMatrix(true);
        ramp.refreshBoundingInfo();
        
        const material = new BABYLON.StandardMaterial("rampMaterial", this.scene);
        material.diffuseColor = new BABYLON.Color3(r, g, b);
        ramp.material = material;
        
        // 设置碰撞检测
        ramp.checkCollisions = true;
        ramp.isPickable = true;
        
        // 存储实际尺寸
        ramp.metadata = {
            width: width,
            height: height,
            depth: depth
        };
        
        this.platforms.push(ramp);
        ramp.showBoundingBox = true;
        return ramp;
    }

    // 创建云层地形
    createCloudPlatform(position, scale = 1) {
        const cloud = BABYLON.MeshBuilder.CreateSphere("cloud_" + this.platforms.length, {
            diameter: 2 * scale,
            segments: 16
        }, this.scene);
        cloud.position = position;
        cloud.scaling = new BABYLON.Vector3(1, 0.5, 1).scale(scale);

        // 添加强制刷新，确保碰撞盒更新
        cloud.computeWorldMatrix(true);
        cloud.refreshBoundingInfo();

        cloud.checkCollisions = true;
        
        // 存储实际尺寸
        cloud.metadata = {
            width: 2 * scale,
            height: scale,
            depth: 2 * scale
        };
        
        this.platforms.push(cloud);
        cloud.showBoundingBox = true;
        return cloud;
    }

    // 移除地形
    removeTerrain(mesh) {
        const index = this.grounds.indexOf(mesh);
        if (index > -1) {
            this.grounds.splice(index, 1);
            mesh.dispose();
        }
    }

    // 移除平台
    removePlatform(mesh) {
        const index = this.platforms.indexOf(mesh);
        if (index > -1) {
            this.platforms.splice(index, 1);
            mesh.dispose();
        }
    }

    // 移除障碍物
    removeObstacle(mesh) {
        const index = this.obstacles.indexOf(mesh);
        if (index > -1) {
            this.obstacles.splice(index, 1);
            mesh.dispose();
        }
    }

    // 清除所有地形
    clearAll() {
        this.grounds.forEach(ground => ground.dispose());
        this.platforms.forEach(platform => platform.dispose());
        this.obstacles.forEach(obstacle => obstacle.dispose());
        this.grounds = [];
        this.platforms = [];
        this.obstacles = [];
    }

    // 添加新方法：创建浮空岛
    createFloatingIsland(x, y, z, width, height, depth) {
        // 主体平台
        this.createPlatform(x, y, z, width, height, depth, 0.4, 0.7, 0.4);
        
        // 添加装饰性小平台
        for (let i = 0; i < 4; i++) {
            const offsetX = (Math.random() - 0.5) * width;
            const offsetZ = (Math.random() - 0.5) * depth;
            const offsetY = Math.random() * height - height/2;
            const size = Math.random() * 2 + 1;
            this.createPlatform(
                x + offsetX,
                y + offsetY,
                z + offsetZ,
                size, 1, size,
                0.3, 0.6, 0.3
            );
        }
    }

    // 添加新方法：创建桥梁
    createBridge(x, y, z, width, height, depth, r, g, b) {
        const bridge = BABYLON.MeshBuilder.CreateBox("bridge_" + this.platforms.length, {
            width: width,
            height: height,
            depth: depth,
            updatable: true
        }, this.scene);
        
        bridge.position = new BABYLON.Vector3(x, y, z);
        
        // 设置精确的碰撞盒
        bridge.computeWorldMatrix(true);
        bridge.refreshBoundingInfo();
        
        const material = new BABYLON.StandardMaterial("bridgeMaterial", this.scene);
        material.diffuseColor = new BABYLON.Color3(r, g, b);
        bridge.material = material;
        
        // 设置碰撞检测
        bridge.checkCollisions = true;
        bridge.isPickable = true;
        
        // 存储实际尺寸
        bridge.metadata = {
            width: width,
            height: height,
            depth: depth
        };
        
        this.platforms.push(bridge);
        bridge.showBoundingBox = true;
        return bridge;
    }

    // 添加新方法：创建障碍物
    createObstacles() {
        for (let i = 0; i < 15; i++) {
            const x = (Math.random() - 0.5) * 160;
            const z = (Math.random() - 0.5) * 160;
            const y = Math.random() * 20 + 5;
            const height = Math.random() * 4 + 2;
            
            const obstacle = BABYLON.MeshBuilder.CreateCylinder("obstacle", {
                height: height,
                diameter: 2
            }, this.scene);
            
            obstacle.position = new BABYLON.Vector3(x, y, z);
            const material = new BABYLON.StandardMaterial("obstacleMaterial", this.scene);
            material.diffuseColor = new BABYLON.Color3(0.8, 0.2, 0.2);
            obstacle.material = material;
            obstacle.checkCollisions = true;
            
            this.obstacles.push(obstacle);
        }
    }

    createFinishGate() {
        // Créer une porte de fin avec des effets visuels améliorés
        const gateMaterials = this.createEnhancedGateMaterials();
        
        // Créer les piliers avec des effets
        for (let y = 0; y < 4; y++) {
            this.createGatePillar(-2, y, 0, gateMaterials);
            this.createGatePillar(2, y, 0, gateMaterials);
        }

        // Créer le linteau avec des effets
        for (let x = -2; x <= 2; x++) {
            this.createGateLintel(x, 4, 0, gateMaterials);
        }

        // Ajouter des effets de particules pour la porte
        this.addGateParticles();
    }

    createGatePillar(x, y, z, materials) {
        const pillar = BABYLON.MeshBuilder.CreateBox("pillar_" + x + "_" + y, {
            size: 1
        }, this.scene);
        
        pillar.position = new BABYLON.Vector3(x, y, z);
        pillar.material = materials[Math.floor(Math.random() * materials.length)];
        
        // Ajouter des effets de brillance
        pillar.material.specularColor = new BABYLON.Color3(0.8, 0.8, 0.8);
        pillar.material.specularPower = 256;
        
        // Ajouter un effet de fresnel
        pillar.material.emissiveColor = new BABYLON.Color3(0.5, 0.4, 0);
        pillar.material.useEmissiveAsIllumination = true;
        
        return pillar;
    }

    createGateLintel(x, y, z, materials) {
        const lintel = BABYLON.MeshBuilder.CreateBox("lintel_" + x, {
            size: 1
        }, this.scene);
        
        lintel.position = new BABYLON.Vector3(x, y, z);
        lintel.material = materials[Math.floor(Math.random() * materials.length)];
        
        // Ajouter des effets de brillance
        lintel.material.specularColor = new BABYLON.Color3(0.8, 0.8, 0.8);
        lintel.material.specularPower = 256;
        
        // Ajouter un effet de fresnel
        lintel.material.emissiveColor = new BABYLON.Color3(0.5, 0.4, 0);
        lintel.material.useEmissiveAsIllumination = true;
        
        return lintel;
    }

    addGateParticles() {
        const particles = new BABYLON.ParticleSystem("gateParticles", 200, this.scene);
        particles.particleTexture = new BABYLON.Texture("textures/sparkle.png", this.scene);
        particles.emitter = new BABYLON.Vector3(0, 2, 0);
        particles.minEmitBox = new BABYLON.Vector3(-2, 0, -0.5);
        particles.maxEmitBox = new BABYLON.Vector3(2, 4, 0.5);
        particles.color1 = new BABYLON.Color4(1, 0.8, 0, 1);
        particles.color2 = new BABYLON.Color4(1, 1, 0.5, 1);
        particles.colorDead = new BABYLON.Color4(0, 0, 0, 0);
        particles.minSize = 0.1;
        particles.maxSize = 0.3;
        particles.minLifeTime = 0.3;
        particles.maxLifeTime = 1.5;
        particles.emitRate = 20;
        particles.gravity = new BABYLON.Vector3(0, 0.1, 0);
        particles.start();
    }

    createEnhancedGateMaterials() {
        const materials = [];
        const baseColors = [
            new BABYLON.Color3(1.0, 0.8, 0.0),
            new BABYLON.Color3(0.9, 0.7, 0.0),
            new BABYLON.Color3(1.0, 0.9, 0.2),
            new BABYLON.Color3(0.8, 0.6, 0.0)
        ];

        baseColors.forEach((baseColor, index) => {
            const material = new BABYLON.StandardMaterial("gateMaterial_" + index, this.scene);
            material.diffuseColor = baseColor;
            
            // Effet lumineux amélioré
            material.emissiveColor = baseColor.scale(0.5);
            material.useEmissiveAsIllumination = true;
            
            // Ajouter des variations de texture
            const noise = Math.random() * 0.1;
            material.diffuseColor.r += noise;
            material.diffuseColor.g += noise;
            material.diffuseColor.b += noise;
            
            // Texture métallique améliorée
            material.specularColor = new BABYLON.Color3(0.8, 0.8, 0.8);
            material.specularPower = 256;
            
            materials.push(material);
        });

        return materials;
    }

    createMaterial() {
        const material = new BABYLON.StandardMaterial("terrainMaterial", this.scene);
        material.diffuseColor = new BABYLON.Color3(0.2, 0.8, 0.2); // Vert pour l'herbe
        material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        material.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        return material;
    }
}

// 导出Terrain类
export default Terrain; 