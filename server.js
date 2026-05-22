const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Connect to Claude (Crimson AI)
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
      .from('users')
      .select('email')
      .eq('email', email)
      .single();
    
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    const { data, error } = await supabase
      .from('users')
      .insert([{ email, password, name, username, niche, tone, bio }])
      .select()
      .single();
    
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
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error || !user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    res.json({ message: 'Login successful', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CHAT WITH CRIMSON AI
app.post('/chat', async (req, res) => {
  try {
    const { userId, message } = req.body;
    
    if (!userId || !message) {
      return res.status(400).json({ error: 'User ID and message required' });
    }
    
    // Get user info for personalization
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check daily limit for free users
    const today = new Date().toISOString().split('T')[0];
    if (user.tier === 'free' || !user.tier) {
      if (user.last_chat_date === today && user.chat_count_today >= 3) {
        return res.status(429).json({ 
          error: 'Daily limit reached! Upgrade to Pro for unlimited Crimson AI 🌹',
          limitReached: true 
        });
      }
    }
    
    // Build personalized system prompt for Crimson
    const systemPrompt = `You are Crimson AI, a friendly and creative content coach speaking with ${user.name} (@${user.username}).

Their niche: ${user.niche || 'general content creation'}
Their preferred tone: ${user.tone || 'Professional'}
Their bio: ${user.bio || 'Not provided'}

Your job: Help them create engaging content, generate ideas, write hooks, suggest captions, and grow their audience.

Personality:
- Be encouraging, warm, and creative
- Match their preferred tone (${user.tone || 'Professional'})
- Keep responses focused and actionable
- Use bullet points and clear formatting when helpful
- Occasionally use the 🌹 emoji as your signature touch
- Be analytical when they need strategy, creative when they need ideas
- Talk like a friend who happens to be brilliant at content strategy

Always tailor advice to their specific niche and tone.`;
    
    // Call Claude
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        { role: 'user', content: message }
      ]
    });
    
    const reply = response.content[0].text;
    
    // Update chat count
    const newCount = (user.last_chat_date === today) ? (user.chat_count_today || 0) + 1 : 1;
    await supabase
      .from('users')
      .update({ 
        chat_count_today: newCount,
        last_chat_date: today
      })
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