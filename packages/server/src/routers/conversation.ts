import { Context } from 'cordis'
import { Config } from '../index.ts'
import jwt from 'koa-jwt'
import { sha1 } from '@chatluna/utils'
import type {} from '@chatluna/memory/service'
import type {} from '@chatluna/assistant/service'
import {
    ChatLunaConversationTemplate,
    ChatLunaConversationUser
} from '@chatluna/memory/types'

export function apply(ctx: Context, config: Config) {
    ctx.server.get(
        `${config.path}/v1/conversation/list`,
        jwt({ secret: sha1(config.rootPassword) }),
        async (koa) => {
            const { userId } = koa.state.user as {
                userId: string
            }

            const conversations = await ctx.chatluna_conversation
                .queryConversationsByUser(userId)
                .then((conversations) =>
                    conversations.map(([conversation]) => conversation)
                )

            const body = {
                code: 200,
                data: conversations,
                message: 'success'
            }

            koa.set('Content-Type', 'application/json')
            koa.body = JSON.stringify(body)
            koa.status = 200
        }
    )

    ctx.server.get(
        `${config.path}/v1/conversation/delete/:id`,
        jwt({ secret: sha1(config.rootPassword) }),
        async (koa) => {
            const { userId } = koa.state.user as {
                userId: string
            }

            const conversationId = koa.params.id

            const conversation =
                await ctx.chatluna_conversation.resolveUserConversation(
                    conversationId
                )
            koa.set('Content-Type', 'application/json')

            if (conversation.userId !== userId) {
                koa.body = JSON.stringify({
                    code: 400,
                    message: 'Permission denied'
                })
                koa.status = 400
                return
            }

            try {
                await ctx.chatluna_conversation.deleteConversation(
                    conversationId
                )
                koa.body = JSON.stringify({
                    code: 200,
                    message: 'success'
                })
                koa.status = 200
            } catch (e) {
                koa.body = JSON.stringify({
                    code: 400,
                    message: 'Failed to delete conversation'
                })
                koa.status = 400
                ctx.logger.error(e)
            }
        }
    )

    ctx.server.post(
        `${config.path}/v1/conversation/create`,
        jwt({ secret: sha1(config.rootPassword) }),
        async (koa) => {
            // TODO: check model permission for user

            const { userId } = koa.state.user as {
                userId: string
            }

            const {
                conversation: conversationTemplate,
                additional: conversationAdditional
            } = koa.request.body as {
                conversation: ChatLunaConversationTemplate
                additional: Omit<ChatLunaConversationUser, 'conversationId'>
            }

            koa.set('Content-Type', 'application/json')

            if (conversationAdditional.userId !== userId) {
                koa.body = JSON.stringify({
                    code: 400,
                    message: 'Permission denied'
                })
                koa.status = 400
                return
            }

            const assistant = ctx.chatluna_assistant.getAssistantById(
                conversationTemplate.assistantId
            )

            if (assistant == null) {
                koa.body = JSON.stringify({
                    code: 400,
                    message: `The assistant id ${conversationTemplate.assistantId} is not fount`
                })
                koa.status = 400
                return
            }

            try {
                const conversation =
                    await ctx.chatluna_conversation.createConversation(
                        conversationTemplate,
                        conversationAdditional
                    )

                koa.body = JSON.stringify({
                    code: 200,
                    data: conversation,
                    message: 'success'
                })
                koa.status = 200
            } catch (e) {
                koa.body = JSON.stringify({
                    code: 400,
                    message: 'Failed to create conversation'
                })
                koa.status = 400
                ctx.logger.error(e)
            }
        }
    )
}
