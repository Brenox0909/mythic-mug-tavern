import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// --- CLASSE NPC STYLIZED ---
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
        this.lookAtTarget();
    }

    lookAtTarget() {
        const lookPos = this.target.clone();
        lookPos.y = this.group.position.y;
        this.group.lookAt(lookPos);
    }

    createMesh() {
        const createStylizedMat = (color) => new THREE.MeshToonMaterial({
            color: color,
        });

        if (this.type === 'minotaur') {
            // Silhueta Exagerada: Tronco massivo, pernas finas
            const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.8, 1.0, 8, 16), createStylizedMat(0x5d4037));
            body.position.y = 1.2;
            this.group.add(body);

            const headGroup = new THREE.Group();
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 16), createStylizedMat(0x5d4037));
            const muzzle = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 0.3, 4, 8), createStylizedMat(0x5d4037));
            muzzle.position.set(0, -0.1, 0.35);
            muzzle.rotation.x = Math.PI / 2;
            headGroup.add(head, muzzle);

            // Chifres Longos e Stylized
            [-1, 1].forEach(side => {
                const horn = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.12, 12, 24, Math.PI), createStylizedMat(0xf5f5dc));
                horn.position.set(side * 0.45, 0.4, 0.1);
                horn.rotation.z = side * -Math.PI / 4;
                headGroup.add(horn);
            });

            headGroup.position.set(0, 2.3, 0);
            this.group.add(headGroup);

            // Luz mágica de presença
            const npcLight = new THREE.PointLight(0xff4400, 2, 5);
            npcLight.position.set(0, 2, 1);
            this.group.add(npcLight);

        } else if (this.type === 'witch') {
            const dress = new THREE.Mesh(new THREE.ConeGeometry(0.6, 2.2, 16), createStylizedMat(0x4a148c));
            dress.position.y = 1.1;
            this.group.add(dress);

            const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 24, 24), createStylizedMat(0xffdbac));
            head.position.y = 2.2;
            this.group.add(head);

            const hat = new THREE.Group();
            const brim = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.04, 12, 32), createStylizedMat(0x111111));
            brim.rotation.x = Math.PI / 2;
            const cone = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.4, 16), createStylizedMat(0x111111));
            cone.position.y = 0.7;
            cone.rotation.z = -0.3;
            hat.add(brim, cone);
            hat.position.y = 2.5;
            this.group.add(hat);

            const npcLight = new THREE.PointLight(0xaa44ff, 5, 6);
            npcLight.position.set(0, 2, 1);
            this.group.add(npcLight);

        } else if (this.type === 'skeleton') {
            const skull = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 16), createStylizedMat(0xe0e0d0));
            skull.position.y = 2.2;
            this.group.add(skull);
            const spine = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 1.0, 4, 8), createStylizedMat(0xe0e0d0));
            spine.position.y = 1.3;
            this.group.add(spine);
            const eyeMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
            [-0.15, 0.15].forEach(x => {
                const e = new THREE.Mesh(new THREE.SphereGeometry(0.08), eyeMat);
                e.position.set(x, 2.25, 0.35);
                this.group.add(e);
            });
            const npcLight = new THREE.PointLight(0x00ffff, 4, 6);
            npcLight.position.set(0, 2, 1);
            this.group.add(npcLight);
        }
    }

    update() {
        if (this.state === 'entering') {
            const dir = new THREE.Vector3().subVectors(this.target, this.group.position).normalize();
            this.group.position.addScaledVector(dir, this.speed);
            this.lookAtTarget();
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
            let reward = 100;
            if (this.type === 'witch') reward = 150;
            if (this.type === 'skeleton') reward = 80;
            return reward;
        }
        return 0;
    }
}

// --- CLASSE PRINCIPAL JOGO ---
class TavernGame {
    constructor() {
        this.gold = 500;
        this.reputation = 10;
        this.inventory = { mead: 0, meat: 0, dragon_meat: 0, potion: 0, mandrake: 0 };
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
        this.scene.background = new THREE.Color(0x050510);
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 1.7, 6);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        document.getElementById('game-container').appendChild(this.renderer.domElement);

