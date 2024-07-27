import { Context } from 'cordis'
import { Config } from '../index.ts'
import jwt from 'jsonwebtoken'
import { sha1 } from '@chatluna/utils'

export function apply(ctx: Context, config: Config) {
    ctx.server.use(async (koa, next) => {
        if (koa.path !== `${config.path}/login`) {
            await next()
            return
        }

        try {
            await next()
        } catch (e) {
            ctx.logger.error(e)
            koa.status = 500
            koa.body = 'Internal Server Error'
        }
    })

    ctx.server.post(`${config.path}/login`, async (koa) => {
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

        const token = jwt.sign(
            {
                userId: account.userId
            },
            sha1(config.rootPassword),
            {
                expiresIn: '1days'
            }
        )

        koa.body = JSON.stringify({
            code: 200,
            message: 'success',
            data: {
                token
            }
        })
    })
}
