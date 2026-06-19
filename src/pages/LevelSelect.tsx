import { useEffect } from 'react';
import { Droplets, Sparkles } from 'lucide-react';
import { LevelGrid } from '../components/levels/LevelGrid';
import { useLevelStore } from '../store';

export default function LevelSelect() {
  const initProgress = useLevelStore((s) => s.initProgress);
  const allProgress = useLevelStore((s) => s.progress);
  const levelCount = Object.keys(allProgress).length || 3;

  useEffect(() => {
    initProgress();
  }, [initProgress]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 relative overflow-hidden">
      <BackgroundDecor />

      <div className="relative z-10 px-6 py-12 sm:py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/70 backdrop-blur rounded-full border border-sky-200 mb-5 shadow-sm">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-sm text-slate-600 font-medium">
                画线解谜 · 物理益智
              </span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-display font-black mb-4 tracking-tight">
              <span className="bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                水流
              </span>
              <span className="text-slate-800 ml-3">大师</span>
              <Droplets className="w-12 h-12 sm:w-14 sm:h-14 inline-block text-sky-500 ml-4 -translate-y-1 animate-bounce" />
            </h1>

            <p className="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
              画一条线，改变水的流向。引导水滴流入目标容器，
              <br className="hidden sm:block" />
              考验你的空间思维和物理直觉！
            </p>
          </div>

          <div className="mb-8 flex items-center justify-between max-w-5xl mx-auto">
            <h2 className="text-2xl font-display font-bold text-slate-800">
              选择关卡
            </h2>
            <div className="text-sm text-slate-500">
              共 <span className="font-bold text-sky-600">{levelCount}</span> 个关卡
            </div>
          </div>

          <LevelGrid />

          <div className="mt-16 max-w-3xl mx-auto">
            <div className="bg-white/70 backdrop-blur-md rounded-3xl border border-sky-200 shadow-xl p-6 sm:p-8">
              <h3 className="text-xl font-display font-bold text-slate-800 mb-5 flex items-center gap-2">
                🎮 玩法说明
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <Tip
                  icon="✏️"
                  title="自由画线"
                  desc="按住鼠标/手指在画布上拖动，画出的线会变成坚硬的地形"
                />
                <Tip
                  icon="💧"
                  title="引导水流"
                  desc="水源会持续出水，利用你画的线让水流进目标容器"
                />
                <Tip
                  icon="🎯"
                  title="装满容器"
                  desc="当容器内水粒子达标并保持数秒，即可通关"
                />
                <Tip
                  icon="🧽"
                  title="擦除修正"
                  desc="使用橡皮擦工具可以擦掉画错的线条，回收部分墨水"
                />
              </div>
            </div>
          </div>

          <footer className="mt-16 text-center text-sm text-slate-400">
            用 ❤️ 和 Matter.js 构建 · 按 R 键快速重置关卡
          </footer>
        </div>
      </div>
    </div>
  );
}

function Tip({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex gap-3 p-4 rounded-2xl bg-sky-50/50 hover:bg-sky-50 transition-colors">
      <div className="text-2xl flex-shrink-0">{icon}</div>
      <div>
        <h4 className="font-bold text-slate-800 mb-0.5">{title}</h4>
        <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function BackgroundDecor() {
  return (
    <>
      <div className="absolute top-10 -left-20 w-96 h-96 bg-sky-300/20 rounded-full blur-3xl" />
      <div className="absolute top-1/3 -right-20 w-[500px] h-[500px] bg-indigo-300/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-cyan-300/20 rounded-full blur-3xl" />
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, #0ea5e9 1px, transparent 0)',
        backgroundSize: '32px 32px',
      }} />
    </>
  );
}
