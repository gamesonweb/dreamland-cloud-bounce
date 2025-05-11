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
        // 创建基础地面
        const ground = BABYLON.MeshBuilder.CreateGround("ground", {
            width: 100,
            height: 100
        }, this.scene);
        ground.position.y = 0;
        ground.material = this.createMaterial("grass.jpg");
        ground.metadata = { isGround: true, width: 100, height: 0.1, depth: 100 };

        // 创建螺旋上升的平台路径
        this.createSpiralPath();
        
        // 创建一些辅助平台
        this.createSupportPlatforms();
    }

    createSpiralPath() {
        // 创建一条螺旋上升的平台路径，通向终点门
        const platformCount = 15;  // 增加平台数量
        const heightIncrement = 4; // 降低每级高度增量，使路径更容易到达
        const radius = 15;        // 缩小半径，使路径更紧凑
        
        for (let i = 0; i < platformCount; i++) {
            const angle = (i / platformCount) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const y = (i + 1) * heightIncrement;
            
            // 主平台
            const platform = BABYLON.MeshBuilder.CreateBox(`platform_${i}`, {
                width: 6,         // 加宽平台
                height: 1,
                depth: 6
            }, this.scene);
            
            platform.position = new BABYLON.Vector3(x, y, z);
            platform.rotation.y = angle;
            platform.material = this.createMaterial("stone.jpg");
            platform.metadata = { width: 6, height: 1, depth: 6 };
            
            // 添加连接桥
            if (i > 0) {
                const prevAngle = ((i - 1) / platformCount) * Math.PI * 2;
                const prevX = Math.cos(prevAngle) * radius;
                const prevZ = Math.sin(prevAngle) * radius;
                const prevY = i * heightIncrement;
                
                const bridgeLength = Math.sqrt(
                    Math.pow(x - prevX, 2) + 
                    Math.pow(z - prevZ, 2)
                );
                
                const bridge = BABYLON.MeshBuilder.CreateBox(`bridge_${i}`, {
                    width: 3,     // 加宽桥
                    height: 0.5,
                    depth: bridgeLength
                }, this.scene);
                
                // 计算桥的位置和旋转
                const midX = (x + prevX) / 2;
                const midZ = (z + prevZ) / 2;
                const midY = (y + prevY) / 2;
                
                bridge.position = new BABYLON.Vector3(midX, midY, midZ);
                bridge.rotation.y = Math.atan2(z - prevZ, x - prevX);
                
                bridge.material = this.createMaterial("wood.jpg");
                bridge.metadata = { width: 3, height: 0.5, depth: bridgeLength };
            }
        }
    }

    createSupportPlatforms() {
        // 创建一些辅助平台，帮助玩家到达更高处
        const supportPlatforms = [
            { x: 10, y: 8, z: 10, size: 4 },
            { x: -8, y: 12, z: -8, size: 4 },
            { x: 5, y: 16, z: -12, size: 4 },
            { x: -10, y: 20, z: 5, size: 4 },
            { x: 12, y: 24, z: -5, size: 4 },
            { x: -5, y: 28, z: 12, size: 4 },
            { x: 8, y: 32, z: 8, size: 4 },
            { x: -12, y: 36, z: -10, size: 4 },
            { x: 0, y: 40, z: 0, size: 5 },  // 靠近终点的大平台
        ];

        supportPlatforms.forEach((platform, index) => {
            const box = BABYLON.MeshBuilder.CreateBox(`support_${index}`, {
                width: platform.size,
                height: 1,
                depth: platform.size
            }, this.scene);
            
            box.position = new BABYLON.Vector3(platform.x, platform.y, platform.z);
            box.material = this.createMaterial("stone.jpg");
            box.metadata = { 
                width: platform.size, 
                height: 1, 
                depth: platform.size 
            };
        });
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
        // 创建终点门（调整高度）
        const gateHeight = 45;  // 降低门的高度，使其更容易到达
        const gateFrame = BABYLON.MeshBuilder.CreateBox("finishGate", {
            width: 4,
            height: 6,
            depth: 1
        }, this.scene);
        
        gateFrame.position = new BABYLON.Vector3(0, gateHeight, 0);
        
        // 创建门的材质（发光效果）
        const gateMaterial = new BABYLON.StandardMaterial("gateMaterial", this.scene);
        gateMaterial.emissiveColor = new BABYLON.Color3(0.5, 0, 1);
        gateMaterial.alpha = 0.7;
        gateFrame.material = gateMaterial;
        
        // 添加粒子效果
        const particleSystem = new BABYLON.ParticleSystem("gateParticles", 2000, this.scene);
        particleSystem.particleTexture = new BABYLON.Texture("textures/flare.png", this.scene);
        particleSystem.emitter = gateFrame;
        particleSystem.minEmitBox = new BABYLON.Vector3(-2, -3, 0);
        particleSystem.maxEmitBox = new BABYLON.Vector3(2, 3, 0);
        particleSystem.color1 = new BABYLON.Color4(0.7, 0, 1.0, 1.0);
        particleSystem.color2 = new BABYLON.Color4(0.2, 0, 1.0, 1.0);
        particleSystem.colorDead = new BABYLON.Color4(0, 0, 0.2, 0.0);
        particleSystem.minSize = 0.1;
        particleSystem.maxSize = 0.5;
        particleSystem.minLifeTime = 0.3;
        particleSystem.maxLifeTime = 1.5;
        particleSystem.emitRate = 100;
        particleSystem.start();

        // 添加碰撞检测
        gateFrame.metadata = {
            isFinishGate: true,
            width: 4,
            height: 6,
            depth: 1
        };
    }

    createMaterial(textureName) {
        const material = new BABYLON.StandardMaterial(textureName, this.scene);
        material.diffuseTexture = new BABYLON.Texture(`textures/${textureName}`, this.scene);
        return material;
    }
}

// 导出Terrain类
export default Terrain; 