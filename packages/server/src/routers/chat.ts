import { Context } from 'cordis'
import { Config } from '../index.ts'
import jwt from 'koa-jwt'
import { removeNullValues, sha1 } from '@chatluna/utils'
import type {} from '@chatluna/memory/service'
import type {} from '@chatluna/assistant/service'
import { ChatLunaConversationUser } from '@chatluna/memory/types'
import { Assistant } from '@chatluna/assistant'
import { PassThrough } from 'stream'
import { BaseMessageChunk, ToolCallPart, ToolResultPart } from 'cortexluna'

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

            const contextDisposable = ctx.on('dispose', () => {
                abortSignal.abort()
            })

            const streamDelta = {
                toolResultIndex: -1,
                toolCallIndex: -1
            }
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
                const responseChunk = buildResponse(
                    assistant,
                    chunk,
                    streamDelta
                )

                stream.write(`data: ${JSON.stringify(responseChunk)}\n\n`)
            }

            stream.write('data: [DONE]\n\n')

            stream.end()

            contextDisposable()
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

type StreamDelta = {
    toolResultIndex: number
    toolCallIndex: number
}

function buildResponse(
    assistant: Assistant,
    chunk: BaseMessageChunk,
    streamDelta: StreamDelta
) {
    // 'chatcmpl-6ptKyqKOGXZT6iQnqiXAH8adNLUzD'
    // TODO: show thought
    const chatMessageId = 'chatcmpl-' + crypto.randomUUID()

    let textContent = ''
    let reasoningContent = ''
    let toolCallPart: ToolCallPart
    let toolResultPart: ToolResultPart

    if (typeof chunk.content === 'string') {
        textContent = chunk.content
    } else {
        for (const part of chunk.content) {
            if (part.type === 'text') {
                textContent += part.text
            } else if (part.type === 'think') {
                reasoningContent += part.think
            } else if (part.type === 'tool-call') {
                toolCallPart = part
                streamDelta.toolCallIndex++
            } else if (part.type === 'tool-result') {
                toolResultPart = part
                streamDelta.toolResultIndex++
            }
        }
    }

    const response = {
        choices: [
            {
                delta: removeNullValues({
                    role: 'assistant',
                    content: textContent.length > 0 ? textContent : '',
                    reasoning_content:
                        reasoningContent.length > 0
                            ? reasoningContent
                            : undefined,
                    tool_calls: toolCallPart
                        ? transformToolCallPartToOpenAIFormat(
                              toolCallPart,
                              streamDelta.toolCallIndex
                          )
                        : undefined,
                    tool_results: toolResultPart
                        ? transformToolResultPartToOpenAIFormat(
                              toolResultPart,
                              streamDelta.toolResultIndex
                          )
                        : undefined,
                    finish_reason: chunk.metadata?.finish_reason
                }),
                index: 0
            }
        ],
        metadata: chunk.metadata,
        created: Date.now(),
        id: chatMessageId,
        model: assistant.model,
        object: 'chat.completion.chunk'
    }

    if (chunk.metadata == null) {
        delete response.metadata
    }

    return response
}

function transformToolCallPartToOpenAIFormat(
    toolCallPart: ToolCallPart,
    index: number
) {
    return {
        index,
        id: toolCallPart.toolCallId,
        type: 'function',
        function: {
            name: toolCallPart.toolName,
            arguments: JSON.stringify(toolCallPart.args)
        }
    }
}

function transformToolResultPartToOpenAIFormat(
    toolResultPart: ToolResultPart,
    index: number
) {
    return {
        index,
        id: toolResultPart.toolCallId,
        type: 'function-result',
        function: {
            name: toolResultPart.toolName,
            arguments: JSON.stringify(toolResultPart.arg),
            content: JSON.stringify(toolResultPart.result)
        }
    }
}
