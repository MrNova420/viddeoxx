// TherapySpace Web Worker
// Runs ALL ML inference off the main thread — main thread never freezes.
import { pipeline, env, TextStreamer } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1';

const MODEL = 'HuggingFaceTB/SmolLM2-135M-Instruct';

env.allowLocalModels  = false;
env.allowRemoteModels = true;
env.useBrowserCache   = true;  // Use browser cache for faster subsequent loads

let pipe = null;

// ── Load model ────────────────────────────────────────────────────────────────
async function loadModel() {
  try {
    self.postMessage({ type: 'progress', payload: { status: 'initiate', progress: 0 } });
    
    pipe = await pipeline('text-generation', MODEL, {
      dtype: 'q4',
      device: 'wasm',
      progress_callback: (p) => {
        // Enhanced progress reporting
        self.postMessage({ type: 'progress', payload: p });
      },
    });
    
    self.postMessage({ type: 'progress', payload: { status: 'ready', progress: 100 } });
    self.postMessage({ type: 'ready' });
  } catch (e) {
    console.error('Model load error:', e);
    self.postMessage({ type: 'load_error', message: e.message || 'Failed to load model. Please refresh and try again.' });
  }
}

// ── Handle messages from main thread ─────────────────────────────────────────
self.addEventListener('message', async (e) => {
  const { type, messages, config } = e.data;

  if (type === 'generate') {
    if (!pipe) {
      self.postMessage({ type: 'error', message: 'Model not ready yet' });
      return;
    }
    try {
      const streamer = new TextStreamer(pipe.tokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
        callback_function: (token) => self.postMessage({ type: 'token', token }),
      });

      await pipe(messages, {
        max_new_tokens:     config?.max_new_tokens     ?? 150,
        temperature:        config?.temperature        ?? 0.7,
        repetition_penalty: config?.repetition_penalty ?? 1.1,
        do_sample:          config?.do_sample          ?? true,
        streamer,
      });

      self.postMessage({ type: 'done' });
    } catch (e) {
      self.postMessage({ type: 'error', message: e.message });
    }
  }
});

// Start loading immediately when worker is created
loadModel();
