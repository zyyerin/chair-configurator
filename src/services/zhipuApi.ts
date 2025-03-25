import axios from 'axios';
import CryptoJS from 'crypto-js';

const API_KEY = import.meta.env.VITE_ZHIPU_API_KEY;
// 智谱API格式可能需要调整
const API_BASE_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

// 解析API密钥
const parseApiKey = (apiKey: string) => {
  const parts = apiKey.split('.');
  if (parts.length !== 2) {
    throw new Error('Invalid API key format');
  }
  return { id: parts[0], secret: parts[1] };
};

// 生成JWT token
const generateToken = (apiKey: string, secret: string): string => {
  const header = {
    "alg": "HS256",
    "sign_type": "SIGN"
  };

  const payload = {
    "api_key": apiKey,
    "exp": Math.floor(Date.now() / 1000) + 3600,
    "timestamp": Math.floor(Date.now() / 1000)
  };

  const headerBase64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadBase64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const signContent = `${headerBase64}.${payloadBase64}`;
  const signature = CryptoJS.HmacSHA256(signContent, secret).toString(CryptoJS.enc.Base64)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${headerBase64}.${payloadBase64}.${signature}`;
};

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function generateTableDesign(prompt: string, chatHistory: Array<{role: 'user' | 'assistant'; content: string}> = []): Promise<string> {
  try {
    console.log('Starting table design generation with prompt:', prompt);
    
    if (!API_KEY) {
      throw new Error('API key is not configured');
    }

    // 解析API密钥并生成JWT token
    const { id: apiKey, secret } = parseApiKey(API_KEY);
    const token = generateToken(apiKey, secret);
    
    // 构建消息历史，将最近的消息添加到上下文中
    const historyMessages = chatHistory.slice(-6).map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    const systemPrompt = `您是一位专业的桌子设计顾问，擅长根据用户需求提供桌子的设计建议。

核心要求：
1. 回复必须简洁自然，像真人设计师一样对话，总共不超过10句话
2. 避免罗列参数，而是用流畅的语言描述设计特点
3. 只提及最关键的参数，融入自然语言中
4. 重要：不要给出重复的描述

参数范围（仅作参考，不要在回复中直接列出）：
- 材料：titanium(钛金属)、bronze(青铜)、plastic(塑料)、stainless_steel(不锈钢)
- 桌子尺寸：宽40-120cm，长80-200cm
- 桌腿：高度60-90cm，宽度2-10cm，底部宽度1-8cm，倾斜角度0-30°
- 桌面：厚度2-8cm，圆角5-95%
- 塑料颜色：仅当材料为plastic时使用，如#FF5733

重要规则：
- 当用户提到任何颜色（如蓝色、红色等）时，自动将材料设为plastic，并设置相应的塑料颜色值
- 常见颜色对应的十六进制值：蓝色#0055FF，红色#FF0000，绿色#00FF00，黄色#FFFF00，黑色#000000，白色#FFFFFF
- 你的回复应该非常简短，直接，没有多余内容

回复格式（必须严格遵守）：
只需提供一段简短描述，末尾附上参数更新标记。不要重复描述，不要分段。
例如：
"为您推荐一款轻巧现代的工作桌，采用鲜亮的红橙色塑料材质，简约的长方形设计配合适中的圆角处理，锥形桌腿略微内倾提供稳定支撑。[参数更新: 材料: plastic, 桌子宽度: 80, 桌子长度: 160, 桌腿高度: 75, 桌腿宽度: 4, 桌腿底部宽度: 2, 桌腿倾斜角度: 5, 桌面厚度: 3, 桌面圆角: 15, 塑料颜色: #FF5733]"`;
    
    const requestBody = {
      model: "glm-4",
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        ...historyMessages,
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      stream: false
    };

    console.log('Request headers:', {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    const response = await axios.post(
      API_BASE_URL,
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Raw API Response:', JSON.stringify(response.data, null, 2));

    if (!response.data) {
      throw new Error('Empty response from API');
    }

    if (!response.data.choices || !Array.isArray(response.data.choices) || response.data.choices.length === 0) {
      throw new Error('Invalid response format: missing choices array');
    }

    const choice = response.data.choices[0];
    if (!choice.message || !choice.message.content) {
      throw new Error('Invalid response format: missing message content');
    }

    return choice.message.content;
  } catch (error) {
    console.error('Detailed error in generateTableDesign:', error);
    
    if (axios.isAxiosError(error)) {
      const responseData = error.response?.data;
      const statusCode = error.response?.status;
      const statusText = error.response?.statusText;
      
      console.error('API Error details:', {
        status: statusCode,
        statusText: statusText,
        data: responseData
      });

      throw new Error(`API调用失败 (${statusCode}): ${responseData?.error?.message || statusText || '未知错误'}`);
    }

    if (error instanceof Error) {
      throw new Error(`生成设计建议时出错: ${error.message}`);
    }

    throw new Error('生成设计建议时发生未知错误');
  }
} 