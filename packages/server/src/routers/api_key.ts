import { Context } from 'cordis'
import { Config } from '../index.ts'
import jwt from 'koa-jwt'
import { sha1 } from '@chatluna/utils'

export function apply(ctx: Context, config: Config) {
    ctx.server.get(
        `${config.path}/api_key/list`,
        jwt({ secret: sha1(config.rootPassword) }),
        async (koa) => {
            const { userId } = koa.state.user as {
                userId: string
            }

            const apiKeys =
                await ctx.chatluna_server_database.getApiKeys(userId)

            const body = {
                code: 0,
                data: apiKeys.map((apiKey) => ({
                    key: apiKey.key,
                    balance: apiKey.balance
                }))
            }

            koa.set('Content-Type', 'application/json')
            koa.body = JSON.stringify(body)
            koa.status = 200
        }
    )
}
