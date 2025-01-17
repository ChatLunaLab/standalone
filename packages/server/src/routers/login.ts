import { Context } from 'cordis'
import { Config } from '../index.ts'
import jwt from 'jsonwebtoken'
import { sha1 } from '@chatluna/utils'

export function apply(ctx: Context, config: Config) {
    ctx.server.post(`${config.path}/v1/login`, async (koa) => {
        const { userId, password } = koa.request.body

        const account = await ctx.chatluna_server_database.getAccount(userId)

        koa.set('Content-Type', 'application/json')

        if (account == null) {
            koa.status = 401
            koa.body = JSON.stringify({
                code: 401,
                message: 'user not found'
            })
            return
        }

        if (account.password !== password) {
            koa.status = 401
            koa.body = JSON.stringify({
                code: 401,
                message: 'password error'
            })
            return
        }

        koa.status = 200

        // jsonwebtoken

        const accessToken = jwt.sign(
            {
                userId: account.userId,
                bindId: account.bindId,
                timestamp: Date.now()
            },
            sha1(config.rootPassword),
            {
                expiresIn: '30m'
            }
        )

        const refreshToken = jwt.sign(
            {
                userId: account.userId,
                bindId: account.bindId,
                password: sha1(account.password),
                timestamp: Date.now() - 10,
                refresh: true
            },
            sha1(config.rootPassword),
            {
                expiresIn: '30d'
            }
        )

        koa.body = JSON.stringify({
            code: 0,
            data: {
                accessToken,
                refreshToken
            }
        })
    })

    ctx.server.get(`${config.path}/v1/refresh-token`, async (koa) => {
        let refreshToken = koa.request.headers['refresh_token']
        if (refreshToken == null || refreshToken instanceof Array) {
            koa.status = 401
            koa.body = JSON.stringify({
                code: 401,
                message: 'refresh_token not found'
            })
            return
        }

        try {
            const payload = jwt.verify(
                refreshToken,
                sha1(config.rootPassword)
            ) as {
                userId: string
                bindId: string
                timestamp: number
                refresh: boolean
                password: string
            }
            if (payload.refresh !== null) {
                koa.status = 401
                koa.body = JSON.stringify({
                    code: 401,
                    message: 'refresh_token is not refresh token'
                })
                return
            }

            try {
                const account = await ctx.chatluna_server_database.getAccount(
                    payload.userId
                )

                if (sha1(account.password) !== payload.password) {
                    koa.status = 401
                    koa.body = JSON.stringify({
                        code: 401,
                        message: 'password is changed'
                    })
                    return
                }
            } catch (e) {
                koa.status = 401
                koa.body = JSON.stringify({
                    code: 401,
                    message: 'user not found'
                })
                return
            }

            const accessToken = jwt.sign(
                {
                    userId: payload.userId,
                    bindId: payload.bindId,
                    timestamp: Date.now()
                },
                sha1(config.rootPassword),
                {
                    expiresIn: '30m'
                }
            )

            refreshToken = jwt.sign(
                {
                    userId: payload.userId,
                    bindId: payload.bindId,
                    timestamp: Date.now() - 10,
                    refresh: true
                },
                sha1(config.rootPassword),
                {
                    expiresIn: '30d'
                }
            )

            koa.status = 200

            koa.body = JSON.stringify({
                code: 0,
                data: {
                    accessToken,
                    refreshToken
                }
            })
        } catch (e) {
            koa.status = 401
            koa.body = JSON.stringify({
                code: 401,
                message: 'refresh_token is invalid'
            })
        }
    })
}
