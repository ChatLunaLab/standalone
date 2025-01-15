import { Context } from 'cordis'
import { Config } from '../index.ts'
import { ModelCapability, ModelType } from '@chatluna/core/platform'

export function apply(ctx: Context, config: Config) {
    ctx.server.get(`${config.path}/model/list`, async (koa) => {
        let apiKey = koa.request.headers['Authorization'] as string
        if (apiKey) {
            apiKey = apiKey.replace('Bearer ', '')
        }

        koa.set('Access-Control-Allow-Origin', '*')
        koa.set('Content-Type', 'application/json')

        /*  if (ctx.chatluna_server_database.getApiKey(apiKey) == null) {
            koa.body = JSON.stringify({
                code: 401,
                message: 'Unauthorized api key'
            })
            koa.status = 401
            return
        } */

        const models = ctx.chatluna_platform.getAllModels(ModelType.all)
        koa.body = JSON.stringify({
            code: 0,
            message: 'success',
            data: models.map((m) => {
                const modelInfo = Object.assign({}, m, { platform: undefined })
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
    })
}
