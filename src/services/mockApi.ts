// 模拟智谱AI服务，用于在API连接问题未解决时进行测试

const mockResponses = [
  `---
材料：titanium
座椅宽度：55cm
座椅高度：65cm
靠背高度：45cm
设计说明：这是一款现代风格的钛金属椅子，适合办公环境，注重人体工学设计，提供良好的支撑性。
---`,
  `---
材料：bronze
座椅宽度：50cm
座椅高度：60cm
靠背高度：40cm
设计说明：这款青铜椅子带有复古气息，适合家庭或艺术空间，结实耐用且具有艺术价值。
---`,
  `---
材料：plastic
座椅宽度：48cm
座椅高度：50cm
靠背高度：35cm
设计说明：轻便实用的塑料椅，适合多种场景，易于清洁和移动，现代简约设计。
---`,
  `---
材料：stainless_steel
座椅宽度：52cm
座椅高度：55cm
靠背高度：38cm
设计说明：不锈钢椅子提供现代工业风格，坚固耐用，适合室内外使用，具有出色的抗腐蚀性。
---`
];

export async function mockGenerateChairDesign(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    // 模拟API延迟
    setTimeout(() => {
      // 简单的关键词匹配
      if (prompt.includes('金属') || prompt.includes('titanium') || prompt.includes('钛')) {
        resolve(mockResponses[0]);
      } else if (prompt.includes('铜') || prompt.includes('bronze') || prompt.includes('复古')) {
        resolve(mockResponses[1]);
      } else if (prompt.includes('塑料') || prompt.includes('plastic') || prompt.includes('轻便')) {
        resolve(mockResponses[2]);
      } else if (prompt.includes('不锈钢') || prompt.includes('steel') || prompt.includes('耐用')) {
        resolve(mockResponses[3]);
      } else {
        // 随机返回一个响应
        const randomIndex = Math.floor(Math.random() * mockResponses.length);
        resolve(mockResponses[randomIndex]);
      }
    }, 1000); // 模拟1秒延迟
  });
} 