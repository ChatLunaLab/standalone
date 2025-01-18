import { Context } from 'cordis'
import { apply as applyCore } from '@chatluna/core'
import * as memory from '@chatluna/memory'
import type {} from '@chatluna/memory/service'
import * as assistant from '@chatluna/assistant'
// import { apply as applyChat, inject as injectChat } from '@chatluna/chat'
import * as service from '@chatluna/service'
import type {} from '@cordisjs/plugin-http'
import type {} from '@cordisjs/plugin-proxy-agent'
import { ChatLunaChatModel } from '@chatluna/core/model'
import { loadPreset } from '@chatluna/core/preset'
import fs from 'fs/promises'

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

                ctx.chatluna_preset.addPreset(
                    loadPreset(await fs.readFile('雌小鬼.yml', 'utf-8'))
                )

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
