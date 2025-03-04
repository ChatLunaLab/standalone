import { Context } from 'cordis'
import { Config } from '../index.ts'
import { sha1 } from '@chatluna/utils'
import cors from '@koa/cors'

export function apply(ctx: Context, config: Config) {
    ctx.database.upsert('chatluna_account', [
        {
            username: config.rootUser,
            // sha1(password)
            password: sha1(config.rootPassword),
            bindId: 'admin',
            role: 'admin',
            userId: 'admin'
        }
    ])

    if (config.rootUser !== 'admin') {
        // remove the admin account
        ctx.database.remove('chatluna_account', {
            username: 'admin'
        })
    }

    ctx.server._koa.use(
        cors({
            origin: '*',
            exposeHeaders: ['x-refresh-token', 'Authorization'],
            maxAge: 5
        })
    )

    ctx.server.use(async function (koa, next) {
        // support cors

        koa.set('Access-Control-Allow-Origin', '*')
        koa.set(
            'Access-Control-Allow-Methods',
            'GET, POST, PUT, DELETE, OPTIONS'
        )
        koa.set(
            'Access-Control-Allow-Headers',
            'Content-Type, Authorization, Accept, x-refresh-token'
        )

        try {
            return await next()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            if (err.message === 'Authentication Error') {
                koa.status = 401
            } else {
                koa.status = 500
                koa.body = 'Unknown error'
                ctx.logger.error(err)
            }
        }
    })
}
