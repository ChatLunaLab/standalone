import { Context } from 'cordis'
import { apply as applyCore } from '@chatluna/core'
import * as memory from '@chatluna/memory'
import * as assistant from '@chatluna/assistant'
// import { apply as applyChat, inject as injectChat } from '@chatluna/chat'
import * as service from '@chatluna/service'
import type {} from '@cordisjs/plugin-http'
import type {} from '@cordisjs/plugin-proxy-agent'
import { ChatLunaChatModel } from '@chatluna/core/model'

/**
 *
 * load chatluna root service
 *
 * @param ctx parentContext
 */
export function apply(ctx: Context) {
    applyCore(ctx)

    ctx.plugin(memory)

    ctx.plugin(assistant)

    ctx.plugin(service)

    ctx.inject(['chatluna', 'chatluna_platform'], (ctx) => {
        ctx.on('ready', async () => {
            await ctx.chatluna_platform.waitPlatform('openai')

            const model = await ctx.chatluna
                .createModel('openai/gpt-4o')
                .then((model) => model as ChatLunaChatModel)

            const result = await model.invoke('tell me a joke.')

            console.log(result)
        })
    })
}
