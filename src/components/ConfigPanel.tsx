import { useState, useRef, useEffect } from 'react';
import { ArrowRight, Sparkles, ChevronDown, ChevronRight, User, Bot, Settings, X, Save, FolderOpen, Share2 } from 'lucide-react';
import { useTableStore } from '../store/tableStore';
import { generateTableDesign } from '../services/zhipuApi';
import { mockGenerateTableDesign } from '../services/mockApi';
import { SaveDesignDialog } from './SaveDesignDialog';
import { SavedDesignsDrawer } from './SavedDesignsDrawer';
import { SharePosterDialog } from './SharePosterDialog';

// 聊天消息类型
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function ConfigPanel() {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useMockApi, setUseMockApi] = useState(false); // 控制是否使用模拟API
  const { parameters, updateParameter, calculatePrice } = useTableStore();
  
  // 聊天历史记录
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  // 控制参数面板展开/折叠 - 默认折叠
  const [isParametersPanelOpen, setIsParametersPanelOpen] = useState(false);
  // 控制尺寸面板展开/折叠
  const [isDimensionsPanelOpen, setIsDimensionsPanelOpen] = useState(true);
  // 控制材料面板展开/折叠
  const [isMaterialsPanelOpen, setIsMaterialsPanelOpen] = useState(true);
  
  // 获取灵感相关状态
  const [isGeneratingIdea, setIsGeneratingIdea] = useState(false);
  const [usedPrompts, setUsedPrompts] = useState<Set<string>>(new Set());
  
  // 保存设计相关状态
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isDesignsDrawerOpen, setIsDesignsDrawerOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  
  // 分享弹窗状态
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  
  // 聊天历史区域引用，用于自动滚动
  const chatHistoryRef = useRef<HTMLDivElement>(null);
  
  // 引用滑块对应的 div 元素
  const tableWidthTrackRef = useRef<HTMLDivElement>(null);
  const tableLengthTrackRef = useRef<HTMLDivElement>(null);
  const legHeightTrackRef = useRef<HTMLDivElement>(null);
  const legWidthTrackRef = useRef<HTMLDivElement>(null);
  const legMinWidthTrackRef = useRef<HTMLDivElement>(null);
  const legTiltAngleTrackRef = useRef<HTMLDivElement>(null);
  const tableThicknessTrackRef = useRef<HTMLDivElement>(null);
  const roundedCornersTrackRef = useRef<HTMLDivElement>(null);

  // 从store中获取圆角参数值
  const roundedCorners = useTableStore(state => state.parameters.roundedCorners);
  
  // 单独更新圆角参数的函数
  const updateRoundedCorners = (value: number) => {
    updateParameter('roundedCorners', value);
  };

  // 解析AI回答并更新参数
  const parseAndUpdateParameters = (suggestion: string) => {
    try {
      // 单参数更新标记匹配 [参数更新: 参数名: 值]
      const singleParamRegex = /\[\s*参数更新\s*:\s*([^:]+)\s*:\s*([^\]\s,]+)\s*\]/g;
      
      // 多参数更新标记匹配 [参数更新: 参数1: 值1, 参数2: 值2, ...]
      const multiParamRegex = /\[\s*参数更新\s*:(.*?)\]/;
      let paramFound = false;
      
      // 先尝试匹配单参数更新格式
      let match;
      while ((match = singleParamRegex.exec(suggestion)) !== null) {
        paramFound = true;
        const paramName = match[1].trim();
        const paramValue = match[2].trim();
        updateParamByName(paramName, paramValue);
      }
      
      // 如果没找到单参数更新，尝试匹配多参数更新格式
      if (!paramFound) {
        const multiMatch = suggestion.match(multiParamRegex);
        if (multiMatch && multiMatch[1]) {
          paramFound = true;
          
          // 切分参数对
          const paramPairs = multiMatch[1].split(',');
          for (const pair of paramPairs) {
            // 匹配 "参数名: 值"
            const pairMatch = pair.match(/\s*([^:]+)\s*:\s*([^,\]]+)/);
            if (pairMatch) {
              const paramName = pairMatch[1].trim();
              const rawValue = pairMatch[2].trim();
              // 去除单位后缀，但不处理颜色值
              const paramValue = paramName === '塑料颜色' ? rawValue : rawValue.replace(/cm|%/g, '');
              updateParamByName(paramName, paramValue);
            }
          }
        }
      }
      
      // 检查是否已找到参数更新标记，如果找到则不需要继续解析
      if (paramFound) {
        return;
      }
      
      // 提取材料信息
      const materialMatch = suggestion.match(/材料：\s*(titanium|bronze|plastic|stainless_steel)/);
      if (materialMatch) {
        const material = materialMatch[1] as 'titanium' | 'bronze' | 'plastic' | 'stainless_steel';
        updateParameter('material', material);
      }

      // 提取塑料颜色信息
      const plasticColorMatch = suggestion.match(/塑料颜色：\s*(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}|rgb\([^)]+\))/);
      if (plasticColorMatch && parameters.material === 'plastic') {
        updateParameter('plasticColor', plasticColorMatch[1]);
      }

      // 提取尺寸信息
      const widthMatch = suggestion.match(/桌子宽度：\s*(\d+)cm/);
      const lengthMatch = suggestion.match(/桌子长度：\s*(\d+)cm/);
      const heightMatch = suggestion.match(/桌腿高度：\s*(\d+)cm/);
      const legWidthMatch = suggestion.match(/桌腿宽度：\s*(\d+(?:\.\d+)?)cm/);
      const legMinWidthMatch = suggestion.match(/桌腿底部宽度：\s*(\d+(?:\.\d+)?)cm/);
      const legTiltAngleMatch = suggestion.match(/桌腿倾斜角度：\s*(\d+(?:\.\d+)?)°/);
      const thicknessMatch = suggestion.match(/桌面厚度：\s*(\d+(?:\.\d+)?)cm/);
      const roundedMatch = suggestion.match(/桌面圆角：\s*(\d+)%/);

      if (widthMatch) {
        const width = Math.min(Math.max(parseInt(widthMatch[1]), 40), 120);
        updateParameter('tableWidth', width);
      }
      if (lengthMatch) {
        const length = Math.min(Math.max(parseInt(lengthMatch[1]), 80), 200);
        updateParameter('tableLength', length);
      }
      if (heightMatch) {
        const height = Math.min(Math.max(parseInt(heightMatch[1]), 60), 90);
        updateParameter('legHeight', height);
      }
      if (legWidthMatch) {
        const legWidth = Math.min(Math.max(parseFloat(legWidthMatch[1]), 2), 10);
        updateParameter('legWidth', legWidth);
      }
      if (legMinWidthMatch) {
        const legMinWidth = Math.min(Math.max(parseFloat(legMinWidthMatch[1]), 1), 8);
        updateParameter('legMinWidth', legMinWidth);
      }
      if (legTiltAngleMatch) {
        const legTiltAngle = Math.min(Math.max(parseFloat(legTiltAngleMatch[1]), 0), 30);
        updateParameter('legTiltAngle', legTiltAngle);
      }
      if (thicknessMatch) {
        const thickness = Math.min(Math.max(parseFloat(thicknessMatch[1]), 2), 8);
        updateParameter('tableThickness', thickness);
      }
      if (roundedMatch) {
        const rounded = Math.min(Math.max(parseInt(roundedMatch[1]), 5), 95);
        updateRoundedCorners(rounded);
      }
    } catch (error) {
      console.error('Error parsing AI suggestion:', error);
      setError('无法解析AI的建议，请重试');
    }
  };

  // 根据参数名称更新对应的值
  const updateParamByName = (paramName: string, paramValue: string) => {
    switch (paramName) {
      case '材料':
        if (['titanium', 'bronze', 'plastic', 'stainless_steel'].includes(paramValue)) {
          updateParameter('material', paramValue as any);
        }
        break;
      case '塑料颜色':
        // 验证是否为有效的颜色值（简单检查）
        if (/^#([0-9A-Fa-f]{3}){1,2}$|^rgb\([^)]+\)$/.test(paramValue)) {
          updateParameter('plasticColor', paramValue);
        }
        break;
      case '桌子宽度':
        const width = parseInt(paramValue);
        if (!isNaN(width)) {
          updateParameter('tableWidth', Math.min(Math.max(width, 40), 120));
        }
        break;
      case '桌子长度':
        const length = parseInt(paramValue);
        if (!isNaN(length)) {
          updateParameter('tableLength', Math.min(Math.max(length, 80), 200));
        }
        break;
      case '桌腿高度':
        const height = parseInt(paramValue);
        if (!isNaN(height)) {
          updateParameter('legHeight', Math.min(Math.max(height, 60), 90));
        }
        break;
      case '桌腿宽度':
        const legWidth = parseInt(paramValue);
        if (!isNaN(legWidth)) {
          updateParameter('legWidth', Math.min(Math.max(legWidth, 2), 10));
        }
        break;
      case '桌腿底部宽度':
        const legMinWidth = parseInt(paramValue);
        if (!isNaN(legMinWidth)) {
          updateParameter('legMinWidth', Math.min(Math.max(legMinWidth, 1), 8));
        }
        break;
      case '桌腿倾斜角度':
        const legTiltAngle = parseInt(paramValue);
        if (!isNaN(legTiltAngle)) {
          updateParameter('legTiltAngle', Math.min(Math.max(legTiltAngle, 0), 30));
        }
        break;
      case '桌面厚度':
        const thickness = parseFloat(paramValue);
        if (!isNaN(thickness)) {
          updateParameter('tableThickness', Math.min(Math.max(thickness, 2), 8));
        }
        break;
      case '桌面圆角':
        const rounded = parseInt(paramValue);
        if (!isNaN(rounded)) {
          updateRoundedCorners(Math.min(Math.max(rounded, 5), 95));
        }
        break;
      default:
        console.warn('未知参数名称:', paramName);
    }
  };

  const handlePromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setError(null);
    
    // 添加用户消息到聊天历史
    const userMessage = { role: 'user' as const, content: prompt, timestamp: new Date() };
    setChatHistory(prev => [...prev, userMessage]);
    
    try {
      setIsLoading(true);
      
      // 准备发送给API的聊天历史
      const messageHistory = chatHistory.map(({ role, content }) => ({ role, content }));
      messageHistory.push({ role: 'user', content: prompt });
      
      let suggestion: string;
      if (useMockApi) {
        suggestion = await mockGenerateTableDesign(prompt, messageHistory);
      } else {
        try {
          suggestion = await generateTableDesign(prompt, messageHistory);
        } catch (apiError) {
          suggestion = await mockGenerateTableDesign(prompt, messageHistory);
          setUseMockApi(true); // 后续请求直接使用模拟API
        }
      }
      
      // 添加AI响应到聊天历史
      setChatHistory(prev => [...prev, { role: 'assistant', content: suggestion, timestamp: new Date() }]);
      
      parseAndUpdateParameters(suggestion);
    } catch (error) {
      setError('生成设计建议时出错: ' + (error instanceof Error ? error.message : '请重试'));
    } finally {
      setIsLoading(false);
      setPrompt('');
    }
  };

  const handleSurpriseMe = async () => {
    setIsGeneratingIdea(true);
    
    // 扩展的提示库，按类别分组
    const surprisePrompts = {
      创意风格: [
        "设计一张宇宙飞船形状的未来派餐桌",
        "设计一张看起来像是漂浮在空中的悬浮桌",
        "设计一张树形桌子，桌腿像树根一样蜿蜒曲折",
        "设计一张集成了水族箱的特色餐桌"
      ],
      实用功能: [
        "设计一张现代简约的办公桌，注重实用性",
        "我需要一张适合家庭使用的大餐桌",
        "设计一张适合小型公寓的节省空间的书桌",
        "给我一张复古风格的工作台设计"
      ],
      特殊场景: [
        "设计一张适合狭小阳台的折叠桌",
        "设计一张适合远程工作的人体工学电脑桌",
        "设计一张可以变形为床的多功能桌",
        "设计一张适合露营使用的便携桌"
      ],
      材质挑战: [
        "设计一张混合使用玻璃和木材的桌子",
        "设计一张环保回收材料制作的时尚桌子",
        "设计一张大理石面配铜腿的奢华桌子",
        "设计一张有机玻璃制成的透明桌子"
      ],
      文化灵感: [
        "设计一张受北欧极简主义启发的桌子",
        "设计一张带有中国传统工艺元素的书桌",
        "设计一张日式禅风低矮茶桌",
        "设计一张美式复古工业风格的餐桌"
      ]
    };
    
    // 与当前设计参数联动的提示
    const materialSuggestions = {
      'titanium': [
        "我想要一张更轻薄的钛金属桌子",
        "如何让钛金属桌面看起来更有质感？",
        "设计一张太空风格的钛金属办公桌"
      ],
      'plastic': [
        `我想尝试${parameters.plasticColor === '#FFFFFF' ? '彩色' : '不同颜色的'}塑料桌子`,
        "如何让塑料材质看起来更高档？",
        "设计一张艺术感强的彩色塑料餐桌"
      ],
      'bronze': [
        "设计一张带有古典风格的青铜桌",
        "如何让青铜桌与现代家居搭配？",
        "带有雕花装饰的青铜桌腿设计"
      ],
      'stainless_steel': [
        "极简风格不锈钢餐桌设计",
        "工业风格不锈钢办公桌",
        "给不锈钢桌面增加一些温暖感"
      ]
    };
    
    // 尺寸相关建议
    const sizeSuggestions = [];
    if (parameters.tableWidth < 70) {
      sizeSuggestions.push("我需要一张更宽的桌子");
    } else if (parameters.tableWidth > 100) {
      sizeSuggestions.push("这张桌子能否设计得窄一些？");
    }
    
    if (parameters.legHeight < 70) {
      sizeSuggestions.push("我想要一张更高的桌子");
    } else if (parameters.legHeight > 80) {
      sizeSuggestions.push("这张桌子能否矮一些？");
    }
    
    if (parameters.roundedCorners < 30) {
      sizeSuggestions.push("我希望桌子的圆角更大一些");
    } else if (parameters.roundedCorners > 70) {
      sizeSuggestions.push("我想要桌子的圆角小一些");
    }
    
    // 情感元素/场景描述
    const emotions = [
      "我刚搬了新家，想要一张能让人眼前一亮的",
      "朋友们常来我家聚会，我需要一张",
      "我是一名设计师，希望有一张能展示我个性的",
      "我的空间有限但追求品质，想要一张"
    ];
    
    // 决定提示类型的策略
    let finalPrompt = "";
    const promptStrategy = Math.random();
    
    // 30%概率使用与当前材质相关的提示
    if (promptStrategy < 0.3 && materialSuggestions[parameters.material]) {
      const materialPrompts = materialSuggestions[parameters.material];
      finalPrompt = materialPrompts[Math.floor(Math.random() * materialPrompts.length)];
    } 
    // 20%概率使用与当前尺寸相关的提示
    else if (promptStrategy < 0.5 && sizeSuggestions.length > 0) {
      finalPrompt = sizeSuggestions[Math.floor(Math.random() * sizeSuggestions.length)];
    }
    // 50%概率使用随机类别的提示
    else {
      // 随机选择一个类别
      const categories = Object.keys(surprisePrompts);
      const randomCategory = categories[Math.floor(Math.random() * categories.length)];
      
      // 从选中类别中随机选择一个提示
      const promptsInCategory = surprisePrompts[randomCategory as keyof typeof surprisePrompts];
      const randomPrompt = promptsInCategory[Math.floor(Math.random() * promptsInCategory.length)];
      
      // 50%概率添加情感元素
      if (Math.random() > 0.5) {
        const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)];
        finalPrompt = `${randomEmotion} ${randomPrompt}`;
      } else {
        finalPrompt = randomPrompt;
      }
    }
    
    // 避免重复的提示
    let attempts = 0;
    while (usedPrompts.has(finalPrompt) && attempts < 10) {
      // 重新生成提示
      const categories = Object.keys(surprisePrompts);
      const randomCategory = categories[Math.floor(Math.random() * categories.length)];
      const promptsInCategory = surprisePrompts[randomCategory as keyof typeof surprisePrompts];
      finalPrompt = promptsInCategory[Math.floor(Math.random() * promptsInCategory.length)];
      attempts++;
    }
    
    // 记录已使用的提示
    setUsedPrompts(prev => new Set([...prev, finalPrompt]));
    
    // 模拟思考过程
    setTimeout(() => {
      setPrompt(finalPrompt);
      setIsGeneratingIdea(false);
    }, 800);
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
      // 查找内部的蓝色进度条div并修改其宽度
      const progressBar = ref.current.querySelector('div');
      if (progressBar) {
        const percent = ((value - min) / (max - min)) * 100;
        progressBar.style.width = `${percent}%`;
      }
    }
  };

  // 在每次参数面板打开时，以及参数变化时重新计算滑块宽度
  useEffect(() => {
    if (isParametersPanelOpen) {
      // 使用requestAnimationFrame确保DOM已更新
      requestAnimationFrame(() => {
        // 初始化所有滑块的宽度
        updateTrackWidth(tableWidthTrackRef, parameters.tableWidth, 40, 120);
        updateTrackWidth(tableLengthTrackRef, parameters.tableLength, 80, 200);
        updateTrackWidth(legHeightTrackRef, parameters.legHeight, 60, 90);
        updateTrackWidth(legWidthTrackRef, parameters.legWidth, 2, 10);
        updateTrackWidth(legMinWidthTrackRef, parameters.legMinWidth, 1, 8);
        updateTrackWidth(legTiltAngleTrackRef, parameters.legTiltAngle, 0, 30);
        updateTrackWidth(tableThicknessTrackRef, parameters.tableThickness, 2, 8);
        updateTrackWidth(roundedCornersTrackRef, parameters.roundedCorners, 5, 95);
        
        console.log('滑块宽度已重新计算');
      });
    }
  }, [
    isParametersPanelOpen,
    parameters.tableWidth, 
    parameters.tableLength, 
    parameters.legHeight, 
    parameters.legWidth,
    parameters.legMinWidth,
    parameters.legTiltAngle,
    parameters.tableThickness, 
    parameters.roundedCorners
  ]);
  
  // 保存成功提示自动消失
  useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(() => {
        setSaveSuccess(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [saveSuccess]);
  
  // 当聊天历史更新时，滚动到底部
  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // 格式化价格显示
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // 格式化时间
  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // 快速提示按钮处理
  const handleQuickPrompt = (text: string) => {
    setPrompt(prev => prev ? `${prev} ${text}` : text);
  };

  // 清空聊天记录
  const clearChatHistory = () => {
    setChatHistory([]);
  };

  // 处理保存设计
  const handleOpenSaveDialog = () => {
    setIsSaveDialogOpen(true);
  };
  
  // 处理打开设计
  const handleOpenDesignsDrawer = () => {
    setIsDesignsDrawerOpen(true);
  };
  
  // 处理保存成功
  const handleDesignSaved = (designId: string) => {
    setSaveSuccess('设计已成功保存！');
    
    // 3秒后清除成功提示
    setTimeout(() => {
      setSaveSuccess(null);
    }, 3000);
  };

  // 处理分享按钮点击
  const handleOpenShareDialog = () => {
    setIsShareDialogOpen(true);
  };

  return (
    <div className="h-full flex flex-col p-4 overflow-hidden relative">
      {/* 头部 */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">AI Table Designer</h2>
        <div className="flex items-center gap-2">
          {chatHistory.length > 0 && (
            <button
              onClick={clearChatHistory}
              className="text-xs underline text-gray-500"
            >
              清空对话
            </button>
          )}
          {/* <button
            onClick={handleOpenSaveDialog}
            className="flex items-center px-3 py-1.5 btn-primary"
            title="保存当前设计"
          >
            <Save size={16} className="mr-1.5" />
            保存
          </button>
          
          <button
            onClick={handleOpenDesignsDrawer}
            className="flex items-center px-3 py-1.5 btn-secondary"
            title="查看已保存的设计"
          >
            <FolderOpen size={16} className="mr-1.5" />
            我的设计
          </button> */}
        </div>
      </div>

      {/* 成功提示 */}
      {saveSuccess && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-3 mb-4 rounded">
          {saveSuccess}
        </div>
      )}

      {/* 聊天历史区域 - 固定高度 */}
      <div 
        ref={chatHistoryRef}
        className="h-[480px] overflow-y-auto mb-4 border rounded bg-gray-50 shadow-sm flex flex-col"
      >
        <div className="flex-1 p-4">
          {chatHistory.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-gray-500 px-6 py-10 bg-white card max-w-xs mx-auto">
                <Bot size={24} className="mx-auto mb-2 text-[color:var(--primary-color)]" />
                <p className="text-sm">与AI助手开始对话，获取桌子设计建议</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {chatHistory.map((message, index) => (
                <div 
                  key={index} 
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="avatar avatar-assistant">
                      <Bot size={16} className="text-[color:var(--primary-color)]" />
                    </div>
                  )}
                  
                  <div className={`relative max-w-[80%] group`}>
                    <div 
                      className={`p-3 rounded chat-message ${
                        message.role === 'user' 
                          ? 'chat-message-user bg-[color:var(--primary-color)] text-white' 
                          : 'chat-message-assistant bg-white border'
                      }`}
                    >
                      <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                    </div>
                    <div 
                      className={`text-xs text-gray-500 mt-1 opacity-70 ${
                        message.role === 'user' ? 'text-right mr-2' : 'ml-2'
                      }`}
                    >
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                  
                  {message.role === 'user' && (
                    <div className="avatar avatar-user">
                      <User size={16} className="text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 快速提示按钮 - 移到聊天历史和输入框之间的位置 */}
      <div className="flex flex-wrap gap-2 mb-3">
        <button
          type="button"
          className="px-3 py-1 bg-white border rounded-full text-sm flex items-center gap-1 hover:bg-gray-50 disabled:opacity-50 shadow-sm transition-all"
          onClick={handleSurpriseMe}
          disabled={isLoading || isGeneratingIdea}
        >
          <Sparkles size={14} className={`text-[color:var(--primary-color)] ${isGeneratingIdea ? 'animate-spin' : ''}`} />
          {isGeneratingIdea ? '思考中...' : '获取灵感'}
        </button>
        <button 
          onClick={() => handleQuickPrompt("我需要一张圆角更大的桌子")}
          className="text-xs px-2 py-1 border rounded-full bg-gray-50 hover:bg-gray-100"
        >
          圆角 +
        </button>
        <button 
          onClick={() => handleQuickPrompt("调整桌面圆角，我希望设为50%")}
          className="text-xs px-2 py-1 border rounded-full bg-gray-50 hover:bg-gray-100"
        >
          圆角设为50%
        </button>
        <button 
          onClick={() => handleQuickPrompt("我想要锥形桌腿，顶部粗底部细")}
          className="text-xs px-2 py-1 border rounded-full bg-gray-50 hover:bg-gray-100"
        >
          锥形桌腿
        </button>
        <button 
          onClick={() => handleQuickPrompt("使桌腿变细一些，约3cm宽")}
          className="text-xs px-2 py-1 border rounded-full bg-gray-50 hover:bg-gray-100"
        >
          细桌腿
        </button>
        <button 
          onClick={() => handleQuickPrompt("换成蓝色塑料桌子")}
          className="text-xs px-2 py-1 border rounded-full bg-gray-50 hover:bg-gray-100"
        >
          蓝色塑料
        </button>
        <button 
          onClick={() => handleQuickPrompt("调整桌子材料，我想换成钛金属")}
          className="text-xs px-2 py-1 border rounded-full bg-gray-50 hover:bg-gray-100"
        >
          钛金属
        </button>
        <button 
          onClick={() => handleQuickPrompt("适合几人使用？")}
          className="text-xs px-2 py-1 border rounded-full bg-gray-50 hover:bg-gray-100"
        >
          使用人数？
        </button>
      </div>

      {/* 聊天输入区域 */}
      <div className="mb-4">
        <form onSubmit={handlePromptSubmit} className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="描述您想要的桌子设计..."
            className="w-full h-24 p-3 input-field resize-none shadow-sm transition-all"
            disabled={isLoading}
          />
          {error && (
            <div className="mt-2 text-red-500 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="absolute bottom-3 right-3 p-2 bg-[color:var(--primary-color)] text-white rounded hover:bg-[color:var(--primary-hover)] disabled:opacity-50 shadow-md transition-all"
            disabled={isLoading || !prompt.trim()}
          >
            <ArrowRight size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </form>
      </div>

      {/* 价格显示 - 替代之前的测试按钮 */}
      <div className="mb-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-600 font-medium">当前价格</span>
          <span className="text-2xl font-bold">{formatPrice(calculatePrice())}</span>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="grid grid-cols-2 gap-4 mt-auto mb-1">
        <button 
          className="w-full p-3 btn-secondary shadow-sm flex items-center justify-center"
          onClick={() => setIsParametersPanelOpen(true)}
        >
          <Settings size={16} className="mr-1.5" />
          参数设置
        </button>
        <button 
          className="w-full p-3 bg-black text-white rounded hover:bg-gray-900 transition-all shadow-sm flex items-center justify-center"
          onClick={handleOpenShareDialog}
        >
          <Share2 size={16} className="mr-1.5" />
          分享
        </button>
      </div>

      {/* 调整组件间距 */}
      <div className="mt-2 mb-4"></div>
      
      {/* 参数面板弹出抽屉 */}
      {isParametersPanelOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-25 flex justify-end">
          <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-xl p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">参数设置</h2>
              <button 
                onClick={() => setIsParametersPanelOpen(false)}
                className="p-1 rounded hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* 尺寸设置面板 */}
            <div className="mb-4">
              <div 
                className="flex justify-between items-center p-2 bg-gray-100 rounded cursor-pointer"
                onClick={() => setIsDimensionsPanelOpen(!isDimensionsPanelOpen)}
              >
                <h3 className="font-medium">尺寸设置</h3>
                {isDimensionsPanelOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </div>
              
              {isDimensionsPanelOpen && (
                <div className="p-2 space-y-4 mt-2 border rounded">
                  {/* 桌子宽度 */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-sm text-gray-600">桌子宽度</label>
                      <span className="text-sm font-medium">{parameters.tableWidth} cm</span>
                    </div>
                    <div 
                      ref={tableWidthTrackRef}
                      className="h-2 bg-gray-200 rounded overflow-hidden cursor-pointer"
                      onClick={(e) => {
                        if (tableWidthTrackRef.current) {
                          const rect = tableWidthTrackRef.current.getBoundingClientRect();
                          const trackWidth = rect.width;
                          const clickPosition = e.clientX - rect.left;
                          const percentage = Math.max(0, Math.min(1, clickPosition / trackWidth));
                          const newValue = Math.round(40 + percentage * (120 - 40));
                          updateParameter('tableWidth', newValue);
                          updateTrackWidth(tableWidthTrackRef, newValue, 40, 120);
                        }
                      }}
                    >
                      <div 
                        className="h-full bg-[color:var(--primary-color)]"
                        style={{ width: `${((parameters.tableWidth - 40) / (120 - 40)) * 100}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-gray-500">
                      <span>40 cm</span>
                      <span>120 cm</span>
                    </div>
                  </div>
                  
                  {/* 桌子长度 */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-sm text-gray-600">桌子长度</label>
                      <span className="text-sm font-medium">{parameters.tableLength} cm</span>
                    </div>
                    <div 
                      ref={tableLengthTrackRef}
                      className="h-2 bg-gray-200 rounded overflow-hidden cursor-pointer"
                      onClick={(e) => {
                        if (tableLengthTrackRef.current) {
                          const rect = tableLengthTrackRef.current.getBoundingClientRect();
                          const trackWidth = rect.width;
                          const clickPosition = e.clientX - rect.left;
                          const percentage = Math.max(0, Math.min(1, clickPosition / trackWidth));
                          const newValue = Math.round(80 + percentage * (200 - 80));
                          updateParameter('tableLength', newValue);
                          updateTrackWidth(tableLengthTrackRef, newValue, 80, 200);
                        }
                      }}
                    >
                      <div 
                        className="h-full bg-[color:var(--primary-color)]"
                        style={{ width: `${((parameters.tableLength - 80) / (200 - 80)) * 100}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-gray-500">
                      <span>80 cm</span>
                      <span>200 cm</span>
                    </div>
                  </div>
                  
                  {/* 桌腿高度 */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-sm text-gray-600">桌腿高度</label>
                      <span className="text-sm font-medium">{parameters.legHeight} cm</span>
                    </div>
                    <div 
                      ref={legHeightTrackRef}
                      className="h-2 bg-gray-200 rounded overflow-hidden cursor-pointer"
                      onClick={(e) => {
                        if (legHeightTrackRef.current) {
                          const rect = legHeightTrackRef.current.getBoundingClientRect();
                          const trackWidth = rect.width;
                          const clickPosition = e.clientX - rect.left;
                          const percentage = Math.max(0, Math.min(1, clickPosition / trackWidth));
                          const newValue = Math.round(60 + percentage * (90 - 60));
                          updateParameter('legHeight', newValue);
                          updateTrackWidth(legHeightTrackRef, newValue, 60, 90);
                        }
                      }}
                    >
                      <div 
                        className="h-full bg-[color:var(--primary-color)]"
                        style={{ width: `${((parameters.legHeight - 60) / (90 - 60)) * 100}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-gray-500">
                      <span>60 cm</span>
                      <span>90 cm</span>
                    </div>
                  </div>
                  
                  {/* 桌腿宽度 */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-sm text-gray-600">桌腿宽度</label>
                      <span className="text-sm font-medium">{parameters.legWidth} cm</span>
                    </div>
                    <div 
                      ref={legWidthTrackRef}
                      className="h-2 bg-gray-200 rounded overflow-hidden cursor-pointer"
                      onClick={(e) => {
                        if (legWidthTrackRef.current) {
                          const rect = legWidthTrackRef.current.getBoundingClientRect();
                          const trackWidth = rect.width;
                          const clickPosition = e.clientX - rect.left;
                          const percentage = Math.max(0, Math.min(1, clickPosition / trackWidth));
                          const newValue = Math.round(2 + percentage * (10 - 2));
                          updateParameter('legWidth', newValue);
                          updateTrackWidth(legWidthTrackRef, newValue, 2, 10);
                        }
                      }}
                    >
                      <div 
                        className="h-full bg-[color:var(--primary-color)]"
                        style={{ width: `${((parameters.legWidth - 2) / (10 - 2)) * 100}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-gray-500">
                      <span>2 cm</span>
                      <span>10 cm</span>
                    </div>
                  </div>
                  
                  {/* 桌腿底部宽度 */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-sm text-gray-600">桌腿底部宽度</label>
                      <span className="text-sm font-medium">{parameters.legMinWidth} cm</span>
                    </div>
                    <div 
                      ref={legMinWidthTrackRef}
                      className="h-2 bg-gray-200 rounded overflow-hidden cursor-pointer"
                      onClick={(e) => {
                        if (legMinWidthTrackRef.current) {
                          const rect = legMinWidthTrackRef.current.getBoundingClientRect();
                          const trackWidth = rect.width;
                          const clickPosition = e.clientX - rect.left;
                          const percentage = Math.max(0, Math.min(1, clickPosition / trackWidth));
                          const newValue = Math.round(1 + percentage * (8 - 1));
                          updateParameter('legMinWidth', newValue);
                          updateTrackWidth(legMinWidthTrackRef, newValue, 1, 8);
                        }
                      }}
                    >
                      <div 
                        className="h-full bg-[color:var(--primary-color)]"
                        style={{ width: `${((parameters.legMinWidth - 1) / (8 - 1)) * 100}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-gray-500">
                      <span>1 cm</span>
                      <span>8 cm</span>
                    </div>
                  </div>
                  
                  {/* 桌腿倾斜角度 */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-sm text-gray-600">桌腿倾斜角度</label>
                      <span className="text-sm font-medium">{parameters.legTiltAngle}°</span>
                    </div>
                    <div 
                      ref={legTiltAngleTrackRef}
                      className="h-2 bg-gray-200 rounded overflow-hidden cursor-pointer"
                      onClick={(e) => {
                        if (legTiltAngleTrackRef.current) {
                          const rect = legTiltAngleTrackRef.current.getBoundingClientRect();
                          const trackWidth = rect.width;
                          const clickPosition = e.clientX - rect.left;
                          const percentage = Math.max(0, Math.min(1, clickPosition / trackWidth));
                          const newValue = Math.round(0 + percentage * (30 - 0));
                          updateParameter('legTiltAngle', newValue);
                          updateTrackWidth(legTiltAngleTrackRef, newValue, 0, 30);
                        }
                      }}
                    >
                      <div 
                        className="h-full bg-[color:var(--primary-color)]"
                        style={{ width: `${((parameters.legTiltAngle - 0) / (30 - 0)) * 100}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-gray-500">
                      <span>0°</span>
                      <span>30°</span>
                    </div>
                  </div>
                  
                  {/* 桌面厚度 */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-sm text-gray-600">桌面厚度</label>
                      <span className="text-sm font-medium">{parameters.tableThickness} cm</span>
                    </div>
                    <div 
                      ref={tableThicknessTrackRef}
                      className="h-2 bg-gray-200 rounded overflow-hidden cursor-pointer"
                      onClick={(e) => {
                        if (tableThicknessTrackRef.current) {
                          const rect = tableThicknessTrackRef.current.getBoundingClientRect();
                          const trackWidth = rect.width;
                          const clickPosition = e.clientX - rect.left;
                          const percentage = Math.max(0, Math.min(1, clickPosition / trackWidth));
                          const newValue = Math.round((2 + percentage * (8 - 2)) * 10) / 10;
                          updateParameter('tableThickness', newValue);
                          updateTrackWidth(tableThicknessTrackRef, newValue, 2, 8);
                        }
                      }}
                    >
                      <div 
                        className="h-full bg-[color:var(--primary-color)]"
                        style={{ width: `${((parameters.tableThickness - 2) / (8 - 2)) * 100}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-gray-500">
                      <span>2 cm</span>
                      <span>8 cm</span>
                    </div>
                  </div>
                  
                  {/* 桌面圆角 */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-sm text-gray-600">桌面圆角</label>
                      <span className="text-sm font-medium">{parameters.roundedCorners}%</span>
                    </div>
                    <div 
                      ref={roundedCornersTrackRef}
                      className="h-2 bg-gray-200 rounded overflow-hidden cursor-pointer"
                      onClick={(e) => {
                        if (roundedCornersTrackRef.current) {
                          const rect = roundedCornersTrackRef.current.getBoundingClientRect();
                          const trackWidth = rect.width;
                          const clickPosition = e.clientX - rect.left;
                          const percentage = Math.max(0, Math.min(1, clickPosition / trackWidth));
                          const newValue = Math.round(5 + percentage * (95 - 5));
                          
                          // 使用专用函数更新圆角
                          updateRoundedCorners(newValue);
                          
                          updateTrackWidth(roundedCornersTrackRef, newValue, 5, 95);
                        }
                      }}
                    >
                      <div 
                        className="h-full bg-[color:var(--primary-color)]"
                        style={{ width: `${((parameters.roundedCorners - 5) / (95 - 5)) * 100}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-gray-500">
                      <span>5%</span>
                      <span>95%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* 材料设置面板 */}
            <div className="mb-4">
              <div 
                className="flex justify-between items-center p-2 bg-gray-100 rounded cursor-pointer"
                onClick={() => setIsMaterialsPanelOpen(!isMaterialsPanelOpen)}
              >
                <h3 className="font-medium">材料设置</h3>
                {isMaterialsPanelOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </div>
              
              {isMaterialsPanelOpen && (
                <div className="p-2 space-y-2 mt-2 border rounded">
                  <div 
                    className={`p-2 rounded cursor-pointer ${parameters.material === 'titanium' ? 'bg-blue-100 border-2 border-[color:var(--primary-color)]' : 'border hover:bg-gray-50'}`}
                    onClick={() => updateParameter('material', 'titanium')}
                  >
                    <div className="font-medium">钛金属 (Titanium)</div>
                    <div className="text-sm text-gray-600">轻量、高强度、现代感</div>
                  </div>
                  
                  <div 
                    className={`p-2 rounded cursor-pointer ${parameters.material === 'bronze' ? 'bg-blue-100 border-2 border-[color:var(--primary-color)]' : 'border hover:bg-gray-50'}`}
                    onClick={() => updateParameter('material', 'bronze')}
                  >
                    <div className="font-medium">青铜 (Bronze)</div>
                    <div className="text-sm text-gray-600">古典、高档、温暖</div>
                  </div>
                  
                  <div 
                    className={`p-2 rounded cursor-pointer ${parameters.material === 'plastic' ? 'bg-blue-100 border-2 border-[color:var(--primary-color)]' : 'border hover:bg-gray-50'}`}
                    onClick={() => updateParameter('material', 'plastic')}
                  >
                    <div className="font-medium">塑料 (Plastic)</div>
                    <div className="text-sm text-gray-600">轻便、实惠、多色选择</div>
                  </div>
                  
                  {/* 塑料颜色选择器，仅在选择塑料材质时显示 */}
                  {parameters.material === 'plastic' && (
                    <div className="p-2 border rounded mt-2">
                      <div className="font-medium mb-2">塑料颜色</div>
                      <div className="flex flex-wrap gap-2">
                        {['#2C2C2C', '#FF5733', '#33FF57', '#3357FF', '#F3FF33', '#FF33F3', '#33FFF3', '#FFFFFF'].map((color) => (
                          <div 
                            key={color}
                            className={`w-8 h-8 rounded cursor-pointer border-2 ${parameters.plasticColor === color ? 'border-[color:var(--primary-color)]' : 'border-gray-300'}`}
                            style={{ backgroundColor: color }}
                            onClick={() => updateParameter('plasticColor', color)}
                            title={color}
                          />
                        ))}
                      </div>
                      <div className="mt-3">
                        <label className="text-sm text-gray-600 block mb-1">自定义颜色</label>
                        <div className="flex items-center">
                          <input 
                            type="color" 
                            value={parameters.plasticColor}
                            onChange={(e) => updateParameter('plasticColor', e.target.value)}
                            className="h-8 w-8 p-0 border-0 cursor-pointer"
                          />
                          <span className="ml-2 text-sm font-medium">{parameters.plasticColor}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div 
                    className={`p-2 rounded cursor-pointer ${parameters.material === 'stainless_steel' ? 'bg-blue-100 border-2 border-[color:var(--primary-color)]' : 'border hover:bg-gray-50'}`}
                    onClick={() => updateParameter('material', 'stainless_steel')}
                  >
                    <div className="font-medium">不锈钢 (Stainless Steel)</div>
                    <div className="text-sm text-gray-600">耐用、现代、易清洁</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* 保存设计对话框 */}
      <SaveDesignDialog 
        isOpen={isSaveDialogOpen}
        onClose={() => setIsSaveDialogOpen(false)}
        onSaved={handleDesignSaved}
      />
      
      {/* 已保存设计抽屉 */}
      <SavedDesignsDrawer
        isOpen={isDesignsDrawerOpen}
        onClose={() => setIsDesignsDrawerOpen(false)}
      />
      
      {/* 分享海报弹窗 */}
      <SharePosterDialog
        isOpen={isShareDialogOpen}
        onClose={() => setIsShareDialogOpen(false)}
        latestDescription={chatHistory.length > 0 ? 
          chatHistory.filter(msg => msg.role === 'assistant').pop()?.content || '' : 
          '一张现代风格的自定义桌子'}
        lastUserPrompt={chatHistory.length > 0 ? 
          chatHistory.filter(msg => msg.role === 'user').pop()?.content || '' : 
          ''}
      />
    </div>
  );
}