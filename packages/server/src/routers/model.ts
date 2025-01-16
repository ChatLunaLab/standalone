import { Context } from 'cordis'
import { Config } from '../index.ts'
import { ModelCapability, ModelType } from '@chatluna/core/platform'
import jwt from 'koa-jwt'
import { sha1 } from '@chatluna/utils'

export function apply(ctx: Context, config: Config) {
    ctx.server.get(
        `${config.path}/v1/model/list`,
        jwt({ secret: sha1(config.rootPassword) }),
        async (koa) => {
            koa.set('Access-Control-Allow-Origin', '*')
            koa.set('Content-Type', 'application/json')

            const models = ctx.chatluna_platform.getAllModels(ModelType.all)
            koa.body = JSON.stringify({
                code: 0,
                data: models.map((m) => {
                    const modelInfo = Object.assign({}, m, {
                        platform: undefined
                    })
                    delete modelInfo.platform
                    modelInfo.name = `${m.platform}/${m.name}`
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    modelInfo.type = ModelType[modelInfo.type] as any

                    modelInfo.capabilities = modelInfo.capabilities.map(
                        (c) => ModelCapability[c]
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ) as any

                    return modelInfo
                })
            })
            koa.status = 200
        }
    )
}
