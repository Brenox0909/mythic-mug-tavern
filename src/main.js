import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// --- CLASSE NPC ---
class NPC {
    constructor(scene, type, targetPosition) {
        this.scene = scene;
        this.type = type;
        this.state = 'entering';
        this.group = new THREE.Group();
        this.isDone = false;
        this.createMesh();
        this.scene.add(this.group);
        this.group.position.set(0, 0, 15);
        this.target = targetPosition;
        this.speed = 0.05;
    }

    createMesh() {
        if (this.type === 'minotaur') {
            const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.8, 1), new THREE.MeshStandardMaterial({ color: 0x5d4037 }));
            body.position.y = 0.9;
            this.group.add(body);
            const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), new THREE.MeshStandardMaterial({ color: 0x5d4037 }));
            head.position.y = 2.1;
            this.group.add(head);
            const hornMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
            const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.5, 8), hornMat);
            hornL.position.set(-0.4, 2.5, 0.2); hornL.rotation.z = 0.6;
            this.group.add(hornL);
            const hornR = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.5, 8), hornMat);
            hornR.position.set(0.4, 2.5, 0.2); hornR.rotation.z = -0.6;
            this.group.add(hornR);
        }
    }

    update() {
        if (this.state === 'entering') {
            const dir = new THREE.Vector3().subVectors(this.target, this.group.position).normalize();
            this.group.position.addScaledVector(dir, this.speed);
            if (this.group.position.distanceTo(this.target) < 0.2) {
                this.state = 'waiting';
                const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.3), new THREE.MeshBasicMaterial({ color: 0xffff00 }));
                bubble.position.y = 3.2; bubble.name = "bubble";
                this.group.add(bubble);
            }
        } else if (this.state === 'leaving') {
            const exit = new THREE.Vector3(0, 0, 20);
            const dir = new THREE.Vector3().subVectors(exit, this.group.position).normalize();
            this.group.position.addScaledVector(dir, this.speed);
            if (this.group.position.z > 15) {
                this.scene.remove(this.group);
                this.isDone = true;
            }
        }
    }

    fulfillOrder() {
        if (this.state === 'waiting') {
            const b = this.group.getObjectByName("bubble");
            if (b) this.group.remove(b);
            this.state = 'leaving';
            return 100;
        }
        return 0;
    }
}

// --- CLASSE PRINCIPAL JOGO ---
class TavernGame {
    constructor() {
        this.gold = 500;
        this.reputation = 10;
        this.inventory = { mead: 0, meat: 0 };
        this.npcs = [];
        this.prevTime = performance.now();
        this.isRunning = false;

        this.initScene();
        this.initControls();
        this.initEnvironment();
        this.animate();
        window.game = this;
    }

    initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a1a);
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 1.7, 6);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        document.getElementById('game-container').appendChild(this.renderer.domElement);
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.4));
        const sun = new THREE.DirectionalLight(0xffd700, 1);
        sun.position.set(5, 10, 5);
        this.scene.add(sun);
    }

    initControls() {
        this.controls = new PointerLockControls(this.camera, document.body);
        const startBtn = document.getElementById('start-btn');
        const overlay = document.getElementById('start-overlay');

        startBtn.onclick = (e) => {
            e.stopPropagation();
            this.controls.lock();
            overlay.classList.add('hidden');
            this.isRunning = true;
            this.prevTime = performance.now();
        };

        this.move = { f: false, b: false, l: false, r: false };
        document.addEventListener('keydown', (e) => {
            if (!this.controls.isLocked) return;
            switch (e.code) {
                case 'KeyW': this.move.f = true; break;
                case 'KeyS': this.move.b = true; break;
                case 'KeyA': this.move.l = true; break;
                case 'KeyD': this.move.r = true; break;
                case 'KeyE': this.interact(); break;
                case 'KeyG': this.toggleGrimoire(); break;
            }
        });
        document.addEventListener('keyup', (e) => {
            switch (e.code) {
                case 'KeyW': this.move.f = false; break;
                case 'KeyS': this.move.b = false; break;
                case 'KeyA': this.move.l = false; break;
                case 'KeyD': this.move.r = false; break;
            }
        });
    }

    initEnvironment() {
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), new THREE.MeshStandardMaterial({ color: 0x1a1510 }));
        floor.rotation.x = -Math.PI / 2; this.scene.add(floor);
        this.counter = new THREE.Mesh(new THREE.BoxGeometry(6, 1.2, 1.5), new THREE.MeshStandardMaterial({ color: 0x4a3728 }));
        this.counter.position.set(0, 0.6, -2); this.scene.add(this.counter);
        this.deliveryZone = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 2), new THREE.MeshStandardMaterial({ color: 0x000000 }));
        this.deliveryZone.position.set(-5, 0.05, -1); this.scene.add(this.deliveryZone);
        const torch = new THREE.PointLight(0xff6600, 15, 15);
        torch.position.set(0, 3, -3); this.scene.add(torch);

        // Spawn inicial após um delay depois que o jogo começar
        const checkSpawn = () => {
            if (this.isRunning) setTimeout(() => this.spawnNPC(), 3000);
            else setTimeout(checkSpawn, 500);
        }
        checkSpawn();
    }

    spawnNPC() {
        const npc = new NPC(this.scene, 'minotaur', new THREE.Vector3(0, 0, 1));
        this.npcs.push(npc);
        this.showMessage("Um Minotauro entrou na taverna!");
    }

    toggleGrimoire() {
        const o = document.getElementById('grimoire-overlay');
        if (o.classList.contains('hidden')) { o.classList.remove('hidden'); this.controls.unlock(); }
        else { o.classList.add('hidden'); this.controls.lock(); }
    }

    buyItem(item, cost) {
        if (this.gold >= cost) {
            this.gold -= cost;
            const geo = item === 'mead' ? new THREE.CylinderGeometry(0.3, 0.3, 0.6) : new THREE.BoxGeometry(0.5, 0.5, 0.5);
            const mat = new THREE.MeshStandardMaterial({ color: item === 'mead' ? 0x8b4513 : 0xcd853f });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(this.deliveryZone.position.x + (Math.random() - 0.5), 0.5, this.deliveryZone.position.z + (Math.random() - 0.5));
            mesh.userData = { type: item, clickable: true };
            this.scene.add(mesh);
            this.updateUI();
            this.showMessage("Item entregue na zona de coleta!");
        } else { this.showMessage("Sem ouro!"); }
    }

    interact() {
        const ray = new THREE.Raycaster();
        ray.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        const hits = ray.intersectObjects(this.scene.children, true);
        for (const hit of hits) {
            if (hit.distance > 4) continue;
            const obj = hit.object;
            if (obj.userData.clickable) {
                this.inventory[obj.userData.type] += (obj.userData.type === 'mead' ? 5 : 3);
                this.scene.remove(obj);
                this.updateUI();
                this.showMessage("Coletado!");
                return;
            }
            let current = obj;
            while (current) {
                const npc = this.npcs.find(n => n.group === current);
                if (npc && npc.state === 'waiting') {
                    if (this.inventory.mead > 0) {
                        this.inventory.mead--;
                        this.gold += npc.fulfillOrder();
                        this.reputation += 2;
                        this.updateUI();
                        this.showMessage("Minotauro servido!");
                    } else { this.showMessage("Você precisa de Hidromel!"); }
                    return;
                }
                current = current.parent;
            }
        }
    }

    updateUI() {
        document.getElementById('gold-value').innerText = this.gold;
        document.getElementById('rep-value').innerText = this.reputation;
        document.getElementById('slot-mead').innerHTML = this.inventory.mead > 0 ? `🍺<small>${this.inventory.mead}</small>` : '';
        document.getElementById('slot-meat').innerHTML = this.inventory.meat > 0 ? `🍖<small>${this.inventory.meat}</small>` : '';
    }

    showMessage(txt) {
        const m = document.getElementById('game-message');
        m.innerText = txt;
        m.style.display = 'block';
        m.style.animation = 'none';
        m.offsetHeight; // trigger reflow
        m.style.animation = null;
        setTimeout(() => m.style.display = 'none', 3000);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        if (!this.isRunning) return;

        const time = performance.now();
        let delta = (time - this.prevTime) / 1000;
        if (delta > 0.1) delta = 0.1;
        this.prevTime = time;

        if (this.controls.isLocked) {
            const moveX = Number(this.move.r) - Number(this.move.l);
            const moveZ = Number(this.move.f) - Number(this.move.b);
            if (moveX !== 0 || moveZ !== 0) {
                const dir = new THREE.Vector3(moveX, 0, moveZ).normalize();
                this.controls.moveRight(dir.x * 5 * delta);
                this.controls.moveForward(dir.z * 5 * delta);
            }
        }

        this.npcs.forEach((n, i) => {
            n.update();
            if (n.isDone) { this.npcs.splice(i, 1); setTimeout(() => this.spawnNPC(), 5000); }
        });

        const prompt = document.getElementById('interaction-prompt');
        const ray = new THREE.Raycaster();
        ray.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        const hits = ray.intersectObjects(this.scene.children, true);
        let show = false;
        if (hits.length > 0 && hits[0].distance < 4) {
            let obj = hits[0].object;
            if (obj.userData.clickable) show = true;
            else {
                let curr = obj;
                while (curr) {
                    if (this.npcs.find(n => n.group === curr && n.state === 'waiting')) { show = true; break; }
                    curr = curr.parent;
                }
            }
        }
        prompt.style.display = show ? 'block' : 'none';

        this.renderer.render(this.scene, this.camera);
    }
}
window.onload = () => new TavernGame();
