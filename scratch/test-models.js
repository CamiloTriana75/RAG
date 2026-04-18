const axios = require('axios');

async function testFreeModels() {
  const apiKey = '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';
  const models = [
    'meta-llama/llama-3.3-70b-instruct:free',
    'meta-llama/llama-3.2-3b-instruct:free',
    'google/gemma-2-9b-it:free',
    'qwen/qwen3-coder:free',
    'cognitivecomputations/dolphin3.0-r1-mistral-24b:free',
    'deepseek/deepseek-chat:free'
  ];

  for (const model of models) {
    console.log(`\nTesting ${model}...`);
    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: model,
          messages: [{ role: 'user', content: 'Say OK' }]
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'NestJS Test'
          },
          validateStatus: false
        }
      );
      
      if (response.status === 200) {
        console.log(`✅ SUCCESS: ${model} -> ${response.data.choices?.[0]?.message?.content}`);
      } else {
        console.log(`❌ ERROR ${response.status}: ${JSON.stringify(response.data.error || response.data)}`);
      }
    } catch (e) {
      console.log(`❌ FETCH ERROR: ${e.message}`);
    }
  }
}

testFreeModels();
