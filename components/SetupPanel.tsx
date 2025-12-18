
import React, { useState } from 'react';

interface SetupPanelProps {
  onStart: (name: string, files: FileList | null) => void;
}

const SetupPanel: React.FC<SetupPanelProps> = ({ onStart }) => {
  const [name, setName] = useState('');
  const [previews, setPreviews] = useState<string[]>([]);
  const [files, setFiles] = useState<FileList | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      setFiles(selectedFiles);
      // Fix: Cast file to Blob to satisfy URL.createObjectURL signature when Array.from inference is weak (line 17)
      const newPreviews = Array.from(selectedFiles).map(file => URL.createObjectURL(file as Blob));
      setPreviews(newPreviews);
    }
  };

  return (
    <div className="absolute inset-0 z-[2000] flex flex-col items-center justify-center bg-gradient-to-br from-[#1a0b2e] to-black text-white p-6 overflow-y-auto">
      <h1 className="text-5xl md:text-7xl font-extrabold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-fuchsia-500 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]">
        MAGIC XMAS 7.0
      </h1>

      <div className="w-full max-w-xl space-y-6 bg-white/5 backdrop-blur-md p-8 rounded-3xl border border-white/10 shadow-2xl">
        <div>
          <label className="block text-cyan-300 text-sm font-bold mb-2 ml-1">Your Name (for the Wizard's blessing)</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-black/40 border border-cyan-500/50 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 transition-all text-lg"
            placeholder="Type your name..."
          />
        </div>

        <div 
          onClick={() => document.getElementById('file-upload')?.click()}
          className="group relative cursor-pointer border-2 border-dashed border-cyan-500/30 hover:border-cyan-400 rounded-2xl p-6 text-center transition-all bg-cyan-500/5 hover:bg-cyan-500/10"
        >
          <p className="text-lg font-medium">📸 Upload Photo Memories</p>
          <p className="text-sm text-cyan-300/60 mt-1">Multi-select supported. Leave empty for default art.</p>
          <input
            id="file-upload"
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {previews.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center py-2 max-h-32 overflow-y-auto">
            {previews.map((src, i) => (
              <img key={i} src={src} className="w-12 h-12 rounded-lg object-cover border border-white/20 shadow-lg" alt="preview" />
            ))}
          </div>
        )}

        <div className="bg-white/5 rounded-xl p-4 text-xs md:text-sm text-gray-300 space-y-2 border border-white/5">
          <p className="font-bold text-yellow-400">🎮 Hand Gesture Guide:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><span className="text-cyan-300 font-semibold">☝️ Index move</span>: Rotate world</li>
            <li><span className="text-cyan-300 font-semibold">✌️ Scissors</span>: Snowman jump</li>
            <li><span className="text-cyan-300 font-semibold">✊ to ✋ Fist Open</span>: Toggle lights</li>
            <li><span className="text-cyan-300 font-semibold">🤟 Love Sign</span>: Unlock gift box</li>
          </ul>
        </div>

        <button
          onClick={() => onStart(name, files)}
          className="w-full py-4 px-8 rounded-full bg-gradient-to-r from-fuchsia-600 to-cyan-500 text-white font-bold text-xl uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_30px_rgba(192,38,211,0.5)]"
        >
          Cast Magic Engine
        </button>
      </div>
    </div>
  );
};

export default SetupPanel;
