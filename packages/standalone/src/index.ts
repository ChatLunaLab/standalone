import { Context, Schema } from 'cordis'
import { apply as applyCore } from '@chatluna/core'
import * as memory from '@chatluna/memory'
import type {} from '@chatluna/memory/service'
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
export function apply(ctx: Context, config: Config) {
    applyCore(ctx)

    ctx.plugin(memory)

    ctx.plugin(assistant)

    ctx.plugin(service)

    ctx.inject(
        [
            'chatluna',
            'chatluna_platform',
            'chatluna_preset',
            'chatluna_conversation'
        ],
        (ctx) => {
            ctx.on('ready', async () => {
                await ctx.chatluna_platform.waitPlatform('openai')

                await ctx.chatluna_preset.init(config.presetDir)

                try {
                    await ctx.chatluna_conversation.getAssistantByName('雌小鬼')
                } catch {
                    await ctx.chatluna_conversation.createAssistant({
                        name: '雌小鬼',
                        preset: '雌小鬼',
                        model: 'openai/gpt-4o-mini'
                    })
                }

                const model = await ctx.chatluna
                    .createModel('openai/gpt-4o')
                    .then((model) => model as ChatLunaChatModel)

                /*  const result = await model.invoke('tell me a joke.')

            console.log(result) */
            })
        }
    )
}

export interface Config {
    presetDir: string
}

export const Config: Schema<Config> = Schema.object({
    presetDir: Schema.string()
        .description('预设所在目录。')
        .default('./data/chatluna/preset')
})
