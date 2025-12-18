
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { LIGHT_THEMES, MAX_PHOTOS } from '../constants';
import { audioService } from '../services/audioService';

interface ThreeSceneProps {
  userTextures: any[]; // THREE.Texture[]
  isGiftOpened: boolean;
  onGiftOpen: () => void;
  magicGreeting?: string;
  gestureState: {
    rotateDir: number; // -1, 0, 1
    shouldJump: boolean;
    shouldSwitchLights: boolean;
    shouldOpenGift: boolean;
  };
}

const ThreeScene: React.FC<ThreeSceneProps> = ({ userTextures, isGiftOpened, onGiftOpen, magicGreeting, gestureState }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const treeLightsRef = useRef<THREE.InstancedMesh | null>(null);
  const snowmanRef = useRef<THREE.Group | null>(null);
  const giftGroupRef = useRef<THREE.Group | null>(null);
  const giftLidRef = useRef<THREE.Group | null>(null);
  const galleryGroupRef = useRef<THREE.Group | null>(null);
  const photoMeshesRef = useRef<THREE.Mesh[]>([]);
  const focusedPhotoRef = useRef<THREE.Mesh | null>(null);

  // Animation states
  const snowmanJumping = useRef(false);
  const snowmanJumpTime = useRef(0);
  const currentThemeIdx = useRef(0);
  const lidVelocity = useRef(new THREE.Vector3());
  const lidAngularVel = useRef(new THREE.Vector3());

  const updateLights = () => {
    if (!treeLightsRef.current) return;
    const theme = LIGHT_THEMES[currentThemeIdx.current % LIGHT_THEMES.length];
    const color = new THREE.Color();
    for (let i = 0; i < 400; i++) {
      color.setHex(theme[Math.floor(Math.random() * theme.length)]);
      color.multiplyScalar(5.0);
      treeLightsRef.current.setColorAt(i, color);
    }
    treeLightsRef.current.instanceColor!.needsUpdate = true;
  };

  const jumpSnowman = () => {
    if (snowmanJumping.current) return;
    audioService.playSound('jump');
    snowmanJumping.current = true;
    snowmanJumpTime.current = 0;
  };

  const switchLights = () => {
    audioService.playSound('switch');
    currentThemeIdx.current++;
    updateLights();
  };

  const openGift = () => {
    if (isGiftOpened) return;
    audioService.playSound('bell');
    onGiftOpen();
    lidVelocity.current.set((Math.random() - 0.5) * 2, 12, (Math.random() - 0.5) * 2);
    lidAngularVel.current.set(Math.random() * 0.3, Math.random() * 0.3, Math.random() * 0.3);
    
    // Setup Gallery inside gift box
    const textures = userTextures.length > 0 ? userTextures : createDefaultTextures();
    const count = Math.min(textures.length, MAX_PHOTOS);
    const radius = 35;
    const origin = giftGroupRef.current?.position.clone() || new THREE.Vector3();

    textures.forEach((tex, i) => {
      if (i >= count) return;
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(8, 8, 0.2),
        new THREE.MeshBasicMaterial({ map: tex })
      );
      mesh.position.copy(origin);
      mesh.scale.setScalar(0.1);
      const angle = (i / count) * Math.PI * 2;
      mesh.userData = {
        targetPos: new THREE.Vector3(Math.cos(angle) * radius, 20 + Math.random() * 10, Math.sin(angle) * radius),
        originalPos: new THREE.Vector3(),
        originalRot: new THREE.Quaternion(),
        hoverOffset: Math.random() * 10,
        isFocused: false
      };
      galleryGroupRef.current?.add(mesh);
      photoMeshesRef.current.push(mesh);
    });

    // Add Magic Greeting Text if exists
    if (magicGreeting) {
       // Future: Add 3D text or a special billboard for the AI greeting
    }
  };

  const createDefaultTextures = () => {
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
    return colors.map(c => {
      const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = c; ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(10, 10, 236, 236);
      ctx.fillStyle = 'white'; ctx.textAlign = 'center'; ctx.font = 'bold 30px Arial';
      ctx.fillText('MERRY MAGIC', 128, 110); ctx.fillText('WONDERS', 128, 160);
      const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    });
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // SCENE & CAMERA
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d0015);
    scene.fog = new THREE.Fog(0x0d0015, 30, 180);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 25, 90);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    containerRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.minDistance = 25;
    controls.maxDistance = 150;
    controls.target.set(0, 15, 0);
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;
    controlsRef.current = controls;

    // LIGHTS
    const dirLight = new THREE.DirectionalLight(0xfff0dd, 2.0);
    dirLight.position.set(20, 50, 20);
    dirLight.castShadow = true;
    scene.add(dirLight);
    scene.add(new THREE.AmbientLight(0x223355, 0.7));

    // ENVIRONMENT
    new RGBELoader()
      .setPath('https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/')
      .load('moonless_golf_1k.hdr', (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = texture;
      });

    // GROUND
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400, 64, 64),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1.0 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // TREE CONSTRUCTION (Simplified version of original logic)
    const treeGroup = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(2, 5, 30, 16), new THREE.MeshStandardMaterial({ color: 0x332211 }));
    trunk.position.y = 15;
    treeGroup.add(trunk);
    
    // Pine Needles Instanced
    const needleGeo = new THREE.ConeGeometry(0.2, 1.5, 4);
    needleGeo.translate(0, 0.75, 0);
    const pineMesh = new THREE.InstancedMesh(needleGeo, new THREE.MeshStandardMaterial({ color: 0x1a472a }), 8000);
    const dummy = new THREE.Object3D();
    let idx = 0;
    for (let l = 0; l < 25; l++) {
      const hPercent = l / 25;
      const r = 16 * (1 - hPercent) + 0.5;
      const y = 6 + l * 1.4;
      for (let b = 0; b < 100; b++) {
        if (idx >= 8000) break;
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * r;
        dummy.position.set(Math.cos(angle) * radius, y - (radius/r)*3, Math.sin(angle) * radius);
        dummy.lookAt(Math.cos(angle) * (radius+1), y, Math.sin(angle) * (radius+1));
        dummy.scale.setScalar(0.5 + Math.random());
        dummy.updateMatrix();
        pineMesh.setMatrixAt(idx++, dummy.matrix);
      }
    }
    treeGroup.add(pineMesh);

    // Fairy Lights
    const lMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const lightsMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 8, 8), lMat, 400);
    treeLightsRef.current = lightsMesh;
    for (let i = 0; i < 400; i++) {
      const h = Math.random();
      const r = 16 * (1 - h) + 0.6;
      dummy.position.set(Math.cos(h * 30) * r, h * 40 + 5, Math.sin(h * 30) * r);
      dummy.updateMatrix();
      lightsMesh.setMatrixAt(i, dummy.matrix);
    }
    updateLights();
    treeGroup.add(lightsMesh);
    scene.add(treeGroup);

    // SNOWMAN
    const snowman = new THREE.Group();
    snowman.position.set(22, 0, 15);
    const sMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const b1 = new THREE.Mesh(new THREE.SphereGeometry(3.5), sMat); b1.position.y = 2.5; snowman.add(b1);
    const b2 = new THREE.Mesh(new THREE.SphereGeometry(2.5), sMat); b2.position.y = 6.5; snowman.add(b2);
    snowmanRef.current = snowman;
    scene.add(snowman);

    // GIFT BOX
    const gift = new THREE.Group();
    gift.position.set(0, 1.5, 30);
    const box = new THREE.Mesh(new THREE.BoxGeometry(8, 5, 8), new THREE.MeshStandardMaterial({ color: 0xdd0000 }));
    gift.add(box);
    const lid = new THREE.Group();
    lid.add(new THREE.Mesh(new THREE.BoxGeometry(8.5, 1, 8.5), new THREE.MeshStandardMaterial({ color: 0xffd700 })));
    lid.position.y = 3;
    gift.add(lid);
    giftGroupRef.current = gift;
    giftLidRef.current = lid;
    scene.add(gift);

    // SNOW
    const snowGeo = new THREE.BufferGeometry();
    const snowPos = [];
    const snowVels = [];
    for (let i = 0; i < 4000; i++) {
      snowPos.push((Math.random() - 0.5) * 250, Math.random() * 120, (Math.random() - 0.5) * 250);
      snowVels.push(0.1 + Math.random() * 0.2);
    }
    snowGeo.setAttribute('position', new THREE.Float32BufferAttribute(snowPos, 3));
    const snowParticles = new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.4, transparent: true, opacity: 0.8 }));
    scene.add(snowParticles);

    // GALLERY GROUP
    const gallery = new THREE.Group();
    scene.add(gallery);
    galleryGroupRef.current = gallery;

    // POST PROCESSING
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 0.8, 0.4, 0.85);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    composerRef.current = composer;

    // ANIMATION LOOP
    const clock = new THREE.Clock();
    const animate = () => {
      requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      controls.update();

      // Snow animation
      const posArray = snowParticles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < 4000; i++) {
        posArray[i * 3 + 1] -= snowVels[i];
        if (posArray[i * 3 + 1] < 0) posArray[i * 3 + 1] = 120;
      }
      snowParticles.geometry.attributes.position.needsUpdate = true;

      // Snowman Jump
      if (snowmanJumping.current) {
        snowmanJumpTime.current += 0.1;
        snowman.position.y = Math.sin(snowmanJumpTime.current) * 10;
        if (snowmanJumpTime.current >= Math.PI) {
          snowman.position.y = 0;
          snowmanJumping.current = false;
        }
      }

      // Fix: Removed optional chaining from assignments to avoid "left-hand side may not be optional property access" errors.
      if (isGiftOpened && giftLidRef.current) {
        giftLidRef.current.position.addScaledVector(lidVelocity.current, 0.05);
        giftLidRef.current.rotation.x += lidAngularVel.current.x;
        giftLidRef.current.rotation.y += lidAngularVel.current.y;
        lidVelocity.current.y -= 0.35;
        if (giftLidRef.current.position.y < -2) {
          giftLidRef.current.position.y = -2;
          lidVelocity.current.set(0, 0, 0);
          lidAngularVel.current.set(0, 0, 0);
        }

        // Gallery Floating
        gallery.rotation.y += 0.005;
        photoMeshesRef.current.forEach(m => {
          const target = m.userData.targetPos;
          const float = Math.sin(time + m.userData.hoverOffset) * 2;
          m.position.lerp(new THREE.Vector3(target.x, target.y + float, target.z), 0.05);
          m.rotation.y += 0.01;
        });
      }

      composer.render();
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  // Sync Gesture States
  useEffect(() => {
    // Fix: Explicit null check instead of optional chaining for assignments to OrbitControls properties (lines 302-303)
    if (controlsRef.current) {
      if (gestureState.rotateDir !== 0) {
        controlsRef.current.autoRotate = true;
        controlsRef.current.autoRotateSpeed = gestureState.rotateDir * 8.0;
      } else {
        controlsRef.current.autoRotate = true;
        controlsRef.current.autoRotateSpeed = 0.5;
      }
    }

    if (gestureState.shouldJump) jumpSnowman();
    if (gestureState.shouldSwitchLights) switchLights();
    if (gestureState.shouldOpenGift) openGift();
  }, [gestureState, isGiftOpened]);

  return <div ref={containerRef} className="w-full h-full" />;
};

export default ThreeScene;
