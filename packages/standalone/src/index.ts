import { Context } from 'cordis'
import { apply as applyCore } from '@chatluna/core'
import { apply as applyMemory, inject as injectMemory } from '@chatluna/memory'
// import { apply as applyChat, inject as injectChat } from '@chatluna/chat'
import {
    apply as applyService,
    inject as injectService
} from '@chatluna/service'
import type {} from '@cordisjs/plugin-http'
import type {} from '@cordisjs/plugin-proxy-agent'
import { ChatLunaChatModel } from '@chatluna/core/model'
import { ModelType } from '@chatluna/core/platform'
import { sleep } from '@chatluna/utils'

/**
 *
 * load chatluna root service
 *
 * @param ctx parentContext
 */
export function apply(ctx: Context) {
    applyCore(ctx)

    ctx.inject(injectMemory, (ctx) => {
        applyMemory(ctx)
    })

    ctx.inject(injectService, (ctx) => {
        applyService(ctx)

        ctx.inject(['chatluna'], (ctx) => {
            ctx.on('ready', async () => {
                const model = await ctx.chatluna
                    .createModel('openai/gpt-4o')
                    .then((model) => model as ChatLunaChatModel)

                const result = await model.invoke('tell me a joke.')

                console.log(result)
            })
        })
    })
}
