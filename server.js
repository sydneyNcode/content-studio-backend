const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Resend } = require('resend');
const crypto = require('crypto');
const getFoundingEmail = require('./foundingEmail');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_EMAIL = 'sydney@contentstudioai.app';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const resend = new Resend(process.env.RESEND_API_KEY);

app.use('/webhook', express.raw({ type: 'application/json' }));
app.use(cors());
app.use(express.json({ limit: '10mb' }));

async function sendWelcomeEmail(user) {
  const firstName = user.first_name || user.name?.split(' ')[0] || 'Creator';
  try {
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM,
      to: user.email,
      subject: `Welcome to Content Studio AI, ${firstName}!`,
      html: `<!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#FAF8F5;font-family:'Helvetica Neue',Arial,sans-serif;">
          <div style="max-width:560px;margin:0 auto;padding:48px 24px;">
            <div style="text-align:center;margin-bottom:36px;">
              <h1 style="font-family:Georgia,serif;font-size:30px;color:#8B1538;font-weight:400;letter-spacing:0.03em;margin:0;">Content Studio AI</h1>
              <p style="color:#A89E96;font-size:13px;margin:6px 0 0;letter-spacing:0.05em;">YOUR CREATIVE COMMAND CENTER</p>
            </div>
            <div style="background:#ffffff;border-radius:20px;padding:40px;border:1px solid #EDE8E3;margin-bottom:16px;">
              <h2 style="font-family:Georgia,serif;font-size:26px;color:#1A1008;font-weight:400;margin:0 0 8px;">You made it, ${firstName}.</h2>
              <p style="color:#6B6058;font-size:15px;line-height:1.8;margin:0 0 20px;">Content Studio AI is your creative space — built specifically for creators who are serious about growing.</p>
              <p style="color:#6B6058;font-size:15px;line-height:1.8;margin:0 0 28px;">Meet <strong style="color:#8B1538;">Crimson</strong> — your personal AI content coach. She knows your niche is <strong style="color:#1A1008;">${user.niche || 'content creation'}</strong> and she's ready to help.</p>
              <div style="text-align:center;">
                <a href="https://contentstudioai.app/crimson" style="display:inline-block;background:#8B1538;color:#FAF8F5;text-decoration:none;padding:16px 36px;border-radius:50px;font-size:14px;font-weight:500;">Meet Crimson →</a>
              </div>
            </div>
            <p style="text-align:center;color:#A89E96;font-size:12px;line-height:1.8;margin-top:24px;">
              Content Studio AI · <a href="https://contentstudioai.app" style="color:#8B1538;text-decoration:none;">contentstudioai.app</a>
            </p>
          </div>
        </body>
        </html>`
    });
    if (error) console.error('Welcome email error:', error);
    else console.log('Welcome email sent to:', user.email);
  } catch (err) {
    console.error('Welcome email exception:', err);
  }
}

async function sendUpgradeEmail(email, firstName) {
  try {
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM,
      to: email,
      subject: "You're officially Pro ✦",
      html: `<!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#FAF8F5;font-family:'Helvetica Neue',Arial,sans-serif;">
          <div style="max-width:560px;margin:0 auto;padding:48px 24px;">
            <div style="text-align:center;margin-bottom:36px;">
              <h1 style="font-family:Georgia,serif;font-size:30px;color:#8B1538;font-weight:400;margin:0;">Content Studio AI</h1>
            </div>
            <div style="background:#8B1538;border-radius:20px;padding:44px 40px;text-align:center;margin-bottom:16px;">
              <h2 style="font-family:Georgia,serif;font-size:32px;color:#FAF8F5;font-weight:400;margin:0 0 20px;">Welcome to Pro, ${firstName}. ✦</h2>
              <p style="color:rgba(250,248,245,0.75);font-size:15px;line-height:1.8;margin:0 0 32px;">Unlimited Crimson, all resources, and everything we build next.</p>
              <a href="https://contentstudioai.app/crimson" style="display:inline-block;background:#FAF8F5;color:#8B1538;text-decoration:none;padding:16px 36px;border-radius:50px;font-size:14px;font-weight:600;">Start Creating →</a>
            </div>
            <p style="text-align:center;color:#A89E96;font-size:12px;margin-top:24px;">
              Questions? <a href="mailto:sydney@contentstudioai.app" style="color:#8B1538;">sydney@contentstudioai.app</a>
            </p>
          </div>
        </body>
        </html>`
    });
    if (error) console.error('Upgrade email error:', error);
    else console.log('Upgrade email sent to:', email);
  } catch (err) {
    console.error('Upgrade email exception:', err);
  }
}