        this.scene.add(new THREE.AmbientLight(0xffffff, 0.1));

        // Iluminação Global Stylized
        const warmLight = new THREE.PointLight(0xff7722, 40, 40);
        warmLight.position.set(0, 8, -5);
        warmLight.castShadow = true;
        this.scene.add(warmLight);

        // Rim Light Azul/Roxo Profundo
        const rimLight = new THREE.DirectionalLight(0x4422ff, 1.5);
        rimLight.position.set(-10, 5, 10);
        this.scene.add(rimLight);

        this.scene.fog = new THREE.FogExp2(0x050510, 0.04);
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
        const createToon = (c) => new THREE.MeshToonMaterial({ color: c });
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), new THREE.MeshStandardMaterial({ color: 0x0a0a0a }));
        floor.rotation.x = -Math.PI / 2; this.scene.add(floor);

        // --- BALCÃO STYLIZED ---
        const counterGroup = new THREE.Group();
        const base = new THREE.Mesh(new THREE.CapsuleGeometry(3.6, 0.2, 8, 24), createToon(0x2d1b0f));
        base.rotation.z = Math.PI / 2;
        base.position.set(0, 0.5, 0);
        const top = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.25, 1.8), createToon(0x4a3728));
        top.position.set(0, 1.15, 0);

        // Wood Crack high-poly
        const crack = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.8, 0.2), createToon(0x1a0f08));
        crack.position.set(1.5, 0.5, 0.7);
        crack.rotation.z = 0.2;

        counterGroup.add(base, top, crack);
        counterGroup.position.set(0, 0, -2);
        this.scene.add(counterGroup);
        this.counter = base;

        // --- MÓVEIS CHANFRADOS ---
        this.tables = [
            new THREE.Vector3(-5, 0, 3), new THREE.Vector3(5, 0, 3),
            new THREE.Vector3(-5, 0, 8), new THREE.Vector3(5, 0, 8)
        ];
        this.tables.forEach(pos => {
            const table = new THREE.Group();
            const topGeo = new THREE.CylinderGeometry(1.3, 1.3, 0.2, 32);
            const top = new THREE.Mesh(topGeo, createToon(0x3d2b1f));
            top.position.y = 0.9;
            const bevel = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.05, 12, 32), createToon(0x5e4b3f));
            bevel.rotation.x = Math.PI / 2;
            bevel.position.y = 1.0;
            const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.7, 4, 12), createToon(0x2d1b0f));
            leg.position.y = 0.45;
            table.add(top, bevel, leg);
            table.position.set(pos.x, 0, pos.z);
            this.scene.add(table);

            [-1.5, 1.5].forEach(ox => {
                const stool = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.3, 8, 16), createToon(0x4a3728));
                stool.position.set(pos.x + ox, 0.25, pos.z);
                this.scene.add(stool);
            });
        });

        // --- PAREDES E ESTRUTURA ---
        const wallMat = createToon(0x1a1a1a);
        const wallBack = new THREE.Mesh(new THREE.BoxGeometry(20, 10, 1), wallMat);
        wallBack.position.set(0, 5, -10); this.scene.add(wallBack);

        const beamMat = createToon(0x2d1b0f);
        for (let x = -9.5; x <= 9.5; x += 4.75) {
            const beam = new THREE.Mesh(new THREE.BoxGeometry(0.4, 10, 0.4), beamMat);
            beam.position.set(x, 5, -9.4);
            this.scene.add(beam);
        }

        // Zona de Coleta Vibrant
        this.deliveryZone = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.1, 32), new THREE.MeshToonMaterial({ color: 0xdd44ff, emissive: 0x4422ff }));
        this.deliveryZone.position.set(-7, 0.05, -3);
        this.scene.add(this.deliveryZone);

        // Lareira High-Contrast
        const fireplace = new THREE.Group();
        const mantel = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 1), createToon(0x333333));
        fireplace.add(mantel);
        fireplace.position.set(0, 1.5, -9.5);
        this.scene.add(fireplace);
        const fireL = new THREE.PointLight(0xff5500, 30, 20);
        fireL.position.set(0, 1, -8.5);
        this.scene.add(fireL);

        const checkSpawn = () => {
            if (this.isRunning) setTimeout(() => this.spawnNPC(), 3000);
            else setTimeout(checkSpawn, 500);
        }
        checkSpawn();
    }

    spawnNPC() {
        const targetTable = this.tables[Math.floor(Math.random() * this.tables.length)].clone();
        targetTable.z += 1.2;
        const types = ['minotaur', 'witch', 'skeleton'];
        const type = types[Math.floor(Math.random() * types.length)];
        const npc = new NPC(this.scene, type, targetTable);
        this.npcs.push(npc);
        this.showMessage(`Um ${type} entrou!`);
    }

    toggleGrimoire() {
        const o = document.getElementById('grimoire-overlay');
        if (o.classList.contains('hidden')) { o.classList.remove('hidden'); this.controls.unlock(); }
        else { o.classList.add('hidden'); this.controls.lock(); }
    }

    buyItem(item, cost) {
        if (this.gold >= cost) {
            this.gold -= cost;
            let geo, mat;
            const createHighFidelityMat = (c, shiny = 0.5) => new THREE.MeshPhongMaterial({ color: c, shininess: shiny * 100, flatShading: false });

            if (item === 'mead') {
                // Caneca Metal High-Fidelity
                geo = new THREE.CylinderGeometry(0.2, 0.18, 0.5, 32);
                mat = createHighFidelityMat(0xaaaaaa, 0.9); // Metal Brilhante
            } else if (item === 'potion') {
                geo = new THREE.SphereGeometry(0.2, 32, 32);
                mat = new THREE.MeshToonMaterial({ color: 0xff00ff, emissive: 0xff00ff, emissiveIntensity: 1 });
            } else if (item === 'dragon_meat') {
                geo = new THREE.BoxGeometry(0.5, 0.3, 0.6);
                mat = createHighFidelityMat(0x800000, 0.1);
            } else if (item === 'mandrake') {
                geo = new THREE.CapsuleGeometry(0.1, 0.4, 8, 16);
                mat = createHighFidelityMat(0x447722, 0.2);
            } else {
                geo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
                mat = createHighFidelityMat(0xffd700, 0.8);
            }
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(this.deliveryZone.position.x + (Math.random() - 0.5), 0.5, this.deliveryZone.position.z + (Math.random() - 0.5));
            mesh.userData = { type: item, clickable: true };
            this.scene.add(mesh);
            this.updateUI();
            this.showMessage("Item Fabricado!");
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
                const amount = { mead: 5, meat: 3, dragon_meat: 1, potion: 2, mandrake: 4 };
                this.inventory[obj.userData.type] += (amount[obj.userData.type] || 1);
                this.scene.remove(obj);
                this.updateUI();
                this.showMessage("Coletado!");
                return;
            }
            let current = obj;
            while (current) {
                const npc = this.npcs.find(n => n.group === current);
                if (npc && npc.state === 'waiting') {
                    let itemNeeded = 'mead';
                    if (npc.type === 'witch') itemNeeded = 'potion';
                    if (npc.type === 'skeleton') itemNeeded = 'mandrake';
                    if (this.inventory[itemNeeded] > 0) {
                        this.inventory[itemNeeded]--;
                        this.gold += npc.fulfillOrder();
                        this.updateUI();
                        this.showMessage(`Cliente servido!`);
                    } else { this.showMessage(`Falta o item necessário!`); }
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
        document.getElementById('slot-dragon-meat').innerHTML = this.inventory.dragon_meat > 0 ? `🐉<small>${this.inventory.dragon_meat}</small>` : '';
        document.getElementById('slot-potion').innerHTML = this.inventory.potion > 0 ? `🧪<small>${this.inventory.potion}</small>` : '';
        document.getElementById('slot-mandrake').innerHTML = this.inventory.mandrake > 0 ? `🌿<small>${this.inventory.mandrake}</small>` : '';
    }

    showMessage(txt) {
        const m = document.getElementById('game-message');
        m.innerText = txt;
        m.style.display = 'block';
        m.style.animation = 'none';
        m.offsetHeight;
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
