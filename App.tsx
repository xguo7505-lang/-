
import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import SetupPanel from './components/SetupPanel';
import ThreeScene from './components/ThreeScene';
import { AppState } from './types';
import { generateMagicalGreeting } from './services/geminiService';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.SETUP);
  const [userName, setUserName] = useState('');
  const [userTextures, setUserTextures] = useState<THREE.Texture[]>([]);
  const [magicGreeting, setMagicGreeting] = useState('');
  const [isGiftOpened, setIsGiftOpened] = useState(false);
  const [gestureStatus, setGestureStatus] = useState('Camera off');
  const [gestureState, setGestureState] = useState({
    rotateDir: 0,
    shouldJump: false,
    shouldSwitchLights: false,
    shouldOpenGift: false
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastFistState = useRef(false);

  const startMagic = async (name: string, files: FileList | null) => {
    setUserName(name);
    setAppState(AppState.LOADING);

    // Process textures
    const textureLoader = new THREE.TextureLoader();
    const textures: THREE.Texture[] = [];
    if (files) {
      const promises = Array.from(files).map(file => {
        return new Promise<void>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            textureLoader.load(e.target?.result as string, (tex) => {
              tex.colorSpace = THREE.SRGBColorSpace;
              textures.push(tex);
              resolve();
            });
          };
          reader.readAsDataURL(file);
        });
      });
      await Promise.all(promises);
    }
    setUserTextures(textures);

    // Pre-fetch magic greeting if name provided
    try {
      const wish = await generateMagicalGreeting(name);
      setMagicGreeting(wish);
    } catch (e) {
      console.warn("Gemini greeting failed", e);
    }

    setAppState(AppState.MAGIC);
    initHandTracking();
  };

  const initHandTracking = useCallback(() => {
    const hands = new (window as any).Hands({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    hands.onResults((results: any) => {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx && canvasRef.current) {
        ctx.save();
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        if (results.multiHandLandmarks?.length > 0) {
          const landmarks = results.multiHandLandmarks[0];
          // Simple visual debugging
          (window as any).drawConnectors(ctx, landmarks, (window as any).HAND_CONNECTIONS, { color: '#00ffff', lineWidth: 2 });
          (window as any).drawLandmarks(ctx, landmarks, { color: '#ff00ff', lineWidth: 1, radius: 2 });
          
          processGestures(landmarks);
        } else {
          setGestureStatus('Waiting for hand...');
          setGestureState(prev => ({ ...prev, rotateDir: 0 }));
        }
        ctx.restore();
      }
    });

    if (videoRef.current) {
      const camera = new (window as any).Camera(videoRef.current, {
        onFrame: async () => {
          await hands.send({ image: videoRef.current! });
        },
        width: 320,
        height: 240
      });
      camera.start();
    }
  }, []);

  const processGestures = (landmarks: any) => {
    const isCurled = (tipIdx: number, pipIdx: number) => landmarks[tipIdx].y > landmarks[pipIdx].y + 0.03;
    const isExtended = (tipIdx: number, pipIdx: number) => landmarks[tipIdx].y < landmarks[pipIdx].y - 0.03;

    const indexStraight = isExtended(8, 6);
    const middleCurled = isCurled(12, 10);
    const ringCurled = isCurled(16, 14);
    const pinkyCurled = isCurled(20, 18);
    const middleStraight = isExtended(12, 10);
    const pinkyStraight = isExtended(20, 18);

    const thumbTip = landmarks[4];
    const indexMCP = landmarks[5];
    const thumbExtended = Math.hypot(thumbTip.x - indexMCP.x, thumbTip.y - indexMCP.y) > 0.15;

    // Logic
    let newStatus = 'Hand Detected';
    let rotate = 0;
    let jump = false;
    let switchL = false;
    let openG = false;

    // 1. Index rotate
    if (indexStraight && middleCurled && ringCurled && pinkyCurled) {
      const x = landmarks[8].x;
      if (x < 0.4) { rotate = 1; newStatus = '👈 Rotate Left'; }
      else if (x > 0.6) { rotate = -1; newStatus = '👉 Rotate Right'; }
      else { newStatus = '☝️ Pointing'; }
    }

    // 2. Scissors jump
    if (indexStraight && middleStraight && ringCurled && pinkyCurled) {
      jump = true;
      newStatus = '✌️ Jumping!';
    }

    // 3. Love sign open gift
    if (thumbExtended && indexStraight && middleCurled && ringCurled && pinkyStraight) {
      openG = true;
      newStatus = '🤟 Opening Gift!';
    }

    // 4. Fist open change lights
    const fingersOpenCount = [indexStraight, middleStraight, !ringCurled, pinkyStraight].filter(Boolean).length;
    if (fingersOpenCount >= 4) {
      if (lastFistState.current) {
        switchL = true;
        lastFistState.current = false;
        newStatus = '✨ Color Switched!';
      }
    } else if (fingersOpenCount === 0 && !thumbExtended) {
      lastFistState.current = true;
      newStatus = '✊ Charging...';
    }

    setGestureStatus(newStatus);
    setGestureState({
      rotateDir: rotate,
      shouldJump: jump,
      shouldSwitchLights: switchL,
      shouldOpenGift: openG
    });
  };

  return (
    <div className="relative w-screen h-screen bg-[#0d0015] overflow-hidden">
      {appState === AppState.SETUP && <SetupPanel onStart={startMagic} />}
      
      {appState === AppState.LOADING && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#150520] z-[1500]">
          <h2 className="text-3xl text-fuchsia-400 font-bold mb-4 animate-pulse">Weaving Snowflakes...</h2>
          <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan-500 to-fuchsia-500 animate-[loading_2s_infinite]" />
          </div>
        </div>
      )}

      {appState === AppState.MAGIC && (
        <>
          <ThreeScene 
            userTextures={userTextures} 
            isGiftOpened={isGiftOpened} 
            onGiftOpen={() => setIsGiftOpened(true)}
            magicGreeting={magicGreeting}
            gestureState={gestureState}
          />

          <div className="absolute bottom-6 right-6 flex flex-col items-end gap-2 group z-[100]">
            <div className="bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-cyan-500/30 text-cyan-400 font-mono font-bold shadow-lg">
              {gestureStatus}
            </div>
            <div className="w-48 h-36 bg-black rounded-xl border-2 border-cyan-500/50 overflow-hidden shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity">
               <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1] opacity-60" />
               <canvas ref={canvasRef} width="320" height="240" className="absolute inset-0 w-full h-full" />
            </div>
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/50 text-sm pointer-events-none text-center bg-black/30 backdrop-blur-sm px-4 py-2 rounded-lg">
            🎁 Use hand gestures or click objects to interact 🎁
            {isGiftOpened && magicGreeting && (
              <div className="mt-2 text-fuchsia-300 font-bold italic animate-bounce">
                "{magicGreeting}"
              </div>
            )}
          </div>
        </>
      )}

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default App;
