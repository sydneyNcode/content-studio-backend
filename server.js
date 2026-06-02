const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Resend } = require('resend');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_EMAIL = 'sydney@contentstudioai.app';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const resend = new Resend(process.env.RESEND_API_KEY);

app.use('/webhook', express.raw({ type: 'application/json' }));
app.use(cors());
app.use(express.json());

// ============================================================
// EMAIL TEMPLATES — edit these to customize your emails!
// ============================================================

async function sendWelcomeEmail(user) {
  const firstName = user.first_name || user.name?.split(' ')[0] || 'Creator';
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM,
      to: user.email,
      subject: `Welcome to Content Studio AI, ${firstName}! 🌹`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#FAF8F5;font-family:'Helvetica Neue',Arial,sans-serif;">
          <div style="max-width:560px;margin:0 auto;padding:48px 24px;">

            <div style="text-align:center;margin-bottom:36px;">
              <h1 style="font-family:Georgia,serif;font-size:30px;color:#8B1538;font-weight:400;letter-spacing:0.03em;margin:0;">
                Content Studio AI
              </h1>
              <p style="color:#A89E96;font-size:13px;margin:6px 0 0;letter-spacing:0.05em;">YOUR CREATIVE COMMAND CENTER</p>
            </div>

            <div style="background:#ffffff;border-radius:20px;padding:40px;border:1px solid #EDE8E3;margin-bottom:16px;">
              <h2 style="font-family:Georgia,serif;font-size:26px;color:#1A1008;font-weight:400;margin:0 0 8px;">
                You made it, ${firstName}. 🌹
              </h2>
              <p style="color:#A89E96;font-size:13px;font-style:italic;margin:0 0 24px;">
                We've been waiting for you.
              </p>
              <p style="color:#6B6058;font-size:15px;line-height:1.8;margin:0 0 20px;">
                Content Studio AI is your creative space — built specifically for creators who are serious about growing. No fluff, no overwhelm. Just powerful tools and a partner who gets it.
              </p>
              <p style="color:#6B6058;font-size:15px;line-height:1.8;margin:0 0 28px;">
                Meet <strong style="color:#8B1538;">Crimson</strong> — your personal AI content coach. She already knows your niche is <strong style="color:#1A1008;">${user.niche || 'content creation'}</strong> and she's ready to help you create content that actually works.
              </p>

              <div style="background:#FAF8F5;border-radius:12px;padding:20px 24px;margin:0 0 32px;border-left:3px solid #8B1538;">
                <p style="color:#8B1538;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;margin:0 0 12px;">Start here</p>
                <p style="color:#6B6058;font-size:14px;margin:0 0 8px;">✦ Chat with Crimson — she's waiting for your first question</p>
                <p style="color:#6B6058;font-size:14px;margin:0 0 8px;">✦ Check the Library for templates and hooks</p>
                <p style="color:#6B6058;font-size:14px;margin:0;">✦ Explore the Lounge — your community is here</p>
              </div>

              <div style="text-align:center;">
                <a href="https://contentstudioai.app/crimson" style="display:inline-block;background:#8B1538;color:#FAF8F5;text-decoration:none;padding:16px 36px;border-radius:50px;font-size:14px;font-weight:500;letter-spacing:0.02em;">
                  Meet Crimson →
                </a>
              </div>
            </div>

            <div style="background:#ffffff;border-radius:20px;padding:28px 32px;border:1px solid #EDE8E3;margin-bottom:16px;">
              <p style="color:#8B1538;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;margin:0 0 16px;">Your account</p>
              <table style="width:100%">
                <tr>
                  <td style="color:#A89E96;font-size:13px;padding:6px 0;">Name</td>
                  <td style="color:#1A1008;font-size:13px;text-align:right;">${firstName}</td>
                </tr>
                <tr>
                  <td style="color:#A89E96;font-size:13px;padding:6px 0;border-top:1px solid #F5F0EB;">Niche</td>
                  <td style="color:#1A1008;font-size:13px;text-align:right;border-top:1px solid #F5F0EB;">${user.niche || 'Content Creation'}</td>
                </tr>
                <tr>
                  <td style="color:#A89E96;font-size:13px;padding:6px 0;border-top:1px solid #F5F0EB;">Plan</td>
                  <td style="color:#8B1538;font-size:13px;font-weight:500;text-align:right;border-top:1px solid #F5F0EB;">${user.tier === 'pro' ? '✦ Pro Member' : 'Starter (Free)'}</td>
                </tr>
              </table>
            </div>

            <p style="text-align:center;color:#A89E96;font-size:12px;line-height:1.8;margin-top:24px;">
              Content Studio AI · <a href="https://contentstudioai.app" style="color:#8B1538;text-decoration:none;">contentstudioai.app</a><br>
              Questions? Reply to this email or reach us at <a href="mailto:sydney@contentstudioai.app" style="color:#8B1538;">sydney@contentstudioai.app</a>
            </p>

          </div>
        </body>
        </html>
      `
    });
    if (error) console.error('Welcome email error:', error);
    else console.log('Welcome email sent to:', user.email);
  } catch (err) {
    console.error('Welcome email exception:', err);
  }
}

async function sendUpgradeEmail(email, firstName) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM,
      to: email,
      subject: 'You\'re officially Pro ✦',
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#FAF8F5;font-family:'Helvetica Neue',Arial,sans-serif;">
          <div style="max-width:560px;margin:0 auto;padding:48px 24px;">

            <div style="text-align:center;margin-bottom:36px;">
              <h1 style="font-family:Georgia,serif;font-size:30px;color:#8B1538;font-weight:400;letter-spacing:0.03em;margin:0;">
                Content Studio AI
              </h1>
            </div>

            <div style="background:#8B1538;border-radius:20px;padding:44px 40px;text-align:center;margin-bottom:16px;">
              <p style="color:rgba(250,248,245,0.7);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.14em;margin:0 0 16px;">You're in</p>
              <h2 style="font-family:Georgia,serif;font-size:32px;color:#FAF8F5;font-weight:400;margin:0 0 20px;">
                Welcome to Pro, ${firstName}. ✦
              </h2>
              <p style="color:rgba(250,248,245,0.75);font-size:15px;line-height:1.8;margin:0 0 32px;">
                The full Content Studio AI experience is now yours. Unlimited Crimson, all resources, and everything we build next — you're part of it from the beginning.
              </p>
              <a href="https://contentstudioai.app/crimson" style="display:inline-block;background:#FAF8F5;color:#8B1538;text-decoration:none;padding:16px 36px;border-radius:50px;font-size:14px;font-weight:600;">
                Start Creating →
              </a>
            </div>

            <div style="background:#ffffff;border-radius:20px;padding:32px;border:1px solid #EDE8E3;margin-bottom:16px;">
              <p style="color:#8B1538;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;margin:0 0 20px;">Everything that's now yours</p>
              ${[
                'Unlimited Crimson AI — no daily limits, ever',
                'All current and future courses',
                'Premium templates and hooks library',
                'Priority community access',
                'Power Hour group coaching calls'
              ].map(f => `
                <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:14px;">
                  <span style="color:#8B1538;font-size:16px;line-height:1.4;">✦</span>
                  <p style="color:#6B6058;font-size:14px;line-height:1.6;margin:0;">${f}</p>
                </div>
              `).join('')}
            </div>

            <p style="text-align:center;color:#A89E96;font-size:12px;line-height:1.8;margin-top:24px;">
              Content Studio AI · <a href="https://contentstudioai.app" style="color:#8B1538;text-decoration:none;">contentstudioai.app</a><br>
              Questions? <a href="mailto:sydney@contentstudioai.app" style="color:#8B1538;">sydney@contentstudioai.app</a>
            </p>

          </div>
        </body>
        </html>
      `
    });
    if (error) console.error('Upgrade email error:', error);
    else console.log('Upgrade email sent to:', email);
  } catch (err) {
    console.error('Upgrade email exception:', err);
  }
}

