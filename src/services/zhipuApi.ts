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

export async function generateChairDesign(prompt: string): Promise<string> {
  try {
    console.log('Starting chair design generation with prompt:', prompt);
    
    if (!API_KEY) {
      throw new Error('API key is not configured');
    }

    // 解析API密钥并生成JWT token
    const { id: apiKey, secret } = parseApiKey(API_KEY);
    const token = generateToken(apiKey, secret);
    
    const requestBody = {
      model: "glm-4",
      messages: [
        {
          role: 'system',
          content: `你是一个专业的椅子设计师，可以根据用户的需求提供椅子设计建议。
请按照以下格式回复：
---
材料：[titanium/bronze/plastic/stainless_steel]
座椅宽度：[40-80]cm
座椅高度：[40-80]cm
靠背高度：[30-100]cm
设计说明：[简要说明设计理念和特点]
---
注意：
1. 材料必须从以下选项中选择：titanium（钛金属）、bronze（青铜）、plastic（塑料）、stainless_steel（不锈钢）
2. 尺寸必须在指定范围内
3. 根据用户描述的场景和需求选择合适的材料和尺寸`
        },
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
    console.error('Detailed error in generateChairDesign:', error);
    
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