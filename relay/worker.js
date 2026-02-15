/**
 * NeoChat Relay — Cloudflare Worker
 * 
 * Бесплатный relay для NeoChat. Пересылает зашифрованные пакеты между пирами.
 * Relay НИКОГДА не видит содержимое сообщений (E2E шифрование).
 * 
 * Deploy: wrangler deploy
 * 
 * Бесплатный план Cloudflare Workers:
 * - 100,000 запросов/день
 * - KV storage: 100,000 read/day, 1000 write/day
 */

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const path = url.pathname;

        // CORS headers
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-NeoChat-ID',
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        try {
            // POST /profile — обновить профиль пользователя
            if (path === '/profile' && request.method === 'POST') {
                return await handleUpdateProfile(request, env, corsHeaders);
            }

            // GET /profile/:id — получить профиль пользователя
            if (path.startsWith('/profile/') && request.method === 'GET') {
                const userId = path.split('/')[2];
                return await handleGetProfile(userId, env, corsHeaders);
            }

            // POST /send — отправить зашифрованный пакет
            if (path === '/send' && request.method === 'POST') {
                return await handleSend(request, env, corsHeaders);
            }

            // GET /poll/:user_hash — получить сообщения для пользователя
            if (path.startsWith('/poll/') && request.method === 'GET') {
                const userHash = path.split('/')[2];
                return await handlePoll(userHash, env, corsHeaders);
            }

            // DELETE /ack/:user_hash/:message_id — подтвердить получение
            if (path.startsWith('/ack/') && request.method === 'DELETE') {
                const parts = path.split('/');
                const userHash = parts[2];
                const messageId = parts[3];
                return await handleAck(userHash, messageId, env, corsHeaders);
            }

            // GET /status — проверка работоспособности relay
            if (path === '/status') {
                return new Response(JSON.stringify({
                    status: 'ok',
                    service: 'NeoChat Relay',
                    version: '1.1.0',
                    timestamp: Date.now(),
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }

            return new Response('NeoChat Relay v1.1', {
                status: 404,
                headers: corsHeaders,
            });
        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }
    },
};

/**
 * Обновляет профиль пользователя в KV
 */
async function handleUpdateProfile(request, env, corsHeaders) {
    const body = await request.json();

    if (!body.id || !body.username) {
        return new Response(JSON.stringify({ error: 'Missing required fields: id, username' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const profile = {
        id: body.id,
        username: body.username,
        status: body.status || 'Offline',
        avatar_url: body.avatar_url || null,
        last_seen: Date.now(),
    };

    // Store in KV: key = "profile:{id}"
    await env.NEOCHAT_KV.put(`profile:${body.id}`, JSON.stringify(profile));

    return new Response(JSON.stringify({ ok: true, profile }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}

/**
 * Получает профиль пользователя из KV
 */
async function handleGetProfile(userId, env, corsHeaders) {
    if (!userId) {
        return new Response(JSON.stringify({ error: 'Invalid user ID' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const value = await env.NEOCHAT_KV.get(`profile:${userId}`);

    if (!value) {
        return new Response(JSON.stringify({ error: 'User not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(value, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}

/**
 * Сохраняет зашифрованный пакет в KV для получателя
 */
async function handleSend(request, env, corsHeaders) {
    const body = await request.json();

    // Validate
    if (!body.to || !body.payload || !body.message_id) {
        return new Response(JSON.stringify({ error: 'Missing required fields: to, payload, message_id' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const envelope = {
        from: body.from || 'anonymous',
        to: body.to,
        payload: body.payload,       // Base64 E2E-encrypted blob
        message_id: body.message_id,
        timestamp: Date.now(),
    };

    // Store in KV: key = "msg:{recipient}:{message_id}"
    // TTL = 7 days (messages expire automatically)
    const key = `msg:${body.to}:${body.message_id}`;
    await env.NEOCHAT_KV.put(key, JSON.stringify(envelope), {
        expirationTtl: 7 * 24 * 3600, // 7 days
    });

    return new Response(JSON.stringify({ ok: true, message_id: body.message_id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}

/**
 * Возвращает все ожидающие сообщения для пользователя
 */
async function handlePoll(userHash, env, corsHeaders) {
    if (!userHash || userHash.length < 4) {
        return new Response(JSON.stringify({ error: 'Invalid user hash' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // List all keys with prefix "msg:{userHash}:"
    const prefix = `msg:${userHash}:`;
    const list = await env.NEOCHAT_KV.list({ prefix, limit: 100 });

    const messages = [];
    for (const key of list.keys) {
        const value = await env.NEOCHAT_KV.get(key.name);
        if (value) {
            try {
                messages.push(JSON.parse(value));
            } catch (e) {
                // Skip corrupted entries
            }
        }
    }

    return new Response(JSON.stringify({ messages }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}

/**
 * Удаляет сообщение после подтверждения получения
 */
async function handleAck(userHash, messageId, env, corsHeaders) {
    const key = `msg:${userHash}:${messageId}`;
    await env.NEOCHAT_KV.delete(key);

    return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}
