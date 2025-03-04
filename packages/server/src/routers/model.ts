import { Context } from 'cordis'
import { Config } from '../index.ts'
import jwt from 'koa-jwt'
import { sha1 } from '@chatluna/utils'
import { PlatformModelInfo } from 'cortexluna'

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
                    const newModelInfo: Writeable<PlatformModelInfo> =
                        Object.assign({}, modelInfo)
                    newModelInfo.name = `${newModelInfo.provider}:${newModelInfo.name}`
                    delete newModelInfo.provider

                    return newModelInfo
                })
            })
            koa.status = 200
        }
    )
}

type Writeable<T> = { -readonly [P in keyof T]: T[P] }
