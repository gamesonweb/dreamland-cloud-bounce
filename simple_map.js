/**
 * 探险地图
 * 一个包含各种地形和装饰物的探险关卡
 */
class SimpleMap {
    constructor(scene) {
        this.scene = scene;
        this.platforms = [];
        this.decorations = [];
    }

    create() {
        // 创建大型基础地面
        this.createGround();

        // 创建主路径平台
        this.createMainPath();

        // 创建装饰物
        this.createDecorations();

        // 创建终点门户
        this.createFinishGate();
    }

    createGround() {
        // 创建一个大型的基础地面
        const ground = BABYLON.MeshBuilder.CreateGround("ground", {
            width: 200,
            height: 200,
            subdivisions: 20
        }, this.scene);

        // 添加地面元数据
        ground.metadata = {
            ground: true,
            isMoving: false
        };

        const groundMaterial = new BABYLON.StandardMaterial("groundMat", this.scene);
        groundMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.5, 0.2);
        ground.material = groundMaterial;

        ground.physicsImpostor = new BABYLON.PhysicsImpostor(
            ground,
            BABYLON.PhysicsImpostor.BoxImpostor,
            { mass: 0, restitution: 0.9, friction: 0.5 },
            this.scene
        );

        this.platforms.push(ground);
    }

    createMainPath() {
        // 创建一系列浮动平台，形成主要路径
        const platforms = [
            { x: 0, y: 3, z: 0, size: 6 },      // 起始平台更大
            { x: 8, y: 5, z: 5, size: 5 },      // 第二平台
            { x: -5, y: 7, z: 10, size: 5 },    // 第三平台
            { x: 10, y: 9, z: 15, size: 5 },    // 第四平台
            { x: -8, y: 11, z: 20, size: 5 },   // 第五平台
            { x: 5, y: 13, z: 25, size: 5 },    // 第六平台
            { x: 0, y: 15, z: 30, size: 7 }     // 终点平台更大
        ];

        platforms.forEach((p, index) => {
            // 创建平台的父节点（用于移动）
            const platformRoot = new BABYLON.TransformNode("platformRoot" + index, this.scene);
            platformRoot.position = new BABYLON.Vector3(p.x, p.y, p.z);

            // 创建实际的平台
            const platform = BABYLON.MeshBuilder.CreateBox("platform" + index, {
                width: p.size,
                height: 1,
                depth: p.size
            }, this.scene);

            // 添加平台元数据
            platform.metadata = {
                ground: true,
                isMoving: true
            };

            // 将平台设置为父节点的子节点
            platform.parent = platformRoot;
            platform.position = BABYLON.Vector3.Zero(); // 相对于父节点的位置

            const material = new BABYLON.StandardMaterial("platformMat" + index, this.scene);
            if (index === platforms.length - 1) {
                material.diffuseColor = new BABYLON.Color3(0.2, 0.8, 0.2);
            } else {
                const t = index / (platforms.length - 1);
                material.diffuseColor = new BABYLON.Color3(0.5 + t * 0.3, 0.7, 0.8 - t * 0.3);
            }
            platform.material = material;

            // 设置物理属性
            platform.physicsImpostor = new BABYLON.PhysicsImpostor(
                platform,
                BABYLON.PhysicsImpostor.BoxImpostor,
                { 
                    mass: 0,
                    restitution: 0.1,
                    friction: 0.8
                },
                this.scene
            );

            // 添加碰撞检测
            platform.checkCollisions = true;

            // 添加平台到数组
            this.platforms.push(platform);

            // 创建平台的动画
            const amplitude = 1; // 移动幅度
            const speed = 0.001; // 移动速度
            let time = index * Math.PI / 2; // 错开每个平台的相位

            // 注册每帧更新
            this.scene.registerBeforeRender(() => {
                // 使用正弦函数创建上下移动
                platformRoot.position.y = p.y + Math.sin(time) * amplitude;
                time += speed;
            });
        });

        // 辅助平台也使用相同的逻辑
        const auxiliaryPlatforms = [
            { x: 4, y: 4, z: 2.5, size: 3 },
            { x: -7, y: 6, z: 7.5, size: 3 },
            { x: 2, y: 8, z: 12.5, size: 3 },
            { x: -3, y: 10, z: 17.5, size: 3 },
            { x: 2, y: 12, z: 22.5, size: 3 },
            { x: -2, y: 14, z: 27.5, size: 3 }
        ];

        auxiliaryPlatforms.forEach((p, index) => {
            const platformRoot = new BABYLON.TransformNode("auxPlatformRoot" + index, this.scene);
            platformRoot.position = new BABYLON.Vector3(p.x, p.y, p.z);

            const platform = BABYLON.MeshBuilder.CreateBox("auxPlatform" + index, {
                width: p.size,
                height: 1,
                depth: p.size
            }, this.scene);

            // 添加平台元数据
            platform.metadata = {
                ground: true,
                isMoving: true
            };

            platform.parent = platformRoot;
            platform.position = BABYLON.Vector3.Zero();

            const material = new BABYLON.StandardMaterial("auxPlatformMat" + index, this.scene);
            material.diffuseColor = new BABYLON.Color3(0.6, 0.6, 0.8);
            platform.material = material;

            platform.physicsImpostor = new BABYLON.PhysicsImpostor(
                platform,
                BABYLON.PhysicsImpostor.BoxImpostor,
                { 
                    mass: 0,
                    restitution: 0.1,
                    friction: 0.8
                },
                this.scene
            );

            platform.checkCollisions = true;
            this.platforms.push(platform);

            // 创建平台的动画，相位略有不同
            const amplitude = 0.8; // 稍微小一点的幅度
            const speed = 0.001;
            let time = (index + platforms.length) * Math.PI / 3;

            this.scene.registerBeforeRender(() => {
                platformRoot.position.y = p.y + Math.sin(time) * amplitude;
                time += speed;
            });
        });
    }

    createDecorations() {
        // 创建装饰性云朵
        for (let i = 0; i < 10; i++) { // 减少云的数量，因为每朵云现在由多个部分组成
            const cloud = this.createCloud(
                Math.random() * 100 - 50,  // x
                15 + Math.random() * 20,   // y，稍微提高云的位置
                Math.random() * 100 - 50   // z
            );
            this.decorations.push(cloud);
        }

        // 创建漂浮的水晶
        for (let i = 0; i < 10; i++) {
            const crystal = this.createCrystal(
                Math.random() * 80 - 40,
                5 + Math.random() * 15,
                Math.random() * 80 - 40
            );
            this.decorations.push(crystal);
        }
    }

    createCloud(x, y, z) {
        // 创建一个容器节点来组合所有云朵部分
        const cloudContainer = new BABYLON.TransformNode("cloudContainer", this.scene);
        cloudContainer.position = new BABYLON.Vector3(x, y, z);

        // 创建云朵材质
        const cloudMaterial = new BABYLON.StandardMaterial("cloudMat", this.scene);
        cloudMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1);
        cloudMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
        cloudMaterial.emissiveColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        cloudMaterial.alpha = 0.8;

        // 创建主体部分
        const mainSphere = BABYLON.MeshBuilder.CreateSphere("cloudMain", {
            diameter: 4 + Math.random() * 2,
            segments: 16
        }, this.scene);
        mainSphere.material = cloudMaterial;
        mainSphere.parent = cloudContainer;

        // 添加多个小球体来创建蓬松的效果
        const numPuffs = 6 + Math.floor(Math.random() * 4);
        for (let i = 0; i < numPuffs; i++) {
            const puff = BABYLON.MeshBuilder.CreateSphere("cloudPuff", {
                diameter: 2 + Math.random() * 2,
                segments: 16
            }, this.scene);

            // 随机位置偏移
            const angle = (i / numPuffs) * Math.PI * 2;
            const radius = 1.5 + Math.random();
            puff.position = new BABYLON.Vector3(
                Math.cos(angle) * radius,
                (Math.random() - 0.5) * 1.5,
                Math.sin(angle) * radius
            );

            puff.material = cloudMaterial;
            puff.parent = cloudContainer;
        }

        // 添加轻微的动画
        let time = Math.random() * Math.PI * 2;
        this.scene.registerBeforeRender(() => {
            time += 0.0005;
            cloudContainer.position.y = y + Math.sin(time) * 0.5;
            cloudContainer.rotation.y += 0.0002;
        });

        return cloudContainer;
    }

    createCrystal(x, y, z) {
        const crystal = BABYLON.MeshBuilder.CreatePolyhedron("crystal", {
            type: 3, // 八面体
            size: 1
        }, this.scene);

        crystal.position = new BABYLON.Vector3(x, y, z);
        crystal.rotation.y = Math.random() * Math.PI;

        const material = new BABYLON.StandardMaterial("crystalMat", this.scene);
        material.diffuseColor = new BABYLON.Color3(0.4, 0.8, 1);
        material.emissiveColor = new BABYLON.Color3(0.1, 0.3, 0.5);
        material.alpha = 0.8;
        crystal.material = material;

        // 添加旋转动画
        this.scene.registerBeforeRender(() => {
            crystal.rotation.y += 0.01;
        });

        return crystal;
    }

    createFinishGate() {
        // 创建一个发光的终点门户
        const gate = BABYLON.MeshBuilder.CreateTorus("finishGate", {
            diameter: 5,
            thickness: 0.5,
            tessellation: 32
        }, this.scene);

        gate.position = new BABYLON.Vector3(0, 17, 30);
        gate.rotation.x = Math.PI / 2;

        const material = new BABYLON.StandardMaterial("gateMat", this.scene);
        material.emissiveColor = new BABYLON.Color3(0, 1, 0);
        material.alpha = 0.8;
        gate.material = material;

        // 添加粒子效果
        const particleSystem = new BABYLON.ParticleSystem("gateParticles", 2000, this.scene);
        particleSystem.particleTexture = new BABYLON.Texture("textures/flare.png", this.scene);
        particleSystem.emitter = gate;
        particleSystem.minEmitBox = new BABYLON.Vector3(-1, 0, -1);
        particleSystem.maxEmitBox = new BABYLON.Vector3(1, 0, 1);
        particleSystem.color1 = new BABYLON.Color4(0.4, 1, 0.4, 1.0);
        particleSystem.color2 = new BABYLON.Color4(0.2, 1, 0.2, 1.0);
        particleSystem.colorDead = new BABYLON.Color4(0, 0, 0.2, 0.0);
        particleSystem.minSize = 0.1;
        particleSystem.maxSize = 0.5;
        particleSystem.minLifeTime = 0.3;
        particleSystem.maxLifeTime = 1.5;
        particleSystem.emitRate = 100;
        particleSystem.start();

        this.decorations.push(gate);
    }

    dispose() {
        // 清理所有物体
        this.platforms.forEach(platform => {
            if (platform.physicsImpostor) {
                platform.physicsImpostor.dispose();
            }
            platform.dispose();
        });
        this.platforms = [];

        this.decorations.forEach(decoration => {
            decoration.dispose();
        });
        this.decorations = [];
    }
}

export default SimpleMap; 