import { useState, useRef, useEffect } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useChairStore } from '../store/chairStore';
import { generateChairDesign } from '../services/zhipuApi';
import { mockGenerateChairDesign } from '../services/mockApi';

export function ConfigPanel() {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useMockApi, setUseMockApi] = useState(false); // 控制是否使用模拟API
  const { parameters, updateParameter, calculatePrice } = useChairStore();
  
  // 引用滑块对应的 div 元素
  const seatWidthTrackRef = useRef<HTMLDivElement>(null);
  const seatHeightTrackRef = useRef<HTMLDivElement>(null);
  const backHeightTrackRef = useRef<HTMLDivElement>(null);

  // 解析AI回答并更新参数
  const parseAndUpdateParameters = (suggestion: string) => {
    try {
      console.log('Parsing suggestion:', suggestion);
      
      // 提取材料信息
      const materialMatch = suggestion.match(/材料：\s*(titanium|bronze|plastic|stainless_steel)/);
      console.log('Material match:', materialMatch);
      
      if (materialMatch) {
        const material = materialMatch[1] as 'titanium' | 'bronze' | 'plastic' | 'stainless_steel';
        console.log('Updating material to:', material);
        updateParameter('material', material);
      }

      // 提取尺寸信息
      const widthMatch = suggestion.match(/座椅宽度：\s*(\d+)cm/);
      const heightMatch = suggestion.match(/座椅高度：\s*(\d+)cm/);
      const backHeightMatch = suggestion.match(/靠背高度：\s*(\d+)cm/);

      console.log('Dimension matches:', { widthMatch, heightMatch, backHeightMatch });

      if (widthMatch) {
        const width = Math.min(Math.max(parseInt(widthMatch[1]), 40), 80);
        console.log('Updating width to:', width);
        updateParameter('seatWidth', width);
      }
      if (heightMatch) {
        const height = Math.min(Math.max(parseInt(heightMatch[1]), 40), 80);
        console.log('Updating height to:', height);
        updateParameter('seatHeight', height);
      }
      if (backHeightMatch) {
        const backHeight = Math.min(Math.max(parseInt(backHeightMatch[1]), 30), 100);
        console.log('Updating back height to:', backHeight);
        updateParameter('backrestHeight', backHeight);
      }
    } catch (error) {
      console.error('Error parsing AI suggestion:', error);
      setError('无法解析AI的建议，请重试');
    }
  };

  const handlePromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setError(null);
    try {
      setIsLoading(true);
      
      let suggestion: string;
      if (useMockApi) {
        // 直接使用模拟API
        suggestion = await mockGenerateChairDesign(prompt);
      } else {
        try {
          // 尝试使用真实API
          suggestion = await generateChairDesign(prompt);
        } catch (apiError) {
          console.error('Real API failed:', apiError);
          // 如果想自动切换到模拟API，取消下面两行的注释
          // suggestion = await mockGenerateChairDesign(prompt);
          // setUseMockApi(true); // 后续请求直接使用模拟API
          throw apiError; // 重新抛出错误，显示真实错误信息
        }
      }
      
      console.log('AI Suggestion:', suggestion);
      parseAndUpdateParameters(suggestion);
    } catch (error) {
      console.error('Error generating design:', error);
      setError('生成设计建议时出错: ' + (error instanceof Error ? error.message : '请重试'));
    } finally {
      setIsLoading(false);
      setPrompt('');
    }
  };

  const handleSurpriseMe = async () => {
    const surprisePrompts = [
      "设计一把现代简约的办公椅，注重人体工学",
      "我需要一把适合阅读的舒适椅子，带扶手",
      "设计一把适合餐厅使用的时尚椅子",
      "给我一把复古风格的休闲椅设计"
    ];
    const randomPrompt = surprisePrompts[Math.floor(Math.random() * surprisePrompts.length)];
    setPrompt(randomPrompt);
  };

  // 切换API模式
  const toggleApiMode = () => {
    setUseMockApi(!useMockApi);
  };

  // 更新滑块轨道宽度的函数
  const updateTrackWidth = (
    ref: React.RefObject<HTMLDivElement>,
    value: number,
    min: number,
    max: number
  ) => {
    if (ref.current) {
      const percent = ((value - min) / (max - min)) * 100;
      ref.current.style.width = `${percent}%`;
    }
  };

  // 当参数变化时更新轨道宽度
  useEffect(() => {
    updateTrackWidth(seatWidthTrackRef, parameters.seatWidth, 40, 80);
    updateTrackWidth(seatHeightTrackRef, parameters.seatHeight, 40, 80);
    updateTrackWidth(backHeightTrackRef, parameters.backrestHeight, 30, 100);
  }, [parameters.seatWidth, parameters.seatHeight, parameters.backrestHeight]);

  // 格式化价格显示
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="h-full flex flex-col p-8">
      {/* API Mode Toggle */}
      <div className="flex justify-end mb-2">
        <button
          onClick={toggleApiMode}
          className="text-xs underline text-gray-500"
        >
          {useMockApi ? '使用真实API' : '使用模拟API'}
        </button>
      </div>

      {/* AI Prompt Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">What kind of chair do you want to create?</h2>
        <form onSubmit={handlePromptSubmit} className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Anything on your mind ..."
            className="w-full h-32 p-4 border rounded-lg resize-none"
            disabled={isLoading}
          />
          {error && (
            <div className="mt-2 text-red-500 text-sm">
              {error}
            </div>
          )}
          <div className="absolute bottom-4 left-4">
            <button
              type="button"
              className="px-4 py-2 bg-white border rounded-full text-sm flex items-center gap-2 hover:bg-gray-50 disabled:opacity-50"
              onClick={handleSurpriseMe}
              disabled={isLoading}
            >
              <Sparkles size={16} />
              Surprise me
            </button>
          </div>
          <button
            type="submit"
            className="absolute bottom-4 right-4 p-2 bg-gray-200 rounded-full hover:bg-gray-300 disabled:opacity-50"
            disabled={isLoading || !prompt.trim()}
          >
            <ArrowRight size={20} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </form>
      </div>

      {/* Dimensions Section */}
      <div className="mb-8">
        <h3 className="font-bold mb-4">Dimensions</h3>
        <div className="space-y-6">
          <div>
            <div className="flex justify-between mb-2">
              <label className="block text-sm font-medium">Seat Width</label>
              <span className="text-sm">{parameters.seatWidth}cm</span>
            </div>
            <div className="slider-container">
              <div ref={seatWidthTrackRef} className="slider-track"></div>
              <input
                type="range"
                min="40"
                max="80"
                value={parameters.seatWidth}
                onChange={(e) => updateParameter('seatWidth', parseInt(e.target.value))}
                className="range-slider w-full"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="block text-sm font-medium">Seat Height</label>
              <span className="text-sm">{parameters.seatHeight}cm</span>
            </div>
            <div className="slider-container">
              <div ref={seatHeightTrackRef} className="slider-track"></div>
              <input
                type="range"
                min="40"
                max="80"
                value={parameters.seatHeight}
                onChange={(e) => updateParameter('seatHeight', parseInt(e.target.value))}
                className="range-slider w-full"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="block text-sm font-medium">Back Height</label>
              <span className="text-sm">{parameters.backrestHeight}cm</span>
            </div>
            <div className="slider-container">
              <div ref={backHeightTrackRef} className="slider-track"></div>
              <input
                type="range"
                min="30"
                max="100"
                value={parameters.backrestHeight}
                onChange={(e) => updateParameter('backrestHeight', parseInt(e.target.value))}
                className="range-slider w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Materials Section */}
      <div className="mb-8">
        <h3 className="font-bold mb-4">Materials</h3>
        <div className="grid grid-cols-2 gap-4">
          <button 
            className={`p-4 border rounded-lg hover:bg-gray-50 ${parameters.material === 'titanium' ? 'border-black' : ''}`}
            onClick={() => updateParameter('material', 'titanium')}
          >
            Titanium
          </button>
          <button 
            className={`p-4 border rounded-lg hover:bg-gray-50 ${parameters.material === 'bronze' ? 'border-black' : ''}`}
            onClick={() => updateParameter('material', 'bronze')}
          >
            Bronze
          </button>
          <button 
            className={`p-4 border rounded-lg hover:bg-gray-50 ${parameters.material === 'plastic' ? 'border-black' : ''}`}
            onClick={() => updateParameter('material', 'plastic')}
          >
            Plastic
          </button>
          <button 
            className={`p-4 border rounded-lg hover:bg-gray-50 ${parameters.material === 'stainless_steel' ? 'border-black' : ''}`}
            onClick={() => updateParameter('material', 'stainless_steel')}
          >
            Stainless Steel
          </button>
        </div>
      </div>

      {/* Price Section */}
      <div className="mt-auto">
        <div className="flex items-center mb-4">
          <h3 className="font-bold">Price</h3>
          <button className="text-sm underline ml-2">Show Breakdown</button>
          <div className="text-xl font-bold ml-auto">{formatPrice(calculatePrice())}</div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button className="w-full p-4 border rounded-lg hover:bg-gray-50">
            Save this Design
          </button>
          <button className="w-full p-4 bg-black text-white rounded-lg hover:bg-gray-900">
            Order Now
          </button>
        </div>
      </div>
    </div>
  );
}