import { Context } from 'cordis'
import { Config } from '../index.ts'
import jwt from 'koa-jwt'
import { sha1 } from '@chatluna/utils'
import type {} from '@chatluna/memory/service'
import type {} from '@chatluna/assistant/service'

export function apply(ctx: Context, config: Config) {
    ctx.server.post(
        `${config.path}/v1/chat/:conversationId`,
        jwt({ secret: sha1(config.rootPassword) }),
        async (koa) => {
            const assistants = await ctx.chatluna_conversation.getAllAssistant()

            const body = {
                code: 0,
                data: assistants
            }

            koa.set('Content-Type', 'application/json')
            koa.body = JSON.stringify(body)
            koa.status = 200
        }
    )

    ctx.server.post(
        `${config.path}/v1/chat/:conversationId/messages`,
        jwt({ secret: sha1(config.rootPassword) }),
        async (koa) => {
            const assistants = await ctx.chatluna_conversation.getAllAssistant()

            const body = {
                code: 0,
                data: assistants
            }

            koa.set('Content-Type', 'application/json')
            koa.body = JSON.stringify(body)
            koa.status = 200
        }
    )
}
