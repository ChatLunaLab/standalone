import { Context } from 'cordis'
import { Config } from '../index.ts'
import jwt from 'koa-jwt'
import { sha1 } from '@chatluna/utils'
import { ModelType } from 'cortexluna'

export function apply(ctx: Context, config: Config) {
    ctx.server.get(
        `${config.path}/v1/model/list`,
        jwt({ secret: sha1(config.rootPassword) }),
        async (koa) => {
            koa.set('Access-Control-Allow-Origin', '*')
            koa.set('Content-Type', 'application/json')

            const models = ctx.chatluna_platform
                .getAllModels(ModelType.LANGUAGE_MODEL)
                .concat(
                    ctx.chatluna_platform.getAllModels(
                        ModelType.TEXT_EMBEDDING_MODEL
                    )
                )

            koa.body = JSON.stringify({
                code: 0,
                data: models.map((m) => {
                    const modelInfo = Object.assign({}, m, {
                        platform: undefined
                    })
                    delete modelInfo.platform
                    modelInfo.name = `${m.provider}:${m.name}`

                    return modelInfo
                })
            })
            koa.status = 200
        }
    )
}
