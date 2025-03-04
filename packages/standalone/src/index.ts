import { Context, Schema } from 'cordis'
import { apply as applyCore } from '@chatluna/core'
import * as memory from '@chatluna/memory'
import type {} from '@chatluna/memory/service'
import * as assistant from '@chatluna/assistant'
// import { apply as applyChat, inject as injectChat } from '@chatluna/chat'
import * as cortexluna from 'cortexluna'
import type {} from '@cordisjs/plugin-http'
import type {} from '@cordisjs/plugin-proxy-agent'

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

    ctx.plugin(cortexluna)

    ctx.inject(
        ['chatluna', 'chatluna_preset', 'chatluna_conversation'],
        (ctx) => {
            ctx.on('ready', async () => {
                try {
                    await ctx.chatluna_conversation.getAssistantByName('雌小鬼')
                } catch {
                    await ctx.chatluna_conversation.createAssistant({
                        name: '雌小鬼',
                        preset: '雌小鬼',
                        model: 'openai/gpt-4o-mini',
                        shared: true,
                        author: 'dingyi',
                        avatar: 'https://tse1.mm.bing.net/th?id=OIP.CHN4ai_OXSMvVUJu5RuSGQHaH-&rs=1&pid=ImgDetMain',
                        ownerId: 'admin'
                    })
                }
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
