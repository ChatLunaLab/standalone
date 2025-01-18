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

    ctx.server._koa.use(
        cors({
            origin: '*',
            exposeHeaders: ['X-refresh-token', 'Authorization'],
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
            'Content-Type, Authorization, Accept, refresh_token'
        )

        try {
            return await next()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            ctx.logger.error(err)
            if (err?.status === 401) {
                koa.status = 401
                koa.body =
                    'Protected resource, use Authorization header to get access\n'
            } else {
                koa.status = 500
                koa.body = 'Unknown error'
            }
        }
    })
}
