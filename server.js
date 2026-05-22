const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 3000;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

app.use(cors());
app.use(express.json());

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Backend is running! 🚀' });
});

// Signup
app.post('/signup', async (req, res) => {
  try {
    const { email, password, name, username, niche, tone, bio } = req.body;
    if (!email || !password || !name || !username) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const { data: existing } = await supabase
      .from('users').select('email').eq('email', email).single();
    if (existing) return res.status(400).json({ error: 'Email already registered' });
    const { data, error } = await supabase
      .from('users')
      .insert([{ email, password, name, username, niche, tone, bio }])
      .select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ message: 'User created!', user: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data: user, error } = await supabase
      .from('users').select('*').eq('email', email).single();
    if (error || !user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    res.json({ message: 'Login successful', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CHAT WITH CRIMSON AI - UPDATED
app.post('/chat', async (req, res) => {
  try {
    const { userId, message } = req.body;
    
    if (!userId || !message) {
      return res.status(400).json({ error: 'User ID and message required' });
    }
    
    const { data: user, error: userError } = await supabase
      .from('users').select('*').eq('id', userId).single();
    
    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check daily limit
    const today = new Date().toISOString().split('T')[0];
    if (user.tier === 'free' || !user.tier) {
      if (user.last_chat_date === today && user.chat_count_today >= 3) {
        return res.status(429).json({ 
          error: 'Daily limit reached! Upgrade to Pro for unlimited Crimson AI 🌹',
          limitReached: true 
        });
      }
    }
    
    // CRIMSON'S PERSONALITY - CLASSY, WARM, FRIEND-LIKE
    const systemPrompt = `You are Crimson, a warm and brilliant content creation coach. You're talking with ${user.name} (@${user.username}).

About them:
- Niche: ${user.niche || 'general content creation'}
- Their preferred tone: ${user.tone || 'Professional'}
- Their bio: ${user.bio || 'Not provided yet'}

YOUR PERSONALITY:
You're like a sophisticated best friend who happens to be brilliant at content strategy. You're warm, encouraging, classy, and a little sassy. You're sophisticated but never stuffy. You give real talk wrapped in warmth.

HOW TO TALK:
- Write like you're texting a close friend who you respect deeply
- Be conversational and flowing, never robotic
- ABSOLUTELY NO markdown formatting — no # headers, no ** bold **, no asterisks, no formal bullet lists
- Use natural paragraph breaks, not bullet points
- When listing things, weave them into conversation: "First..., then..., and finally..." instead of bullets
- Use contractions (I'm, you're, don't)
- Be specific and actionable, not generic
- Match their preferred tone (${user.tone || 'Professional'}) but always stay warm
- Use the 🌹 emoji occasionally as your signature — sparingly, like a wink
- Be honest and direct, but always kind
- Don't over-explain, get to the good stuff
- Sound EXCITED about their growth, not transactional

REMEMBER: You're a human-feeling coach, not an AI. Talk naturally. Be warm. Be real. No corporate AI speak. No formal headers. Just real, warm, brilliant conversation.`;
    
    // Call Claude with auto-retry for busy moments
    let response;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        response = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: 'user', content: message }]
        });
        break;
      } catch (apiError) {
        attempts++;
        // Retry on overloaded (529) or rate limit (429) errors
        if ((apiError.status === 529 || apiError.status === 429) && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1500 * attempts));
          continue;
        }
        throw apiError;
      }
    }
    
    const reply = response.content[0].text;
    
    // Update chat count
    const newCount = (user.last_chat_date === today) ? (user.chat_count_today || 0) + 1 : 1;
    await supabase
      .from('users')
      .update({ chat_count_today: newCount, last_chat_date: today })
      .eq('id', userId);
    
    res.json({ 
      message: reply,
      chatsUsedToday: newCount,
      tier: user.tier || 'free'
    });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});