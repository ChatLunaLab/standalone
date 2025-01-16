import { Context } from 'cordis'
import { Config } from '../index.ts'
import jwt from 'koa-jwt'
import { sha1 } from '@chatluna/utils'
import type {} from '@chatluna/memory/service'
import type {} from '@chatluna/assistant/service'

export function apply(ctx: Context, config: Config) {
    ctx.server.get(
        `${config.path}/v1/assistant/list`,
        jwt({ secret: sha1(config.rootPassword) }),
        async (koa) => {
            const assistants = await ctx.chatluna_conversation.getAllAssistant()

            const body = {
                code: 200,
                data: assistants,
                message: 'success'
            }

            koa.set('Content-Type', 'application/json')
            koa.body = JSON.stringify(body)
            koa.status = 200
        }
    )
}
