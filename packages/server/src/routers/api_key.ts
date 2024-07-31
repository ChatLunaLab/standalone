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
                    // sk-(52)char, need fill 50 **
                    key:
                        apiKey.key.substring(0, 10) +
                        '*'.repeat(apiKey.key.length - 10),
                    keyId: apiKey.keyId,
                    balance: apiKey.balance
                }))
            }

            koa.set('Content-Type', 'application/json')
            koa.body = JSON.stringify(body)
            koa.status = 200
        }
    )

    ctx.server.post(
        `${config.path}/api_key/create`,
        jwt({ secret: sha1(config.rootPassword) }),
        async (koa) => {
            const { userId } = koa.state.user as {
                userId: string
            }

            const body = koa.request.body as {
                balance?: number
                expireTime: number
                supportModels?: string[]
            }

            koa.set('Content-Type', 'application/json')

            try {
                const apiKeyValue =
                    await ctx.chatluna_server_database.randomApiKey()

                // TODO: check balance can't larger than user's balance
                const apiKey = await ctx.chatluna_server_database.createApiKey(
                    userId,
                    apiKeyValue,
                    body.balance,
                    new Date(body.expireTime),
                    body.supportModels
                )

                koa.status = 200
                koa.body = JSON.stringify({
                    code: 0,
                    data: {
                        key: apiKey.key,
                        balance: apiKey.balance,
                        keyId: apiKey.keyId
                    }
                })
            } catch (e) {
                ctx.logger.error(e)
                koa.body = JSON.stringify({
                    code: 1,
                    message: 'The database has internal error.'
                })
                koa.status = 500
            }
        }
    )

    ctx.server.get(
        `${config.path}/api_key/delete`,
        jwt({ secret: sha1(config.rootPassword) }),
        async (koa) => {
            const { userId } = koa.state.user as {
                userId: string
            }

            koa.set('Content-Type', 'application/json')

            try {
                const { keyId } = koa.request.query as {
                    keyId: string
                }

                const result = await ctx.chatluna_server_database.deleteApiKey(
                    keyId,
                    userId
                )

                if (result.removed === 1) {
                    koa.status = 200
                    koa.body = JSON.stringify({
                        code: 0,
                        message: 'Delete api key successfully.'
                    })
                } else {
                    koa.body = JSON.stringify({
                        code: 1,
                        message: 'The api key does not exist.'
                    })
                    koa.status = 404
                }
            } catch (e) {
                ctx.logger.error(e)
                koa.body = JSON.stringify({
                    code: 1,
                    message: 'The database has internal error.'
                })
                koa.status = 500
            }
        }
    )
}