async function sendPasswordResetEmail(email, resetUrl) {
  try {
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM,
      to: email,
      subject: 'Reset your password — Content Studio AI',
      html: `<!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="margin:0;padding:0;background:#FAF8F5;font-family:'Helvetica Neue',Arial,sans-serif;">
          <div style="max-width:560px;margin:0 auto;padding:48px 24px;">
            <div style="text-align:center;margin-bottom:36px;">
              <h1 style="font-family:Georgia,serif;font-size:30px;color:#8B1538;font-weight:400;margin:0;">Content Studio AI</h1>
            </div>
            <div style="background:#ffffff;border-radius:20px;padding:40px;border:1px solid #EDE8E3;">
              <h2 style="font-family:Georgia,serif;font-size:24px;color:#1A1008;font-weight:400;margin:0 0 16px;">Reset your password</h2>
              <p style="color:#6B6058;font-size:15px;line-height:1.8;margin:0 0 24px;">Click below — this link expires in 1 hour.</p>
              <div style="text-align:center;margin:0 0 28px;">
                <a href="${resetUrl}" style="display:inline-block;background:#8B1538;color:#FAF8F5;text-decoration:none;padding:16px 36px;border-radius:50px;font-size:14px;font-weight:500;">Reset Password →</a>
              </div>
              <p style="color:#A89E96;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
            </div>
          </div>
        </body>
        </html>`
    });
    if (error) console.error('Reset email error:', error);
    else console.log('Reset email sent to:', email);
  } catch (err) {
    console.error('Reset email exception:', err);
  }
}

app.get('/', (req, res) => {
  res.json({ message: 'Content Studio AI Backend — Running! 🌹' });
});

app.post('/join-waitlist', async (req, res) => {
  try {
    const { name, email, source } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and email required' });

    const { data: existing } = await supabase.from('waitlist').select('email').eq('email', email).single();
    if (existing && email !== ADMIN_EMAIL) return res.status(400).json({ error: 'You are already on the waitlist!' });

    const { data, error } = await supabase
      .from('waitlist')
      .insert([{ name, email, source: source || 'founding' }])
      .select().single();
    if (error) return res.status(500).json({ error: error.message });

    await resend.emails.send({
      from: process.env.RESEND_FROM,
      to: email,
       bcc: ADMIN_EMAIL,
      subject: 'Welcome to The Founding Lounge 🌹',
      html: getFoundingEmail(name)
    });

    res.status(201).json({ message: 'You\'re on the list!', data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
    if (user.tier === 'founding') user.tier = 'pro';
    res.json({ message: 'Login successful', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const { data: user } = await supabase.from('users').select('id, email').eq('email', email).single();
    if (!user) return res.json({ message: 'If that email exists, a reset link has been sent.' });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await supabase.from('password_resets').insert([{ email, token, expires_at: expiresAt }]);
    const resetUrl = `https://contentstudioai.app/reset-password?token=${token}`;
    await sendPasswordResetEmail(email, resetUrl);

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and password required' });

    const { data: reset } = await supabase
      .from('password_resets')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .single();

    if (!reset) return res.status(400).json({ error: 'Invalid or expired reset link' });
    if (new Date(reset.expires_at) < new Date()) {
      return res.status(400).json({ error: 'This reset link has expired. Please request a new one.' });
    }

    await supabase.from('users').update({ password }).eq('email', reset.email);
    await supabase.from('password_resets').update({ used: true }).eq('token', token);

    res.json({ message: 'Password updated successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/chat', async (req, res) => {
  try {
    const { userId, message, imageBase64, imageType } = req.body;
    if (!userId || (!message && !imageBase64)) {
      return res.status(400).json({ error: 'User ID and message or image required' });
    }

    const { data: user, error: userError } = await supabase.from('users').select('*').eq('id', userId).single();
    if (userError || !user) return res.status(404).json({ error: 'User not found' });

    const isAdmin = user.email === ADMIN_EMAIL;
    const isPro = user.tier === 'pro' || user.tier === 'founding' || isAdmin;

    const today = new Date().toISOString().split('T')[0];
    if (!isPro) {
      if (user.last_chat_date === today && (user.chat_count_today || 0) >= 3) {
        return res.status(429).json({
          error: "You've used your 3 daily chats! Upgrade to Pro for unlimited access to Crimson. 🌹",
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
- Give specific, platform-relevant advice
- End with a clear next step, challenge, or question
- Contractions always (you're, I'm, don't, let's)
- Occasionally use 🌹 as your signature, but sparingly
- When analyzing images: be specific, actionable, and encouraging

WHAT YOU KNOW DEEPLY:
TikTok: Algorithm rewards watch time and completion rate above all. First 3 seconds are everything.
Instagram: Reels get reach, carousels get saves, stories build intimacy.
YouTube: SEO-driven. Thumbnails and titles decide 80% of success.

GOLDEN RULES:
Never ignore what you know about the user. Never give generic advice. Never sound like a chatbot. Always feel like Crimson.`;

    const userContent = imageBase64 ? [
      { type: 'image', source: { type: 'base64', media_type: imageType || 'image/jpeg', data: imageBase64 } },
      { type: 'text', text: message || 'Please analyze this image and give me feedback as a content creator.' }
    ] : message;

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
            messages: [{ role: 'user', content: userContent }]
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
      return res.status(503).json({ error: "Crimson is taking a moment — try again in a few seconds. 🌹" });
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
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
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