// ============================================================
// ROUTES
// ============================================================

app.get('/', (req, res) => {
  res.json({ message: 'Content Studio AI Backend — Running! 🌹' });
});

app.post('/signup', async (req, res) => {
  try {
    const { email, password, name, first_name, last_name, username, niche, tone, bio } = req.body;
    if (!email || !password || !name || !username) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const { data: existing } = await supabase.from('users').select('email').eq('email', email).single();
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const userTier = email === ADMIN_EMAIL ? 'pro' : 'free';

    const { data, error } = await supabase
      .from('users')
      .insert([{ email, password, name, first_name, last_name, username, niche, tone, bio, tier: userTier }])
      .select().single();
    if (error) return res.status(500).json({ error: error.message });

    sendWelcomeEmail(data);
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

    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
    }

    if (user.email === ADMIN_EMAIL && user.tier !== 'pro') {
      await supabase.from('users').update({ tier: 'pro' }).eq('email', ADMIN_EMAIL);
      user.tier = 'pro';
    }

    if (user.tier === 'founding') {
      user.tier = 'pro';
    }

    res.json({ message: 'Login successful', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/chat', async (req, res) => {
  try {
    const { userId, message } = req.body;
    if (!userId || !message) {
      return res.status(400).json({ error: 'User ID and message required' });
    }

    const { data: user, error: userError } = await supabase.from('users').select('*').eq('id', userId).single();
    if (userError || !user) return res.status(404).json({ error: 'User not found' });

    const isAdmin = user.email === ADMIN_EMAIL;
    const isPro = user.tier === 'pro' || user.tier === 'founding' || isAdmin;

    const today = new Date().toISOString().split('T')[0];
    if (!isPro) {
      if (user.last_chat_date === today && (user.chat_count_today || 0) >= 3) {
        return res.status(429).json({
          error: 'You\'ve used your 3 daily chats! Upgrade to Pro for unlimited access to Crimson. 🌹',
          limitReached: true
        });
      }
    }

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
- Monetization: brand deals, digital products, coaching, affiliate

GOLDEN RULES — NEVER BREAK THESE:
Never ignore what you know about the user. Never give the same advice you'd give anyone else. Never talk down to experienced creators. Never give a 10-step list when 2 steps will do. Never say "post consistently" without explaining what that looks like for THEM specifically. Never sound like a chatbot. Always feel like Crimson.`;

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
    const customerId = session.customer;
    await supabase.from('users').update({ tier: 'pro', stripe_customer_id: customerId }).eq('email', email);
    const { data: upgradedUser } = await supabase.from('users').select('name, first_name').eq('email', email).single();
    sendUpgradeEmail(email, upgradedUser?.first_name || upgradedUser?.name || 'Creator');
  }

  res.json({ received: true });
});

app.listen(PORT, () => {
  console.log(`Content Studio AI Backend running on port ${PORT} 🌹`);
});