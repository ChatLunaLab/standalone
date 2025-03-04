import { Context } from 'cordis'
import { Config } from '../index.ts'
import jwt from 'koa-jwt'
import { sha1 } from '@chatluna/utils'

export function apply(ctx: Context, config: Config) {
    ctx.server.get(
        `${config.path}/v1/model/list`,
        jwt({ secret: sha1(config.rootPassword) }),
        async (koa) => {
            koa.set('Access-Control-Allow-Origin', '*')
            koa.set('Content-Type', 'application/json')

            const models = await ctx.cortex_luna.models()

            koa.body = JSON.stringify({
                code: 0,
                data: models.map((modelInfo) => {
                    modelInfo.name = `${modelInfo.provider}:${modelInfo.name}`
                    delete modelInfo.provider

                    return modelInfo
                })
            })
            koa.status = 200
        }
    )
}
