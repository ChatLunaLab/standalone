import { Context } from 'cordis'
import { Config } from '../index.ts'
import { sha1 } from '@chatluna/utils'

export function apply(ctx: Context, config: Config) {
    ctx.database.upsert('chatluna_account', [
        {
            username: config.rootUser,
            // sha1(password)
            password: sha1(config.rootPassword),
            role: 'admin',
            userId: 'admin'
        }
    ])

    ctx.server.use(async function (koa, next) {
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
                throw err
            }
        }
    })
}
