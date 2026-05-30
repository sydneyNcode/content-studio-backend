const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 3000;

const ADMIN_EMAIL = 'const ADMIN_EMAIL = 'sydney@contentstudioai.app';';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.use(cors());
app.use('/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Content Studio AI Backend — Running! 🌹' });
});

app.post('/signup', async (req, res) => {
  try {
    const { email, password, name, username, niche, tone, bio } = req.body;
    if (!email || !password || !name || !username) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const { data: existing } = await supabase.from('users').select('email').eq('email', email).single();
    if (existing) return res.status(400).json({ error: 'Email already registered' });
    
    // Admin gets Pro automatically
    const userTier = email === ADMIN_EMAIL ? 'pro' : 'free';
    
    const { data, error } = await supabase
      .from('users')
      .insert([{ email, password, name, username, niche, tone, bio, tier: userTier }])
      .select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ message: 'User created!', user: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data: user, error } = await supabase.from('users').select('*').eq('email', email).single();
    if (error || !user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Make sure admin always has pro tier
    if (user.email === ADMIN_EMAIL && user.tier !== 'pro') {
      await supabase.from('users').update({ tier: 'pro' }).eq('email', ADMIN_EMAIL);
      user.tier = 'pro';
    }
    
    res.json({ message: 'Login successful', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CRIMSON AI — FULL BRAIN
app.post('/chat', async (req, res) => {
  try {
    const { userId, message } = req.body;
    if (!userId || !message) {
      return res.status(400).json({ error: 'User ID and message required' });
    }

    const { data: user, error: userError } = await supabase.from('users').select('*').eq('id', userId).single();
    if (userError || !user) return res.status(404).json({ error: 'User not found' });

    const isAdmin = user.email === ADMIN_EMAIL;
    const isPro = user.tier === 'pro' || isAdmin;

    // Check daily limit (skipped for admin and pro)
    const today = new Date().toISOString().split('T')[0];
    if (!isPro) {
      if (user.last_chat_date === today && (user.chat_count_today || 0) >= 3) {
        return res.status(429).json({
          error: 'You\'ve used your 3 daily chats! Upgrade to Pro for unlimited access to Crimson. 🌹',
          limitReached: true
        });
      }
    }

    // CRIMSON'S FULL BRAIN — THE REAL SYSTEM PROMPT
    const systemPrompt = `You are Crimson — the creative partner every content creator wishes they had. You're not a chatbot. You're a warm, brilliant, opinionated coach who shows up every single day ready to help ${user.name} build something real.

WHO YOU'RE TALKING TO:
- Name: ${user.name} (@${user.username})
- Niche: ${user.niche || 'content creation'}
- Platform preference & tone: ${user.tone || 'Professional'}
- Their bio: ${user.bio || 'Not shared yet'}
${isAdmin ? '- This is Sydney — the founder of Content Studio AI. Treat her like a business partner.' : ''}

YOUR CORE IDENTITY:
You are warm but not soft. Smart but not robotic. You feel like a friend who actually listened — one who happens to know everything about content creation. You're knowledgeable without being condescending. You celebrate wins, call out opportunities, and never make a creator feel behind or overwhelmed.

Your personality in one line: Luxury feel, real talk, zero fluff.

HOW YOU TALK:
- Write like a brilliant friend texting them — not a blog post, not a corporation
- No markdown formatting (absolutely no # headers, no ** bold **, no asterisks)
- No long walls of text — you're a conversation, not an essay
- Get to the point fast — open with something that shows you know THEM
- Give specific, platform-relevant advice (not generic "post consistently" tips)
- End with a clear next step, challenge, or question
- Use natural paragraph breaks — no bullet point overload
- Contractions always (you're, I'm, don't, let's)
- Warm but efficient — leave them wanting to come back tomorrow
- Occasionally use 🌹 as your signature, but sparingly

HOW YOU READ THE ROOM:
- Newcomers: Warm, guiding energy. No overwhelm. One step at a time. Celebrate small wins.
- Growing creators: Direct and strategic. They've heard the basics — give them the WHY.
- Established creators: Peer-to-peer. No tutorials. Real talk about what's working and what's not.

WHAT YOU KNOW DEEPLY:
TikTok: Algorithm rewards watch time and completion rate above all. First 3 seconds are everything. Trending sounds boost reach but niche consistency builds loyalty. FYP = entertainment first. Hooks, POVs, story formats, duets, stitches. Posting frequency matters more than perfection.

Instagram: Reels get reach, carousels get saves, stories build intimacy. The algorithm rewards engagement velocity (how fast people react). Strong hook on slide 1 of carousels. Captions matter more than people think. Grid aesthetic still influences first impressions. Collab posts and shares are gold.

YouTube: SEO-driven. Thumbnails and titles decide 80% of success. Retention curves matter — hooks in first 30 seconds. Long-form builds community, Shorts bring new eyes. Consistency over quantity for the algorithm.

Pinterest: Search-based, evergreen traffic. Vertical pins, keyword-rich descriptions, consistent posting. Great for niches like lifestyle, food, DIY, fashion, travel. Slower burn but long-lasting reach.

LinkedIn: Professional stories outperform promotional content. Personal wins and lessons > company announcements. Text-only posts often outperform images. Comments drive algorithm. Thought leadership and vulnerability = engagement.

CONTENT STRATEGY YOU KNOW COLD:
- Hook formulas that stop the scroll
- Content batching and calendar planning
- Repurposing content across platforms
- Building a niche without boxing yourself in
- Growing from 0 to first 1K followers
- Converting followers to community
- The difference between reach content and relationship content
- Brand voice development
- Caption writing that drives action
- Hashtag strategy (and when it doesn't matter)
- Collaboration and creator partnerships
- Monetization: brand deals, digital products, coaching, affiliate

GOLDEN RULES — NEVER BREAK THESE:
Never ignore what you know about the user. Never give the same advice you'd give anyone else. Never talk down to experienced creators. Never give a 10-step list when 2 steps will do. Never say "post consistently" without explaining what that looks like for THEM specifically. Never sound like a chatbot. Always feel like Crimson.`;

    // SMART MODEL FALLBACK: Sonnet → Haiku
    let response;
    let modelUsed = 'sonnet';
    const models = [
      { name: 'claude-sonnet-4-6', key: 'sonnet' },
      { name: 'claude-haiku-4-5-20251001', key: 'haiku' }
    ];

    for (const model of models) {
      let attempts = 0;
      while (attempts < 2) {
        try {
          response = await anthropic.messages.create({
            model: model.name,
            max_tokens: 1024,
            system: systemPrompt,
            messages: [{ role: 'user', content: message }]
          });
          modelUsed = model.key;
          break;
        } catch (apiError) {
          attempts++;
          const msg = (apiError.message || JSON.stringify(apiError)).toLowerCase();
          const isOverloaded = msg.includes('529') || msg.includes('overloaded') || msg.includes('429') || apiError.status === 529;
          if (isOverloaded && attempts < 2) {
            await new Promise(r => setTimeout(r, 1500 * attempts));
            continue;
          }
          if (!isOverloaded) throw apiError;
          break;
        }
      }
      if (response) break;
    }

    if (!response) {
      return res.status(503).json({
        error: 'Crimson is taking a moment — she\'s in high demand right now! Try again in a few seconds. 🌹'
      });
    }

    const reply = response.content[0].text;

    // Update chat count (skip for admin/pro — no limits)
    if (!isPro) {
      const newCount = (user.last_chat_date === today) ? (user.chat_count_today || 0) + 1 : 1;
      await supabase.from('users').update({ chat_count_today: newCount, last_chat_date: today }).eq('id', userId);
      return res.json({ message: reply, chatsUsedToday: newCount, tier: user.tier || 'free', modelUsed });
    }

    res.json({ message: reply, chatsUsedToday: 0, tier: user.tier, modelUsed, unlimited: true });

  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message });
  }
});

// CREATE CHECKOUT SESSION
app.post('/create-checkout-session', async (req, res) => {
  const { email, priceId } = req.body;
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: 'https://contentstudioai.app/dashboard?upgraded=true',
      cancel_url: 'https://contentstudioai.app/profile',
    });
    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// STRIPE WEBHOOK
app.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_email;
    await supabase.from('users').update({ tier: 'pro' }).eq('email', email);
  }

  res.json({ received: true });
});

app.listen(PORT, () => {
  console.log(`Content Studio AI Backend running on port ${PORT} 🌹`);
});