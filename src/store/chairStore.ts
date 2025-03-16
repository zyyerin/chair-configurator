import { create } from 'zustand';
import { ChairParameters } from '../types';

interface ChairStore {
  parameters: ChairParameters;
  updateParameter: (key: keyof ChairParameters, value: any) => void;
  calculatePrice: () => number;
}

// 材质基础价格
const MATERIAL_BASE_PRICES = {
  titanium: 8000,
  bronze: 5000,
  plastic: 2000,
  stainless_steel: 4000,
};

// 尺寸系数
const SIZE_MULTIPLIER = 1.5; // 每增加1cm增加的价格系数

export const useChairStore = create<ChairStore>((set, get) => ({
  parameters: {
    seatWidth: 50,
    seatDepth: 45,
    seatHeight: 70,
    backrestHeight: 30,
    backrestAngle: 100,
    legStyle: 'modern',
    material: 'titanium',
    color: '#8B4513',
  },
  
  updateParameter: (key, value) =>
    set((state) => ({
      parameters: {
        ...state.parameters,
        [key]: value,
      },
    })),

  calculatePrice: () => {
    const { parameters } = get();
    
    // 获取材质基础价格
    const materialBasePrice = MATERIAL_BASE_PRICES[parameters.material] || MATERIAL_BASE_PRICES.plastic;
    
    // 计算尺寸因素
    const sizePrice = (
      (parameters.seatWidth - 40) + // 座椅宽度贡献
      (parameters.seatHeight - 40) + // 座椅高度贡献
      (parameters.backrestHeight - 30) // 靠背高度贡献
    ) * SIZE_MULTIPLIER;
    
    // 计算总价
    const totalPrice = materialBasePrice + sizePrice;
    
    // 保留两位小数
    return Math.round(totalPrice * 100) / 100;
  },
}));