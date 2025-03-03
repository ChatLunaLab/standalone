import { Context } from 'cordis'
import { Config } from '../index.ts'
import jwt from 'koa-jwt'
import { sha1 } from '@chatluna/utils'
import type {} from '@chatluna/memory/service'
import type {} from '@chatluna/assistant/service'
import { ChatLunaConversationUser } from '@chatluna/memory/types'
import { Assistant } from '@chatluna/assistant'
import { PassThrough } from 'stream'
import { BaseMessageChunk } from 'cortexluna'

export function apply(ctx: Context, config: Config) {
    ctx.server.post(
        `${config.path}/v1/chat/:conversationId`,
        jwt({ secret: sha1(config.rootPassword) }),
        async (koa) => {
            koa.set('Content-Type', 'application/json')

            const conversationId = koa.params.conversationId

            const body = koa.request.body as {
                message: BaseMessageChunk
            }

            if (!body.message) {
                koa.body = JSON.stringify({
                    code: 400,
                    message: 'Message is required'
                })
                koa.status = 400
                return
            }

            const { bindId } = koa.state.user as {
                bindId: string
            }

            let conversationAdditional: ChatLunaConversationUser
            try {
                conversationAdditional =
                    await ctx.chatluna_conversation.resolveUserConversation(
                        bindId,
                        conversationId
                    )
            } catch (e) {
                koa.body = JSON.stringify({
                    code: 400,
                    message: 'Failed to resolve conversation'
                })
                koa.status = 400
                ctx.logger.error(e)
                return
            }

            if (conversationAdditional.userId !== bindId) {
                koa.body = JSON.stringify({
                    code: 400,
                    message: 'Permission denied'
                })
                koa.status = 400
                return
            }

            let assistant: Assistant

            try {
                assistant =
                    await ctx.chatluna_assistant.getAssistantByConversation(
                        conversationId
                    )

                if (!assistant) {
                    koa.body = JSON.stringify({
                        code: 400,
                        message: 'Assistant not found'
                    })
                    koa.status = 400
                    return
                }
            } catch (e) {
                koa.body = JSON.stringify({
                    code: 400,
                    message: 'Failed to get assistant'
                })
                koa.status = 400
                ctx.logger.error(e)
                return
            }

            koa.request.socket.setTimeout(0)
            koa.req.socket.setNoDelay(true)
            koa.req.socket.setKeepAlive(true)

            koa.set({
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive'
            })

            const stream = new PassThrough()

            koa.status = 200
            koa.body = stream

            const abortSignal = new AbortController()

            koa.req.on('close', () => {
                abortSignal.abort()
            })

            for await (const chunk of assistant.stream({
                message: {
                    role: 'user',
                    content: body.message.content
                },
                signal: abortSignal.signal,
                /* events: {
                    'llm-used-token'(usedToken) {
                        //
                    },
                } */
                stream: true
            })) {
                stream.write(
                    `data: ${JSON.stringify(buildResponse(assistant, chunk))}\n\n`
                )
            }

            stream.write('data: [DONE]\n\n')

            stream.end()
        }
    )

    ctx.server.get(
        `${config.path}/v1/chat/:conversationId/messages`,
        jwt({ secret: sha1(config.rootPassword) }),
        async (koa) => {
            const conversationId = koa.params.conversationId

            const { bindId } = koa.state.user as {
                bindId: string
            }

            let conversationAdditional: ChatLunaConversationUser
            try {
                conversationAdditional =
                    await ctx.chatluna_conversation.resolveUserConversation(
                        bindId,
                        conversationId
                    )
            } catch (e) {
                koa.body = JSON.stringify({
                    code: 400,
                    message: 'Failed to resolve conversation'
                })
                koa.status = 400
                ctx.logger.error(e)
                return
            }

            if (conversationAdditional.userId !== bindId) {
                koa.body = JSON.stringify({
                    code: 400,
                    message: 'Permission denied'
                })
                koa.status = 400
                return
            }

            const messages =
                await ctx.chatluna_conversation.fetchAllMessages(conversationId)

            const body = {
                code: 0,
                data: messages
            }

            koa.set('Content-Type', 'application/json')
            koa.body = JSON.stringify(body)
            koa.status = 200
        }
    )
}

function buildResponse(
    assistant: Assistant,
    chunk: BaseMessageChunk,
    finish?: string
) {
    // 'chatcmpl-6ptKyqKOGXZT6iQnqiXAH8adNLUzD'
    // TODO: show thought
    const chatMessageId = 'chatcmpl-' + crypto.randomUUID()

    const response = {
        choices: [
            {
                delta: {
                    role: 'assistant',
                    content: chunk.content
                },
                index: 0
            }
        ],
        created: Date.now(),
        id: chatMessageId,
        model: assistant.model,
        object: 'chat.completion.chunk'
    }

    return response
}
