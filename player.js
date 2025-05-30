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
        this.game = scene.game;
        
        // Paramètres de base optimisés
        this.moveSpeed = 0.12;        // Vitesse réduite pour plus de contrôle
        this.jumpForce = 0.25;        // Force de saut ajustée
        this.gravity = 0.015;         // Gravité augmentée
        this.isJumping = false;
        this.playerRotation = 0;
        this.cameraRotation = 0;      // Ajout de la rotation verticale de la caméra
        this.playerVelocity = new BABYLON.Vector3(0, 0, 0);
        this.keys = {};
        this.isPointerLocked = false;
        this.eyeHeight = 1.7;
        this.isOnPlatform = false;
        this.isFirstPerson = true;
        this.cameraHeight = 3;
        this.cameraDistance = 8;
        this.isMoving = false;
        this.lastJumpTime = 0;        // Pour éviter le spam de saut
        this.jumpCooldown = 500;      // Cooldown de 500ms entre les sauts
        this.maxCameraAngle = Math.PI / 3; // Limite de 60 degrés pour la caméra verticale

        // Initialisation de la position
        this.position = position || new BABYLON.Vector3(0, 1, 0);
        
        // Création du mesh de base
        this.mesh = new BABYLON.TransformNode("player", scene);
        this.mesh.position = this.position;
        
        // Création du modèle Minecraft
        this.createMinecraftModel();
        
        // Création de la caméra optimisée
        this.setupCamera();

        // Initialisation des contrôles
        this.initializeControls();
    }

    createMinecraftModel() {
        // Matériau du corps
        const bodyMaterial = new BABYLON.StandardMaterial("bodyMaterial", this.scene);
        bodyMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.4, 0.8);

        // Corps
        const body = BABYLON.MeshBuilder.CreateBox("body", {
            height: 1.2,
            width: 0.6,
            depth: 0.4
        }, this.scene);
        body.material = bodyMaterial;
        body.position = new BABYLON.Vector3(0, 0.6, 0);
        body.parent = this.mesh;

        // Tête
        const headMaterial = new BABYLON.StandardMaterial("headMaterial", this.scene);
        headMaterial.diffuseColor = new BABYLON.Color3(0.9, 0.75, 0.65);

        const head = BABYLON.MeshBuilder.CreateBox("head", {
            size: 0.4
        }, this.scene);
        head.material = headMaterial;
        head.position = new BABYLON.Vector3(0, 1.4, 0);
        head.parent = this.mesh;

        // Bras
        const armMaterial = new BABYLON.StandardMaterial("armMaterial", this.scene);
        armMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.4, 0.8);

        const leftArm = BABYLON.MeshBuilder.CreateBox("leftArm", {
            height: 0.8,
            width: 0.3,
            depth: 0.3
        }, this.scene);
        leftArm.material = armMaterial;
        leftArm.position = new BABYLON.Vector3(-0.45, 0.8, 0);
        leftArm.parent = this.mesh;

        const rightArm = BABYLON.MeshBuilder.CreateBox("rightArm", {
            height: 0.8,
            width: 0.3,
            depth: 0.3
        }, this.scene);
        rightArm.material = armMaterial;
        rightArm.position = new BABYLON.Vector3(0.45, 0.8, 0);
        rightArm.parent = this.mesh;

        // Jambes
        const legMaterial = new BABYLON.StandardMaterial("legMaterial", this.scene);
        legMaterial.diffuseColor = new BABYLON.Color3(0.1, 0.2, 0.4);

        const leftLeg = BABYLON.MeshBuilder.CreateBox("leftLeg", {
            height: 0.8,
            width: 0.3,
            depth: 0.3
        }, this.scene);
        leftLeg.material = legMaterial;
        leftLeg.position = new BABYLON.Vector3(-0.2, 0, 0);
        leftLeg.parent = this.mesh;

        const rightLeg = BABYLON.MeshBuilder.CreateBox("rightLeg", {
            height: 0.8,
            width: 0.3,
            depth: 0.3
        }, this.scene);
        rightLeg.material = legMaterial;
        rightLeg.position = new BABYLON.Vector3(0.2, 0, 0);
        rightLeg.parent = this.mesh;

        // Stocker les références pour l'animation
        this.bodyParts = {
            body: body,
            head: head,
            leftArm: leftArm,
            rightArm: rightArm,
            leftLeg: leftLeg,
            rightLeg: rightLeg
        };
    }

    setupCamera() {
        this.camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(0, this.eyeHeight, 0), this.scene);
        this.camera.setTarget(new BABYLON.Vector3(0, this.eyeHeight, 1));
        this.camera.attachControl(this.scene.getEngine().getRenderingCanvas(), true);
        this.camera.speed = 0.4;                  // Vitesse réduite
        this.camera.angularSensibility = 2000;    // Sensibilité augmentée
        this.camera.minZ = 0.1;                  // Distance minimale augmentée
        this.camera.checkCollisions = true;
        this.camera.applyGravity = true;
        this.camera.ellipsoid = new BABYLON.Vector3(0.5, 0.9, 0.5);  // Ellipsoïde ajusté
        this.camera.ellipsoidOffset = new BABYLON.Vector3(0, 0.5, 0);
    }

    initializeControls() {
        const canvas = this.scene.getEngine().getRenderingCanvas();

        // Contrôles clavier optimisés
        window.addEventListener("keydown", (evt) => {
            const key = evt.key.toLowerCase();
            this.keys[key] = true;
            
            // Gestion du saut avec cooldown
            if (key === " " && !this.isJumping && Date.now() - this.lastJumpTime > this.jumpCooldown) {
                this.playerVelocity.y = this.jumpForce;
                this.isJumping = true;
                this.lastJumpTime = Date.now();
            }
        });
        
        window.addEventListener("keyup", (evt) => {
            this.keys[evt.key.toLowerCase()] = false;
        });

        // Contrôles souris optimisés
        canvas.addEventListener("click", () => {
            if (!this.isPointerLocked) {
                canvas.requestPointerLock = canvas.requestPointerLock ||
                                          canvas.mozRequestPointerLock ||
                                          canvas.webkitRequestPointerLock;
                canvas.requestPointerLock();
            }
        });

        // Gestion du verrouillage du pointeur améliorée
        document.addEventListener("pointerlockchange", () => {
            this.isPointerLocked = document.pointerLockElement === canvas;
            if (!this.isPointerLocked) {
                this.playerRotation = 0;
                this.cameraRotation = 0;
                this.mesh.rotation.y = 0;
            }
        });

        // Gestion du mouvement de la souris optimisée
        this.scene.onPointerMove = (evt) => {
            if (this.isPointerLocked) {
                const sensitivity = 0.003;
                // Inversion de la direction horizontale
                this.playerRotation -= evt.movementX * sensitivity;
                // Ajout du contrôle vertical (inversé pour correspondre au mouvement naturel)
                this.cameraRotation += evt.movementY * sensitivity;
                // Limitation de l'angle vertical
                this.cameraRotation = Math.max(-this.maxCameraAngle, Math.min(this.maxCameraAngle, this.cameraRotation));
                this.mesh.rotation.y = this.playerRotation;
            }
        };

        // Boucle de jeu optimisée
        this.scene.registerBeforeRender(() => this.update());
    }

    update() {
        if (!this.isPointerLocked) return;

        // Calcul de la direction optimisé
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
        
        // Réinitialisation de la vitesse horizontale
        this.playerVelocity.x = 0;
        this.playerVelocity.z = 0;
        this.isMoving = false;

        // Gestion du mouvement optimisée avec ZQSD inversé
        if (this.keys["s"]) {  // S pour avancer
            this.playerVelocity.addInPlace(forward.scale(this.moveSpeed));
            this.isMoving = true;
        }
        if (this.keys["z"]) {  // Z pour reculer
            this.playerVelocity.addInPlace(forward.scale(-this.moveSpeed));
            this.isMoving = true;
        }
        if (this.keys["q"]) {
            this.playerVelocity.addInPlace(right.scale(-this.moveSpeed));
            this.isMoving = true;
        }
        if (this.keys["d"]) {
            this.playerVelocity.addInPlace(right.scale(this.moveSpeed));
            this.isMoving = true;
        }

        // Application de la gravité optimisée
        if (!this.isOnPlatform) {
            this.playerVelocity.y -= this.gravity;
        }

        // Mise à jour de la position avec limite de vitesse
        const maxSpeed = 0.3;
        if (this.playerVelocity.length() > maxSpeed) {
            this.playerVelocity.normalize().scaleInPlace(maxSpeed);
        }
        
        this.mesh.position.addInPlace(this.playerVelocity);
        
        // Collision avec le sol améliorée
        if (this.mesh.position.y <= 1) {
            this.mesh.position.y = 1;
            this.playerVelocity.y = 0;
            this.isJumping = false;
            this.isOnPlatform = false;
        }

        // Animation de marche optimisée
        if (this.isMoving && this.bodyParts) {
            const time = this.scene.getEngine().getDeltaTime() / 1000;
            const walkSpeed = 8;
            const walkAmplitude = 0.15;

            if (this.bodyParts.leftArm && this.bodyParts.rightArm) {
                this.bodyParts.leftArm.rotation.x = Math.sin(time * walkSpeed) * walkAmplitude;
                this.bodyParts.rightArm.rotation.x = -Math.sin(time * walkSpeed) * walkAmplitude;
            }

            if (this.bodyParts.leftLeg && this.bodyParts.rightLeg) {
                this.bodyParts.leftLeg.rotation.x = -Math.sin(time * walkSpeed) * walkAmplitude;
                this.bodyParts.rightLeg.rotation.x = Math.sin(time * walkSpeed) * walkAmplitude;
            }
        } else if (this.bodyParts) {
            // Réinitialisation des animations
            if (this.bodyParts.leftArm) this.bodyParts.leftArm.rotation.x = 0;
            if (this.bodyParts.rightArm) this.bodyParts.rightArm.rotation.x = 0;
            if (this.bodyParts.leftLeg) this.bodyParts.leftLeg.rotation.x = 0;
            if (this.bodyParts.rightLeg) this.bodyParts.rightLeg.rotation.x = 0;
        }

        // Mise à jour de la caméra optimisée
        this.updateCamera();
    }

    updateCamera() {
        // Calcul de la position de la caméra avec rotation verticale
        const cameraOffset = new BABYLON.Vector3(
            Math.sin(this.playerRotation) * this.cameraDistance,
            this.cameraHeight + Math.sin(this.cameraRotation) * this.cameraDistance,
            Math.cos(this.playerRotation) * this.cameraDistance
        );
        
        this.camera.position = this.mesh.position.add(cameraOffset);
        
        // Calcul de la cible de la caméra avec rotation verticale
        const target = new BABYLON.Vector3(
            this.mesh.position.x + Math.sin(this.playerRotation) * Math.cos(this.cameraRotation),
            this.mesh.position.y + this.eyeHeight + Math.sin(this.cameraRotation),
            this.mesh.position.z + Math.cos(this.playerRotation) * Math.cos(this.cameraRotation)
        );
        this.camera.setTarget(target);
    }

    setOnPlatform(isOnPlatform) {
        this.isOnPlatform = isOnPlatform;
        if (isOnPlatform) {
            this.isJumping = false;
            this.playerVelocity.y = 0;
        }
    }
}

// 导出Player类
export default Player; 