import { Context } from 'cordis'
import { Config } from '../index.ts'
import jwt from 'koa-jwt'
import { sha1 } from '@chatluna/utils'
import type {} from '@chatluna/memory/service'
import { parseRawModelName } from '@chatluna/core/utils'
import {
    ChatLunaConversationAdditional,
    ChatLunaConversationTemplate
} from '@chatluna/memory/types'
import { ModelType } from '@chatluna/core/platform'

export function apply(ctx: Context, config: Config) {
    ctx.server.get(
        `${config.path}/conversation/list`,
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
        `${config.path}/conversation/delete`,
        jwt({ secret: sha1(config.rootPassword) }),
        async (koa) => {
            const { userId } = koa.state.user as {
                userId: string
            }

            const { conversationId } = koa.request.query as {
                conversationId: string
            }

            const conversationAdditional =
                await ctx.chatluna_conversation.resolveConversationAdditional(
                    conversationId
                )
            koa.set('Content-Type', 'application/json')

            if (conversationAdditional.userId !== userId) {
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
        `${config.path}/conversation/create`,
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
                additional: Omit<
                    ChatLunaConversationAdditional,
                    'conversationId'
                >
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

            const [platform, model] = parseRawModelName(
                conversationTemplate.model
            )

            const platformModels = ctx.chatluna_platform.getModels(
                platform,
                ModelType.llm
            )

            if (
                platformModels.length === 0 ||
                platformModels.find((modelInfo) => modelInfo.name === model) ==
                    null
            ) {
                koa.body = JSON.stringify({
                    code: 400,
                    message: `The model ${conversationTemplate.model} is not supported`
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
